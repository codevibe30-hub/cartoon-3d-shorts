// St. Peter's Square, Vatikan as one three.js scene for the
// Fafnir-ID short: a freestanding ATM kiosk of the Vatican Bank
// glows on the cobblestone piazza — the ONLY ATM in the world
// that speaks Latin. Behind it the Vatican obelisk, Bernini's
// colonnade curving both sides, and St. Peter's facade + dome
// closing the horizon. Pigeons peck the piazza, cypress trees
// stand at the edges, the ATM screen cycles its Latin menu.
// VISUAL CORE: warm travertine stone, deep blue Roman sky, the
// ATM's glowing screen as the one modern object in a 400-year-old
// square. Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, ATM_C, OBELISK_C } from "./story";

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
/** Roman sky: deep blue up top, warm hazy gold near the horizon. */
const skyTexDay = () => ctex("vatikanSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#16489e"); grad.addColorStop(0.34, "#3570c8"); grad.addColorStop(0.62, "#7fb0e8");
  grad.addColorStop(0.85, "#d8e8c8"); grad.addColorStop(1, "#f2eec8");
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
const glowTex = () => ctex("vatikanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("vatikanBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** cobblestone: warm grey sampietrini blocks in offset rows,
 *  each stone shaded individually so the piazza never reads flat */
const cobbleTex = () => ctex("vatikanCobble", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8d8578"; g.fillRect(0, 0, S, S);
  const cw = 64, ch = 44;
  for (let row = 0; row < S / ch + 1; row++) {
    const off = (row % 2) * cw * 0.5;
    for (let col = -1; col < S / cw + 1; col++) {
      const x = col * cw + off, y = row * ch;
      const v = 0.82 + r() * 0.36;
      const base: [number, number, number] = [141 * v, 133 * v, 120 * v];
      g.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`;
      g.beginPath(); g.roundRect(x + 2, y + 2, cw - 4, ch - 4, 9); g.fill();
      g.fillStyle = "rgba(255,246,220,0.16)";
      g.beginPath(); g.roundRect(x + 4, y + 3, cw - 8, 10, 5); g.fill();
      g.fillStyle = "rgba(40,32,20,0.20)";
      g.beginPath(); g.roundRect(x + 4, y + ch - 12, cw - 8, 9, 5); g.fill();
    }
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "60,50,38" : "210,200,180"},${0.06 + r() * 0.14})`; g.fillRect(r() * S, r() * S, 2, 2); }
});
/** travertine: pale stone with horizontal veining for the
 *  basilica facade, colonnade and ATM pedestal */
const travertineTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const y = r() * 512, h = 1 + r() * 3;
    g.strokeStyle = `rgba(${r() > 0.5 ? "150,128,92" : "240,232,208"},${0.10 + r() * 0.16})`;
    g.lineWidth = h;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 8, 340, y + (r() - 0.5) * 8, 512, y); g.stroke();
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,100,70" : "250,242,220"},${0.05 + r() * 0.10})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** soft radial mist sprite texture */
const mistTex = () => ctex("vatikanMist", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(235,242,230,0.85)"); gr.addColorStop(0.6, "rgba(235,242,230,0.35)"); gr.addColorStop(1, "rgba(235,242,230,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("vatikanBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** soft warm light pool for sunlit piazza variation */
const patchTex = () => ctex("vatikanPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

/** ATM screen face: dark blue glass, amber Latin lines, a soft
 *  scanline sheen — the one glowing modern object in the square. */
const screenTex = (key: string, lines: string[], hi = -1) => ctex(key, 512, 640, (g) => {
  g.fillStyle = "#123a6e"; g.fillRect(0, 0, 512, 640);
  const grad = g.createLinearGradient(0, 0, 0, 640);
  grad.addColorStop(0, "rgba(64,140,255,0.28)"); grad.addColorStop(0.5, "rgba(64,140,255,0.05)"); grad.addColorStop(1, "rgba(64,140,255,0.18)");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 640);
  for (let y = 0; y < 640; y += 6) { g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(0, y, 512, 2); }
  g.fillStyle = "#ffd94d"; g.textAlign = "center"; g.textBaseline = "middle";
  const fs = (t: string, max: number) => {
    let s = max;
    g.font = `700 ${s}px Arial, sans-serif`;
    while (g.measureText(t).width > 440 && s > 18) { s -= 2; g.font = `700 ${s}px Arial, sans-serif`; }
    return s;
  };
  const n = lines.length;
  lines.forEach((t, i) => {
    const y = 640 * ((i + 1) / (n + 1));
    const s = fs(t, i === 0 ? 62 : 48);
    g.font = `700 ${s}px Arial, sans-serif`;
    if (i === hi) { g.fillStyle = "#fff3c0"; g.fillRect(26, y - 34, 460, 68); g.fillStyle = "#0a1a3a"; }
    else g.fillStyle = "#ffd94d";
    g.fillText(t, 256, y);
  });
  g.strokeStyle = "rgba(255,217,77,0.5)"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 620);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A dark green cypress: stacked tapering cones on a thin trunk. */
const makeCypress = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#5a4230" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, h * 0.18, 7), trunkM);
  trunk.position.y = h * 0.09; trunk.castShadow = true; g.add(trunk);
  const greens = ["#1e4423", "#2a5a2e", "#356b38"];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * (0.16 - i * 0.03), h * 0.42, 9), lam2({ color: greens[i] }));
    cone.position.y = h * (0.28 + i * 0.24); cone.castShadow = true; g.add(cone);
  }
  void tr;
  return g;
};

/** The Vatican obelisk: stepped base, tapered shaft, pyramidion. */
const makeObelisk = () => {
  const g = new THREE.Group();
  const stone = lam2({ map: rep(travertineTex("vatikanTravObelisk"), 1, 2), color: "#e6d9b8" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 3.4), stone);
  base.position.y = 0.4; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 2.6), stone);
  base2.position.y = 1.15; base2.castShadow = true; g.add(base2);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, 8, 4), lam2({ color: "#cbb98f" }));
  shaft.position.y = 5.5; shaft.rotation.y = Math.PI / 4; shaft.castShadow = true; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 4), lam2({ color: "#8a7a5a" }));
  tip.position.y = 10.3; tip.rotation.y = Math.PI / 4; tip.castShadow = true; g.add(tip);
  return g;
};

/** One Bernini colonnade column: base, fluted-ish shaft, capital. */
const makeColumn = (h: number) => {
  const g = new THREE.Group();
  const stone = lam2({ map: rep(travertineTex("vatikanTravCol"), 1, 1), color: "#eadfc2" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), stone);
  base.position.y = 0.25; base.castShadow = true; g.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, h, 12), stone);
  shaft.position.y = 0.5 + h / 2; shaft.castShadow = true; g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.45, 1.35), stone);
  cap.position.y = 0.5 + h + 0.22; cap.castShadow = true; g.add(cap);
  return g;
};

/** St. Peter's facade + dome, far behind the square: a wide
 *  travertine front with columns and pediment, the great dome
 *  rising behind it with drum, lantern and cross. */
const makeBasilica = () => {
  const g = new THREE.Group();
  const stone = lam2({ map: rep(travertineTex("vatikanTravBasilica"), 3, 1), color: "#e9dcc0" });
  const facade = new THREE.Mesh(new THREE.BoxGeometry(34, 13, 3), stone);
  facade.position.set(0, 6.5, 0); facade.castShadow = true; facade.receiveShadow = true; g.add(facade);
  // entablature band across the facade top, breaking the flat slab
  const band = new THREE.Mesh(new THREE.BoxGeometry(34, 1.0, 0.6), stone);
  band.position.set(0, 12.6, 1.4); band.castShadow = true; g.add(band);
  // three dark doors on the facade face
  for (const dx of [-9, 0, 9]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 5, 0.2), lam2({ color: "#6b5a44" }));
    door.position.set(dx, 2.5, 1.6); g.add(door);
  }
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 2.2, 3, 1), stone);
  ped.rotation.z = Math.PI; ped.rotation.y = Math.PI / 2; ped.scale.set(1, 1, 0.5);
  ped.position.set(0, 14.6, 0); ped.castShadow = true; g.add(ped);
  for (let i = -3; i <= 3; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 11, 10), lam2({ color: "#f2e8d0" }));
    col.position.set(i * 4.4, 5.5, 2.3); col.castShadow = true; g.add(col);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 6, 18), lam2({ color: "#d8c9a4" }));
  drum.position.set(0, 16, -4); drum.castShadow = true; g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam2({ color: "#7d8b9c" }));
  dome.position.set(0, 19, -4); dome.castShadow = true; g.add(dome);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 3.2, 10), lam2({ color: "#e9dcc0" }));
  lantern.position.set(0, 28.6, -4); lantern.castShadow = true; g.add(lantern);
  const cross = new THREE.Group();
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.2, 0.28), lam2({ color: "#6a5a3a" }));
  v.position.y = 1.1; cross.add(v);
  const hbar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.28), lam2({ color: "#6a5a3a" }));
  hbar.position.y = 1.5; cross.add(hbar);
  cross.position.set(0, 30.2, -4); g.add(cross);
  return g;
};

/** A piazza fountain: round travertine basin + still water disc. */
const makeFountain = () => {
  const g = new THREE.Group();
  const stone = lam2({ map: rep(travertineTex("vatikanTravFountain"), 2, 1), color: "#e6d9b8" });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.32, 8, 24), stone);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.75; rim.castShadow = true; g.add(rim);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.75, 24, 1, true), stone);
  wall.position.y = 0.38; g.add(wall);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.55, 24),
    new THREE.MeshLambertMaterial({ color: "#3f8fb8", transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.62; g.add(water);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 10), stone);
  stem.position.y = 1.2; stem.castShadow = true; g.add(stem);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 0.4, 12), stone);
  cup.position.y = 2.1; cup.castShadow = true; g.add(cup);
  return g;
};

export type Pigeon = { g: THREE.Group; head: THREE.Group; ph: number; x: number; z: number };
/** A piazza pigeon: grey body, darker head, orange beak — pecks. */
const makePigeon = (seed: number): Pigeon => {
  const g = new THREE.Group();
  const tr = rng(seed * 977 + 5);
  const bodyM = lam2({ color: "#8a8d94" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyM);
  body.scale.set(0.9, 0.85, 1.35); body.position.y = 0.17; body.castShadow = true; g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.32, 0.2);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 7), lam2({ color: "#5a5e66" }));
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), lam2({ color: "#d88a2e" }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.01, 0.12); head.add(beak);
  g.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.22), lam2({ color: "#6a6d74" }));
  tail.position.set(0, 0.14, -0.24); tail.rotation.x = 0.25; g.add(tail);
  void tr;
  return { g, head, ph: seed * 1.7, x: 0, z: 0 };
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
  private atm: THREE.Group;
  private screenMat: THREE.MeshBasicMaterial;
  private screenMenuA: THREE.Texture; private screenMenuB: THREE.Texture;
  private screenCard: THREE.Texture; private screenCash: THREE.Texture;
  private screenGlow: THREE.Sprite;
  private notes: THREE.Mesh[] = [];
  private pigeons: Pigeon[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private cypress: { g: THREE.Group; ph: number }[] = [];
  private mist: THREE.Sprite[] = [];
  private mistBase: { x: number; sp: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
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
    // the sun's halo + core, upper left down the piazza
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
    this.buildPiazza(R, r);
    // ---- the ATM kiosk: the star of the film ----
    this.screenMenuA = screenTex("vatikanScreenMenuA", ["LINGUA", "LATINA", "ITALIANO", "ENGLISH"], 0);
    this.screenMenuB = screenTex("vatikanScreenMenuB", ["LINGUA", "LATINA", "ITALIANO", "ENGLISH"], 1);
    this.screenCard = screenTex("vatikanScreenCard", ["INSERITO", "SCIDULAM", "QUAESO"], -1);
    this.screenCash = screenTex("vatikanScreenCash", ["DEDUCTIO", "EX PECUNIA", "€ 50"], -1);
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screenMenuA });
    const atmRes = this.buildATM(R);
    this.atm = atmRes.g;
    this.screenGlow = atmRes.glow;
    // euro notes: hidden until the cash shot
    for (let i = 0; i < 3; i++) {
      const note = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.22),
        lam2({ color: i === 1 ? "#7fb8d8" : "#8ab86a" }));
      note.castShadow = true; note.visible = false;
      R.add(note); this.notes.push(note);
    }
    // ---- pigeons pecking the piazza ----
    const pigeonSpots: [number, number, number, number][] = [
      [5.5, 0, 8, 0.7], [-6, 0, 6, 2.1], [7.5, 0, -4, 1.2], [-4.5, 0, -6, 2.8],
      [3.5, 0, 12, 0.2], [-8.5, 0, 2, 1.8], [6, 0, -10, 2.5],
    ];
    for (const [x, y, z, yaw] of pigeonSpots) {
      const p = makePigeon(Math.floor(Math.abs(x) * 7 + Math.abs(z) * 3 + 1));
      p.g.position.set(x, y, z); p.g.rotation.y = yaw;
      p.x = x; p.z = z;
      R.add(p.g); this.pigeons.push(p);
    }
  }

  // ---------------- the piazza: cobblestones, colonnade, basilica ----------------
  private buildPiazza(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(cobbleTex(), 90, 90) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // a lighter travertine ellipse marking the square's heart
    const heart = new THREE.Mesh(new THREE.CircleGeometry(16, 40),
      lam2({ map: rep(travertineTex("vatikanTravHeart"), 4, 4), color: "#e2d4ae" }));
    heart.rotation.x = -Math.PI / 2; heart.position.set(0, -0.06, -14); heart.receiveShadow = true; R.add(heart);
    // ---- the obelisk, heart of the square ----
    const ob = makeObelisk();
    ob.position.set(OBELISK_C[0], 0, OBELISK_C[2]); R.add(ob);
    blob(R, OBELISK_C[0], 0.06, OBELISK_C[2], 5, 5, 0.3);
    // ---- Bernini's colonnade: two curving arms of columns ----
    const colH = 7.5;
    for (const side of [1, -1]) {
      const pts: [number, number][] = [];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = side * (14 + t * t * 16);
        const z = -14 - t * 30;
        pts.push([x, z]);
        const c = makeColumn(colH);
        c.position.set(x, 0, z); R.add(c);
        blob(R, x, 0.05, z, 2.2, 2.2, 0.25);
      }
      // entablature beam following the arc
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0) + 0.8;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 1.6),
          lam2({ map: rep(travertineTex("vatikanTravBeam"), 2, 1), color: "#e9dcc0" }));
        beam.position.set((x0 + x1) / 2, colH + 0.95, (z0 + z1) / 2);
        beam.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
        beam.castShadow = true; R.add(beam);
      }
      // statues on the entablature
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        const x = side * (15 + t * t * 15), z = -16 - t * 28;
        const st = new THREE.Group();
        const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 1.9, 8), lam2({ color: "#f2ead4" }));
        robe.position.y = 0.95; robe.castShadow = true; st.add(robe);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 7), lam2({ color: "#f2ead4" }));
        head.position.y = 2.15; st.add(head);
        st.position.set(x, colH + 1.4, z); R.add(st);
      }
    }
    // ---- St. Peter's basilica closing the horizon ----
    const bas = makeBasilica();
    bas.position.set(0, 0, -62); R.add(bas);
    // ---- fountains flanking the obelisk axis ----
    for (const [x, z] of [[-11, -30], [11, -30]] as [number, number][]) {
      const f = makeFountain();
      f.position.set(x, 0, z); R.add(f);
      blob(R, x, 0.05, z, 6.5, 6.5, 0.25);
    }
    // ---- cypress trees at the piazza edges ----
    const cypPts: [number, number, number][] = [
      [-13, 14, 6.5], [13.5, 10, 7], [-15, -2, 5.8], [15.5, -6, 6.8], [-12, -38, 7.2], [12.5, -40, 6.2],
    ];
    for (const [x, z, h] of cypPts) {
      const t = makeCypress(h, Math.floor(Math.abs(x) * 7 + Math.abs(z) * 3 + 1));
      t.position.set(x, 0, z); R.add(t);
      this.cypress.push({ g: t, ph: x * 0.7 + z * 0.4 });
      blob(R, x, 0.05, z, 2.4, 2.4, 0.3);
    }
    // ---- mist: soft sprites drifting low over the piazza ----
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex(), transparent: true, depthWrite: false, opacity: 0.12 }));
      const x = -8 + r() * 16, z = -6 - r() * 12;
      sp.position.set(x, 1.2 + r() * 1.4, z);
      sp.scale.set(9 + r() * 7, 3.2 + r() * 1.6, 1);
      sp.layers.set(NOINK); R.add(sp);
      this.mist.push(sp); this.mistBase.push({ x, sp: 0.5 + r() * 0.7 });
    }
    // ---- sun pools + shade pools over the piazza ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (3 + r() * 6), 0.128, 10 - r() * 30, 4.5 + r() * 5, 6 + r() * 7, 0.10 + r() * 0.05, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#2c5420", s * (3 + r() * 6), 0.129, 8 - r() * 28, 5 + r() * 5, 6 + r() * 6, 0.18 + r() * 0.05, r() * 3);
    }
    void r;
  }

  /** The ATM kiosk: travertine pedestal + dark steel body, glowing
   *  Latin screen, keypad, card slot, cash dispenser. Faces +Z. */
  private buildATM(R: THREE.Group): { g: THREE.Group; glow: THREE.Sprite } {
    const g = new THREE.Group();
    const [ax, , az] = ATM_C;
    const steel = lam2({ color: "#3a4048" });
    const steelLight = lam2({ color: "#565e68" });
    const stone = lam2({ map: rep(travertineTex("vatikanTravATM"), 1, 1), color: "#e6d9b8" });
    // pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 1.5), stone);
    ped.position.y = 0.25; ped.castShadow = true; ped.receiveShadow = true; g.add(ped);
    // body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.5, 1.0), steel);
    body.position.y = 1.75; body.castShadow = true; g.add(body);
    // the glowing screen (front face, +Z)
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.35), this.screenMat);
    screen.position.set(0, 2.15, 0.52); g.add(screen);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.06), steelLight);
    frame.position.set(0, 2.15, 0.49); g.add(frame);
    // screen light spilling onto the piazza
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.5, color: "#9cc8ff" }));
    glow.position.set(0, 2.15, 1.1); glow.scale.set(3.2, 3.6, 1); glow.layers.set(NOINK); g.add(glow);
    // keypad: dark slab + 12 tiny buttons
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.06), lam2({ color: "#22262c" }));
    pad.position.set(0, 1.28, 0.52); g.add(pad);
    const btnM = lam2({ color: "#c8ccd2" });
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.03), btnM);
      b.position.set((col - 1) * 0.17, 1.42 - row * 0.11, 0.56); g.add(b);
    }
    // card slot (left) + receipt slot (right)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.04), lam2({ color: "#101216" }));
    slot.position.set(-0.5, 1.32, 0.52); g.add(slot);
    const receipt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), lam2({ color: "#101216" }));
    receipt.position.set(0.5, 1.32, 0.52); g.add(receipt);
    // cash dispenser flap, low on the front
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.05), lam2({ color: "#1c1f24" }));
    flap.position.set(0, 0.78, 0.52); g.add(flap);
    // IOR plaque above the screen
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.04), lam2({ color: "#c8a83c" }));
    plaque.position.set(0, 2.98, 0.52); g.add(plaque);
    // side glow strips
    for (const s of [1, -1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.06), new THREE.MeshBasicMaterial({ color: "#ffd94d" }));
      strip.position.set(s * 0.87, 1.75, 0.51); g.add(strip);
    }
    // the whole kiosk is scaled up so the anomaly reads GIANT
    // against the hero (frame-0 hook rule) — children scale with it
    g.scale.setScalar(1.35);
    g.position.set(ax, 0, az);
    R.add(g);
    blob(R, ax, 0.06, az + 0.4, 4.0, 3.4, 0.35);
    return { g, glow };
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
    // ---- the ATM screen: cycles its Latin menu on the cover,
    //  shows the insert-card screen in shot 3, the withdrawal
    //  screen in shot 4 — the anomaly is ALREADY moving at frame 0
    const menuFlip = Math.floor(tt * 1.4) % 2 === 0;
    if (id === 3) this.screenMat.map = this.screenCard;
    else if (id === 4) this.screenMat.map = this.screenCash;
    else this.screenMat.map = menuFlip ? this.screenMenuA : this.screenMenuB;
    this.screenMat.needsUpdate = true;
    (this.screenGlow.material as THREE.SpriteMaterial).opacity = 0.42 + Math.sin(tt * 3.2) * 0.10;
    // ---- euro notes slide out of the dispenser in shot 4 only ----
    const sLen = (s.b - s.a) / FPS;
    const U = Math.max(0, Math.min(1, (tt - (s.a / FPS)) / Math.max(0.01, sLen)));
    this.notes.forEach((n, i) => {
      n.visible = id === 4;
      if (id === 4) {
        const k = Math.max(0, Math.min(1, (U - i * 0.18) / 0.55));
        n.position.set(ATM_C[0] + (i - 1) * 0.16, 1.08, ATM_C[2] + 0.75 + k * 0.6);
        n.rotation.set(-0.25 - k * 0.35, (i - 1) * 0.2, (i - 1) * 0.12);
      }
    });
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // mist drifts low over the piazza
    this.mist.forEach((m, i) => {
      const b = this.mistBase[i];
      if (b) m.position.x = b.x + Math.sin(tt * 0.22 + i * 1.9) * 2.2;
      (m.material as THREE.SpriteMaterial).opacity = 0.12;
    });
    // cypress trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.cypress) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // pigeons peck, hop and shuffle across the piazza
    for (const p of this.pigeons) {
      const peck = Math.max(0, Math.sin(tt * 2.6 + p.ph));
      p.head.rotation.x = peck * 0.85;
      p.g.position.y = Math.abs(Math.sin(tt * 1.1 + p.ph * 2.0)) < 0.06 ? 0.06 : 0;
      p.g.position.x = p.x + Math.sin(tt * 0.24 + p.ph) * 0.35;
      p.g.position.z = p.z + Math.cos(tt * 0.19 + p.ph * 1.3) * 0.3;
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
