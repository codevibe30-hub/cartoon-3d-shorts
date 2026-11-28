// Lembata, Laut Sawu as one three.js scene for the Fafnir-ID
// cover frame: Desa Lamalera hunts sperm whales from wooden
// peledang sailboats with bamboo harpoons — the lamafa LEAPS onto
// the whale's back. The hero prop is the GIANT sperm whale
// surfacing beside the peledang: dark slate back breaking the
// swell, spout spraying, tail ready to thrash. The peledang is a
// long narrow wooden sailboat, cream lateen sail billowing, crew
// rowing. A volcano cone closes the far horizon. VISUAL CORE:
// bright Savu Sea daylight, deep blue rolling water, white spout
// spray, textured everything (anti-banding: speckled sky, flecked
// sea). Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, BOAT_POS, WHALE_HEAD, WHALE_TAIL, WHALE_MID, WHALE_TOP, VOLCANO_POS, SPOUT_POS, thrashAt, boatBob, whaleBob } from "./story";

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
const skyTexDay = () => ctex("lembataSkyDay", 2048, 1024, (g, r) => {
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
const skyTexGolden = () => ctex("lembataSkyGolden", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("lembataGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("lembataBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** deep open-sea texture: dark blue base, rolling swell streaks,
 *  white crest flecks — scrolled in update() so the sea FLOWS. */
const seaTex = () => ctex("lembataSea", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#1e6db4"); gr.addColorStop(0.5, "#1a5a9e"); gr.addColorStop(1, "#1e6db4");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.lineCap = "round";
  for (let i = 0; i < 110; i++) {
    const x = r() * 512, y = r() * 512, l = 30 + r() * 80;
    g.strokeStyle = r() > 0.5 ? "rgba(120,190,240,0.4)" : "rgba(20,70,130,0.45)";
    g.lineWidth = 2.5 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 5, x + l, y); g.stroke();
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.fillRect(r() * 512, r() * 512, 5 + r() * 9, 1.6);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,50,100"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** soft white puff sprite: spout spray + bow foam + wake */
const sprayTex = () => ctex("lembataSpray", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const blobTex = () => ctex("lembataBlob", 256, 256, (g) => {
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

/** The peledang: a long narrow wooden sailboat, bow toward -Z.
 *  Planked hull with raised bow/stern posts, a mast, a cream
 *  lateen sail, benches and a steering oar. ~10 m long. */
const makePeledang = () => {
  const g = new THREE.Group();
  const hullM = lam2({ color: "#7a5230", map: rep(planks(), 3, 1) });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 8.6), hullM);
  hull.position.y = 0.55; hull.castShadow = true; g.add(hull);
  // tapered bow + stern: cones lying along Z
  for (const s of [1, -1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 4), lam2({ color: "#6a4526" }));
    tip.rotation.x = s * Math.PI / 2; tip.rotation.y = Math.PI / 4;
    tip.scale.set(1, 1, 0.45);
    tip.position.set(0, 0.55, s * 5.0); tip.castShadow = true; g.add(tip);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6), lam2({ color: "#5d4028" }));
    post.position.set(0, 1.4, s * 5.5); post.rotation.x = s * -0.25; g.add(post);
  }
  // gunwale rails
  const railM = lam2({ color: "#5d4028" });
  for (const s of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 8.6), railM);
    rail.position.set(s * 0.86, 0.98, 0); g.add(rail);
  }
  // benches
  for (const bz of [-3, -1.2, 0.6, 2.4]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), lam2({ color: "#8a6844" }));
    bench.position.set(0, 0.92, bz); g.add(bench);
  }
  // mast + lateen sail (cream, billowing)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 8), lam2({ color: "#5d4028" }));
  mast.position.set(0, 3.9, -0.6); mast.castShadow = true; g.add(mast);
  const sailM = new THREE.MeshLambertMaterial({ color: "#f2e8c8", side: THREE.DoubleSide });
  const sailGeo = new THREE.PlaneGeometry(4.6, 4.4, 1, 1);
  const sail = new THREE.Mesh(sailGeo, sailM);
  sail.position.set(0.1, 4.4, -0.9);
  sail.rotation.set(0, 0.25, 0.5);
  sail.castShadow = true; g.add(sail);
  // steering oar at the stern
  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 2.6, 6), lam2({ color: "#8a6844" }));
  oar.position.set(0.7, 1.0, 4.6); oar.rotation.set(0.5, 0, -0.4); g.add(oar);
  // coiled rope
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 16), lam2({ color: "#c9b078" }));
  rope.rotation.x = Math.PI / 2; rope.position.set(-0.5, 0.98, 3.4); g.add(rope);
  return g;
};

/** The sperm whale: giant slate body along local +X (head at -X),
 *  blocky head, pale jaw, tapered tail stalk + broad flukes,
 *  one pectoral fin, a tiny eye. Built ~11 m long; the back
 *  breaks the surface at WHALE_TOP. */
const makeWhale = () => {
  const g = new THREE.Group();
  const skinM = lam2({ color: "#3d4a5c" });
  const bellyM = lam2({ color: "#8a97a8" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), skinM);
  body.scale.set(5.0, 1.0, 1.0);
  body.position.y = 0.45; body.castShadow = true; g.add(body);
  // blocky sperm-whale head (blunt, squared) at the -X end
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 12), skinM);
  head.scale.set(1.7, 1.0, 0.95);
  head.position.set(-4.6, 0.5, 0); head.castShadow = true; g.add(head);
  // pale lower jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.7), bellyM);
  jaw.position.set(-4.4, -0.15, 0); g.add(jaw);
  // belly stripe along the underside
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.08, 16, 10), bellyM);
  belly.scale.set(4.2, 0.55, 0.85);
  belly.position.set(-0.4, -0.15, 0); g.add(belly);
  // eye: a small dark dot on the head
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lam2({ color: "#10141c" }));
  eye.position.set(-4.9, 0.75, 0.95); g.add(eye);
  // pectoral fin, swept back under the body
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.7, 6), skinM);
  fin.scale.set(1, 1, 0.3);
  fin.position.set(-2.6, -0.25, 0.9); fin.rotation.set(0.5, 0, 1.1); g.add(fin);
  // tail stalk + flukes (animated as one group in update)
  const tailG = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.75, 2.6, 10), skinM);
  stalk.rotation.z = Math.PI / 2; stalk.position.set(1.3, 0.35, 0); stalk.castShadow = true; tailG.add(stalk);
  for (const s of [1, -1]) {
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 4), skinM);
    fluke.scale.set(1, 1, 0.22);
    fluke.position.set(2.9, 0.35, s * 0.95);
    fluke.rotation.x = s * Math.PI / 2; fluke.rotation.z = -Math.PI / 2 + s * 0.35;
    fluke.castShadow = true; tailG.add(fluke);
  }
  tailG.position.set(4.6, 0, 0);
  g.add(tailG);
  g.userData.tail = tailG;
  return g;
};
/** A distant volcano cone + a low island ridge closing the horizon. */
const makeVolcano = () => {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(30, 30, 20), lam2({ color: "#4a5a4a" }));
  cone.position.y = 12; cone.castShadow = false; g.add(cone);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(9, 9, 16), lam2({ color: "#6a7a72" }));
  cap.position.y = 24; g.add(cap);
  const ridge = new THREE.Mesh(new THREE.ConeGeometry(20, 10, 16), lam2({ color: "#3d4a52" }));
  ridge.position.set(42, 3, -18); g.add(ridge);
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
  private clouds: THREE.Sprite[] = [];
  private cloudDay: THREE.Texture[] = [];
  private cloudGold: THREE.Texture[] = [];
  private skyGolden = false;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private seaMap: THREE.Texture | null = null;
  private boat: THREE.Group | null = null;
  private sail: THREE.Object3D | null = null;
  private whale: THREE.Group | null = null;
  private whaleTail: THREE.Group | null = null;
  private spouts: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];
  private foams: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number; sc: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1996);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#2a4a6a", 0.55);
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
    // the sun's halo + core, upper left over the sea
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant bird flocks, small + high
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildSea(R, r);
  }

  // ---------------- the open sea ----------------
  private buildSea(R: THREE.Group, r: () => number) {
    // the sea itself: deep blue, scrolling texture — the water FLOWS
    const seaMap = rep(seaTex(), 30, 30);
    this.seaMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
      lam2({ map: seaMap, color: "#ffffff" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -80); sea.receiveShadow = true; R.add(sea);
    // ---- the peledang, bow toward -Z (toward the whale) ----
    const boat = makePeledang();
    boat.position.set(BOAT_POS[0], 0, BOAT_POS[2]);
    R.add(boat);
    this.boat = boat;
    boat.traverse((o) => { if (o instanceof THREE.Mesh && o.geometry instanceof THREE.PlaneGeometry) this.sail = o; });
    blob(R, BOAT_POS[0], 0.05, BOAT_POS[2], 3.4, 11, 0.3);
    // ---- the GIANT sperm whale, diagonal across the frame ----
    const whale = makeWhale();
    const yaw = Math.atan2(-(WHALE_TAIL[2] - WHALE_HEAD[2]), WHALE_TAIL[0] - WHALE_HEAD[0]);
    whale.position.set(WHALE_MID[0], 0, WHALE_MID[2]);
    whale.rotation.y = yaw;
    R.add(whale);
    this.whale = whale;
    this.whaleTail = whale.userData.tail as THREE.Group;
    blob(R, WHALE_MID[0], 0.05, WHALE_MID[2], 13, 5, 0.25);
    // ---- spout spray above the blowhole (animated in update) ----
    const sprayM = new THREE.SpriteMaterial({ map: sprayTex(), transparent: true, depthWrite: false, opacity: 0.6 });
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(sprayM.clone());
      sp.position.set(SPOUT_POS[0] + (i - 1) * 0.25, SPOUT_POS[1], SPOUT_POS[2]);
      sp.scale.set(0.8, 1.1, 1); sp.layers.set(NOINK);
      R.add(sp);
      this.spouts.push({ sp, x: SPOUT_POS[0] + (i - 1) * 0.25, y: SPOUT_POS[1], z: SPOUT_POS[2], ph: i * 0.33 });
    }
    // ---- foam + wake: bow spray, whale-side foam, tow wake ----
    const foamSpots: [number, number, number, number][] = [
      [BOAT_POS[0] - 0.9, 0.25, BOAT_POS[2] - 4.6, 1.1], [BOAT_POS[0] + 0.9, 0.25, BOAT_POS[2] - 4.4, 0.9],
      [WHALE_HEAD[0] + 0.5, 0.3, WHALE_HEAD[2] + 0.8, 1.6], [WHALE_MID[0], 0.3, WHALE_MID[2] + 1.6, 1.8],
      [BOAT_POS[0], 0.2, BOAT_POS[2] + 5.5, 2.2], [BOAT_POS[0], 0.2, BOAT_POS[2] + 8.5, 1.6],
    ];
    foamSpots.forEach(([x, y, z, sc], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprayTex(), transparent: true, depthWrite: false, opacity: 0.55 }));
      sp.position.set(x, y, z); sp.scale.set(sc, sc * 0.55, 1); sp.layers.set(NOINK);
      R.add(sp);
      this.foams.push({ sp, x, y, z, ph: i * 0.7, sc });
    });
    // ---- the volcano cone closing the far horizon ----
    const volc = makeVolcano();
    volc.position.set(VOLCANO_POS[0], 0, VOLCANO_POS[2]);
    R.add(volc);
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
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // the sea scrolls toward the viewer — it is not a poster
    if (this.seaMap) this.seaMap.offset.set(0, tt * 0.045);
    // the peledang bobs on the swell and the sail billows
    if (this.boat) {
      this.boat.position.y = boatBob(tt);
      this.boat.rotation.z = Math.sin(tt * 1.9) * 0.018;
      this.boat.rotation.x = Math.cos(tt * 1.4) * 0.012;
    }
    if (this.sail) this.sail.rotation.z = 0.5 + Math.sin(tt * 1.2) * 0.06;
    // the whale bobs slower and deeper; the tail thrashes on shots 4-5
    if (this.whale) this.whale.position.y = whaleBob(tt);
    if (this.whaleTail) {
      const th = thrashAt(id, tt);
      this.whaleTail.rotation.x = th * (0.35 + Math.sin(tt * 3.2) * 0.22);
      this.whaleTail.rotation.z = Math.sin(tt * 0.9) * 0.05;
    }
    // the spout sprays in pulses: rise + grow + fade, looped
    for (const st of this.spouts) {
      const ph = (tt * 0.5 + st.ph) % 1;
      const mat = st.sp.material as THREE.SpriteMaterial;
      mat.opacity = 0.7 * (1 - ph);
      const sc2 = 0.5 + ph * 1.1;
      st.sp.scale.set(sc2, sc2 * 1.5, 1);
      st.sp.position.set(st.x + Math.sin(tt * 1.6 + st.ph * 9) * 0.12, st.y + ph * 2.2, st.z);
    }
    // bow foam + wake breathe with the swell
    for (const fo of this.foams) {
      const mat = fo.sp.material as THREE.SpriteMaterial;
      mat.opacity = 0.4 + Math.sin(tt * 1.7 + fo.ph * 5) * 0.18;
      const sc3 = fo.sc * (1 + Math.sin(tt * 1.3 + fo.ph * 4) * 0.12);
      fo.sp.scale.set(sc3, sc3 * 0.55, 1);
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
