// Kodaiji Temple, Kyoto as one three.js scene for the Fafnir-ID
// short: a 400-year-old dark-wood temple hall with a sweeping
// tiled roof, a raked gravel zen garden, red maples + pines, a
// stone torii at the garden edge, a pond with a little arched
// bridge — and Mindar the android Kannon glowing on his stone
// pedestal in front of the hall. VISUAL CORE: bright Kyoto
// daylight, warm gravel, deep wood + gold accents, red maple
// against dark tile — textured everything (anti-banding:
// speckled sky, raked gravel, tiled roofs). Layered light rig:
// sun key w/ soft shadows + hemisphere fill + rim — the house
// style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, stone, roof } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, MINDAR_SPOT, HALL_C, GATE_Z } from "./story";

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
const skyTexDay = () => ctex("mindarSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("mindarGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("mindarBirds", 256, 96, (g, r) => {
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
/** raked zen gravel: warm pale grey, concentric rake arcs +
 *  speckle — the garden floor, never a flat sheet */
const gravelTex = () => ctex("mindarGravel", 1024, 1024, (g, r) => {
  g.fillStyle = "#cfc8b8"; g.fillRect(0, 0, 1024, 1024);
  // rake arcs: concentric curves sweeping across the canvas
  g.strokeStyle = "rgba(120,110,90,0.20)"; g.lineWidth = 2.4;
  for (let i = 0; i < 26; i++) {
    const cx = 512 + (r() - 0.5) * 900, cy = 512 + (r() - 0.5) * 900, rad = 60 + r() * 480;
    g.beginPath(); g.arc(cx, cy, rad, r() * 6, r() * 6 + 1.2 + r() * 2); g.stroke();
  }
  // pebble speckle: thousands of tiny stones in warm greys
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "90,84,70" : "240,236,224"},${0.08 + r() * 0.18})`;
    g.beginPath(); g.arc(r() * 1024, r() * 1024, 1 + r() * 2.2, 0, 7); g.fill();
  }
  // soft value blotches: sunlit rises + shaded hollows
  for (let i = 0; i < 60; i++) {
    const x = r() * 1024, y = r() * 1024, rad = 50 + r() * 130, dark = r() < 0.5;
    const gr = g.createRadialGradient(x, y, rad * 0.15, x, y, rad);
    const c = dark ? "110,100,80" : "240,232,210";
    gr.addColorStop(0, `rgba(${c},${dark ? 0.16 : 0.14})`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, r() * 3, 0, 7); g.fill();
  }
});
/** flat stone: warm grey speckle, NO course lines — stepping
 *  stones must read as stone, not wooden planks */
const flatStoneTex = () => ctex("mindarFlatStone", 512, 512, (g, r) => {
  g.fillStyle = "#b3a893"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "88,80,66" : "228,222,206"},${0.07 + r() * 0.15})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 2.4, 0, 7); g.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * 512, y = r() * 512, rad = 40 + r() * 110, dark = r() < 0.5;
    const gr = g.createRadialGradient(x, y, rad * 0.15, x, y, rad);
    const c = dark ? "96,88,72" : "226,218,200";
    gr.addColorStop(0, `rgba(${c},${dark ? 0.15 : 0.13})`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, r() * 3, 0, 7); g.fill();
  }
});
const woodDarkTex = () => ctex("mindarWoodDark", 512, 512, (g, r) => {
  g.fillStyle = "#4a3226"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.45 ? `rgba(20,12,6,${0.14 + r() * 0.2})` : `rgba(190,150,105,${0.08 + r() * 0.12})`;
    g.lineWidth = 1.4 + r() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke();
  }
  // plank seams
  g.strokeStyle = "rgba(16,10,5,0.5)"; g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
});
/** dark roof tiles: overlapping curved tile rows */
const tileTex = () => ctex("mindarTiles", 512, 512, (g, r) => {
  g.fillStyle = "#3d4652"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++) {
    const y = row * 44;
    for (let x = (row % 2) * 21; x <= 512; x += 42) {
      const gr = g.createLinearGradient(x, y, x, y + 44);
      gr.addColorStop(0, "rgba(210,220,235,0.28)"); gr.addColorStop(0.4, "rgba(90,100,118,0.25)"); gr.addColorStop(1, "rgba(20,26,36,0.4)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x + 21, y + 22, 21, 24, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(18,22,30,0.55)"; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(x + 21, y + 22, 21, 24, 0, 0, 7); g.stroke();
    }
  }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "220,228,240" : "10,14,20"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** warm paper: sliding doors + lantern glow panels — subtle
 *  vertical fibres so the doors never read as flat white walls */
const paperTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#ece0c4"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = r() * 256;
    g.strokeStyle = `rgba(${r() > 0.5 ? "190,168,128" : "248,242,224"},${0.10 + r() * 0.12})`;
    g.lineWidth = 1 + r() * 1.6;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, 256); g.stroke();
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,252,240" : "180,160,120"},${0.04 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** moss: muted deep-green blotches for garden edges — kept dark
 *  so it never reads as a neon carpet */
const mossTex = () => ctex("mindarMoss", 256, 256, (g, r) => {
  g.fillStyle = "#2c5222"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "18,40,12" : "62,100,40"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 26, 6 + r() * 18, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "110,150,80" : "16,34,10"},${0.06 + r() * 0.10})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("mindarBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("mindarBlob", 256, 256, (g) => {
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

/** The Kodaiji main hall: stone platform + steps, dark-wood body
 *  with vertical beams, paper sliding doors with gold trim,
 *  hanging paper lanterns, and a sweeping tiled roof with
 *  upturned eave corners + a gold ridge ornament. Front faces +Z. */
const makeHall = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(flatStoneTex(), 3, 1) });
  const woodM = lam2({ map: rep(woodDarkTex(), 2, 1) });
  const beamM = lam2({ color: "#2c1e14" });
  const tileM = lam2({ map: rep(tileTex(), 4, 2) });
  const paperM = lam2({ map: rep(paperTex("mindarPaperDoor"), 1, 1) });
  const goldM = lam2({ color: "#d9b04a" });
  // stone platform + three front steps
  const plat = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 11), stoneM);
  plat.position.y = 0.6; plat.castShadow = true; plat.receiveShadow = true; g.add(plat);
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(6, 0.22, 0.9), stoneM);
    st.position.set(0, 0.11 + i * 0.22, 5.5 + (2 - i) * 0.85); st.receiveShadow = true; g.add(st);
  }
  // hall body: dark wood walls
  const body = new THREE.Mesh(new THREE.BoxGeometry(13, 4.6, 8.5), woodM);
  body.position.y = 1.2 + 2.3; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // vertical beams on the front face
  for (let x = -6; x <= 6; x += 2) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.6, 0.18), beamM);
    b.position.set(x, 3.5, 4.32); g.add(b);
  }
  // paper sliding doors: four panels with dark frames showing
  // around each one, centre two open
  for (let i = 0; i < 4; i++) {
    const x = -4.5 + i * 3;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.9, 0.06), beamM);
    fr.position.set(x, 3.0, 4.33); g.add(fr);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.6, 0.1), paperM);
    door.position.set(x, 3.0, 4.38); g.add(door);
  }
  // gold trim band under the eaves
  const trim = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.28, 0.2), goldM);
  trim.position.set(0, 5.95, 4.35); g.add(trim);
  // hanging paper lanterns under the eaves (warm glow)
  const lampGlassM = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.6 });
  for (const x of [-5.2, -1.7, 1.7, 5.2]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), beamM);
    cord.position.set(x, 5.7, 4.6); g.add(cord);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lampGlassM);
    lamp.position.set(x, 5.3, 4.6); lamp.scale.y = 1.25; g.add(lamp);
  }
  // the roof: a proper gabled temple roof — two sloped tile
  // slabs meeting at a gold-capped ridge, with upturned eave
  // corners that hug the slab ends (never thin floating sticks)
  const slopeF = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.4, 6.4), tileM);
  slopeF.position.set(0, 7.5, 2.85); slopeF.rotation.x = 0.34; slopeF.castShadow = true; g.add(slopeF);
  const slopeB = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.4, 6.4), tileM);
  slopeB.position.set(0, 7.5, -2.85); slopeB.rotation.x = -0.34; slopeB.castShadow = true; g.add(slopeB);
  const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 15.5, 10), tileM);
  roofCap.rotation.z = Math.PI / 2; roofCap.position.set(0, 8.35, 0); roofCap.castShadow = true; g.add(roofCap);
  // upturned eave corners: broad angled tile slabs at all 4 corners
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 3.0), tileM);
    corner.position.set(sx * 7.4, 7.95, sz * 5.4);
    corner.rotation.z = -sx * 0.3; corner.rotation.x = sz * 0.26;
    corner.castShadow = true; g.add(corner);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), goldM);
    fin.position.set(sx * 8.7, 8.45, sz * 6.2); g.add(fin);
  }
  // ridge ornaments: gold finials at both ridge ends
  for (const sx of [1, -1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), goldM);
    fin.position.set(sx * 7.9, 8.15, 0); g.add(fin);
  }
  return g;
};

/** A vermillion torii gate: two pillars, double lintel, black caps. */
const makeTorii = () => {
  const g = new THREE.Group();
  const vermM = lam2({ color: "#c23a22" });
  const blackM = lam2({ color: "#1e1e24" });
  for (const s of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 6.4, 10), vermM);
    pil.position.set(s * 2.6, 3.2, 0); pil.castShadow = true; g.add(pil);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.4, 10), blackM);
    base.position.set(s * 2.6, 0.2, 0); g.add(base);
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 0.4), vermM);
  nuki.position.set(0, 5.0, 0); g.add(nuki);
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.45, 0.6), vermM);
  kasagi.position.set(0, 6.6, 0); kasagi.castShadow = true; g.add(kasagi);
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.3, 0.5), blackM);
  shimaki.position.set(0, 6.3, 0); g.add(shimaki);
  const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.12), blackM);
  gaku.position.set(0, 5.75, 0); g.add(gaku);
  return g;
};

/** A five-storey pagoda silhouette for the far backdrop. */
const makePagoda = () => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: "#7a2e22" });
  const tileM = lam2({ map: rep(tileTex(), 2, 1) });
  const goldM = lam2({ color: "#d9b04a" });
  for (let i = 0; i < 5; i++) {
    const w = 7.5 - i * 1.15, y = i * 3.4;
    const storey = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, w), bodyM);
    storey.position.y = y + 1.3; storey.castShadow = true; g.add(storey);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 1.8, 0.5, w + 1.8), tileM);
    rf.position.y = y + 2.9; rf.castShadow = true; g.add(rf);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), goldM);
  spire.position.y = 18.4; g.add(spire);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), goldM);
  orb.position.y = 20.1; g.add(orb);
  return g;
};

/** A stone toro lantern: base, pedestal, light box (warm glow),
 *  cap roof. Returns the group + its glow material for flicker. */
const makeLantern = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ color: "#9c958a" });
  const glowM = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), stoneM);
  base.position.y = 0.12; g.add(base);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.9, 8), stoneM);
  ped.position.y = 0.7; g.add(ped);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), stoneM);
  box.position.y = 1.45; box.castShadow = true; g.add(box);
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), glowM);
  light.position.y = 1.45; g.add(light);
  const capR = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.5, 4), stoneM);
  capR.position.y = 2.0; capR.rotation.y = Math.PI / 4; g.add(capR);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), stoneM);
  jewel.position.y = 2.35; g.add(jewel);
  return { g, glowM };
};

/** A Japanese maple: dark trunk, 9-13 overlapping foliage blobs
 *  in three depth layers — deep crimson low, bright red-orange
 *  main mass, sunlit gold flecks on top. */
const makeMaple = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM("#8a2a1a", "mindarFoliageDeep"),
    folM("#c23a22", "mindarFoliageMid"),
    folM("#e86a2a", "mindarFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
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

/** A pine: tall dark trunk, layered deep-green canopy. */
const makePine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 29);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#6a4a34" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h * 0.55, 8), trunkM);
  trunk.position.y = h * 0.27; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM("#1e4a24", "mindarPineDeep"), folM("#2c5c2e", "mindarPineMid"), folM("#4a7a3a", "mindarPineLite")];
  const layers = 4;
  for (let li = 0; li < layers; li++) {
    const y = h * (0.55 + li * 0.13), rad = h * (0.34 - li * 0.055);
    const disc = new THREE.Mesh(new THREE.ConeGeometry(rad, h * 0.3, 10), mats[Math.min(li, 2)]);
    disc.position.y = y; disc.castShadow = true; g.add(disc);
    // side blobs break the cone silhouette
    for (let i = 0; i < 3; i++) {
      const a = tr() * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.42, 10, 8), mats[li % 3]);
      b.position.set(Math.cos(a) * rad * 0.7, y + (tr() - 0.5) * 0.4, Math.sin(a) * rad * 0.7);
      b.scale.y = 0.7; b.castShadow = true; g.add(b);
    }
  }
  return g;
};

/** Mindar's stone pedestal: stepped stone base, gold trim, and
 *  the KANNON plaque on its front face. */
const makePedestal = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(flatStoneTex(), 2, 1) });
  const goldM = lam2({ color: "#d9b04a" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 3.0), stoneM);
  base.position.y = 0.17; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 2.4), stoneM);
  mid.position.y = 0.62; mid.castShadow = true; g.add(mid);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 2.5), goldM);
  trim.position.y = 0.92; g.add(trim);
  // (the KANNON plaque is the cast.ts Fx, mounted in front of
  // the stone — no mesh plaque here, it would z-fight it)
  return g;
};

/** A small arched bridge over the pond: deck segments climbing
 *  a parabola, post-and-rail sides. */
const makePondBridge = () => {
  const g = new THREE.Group();
  const deckM = lam2({ map: rep(planks(), 3, 1), color: "#8a5a36" });
  const postM = lam2({ color: "#5d4028" });
  const N = 9, span = 7.0, peak = 1.3;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), x = -span / 2 + u * span;
    const y = 0.4 + peak * (1 - ((x / (span / 2)) ** 2));
    const seg = new THREE.Mesh(new THREE.BoxGeometry(span / N + 0.2, 0.12, 1.8), deckM);
    seg.position.set(x, y, 0);
    seg.rotation.z = Math.atan2(-2 * peak * x / ((span / 2) ** 2), 1);
    seg.castShadow = true; seg.receiveShadow = true; g.add(seg);
    if (prev) {
      for (const s of [1, -1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(prev.distanceTo(new THREE.Vector3(x, y, 0)) + 0.12, 0.07, 0.07), postM);
        rail.position.set((prev.x + x) / 2, (prev.y + y) / 2 + 0.65, s * 0.82);
        rail.rotation.z = Math.atan2(y - prev.y, x - prev.x); g.add(rail);
      }
    }
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.65, 0.09), postM);
      post.position.set(x, y + 0.32, s * 0.82); g.add(post);
    }
    prev = new THREE.Vector3(x, y, 0);
  }
  return g;
};

/** One bamboo stalk: segmented green culm with leaf tufts. */
const makeBamboo = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 199 + 7);
  const culmM = lam2({ color: "#5a8a3a" });
  const nodeM = lam2({ color: "#c8b060" });
  const culm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, h, 7), culmM);
  culm.position.y = h / 2; culm.castShadow = true; g.add(culm);
  for (let i = 1; i < 5; i++) {
    const node = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 10), nodeM);
    node.rotation.x = Math.PI / 2; node.position.y = (h / 5) * i; g.add(node);
  }
  // leaf tufts near the top
  const leafM = lam2({ color: "#3d7a32" });
  for (let i = 0; i < 5; i++) {
    const a = tr() * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 5), leafM);
    leaf.position.set(Math.cos(a) * 0.3, h * 0.9 + tr() * 0.4, Math.sin(a) * 0.3);
    leaf.rotation.set(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7);
    g.add(leaf);
  }
  return g;
};

// ---------------- the world ----------------
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
  private pondMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private bamboos: { g: THREE.Group; ph: number }[] = [];
  private lanternMats: THREE.MeshLambertMaterial[] = [];
  private halo: THREE.Sprite | null = null;
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2403);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + sun glow + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false }));
    glow.position.set(-160, 120, -320); glow.scale.set(220, 220, 1); glow.layers.set(NOINK); R.add(glow);
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(11 + i * 7), transparent: true, depthWrite: false, fog: false }));
      const x = -220 + i * 72 + r() * 30, y = 62 + r() * 42, z = -260 + r() * 110;
      c.position.set(x, y, z);
      const sc = 90 + r() * 90; c.scale.set(sc, sc * 0.42, 1);
      c.layers.set(NOINK);
      this.clouds.push(c); this.cloudBase.push({ x, sp: 0.5 + r() * 0.9 });
      R.add(c);
    }
    // ---- bird flocks ----
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false }));
      const x = -140 + i * 90, y = 52 + i * 14;
      b.position.set(x, y, -180 - i * 40);
      b.scale.set(46, 17, 1); b.layers.set(NOINK);
      this.birds.push(b); this.birdBase.push({ x, y, sp: 1.6 + i * 0.7 });
      R.add(b);
    }
    // ---- raked gravel garden floor ----
    const gravelM = lam2({ map: rep(gravelTex(), 9, 9) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), gravelM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -15);
    ground.receiveShadow = true; R.add(ground);
    // ---- moss patches at the garden edges (off the path) ----
    const mossM = lam2({ map: rep(mossTex(), 2, 2) });
    for (const [mx, mz, ms] of [[-11, 8, 5], [12, 10, 4.5], [-18, -6, 5.5], [19, -18, 5], [-8, -38, 6], [10, -40, 5.5]] as const) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(ms, 12), mossM);
      m.rotation.x = -Math.PI / 2; m.position.set(mx, 0.02, mz);
      m.scale.set(1, 0.7, 1); m.receiveShadow = true; R.add(m);
    }
    // ---- stepping-stone path down the middle (torii -> hall) ----
    const stepM = lam2({ map: rep(flatStoneTex(), 1, 1) });
    for (let i = 0; i < 12; i++) {
      const z = 21 - i * 2.9;
      const st = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 1.15), stepM);
      st.position.set((i % 2 === 0 ? -0.25 : 0.25), 0.07, z);
      st.rotation.y = (r() - 0.5) * 0.2;
      st.receiveShadow = true; R.add(st);
    }
    // ---- the temple hall ----
    const hall = makeHall();
    hall.position.set(HALL_C[0], HALL_C[1], HALL_C[2]);
    R.add(hall);
    // ---- Mindar's pedestal ----
    const ped = makePedestal();
    ped.position.set(MINDAR_SPOT[0], MINDAR_SPOT[1], MINDAR_SPOT[2]);
    R.add(ped);
    // ---- the torii at the garden edge ----
    const torii = makeTorii();
    torii.position.set(0, 0, GATE_Z);
    R.add(torii);
    // ---- the pagoda on the far ridge ----
    const pagoda = makePagoda();
    pagoda.position.set(-32, 0, -95);
    R.add(pagoda);
    // ---- stone lanterns flanking the path ----
    const lanternSpots: [number, number][] = [[-4.2, -2], [4.2, -2], [-4.2, -8], [4.2, -8], [-3.6, 21.5], [3.6, 21.5]];
    for (const [lx, lz] of lanternSpots) {
      const { g, glowM } = makeLantern();
      g.position.set(lx, 0, lz);
      g.rotation.y = r() * Math.PI;
      this.lanternMats.push(glowM);
      R.add(g);
    }
    // ---- maples: red fire against dark wood ----
    const mapleSpots: [number, number, number, number][] = [
      [-11, -16, 7, 3], [11, -18, 6.5, 5], [-14, -26, 8, 7], [13, -8, 6, 9],
      [-8, -34, 7.5, 11], [16, -30, 7, 13], [-19, -10, 6.5, 15], [19, 2, 6, 17],
    ];
    for (const [mx, mz, mh, ms] of mapleSpots) {
      const t = makeMaple(mh, ms);
      t.position.set(mx, 0, mz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
      blob(R, mx, 0.06, mz, mh * 1.15, mh * 1.15, 0.55);
    }
    // ---- pines: the dark backdrop ring ----
    const pineSpots: [number, number, number, number][] = [
      [-24, -38, 11, 21], [-16, -44, 12, 23], [0, -48, 13, 25], [14, -44, 11, 27],
      [24, -38, 12, 29], [-28, -24, 10, 31], [28, -24, 11, 33], [-30, -48, 12, 35], [30, -48, 11, 37],
    ];
    for (const [px, pz, ph2, ps] of pineSpots) {
      const t = makePine(ph2, ps);
      t.position.set(px, 0, pz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
      blob(R, px, 0.06, pz, ph2 * 0.9, ph2 * 0.9, 0.5);
    }
    // ---- the pond + little arched bridge (left of the hall) ----
    const pondMap = water();
    pondMap.repeat.set(3, 2);
    this.pondMap = pondMap;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(6.5, 24),
      new THREE.MeshLambertMaterial({ map: pondMap, color: "#9fc4d8" }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(-14, 0.05, -30);
    pond.scale.set(1, 0.62, 1); pond.receiveShadow = true; R.add(pond);
    const bridge = makePondBridge();
    bridge.position.set(-14, 0, -30);
    bridge.rotation.y = Math.PI / 2;
    R.add(bridge);
    // koi-coloured lily pads on the pond
    const padM = lam2({ color: "#3d7a32" });
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, d = 2 + r() * 3.5;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5 + r() * 0.3, 8), padM);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(-14 + Math.cos(a) * d, 0.09, -30 + Math.sin(a) * d * 0.6);
      R.add(pad);
    }
    // ---- bamboo grove, right side ----
    for (let i = 0; i < 9; i++) {
      const b = makeBamboo(5 + r() * 2, 41 + i * 3);
      const bx = 15 + r() * 4, bz = -10 - i * 2.4 - r() * 1.5;
      b.position.set(bx, 0, bz);
      b.rotation.y = r() * Math.PI;
      this.bamboos.push({ g: b, ph: r() * 6 });
      R.add(b);
    }
    // ---- the halo glow over Mindar's pedestal ----
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending }));
    halo.position.set(MINDAR_SPOT[0], MINDAR_SPOT[1] + 3.4, MINDAR_SPOT[2]);
    halo.scale.set(5, 5, 1);
    this.halo = halo;
    R.add(halo);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

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
    this.sunCache.set(id, v);
    return v;
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
    // ---- STANDAR GERAK: everything that should move, moves ----
    // pond water flows gently (texture scroll, not a poster)
    if (this.pondMap) this.pondMap.offset.set(tt * 0.02, tt * 0.055);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // maples + pines sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // bamboo bends with the same wind
    for (const bm of this.bamboos) {
      bm.g.rotation.z = Math.sin(tt * 1.6 + bm.ph) * 0.035;
      bm.g.rotation.x = Math.cos(tt * 1.3 + bm.ph) * 0.02;
    }
    // stone lanterns flicker warm
    this.lanternMats.forEach((m, i) => { m.emissiveIntensity = 0.55 + Math.sin(tt * 3.1 + i * 1.7) * 0.09; });
    // Mindar's halo breathes, slow and holy
    if (this.halo) {
      const p = 1 + Math.sin(tt * 0.9) * 0.07;
      this.halo.scale.set(5 * p, 5 * p, 1);
      (this.halo.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(tt * 0.9) * 0.1;
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
