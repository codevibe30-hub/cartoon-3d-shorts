// "Pria Ini Menyelamatkan 669 Anak, Lalu Diam 50 Tahun🤫" as one
// three.js scene: Prague station in 1939, a grey December street,
// a hotel corridor and its makeshift office, a great map of
// Europe, a border gate, then England — an ordinary living room,
// an attic in 1988, and a television studio. DASIMAN-style sets:
// bright, simple, uncluttered — clean low-poly shapes with
// painted textures, layered light rig (sun key with soft shadows
// + hemisphere fill + rim), NO ink pass on the world.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, trainX, STATION, TRACK_Z, STREET, CORRIDOR, OFFICE, MAPWALL, GATE, HOME, ATTIC, STUDIO } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("wintonSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("wintonSkyStorm", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#232c38"); grad.addColorStop(0.45, "#3d4a5a"); grad.addColorStop(0.78, "#67788c"); grad.addColorStop(1, "#93a5b5");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 260; i++) {
    const x = r() * 2048, y = r() * 430, w = 90 + r() * 260, h = 22 + r() * 46;
    g.fillStyle = `rgba(${r() > 0.45 ? "16,22,32" : "88,102,120"},${0.05 + r() * 0.10})`;
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(200,214,228,${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2, 2); }
});
const skyTexNight = () => ctex("wintonSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060d1f"); grad.addColorStop(0.5, "#0d1c38"); grad.addColorStop(0.8, "#1d3358"); grad.addColorStop(1, "#2c4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,252,240,${0.25 + r() * 0.6})`; g.fillRect(r() * 2048, r() * 560, 1.8, 1.8); }
  const mn = g.createRadialGradient(420, 190, 6, 420, 190, 150);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(210,226,250,0.35)"); mn.addColorStop(1, "rgba(210,226,250,0)");
  g.fillStyle = mn; g.fillRect(240, 20, 380, 360);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 21, 0, 7); g.fill();
});
// the carriage side: a deep-green coach with a band of windows
const coachTex = () => ctex("wintonCoach", 1024, 256, (g) => {
  g.fillStyle = "#31473a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#27392e"; g.fillRect(0, 200, 1024, 56);
  g.fillStyle = "#c8a24a"; g.fillRect(0, 58, 1024, 7);
  for (let i = 0; i < 5; i++) {
    const x = 70 + i * 185;
    g.fillStyle = "#ffd98d"; g.fillRect(x, 78, 118, 96);
    g.fillStyle = "#8a6a30"; g.fillRect(x, 78, 118, 10);
    g.strokeStyle = "#1e2b22"; g.lineWidth = 7; g.strokeRect(x, 78, 118, 96);
  }
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, 1024, 20);
});
const signTex = (word: string, sub: string, key: string) => () => ctex(key, 1024, 320, (g) => {
  g.fillStyle = "#3d3a36"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#2e2b28"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 294, 1024, 26);
  g.fillStyle = "#f2e7cd"; g.font = "900 120px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(word, 512, 122);
  g.font = "700 58px Arial, sans-serif"; g.fillStyle = "#d9c9a4";
  g.fillText(sub, 512, 238);
});
const hotelTex = () => ctex("wintonHotel", 1024, 512, (g, r) => {
  g.fillStyle = "#a8906c"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(60,44,26,${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 512, 3, 3); }
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const x = 60 + col * 158, y = 52 + row * 140;
    g.fillStyle = "#f7e3ac"; g.fillRect(x, y, 84, 96);
    g.strokeStyle = "#5d4a30"; g.lineWidth = 7; g.strokeRect(x, y, 84, 96);
    g.beginPath(); g.moveTo(x + 42, y); g.lineTo(x + 42, y + 96); g.stroke();
  }
  g.fillStyle = "#4a3823"; g.fillRect(452, 392, 120, 120);
  g.fillStyle = "#f7e3ac"; g.fillRect(470, 410, 36, 44); g.fillRect(518, 410, 36, 44);
});
const mapTex = () => ctex("wintonMap", 2048, 1024, (g, r) => {
  g.fillStyle = "#e7dcc0"; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(120,96,58,${0.02 + r() * 0.04})`; g.fillRect(r() * 2048, r() * 1024, 3, 3); }
  g.fillStyle = "#b9cdd6"; // the seas
  g.fillRect(0, 0, 2048, 190); g.fillRect(0, 0, 330, 1024); g.fillRect(1560, 300, 488, 724);
  const land = (pts: [number, number][]) => {
    g.fillStyle = "#9db08a"; g.beginPath();
    pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath(); g.fill();
    g.strokeStyle = "#77875f"; g.lineWidth = 5; g.stroke();
  };
  // Britain (upper left), the continent (centre-right), Scandinavia (top)
  land([[380, 210], [520, 170], [600, 260], [560, 420], [430, 470], [360, 350]]);
  land([[700, 260], [1150, 220], [1560, 300], [1600, 560], [1420, 820], [1050, 900], [760, 760], [660, 520]]);
  land([[760, 60], [1250, 40], [1420, 150], [1180, 210], [820, 190]]);
  // the route: Praha -> north -> the Hook -> across the sea -> London
  const route: [number, number][] = [[1085, 560], [1065, 430], [985, 340], [830, 300], [620, 285], [492, 262]];
  g.strokeStyle = "#b03a30"; g.lineWidth = 9; g.setLineDash([26, 18]);
  g.beginPath(); route.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.setLineDash([]);
  for (const [x, y] of route) { g.fillStyle = "#b03a30"; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  g.fillStyle = "#5d4a26"; g.font = "900 54px Arial, sans-serif"; g.textAlign = "center";
  g.fillText("PRAHA", 1085, 632);
  g.fillText("LONDON", 470, 345);
  g.font = "700 40px Arial, sans-serif"; g.fillStyle = "#7a6a44";
  g.fillText("E V R O P A   ·   1 9 3 9", 1024, 968);
});
const curtainTex = () => ctex("wintonCurtain", 1024, 512, (g, r) => {
  for (let x = 0; x < 1024; x += 4) {
    const s = 0.72 + 0.28 * Math.sin((x / 1024) * Math.PI * 14);
    g.fillStyle = `rgb(${Math.round(122 * s)},${Math.round(30 * s)},${Math.round(38 * s)})`;
    g.fillRect(x, 0, 4, 512);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.03})`; g.fillRect(r() * 1024, r() * 512, 2, 2); }
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
  private train: THREE.Group | null = null;
  private winMat: THREE.MeshBasicMaterial | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1939);
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
    this.buildStation(R, r);
    this.buildStreet(R, r);
    this.buildCorridor(R, r);
    this.buildOffice(R, r);
    this.buildMap(R, r);
    this.buildGate(R, r);
    this.buildHome(R, r);
    this.buildAttic(R, r);
    this.buildStudio(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- ground ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(380, 28), lam2({ map: rep(grass(), 130, 130) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
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

  // ---------------- Prague station (shots 1, 6, 7, 8) ----------------
  private buildStation(R: THREE.Group, r: () => number) {
    const cz = STATION[2];
    // the platform slab + its worn stone top
    const plat = new THREE.Mesh(new THREE.BoxGeometry(38, 0.55, 10), lam2({ map: rep(stone("wintonPlat", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 10, 3) }));
    plat.position.set(0, 0.275, cz - 1); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(38, 0.1, 0.5), lam2({ color: "#e3ddcc" }));
    edge.position.set(0, 0.56, cz - 5.6); R.add(edge);
    // the track bed + rails + sleepers
    const bed = new THREE.Mesh(new THREE.BoxGeometry(90, 0.18, 4.6), lam2({ map: rep(stone("wintonBallast", ["#5d5a55", "#4e4c48", "#6a675f", "#43413e"]), 20, 2) }));
    bed.position.set(0, 0.09, TRACK_Z); bed.receiveShadow = true; R.add(bed);
    const railM = lam2({ color: "#9aa0a4" });
    for (const dz of [-0.75, 0.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(90, 0.12, 0.09), railM);
      rail.position.set(0, 0.24, TRACK_Z + dz); R.add(rail);
    }
    const slpM = lam2({ color: "#4c3d2c" });
    for (let x = -44; x < 45; x += 1.6) {
      const slp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 2.3), slpM);
      slp.position.set(x, 0.2, TRACK_Z); R.add(slp);
    }
    // the canopy: a long roof on iron posts, and the station sign
    const roofM = lam2({ color: "#4e5a60", flatShading: true });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(30, 0.22, 7.5), roofM);
    canopy.position.set(-2, 5.6, cz - 0.5); canopy.castShadow = true; R.add(canopy);
    const postM = lam2({ color: "#33383c" });
    for (const px of [-15, -5, 5, 13]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.1, 7), postM);
      post.position.set(px, 3.1, cz - 3.4); post.castShadow = true; R.add(post);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.7, 0.14), lam2({ map: signTex("PRAHA", "HLAVNÍ NÁDRAŽÍ", "wintonSignPraha")() }));
    sign.position.set(-2, 4.1, cz - 3.55); sign.castShadow = true; R.add(sign);
    // a bench + the barrier fence the parents stand behind
    const benchM = lam2({ color: "#6e5136", map: rep(planks(), 2, 1) });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.55), benchM);
    bench.position.set(10.5, 1.0, cz + 1.5); R.add(bench);
    for (const bx of [9.4, 11.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.5), benchM);
      leg.position.set(bx, 0.78, cz + 1.5); R.add(leg);
    }
    const fenceM = lam2({ color: "#3f4448" });
    for (let x = -13; x <= -3.4; x += 1.6) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 6), fenceM);
      bar.position.set(x, 1.08, cz + 2.6); R.add(bar);
    }
    for (const ry of [0.85, 1.32]) {
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.07, 0.07), fenceM);
      rail2.position.set(-8.2, ry, cz + 2.6); R.add(rail2);
    }
    this.lampPost(R, -12, 0.55, cz - 4.6);
    this.lampPost(R, 12, 0.55, cz - 4.6);
    this.lampPost(R, 0, 0.55, cz + 3.4);
    // ---- THE TRAIN ----
    const train = new THREE.Group();
    const locoM = lam2({ color: "#232a26" });
    const trimM = lam2({ color: "#7a2e2a" });
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 4.6, 14), locoM);
    boiler.rotation.z = Math.PI / 2; boiler.position.set(-11.5, 1.55, 0); boiler.castShadow = true; train.add(boiler);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 2.5), locoM);
    cab.position.set(-8.2, 1.85, 0); cab.castShadow = true; train.add(cab);
    const cabWin = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.8, 2.54), new THREE.MeshBasicMaterial({ color: "#ffd98d" }));
    cabWin.position.set(-8.2, 2.35, 0); train.add(cabWin);
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.0, 10), locoM);
    chim.position.set(-13.2, 2.85, 0); train.add(chim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), trimM);
    dome.position.set(-11.6, 2.5, 0); train.add(dome);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 2.3), trimM);
    frame.position.set(-11, 0.62, 0); train.add(frame);
    const wheelM = lam2({ color: "#1b1b1b" });
    for (const wx of [-13.4, -11.2, -9.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 14), wheelM);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.55, 1.1); train.add(wheel);
      const wheel2 = wheel.clone(); wheel2.position.z = -1.1; train.add(wheel2);
    }
    // three coaches
    this.winMat = new THREE.MeshBasicMaterial({ map: coachTex(), color: "#ffffff" });
    for (const off of [-2.5, 5, 12.5]) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.5, 2.55), lam2({ color: "#31473a" }));
      body.position.set(0, 1.8, 0); body.castShadow = true; car.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.28, 2.8), lam2({ color: "#22282a" }));
      roof.position.set(0, 3.18, 0); roof.castShadow = true; car.add(roof);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.28), this.winMat);
      band.position.set(0, 2.15, 1.29); car.add(band);
      const band2 = band.clone(); band2.rotation.y = Math.PI; band2.position.z = -1.29; car.add(band2);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.5, 2.3), lam2({ color: "#27392e" }));
      skirt.position.set(0, 0.42, 0); car.add(skirt);
      for (const wx of [-2.4, 2.4]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 12), wheelM);
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.48, 1.05); car.add(wheel);
        const wheel2 = wheel.clone(); wheel2.position.z = -1.05; car.add(wheel2);
      }
      car.position.set(off, 0.1, 0);
      train.add(car);
    }
    train.position.set(-6, 0.28, TRACK_Z);
    this.train = train;
    R.add(train);
    void r;
  }

  // ---------------- the Prague street + hotel (shot 2) ----------------
  private buildStreet(R: THREE.Group, r: () => number) {
    const cx = STREET[0], cz = STREET[2];
    const street = new THREE.Mesh(new THREE.PlaneGeometry(46, 9), lam2({ map: rep(cobble(), 10, 2) }));
    street.rotation.x = -Math.PI / 2; street.position.set(cx, 0.01, cz); street.receiveShadow = true; R.add(street);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(46, 0.14, 2.6), lam2({ map: rep(stone("wintonWalk", ["#9a9284", "#8d8578", "#a39a8a", "#7d766a"]), 12, 1) }));
    walk.position.set(cx, 0.07, cz - 5.6); walk.receiveShadow = true; R.add(walk);
    // the hotel: a tall painted facade with lit windows + its sign
    const hotel = new THREE.Mesh(new THREE.BoxGeometry(17, 10.5, 1.2), lam2({ map: hotelTex() }));
    hotel.position.set(cx, 5.25, cz - 8.6); hotel.castShadow = true; hotel.receiveShadow = true; R.add(hotel);
    const hroof = new THREE.Mesh(new THREE.ConeGeometry(12.6, 3.0, 4), lam2({ color: "#5d4a3a", flatShading: true }));
    hroof.position.set(cx, 12.2, cz - 8.6); hroof.rotation.y = Math.PI / 4; hroof.scale.set(1, 1, 0.32); R.add(hroof);
    const hsign = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.15, 0.14), lam2({ map: signTex("HOTEL", "PRAHA", "wintonSignHotel")() }));
    hsign.position.set(cx, 7.6, cz - 7.9); R.add(hsign);
    // two narrower Prague houses either side
    for (const [hx, hw, col] of [[cx - 14.5, 9, "#8a6a52"], [cx + 14, 10, "#7d7468"]] as const) {
      const house = new THREE.Mesh(new THREE.BoxGeometry(hw, 8, 1.2), lam2({ color: col, map: rep(stone("wintonHouse" + hx, ["#a5937a", "#97836a", "#b09d83", "#87755c"]), 3, 3) }));
      house.position.set(hx, 4, cz - 8.6); house.castShadow = true; R.add(house);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.74, 2.4, 4), lam2({ color: "#54453a", flatShading: true }));
      rf.position.set(hx, 9.2, cz - 8.6); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.3); R.add(rf);
      for (let wi = 0; wi < 3; wi++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ color: "#f7e3ac" }));
        win.position.set(hx - hw / 3 + wi * (hw / 3), 5.4, cz - 7.95); R.add(win);
      }
    }
    // a pair of skis leaning by the hotel door — the holiday that wasn't
    const skiM = lam2({ color: "#a03c30" });
    for (const dx of [-0.3, 0.3]) {
      const ski = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.04), skiM);
      ski.position.set(cx - 3.4 + dx, 1.25, cz - 7.7); ski.rotation.z = dx * 0.35; R.add(ski);
    }
    this.lampPost(R, cx - 9, 0, cz - 4.4);
    this.lampPost(R, cx + 10, 0, cz - 4.4);
    void r;
  }

  // ---------------- the hotel corridor (shot 3) ----------------
  private buildCorridor(R: THREE.Group, r: () => number) {
    const cx = CORRIDOR[0], cz = CORRIDOR[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 9), lam2({ map: rep(planks(), 8, 2) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ color: "#c4ad83", map: rep(planks(), 8, 2) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(34, 5.4, 0.4), wallM);
    wall.position.set(cx, 2.7, cz - 4.2); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // doors along the wall, one of them Winton's room (open, lit)
    const doorM = lam2({ color: "#5d4430" });
    for (let i = 0; i < 5; i++) {
      const dx = cx - 13 + i * 6.5;
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.1, 0.14), doorM);
      door.position.set(dx, 1.55, cz - 3.95); R.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lam2({ color: "#c8a24a" }));
      knob.position.set(dx + 0.55, 1.5, cz - 3.85); R.add(knob);
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.1), new THREE.MeshBasicMaterial({ color: "#ffedb8" }));
    glow.position.set(cx + 13, 1.55, cz - 3.93); R.add(glow);
    // wall lamps
    for (const lx of [cx - 10, cx + 2, cx + 12]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffe9bb" }));
      bulb.position.set(lx, 3.6, cz - 3.9); R.add(bulb);
    }
    void r;
  }

  // ---------------- the hotel-room office (shot 4) ----------------
  private buildOffice(R: THREE.Group, r: () => number) {
    const cx = OFFICE[0], cz = OFFICE[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 13), lam2({ map: rep(planks(), 5, 3) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ color: "#bfae8d", map: rep(planks(), 5, 2) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(18, 5.2, 0.4), wallM);
    wall.position.set(cx, 2.6, cz - 4.6); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // the desk
    const woodM = lam2({ color: "#7a5a38", map: rep(planks(), 1, 1) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.5), woodM);
    top.position.set(cx, 0.82, cz - 2.6); top.castShadow = true; top.receiveShadow = true; R.add(top);
    for (const [dx, dz] of [[-2.1, -0.55], [2.1, -0.55], [-2.1, 0.55], [2.1, 0.55]] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodM);
      leg.position.set(cx + dx, 0.4, cz - 2.6 + dz); R.add(leg);
    }
    // stacks of paper on the desk — the paperwork of 669 lives
    const papM = lam2({ color: "#f2ede0" });
    for (const [px, ph] of [[-1.7, 0.34], [-1.15, 0.2], [1.5, 0.28], [0.4, 0.12]] as const) {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.62, ph, 0.45), papM);
      stack.position.set(cx + px, 0.87 + ph / 2, cz - 2.6); stack.rotation.y = px * 0.2; stack.castShadow = true; R.add(stack);
    }
    // the board of small photographs behind the desk
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.6, 0.1), lam2({ color: "#6d7a5d" }));
    board.position.set(cx + 0.4, 2.9, cz - 4.35); R.add(board);
    const cardM = new THREE.MeshBasicMaterial({ color: "#f5efdd" });
    const rr = rng(669);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), cardM);
      card.position.set(cx - 1.9 + col * 0.92, 3.6 - row * 0.95, cz - 4.28);
      card.rotation.z = (rr() - 0.5) * 0.09; R.add(card);
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), new THREE.MeshBasicMaterial({ color: "#c9bda6" }));
      head.position.set(cx - 1.9 + col * 0.92, 3.72 - row * 0.95, cz - 4.27); R.add(head);
    }
    // a window with winter light
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshBasicMaterial({ color: "#dfe9f2" }));
    win.position.set(cx - 6.4, 2.8, cz - 4.38); R.add(win);
    const winF = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 0.12), lam2({ color: "#5d4430" }));
    winF.position.set(cx - 6.4, 2.8, cz - 4.44); R.add(winF);
    void r;
  }

  // ---------------- the great map (shot 5) ----------------
  private buildMap(R: THREE.Group, r: () => number) {
    const cx = MAPWALL[0], cz = MAPWALL[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 12), lam2({ map: rep(planks(), 6, 3) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 10.5, 0.4), lam2({ color: "#8a7a63", map: rep(planks(), 6, 3) }));
    wall.position.set(cx, 5.25, cz - 5.2); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(17.4, 9.3, 0.18), lam2({ color: "#4c3a24" }));
    frame.position.set(cx, 4.7, cz - 4.95); R.add(frame);
    const map = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 8.5), new THREE.MeshBasicMaterial({ map: mapTex() }));
    map.position.set(cx, 4.7, cz - 4.84); R.add(map);
    void r;
  }

  // ---------------- the border gate (shot 9) ----------------
  private buildGate(R: THREE.Group, r: () => number) {
    const cx = GATE[0], cz = GATE[2];
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(17, 22), lam2({ map: rep(stone("wintonGateDirt", ["#8a7355", "#7d684c", "#95805f", "#6f5c42"]), 7, 7) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(cx, 0.005, cz); dirt.receiveShadow = true; R.add(dirt);
    // the track running away north, into the dark
    const railM = lam2({ color: "#8b9094" });
    for (const dx of [-0.75, 0.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 46), railM);
      rail.position.set(cx + dx, 0.16, cz + 8); R.add(rail);
    }
    const slpM = lam2({ color: "#4c3d2c" });
    for (let z = -12; z < 30; z += 1.7) {
      const slp = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.5), slpM);
      slp.position.set(cx, 0.1, cz + z); R.add(slp);
    }
    // the barrier: a post and a long striped arm, DOWN
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), lam2({ color: "#6e5136" }));
    post.position.set(cx - 3.2, 0.75, cz + 3); post.castShadow = true; R.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 0.22), lam2({ map: ctex("wintonArm", 512, 32, (g) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#e8e2d2" : "#b03a30"; g.fillRect(i * 64, 0, 64, 32); }
    }) }));
    arm.position.set(cx + 0.05, 1.32, cz + 3); arm.castShadow = true; R.add(arm);
    // a signal post with a red disc
    const sig = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 7), lam2({ color: "#33383c" }));
    sig.position.set(cx + 3.4, 1.6, cz + 3); R.add(sig);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), new THREE.MeshBasicMaterial({ color: "#c0272d" }));
    disc.position.set(cx + 3.4, 2.9, cz + 2.8); R.add(disc);
    // a small border hut + bare trees
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 2.8), lam2({ color: "#7a6248", map: rep(planks(), 2, 1) }));
    hut.position.set(cx - 6.5, 1.3, cz + 6); hut.castShadow = true; R.add(hut);
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.1, 4), lam2({ color: "#4e4038", flatShading: true }));
    hutRoof.position.set(cx - 6.5, 3.15, cz + 6); hutRoof.rotation.y = Math.PI / 4; R.add(hutRoof);
    const deadM = lam2({ color: "#3a342e" });
    for (const [tx, tz] of [[7.5, 10], [-9, 14], [10, 20]] as const) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 3.8, 7), deadM);
      trunk.position.set(cx + tx, 1.9, cz + tz); trunk.castShadow = true; R.add(trunk);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.5, 6), deadM);
      br.position.set(cx + tx + 0.4, 3.6, cz + tz); br.rotation.z = 0.7; R.add(br);
    }
    void r;
  }

  // ---------------- the English living room (shot 10) ----------------
  private buildHome(R: THREE.Group, r: () => number) {
    const cx = HOME[0], cz = HOME[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17, 0.2, 12), lam2({ map: rep(planks(), 5, 3) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), lam2({ color: "#8a4a42", map: rep(stone("wintonRug", ["#8a4a42", "#7d423c", "#955048", "#73403a"]), 4, 3) }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(cx - 0.5, 0.012, cz - 0.5); rug.receiveShadow = true; R.add(rug);
    const wallM = lam2({ color: "#c9b490", map: rep(planks(), 5, 2) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.4, 0.4), wallM);
    wall.position.set(cx, 2.7, cz - 4.8); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // the armchair: seat, back, two arms (his chair for fifty years)
    const chairM = lam2({ color: "#7a4a3a" });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.3), chairM);
    seat.position.set(cx - 1.5, 0.45, cz - 1.5); seat.castShadow = true; seat.receiveShadow = true; R.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.35), chairM);
    back.position.set(cx - 1.5, 1.3, cz - 2.05); back.castShadow = true; R.add(back);
    for (const dx of [-0.85, 0.85]) {
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 1.25), chairM);
      armR.position.set(cx - 1.5 + dx, 0.85, cz - 1.5); R.add(armR);
    }
    // a window onto a green garden + a clock that keeps the years
    const garden = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.8), new THREE.MeshBasicMaterial({ map: ctex("wintonGarden", 512, 384, (g) => {
      g.fillStyle = "#7fae5c"; g.fillRect(0, 0, 512, 384);
      g.fillStyle = "#679a48"; g.fillRect(0, 260, 512, 124);
      g.fillStyle = "#a5c8ee"; g.fillRect(0, 0, 512, 120);
      g.fillStyle = "#4a7a38"; g.beginPath(); g.arc(90, 210, 60, 0, 7); g.arc(420, 190, 74, 0, 7); g.fill();
    }) }));
    garden.position.set(cx + 3.6, 2.7, cz - 4.55); R.add(garden);
    const winF = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 0.14), lam2({ color: "#5d4430" }));
    winF.position.set(cx + 3.6, 2.7, cz - 4.62); R.add(winF);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ map: ctex("wintonClock", 256, 256, (g) => {
      g.fillStyle = "#f5efdd"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      g.strokeStyle = "#3a3a3a"; g.lineWidth = 6;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); g.stroke(); }
      g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 52, 128 - 40); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 18, 128 - 74); g.stroke();
    }) }));
    clock.position.set(cx - 5.2, 3.4, cz - 4.55); R.add(clock);
    // a side table with a framed photograph, face down for now
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), lam2({ color: "#7a5a38", map: rep(planks(), 1, 1) }));
    table.position.set(cx + 0.4, 0.62, cz - 1.7); R.add(table);
    const tleg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.6, 0.09), lam2({ color: "#7a5a38" }));
    tleg.position.set(cx + 0.4, 0.3, cz - 1.7); R.add(tleg);
    void r;
  }

  // ---------------- the attic (shot 11) ----------------
  private buildAttic(R: THREE.Group, r: () => number) {
    const cx = ATTIC[0], cz = ATTIC[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 11), lam2({ map: rep(planks(), 5, 3) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    // sloped roof planes meeting at a ridge
    const roofM = lam2({ color: "#6e5136", map: rep(planks(), 5, 2) });
    for (const sgn of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 6.4), roofM);
      roof.position.set(cx, 5.2, cz + sgn * 2.6); roof.rotation.x = -sgn * 0.62; roof.castShadow = true; R.add(roof);
    }
    const beamM = lam2({ color: "#54401f" });
    for (const bx of [-5.5, 0, 5.5]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 10.6), beamM);
      beam.position.set(cx + bx, 6.2, cz); R.add(beam);
    }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(16, 3.8, 0.4), lam2({ color: "#a68f68", map: rep(planks(), 5, 1) }));
    wall.position.set(cx, 1.9, cz - 5.2); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // crates and boxes, fifty years of an ordinary life
    const crateM = lam2({ color: "#8a6a48", map: rep(planks(), 1, 1) });
    for (const [bx, bz, s, ry] of [[-6.2, -3.4, 1.1, 0.2], [-6.0, -2.2, 0.8, -0.15], [5.8, -3.6, 1.2, 0.1], [6.1, -2.3, 0.85, 0.3], [3.4, 2.8, 0.9, -0.2]] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 1.0 * s, 1.3 * s), crateM);
      crate.position.set(cx + bx, 0.5 * s, cz + bz); crate.rotation.y = ry; crate.castShadow = true; R.add(crate);
    }
    // the trunk, lid open — where the scrapbook waited
    const trunkM = lam2({ color: "#5d4630" });
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 1.0), trunkM);
    trunk.position.set(cx + 0.2, 0.38, cz - 2.2); trunk.castShadow = true; R.add(trunk);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 1.0), trunkM);
    lid.position.set(cx + 0.2, 1.05, cz - 2.85); lid.rotation.x = -0.85; R.add(lid);
    // one hanging bulb
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 5), lam2({ color: "#2c2c2c" }));
    cord.position.set(cx, 5.35, cz - 0.5); R.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffdca8" }));
    bulb.position.set(cx, 4.45, cz - 0.5); R.add(bulb);
    void r;
  }

  // ---------------- the BBC studio (shots 12, 13) ----------------
  private buildStudio(R: THREE.Group, r: () => number) {
    const cx = STUDIO[0], cz = STUDIO[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 20), lam2({ color: "#3d3f4a", map: rep(stone("wintonStudioFloor", ["#3d3f4a", "#363845", "#454753", "#313340"]), 8, 5) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    // the great curtain
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(30, 11), new THREE.MeshBasicMaterial({ map: curtainTex(), side: THREE.DoubleSide }));
    curtain.position.set(cx, 5.5, cz + 8.6); R.add(curtain);
    // the stage platform + the guest's armchair
    const stageSlab = new THREE.Mesh(new THREE.BoxGeometry(13, 0.3, 5.4), lam2({ color: "#5a4632", map: rep(planks(), 4, 2) }));
    stageSlab.position.set(cx, 0.15, cz + 3.2); stageSlab.castShadow = true; stageSlab.receiveShadow = true; R.add(stageSlab);
    const chairM = lam2({ color: "#8a3038" });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.3), chairM);
    seat.position.set(cx, 0.75, cz + 3.4); seat.castShadow = true; seat.receiveShadow = true; R.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.35), chairM);
    back.position.set(cx, 1.6, cz + 4.0); back.castShadow = true; R.add(back);
    for (const dx of [-0.85, 0.85]) {
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 1.25), chairM);
      armR.position.set(cx + dx, 1.15, cz + 3.4); R.add(armR);
    }
    // audience risers: three long steps with simple seats
    const riserM = lam2({ color: "#4a4238" });
    const seatM = lam2({ color: "#5d6a7a" });
    // rows: [z, riser-top height] — cast.ts seats its audience to match
    const rows: [number, number][] = [[cz - 1.5, 0], [cz - 4.2, 0.55], [cz - 6.9, 1.1]];
    for (const [rz, ry] of rows) {
      const riser = new THREE.Mesh(new THREE.BoxGeometry(19, ry + 0.45, 2.5), riserM);
      riser.position.set(cx, (ry - 0.45) / 2 + 0.0, rz); riser.receiveShadow = true; R.add(riser);
      for (let i = 0; i < 8; i++) {
        const sx = cx - 7.7 + i * 2.2;
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.85), seatM);
        st.position.set(sx, ry + 0.21, rz + 0.3); R.add(st);
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.8, 0.14), seatM);
        bk.position.set(sx, ry + 0.6, rz + 0.78); R.add(bk);
      }
    }
    void r;
  }

  // ---------------- backdrop: Prague rooftops + far hills ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    // a Prague skyline silhouette behind the station
    const silM = lam2({ color: "#4c5a68", flatShading: true });
    for (let i = 0; i < 9; i++) {
      const bx = -60 + i * 15 + r() * 5, bh = 7 + r() * 6;
      const b = new THREE.Mesh(new THREE.BoxGeometry(9 + r() * 4, bh, 6), silM);
      b.position.set(bx, bh / 2 - 0.5, -118); R.add(b);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5 + r() * 3, 6), silM);
      spire.position.set(bx + 2, bh + 2, -118); R.add(spire);
    }
    const ridgeM = lam2({ color: "#5d7a8c", flatShading: true });
    const ridge2M = lam2({ color: "#476b52", flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + r() * 0.4, d = 210 + r() * 70;
      const h = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? ridgeM : ridge2M);
      h.scale.set(90 + r() * 60, 26 + r() * 14, 46 + r() * 20);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 10); R.add(h);
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
    const fogK = [3, 4, 5, 10, 11, 12, 13].includes(id) ? 2.1 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = s.light === "day" || s.light === "golden";
    this.skyStorm.visible = s.light === "storm";
    this.skyNight.visible = s.light === "night";
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(s.light === "storm" ? "#5a6675" : s.light === "night" ? "#2c3e58" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = s.light === "storm" ? 0.55 : s.light === "night" ? 0.25 : 0.92;
    }
    // the train: shot 1 + 8 it waits at the platform (windows lit
    // in shot 1, dark in shot 8); shot 6 it pulls away; shot 7 it
    // is long gone; everywhere else it waits off-stage
    if (this.train) {
      const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      if (id === 1 || id === 8) this.train.position.x = -6;
      else if (id === 6) this.train.position.x = trainX(uu);
      else if (id === 7) this.train.position.x = 170;
      else this.train.position.x = -420;
      this.train.position.z = TRACK_Z;
      if (this.winMat) this.winMat.color.set(id === 8 ? "#46525e" : "#ffffff");
    }
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
