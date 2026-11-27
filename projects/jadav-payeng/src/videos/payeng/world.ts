// Jadav Payeng's Molai forest, Assam, as one three.js scene
// for the Fafnir-ID cover frame: a golden Brahmaputra sandbar
// in the foreground, the wide river behind it, and a towering
// green forest wall that ONE man planted alone. Young Jadav
// kneels planting a bamboo sapling in the near foreground with
// the hero standing beside him, shocked at the size of the
// claim. VISUAL CORE: bright Indian daylight, emerald river,
// saturated greens, golden sand — textured everything
// (anti-banding: speckled sky, flecked water, grainy sand).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, RIVER_Z, FOREST_Z, JADAV_SPOT, SAPLING_ROW_Z, ANIMAL_C, SNAKE_C, saplingAt, clamp01 } from "./story";

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
const skyTexDay = () => ctex("payengSkyDay2", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#bcd9f7"); grad.addColorStop(1, "#e9f2fb");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // high wispy cirrus, faint and stretched
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  // cumulus clusters in the band the cover camera actually sees
  // (canvas y ~300-540 = just above the horizon), all the way around
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
const glowTex = () => ctex("payengGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("payengBirds", 256, 96, (g, r) => {
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
  g.fillStyle = "#9db98d"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) { // shadow pockets
    g.fillStyle = `rgba(38,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { // individual leaf flecks
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(240,255,214,${0.12 + r() * 0.22})` : `rgba(30,58,24,${0.10 + r() * 0.18})`;
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
/** RICH grass (round-3 anti-flat pass): the old lawn read as one
 *  neon-lime sheet — its strokes sat too close in value to the
 *  base, so the x1.5 sun lift ironed them flat. This one is built
 *  like the canopy texture that already reads well: deep shadow
 *  pockets, a mid-green body, sunlit fleck clusters and thousands
 *  of individual blades in five greens with hard value contrast,
 *  on a deeper base that survives the lift without going neon. */
const grassRichTex = () => ctex("payengGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c8433"; g.fillRect(0, 0, S, S);
  // large organic value blotches: shaded hollows + sunlit rises
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "38,84,26" : "126,186,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // leaf-fleck speckle, same recipe as the canopy: lit flecks
  // over deep shadow pockets, thousands of them
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(196,240,150,${0.10 + r() * 0.20})` : `rgba(24,56,16,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  // individual blades: five greens, hard contrast, slight lean
  const blades = ["#2c5c1d", "#3f7d29", "#5da23e", "#8fce62", "#b9e586"];
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
  // drawn tuft glyphs: little dark-rooted fans that read as clumps
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, h = 9 + r() * 10;
    wrapDraw(S, x, y, 18, (xx, yy) => {
      for (let b = -2; b <= 2; b++) {
        g.strokeStyle = b % 2 ? "#69b047" : "#356f24"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  // sparse soil flecks + a few tiny wildflowers in the texture
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
  const flw = ["#fff6da", "#ffd94d", "#f6a8c0", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases and bush feet: warm brown speckled
 *  with darker clods and pale grit, never a flat sticker */
const soilTex = () => ctex("payengSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("payengPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("payengBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for the plain-walled houses */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const thatchTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // woven straw: dense near-vertical strokes, light over dark —
  // round 2: stronger contrast so the weave reads at distance
  for (let i = 0; i < 6800; i++) {
    const x = r() * 512, y = r() * 512, l = 10 + r() * 26;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,230,165" : "36,22,8"},${0.09 + r() * 0.16})`;
    g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + l); g.stroke();
  }
  // horizontal binding bands of a laid thatch roof, each with a
  // soft shadow gradient under it so the courses stack in depth
  for (let y = 42; y < 512; y += 62) {
    const sh = g.createLinearGradient(0, y, 0, y + 22);
    sh.addColorStop(0, "rgba(28,17,6,0.42)"); sh.addColorStop(1, "rgba(28,17,6,0)");
    g.fillStyle = sh; g.fillRect(0, y, 512, 22);
    g.fillStyle = "rgba(255,232,170,0.20)"; g.fillRect(0, y - 3, 512, 3);
  }
});
const brickTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(240,235,225,0.35)"; g.lineWidth = 3;
  for (let y = 0; y <= 512; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let row = 0; row < 13; row++) for (let x = (row % 2) * 42; x <= 512; x += 84) {
    g.beginPath(); g.moveTo(x, row * 42); g.lineTo(x, row * 42 + 42); g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,220" : "30,16,10"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});
const blobTex = () => ctex("payengBlob", 256, 256, (g) => {
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

/** A tree with a REAL canopy (round-2 anti-flat pass): a bark-
 *  textured trunk with angled branches, and 9-13 overlapping
 *  foliage blobs in three depth layers — deep shadow green low,
 *  mid green main mass, sunlit flecks on top — all carrying a
 *  leaf-fleck texture so no surface is a smooth ball again.
 *  Silhouettes are jittered per seed: organic, never lollipops. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "payengFoliageDeep"),
    folM(greens[0], "payengFoliageMid"),
    folM(greens[1] ?? greens[0], "payengFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  // branches reaching into the canopy
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.3, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.52, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  // shadow underlayer, main mass, sunlit crown — in that order
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
 *  the banks so lawn edges stop being ruler-straight lines. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#26511a"), tip = new THREE.Color("#93cc5e"), tmp = new THREE.Color();
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


/** pale river sand: warm grains, darker clods, pale grit — never a flat sheet */
const sandTex = () => ctex("payengSand", 512, 512, (g, r) => {
  g.fillStyle = "#d9c08a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "160,128,70" : "240,220,170"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 34, 7 + r() * 20, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "120,92,48" : "246,232,190"},${0.12 + r() * 0.22})`;
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
});

/** A dead snake on the sand (shot 2): a flattened S-curve tube
 *  with a head — limp, sun-baked, unmistakable at a glance. */
const makeSnake = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 97 + 5);
  const pts = [new THREE.Vector3(-0.9, 0.05, 0), new THREE.Vector3(-0.3, 0.05, 0.28 + tr() * 0.2),
    new THREE.Vector3(0.35, 0.05, -0.22 - tr() * 0.2), new THREE.Vector3(0.95, 0.05, 0.08)];
  const curve = new THREE.CatmullRomCurve3(pts);
  const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.085, 7),
    lam2({ color: "#4a3826" }));
  body.scale.y = 0.45; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam2({ color: "#3a2c1c" }));
  head.position.set(1.0, 0.06, 0.08); head.scale.set(1.3, 0.6, 1); g.add(head);
  return g;
};

/** A bamboo sapling: thin green culm + a few young leaves.
 *  Group origin at the ground so update() can scale it as it grows. */
const makeSapling = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 53 + 3);
  const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.85, 6),
    lam2({ color: "#5da24a" }));
  culm.position.y = 0.42; culm.castShadow = true; g.add(culm);
  const leafM = lam2({ color: "#7cc46a", map: rep(foliageTex("payengSaplingLeaf"), 1, 1) });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 + tr() * 0.08, 8, 6), leafM);
    leaf.position.set(Math.cos(a) * 0.14, 0.82 + tr() * 0.12, Math.sin(a) * 0.14);
    leaf.scale.set(1.3, 0.55, 1); leaf.castShadow = true; g.add(leaf);
  }
  return g;
};

/** A metal watering can beside Jadav (shot 3): body + angled spout + handle. */
const makeWateringCan = () => {
  const g = new THREE.Group();
  const m = lam2({ color: "#3d7a4a" });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.42, 12), m);
  body.position.y = 0.21; body.castShadow = true; g.add(body);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 7), m);
  spout.position.set(0.36, 0.32, 0); spout.rotation.z = -0.9; g.add(spout);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.08, 8), lam2({ color: "#2e5d3a" }));
  rose.position.set(0.58, 0.52, 0); rose.rotation.z = -0.9; g.add(rose);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14, Math.PI), m);
  handle.position.set(-0.05, 0.42, 0); handle.rotation.z = 0.2; g.add(handle);
  return g;
};

/** A grazing elephant from primitives: barrel body, head, trunk,
 *  big ears, column legs — reads clearly at mid-ground distance. */
const makeElephant = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 71 + 2);
  const skin = lam2({ color: "#8a8a92" });
  const skinD = lam2({ color: "#6e6e78" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skin);
  body.scale.set(1.7, 1.15, 1.05); body.position.y = 1.55; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 9), skin);
  head.position.set(1.55, 1.85, 0); head.castShadow = true; g.add(head);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), skinD);
    ear.scale.set(0.25, 1, 1.15); ear.position.set(1.35, 1.95, s * 0.5); ear.rotation.z = s * 0.15; g.add(ear);
  }
  // trunk: three stacked segments curving down-forward
  let tx = 2.05, ty = 1.75;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.035, 0.19 - i * 0.035, 0.55, 8), skin);
    seg.position.set(tx, ty, 0); seg.rotation.z = 0.5 + i * 0.45; seg.castShadow = true; g.add(seg);
    tx += 0.22 - i * 0.05; ty -= 0.42;
  }
  for (const [lx, lz] of [[1.15, 0.55], [1.15, -0.55], [-1.15, 0.55], [-1.15, -0.55]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 1.1, 8), skinD);
    leg.position.set(lx, 0.55, lz); leg.castShadow = true; g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), skinD);
  tail.position.set(-1.75, 1.35, 0); tail.rotation.z = 0.25; g.add(tail);
  void tr;
  return g;
};

/** A rhino from primitives: barrel body, wedge head, one horn. */
const makeRhino = () => {
  const g = new THREE.Group();
  const skin = lam2({ color: "#7d7d84" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skin);
  body.scale.set(1.5, 1.0, 0.95); body.position.y = 1.25; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.7), skin);
  head.position.set(1.45, 1.35, 0); head.rotation.z = -0.15; head.castShadow = true; g.add(head);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 8), lam2({ color: "#d9cdb2" }));
  horn.position.set(1.8, 1.85, 0); horn.rotation.z = -0.35; g.add(horn);
  for (const [lx, lz] of [[1.0, 0.45], [1.0, -0.45], [-1.0, 0.45], [-1.0, -0.45]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), lam2({ color: "#66666e" }));
    leg.position.set(lx, 0.45, lz); leg.castShadow = true; g.add(leg);
  }
  return g;
};

/** A tiger from primitives: orange barrel body, striped bands,
 *  head + ears + tail — mid-ground, mostly still, tail swaying. */
const makeTiger = () => {
  const g = new THREE.Group();
  const fur = lam2({ color: "#d8842e" });
  const dark = lam2({ color: "#2c2018" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), fur);
  body.scale.set(1.5, 0.85, 0.7); body.position.y = 0.95; body.castShadow = true; g.add(body);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 1.42), dark);
    stripe.position.set(-0.9 + i * 0.55, 1.15, 0); stripe.rotation.z = (i % 2 ? -1 : 1) * 0.12; g.add(stripe);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), fur);
  head.position.set(1.55, 1.15, 0); head.castShadow = true; g.add(head);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), dark);
    ear.position.set(1.45, 1.5, s * 0.28); g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.3, 7), fur);
  tail.position.set(-1.65, 1.0, 0); tail.rotation.z = 1.1; g.add(tail);
  for (const [lx, lz] of [[1.0, 0.35], [1.0, -0.35], [-1.0, 0.35], [-1.0, -0.35]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 7), fur);
    leg.position.set(lx, 0.35, lz); leg.castShadow = true; g.add(leg);
  }
  return g;
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
  private snakes: THREE.Group[] = [];
  private animals: THREE.Group[] = [];
  private saplings: { g: THREE.Group; base: number }[] = [];
  private wateringCan: THREE.Group | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private riverReeds: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1575);
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
    // cloud sprites placed IN the cover camera's view corridor
    // (down -Z, low enough to sit in the upper frame) — round 1
    // scattered them all around the compass at heights the lens
    // never saw, leaving a bare sky. Layered near -> far.
    const cloudSpots: [number, number, number, number][] = [
      // x, y, z, width — kept modest: accents in the sky, not a
      // white ceiling (round 2a sprites at 190-260 wide ate the
      // whole upper frame)
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
    // the sun's halo + core, upper left over the river
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant bird flocks, small + high (round 2a parked one
    // right over the claim card, where it read as a scratch)
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildForest(R, r);
  }

  // ---------------- the sandbar: sand, river, forest wall ----------------
  private buildForest(R: THREE.Group, r: () => number) {
    // base land under everything (forest floor green)
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the golden sandbar: a wide sandy ellipse in the foreground
    const sand = new THREE.Mesh(new THREE.CircleGeometry(46, 36), lam2({ map: rep(sandTex(), 24, 24) }));
    sand.rotation.x = -Math.PI / 2; sand.scale.set(1.15, 0.62, 1); sand.position.set(0, 0.02, 6); sand.receiveShadow = true; R.add(sand);
    // soft sand drifts + pebbles scattered on the bar
    for (let i = 0; i < 10; i++) {
      softPatch(R, patchTex(), "#e8d8a4", (r() - 0.5) * 44, 0.03, 2 + (r() - 0.5) * 26, 5 + r() * 6, 4 + r() * 5, 0.14 + r() * 0.1, r() * 3);
    }
    for (let i = 0; i < 40; i++) {
      const peb = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.12, 7, 5), lam2({ color: r() > 0.5 ? "#8a7a5c" : "#b09a72" }));
      peb.position.set((r() - 0.5) * 46, 0.06, -4 + r() * 26); peb.scale.y = 0.6; peb.castShadow = true; R.add(peb);
    }
    // the Brahmaputra: wide river strip behind the sandbar (map kept
    // so update() can scroll it — the water FLOWS, it is not a poster)
    const riverMap = rep(water(), 10, 2);
    this.waterMap = riverMap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(200, 13), lam2({ map: riverMap, color: "#7fc4a8" }));
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0, RIVER_Z); river.receiveShadow = true; R.add(river);
    // soft reflection bands: the forest's green smeared on the water
    const reflM = (col: string, op: number) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false });
    for (const z of [-13.5, -18.5]) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(190, 2.2), reflM("#27567f", 0.13));
      band.rotation.x = -Math.PI / 2; band.position.set(0, 0.015, z); band.renderOrder = 1; R.add(band);
    }
    // reeds along the waterline, swaying in update()
    const reedM = lam2({ color: "#4a7a3a" });
    for (let i = 0; i < 46; i++) {
      const s = i % 2 ? 1 : -1;
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7 + r() * 0.5, 5), reedM);
      reed.position.set(s * (6 + r() * 40), 0.35, -9.5 - r() * 1.2);
      R.add(reed);
      this.riverReeds.push({ m: reed, ph: i * 0.83 + (s > 0 ? 2.1 : 0) });
    }
    // dead snakes on the sand (shot 2 only — hidden otherwise)
    const snakeSpots: [number, number, number][] = [[1.5, -4, 0.4], [3.4, -2.5, 2.2], [-0.6, -6, 1.1]];
    snakeSpots.forEach(([x, z, yaw], i) => {
      const sn = makeSnake(i + 1);
      sn.position.set(x, 0.04, z); sn.rotation.y = yaw;
      sn.visible = false; R.add(sn); this.snakes.push(sn);
    });
    // the sapling row Jadav plants across the sand (shots 1-3 young,
    // grown into young trees from shot 4 on — scaled in update())
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2 + (r() - 0.5) * 0.8;
      const sp = makeSapling(i + 1);
      sp.position.set(x, 0.02, SAPLING_ROW_Z + (r() - 0.5) * 1.2);
      R.add(sp);
      this.saplings.push({ g: sp, base: 0.9 + r() * 0.35 });
    }
    // watering can beside Jadav (shot 3 only — hidden otherwise)
    this.wateringCan = makeWateringCan();
    this.wateringCan.position.set(JADAV_SPOT[0] + 1.1, 0.02, JADAV_SPOT[2] + 0.8);
    this.wateringCan.visible = false; R.add(this.wateringCan);
    // ---- the Molai forest wall: dense rows of trees, near -> far ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treePts: [number, number][] = [];
    const rows: [number, number, number][] = [ // z, step, height base
      [-30, 7, 6.5], [-38, 8, 7.5], [-48, 9, 8.5], [-60, 10, 9.5], [-75, 12, 10.5], [-92, 13, 11], [-110, 14, 12],
    ];
    rows.forEach(([z, step, hb], ri) => {
      for (let x = -56; x <= 56; x += step) {
        const jx = x + (r() - 0.5) * 4, jz = z + (r() - 0.5) * 4;
        const h = hb + (r() - 0.5) * 2.5;
        const t = makeTree(h, greens, ri * 31 + Math.round(jx) * 7 + 11);
        t.position.set(jx, 0.1, jz);
        R.add(t);
        this.trees.push({ g: t, ph: ri * 1.93 + jx * 0.31 });
        treePts.push([jx, jz]);
      }
    });
    // near flanking trees framing the cover shot
    const flank: [number, number, number][] = [[-15, -6, 5.2], [15.5, -8, 5.6], [-18, -16, 6.4], [18, -18, 6.0], [-12, -20, 7.2], [13, -22, 6.8]];
    flank.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 200 + i * 13);
      t.position.set(x, 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: 7.1 + i * 1.61 });
      treePts.push([x, z]);
    });
    // bamboo clumps — Payeng started with bamboo; tall thin culms
    const bambooSpots: [number, number][] = [[-22, -28], [24, -30], [-30, -44], [30, -46], [10, -52], [-12, -58]];
    for (const [bx, bz] of bambooSpots) {
      for (let i = 0; i < 6; i++) {
        const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5 + r() * 1.5, 6),
          lam2({ color: "#6a9a4a" }));
        culm.position.set(bx + (r() - 0.5) * 1.6, 2.75, bz + (r() - 0.5) * 1.6);
        culm.rotation.z = (r() - 0.5) * 0.12; culm.castShadow = true; R.add(culm);
      }
      const top = makeTree(3.2, greens, 300 + Math.round(bx));
      top.position.set(bx, 4.6, bz); top.scale.set(0.7, 0.55, 0.7); R.add(top);
    }
    // ---- round 3: grass dressing — the forest floor stops being a sheet ----
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts.slice(0, 40)) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    const bushMats = [
      lam2({ color: greens[2], map: rep(foliageTex("payengFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("payengFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("payengFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, 0.1 + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    for (let i = 0; i < 26; i++) {
      const s = r() < 0.5 ? 1 : -1;
      bushAt(s * (8 + r() * 34), -24 - r() * 60, 0.5 + r() * 0.5, Math.floor(r() * 3));
    }
    // 3D grass tufts, instanced: dense fringes along the riverbank
    // and the forest edge, loose scatter over the sandbar verge
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let z = 14; z > -24; z -= 0.5 + r() * 0.55) {
      for (const s of [1, -1]) if (r() < 0.8) pushTuft(s * (10 + r() * 18), z + (r() - 0.5), 0.85 + r() * 0.8);
    }
    for (const [tx, tz] of treePts.slice(0, 30)) for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 420; i++) {
      const x = (r() - 0.5) * 90, z = -22 - r() * 70;
      pushTuft(x, z, 0.65 + r() * 0.8);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // wildflower knots among the tufts on the forest floor
    const fl2 = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6", "#e86a9a", "#9a6ae0"];
    for (let i = 0; i < 80; i++) {
      const cx = (r() - 0.5) * 70, cz = -24 - r() * 70;
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055 + r() * 0.05, 6, 5), lam2({ color: fl2[Math.floor(r() * fl2.length) % fl2.length] }));
        dot.position.set(cx + (r() - 0.5) * 0.55, 0.2 + r() * 0.14, cz + (r() - 0.5) * 0.55);
        R.add(dot);
      }
    }
    // ---- the wildlife (shot 5 only — hidden otherwise) ----
    const el1 = makeElephant(1); el1.position.set(-4.5, 0, -11); el1.rotation.y = 0.4; el1.visible = false; R.add(el1);
    const el2 = makeElephant(2); el2.position.set(3.5, 0, -15); el2.rotation.y = -0.5; el2.scale.setScalar(0.8); el2.visible = false; R.add(el2);
    const rh = makeRhino(); rh.position.set(8, 0, -10); rh.rotation.y = -0.7; rh.visible = false; R.add(rh);
    const tg = makeTiger(); tg.position.set(-8.5, 0, -14); tg.rotation.y = 0.9; tg.visible = false; R.add(tg);
    this.animals.push(el1, el2, rh, tg);
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
    // river flows toward the viewer (texture scroll, not a poster)
    if (this.waterMap) this.waterMap.offset.set(0, tt * 0.055);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
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
    // river reeds sway
    for (const rd of this.riverReeds) {
      rd.m.rotation.z = Math.sin(tt * 1.9 + rd.ph) * 0.09;
      rd.m.rotation.x = Math.cos(tt * 1.5 + rd.ph) * 0.05;
    }
    // saplings grow in shot 3 (time-lapse), young trees from shot 4 on
    const gk = id === 3 ? saplingAt(tt) : id <= 2 ? 0.3 : 1.6;
    for (const sp of this.saplings) sp.g.scale.setScalar(sp.base * gk);
    // dead snakes only on the 1979 sandbar (shot 2)
    for (const sn of this.snakes) sn.visible = id === 2;
    // watering can only while planting (shot 3)
    if (this.wateringCan) this.wateringCan.visible = id === 3;
    // wildlife only in the clearing (shot 5) — grazing sway
    for (const an of this.animals) {
      an.visible = id === 5;
      if (id === 5) an.rotation.y += Math.sin(tt * 0.5 + an.position.x) * 0.0006;
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
