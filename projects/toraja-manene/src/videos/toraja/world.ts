// Toraja Ma'Nene, Tana Toraja as one three.js scene for the
// Fafnir-ID cover frame: a ritual clearing at the foot of the
// Lemo limestone cliff — dark hand-carved niches (liang) stud
// the grey rock face, wooden Tau-Tau effigies stand guard on a
// ledge, and the open Patane coffin waits at the clearing's
// heart while the family lifts the ancestor out. Tongkonan
// houses with saddle roofs flank the clearing; rice terraces
// step down the valley sides; green hills close the horizon.
// VISUAL CORE: warm mountain morning light, grey limestone +
// deep niche shadow, red-and-black woven cloth, gold ornaments,
// packed-earth clearing scattered with offering flowers.
// Textured everything (anti-banding: speckled sky, flecked
// foliage, woven cloth). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, CLIFF_Z } from "./story";

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
const skyTexDay = () => ctex("torajaSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("torajaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("torajaBirds", 256, 96, (g, r) => {
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
/** RICH packed-earth ground: warm brown base, deep shadow
 *  blotches, sunlit flecks and thousands of grit specks — the
 *  clearing floor is trodden earth, never a flat sheet. */
const earthTex = () => ctex("torajaEarth", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#7d6547"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "90,64,36" : "178,148,104";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(232,214,178,${0.10 + r() * 0.20})` : `rgba(52,38,20,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** bare earth for tree bases: warm brown speckled with darker
 *  clods and pale grit, never a flat sticker */
const soilTex = () => ctex("torajaSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("torajaPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("torajaBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** limestone cliff face: grey strata bands, dark weathered
 *  pockets and pale lichen flecks — the Lemo wall is old stone,
 *  never a flat grey slab */
const rockTex = () => ctex("torajaRock", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#a89d8c"; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 46 + r() * 30) { // horizontal strata bands
    g.fillStyle = `rgba(${r() > 0.5 ? "70,66,60" : "190,182,170"},${0.10 + r() * 0.12})`;
    g.fillRect(0, y, S, 8 + r() * 18);
  }
  for (let i = 0; i < 120; i++) { // weathered dark pockets
    const x = r() * S, y = r() * S, rad = 12 + r() * 60;
    const gr = g.createRadialGradient(x, y, 2, x, y, rad);
    gr.addColorStop(0, `rgba(52,48,44,${0.15 + r() * 0.15})`); gr.addColorStop(1, "rgba(52,48,44,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 0.6, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 4200; i++) { // pale lichen + grit
    g.fillStyle = `rgba(${r() > 0.5 ? "214,206,192" : "60,56,50"},${0.06 + r() * 0.12})`;
    g.fillRect(r() * S, r() * S, 2.2, 2.2);
  }
  for (let i = 0; i < 90; i++) { // vertical rain streaks
    const x = r() * S, y = r() * S, l = 30 + r() * 120;
    g.strokeStyle = `rgba(60,56,50,${0.08 + r() * 0.1})`; g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
});
/** woven Toraja cloth: bold red-black bands with a gold zigzag
 *  — the pattern on the banners, the ancestor's new kain, and
 *  the family sashes. Never a flat stripe: weave grain + bleach. */
const weaveTex = (key: string, c1: string, c2: string) => ctex(key, 256, 256, (g, r) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 32, 0, 32, 256); }
  // gold zigzag band across the middle
  g.strokeStyle = "#d9a441"; g.lineWidth = 7; g.lineJoin = "round";
  g.beginPath();
  for (let x = 0; x <= 256; x += 32) { const y = 118 + (x / 32 % 2 ? 14 : -14); x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "20,10,0"},${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2.2, 2.2); }
  for (let y = 0; y < 256; y += 6) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(0, y, 256, 1); }
});
/** quiet plaster noise for the Tongkonan walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const blobTex = () => ctex("torajaBlob", 256, 256, (g) => {
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

/** A tree with a REAL canopy: a bark-textured trunk with angled
 *  branches, and 9-13 overlapping foliage blobs in three depth
 *  layers — deep shadow green low, mid green main mass, sunlit
 *  flecks on top — all carrying a leaf-fleck texture so no
 *  surface is a smooth ball again. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "torajaFoliageDeep"),
    folM(greens[0], "torajaFoliageMid"),
    folM(greens[1] ?? greens[0], "torajaFoliageLite"),
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

/** A palm: a gently curved trunk and a crown of drooping fronds
 *  (flattened, tapered boxes), each frond a different green. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 557 + 3);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#8a6f4d" });
  const segs = 5;
  let x = 0, y = 0;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, h / segs, 7), trunkM);
    seg.position.set(x, y + h / segs / 2, 0);
    seg.rotation.z = 0.03 * i;
    x += 0.03 * (h / segs) * i * 0.4;
    seg.castShadow = true; g.add(seg);
    y += h / segs;
  }
  const frondM = (col: string) => lam2({ color: col, side: THREE.DoubleSide });
  const cols = ["#3d7a32", "#4a8a3a", "#5da24a"];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + tr() * 0.5;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 2.6), frondM(cols[i % cols.length]));
    fr.position.set(Math.cos(a) * 0.9, y + 0.1 - tr() * 0.3, Math.sin(a) * 0.9);
    fr.rotation.set(Math.sin(a) * 0.55, -a, Math.cos(a) * 0.1);
    fr.rotation.y = -a + Math.PI / 2;
    fr.castShadow = true; g.add(fr);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lam2({ color: "#7a5a2e" }));
  nuts.position.set(0, y - 0.15, 0); g.add(nuts);
  return g;
};

/** One Tau-Tau effigy: a small wooden guardian figure — carved
 *  body in a long robe, head with painted hair, arms at the
 *  sides, one hand raised in blessing. Wood tones vary; a red
 *  sash marks the higher-status ones. They NEVER move: they are
 *  effigies, not people. */
const makeTauTau = (seed = 1, sash = false) => {
  const g = new THREE.Group();
  const tr = rng(seed * 431 + 7);
  const woodM = lam2({ color: "#8a5a34", map: rep(planks(), 1, 1) });
  const robeM = lam2({ color: tr() > 0.5 ? "#7a2e2e" : "#3a3a3a" });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8), robeM);
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lam2({ color: "#c99067" }));
  head.position.y = 1.62; head.scale.set(0.9, 1.1, 0.9); g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), lam2({ color: "#1d1410" }));
  hair.position.y = 1.66; g.add(hair);
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.7, 6), woodM);
    arm.position.set(s * 0.24, 1.05, 0);
    arm.rotation.z = s * (s > 0 ? -0.5 : 0.12); // right arm raised in blessing, left down
    g.add(arm);
  }
  if (sash) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.06), lam2({ color: "#d9a441" }));
    sh.position.set(0, 1.25, 0.2); sh.rotation.z = 0.35; g.add(sh);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), lam2({ color: "#5d4a30" }));
  base.position.y = 0.06; g.add(base);
  return g;
};

/** The Lemo cliff: a wide limestone wall with a weathered rock
 *  face, three rows of dark hand-carved niches (liang) at
 *  different heights, and a ledge where the Tau-Tau stand guard.
 *  Returns the group plus the tau-tau figures (kept static). */
const makeCliff = () => {
  const g = new THREE.Group();
  const rockM = lam2({ map: rep(rockTex(), 6, 2), color: "#cfc8bc" });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(96, 26, 5), rockM);
  wall.position.set(0, 13, 0); wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
  // a jutting brow over the top, so the cliff reads as a real rock face
  const brow = new THREE.Mesh(new THREE.BoxGeometry(96, 2.2, 7.5), rockM);
  brow.position.set(0, 25.5, 0.6); brow.castShadow = true; g.add(brow);
  // niches: dark recessed openings, one per family, at three heights.
  // The hole sits nearly FLUSH with the wall face (front at z 2.55
  // vs the wall at 2.5) so it reads as a dark opening, not a panel
  // stuck on the rock; the wooden frame + sill stand proud of it.
  const darkM = lam2({ color: "#14100c" });
  const frameM = lam2({ color: "#6a5a44", map: rep(planks(), 1, 1) });
  const nicheRows: [number, number][] = [ // [y, count]
    [3.2, 9], [8.5, 7], [14.5, 5],
  ];
  const r = rng(2202);
  for (const [ny, count] of nicheRows) {
    for (let i = 0; i < count; i++) {
      const x = -38 + (i + 0.5) * (76 / count) + (r() - 0.5) * 1.5;
      const w = 1.6 + r() * 0.9, h = 1.9 + r() * 0.7;
      const hole = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), darkM);
      hole.position.set(x, ny, 2.3); g.add(hole);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.18, 0.56), frameM);
      frame.position.set(x, ny + h / 2 + 0.05, 2.55); g.add(frame);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.18, 0.7), frameM);
      sill.position.set(x, ny - h / 2 - 0.05, 2.55); g.add(sill);
    }
  }
  // the Tau-Tau ledge: a stone shelf at y ~6.5 with the effigies in a row
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(52, 0.7, 2.2), lam2({ color: "#8a8078", map: rep(rockTex(), 4, 1) }));
  ledge.position.set(0, 6.2, 2.9); ledge.castShadow = true; ledge.receiveShadow = true; g.add(ledge);
  const tauSpots: [number, boolean][] = [[-20, true], [-14, false], [-8, true], [-2, false], [4, true], [10, false], [16, true], [21, false]];
  for (const [tx, sash] of tauSpots) {
    const tt = makeTauTau(Math.round(tx * 10 + 50), sash);
    tt.position.set(tx, 6.55, 3.1);
    tt.scale.setScalar(1.15);
    g.add(tt);
  }
  return g;
};

/** A Tongkonan house: a stilted wooden body with carved gable
 *  panels and the iconic saddle roof — a long curve that sweeps
 *  UP at both ends like a buffalo's horns. Front faces +Z. */
const makeTongkonan = (wallCol: string, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 5);
  const wallM = lam2({ color: "#ffffff", map: rep(plasterTex(`torajaPlaster${seed}`, wallCol), 2, 1) });
  const woodM = lam2({ color: "#6a4a2c", map: rep(planks(), 2, 1) });
  // stilts
  for (const [sx, sz] of [[-2.2, -1.4], [2.2, -1.4], [-2.2, 1.4], [2.2, 1.4]] as [number, number][]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.6, 7), woodM);
    st.position.set(sx, 0.8, sz); st.castShadow = true; g.add(st);
  }
  // body: main room + carved gable panels
  const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 4.2), wallM);
  body.position.y = 2.9; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const panelCols = ["#a83232", "#d9a441", "#1d1d1d"];
  for (let i = 0; i < 3; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.08), lam2({ color: panelCols[(i + seed) % panelCols.length] }));
    panel.position.set(-2 + i * 2, 3.1, 2.14); g.add(panel);
  }
  // door + small windows on the front
  const darkM = lam2({ color: "#241a12" });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), darkM);
  door.position.set(0, 2.45, 2.14); g.add(door);
  for (const wx of [-2.4, 2.4]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), darkM);
    win.position.set(wx, 3.3, 2.14); g.add(win);
  }
  // the saddle roof: an extruded curve — low in the middle,
  // sweeping UP at both ends (buffalo horns). Dark thatch.
  const roofM = lam2({ color: "#4a3524", map: rep(planks(), 3, 1) });
  const shape = new THREE.Shape();
  shape.moveTo(-4.4, 0);
  shape.quadraticCurveTo(-2.2, 1.6, 0, 0.9);   // dip in the middle
  shape.quadraticCurveTo(2.2, 1.6, 4.4, 0);    // sweep up at the ends
  shape.lineTo(4.4, -0.5);
  shape.quadraticCurveTo(2.2, 0.4, 0, -0.1);
  shape.quadraticCurveTo(-2.2, 0.4, -4.4, -0.5);
  shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.7);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.y = 4.6; roof.castShadow = true; g.add(roof);
  // ridge caps at the horn tips
  for (const s of [1, -1]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.6, 7), lam2({ color: "#d9a441" }));
    horn.rotation.x = Math.PI / 2; horn.position.set(s * 4.4, 4.75, 0); g.add(horn);
  }
  void tr;
  return g;
};

/** The open Patane coffin: a carved wooden box on short legs,
 *  its lid leaning open against the side — the ancestor is
 *  lifted out of it. Plus a low bier beside it for the brushing. */
const makePatane = () => {
  const g = new THREE.Group();
  const woodM = lam2({ color: "#7a5230", map: rep(planks(), 2, 1) });
  const darkM = lam2({ color: "#241a12" });
  // legs
  for (const [lx, lz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), woodM);
    leg.position.set(lx, 0.25, lz); g.add(leg);
  }
  // the box: open top, dark interior
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.95), woodM);
  box.position.y = 0.88; box.castShadow = true; box.receiveShadow = true; g.add(box);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.75), darkM);
  inner.position.y = 1.2; g.add(inner);
  // carved band around the box
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.16, 1.0), lam2({ color: "#a83232" }));
  band.position.y = 0.95; g.add(band);
  // the lid, leaning open against the box's side
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.95), woodM);
  lid.position.set(0.3, 0.55, 1.05); lid.rotation.x = -1.15; lid.castShadow = true; g.add(lid);
  // the low bier for the brushing (shot 4)
  const bier = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.8), woodM);
  bier.position.set(2.6, 0.45, 0.4); bier.castShadow = true; g.add(bier);
  for (const [lx, lz] of [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), woodM);
    leg.position.set(2.6 + lx, 0.22, 0.4 + lz); g.add(leg);
  }
  // folded new cloth waiting on the bier — red-black weave
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.55),
    lam2({ map: rep(weaveTex("torajaClothFold", "#a83232", "#1d1d1d"), 1, 1) }));
  cloth.position.set(2.6, 0.58, 0.4); cloth.rotation.y = 0.2; g.add(cloth);
  return g;
};

/** Rice terraces: stepped paddies climbing the valley side —
 *  thin green shelves with a pale water sheen on top. */
const makeTerrace = (steps: number, w: number, seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 733 + 11);
  const greenM = lam2({ color: "#5da24a", map: rep(foliageTex("torajaTerrace"), 2, 1) });
  const waterM = lam2({ color: "#9dc2d8" });
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 2.2), greenM);
    step.position.set(0, i * 0.55, -i * 2.0);
    step.castShadow = true; step.receiveShadow = true; g.add(step);
    const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.06, 1.9), waterM);
    water.position.set(0, i * 0.55 + 0.27, -i * 2.0);
    g.add(water);
  }
  void r;
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced along the
 *  clearing's outer edges so the ground never ends in a clean line. */
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
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private banners: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2408);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- warm cliff fill: the day sun sits east (az 75), so the
    // cliff's south face — the face every camera sees — is in
    // shade and goes blue-purple under twoTone. A static warm
    // fill from the south-east (no shadows) keeps the limestone,
    // the Patane wood and the Tongkonan fronts warm. Episode
    // light only — the shared day preset is untouched.
    const fill = new THREE.DirectionalLight("#ffe0b8", 0.95);
    fill.position.set(20, 25, 60);
    fill.target.position.set(0, 10, -22);
    R.add(fill, fill.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    // cloud sprites placed IN the cover camera's view corridor
    // (down -Z, low enough to sit in the upper frame). Layered
    // near -> far, kept modest: accents, not a white ceiling.
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
    // the sun's halo + core, upper left down the valley
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
    this.buildValley(R, r);
  }

  // ---------------- the valley: cliff, clearing, Tongkonan, terraces ----------------
  private buildValley(R: THREE.Group, r: () => number) {
    // green valley floor under everything, then the trodden
    // packed-earth clearing on top of it (the clearing is a
    // small disc around the Patane, NOT the whole valley)
    const grass = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ color: "#6fae54", map: rep(foliageTex("torajaGrassFloor"), 60, 60) }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, -40); grass.receiveShadow = true; R.add(grass);
    const land = new THREE.Mesh(new THREE.CircleGeometry(18, 36), lam2({ color: "#ffffff", map: rep(earthTex(), 8, 8) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, 0.01, -6); land.receiveShadow = true; R.add(land);
    // ---- the Lemo cliff closing the north end ----
    const cliff = makeCliff();
    cliff.position.set(0, 0, CLIFF_Z);
    R.add(cliff);
    // ---- the open Patane at the clearing's heart ----
    const patane = makePatane();
    patane.position.set(0, 0, -4);
    patane.rotation.y = 0.12;
    R.add(patane);
    blob(R, 0, 0.03, -4, 3.4, 2.6, 0.28);
    // ---- offering flowers scattered around the Patane ----
    const flowerCols = ["#e8542e", "#e8c832", "#d83a4a", "#f2f0e6", "#e86a9a"];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 1.6 + r() * 2.6;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07 + r() * 0.05, 7, 6),
        lam2({ color: flowerCols[i % flowerCols.length] }));
      fl.position.set(Math.cos(a) * d, 0.07, -4 + Math.sin(a) * d * 0.8);
      R.add(fl);
    }
    // ---- Tongkonan houses flanking the clearing, fronts to it ----
    const tongAt = (side: number, z: number, i: number) => {
      const h = makeTongkonan(["#d9a441", "#a83232", "#f0e6d2"][i % 3], i * 3 + (side > 0 ? 1 : 2));
      h.position.set(side * 13.5, 0, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      blob(R, side * 13.5, 0.03, z, 8.5, 7, 0.25);
    };
    tongAt(1, 2, 0); tongAt(-1, -2, 1);
    tongAt(1, -14, 2); tongAt(-1, -16, 0);
    // ---- rice terraces stepping down the valley sides ----
    const terrAt = (side: number, z: number, yaw: number) => {
      const t = makeTerrace(4, 9, Math.round(side * 10 + z));
      t.position.set(side * 21, 0, z);
      t.rotation.y = yaw;
      R.add(t);
    };
    terrAt(1, 6, -Math.PI / 2); terrAt(-1, 10, Math.PI / 2);
    terrAt(1, -30, -Math.PI / 2); terrAt(-1, -34, Math.PI / 2);
    // ---- trees + palms around the clearing ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.61 });
    };
    treeAt(11, -14, 5.2, 3); treeAt(-11.5, -12, 4.6, 11); treeAt(15, 10, 4.4, 19);
    treeAt(-15.5, 6, 5.0, 27); treeAt(9, -30, 4.2, 35); treeAt(-9.5, -32, 4.8, 43);
    const palmAt = (x: number, z: number, h: number, seed: number) => {
      const p = makePalm(h, seed);
      p.position.set(x, 0, z);
      R.add(p);
      this.trees.push({ g: p, ph: seed * 1.93 });
    };
    palmAt(16.5, -6, 6.5, 5); palmAt(-16.5, -8, 7.0, 13); palmAt(12, 16, 5.8, 21);
    // ---- far backdrop: green hills closing the horizon ----
    for (let i = 0; i < 7; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(28 + (i % 3) * 9, 16, 12),
        lam2({ color: i % 2 ? "#4a8a3a" : "#3d7a32", map: rep(foliageTex("torajaHill"), 4, 2) }));
      hill.scale.set(1.6, 0.42, 1);
      hill.position.set(-90 + i * 30, -2, -95 - (i % 2) * 12);
      R.add(hill);
    }
    // ---- woven banners on poles around the clearing ----
    // (they flutter in update() — the valley is never still)
    const bannerAt = (x: number, z: number, i: number) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6), lam2({ color: "#3a3230" }));
      pole.position.set(x, 1.7, z); pole.castShadow = true; R.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.4),
        lam2({ map: rep(weaveTex(`torajaBanner${i % 2}`, "#a83232", "#1d1d1d"), 1, 1), side: THREE.DoubleSide }));
      cloth.position.set(x, 2.1, z + 0.02);
      R.add(cloth);
      this.banners.push({ m: cloth, ph: i * 1.1 });
    };
    bannerAt(-7, -16, 0); bannerAt(7, -16, 1); bannerAt(-8, -12, 2); bannerAt(8, -12, 3);
    // ---- ground dressing: sun/shade pools + grass tufts at the edges ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8d8a4", s * (7 + r() * 6), 0.02, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.14 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d4a30", s * (7 + r() * 6), 0.021, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.22 + r() * 0.10, r() * 3);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (const s of [1, -1]) for (let z = 17; z > -20; z -= 0.5 + r() * 0.55) {
      if (r() < 0.7) tuftPts.push({ x: s * (12.2 + r() * 2.5), z: z + (r() - 0.5), s: 0.85 + r() * 0.8 });
      if (r() < 0.3) tuftPts.push({ x: s * (16.5 + r() * 2.0), z: z - 0.4, s: 0.7 + r() * 0.7 });
    }
    for (let i = 0; i < 300; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (12.5 + r() * 5), z = 16 - r() * 36;
      tuftPts.push({ x, z, s: 0.65 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy2 = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy2.position.set(p.x, 0, p.z); dummy2.rotation.set(0, yaw, 0);
      dummy2.scale.setScalar(p.s); dummy2.updateMatrix();
      tufts.setMatrixAt(i, dummy2.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
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
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees + palms sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels across the ground)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // woven banners flutter in the mountain breeze
    for (const bn of this.banners) {
      bn.m.rotation.y = Math.sin(tt * 2.2 + bn.ph) * 0.22;
      bn.m.rotation.x = Math.cos(tt * 1.8 + bn.ph) * 0.08;
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
