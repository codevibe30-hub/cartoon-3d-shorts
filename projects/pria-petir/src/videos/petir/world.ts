// "Pria Ini Kesamber Petir 7 Kali Dan Tetap Hidup🤫" as one
// three.js scene: Shenandoah National Park, Virginia — a stormy
// ridge, a forest trail, a fire lookout tower, a mountain road
// with Roy's truck, his front yard, the ranger station interior,
// a fishing pond and a picnic clearing. DASIMAN-style sets:
// bright, simple, uncluttered — clean low-poly shapes with painted
// textures, layered light rig (sun key with soft shadows +
// hemisphere fill + rim), NO ink pass on the world.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass, planks, water } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, truckX, TOWER, ROAD_Z, YARD, STATION, POND, CLEAR } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("petirSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("petirSkyStorm", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#232c38"); grad.addColorStop(0.45, "#3d4a5a"); grad.addColorStop(0.78, "#67788c"); grad.addColorStop(1, "#93a5b5");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // heavy cloud banks: overlapping dark ellipses
  for (let i = 0; i < 260; i++) {
    const x = r() * 2048, y = r() * 430, w = 90 + r() * 260, h = 22 + r() * 46;
    g.fillStyle = `rgba(${r() > 0.45 ? "16,22,32" : "88,102,120"},${0.05 + r() * 0.10})`;
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(200,214,228,${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2, 2); }
});
const truckTex = () => ctex("petirTruck", 1024, 256, (g) => {
  g.fillStyle = "#4c6b46"; g.fillRect(0, 0, 1024, 256);            // park-service green
  g.fillStyle = "#3d5739"; g.fillRect(0, 196, 1024, 60);
  g.fillStyle = "#bcd2de"; g.fillRect(96, 46, 210, 84);           // windshield band (side view: cab glass)
  g.fillStyle = "#2c3630"; g.lineWidth = 6; g.strokeStyle = "#232b26"; g.strokeRect(96, 46, 210, 84);
  g.fillStyle = "#31402e"; g.fillRect(340, 30, 660, 130);         // the open bed walls
  g.fillStyle = "#26331f"; g.fillRect(340, 130, 660, 30);
  g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, 0, 1024, 22);
});
const signTex = () => ctex("petirSign", 1024, 320, (g) => {
  g.fillStyle = "#6e5136"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#5d4430"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 294, 1024, 26);
  g.fillStyle = "#f2e7cd"; g.font = "900 118px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("SHENANDOAH", 512, 118);
  g.font = "700 64px Arial, sans-serif"; g.fillStyle = "#d9c9a4";
  g.fillText("NATIONAL PARK", 512, 232);
});
const blobTex = () => ctex("petirBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
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
  private clouds: THREE.Sprite[] = [];
  private truck: THREE.Group | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1977);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#7a9a58", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky domes + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyStorm = new THREE.Mesh(new THREE.SphereGeometry(679, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexStorm(), side: THREE.BackSide, fog: false }));
    this.skyStorm.layers.set(NOINK); this.skyStorm.visible = false; R.add(this.skyStorm);
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 11, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 200 + r() * 240;
      sp.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d);
      sp.scale.set(100 + r() * 70, 34 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    this.buildGround(R, r);
    this.buildRidge(R, r);
    this.buildForest(R, r);
    this.buildTower(R, r);
    this.buildRoad(R, r);
    this.buildYard(R, r);
    this.buildStation(R, r);
    this.buildPond(R, r);
    this.buildClearing(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- ground ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(360, 28), lam2({ map: rep(grass(), 130, 130) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, -0.07, 0); gnd.receiveShadow = true; R.add(gnd);
    // the park trail: a dirt strip along Z through the forest
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 90), lam2({ map: rep(stone("petirDirt", ["#8a7355", "#7d684c", "#95805f", "#6f5c42"]), 2, 20) }));
    trail.rotation.x = -Math.PI / 2; trail.position.set(0, 0.006, -18); trail.receiveShadow = true; R.add(trail);
    // the ridge path: bare rock and dirt
    const ridge = new THREE.Mesh(new THREE.CircleGeometry(16, 22), lam2({ map: rep(stone("petirRock", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 7, 7) }));
    ridge.rotation.x = -Math.PI / 2; ridge.position.set(0, 0.004, -70); ridge.receiveShadow = true; R.add(ridge);
    // the mountain road: an asphalt strip along X
    const road = new THREE.Mesh(new THREE.PlaneGeometry(150, 6.4), lam2({ map: rep(stone("petirAsphalt", ["#77787c", "#6c6d71", "#838488", "#5f6064"]), 30, 2) }));
    road.rotation.x = -Math.PI / 2; road.position.set(10, 0.006, ROAD_Z); road.receiveShadow = true; R.add(road);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(150, 0.22), lam2({ color: "#e8e2c8" }));
    line.rotation.x = -Math.PI / 2; line.position.set(10, 0.012, ROAD_Z); R.add(line);
    // station floor (wood) + yard dirt patch + clearing grass mat
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.24, 14.5), lam2({ map: rep(planks(), 5, 4) }));
    floor.position.set(STATION[0], -0.12, STATION[2] - 0.5); floor.receiveShadow = true; R.add(floor);
    const yard = new THREE.Mesh(new THREE.CircleGeometry(10, 22), lam2({ map: rep(stone("petirYard", ["#a08a64", "#937d59", "#ab956c", "#867451"]), 6, 6) }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(YARD[0], 0.005, YARD[2]); yard.receiveShadow = true; R.add(yard);
    void r;
  }

  // a simple pine: trunk + two stacked cones
  private pine(R: THREE.Group, x: number, z: number, s = 1, dark = false) {
    const trunkM = lam2({ color: "#5d4630" });
    const leafM = lam2({ color: dark ? "#2e5c33" : "#3a7040", flatShading: true });
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.24 * s, 2.6 * s, 7), trunkM);
    tr.position.set(x, 1.3 * s, z); tr.castShadow = true; R.add(tr);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * s, 3.6 * s, 8), leafM);
    c1.position.set(x, (2.6 + 1.6) * s, z); c1.castShadow = true; R.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.35 * s, 2.8 * s, 8), leafM);
    c2.position.set(x, (2.6 + 3.3) * s, z); c2.castShadow = true; R.add(c2);
  }

  // ---------------- the ridge (hook + close) ----------------
  private buildRidge(R: THREE.Group, r: () => number) {
    const rockM = lam2({ color: "#8d8578", map: rep(stone("petirRock2", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 2, 2), flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 9;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + r() * 1.3), rockM);
      rock.position.set(Math.cos(a) * d, 0.2, -70 + Math.sin(a) * d * 0.7);
      rock.rotation.set(r() * 3, r() * 3, r() * 3); rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
    }
    // one dead, blackened tree — the ridge's old lightning magnet
    const deadM = lam2({ color: "#3a342e" });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.6, 7), deadM);
    trunk.position.set(-5.5, 2.3, -74); trunk.rotation.z = 0.06; trunk.castShadow = true; R.add(trunk);
    for (const [bx, by, bz, rz] of [[-5.2, 4.4, -74, 0.7], [-5.9, 4.1, -74.3, -0.8], [-5.4, 3.6, -73.6, 0.4]] as const) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.7, 6), deadM);
      br.position.set(bx, by, bz); br.rotation.z = rz; R.add(br);
    }
    this.pine(R, 7.5, -76, 1.15); this.pine(R, -9.5, -66, 0.95, true); this.pine(R, 10.5, -64, 1.05);
    void r;
  }

  // ---------------- forest + trail + the park sign ----------------
  private buildForest(R: THREE.Group, r: () => number) {
    const spots: [number, number, number][] = [
      [-6, -2, 1.1], [5.5, -14, 1.25], [-7.5, -20, 1.0], [6.5, -28, 1.15], [-5.5, -36, 1.3],
      [8, -42, 1.0], [-9, -48, 1.2], [12, -8, 1.35], [-13, -30, 1.1], [14, -52, 1.2],
      [24, -20, 1.3], [-24, -44, 1.25], [30, -60, 1.1], [-30, -64, 1.3], [20, 8, 1.0], [-20, 16, 1.15],
    ];
    for (const [x, z, s] of spots) this.pine(R, x, z, s, r() > 0.6);
    // the park sign at the trail head
    const postM = lam2({ color: "#5d4630" });
    for (const px of [-1.7, 1.7]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.0, 7), postM);
      post.position.set(-6.5 + px, 1.5, -6); post.castShadow = true; R.add(post);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.35, 0.12), lam2({ map: signTex() }));
    board.position.set(-6.5, 2.3, -6); board.castShadow = true; R.add(board);
    void r;
  }

  // ---------------- the fire lookout tower (1942) ----------------
  private buildTower(R: THREE.Group, r: () => number) {
    const cx = TOWER[0], cz = TOWER[2];
    const legM = lam2({ color: "#6e5136", map: rep(planks(), 1, 2) });
    const cabM = lam2({ color: "#7a6248", map: rep(planks(), 2, 1) });
    for (const [lx, lz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.8, 0.28), legM);
      leg.position.set(cx + lx * 0.82, 3.4, cz + lz * 0.82); leg.rotation.z = -lx * 0.045; leg.rotation.x = lz * 0.045; leg.castShadow = true; R.add(leg);
    }
    for (const yy of [1.8, 3.6, 5.4]) {
      for (const zz of [-1.62, 1.62]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.16), legM);
        brace.position.set(cx, yy, cz + zz); brace.rotation.z = 0.5; R.add(brace);
        const brace2 = brace.clone(); brace2.rotation.z = -0.5; R.add(brace2);
      }
    }
    // the cab: glass band all round + pyramid roof (NO lightning rod — that's the point)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 4.4), cabM);
    cab.position.set(cx, 7.0, cz); cab.castShadow = true; R.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.15, 4.5), new THREE.MeshBasicMaterial({ color: "#cfe0ea" }));
    glass.position.set(cx, 8.15, cz); R.add(glass);
    const cabTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 4.4), cabM);
    cabTop.position.set(cx, 8.95, cz); R.add(cabTop);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 1.5, 4), lam2({ color: "#5d6066" }));
    roof.position.set(cx, 9.85, cz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; R.add(roof);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 5.4), legM);
    deck.position.set(cx, 6.55, cz); deck.castShadow = true; R.add(deck);
    // the stair zigzag up the south face
    for (let i = 0; i < 6; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.5), legM);
      step.position.set(cx + (i % 2 ? 1.6 : -1.6), 1.0 + i * 0.95, cz + 2.45); R.add(step);
    }
    void r;
  }

  // ---------------- the mountain road + Roy's truck ----------------
  private buildRoad(R: THREE.Group, r: () => number) {
    // a rocky hillside rising behind the road (north side)
    const hillM = lam2({ color: "#6d7f56", map: rep(grass(), 16, 5), flatShading: true });
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillM);
    hill.scale.set(130, 15, 22); hill.position.set(10, -4, 0); R.add(hill);
    const rockM = lam2({ color: "#8d8578", flatShading: true });
    for (let i = 0; i < 7; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + r() * 1.4), rockM);
      rock.position.set(-40 + i * 18 + r() * 6, 0.3, 32.6); rock.castShadow = true; R.add(rock);
    }
    // guard posts along the drop side
    const postM = lam2({ color: "#7a6248" });
    for (let x = -46; x < 70; x += 7.5) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.22), postM);
      p.position.set(x, 0.48, 42.1); p.castShadow = true; R.add(p);
    }
    // THE TRUCK: a park-service pickup — cab + open bed. The group
    // slides along X in update() (shot 4 drive, shot 7 parked).
    const truck = new THREE.Group();
    const bodyM = lam2({ map: truckTex() });
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.55, 2.3), bodyM);
    body.position.set(0, 1.15, 0); body.castShadow = true; truck.add(body);
    const cabTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 2.2), lam2({ color: "#4c6b46" }));
    cabTop.position.set(-1.55, 2.3, 0); cabTop.castShadow = true; truck.add(cabTop);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.24), new THREE.MeshBasicMaterial({ color: "#bcd2de" }));
    glass.position.set(-1.55, 2.28, 0); truck.add(glass);
    const wheelM = lam2({ color: "#232323" });
    for (const [wx, wz] of [[-1.9, 1.16], [1.9, 1.16], [-1.9, -1.16], [1.9, -1.16]] as const) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.24, 14), wheelM);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.52, wz); wheel.castShadow = true; truck.add(wheel);
    }
    truck.position.set(-16, 0, ROAD_Z);
    this.truck = truck;
    R.add(truck);
    void r;
  }

  // ---------------- Roy's house + front yard (1970, and the golden close of his life) ----------------
  private buildYard(R: THREE.Group, r: () => number) {
    const cx = YARD[0], cz = YARD[2];
    const wallM = lam2({ color: "#c9b896", map: rep(planks(), 3, 2) });
    const house = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 7), wallM);
    house.position.set(cx, 2.2, cz - 6.5); house.castShadow = true; house.receiveShadow = true; R.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.4, 2.4, 4), lam2({ color: "#7a4a34" }));
    roof.position.set(cx, 5.6, cz - 6.5); roof.rotation.y = Math.PI / 4; roof.castShadow = true; R.add(roof);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 2.4), lam2({ color: "#8a6a48", map: rep(planks(), 3, 1) }));
    porch.position.set(cx, 0.32, cz - 2.2); porch.castShadow = true; porch.receiveShadow = true; R.add(porch);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.14, 2.9), lam2({ color: "#7a4a34" }));
    porchRoof.position.set(cx, 3.1, cz - 2.2); porchRoof.rotation.x = 0.16; porchRoof.castShadow = true; R.add(porchRoof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.1), lam2({ color: "#4a3520" }));
    door.position.set(cx - 1.6, 1.1, cz - 2.95); R.add(door);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.1), new THREE.MeshBasicMaterial({ color: "#f7e8b8" }));
    win.position.set(cx + 1.9, 1.7, cz - 2.95); R.add(win);
    // a split-rail fence across the yard + a big shade tree
    const railM = lam2({ color: "#7a6248" });
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, 0.18), railM);
      post.position.set(cx - 8 + i * 3.2, 0.58, cz + 5.5); post.castShadow = true; R.add(post);
      for (const ry of [0.42, 0.92]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.13, 0.13), railM);
        rail.position.set(cx - 8 + i * 3.2 + 1.6, ry, cz + 5.5); rail.rotation.z = i % 2 ? 0.05 : -0.05; R.add(rail);
      }
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.6, 8), lam2({ color: "#6e4a2e" }));
    trunk.position.set(cx + 8.5, 1.8, cz - 4.5); trunk.castShadow = true; R.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(3.1, 10, 8), lam2({ color: "#4a9142", flatShading: true }));
    canopy.position.set(cx + 8.5, 5.2, cz - 4.5); canopy.castShadow = true; R.add(canopy);
    void r;
  }

  // ---------------- the ranger station (interior, 1972) ----------------
  private buildStation(R: THREE.Group, r: () => number) {
    const cx = STATION[0], cz = STATION[2];
    const wallM = lam2({ color: "#b8a888", map: rep(planks(), 4, 2) });
    const WZ = cz - 6.5;
    const band = (x: number, y: number, w: number, h: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), wallM);
      m.position.set(x, y, WZ); m.castShadow = true; m.receiveShadow = true; R.add(m);
    };
    band(cx, 0.5, 17.5, 1.0);
    band(cx, 3.85, 17.5, 0.75);
    for (const px of [-8.55, -3.1, 3.1, 8.55]) band(cx + px, 2.1, px === -8.55 || px === 8.55 ? 0.7 : 1.0, 2.2);
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 13.5), wallM);
    west.position.set(cx - 8.7, 2.1, cz - 0.2); west.castShadow = true; west.receiveShadow = true; R.add(west);
    // beyond the windows: a black storm sky with far ridges
    const view = new THREE.Mesh(new THREE.PlaneGeometry(16.4, 2.2), new THREE.MeshBasicMaterial({ map: ctex("petirStormView", 1024, 160, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 160);
      grad.addColorStop(0, "#39485c"); grad.addColorStop(1, "#7c8ea2");
      g.fillStyle = grad; g.fillRect(0, 0, 1024, 160);
      g.fillStyle = "#4c6076"; g.beginPath(); g.moveTo(0, 160); g.lineTo(240, 84); g.lineTo(520, 160); g.fill();
      g.beginPath(); g.moveTo(430, 160); g.lineTo(720, 70); g.lineTo(1024, 160); g.fill();
    }) }));
    view.position.set(cx, 2.1, WZ - 1.6); R.add(view);
    // the desk + a wall map board + a stove in the corner
    const woodM = lam2({ color: "#7a5a38", map: rep(planks(), 1, 1) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.09, 1.2), woodM);
    top.position.set(cx - 1.2, 0.78, cz - 3.4); top.castShadow = true; top.receiveShadow = true; R.add(top);
    for (const [dx, dz] of [[-1.35, -0.45], [1.35, -0.45], [-1.35, 0.45], [1.35, 0.45]] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.76, 0.09), woodM);
      leg.position.set(cx - 1.2 + dx, 0.38, cz - 3.4 + dz); R.add(leg);
    }
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.36), lam2({ color: "#f2ede0" }));
    paper.position.set(cx - 0.7, 0.86, cz - 3.4); paper.rotation.y = 0.3; R.add(paper);
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 0.1), lam2({ color: "#8a9a7a" }));
    board.position.set(cx + 4.6, 2.2, WZ + 0.25); R.add(board);
    void r;
  }

  // ---------------- the fishing pond (1977 + the bear) ----------------
  private buildPond(R: THREE.Group, r: () => number) {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9.5, 26), lam2({ map: rep(water(), 4, 4) }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(POND[0], 0.02, POND[2]); pond.receiveShadow = true; R.add(pond);
    const sand = new THREE.Mesh(new THREE.RingGeometry(9.3, 11.4, 26), lam2({ map: rep(stone("petirSand", ["#b3a284", "#a69574", "#bfb08e", "#9c8a68"]), 8, 2) }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(POND[0], 0.012, POND[2]); sand.receiveShadow = true; R.add(sand);
    // the dock: planks running out over the water from the west bank
    const dockM = lam2({ color: "#8a6a48", map: rep(planks(), 2, 1) });
    const dock = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 1.5), dockM);
    dock.position.set(61.6, 0.42, 39.8); dock.castShadow = true; dock.receiveShadow = true; R.add(dock);
    for (const [px, pz] of [[59.2, 39.2], [59.2, 40.4], [64.0, 39.2], [64.0, 40.4]] as const) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 7), dockM);
      post.position.set(px, 0.1, pz); R.add(post);
    }
    // reeds around the far bank
    const reedM = lam2({ color: "#5d8a4a" });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      if (Math.cos(a) < -0.35) continue; // keep the dock side clear
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.3 + r() * 0.7, 5), reedM);
      reed.position.set(POND[0] + Math.cos(a) * 9.2, 0.6, POND[2] + Math.sin(a) * 9.2); R.add(reed);
    }
    this.pine(R, 55.5, 47, 1.2); this.pine(R, 76, 33, 1.1, true); this.pine(R, 74, 52, 1.25);
    void r;
  }

  // ---------------- the picnic clearing (avoided) ----------------
  private buildClearing(R: THREE.Group, r: () => number) {
    const cx = CLEAR[0], cz = CLEAR[2];
    const woodM = lam2({ color: "#8a6a48", map: rep(planks(), 2, 1) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.3), woodM);
    top.position.set(cx + 3.4, 0.78, cz + 1.5); top.castShadow = true; top.receiveShadow = true; R.add(top);
    for (const dx of [-1.1, 1.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 1.1), woodM);
      leg.position.set(cx + 3.4 + dx, 0.39, cz + 1.5); R.add(leg);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.35), woodM);
      bench.position.set(cx + 3.4, 0.45, cz + 1.5 + (dx > 0 ? 0.95 : -0.95)); R.add(bench);
    }
    this.pine(R, cx - 5.5, cz + 4.5, 1.2); this.pine(R, cx + 7.5, cz - 2, 1.05, true); this.pine(R, cx + 1, cz + 7.5, 1.3);
    void r;
  }

  // ---------------- backdrop: the Blue Ridge layers ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    const ridgeM = lam2({ color: "#5d7a8c", flatShading: true });
    const ridge2M = lam2({ color: "#476b52", flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + r() * 0.4, d = 200 + r() * 70;
      const h = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? ridgeM : ridge2M);
      h.scale.set(90 + r() * 60, 26 + r() * 14, 46 + r() * 20);
      h.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 10); R.add(h);
    }
    const hillM = lam2({ color: "#5d8a48", map: rep(grass(), 10, 4) });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.5 + 0.3, d = 120 + r() * 40;
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), hillM);
      h.scale.set(55 + r() * 35, 12 + r() * 8, 26 + r() * 12);
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
    const fogK = id === 2 || id === 10 || id === 12 ? 1.55 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    const stormy = s.light === "storm";
    this.skyDay.visible = !stormy; this.skyStorm.visible = stormy;
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(stormy ? "#5a6675" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = stormy ? 0.55 : 0.92;
    }
    // the truck: shot 4 it drives + stops at the strike; shot 7 it
    // sits parked up the road; every other shot it waits off-stage
    if (this.truck) {
      const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      if (id === 4) this.truck.position.x = truckX(uu);
      else if (id === 7) this.truck.position.x = 30;
      else this.truck.position.x = -160;
      this.truck.position.z = ROAD_Z;
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
