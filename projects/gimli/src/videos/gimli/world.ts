// The Gimli Glider film as one three.js scene: THREE places in one
// world. (1) The Montreal apron at the origin — tarmac, terminal,
// a fuel truck, and the brand-new Boeing 767 at the gate. (2) The
// silent sky around SKY_C — the same jet gliding over patchwork
// prairie far below, cloud sea at its belly. (3) Gimli at +X — a
// decommissioned runway on drag-race day: start-line tree, two drag
// cars, crowd rails, tents — and the jet coming in dead-stick.
// VISUAL CORE: bright cool daylight, white + red livery, textured
// everything (anti-banding: speckled sky, flecked tarmac, patchwork
// fields). Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, PLANE_PARK, TRUCK, SKY_C, GIMLI_C, PLANE_LAND,
  DIE_T, TOUCH_T, STOP_T, clamp01, smooth,
} from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const tarmacTex = () => ctex("gimliTarmac", 512, 512, (g, r) => {
  g.fillStyle = "#7d8288"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "235,238,240" : "40,44,50"},${0.03 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(52,56,62,${0.10 + r() * 0.12})`; g.beginPath(); g.arc(r() * 512, r() * 512, 8 + r() * 26, 0, 7); g.fill(); } // oil stains
  g.strokeStyle = "rgba(240,240,235,0.5)"; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } // slab joints
});
const runwayTex = () => ctex("gimliRunway", 512, 512, (g, r) => {
  g.fillStyle = "#6e7276"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "225,228,230" : "38,40,44"},${0.03 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,30,32,${0.05 + r() * 0.09})`; g.fillRect(r() * 512, r() * 512, 3 + r() * 22, 2 + r() * 5); } // rubber streaks
});
const fuselageTex = () => ctex("gimliFuse", 1024, 512, (g, r) => {
  // u = around the tube (sides at u 0.0 and 0.5), v = along the length
  g.fillStyle = "#f4f5f6"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "120,128,138"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 512, 2.2, 2.2); }
  g.fillStyle = "#c0272d"; // the red cheatline bands on both flanks
  for (const x0 of [-30, 482]) g.fillRect(x0, 0, 60, 512);
  g.fillStyle = "#232c3c"; // window dots running the length, both sides
  for (const cx of [0, 512]) for (let y = 44; y < 480; y += 25) { g.beginPath(); g.arc(cx + (cx === 0 ? 0 : 0), y, 5.5, 0, 7); g.fill(); }
  g.fillStyle = "rgba(35,44,60,0.85)"; // door outlines fore + aft, both sides
  for (const cx of [0, 512]) for (const y of [58, 440]) g.fillRect(cx - 3, y, 6, 34);
});
const tailTex = () => ctex("gimliTail", 256, 256, (g, r) => {
  g.fillStyle = "#c0272d"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.fillStyle = "#f4f5f6"; g.beginPath(); g.arc(128, 118, 62, 0, 7); g.fill();
  g.fillStyle = "#c0272d"; // a simple maple-leaf-ish star burst in the disc
  g.save(); g.translate(128, 118);
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -8); g.lineTo(9, 6); g.lineTo(-9, 6); g.closePath(); g.fill(); }
  g.fillRect(-4, 8, 8, 26); g.restore();
});
const signTex = (key: string, text: string, bg: string, fg: string, fs = 58) => ctex(key, 1024, 160, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 160);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "30,20,12"},${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 160, 2, 2); }
  g.fillStyle = fg; g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 512, 84);
});
const nameTex = () => ctex("gimliName", 1024, 128, (g, r) => {
  g.clearRect(0, 0, 1024, 128);
  g.fillStyle = "#c0272d"; g.font = "900 84px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("AIR CANADA", 512, 68);
  void r;
});
const blobTex = () => ctex("gimliBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("gimliSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2e6cd2"); grad.addColorStop(0.45, "#5f9be4"); grad.addColorStop(0.78, "#a8cbF0".toLowerCase()); grad.addColorStop(1, "#dcebf7");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("gimliSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060f26"); grad.addColorStop(0.45, "#0d2148"); grad.addColorStop(0.78, "#1d3a68"); grad.addColorStop(1, "#2a4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; const s = r() > 0.92 ? 3.2 : 1.8; g.fillRect(r() * 2048, r() * 700, s, s); }
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A cartoon 767: white tube, red cheatline + tail, two fans under
 *  a swept wing. Origin at ground level under the fuselage centre;
 *  nose toward +X. Nose gear is its own group so it can fold. */
const makePlane = () => {
  const g = new THREE.Group();
  const white = lam2({ map: fuselageTex() });
  const red = lam2({ color: "#c0272d" });
  const dark = lam2({ color: "#232c3c" });
  const metal = lam2({ color: "#aeb6c0" });
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 16.5, 22), white);
  fuse.rotation.z = Math.PI / 2; fuse.position.set(0, 3.1, 0); fuse.castShadow = true; g.add(fuse);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 12), white);
  nose.scale.set(1.7, 1, 1); nose.position.set(8.25, 3.1, 0); nose.castShadow = true; g.add(nose);
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.55, 3.6, 16), white);
  tailCone.rotation.z = Math.PI / 2 - 0.18; tailCone.position.set(-9.6, 3.45, 0); g.add(tailCone);
  // cockpit glass: a dark sloped band at the nose top
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 1.9), dark);
  glass.position.set(9.15, 4.05, 0); glass.rotation.z = -0.38; g.add(glass);
  // AIR CANADA titles on both flanks
  for (const side of [1, -1]) {
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.8),
      new THREE.MeshBasicMaterial({ map: nameTex(), transparent: true, fog: false }));
    nm.position.set(5.2, 3.95, side * 1.57); if (side < 0) nm.rotation.y = Math.PI;
    nm.layers.set(NOINK); g.add(nm);
  }
  // wings: swept, slight dihedral, red-tipped
  for (const side of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 10.5), lam2({ color: "#e8eaec" }));
    wing.position.set(-0.6, 2.35, side * 6.2); wing.rotation.y = side * 0.42; wing.rotation.x = side * 0.05;
    wing.castShadow = true; g.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 1.4), red);
    tip.position.set(-2.9, 2.62, side * 11.2); tip.rotation.y = side * 0.42; g.add(tip);
    // engine: nacelle + dark intake + fan disc
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.72, 2.6, 14), metal);
    nac.rotation.z = Math.PI / 2; nac.position.set(1.15, 1.55, side * 4.6); nac.castShadow = true; g.add(nac);
    const intake = new THREE.Mesh(new THREE.CircleGeometry(0.68, 14), dark);
    intake.position.set(2.47, 1.55, side * 4.6); intake.rotation.y = Math.PI / 2; g.add(intake);
  }
  // tail: red fin with the maple disc + white stabilizers
  const fin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 0.18), lam2({ map: tailTex() }));
  fin.position.set(-9.3, 6.2, 0); fin.rotation.z = 0.35; fin.castShadow = true; g.add(fin);
  for (const side of [1, -1]) {
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.13, 4.4), lam2({ color: "#e8eaec" }));
    stab.position.set(-10.1, 4.35, side * 2.6); stab.rotation.y = side * 0.4; g.add(stab);
  }
  // main gears: two bogies with twin wheels
  for (const side of [1, -1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.5, 8), metal);
    strut.position.set(-0.6, 0.85, side * 1.7); g.add(strut);
    for (const dx of [-0.42, 0.42]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 12), dark);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(-0.6 + dx, 0.42, side * 1.7); g.add(wheel);
    }
  }
  // nose gear (folds on the Gimli landing)
  const noseGear = new THREE.Group();
  const nstrut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8), metal);
  nstrut.position.set(0, -0.8, 0); noseGear.add(nstrut);
  for (const dz of [-0.2, 0.2]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12), dark);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(0, -1.62, dz); noseGear.add(wheel);
  }
  noseGear.position.set(7.6, 1.75, 0); g.add(noseGear);
  return { group: g, noseGear };
};

/** a chunky cartoon drag car: low body, huge rear slicks, scoop */
const makeDragCar = (bodyCol: string) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.7), lam2({ color: bodyCol }));
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.3), lam2({ color: "#232c3c" }));
  cab.position.set(-0.4, 1.05, 0); g.add(cab);
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.8), lam2({ color: "#d8dce2" }));
  scoop.position.set(1.3, 1.0, 0); g.add(scoop);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 2.2), lam2({ color: "#232c3c" }));
  wingR.position.set(-2.2, 1.25, 0); g.add(wingR);
  const dark = lam2({ color: "#1c1f24" });
  for (const [x, z, r2] of [[1.5, 0.95, 0.34], [1.5, -0.95, 0.34], [-1.5, 1.0, 0.55], [-1.5, -1.0, 0.55]] as const) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, 0.3, 12), dark);
    w.rotation.x = Math.PI / 2; w.position.set(x, r2, z); g.add(w);
  }
  return g;
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
  private glowMats: THREE.MeshBasicMaterial[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private planePark: THREE.Group;
  private planeFly: THREE.Group;
  private planeLand: THREE.Group;
  private landNose: THREE.Group;
  private carA: THREE.Group;
  private carB: THREE.Group;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1983);
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
    this.skyNight = new THREE.Mesh(new THREE.SphereGeometry(679, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexNight(), side: THREE.BackSide, fog: false }));
    this.skyNight.layers.set(NOINK); this.skyNight.visible = false; R.add(this.skyNight);
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 11, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 220 + r() * 240;
      sp.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d);
      sp.scale.set(110 + r() * 70, 36 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    // the cloud sea under the sky shots: a raft of soft sprites
    // around SKY_C at y≈40 — altitude you can SEE
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(900 + i * 7, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      sp.position.set(SKY_C[0] - 90 + r() * 180, 38 + r() * 9, SKY_C[2] - 80 + r() * 160);
      sp.scale.set(46 + r() * 40, 13 + r() * 8, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    this.buildGround(R, r);
    this.buildApron(R, r);
    this.buildGimli(R, r);
    // ---- the three 767s (one per place) ----
    const pk = makePlane(); this.planePark = pk.group;
    this.planePark.position.set(...PLANE_PARK); R.add(this.planePark);
    const fl = makePlane(); this.planeFly = fl.group;
    this.planeFly.position.set(...SKY_C); this.planeFly.rotation.y = Math.PI; R.add(this.planeFly);
    const ln = makePlane(); this.planeLand = ln.group; this.landNose = ln.noseGear;
    this.planeLand.position.set(...PLANE_LAND); this.planeLand.rotation.y = Math.PI; R.add(this.planeLand);
    // the drag cars at the Gimli start line
    this.carA = makeDragCar("#d8542e"); this.carA.position.set(163, 0, 3.0); R.add(this.carA);
    this.carB = makeDragCar("#2e6cd2"); this.carB.position.set(163, 0, -3.0); this.carB.rotation.y = Math.PI; R.add(this.carB);
  }

  // ---------------- ground: prairie everywhere ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    // one vast grassland disc under all three places
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grass(), 120, 120) }));
    land.rotation.x = -Math.PI / 2; land.position.set(20, -0.09, 0); land.receiveShadow = true; R.add(land);
    // patchwork prairie fields far below the sky shots (west block)
    const fieldCols = ["#7aa24e", "#a8b45e", "#c2a558", "#8fae56", "#b5974a", "#74985a"];
    let fi = 0;
    for (let gx = 0; gx < 5; gx++) for (let gz = 0; gz < 4; gz++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(38, 34),
        lam2({ color: fieldCols[fi++ % fieldCols.length], map: rep(grass(), 8, 8) }));
      f.rotation.x = -Math.PI / 2;
      f.position.set(-248 + gx * 40, -0.05, -118 + gz * 36);
      R.add(f);
    }
    void r;
  }

  // ---------------- Montreal apron ----------------
  private buildApron(R: THREE.Group, r: () => number) {
    const tarmac = new THREE.Mesh(new THREE.PlaneGeometry(120, 74), lam2({ map: rep(tarmacTex(), 10, 6) }));
    tarmac.rotation.x = -Math.PI / 2; tarmac.position.set(0, 0.0, -4); tarmac.receiveShadow = true; R.add(tarmac);
    // painted stand lines + a yellow lead-in stripe to the gate
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(34, 0.5),
      new THREE.MeshBasicMaterial({ color: "#e8c832", fog: false }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.02, 1.5); stripe.layers.set(NOINK); R.add(stripe);
    // ---- the terminal: long slab, window band, tower ----
    const conc = lam2({ color: "#b9bcc0", map: rep(stone("gimliConc", ["#b9bcc0", "#a9adb3", "#c6c9cd", "#9a9ea6"]), 6, 2) });
    const term = new THREE.Mesh(new THREE.BoxGeometry(64, 9, 8), conc);
    term.position.set(-4, 4.5, -32); term.castShadow = true; term.receiveShadow = true; R.add(term);
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(62, 2.6, 0.2), lam2({ color: "#2c3e55" }));
    winBand.position.set(-4, 6.4, -27.9); R.add(winBand);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(66, 0.5, 9.5), lam2({ color: "#7e858e" }));
    roof.position.set(-4, 9.25, -32); R.add(roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.06),
      lam2({ map: signTex("gimliTermSign", "MONTREAL", "#2c3e55", "#f2ede2", 92) }));
    sign.position.set(-4, 3.1, -27.92); R.add(sign);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 15, 5), conc);
    tower.position.set(24, 7.5, -32); tower.castShadow = true; R.add(tower);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 6.4), lam2({ color: "#33506e" }));
    cab.position.set(24, 16.2, -32); R.add(cab);
    const cabRoof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.6, 4), lam2({ color: "#5a646e" }));
    cabRoof.position.set(24, 18.3, -32); cabRoof.rotation.y = Math.PI / 4; R.add(cabRoof);
    // jet bridge reaching toward the parked jet's front door
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 12), lam2({ color: "#c8ccd2" }));
    bridge.position.set(9.5, 3.3, -21); bridge.castShadow = true; R.add(bridge);
    const bridgeCol = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8), lam2({ color: "#7e858e" }));
    bridgeCol.position.set(9.5, 1.6, -17); R.add(bridgeCol);
    // ---- the fuel truck at TRUCK: cab + white tank + hose ----
    const truck = new THREE.Group(); truck.position.set(...TRUCK); truck.rotation.y = -0.5; R.add(truck);
    const cabT = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.8), lam2({ color: "#e8c832" }));
    cabT.position.set(2.6, 1.05, 0); cabT.castShadow = true; truck.add(cabT);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 4.6, 14), lam2({ color: "#eef0f2" }));
    tank.rotation.z = Math.PI / 2; tank.position.set(-0.6, 1.25, 0); tank.castShadow = true; truck.add(tank);
    const tankSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85),
      lam2({ map: signTex("gimliFuelSign", "JET FUEL", "#eef0f2", "#c0272d", 72) }));
    tankSign.position.set(-0.6, 1.3, 0.97); truck.add(tankSign);
    const dark = lam2({ color: "#1c1f24" });
    for (const [x, z] of [[2.6, 0.95], [2.6, -0.95], [-1.9, 0.95], [-1.9, -0.95]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 12), dark);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); truck.add(w);
    }
    // the hose: a fat black curve from the truck up to the wing
    const hosePts = [new THREE.Vector3(3.4, 0.8, 1.2), new THREE.Vector3(2.2, 0.25, -1.4),
      new THREE.Vector3(0.6, 0.3, -3.4), new THREE.Vector3(-0.4, 2.1, -5.2)];
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 20, 0.09, 7), dark);
    hose.position.copy(truck.position); R.add(hose);
    // cones + a baggage cart for apron life
    const coneM = lam2({ color: "#e86a2c" });
    for (const [x, z] of [[12, 4], [12, -14], [-13, 3], [-13, -15], [6, 8]] as const) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 10), coneM);
      cone.position.set(x, 0.43, z); cone.castShadow = true; R.add(cone);
    }
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.4), lam2({ color: "#4a7a9c" }));
    cart.position.set(-9, 0.75, 2); cart.castShadow = true; R.add(cart);
    blob(R, PLANE_PARK[0], 0.03, PLANE_PARK[2], 30, 15, 0.30);
    void r;
  }

  // ---------------- Gimli: the drag strip ----------------
  private buildGimli(R: THREE.Group, r: () => number) {
    const C = GIMLI_C;
    // the runway slab: x 106..198, z -7.5..7.5
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(92, 15), lam2({ map: rep(runwayTex(), 12, 2) }));
    slab.rotation.x = -Math.PI / 2; slab.position.set(C[0], 0.0, 0); slab.receiveShadow = true; R.add(slab);
    // centreline dashes + threshold bars
    const dashM = new THREE.MeshBasicMaterial({ color: "#f2f2ea", fog: false });
    for (let i = 0; i < 11; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.42), dashM);
      dash.rotation.x = -Math.PI / 2; dash.position.set(112 + i * 8.4, 0.02, 0); dash.layers.set(NOINK); R.add(dash);
    }
    for (const dz of [-4.5, -1.5, 1.5, 4.5]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.2), dashM);
      bar.rotation.x = -Math.PI / 2; bar.position.set(196, 0.02, dz); bar.layers.set(NOINK); R.add(bar);
    }
    // grass infield strips + a service road behind the south rail
    const road = new THREE.Mesh(new THREE.PlaneGeometry(100, 4), lam2({ map: rep(tarmacTex(), 12, 1) }));
    road.rotation.x = -Math.PI / 2; road.position.set(C[0], -0.02, 16); road.receiveShadow = true; R.add(road);
    // crowd rails both sides
    const railM = lam2({ color: "#c8ccd2" });
    for (const side of [1, -1]) for (let i = 0; i < 12; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 6), railM);
      post.position.set(112 + i * 7.6, 0.52, side * 10.5); R.add(post);
    }
    for (const side of [1, -1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(86, 0.07, 0.07), railM);
      rail.position.set(C[0], 1.05, side * 10.5); R.add(rail);
      const rail2 = rail.clone(); rail2.position.y = 0.6; R.add(rail2);
    }
    // the drag start-line tree: pole + staged light dots
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 8), lam2({ color: "#3a3f46" }));
    pole.position.set(166, 1.7, 0); pole.castShadow = true; R.add(pole);
    const treeBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.3), lam2({ color: "#23262b" }));
    treeBox.position.set(166, 3.6, 0); R.add(treeBox);
    const dotCols = ["#ffd94a", "#ffd94a", "#7ddc5a", "#e84a3c"];
    dotCols.forEach((col, i) => {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10),
        new THREE.MeshBasicMaterial({ color: col, fog: false }));
      dot.position.set(166, 4.14 - i * 0.36, 0.17); dot.layers.set(NOINK); R.add(dot);
      const dot2 = dot.clone(); dot2.position.z = -0.17; dot2.rotation.y = Math.PI; R.add(dot2);
      this.glowMats.push(dot.material as THREE.MeshBasicMaterial);
    });
    // tents + a windsock + the old hangar far behind the north rail
    const tentCols = ["#e8542e", "#2e7ad8", "#e8c832"];
    tentCols.forEach((col, i) => {
      const tx = 128 + i * 22;
      const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.9, 4), lam2({ color: col }));
      tent.position.set(tx, 0.95, -14.5); tent.rotation.y = Math.PI / 4; tent.castShadow = true; R.add(tent);
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 3.4), lam2({ color: "#eef0f2" }));
      base.position.set(tx, 0.35, -14.5); R.add(base);
    });
    const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 7), railM);
    sockPole.position.set(118, 2.6, -11); R.add(sockPole);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 9), lam2({ color: "#e86a2c" }));
    sock.rotation.z = Math.PI / 2 - 0.25; sock.position.set(119.2, 5.0, -11); R.add(sock);
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 10), lam2({ color: "#8a929c", map: rep(stone("gimliHangar", ["#8a929c", "#7c848e", "#969ea8", "#727a84"]), 4, 2) }));
    hangar.position.set(150, 3, -30); hangar.castShadow = true; R.add(hangar);
    const hroof = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 20, 12, 1, false, 0, Math.PI), lam2({ color: "#6a727c" }));
    hroof.rotation.z = Math.PI / 2; hroof.rotation.y = Math.PI / 2; hroof.position.set(150, 6, -30); R.add(hroof);
    // the evacuation slide, ready on the strip side of the landed jet
    const slide = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 1.5), lam2({ color: "#e8c832" }));
    slide.position.set(PLANE_LAND[0] - 6.4, 1.15, 2.6); slide.rotation.z = 0.42; slide.rotation.y = 0.5;
    slide.name = "evacSlide"; R.add(slide);
    blob(R, PLANE_LAND[0], 0.03, PLANE_LAND[2], 30, 15, 0.30);
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
    // sky shots + the Gimli aerial need to see much farther
    const fogK = id === 1 || id === 5 || id === 6 ? 2.4 : id === 7 ? 1.9 : id === 2 || id === 10 ? 1.5 : 1;
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
    // ---------------- the planes + cars, posed per shot ----------------
    this.planePark.visible = id === 2 || id === 3 || id === 4;
    this.planeFly.visible = id === 1 || id === 5 || id === 6;
    if (this.planeFly.visible) {
      // the dead-stick glide: a slow wallow, nose a touch high,
      // wings rocking gently — and at DIE_T (shot 5) one shudder
      const bob = Math.sin(tt * 1.4) * 0.35, rock = Math.sin(tt * 0.9) * 0.03;
      let jx = 0, jy = 0;
      if (id === 5) {
        const u = (tt - DIE_T) / 0.55;
        if (u >= 0 && u < 1) { const dcy = (1 - u) * 0.09; jx = Math.sin(tt * 88) * dcy; jy = Math.cos(tt * 79) * dcy; }
      }
      this.planeFly.position.set(SKY_C[0] + jx, SKY_C[1] + bob + jy, SKY_C[2]);
      this.planeFly.rotation.set(0, Math.PI, 0.045 + rock);
    }
    this.planeLand.visible = id === 7 || id === 8 || id === 9 || id === 10;
    if (this.planeLand.visible) {
      if (id === 7) {
        // a speck in the haze, high over the strip's east end
        this.planeLand.position.set(196, 17, -6);
        this.planeLand.rotation.set(0, Math.PI, 0.05);
        this.landNose.rotation.x = 0;
      } else if (id === 8) {
        // the arrival: descend from (202, 12.5) to touchdown at
        // TOUCH_T (x≈168), roll out decelerating to PLANE_LAND by
        // STOP_T, then the nose gear folds and the nose drops
        const tApp = TOUCH_T - 2.3, tTouch = TOUCH_T, tStop = STOP_T;
        let x: number, y: number, pitch = 0.03;
        if (tt < tTouch) {
          const u = clamp01((tt - tApp) / (tTouch - tApp));
          x = 202 - 34 * u; y = 12.5 * (1 - u * u); pitch = 0.055 * (1 - u) + 0.01;
        } else {
          const u = clamp01((tt - tTouch) / (tStop - tTouch));
          const dec = 1 - (1 - u) ** 2;
          x = 168 - 18 * dec; y = 0; pitch = 0.01 * (1 - u);
        }
        const collapse = smooth(clamp01((tt - (tStop - 0.15)) / 0.55));
        this.planeLand.position.set(x, -0.28 * collapse, 0);
        this.planeLand.rotation.set(0, Math.PI, pitch + 0.052 * collapse);
        this.landNose.rotation.x = -1.9 * collapse; // folds back under the nose
        // the drag cars BOLT sideways as the giant drops in
        const flee = smooth(clamp01((tt - (tTouch - 0.85)) / 0.8));
        this.carA.position.set(163 + 13 * flee, 0, 3.0 + 13.5 * flee);
        this.carA.rotation.y = -0.5 * flee;
        this.carB.position.set(163 + 9 * flee, 0, -3.0 - 13.5 * flee);
        this.carB.rotation.y = Math.PI + 0.45 * flee;
      } else {
        this.planeLand.position.set(PLANE_LAND[0], -0.28, PLANE_LAND[2]);
        this.planeLand.rotation.set(0, Math.PI, 0.052);
        this.landNose.rotation.x = -1.9;
        this.carA.position.set(176, 0, 16.5); this.carA.rotation.y = -0.5;
        this.carB.position.set(172, 0, -16.5); this.carB.rotation.y = Math.PI + 0.45;
      }
    }
    this.carA.visible = this.carB.visible = id === 7 || id === 8 || id === 9 || id === 10;
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
