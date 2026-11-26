// The Dubai palace lobby as one three.js scene for the
// Fafnir-ID cover frame: polished marble underfoot, gold
// columns, a chandelier — and at the centre the GIANT gold
// ATM, its own body finished in gold, a gold bar ALREADY
// sliding out of its slot from frame 0. Behind the glass
// wall: the bay, the palm island, the Dubai skyline with
// the Burj Khalifa, and far left the golden domes of the
// Emirates Palace in Abu Dhabi (the twist).
// VISUAL CORE: warm palatial daylight, layered golds and
// marble whites, textured everything (anti-banding:
// speckled sky, veined marble, lit window grids). Layered
// light rig: sun key w/ soft shadows + hemisphere fill +
// rim — house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, stone } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, ATM_C, PALACE_C, BURJ_POS, clamp01, smooth } from "./story";

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
  layer(s * 0.16, 0, "#9fb2cc");            // shaded underside
  layer(s * 0.05, -s * 0.02, "#cfddf2");    // mid tone
  layer(-s * 0.10, -s * 0.05, "#ffffff");   // sunlit crown
};
const skyTexDay = () => ctex("dubaiSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0d5cb5"); grad.addColorStop(0.34, "#3f8fd8"); grad.addColorStop(0.62, "#8ec4ec");
  grad.addColorStop(0.85, "#c9e6f5"); grad.addColorStop(1, "#fdf3d8");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 8; i++) {
    const x = r() * 2048, y = 50 + r() * 180, w = 300 + r() * 460;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.22)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.14); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "8,32,80"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("dubaiGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("dubaiBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** MARBLE — the lobby floor: big pale tiles, grey-gold veins
 *  wandering, grout lines, and a soft sheen variation so the
 *  polished stone never reads flat. */
const marbleTex = () => ctex("dubaiMarble", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e9e2d2"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { // soft tonal clouds in the stone
    const x = r() * S, y = r() * S, rad = 60 + r() * 190;
    const gr = g.createRadialGradient(x, y, rad * 0.1, x, y, rad);
    const c = r() < 0.5 ? "206,192,160" : "250,246,236";
    gr.addColorStop(0, `rgba(${c},0.20)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 0.6, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 26; i++) { // veins
    g.strokeStyle = `rgba(140,128,104,${0.14 + r() * 0.2})`;
    g.lineWidth = 1 + r() * 2.2;
    let x = r() * S, y = r() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += (r() - 0.5) * 190; y += (r() - 0.3) * 150; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 12; i++) { // gold flecks
    g.strokeStyle = `rgba(190,150,60,${0.10 + r() * 0.14})`;
    g.lineWidth = 1 + r() * 1.4;
    let x = r() * S, y = r() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); }
    g.stroke();
  }
  // grout grid: tiles of 256
  g.strokeStyle = "rgba(120,108,84,0.55)"; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, S); g.stroke();
    g.beginPath(); g.moveTo(0, i * 256); g.lineTo(S, i * 256); g.stroke();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,252,240" : "120,108,84"},${0.03 + r() * 0.04})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** GOLD PANEL — the ATM's body: brushed gold leaf with panel
 *  seams, fine vertical brushing and a warm gloss band. */
const goldPanelTex = () => ctex("dubaiGoldPanel", 512, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#ffd94d"); grad.addColorStop(0.5, "#f6c21c"); grad.addColorStop(1, "#e3a812");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 700; i++) { // brushing
    const x = r() * 512;
    g.strokeStyle = `rgba(${r() > 0.5 ? "255,246,200" : "170,120,20"},${0.03 + r() * 0.05})`;
    g.lineWidth = 1 + r() * 1.6;
    g.beginPath(); g.moveTo(x, r() * 512); g.lineTo(x + (r() - 0.5) * 4, r() * 512 + 90); g.stroke();
  }
  const sheen = g.createLinearGradient(0, 0, 0, 512);
  sheen.addColorStop(0, "rgba(255,255,255,0.20)"); sheen.addColorStop(0.4, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(120,70,0,0.14)");
  g.fillStyle = sheen; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(110,72,4,0.6)"; g.lineWidth = 5; g.strokeRect(10, 10, 492, 492);
  g.strokeStyle = "rgba(255,244,190,0.5)"; g.lineWidth = 2; g.strokeRect(22, 22, 468, 468);
});
/** THE ATM SCREEN (idle state): dark glass, a gold chart
 *  line, price rows as light bars — the cast overlays the
 *  LIVE chart / red X on top in their shots. */
const screenTex = () => ctex("dubaiScreen", 512, 384, (g, r) => {
  g.fillStyle = "#0d1b26"; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = "rgba(120,200,255,0.15)"; g.lineWidth = 2;
  for (let x = 42; x < 512; x += 47) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 330); g.stroke(); }
  for (let y = 30; y < 340; y += 42) { g.beginPath(); g.moveTo(14, y); g.lineTo(498, y); g.stroke(); }
  const pts: [number, number][] = [];
  let y = 260;
  for (let i = 0; i <= 12; i++) { pts.push([26 + i * 38, y]); y += (r() - 0.6) * 56; y = Math.max(90, Math.min(300, y)); }
  g.beginPath();
  pts.forEach(([x, yy], i) => { if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); });
  g.strokeStyle = "#f6c21c"; g.lineWidth = 7; g.lineJoin = "round"; g.stroke();
  g.fillStyle = "#ffd94d"; g.textAlign = "left"; g.textBaseline = "middle";
  g.font = "900 42px 'Arial Black', Arial, sans-serif";
  g.fillText("GOLD TO GO", 26, 44);
  g.fillStyle = "rgba(190,225,255,0.8)";
  g.font = "700 26px Arial, sans-serif";
  g.fillText("1 g  •  5 g  •  10 g", 26, 352);
});
/** THE SIGN over the machine: gold letters on deep green —
 *  "GOLD TO GO" — painted once, bolted to the lobby light. */
const signTex = () => ctex("dubaiSign", 1024, 256, (g) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#14532d"); grad.addColorStop(1, "#0b3520");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#d9a441"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.strokeStyle = "rgba(255,244,190,0.6)"; g.lineWidth = 3; g.strokeRect(30, 30, 964, 196);
  g.fillStyle = "#f6c21c"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  g.shadowColor = "rgba(0,0,0,0.5)"; g.shadowBlur = 0; g.shadowOffsetY = 6;
  g.fillText("GOLD TO GO", 512, 134);
});
/** TOWER GLASS — a skyline tower skin: blue glass with a
 *  lit-window grid, varied per building by tint. */
const towerTex = () => ctex("dubaiTower", 256, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#7fb2d9"); grad.addColorStop(0.6, "#4a7ca8"); grad.addColorStop(1, "#33587c");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
  for (let y = 10; y < 500; y += 22) for (let x = 10; x < 246; x += 20) {
    g.fillStyle = r() > 0.42 ? `rgba(255,240,190,${0.35 + r() * 0.4})` : `rgba(16,34,54,${0.3 + r() * 0.3})`;
    g.fillRect(x, y, 13, 14);
  }
  const sheen = g.createLinearGradient(0, 0, 256, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)"); sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.fillRect(0, 0, 256, 512);
});
/** PALACE WALL — sand-coloured stone with rows of arched
 *  windows, so the Emirates Palace never reads as a flat
 *  grey block across the bay. */
const palaceWallTex = () => ctex("dubaiPalaceWall", 512, 256, (g, r) => {
  g.fillStyle = "#dcb98a"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,205" : "150,118,74"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 256, 2.4, 2.4); }
  g.fillStyle = "rgba(146,110,58,0.85)"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10);
  g.fillStyle = "rgba(255,244,205,0.5)"; g.fillRect(0, 12, 512, 4);
  for (let row = 0; row < 2; row++) {
    const y = 52 + row * 104;
    for (let x = 26; x < 512; x += 52) {
      g.fillStyle = "#5a4630";
      g.beginPath();
      g.moveTo(x, y + 62); g.lineTo(x, y + 20); g.quadraticCurveTo(x + 13, y - 6, x + 26, y + 20); g.lineTo(x + 26, y + 62); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,236,180,0.75)"; g.fillRect(x + 5, y + 26, 7, 30);
    }
  }
});
/** SAND — the palm island shore: warm sand with speckle. */
const sandTex = () => ctex("dubaiSand", 512, 512, (g, r) => {
  g.fillStyle = "#e3cf9e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,246,214" : "160,132,84"},${0.08 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 1.6 + r() * 3, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
const blobTex = () => ctex("dubaiBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** soft warm light pool for sunlit variation on the marble */
const patchTex = () => ctex("dubaiPatch", 256, 256, (g) => {
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
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** THE GOLD ATM: a towering gold-leafed cabinet — sign board
 *  on top, lit screen, card slot + keypad dots, the wide
 *  DISPENSE SLOT at hand height and the tray beneath it.
 *  Local origin at floor centre; the front faces +z. The
 *  animated gold bar is built separately (World.bar). */
const makeATM = () => {
  const g = new THREE.Group();
  const goldM = lam2({ map: rep(goldPanelTex(), 1, 1), emissive: "#54400a" });
  const goldFlat = lam2({ color: "#f2b81e", emissive: "#4a3400" });
  const darkM = lam2({ color: "#14100c" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.9, 1.3), goldM);
  body.position.y = 2.45; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // plinth + crown trim
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.28, 1.55), lam2({ color: "#8a5f06", map: rep(goldPanelTex(), 1, 1) }));
  plinth.position.y = 0.14; plinth.castShadow = true; g.add(plinth);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.3, 1.5), goldFlat);
  crown.position.y = 5.05; crown.castShadow = true; g.add(crown);
  // the sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.62, 0.1),
    [goldFlat, goldFlat, goldFlat, goldFlat, lam2({ map: signTex() }), goldFlat] as THREE.Material[]);
  sign.position.set(0, 4.42, 0.68); g.add(sign);
  // the screen: dark glass with the idle chart
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.3, 0.07), darkM);
  frame.position.set(0, 3.05, 0.66); g.add(frame);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 1.16), lam2({ map: screenTex(), emissive: "#3a3a22" }));
  screen.position.set(0, 3.05, 0.7); g.add(screen);
  // card slot + keypad dots at the right of the screen
  const cslot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), darkM);
  cslot.position.set(1.02, 3.3, 0.67); g.add(cslot);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), goldFlat);
    dot.position.set(0.94 + j * 0.13, 2.95 - i * 0.13, 0.67); g.add(dot);
  }
  // THE DISPENSE SLOT: a wide black mouth with a gold lip
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.1), goldFlat);
  lip.position.set(0, 1.92, 0.66); g.add(lip);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.17, 0.06), darkM);
  mouth.position.set(0, 1.92, 0.7); g.add(mouth);
  // the tray beneath: an open gold scoop
  const trayB = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.5), goldFlat);
  trayB.position.set(0, 1.12, 0.85); trayB.castShadow = true; g.add(trayB);
  for (const sx of [-0.62, 0.62]) {
    const trayS = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.5), goldFlat);
    trayS.position.set(sx, 1.24, 0.85); g.add(trayS);
  }
  const trayBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.24, 0.06), goldFlat);
  trayBack.position.set(0, 1.24, 0.62); g.add(trayBack);
  // side pilasters: the cabinet reads as furniture, not a box
  for (const sx of [-1.38, 1.38]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 4.6, 10), goldFlat);
    pil.position.set(sx, 2.45, 0.45); pil.castShadow = true; g.add(pil);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), goldFlat);
    cap.position.set(sx, 4.85, 0.45); g.add(cap);
  }
  return g;
};
/** One gold bar, built as two stacked boxes (base + tapered
 *  top) in bright gold — the World animates it out of the
 *  slot and down into the tray on a loop. */
const makeBar = () => {
  const g = new THREE.Group();
  const m = lam2({ color: "#f6c21c", emissive: "#664d00" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.13, 0.36), m);
  base.position.y = 0.065; base.castShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.26), lam2({ color: "#ffd94d", emissive: "#775900" }));
  top.position.y = 0.175; top.castShadow = true; g.add(top);
  return g;
};
/** A palm: ringed trunk leaning slightly, a crown of drooping
 *  fronds (flattened cones, layered greens) + coconut cluster. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, h, 8), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = 0.08; trunk.castShadow = true; g.add(trunk);
  const topX = Math.sin(0.08) * h, topY = h * 0.99;
  const frondM = lam2({ color: "#4a8a34" });
  const frondM2 = lam2({ color: "#6aa844" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.4;
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.6, 4), i % 2 ? frondM : frondM2);
    fr.scale.set(1, 1, 0.16);
    fr.position.set(topX + Math.cos(a) * 1.1, topY + 0.15 - Math.sin(a) * 0.1, Math.sin(a) * 1.1);
    fr.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
    fr.rotation.y = -a;
    fr.castShadow = true; g.add(fr);
  }
  const nutM = lam2({ color: "#6b4a2a" });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutM);
    nut.position.set(topX + (tr() - 0.5) * 0.7, topY - 0.35, (tr() - 0.5) * 0.7);
    g.add(nut);
  }
  return g;
};
/** A skyline tower across the bay. */
const makeTower = (w: number, h: number, d: number, tint: string) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam2({ map: rep(towerTex(), 1, Math.max(1, Math.round(h / 22))), color: tint }));
  m.position.y = h / 2;
  return m;
};
/** THE BURJ KHALIFA: three shrinking tiers + the needle. */
const makeBurj = () => {
  const g = new THREE.Group();
  const m = lam2({ map: rep(towerTex(), 2, 6), color: "#cfd8de" });
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.5, 34, 6), m); t1.position.y = 17; g.add(t1);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.4, 30, 6), m); t2.position.y = 34 + 15; g.add(t2);
  const t3 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.5, 26, 6), m); t3.position.y = 64 + 13; g.add(t3);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.7, 18, 6), lam2({ color: "#e8eef2" }));
  needle.position.y = 90 + 9; g.add(needle);
  return g;
};
/** THE EMIRATES PALACE (Abu Dhabi, across the bay): a long
 *  sand-coloured palace, one great gold dome, two small
 *  domes, end towers. */
const makePalace = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(palaceWallTex(), 3, 1), color: "#e8cda0" });
  const goldM = lam2({ color: "#d9a441", emissive: "#4a3400" });
  const main = new THREE.Mesh(new THREE.BoxGeometry(52, 8, 11), wallM);
  main.position.y = 4; g.add(main);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 10), wallM);
  wingL.position.set(-34, 3, 0); g.add(wingL);
  const wingR = wingL.clone(); wingR.position.x = 34; g.add(wingR);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
  dome.position.y = 8; g.add(dome);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 6), goldM);
  finial.position.y = 17; g.add(finial);
  for (const sx of [-17, 17]) {
    const d2 = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
    d2.position.set(sx, 8, 0); g.add(d2);
  }
  for (const sx of [-26, 26]) {
    const tw = new THREE.Mesh(new THREE.BoxGeometry(4.5, 12, 9), wallM);
    tw.position.set(sx, 6, 0); g.add(tw);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3.2, 4), goldM);
    cap.position.set(sx, 13.6, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
  }
  return g;
};
/** THE PALM ISLAND + its Atlantis-style hotel, in the bay. */
const makePalmIsland = () => {
  const g = new THREE.Group();
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(17, 18.5, 1.6, 28), lam2({ map: rep(sandTex(), 6, 6) }));
  isle.position.y = 0.2; g.add(isle);
  const hotelM = lam2({ color: "#e8c39a" });
  const main = new THREE.Mesh(new THREE.BoxGeometry(13, 6.5, 4), hotelM);
  main.position.set(0, 4.2, 0); g.add(main);
  for (const sx of [-7.6, 7.6]) {
    const tw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 10.5, 4.4), hotelM);
    tw.position.set(sx, 6.2, 0); g.add(tw);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 4), lam2({ color: "#b0763a" }));
    cap.position.set(sx, 12.7, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
  }
  const arch = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1.6, 4.2), hotelM);
  arch.position.set(0, 10.6, 0); g.add(arch);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 1.5 - 0.4;
    const p = makePalm(3.2 + (i % 3) * 0.5, 300 + i * 11);
    p.position.set(Math.cos(a) * 12.5, 1.0, Math.sin(a) * 12.5);
    g.add(p);
  }
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d8ee", 18, 320);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private atm: THREE.Group | null = null;
  private bar: THREE.Group | null = null;
  private slotGlow: THREE.Sprite[] = [];
  private waterMaps: THREE.Texture[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a7a5f", 0.55);
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
    this.buildLobby(R, r);
    // ---- THE GOLD ATM ----
    this.atm = makeATM();
    this.atm.position.set(ATM_C[0], 0, ATM_C[2]);
    R.add(this.atm);
    // the animated gold bar (World.update runs its dispense loop)
    this.bar = makeBar();
    R.add(this.bar);
    // sparkle glints waiting around the slot
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffe98a", transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(-0.7 + i * 0.7, 2.1 - (i % 2) * 0.75, -5.0);
      sp.scale.set(0.85, 0.85, 1); sp.layers.set(NOINK); R.add(sp);
      this.slotGlow.push(sp);
    }
    // ---- across the bay: the palace + the island + the skyline ----
    const palace = makePalace();
    palace.position.set(PALACE_C[0], 0, PALACE_C[2]);
    palace.rotation.y = 0.35;
    R.add(palace);
    const isle = makePalmIsland();
    isle.position.set(40, 0, -80);
    R.add(isle);
    const burj = makeBurj();
    burj.position.set(BURJ_POS[0], 0, BURJ_POS[2]);
    R.add(burj);
    const towers: [number, number, number, string][] = [
      [-95, 34, -150, "#d8e2ea"], [-70, 48, -158, "#b9c9d6"], [-44, 28, -146, "#e2e8ee"], [-18, 40, -155, "#c3d2de"],
      [58, 44, -152, "#bccbd8"], [82, 30, -145, "#dde5ec"], [104, 52, -160, "#c9d6e2"], [128, 36, -150, "#d3dee8"],
    ];
    towers.forEach(([x, h, z, tint]) => {
      const tw = makeTower(11 + (Math.abs(x) % 5), h, 11, tint);
      tw.position.set(x, 0, z);
      R.add(tw);
    });
  }

  // ---------------- the lobby + the bay ----------------
  private buildLobby(R: THREE.Group, r: () => number) {
    // the marble floor under everything
    const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 40), lam2({ map: rep(marbleTex(), 26, 26) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.02, 6); floor.receiveShadow = true; R.add(floor);
    // the red carpet running to the machine
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 15),
      lam2({ color: "#8e2432" }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.005, 1.5);
    carpet.receiveShadow = true; R.add(carpet);
    softPatch(R, patchTex(), "#fff2c0", 0, 0.012, -2, 9, 12, 0.16, 0.2);
    softPatch(R, patchTex(), "#fff2c0", -8, 0.012, 6, 7, 9, 0.12, 1.1);
    softPatch(R, patchTex(), "#4a4234", 7, 0.013, 4, 6, 8, 0.10, 2.2);
    // ---- gold columns of the lobby ----
    const colM = lam2({ map: rep(goldPanelTex(), 1, 2), color: "#e8bc34" });
    const capM = lam2({ color: "#b8860e" });
    for (const [cx, cz] of [[-7.5, -1], [7.5, -1], [-7.5, -13], [7.5, -13], [-15, -7], [15, -7]] as [number, number][]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 10.5, 14), colM);
      col.position.set(cx, 5.25, cz); col.castShadow = true; col.receiveShadow = true; R.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), capM);
      cap.position.set(cx, 10.6, cz); R.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), capM);
      base.position.set(cx, 0.25, cz); R.add(base);
      blob(R, cx, 0.03, cz, 2.6, 2.6, 0.3);
    }
    // ---- the chandelier above the machine ----
    const chand = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.14, 10, 28), lam2({ color: "#d9a441", emissive: "#5a3c00" }));
    ring.rotation.x = Math.PI / 2; chand.add(ring);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), lam2({ color: "#fff2c0", emissive: "#a87f1e" }));
      bulb.position.set(Math.cos(a) * 1.9, 0.22, Math.sin(a) * 1.9); chand.add(bulb);
    }
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), lam2({ color: "#8a6a20" }));
    drop.position.y = 1.6; chand.add(drop);
    chand.position.set(0, 9.4, -4);
    R.add(chand);
    const chGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
    chGlow.position.set(0, 9.4, -4); chGlow.scale.set(9, 9, 1); chGlow.layers.set(NOINK); R.add(chGlow);
    // ---- the glass wall (z = -24): slim gold mullions + a
    // whisper of glass, the bay beyond ----
    const mullM = lam2({ color: "#b8860e" });
    for (let x = -42; x <= 42; x += 6) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 11, 0.22), mullM);
      mull.position.set(x, 5.5, -24); R.add(mull);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(84, 0.3, 0.3), mullM);
    rail.position.set(0, 10.9, -24); R.add(rail);
    const rail2 = rail.clone(); rail2.position.y = 0.15; R.add(rail2);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(84, 11),
      new THREE.MeshBasicMaterial({ color: "#cfe8f5", transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }));
    glass.position.set(0, 5.5, -24); glass.layers.set(NOINK); R.add(glass);
    // ---- the terrace + THE BAY ----
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 9), lam2({ map: rep(marbleTex(), 16, 1), color: "#d8cfb4" }));
    terrace.position.set(0, -0.27, -28.5); terrace.receiveShadow = true; R.add(terrace);
    const wm = rep(water(), 22, 22);
    this.waterMaps.push(wm);
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(560, 190), lam2({ map: wm, color: "#5fb6cf" }));
    bay.rotation.x = -Math.PI / 2; bay.position.set(0, -0.55, -128);
    bay.receiveShadow = true; R.add(bay);
    // far shore strip under the skyline
    const shore = new THREE.Mesh(new THREE.BoxGeometry(340, 1.6, 10), lam2({ map: rep(sandTex(), 24, 1), color: "#d9c491" }));
    shore.position.set(0, -0.4, -141); R.add(shore);
    // ---- potted palms flanking the machine + lobby corners ----
    const potM = lam2({ color: "#8e2432", map: rep(stone("dubaiPot", ["#a03a48", "#8e2432", "#b04a56", "#7c1e2a"]), 1, 1) });
    const palmSpots: [number, number, number][] = [
      [-4.6, -0.6, 3.4], [4.6, -0.6, 3.4], [-11, 5.5, 4.0], [11, 5.5, 4.0], [-13.5, -11, 4.4], [13.5, -11, 4.4],
    ];
    palmSpots.forEach(([x, z, h], i) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.8, 12), potM);
      pot.position.set(x, 0.4, z); pot.castShadow = true; R.add(pot);
      const p = makePalm(h, 40 + i * 13);
      p.position.set(x, 0.75, z);
      p.rotation.y = r() * Math.PI * 2;
      R.add(p);
      this.palms.push({ g: p, ph: i * 1.71 });
      blob(R, x, 0.03, z, 2.4, 2.4, 0.3);
    });
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
    // the bay water shimmers (slow texture drift, not a poster)
    this.waterMaps.forEach((wm, i) => wm.offset.set(tt * 0.006 * (1 + (i % 3) * 0.3), tt * 0.004));
    // THE GOLD BAR DISPENSE LOOP — the episode's core motion:
    // the bar slides OUT of the slot, drops into the tray,
    // glints there, and the loop restarts. Runs in the cover,
    // the close-up and the punchline (shots 1, 3, 10); in the
    // sold-out shot 6 the slot stays EMPTY.
    if (this.bar) {
      const show = id === 1 || id === 3 || id === 10 || id === 2;
      this.bar.visible = show;
      if (show) {
        const cyc = ((tt + 0.95) % 2.6) / 2.6; // 0..1 per dispense cycle, phase-shifted: frame 0 = bar already OUT, mid-drop
        const out1 = smooth((cyc - 0.04) / 0.22);      // slide out of the slot
        const drop = smooth((cyc - 0.34) / 0.16);      // drop to the tray
        const gone = smooth((cyc - 0.9) / 0.08);       // whisked away at cycle end
        const z = -5.62 + out1 * 0.52 - gone * 0;
        const y = 1.78 - drop * 0.56 + (1 - out1) * 0;
        this.bar.position.set(ATM_C[0], y, z + drop * 0.12);
        this.bar.rotation.y = 0.1 * Math.sin(tt * 1.3);
        const sc2 = 1 - gone * 1;
        this.bar.scale.setScalar(Math.max(0.001, sc2));
        this.bar.visible = gone < 1;
      }
    }
    // sparkle glints breathing around the slot
    this.slotGlow.forEach((sp, i) => {
      const on = id === 1 || id === 3 || id === 10;
      (sp.material as THREE.SpriteMaterial).opacity = on ? 0.35 + 0.3 * Math.abs(Math.sin(tt * 3.1 + i * 2.1)) : 0;
    });
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // palms sway in the lobby breeze
    for (const pl of this.palms) {
      pl.g.rotation.z = Math.sin(tt * 1.15 + pl.ph) * 0.015;
      pl.g.rotation.x = Math.cos(tt * 0.85 + pl.ph * 1.7) * 0.011;
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
