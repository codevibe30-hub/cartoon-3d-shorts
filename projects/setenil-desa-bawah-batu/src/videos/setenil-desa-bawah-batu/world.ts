// Setenil de las Bodegas, Spanyol as one three.js scene for the
// Fafnir-ID format: a white village wedged into the gorge of the
// Río Trejo, its houses built UNDER giant limestone overhangs —
// the rock itself is the roof and the back wall. A cobbled
// street runs the gorge; the river slides along its west edge;
// café terraces bask under the sunny rock of Cuevas del Sol
// while the Cuevas de la Sombra stretch is roofed by stone
// completely; the Almohad castle crowns the far bluff. VISUAL
// CORE: bright Andalusian daylight, warm layered limestone,
// whitewashed walls, terracotta, olive green — textured
// everything (anti-banding: speckled sky, strata-banded rock,
// flecked plaster). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, STREET_Y, SOMBRA_A, SOMBRA_B, CASTLE, clamp01 } from "./story";

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
const skyTexDay = () => ctex("setenilSkyDay2", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#c3d9ef"); grad.addColorStop(1, "#f2ecd8");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // high wispy cirrus, faint and stretched
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
const glowTex = () => ctex("setenilGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("setenilBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture in silvery olive greens: light leaf
 *  clusters over a sage mid-tone with deep shadow pockets —
 *  multiplied by the canopy colour */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#a8b394"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) { // shadow pockets
    g.fillStyle = `rgba(43,56,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { // individual leaf flecks
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(238,244,214,${0.12 + r() * 0.22})` : `rgba(38,54,26,${0.10 + r() * 0.18})`;
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
/** DRY Andalusian ground: warm packed earth and golden scrub —
 *  deep umber pockets, a straw-tan body, pale grit and thousands
 *  of dry blades in ochres and olive drabs with hard value
 *  contrast, so the ground survives the sun lift without going
 *  flat or neon. */
const dryGroundTex = () => ctex("setenilDryGround", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#9a7c4c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "84,60,30" : "196,164,100";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(232,214,150,${0.10 + r() * 0.20})` : `rgba(56,40,18,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#6d5a24", "#8a7433", "#a8903e", "#c9bd6a", "#7a7a3a"];
  g.lineCap = "round";
  for (let i = 0; i < 13000; i++) {
    const x = r() * S, y = r() * S, l = 7 + r() * 13, lean = (r() - 0.5) * 6;
    wrapDraw(S, x, y, 16, (xx, yy) => {
      g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
      g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + lean, yy - l); g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "52,38,20" : "214,190,140"},${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.4, 0, 7); g.fill(); }
});
/** bare earth for tree bases: warm brown speckled with darker
 *  clods and pale grit, never a flat sticker */
const soilTex = () => ctex("setenilSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("setenilPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground (shade patches, sun
 *  patches) — the blob-shadow trick, tinted */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: gnarled vertical fissures for olive trunks */
const barkTex = () => ctex("setenilBark", 256, 256, (g, r) => {
  g.fillStyle = "#6d5a44"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 230; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(34,24,14,${0.16 + r() * 0.24})` : `rgba(206,186,152,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 9, y + l); g.stroke();
  }
});
/** whitewashed plaster for the village houses: bright white with
 *  warm weathering blotches and a fine grain — never a flat
 *  vector white */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "168,148,118"},${0.04 + r() * 0.06})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "120,104,80"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** LIMESTONE ROCK — the star of this episode: warm sandstone
 *  with wavy sedimentary strata bands (hard shadow line under
 *  each band so the layers stack in depth), vertical rain-stain
 *  streaks, pocks and speckle, and a few dark cracks. */
const rockTex = (key: string, base = "#bd925f") => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  // broad tonal blotches first: the cliff is never one value
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "226,192,138" : "120,88,50"},${0.05 + r() * 0.08})`;
    g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 60 + r() * 170, 40 + r() * 110, r() * 3, 0, 7); g.fill();
  }
  // strata bands: wavy horizontal layers, alternating value,
  // each with a dark under-shadow and a pale top highlight
  let y = -10;
  while (y < 1030) {
    const bh = 34 + r() * 66;
    const tone = r();
    g.fillStyle = tone > 0.55 ? `rgba(232,202,146,${0.16 + r() * 0.14})` : `rgba(110,80,44,${0.14 + r() * 0.14})`;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.011 + r() * 6) * 5 + (r() - 0.5) * 4);
    for (let x = 1024; x >= 0; x -= 64) g.lineTo(x, y + bh + Math.sin(x * 0.013 + r() * 6) * 5 + (r() - 0.5) * 4);
    g.closePath(); g.fill();
    // the band's shadow lip + highlight lip
    g.fillStyle = "rgba(74,50,24,0.35)";
    g.fillRect(0, y + bh - 3, 1024, 4);
    g.fillStyle = "rgba(255,238,196,0.30)";
    g.fillRect(0, y, 1024, 3);
    y += bh;
  }
  // vertical rain stains running down the face
  for (let i = 0; i < 46; i++) {
    const x = r() * 1024, l = 90 + r() * 380, w = 3 + r() * 9;
    const gr = g.createLinearGradient(0, 0, 0, l);
    gr.addColorStop(0, `rgba(70,50,26,${0.10 + r() * 0.12})`); gr.addColorStop(1, "rgba(70,50,26,0)");
    g.save(); g.translate(x, r() * 700); g.fillStyle = gr; g.fillRect(-w / 2, 0, w, l); g.restore();
  }
  // cracks: dark jittered polylines
  g.lineCap = "round";
  for (let i = 0; i < 22; i++) {
    let x = r() * 1024, yy = r() * 1024;
    g.strokeStyle = `rgba(52,36,18,${0.25 + r() * 0.2})`; g.lineWidth = 1.4 + r() * 1.4;
    g.beginPath(); g.moveTo(x, yy);
    const n = 3 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) { x += (r() - 0.5) * 26; yy += 18 + r() * 30; g.lineTo(x, yy); }
    g.stroke();
  }
  // pocks + speckle grain
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(60,40,18,${0.06 + r() * 0.12})`; g.beginPath(); g.arc(r() * 1024, r() * 1024, 1 + r() * 3.2, 0, 7); g.fill(); }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,205" : "58,40,20"},${0.04 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2.2, 2.2); }
});
/** terracotta roof tiles: rows of curved-tile shading */
const tileTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 42) {
    for (let x = 0; x < 512; x += 32) {
      const gr = g.createLinearGradient(x, 0, x + 32, 0);
      gr.addColorStop(0, "rgba(70,30,14,0.42)"); gr.addColorStop(0.5, "rgba(255,205,160,0.20)"); gr.addColorStop(1, "rgba(70,30,14,0.42)");
      g.fillStyle = gr; g.fillRect(x, y, 32, 42);
    }
    g.fillStyle = "rgba(60,26,12,0.4)"; g.fillRect(0, y + 38, 512, 4);
    g.fillStyle = "rgba(255,215,175,0.25)"; g.fillRect(0, y, 512, 3);
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,180" : "40,18,8"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const blobTex = () => ctex("setenilBlob", 256, 256, (g) => {
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

const rockMats = () => [
  lam2({ map: rep(rockTex("setenilRockA"), 1.6, 1.6), color: "#cfa96f" }),
  lam2({ map: rep(rockTex("setenilRockB", "#b3854e"), 1.6, 1.6), color: "#c39a5c" }),
  lam2({ map: rep(rockTex("setenilRockC", "#c49a68"), 1.6, 1.6), color: "#d8b57e" }),
];

/** A whitewashed gorge house: bright plaster walls, a flat or
 *  low tile roof mostly hidden under the rock, dark-shuttered
 *  windows with flower boxes, a panelled door, terracotta pots.
 *  Front faces +Z; yaw it toward the street when placing. The
 *  BACK of the house is never seen — in Setenil it is the cliff. */
const makeHouse = (wallMat: THREE.MeshLambertMaterial, tileMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, seed: number) => {
  const g = new THREE.Group();
  const rr = rng(seed * 977 + 13);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  // a low tile cap peeking out from under the rock (many Setenil
  // fronts carry a little tiled brow where the rock lifts)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.16, d + 0.4), tileMat);
  cap.position.y = wallH + 0.06; cap.rotation.z = (rr() - 0.5) * 0.02; cap.castShadow = true; g.add(cap);
  const frameM = lam2({ color: "#f8f4ea" });
  const glassM = lam2({ color: "#33506a" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.5 });
  const shutterM = lam2({ color: "#3d5a3a" });
  const winXs = w > 5.4 ? [-w / 4, w / 4] : [0];
  for (const floor of [0.56, 0.86]) {
    if (floor > 0.8 && wallH < 3.9) continue;
    for (const wx of winXs) {
      const wy = wallH * floor;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.35, 0.09), frameM);
      fr.position.set(wx, wy, d / 2 + 0.03); g.add(fr);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.16, 0.11), glassM);
      gl.position.set(wx, wy, d / 2 + 0.04); g.add(gl);
      const mv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.16, 0.03), frameM);
      mv.position.set(wx, wy, d / 2 + 0.1); g.add(mv);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.03), frameM);
      mh.position.set(wx, wy, d / 2 + 0.1); g.add(mh);
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.75), glintM);
      glint.position.set(wx - 0.16, wy + 0.04, d / 2 + 0.1); glint.rotation.z = 0.5; g.add(glint);
      for (const s of [1, -1]) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.3, 0.05), shutterM);
        sh.position.set(wx + s * 0.74, wy, d / 2 + 0.05); sh.rotation.y = s * 0.14; g.add(sh);
      }
      if (floor < 0.8) {
        // flower box: geraniums under the ground-floor windows
        const boxF = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.26, 0.28), lam2({ color: "#7a4a26" }));
        boxF.position.set(wx, wy - 0.85, d / 2 + 0.15); g.add(boxF);
        const cols = ["#d83a4a", "#e86a9a", "#e8542e", "#f2f0e6"];
        for (let i = 0; i < 6; i++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), lam2({ color: cols[i % cols.length] }));
          fl.position.set(wx - 0.45 + i * 0.18, wy - 0.68, d / 2 + 0.19); g.add(fl);
        }
      } else {
        // a little iron balcony rail on the upper windows
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.04), lam2({ color: "#2c2c30" }));
        rail.position.set(wx, wy - 0.55, d / 2 + 0.3); g.add(rail);
        const railBase = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.36), lam2({ color: "#8a8074" }));
        railBase.position.set(wx, wy - 0.82, d / 2 + 0.16); g.add(railBase);
      }
    }
  }
  // door: white frame, dark panelled leaf, stone step, knob, lamp
  const doorX = w > 5.4 ? 0 : w / 3.4;
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.05, 0.09), frameM);
  dfr.position.set(doorX, 1.0, d / 2 + 0.03); g.add(dfr);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.86, 0.1), lam2({ color: "#4a3620" }));
  door.position.set(doorX, 0.93, d / 2 + 0.05); g.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.78, 0.03), lam2({ color: "#3a2a16" }));
  panel.position.set(doorX, 1.32, d / 2 + 0.11); g.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
  knob.position.set(doorX + 0.34, 0.93, d / 2 + 0.12); g.add(knob);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.13, 0.5), lam2({ color: "#a39a8b" }));
  step.position.set(doorX, 0.065, d / 2 + 0.28); step.receiveShadow = true; g.add(step);
  const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.32), lam2({ color: "#2c2c30" }));
  lampArm.position.set(doorX + 0.82, 2.2, d / 2 + 0.17); g.add(lampArm);
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.55 }));
  lampGlass.position.set(doorX + 0.82, 2.11, d / 2 + 0.32); g.add(lampGlass);
  // terracotta pots flanking the door, with green tufts
  for (const s of [1, -1]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 9), lam2({ color: "#b45a32" }));
    pot.position.set(doorX + s * 1.05, 0.15, d / 2 + 0.3); pot.castShadow = true; g.add(pot);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lam2({ color: "#4d7d33", map: rep(foliageTex("setenilFoliagePot"), 1, 1) }));
    tuft.position.set(doorX + s * 1.05, 0.38, d / 2 + 0.3); tuft.scale.y = 0.75; g.add(tuft);
  }
  return g;
};

/** One overhang slab: a great rock brow jutting from the cliff
 *  over the houses toward the street. `side` +1 = east cliff
 *  (juts toward -X), -1 = west. The slab's street-side EDGE is at
 *  |x| = edge; its underside at underY. A thinner lip hangs at
 *  the edge and rock spikes drip from it — the brow reads as
 *  carved stone, never as a box lid. */
const makeOverhang = (parent: THREE.Object3D, mats: THREE.MeshLambertMaterial[], side: number, z: number, len: number, edge: number, underY: number, thick: number, seed: number) => {
  const r = rng(seed * 613 + 7);
  const g = new THREE.Group();
  const mat = mats[Math.abs(seed) % mats.length];
  const outer = 9.6; // buried in the cliff
  const depth = outer - edge;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(depth, thick, len), mat);
  slab.position.set(side * (edge + depth / 2), underY + thick / 2, z);
  slab.rotation.z = side * (0.02 + r() * 0.03);
  slab.rotation.x = (r() - 0.5) * 0.02;
  slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
  // the hanging lip at the street edge, lower and thicker-browed
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.1 + r() * 0.7, thick * 0.52, len * 0.96), mats[(Math.abs(seed) + 1) % mats.length]);
  lip.position.set(side * (edge + 0.28), underY + thick * 0.16, z + (r() - 0.5) * 0.4);
  lip.rotation.z = side * (0.05 + r() * 0.04);
  lip.castShadow = true; g.add(lip);
  // rock spikes dripping from the lip
  const nSp = 2 + Math.floor(r() * 3);
  for (let i = 0; i < nSp; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.10 + r() * 0.16, 0.45 + r() * 0.65, 7), mat);
    sp.position.set(side * (edge + 0.15 + r() * 0.4), underY - 0.22, z - len / 2 + (i + 0.5) * (len / nSp) + (r() - 0.5));
    sp.rotation.x = Math.PI; sp.castShadow = true; g.add(sp);
  }
  // fallen boulders at the cliff foot now and then (kept small,
  // flat and against the house fronts — big round ones at the
  // street edge read as orange haystacks in the stills check)
  if (r() < 0.22) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45 + r() * 0.4, 9, 7), mat);
    b.position.set(side * (edge + 2.3 + r() * 0.5), 0.22, z + (r() - 0.5) * len * 0.7);
    b.scale.y = 0.55; b.rotation.set(r() * 3, r() * 3, 0); b.castShadow = true; g.add(b);
  }
  parent.add(g);
  return g;
};

/** An olive tree with a REAL canopy: a gnarled bark trunk with
 *  angled branches, and 9-13 overlapping foliage blobs in three
 *  depth layers of silvery olive green, all carrying a leaf-fleck
 *  texture so no surface is a smooth ball. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8906c" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, h * 0.46, 8), trunkM);
  trunk.position.y = h * 0.23; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "setenilFoliageDeep"),
    folM(greens[0], "setenilFoliageMid"),
    folM(greens[1] ?? greens[0], "setenilFoliageLite"),
  ];
  const cy = h * 0.74, cr = h * 0.37;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, h * 0.3, 6), trunkM);
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

/** A dark cypress: stacked tapering cones, the gorge's exclamation marks. */
const makeCypress = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const m = lam2({ color: "#2e5230", map: rep(foliageTex("setenilFoliageCyp"), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 6), lam2({ color: "#5a4632" }));
  trunk.position.y = 0.35; g.add(trunk);
  let y = 0.6;
  for (let i = 0; i < 4; i++) {
    const segH = h * (0.34 - i * 0.055), rad = h * 0.085 * (1 - i * 0.16);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, segH, 9), m);
    cone.position.y = y + segH / 2; cone.rotation.y = tr() * 3; cone.castShadow = true; g.add(cone);
    y += segH * 0.72;
  }
  return g;
};

/** A café table set: round top, iron leg, two chairs, and a
 *  wide umbrella in warm canvas. */
const makeCafeTable = (umbrellaCol: string, seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 389 + 3);
  const ironM = lam2({ color: "#2c2c30" });
  const topM = lam2({ color: "#f2eee4" });
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 7), ironM);
  leg.position.y = 0.36; g.add(leg);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 14), topM);
  top.position.y = 0.74; top.castShadow = true; g.add(top);
  // two little cups on the table
  for (const s of [1, -1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.09, 8), lam2({ color: s > 0 ? "#d8542e" : "#2e6da4" }));
    cup.position.set(s * 0.22, 0.81, (r() - 0.5) * 0.3); g.add(cup);
  }
  for (const a of [0.6, 2.8]) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), lam2({ color: "#7a4a26", map: rep(planks(), 1, 1) }));
    seat.position.y = 0.46; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.05), seat.material as THREE.MeshLambertMaterial);
    back.position.set(0, 0.72, -0.19); chair.add(back);
    chair.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
    chair.rotation.y = -a + Math.PI / 2;
    chair.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    g.add(chair);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 7), ironM);
  pole.position.y = 1.15; g.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.5, 10), lam2({ color: umbrellaCol }));
  umb.position.y = 2.32; umb.castShadow = true; g.add(umb);
  return g;
};

/** A wine barrel: staved body (plank texture), three dark iron bands. */
const makeBarrel = (seed = 1) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 1.05, 12), lam2({ color: "#9a6a3a", map: rep(planks(), 2, 1) }));
  body.scale.set(1, 1, 1); body.castShadow = true; g.add(body);
  const bulge = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.5, 12), body.material as THREE.MeshLambertMaterial);
  bulge.position.y = 0; bulge.castShadow = true; g.add(bulge);
  const bandM = lam2({ color: "#2c2c30" });
  for (const y of [-0.38, 0, 0.38]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(y === 0 ? 0.465 : 0.415, 0.022, 6, 20), bandM);
    band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band);
  }
  g.children.forEach((c) => { c.position.y += 0.53; });
  return g;
};

/** One dry grass tuft: seven tapered blades fanned from a dark
 *  root, vertex-coloured dark base -> straw tip. Instanced all
 *  over the gorge floor so ground edges stop being ruler-straight. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#4d4218"), tip = new THREE.Color("#c9bd6a"), tmp = new THREE.Color();
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
  private fog = new THREE.Fog("#c3d2e4", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private laundry: { m: THREE.Mesh; ph: number }[] = [];
  private flags: { m: THREE.Mesh; ph: number }[] = [];
  private buntings: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1484);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#a8906a", 0.55);
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
    this.buildGorge(R, r);
  }

  // ---------------- the gorge: street, river, houses, rock, castle ----------------
  private buildGorge(R: THREE.Group, r: () => number) {
    const rocks = rockMats();
    // base land under everything: dry Andalusian earth
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(dryGroundTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.1, -45); land.receiveShadow = true; R.add(land);
    // the cobbled street running the gorge
    const street = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 158), lam2({ map: rep(cobble(), 3, 70), color: "#cbbfa6" }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, STREET_Y, -48); street.receiveShadow = true; R.add(street);
    // stone walk strips flanking the street
    for (const s of [1, -1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 158), lam2({ map: rep(cobble(), 1, 70), color: "#b8ab90" }));
      walk.rotation.x = -Math.PI / 2; walk.position.set(s * 3.95, STREET_Y + 0.012, -48); walk.receiveShadow = true; R.add(walk);
    }
    // ---- the Río Trejo: a green channel along the west edge ----
    const riverMap = rep(water(), 1, 46);
    this.waterMap = riverMap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 124), lam2({ map: riverMap, color: "#79b8a4" }));
    river.rotation.x = -Math.PI / 2; river.position.set(-4.75, 0.03, -34); river.receiveShadow = true; R.add(river);
    const reflM = (col: string, op: number) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false });
    const band = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 122), reflM("#27567f", 0.14));
    band.rotation.x = -Math.PI / 2; band.position.set(-4.2, 0.045, -34); band.renderOrder = 1; R.add(band);
    // stone edging + a low parapet where street meets water
    for (const s of [1, -1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 124), lam2({ color: "#9a8f7c", map: rep(rockTex("setenilRockEdge", "#a8895c"), 1, 30) }));
      edge.position.set(-4.75 + s * 1.08, 0.1, -34); edge.castShadow = true; R.add(edge);
    }
    // a small stone bridge over the river at the Sombra gate
    const bridge = new THREE.Group();
    const bDeck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 2.2), lam2({ color: "#a89a82", map: rep(cobble(), 2, 1) }));
    bDeck.position.y = 0.42; bDeck.castShadow = true; bDeck.receiveShadow = true; bridge.add(bDeck);
    for (const s of [1, -1]) {
      const par = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.16), lam2({ color: "#9a8f7c" }));
      par.position.set(0, 0.72, s * 1.0); bridge.add(par);
    }
    bridge.position.set(-4.75, 0, SOMBRA_A + 3);
    R.add(bridge);
    // ---- white houses lining both sides ----
    const wallMats = [
      lam2({ map: rep(plasterTex("setenilPlasterA", "#f6f1e4"), 2, 1) }),
      lam2({ map: rep(plasterTex("setenilPlasterB", "#efe7d4"), 2, 1) }),
      lam2({ map: rep(plasterTex("setenilPlasterC", "#faf6ec"), 2, 1) }),
    ];
    const tileMats = [
      lam2({ map: rep(tileTex("setenilTileA", "#b45a32"), 2, 1) }),
      lam2({ map: rep(tileTex("setenilTileB", "#a34e2c"), 2, 1) }),
    ];
    const houseAt = (side: number, z: number, i: number) => {
      const w = 5.8 + (i % 3) * 0.8, d = 3.1, wallH = 3.4 + (i % 3) * 0.45;
      const h = makeHouse(wallMats[i % wallMats.length], tileMats[i % tileMats.length], w, d, wallH, i * 3 + (side > 0 ? 1 : 2));
      h.position.set(side * 6.6, STREET_Y, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      blob(R, side * 6.2, STREET_Y + 0.015, z, d + 2.2, w + 2.2, 0.28);
    };
    [-2, -13, -24, -35, -46, -58, -69, -80, -91].forEach((z, i) => houseAt(-1, z, i));
    [-6, -17, -39, -50, -62, -73, -84, -95].forEach((z, i) => houseAt(1, z, i + 2));
    // the café front on the east Sol stretch is set back: its
    // terrace (below) takes the street edge at z -22..-34
    const cafeFront = makeHouse(wallMats[1], tileMats[0], 6.4, 3.1, 3.9, 31);
    cafeFront.position.set(7.6, STREET_Y, -28);
    cafeFront.rotation.y = -Math.PI / 2;
    R.add(cafeFront);
    // ---- the cliffs: rock walls rising behind both rows ----
    const cliffSeg = (side: number, z: number, len: number, hgt: number, seed: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(8.5, hgt, len), rocks[Math.abs(seed) % rocks.length]);
      m.position.set(side * 11.6, hgt / 2 - 0.5, z);
      m.rotation.y = (r() - 0.5) * 0.03;
      m.castShadow = true; m.receiveShadow = true; R.add(m);
      // a shoulder block stepping the face down toward the houses
      const sh = new THREE.Mesh(new THREE.BoxGeometry(3.4, hgt * 0.45, len * 0.9), rocks[(Math.abs(seed) + 1) % rocks.length]);
      sh.position.set(side * 8.6, hgt * 0.22 - 0.3, z + (r() - 0.5) * 1.5);
      sh.castShadow = true; sh.receiveShadow = true; R.add(sh);
    };
    for (let i = 0; i < 10; i++) {
      cliffSeg(-1, 16 - i * 12.5, 13, 24 + (i % 3) * 4, i * 3 + 1);
      cliffSeg(1, 10 - i * 12.5, 13, 25 + ((i + 1) % 3) * 4, i * 5 + 2);
    }
    // the far end wall closing the gorge behind the castle bluff
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(46, 34, 9), rocks[1]);
    endWall.position.set(0, 16, -133); endWall.castShadow = true; R.add(endWall);
    // ---- the overhangs: rock brows over every house ----
    for (let i = 0; i < 15; i++) {
      const z = 14 - i * 7.6;
      const inSombra = z < SOMBRA_A + 4 && z > SOMBRA_B - 4;
      makeOverhang(R, rocks, -1, z, 7.9, inSombra ? 0.6 : 2.5 + ((i * 7) % 3) * 0.45, 6.3 + (i % 3) * 0.7, 2.6 + (i % 2) * 0.7, i * 2 + 1);
      makeOverhang(R, rocks, 1, z - 3.8, 7.9, inSombra ? 0.6 : 2.4 + ((i * 5) % 3) * 0.5, 6.5 + ((i + 1) % 3) * 0.7, 2.5 + ((i + 1) % 2) * 0.8, i * 3 + 2);
    }
    // the Sombra deck: beams of rock spanning the street whole,
    // so the covered stretch is a true stone tunnel
    for (let i = 0; i < 5; i++) {
      const z = SOMBRA_A - 3 - i * 7.6;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.3, 7.9), rocks[i % rocks.length]);
      deck.position.set(0, 7.6, z);
      deck.rotation.x = (r() - 0.5) * 0.02;
      deck.castShadow = true; deck.receiveShadow = true; R.add(deck);
    }
    // a deep shade pool lying in the Sombra street (the sun
    // never reaches it — the deck's shadow, guaranteed)
    softPatch(R, patchTex(), "#33415e", 0, STREET_Y + 0.012, (SOMBRA_A + SOMBRA_B) / 2, 6.4, 34, 0.34);
    // warm sun pools on the Sol street + café terrace
    softPatch(R, patchTex(), "#ffe9a8", -0.6, STREET_Y + 0.011, -18, 5.2, 15, 0.30, 0.2);
    softPatch(R, patchTex(), "#ffe9a8", 1.2, STREET_Y + 0.011, 2, 5.6, 13, 0.26, -0.15);
    // ---- the castle bluff + the Almohad castle ----
    const bluff = new THREE.Mesh(new THREE.BoxGeometry(19, CASTLE[1] + 1, 15), rocks[0]);
    bluff.position.set(0, (CASTLE[1] - 1) / 2, CASTLE[2] - 1); bluff.castShadow = true; bluff.receiveShadow = true; R.add(bluff);
    const castle = new THREE.Group();
    const stoneM = lam2({ color: "#b3a284", map: rep(rockTex("setenilCastleStone", "#a8906144".slice(0, 7)), 1.4, 1.4) });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(5.2, 8.6, 5.2), stoneM);
    keep.position.y = 4.3; keep.castShadow = true; castle.add(keep);
    // crenellations around the keep top
    for (let i = 0; i < 5; i++) for (const s of [1, -1]) {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.3), stoneM);
      c1.position.set(-2.2 + i * 1.1, 8.95, s * 2.45); castle.add(c1);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.62), stoneM);
      c2.position.set(s * 2.45, 8.95, -2.2 + i * 1.1); castle.add(c2);
    }
    // a narrow window slit glowing warm
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.08),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.7 }));
    win.position.set(0, 5.6, 2.62); castle.add(win);
    // curtain wall running off the keep + a smaller round turret
    const wall = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.6, 0.8), stoneM);
    wall.position.set(-6.2, 1.8, 1.6); wall.rotation.y = 0.35; wall.castShadow = true; castle.add(wall);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 5.6, 10), stoneM);
    turret.position.set(4.6, 2.8, -1.2); turret.castShadow = true; castle.add(turret);
    const turretCap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.3, 10), lam2({ color: "#8a4a34", map: rep(tileTex("setenilTileC", "#9c4f30"), 2, 1) }));
    turretCap.position.set(4.6, 6.25, -1.2); castle.add(turretCap);
    castle.position.set(CASTLE[0], CASTLE[1], CASTLE[2]);
    R.add(castle);
    // castle flags: crimson + gold, flying from the keep
    const flagCols = ["#c22e2e", "#e8a812"];
    flagCols.forEach((col, i) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.4, 6), lam2({ color: "#4a3a24" }));
      pole.position.set(CASTLE[0] - 1.6 + i * 3.2, CASTLE[1] + 10.2, CASTLE[2]);
      R.add(pole);
      const flagGeo = new THREE.PlaneGeometry(1.7, 1.0, 6, 1);
      flagGeo.translate(0.85, 0, 0);
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      flag.position.set(CASTLE[0] - 1.6 + i * 3.2, CASTLE[1] + 11.4, CASTLE[2]);
      R.add(flag);
      this.flags.push({ m: flag, ph: i * 1.7 });
    });
    // ---- café terraces under the sunny rock (Cuevas del Sol) ----
    const cafeSpots: [number, number, string][] = [[4.3, -23.5, "#c94f30"], [4.6, -28.5, "#e8e0cc"], [4.2, -33, "#c94f30"]];
    cafeSpots.forEach(([x, z, col], i) => {
      const tb = makeCafeTable(col, i * 3 + 1);
      tb.position.set(x, STREET_Y, z);
      tb.rotation.y = r() * 0.8 - 0.4;
      R.add(tb);
      blob(R, x, STREET_Y + 0.014, z, 2.6, 2.6, 0.30);
    });
    // striped awnings over the café front: thin BOXES sloping
    // down from the wall toward the street (the old rotated
    // planes stood up like giant pink kites in the stills check)
    for (let i = 0; i < 3; i++) {
      const awn = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 2.6),
        lam2({ color: i % 2 ? "#e8e0cc" : "#c94f30" }));
      awn.position.set(5.15, 3.05, -24.5 - i * 3.4);
      awn.rotation.z = 0.42;
      awn.castShadow = true; R.add(awn);
    }
    // ---- the bodega: barrels in the cool under the east rock ----
    const barrelSpots: [number, number, number][] = [[4.5, -88.6, 0], [4.5, -89.8, 0], [5.3, -89.2, 0], [4.5, -89.2, 1], [5.4, -91.6, 0]];
    barrelSpots.forEach(([x, z, up], i) => {
      const b = makeBarrel(i + 1);
      b.position.set(x, STREET_Y + up * 1.12, z);
      b.rotation.y = r() * 3;
      R.add(b);
    });
    blob(R, 4.9, STREET_Y + 0.014, -89.4, 3.2, 3.4, 0.3);
    // crates beside the barrels
    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.66), lam2({ color: "#c99058", map: rep(planks(), 1, 1) }));
      crate.position.set(3.6, STREET_Y + 0.2 + (i === 2 ? 0.42 : 0), -91.5 + (i % 2) * 0.75);
      crate.rotation.y = r() * 0.7; crate.castShadow = true; R.add(crate);
    }
    // ---- laundry lines across the street: colour in the wind ----
    const laundryAt = (z: number, y: number) => {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 6.6, 5), lam2({ color: "#3a3630" }));
      line.rotation.z = Math.PI / 2; line.position.set(0, y, z); R.add(line);
      const cols = ["#f2f0e6", "#d8542e", "#2e6da4", "#e8c832", "#e86a9a"];
      for (let i = 0; i < 4; i++) {
        const clothGeo = new THREE.PlaneGeometry(0.78, 0.95);
        clothGeo.translate(0, -0.475, 0);
        const cloth = new THREE.Mesh(clothGeo, lam2({ color: cols[(i + Math.floor(z)) % cols.length], side: THREE.DoubleSide }));
        cloth.position.set(-2.4 + i * 1.55, y, z);
        cloth.castShadow = true; R.add(cloth);
        this.laundry.push({ m: cloth, ph: i * 1.31 + z });
      }
    };
    laundryAt(-11, 4.7); laundryAt(-31, 4.9); laundryAt(-35, 4.8); // third line: was -56 (hung across the Sombra card), then -97 (filled the shot-8 camera) — -35 is deep background for the café shots and behind every other camera
    // ---- fiesta bunting across the Sol street ----
    const buntingAt = (z: number) => {
      const g = new THREE.Group();
      const cols = ["#d83a4a", "#e8c832", "#2e7fc9", "#39a047", "#e86a9a"];
      for (let i = 0; i < 9; i++) {
        const u = i / 8, x = -3.1 + u * 6.2, y = 5.1 - Math.sin(u * Math.PI) * 0.55;
        const tri = new THREE.Mesh(new THREE.CircleGeometry(0.21, 3), lam2({ color: cols[i % cols.length], side: THREE.DoubleSide }));
        tri.position.set(x, y - 0.18, 0); tri.rotation.z = Math.PI; g.add(tri);
      }
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 6.4, 5), lam2({ color: "#3a3630" }));
      cord.rotation.z = Math.PI / 2 - 0.0; cord.position.set(0, 5.02, 0); cord.rotation.x = 0; g.add(cord);
      g.position.set(0, 0, z);
      R.add(g);
      this.buntings.push({ g, ph: z * 0.7 });
    };
    buntingAt(-19); buntingAt(-27);
    // ---- trees: olives on the banks + cliff tops, cypresses ----
    const greens = ["#7d9b62", "#93ad77", "#667f4e"];
    const treePts: [number, number][] = [];
    const oliveAt = (x: number, z: number, h: number, seed: number, y = STREET_Y) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, y, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.37 });
      treePts.push([x, z]);
    };
    oliveAt(-6.1, 4, 3.4, 3); oliveAt(5.9, -1, 3.8, 5); oliveAt(-6.3, -19, 3.2, 7);
    oliveAt(6.1, -44, 3.6, 11); oliveAt(-6.2, -37, 3.0, 13); oliveAt(6.0, -57, 3.3, 17);
    oliveAt(-6.4, -99, 3.7, 19); oliveAt(6.2, -102, 3.1, 23);
    // cliff-top olives silhouetted against the sky
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      oliveAt(s * (10.5 + (i % 3) * 2.2), -8 - i * 17, 4.4 + (i % 2), 40 + i * 7, 24 + (i % 3) * 3);
    }
    const cypAt = (x: number, z: number, h: number, seed: number, y = STREET_Y) => {
      const c = makeCypress(h, seed);
      c.position.set(x, y, z);
      R.add(c);
      this.trees.push({ g: c, ph: seed * 0.91 });
    };
    cypAt(5.6, -8, 5.2, 29); cypAt(-6.0, -63, 5.6, 31); cypAt(5.2, CASTLE[2] + 6, 6.2, 37, CASTLE[1]);
    cypAt(-5.4, CASTLE[2] + 4, 5.4, 41, CASTLE[1]);
    // bare-earth discs grounding the street-level trees
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts.slice(0, 8)) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75 + r() * 0.3, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, STREET_Y + 0.013, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    // ---- dry tufts: ragged edges everywhere the ground shows ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let z = 20; z > -108; z -= 0.6 + r() * 0.6) {
      if (r() < 0.8) pushTuft(3.62 + r() * 0.3, z + (r() - 0.5), 0.8 + r() * 0.8);
      if (r() < 0.55) pushTuft(-3.55 - r() * 0.25, z - 0.3, 0.75 + r() * 0.75);
      if (r() < 0.3) pushTuft(-6.1 - r() * 0.5, z + 0.4, 0.7 + r() * 0.7);
    }
    for (let i = 0; i < 380; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (4.6 + r() * 3.4), z = 18 - r() * 122;
      pushTuft(x, z, 0.6 + r() * 0.8);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, STREET_Y, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.13 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
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
    // the Trejo flows toward the viewer (texture scroll)
    if (this.waterMap) this.waterMap.offset.set(0, tt * 0.05);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // laundry flutters on its lines, each cloth on its own phase
    for (const ld of this.laundry) {
      ld.m.rotation.x = Math.sin(tt * 2.3 + ld.ph) * 0.32;
      ld.m.rotation.y = Math.sin(tt * 1.6 + ld.ph * 1.3) * 0.14;
    }
    // castle flags ripple (yaw flutter reads as wind at distance)
    for (const fl of this.flags) {
      fl.m.rotation.y = Math.sin(tt * 3.1 + fl.ph) * 0.38;
      fl.m.rotation.z = Math.sin(tt * 2.2 + fl.ph * 1.7) * 0.06;
    }
    // fiesta bunting sways over the street
    for (const b of this.buntings) {
      b.g.rotation.z = Math.sin(tt * 1.4 + b.ph) * 0.02;
      b.g.rotation.x = Math.sin(tt * 1.9 + b.ph * 1.3) * 0.015;
    }
    // dry tufts bend with the same wind (phase travels the gorge)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, STREET_Y, p.z);
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
