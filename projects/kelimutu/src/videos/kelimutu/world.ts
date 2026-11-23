// Kelimutu, Flores as one three.js scene for the Fafnir-ID
// format: a volcano summit holding THREE crater lakes side by
// side — deep blue Tiwu Ata Bupu apart to the west, and the
// TWINS in the middle: turquoise Tiwu Nuwa Muri and rust-brown
// Tiwu Ata Polo split by a crater wall barely five metres wide.
// The hero narrates from the stone viewpoint terrace on the
// foreground knoll. VISUAL CORE: bright equatorial morning,
// mineral water in grey-brown crater bowls, dry savanna slopes,
// drifting summit mist — textured everything (anti-banding:
// speckled sky, blotched rock, flecked dry grass). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim —
// the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, stone, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_SPOT, TERRACE_Y, LAKE_TNM, LAKE_TAP, LAKE_TAB, WALL_Y, clamp01, tnmShiftAt } from "./story";

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
  layer(s * 0.16, 0, "#aebadd");            // shaded underside
  layer(s * 0.05, -s * 0.02, "#d7e2f5");    // mid tone
  layer(-s * 0.10, -s * 0.05, "#ffffff");   // sunlit crown
};
const skyTexDay = () => ctex("kelimutuSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#bcd9f7"); grad.addColorStop(1, "#e9f2fb");
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
const glowTex = () => ctex("kelimutuGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** soft white puff for mist + fumarole steam sprites */
const puffTex = () => ctex("kelimutuPuff", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.55, "rgba(255,255,255,0.38)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("kelimutuBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture (same recipe as the house style) */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#9db98d"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(38,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(240,255,214,${0.12 + r() * 0.22})` : `rgba(30,58,24,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** DRY savanna grass (anti-flat recipe, summit palette): deep
 *  olive base, sun-bleached flecks, thousands of blades in five
 *  straw/olive greens with hard value contrast. */
const grassDryTex = () => ctex("kelimutuGrassDry", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#6d7038"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "52,58,22" : "168,172,92";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(238,240,170,${0.10 + r() * 0.20})` : `rgba(34,40,14,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#454d1e", "#5d6629", "#7d843c", "#a8ad5e", "#cfd086"];
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
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(84,72,44,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** volcanic rock: grey-brown crags — blotches, cracks, grit */
const rockTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 110; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "38,32,26" : "178,164,140"},${0.08 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 52, 9 + r() * 30, r() * 3, 0, 7); g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 240; i++) { // cracks
    const x = r() * 512, y = r() * 512, l = 12 + r() * 40;
    g.strokeStyle = `rgba(30,24,18,${0.14 + r() * 0.2})`; g.lineWidth = 1.4 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + l); g.stroke();
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "235,226,205" : "24,20,16"},${0.05 + r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // mineral staining streaks (rust + sulphur) running downhill
  for (let i = 0; i < 36; i++) {
    const x = r() * 512, y = r() * 300, l = 60 + r() * 130;
    const gr = g.createLinearGradient(0, y, 0, y + l);
    const c = r() > 0.5 ? "176,102,52" : "206,188,110";
    gr.addColorStop(0, `rgba(${c},0.20)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x, y, 5 + r() * 9, l);
  }
});
/** lake surface: near-neutral blotches + glints so the material
 *  colour carries the mineral hue (turquoise / rust / deep blue) */
const lakeTex = () => ctex("kelimutuLake", 512, 512, (g, r) => {
  g.fillStyle = "#cfd4d2"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 130; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "105,120,118" : "238,244,242"},${0.06 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 16 + r() * 60, 8 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2600; i++) { // sparkle glints
    g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.16})`;
    g.fillRect(r() * 512, r() * 512, 2 + r() * 5, 1.4);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(70,84,82,${0.05 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 2, 1.4); }
});
/** bare earth / ash for tree bases and path edges */
const soilTex = () => ctex("kelimutuSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5a3e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "44,34,20" : "150,126,88"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "28,22,12" : "200,176,124"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("kelimutuPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("kelimutuBark", 256, 256, (g, r) => {
  g.fillStyle = "#6d5138"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(40,26,14,${0.16 + r() * 0.22})` : `rgba(206,172,128,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("kelimutuBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** the viewpoint sign: carved wood board, painted letters */
const signTex = () => ctex("kelimutuSign", 512, 256, (g, r) => {
  g.fillStyle = "#7a5a34"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) { // wood grain
    g.strokeStyle = `rgba(52,34,14,${0.15 + r() * 0.2})`; g.lineWidth = 1.6 + r() * 2;
    const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 9, 340, y + (r() - 0.5) * 9, 512, y); g.stroke();
  }
  g.fillStyle = "#f6ecd2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 84px 'Arial Black', Arial, sans-serif";
  g.fillText("KELIMUTU", 256, 92);
  g.font = "700 44px Arial, sans-serif";
  g.fillText("1.639 MDPL", 256, 178);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A tree with a REAL canopy: bark-textured trunk, angled
 *  branches, 9-13 overlapping foliage blobs in three depth
 *  layers carrying a leaf-fleck texture. Organic, never a
 *  lollipop. (House builder, summit palette via `greens`.) */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "kelimutuFoliageDeep"),
    folM(greens[0], "kelimutuFoliageMid"),
    folM(greens[1] ?? greens[0], "kelimutuFoliageLite"),
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

/** A DEAD tree standing in the lake: bare grey trunk, two or
 *  three naked branches — Kelimutu's famous drowned sentinels. */
const makeDeadTree = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const m = lam2({ map: rep(barkTex(), 1, 2), color: "#8d8578" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, h, 7), m);
  trunk.position.y = h / 2; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, len = h * (0.3 + tr() * 0.22);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, len, 5), m);
    br.position.set(Math.cos(a) * len * 0.3, h * (0.62 + i * 0.13), Math.sin(a) * len * 0.3);
    br.rotation.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9);
    g.add(br);
  }
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#3d451a"), tip = new THREE.Color("#b9bd6e"), tmp = new THREE.Color();
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

/** A crater: an open rock bowl (DoubleSide so the interior
 *  lights correctly), a dry-grass outer cone, a boulder-strewn
 *  rim ring, a mineral crust at the waterline, and the lake
 *  itself — a tinted, glinting disc whose texture scrolls so
 *  the water MOVES. Returns the lake material + map so update()
 *  can animate colour (TNM's famous shift) and flow. */
const makeCrater = (cx: number, cz: number, rx: number, rz: number, lakeCol: string, crustCol: string, key: string, seed: number) => {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const r = rng(seed);
  const rockM = lam2({ map: rep(rockTex(key + "In", "#71604a"), 7, 2), side: THREE.DoubleSide });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 0.97, 9.5, 44, 1, true), rockM);
  bowl.scale.set(rx, 1, rz); bowl.position.y = 4.75; bowl.castShadow = true; bowl.receiveShadow = true; g.add(bowl);
  const outerM = lam2({ map: rep(grassDryTex(), 8, 3), side: THREE.DoubleSide, color: "#a09c66" });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 2.75, 9.5, 44, 1, true), outerM);
  outer.scale.set(rx, 1, rz); outer.position.y = 4.75; outer.receiveShadow = true; g.add(outer);
  // rim: a rock ring + scattered boulders breaking the silhouette
  const rim = new THREE.Mesh(new THREE.RingGeometry(1.36, 1.74, 44),
    lam2({ map: rep(rockTex(key + "Rim", "#87765e"), 6, 1), side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2; rim.scale.set(rx, rz, 1); rim.position.y = 9.42; rim.receiveShadow = true; g.add(rim);
  const boulderM = lam2({ map: rep(rockTex(key + "B", "#7d6c56"), 1, 1) });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + r() * 0.2;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + r() * 0.95, 0), boulderM);
    b.position.set(Math.cos(a) * rx * 1.55, 9.35 + r() * 0.5, Math.sin(a) * rz * 1.55);
    b.rotation.set(r() * 3, r() * 3, r() * 3);
    b.scale.y = 0.62 + r() * 0.3;
    b.castShadow = true; g.add(b);
  }
  // mineral crust ring at the waterline (sulphur / rust / salt)
  const crust = new THREE.Mesh(new THREE.RingGeometry(0.955, 1.10, 44), lam2({ color: crustCol }));
  crust.rotation.x = -Math.PI / 2; crust.scale.set(rx, rz, 1); crust.position.y = 0.10; g.add(crust);
  // the lake
  const lakeMap = rep(lakeTex(), 3, 3);
  const lakeMat = lam2({ map: lakeMap, color: lakeCol });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 44), lakeMat);
  lake.rotation.x = -Math.PI / 2; lake.scale.set(rx, rz, 1); lake.position.y = 0.02; lake.receiveShadow = true; g.add(lake);
  return { group: g, lakeMat, lakeMap };
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private lakeFlows: { map: THREE.Texture; sx: number; sy: number }[] = [];
  private tnmMat: THREE.MeshLambertMaterial | null = null;
  private tnmTurq = new THREE.Color("#2fd2ac");
  private tnmGreen = new THREE.Color("#4cab41");
  private mists: { sp: THREE.Sprite; x0: number; drift: number; op: number }[] = [];
  private steams: { sp: THREE.Sprite; x: number; z: number; ph: number }[] = [];
  private bubbles: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1639);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
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
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildSummit(R, r);
  }

  // ---------------- the summit: craters, wall, terrace ----------------
  private buildSummit(R: THREE.Group, r: () => number) {
    // base land under everything: dry summit savanna
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassDryTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.35, -40); land.receiveShadow = true; R.add(land);
    // ---- the three craters ----
    const tnm = makeCrater(LAKE_TNM[0], LAKE_TNM[2], 13, 11, "#35c2a8", "#e6dda6", "kelimutuTnm", 11);
    R.add(tnm.group); this.tnmMat = tnm.lakeMat as THREE.MeshLambertMaterial;
    this.lakeFlows.push({ map: tnm.lakeMap, sx: 0.011, sy: 0.007 });
    const tap = makeCrater(LAKE_TAP[0], LAKE_TAP[2], 12, 10.5, "#a34d20", "#c46a35", "kelimutuTap", 23);
    R.add(tap.group);
    this.lakeFlows.push({ map: tap.lakeMap, sx: -0.006, sy: 0.009 });
    const tab = makeCrater(LAKE_TAB[0], LAKE_TAB[2], 10, 8.5, "#1e4f9e", "#e8e6da", "kelimutuTab", 37);
    R.add(tab.group);
    this.lakeFlows.push({ map: tab.lakeMap, sx: 0.004, sy: -0.003 });
    // ---- the shared wall between the twins: a rock ridge with
    // a stone-slab path on its crest (the famous ±5 m divide) ----
    const wallM = lam2({ map: rep(rockTex("kelimutuWall", "#77664e"), 4, 2) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 12.5, 30), wallM);
    wall.position.set(0, -0.2, -30.5); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    const slabM = lam2({ map: rep(stone("kelimutuSlab"), 1, 8), color: "#cfc4ae" });
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 25), slabM);
    path.position.set(0, WALL_Y + 0.05, -30); path.receiveShadow = true; R.add(path);
    const boulderM = lam2({ map: rep(rockTex("kelimutuWallB", "#77664e"), 1, 1) });
    for (let i = 0; i < 16; i++) {
      const s = i % 2 ? 1 : -1;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + r() * 0.6, 0), boulderM);
      b.position.set(s * (1.9 + r() * 0.5), WALL_Y - 0.15 + r() * 0.3, -19 - i * 1.6 - r());
      b.rotation.set(r() * 3, r() * 3, r() * 3); b.scale.y = 0.7; b.castShadow = true; R.add(b);
    }
    // rocky aprons where the wall meets the foreground ground
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + r() * 1.1, 0), boulderM);
      b.position.set((r() - 0.5) * 7, -0.2 + r() * 0.4, -14.5 - r() * 2);
      b.rotation.set(r() * 3, r() * 3, r() * 3); b.scale.y = 0.65; b.castShadow = true; R.add(b);
    }
    // ---- dead trees standing in the turquoise lake ----
    const deadSpots: [number, number, number][] = [[-24.5, -39.5, 3.4], [-21.8, -50.5, 2.7], [-26.8, -46.5, 4.0]];
    deadSpots.forEach(([x, z, h], i) => {
      const dt = makeDeadTree(h, 50 + i * 7);
      dt.position.set(x, -0.2, z); R.add(dt);
      blob(R, x, 0.06, z, 1.6, 1.6, 0.30);
    });
    // ---- gas bubbles pulsing on TNM's surface ----
    const bubM = new THREE.MeshBasicMaterial({ color: "#eafffa", transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.55;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 18), bubM.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(LAKE_TNM[0] + Math.cos(a) * d * 13, 0.07, LAKE_TNM[2] + Math.sin(a) * d * 11);
      ring.renderOrder = 2; R.add(ring);
      this.bubbles.push({ m: ring, ph: i * 0.83 });
    }
    // ---- fumarole steam: soft puffs rising over TAP + TNM ----
    for (let i = 0; i < 7; i++) {
      const overTap = i < 4;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }));
      const cx = overTap ? LAKE_TAP[0] : LAKE_TNM[0], cz = overTap ? LAKE_TAP[2] : LAKE_TNM[2];
      sp.position.set(cx, 2, cz); sp.layers.set(NOINK); R.add(sp);
      this.steams.push({ sp, x: cx + (r() - 0.5) * 5, z: cz + (r() - 0.5) * 5, ph: i / 7 });
    }
    // ---- summit mist: wide soft veils drifting over the lakes ----
    const mistSpots: [number, number, number, number][] = [
      [-16, 5.5, -46, 46], [15, 6.5, -48, 40], [-38, 6, -84, 34], [0, 8, -64, 60], [-4, 4.5, -30, 30],
    ];
    mistSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0.10 + (i % 3) * 0.03 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.30, 1); sp.layers.set(NOINK); R.add(sp);
      this.mists.push({ sp, x0: x, drift: 0.5 + (i % 3) * 0.3, op: 0.10 + (i % 3) * 0.03 });
    });
    // ---- the viewpoint terrace on the foreground knoll ----
    const knoll = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 11.5, 7.4, 26),
      lam2({ map: rep(rockTex("kelimutuKnoll", "#77664e"), 6, 2) }));
    knoll.position.set(HERO_SPOT[0], 3.0, HERO_SPOT[2]); knoll.castShadow = true; knoll.receiveShadow = true; R.add(knoll);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5.05, 0.7, 26),
      lam2({ map: rep(stone("kelimutuTerraceSide"), 6, 1), color: "#b7ab94" }));
    cap.position.set(HERO_SPOT[0], TERRACE_Y - 0.35, HERO_SPOT[2]); cap.castShadow = true; cap.receiveShadow = true; R.add(cap);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4.7, 26),
      lam2({ map: rep(stone("kelimutuTerraceTop"), 3, 3), color: "#cfc4ae" }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(HERO_SPOT[0], TERRACE_Y + 0.012, HERO_SPOT[2]); floor.receiveShadow = true; R.add(floor);
    // railing along the lake side of the terrace
    const railM = lam2({ map: rep(planks(), 1, 1), color: "#8a6844" });
    const postPts: THREE.Vector3[] = [];
    for (let deg = 192; deg <= 348; deg += 13) {
      const a = (deg * Math.PI) / 180;
      const px = HERO_SPOT[0] + Math.cos(a) * 4.35, pz = HERO_SPOT[2] + Math.sin(a) * 4.35;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.95, 7), railM);
      post.position.set(px, TERRACE_Y + 0.47, pz); post.castShadow = true; R.add(post);
      postPts.push(new THREE.Vector3(px, TERRACE_Y + 0.92, pz));
    }
    for (let i = 0; i + 1 < postPts.length; i++) {
      const a = postPts[i], b = postPts[i + 1], mid = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b);
      for (const dy of [0, -0.42]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.07, 0.07), railM);
        rail.position.set(mid.x, mid.y + dy, mid.z);
        rail.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
        R.add(rail);
      }
    }
    // the carved sign at the terrace edge
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.9, 7), railM);
    signPost.position.set(5.4, TERRACE_Y + 0.95, 6.6); signPost.castShadow = true; R.add(signPost);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.07),
      [railM, railM, railM, railM, lam2({ map: signTex() }), railM] as THREE.Material[]);
    sign.position.set(5.4, TERRACE_Y + 1.62, 6.6); sign.rotation.y = -0.35; sign.castShadow = true; R.add(sign);
    // dirt path from the terrace down to the wall
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 15), lam2({ map: rep(soilTex(), 1, 6) }));
    dirt.rotation.x = -Math.PI / 2; dirt.rotation.z = 0.05; dirt.position.set(0.6, -0.28, -6.5); dirt.receiveShadow = true; R.add(dirt);
    // ---- vegetation: savanna trees + shrubs on the outer slopes ----
    const greens = ["#7a9a3a", "#93b34c", "#5d7d2e"];
    const treeAt = (x: number, z: number, y: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, y, z); R.add(t);
      this.trees.push({ g: t, ph: seed * 0.37 });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, y + 0.06, z); disc.receiveShadow = true; R.add(disc);
    };
    treeAt(-34, -18, -0.3, 5.2, 21); treeAt(30, -22, -0.3, 4.6, 33); treeAt(38, -58, -0.3, 5.6, 45);
    treeAt(-46, -52, -0.3, 4.8, 57); treeAt(24, 2, -0.3, 4.2, 69); treeAt(-22, 6, -0.3, 5.0, 81);
    treeAt(48, -30, -0.3, 6.0, 93); treeAt(-56, -78, -0.3, 5.4, 105); treeAt(12, -108, -0.3, 6.4, 117);
    treeAt(-14, -112, -0.3, 5.8, 129); treeAt(34, -96, -0.3, 5.2, 141);
    // shrubs hugging the terrace + wall base
    const bushMats = [
      lam2({ color: greens[2], map: rep(foliageTex("kelimutuFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("kelimutuFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("kelimutuFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, y: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, y + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    bushAt(-3.4, TERRACE_Y - 0.1, 12.6, 0.8, 0); bushAt(6.2, TERRACE_Y - 0.1, 12.2, 0.65, 1);
    bushAt(-4.6, -0.3, -12, 0.9, 2); bushAt(5.2, -0.3, -13.5, 0.75, 0); bushAt(-7.5, -0.3, 2, 1.0, 1);
    bushAt(9.5, -0.3, -4, 0.85, 2); bushAt(-10.5, -0.3, -20, 1.1, 0); bushAt(11.5, -0.3, -24, 0.95, 1);
    // sun + shade pools layering the foreground ground
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (7 + r() * 16), -0.30, 8 - r() * 60, 5 + r() * 6, 6 + r() * 8, 0.14 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 6; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (7 + r() * 15), -0.295, 6 - r() * 55, 5 + r() * 5, 6 + r() * 6, 0.22 + r() * 0.10, r() * 3);
    }
    // ---- grass tufts: terrace ring, path edges, open ground ----
    const tuftPts: { x: number; y: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, y: number, z: number, s = 1) => { tuftPts.push({ x, y, z, s }); };
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = 5.2 + r() * 1.6;
      pushTuft(HERO_SPOT[0] + Math.cos(a) * d, TERRACE_Y - 0.55 - r() * 1.6, HERO_SPOT[2] + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let z = -4; z > -17; z -= 0.8 + r() * 0.6) {
      if (r() < 0.8) pushTuft(1.9 + r() * 0.5, -0.3, z, 0.8 + r() * 0.7);
      if (r() < 0.8) pushTuft(-0.9 - r() * 0.5, -0.3, z - 0.3, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 700; i++) {
      const x = (r() - 0.5) * 130, z = 14 - r() * 120;
      const dTnm = Math.hypot((x - LAKE_TNM[0]) / 17, (z - LAKE_TNM[2]) / 14);
      const dTap = Math.hypot((x - LAKE_TAP[0]) / 16, (z - LAKE_TAP[2]) / 13.5);
      const dTab = Math.hypot((x - LAKE_TAB[0]) / 13, (z - LAKE_TAB[2]) / 11);
      if (Math.min(dTnm, dTap, dTab) < 1.55) continue;             // not on the bowls
      if (Math.abs(x) < 3.4 && z < -14 && z > -47) continue;        // not on the wall
      if (Math.hypot(x - HERO_SPOT[0], z - HERO_SPOT[2]) < 6) continue; // not on the knoll
      pushTuft(x, -0.3, z, 0.65 + r() * 0.85);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.15 + (r() - 0.5) * 0.04, 0.38, 0.88 + (r() - 0.5) * 0.2);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
      // tuft y rides along in the data via a parallel array trick:
      (this.tuftData[i] as { y?: number }).y = p.y;
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // ---- distant Flores ridges closing the horizon ----
    const ridgeM = (col: string) => lam2({ color: col, map: rep(foliageTex("kelimutuFoliageRidge"), 5, 2) });
    const ridges: [number, number, number, number, string][] = [
      [-95, -175, 95, 44, "#5d7f78"], [35, -195, 115, 56, "#54746e"], [130, -155, 75, 34, "#64847a"],
      [-170, -125, 75, 30, "#64847a"], [185, -90, 80, 36, "#5d7f78"],
    ];
    for (const [x, z, rad, h, col] of ridges) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 24), ridgeM(col));
      cone.position.set(x, h / 2 - 3, z); R.add(cone);
    }
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
    // ---- STANDAR GERAK: everything that should move, moves ----
    // the lakes flow (texture scroll, each at its own pace)
    for (const lf of this.lakeFlows) lf.map.offset.set(tt * lf.sx, tt * lf.sy);
    // TNM changes colour on cue (shot 4) and keeps the new colour
    if (this.tnmMat) this.tnmMat.color.copy(this.tnmTurq).lerp(this.tnmGreen, tnmShiftAt(id, tt));
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the summit breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, (p as { y?: number }).y ?? -0.3, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // summit mist drifts sideways and breathes
    this.mists.forEach((m, i) => {
      m.sp.position.x = m.x0 + Math.sin(tt * 0.05 * m.drift + i * 1.7) * 6 + tt * 0.22 * m.drift;
      (m.sp.material as THREE.SpriteMaterial).opacity = m.op * (0.8 + 0.25 * Math.sin(tt * 0.23 + i * 2.1));
    });
    // fumarole steam rises, swells and fades in a loop
    for (const st of this.steams) {
      const u = (tt * 0.09 + st.ph) % 1;
      st.sp.position.set(st.x + Math.sin(tt * 0.6 + st.ph * 9) * 0.8 + u * 2.2, 1.2 + u * 8.5, st.z);
      const sc2 = 5 + u * 13;
      st.sp.scale.set(sc2, sc2 * 0.72, 1);
      (st.sp.material as THREE.SpriteMaterial).opacity = Math.sin(u * Math.PI) * 0.17;
    }
    // gas bubbles breathe on TNM's surface
    for (const b of this.bubbles) {
      const u = (tt * 0.5 + b.ph) % 1;
      const s2 = 0.5 + u * 1.7;
      b.m.scale.set(s2, s2, 1);
      ((b.m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - u);
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
