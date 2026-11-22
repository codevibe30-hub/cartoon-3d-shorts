// "Pria Ini Menolak Turun Saat Gunungnya Meletus🤫" as one
// three.js scene: the southern slope of Merapi — the hamlet of
// Kinahrejo with its joglo houses, Maridjan's porch, the little
// mosque, the Srunen burial ground, and the great smoking cone
// behind everything. DASIMAN-style sets: bright, simple,
// uncluttered — clean low-poly shapes with painted textures,
// layered light rig (sun key with soft shadows + hemisphere
// fill + rim), NO ink pass on the world.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, truckX, truckArriveX, ROAD_Z, MOSQUE, GRAVE } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("maridjanSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("maridjanSkyStorm", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#26262a"); grad.addColorStop(0.45, "#454448"); grad.addColorStop(0.78, "#716e68"); grad.addColorStop(1, "#98938a");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 260; i++) {
    const x = r() * 2048, y = r() * 430, w = 90 + r() * 260, h = 22 + r() * 46;
    g.fillStyle = `rgba(${r() > 0.45 ? "18,17,18" : "96,94,90"},${0.05 + r() * 0.10})`;
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(210,205,195,${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2, 2); }
});
const skyTexNight = () => ctex("maridjanSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060d1f"); grad.addColorStop(0.5, "#0d1c38"); grad.addColorStop(0.8, "#1d3358"); grad.addColorStop(1, "#2c4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,252,240,${0.25 + r() * 0.6})`; g.fillRect(r() * 2048, r() * 560, 1.8, 1.8); }
  const mn = g.createRadialGradient(420, 190, 6, 420, 190, 150);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(210,226,250,0.35)"); mn.addColorStop(1, "rgba(210,226,250,0)");
  g.fillStyle = mn; g.fillRect(240, 20, 380, 360);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 21, 0, 7); g.fill();
});
const signTex = (word: string, sub: string, key: string) => () => ctex(key, 1024, 320, (g) => {
  g.fillStyle = "#4c3a26"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#3a2c1c"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 294, 1024, 26);
  g.fillStyle = "#f2e7cd"; g.font = "900 118px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(word, 512, 122);
  g.font = "700 58px Arial, sans-serif"; g.fillStyle = "#d9c9a4";
  g.fillText(sub, 512, 238);
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private skyStorm: THREE.Mesh;
  private skyNight: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private truck: THREE.Group | null = null;
  private craterGlow: THREE.Mesh | null = null;
  private smoke: THREE.Sprite[] = [];
  private ashCloud: THREE.Group | null = null;
  private ashSprites: THREE.Sprite[] = [];
  private ashGround: THREE.Mesh | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1927);
    this.hemi = new THREE.HemisphereLight("#dcecff", "#7a9a58", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyStorm = new THREE.Mesh(new THREE.SphereGeometry(679, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexStorm(), side: THREE.BackSide, fog: false }));
    this.skyStorm.layers.set(NOINK); this.skyStorm.visible = false; R.add(this.skyStorm);
    this.skyNight = new THREE.Mesh(new THREE.SphereGeometry(678, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexNight(), side: THREE.BackSide, fog: false }));
    this.skyNight.layers.set(NOINK); this.skyNight.visible = false; R.add(this.skyNight);
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 11, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 200 + r() * 240;
      sp.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d);
      sp.scale.set(100 + r() * 70, 34 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    this.buildGround(R, r);
    this.buildVolcano(R, r);
    this.buildVillage(R, r);
    this.buildMosque(R, r);
    this.buildGrave(R, r);
    this.buildTruck(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- ground ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(420, 28), lam2({ map: rep(grass(), 140, 140) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    // the east-west road below the village (top at y = 0)
    const road = new THREE.Mesh(new THREE.BoxGeometry(300, 0.06, 5.4), lam2({ map: rep(stone("maridjanDirt", ["#9a7d5c", "#8a6f50", "#a68a66", "#7d6547"]), 30, 1) }));
    road.position.set(10, -0.03, ROAD_Z); road.receiveShadow = true; R.add(road);
    // the village plaza: packed earth around the houses
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 0.06, 24), lam2({ map: rep(stone("maridjanPlaza", ["#a08663", "#947a58", "#ac9068", "#88714f"]), 10, 10) }));
    plaza.position.set(2, -0.03, -26); plaza.receiveShadow = true; R.add(plaza);
    // the village path, running south-north toward the mountain
    const path = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 74), lam2({ map: rep(stone("maridjanPath", ["#a08663", "#947a58", "#ac9068", "#88714f"]), 1, 16) }));
    path.position.set(3, -0.03, -26); path.receiveShadow = true; R.add(path);
    // the grey ash that buried Kinahrejo (shot 12, second half)
    const ash = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), lam2({ color: "#9b978f" }));
    ash.rotation.x = -Math.PI / 2; ash.position.set(0, 0.045, -28); ash.receiveShadow = true; ash.visible = false;
    this.ashGround = ash; R.add(ash);
    void r;
  }

  private lampPost(R: THREE.Group, x: number, y: number, z: number, s = 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 3.4 * s, 7), lam2({ color: "#2e3134" }));
    post.position.set(x, y + 1.7 * s, z); post.castShadow = true; R.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.21 * s, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffd9a0" }));
    bulb.position.set(x, y + 3.5 * s, z); R.add(bulb);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34 * s, 0.22 * s, 8), lam2({ color: "#2e3134" }));
    cap.position.set(x, y + 3.72 * s, z); R.add(cap);
  }

  private tree(R: THREE.Group, x: number, z: number, s = 1, seed = 0) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 2.2 * s, 7), lam2({ color: "#7a5a3c" }));
    trunk.position.set(x, 1.1 * s, z); trunk.castShadow = true; R.add(trunk);
    const greens = ["#4f8a3f", "#5d9a47", "#478238"];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry((1.15 - i * 0.22) * s, 10, 8), lam2({ color: greens[(seed + i) % 3], flatShading: true }));
      c.position.set(x + Math.sin(seed * 9 + i * 2.4) * 0.55 * s, (2.6 + i * 0.62) * s, z + Math.cos(seed * 7 + i * 2.1) * 0.5 * s);
      c.castShadow = true; R.add(c);
    }
  }

  // ---------------- Merapi herself ----------------
  private buildVolcano(R: THREE.Group, r: () => number) {
    // the lower cone: green-grey slopes
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(27, 92, 42, 26, 1, true), lam2({ color: "#66785e", flatShading: true }));
    lower.position.set(0, 21, -150); R.add(lower);
    // the upper cone: bare grey rock near the summit
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 27.5, 25, 26, 1, true), lam2({ color: "#7b7e76", flatShading: true }));
    upper.position.set(0, 53.5, -150); R.add(upper);
    // the crater floor + its glow (lit at night / in the last days)
    const crater = new THREE.Mesh(new THREE.CircleGeometry(7.5, 26), lam2({ color: "#3c3a38" }));
    crater.rotation.x = -Math.PI / 2; crater.position.set(0, 63.8, -150); R.add(crater);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(5.0, 22), new THREE.MeshBasicMaterial({ color: "#ff6a2a", fog: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 63.9, -150); glow.visible = false;
    this.craterGlow = glow; R.add(glow);
    // the breathing smoke column over the crater
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(700 + i * 13, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.6 }));
      sp.position.set(0, 68 + i * 3, -150); sp.scale.set(24, 13, 1);
      sp.layers.set(NOINK); R.add(sp); this.smoke.push(sp);
    }
    // THE WEDHUS GEMBEL (shot 12): a wall of grey cloud-sprites
    // waiting on the upper slope; update() rolls it down
    const ash = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(900 + i * 17, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.6, color: "#8a8782" }));
      sp.position.set(-34 + i * 8.5 + (r() - 0.5) * 5, 9 + (i % 3) * 4.5 + r() * 2, (r() - 0.5) * 6);
      sp.scale.set(36 + r() * 10, 17 + r() * 5, 1);
      sp.layers.set(NOINK); ash.add(sp); this.ashSprites.push(sp);
    }
    ash.position.set(0, 0, -84); ash.visible = false;
    this.ashCloud = ash; R.add(ash);
  }

  // a simple joglo: stone base, warm walls, the great stacked
  // pyramid roof of Java. Porch optional (Maridjan's house).
  private joglo(R: THREE.Group, x: number, z: number, s: number, wallCol: string, roofCol: string, porch = false) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 5.6), lam2({ map: rep(stone("maridjanBase", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 3, 1) }));
    base.position.set(0, 0.15, 0); base.castShadow = true; base.receiveShadow = true; g.add(base);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 2.7, 5), lam2({ color: wallCol, map: rep(planks(), 3, 2) }));
    walls.position.set(0, 1.65, -0.3); walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.08), lam2({ color: "#4a3421" }));
    door.position.set(0, 1.3, 2.24); g.add(door);
    const winM = new THREE.MeshBasicMaterial({ color: "#ffd98d" });
    for (const wx of [-1.9, 1.9]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.1), winM);
      win.position.set(wx, 1.75, 2.24); g.add(win);
    }
    const roofM = lam2({ color: roofCol, flatShading: true });
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.3, 4), roofM);
    roof1.position.set(0, 4.15, -0.3); roof1.rotation.y = Math.PI / 4; roof1.scale.set(1, 1, 0.82); roof1.castShadow = true; g.add(roof1);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.8, 4), roofM);
    roof2.position.set(0, 5.9, -0.3); roof2.rotation.y = Math.PI / 4; roof2.scale.set(1, 1, 0.82); roof2.castShadow = true; g.add(roof2);
    if (porch) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.32, 2.4), lam2({ map: rep(planks(), 3, 1) }));
      floor.position.set(0, 0.16, 3.6); floor.castShadow = true; floor.receiveShadow = true; g.add(floor);
      const postM = lam2({ color: "#6e4a2c" });
      for (const px of [-3.0, 3.0]) for (const pz of [2.6, 4.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.0, 7), postM);
        post.position.set(px, 1.8, pz); post.castShadow = true; g.add(post);
      }
      const proof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.14, 2.9), roofM);
      proof.position.set(0, 3.36, 3.6); proof.rotation.x = 0.1; proof.castShadow = true; g.add(proof);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.5), lam2({ color: "#6e5136", map: rep(planks(), 2, 1) }));
      bench.position.set(-1.4, 0.62, 3.4); g.add(bench);
      for (const bx of [-2.4, -0.4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.45), lam2({ color: "#6e5136" }));
        leg.position.set(bx, 0.45, 3.4); g.add(leg);
      }
    }
    g.position.set(x, 0, z); g.scale.setScalar(s);
    R.add(g);
    return g;
  }

  // ---------------- Kinahrejo (shots 1-6, 8-12) ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    // Maridjan's house: the porch faces the village (+z)
    this.joglo(R, 8, -29.6, 1, "#e3d3ae", "#9a5638", true);
    // the neighbours' houses
    this.joglo(R, -6, -33, 0.82, "#d8c49c", "#8a4f30");
    this.joglo(R, -15, -24, 0.75, "#cbb691", "#7d4a2c");
    this.joglo(R, 19, -33, 0.85, "#e0cda6", "#96522f");
    this.joglo(R, -3, -39, 0.7, "#d3bf98", "#85502e");
    // the village sign where the path meets the road
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 7), lam2({ color: "#5d4630" }));
    post.position.set(0.2, 1.3, -3.5); post.castShadow = true; R.add(post);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 0.12), lam2({ map: signTex("KINAHREJO", "LERENG MERAPI", "maridjanSign")() }));
    sign.position.set(0.2, 2.2, -3.5); sign.castShadow = true; R.add(sign);
    this.lampPost(R, 1.5, 0, -13);
    this.lampPost(R, 13.5, 0, -19);
    // trees around the hamlet
    const trees: [number, number, number][] = [[-11, -18, 1.1], [15, -22, 0.9], [-19, -31, 1.2], [24, -27, 1.0], [4, -42, 1.15], [-8, -44, 0.95], [16, -40, 1.05], [-24, -20, 0.9]];
    trees.forEach(([tx, tz, ts], i) => this.tree(R, tx, tz, ts, i + 1));
    void r;
  }

  // ---------------- the little mosque (shot 7) ----------------
  private buildMosque(R: THREE.Group, r: () => number) {
    const cx = MOSQUE[0], cz = MOSQUE[2];
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.06, 22), lam2({ map: rep(stone("maridjanMosqueYard", ["#a08663", "#947a58", "#ac9068", "#88714f"]), 8, 8) }));
    plat.position.set(cx, -0.03, cz); plat.receiveShadow = true; R.add(plat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 7), lam2({ color: "#eef0e8", map: rep(planks(), 3, 2) }));
    body.position.set(cx, 1.9, cz - 2); body.castShadow = true; body.receiveShadow = true; R.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam2({ color: "#3f7a52", flatShading: true }));
    dome.position.set(cx, 3.5, cz - 2); dome.castShadow = true; R.add(dome);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: "#ffd98d" }));
    finial.position.set(cx, 7.35, cz - 2); R.add(finial);
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 7.6, 9), lam2({ color: "#e4e7dc" }));
    minaret.position.set(cx - 4.6, 3.8, cz - 2); minaret.castShadow = true; R.add(minaret);
    const mcap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 9), lam2({ color: "#3f7a52", flatShading: true }));
    mcap.position.set(cx - 4.6, 8.3, cz - 2); R.add(mcap);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.08), lam2({ color: "#3a5a48" }));
    door.position.set(cx, 1.5, cz + 1.54); R.add(door);
    // the steps the bandaged man will sit on (top step y = 0.55)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.28, 1.1), lam2({ map: rep(stone("maridjanSteps", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 3, 1) }));
    step1.position.set(cx, 0.14, cz + 2.6); step1.receiveShadow = true; R.add(step1);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.55, 0.7), lam2({ map: rep(stone("maridjanSteps", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 3, 1) }));
    step2.position.set(cx, 0.275, cz + 1.95); step2.receiveShadow = true; R.add(step2);
    // the prayer rug laid out before the mosque
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.0), lam2({ color: "#3a6a4a" }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(cx, 0.045, cz + 4.6); rug.receiveShadow = true; R.add(rug);
    this.tree(R, cx + 8.5, cz + 3, 1.15, 21);
    this.tree(R, cx - 9, cz + 5, 0.95, 22);
    void r;
  }

  // ---------------- Srunen (shot 13) ----------------
  private buildGrave(R: THREE.Group, r: () => number) {
    const cx = GRAVE[0], cz = GRAVE[2];
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.06, 22), lam2({ map: rep(stone("maridjanGraveYard", ["#97a06b", "#87925e", "#a3ad76", "#7d8a54"]), 8, 8) }));
    plat.position.set(cx, -0.03, cz); plat.receiveShadow = true; R.add(plat);
    // the grave mound: fresh earth under the trees
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), lam2({ color: "#7a6248", flatShading: true }));
    mound.scale.set(1.7, 0.55, 2.7); mound.position.set(cx, 0.02, cz); mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
    // two wooden nisan, head and foot
    const nisM = lam2({ color: "#8a6a4a", map: rep(planks(), 1, 1) });
    for (const dz of [-2.35, 2.35]) {
      const nis = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.13), nisM);
      nis.position.set(cx, 0.5, cz + dz); nis.castShadow = true; R.add(nis);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 4), nisM);
      tip.position.set(cx, 1.05, cz + dz); tip.rotation.y = Math.PI / 4; R.add(tip);
    }
    // flowers scattered over the mound by the villagers
    const cols = ["#c23b2e", "#e8c33c", "#f2f0e4", "#d4709e", "#e2703a"];
    for (let i = 0; i < 16; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), lam2({ color: cols[i % 5] }));
      const a = r() * Math.PI * 2, d = 0.4 + r() * 1.6;
      fl.position.set(cx + Math.cos(a) * d * 0.8, 0.42 + r() * 0.18, cz + Math.sin(a) * d);
      R.add(fl);
    }
    // a low fence around the plot
    const fenceM = lam2({ color: "#6e5136" });
    for (let fx = -3.4; fx <= 3.4; fx += 1.7) for (const fz of [-3.6, 3.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.75, 6), fenceM);
      post.position.set(cx + fx, 0.37, cz + fz); R.add(post);
    }
    for (const fz of [-3.6, 3.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.07, 0.07), fenceM);
      rail.position.set(cx, 0.62, cz + fz); R.add(rail);
    }
    this.tree(R, cx - 4.5, cz - 3, 1.3, 31);
    this.tree(R, cx + 5, cz - 4.5, 1.05, 32);
    this.tree(R, cx + 6.5, cz + 4, 0.9, 33);
    void r;
  }

  // ---------------- the evacuation pickup ----------------
  private buildTruck(R: THREE.Group, r: () => number) {
    const truck = new THREE.Group();
    const woodM = lam2({ color: "#7a4a2c", map: rep(planks(), 2, 1) });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 1.8), lam2({ color: "#3a3a3c" }));
    chassis.position.set(0, 0.6, 0); truck.add(chassis);
    // the open bed: floor top at y = 1.02 (riders stand there)
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.8), woodM);
    bedFloor.position.set(-0.9, 0.95, 0); bedFloor.castShadow = true; truck.add(bedFloor);
    for (const sz of [-0.86, 0.86]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.52, 0.07), woodM);
      rail.position.set(-0.9, 1.28, sz); truck.add(rail);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 1.8), woodM);
    tail.position.set(-2.72, 1.28, 0); truck.add(tail);
    // the cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.75), lam2({ color: "#b0a58e" }));
    cab.position.set(2.2, 1.3, 0); cab.castShadow = true; truck.add(cab);
    const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.6), new THREE.MeshBasicMaterial({ color: "#cfe4ee" }));
    shield.position.set(2.62, 1.55, 0); shield.rotation.y = Math.PI / 2 - 0.35; truck.add(shield);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.6), lam2({ color: "#a3987f" }));
    hood.position.set(3.35, 0.95, 0); truck.add(hood);
    const wheelM = lam2({ color: "#1b1b1b" });
    for (const wx of [-1.7, 2.3]) for (const wz of [-0.92, 0.92]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.16, 14), wheelM);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.44, wz); truck.add(wheel);
    }
    truck.position.set(-8, 0, ROAD_Z);
    this.truck = truck;
    R.add(truck);
    void r;
  }

  private buildBackdrop(R: THREE.Group, r: () => number) {
    // a ring of soft ridge silhouettes on the horizon
    const ridgeM = lam2({ color: "#5d7a8c", flatShading: true });
    const ridge2M = lam2({ color: "#476b52", flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4, d = 230 + r() * 80;
      if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) < 0) continue; // keep Merapi's own sector clear
      const h = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? ridgeM : ridge2M);
      h.scale.set(95 + r() * 60, 26 + r() * 15, 48 + r() * 20);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 10); R.add(h);
    }
    // Merbabu, Merapi's quiet neighbour, far to the west
    const merbabu = new THREE.Mesh(new THREE.CylinderGeometry(16, 70, 34, 20, 1, true), lam2({ color: "#5f7484", flatShading: true }));
    merbabu.position.set(-215, 17, -150); R.add(merbabu);
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
    const azOff = s.light === "golden" ? 58 : 0;
    const az = THREE.MathUtils.degToRad(Lp.az + azOff), el = THREE.MathUtils.degToRad(Lp.el);
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
    void tt;
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
    this.fog.near = Lp.fogNear; this.fog.far = Lp.fogFar;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = s.light === "day" || s.light === "golden";
    this.skyStorm.visible = s.light === "storm";
    this.skyNight.visible = s.light === "night";
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(s.light === "storm" ? "#5c5a56" : s.light === "night" ? "#2c3e58" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = s.light === "storm" ? 0.55 : s.light === "night" ? 0.25 : 0.92;
    }
    const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
    // ---- the truck: loaded departures (1, 6), the 2010 arrival (9) ----
    if (this.truck) {
      if (id === 1 || id === 6) { this.truck.visible = true; this.truck.position.x = truckX(uu); }
      else if (id === 9) { this.truck.visible = true; this.truck.position.x = truckArriveX(uu); }
      else this.truck.visible = false;
      this.truck.position.y = 0; this.truck.position.z = ROAD_Z;
    }
    // ---- the crater glow: lit at night and in the last days ----
    if (this.craterGlow) this.craterGlow.visible = s.light === "night" || id === 9 || id === 12;
    // ---- the breathing smoke column over the crater ----
    for (let i = 0; i < this.smoke.length; i++) {
      const sp = this.smoke[i], ph = (f * 0.0035 + i / this.smoke.length) % 1;
      sp.position.set(Math.sin(i * 7.3) * 3 + ph * 9, 66 + ph * 17, -150 + Math.cos(i * 5.1) * 3);
      const sc2 = 20 + ph * 30; sp.scale.set(sc2, sc2 * 0.55, 1);
      (sp.material as THREE.SpriteMaterial).opacity = (s.light === "storm" ? 0.85 : 0.6) * (0.35 + 0.65 * Math.sin(ph * Math.PI));
      (sp.material as THREE.SpriteMaterial).color.set(s.light === "night" ? "#3a4356" : s.light === "storm" ? "#6a6d70" : "#f4f6f8");
    }
    // ---- THE WEDHUS GEMBEL (shot 12): the grey wall rolls down ----
    if (this.ashCloud) {
      const on = id === 12;
      this.ashCloud.visible = on;
      if (on) {
        const au = clamp01(uu / 0.55);
        this.ashCloud.position.z = -84 + au * au * 56;
        const k = 1 + au * 0.7; this.ashCloud.scale.set(k, 1 + au * 0.5, 1);
        for (const sp of this.ashSprites) (sp.material as THREE.SpriteMaterial).opacity = 0.55 + 0.4 * au;
      }
    }
    if (this.ashGround) this.ashGround.visible = id === 12 && uu > 0.55;
    // ---- cast + effects ----
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
