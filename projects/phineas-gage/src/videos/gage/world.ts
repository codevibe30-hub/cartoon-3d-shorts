// "Pria Ini Kepalanya Ditembus Besi 1 Meter Dan Tetap Hidup🤫"
// as one three.js scene: a Vermont railroad cut in 1848 — the
// rock face, the drill bench, the half-built line — then the inn
// yard with the ox cart, a lamplit sickroom, a house yard, a
// village road, the dry hills of Chile with a stagecoach, a
// quiet museum hall, and a grassy knoll at golden hour.
// DASIMAN-style sets: bright, simple, uncluttered — clean
// low-poly shapes with painted textures, layered light rig (sun
// key with soft shadows + hemisphere fill + rim), NO ink pass.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, rodFlight, DRILL, BENCH_Y, ROD_LAND, SITE, INN, ROOM, HOME, ROAD, CHILE, MUSEUM, KNOLL } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted skies ----------------
const skyTexDay = () => ctex("gageSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("gageSkyStorm", 2048, 1024, (g, r) => {
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
const skyTexNight = () => ctex("gageSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060d1f"); grad.addColorStop(0.5, "#0d1c38"); grad.addColorStop(0.8, "#1d3358"); grad.addColorStop(1, "#2c4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,252,240,${0.25 + r() * 0.6})`; g.fillRect(r() * 2048, r() * 560, 1.8, 1.8); }
  const mn = g.createRadialGradient(420, 190, 6, 420, 190, 150);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(210,226,250,0.35)"); mn.addColorStop(1, "rgba(210,226,250,0)");
  g.fillStyle = mn; g.fillRect(240, 20, 380, 360);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 21, 0, 7); g.fill();
});
// the museum plaque
const plaqueTex = () => ctex("gagePlaque", 1024, 384, (g) => {
  g.fillStyle = "#3d3a36"; g.fillRect(0, 0, 1024, 384);
  g.fillStyle = "#2e2b28"; g.fillRect(0, 0, 1024, 22); g.fillRect(0, 362, 1024, 22);
  g.fillStyle = "#f2e7cd"; g.font = "900 92px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("PHINEAS GAGE", 512, 128);
  g.font = "700 64px Arial, sans-serif"; g.fillStyle = "#d9c9a4";
  g.fillText("· 1848 ·", 512, 248);
});
// a house facade: clapboard + windows + door
const houseTex = (key: string, wall: string) => () => ctex(key, 1024, 640, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 1024, 640);
  for (let y = 26; y < 640; y += 34) { g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(0, y, 1024, 4); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(60,44,26,${0.02 + r() * 0.03})`; g.fillRect(r() * 1024, r() * 640, 3, 3); }
  for (const x of [120, 700]) {
    g.fillStyle = "#f7e3ac"; g.fillRect(x, 120, 130, 170);
    g.strokeStyle = "#4c4238"; g.lineWidth = 8; g.strokeRect(x, 120, 130, 170);
    g.beginPath(); g.moveTo(x + 65, 120); g.lineTo(x + 65, 290); g.stroke();
  }
  g.fillStyle = "#4a3823"; g.fillRect(452, 300, 120, 340);
  g.fillStyle = "#f7e3ac"; g.fillRect(472, 330, 36, 52); g.fillRect(516, 330, 36, 52);
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
  private rod: THREE.Group | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1848);
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
    this.buildSite(R, r);
    this.buildInn(R, r);
    this.buildRoom(R, r);
    this.buildHome(R, r);
    this.buildRoad(R, r);
    this.buildChile(R, r);
    this.buildMuseum(R, r);
    this.buildKnoll(R, r);
    this.buildBackdrop(R, r);
    // ---- THE TAMPING IRON (animated in update) ----
    const rod = new THREE.Group();
    const ironM = lam2({ color: "#3f4448" });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.7, 8), ironM);
    shaft.castShadow = true; rod.add(shaft);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.012, 0.3, 8), ironM);
    tip.position.y = -0.98; rod.add(tip);
    this.rod = rod; R.add(rod);
  }

  private actor(i: number): Actor {
    while (this.actors.length <= i) this.actors.push(new Actor(this.root));
    return this.actors[i];
  }
  private fx(i: number): Fx {
    while (this.fxs.length <= i) this.fxs.push(new Fx(this.root));
    return this.fxs[i];
  }
  private tree(R: THREE.Group, x: number, z: number, s = 1, dry = false) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.6 * s, 7), lam2({ color: "#6e5136" }));
    trunk.position.set(x, 0.8 * s, z); trunk.castShadow = true; R.add(trunk);
    const fol = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 3.4 * s, 8), lam2({ color: dry ? "#8a7a3a" : "#4a9142", flatShading: true }));
    fol.position.set(x, (1.6 + 1.7) * s, z); fol.castShadow = true; R.add(fol);
    const fol2 = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 2.4 * s, 8), lam2({ color: dry ? "#9a8a44" : "#56a447", flatShading: true }));
    fol2.position.set(x, (1.6 + 3.1) * s, z); fol2.castShadow = true; R.add(fol2);
  }
  private house(R: THREE.Group, cx: number, cz: number, w: number, h: number, key: string, wall: string, ry = 0) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.8), lam2({ map: houseTex(key, wall)() }));
    body.position.set(0, h / 2, 0); body.castShadow = true; body.receiveShadow = true; grp.add(body);
    const roofM = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, h * 0.34, 4), lam2({ color: "#5d4a3a", flatShading: true }));
    roofM.position.set(0, h + h * 0.17, 0); roofM.rotation.y = Math.PI / 4; roofM.scale.set(1, 1, 0.24); grp.add(roofM);
    grp.position.set(cx, 0, cz); grp.rotation.y = ry;
    R.add(grp);
    return grp;
  }

  // ---------------- ground + backdrop ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(380, 28), lam2({ map: rep(grass(), 130, 130) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    // the works yard: packed dirt around the cut
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(30, 22), lam2({ map: rep(stone("gageDirt", ["#9a8563", "#8a7554", "#a8946e", "#7d6a4c"]), 16, 16) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, -0.03, -58); dirt.receiveShadow = true; R.add(dirt);
    // dry Chilean earth
    const dry = new THREE.Mesh(new THREE.CircleGeometry(34, 22), lam2({ map: rep(stone("gageDry", ["#c2a06b", "#b28f58", "#cdb07c", "#a37f4c"]), 16, 16) }));
    dry.rotation.x = -Math.PI / 2; dry.position.set(0, -0.03, 75); dry.receiveShadow = true; R.add(dry);
    void r;
  }
  private buildBackdrop(R: THREE.Group, r: () => number) {
    // a ring of soft green Vermont hills (dry brown behind Chile)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.2;
      const d = 190 + r() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d;
      const chileSide = z > 60 && Math.abs(x) < 160;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(60 + r() * 50, 12, 8),
        lam2({ color: chileSide ? "#a8845c" : "#6a9a52", flatShading: true }));
      hill.scale.y = 0.32 + r() * 0.14;
      hill.position.set(x, -6, z); R.add(hill);
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 60 + r() * 110;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 40 && z < -30 && z > -95) continue;   // keep the cut clear
      if (Math.abs(x - 80) < 22 && Math.abs(z + 30) < 20) continue;
      if (Math.abs(x + 80) < 22 && Math.abs(z - 30) < 20) continue;
      if (Math.abs(x - 85) < 24 && Math.abs(z - 115) < 22) continue;
      this.tree(R, x, z, 0.9 + r() * 0.9, z > 55);
    }
  }

  // ---------------- the railroad cut (shots 1-5, 9) ----------------
  private buildSite(R: THREE.Group, r: () => number) {
    // the rock face: a wall of grey stone the line will pierce
    const rockM = lam2({ map: rep(stone("gageRock", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 8, 4) });
    const face = new THREE.Mesh(new THREE.BoxGeometry(56, 15, 3), rockM);
    face.position.set(0, 7.5, -72.5); face.castShadow = true; face.receiveShadow = true; R.add(face);
    for (const [sx, sw] of [[-33, 14], [33, 14]] as const) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(sw, 10, 3), rockM);
      side.position.set(sx, 5, -72); side.rotation.y = sx < 0 ? 0.5 : -0.5; side.castShadow = true; R.add(side);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(58, 1.6, 5), lam2({ map: rep(grass(), 20, 2) }));
    cap.position.set(0, 15.4, -72.2); R.add(cap);
    // the bench the crew stands on, in front of the face
    const bench = new THREE.Mesh(new THREE.BoxGeometry(17, BENCH_Y, 7), lam2({ map: rep(stone("gageBench", ["#98907e", "#877e6e", "#a39a86", "#79705f"]), 8, 2) }));
    bench.position.set(1, BENCH_Y / 2, -66.5); bench.castShadow = true; bench.receiveShadow = true; R.add(bench);
    // the drill hole: a dark mouth in the bench top at DRILL
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), new THREE.MeshBasicMaterial({ color: "#14100c" }));
    hole.position.set(DRILL[0], BENCH_Y + 0.02, DRILL[2]); R.add(hole);
    // the finished track: two rails east-west + sleepers
    const railM = lam2({ color: "#9aa0a4" });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(95, 0.16, 4.4), lam2({ map: rep(stone("gageBallast", ["#5d5a55", "#4e4c48", "#6a675f", "#43413e"]), 22, 2) }));
    bed.position.set(0, 0.08, -58); bed.receiveShadow = true; R.add(bed);
    for (const dz of [-0.75, 0.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(95, 0.12, 0.09), railM);
      rail.position.set(0, 0.22, -58 + dz); R.add(rail);
    }
    const slpM = lam2({ color: "#4c3d2c" });
    for (let x = -46; x < 47; x += 1.7) {
      const slp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 2.3), slpM);
      slp.position.set(x, 0.18, -58); R.add(slp);
    }
    // the spur climbing to the bench
    for (let z = -64; z < -58; z += 1.7) {
      const slp = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.5), slpM);
      slp.position.set(-4, 0.1, z); R.add(slp);
    }
    for (const dx of [-0.75, 0.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 6.5), railM);
      rail.position.set(-4 + dx, 0.16, -61); R.add(rail);
    }
    // crates, barrels, a powder keg, tools of the trade
    const crateM = lam2({ map: rep(planks(), 1, 1) });
    for (const [cx, cz, ry] of [[-7.5, -62, 0.4], [-8.3, -63.2, 0.1], [11, -61, 0.8]] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateM);
      crate.position.set(cx, 0.55, cz); crate.rotation.y = ry; crate.castShadow = true; R.add(crate);
    }
    const kegM = lam2({ color: "#5d4630" });
    for (const [cx, cz] of [[-6.8, -61.2], [12.2, -62.4]] as const) {
      const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 10), kegM);
      keg.position.set(cx, 0.4, cz); keg.castShadow = true; R.add(keg);
    }
    const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), rockM);
    rock1.position.set(7.5, 0.3, -61.5); rock1.castShadow = true; R.add(rock1);
    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), rockM);
    rock2.position.set(-3.5, 0.2, -68.5); rock2.castShadow = true; R.add(rock2);
    void r;
  }

  // ---------------- the inn yard + ox cart (shot 6) ----------------
  private buildInn(R: THREE.Group, r: () => number) {
    const cx = INN[0], cz = INN[2];
    this.house(R, cx, cz - 9, 15, 7.5, "gageInn", "#b8a88e");
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(13, 18), lam2({ map: rep(stone("gageInnYard", ["#9a8563", "#8a7554", "#a8946e", "#7d6a4c"]), 10, 10) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(cx, -0.02, cz); dirt.receiveShadow = true; R.add(dirt);
    // ---- the ox cart: a wooden bed on two great wheels ----
    const cart = new THREE.Group();
    const woodM = lam2({ map: rep(planks(), 2, 1) });
    const bedM = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.9), woodM);
    bedM.position.y = 1.0; bedM.castShadow = true; cart.add(bedM);
    for (const sz of [-0.95, 0.95]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.1), woodM);
      side.position.set(0, 1.3, sz); cart.add(side);
    }
    const wheelM = lam2({ color: "#4c3d2c" });
    for (const sx of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 14), wheelM);
      wheel.rotation.z = Math.PI / 2; wheel.rotation.y = Math.PI / 2;
      wheel.position.set(sx, 0.95, 0); wheel.castShadow = true; cart.add(wheel);
    }
    for (const sz of [-0.8, 0.8]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), woodM);
      shaft.rotation.x = Math.PI / 2 - 0.12; shaft.position.set(0, 0.95, 2.2); shaft.position.x = sz * 0.6; cart.add(shaft);
    }
    cart.position.set(cx, 0, cz - 0.5); cart.rotation.y = 0.35;
    R.add(cart);
    // ---- the ox: patient, brown, horned ----
    const ox = new THREE.Group();
    const oxM = lam2({ color: "#7a5a40" });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 2.2), oxM);
    body.position.y = 1.45; body.castShadow = true; ox.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.8), oxM);
    head.position.set(0, 1.5, 1.45); head.castShadow = true; ox.add(head);
    const hornM = lam2({ color: "#e8e0cc" });
    for (const sx of [-0.42, 0.42]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 6), hornM);
      horn.position.set(sx, 1.86, 1.4); horn.rotation.z = sx < 0 ? 0.7 : -0.7; ox.add(horn);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 1.0, 6), oxM);
      leg.position.set(sx * 0.8, 0.5, 0.8); ox.add(leg);
      const leg2 = leg.clone(); leg2.position.z = -0.8; ox.add(leg2);
    }
    ox.position.set(cx + 0.9, 0, cz + 3.4); ox.rotation.y = 0.35 + Math.PI;
    R.add(ox);
    void r;
  }

  // ---------------- the sickroom (shot 7) ----------------
  private buildRoom(R: THREE.Group, r: () => number) {
    const cx = ROOM[0], cz = ROOM[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.15, 11), lam2({ map: rep(planks(), 5, 4) }));
    floor.position.set(cx, 0.02, cz); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ color: "#cbbfa6", map: rep(planks(), 6, 3) });
    const back = new THREE.Mesh(new THREE.BoxGeometry(13, 5.4, 0.3), wallM);
    back.position.set(cx, 2.7, cz - 5.5); back.receiveShadow = true; R.add(back);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.4, 11), wallM);
    sideL.position.set(cx - 6.5, 2.7, cz); R.add(sideL);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.4, 11), wallM);
    sideR.position.set(cx + 6.5, 2.7, cz); R.add(sideR);
    // the window: a bright kind light on the back wall
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), new THREE.MeshBasicMaterial({ color: "#ffeec2" }));
    win.position.set(cx - 3.4, 3.0, cz - 5.32); R.add(win);
    const winF = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.6, 0.08), lam2({ color: "#5d4a30" }));
    winF.position.set(cx - 3.4, 3.0, cz - 5.38); R.add(winF);
    // ---- the bed: frame, mattress, blanket, pillow ----
    const bedG = new THREE.Group();
    const frameM = lam2({ color: "#6e5136", map: rep(planks(), 2, 1) });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 3.6), frameM);
    base.position.y = 0.5; base.castShadow = true; bedG.add(base);
    const matt = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 3.5), lam2({ color: "#efe9db" }));
    matt.position.y = 0.8; bedG.add(matt);
    const blank = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.14, 2.2), lam2({ color: "#8a4a42" }));
    blank.position.set(0, 0.92, 0.55); bedG.add(blank);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.7), lam2({ color: "#f7f3e6" }));
    pillow.position.set(0, 0.98, -1.35); bedG.add(pillow);
    for (const [px, pz] of [[-0.85, -1.7], [0.85, -1.7], [-0.85, 1.7], [0.85, 1.7]] as const) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), frameM);
      post.position.set(px, 0.55, pz); bedG.add(post);
    }
    bedG.position.set(cx - 1.5, 0, cz - 2.4); bedG.rotation.y = 0.5;
    R.add(bedG);
    // a chair + a small table with a lamp and a basin
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), frameM);
    chair.position.set(cx + 0.8, 0.55, cz - 3.8); R.add(chair);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.8), frameM);
    table.position.set(cx - 3.6, 0.85, cz - 4.2); R.add(table);
    const lampB = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 8), lam2({ color: "#8a6a2f" }));
    lampB.position.set(cx - 3.6, 0.95, cz - 4.2); R.add(lampB);
    const lampG = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), new THREE.MeshBasicMaterial({ color: "#ffd9a0" }));
    lampG.position.set(cx - 3.6, 1.2, cz - 4.2); R.add(lampG);
    // ---- the plain coffin, waiting in the corner (kept quiet) ----
    const coff = new THREE.Group();
    const coffM = lam2({ color: "#7a6248", map: rep(planks(), 2, 1) });
    const cbody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 2.6), coffM);
    cbody.castShadow = true; coff.add(cbody);
    const ctop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 1.0), coffM);
    ctop.position.z = -0.75; coff.add(ctop);
    coff.position.set(cx + 4.6, 0.28, cz - 4.4); coff.rotation.y = -0.35;
    R.add(coff);
    void r;
  }

  // ---------------- the house yard (shot 8) ----------------
  private buildHome(R: THREE.Group, r: () => number) {
    const cx = HOME[0], cz = HOME[2];
    this.house(R, cx + 2, cz - 4, 11, 6, "gageHome", "#c4b49a");
    const porch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 2.2), lam2({ map: rep(planks(), 3, 1) }));
    porch.position.set(cx + 5.5, 0.17, cz - 0.5); porch.receiveShadow = true; R.add(porch);
    const fenceM = lam2({ color: "#8a7554" });
    for (let x = -9; x <= 9; x += 1.8) {
      if (Math.abs(x - 3) < 1.6) continue;
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 0.06), fenceM);
      picket.position.set(cx + x, 0.52, cz + 4.5); R.add(picket);
    }
    for (const fy of [0.35, 0.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.09, 0.05), fenceM);
      rail.position.set(cx, fy, cz + 4.5); R.add(rail);
    }
    this.tree(R, cx - 8, cz - 2, 1.2);
    void r;
  }

  // ---------------- the village road (shot 10) ----------------
  private buildRoad(R: THREE.Group, r: () => number) {
    const cx = ROAD[0], cz = ROAD[2];
    const road = new THREE.Mesh(new THREE.PlaneGeometry(46, 5), lam2({ map: rep(stone("gageRoad", ["#9a8563", "#8a7554", "#a8946e", "#7d6a4c"]), 14, 2) }));
    road.rotation.x = -Math.PI / 2; road.rotation.z = 0.5; road.position.set(cx, 0.0, cz); road.receiveShadow = true; R.add(road);
    const fenceM = lam2({ color: "#7d6a4c" });
    for (let i = -8; i <= 8; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), fenceM);
      const px = cx + i * 2.4, pz = cz + 5.2 - i * 1.28;
      post.position.set(px, 0.5, pz); R.add(post);
    }
    this.house(R, cx - 12, cz + 13, 9, 5.4, "gageRoadHouse", "#a89a80", 0.5);
    this.tree(R, cx + 10, cz + 6, 1.1);
    this.tree(R, cx - 4, cz + 8, 0.9);
    void r;
  }

  // ---------------- Chile + the stagecoach (shot 11) ----------------
  private buildChile(R: THREE.Group, r: () => number) {
    const cx = CHILE[0], cz = CHILE[2];
    const road = new THREE.Mesh(new THREE.PlaneGeometry(50, 5.4), lam2({ map: rep(stone("gageChileRoad", ["#b28f58", "#a37f4c", "#c2a06b", "#96754a"]), 14, 2) }));
    road.rotation.x = -Math.PI / 2; road.position.set(cx, 0.0, cz); road.receiveShadow = true; R.add(road);
    // ---- the stagecoach ----
    const coach = new THREE.Group();
    const coachM = lam2({ color: "#7a2e2a" });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 1.9), coachM);
    cab.position.y = 1.85; cab.castShadow = true; coach.add(cab);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 2.1), lam2({ color: "#4c3d2c" }));
    cabRoof.position.y = 2.9; coach.add(cabRoof);
    const winM = new THREE.MeshBasicMaterial({ color: "#ffd98d" });
    for (const sz of [-0.97, 0.97]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.8), winM);
      win.position.set(0.2, 2.05, sz); if (sz < 0) win.rotation.y = Math.PI; coach.add(win);
    }
    const wheelM = lam2({ color: "#3d2f22" });
    for (const [wx, wr] of [[-1.35, 0.62], [1.35, 0.62], [-1.35, 0.45], [1.35, 0.45]] as const) {
      for (const sz of [-1.0, 1.0]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.1, 12), wheelM);
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, wr, sz); wheel.castShadow = true; coach.add(wheel);
      }
    }
    // the driver's bench, up front
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.8), lam2({ color: "#5d4630", map: rep(planks(), 1, 1) }));
    bench.position.set(2.35, 2.3, 0); bench.castShadow = true; coach.add(bench);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.7), lam2({ color: "#5d4630" }));
    foot.position.set(2.6, 1.15, 0); coach.add(foot);
    // two horses, harnessed ahead
    const horseM = lam2({ color: "#5d4630" });
    const darkM = lam2({ color: "#3d2f22" });
    for (const sz of [-0.62, 0.62]) {
      const horse = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 0.62), horseM);
      body.position.y = 1.5; body.castShadow = true; horse.add(body);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), horseM);
      neck.position.set(1.15, 1.95, 0); neck.rotation.z = -0.5; horse.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.34, 0.36), horseM);
      head.position.set(1.55, 2.25, 0); head.rotation.z = -0.25; horse.add(head);
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.12), darkM);
      mane.position.set(1.05, 2.05, 0); mane.rotation.z = -0.5; horse.add(mane);
      for (const [lx, lz] of [[-0.7, -0.2], [-0.7, 0.2], [0.7, -0.2], [0.7, 0.2]] as const) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.1, 6), darkM);
        leg.position.set(lx, 0.55, lz); horse.add(leg);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.7, 6), darkM);
      tail.position.set(-1.05, 1.6, 0); tail.rotation.z = 0.5; horse.add(tail);
      horse.position.set(4.6, 0, sz); coach.add(horse);
    }
    coach.position.set(cx - 1, 0, cz);
    R.add(coach);
    // dry scrub + a dead tree
    this.tree(R, cx - 12, cz - 7, 0.8, true);
    this.tree(R, cx + 14, cz + 8, 0.7, true);
    void r;
  }

  // ---------------- the museum hall (shot 12) ----------------
  private buildMuseum(R: THREE.Group, r: () => number) {
    const cx = MUSEUM[0], cz = MUSEUM[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.15, 13), lam2({ map: rep(stone("gageMuseumFloor", ["#cbbfa6", "#bfb198", "#d8cdb6", "#b3a68c"]), 6, 5) }));
    floor.position.set(cx, 0.02, cz); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ color: "#a89a80", map: rep(planks(), 8, 3) });
    const back = new THREE.Mesh(new THREE.BoxGeometry(16, 6.4, 0.3), wallM);
    back.position.set(cx, 3.2, cz - 6.5); back.receiveShadow = true; R.add(back);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 13), wallM);
    sideL.position.set(cx - 8, 3.2, cz); R.add(sideL);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 13), wallM);
    sideR.position.set(cx + 8, 3.2, cz); R.add(sideR);
    // two columns
    const colM = lam2({ color: "#d8cdb6" });
    for (const sx of [-5.5, 5.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 6.2, 10), colM);
      col.position.set(cx + sx, 3.1, cz - 3); col.castShadow = true; R.add(col);
    }
    // ---- THE CASE: pedestal, glass, the skull and the iron ----
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), lam2({ color: "#4c4238" }));
    ped.position.set(cx, 0.55, cz - 1.5); ped.castShadow = true; R.add(ped);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.7, 1.3),
      new THREE.MeshBasicMaterial({ color: "#cfe4ef", transparent: true, opacity: 0.16, depthWrite: false }));
    glass.position.set(cx, 1.95, cz - 1.5); R.add(glass);
    const frameM = lam2({ color: "#2e2b28" });
    for (const ey of [1.12, 2.78]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.07, 1.36), frameM);
      rim.position.set(cx, ey, cz - 1.5); R.add(rim);
    }
    // the skull: a white cranium on a small stand, jaw below
    const skull = new THREE.Group();
    const boneM = lam2({ color: "#f2ecdc" });
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 12), boneM);
    cranium.scale.set(0.92, 1.05, 1.0); cranium.castShadow = true; skull.add(cranium);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.3), boneM);
    jaw.position.set(0, -0.33, 0.03); skull.add(jaw);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#241f18" });
    for (const sx of [-0.115, 0.115]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), eyeM);
      eye.position.set(sx, -0.03, 0.26); skull.add(eye);
    }
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.34, 8), frameM);
    stand.position.y = -0.55; skull.add(stand);
    skull.position.set(cx - 0.55, 1.98, cz - 1.5);
    R.add(skull);
    // the iron, standing tall beside the skull inside the case
    const miron = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 1.45, 8), lam2({ color: "#3f4448" }));
    miron.position.set(cx + 0.55, 1.95, cz - 1.5); miron.rotation.z = 0.06; R.add(miron);
    // the plaque on the pedestal front
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.71), lam2({ map: plaqueTex() }));
    plaque.position.set(cx, 0.62, cz - 0.78); R.add(plaque);
    void r;
  }

  // ---------------- the knoll (shot 13) ----------------
  private buildKnoll(R: THREE.Group, r: () => number) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), lam2({ map: rep(grass(), 8, 8) }));
    mound.scale.set(1, 0.22, 1); mound.position.set(KNOLL[0], -0.65, KNOLL[2]);
    mound.receiveShadow = true; R.add(mound);
    this.tree(R, KNOLL[0] - 5, KNOLL[2] - 3, 1.3);
    this.tree(R, KNOLL[0] + 6.5, KNOLL[2] + 2, 0.9);
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
    const azOff = s.light === "golden" ? 58 : 0;
    const az = THREE.MathUtils.degToRad(Lp.az + azOff), el = THREE.MathUtils.degToRad(Lp.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

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
    const fogK = [6, 7, 12].includes(id) ? 2.1 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = s.light === "day" || s.light === "golden";
    this.skyStorm.visible = s.light === "storm";
    this.skyNight.visible = s.light === "night";
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(s.light === "storm" ? "#5a6675" : s.light === "night" ? "#2c3e58" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = s.light === "storm" ? 0.55 : s.light === "night" ? 0.25 : 0.92;
    }
    // ---- THE TAMPING IRON ----
    if (this.rod) {
      const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      if (id === 1) {
        // the hook: the iron flies its arc and sticks in the dirt
        const p = rodFlight(clamp01(u * 1.15));
        this.rod.visible = true;
        this.rod.position.set(p[0], p[1] + 0.8, p[2]);
        this.rod.rotation.set(u * 2.2, 0, u * 4.4);
      } else if (id === 3 || (id === 4 && u < 0.34)) {
        // in the hole, bobbing with the tamping
        this.rod.visible = true;
        this.rod.position.set(DRILL[0], BENCH_Y + 0.75 + Math.sin(f * 0.33) * 0.16, DRILL[2]);
        this.rod.rotation.set(0, 0, 0.03);
      } else if (id === 4) {
        const p = rodFlight(clamp01((u - 0.34) / 0.66));
        this.rod.visible = true;
        this.rod.position.set(p[0], p[1] + 0.8, p[2]);
        this.rod.rotation.set(u * 2.2, 0, u * 4.4);
      } else if (id === 5) {
        // stuck in the dirt where it fell, tilted, still
        this.rod.visible = true;
        this.rod.position.set(ROD_LAND[0], 0.55, ROD_LAND[2]);
        this.rod.rotation.set(0.15, 0, 0.45);
      } else {
        this.rod.visible = false;
      }
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
