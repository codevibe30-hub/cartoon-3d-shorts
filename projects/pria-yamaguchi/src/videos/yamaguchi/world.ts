// "Pria Ini Kena Dua Bom Atom Dan Tetap Hidup🤫" as one three.js
// scene: a 1945 Hiroshima street, the burnt ruins + air-raid shelter
// east, a station with a working train south, and Nagasaki west —
// the Mitsubishi office interior, a rebuilt street, a plaza.
// DASIMAN-style sets: bright, simple, uncluttered — clean low-poly
// shapes with painted textures, layered light rig (sun key with soft
// shadows + hemisphere fill + rim), NO ink pass on the world.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, trainOff, RUINS, NOFF, PLAZA } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const ashTex = () => ctex("yamaAsh", 512, 512, (g, r) => {
  g.fillStyle = "#7d7468"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "168,158,144" : "70,64,58"},${0.05 + r() * 0.09})`; g.fillRect(r() * 512, r() * 512, 2.6, 2.6); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(52,48,44,0.5)`; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 9, 0, 7); g.fill(); }
});
const citySkyTex = () => ctex("yamaCitySky", 1024, 384, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, "#7fb2e8"); grad.addColorStop(0.7, "#c4dcf2"); grad.addColorStop(1, "#e8eef0");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 384);
  g.fillStyle = "#5d7186";
  let x = 0;
  while (x < 1024) { const w = 40 + r() * 90, h = 90 + r() * 170; g.fillRect(x, 384 - h, w, h); x += w + 6 + r() * 30; }
  g.fillStyle = "#48586a"; g.fillRect(0, 356, 1024, 28);
});
const trainTex = (door: boolean) => ctex(door ? "yamaTrainDoor" : "yamaTrain", 1024, 256, (g, r) => {
  g.fillStyle = "#46584e"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#39493f"; g.fillRect(0, 196, 1024, 60);
  g.fillStyle = "#e8dfae";
  for (let i = 0; i < 6; i++) { if (door && i === 2) continue; g.fillRect(52 + i * 164, 52, 104, 74); }
  g.fillStyle = "#2c3630"; for (let i = 0; i < 6; i++) { if (door && i === 2) continue; g.strokeStyle = "#232b26"; g.lineWidth = 6; g.strokeRect(52 + i * 164, 52, 104, 74); }
  if (door) { g.fillStyle = "#14181a"; g.fillRect(380, 30, 120, 200); g.fillStyle = "#e8dfae"; g.fillRect(392, 44, 96, 60); }
  g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, 0, 1024, 26);
  void r;
});
const blobTex = () => ctex("yamaBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("yamaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("yamaSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1a0f0a"); grad.addColorStop(0.45, "#33190e"); grad.addColorStop(0.78, "#572a12"); grad.addColorStop(1, "#7a3c16");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.4})`; const s = r() > 0.92 ? 3.0 : 1.7; g.fillRect(r() * 2048, r() * 500, s, s); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,180,120" : "20,10,6"},${0.02 + r() * 0.04})`; g.fillRect(r() * 2048, r() * 1024, 2.4, 2.4); }
});

const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private skyNight: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private train: THREE.Group | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1945);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#7a9a58", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyNight = new THREE.Mesh(new THREE.SphereGeometry(679, 28, 18),
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
    this.buildHiroshima(R, r);
    this.buildRuins(R, r);
    this.buildStation(R, r);
    this.buildOffice(R, r);
    this.buildNagasaki(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- ground ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(360, 28), lam2({ map: rep(stone("yamaGround", ["#a89a80", "#9c8c72", "#b3a48a", "#8f8069"]), 120, 120) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    // Hiroshima street: an asphalt strip along Z
    const street = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 74), lam2({ color: "#8f8d88", map: rep(stone("yamaAsphalt", ["#8f8d88", "#83817d", "#9a9894", "#7a7874"]), 2, 20) }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0.006, 6); street.receiveShadow = true; R.add(street);
    // the ruins: ash and rubble as far as the eye goes
    const ash = new THREE.Mesh(new THREE.CircleGeometry(30, 24), lam2({ map: rep(ashTex(), 9, 9) }));
    ash.rotation.x = -Math.PI / 2; ash.position.set(RUINS[0], 0.008, RUINS[2]); ash.receiveShadow = true; R.add(ash);
    // Nagasaki office floor (wood) + plaza paving
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.24, 14.5), lam2({ map: rep(planks(), 5, 4) }));
    floor.position.set(NOFF[0], -0.12, NOFF[2] - 0.5); floor.receiveShadow = true; R.add(floor);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 26), lam2({ map: rep(stone("yamaPlaza", ["#b5a88f", "#ab9d82", "#bfb198", "#a1927a"]), 8, 8) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(PLAZA[0], 0.006, PLAZA[2]); plaza.receiveShadow = true; R.add(plaza);
    void r;
  }

  // ---------------- Hiroshima: an ordinary 1945 street ----------------
  private buildHiroshima(R: THREE.Group, r: () => number) {
    const wallM = (i: number) => lam2({ color: ["#cdbfa5", "#bfb49b", "#d3c6ae", "#b3a58c", "#c6b491"][i % 5], map: rep(stone(`yamaWall${i % 3}`, ["#cdbfa5", "#bfb096", "#d8cbb2", "#ab9c80"]), 2, 2) });
    const roofM = lam2({ color: "#5d6066", map: rep(stone("yamaRoofTile", ["#5d6066", "#52555c", "#686b71", "#484b51"]), 3, 1) });
    const house = (x: number, z: number, w: number, h: number, d: number, i: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM(i));
      b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; R.add(b);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, h * 0.34, 4), roofM);
      roof.position.set(x, h + h * 0.17, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; R.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.08), lam2({ color: "#4a3520" }));
      door.position.set(x + (x < 0 ? w / 2 + 0.03 : -w / 2 - 0.03), 0.95, z + (i % 3 - 1) * 1.2); door.rotation.y = Math.PI / 2; R.add(door);
    };
    let i = 0;
    for (const z of [-16, -7, 2, 12, 22]) { house(-8.6, z, 6.5, 5.2 + (i % 3), 7.5, i++); house(8.8, z + 3.5, 6.5, 4.8 + ((i + 1) % 3), 7.5, i++); }
    // the Mitsubishi shipyard office, bigger, at the north end
    const hq = new THREE.Mesh(new THREE.BoxGeometry(13, 8.5, 8), wallM(2));
    hq.position.set(-1, 4.25, -24); hq.castShadow = true; hq.receiveShadow = true; R.add(hq);
    const hqRoof = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.5, 8.8), roofM);
    hqRoof.position.set(-1, 8.75, -24); hqRoof.castShadow = true; R.add(hqRoof);
    // utility poles along the street
    const poleM = lam2({ color: "#5d4630" });
    for (const z of [-12, 0, 12, 24]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 6.4, 7), poleM);
      p.position.set(4.6, 3.2, z); p.castShadow = true; R.add(p);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.09), poleM);
      bar.position.set(4.6, 5.9, z); R.add(bar);
    }
    // the docks, far south: two crane frames over the water line
    const craneM = lam2({ color: "#6e4a2e" });
    for (const cx of [-5.5, 6]) {
      for (const dz of [0, 5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 11, 0.35), craneM);
        leg.position.set(cx, 5.5, 40 + dz); leg.castShadow = true; R.add(leg);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 7.5), craneM);
      beam.position.set(cx, 10.6, 42.5); R.add(beam);
      const jib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 9), craneM);
      jib.position.set(cx, 10.2, 45); jib.rotation.x = 0.35; R.add(jib);
    }
    void r;
  }

  // ---------------- the ruins + the shelter ----------------
  private buildRuins(R: THREE.Group, r: () => number) {
    const charM = lam2({ color: "#3a342e", map: rep(stone("yamaChar", ["#3a342e", "#443c34", "#322c26", "#4c443a"]), 1, 2) });
    const rubM = lam2({ color: "#8a8074", map: rep(stone("yamaRubble", ["#8a8074", "#7a7264", "#968a7a", "#6e665a"]), 2, 2) });
    // skeletal frames of burnt houses: posts + beams, nothing else left
    const frame = (x: number, z: number, ry: number, tilt: number) => {
      const g = new THREE.Group();
      for (const [px, pz] of [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]] as const) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), charM);
        post.position.set(px, 1.8, pz); post.castShadow = true; g.add(post);
      }
      for (const pz of [-1.8, 1.8]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 0.2), charM);
        beam.position.set(0, 3.55, pz); g.add(beam);
      }
      const fallen = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 0.18), charM);
      fallen.position.set(0.4, 0.35, 0.4); fallen.rotation.z = 0.16; fallen.rotation.y = 0.5; g.add(fallen);
      g.position.set(x, 0, z); g.rotation.y = ry; g.rotation.z = tilt;
      R.add(g);
    };
    frame(70, -26, 0.3, 0.02); frame(90, -27, -0.4, -0.03); frame(88, -10, 0.9, 0.05); frame(69, -12, 0.1, -0.02);
    // rubble piles everywhere
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 4 + r() * 22;
      const x = RUINS[0] + Math.cos(a) * d, z = RUINS[2] + Math.sin(a) * d * 0.8;
      if (Math.hypot(x - 80, z + 19) < 5.5) continue; // keep the shelter mouth clear
      const pile = new THREE.Mesh(new THREE.SphereGeometry(0.8 + r() * 1.5, 8, 6), rubM);
      pile.scale.y = 0.38; pile.position.set(x, 0.05, z); pile.castShadow = true; pile.receiveShadow = true; R.add(pile);
    }
    // one standing wall fragment, leaning
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.4, 0.35), rubM);
    wall.position.set(93, 1.6, -19); wall.rotation.z = 0.07; wall.castShadow = true; R.add(wall);
    // THE SHELTER: a concrete air-raid shelter, mouth open to the south
    const concM = lam2({ color: "#9a958c", map: rep(stone("yamaConc", ["#9a958c", "#8d8880", "#a5a099", "#7f7a72"]), 2, 1) });
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.55, 4.6), concM);
    roofS.position.set(80, 2.75, -22.3); roofS.castShadow = true; roofS.receiveShadow = true; R.add(roofS);
    for (const sx of [-3.45, 3.45]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 4.6), concM);
      side.position.set(80 + sx, 1.25, -22.3); side.castShadow = true; R.add(side);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.5, 0.5), concM);
    back.position.set(80, 1.25, -24.4); back.castShadow = true; R.add(back);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshBasicMaterial({ color: "#0d0b09" }));
    dark.position.set(80, 1.22, -24.1); R.add(dark);
    // sandbag rows at the mouth
    const bagM = lam2({ color: "#8a7a58" });
    for (let i = 0; i < 7; i++) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), bagM);
      bag.scale.set(1.25, 0.55, 0.8); bag.position.set(76.6 + i * 1.05, 0.2, -19.6); bag.castShadow = true; R.add(bag);
    }
    void r;
  }

  // ---------------- the station + the train ----------------
  private buildStation(R: THREE.Group, r: () => number) {
    const concM = lam2({ color: "#a49e92", map: rep(stone("yamaPlat", ["#a49e92", "#98928a", "#aea898", "#8d887e"]), 6, 1) });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(38, 0.5, 4.6), concM);
    plat.position.set(31, 0.25, 58.6); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    // rails + sleepers
    const railM = lam2({ color: "#4c4c50" });
    for (const rz of [62.2, 63.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(84, 0.14, 0.12), railM);
      rail.position.set(31, 0.1, rz); R.add(rail);
    }
    const slpM = lam2({ color: "#5d4630" });
    for (let x = -8; x < 72; x += 1.6) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 2.6), slpM);
      s.position.set(x, 0.035, 63); R.add(s);
    }
    // a small station canopy + sign post
    const roofM = lam2({ color: "#6a7076" });
    for (const px of [22, 31, 40]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 7), slpM);
      post.position.set(px, 1.7, 59.9); post.castShadow = true; R.add(post);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 0.14, 3.4), roofM);
    canopy.position.set(31, 3.45, 59.2); canopy.castShadow = true; R.add(canopy);
    // THE TRAIN: three cars; the middle one carries the open door.
    // The group slides +X in update() during shot 6 (trainOff).
    const train = new THREE.Group();
    const mkCar = (cx: number, door: boolean) => {
      const car = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.9, 2.8), lam2({ map: trainTex(door) }));
      car.position.set(cx, 2.0, 63); car.castShadow = true; train.add(car);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.35, 3.0), lam2({ color: "#39423c" }));
      roof.position.set(cx, 3.6, 63); roof.castShadow = true; train.add(roof);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.6, 2.5), lam2({ color: "#2c332e" }));
      skirt.position.set(cx, 0.35, 63); train.add(skirt);
      for (const wx of [-3.4, 3.4]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 12), lam2({ color: "#232323" }));
        wheel.rotation.x = Math.PI / 2; wheel.position.set(cx + wx, 0.42, 62.1); train.add(wheel);
        const wheel2 = wheel.clone(); wheel2.position.z = 63.9; train.add(wheel2);
      }
    };
    mkCar(25.8, false); mkCar(35.8, true); mkCar(45.8, false);
    this.train = train;
    R.add(train);
    void r;
  }

  // ---------------- the Nagasaki office (interior set) ----------------
  private buildOffice(R: THREE.Group, r: () => number) {
    const cx = NOFF[0], cz = NOFF[2];
    const wallM = lam2({ color: "#cfc4ae", map: rep(stone("yamaOfficeWall", ["#cfc4ae", "#c2b49c", "#dbcfba", "#b3a68e"]), 4, 1) });
    const woodM = lam2({ color: "#7a5a38", map: rep(planks(), 1, 1) });
    // back wall (z = cz-6.5) with THREE window openings
    const WZ = cz - 6.5;
    const band = (x: number, y: number, w: number, h: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), wallM);
      m.position.set(x, y, WZ); m.castShadow = true; m.receiveShadow = true; R.add(m);
    };
    band(cx, 0.5, 17.5, 1.0);            // below the windows
    band(cx, 3.85, 17.5, 0.75);          // above the windows
    for (const px of [-8.55, -3.1, 3.1, 8.55]) band(cx + px, 2.1, px === -8.55 || px === 8.55 ? 0.7 : 1.0, 2.2); // pillars
    // west wall (partial) + the glowing city beyond the windows
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 13.5), wallM);
    west.position.set(cx - 8.7, 2.1, cz - 0.2); west.castShadow = true; west.receiveShadow = true; R.add(west);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(16.4, 2.2), new THREE.MeshBasicMaterial({ map: citySkyTex() }));
    glass.position.set(cx, 2.1, WZ - 1.6); R.add(glass);
    // desks: the supervisor's big desk + two coworker desks
    const desk = (x: number, z: number, w: number) => {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 1.1), woodM);
      top.position.set(x, 0.78, z); top.castShadow = true; top.receiveShadow = true; R.add(top);
      for (const [dx, dz] of [[-w / 2 + 0.15, -0.42], [w / 2 - 0.15, -0.42], [-w / 2 + 0.15, 0.42], [w / 2 - 0.15, 0.42]] as const) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.76, 0.09), woodM);
        leg.position.set(x + dx, 0.38, z + dz); R.add(leg);
      }
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.36), lam2({ color: "#f2ede0" }));
      paper.position.set(x + w * 0.22, 0.86, z); paper.rotation.y = 0.3; R.add(paper);
      const paper2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.32), lam2({ color: "#e8e2d2" }));
      paper2.position.set(x - w * 0.28, 0.85, z + 0.1); paper2.rotation.y = -0.2; R.add(paper2);
    };
    desk(cx - 2.3, cz - 3.6, 2.6);   // the supervisor's desk
    desk(cx - 1.5, cz - 4.6, 1.7);   // coworker A (behind)
    desk(cx + 1.4, cz - 5.2, 1.7);   // coworker B (behind)
    void r;
  }

  // ---------------- Nagasaki rebuilt: street + plaza ----------------
  private buildNagasaki(R: THREE.Group, r: () => number) {
    const wallM = (i: number) => lam2({ color: ["#d8cfba", "#c4d2dc", "#dcc9b8", "#cbd8c2"][i % 4], map: rep(stone(`yamaNWall${i % 3}`, ["#d8cfba", "#c8bca4", "#e2d8c6", "#b8ab94"]), 2, 2) });
    const roofM = lam2({ color: "#707880" });
    const shop = (x: number, z: number, w: number, h: number, i: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6.5), wallM(i));
      b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; R.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, 7.1), roofM);
      roof.position.set(x, h + 0.18, z); roof.castShadow = true; R.add(roof);
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 1.5, 0.08), new THREE.MeshBasicMaterial({ color: "#f7e8b8" }));
      win.position.set(x + (x < -80 ? 3.3 : -3.3), 1.35, z); win.rotation.y = Math.PI / 2; R.add(win);
    };
    let i = 0;
    for (const z of [16, 24.5, 33]) { shop(-88.5, z, 6, 5 + (i % 2), i++); shop(-71.5, z + 3, 6, 5.5 + ((i + 1) % 2), i++); }
    // plaza trees + the lectern
    const trunkM = lam2({ color: "#6e4a2e" });
    const leafM = lam2({ color: "#4a9142", flatShading: true });
    for (const [tx, tz] of [[-89.5, 43], [-70.5, 42], [-89.5, 55], [-70.5, 56], [-84.5, 60]] as const) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 2.8, 7), trunkM);
      tr.position.set(tx, 1.4, tz); tr.castShadow = true; R.add(tr);
      const can = new THREE.Mesh(new THREE.SphereGeometry(1.45, 9, 7), leafM);
      can.position.set(tx, 3.6, tz); can.castShadow = true; R.add(can);
    }
    const lect = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.6), lam2({ color: "#5d4630", map: rep(planks(), 1, 1) }));
    lect.position.set(PLAZA[0], 0.63, PLAZA[2] - 3.4); lect.castShadow = true; R.add(lect);
    const lectTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.7), lam2({ color: "#4a3520" }));
    lectTop.position.set(PLAZA[0], 1.3, PLAZA[2] - 3.4); lectTop.rotation.x = -0.28; R.add(lectTop);
    void r;
  }

  // ---------------- backdrop: hills on the horizon ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    const hillM = lam2({ color: "#5d8a48", map: rep(grass(), 10, 4) });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5, d = 190 + r() * 80;
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillM);
      h.scale.set(70 + r() * 55, 15 + r() * 11, 30 + r() * 16);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 20); R.add(h);
    }
    const silM = lam2({ color: "#5d7186", flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r() * 0.3, d = 110 + r() * 30;
      const b = new THREE.Mesh(new THREE.BoxGeometry(6 + r() * 6, 9 + r() * 10, 6), silM);
      b.position.set(Math.cos(a) * d, 4, Math.sin(a) * d); R.add(b);
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
    const azOff = s.light === "golden" ? 58 : 0; // golden rakes in from the side, not dead-ahead
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
    const fogK = id === 2 || id === 3 || id === 6 || id === 11 || id === 12 ? 1.55 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    const night = s.light === "night";
    this.skyDay.visible = !night; this.skyNight.visible = night;
    const stormy = s.light === "storm";
    (this.skyDay.material as THREE.MeshBasicMaterial).color.set(stormy ? "#a9b7c4" : "#ffffff");
    for (const c2 of this.clouds) {
      c2.visible = !night;
      (c2.material as THREE.SpriteMaterial).color.set(stormy ? "#b9c4cf" : "#ffffff");
    }
    // the train pulls away during shot 6
    if (this.train) {
      const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      this.train.position.x = id === 6 ? trainOff(uu) : 0;
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
