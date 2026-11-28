// A Sumatran coffee garden as one three.js scene for the
// Fafnir-ID cover frame: kopi luwak — the world's most expensive
// coffee, from beans eaten and passed by the Asian palm civet.
// Terraced green hills, a dirt path down the middle, rows of
// coffee trees heavy with RED cherries, a wooden hut with a KOPI
// sign, bamboo drying racks, burlap sacks of beans. The hero prop
// is the GIANT steaming coffee cup (a billboard in cast.ts),
// cherries fluttering in the wind, leaves falling. VISUAL CORE:
// bright tropical daylight, red cherries + brown earth against
// layered greens, textured everything (anti-banding: speckled
// sky, flecked fields). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, ROAD_HALF, WALK_R, WALK_L, HERO_SPOT, HUT_POS, RACK_SPOT, SACK_SPOT, CUP_SPOT } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
/** One painted cumulus cluster on the sky canvas: lavender-grey
 *  shaded belly first, mid tone above it, sunlit white crown
 *  offset up-left — never a flat white blob. */
const paintPuff = (g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, s: number) => {
  const lobes: [number, number, number][] = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    lobes.push([cx + (t - 0.5) * s * 1.7, cy - Math.sin(t * Math.PI) * s * 0.34 + (r() - 0.5) * s * 0.14, s * (0.34 + 0.30 * Math.sin(t * Math.PI))]);
  }
  lobes.push([cx + (r() - 0.5) * s * 0.4, cy - s * 0.42, s * 0.30]);
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aebadd");            // shaded underside
  layer(s * 0.05, -s * 0.02, "#d7e2f5");    // mid tone
  layer(-s * 0.10, -s * 0.05, "#ffffff");   // sunlit crown
};
const skyTexDay = () => ctex("luwakSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#bcd9f7"); grad.addColorStop(1, "#e9f2fb");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
/** Golden-hour sky (shot 7 only): peach at the horizon rising
 *  through rose to muted mauve at the zenith, bigger warmer sun. */
const skyTexGolden = () => ctex("luwakSkyGolden", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#86708c"); grad.addColorStop(0.3, "#b57d88"); grad.addColorStop(0.55, "#d3866e");
  grad.addColorStop(0.8, "#e29468"); grad.addColorStop(1, "#eaa26e");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,220,170,0.22)"); wg.addColorStop(1, "rgba(255,220,170,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,230,200" : "90,50,60"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 340);
  sn.addColorStop(0, "rgba(255,230,170,0.95)"); sn.addColorStop(0.12, "rgba(255,200,120,0.6)"); sn.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = sn; g.fillRect(60, 0, 720, 560);
  g.fillStyle = "#ffe9bb"; g.beginPath(); g.arc(420, 200, 42, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("luwakGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** The hut sign: brown board, cream border, giant KOPI. */
const kopiSignTex = () => ctex("luwakSign", 1024, 512, (g) => {
  g.fillStyle = "#6b4a22"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#f4ead2"; g.lineWidth = 18; g.strokeRect(22, 22, 980, 468);
  g.strokeStyle = "rgba(244,234,210,0.55)"; g.lineWidth = 5; g.strokeRect(48, 48, 928, 416);
  g.fillStyle = "#f4ead2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 220px 'Arial Black', Arial, sans-serif";
  g.fillText("KOPI", 512, 215);
  g.font = "900 58px 'Arial Black', Arial, sans-serif";
  g.fillText("SUMATRA • LUWAK", 512, 395);
});
/** terraced field texture: layered greens, terrace bands,
 *  speckled anti-banding grain. */
const fieldTex = () => ctex("luwakField", 512, 512, (g, r) => {
  g.fillStyle = "#5da24a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12; i++) {
    const y = r() * 512;
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,60,0,0.08)";
    g.fillRect(0, y, 512, 14 + r() * 26);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "140,190,90" : "20,70,20"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512;
    g.fillStyle = "rgba(30,90,30,0.20)";
    g.beginPath(); g.ellipse(x, y, 8 + r() * 18, 6 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
  }
});
/** dirt path strip: warm brown, with two darker wheel ruts
 *  running along it + pebble speckle. */
const roadTex = () => ctex("luwakRoad", 512, 512, (g, r) => {
  g.fillStyle = "#b98a56"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.5 ? "rgba(220,180,130,0.5)" : "rgba(120,85,45,0.35)";
    g.lineWidth = 2 + r() * 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 8); g.stroke();
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "220,180,130" : "90,60,30"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // wheel ruts (drawn once per tile, tiled along Z)
  g.fillStyle = "rgba(90,60,30,0.4)";
  g.fillRect(150, 0, 26, 512);
  g.fillRect(336, 0, 26, 512);
});
/** wooden hut facade: warm brown vertical planks + a grid of
 *  windows, some lit gold, some dark — never a flat wall. */
const hutTex = (seed: number) => ctex(`luwakHut${seed}`, 512, 512, (g, r) => {
  const base = ["#8a6844", "#7a5a3c", "#94684a", "#835f42"][seed % 4];
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // vertical plank lines
  for (let x = 0; x < 512; x += 42) {
    g.fillStyle = "rgba(40,26,12,0.35)"; g.fillRect(x, 0, 3, 512);
    g.fillStyle = "rgba(255,235,200,0.10)"; g.fillRect(x + 3, 0, 2, 512);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,210" : "40,30,20"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.5, 2.5); }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 28 + col * 120, y = 30 + row * 96, w = 72, h = 62;
      const lit = r() > 0.4;
      g.fillStyle = lit ? "#ffd98a" : "#2e3a4e";
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(20,16,10,0.55)";
      g.fillRect(x, y + h / 2 - 2, w, 4);
      g.fillRect(x + w / 2 - 2, y, 4, h);
      g.strokeStyle = "rgba(30,22,14,0.7)"; g.lineWidth = 3;
      g.strokeRect(x, y, w, h);
      if (lit) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, y, w, 10); }
    }
  }
  // thatch strip along the top edge
  g.fillStyle = "#c9a86a";
  g.beginPath(); g.moveTo(0, 0);
  for (let x = 0; x <= 512; x += 32) g.lineTo(x, 10 + Math.sin(x * 0.05 + seed) * 8);
  g.lineTo(512, 0); g.closePath(); g.fill();
});
/** a single falling coffee leaf: small green ellipse */
const leafTex = () => ctex("luwakLeaf", 64, 64, (g) => {
  g.fillStyle = "#5a8a3a";
  g.beginPath(); g.ellipse(32, 32, 22, 10, -0.6, 0, 7); g.fill();
  g.fillStyle = "#7ab54a";
  g.beginPath(); g.ellipse(30, 30, 14, 6, -0.6, 0, 7); g.fill();
});
/** soft white puff sprite: chimney smoke + exhaust */
const puffTex = () => ctex("luwakPuff", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const blobTex = () => ctex("luwakBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(10,30,60,0.55)"); gr.addColorStop(0.6, "rgba(10,30,60,0.3)"); gr.addColorStop(1, "rgba(10,30,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** One wooden hut: plank box + pitched thatch roof. */
const makeHut = (w: number, h: number, d: number, seed: number) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    lam2({ map: rep(hutTex(seed), 1, Math.max(1, Math.round(h / 12))) }));
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // pitched roof: a 4-sided cone, squashed — thatch gold on top
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, h * 0.42, 4), lam2({ color: "#c9a86a" }));
  roof.position.y = h + h * 0.21; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, d / w); roof.castShadow = true; g.add(roof);
  return g;
};
/** A bamboo drying rack: four legs + a tray spread with beans. */
const makeRack = () => {
  const g = new THREE.Group();
  const bamboo = lam2({ color: "#c9a86a" });
  const bambooD = lam2({ color: "#a98a52" });
  for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), bambooD);
    leg.position.set(lx, 0.55, lz); g.add(leg);
  }
  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.5), bamboo);
  tray.position.y = 1.15; tray.castShadow = true; g.add(tray);
  // beans spread on the tray
  const beanM = lam2({ color: "#5a3218" });
  const beanGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const rr = rng(31);
  for (let i = 0; i < 40; i++) {
    const b = new THREE.Mesh(beanGeo, beanM);
    b.position.set(-1.1 + rr() * 2.2, 1.26, -0.6 + rr() * 1.2);
    b.scale.set(1, 0.6, 1);
    g.add(b);
  }
  return g;
};
/** A coffee tree: trunk + layered green canopy spheres + RED
 *  cherries dotted through it — the red is the episode's
 *  visual signature, so the cherries are big and saturated. */
const makeCoffeeTree = (seed = 1) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), lam2({ color: "#5d4028" }));
  trunk.position.y = 0.8; trunk.castShadow = true; g.add(trunk);
  const leafM = lam2({ color: "#2e6b2e" });
  const leafM2 = lam2({ color: "#357a35" });
  const blobs: [number, number, number, number][] = [[0, 2.6, 0, 1.5], [-0.8, 2.1, 0.2, 1.0], [0.8, 2.1, -0.2, 1.0], [0, 3.4, 0, 1.0]];
  blobs.forEach(([x, y, z, r2], i) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r2, 12, 9), i % 2 ? leafM2 : leafM);
    c.position.set(x, y, z); c.scale.y = 0.75; c.castShadow = true; g.add(c);
  });
  // RED cherries on the canopy surface
  const cherryM = lam2({ color: "#d92c2c" });
  const cherryGeo = new THREE.SphereGeometry(0.11, 8, 6);
  const rr = rng(seed * 17 + 5);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(cherryGeo, cherryM);
    const a = rr() * Math.PI * 2, rad2 = 0.9 + rr() * 0.6;
    c.position.set(Math.cos(a) * rad2, 2.0 + rr() * 1.6, Math.sin(a) * rad2 * 0.8);
    g.add(c);
  }
  return g;
};
/** The main hut: wide plank building + big KOPI sign board
 *  on posts facing the path + a drying rack beside it. The sign
 *  is the garden's landmark. */
const makeMainHut = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 7),
    lam2({ map: rep(hutTex(1), 1, 1) }));
  body.position.y = 3.25; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(8, 7) * 0.62, 2.8, 4), lam2({ color: "#c9a86a" }));
  roof.position.y = 6.5 + 1.4; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 7 / 8); roof.castShadow = true; g.add(roof);
  // door facing the path (-X side)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 1.5), lam2({ color: "#4a3020" }));
  door.position.set(-4.05, 1.3, 0.5); g.add(door);
  // warm windows on the path face
  for (const wz of [-2.2, 2.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.4), lam2({ color: "#ffd98a" }));
    win.position.set(-4.05, 3.4, wz); g.add(win);
  }
  // the giant KOPI sign board on posts, angled toward the camera side
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3),
    lam2({ map: kopiSignTex(), side: THREE.DoubleSide }));
  sign.position.set(-4.6, 3.4, 1.8); sign.rotation.y = -0.55; sign.castShadow = true; g.add(sign);
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 6), lam2({ color: "#5d4028" }));
    post.position.set(-4.6 + s * 1.7, 1.7, 1.8 + s * 0.95); g.add(post);
  }
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c8d8ea", 18, 170);
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
  private smokes: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1996);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#3a4a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const cloudSpots: [number, number, number, number][] = [
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, -350, 140],
      [-175, 108, -320, 115], [195, 116, -340, 120], [6, 70, -165, 66], [-128, 64, -155, 60],
      [102, 56, -135, 52], [248, 84, -250, 92],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudDay.push(sp.material.map as THREE.Texture);
      this.cloudGold.push(cloudHD(300 + i * 37, CLOUD_GOLD));
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    // the sun's halo + core, upper left over the street
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // falling coffee leaves: small green leaves drifting over the garden
    const leafM = new THREE.SpriteMaterial({ map: leafTex(), transparent: true, depthWrite: false, opacity: 0.9 });
    for (let i = 0; i < 42; i++) {
      const sp = new THREE.Sprite(leafM.clone());
      const bx = -14 + r() * 28, by = 0.5 + r() * 13, bz = -26 + r() * 34;
      sp.position.set(bx, by, bz);
      const sc = 0.14 + r() * 0.22;
      sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
      R.add(sp); this.leaves.push(sp);
      this.leafBase.push({ x: bx, y: by, z: bz, sp: 0.7 + r() * 0.9, ph: r() * 6.28 });
    }
    this.buildGarden(R, r);
  }

  // ---------------- the Sumatran coffee garden ----------------
  private buildGarden(R: THREE.Group, r: () => number) {
    // the terraced field itself: layered greens, speckled, endless
    const fieldMap = rep(fieldTex(), 30, 30);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
      lam2({ map: fieldMap, color: "#ffffff" }));
    field.rotation.x = -Math.PI / 2; field.position.set(0, 0, -80); field.receiveShadow = true; R.add(field);
    // the dirt path down the middle, with wheel ruts
    const roadMap = rep(roadTex(), 1, 24);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 220),
      lam2({ map: roadMap, color: "#ffffff" }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -80); road.receiveShadow = true; R.add(road);
    // grass strips flanking the path
    for (const s of [1, -1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 220), lam2({ color: "#6fae4e" }));
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(s * (ROAD_HALF + 1.1), 0.06, -80);
      strip.receiveShadow = true; R.add(strip);
    }
    // wooden huts lining both sides (varied heights/widths)
    const blocks: [number, number, number, number, number][] = [
      // x, z, w, h, d
      [9.5, -20, 7, 7, 8], [9.5, -33, 7, 6, 8], [9.5, -46, 9, 8, 10],
      [-9.5, -12, 8, 7, 9], [-9.5, -25, 7, 6, 8], [-9.5, -38, 9, 8, 10], [-9.5, -52, 7, 6, 8],
      [10.5, 4, 8, 7, 9], [-10.5, 2, 8, 6, 9],
    ];
    blocks.forEach(([x, z, w, h, d], i) => {
      const b = makeHut(w, h, d, i);
      b.position.set(x, 0, z);
      R.add(b);
    });
    // ---- THE MAIN HUT with the KOPI sign (right side, the landmark) ----
    const hut = makeMainHut();
    hut.position.set(HUT_POS[0], 0, HUT_POS[2]);
    R.add(hut);
    blob(R, HUT_POS[0], 0.05, HUT_POS[2], 9, 8, 0.25);
    // steam from the giant cup (animated in update)
    const steamM = new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(steamM.clone());
      sp.position.set(CUP_SPOT[0], 4.4, CUP_SPOT[2]);
      sp.scale.set(0.9, 0.9, 1); sp.layers.set(NOINK);
      R.add(sp);
      this.smokes.push({ sp, x: CUP_SPOT[0], y: 4.4, z: CUP_SPOT[2], ph: i * 0.33 });
    }
    // ---- bamboo drying racks along the path ----
    for (const [x, z] of [[RACK_SPOT[0], RACK_SPOT[2]], [RACK_SPOT[0] + 2.4, RACK_SPOT[2] - 1.6], [-RACK_SPOT[0], RACK_SPOT[2] - 4]] as [number, number][]) {
      const rack = makeRack();
      rack.position.set(x, 0, z);
      R.add(rack);
    }
    // ---- coffee trees along both sides of the path ----
    const treeSpots: [number, number][] = [[4.8, -12], [-4.8, -30], [4.8, -40], [-4.8, -6], [6.5, -22], [-6.5, -18]];
    treeSpots.forEach(([x, z], i) => {
      const tr = makeCoffeeTree(i + 1);
      tr.position.set(x, 0, z);
      R.add(tr);
    });
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
    // ---- sky dome + clouds: swap to the golden palette on golden shots ----
    this.skyDay.visible = true;
    const golden = s.light === "golden";
    if (golden !== this.skyGolden) {
      this.skyGolden = golden;
      (this.skyDay.material as THREE.MeshBasicMaterial).map = golden ? skyTexGolden() : skyTexDay();
      (this.skyDay.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.clouds.forEach((c2, i) => {
        (c2.material as THREE.SpriteMaterial).map = golden ? this.cloudGold[i] : this.cloudDay[i];
      });
    }
    for (const c2 of this.clouds) c2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // leaves fall + drift over the garden, looping
    for (let i = 0; i < this.leaves.length; i++) {
      const b = this.leafBase[i], sp = this.leaves[i];
      const fall = (b.y - tt * b.sp) % 13.5;
      sp.position.set(
        b.x + Math.sin(tt * 1.1 + b.ph) * 0.9,
        fall < 0.5 ? 13.5 + fall : fall,
        b.z + Math.cos(tt * 0.8 + b.ph) * 0.5,
      );
    }
    // steam rises + grows + fades from the giant cup, looped
    for (const sm of this.smokes) {
      const ph = (tt * 0.3 + sm.ph) % 1;
      const mat = sm.sp.material as THREE.SpriteMaterial;
      mat.opacity = 0.5 * (1 - ph);
      const sc2 = 0.7 + ph * 1.6;
      sm.sp.scale.set(sc2, sc2, 1);
      sm.sp.position.set(sm.x + ph * 1.8 + Math.sin(tt * 1.2 + sm.ph * 9) * 0.15, sm.y + ph * 2.4, sm.z);
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
