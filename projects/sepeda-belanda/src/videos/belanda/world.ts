// Amsterdam, Belanda as one three.js scene for the Fafnir-ID
// cover frame: a SEA of parked bikes along the canal quay, the
// emerald canal behind with a tour boat gliding past, narrow
// gabled Dutch houses across the water, a small arched bridge,
// the Waternet crane barge fishing bikes out of the canal, the
// underwater bike garage at Central Station. The hero stands
// beside the bike sea, shocked at the size of the claim.
// VISUAL CORE: bright Dutch daylight, emerald water, a wall of
// colourful bikes, brick + gabled houses — textured everything
// (anti-banding: speckled sky, flecked water, woven brick).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, CANAL_Z0, CANAL_Z1, BIKE_ROWS, BRIDGE_X, CRANE_POS, GARAGE_POS, STATION_POS, PILE_POS, TROPHY_POS, BABY_BIKE_POS } from "./story";

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
const skyTexDay = () => ctex("belandaSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("belandaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("belandaBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture for the pollard willows */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#8aa86a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(30,56,24,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(230,245,200,${0.12 + r() * 0.22})` : `rgba(26,50,20,${0.10 + r() * 0.18})`;
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
/** Dutch lawn grass: same rich recipe as the house style */
const grassRichTex = () => ctex("belandaGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c8433"; g.fillRect(0, 0, S, S);
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
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(196,240,150,${0.10 + r() * 0.20})` : `rgba(24,56,16,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
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
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** bare earth for tree bases */
const soilTex = () => ctex("belandaSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("belandaPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("belandaBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for house walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
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
const blobTex = () => ctex("belandaBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a painted row of parked bikes (2D strip) for the FAR row:
 *  side-view silhouettes in varied colours, slight jitter — one
 *  draw call instead of thirty bikes, at a distance where the
 *  flatness never reads. */
const bikeRowTex = () => ctex("belandaBikeRow", 2048, 128, (g, r) => {
  g.clearRect(0, 0, 2048, 128);
  const cols = ["#c0392b", "#2e6db4", "#222222", "#e8b90a", "#2e8a4a", "#e8862c", "#f2f0e6", "#7a4a8a", "#3a9a8a"];
  const drawBike = (x: number, col: string, flip: boolean) => {
    const s = flip ? -1 : 1;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = "round";
    for (const wx of [-26, 26]) {
      g.beginPath(); g.arc(x + wx, 96, 20, 0, 7); g.stroke();
      g.beginPath(); g.arc(x + wx, 96, 3, 0, 7); g.fill();
    }
    g.beginPath();
    g.moveTo(x - 26, 96); g.lineTo(x - 6, 52); g.lineTo(x + 22, 52); g.lineTo(x + 26, 96);
    g.moveTo(x - 6, 52); g.lineTo(x - 2, 96); g.lineTo(x - 26, 96);
    g.moveTo(x + 22, 52); g.lineTo(x + 14, 30);
    g.stroke();
    g.beginPath(); g.moveTo(x + 14 - 10 * s, 28); g.lineTo(x + 14 + 10 * s, 28); g.stroke();
    g.fillRect(x - 14, 44, 16, 6);
    if (r() < 0.4) { g.fillStyle = "#8a6844"; g.fillRect(x + 30, 40, 14, 18); }
  };
  for (let i = 0; i < 34; i++) {
    const x = 30 + i * 59 + (r() - 0.5) * 8;
    drawBike(x, cols[Math.floor(r() * cols.length) % cols.length], r() < 0.5);
  }
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** Shared bike geometry: one torus + one cylinder set reused by
 *  every bike in the scene, so 90+ bikes stay cheap. */
const WHEEL_GEO = new THREE.TorusGeometry(0.34, 0.028, 8, 18);
const TUBE_GEO = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
const GRIP_GEO = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6);
const SADDLE_GEO = new THREE.BoxGeometry(0.26, 0.05, 0.12);
const TIRE_MAT = new THREE.MeshLambertMaterial({ color: "#1d1d22" });
const METAL_MAT = new THREE.MeshLambertMaterial({ color: "#b8bcc4" });
const frameMatCache = new Map<string, THREE.MeshLambertMaterial>();
const frameMat = (col: string) => {
  let m = frameMatCache.get(col);
  if (!m) { m = lam2({ color: col }); frameMatCache.set(col, m); }
  return m;
};
const tubeBetween = (a: THREE.Vector3, b: THREE.Vector3, mat: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(TUBE_GEO, mat);
  m.scale.set(1, len, 1);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  m.castShadow = true;
  return m;
};
/** One bicycle, built from primitives: two wheels, a diamond
 *  frame, fork, handlebar, saddle. Faces +X (forward). `detail`
 *  adds fenders, a chain guard and a front basket. */
const BIKE_COLS = ["#c0392b", "#2e6db4", "#222222", "#e8b90a", "#2e8a4a", "#e8862c", "#f2f0e6", "#7a4a8a", "#3a9a8a", "#8a2f4a"];
const makeBike = (col: string, detail = false, seed = 1) => {
  const g = new THREE.Group();
  const fm = frameMat(col);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const wx of [-0.42, 0.42]) {
    const w = new THREE.Mesh(WHEEL_GEO, TIRE_MAT);
    w.position.set(wx, 0.34, 0); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), METAL_MAT);
    hub.position.set(wx, 0.34, 0); g.add(hub);
  }
  g.add(tubeBetween(V(-0.35, 0.72, 0), V(0.38, 0.68, 0), fm));
  g.add(tubeBetween(V(0.38, 0.68, 0), V(-0.08, 0.34, 0), fm));
  g.add(tubeBetween(V(-0.35, 0.72, 0), V(-0.12, 0.34, 0), fm));
  g.add(tubeBetween(V(-0.12, 0.34, 0), V(-0.42, 0.34, 0), fm));
  g.add(tubeBetween(V(-0.12, 0.34, 0), V(0.42, 0.34, 0), fm));
  g.add(tubeBetween(V(0.38, 0.68, 0), V(0.42, 0.34, 0), METAL_MAT));
  const bar = new THREE.Mesh(GRIP_GEO, METAL_MAT);
  bar.rotation.x = Math.PI / 2; bar.position.set(0.40, 0.80, 0); bar.castShadow = true; g.add(bar);
  const saddle = new THREE.Mesh(SADDLE_GEO, TIRE_MAT);
  saddle.position.set(-0.37, 0.78, 0); saddle.castShadow = true; g.add(saddle);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), METAL_MAT);
  crank.position.set(-0.08, 0.34, 0.02); crank.rotation.z = 0.6; g.add(crank);
  if (detail) {
    for (const wx of [-0.42, 0.42]) {
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.014, 6, 12, Math.PI * 0.9), METAL_MAT);
      fender.position.set(wx, 0.34, 0); fender.rotation.z = 0.15; g.add(fender);
    }
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), fm);
    guard.rotation.x = Math.PI / 2; guard.position.set(-0.08, 0.34, 0.03); g.add(guard);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.24), lam2({ color: "#8a6844", map: rep(planks(), 1, 1) }));
    basket.position.set(0.52, 0.58, 0); basket.castShadow = true; g.add(basket);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), METAL_MAT);
    bell.position.set(0.40, 0.84, 0.12); g.add(bell);
    void seed;
  }
  return g;
};

/** A narrow Dutch gabled house: brick/plaster body, stepped
 *  gable (three shrinking boxes), white-framed windows, a door.
 *  Front faces +Z. */
const makeDutchHouse = (wallCol: string, roofCol: string, w: number, h: number, seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 331 + 17);
  const wallM = lam2({ map: rep(brickTex("belandaHouse" + seed, wallCol), 2, 2) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.2), wallM);
  body.position.y = h / 2; body.castShadow = true; g.add(body);
  const gableM = lam2({ color: roofCol });
  const steps: [number, number][] = [[w, 0.55], [w * 0.66, 0.55], [w * 0.33, 0.55]];
  steps.forEach(([sw, sh], i) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 4.2), i % 2 ? wallM : gableM);
    st.position.y = h + sh / 2 + i * sh; st.castShadow = true; g.add(st);
  });
  const winM = lam2({ color: "#2e4a66" });
  const frameM = lam2({ color: "#f2ede2" });
  const rows = Math.max(2, Math.floor(h / 2.6));
  for (let row = 0; row < rows; row++) {
    for (const wx of [-w / 4, w / 4]) {
      const wy = 1.6 + row * 2.6;
      if (wy > h - 0.8) continue;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.06), frameM);
      fr.position.set(wx, wy, 2.12); g.add(fr);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.08), winM);
      win.position.set(wx, wy, 2.13); g.add(win);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.09), frameM);
      bar.position.set(wx, wy, 2.14); g.add(bar);
    }
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.08), lam2({ color: "#3a2a1a" }));
  door.position.set(0, 1.0, 2.12); g.add(door);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.6), lam2({ color: "#cbbfa6" }));
  step.position.set(0, 0.09, 2.4); g.add(step);
  void r;
  return g;
};

/** A small arched bridge over the canal: stepped deck boxes
 *  rising to the crown, railings, two lamp posts. */
const makeBridge = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(plasterTex("belandaBridge", "#d8cbb0"), 2, 1) });
  const ironM = lam2({ color: "#2e4a3a" });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z = -34 + t * 18;
    const y = 0.25 + Math.sin(t * Math.PI) * 1.9;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.2), stoneM);
    seg.position.set(0, y, z); seg.castShadow = true; seg.receiveShadow = true; g.add(seg);
    if (i < n - 1) {
      const t2 = (i + 0.5) / (n - 1);
      const z2 = -34 + t2 * 18;
      const y2 = 0.25 + Math.sin(t2 * Math.PI) * 1.9;
      for (const s of [1, -1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 2.2), ironM);
        rail.position.set(s * 1.6, y2 + 0.55, z2); g.add(rail);
      }
    }
  }
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), ironM);
    post.position.set(s * 1.6, 3.4, -25); g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 }));
    lamp.position.set(s * 1.6, 4.8, -25); g.add(lamp);
  }
  return g;
};

/** The Waternet crane barge: a working boat with a cabin and a
 *  pivoting crane arm. The arm + lifted bike are animated in
 *  update() during shot 4. */
const makeCraneBarge = () => {
  const g = new THREE.Group();
  const hullM = lam2({ color: "#3a3f4a" });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 2.8), hullM);
  hull.position.y = 0.35; hull.castShadow = true; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 2.6), lam2({ color: "#8a6844", map: rep(planks(), 3, 1) }));
  deck.position.y = 0.85; g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.8), lam2({ color: "#e8b90a" }));
  cabin.position.set(-1.6, 1.6, 0); cabin.castShadow = true; g.add(cabin);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.84), lam2({ color: "#2e4a66" }));
  cabWin.position.set(-1.6, 1.9, 0); g.add(cabWin);
  const armPivot = new THREE.Group();
  armPivot.position.set(1.2, 0.9, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.6, 0.28), lam2({ color: "#d83a2a" }));
  arm.position.y = 2.3; arm.castShadow = true; armPivot.add(arm);
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 10), hullM);
  armBase.position.y = 0.25; armPivot.add(armBase);
  armPivot.rotation.z = -0.5;
  g.add(armPivot);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), METAL_MAT);
  cable.position.set(0, 0, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), METAL_MAT);
  hook.position.set(0, -1.15, 0);
  const cableGroup = new THREE.Group();
  cableGroup.add(cable); cableGroup.add(hook);
  const lifted = makeBike("#2e6db4", false, 77);
  lifted.position.set(0, -1.9, 0); lifted.rotation.z = 0.25; lifted.rotation.y = 0.4;
  cableGroup.add(lifted);
  g.add(cableGroup);
  return { group: g, armPivot, cableGroup };
};

/** Central Station facade: a wide brick hall with arched
 *  windows, a clock and a pediment, closing the far right. */
const makeStation = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(brickTex("belandaStation", "#8a4a3a"), 4, 2) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 6), wallM);
  body.position.y = 4.5; body.castShadow = true; g.add(body);
  const winM = lam2({ color: "#2e4a66" });
  for (let i = -3; i <= 3; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 0.1), winM);
    win.position.set(i * 2.4, 3.2, 3.02); g.add(win);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12, 1, false, 0, Math.PI), winM);
    arch.rotation.x = Math.PI / 2; arch.rotation.z = 0; arch.position.set(i * 2.4, 4.8, 3.02); g.add(arch);
  }
  const ped = new THREE.Mesh(new THREE.ConeGeometry(10.5, 2.2, 4), lam2({ color: "#6a3a2e" }));
  ped.position.y = 10.1; ped.rotation.y = Math.PI / 4; ped.scale.set(1, 1, 0.4); ped.castShadow = true; g.add(ped);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.15, 20), lam2({ color: "#f2ede2" }));
  clock.rotation.x = Math.PI / 2; clock.position.set(0, 7.6, 3.05); g.add(clock);
  const handM = lam2({ color: "#1d1d22" });
  const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.05), handM);
  hand1.position.set(0.2, 7.9, 3.14); hand1.rotation.z = -0.7; g.add(hand1);
  const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.05), handM);
  hand2.position.set(-0.1, 7.75, 3.14); hand2.rotation.z = 0.9; g.add(hand2);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), METAL_MAT);
  pole.position.set(0, 12.4, 0); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), lam2({ color: "#e8862c", side: THREE.DoubleSide }));
  flag.position.set(0.85, 13.4, 0); g.add(flag);
  return g;
};

/** The underwater bike garage mouth: a concrete portal at the
 *  canal edge, a ramp diving below the waterline, a glass canopy
 *  and a strip of water OVER the lintel so it reads as built
 *  under the water. */
const makeGarage = () => {
  const g = new THREE.Group();
  const concM = lam2({ map: rep(plasterTex("belandaGarage", "#b8b0a0"), 2, 1) });
  for (const s of [1, -1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 8.5), concM);
    wall.position.set(s * 3.3, -0.6, -20.5); wall.castShadow = true; g.add(wall);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.6, 1.4), concM);
  lintel.position.set(0, 0.35, -16.6); lintel.castShadow = true; g.add(lintel);
  const ramp = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 9.5), lam2({ color: "#4a4a52" }));
  ramp.rotation.x = -Math.PI / 2 + 0.19;
  ramp.position.set(0, -0.75, -20.8); ramp.receiveShadow = true; g.add(ramp);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.08, 1.6),
    new THREE.MeshLambertMaterial({ color: "#bcd9f7", transparent: true, opacity: 0.65 }));
  glass.position.set(0, 0.72, -16.6); g.add(glass);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), lam2({ map: rep(water(), 2, 1), color: "#5a9a7a" }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.14, -16.4); g.add(strip);
  for (let i = 0; i < 4; i++) {
    const b = makeBike(BIKE_COLS[(i * 3 + 1) % BIKE_COLS.length], false, 50 + i);
    b.position.set(-2.2 + (i % 2) * 4.4, -0.25 - i * 0.32, -18.2 - i * 1.9);
    b.rotation.y = Math.PI;
    b.rotation.x = -0.19;
    g.add(b);
  }
  return g;
};

/** The Guinness trophy: a gold cup on a stone pedestal. */
const makeTrophy = () => {
  const g = new THREE.Group();
  const goldM = new THREE.MeshLambertMaterial({ color: "#f2c14e", emissive: "#8a6a10", emissiveIntensity: 0.3 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.1, 12), lam2({ map: rep(plasterTex("belandaPedestal", "#d8cbb0"), 1, 1) }));
  ped.position.y = 0.55; ped.castShadow = true; g.add(ped);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.65, 14), goldM);
  cup.position.y = 1.55; cup.castShadow = true; g.add(cup);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.35, 8), goldM);
  stem.position.y = 1.1; g.add(stem);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), goldM);
  base.position.y = 1.16; g.add(base);
  for (const s of [1, -1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 12, Math.PI), goldM);
    handle.position.set(s * 0.52, 1.55, 0); handle.rotation.z = s * Math.PI / 2; g.add(handle);
  }
  const star = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 5), goldM);
  star.position.y = 2.1; g.add(star);
  return g;
};

/** A canal tour boat: hull + glass canopy, gliding along the
 *  canal in update(). */
const makeBoat = () => {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 2.0), lam2({ color: "#2e4a66" }));
  hull.position.y = 0.3; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.8, 3, 1), lam2({ color: "#2e4a66" }));
  bow.rotation.x = Math.PI / 2; bow.rotation.y = 0; bow.scale.set(1, 1, 0.5);
  bow.position.set(3.6, 0.3, 0); g.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.1, 1.8), lam2({ color: "#8a6844", map: rep(planks(), 4, 1) }));
  deck.position.y = 0.75; g.add(deck);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 1.6),
    new THREE.MeshLambertMaterial({ color: "#cfe4f7", transparent: true, opacity: 0.75 }));
  canopy.position.set(-0.3, 1.15, 0); g.add(canopy);
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.8), lam2({ color: "#f2ede2" }));
  canopyRoof.position.set(-0.3, 1.55, 0); g.add(canopyRoof);
  return g;
};

/** A pollard willow: short trunk, a rounded pollarded crown of
 *  layered foliage blobs. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h * 0.45, 8), trunkM);
  trunk.position.y = h * 0.22; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "belandaFoliageDeep"),
    folM(greens[0], "belandaFoliageMid"),
    folM(greens[1] ?? greens[0], "belandaFoliageLite"),
  ];
  const cy = h * 0.68, cr = h * 0.34;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  blobAt(0, cy, 0, cr * 0.95, 1);
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
 *  vertex-coloured dark base -> sunlit tip. */
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
  private waterMaps: THREE.Texture[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private boat!: THREE.Group;
  private craneArm!: THREE.Group;
  private craneCable!: THREE.Group;

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
    this.buildAmsterdam(R, r);
  }

  // ---------------- Amsterdam: quay, canal, bike sea, houses ----------------
  private buildAmsterdam(R: THREE.Group, r: () => number) {
    // base land under everything (far bank lawn)
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the paved quay, near side of the canal
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(160, 32), lam2({ map: rep(cobble(), 24, 6), color: "#d8cbb0" }));
    quay.rotation.x = -Math.PI / 2; quay.position.set(0, 0.02, -1); quay.receiveShadow = true; R.add(quay);
    // canal bed (dark, under the water)
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(150, 18), lam2({ color: "#2e3a2e" }));
    bed.rotation.x = -Math.PI / 2; bed.position.set(0, -0.5, (CANAL_Z0 + CANAL_Z1) / 2); R.add(bed);
    // ---- THE CANAL: emerald water in three planes, leaving a hole
    // for the garage mouth at GARAGE_POS (x -17..-11, z -24..-16) ----
    const waterSeg = (x0: number, x1: number, z0: number, z1: number, rx: number, rz: number) => {
      const map = rep(water(), rx, rz);
      this.waterMaps.push(map);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), lam2({ map, color: "#5a9a7a" }));
      w.rotation.x = -Math.PI / 2; w.position.set((x0 + x1) / 2, 0.12, (z0 + z1) / 2); w.receiveShadow = true; R.add(w);
      return w;
    };
    waterSeg(-75, -17, CANAL_Z0, CANAL_Z1, 10, 2);
    waterSeg(-11, 75, CANAL_Z0, CANAL_Z1, 10, 2);
    waterSeg(-17, -11, CANAL_Z0, -24, 1, 1);
    // stone edging along the quay side of the canal
    const edge = new THREE.Mesh(new THREE.BoxGeometry(150, 0.35, 0.7), lam2({ map: rep(plasterTex("belandaEdge", "#cbbfa6"), 8, 1) }));
    edge.position.set(0, 0.1, CANAL_Z1 + 0.35); edge.castShadow = true; edge.receiveShadow = true; R.add(edge);
    const edgeFar = new THREE.Mesh(new THREE.BoxGeometry(150, 0.35, 0.7), lam2({ map: rep(plasterTex("belandaEdgeFar", "#cbbfa6"), 8, 1) }));
    edgeFar.position.set(0, 0.1, CANAL_Z0 - 0.35); edgeFar.castShadow = true; R.add(edgeFar);
    // ---- THE BIKE SEA: two rows of real 3D bikes + one painted
    // far row strip (1 draw call) behind them ----
    const rowCols = BIKE_COLS;
    for (const [ri, rz] of [[0, BIKE_ROWS[0]], [1, BIKE_ROWS[1]]] as [number, number][]) {
      for (let i = 0; i < 31; i++) {
        const x = -18 + i * 1.2 + (r() - 0.5) * 0.15;
        const b = makeBike(rowCols[(i + ri * 4) % rowCols.length], r() < 0.18, i * 7 + ri);
        b.position.set(x, 0.02, rz + (r() - 0.5) * 0.2);
        b.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.12;
        R.add(b);
      }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 38, 6), METAL_MAT);
      rail.rotation.z = Math.PI / 2; rail.position.set(0, 0.5, rz + 0.55); R.add(rail);
    }
    const farRow = new THREE.Mesh(new THREE.PlaneGeometry(22, 1.35),
      new THREE.MeshBasicMaterial({ map: bikeRowTex(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    farRow.position.set(0, 0.68, BIKE_ROWS[2]); R.add(farRow);
    // a few real bikes in front of the painted row for depth
    for (let i = 0; i < 6; i++) {
      const b = makeBike(rowCols[(i * 2 + 3) % rowCols.length], true, 200 + i);
      b.position.set(-14 + i * 5.6, 0.02, BIKE_ROWS[2] + 0.7);
      b.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.1;
      R.add(b);
    }
    // ---- hero bikes: two detailed bikes near the hero spot ----
    for (const [hx, hz] of [[1.2, -3.6], [-1.8, -3.2]] as [number, number][]) {
      const b = makeBike("#c0392b", true, 300 + Math.floor(hx * 10));
      b.position.set(hx, 0.02, hz);
      b.rotation.y = Math.PI / 2 - 0.3;
      R.add(b);
      blob(R, hx, 0.06, hz, 1.6, 1.1, 0.3);
    }
    // ---- the bike pile (shot 3): a heap of bikes in the open quay ----
    for (let i = 0; i < 10; i++) {
      const b = makeBike(BIKE_COLS[i % BIKE_COLS.length], false, 400 + i);
      const a = (i / 10) * Math.PI * 2;
      b.position.set(PILE_POS[0] + Math.cos(a) * 1.1, 0.15 + (i % 3) * 0.55, PILE_POS[2] + Math.sin(a) * 0.9);
      b.rotation.set((r() - 0.5) * 0.9, r() * Math.PI * 2, (r() - 0.5) * 1.1);
      R.add(b);
    }
    blob(R, PILE_POS[0], 0.06, PILE_POS[2], 4.5, 3.5, 0.3);
    // ---- the trophy pedestal (shot 5) ----
    const trophy = makeTrophy();
    trophy.position.set(TROPHY_POS[0], 0, TROPHY_POS[2]);
    R.add(trophy);
    blob(R, TROPHY_POS[0], 0.06, TROPHY_POS[2], 2.4, 2.4, 0.3);
    // ---- the baby bike (shot 7): detailed bike + basket, centre quay ----
    const babyBike = makeBike("#2e8a4a", true, 500);
    babyBike.position.set(BABY_BIKE_POS[0], 0.02, BABY_BIKE_POS[2]);
    babyBike.rotation.y = Math.PI / 2 - 0.2;
    R.add(babyBike);
    blob(R, BABY_BIKE_POS[0], 0.06, BABY_BIKE_POS[2], 1.8, 1.2, 0.3);
    // ---- the arched bridge ----
    const bridge = makeBridge();
    bridge.position.set(BRIDGE_X, 0, 0);
    R.add(bridge);
    // ---- the crane barge on the canal ----
    const crane = makeCraneBarge();
    crane.group.position.set(CRANE_POS[0], 0.1, CRANE_POS[2]);
    crane.group.rotation.y = 0.5;
    R.add(crane.group);
    this.craneArm = crane.armPivot;
    this.craneCable = crane.cableGroup;
    // ---- the underwater garage mouth ----
    const garage = makeGarage();
    garage.position.set(GARAGE_POS[0], 0, 0);
    R.add(garage);
    // ---- Central Station facade, far right ----
    const station = makeStation();
    station.position.set(STATION_POS[0], 0, STATION_POS[2]);
    station.rotation.y = -0.12;
    R.add(station);
    // ---- the tour boat, gliding along the canal ----
    this.boat = makeBoat();
    this.boat.position.set(-30, 0.1, -25);
    R.add(this.boat);
    // ---- Dutch gabled houses along the far bank ----
    const houseCols: [string, string][] = [
      ["#9c5a44", "#6a3a2e"], ["#d8a860", "#8a4a3a"], ["#e8dcc4", "#7a4a42"],
      ["#6a7a8a", "#3d5a78"], ["#7a3a34", "#5a2a24"], ["#e8d878", "#8a4a3a"],
      ["#7a8a6a", "#4a5a3a"], ["#8a5a3a", "#6a3a2e"],
    ];
    houseCols.forEach(([wall, roof], i) => {
      const h = makeDutchHouse(wall, roof, 3.4 + (i % 3) * 0.5, 6.2 + (i % 3) * 1.1, 60 + i * 11);
      h.position.set(-30 + i * 8.6, 0, -40 - (i % 2) * 2.5);
      h.rotation.y = (r() - 0.5) * 0.08;
      R.add(h);
      blob(R, -30 + i * 8.6, 0.06, -38, 5, 4, 0.2);
    });
    // ---- pollard willows along the far bank + quay edges ----
    const greens = ["#4a7a3a", "#5a8a42", "#3a6a30"];
    const treePts: [number, number, number][] = [
      [-24, -37, 4.6], [-8, -38, 5.2], [6, -37, 4.4], [20, -38, 5.0], [34, -37, 4.8],
      [-20, 8, 4.2], [22, 6, 4.5],
    ];
    treePts.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
    });
    // ---- tulip beds along the quay edge ----
    const tulipCols = ["#e8542e", "#e8c832", "#e86a9a", "#f2f0e6", "#d83a4a"];
    for (let bedI = 0; bedI < 4; bedI++) {
      const bx = -16 + bedI * 11, bz = -14.6;
      for (let i = 0; i < 16; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07 + r() * 0.03, 6, 5), lam2({ color: tulipCols[Math.floor(r() * tulipCols.length) % tulipCols.length] }));
        dot.position.set(bx + (r() - 0.5) * 2.4, 0.22 + r() * 0.08, bz + (r() - 0.5) * 0.5);
        R.add(dot);
      }
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.7), lam2({ color: "#3f7d29" }));
      leaf.position.set(bx, 0.1, bz); R.add(leaf);
    }
    // ---- lamp posts + benches along the quay ----
    for (const lx of [-18, -6, 6, 18]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6), lam2({ color: "#2e3a2e" }));
      post.position.set(lx, 1.6, -14.8); post.castShadow = true; R.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 }));
      lamp.position.set(lx, 3.3, -14.8); R.add(lamp);
    }
    for (const [bx, bz, byaw] of [[-10, 4, 0.3], [10, 5, -0.3]] as [number, number, number][]) {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
      seat.position.y = 0.55; seat.castShadow = true; bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
      back.position.set(0, 0.95, -0.28); back.rotation.x = -0.15; bench.add(back);
      for (const s of [1, -1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.55), lam2({ color: "#3a3a3a" }));
        leg.position.set(s * 0.95, 0.27, 0); bench.add(leg);
      }
      bench.position.set(bx, 0, bz); bench.rotation.y = byaw;
      R.add(bench);
    }
    // ---- grass dressing on the far bank ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (16 + r() * 14), 0.128, -38 - r() * 8, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts.slice(0, 5)) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 500; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (28 + r() * 20), z = -36 - r() * 10;
      tuftPts.push({ x, z, s: 0.65 + r() * 0.8 });
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
    const elDeg = Lp.el;
    const az = THREE.MathUtils.degToRad(Lp.az), el = THREE.MathUtils.degToRad(elDeg);
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
    // the canal flows (texture scroll, not a poster)
    for (const wm of this.waterMaps) wm.offset.set(tt * 0.03, tt * 0.008);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // willows sway in the breeze, pivoting at the trunk base
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
    // the tour boat glides along the canal, wrapping around
    if (this.boat) this.boat.position.x = -38 + ((tt * 1.4 + 38) % 76);
    // shot 4: the crane lifts the dripping bike out of the canal
    if (this.craneArm && this.craneCable) {
      const U = id === 4 ? Math.max(0, Math.min(1, (t - s.a / FPS) / Math.max(0.01, (s.b - s.a) / FPS))) : 0;
      this.craneArm.rotation.z = -0.5 - U * 0.35;
      this.craneCable.position.y = U * 1.6;
      this.craneCable.rotation.z = Math.sin(tt * 1.8) * 0.05 * (id === 4 ? 1 : 0.2);
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
