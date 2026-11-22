// "Wanita Ini Selamat Dari Titanic, Lalu Selamat Lagi Dari
// Kapal Tenggelam Lain🤫" as one three.js scene: a lifeboat on
// the night Atlantic, a Southampton dock, the Solent collision,
// Titanic's boat deck, a hospital-ship anchorage, the Aegean
// and Britannic's stern, a golden liner deck, and a lamplit
// room decades later. DASIMAN-style sets: bright, simple,
// uncluttered — clean low-poly shapes with painted textures,
// layered light rig (sun key with soft shadows + hemisphere
// fill + rim), NO ink pass on the world.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, BOAT_POS, TITANIC_POS, BRIT_POS, DOCK, COLLIDE, DECK, HOSP, DECKGOLD, PHONE, titanicSink, britSink } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("jessopSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexStorm = () => ctex("jessopSkyStorm", 2048, 1024, (g, r) => {
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
const skyTexNight = () => ctex("jessopSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060d1f"); grad.addColorStop(0.5, "#0d1c38"); grad.addColorStop(0.8, "#1d3358"); grad.addColorStop(1, "#2c4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,252,240,${0.25 + r() * 0.6})`; g.fillRect(r() * 2048, r() * 560, 1.8, 1.8); }
  const mn = g.createRadialGradient(420, 190, 6, 420, 190, 150);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(210,226,250,0.35)"); mn.addColorStop(1, "rgba(210,226,250,0)");
  g.fillStyle = mn; g.fillRect(240, 20, 380, 360);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 21, 0, 7); g.fill();
});
// the sea: deep blue with hand-painted wave strokes
const seaTex = () => ctex("jessopSea", 1024, 1024, (g, r) => {
  g.fillStyle = "#274b74"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 1024, y = r() * 1024, w = 14 + r() * 42;
    g.strokeStyle = `rgba(${r() > 0.42 ? "168,205,238" : "16,34,58"},${0.05 + r() * 0.10})`;
    g.lineWidth = 2 + r() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.5, y - 3 - r() * 4, x + w, y); g.stroke();
  }
});
// a liner's side: black hull, white sheer stripe, two rows of
// portholes, and her name in gold near the bow
const hullTex = (name: string, key: string) => () => ctex(key, 2048, 512, (g, r) => {
  g.fillStyle = "#20242c"; g.fillRect(0, 0, 2048, 512);
  g.fillStyle = "#8c2f28"; g.fillRect(0, 452, 2048, 60); // boot-top red below the waterline
  g.fillStyle = "#e8e4da"; g.fillRect(0, 64, 2048, 88);   // white superstructure band
  g.fillStyle = "#c8a24a"; g.fillRect(0, 152, 2048, 7);   // gold sheer line
  for (let row = 0; row < 2; row++) for (let i = 0; i < 34; i++) {
    const x = 50 + i * 58, y = 96 + row * 0 + (row === 0 ? 0 : 210);
    g.fillStyle = row === 0 ? "#3d4a5a" : "#ffd98d";
    g.beginPath(); g.arc(x, row === 0 ? 108 : 268, 13, 0, 7); g.fill();
    g.strokeStyle = "#0e1116"; g.lineWidth = 4; g.stroke();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 512, 2.4, 2.4); }
  g.fillStyle = "#e9c766"; g.font = "900 92px Georgia, serif"; g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText(name, 90, 356);
});
// the hospital ship: white hull, green band, great red crosses
const hospTex = () => ctex("jessopHosp", 2048, 512, (g, r) => {
  g.fillStyle = "#eef0ea"; g.fillRect(0, 0, 2048, 512);
  g.fillStyle = "#2e7d4f"; g.fillRect(0, 208, 2048, 64);
  g.fillStyle = "#8c2f28"; g.fillRect(0, 452, 2048, 60);
  const cross = (x: number, y: number, s: number) => {
    g.fillStyle = "#c0272d";
    g.fillRect(x - s * 0.18, y - s * 0.5, s * 0.36, s);
    g.fillRect(x - s * 0.5, y - s * 0.18, s, s * 0.36);
  };
  cross(430, 130, 150); cross(1024, 130, 170); cross(1620, 130, 150);
  for (let i = 0; i < 30; i++) {
    const x = 50 + i * 68;
    g.fillStyle = "#5a6a72"; g.beginPath(); g.arc(x, 356, 12, 0, 7); g.fill();
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(40,60,50,${0.015 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 512, 2.4, 2.4); }
  g.fillStyle = "#33503c"; g.font = "900 84px Georgia, serif"; g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText("BRITANNIC", 90, 420);
});
const signTex = (word: string, sub: string, key: string) => () => ctex(key, 1024, 320, (g) => {
  g.fillStyle = "#2e3138"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#22252b"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 294, 1024, 26);
  g.fillStyle = "#f2e7cd"; g.font = "900 108px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(word, 512, 122);
  g.font = "700 56px Arial, sans-serif"; g.fillStyle = "#d9c9a4";
  g.fillText(sub, 512, 238);
});
const crossSignTex = () => ctex("jessopCrossSign", 512, 512, (g) => {
  g.fillStyle = "#f2f0e8"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#8a8578"; g.lineWidth = 14; g.strokeRect(7, 7, 498, 498);
  g.fillStyle = "#c0272d";
  g.fillRect(256 - 42, 96, 84, 320);
  g.fillRect(96, 256 - 42, 320, 84);
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
  private titanic: THREE.Group | null = null;
  private britannic: THREE.Group | null = null;
  private prop: THREE.Group | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1912);
    this.hemi = new THREE.HemisphereLight("#dcecff", "#3d5a74", 0.55);
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
    this.buildSea(R, r);
    this.buildBoatsea(R, r);
    this.buildDock(R, r);
    this.buildCollide(R, r);
    this.buildDeck(R, r);
    this.buildHosp(R, r);
    this.buildBritsea(R, r);
    this.buildDeckgold(R, r);
    this.buildPhone(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- the sea itself ----------------
  private buildSea(R: THREE.Group, r: () => number) {
    const sea = new THREE.Mesh(new THREE.CircleGeometry(380, 36), lam2({ map: rep(seaTex(), 90, 90) }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.07, 0); sea.receiveShadow = true; R.add(sea);
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

  // ---------------- a White Star liner ----------------
  // Hull along X, bow toward -X. l = length. If hosp, the white
  // hospital livery. Returns the group; funnels ochre with black
  // tops — the White Star colours.
  private liner(l: number, name: string, key: string, hosp = false): THREE.Group {
    const g = new THREE.Group();
    const hullM = hosp ? lam2({ map: hospTex() }) : lam2({ map: hullTex(name, key)() });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(l, 5.2, 7.2), hullM);
    hull.position.set(0, 2.2, 0); hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(3.6, 7, 4), hosp ? lam2({ color: "#e3e7de" }) : lam2({ color: "#20242c" }));
    bow.rotation.z = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.55);
    bow.position.set(-l / 2 - 3.2, 2.2, 0); bow.castShadow = true; g.add(bow);
    const stern = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.0, 5.2, 12, 1), hosp ? lam2({ color: "#e3e7de" }) : lam2({ color: "#20242c" }));
    stern.position.set(l / 2, 2.2, 0); stern.castShadow = true; g.add(stern);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(l * 0.96, 0.2, 6.6), lam2({ map: rep(planks(), 10, 2) }));
    deck.position.set(0, 4.9, 0); deck.receiveShadow = true; g.add(deck);
    const ss = new THREE.Mesh(new THREE.BoxGeometry(l * 0.62, 1.7, 5.2), lam2({ color: hosp ? "#e8eae2" : "#e8e4da" }));
    ss.position.set(-l * 0.04, 5.85, 0); ss.castShadow = true; g.add(ss);
    // four funnels, White Star buff with black tops
    const funM = lam2({ color: "#c9973f" }), topM = lam2({ color: "#1b1b1b" });
    for (let i = 0; i < 4; i++) {
      const fx = -l * 0.30 + i * l * 0.155;
      const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 3.6, 12), funM);
      fun.position.set(fx, 8.4, 0); fun.castShadow = true; g.add(fun);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.7, 12), topM);
      top.position.set(fx, 10.4, 0); g.add(top);
    }
    // two masts
    const mastM = lam2({ color: "#4c3d2c" });
    for (const mx of [-l * 0.40, l * 0.38]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 9.5, 7), mastM);
      mast.position.set(mx, 9.4, 0); mast.castShadow = true; g.add(mast);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 6), mastM);
      yard.rotation.x = Math.PI / 2; yard.position.set(mx, 12.6, 0); g.add(yard);
    }
    // lifeboats along the boat deck edge
    const boatM = lam2({ color: "#e8e2d2" });
    for (let i = 0; i < 5; i++) {
      const bx = -l * 0.32 + i * l * 0.16;
      const bt = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 1.1), boatM);
      bt.position.set(bx, 5.35, 3.15); g.add(bt);
      const bt2 = bt.clone(); bt2.position.z = -3.15; g.add(bt2);
    }
    return g;
  }

  // ---------------- a lifeboat ----------------
  private lifeboat(): THREE.Group {
    const g = new THREE.Group();
    const hullM = lam2({ color: "#e8e2d2" });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 1.9), hullM);
    hull.position.set(0, 0.35, 0); hull.castShadow = true; g.add(hull);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.14, 2.0), lam2({ color: "#8c4a2f" }));
    trim.position.set(0, 0.72, 0); g.add(trim);
    for (const sgn of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.6, 4), hullM);
      end.rotation.z = sgn * Math.PI / 2; end.rotation.y = Math.PI / 4; end.scale.set(1, 1, 0.5);
      end.position.set(sgn * 3.0, 0.38, 0); g.add(end);
    }
    const benchM = lam2({ color: "#7a5a38", map: rep(planks(), 1, 1) });
    for (const bx of [-1.5, 0, 1.5]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 1.7), benchM);
      bench.position.set(bx, 0.52, 0); g.add(bench);
    }
    return g;
  }

  private iceberg(x: number, z: number, s: number): THREE.Group {
    const g = new THREE.Group();
    const m = lam2({ color: "#eef4f8", flatShading: true });
    const m2 = lam2({ color: "#d7e6f0", flatShading: true });
    const main = new THREE.Mesh(new THREE.ConeGeometry(4.2 * s, 7.5 * s, 7), m);
    main.position.set(0, 2.6 * s, 0); main.castShadow = true; g.add(main);
    const side = new THREE.Mesh(new THREE.ConeGeometry(2.8 * s, 5 * s, 6), m2);
    side.position.set(3.4 * s, 1.6 * s, 1 * s); g.add(side);
    const side2 = new THREE.Mesh(new THREE.ConeGeometry(2.2 * s, 3.8 * s, 6), m);
    side2.position.set(-3.2 * s, 1.2 * s, -0.8 * s); g.add(side2);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.6 * s, 6.4 * s, 1.2 * s, 9), m2);
    base.position.set(0, 0.2 * s, 0); g.add(base);
    g.position.set(x, 0, z);
    return g;
  }

  // ---------------- the lifeboat sea (shots 1, 6) ----------------
  private buildBoatsea(R: THREE.Group, r: () => number) {
    const boat = this.lifeboat();
    boat.position.set(BOAT_POS[0], BOAT_POS[1], BOAT_POS[2]);
    boat.rotation.y = 0.22;
    R.add(boat);
    // THE TITANIC, sinking behind the boat (animated in update)
    this.titanic = this.liner(58, "TITANIC", "jessopHullTitanic");
    this.titanic.position.set(TITANIC_POS[0], 0, TITANIC_POS[2]);
    this.titanic.rotation.y = 0.35;
    R.add(this.titanic);
    R.add(this.iceberg(-44, -92, 1.1));
    R.add(this.iceberg(30, -108, 1.5));
    void r;
  }

  // ---------------- Southampton dock (shots 2, 4) ----------------
  private buildDock(R: THREE.Group, r: () => number) {
    const cx = DOCK[0], cz = DOCK[2];
    const quay = new THREE.Mesh(new THREE.BoxGeometry(42, 0.55, 12), lam2({ map: rep(stone("jessopQuay", ["#8d8578", "#7d766a", "#9a9284", "#6e675c"]), 12, 3) }));
    quay.position.set(cx, 0.275, cz + 3); quay.castShadow = true; quay.receiveShadow = true; R.add(quay);
    // the great hull alongside: a wall of black with her name,
    // a glowing door, funnels above the deck line
    const hull = new THREE.Mesh(new THREE.BoxGeometry(56, 7.6, 0.6), lam2({ map: hullTex("TITANIC", "jessopHullDock")() }));
    hull.position.set(cx, 3.8, cz - 4.2); hull.castShadow = true; R.add(hull);
    const deckTop = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 3.4), lam2({ map: rep(planks(), 12, 1) }));
    deckTop.position.set(cx, 7.75, cz - 5.4); R.add(deckTop);
    const funM = lam2({ color: "#c9973f" }), topM = lam2({ color: "#1b1b1b" });
    for (let i = 0; i < 4; i++) {
      const fx = cx - 19 + i * 12.5;
      const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 3.8, 12), funM);
      fun.position.set(fx, 9.7, cz - 5.6); fun.castShadow = true; R.add(fun);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, 0.75, 12), topM);
      top.position.set(fx, 11.9, cz - 5.6); R.add(top);
    }
    // the gangplank + the little platform at the ship's door
    const plank = new THREE.Group();
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 6.9), lam2({ color: "#7a5a38", map: rep(planks(), 1, 4) }));
    pb.position.set(0, 0, 3.45); pb.castShadow = true; plank.add(pb);
    plank.position.set(66.8, 0.55, -28.2);
    plank.lookAt(71.3, 2.75, -32.6);
    R.add(plank);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 1.5), lam2({ color: "#5d4430" }));
    plat.position.set(72.2, 2.775, -33.3); R.add(plat);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ color: "#ffedb8" }));
    door.position.set(71.6, 2.1, cz - 3.85); R.add(door);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.9, 0.14), lam2({ map: signTex("WHITE STAR", "SOUTHAMPTON", "jessopSignDock")() }));
    sign.position.set(cx - 12, 5.6, cz - 3.8); R.add(sign);
    // crates, barrels, a cart — a working dock
    const crateM = lam2({ color: "#8a6a48", map: rep(planks(), 1, 1) });
    for (const [bx, bz, s] of [[58, -24, 1.1], [58.6, -22.6, 0.8], [84, -25, 1.2], [83.4, -23.4, 0.85]] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 1.0 * s, 1.3 * s), crateM);
      crate.position.set(bx, 0.55 + 0.5 * s, bz); crate.castShadow = true; R.add(crate);
    }
    const barM = lam2({ color: "#6e5136" });
    for (const [bx, bz] of [[61, -36.5], [62.1, -36.2], [79, -36.6]] as const) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.05, 10), barM);
      bar.position.set(bx, 1.05, bz); bar.castShadow = true; R.add(bar);
    }
    this.lampPost(R, cx - 10, 0.55, cz + 6.5);
    this.lampPost(R, cx + 11, 0.55, cz + 6.5);
    void r;
  }

  // ---------------- the Solent collision (shot 3) ----------------
  private buildCollide(R: THREE.Group, r: () => number) {
    const olympic = this.liner(52, "OLYMPIC", "jessopHullOlympic");
    olympic.position.set(COLLIDE[0] - 10, 0, COLLIDE[2] + 10);
    olympic.rotation.y = 0.25;
    R.add(olympic);
    // HMS HAWKE: a grey cruiser, her ram bow buried in the liner
    const hawke = new THREE.Group();
    const greyM = lam2({ color: "#6a7076" }), darkM = lam2({ color: "#4c5157" });
    const hh = new THREE.Mesh(new THREE.BoxGeometry(26, 3.4, 5.4), greyM);
    hh.position.set(0, 1.5, 0); hh.castShadow = true; hawke.add(hh);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.7, 8, 4), darkM);
    bow.rotation.z = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.55);
    bow.position.set(-16.5, 1.4, 0); hawke.add(bow);
    const hdeck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.18, 4.6), darkM);
    hdeck.position.set(0, 3.3, 0); hawke.add(hdeck);
    for (const fx of [-5, 4]) {
      const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 3.4, 10), greyM);
      fun.position.set(fx, 5.2, 0); fun.castShadow = true; hawke.add(fun);
    }
    for (const tx of [-9, 7]) {
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.9, 10), darkM);
      tur.position.set(tx, 3.8, 0); hawke.add(tur);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.4, 6), darkM);
      gun.rotation.z = Math.PI / 2 - 0.12; gun.position.set(tx - 1.8, 4.1, 0); hawke.add(gun);
    }
    const hmast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 8, 6), darkM);
    hmast.position.set(0.5, 7, 0); hawke.add(hmast);
    hawke.position.set(-56, 0, 20);
    hawke.rotation.y = -0.92;
    R.add(hawke);
    void r;
  }

  // ---------------- Titanic's boat deck (shot 5) ----------------
  private buildDeck(R: THREE.Group, r: () => number) {
    const cx = DECK[0], cz = DECK[2];
    const plat = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 11), lam2({ map: rep(planks(), 8, 3) }));
    plat.position.set(cx, 1.1, cz); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    // the hull side falling away to the sea (far edge)
    const side = new THREE.Mesh(new THREE.BoxGeometry(26, 4.6, 0.5), lam2({ color: "#20242c" }));
    side.position.set(cx, 0.1, cz - 5.6); R.add(side);
    // superstructure wall + a great funnel behind the figures
    const wall = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4, 0.5), lam2({ color: "#e8e4da" }));
    wall.position.set(cx, 3.9, cz + 3.4); wall.castShadow = true; R.add(wall);
    const winM = new THREE.MeshBasicMaterial({ color: "#ffd98d" });
    for (let i = 0; i < 6; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), winM);
      win.position.set(cx - 7.5 + i * 3, 4.2, cz + 3.1); R.add(win);
    }
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 5.2, 14), lam2({ color: "#c9973f" }));
    fun.position.set(cx - 4, 6.4, cz + 4.6); fun.castShadow = true; R.add(fun);
    const ftop = new THREE.Mesh(new THREE.CylinderGeometry(1.53, 1.53, 0.9, 14), lam2({ color: "#1b1b1b" }));
    ftop.position.set(cx - 4, 9.4, cz + 4.6); R.add(ftop);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 10, 7), lam2({ color: "#4c3d2c" }));
    mast.position.set(cx + 8, 7, cz + 3); R.add(mast);
    // the railing along the sea edge
    const railM = lam2({ color: "#3f4448" });
    for (let x = cx - 12; x <= cx + 12; x += 2.4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 6), railM);
      post.position.set(x, 2.72, cz - 5.2); R.add(post);
    }
    for (const ry of [2.95, 3.22]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.07, 0.07), railM);
      rail.position.set(cx, ry, cz - 5.2); R.add(rail);
    }
    // a lifeboat swung out on its davits, waiting
    const bt = this.lifeboat();
    bt.position.set(cx + 10.5, 3.3, cz + 1.5); bt.scale.setScalar(0.9);
    R.add(bt);
    for (const dx of [8.6, 12.4]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), railM);
      arm.position.set(dx, 4.6, cz + 1.5); arm.rotation.z = 0.5; R.add(arm);
    }
    // THE ICEBERG, sliding past in the dark beyond the rail
    R.add(this.iceberg(cx + 16, cz - 22, 1.6));
    void r;
  }

  // ---------------- the hospital anchorage (shot 7) ----------------
  private buildHosp(R: THREE.Group, r: () => number) {
    const cx = HOSP[0], cz = HOSP[2];
    const quay = new THREE.Mesh(new THREE.BoxGeometry(32, 0.55, 11), lam2({ map: rep(stone("jessopQuay2", ["#9a9284", "#8d8578", "#a39a8a", "#7d766a"]), 10, 3) }));
    quay.position.set(cx, 0.275, cz + 3.5); quay.castShadow = true; quay.receiveShadow = true; R.add(quay);
    const brit = this.liner(52, "BRITANNIC", "jessopHospKey", true);
    brit.position.set(cx - 2, 0, cz - 19);
    brit.rotation.y = -0.12;
    R.add(brit);
    // a quay hut with the red cross
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.7, 3), lam2({ color: "#c9b490", map: rep(planks(), 2, 1) }));
    hut.position.set(cx - 10.5, 1.9, cz + 1); hut.castShadow = true; R.add(hut);
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.1, 4), lam2({ color: "#4e4038", flatShading: true }));
    hutRoof.position.set(cx - 10.5, 3.8, cz + 1); hutRoof.rotation.y = Math.PI / 4; R.add(hutRoof);
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: crossSignTex() }));
    cross.position.set(cx - 10.5, 2.1, cz + 2.55); R.add(cross);
    this.lampPost(R, cx + 8, 0.55, cz + 7);
    this.lampPost(R, cx - 14, 0.55, cz + 7);
    void r;
  }

  // ---------------- the Aegean: Britannic (shots 8, 9, 10) ----------------
  private buildBritsea(R: THREE.Group, r: () => number) {
    this.britannic = this.liner(52, "BRITANNIC", "jessopHospKey2", true);
    this.britannic.position.set(BRIT_POS[0], 0, BRIT_POS[2]);
    this.britannic.rotation.y = 0.1;
    R.add(this.britannic);
    // the great propellers at her stern (animated in update)
    this.prop = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 10), lam2({ color: "#8a6a2f" }));
    hub.rotation.z = Math.PI / 2; this.prop.add(hub);
    const bladeM = lam2({ color: "#a8832f", flatShading: true });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.CircleGeometry(1.65, 3), bladeM);
      blade.position.set(0, 0, 0);
      blade.rotation.y = Math.PI / 2;
      const holder = new THREE.Group();
      holder.rotation.x = (i / 3) * Math.PI * 2;
      blade.position.set(0, 1.05, 0);
      holder.add(blade); this.prop.add(holder);
    }
    this.prop.position.set(BRIT_POS[0] + 27.5, 1.1, BRIT_POS[2]);
    R.add(this.prop);
    // the second lifeboat, waiting below the stern
    const boat = this.lifeboat();
    boat.position.set(3.8, 0.1, 54.5);
    boat.rotation.y = 0.4;
    R.add(boat);
    // a low Greek island on the horizon
    const isl = new THREE.Mesh(new THREE.ConeGeometry(26, 5.5, 7), lam2({ color: "#7d8a6a", flatShading: true }));
    isl.position.set(-95, 0, 130); R.add(isl);
    void r;
  }

  // ---------------- a liner's deck, golden years (shots 11, 13) ----------------
  private buildDeckgold(R: THREE.Group, r: () => number) {
    const cx = DECKGOLD[0], cz = DECKGOLD[2];
    const plat = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 10), lam2({ map: rep(planks(), 7, 3) }));
    plat.position.set(cx, 1.1, cz); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    const side = new THREE.Mesh(new THREE.BoxGeometry(22, 4.6, 0.5), lam2({ color: "#20242c" }));
    side.position.set(cx, 0.1, cz - 5.3); R.add(side);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(17, 3.2, 0.5), lam2({ color: "#e8e4da" }));
    wall.position.set(cx, 3.8, cz + 3.2); wall.castShadow = true; R.add(wall);
    const winM = new THREE.MeshBasicMaterial({ color: "#ffd98d" });
    for (let i = 0; i < 5; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), winM);
      win.position.set(cx - 6 + i * 3, 4.1, cz + 2.9); R.add(win);
    }
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 4.8, 14), lam2({ color: "#c9973f" }));
    fun.position.set(cx + 7, 6.2, cz + 4.2); fun.castShadow = true; R.add(fun);
    const ftop = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.43, 0.85, 14), lam2({ color: "#1b1b1b" }));
    ftop.position.set(cx + 7, 9.0, cz + 4.2); R.add(ftop);
    const railM = lam2({ color: "#3f4448" });
    for (let x = cx - 10; x <= cx + 10; x += 2.2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 6), railM);
      post.position.set(x, 2.72, cz - 4.9); R.add(post);
    }
    for (const ry of [2.95, 3.22]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.07, 0.07), railM);
      rail.position.set(cx, ry, cz - 4.9); R.add(rail);
    }
    const benchM = lam2({ color: "#6e5136", map: rep(planks(), 2, 1) });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.55), benchM);
    bench.position.set(cx - 6, 2.75, cz + 1); R.add(bench);
    for (const bx of [cx - 7.1, cx - 4.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.5), benchM);
      leg.position.set(bx, 2.45, cz + 1); R.add(leg);
    }
    void r;
  }

  // ---------------- the quiet room (shot 12) ----------------
  private buildPhone(R: THREE.Group, r: () => number) {
    const cx = PHONE[0], cz = PHONE[2];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 11), lam2({ map: rep(planks(), 5, 3) }));
    floor.position.set(cx, -0.1, cz); floor.receiveShadow = true; R.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), lam2({ color: "#5d4a5e", map: rep(stone("jessopRug", ["#5d4a5e", "#534154", "#67536a", "#4c3a50"]), 4, 3) }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(cx - 0.5, 0.012, cz - 0.5); rug.receiveShadow = true; R.add(rug);
    const wallM = lam2({ color: "#8a7a68", map: rep(planks(), 5, 2) });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(15, 5.6, 0.4), wallM);
    wall.position.set(cx, 2.8, cz - 5.2); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // a window onto the night, rain-streaked stars
    const winTex = ctex("jessopNightWin", 512, 384, (g, rr) => {
      g.fillStyle = "#14263f"; g.fillRect(0, 0, 512, 384);
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(240,246,255,${0.3 + rr() * 0.6})`; g.fillRect(rr() * 512, rr() * 300, 1.8, 1.8); }
      g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(400, 80, 24, 0, 7); g.fill();
      g.strokeStyle = "rgba(190,214,245,0.35)"; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = rr() * 512, y = rr() * 300; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 26 + rr() * 30); g.stroke(); }
    });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ map: winTex }));
    win.position.set(cx + 3.8, 3.1, cz - 4.95); R.add(win);
    const winF = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 0.12), lam2({ color: "#4c3a28" }));
    winF.position.set(cx + 3.8, 3.1, cz - 5.02); R.add(winF);
    // the armchair (her chair, for decades)
    const chairM = lam2({ color: "#6d4a52" });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.3), chairM);
    seat.position.set(cx - 0.3, 0.45, cz - 1.2); seat.castShadow = true; seat.receiveShadow = true; R.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.35), chairM);
    back.position.set(cx - 0.3, 1.3, cz - 1.75); back.castShadow = true; R.add(back);
    for (const dx of [-0.85, 0.85]) {
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 1.25), chairM);
      armR.position.set(cx - 0.3 + dx, 0.85, cz - 1.2); R.add(armR);
    }
    // the side table and THE TELEPHONE
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.95), lam2({ color: "#5d4430", map: rep(planks(), 1, 1) }));
    table.position.set(cx + 1.1, 0.66, cz - 1.8); table.castShadow = true; R.add(table);
    const tleg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.64, 0.09), lam2({ color: "#5d4430" }));
    tleg.position.set(cx + 1.1, 0.32, cz - 1.8); R.add(tleg);
    const phoneM = lam2({ color: "#1e1e22" });
    const pbase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.34), phoneM);
    pbase.position.set(cx + 1.1, 0.78, cz - 1.8); pbase.castShadow = true; R.add(pbase);
    const pdial = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), lam2({ color: "#c9ccce" }));
    pdial.rotation.x = 0.5; pdial.position.set(cx + 1.1, 0.88, cz - 1.72); R.add(pdial);
    const prec = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), phoneM);
    prec.position.set(cx + 1.1, 0.9, cz - 1.86); R.add(prec);
    // a standing lamp with a warm shade
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 7), lam2({ color: "#3a332a" }));
    lampPole.position.set(cx - 3.4, 1.25, cz - 2.6); R.add(lampPole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: "#ffd9a0", side: THREE.DoubleSide }));
    shade.position.set(cx - 3.4, 2.6, cz - 2.6); R.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffe9bb" }));
    bulb.position.set(cx - 3.4, 2.45, cz - 2.6); R.add(bulb);
    void r;
  }

  // ---------------- backdrop: far hills + a distant ship ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    const ridgeM = lam2({ color: "#5d7a8c", flatShading: true });
    const ridge2M = lam2({ color: "#476b52", flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + r() * 0.4, d = 230 + r() * 70;
      const h = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), i % 2 ? ridgeM : ridge2M);
      h.scale.set(90 + r() * 60, 22 + r() * 12, 46 + r() * 20);
      h.position.set(Math.cos(a) * d, -3, Math.sin(a) * d - 10); R.add(h);
    }
    // Southampton cranes behind the dock
    const craneM = lam2({ color: "#4c5157" });
    for (const [kx, kz] of [[48, -44], [92, -46]] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 13, 0.5), craneM);
      leg.position.set(kx, 6.5, kz); R.add(leg);
      const jib = new THREE.Mesh(new THREE.BoxGeometry(11, 0.45, 0.45), craneM);
      jib.position.set(kx + 3.5, 12.6, kz); jib.rotation.z = 0.18; R.add(jib);
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
    const fogK = id === 12 ? 2.1 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = s.light === "day" || s.light === "golden";
    this.skyStorm.visible = s.light === "storm";
    this.skyNight.visible = s.light === "night";
    for (const c2 of this.clouds) {
      (c2.material as THREE.SpriteMaterial).color.set(s.light === "storm" ? "#5a6675" : s.light === "night" ? "#2c3e58" : "#ffffff");
      (c2.material as THREE.SpriteMaterial).opacity = s.light === "storm" ? 0.55 : s.light === "night" ? 0.25 : 0.92;
    }
    // ---- the ships' fates ----
    const uu = clamp01((f - s.a) / Math.max(1, s.b - s.a));
    if (this.titanic) {
      const sk = titanicSink(id, uu);
      this.titanic.position.y = sk.dy;
      this.titanic.rotation.z = -sk.pitch;
      this.titanic.rotation.x = sk.roll;
    }
    if (this.britannic) {
      const sk = britSink(id, uu);
      this.britannic.position.y = sk.dy;
      this.britannic.rotation.z = -sk.pitch;
      this.britannic.rotation.x = sk.roll;
      // the stern — and its propellers — ride with the ship
      if (this.prop) {
        const sternLift = Math.sin(-sk.pitch) * 27.5;
        this.prop.position.y = 1.1 + sk.dy + sternLift;
        this.prop.rotation.x = (id === 9 || id === 10) ? f * 0.35 : 0;
        this.prop.visible = id === 8 || id === 9 || id === 10;
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
