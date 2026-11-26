// Taumata as one three.js scene for the Fafnir-ID format:
// rolling green Hawke's Bay pasture under a big sky, ONE
// smooth grassy hill (305 m, scaled), a quiet country road —
// and THE SIGN: a roadside board so long it cannot fit in a
// portrait frame, carrying all 85 letters of the longest
// place name on Earth. The sign sways and creaks in the wind
// from frame 0 (the anomaly is alive with motion). Sheep
// graze, grass waves, clouds drift. Layered light rig: sun
// key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, grassHD, stoneHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, clamp01, HILL_C, HILL_R, HILL_H, SIGN_C, SIGN_W, SMALL_SIGN, SUMMIT_FRONT, hillYAt } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

export const FULL_NAME = "Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu";

// ---------------- painted textures ----------------
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
const skyTexDay = () => ctex("sbSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1c5cc4"); grad.addColorStop(0.34, "#3f83dd"); grad.addColorStop(0.62, "#7db1ee");
  grad.addColorStop(0.85, "#cfe6da"); grad.addColorStop(1, "#f2f0cd");
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
const glowTex = () => ctex("sbGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const birdTex = () => ctex("sbBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
const foliageTex = (key: string, base = "#4d7038") => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(24,44,16,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(226,246,180,${0.12 + r() * 0.22})` : `rgba(16,34,10,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
const woodTex = () => ctex("sbWood", 256, 256, (g, r) => {
  g.fillStyle = "#8a6a44"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(52,36,18,${0.16 + r() * 0.22})` : `rgba(226,196,148,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** THE SIGN's painted face: dark brown board, cream border,
 *  the 85-letter name in three lines, exactly as sliced. */
const signTex = () => ctex("sbSign", 2048, 256, (g, r) => {
  g.fillStyle = "#5d4023"; g.fillRect(0, 0, 2048, 256);
  for (let i = 0; i < 380; i++) {
    const y = r() * 256;
    g.strokeStyle = `rgba(28,16,6,${0.10 + r() * 0.18})`; g.lineWidth = 1.4 + r() * 2.2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y + (r() - 0.5) * 6); g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "240,220,170" : "20,12,4"},${0.03 + r() * 0.05})`; g.fillRect(r() * 2048, r() * 256, 2.4, 2.4); }
  g.strokeStyle = "#f4e3ae"; g.lineWidth = 7; g.strokeRect(16, 16, 2016, 224);
  g.lineWidth = 2; g.strokeRect(30, 30, 1988, 196);
  g.fillStyle = "#f7ead0"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 84px Arial, sans-serif";
  g.fillText(FULL_NAME.slice(0, 28), 1024, 66);
  g.fillText(FULL_NAME.slice(28, 57), 1024, 148);
  g.font = "900 62px Arial, sans-serif"; g.fillStyle = "#e8cf8e";
  g.fillText(FULL_NAME.slice(57) + "  ·  305 m", 1024, 216);
});
/** the little sign the locals actually use */
const smallSignTex = () => ctex("sbSmallSign", 512, 256, (g, r) => {
  g.fillStyle = "#5d4023"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 120; i++) {
    const y = r() * 256;
    g.strokeStyle = `rgba(28,16,6,${0.10 + r() * 0.18})`; g.lineWidth = 1.4 + r() * 2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 5); g.stroke();
  }
  g.strokeStyle = "#f4e3ae"; g.lineWidth = 6; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = "#f7ead0"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 104px Arial, sans-serif";
  g.fillText("TAUMATA", 256, 106);
  g.font = "700 44px Arial, sans-serif"; g.fillStyle = "#e8cf8e";
  g.fillText("· HILL ·", 256, 190);
});
/** the translation scroll on the summit (shot 5) */
const scrollTex = () => ctex("sbScroll", 1024, 512, (g, r) => {
  g.fillStyle = "#e8d5a8"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(150,110,50,${0.05 + r() * 0.09})`;
    g.beginPath(); g.ellipse(r() * 1024, r() * 512, 20 + r() * 60, 12 + r() * 30, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,84,30,${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 512, 2, 2); }
  g.strokeStyle = "#8a6a34"; g.lineWidth = 5; g.strokeRect(18, 18, 988, 476);
  g.fillStyle = "#4a2e12"; g.textAlign = "center";
  g.font = "900 64px Arial, sans-serif";
  g.fillText("ARTINYA:", 512, 92);
  g.font = "700 54px Arial, sans-serif";
  g.fillText("“Puncak tempat TAMATEA,", 512, 186);
  g.fillText("si lutut besar, penakluk gunung,", 512, 262);
  g.fillText("meniup seruling hidungnya", 512, 338);
  g.fillText("buat orang tersayang.”", 512, 414);
});
const woolTex = () => ctex("sbWool", 256, 256, (g, r) => {
  g.fillStyle = "#e9e4d8"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,252,244,${0.14 + r() * 0.2})` : `rgba(168,158,140,${0.10 + r() * 0.18})`;
    g.beginPath(); g.arc(r() * 256, r() * 256, 4 + r() * 10, 0, 7); g.fill();
  }
});
const patchTex = () => ctex("sbPatch", 256, 256, (g) => {
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
const blobTex = () => ctex("sbBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(20,26,16,0.62)"); gr.addColorStop(0.6, "rgba(20,26,16,0.34)"); gr.addColorStop(1, "rgba(20,26,16,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** a pasture tree: slim trunk + 3 layered blobs (NZ green) */
const makeTree = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 391 + 7);
  const woodM = lam2({ map: rep(woodTex(), 1, 2), color: "#8a7156" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10 * s, 0.20 * s, 3.4 * s, 7), woodM);
  trunk.position.y = 1.7 * s; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const mats = [
    lam2({ color: "#3f6b2c", map: rep(foliageTex("sbFoliageJ1"), 1, 1) }),
    lam2({ color: "#578c3a", map: rep(foliageTex("sbFoliageJ2"), 1, 1) }),
    lam2({ color: "#74a850", map: rep(foliageTex("sbFoliageJ3"), 1, 1) }),
  ];
  for (const [dx, dy, r] of [[0, 4.3, 1.9], [0.9, 3.8, 1.4], [-0.95, 3.9, 1.3]] as [number, number, number][]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 10, 8), mats[Math.floor(tr() * 3) % 3]);
    b.position.set(dx * s, dy * s, (tr() - 0.5) * 0.5 * s);
    b.scale.set(1.25, 0.78, 1.25);
    b.castShadow = true; g.add(b);
  }
  return g;
};

/** a grazing sheep: woolly body, dark face, head on a pivot
 *  so it can dip to the grass and lift again */
const makeSheep = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 269 + 5);
  const woolM = lam2({ map: rep(woolTex(), 1, 1), color: "#f4efe2" });
  const darkM = lam2({ color: "#4c443c", map: rep(woodTex(), 1, 1) });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52 * s, 10, 8), woolM);
  body.position.y = 0.62 * s; body.scale.set(1.3, 0.95, 0.9);
  body.castShadow = true; g.add(body);
  for (const [lx, lz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.22], [0.3, 0.22]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.045 * s, 0.5 * s, 5), darkM);
    leg.position.set(lx * s, 0.25 * s, lz * s); g.add(leg);
  }
  const headPivot = new THREE.Group();
  headPivot.position.set(0.62 * s, 0.78 * s, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.20 * s, 8, 7), darkM);
  head.position.set(0.16 * s, -0.05 * s, 0); head.scale.set(1.25, 0.9, 0.8);
  headPivot.add(head);
  for (const sgn of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.16 * s, 5), darkM);
    ear.position.set(0.08 * s, 0.02 * s, sgn * 0.17 * s);
    ear.rotation.x = sgn * 1.9;
    headPivot.add(ear);
  }
  g.add(headPivot);
  void tr;
  return { g, headPivot };
};

/** a small red farm shed */
const makeShed = (s: number) => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(planks(), 2, 1), color: "#a03c2c" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6 * s, 2.2 * s, 2.6 * s), wallM);
  body.position.y = 1.1 * s; body.castShadow = true; g.add(body);
  const roofM = lam2({ map: rep(woodTex(), 3, 1), color: "#5a5148" });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9 * s, 1.3 * s, 4), roofM);
  roof.position.y = 2.85 * s; roof.rotation.y = Math.PI / 4; roof.scale.set(1.2, 1, 0.95);
  roof.castShadow = true; g.add(roof);
  const doorM = new THREE.MeshBasicMaterial({ color: "#2e2018" });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 1.6 * s), doorM);
  door.position.set(-0.6 * s, 0.85 * s, 1.31 * s); g.add(door);
  return g;
};

/** one grass tuft geometry */
const grassTuftGeo = () => {
  const tr = rng(70707);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#2c4d1c"), tip = new THREE.Color("#a8d672"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.32 + tr() * 0.26, w = 0.05;
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
  private fog = new THREE.Fog("#c8d4e8", 18, 190);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number; k: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; y: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private sheep: { g: THREE.Group; head: THREE.Group; ph: number }[] = [];
  // ---- set pieces with per-shot behaviour ----
  private signGroup = new THREE.Group();
  private scrollGroup = new THREE.Group();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(85);
    // ---- light rig ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#5a7048", 0.55);
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
    this.buildLand(R, r);
  }

  // ---------------- pasture, hill, road, THE SIGN ----------------
  private buildLand(R: THREE.Group, r: () => number) {
    // ---- the pasture: one big green ground ----
    const grassM = lam2({ map: rep(grassHD(), 60, 60), color: "#a5cc84" });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), grassM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -60);
    ground.receiveShadow = true; R.add(ground);
    // pasture shading patches (worn grass, dirt) for texture
    softPatch(R, patchTex(), "#7ba24e", -9, 0.02, -14, 16, 11, 0.30, 0.7);
    softPatch(R, patchTex(), "#8a6c42", 5.5, 0.02, 5.2, 7, 3.4, 0.35, 0.2);
    softPatch(R, patchTex(), "#749a48", 14, 0.02, -20, 18, 12, 0.26, 2.1);
    softPatch(R, patchTex(), "#86a854", -18, 0.02, 16, 14, 9, 0.24, 1.2);

    // ---- THE HILL: a smooth grassy dome (lathe on the same
    // height formula cast.ts stands on) ----
    const hillPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const rr = (i / 16) * (HILL_R + 5);
      const y = rr <= HILL_R ? HILL_H * (1 - (rr / HILL_R) ** 2) ** 1.2 : -0.5 * ((rr - HILL_R) / 5);
      hillPts.push(new THREE.Vector2(Math.max(0.01, rr), y));
    }
    hillPts.reverse();
    const hill = new THREE.Mesh(new THREE.LatheGeometry(hillPts, 40),
      lam2({ map: rep(grassHD(), 14, 14), color: "#93c06e" }));
    hill.position.set(HILL_C[0], 0, HILL_C[2]);
    hill.castShadow = true; hill.receiveShadow = true; R.add(hill);
    // a paler worn crown + the dirt track winding up the front
    const trackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(7.5, 0.15, -15),
      new THREE.Vector3(5, hillYAt(5, -24) + 0.07, -24),
      new THREE.Vector3(2.5, hillYAt(2.5, -31) + 0.07, -31),
      new THREE.Vector3(SUMMIT_FRONT[0] + 0.4, SUMMIT_FRONT[1] + 0.05, SUMMIT_FRONT[2] + 0.6),
    ]);
    // a FLAT ribbon draped on the slope (a squashed tube
    // reads as a blue river — never scale a tube's Y)
    const TSEG = 28, THALF = 0.85;
    const tPos: number[] = [], tUv: number[] = [], tIdx: number[] = [];
    for (let i = 0; i <= TSEG; i++) {
      const tt2 = i / TSEG;
      const p = trackCurve.getPoint(tt2), tan = trackCurve.getTangent(tt2);
      const sl = Math.hypot(tan.x, tan.z) || 1;
      const ox = (-tan.z / sl) * THALF, oz = (tan.x / sl) * THALF;
      for (const sgn of [-1, 1]) {
        const vx = p.x + ox * sgn, vz = p.z + oz * sgn;
        tPos.push(vx, hillYAt(vx, vz) + 0.07, vz);
        tUv.push(tt2 * 8, sgn * 0.5 + 0.5);
      }
      if (i < TSEG) { const a2 = i * 2; tIdx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); }
    }
    const trackGeo = new THREE.BufferGeometry();
    trackGeo.setAttribute("position", new THREE.Float32BufferAttribute(tPos, 3));
    trackGeo.setAttribute("uv", new THREE.Float32BufferAttribute(tUv, 2));
    trackGeo.setIndex(tIdx); trackGeo.computeVertexNormals();
    const track = new THREE.Mesh(trackGeo,
      lam2({ map: rep(stoneHD("sbDirt", ["#c2a87c", "#b39b6a", "#cdb488", "#a89061"]), 1, 1), color: "#e0c090", side: THREE.DoubleSide }));
    track.receiveShadow = true; R.add(track);
    // summit standing stone + Tamatea's resting staff
    const stoneM = lam2({ map: rep(stoneHD("sbStone", ["#8a8578", "#767264", "#98927f", "#6a665a"]), 1, 1), color: "#b0aa9a" });
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 1.7, 6), stoneM);
    stone.position.set(2.1, hillYAt(2.1, -38.6) + 0.8, -38.6);
    stone.rotation.z = 0.06; stone.castShadow = true; R.add(stone);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.6, 5),
      lam2({ map: rep(woodTex(), 1, 2), color: "#6a4a2c" }));
    staff.position.set(1.75, hillYAt(1.75, -38.2) + 1.1, -38.2);
    staff.rotation.z = 0.38; R.add(staff);

    // ---- the road along X (foreground) ----
    const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 6),
      lam2({ map: rep(stoneHD("sbAsphalt", ["#5c5c60", "#545458", "#66666a", "#4c4c50"]), 90, 2), color: "#9a9aa0" }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 9.5);
    road.receiveShadow = true; R.add(road);
    const dashM = new THREE.MeshBasicMaterial({ color: "#e8e6da" });
    for (let x = -60; x <= 60; x += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.22), dashM);
      dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.03, 9.5); R.add(dash);
    }
    // gravel shoulder between the sign and the road
    softPatch(R, patchTex(), "#a08c62", 0, 0.025, 5.6, 90, 2.6, 0.4, 0.03);

    // ---- fences: post-and-rail along the road + the far field ----
    const fenceM = lam2({ map: rep(woodTex(), 6, 1), color: "#9a7c58" });
    const makeFence = (z: number, x0: number, x1: number) => {
      const g = new THREE.Group();
      for (let x = x0; x <= x1; x += 3) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.15, 6), fenceM);
        post.position.set(x, 0.57, 0); post.castShadow = true; g.add(post);
      }
      for (const ry of [0.55, 0.95]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.07, 0.05), fenceM);
        rail.position.set((x0 + x1) / 2, ry, 0); g.add(rail);
      }
      g.position.z = z; R.add(g);
    };
    makeFence(5.9, -34, 34);
    makeFence(-7.5, -30, 30);

    // ---- THE GIANT SIGN ----
    {
      const sg = this.signGroup;
      const postM = lam2({ map: rep(woodTex(), 1, 2), color: "#7a5c38" });
      for (let x = -10; x <= 10; x += 2.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 7), postM);
        post.position.set(x, 1.8, 0); post.castShadow = true; sg.add(post);
      }
      const boardBack = new THREE.Mesh(new THREE.BoxGeometry(SIGN_W, 2.6, 0.14),
        lam2({ map: rep(woodTex(), 8, 1), color: "#6e5133" }));
      boardBack.position.y = SIGN_C[1]; boardBack.castShadow = true; sg.add(boardBack);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W - 0.2, 2.5),
        new THREE.MeshBasicMaterial({ map: signTex() }));
      face.position.set(0, SIGN_C[1], 0.09); sg.add(face);
      // a back brace strut, kicked out behind the middle post
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), postM);
      brace.position.set(0, 1.5, -1.1); brace.rotation.x = 0.62; sg.add(brace);
      sg.position.set(SIGN_C[0], 0, SIGN_C[2]);
      R.add(sg);
      blob(R, 0, 0.03, SIGN_C[2] + 0.4, 22, 1.6, 0.30);
    }
    // ---- the small TAUMATA sign at the giant's end ----
    {
      const g = new THREE.Group();
      const postM = lam2({ map: rep(woodTex(), 1, 2), color: "#7a5c38" });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.45, 7), postM);
      post.position.y = 0.72; post.castShadow = true; g.add(post);
      const face = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.1),
        lam2({ map: smallSignTex(), color: "#ffffff" }));
      face.position.set(0, 1.85, 0.08); face.castShadow = true; g.add(face);
      g.position.set(SMALL_SIGN[0], 0, SMALL_SIGN[2]);
      g.rotation.y = -0.15;
      R.add(g);
    }
    // ---- the translation scroll (shot 5), unrolled by the summit ----
    {
      const g = this.scrollGroup;
      const px = -1.1, pz = -36.1, py = hillYAt(px, pz);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.35),
        new THREE.MeshBasicMaterial({ map: scrollTex(), side: THREE.DoubleSide }));
      paper.position.set(px, py + 1.15, pz);
      paper.rotation.y = 0.33; paper.rotation.x = -0.1;
      g.add(paper);
      const rollM = lam2({ map: rep(woodTex(), 1, 1), color: "#7a5c38" });
      for (const sgn of [1, -1]) {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.9, 7), rollM);
        roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.33;
        roll.position.set(px, py + 1.15 + sgn * 0.7, pz);
        g.add(roll);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 5), rollM);
        leg.position.set(px + sgn * 1.2, py + 0.6, pz + 0.2);
        g.add(leg);
      }
      g.visible = false; R.add(g);
    }
    // ---- the farm shed ----
    const shed = makeShed(1.1);
    shed.position.set(-15, 0, -13); shed.rotation.y = 0.5; R.add(shed);
    // ---- sheep: the true locals ----
    const sheepSpots: [number, number, number, number][] = [
      [-6, -4, 1.0, 0.4], [3.5, -9, 0.9, 2.4], [-2.5, -13.5, 1.05, 1.1], [8, -3, 0.85, 5.3],
      [-11, -9.5, 0.95, 3.6], [6.5, -16, 1.0, 0.9], [-7.5, -19, 0.9, 4.4], [12, -12, 0.9, 2.0],
      [-4, hillYAt(-4, -30), -30, 1.8], [5.5, hillYAt(5.5, -28), -28, 5.8],
    ];
    sheepSpots.forEach(([x, yOrZ, zOrS, sOrYaw], i) => {
      // spots are (x, z, scale, yaw) on flat land, except the
      // last two which ride the hill slope: (x, y, z, yaw)
      const onHill = i >= 8;
      const sh = makeSheep(onHill ? 1.0 : zOrS, 31 + i * 7);
      if (onHill) { sh.g.position.set(x, yOrZ, zOrS); sh.g.rotation.y = sOrYaw; }
      else { sh.g.position.set(x, 0, yOrZ); sh.g.rotation.y = sOrYaw; }
      R.add(sh.g);
      this.sheep.push({ g: sh.g, head: sh.headPivot, ph: i * 1.93 });
      blob(R, sh.g.position.x, (onHill ? yOrZ : 0) + 0.03, sh.g.position.z, 1.3, 0.9, 0.3);
    });
    // ---- trees: pasture singles + a shelter belt far west ----
    const treeSpots: [number, number, number][] = [
      [-13, -6, 1.2], [15.5, -8, 1.35], [-19, -18, 1.1], [20, -20, 1.25], [-9, -24, 1.4],
      [11, -26, 1.15], [-24, -2, 1.3], [25, -4, 1.2], [-16, 14, 1.1], [19, 15, 1.25],
      [-28, -26, 1.45], [29, -28, 1.4], [-6, -33, 1.2], [8, -34.5, 1.3],
    ];
    treeSpots.forEach(([x, z, s], i) => {
      const t = makeTree(s, 71 + i * 13);
      t.position.set(x, hillYAt(x, z), z);
      t.rotation.y = r() * 3;
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.71, k: 0.012 });
    });
    const bushMats = [
      lam2({ color: "#4c7034", map: rep(foliageTex("sbFoliageBush"), 2, 1) }),
      lam2({ color: "#5f8540", map: rep(foliageTex("sbFoliageBush"), 2, 1) }),
      lam2({ color: "#3c5c2a", map: rep(foliageTex("sbFoliageBush"), 2, 1) }),
    ];
    for (let i = 0; i < 46; i++) {
      const bx = (r() - 0.5) * 62, bz = -2 - r() * 30;
      if (Math.abs(bx) < 13 && bz > -6) continue; // keep the sign's field clear
      if (Math.abs(bx) < 4 && bz < -12) continue; // keep the battle clearing open
      const rad = 0.45 + r() * 0.6;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 9, 7), bushMats[i % 3]);
      b.position.set(bx, hillYAt(bx, bz) + rad * 0.5, bz);
      b.scale.set(1 + (r() - 0.5) * 0.3, 0.66 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    }
    // distant rolling ridges closing the horizon
    const ridgeM = lam2({ color: "#67945c", map: rep(foliageTex("sbFoliageRidge"), 3, 1) });
    for (const [x, z, w, h] of [[-95, -95, 70, 30], [100, -85, 76, 34], [-110, -30, 60, 24], [105, -20, 62, 26], [0, -150, 120, 40]] as [number, number, number, number][]) {
      const hill2 = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.55, h, 5), ridgeM);
      hill2.position.set(x, h / 2 - 2, z);
      hill2.rotation.y = r() * 3;
      R.add(hill2);
    }
    // ---- grass tufts across the pasture + the hill skirts ----
    const tuftPts: { x: number; y: number; z: number; s: number }[] = [];
    for (let i = 0; i < 1000; i++) {
      const x = (r() - 0.5) * 70, z = 16 - r() * 62;
      if (z > 5.5 && z < 13.5) continue; // not on the road
      if (Math.abs(x) < 12 && z > 0.5 && z < 5.5) continue; // not through the sign
      tuftPts.push({ x, y: hillYAt(x, z), z, s: 0.7 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, p.y + 0.02, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.26 + (r() - 0.5) * 0.03, 0.42, 0.8 + (r() - 0.5) * 0.22);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, y: p.y, z: p.z, s: p.s, yaw });
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
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.05 + tr2.ph) * tr2.k;
      tr2.g.rotation.x = Math.cos(tt * 0.8 + tr2.ph * 1.7) * tr2.k * 0.7;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, p.y + 0.02, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---- THE SIGN: swaying + creaking in the hill-country wind ----
    this.signGroup.rotation.z = Math.sin(tt * 0.9) * 0.0038;
    this.signGroup.rotation.x = Math.sin(tt * 0.63 + 1.2) * 0.0028;
    // ---- sheep: heads dip to graze, lift, dip again ----
    for (const sh of this.sheep) {
      const cyc = (Math.sin(tt * 0.55 + sh.ph) + Math.sin(tt * 0.23 + sh.ph * 1.7)) / 2; // -1..1
      sh.head.rotation.z = -0.15 - Math.max(0, cyc) * 0.85; // head swings down to the grass
      sh.g.rotation.z = Math.sin(tt * 1.3 + sh.ph) * 0.008;
    }
    // ---- the scroll exists only while its line is spoken ----
    this.scrollGroup.visible = id === 5;
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
