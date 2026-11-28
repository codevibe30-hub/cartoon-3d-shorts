// The Japanese dining corner as one three.js scene for the
// Fafnir-ID cover frame: tatami floor, a low dark-wood dining
// table at centre, the household altar glowing against the
// back wall (candles, incense), shoji screens lining the
// sides, paper lanterns, a hanging scroll. The hero prop is
// the GIANT tatebashi bowl (a billboard in cast.ts); incense
// smoke rises over the bowl and the altar. VISUAL CORE: warm
// interior amber against dark wood — textured everything
// (anti-banding: speckled walls, woven tatami). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, ROOM_HALF, HERO_SPOT, TABLE_POS, ALTAR_POS } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
/** The interior backdrop dome, day: deep warm umber above,
 *  amber at the horizon line, dark wood tones below — with a
 *  soft glow pooled behind the altar end of the room. */
const roomTexDay = () => ctex("sumpitRoomDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2e1c10"); grad.addColorStop(0.38, "#5a3a1e"); grad.addColorStop(0.62, "#8a5a2c");
  grad.addColorStop(0.85, "#6a4222"); grad.addColorStop(1, "#33200f");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  const glow = g.createRadialGradient(1024, 560, 20, 1024, 560, 620);
  glow.addColorStop(0, "rgba(255,196,110,0.35)"); glow.addColorStop(1, "rgba(255,196,110,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,170" : "20,10,4"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
});
/** Golden-hour backdrop (shot 7 only): the room sinks into
 *  dusk amber — rose at the horizon, deep plum-brown above. */
const roomTexGolden = () => ctex("sumpitRoomGolden", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#241016"); grad.addColorStop(0.36, "#5a2c22"); grad.addColorStop(0.62, "#a85a30");
  grad.addColorStop(0.85, "#7a3c20"); grad.addColorStop(1, "#2c1408");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  const glow = g.createRadialGradient(1024, 560, 20, 1024, 560, 680);
  glow.addColorStop(0, "rgba(255,180,100,0.4)"); glow.addColorStop(1, "rgba(255,180,100,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,210,160" : "24,8,8"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
});
/** soft radial glow sprite (lantern + candle halos) */
const glowTex = () => ctex("sumpitGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,244,214,1)"); gr.addColorStop(0.18, "rgba(255,226,160,0.75)");
  gr.addColorStop(0.5, "rgba(255,205,120,0.28)"); gr.addColorStop(1, "rgba(255,205,120,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft smoke puff: layered translucent blobs, no hard edge */
const smokeTex = () => ctex("sumpitSmoke", 128, 128, (g) => {
  for (const [x, y, rad, a] of [[64, 70, 44, 0.32], [44, 56, 30, 0.28], [86, 52, 28, 0.26], [64, 40, 24, 0.22]] as const) {
    const gr = g.createRadialGradient(x, y, 2, x, y, rad);
    gr.addColorStop(0, `rgba(238,238,242,${a})`); gr.addColorStop(1, "rgba(238,238,242,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
});
/** tatami: woven straw bands with dark green cloth borders */
const tatamiTex = () => ctex("sumpitTatami", 512, 512, (g, r) => {
  g.fillStyle = "#c9b078"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 128) {
    g.fillStyle = (y / 128) % 2 ? "rgba(120,95,40,0.13)" : "rgba(255,246,210,0.10)";
    g.fillRect(0, y, 512, 128);
    g.fillStyle = "#3f5a34"; g.fillRect(0, y, 512, 10);
    g.fillStyle = "rgba(240,230,190,0.5)"; g.fillRect(0, y + 10, 512, 2);
  }
  g.strokeStyle = "rgba(110,88,40,0.35)"; g.lineWidth = 1.4;
  for (let i = 0; i < 128; i++) {
    const y = r() * 512;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 4); g.stroke();
  }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "246,232,180" : "110,86,38"},${0.03 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** warm plaster-and-beam wall texture */
const wallTex = () => ctex("sumpitWall", 512, 512, (g, r) => {
  g.fillStyle = "#77572f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,196,140" : "52,32,14"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  for (let x = 0; x <= 512; x += 128) {
    g.fillStyle = "#4a2e16"; g.fillRect(x - 7, 0, 14, 512);
    g.fillStyle = "rgba(255,230,180,0.18)"; g.fillRect(x - 7, 0, 3, 512);
  }
  g.fillStyle = "#4a2e16"; g.fillRect(0, 0, 512, 16);
});
/** shoji paper: warm white with a dark lattice grid */
const shojiTex = () => ctex("sumpitShoji", 512, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#f6efdc"); grad.addColorStop(1, "#e8dcbc");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(190,170,120,${0.03 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.fillStyle = "#3a2412";
  for (let x = 0; x <= 512; x += 86) g.fillRect(x - 5, 0, 10, 512);
  for (let y = 0; y <= 512; y += 86) g.fillRect(0, y - 5, 512, 10);
});
/** hanging scroll: cream paper, one bold ink enso circle,
 *  a small red seal — calligraphy-free, safe at any distance */
const scrollTex = () => ctex("sumpitScroll", 512, 768, (g) => {
  g.fillStyle = "#efe6cc"; g.fillRect(0, 0, 512, 768);
  g.fillStyle = "#8a6a34"; g.fillRect(0, 0, 512, 26); g.fillRect(0, 742, 512, 26);
  g.strokeStyle = "rgba(150,124,70,0.5)"; g.lineWidth = 3; g.strokeRect(18, 40, 476, 688);
  g.strokeStyle = "#22202a"; g.lineCap = "round";
  g.lineWidth = 34;
  g.beginPath(); g.arc(256, 320, 130, 0.7, Math.PI * 1.82); g.stroke();
  g.lineWidth = 15;
  g.beginPath(); g.arc(256, 320, 130, Math.PI * 1.82, Math.PI * 2.06); g.stroke();
  g.fillStyle = "#b03024";
  g.beginPath(); g.roundRect(356, 596, 52, 52, 6); g.fill();
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.arc(382, 622, 12, 0, 7); g.fill();
});
/** dark wood grain for table, platform, beams */
const woodTex = () => ctex("sumpitWood", 512, 512, (g, r) => {
  g.fillStyle = "#4a2c16"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24; i++) {
    const y = r() * 512;
    g.strokeStyle = `rgba(${20 + r() * 26},${12 + r() * 16},${6 + r() * 8},0.55)`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 10); g.stroke();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "190,140,84" : "24,14,6"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.5, 2.5); }
});
const blobTex = () => ctex("sumpitBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(16,8,2,0.55)"); gr.addColorStop(0.6, "rgba(16,8,2,0.3)"); gr.addColorStop(1, "rgba(16,8,2,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A shoji screen: dark frame, glowing paper lattice. */
const makeShoji = (w = 3.6, h = 4.8) => {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: shojiTex(), side: THREE.DoubleSide }));
  paper.position.y = h / 2; g.add(paper);
  const frameM = lam2({ color: "#3a2412" });
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.1), frameM);
    post.position.set(s * (w / 2), h / 2, 0.02); post.castShadow = true; g.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.14, 0.1), frameM);
  top.position.set(0, h, 0.02); g.add(top);
  return g;
};
/** The low dining table: dark lacquered top on four legs. */
const makeLowTable = () => {
  const g = new THREE.Group();
  const wood = lam2({ map: rep(woodTex(), 2, 1) });
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 2.5), wood);
  top.position.y = 0.74; top.castShadow = true; top.receiveShadow = true; g.add(top);
  for (const [lx, lz] of [[-2.5, -1.0], [2.5, -1.0], [-2.5, 1.0], [2.5, 1.0]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), wood);
    leg.position.set(lx, 0.34, lz); leg.castShadow = true; g.add(leg);
  }
  return g;
};
/** A floor cushion (zabuton): indigo with a stitched border. */
const makeCushion = () => {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.13, 1.15), lam2({ color: "#37456e" }));
  c.position.y = 0.065; c.castShadow = true; c.receiveShadow = true; g.add(c);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.05, 1.24), lam2({ color: "#2a3350" }));
  trim.position.y = 0.03; g.add(trim);
  return g;
};
/** A standing paper lantern (andon): wooden frame, warm
 *  paper core, its own halo sprite. */
const makeLantern = (R: THREE.Group, x: number, z: number) => {
  const g = new THREE.Group();
  const frameM = lam2({ color: "#2e1c0e" });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 6), frameM);
  pole.position.y = 1.55; pole.castShadow = true; g.add(pole);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.62),
    new THREE.MeshBasicMaterial({ map: shojiTex() }));
  lamp.position.y = 2.9; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.74), frameM);
  cap.position.y = 3.33; g.add(cap);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), frameM);
  base.position.y = 0.04; g.add(base);
  g.position.set(x, 0, z);
  R.add(g);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.55 }));
  glow.position.set(x, 2.9, z + 0.3); glow.scale.set(3.4, 3.4, 1); glow.layers.set(NOINK); R.add(glow);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c8a888", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private cloudDay: THREE.Texture[] = [];
  private cloudGold: THREE.Texture[] = [];
  private skyGolden = false;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private cloudBase: { x: number; sp: number }[] = [];
  private leaves: THREE.Sprite[] = [];
  private leafBase: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private smoke: THREE.Sprite[] = [];
  private smokeBase: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private candleGlows: THREE.Sprite[] = [];
  private waterMat: THREE.MeshLambertMaterial | null = null;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1996);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#ffe8c8", "#4a3423", 0.55);
    this.sun = new THREE.DirectionalLight("#ffedd6", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#ffd9b0", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- backdrop dome (the room's warm gradient shell) ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: roomTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    // drifting dust motes in the lantern light
    const moteM = new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.32 });
    for (let i = 0; i < 36; i++) {
      const sp = new THREE.Sprite(moteM.clone());
      const bx = -11 + r() * 22, by = 0.5 + r() * 6.5, bz = -17 + r() * 21;
      sp.position.set(bx, by, bz);
      const sc = 0.10 + r() * 0.16;
      sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
      R.add(sp); this.leaves.push(sp);
      this.leafBase.push({ x: bx, y: by, z: bz, sp: 0.25 + r() * 0.4, ph: r() * 6.28 });
    }
    // incense smoke: two emitters — over the tatebashi bowl on
    // the table, and over the altar's incense burner
    const smokeM = new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0.4 });
    const emitters: [number, number, number][] = [[0, 2.15, -4.9], [0.35, 1.7, -11.2], [-0.35, 1.7, -11.2]];
    for (const [ex, ey, ez] of emitters) {
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Sprite(smokeM.clone());
        sp.position.set(ex, ey, ez);
        sp.scale.set(0.6, 0.6, 1); sp.layers.set(NOINK);
        R.add(sp); this.smoke.push(sp);
        this.smokeBase.push({ x: ex, y: ey, z: ez, sp: 0.8 + r() * 0.5, ph: r() });
      }
    }
    // candle halos at the altar (positions match the altar
    // billboard's painted candles in cast.ts)
    for (const cx of [-1.1, 1.1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
      sp.position.set(cx, 2.12, -11.15); sp.scale.set(0.9, 0.9, 1); sp.layers.set(NOINK);
      R.add(sp); this.candleGlows.push(sp);
    }
    this.buildRoom(R, r);
  }

  // ---------------- the dining corner ----------------
  private buildRoom(R: THREE.Group, r: () => number) {
    // tatami floor
    const tatamiMap = rep(tatamiTex(), 3, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, 84), lam2({ map: tatamiMap, color: "#ffffff" }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -10);
    floor.receiveShadow = true; R.add(floor);
    // back wall with beams
    const wallMap = rep(wallTex(), 6, 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(38, 13), lam2({ map: wallMap, color: "#ffffff" }));
    wall.position.set(0, 6.5, -17.5); wall.receiveShadow = true; R.add(wall);
    // a heavy ceiling beam crossing above the altar end
    const beam = new THREE.Mesh(new THREE.BoxGeometry(17, 0.55, 0.65), lam2({ map: rep(woodTex(), 4, 1) }));
    beam.position.set(0, 6.6, -10.5); beam.castShadow = true; R.add(beam);
    // ---- the low dining table + cushions ----
    const table = makeLowTable();
    table.position.set(TABLE_POS[0], 0, TABLE_POS[2]);
    R.add(table);
    blob(R, 0, 0.03, -5.5, 7.5, 4.2, 0.3);
    for (const cx of [-1.45, 1.45]) {
      const cu = makeCushion();
      cu.position.set(cx, 0, -3.55);
      R.add(cu);
    }
    // ---- the altar platform against the back wall ----
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 1.3), lam2({ map: rep(woodTex(), 3, 1) }));
    platform.position.set(ALTAR_POS[0], 0.25, ALTAR_POS[2]); platform.castShadow = true; platform.receiveShadow = true; R.add(platform);
    blob(R, 0, 0.03, -11.4, 7, 3, 0.3);
    // ---- the hanging scroll on the back wall, right side ----
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.0),
      new THREE.MeshBasicMaterial({ map: scrollTex(), side: THREE.DoubleSide }));
    scroll.position.set(4.6, 4.3, -17.3); scroll.castShadow = true; R.add(scroll);
    // ---- shoji screens lining both sides ----
    const screenSpots: [number, number, number][] = [[-7.4, -7.5, 0.38], [7.4, -7.5, -0.38], [-7.8, -13.5, 0.22], [7.8, -13.5, -0.22]];
    screenSpots.forEach(([x, z, rot]) => {
      const sc2 = makeShoji(3.6, 4.8);
      sc2.position.set(x, 0, z);
      sc2.rotation.y = rot;
      R.add(sc2);
    });
    // ---- standing lanterns flanking the altar ----
    makeLantern(R, -5.6, -12.6);
    makeLantern(R, 5.6, -12.6);
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
    this.fog.near = Lp.fogNear * 1.6; this.fog.far = Lp.fogFar * 1.6;
    scene.fog = this.fog; scene.background = null;
    // ---- backdrop dome: swap to the golden palette on golden shots ----
    this.skyDay.visible = true;
    const golden = s.light === "golden";
    if (golden !== this.skyGolden) {
      this.skyGolden = golden;
      (this.skyDay.material as THREE.MeshBasicMaterial).map = golden ? roomTexGolden() : roomTexDay();
      (this.skyDay.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    // ---- STANDAR GERAK: everything that should move, moves ----
    // incense smoke rises, swells and fades over bowl + altar
    for (let i = 0; i < this.smoke.length; i++) {
      const b = this.smokeBase[i], sp = this.smoke[i];
      const u = (tt * 0.13 * b.sp + b.ph) % 1;
      sp.position.set(
        b.x + Math.sin(tt * 0.9 + b.ph * 7) * 0.10 + u * 0.38,
        b.y + u * 1.8,
        b.z + Math.cos(tt * 0.7 + b.ph * 5) * 0.06,
      );
      const sc3 = 0.55 + u * 1.6;
      sp.scale.set(sc3, sc3, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.40 * Math.sin(Math.PI * u);
    }
    // candle flames breathe: their halos pulse unevenly
    this.candleGlows.forEach((sp, i) => {
      const k = 0.82 + 0.13 * Math.sin(tt * 13 + i * 2.1) + 0.05 * Math.sin(tt * 29 + i);
      sp.scale.set(0.9 * k, 0.9 * k, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.62 + 0.2 * k;
    });
    // dust motes drift slowly through the lantern light
    for (let i = 0; i < this.leaves.length; i++) {
      const b = this.leafBase[i], sp = this.leaves[i];
      sp.position.set(
        b.x + Math.sin(tt * b.sp + b.ph) * 0.7,
        b.y + Math.sin(tt * b.sp * 0.6 + b.ph * 2) * 0.4,
        b.z + Math.cos(tt * b.sp * 0.8 + b.ph) * 0.4,
      );
    }
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
