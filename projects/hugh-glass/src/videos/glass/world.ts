// "Pria Ini Diterkam Beruang, Ditinggal Mati, Lalu Merangkak
// Pulang🤫" as one three.js scene: the Grand River bank where a
// grizzly did her work, the brigade camp that left him, the
// empty plains he crawled, and Fort Kiowa at the end of the
// world. DASIMAN-style sets: bright, simple, uncluttered — clean
// low-poly shapes with painted textures, layered light rig (sun
// key with soft shadows + hemisphere fill + rim), NO ink pass on
// the world.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit } from "./build";
import { ctex, rep, rng, stone, bed, cloudHD, CLOUD_DAY, grass, planks, water } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, raftX, RIVER_Z, BEAR_BUSH, CAMP, GRAVE, FIRE, SIGNPOST, FORT, FORT_WALL_Z, GATE_X, RAFT_Z } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("glassSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("glassSkyStorm", 2048, 1024, (g, r) => {
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
const skyTexNight = () => ctex("glassSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060d1f"); grad.addColorStop(0.5, "#0d1c38"); grad.addColorStop(0.8, "#1d3358"); grad.addColorStop(1, "#2c4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,252,240,${0.25 + r() * 0.6})`; g.fillRect(r() * 2048, r() * 560, 1.8, 1.8); }
  const mn = g.createRadialGradient(420, 190, 6, 420, 190, 150);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(210,226,250,0.35)"); mn.addColorStop(1, "rgba(210,226,250,0)");
  g.fillStyle = mn; g.fillRect(240, 20, 380, 360);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 21, 0, 7); g.fill();
});
// the trail sign: two painted boards on a post
const signTex = (word: string, sub: string, key: string) => () => ctex(key, 1024, 320, (g) => {
  g.fillStyle = "#6e5136"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(0, 0, 1024, 22); g.fillRect(0, 298, 1024, 22);
  g.fillStyle = "#f2e7cd"; g.font = "900 118px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(word, 512, 120);
  g.font = "700 62px Arial, sans-serif"; g.fillStyle = "#e3d3a8";
  g.fillText(sub, 512, 240);
});
// an 1823 flag for the fort: stripes and a blue canton of dots
const flagTex = () => ctex("glassFlag", 512, 288, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#efe8da" : "#b03a30"; g.fillRect(0, i * 22.2, 512, 22.2); }
  g.fillStyle = "#2e3a5c"; g.fillRect(0, 0, 205, 156);
  g.fillStyle = "#efe8da";
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) { g.beginPath(); g.arc(18 + col * 34, 16 + row * 30, 4.5, 0, 7); g.fill(); }
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
  private raft: THREE.Group | null = null;
  private flame: THREE.Group | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1823);
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
    this.buildRiverbank(R, r);
    this.buildCamp(R, r);
    this.buildPrairie(R, r);
    this.buildFort(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- shared nature helpers ----------------
  private tree(R: THREE.Group, x: number, z: number, s = 1, dead = false) {
    const trunkM = lam2({ color: dead ? "#3a342e" : "#6e5136" });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.36 * s, 2.6 * s, 7), trunkM);
    trunk.position.set(x, 1.3 * s, z); trunk.castShadow = true; R.add(trunk);
    if (dead) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.08 * s, 1.6 * s, 6), trunkM);
      br.position.set(x + 0.45 * s, 3.0 * s, z); br.rotation.z = 0.7; R.add(br);
      const br2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.06 * s, 1.2 * s, 6), trunkM);
      br2.position.set(x - 0.4 * s, 3.3 * s, z + 0.2); br2.rotation.z = -0.8; R.add(br2);
      return;
    }
    const leafM = lam2({ color: "#4e7d3a" });
    const leaf2M = lam2({ color: "#5d8f42" });
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 12, 10), leafM);
    c1.position.set(x, 3.4 * s, z); c1.castShadow = true; R.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.05 * s, 10, 8), leaf2M);
    c2.position.set(x + 0.9 * s, 2.7 * s, z + 0.3 * s); c2.castShadow = true; R.add(c2);
    const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 10, 8), leaf2M);
    c3.position.set(x - 0.85 * s, 2.9 * s, z - 0.25 * s); R.add(c3);
  }
  private bush(R: THREE.Group, x: number, z: number, s = 1, dark = false) {
    const m = lam2({ color: dark ? "#3d6030" : "#527d3c" });
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * s, 10, 8), m);
    b1.position.set(x, 0.55 * s, z); b1.scale.y = 0.75; b1.castShadow = true; R.add(b1);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 9, 7), m);
    b2.position.set(x + 0.6 * s, 0.4 * s, z + 0.2 * s); b2.scale.y = 0.75; R.add(b2);
    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 9, 7), m);
    b3.position.set(x - 0.55 * s, 0.38 * s, z - 0.15 * s); b3.scale.y = 0.75; R.add(b3);
  }
  private rock(R: THREE.Group, x: number, z: number, s = 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 * s), lam2({ color: "#8d8578", flatShading: true }));
    rock.position.set(x, 0.22 * s, z); rock.rotation.set(x * 1.7, z * 2.3, 0.4); rock.castShadow = true; R.add(rock);
  }

  // ---------------- ground ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(380, 28), lam2({ map: rep(grass(), 130, 130) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    void r;
  }

  // ---------------- the Grand River bank (shots 1-5) ----------------
  private buildRiverbank(R: THREE.Group, r: () => number) {
    // the river itself: a long bright band sliding behind the bank
    const river = new THREE.Mesh(new THREE.BoxGeometry(150, 0.1, 11), lam2({ map: rep(water(), 24, 2) }));
    river.position.set(0, -0.03, RIVER_Z); river.receiveShadow = true; R.add(river);
    // sandy banks, near and far
    const sandM = lam2({ map: rep(bed(), 18, 1) });
    const bankN = new THREE.Mesh(new THREE.BoxGeometry(150, 0.14, 2.4), sandM);
    bankN.position.set(0, 0.02, RIVER_Z + 6.6); bankN.receiveShadow = true; R.add(bankN);
    const bankF = new THREE.Mesh(new THREE.BoxGeometry(150, 0.14, 2.4), sandM);
    bankF.position.set(0, 0.02, RIVER_Z - 6.6); R.add(bankF);
    // far-bank cottonwoods
    for (let x = -60; x <= 60; x += 9 + r() * 6) this.tree(R, x, RIVER_Z - 10 - r() * 5, 1.1 + r() * 0.5);
    // the attack clearing: worn dirt in the grass
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(7.5, 20), lam2({ map: rep(bed(), 5, 5) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, 0.006, -80); dirt.receiveShadow = true; R.add(dirt);
    // the thicket she charges from: a dark wall of bush at BEAR_BUSH
    this.bush(R, BEAR_BUSH[0], BEAR_BUSH[2], 1.9, true);
    this.bush(R, BEAR_BUSH[0] - 2.6, BEAR_BUSH[2] + 0.6, 1.5, true);
    this.bush(R, BEAR_BUSH[0] + 2.4, BEAR_BUSH[2] + 0.4, 1.6, true);
    this.bush(R, BEAR_BUSH[0] - 0.6, BEAR_BUSH[2] - 1.8, 1.3, true);
    this.tree(R, BEAR_BUSH[0] - 4.5, BEAR_BUSH[2] - 2.5, 1.2);
    // scattered dressing: bushes, rocks, a fallen log, bank trees
    this.bush(R, 6.5, -84.5, 1.1); this.bush(R, -14, -78, 1.2); this.bush(R, 12, -76.5, 0.9);
    this.bush(R, -18, -86, 1.4); this.bush(R, 18, -88, 1.3); this.bush(R, 3.5, -74.8, 0.8);
    this.rock(R, 5.2, -78.4, 1.1); this.rock(R, -4.4, -75.6, 0.8); this.rock(R, 9.8, -82.2, 1.4);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.4, 9), lam2({ color: "#6e5136" }));
    log.rotation.z = Math.PI / 2; log.rotation.y = 0.4; log.position.set(8.6, 0.24, -79.5); log.castShadow = true; R.add(log);
    this.tree(R, -20, -74, 1.3); this.tree(R, 22, -72, 1.15); this.tree(R, 15, -95, 1.0);
    this.tree(R, -26, -88, 1.25); this.tree(R, 30, -80, 1.4);
    void r;
  }

  // ---------------- the brigade camp (shots 6-8) ----------------
  private buildCamp(R: THREE.Group, r: () => number) {
    const cx = CAMP[0], cz = CAMP[2];
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(13, 22), lam2({ map: rep(bed(), 8, 8) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(cx + 2, 0.005, cz); dirt.receiveShadow = true; R.add(dirt);
    // two canvas tents (pyramid cones on a square plan)
    const tentM = lam2({ color: "#b3a284" });
    const tent2M = lam2({ color: "#a08e6e" });
    for (const [tx, tz, m, ry] of [[cx + 9, cz - 5, tentM, 0.4], [cx + 12.5, cz + 4, tent2M, -0.3]] as const) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.9, 4), m);
      tent.position.set(tx, 1.45, tz); tent.rotation.y = ry + Math.PI / 4; tent.castShadow = true; R.add(tent);
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 3.4), m);
      base.position.set(tx, 0.35, tz); base.rotation.y = ry; base.castShadow = true; R.add(base);
    }
    // the campfire: stone ring, crossed logs, a two-cone flame
    const fire = new THREE.Group();
    const stoneM = lam2({ color: "#7d766a" });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), stoneM);
      st.position.set(Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62); fire.add(st);
    }
    const logM = lam2({ color: "#4c3a26" });
    for (const ry of [0.5, 1.7, 2.8]) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 7), logM);
      lg.rotation.z = Math.PI / 2; lg.rotation.y = ry; lg.position.y = 0.1; fire.add(lg);
    }
    const flame = new THREE.Group();
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 8), new THREE.MeshBasicMaterial({ color: "#e8762a" }));
    f1.position.y = 0.5; flame.add(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 8), new THREE.MeshBasicMaterial({ color: "#f7b733" }));
    f2.position.y = 0.45; flame.add(f2);
    fire.add(flame);
    this.flame = flame;
    fire.position.set(FIRE[0], 0, FIRE[2]);
    R.add(fire);
    // the grave: a flat patch of fresh-turned earth (the skin lies on top, cast.ts)
    const grave = new THREE.Mesh(new THREE.CircleGeometry(1.9, 18), lam2({ map: rep(bed(), 2, 2) }));
    grave.rotation.x = -Math.PI / 2; grave.scale.set(1.25, 0.72, 1); grave.position.set(GRAVE[0], 0.012, GRAVE[2]); grave.receiveShadow = true; R.add(grave);
    // crates + a barrel by the tents
    const crateM = lam2({ color: "#8a6a48", map: rep(planks(), 1, 1) });
    for (const [bx, bz, s] of [[cx + 6.5, cz - 6.5, 0.9], [cx + 7.4, cz - 6.2, 0.65], [cx + 6.8, cz - 6.4, 0.55]] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateM);
      crate.position.set(bx, s / 2 + (s < 0.7 ? 0.55 : 0), bz); crate.castShadow = true; R.add(crate);
    }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12), lam2({ color: "#7a5a38", map: rep(planks(), 2, 1) }));
    barrel.position.set(cx + 5.6, 0.43, cz - 5.6); barrel.castShadow = true; R.add(barrel);
    this.tree(R, cx - 8, cz - 9, 1.3); this.tree(R, cx + 16, cz - 10, 1.2); this.tree(R, cx - 4, cz + 12, 1.1);
    this.bush(R, cx - 10, cz + 6, 1.1); this.bush(R, cx + 15, cz + 9, 1.2);
    void r;
  }

  // ---------------- the empty plains (shots 9-11) ----------------
  private buildPrairie(R: THREE.Group, r: () => number) {
    // the signpost: FORT KIOWA, 200 MIL — a death sentence in two boards
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.7, 7), lam2({ color: "#5d4630" }));
    post.position.set(SIGNPOST[0], 1.35, SIGNPOST[2]); post.castShadow = true; R.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.78, 0.09), lam2({ map: signTex("FORT KIOWA", "200 MIL →", "glassSign")() }));
    board.position.set(SIGNPOST[0] - 0.5, 2.25, SIGNPOST[2]); board.rotation.y = 0.5; board.castShadow = true; R.add(board);
    const board2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.09), lam2({ map: signTex("GRAND RIVER", "← 12 MIL", "glassSign2")() }));
    board2.position.set(SIGNPOST[0] + 0.3, 1.55, SIGNPOST[2]); board2.rotation.y = 0.5 + Math.PI; R.add(board2);
    // the crawl line: a faint worn strip in the grass, west without end
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(52, 1.6), lam2({ color: "#77975a", map: rep(grass(), 16, 1) }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(-12, 0.004, 70); strip.receiveShadow = true; R.add(strip);
    // almost nothing else. that is the point of the place.
    this.rock(R, -16, 66, 1.2); this.rock(R, 8, 74.5, 0.9); this.rock(R, -30, 75, 1.5); this.rock(R, -44, 66.5, 1.0);
    this.tree(R, 14, 60, 1.1, true); this.tree(R, -38, 62, 1.2, true);
    this.bush(R, 18, 78, 1.2); this.bush(R, -48, 76, 1.3); this.bush(R, -24, 58, 0.9);
    void r;
  }

  // ---------------- Fort Kiowa (shots 12-14) ----------------
  private buildFort(R: THREE.Group, r: () => number) {
    const fx = FORT[0], fz = FORT[2];
    // the river in front of the fort + its banks
    const river = new THREE.Mesh(new THREE.BoxGeometry(130, 0.1, 10), lam2({ map: rep(water(), 20, 2) }));
    river.position.set(fx + 12, -0.03, RAFT_Z); river.receiveShadow = true; R.add(river);
    const sandM = lam2({ map: rep(bed(), 16, 1) });
    const bankN = new THREE.Mesh(new THREE.BoxGeometry(130, 0.14, 2.2), sandM);
    bankN.position.set(fx + 12, 0.02, RAFT_Z + 6); bankN.receiveShadow = true; R.add(bankN);
    const bankF = new THREE.Mesh(new THREE.BoxGeometry(130, 0.14, 2.2), sandM);
    bankF.position.set(fx + 12, 0.02, RAFT_Z - 6); R.add(bankF);
    // the landing: a rough plank dock where the raft beaches
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 2.6), lam2({ color: "#7a5a38", map: rep(planks(), 2, 1) }));
    dock.position.set(-112, 0.1, -40.6); dock.castShadow = true; dock.receiveShadow = true; R.add(dock);
    // ---- THE RAFT: lashed logs, moved by update() in shot 12 ----
    const raft = new THREE.Group();
    const logM = lam2({ color: "#8a6a48" });
    for (let i = 0; i < 6; i++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 3.6, 9), logM);
      lg.rotation.z = Math.PI / 2; lg.position.set(0, 0.17, -0.95 + i * 0.38); lg.castShadow = true; raft.add(lg);
    }
    for (const bx of [-1.2, 1.2]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 2.4), lam2({ color: "#54401f" }));
      beam.position.set(bx, 0.38, 0); raft.add(beam);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 3.4, 7), lam2({ color: "#54401f" }));
    pole.position.set(1.5, 0.9, 0.8); pole.rotation.z = 0.95; raft.add(pole);
    raft.position.set(-82, 0.04, RAFT_Z);
    this.raft = raft;
    R.add(raft);
    // ---- the palisade: merged vertical logs, a gate at GATE_X ----
    const logGeoList: THREE.BufferGeometry[] = [];
    const logGeo = new THREE.CylinderGeometry(0.15, 0.16, 4.7, 7);
    const pushLog = (x: number, z: number, h = 4.7) => {
      const g = logGeo.clone();
      g.applyMatrix4(new THREE.Matrix4().makeScale(1, h / 4.7, 1).setPosition(x, h / 2, z));
      logGeoList.push(g);
    };
    for (let x = fx - 19; x <= fx + 19; x += 0.31) {
      if (Math.abs(x - GATE_X) < 1.7) continue; // the gate opening
      pushLog(x, FORT_WALL_Z, 4.7 - (Math.abs(Math.sin(x * 7.3)) * 0.24));
    }
    for (let z = FORT_WALL_Z; z <= FORT_WALL_Z + 24; z += 0.31) { pushLog(fx - 19, z); pushLog(fx + 19, z); }
    for (let x = fx - 19; x <= fx + 19; x += 0.31) pushLog(x, FORT_WALL_Z + 24);
    const palisade = new THREE.Mesh(mergeGeometries(logGeoList, false), lam2({ color: "#7a5c3e", map: rep(planks(), 6, 2) }));
    palisade.castShadow = true; palisade.receiveShadow = true; R.add(palisade);
    // the gate doors, swung open inward
    const doorM = lam2({ color: "#6e5136", map: rep(planks(), 1, 2) });
    for (const sgn of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.65, 3.6, 0.12), doorM);
      door.position.set(GATE_X + sgn * 1.55, 1.8, FORT_WALL_Z + 0.85);
      door.rotation.y = sgn * 0.85; door.castShadow = true; R.add(door);
    }
    // watchtower at the west corner
    const towerM = lam2({ color: "#6e5136", map: rep(planks(), 2, 2) });
    for (const [lx, lz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 0.3), towerM);
      leg.position.set(fx - 15 + lx * 0.55, 3.2, FORT_WALL_Z + 3 + lz * 0.55); leg.castShadow = true; R.add(leg);
    }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 3.6), towerM);
    cab.position.set(fx - 15, 7.4, FORT_WALL_Z + 3); cab.castShadow = true; R.add(cab);
    const troof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4), lam2({ color: "#4e4038", flatShading: true }));
    troof.position.set(fx - 15, 9.25, FORT_WALL_Z + 3); troof.rotation.y = Math.PI / 4; R.add(troof);
    // two log cabins inside
    const cabinM = lam2({ color: "#7d6244", map: rep(planks(), 3, 2) });
    const roofM = lam2({ color: "#54453a", flatShading: true });
    for (const [bx, bz, ry] of [[fx - 9, fz + 6, 0.15], [fx + 10, fz + 8, -0.2]] as const) {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.9, 4.2), cabinM);
      cabin.position.set(bx, 1.45, bz); cabin.rotation.y = ry; cabin.castShadow = true; cabin.receiveShadow = true; R.add(cabin);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 1.7, 4), roofM);
      roof.position.set(bx, 3.75, bz); roof.rotation.y = ry + Math.PI / 4; roof.scale.set(1.15, 1, 0.85); roof.castShadow = true; R.add(roof);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ color: "#ffd98d" }));
      win.position.set(bx - 1.2, 1.6, bz - 2.13); win.rotation.y = Math.PI + ry; R.add(win);
    }
    // the flag over the gate
    const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 7.6, 7), lam2({ color: "#54401f" }));
    pole2.position.set(GATE_X + 4.5, 3.8, FORT_WALL_Z + 4); pole2.castShadow = true; R.add(pole2);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), new THREE.MeshBasicMaterial({ map: flagTex(), side: THREE.DoubleSide }));
    flag.position.set(GATE_X + 5.7, 6.9, FORT_WALL_Z + 4); R.add(flag);
    // fort yard dirt
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(17, 22), lam2({ map: rep(bed(), 9, 9) }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(fx, 0.004, fz + 1); dirt.receiveShadow = true; R.add(dirt);
    this.tree(R, fx - 30, FORT_WALL_Z - 8, 1.4); this.tree(R, fx + 32, FORT_WALL_Z - 6, 1.3);
    this.tree(R, fx + 26, RAFT_Z - 10, 1.2); this.tree(R, fx - 34, RAFT_Z - 9, 1.25);
    void r;
  }

  // ---------------- backdrop: far hills + tree line ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    const ridgeM = lam2({ color: "#5d7a8c", flatShading: true });
    const ridge2M = lam2({ color: "#476b52", flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.35, d = 215 + r() * 70;
      const h = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? ridgeM : ridge2M);
      h.scale.set(95 + r() * 60, 26 + r() * 15, 48 + r() * 20);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 10); R.add(h);
    }
    // a dark cottonwood line far up the river (west + east silhouettes)
    const silM = lam2({ color: "#3f6034", flatShading: true });
    for (let i = 0; i < 12; i++) {
      const bx = -170 + i * 30 + r() * 8;
      if (Math.abs(bx) < 40) continue;
      const c = new THREE.Mesh(new THREE.SphereGeometry(4.5 + r() * 2.5, 8, 6), silM);
      c.position.set(bx, 5.5, -125 - r() * 15); R.add(c);
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
    const fogK = [6, 7, 8, 13, 14].includes(id) ? 2.1 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = s.light === "day" || s.light === "golden";
    this.skyStorm.visible = s.light === "storm";
    this.skyNight.visible = s.light === "night";
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(s.light === "storm" ? "#5a6675" : s.light === "night" ? "#2c3e58" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = s.light === "storm" ? 0.55 : s.light === "night" ? 0.25 : 0.92;
    }
    // the raft: only in shot 12 does it ride the river; elsewhere
    // it rests at the landing, out of every frame
    if (this.raft) {
      const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      if (id === 12) this.raft.position.x = raftX(uu);
      else this.raft.position.x = -108;
      this.raft.position.z = RAFT_Z;
      this.raft.rotation.y = Math.sin(t * 0.7) * 0.02;
      this.raft.position.y = 0.04 + Math.sin(t * 1.3) * 0.015;
    }
    // the campfire flame breathes (shots 6-8 only, but cheap everywhere)
    if (this.flame) {
      const fl = 1 + Math.sin(t * 11.3) * 0.1 + Math.sin(t * 23.7) * 0.05;
      this.flame.scale.set(fl, 1 + Math.sin(t * 13.1) * 0.16, fl);
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
