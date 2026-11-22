// The Prajurit Onoda film as one three.js scene: the jungle of
// Lubang Island, Philippines — a guerrilla camp clearing in dense
// green, a dirt path running south, two graves east of the camp,
// and a Filipino village west beyond the treeline. DASIMAN-style
// sets: bright, simple, uncluttered — clean low-poly shapes with
// painted textures, layered light rig (sun key with soft shadows +
// hemisphere fill + rim), NO ink pass on the world in this lane.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, CAMP, GRAVES, VILLAGE, HILL } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const dirtTex = () => ctex("onodaDirt", 512, 512, (g, r) => {
  g.fillStyle = "#8a6a48"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "196,164,116" : "96,72,44"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${120 + r() * 50},${100 + r() * 40},${70 + r() * 30},0.8)`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 4, 0, 7); g.fill(); }
});
const flagTex = () => ctex("onodaFlag", 256, 170, (g) => {
  g.fillStyle = "#20409e"; g.fillRect(0, 0, 256, 85);
  g.fillStyle = "#c8352c"; g.fillRect(0, 85, 256, 85);
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, 0); g.lineTo(96, 85); g.lineTo(0, 170); g.closePath(); g.fill();
  g.fillStyle = "#f2c531"; g.beginPath(); g.arc(34, 85, 13, 0, 7); g.fill();
});
const blobTex = () => ctex("onodaBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("onodaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("onodaSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060f26"); grad.addColorStop(0.45, "#0d2148"); grad.addColorStop(0.78, "#1d3a68"); grad.addColorStop(1, "#2a4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; const s = r() > 0.92 ? 3.2 : 1.8; g.fillRect(r() * 2048, r() * 700, s, s); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "8,20,50"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
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
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(4242);
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
    this.buildJungle(R, r);
    this.buildCamp(R, r);
    this.buildGraves(R, r);
    this.buildVillage(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- ground: grass, camp dirt, the path ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(340, 28), lam2({ map: rep(grass(), 110, 110) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    const dirt = lam2({ map: rep(dirtTex(), 5, 5) });
    const campDirt = new THREE.Mesh(new THREE.CircleGeometry(8.5, 22), dirt);
    campDirt.rotation.x = -Math.PI / 2; campDirt.position.set(CAMP[0], 0.005, CAMP[2] + 1); campDirt.receiveShadow = true; R.add(campDirt);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 40), lam2({ map: rep(dirtTex(), 1, 12) }));
    path.rotation.x = -Math.PI / 2; path.position.set(0.3, 0.008, 24); path.receiveShadow = true; R.add(path);
    const vilDirt = new THREE.Mesh(new THREE.CircleGeometry(10, 22), lam2({ map: rep(dirtTex(), 6, 6) }));
    vilDirt.rotation.x = -Math.PI / 2; vilDirt.position.set(VILLAGE[0], 0.005, VILLAGE[2]); vilDirt.receiveShadow = true; R.add(vilDirt);
    void r;
  }

  // ---------------- the jungle ----------------
  private buildJungle(R: THREE.Group, r: () => number) {
    const trunkM = lam2({ color: "#6e4a2e", map: rep(stone("onodaBark", ["#6e4a2e", "#5d3f27", "#7d5636", "#4f3520"]), 1, 2) });
    const leafA = lam2({ color: "#4a9142", flatShading: true });
    const leafB = lam2({ color: "#5da24e", flatShading: true });
    const leafC = lam2({ color: "#3e7d37", flatShading: true });
    const leafM = [leafA, leafB, leafC];
    const tree = (x: number, z: number, s: number) => {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.3 * s, 3.4 * s, 7), trunkM);
      tr.position.set(x, 1.7 * s, z); tr.rotation.z = (r() - 0.5) * 0.14; tr.castShadow = true; R.add(tr);
      for (let j = 0; j < 3; j++) {
        const can = new THREE.Mesh(new THREE.SphereGeometry((1.6 - j * 0.28) * s, 9, 7), leafM[(j + Math.floor(r() * 3)) % 3]);
        can.position.set(x + (j - 1) * 1.15 * s + (r() - 0.5) * 0.5, (3.4 + 0.75 + j * 0.42) * s, z + (j % 2 ? 0.6 : -0.5) * s);
        can.castShadow = true; R.add(can);
      }
    };
    const bush = (x: number, z: number, s: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 8, 6), leafM[Math.floor(r() * 3)]);
      b.scale.y = 0.72; b.position.set(x, 0.4 * s, z); b.castShadow = true; R.add(b);
    };
    let placed = 0, guard = 0;
    while (placed < 110 && guard++ < 900) {
      const a = r() * Math.PI * 2, d = 11.5 + r() * 58;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x - 0.3) < 3.6 && z > 2) continue;                       // the path corridor
      if (Math.hypot(x - VILLAGE[0], z - VILLAGE[2]) < 11) continue;        // the village clearing
      if (Math.hypot(x - GRAVES[0], z - GRAVES[2]) < 3.4) continue;         // the graves
      if (Math.hypot(x - CAMP[0], z - CAMP[2]) < 10.5) continue;            // the camp clearing
      tree(x, z, 0.85 + r() * 0.9); placed++;
    }
    // a nearer broken ring framing the camp + meeting clearing
    const near: [number, number, number][] = [
      [-8.5, 6, 1.25], [9.5, 4, 1.15], [-7.5, -6.5, 1.35], [11, -4, 1.2], [-11, 12, 1.1],
      [13.5, 10, 1.3], [-13, -1, 1.2], [6, -11.5, 1.25], [-4.5, -12, 1.15], [15, 17.5, 1.2],
    ];
    for (const [x, z, s] of near) tree(x, z, s);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = 9 + r() * 30;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x - 0.3) < 2.6 && z > 2) continue;
      if (Math.hypot(x - CAMP[0], z - CAMP[2]) < 4.5) continue;
      bush(x, z, 0.7 + r() * 0.9);
    }
  }

  // ---------------- the camp ----------------
  private buildCamp(R: THREE.Group, r: () => number) {
    const woodM = lam2({ color: "#8a5a2c", map: rep(planks(), 1, 1) });
    const postM = lam2({ color: "#6e4a2e", map: rep(stone("onodaBark", ["#6e4a2e", "#5d3f27", "#7d5636", "#4f3520"]), 1, 1) });
    // lean-to shelter west of the fire: two posts + a slanted plank roof
    for (const dz of [-3.1, -0.9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 7), postM);
      post.position.set(-2.6, 1.15, dz); post.castShadow = true; R.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 3.1), woodM);
    roof.position.set(-2.1, 2.28, -2.0); roof.rotation.z = 0.38; roof.castShadow = true; roof.receiveShadow = true; R.add(roof);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.5, 3.1), woodM);
    back.position.set(-3.15, 0.75, -2.0); back.castShadow = true; R.add(back);
    // the fire pit: a ring of stones + crossed logs (the flame is a cast Fx)
    const stoneM = lam2({ color: "#8d8d94" });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), stoneM);
      st.position.set(Math.cos(a) * 0.62, 0.07, -0.4 + Math.sin(a) * 0.62); st.castShadow = true; R.add(st);
    }
    for (const rot of [0.5, -0.45]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 7), postM);
      log.rotation.z = Math.PI / 2; log.rotation.y = rot; log.position.set(0, 0.1, -0.4); R.add(log);
    }
    // log seats + supply crates + a water barrel
    for (const [lx, lz, ry] of [[1.5, 0.9, 0.4], [-1.6, 0.7, -0.3]] as const) {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 8), postM);
      seat.rotation.z = Math.PI / 2; seat.rotation.y = ry; seat.position.set(lx, 0.16, lz); seat.castShadow = true; R.add(seat);
    }
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), woodM);
    crate.position.set(2.7, 0.43, -2.3); crate.castShadow = true; R.add(crate);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), woodM);
    crate2.position.set(2.6, 1.16, -2.35); crate2.rotation.y = 0.5; crate2.castShadow = true; R.add(crate2);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 10), lam2({ color: "#5d6a72" }));
    barrel.position.set(3.4, 0.48, -1.6); barrel.castShadow = true; R.add(barrel);
    void r;
  }

  // ---------------- the graves ----------------
  private buildGraves(R: THREE.Group, r: () => number) {
    const dirtM = lam2({ color: "#9a7a54", map: rep(dirtTex(), 2, 2) });
    const woodM = lam2({ color: "#5d4630" });
    const grave = (x: number, z: number, ry: number) => {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dirtM);
      mound.scale.set(0.85, 0.26, 1.3); mound.position.set(x, 0.02, z); mound.rotation.y = ry;
      mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.09), woodM);
      up.position.set(x, 0.55, z + Math.cos(ry) * 1.0); up.castShadow = true; R.add(up);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.09), woodM);
      cross.position.set(x, 0.72, z + Math.cos(ry) * 1.0); R.add(cross);
      blob(R, x, 0.03, z, 2.6, 3.6, 0.25);
    };
    grave(GRAVES[0], GRAVES[2], 0.15);
    grave(GRAVES[0] + 1.35, GRAVES[2] - 0.7, -0.1);
    void r;
  }

  // ---------------- the village ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    const wallM = lam2({ map: rep(planks(), 2, 1) });
    const thatchM = lam2({ color: "#b99b5e", map: rep(stone("onodaThatch", ["#b99b5e", "#a8894e", "#c9ac6e", "#97803f"]), 3, 1) });
    const hut = (x: number, z: number, ry: number, s = 1) => {
      const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4 * s, 2.1 * s, 3.0 * s), wallM);
      walls.position.set(x, 1.05 * s + 0.55, z); walls.rotation.y = ry; walls.castShadow = true; walls.receiveShadow = true; R.add(walls);
      for (const [px, pz] of [[-1.5, -1.3], [1.5, -1.3], [-1.5, 1.3], [1.5, 1.3]] as const) {
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.6, 6), wallM);
        stilt.position.set(x + px * s * Math.cos(ry) - pz * s * Math.sin(ry), 0.3, z + px * s * Math.sin(ry) + pz * s * Math.cos(ry)); R.add(stilt);
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1 * s, 1.7 * s, 4), thatchM);
      roof.position.set(x, 1.05 * s + 0.55 + 2.1 * s * 0.5 + 0.85 * s - 0.55, z); roof.rotation.y = ry + Math.PI / 4; roof.castShadow = true; R.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 1.4 * s, 0.06), lam2({ color: "#4a3520" }));
      door.position.set(x + Math.sin(ry) * 1.53 * s, 1.25, z + Math.cos(ry) * 1.53 * s); door.rotation.y = ry; R.add(door);
    };
    hut(VILLAGE[0] - 3.5, VILLAGE[2] - 3.5, 0.4);
    hut(VILLAGE[0] + 3.0, VILLAGE[2] + 4.0, -0.35, 0.92);
    hut(VILLAGE[0] - 4.5, VILLAGE[2] + 5.5, 0.95, 1.05);
    hut(VILLAGE[0] + 5.5, VILLAGE[2] - 5.0, 0.1, 0.88);
    // the flag pole the village celebrates under (shot 4)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 6.4, 7), lam2({ color: "#6e4a2e" }));
    pole.position.set(VILLAGE[0], 3.2, VILLAGE[2] - 0.5); pole.castShadow = true; R.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide }));
    flag.position.set(VILLAGE[0] + 0.78, 5.75, VILLAGE[2] - 0.5); R.add(flag);
    void r;
  }

  // ---------------- backdrop: green hills on the horizon ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    const hillM = lam2({ color: "#5d8a48", map: rep(grass(), 10, 4) });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5, d = 170 + r() * 80;
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillM);
      h.scale.set(70 + r() * 55, 15 + r() * 11, 30 + r() * 16);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 20); R.add(h);
    }
    const silM = lam2({ color: "#47763c", flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3, d = 88 + r() * 26;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5 + r() * 3, 11 + r() * 6, 7), silM);
      cone.position.set(Math.cos(a) * d, 5, Math.sin(a) * d); R.add(cone);
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
    const fogK = id === 2 || id === 4 || id === 8 || id === 13 ? 1.55 : 1;
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
