// The Danau Toba film as one three.js scene: a giant caldera lake (water
// disc r=340 with painted ripples + glints), Pulau Samosir in the middle —
// a green mesa island displaced from the shared islandH() height field,
// with a Batak village (rumah bolon: stilt houses with upswept saddleback
// roofs) on its south shore, a little lake (Sidihoni) on its west hill, a
// ring of caldera-rim mountains, and the hero's wooden boat mid-lake.
// FLASHBACK (shots 3–5): the island group hides and an eruption group
// shows instead — ash plain over the water, a rubble vent where Samosir
// will rise, a towering billowing plume, lava glow at its base, ash
// falling like grey snow under a storm sky.
// VISUAL CORE: bright cool daylight, rich colour, textured everything
// (anti-banding: speckled skies, painted water, noise-displaced terrain).
// Layered light rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, planks, beam, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, islandH, ISL_C, SIDIHONI, SIDIHONI_Y, BOAT, SPLASH6_T } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const waterTex = () => ctex("tobaWater", 1024, 1024, (g, r) => {
  g.fillStyle = "#17709e"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,200,225" : "8,52,92"},${0.04 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
  // ripple streaks
  for (let i = 0; i < 340; i++) {
    const y = r() * 1024, x = r() * 1024, w = 18 + r() * 60;
    g.fillStyle = `rgba(168,224,240,${0.05 + r() * 0.1})`;
    g.fillRect(x, y, w, 1.6 + r() * 1.6);
  }
  // sun glints
  for (let i = 0; i < 210; i++) { g.fillStyle = `rgba(240,252,255,${0.14 + r() * 0.3})`; g.fillRect(r() * 1024, r() * 1024, 4 + r() * 13, 1.7); }
  // deep patches
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(6,44,80,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 30 + r() * 90, 14 + r() * 40, r() * 3, 0, 7); g.fill(); }
});
const terrainTex = () => ctex("tobaTerrain", 1024, 1024, (g, r) => {
  g.fillStyle = "#5da24a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "168,214,120" : "34,92,40"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2.6, 2.6); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(${r() > 0.6 ? "196,178,110" : "70,130,58"},${0.06 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 8 + r() * 42, 5 + r() * 24, r() * 3, 0, 7); g.fill(); }
  // field patches
  for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "214,196,120" : "140,180,84"},${0.1 + r() * 0.12})`; g.fillRect(r() * 1024, r() * 1024, 14 + r() * 46, 10 + r() * 30); }
});
const rockTex = (key: string, base: string, fleck: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "214,208,196" : "18,16,20"},${0.04 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2.6, 2.6); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${fleck},${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 30, 4 + r() * 14, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(52,110,52,${0.08 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 8 + r() * 36, 5 + r() * 18, r() * 3, 0, 7); g.fill(); }
});
const ashTex = () => ctex("tobaAsh", 1024, 1024, (g, r) => {
  g.fillStyle = "#6d6a63"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "198,192,178" : "30,28,26"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
  for (let i = 0; i < 170; i++) { g.fillStyle = `rgba(40,38,36,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 22, 3 + r() * 11, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(214,206,190,${0.06 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
});
const roofTex = () => ctex("tobaRoof", 512, 512, (g, r) => {
  // ijuk (black palm fibre) shingles: dark streaky rows
  g.fillStyle = "#4a3a30"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) {
    g.fillStyle = `rgba(20,14,10,${0.25 + r() * 0.2})`; g.fillRect(0, y, 512, 3);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "140,116,88" : "16,12,8"},${0.1 + r() * 0.16})`; g.fillRect(r() * 512, y + r() * 14, 2, 8 + r() * 8); }
  }
});
const gableTex = () => ctex("tobaGable", 512, 512, (g, r) => {
  // gorga-inspired geometric carving: black field, red/white zigzag bands
  g.fillStyle = "#2e2018"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(214,190,160,${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  const band = (y: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (let x = 0; x <= 512; x += 32) { g.lineTo(x, y + ((x / 32) % 2 ? -13 : 13)); }
    for (let x = 512; x >= 0; x -= 32) { g.lineTo(x, y + 22 + ((x / 32) % 2 ? -13 : 13)); }
    g.closePath(); g.fill();
  };
  band(120, "#b8352c"); band(210, "#e8e2d2"); band(300, "#b8352c");
  g.fillStyle = "#e8e2d2"; g.beginPath(); g.arc(256, 400, 34, 0, 7); g.fill();
  g.fillStyle = "#b8352c"; g.beginPath(); g.arc(256, 400, 21, 0, 7); g.fill();
});
const glowTex = () => ctex("tobaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.4, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("tobaBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** day sky dome — speckled blue gradient + sun glow (anti-banding) */
const skyTexDay = () => ctex("tobaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#9dc2ec"); grad.addColorStop(1, "#c4daf2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
/** storm sky dome — layered grey, ash haze near the horizon */
const skyTexStorm = () => ctex("tobaSkyStorm", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#3d4754"); grad.addColorStop(0.5, "#5d6874"); grad.addColorStop(0.8, "#8b8d84"); grad.addColorStop(1, "#a39a86");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "220,216,204" : "12,12,14"},${0.02 + r() * 0.045})`; g.fillRect(r() * 2048, r() * 1024, 2.4, 2.4); }
  // tall soft cloud masses (flat wide ellipses read as banding stripes)
  for (let i = 0; i < 110; i++) { g.fillStyle = `rgba(30,30,34,${0.02 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * 2048, r() * 700, 60 + r() * 180, 26 + r() * 55, 0, 0, 7); g.fill(); }
});
/** a smoke puff with BODY: clustered overlapping blobs, dense core —
 *  a plain radial gradient washes out to nothing against a grey sky */
const smokeTex = () => ctex("tobaSmoke", 256, 256, (g, r) => {
  const blob = (x: number, y: number, rad: number, a: number) => {
    const gr = g.createRadialGradient(x, y, 2, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.7, `rgba(255,255,255,${a * 0.55})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  };
  blob(128, 128, 105, 0.85);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = 30 + r() * 55;
    blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d * 0.8, 38 + r() * 42, 0.6);
  }
  blob(128, 120, 52, 0.9);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** a wooden boat: extruded hull silhouette + benches + rim rail */
const makeBoat = (r: () => number) => {
  const grp = new THREE.Group();
  const hullMat = lam2({ color: "#9c6a3d", map: rep(planks(), 2, 1) });
  const s = new THREE.Shape();
  s.moveTo(-3.1, 0); s.quadraticCurveTo(-3.5, 0.75, -2.2, 0.95);
  s.lineTo(2.2, 0.95); s.quadraticCurveTo(3.5, 0.75, 3.1, 0);
  s.quadraticCurveTo(0, -0.55, -3.1, 0);
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: false });
  hullGeo.translate(0, 0, -0.85);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.y = Math.PI / 2; hull.castShadow = true; hull.receiveShadow = true; grp.add(hull);
  // open deck: two side rails + end caps (a solid slab here hid the hero
  // and made the boat read as a barge — stills-val lesson)
  const railMat = lam2({ color: "#6e4525", map: beam() });
  for (const rx of [-0.88, 0.88]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 6.3), railMat);
    rail.position.set(rx, 0.97, 0); rail.castShadow = true; grp.add(rail);
  }
  for (const rz of [-3.05, 3.05]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.1, 0.3), railMat);
    cap.position.set(0, 0.97, rz); grp.add(cap);
  }
  const inner = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 5.6), lam2({ color: "#54341c" }));
  inner.position.y = 0.42; grp.add(inner);
  for (const bz of [-1.7, 0.1, 1.8]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 0.5), lam2({ color: "#a06a3a", map: rep(planks(), 1, 1) }));
    bench.position.set(0, 0.78, bz); bench.castShadow = true; grp.add(bench);
  }
  void r;
  return grp;
};
/** rumah bolon: stilt house with the great upswept saddleback roof */
const makeBolon = (r: () => number, big = 1) => {
  const grp = new THREE.Group();
  const postMat = lam2({ color: "#5d4026", map: beam() });
  const wallMat = lam2({ color: "#7a4a2a", map: rep(planks(), 2, 1) });
  for (const [ox, oz] of [[-1.9, -1.3], [1.9, -1.3], [-1.9, 1.3], [1.9, 1.3], [0, -1.3], [0, 1.3]] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.5, 7), postMat);
    post.position.set(ox, 0.75, oz); post.castShadow = true; grp.add(post);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 3.4), lam2({ color: "#6e4a2c", map: rep(planks(), 2, 1) }));
  floor.position.y = 1.55; floor.castShadow = true; grp.add(floor);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.7, 3.1), wallMat);
  walls.position.y = 2.5; walls.castShadow = true; walls.receiveShadow = true; grp.add(walls);
  // the roof: side profile with upswept tips, extruded across the width
  const prof = new THREE.Shape();
  prof.moveTo(-4.3, 3.3);
  prof.quadraticCurveTo(-2.6, 3.75, -1.2, 4.9);
  prof.quadraticCurveTo(-0.4, 5.6, 0, 5.65);
  prof.quadraticCurveTo(0.4, 5.6, 1.2, 4.9);
  prof.quadraticCurveTo(2.6, 3.75, 4.3, 3.3);
  prof.lineTo(4.05, 2.95);
  prof.quadraticCurveTo(2.4, 3.35, 1.1, 4.45);
  prof.quadraticCurveTo(0.35, 5.05, 0, 5.08);
  prof.quadraticCurveTo(-0.35, 5.05, -1.1, 4.45);
  prof.quadraticCurveTo(-2.4, 3.35, -4.05, 2.95);
  prof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(prof, { depth: 4.0, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.0);
  const roofM = new THREE.Mesh(roofGeo, lam2({ map: rep(roofTex(), 2, 1) }));
  roofM.castShadow = true; roofM.receiveShadow = true; grp.add(roofM);
  // gable ends (front + back) with the carved pattern
  for (const gz of [2.01, -2.01]) {
    const tri = new THREE.Shape();
    tri.moveTo(-2.15, 3.3); tri.lineTo(2.15, 3.3); tri.lineTo(0, 5.6); tri.closePath();
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.07, bevelEnabled: false }),
      lam2({ map: gableTex() }));
    gm.position.z = gz - 0.035; grp.add(gm);
  }
  // ladder up to the door
  const lad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.08), lam2({ color: "#8a5f36", map: rep(planks(), 1, 1) }));
  lad.position.set(0, 0.85, 2.15); lad.rotation.x = 0.35; grp.add(lad);
  grp.scale.setScalar(big);
  void r;
  return grp;
};
const makeTree = (r: () => number, palm = false) => {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, palm ? 2.6 : 1.6, 7),
    lam2({ color: "#6e5233", map: beam() }));
  trunk.position.y = (palm ? 2.6 : 1.6) / 2; trunk.castShadow = true; grp.add(trunk);
  if (palm) {
    for (let i = 0; i < 6; i++) {
      const fr = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.2, 5),
        lam2({ color: "#3f8f3f", flatShading: true }));
      const a = (i / 6) * Math.PI * 2;
      fr.position.set(Math.cos(a) * 0.8, 2.9, Math.sin(a) * 0.8);
      fr.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      grp.add(fr);
    }
  } else {
    const blobG = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 + r() * 0.5, 1),
      lam2({ color: "#4c9440", map: rep(terrainTex(), 1, 1), flatShading: true }));
    blobG.position.y = 2.3 + r() * 0.4; blobG.scale.y = 0.85; blobG.castShadow = true; grp.add(blobG);
  }
  return grp;
};

type Plume = { sp: THREE.Sprite; x: number; y: number; z: number; ph: number; sc: number; op: number; kind: number }; // kind: 0 smoke, 1 lava glow, 2 fiery core
type Ash = { sp: THREE.Sprite; x: number; y: number; z: number; ph: number; fall: number; sway: number; op: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 25, 300);
  private islandGroup = new THREE.Group();
  private eruptionGroup = new THREE.Group();
  private skyDay: THREE.Mesh; private skyStorm: THREE.Mesh;
  private waterMat: THREE.MeshLambertMaterial;
  private clouds: THREE.Sprite[] = [];
  private plumes: Plume[] = [];
  private ashes: Ash[] = [];
  private lavaLight: THREE.PointLight;
  private boatGroup = new THREE.Group();
  private plumb: THREE.Group; private plumbLine: THREE.Mesh; private plumbWeight: THREE.Mesh;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(777);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky domes (day + storm), toggled per shot ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyStorm = new THREE.Mesh(new THREE.SphereGeometry(678, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexStorm(), side: THREE.BackSide, fog: false }));
    this.skyStorm.layers.set(NOINK); this.skyStorm.visible = false; R.add(this.skyStorm);
    // ---- clouds (day only) ----
    for (let i = 0; i < 11; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(100 + i * 7, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 190 + r() * 260;
      sp.position.set(Math.cos(a) * d, 95 + r() * 60, Math.sin(a) * d);
      sp.scale.set(90 + r() * 70, 30 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    // ---- THE LAKE ----
    this.waterMat = lam2({ map: rep(waterTex(), 11, 11) });
    const water = new THREE.Mesh(new THREE.CircleGeometry(340, 56), this.waterMat);
    water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; R.add(water);
    // deep disc under everything (lake bed shows at the island's sunk rim)
    const bed = new THREE.Mesh(new THREE.CircleGeometry(340, 40), lam2({ color: "#0d4a6e" }));
    bed.rotation.x = -Math.PI / 2; bed.position.y = -3.5; R.add(bed);

    // ================= THE ISLAND GROUP (present day) =================
    const IG = this.islandGroup; R.add(IG);
    {
      // Samosir: plane displaced by islandH, vertex-coloured shore band
      const W = 210, D = 150, SX = 110, SZ = 78;
      const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const cols: number[] = [];
      const cSand = new THREE.Color("#c9b184"), cGrass = new THREE.Color("#ffffff"), cHigh = new THREE.Color("#9db98a");
      const tmpC = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + ISL_C[0], z = pos.getZ(i) + ISL_C[2];
        const h = islandH(x, z);
        pos.setXYZ(i, pos.getX(i), h, pos.getZ(i));
        if (h < 1.1) tmpC.copy(cSand); else if (h > 13) tmpC.copy(cHigh); else tmpC.copy(cGrass);
        cols.push(tmpC.r, tmpC.g, tmpC.b);
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      const isl = new THREE.Mesh(geo, lam2({ map: rep(terrainTex(), 7, 5), vertexColors: true }));
      isl.position.set(ISL_C[0], 0, ISL_C[2]);
      isl.receiveShadow = true; isl.castShadow = false; IG.add(isl);
      // Sidihoni: the little lake on the island (disc + sandy rim)
      const rim2 = new THREE.Mesh(new THREE.CircleGeometry(11.5, 26), lam2({ color: "#c9b184", map: rep(ashTex(), 2, 2) }));
      rim2.rotation.x = -Math.PI / 2; rim2.position.set(SIDIHONI[0], SIDIHONI_Y - 0.32, SIDIHONI[2]); IG.add(rim2);
      const sid = new THREE.Mesh(new THREE.CircleGeometry(10.4, 26), lam2({ map: rep(waterTex(), 2, 2), color: "#bfe2ee" }));
      sid.rotation.x = -Math.PI / 2; sid.position.set(SIDIHONI[0], SIDIHONI_Y, SIDIHONI[2]); sid.receiveShadow = true; IG.add(sid);
      // trees all over the island (skip the village terrace + Sidihoni)
      for (let i = 0; i < 52; i++) {
        const x = (r() - 0.5) * 170, z = -30 + (r() - 0.5) * 104;
        const h = islandH(x, z);
        if (h < 1.4) continue;
        if (Math.hypot(x - 14, z - 8) < 15) continue;
        if (Math.hypot(x - SIDIHONI[0], z - SIDIHONI[2]) < 14) continue;
        const tr = makeTree(r, h < 3.4 && r() > 0.5);
        tr.position.set(x, h - 0.1, z);
        tr.rotation.y = r() * 3; const sc = 0.8 + r() * 0.9; tr.scale.setScalar(sc);
        IG.add(tr);
      }
      // rice terraces on the east slope: stepped green boxes
      const terrMat = lam2({ color: "#79b657", map: rep(terrainTex(), 2, 1) });
      for (let i = 0; i < 4; i++) {
        const tx = 48 + i * 2.5, tz = -2 + i * 5;
        const th = islandH(tx, tz);
        const terr = new THREE.Mesh(new THREE.BoxGeometry(11 - i * 1.2, 0.5, 4.2), terrMat);
        terr.position.set(tx, th + 0.1, tz); terr.rotation.y = 0.5; terr.receiveShadow = true; IG.add(terr);
      }
      // ---- THE VILLAGE: rumah bolon cluster on the terrace ----
      const houses: [number, number, number, number][] = [
        [10, 2, 0.55, 1.0], [21, 11, -0.4, 0.82], [3, 15, 0.9, 0.78], [24, -3, 0.2, 0.7], [-4, -3, 1.2, 0.66],
      ];
      for (const [hx, hz, yaw, sc] of houses) {
        const hy = islandH(hx, hz);
        const hs = makeBolon(r, sc);
        hs.position.set(hx, hy - 0.06, hz); hs.rotation.y = yaw;
        IG.add(hs); blob(IG, hx, hy + 0.04, hz, 7.5 * sc, 6 * sc, 0.3);
      }
      // dock + moored boat at the south shore
      const dock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 7), lam2({ color: "#7d5a36", map: rep(planks(), 1, 2) }));
      dock.position.set(19, 0.55, 28.5); dock.rotation.y = 0.25; dock.castShadow = true; IG.add(dock);
      for (const [px, pz] of [[18.2, 25.8], [19.8, 31.4]] as [number, number][]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), lam2({ color: "#5d4026", map: beam() }));
        post.position.set(px, -0.1, pz); IG.add(post);
      }
      const dockBoat = makeBoat(r);
      dockBoat.position.set(24.5, 0.06, 33); dockBoat.rotation.y = 0.9; IG.add(dockBoat);
    }
    // ---- hero's boat, mid-lake (present day, outside the island group) ----
    this.boatGroup = makeBoat(r);
    this.boatGroup.position.set(BOAT[0], 0.06, BOAT[2]);
    this.boatGroup.rotation.y = -0.55;
    R.add(this.boatGroup);
    // the plumb line (shot 6): thin line + weight, grows downward
    this.plumb = new THREE.Group();
    this.plumbLine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    this.plumbWeight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lam2({ color: "#3a3f45" }));
    this.plumb.add(this.plumbLine, this.plumbWeight);
    this.plumb.position.set(BOAT[0] + 1.15, 0.95, BOAT[2] + 0.9);
    this.plumb.visible = false;
    R.add(this.plumb);

    // ---- caldera rim: a ring of green-rock peaks (jittered cones, NOT
    // bare pyramids — the first stills read as grey paper pyramids) ----
    {
      const rimMat = lam2({ map: rep(rockTex("tobaRim", "#42503f", "120,150,105"), 3, 2), flatShading: true });
      const rimMat2 = lam2({ map: rep(rockTex("tobaRim2", "#39473a", "110,140,98"), 3, 2), flatShading: true });
      // fog:false — at 255–300 units the scene fog washed the ring out to
      // pale paper pyramids in BOTH weathers (stills-val2); unfogged they
      // read as solid green caldera walls at every distance
      rimMat.fog = false; rimMat2.fog = false;
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2 + r() * 0.14;
        const d = 255 + r() * 45;
        const h = 38 + r() * 26;
        const geo = new THREE.ConeGeometry(40 + r() * 26, h, 7, 3);
        const pa = geo.attributes.position as THREE.BufferAttribute;
        for (let vi = 0; vi < pa.count; vi++) {
          const vx = pa.getX(vi), vy = pa.getY(vi), vz = pa.getZ(vi);
          if (Math.abs(vy - h / 2) < 0.01) continue; // keep the apex sharp
          const nse = Math.sin(vx * 12.9 + vz * 7.7 + vy * 3.1) * 2.6;
          pa.setXYZ(vi, vx + nse, vy + Math.sin(vx * 5.3 + vz * 9.1) * 1.2, vz + Math.cos(vx * 8.2 - vz * 4.4) * 2.6);
        }
        geo.computeVertexNormals();
        const cone = new THREE.Mesh(geo, r() > 0.5 ? rimMat : rimMat2);
        cone.position.set(Math.cos(a) * d, h / 2 - 6, Math.sin(a) * d);
        cone.rotation.y = r() * 3;
        cone.scale.set(1, 1, 0.72 + r() * 0.35);
        R.add(cone);
      }
    }

    // ================= THE ERUPTION GROUP (shots 3–5) =================
    const EG = this.eruptionGroup; EG.visible = false; R.add(EG);
    {
      // ash plain where the lake will be
      const plain = new THREE.Mesh(new THREE.CircleGeometry(300, 44), lam2({ map: rep(ashTex(), 12, 12) }));
      plain.rotation.x = -Math.PI / 2; plain.position.y = 0.04; plain.receiveShadow = true; EG.add(plain);
      // cracked dark patches
      const crackMat = lam2({ color: "#3c3835", map: rep(ashTex(), 3, 3), flatShading: true });
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, d = 22 + r() * 130;
        const cr = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + r() * 1.4, 0), crackMat);
        cr.position.set(Math.cos(a) * d, 0.12, -30 + Math.sin(a) * d * 0.8);
        cr.rotation.set(r() * 3, r() * 3, r() * 3); cr.castShadow = true; EG.add(cr);
      }
      // the vent: rubble cone at the island-to-be + glowing crater mouth
      const vent = new THREE.Mesh(new THREE.ConeGeometry(24, 13, 9), lam2({ map: rep(rockTex("tobaVent", "#4c423a", "170,150,130"), 3, 1), flatShading: true }));
      vent.position.set(0, 5.2, -30); vent.castShadow = true; EG.add(vent);
      // a squat glowing plug, NOT a flat disc — the disc read as a
      // floating orange frisbee from low cameras (stills-val2 w-9)
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 4.8, 1.7, 14), new THREE.MeshBasicMaterial({ color: "#ff7d2e", fog: false }));
      crater.position.set(0, 11.6, -30); crater.layers.set(NOINK); EG.add(crater);
      // lava glow at the base: orange sprites + point light
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + r() * 0.5;
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ff7a26", transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
        gl.position.set(Math.cos(a) * 10, 2.4 + r() * 1.8, -30 + Math.sin(a) * 10);
        gl.scale.set(12 + r() * 6, 7 + r() * 3.5, 1); gl.layers.set(NOINK); EG.add(gl);
        this.plumes.push({ sp: gl, x: gl.position.x, y: gl.position.y, z: gl.position.z, ph: r(), sc: gl.scale.x, op: 0.7, kind: 1 });
      }
      this.lavaLight = new THREE.PointLight("#ff8a30", 1600, 140, 2);
      this.lavaLight.position.set(0, 9, -30); EG.add(this.lavaLight);
      // THE PLUME: stacked billowing smoke sprites climbing to y≈120.
      // Solid clustered-blob texture + dark greys + high opacity: a plain
      // radial glow sprite washed out to invisibility against the grey
      // storm sky in the first validation stills.
      for (let i = 0; i < 18; i++) {
        const u = i / 17;
        const grey = ["#43464c", "#55524b", "#6b655a", "#7d7668"][i % 4];
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: grey, transparent: true, opacity: 0.8 + u * 0.16, depthWrite: false, rotation: r() * 6.28 }));
        const px = (r() - 0.5) * (4 + u * 22), pz = -30 + (r() - 0.5) * (4 + u * 22);
        const py = 10 + u * 102;
        sp.position.set(px, py, pz);
        const sc = 16 + u * 48;
        sp.scale.set(sc, sc * 0.8, 1); sp.layers.set(NOINK); EG.add(sp);
        this.plumes.push({ sp, x: px, y: py, z: pz, ph: r(), sc, op: 0.8 + u * 0.16, kind: 0 });
      }
      // falling ash: small pale flakes drifting down everywhere
      for (let i = 0; i < 42; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#cfc8b8", transparent: true, opacity: 0.35 + r() * 0.3, depthWrite: false }));
        const px = (r() - 0.5) * 220, pz = -30 + (r() - 0.5) * 200, py = r() * 70;
        sp.position.set(px, py, pz);
        const sc = 0.5 + r() * 0.9;
        sp.scale.set(sc, sc, 1); sp.layers.set(NOINK); EG.add(sp);
        this.ashes.push({ sp, x: px, y: py, z: pz, ph: r(), fall: 1.6 + r() * 1.8, sway: 0.6 + r() * 1.4, op: 0.35 + r() * 0.3 });
      }
    }
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
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
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
    // aerials need the rim ring readable across 300+ units: stretch the fog
    const fogK = (id === 1 || id === 2 || id === 9 || id === 10) ? 3.1 : (id >= 3 && id <= 5) ? 1.9 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    // ---- present day vs flashback ----
    const erupting = id >= 3 && id <= 5;
    this.islandGroup.visible = !erupting;
    this.boatGroup.visible = !erupting;
    this.eruptionGroup.visible = erupting;
    this.skyDay.visible = !erupting;
    this.skyStorm.visible = erupting;
    for (const cl of this.clouds) cl.visible = !erupting;
    // ---- water breathes: a slow texture drift ----
    const wt = this.waterMat.map;
    if (wt) { wt.offset.x = Math.sin(tt * 0.04) * 0.008; wt.offset.y = (tt * 0.0035) % 1; }
    // ---- boat bob (subtle) ----
    if (!erupting) {
      this.boatGroup.position.y = 0.06 + Math.sin(tt * 1.3) * 0.045;
      this.boatGroup.rotation.z = Math.sin(tt * 0.9) * 0.012;
    }
    // ---- the plumb line (shot 6 only) ----
    if (id === 6) {
      this.plumb.visible = true;
      const u = Math.max(0, Math.min(1, (tt - (SHOTS[5].a / FPS + 0.9)) / 2.4));
      const len = 0.3 + u * 5.2;
      this.plumbLine.scale.y = len;
      this.plumbLine.position.y = -len / 2;
      this.plumbWeight.position.y = -len;
      this.plumb.position.y = 0.95 + Math.sin(tt * 1.3) * 0.045;
    } else this.plumb.visible = false;
    // ---- eruption life: plume billow + lava flicker + falling ash ----
    if (erupting) {
      // shot 5 = aftermath: the smoke column (kind 0) thins and shrinks
      const thin = id === 5 ? 0.5 : 1;
      for (let i = 0; i < this.plumes.length; i++) {
        const pl = this.plumes[i];
        const k = pl.kind === 0 ? thin : 1;
        const fl = (0.88 + 0.18 * Math.sin(tt * 1.7 + pl.ph * 9) * Math.sin(tt * 0.9 + pl.ph * 5)) * (pl.kind === 0 && id === 5 ? 0.85 : 1);
        pl.sp.scale.set(pl.sc * fl, pl.sc * 0.72 * (2 - fl) * 0.94 + pl.sc * 0.72 * 0.06, 1);
        pl.sp.position.x = pl.x + Math.sin(tt * 0.35 + pl.ph * 7) * 1.6;
        (pl.sp.material as THREE.SpriteMaterial).opacity = pl.op * k * (0.82 + 0.25 * fl);
      }
      this.lavaLight.intensity = 1600 * (0.8 + 0.3 * Math.sin(tt * 8.3) * Math.sin(tt * 3.7));
      for (const a of this.ashes) {
        const fall = (tt * a.fall + a.ph * 70) % 70;
        a.sp.position.set(a.x + Math.sin(tt * a.sway + a.ph * 8) * 2.2, 72 - fall, a.z);
        (a.sp.material as THREE.SpriteMaterial).opacity = a.op * Math.min(1, fall / 4) * (id === 3 ? 0.45 : 1);
      }
    }
    void SPLASH6_T;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
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
    for (const p of st.fx) {
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
