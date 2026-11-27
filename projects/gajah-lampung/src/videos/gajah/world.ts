// Way Kambas, Lampung as one three.js scene for the Fafnir-ID
// short: a Sumatran elephant TRAINED as forest patrol walks a
// jungle path toward the camera, rangers at its side; behind it
// the dense green wall of the national park, a village crop field
// at the forest edge, a stump field where the forest was cut, and
// one lone elephant in the mist. VISUAL CORE: deep jungle greens,
// warm sun breaking through the canopy, textured everything
// (anti-banding: speckled sky, flecked grass, woven canopy).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, ELEPHANT_AT, HERD_AT, FOOD_PILE } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
/** One painted cumulus cluster on the sky canvas: lavender-grey
 *  shaded belly first, mid tone above it, sunlit white crown
 *  offset up-left — never a flat white blob. */
const paintPuff = (g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, s: number) => {
  const lobes: [number, number, number][] = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    lobes.push([cx + (t - 0.5) * s * 1.7, cy - Math.sin(t * Math.PI) * s * 0.34 + (r() - 0.5) * s * 0.14, s * (0.34 + 0.30 * Math.sin(t * Math.PI))]);
  }
  lobes.push([cx + (r() - 0.5) * s * 0.4, cy - s * 0.42, s * 0.30]);
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aebadd");
  layer(s * 0.05, -s * 0.02, "#d7e2f5");
  layer(-s * 0.10, -s * 0.05, "#ffffff");
};
/** Jungle sky: deep blue up top, warm hazy green-gold near the
 *  horizon where the sun breaks through the canopy. */
const skyTexDay = () => ctex("gajahSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1a54b8"); grad.addColorStop(0.34, "#3a7cd8"); grad.addColorStop(0.62, "#7fb0e8");
  grad.addColorStop(0.85, "#cfe6b8"); grad.addColorStop(1, "#f2eec8");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("gajahGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("gajahBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture: light leaf clusters over mid green
 *  with deep shadow pockets — multiplied by the canopy colour */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#8aa86e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(26,52,20,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(230,255,200,${0.12 + r() * 0.22})` : `rgba(22,48,18,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** wrap-draw: calls fn at every tiled offset an item of radius
 *  `rad` at (x, y) bleeds into, so a canvas tiles without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** RICH jungle grass: deep shadow pockets, a mid-green body,
 *  sunlit fleck clusters and thousands of individual blades in
 *  five greens with hard value contrast — built like the canopy
 *  texture that already reads well, on a deeper base that
 *  survives the sun lift without going neon. */
const grassRichTex = () => ctex("gajahGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#3f7030"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "30,70,22" : "110,170,74";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(190,235,145,${0.10 + r() * 0.20})` : `rgba(20,48,14,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#244f19", "#376b24", "#529636", "#7fb955", "#a8d67e"];
  g.lineCap = "round";
  for (let i = 0; i < 15000; i++) {
    const x = r() * S, y = r() * S, l = 7 + r() * 13, lean = (r() - 0.5) * 6;
    wrapDraw(S, x, y, 16, (xx, yy) => {
      g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
      g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + lean, yy - l); g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, h = 9 + r() * 10;
    wrapDraw(S, x, y, 18, (xx, yy) => {
      for (let b = -2; b <= 2; b++) {
        g.strokeStyle = b % 2 ? "#5da23e" : "#2c5c1d"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
  const flw = ["#fff6da", "#ffd94d", "#f6a8c0", "#ffffff", "#e8542e"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases, the patrol path and the stump
 *  field: warm brown speckled with darker clods and pale grit */
const soilTex = () => ctex("gajahSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("gajahPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground (verge shade, sun
 *  patches, shade patches) — the blob-shadow trick, tinted */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("gajahBark", 256, 256, (g, r) => {
  g.fillStyle = "#6a4c34"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(38,24,12,${0.16 + r() * 0.22})` : `rgba(200,168,124,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** soft radial mist sprite texture */
const mistTex = () => ctex("gajahMist", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(235,242,230,0.85)"); gr.addColorStop(0.6, "rgba(235,242,230,0.35)"); gr.addColorStop(1, "rgba(235,242,230,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("gajahBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A jungle tree with a REAL canopy: a bark-textured trunk with
 *  angled branches, and 9-13 overlapping foliage blobs in three
 *  depth layers — deep shadow green low, mid green main mass,
 *  sunlit flecks on top — all carrying a leaf-fleck texture so
 *  no surface is a smooth ball. Silhouettes are jittered per
 *  seed: organic, never lollipops. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "gajahFoliageDeep"),
    folM(greens[0], "gajahFoliageMid"),
    folM(greens[1] ?? greens[0], "gajahFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.3, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.52, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.35 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.34 + tr() * cr * 0.14, Math.sin(a) * d, cr * (0.42 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 0.92, 1);
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.45 + tr() * 0.45);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.4, Math.sin(a) * d, cr * (0.44 + tr() * 0.22), 1);
  }
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.2 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy + cr * (0.36 + tr() * 0.2), Math.sin(a) * d, cr * (0.34 + tr() * 0.16), 2);
  }
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced all over
 *  the clearing so lawn edges stop being ruler-straight lines. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#1f4216"), tip = new THREE.Color("#7fb955"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.30 + tr() * 0.24, w = 0.05;
    const tx = ox + Math.cos(a) * lean, tz = oz + Math.sin(a) * lean;
    const px = -Math.sin(a), pz = Math.cos(a);
    pos.push(ox - px * w, 0, oz - pz * w, ox + px * w, 0, oz + pz * w, tx, h, tz);
    tmp.copy(tip).offsetHSL((tr() - 0.5) * 0.03, 0, (tr() - 0.5) * 0.1);
    col.push(root.r, root.g, root.b, root.r, root.g, root.b, tmp.r, tmp.g, tmp.b);
    idx.push(vi, vi + 1, vi + 2); vi += 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

export type ElephantRig = {
  g: THREE.Group; body: THREE.Mesh; bodyY: number; trunk: THREE.Group[]; trunkBase: number[];
  ears: THREE.Group[]; legs: THREE.Group[]; tail: THREE.Group; ph: number;
};
/** A Sumatran elephant, built to move: segmented trunk that
 *  sways and curls, flapping ears, swinging legs, swishing tail.
 *  Faces +Z. Shoulder height h (~2.6 m adult patrol, ~2.1 young). */
const makeElephant = (h: number, seed = 1): ElephantRig => {
  const g = new THREE.Group();
  const tr = rng(seed * 977 + 5);
  const R = h * 0.40;
  const skin = lam2({ color: "#8a8580" });
  const skinDark = lam2({ color: "#6e6a64" });
  const earIn = lam2({ color: "#a8897a" });
  const ivory = lam2({ color: "#e8ddc8" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 14), skin);
  body.scale.set(0.95, 1.0, 1.5); body.position.y = h * 0.62; body.castShadow = true; g.add(body);
  // head + face
  const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 16, 12), skin);
  head.position.set(0, h * 0.74, R * 1.35); head.castShadow = true; g.add(head);
  const eyeM = lam2({ color: "#1c1410" });
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.055, 8, 6), eyeM);
    eye.position.set(s * R * 0.34, h * 0.78, R * 1.88); g.add(eye);
  }
  // tusks: short, Sumatran — small curved cones, forward-down
  for (const s of [1, -1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(R * 0.085, R * 0.5, 8), ivory);
    tusk.position.set(s * R * 0.22, h * 0.62, R * 1.95);
    tusk.rotation.x = Math.PI * 0.72; tusk.rotation.z = -s * 0.18; g.add(tusk);
  }
  // ears: flattened spheres on pivot groups, flap in update()
  const ears: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.set(s * R * 0.48, h * 0.80, R * 1.15);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 12, 10), s > 0 ? skin : earIn);
    ear.scale.set(0.28, 1.15, 1.0);
    ear.position.set(s * R * 0.18, -R * 0.08, -R * 0.1);
    ear.castShadow = true; piv.add(ear);
    piv.rotation.y = s * 0.5;
    g.add(piv); ears.push(piv);
  }
  // trunk: 5 chained segments, base rotations curl it down
  const trunk: THREE.Group[] = [];
  const trunkBase = [0.15, 0.35, 0.5, 0.55, 0.45];
  let parent: THREE.Object3D = g;
  let py = h * 0.68, pz = R * 1.85;
  const segLen = h * 0.155;
  for (let i = 0; i < 5; i++) {
    const piv = new THREE.Group();
    piv.position.set(0, i === 0 ? py : -segLen, i === 0 ? pz : 0);
    piv.rotation.x = trunkBase[i];
    const rad = R * (0.16 - i * 0.022);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.85, rad, segLen, 9), i % 2 ? skinDark : skin);
    seg.position.y = -segLen / 2; seg.castShadow = true; piv.add(seg);
    parent.add(piv);
    trunk.push(piv);
    parent = piv;
  }
  // legs: pivot groups at the hips, swing in update()
  const legs: THREE.Group[] = [];
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.set(sx * R * 0.55, h * 0.55, sz * R * 0.75);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.18, h * 0.55, 9), skinDark);
    leg.position.y = -h * 0.275; leg.castShadow = true; piv.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.20, R * 0.21, h * 0.07, 9), skin);
    foot.position.y = -h * 0.52; piv.add(foot);
    g.add(piv); legs.push(piv);
  }
  // tail: thin, with a dark tuft — swishes in update()
  const tail = new THREE.Group();
  tail.position.set(0, h * 0.75, -R * 1.45);
  const tailM = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.035, R * 0.025, h * 0.34, 6), skinDark);
  tailM.position.y = -h * 0.17; tail.add(tailM);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 7, 6), lam2({ color: "#3a3028" }));
  tuft.position.y = -h * 0.35; tuft.scale.y = 1.6; tail.add(tuft);
  g.add(tail);
  void tr;
  return { g, body, bodyY: h * 0.62, trunk, trunkBase, ears, legs, tail, ph: seed * 1.7 };
};

/** A cut stump: bark sides, pale sawn top with a darker ring. */
const makeStump = (r: number, h: number) => {
  const g = new THREE.Group();
  const side = lam2({ map: rep(barkTex(), 1, 1), color: "#8a6a4a" });
  const top = lam2({ color: "#c9a86a" });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, h, 10), [side, top, side]);
  c.position.y = h / 2; c.castShadow = true; c.receiveShadow = true; g.add(c);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.02, 6, 20), lam2({ color: "#8a6a3e" }));
  ring.rotation.x = Math.PI / 2; ring.position.y = h + 0.005; g.add(ring);
  return g;
};

/** One crop plant: a green cone + leaf spikes — the villagers'
 *  cassava/corn at the forest edge. */
const makeCropPlant = (s: number) => {
  const g = new THREE.Group();
  const m = lam2({ color: "#4d8a35" });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 1.0 * s, 7), m);
  cone.position.y = 0.5 * s; cone.castShadow = true; g.add(cone);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.8 * s, 5), lam2({ color: "#6ab04a" }));
    const a = (i / 3) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.2 * s, 0.75 * s, Math.sin(a) * 0.2 * s);
    leaf.rotation.z = Math.cos(a) * 0.7; leaf.rotation.x = -Math.sin(a) * 0.7; g.add(leaf);
  }
  return g;
};

/** The food mountain (shot 3): grass + leaf heap the elephant eats. */
const makeFoodPile = () => {
  const g = new THREE.Group();
  const mats = [
    lam2({ color: "#5da24a", map: rep(foliageTex("gajahFoliagePile"), 2, 1) }),
    lam2({ color: "#4d8a35", map: rep(foliageTex("gajahFoliagePile"), 2, 1) }),
    lam2({ color: "#7fb955", map: rep(foliageTex("gajahFoliagePile"), 2, 1) }),
  ];
  const heap = (x: number, y: number, z: number, rx: number, ry: number, rz: number, mi: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), mats[mi % 3]);
    m.position.set(x, y, z); m.scale.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  heap(0, 0.35, 0, 1.5, 0.55, 1.1, 0);
  heap(-0.8, 0.28, 0.4, 0.9, 0.42, 0.8, 1);
  heap(0.9, 0.3, -0.3, 1.0, 0.45, 0.85, 2);
  heap(0.1, 0.62, 0.1, 0.9, 0.4, 0.7, 1);
  const r = rng(4242);
  for (let i = 0; i < 24; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5 + r() * 0.4, 5), lam2({ color: "#7fb955" }));
    const a = r() * Math.PI * 2, d = r() * 1.3;
    blade.position.set(Math.cos(a) * d, 0.75 + r() * 0.2, Math.sin(a) * d * 0.8);
    blade.rotation.z = (r() - 0.5) * 0.8; g.add(blade);
  }
  return g;
};

/** A wooden ranger signpost at the path edge (shot 2): two posts
 *  + a blank plank board, low enough never to cross a claim card. */
const makeSignPost = () => {
  const g = new THREE.Group();
  const wood = lam2({ color: "#7d5a36" });
  const boardM = lam2({ color: "#a87c4c" });
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), wood);
    post.position.set(s * 0.7, 1.1, 0); post.castShadow = true; g.add(post);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.08), boardM);
  board.position.set(0, 1.85, 0); board.castShadow = true; g.add(board);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.2), wood);
  cap.position.set(0, 2.25, 0); g.add(cap);
  return g;
};

/** A mossy boulder. */
const makeRock = (s: number) => {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), lam2({ color: "#8a8a82" }));
  m.scale.y = 0.65; m.castShadow = true; m.receiveShadow = true;
  return m;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0a8", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private patrol: ElephantRig;
  private patrolBlob: THREE.Mesh | null = null;
  private herd: ElephantRig[] = [];
  private foodPile: THREE.Group;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private mist: THREE.Sprite[] = [];
  private mistBase: { x: number; sp: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#7a8a5a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const cloudSpots: [number, number, number, number][] = [
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, -350, 140],
      [-175, 108, -320, 115], [195, 116, -340, 120], [6, 70, -165, 66], [-128, 64, -155, 60],
      [102, 56, -135, 52], [248, 84, -250, 92],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    // the sun's halo + core, upper left down the path
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant bird flocks, small + high
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildForest(R, r);
    // ---- the patrol elephant: the star of the film ----
    this.patrol = makeElephant(2.6, 1);
    R.add(this.patrol.g);
    this.patrolBlob = blob(R, 0, 0.06, -2, 3.2, 4.6, 0.35);
    // ---- the wild herd (shot 2 only) ----
    HERD_AT.forEach(([x, y, z], i) => {
      const e = makeElephant(2.0 + (i % 2) * 0.25, 10 + i * 7);
      e.g.position.set(x, y, z);
      e.g.rotation.y = Math.PI + (i - 1) * 0.3;
      e.g.visible = false;
      R.add(e.g);
      this.herd.push(e);
      blob(R, x, 0.06, z, 2.6, 3.8, 0.3);
    });
    // ---- the food mountain (shot 3 ONLY — hidden elsewhere so it
    // never looms in another shot's foreground) ----
    this.foodPile = makeFoodPile();
    this.foodPile.position.set(FOOD_PILE[0], 0, FOOD_PILE[2]);
    this.foodPile.visible = false;
    R.add(this.foodPile);
    blob(R, FOOD_PILE[0], 0.05, FOOD_PILE[2], 3.4, 2.6, 0.3);
  }

  // ---------------- the forest: clearing, path, wall, crops, stumps ----------------
  private buildForest(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the patrol path: a worn dirt track running away down -Z
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 62), lam2({ map: rep(soilTex(), 2, 24) }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, -2); path.receiveShadow = true; R.add(path);
    // elephant footprints pressed into the path (dark ovals, in pairs)
    for (let i = 0; i < 14; i++) {
      const z = 20 - i * 3.4, x = (i % 2 ? 0.55 : -0.55) + (r() - 0.5) * 0.3;
      const fp = new THREE.Mesh(new THREE.CircleGeometry(0.32 + r() * 0.08, 10),
        new THREE.MeshBasicMaterial({ color: "#4a3520", transparent: true, opacity: 0.35, depthWrite: false }));
      fp.rotation.x = -Math.PI / 2; fp.position.set(x, 0.04, z); fp.renderOrder = 1; R.add(fp);
    }
    // ---- the forest wall: dense layered trees closing the horizon ----
    const greens = ["#3d7a2e", "#5da24a", "#2c5c22"];
    const treePts: [number, number][] = [];
    const wallRows: [number, number, number][] = [];
    for (let row = 0; row < 5; row++) {
      const z = -26 - row * 11;
      const n = 12 + row * 2;
      for (let i = 0; i < n; i++) {
        const x = -66 + (i / (n - 1)) * 132 + (r() - 0.5) * 6;
        wallRows.push([x, z + (r() - 0.5) * 5, 6.5 + r() * 3.5]);
      }
    }
    // side trees flanking the path (near the camera, framing the shot)
    const sideTrees: [number, number, number][] = [
      [-8.5, 12, 7.5], [9, 8, 8.2], [-10, 2, 6.8], [10.5, -2, 7.8], [-9, -8, 8.5],
      [11, -12, 6.5], [-11, -18, 7.2], [9.5, -20, 8.0], [-8, -24, 6.2], [12, -26, 7.0],
    ];
    for (const [x, z, h] of [...wallRows, ...sideTrees]) {
      const t = makeTree(h, greens, Math.floor(Math.abs(x) * 7 + Math.abs(z) * 3 + 1));
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: x * 0.7 + z * 0.4 });
      treePts.push([x, z]);
    }
    // ---- the village crop field (shot 2): rows of cassava/corn ----
    const cropBase = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), lam2({ map: rep(soilTex(), 4, 5), color: "#8a6a44" }));
    cropBase.rotation.x = -Math.PI / 2; cropBase.position.set(16, 0.03, -11); cropBase.receiveShadow = true; R.add(cropBase);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 10; col++) {
        const p = makeCropPlant(0.9 + r() * 0.3);
        p.position.set(11.5 + row * 1.8 + (r() - 0.5) * 0.4, 0.03, -16.5 + col * 1.25 + (r() - 0.5) * 0.4);
        R.add(p);
      }
    }
    // a simple wooden fence between the field and the forest
    const fenceM = lam2({ color: "#7d5a36" });
    for (let i = 0; i < 9; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), fenceM);
      post.position.set(10.2, 0.55, -17 + i * 1.6); R.add(post);
    }
    for (const y of [0.45, 0.85]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 13.5), fenceM);
      rail.position.set(10.2, y, -10.6); R.add(rail);
    }
    // the ranger signpost at the path edge
    const sign = makeSignPost();
    sign.position.set(5, 0, -9); sign.rotation.y = -0.5; R.add(sign);
    // ---- the stump field (shot 4): where the forest was cut ----
    const stumpBase = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), lam2({ map: rep(soilTex(), 4, 5), color: "#9a7a4e" }));
    stumpBase.rotation.x = -Math.PI / 2; stumpBase.position.set(-13, 0.03, -18); stumpBase.receiveShadow = true; R.add(stumpBase);
    const stumpPts: [number, number, number, number][] = [
      [-8, -12, 0.7, 0.8], [-12, -14, 0.55, 0.6], [-16, -12.5, 0.8, 0.9], [-10, -18, 0.6, 0.7],
      [-15, -20, 0.75, 0.85], [-18, -16, 0.5, 0.55], [-9, -22, 0.65, 0.75], [-13, -24, 0.55, 0.6],
    ];
    for (const [x, z, sr, sh] of stumpPts) {
      const st = makeStump(sr, sh);
      st.position.set(x, 0.03, z); st.rotation.y = r() * 3; R.add(st);
      blob(R, x, 0.05, z, sr * 2.4, sr * 2.4, 0.3);
    }
    // fallen logs among the stumps
    for (const [x, z, yaw] of [[-11, -16, 0.7], [-14, -22, 2.1], [-8.5, -20, 1.2]] as [number, number, number][]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 3.2, 9), lam2({ map: rep(barkTex(), 2, 1), color: "#8a6a4a" }));
      log.rotation.z = Math.PI / 2; log.rotation.y = yaw;
      log.position.set(x, 0.38, z); log.castShadow = true; R.add(log);
    }
    // ---- mist: soft sprites drifting low in the clearing ----
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex(), transparent: true, depthWrite: false, opacity: 0.16 }));
      const x = -8 + r() * 16, z = -6 - r() * 12;
      sp.position.set(x, 1.2 + r() * 1.4, z);
      sp.scale.set(9 + r() * 7, 3.2 + r() * 1.6, 1);
      sp.layers.set(NOINK); R.add(sp);
      this.mist.push(sp); this.mistBase.push({ x, sp: 0.5 + r() * 0.7 });
    }
    // ---- rocks + bushes filling the gaps ----
    const bushMats = [
      lam2({ color: greens[2], map: rep(foliageTex("gajahFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("gajahFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("gajahFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, 0.1 + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    for (let i = 0; i < 16; i++) {
      const s = r() < 0.5 ? 1 : -1;
      bushAt(s * (6.5 + r() * 3), 14 - r() * 40, 0.5 + r() * 0.6, Math.floor(r() * 3));
    }
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const rock = makeRock(0.4 + r() * 0.7);
      rock.position.set(s * (5.5 + r() * 4), 0.15, 12 - r() * 38);
      rock.rotation.y = r() * 3; R.add(rock);
    }
    // jungle flowers: red + orange heliconia dots among the green
    const fcols = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6"];
    for (let i = 0; i < 70; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.05, 6, 5), lam2({ color: fcols[i % fcols.length] }));
      fl.position.set(s * (5.5 + r() * 6), 0.35 + r() * 0.3, 16 - r() * 40);
      R.add(fl);
    }
    // ---- sun pools + shade pools over the clearing ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (3 + r() * 6), 0.128, 10 - r() * 30, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#2c5420", s * (3 + r() * 6), 0.129, 8 - r() * 28, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    // ---- 3D grass tufts, instanced: dense fringes along the path
    // verges and tree bases, loose scatter over the clearing ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let z = 24; z > -30; z -= 0.5 + r() * 0.55) {
      if (r() < 0.85) pushTuft(2.6 + r() * 0.8, z + (r() - 0.5), 0.85 + r() * 0.8);
      if (r() < 0.85) pushTuft(-2.6 - r() * 0.8, z - 0.4, 0.85 + r() * 0.8);
      if (r() < 0.30) pushTuft(3.6 + r() * 0.9, z, 0.7 + r() * 0.7);
      if (r() < 0.30) pushTuft(-3.6 - r() * 0.9, z, 0.7 + r() * 0.7);
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 500; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (3.2 + r() * 9), z = 20 - r() * 46;
      if (x > 9.5 && z > -18 && z < -4) continue; // keep the crop field clear
      if (x < -5.5 && x > -20 && z > -26 && z < -10) continue; // keep the stump field clear
      pushTuft(x, z, (0.65 + r() * 0.8) * (z > -30 ? 1.25 : 1));
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.26 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    void r;
  }

  private shotSun(id: number, s: ShotDef, Lp: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(Lp.az), el = THREE.MathUtils.degToRad(Lp.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    v.y = Math.max(v.y, 0.34);
    v.normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** Animate one elephant rig: trunk sway + curl, ear flap, leg
   *  swing (walking shots), tail swish, body bob. */
  private animateElephant(e: ElephantRig, t: number, walking: boolean, eating: boolean) {
    const ph = e.ph;
    // trunk: gentle sway, extra curl when eating from the pile
    e.trunk.forEach((seg, i) => {
      const base = e.trunkBase[i];
      const sway = Math.sin(t * 1.2 + ph + i * 0.55) * 0.07;
      const eat = eating ? (i >= 2 ? 0.42 : 0.12) : 0;
      seg.rotation.x = base + sway + eat;
    });
    // ears flap slowly
    e.ears.forEach((ear, i) => {
      ear.rotation.y = (i === 0 ? 0.5 : -0.5) + Math.sin(t * 0.9 + ph + i * 2.1) * 0.10;
    });
    // legs: swing only while walking (shots 1, 2, 6)
    e.legs.forEach((leg, i) => {
      leg.rotation.x = walking ? Math.sin(t * 2.2 + ph + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI)) * 0.16 : 0;
    });
    // tail swish
    e.tail.rotation.x = Math.sin(t * 1.6 + ph) * 0.12;
    e.tail.rotation.z = Math.cos(t * 1.3 + ph * 1.3) * 0.18;
    // body bob: a slow walk bounce, or a near-still breathing sway
    e.body.position.y = e.bodyY + (walking ? Math.abs(Math.sin(t * 2.2 + ph)) * 0.05 : Math.sin(t * 0.8 + ph) * 0.012);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tt = s.tau(t), Lp = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = new THREE.Vector3(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, Lp);
    this.hemi.color.set(Lp.sky); this.hemi.groundColor.set(Lp.ground); this.hemi.intensity = Lp.hemiI;
    this.sun.color.set(Lp.sunCol); this.sun.intensity = Lp.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = Lp.bias; this.sun.shadow.normalBias = Lp.normalBias * (Rr / 12);
    this.rim.position.set(focus.x - 55, focus.y + 34, focus.z - 75);
    this.rim.target.position.copy(focus);
    this.rim.intensity = 0.35;
    TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
    TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
    CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    untone(Lp.fog, this.fog.color);
    this.fog.near = Lp.fogNear * 1.6; this.fog.far = Lp.fogFar * 1.6;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = true;
    for (const c2 of this.clouds) c2.visible = true;
    // ---- the patrol elephant poses per shot ----
    const ep = ELEPHANT_AT[id] as V3;
    const yaws: Record<number, number> = { 1: 0, 2: 2.2, 3: 0.3, 4: 0.4, 5: 0.6, 6: 0 };
    this.patrol.g.position.set(ep[0], 0, ep[2]);
    if (this.patrolBlob) this.patrolBlob.position.set(ep[0], 0.06, ep[2]);
    this.patrol.g.rotation.y = yaws[id] ?? 0;
    this.patrol.g.visible = true;
    // the food mountain exists only in the meal shot
    this.foodPile.visible = id === 3;
    this.animateElephant(this.patrol, tt, id === 1 || id === 2 || id === 6, id === 3);
    // ---- the wild herd: shot 2 only ----
    this.herd.forEach((e) => {
      e.g.visible = id === 2;
      if (id === 2) this.animateElephant(e, tt, false, false);
    });
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // mist drifts low through the clearing, thicker in shot 5
    this.mist.forEach((m, i) => {
      const b = this.mistBase[i];
      if (b) m.position.x = b.x + Math.sin(tt * 0.22 + i * 1.9) * 2.2;
      (m.material as THREE.SpriteMaterial).opacity = id === 5 ? 0.30 : 0.14;
    });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels across the lawn)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.1, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---------------- cast + effects ----------------
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const dir = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(-1);
    const st2 = stage(id, t, { pos: cam.position, right, dir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st2.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st2.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
