// Lake Nakaumi + the Eshima Ohashi bridge as one three.js scene
// for the Fafnir-ID short: a 1.7 km concrete bridge rising 44.7 m
// over the lake between Matsue and Sakaiminato, Mt. Daisen on the
// horizon, the famous telephoto photo spot by the minimarket on
// the near shore, kei cars on the deck, a cargo ship passing
// underneath. VISUAL CORE: bright Japanese daylight, deep blue
// lake + pale concrete, sun rays over the water. Layered light
// rig: sun key w/ soft shadows + hemisphere fill + rim — the house
// style. STANDAR GERAK: clouds drift, pines sway, the lake
// ripples (scrolling texture), cars drive the deck, the ship sails
// and bobs, birds cross the sky — nothing is a poster. NOTE
// (lesson from an earlier episode): the lake is fully OPAQUE — no semi-transparent
// surface anywhere near text; the fact cards float in the air
// above the shore, never over the water.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, deckY, deckSlope, APEX_Z, PHOTO_SPOT, MART_SPOT, DAISEN } from "./story";

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
    lobes.push([cx + (t - 0.5) * s * 1.7, cy + Math.sin(t * Math.PI) * -s * 0.22, s * (0.3 + r() * 0.22)]);
  }
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aab8d4"); // shaded belly
  layer(0, 0, "#d7e2f2");        // mid tone
  layer(-s * 0.14, -s * 0.08, "#ffffff"); // sunlit crown
};
const skyTexJapan = () => ctex("eshSkyJapan", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#4f92dd"); grad.addColorStop(0.45, "#82b8e8"); grad.addColorStop(0.75, "#c8e4f6"); grad.addColorStop(1, "#f4f8ea");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // fine speckle so the gradient never bands
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`;
    g.fillRect(r() * 2048, r() * 1024, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.5)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w);
  }
  const clusters: [number, number, number][] = [
    [300, 300, 260], [760, 220, 320], [1240, 330, 280], [1680, 240, 340], [1980, 360, 240],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,220,0.95)"); sn.addColorStop(1, "rgba(255,250,220,0)");
  g.fillStyle = sn; g.fillRect(160, -60, 520, 520);
});
const glowTex = () => ctex("eshGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,214,0.9)"); gr.addColorStop(0.5, "rgba(255,240,200,0.28)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Lake water: deep blue with pale ripple strokes and sun glints —
 *  tiled and scrolled in update() so the lake is ALIVE. Opaque. */
const waterTex = () => ctex("eshWater", 512, 512, (g, r) => {
  g.fillStyle = "#2a6ea8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    const cx = r() * 512, cy = r() * 512, rad = 30 + r() * 90;
    const gr = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    const c = r() < 0.5 ? "24,90,140" : "70,140,190";
    gr.addColorStop(0, `rgba(${c},0.20)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // ripple strokes: short pale arcs, scattered
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, l = 8 + r() * 22;
    g.strokeStyle = `rgba(200,230,250,${0.10 + r() * 0.22})`;
    g.lineWidth = 1.5 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 4); g.stroke();
  }
  // sun glints
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,250,220,${0.12 + r() * 0.2})`;
    g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3);
  }
});
/** Shore grass: green with path speckles — never a flat plane. */
const grassTex = () => ctex("eshGrass", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a7a34"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) {
    const cx = 512 + (r() - 0.5) * 900, cy = 512 + (r() - 0.5) * 900, rad = 40 + r() * 140;
    const gr = g.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
    const c = r() < 0.5 ? "52,96,40" : "96,120,52";
    gr.addColorStop(0, `rgba(${c},0.18)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  const cols = ["#3a6a2a", "#5a8a3a", "#6a9a4a", "#2c5c24"];
  for (let i = 0; i < 3500; i++) {
    const x = r() * 1024, y = r() * 1024;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.globalAlpha = 0.12 + r() * 0.2;
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI);
    g.fillRect(-2 - r() * 3, -1.5, 4 + r() * 5, 2 + r() * 2);
    g.restore();
  }
  g.globalAlpha = 1;
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#1e4a26"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() < 0.5 ? `rgba(12,44,20,${0.2 + r() * 0.3})` : `rgba(60,110,55,${0.15 + r() * 0.3})`;
    g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
  }
});
const barkTex = () => ctex("eshBark", 256, 256, (g, r) => {
  g.fillStyle = "#4a3528"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = `rgba(16,10,6,${0.25 + r() * 0.35})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
});
const concreteTex = () => ctex("eshConcrete", 512, 512, (g, r) => {
  g.fillStyle = "#b8bcc0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(90,95,100,${0.05 + r() * 0.1})` : `rgba(220,225,230,${0.05 + r() * 0.1})`;
    g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3);
  }
  // panel seams
  g.strokeStyle = "rgba(80,85,90,0.35)"; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
  }
});
const blobTex = () => ctex("eshBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(28,40,20,0.4)"); gr.addColorStop(1, "rgba(28,40,20,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Minimarket sign: white board, red "MART" letters, blue stripe. */
const martSignTex = () => ctex("eshMartSign", 512, 128, (g) => {
  g.fillStyle = "#f6f2e8"; g.fillRect(0, 0, 512, 128);
  g.fillStyle = "#d42a2a"; g.fillRect(0, 0, 512, 18);
  g.fillStyle = "#1c4a9a"; g.fillRect(0, 110, 512, 18);
  g.fillStyle = "#d42a2a"; g.font = "900 72px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("MART", 256, 66);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  m.layers.set(NOINK); parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** A Japanese black pine: tall trunk + 3 flattened dark-green
 *  canopy tiers, each a different green — the layered, textured
 *  look the 23 Nov standard demands. */
const makePine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 29);
  const trunkM = twoTone(new THREE.MeshLambertMaterial({ map: rep(barkTex(), 1, 2), color: "#7a5a40" }), 0.2);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, h * 0.6, 8), trunkM);
  trunk.position.y = h * 0.3; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => twoTone(new THREE.MeshLambertMaterial({ color: col, map: rep(foliageTex(key), 1, 1) }), 0.3);
  const mats = [folM("#1e4a26", "eshPineDeep"), folM("#2c6030", "eshPineMid"), folM("#3f7a38", "eshPineLite")];
  for (let li = 0; li < 3; li++) {
    const y = h * (0.55 + li * 0.15), rad = h * (0.26 - li * 0.05);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + tr() * 0.8;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad * (0.5 + tr() * 0.25), 10, 8), mats[(li + i) % 3]);
      b.position.set(Math.cos(a) * rad * 0.45, y + (tr() - 0.5) * 0.5, Math.sin(a) * rad * 0.45);
      b.scale.y = 0.5; b.castShadow = true; g.add(b);
    }
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.55, 10, 8), mats[li % 3]);
    crown.position.y = y + rad * 0.3; crown.scale.y = 0.55; crown.castShadow = true; g.add(crown);
  }
  return g;
};
/** A small Japanese house: plaster box + dark tiled hip roof. */
const makeHouse = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 3);
  const wallCols = ["#e8dcc8", "#f2ead8", "#d8c8b8"];
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.4),
    lam2({ color: wallCols[Math.floor(tr() * wallCols.length)] }));
  body.position.y = 0.85; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.1, 4),
    lam2({ color: "#3a3f4a" }));
  roof.position.y = 2.25; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.9);
  roof.castShadow = true; g.add(roof);
  // a lit window
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6),
    new THREE.MeshBasicMaterial({ color: "#ffe9a8" }));
  win.position.set(0.4, 1.0, 1.21); g.add(win);
  return g;
};
/** THE BRIDGE DECK: 24 segments following deckY(), each a
 *  concrete slab with barriers, centre dashes and lamp posts.
 *  Pillars drop from the deck into the lake at z = +10, -10,
 *  -30 (apex, tallest), -50, -70. */
const makeBridge = (parent: THREE.Object3D) => {
  const deckM = twoTone(new THREE.MeshLambertMaterial({ map: rep(concreteTex(), 1, 6), color: "#c8ccd0" }), 0.25);
  const barrierM = lam2({ color: "#d8dce0" });
  const dashM = new THREE.MeshBasicMaterial({ color: "#f6f2e8" });
  const lampM = lam2({ color: "#3a3f46" });
  const lampGlowM = new THREE.MeshBasicMaterial({ color: "#ffe9a8" });
  const N = 24, z0 = 30, z1 = -90, len = (z0 - z1) / N;
  for (let i = 0; i < N; i++) {
    const zc = z0 - (i + 0.5) * len;
    const y = deckY(zc);
    const tilt = Math.atan(deckSlope(zc));
    const seg = new THREE.Group();
    seg.position.set(0, y - 0.25, zc);
    seg.rotation.x = tilt;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, len + 0.15), deckM);
    slab.castShadow = true; slab.receiveShadow = true; seg.add(slab);
    for (const sx of [-1.55, 1.55]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, len + 0.15), barrierM);
      bar.position.set(sx, 0.5, 0); bar.castShadow = true; seg.add(bar);
    }
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, len * 0.5), dashM);
    dash.position.set(0, 0.26, 0); seg.add(dash);
    parent.add(seg);
    // lamp posts every other segment, alternating sides
    if (i % 2 === 0) {
      const lx = i % 4 === 0 ? 1.45 : -1.45;
      const lamp = new THREE.Group();
      lamp.position.set(lx, y, zc);
      lamp.rotation.x = tilt;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6), lampM);
      pole.position.y = 0.65; lamp.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampGlowM);
      head.position.y = 1.32; lamp.add(head);
      parent.add(lamp);
    }
  }
  // pillars: concrete piers from the lake bed to the deck underside
  const pierM = twoTone(new THREE.MeshLambertMaterial({ color: "#a8adb2" }), 0.2);
  for (const pz of [10, -10, -30, -50, -70]) {
    const top = deckY(pz) - 0.5;
    const h = top + 1.5; // sunk 1.5 into the lake bed
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 2.6), pierM);
    pier.position.set(0, h / 2 - 1.5, pz);
    pier.castShadow = true; pier.receiveShadow = true;
    parent.add(pier);
  }
};
/** A boxy kei car (Daihatsu Tanto style): tall little box on
 *  wheels. `body` colour per car. Returns the group; wheels spin
 *  via userData in update(). */
type CarParts = { group: THREE.Group; wheels: THREE.Mesh[] };
const makeKeiCar = (bodyCol: string): CarParts => {
  const g = new THREE.Group();
  const bodyM = twoTone(new THREE.MeshLambertMaterial({ color: bodyCol }), 0.35);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 2.1), bodyM);
  body.position.y = 0.5; body.castShadow = true; g.add(body);
  const cabM = twoTone(new THREE.MeshLambertMaterial({ color: "#2a3a4a" }), 0.3);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 1.25), cabM);
  cab.position.set(0, 1.0, -0.1); cab.castShadow = true; g.add(cab);
  // pale roof panel on the cabin
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 1.2), lam2({ color: bodyCol }));
  roof.position.set(0, 1.28, -0.1); g.add(roof);
  // headlights + taillights
  const hlM = new THREE.MeshBasicMaterial({ color: "#fff6c8" });
  for (const sx of [-0.32, 0.32]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), hlM);
    hl.position.set(sx, 0.55, -1.06); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: "#c82a2a" }));
    tl.position.set(sx, 0.55, 1.06); g.add(tl);
  }
  const wheelM = lam2({ color: "#1a1a1a" });
  const wheels: THREE.Mesh[] = [];
  for (const [wx, wz] of [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.7], [0.5, 0.7]] as const) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.14, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.21, wz); w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  return { group: g, wheels };
};
/** A cargo ship passing under the bridge: dark hull, coloured
 *  containers, white bridge tower, one smokestack. */
const makeShip = () => {
  const g = new THREE.Group();
  const hullM = twoTone(new THREE.MeshLambertMaterial({ color: "#7a2a20" }), 0.2);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 14), hullM);
  hull.position.y = 0.8; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 4), hullM);
  bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.8, -8.4); bow.scale.set(1, 1, 1); g.add(bow);
  const contCols = ["#2a6ab8", "#c85a1e", "#3a8a4a", "#b8a02a"];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 2.4),
      lam2({ color: contCols[i % 4] }));
    c.position.set(0, 2.1, -4.5 + i * 2.8); c.castShadow = true; g.add(c);
  }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.6), lam2({ color: "#f2f0e8" }));
  tower.position.set(0, 2.5, 5.2); tower.castShadow = true; g.add(tower);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.6, 10), lam2({ color: "#e8b81e" }));
  stack.position.set(0, 3.2, 3.4); g.add(stack);
  return g;
};
/** Mt. Daisen: a big layered cone with a snow cap, far back. */
const makeMountain = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 5);
  const base = new THREE.Mesh(new THREE.ConeGeometry(30, 30, 24),
    twoTone(new THREE.MeshLambertMaterial({ color: "#5a6a72" }), 0.2));
  base.position.y = 15; g.add(base);
  // green lower slopes: a slightly wider, shorter cone
  const green = new THREE.Mesh(new THREE.ConeGeometry(30.5, 16, 24),
    twoTone(new THREE.MeshLambertMaterial({ color: "#3a5a3a" }), 0.25));
  green.position.y = 8; g.add(green);
  // snow cap
  const snow = new THREE.Mesh(new THREE.ConeGeometry(11, 9, 24), lam2({ color: "#f4f8ff" }));
  snow.position.y = 25.5; g.add(snow);
  void tr;
  return g;
};
/** The minimarket at the photo spot: white box, blue awning,
 *  red MART sign facing the road. */
const makeMart = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 3.6), lam2({ color: "#f2efe8" }));
  body.position.y = 1.2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 4.0), lam2({ color: "#2a4a7a" }));
  roof.position.y = 2.5; g.add(roof);
  // blue awning over the front
  const awn = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.2), lam2({ color: "#1c4a9a" }));
  awn.position.set(0, 2.0, 2.1); awn.rotation.x = 0.25; g.add(awn);
  // the MART sign, facing +z (the road / photo spot)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9),
    new THREE.MeshBasicMaterial({ map: martSignTex() }));
  sign.position.set(0, 2.9, 1.82); g.add(sign);
  // glass front: dark panel (opaque!)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5),
    new THREE.MeshLambertMaterial({ color: "#2a4a5a" }));
  glass.position.set(0, 1.0, 1.81); g.add(glass);
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c4d8ec", 20, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private waterTexInst: THREE.Texture;
  private ship: THREE.Group;
  private keiCar: CarParts;
  private car2: CarParts;
  private car3: CarParts;
  private birds: { g: THREE.Group; x0: number; sp: number; y: number; z: number; ph: number }[] = [];
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
      new THREE.MeshBasicMaterial({ map: skyTexJapan(), side: THREE.BackSide, fog: false }));
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
    // ---- THE LAKE: opaque, rippling (texture scrolls in update) ----
    this.waterTexInst = rep(waterTex(), 12, 12);
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(260, 260),
      lam2({ map: this.waterTexInst }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(0, 0, -40);
    lake.receiveShadow = true; R.add(lake);
    // ---- shores: grass land on both ends of the lake ----
    const grassM = lam2({ map: rep(grassTex(), 6, 3) });
    const nearShore = new THREE.Mesh(new THREE.PlaneGeometry(260, 46), grassM);
    nearShore.rotation.x = -Math.PI / 2; nearShore.position.set(0, 0.05, 53);
    nearShore.receiveShadow = true; R.add(nearShore);
    const farShore = new THREE.Mesh(new THREE.PlaneGeometry(260, 60), grassM);
    farShore.rotation.x = -Math.PI / 2; farShore.position.set(0, 0.05, -120);
    farShore.receiveShadow = true; R.add(farShore);
    // ---- approach roads (asphalt strips with centre dashes) ----
    const roadM = lam2({ color: "#3a3f46" });
    const dashM = new THREE.MeshBasicMaterial({ color: "#f6f2e8" });
    for (const [rz, rlen] of [[50, 40], [-110, 40]] as const) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(3.4, rlen), roadM);
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.09, rz);
      road.receiveShadow = true; R.add(road);
      for (let dz = -rlen / 2 + 2; dz < rlen / 2; dz += 4) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.6), dashM);
        dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.11, rz + dz);
        R.add(dash);
      }
    }
    // ---- THE BRIDGE ----
    makeBridge(R);
    // ---- Mt. Daisen + a smaller peak, far back ----
    const daisen = makeMountain(1);
    daisen.position.set(DAISEN[0], DAISEN[1], DAISEN[2]);
    R.add(daisen);
    const peak2 = makeMountain(2);
    peak2.scale.setScalar(0.55);
    peak2.position.set(55, 0, -145);
    R.add(peak2);
    // ---- pines ringing both shores (kept clear of the bridge axis
    //  and the photo spot so nothing reads as a second subject) ----
    const pineSpots: [number, number, number, number][] = [
      [-14, 38, 8, 3], [18, 38, 7.5, 5], // (was 14,40: its canopy intruded into shot 5 from the right edge) [-18, 52, 9, 7], [20, 56, 8, 9],
      [-24, 62, 8.5, 11], [26, 64, 9, 13], [-30, 44, 7, 15], [30, 48, 8, 17],
      [-16, -100, 9, 19], [16, -102, 8.5, 21], [-22, -112, 10, 23], [22, -114, 9, 25],
      [-30, -96, 8, 27], [28, -98, 8.5, 29],
    ];
    for (const [mx, mz, mh, ms] of pineSpots) {
      const t = makePine(mh, ms);
      t.position.set(mx, 0, mz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
      blob(R, mx, 0.06, mz, mh * 1.1, mh * 1.1, 0.4);
    }
    // ---- houses on the near shore ----
    for (const [hx, hz, hs] of [[-16, 58, 3], [-20, 48, 5], [18, 60, 7]] as const) {
      const h = makeHouse(hs);
      h.position.set(hx, 0, hz); h.rotation.y = r() * Math.PI * 2;
      R.add(h);
    }
    // ---- the minimarket at the photo spot ----
    const mart = makeMart();
    mart.position.set(MART_SPOT[0], MART_SPOT[1], MART_SPOT[2]);
    mart.rotation.y = 0.12;
    R.add(mart);
    blob(R, MART_SPOT[0], 0.06, MART_SPOT[2], 6, 6, 0.4);
    // ---- the cargo ship (sails under the apex in shot 3) ----
    this.ship = makeShip();
    this.ship.position.set(-35, 0, APEX_Z);
    this.ship.rotation.y = Math.PI / 2; // hull along X
    R.add(this.ship);
    // ---- kei cars: the yellow hero car + two traffic cars ----
    this.keiCar = makeKeiCar("#f2c018");
    R.add(this.keiCar.group);
    this.car2 = makeKeiCar("#e8e8e8");
    R.add(this.car2.group);
    this.car3 = makeKeiCar("#c83a2a");
    R.add(this.car3.group);
    // ---- birds crossing the sky ----
    const birdM = new THREE.MeshBasicMaterial({ color: "#2a2a2a", side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), birdM);
        wing.position.x = s * 0.24; wing.rotation.z = s * 0.5;
        b.add(wing);
      }
      const y = 22 + i * 4, z = -60 - i * 18;
      b.position.set(-60 + i * 30, y, z);
      this.birds.push({ g: b, x0: -60 + i * 30, sp: 1.5 + i * 0.4, y, z, ph: i * 2.1 });
      R.add(b);
    }
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

  /** Place a car on the deck at z, facing -z (toward the apex /
   *  far shore), pitched to the road. `vis` hides it elsewhere. */
  private placeCar(car: CarParts, z: number, vis: boolean) {
    car.group.visible = vis;
    if (!vis) return;
    const y = deckY(z);
    car.group.position.set(0.55, y, z);
    car.group.rotation.set(Math.atan(deckSlope(z)), Math.PI, 0);
    // wheels spin slowly with travel (visual only)
    for (const w of car.wheels) w.rotation.x += 0.05;
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
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // pines sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // the lake ripples: scroll the tiled water texture
    this.waterTexInst.offset.set(tt * 0.008, tt * 0.014);
    // birds cross the sky, wings bobbing
    for (const b of this.birds) {
      const x = b.x0 + tt * b.sp * 6;
      b.g.position.set(((x + 90) % 180) - 90, b.y + Math.sin(tt * 1.4 + b.ph) * 0.8, b.z);
      b.g.rotation.z = Math.sin(tt * 3 + b.ph) * 0.25;
    }
    // ---- the ship: sails under the apex in shot 3 only ----
    const U = (f - s.a) / Math.max(1, s.b - s.a);
    if (id === 3) {
      this.ship.visible = true;
      this.ship.position.set(-35 + U * 70, Math.sin(tt * 1.2) * 0.06, APEX_Z);
      this.ship.rotation.z = Math.sin(tt * 0.9) * 0.01;
    } else {
      this.ship.visible = false;
    }
    // ---- kei cars on the deck (per shot, each illustrating its own VO line) ----
    // shot 1 (cover): the yellow car far up the deck, climbing the "wall"
    // shot 2 (wide): two cars, one climbing, one descending the far side
    // shot 5 (twist): the yellow car climbs the gentle slope, casually
    // shot 6 (on deck): the yellow car cruises on, hero waving
    // shot 8 (the ad): the yellow car climbs dynamically toward the apex
    if (id === 1) {
      this.placeCar(this.keiCar, -16, true);
      this.placeCar(this.car2, -48, false);
      this.placeCar(this.car3, 18, false);
    } else if (id === 2) {
      this.placeCar(this.keiCar, 12, true);
      this.placeCar(this.car2, -52, true);
      this.placeCar(this.car3, -8, false);
    } else if (id === 5) {
      this.placeCar(this.keiCar, 26 - U * 18, true);
      this.placeCar(this.car2, -40, false);
      this.placeCar(this.car3, 20, false);
    } else if (id === 6) {
      this.placeCar(this.keiCar, 8 - U * 20, true);
      this.placeCar(this.car2, -55, false);
      this.placeCar(this.car3, 22, false);
    } else if (id === 8) {
      this.placeCar(this.keiCar, -22 + U * 10, true);
      this.placeCar(this.car2, 14, false);
      this.placeCar(this.car3, -60, false);
    } else {
      this.placeCar(this.keiCar, 0, false);
      this.placeCar(this.car2, 0, false);
      this.placeCar(this.car3, 0, false);
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
