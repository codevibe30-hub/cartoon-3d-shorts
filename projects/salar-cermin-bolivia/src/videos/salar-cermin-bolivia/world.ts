// The Salar ground, Bolivia as one three.js scene for the
// Fafnir-ID format: the flooded salt flat as a giant mirror
// (painted sky-glass sheet with drifting reflected clouds
// and twinkling glints), the white crust ringing it, the
// dry hexagon field far down +z, Incahuasi island with its
// giant cacti far -x/-z, and — beyond the dry field — the
// ancient Lake Minchin with its volcano shore. VISUAL CORE:
// the mirror itself, already shimmering at frame 0.
// Everything textured (anti-banding: grain + speckle on
// every surface). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, stoneHD, stone } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, JEEP, LEVEL, LITH, ISLAND, HERO_LAKE } from "./story";

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
  layer(s * 0.16, 0, "#aebadd");
  layer(s * 0.05, -s * 0.02, "#d7e2f5");
  layer(-s * 0.10, -s * 0.05, "#ffffff");
};
const skyTexDay = () => ctex("salarSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2a5ca8"); grad.addColorStop(0.34, "#4a80c4"); grad.addColorStop(0.62, "#8ab0dd");
  grad.addColorStop(0.85, "#ccd9e4"); grad.addColorStop(1, "#e8e6d2");
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
/** soft radial glow sprite */
const glowTex = () => ctex("salarGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("salarBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** wrap-draw: calls fn at every tiled offset an item of radius
 *  `rad` at (x, y) bleeds into, so a canvas tiles without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** white salt crust: bright body, faint hexagon seams,
 *  sparkle grains — the dry ring around the mirror */
const saltTex = () => ctex("salarSalt", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#eef0ea"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const x = r() * S, y = r() * S, rad = 50 + r() * 150;
    wrapDraw(S, x, y, rad * 1.2, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.1, xx, yy, rad);
      const c = r() < 0.5 ? "206,214,208" : "255,255,250";
      gr.addColorStop(0, `rgba(${c},0.30)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(xx, yy, rad, rad * 0.7, r() * 3, 0, 7); g.fill();
    });
  }
  // faint hexagon seams (offset brick rows of hexagons)
  g.strokeStyle = "rgba(148,158,150,0.35)"; g.lineWidth = 3;
  const R = 64, W = R * 1.732, H = R * 1.5;
  for (let row = -1; row < S / H + 1; row++) for (let col = -1; col < S / W + 1; col++) {
    const cx = col * W + (row % 2 ? W / 2 : 0), cy = row * H;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3;
      const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.stroke();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "168,178,172"},${0.10 + r() * 0.22})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** the DRY field: bold giant hexagon crust, sun-bleached */
const dryHexTex = () => ctex("salarDryHex", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#f2f1e8"; g.fillRect(0, 0, S, S);
  const R = 128, W = R * 1.732, H = R * 1.5;
  for (let row = -1; row < S / H + 1; row++) for (let col = -1; col < S / W + 1; col++) {
    const cx = col * W + (row % 2 ? W / 2 : 0), cy = row * H;
    const sh = 0.92 + r() * 0.10;
    g.fillStyle = `rgb(${Math.round(242 * sh)},${Math.round(241 * sh)},${Math.round(232 * sh)})`;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3;
      const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(120,128,124,0.85)"; g.lineWidth = 7; g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 2.4;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3;
      const px = cx + Math.cos(a) * (R - 6), py = cy + Math.sin(a) * (R - 6);
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.stroke();
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "170,178,170"},${0.08 + r() * 0.18})`; g.fillRect(r() * S, r() * S, 2.4, 2.4); }
});
/** THE MIRROR: sky-glass — a deep blue-to-pale gradient with
 *  soft reflected cloud blobs and a field of tiny sparkles.
 *  One sheet, no tiling: the horizon end is paler. */
const mirrorTex = () => ctex("salarMirror", 1024, 1024, (g, r) => {
  const S = 1024;
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, "#bcd6ee"); grad.addColorStop(0.4, "#9ec2e6"); grad.addColorStop(0.75, "#7ba9d8"); grad.addColorStop(1, "#5d92c8");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  // reflected cloud smears (wide, squashed, soft)
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S, w = 90 + r() * 260;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, `rgba(255,255,255,${0.10 + r() * 0.16})`); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.14 + r() * 0.08); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  // darker blue depth smears
  for (let i = 0; i < 26; i++) {
    const x = r() * S, y = r() * S, w = 70 + r() * 170;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, `rgba(38,84,140,${0.06 + r() * 0.10})`); wg.addColorStop(1, "rgba(38,84,140,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.12); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  // sparkle field
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.4})`; g.fillRect(r() * S, r() * S, 1.8, 1.8); }
});
/** open lake water for the ancient-lake flashback */
const lakeTex = () => ctex("salarLake", 512, 512, (g, r) => {
  g.fillStyle = "#3f74a8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "24,52,88" : "126,176,220"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 5 + r() * 10, 0, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(220,240,255,0.35)"; g.lineCap = "round";
  for (let i = 0; i < 130; i++) {
    g.lineWidth = 1.4 + r() * 1.6;
    const x = r() * 512, y = r() * 512, l = 8 + r() * 22;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2.4, x + l, y); g.stroke();
  }
});
/** cactus skin: green with vertical rib stripes + speckle */
const cactusTex = () => ctex("salarCactus", 256, 256, (g, r) => {
  g.fillStyle = "#5d9146"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = "rgba(20,44,14,0.35)"; g.fillRect(x, 0, 5, 256);
    g.fillStyle = "rgba(190,230,160,0.30)"; g.fillRect(x + 14, 0, 7, 256);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,246,200" : "16,36,10"},${0.10 + r() * 0.2})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** totora reed: golden straw bundles */
const reedTex = () => ctex("salarReed", 256, 256, (g, r) => {
  g.fillStyle = "#b08d4e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 380; i++) {
    g.strokeStyle = `rgba(${r() > 0.5 ? "226,196,128" : "122,90,40"},${0.25 + r() * 0.3})`;
    g.lineWidth = 1.6 + r() * 1.6;
    const x = r() * 256;
    g.beginPath(); g.moveTo(x, 256); g.lineTo(x + (r() - 0.5) * 14, 0); g.stroke();
  }
});
/** a soft smoke puff */
const smokeTex = () => ctex("salarSmoke", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(232,234,238,0.55)"); gr.addColorStop(0.6, "rgba(216,218,224,0.28)"); gr.addColorStop(1, "rgba(216,218,224,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A giant cactus of Incahuasi: a ribbed column with a
 *  rounded cap and (on the tall ones) two bent arms. */
const makeCactus = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const mat = lam2({ color: "#a8e08a", map: rep(cactusTex(), 2, 3) });
  const rad = 0.16 + h * 0.028;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad * 1.08, h, 12), mat);
  col.position.y = h / 2; col.castShadow = true; g.add(col);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.92, 12, 8), mat);
  cap.position.y = h; cap.scale.y = 0.75; g.add(cap);
  if (h > 4.5) {
    for (const sx of [-1, 1]) {
      const ay = h * (0.52 + (seed % 3) * 0.07) * (sx > 0 ? 1 : 0.88);
      const ah = h * 0.30;
      const horiz = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, rad * 2.6, 9), mat);
      horiz.rotation.z = Math.PI / 2; horiz.position.set(sx * rad * 1.7, ay, 0); horiz.castShadow = true; g.add(horiz);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.46, rad * 0.5, ah, 9), mat);
      up.position.set(sx * rad * 3.0, ay + ah / 2, 0); up.castShadow = true; g.add(up);
      const ucap = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.46, 9, 7), mat);
      ucap.position.set(sx * rad * 3.0, ay + ah, 0); ucap.scale.y = 0.75; g.add(ucap);
    }
  }
  void seed;
  return g;
};

/** A distant volcano: a broad cone, rock strata, snow cap. */
const makeVolcano = (h: number, rad: number, snow = true) => {
  const g = new THREE.Group();
  const rockM = lam2({ map: rep(stoneHD("salarVolc", ["#8a6a52", "#77573f", "#9c7c5e", "#6b4c34"], "#4c3626"), 4, 2), color: "#b99a7c" });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 18), rockM);
  cone.position.y = h / 2; g.add(cone);
  if (snow) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.30, h * 0.30, 18), lam2({ color: "#f4f6f2" }));
    cap.position.y = h * 0.85; g.add(cap);
  }
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c3d2e4", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private sunGlows: THREE.Sprite[] = [];
  // ---- episode systems ----
  private reflClouds: { m: THREE.Mesh; x0: number; sp: number }[] = [];
  private glints: { sp: THREE.Sprite; ph: number }[] = [];
  private jeep!: THREE.Group;
  private sat!: THREE.Group;
  private satBlink!: THREE.MeshBasicMaterial;
  private poolMat!: THREE.MeshLambertMaterial;
  private poolGlow!: THREE.Sprite;
  private battMat!: THREE.MeshLambertMaterial;
  private boat!: THREE.Group;
  private lakeT!: THREE.Texture;
  private volcSmoke: { sp: THREE.Sprite; off: number }[] = [];
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(52);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a97a8", 0.55);
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
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, 350, 140],
      [-175, 108, 320, 115], [195, 116, 340, 120], [6, 70, -165, 66], [-128, 64, 155, 60],
      [102, 56, 135, 52], [248, 84, -250, 92],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow); this.sunGlows.push(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core); this.sunGlows.push(core);
    this.buildMirror(R, r);
    this.buildDryField(R, r);
    this.buildIsland(R, r);
    this.buildLake(R, r);
    this.buildProps(R, r);
  }

  // ---------------- the mirror + the white ring ----------------
  private buildMirror(R: THREE.Group, r: () => number) {
    // the white salt ring under everything (the dry surround)
    const salt = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), lam2({ map: rep(saltTex(), 46, 46), color: "#ffffff" }));
    salt.rotation.x = -Math.PI / 2; salt.position.set(0, -0.03, 40); salt.receiveShadow = true; R.add(salt);
    // THE MIRROR SHEET: sky-glass over the flooded heart
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(150, 78),
      new THREE.MeshPhongMaterial({ map: mirrorTex(), shininess: 90, specular: new THREE.Color("#bcd8f4") }));
    mir.rotation.x = -Math.PI / 2; mir.rotation.z = Math.PI; // pale end toward the horizon (-z)
    mir.position.set(0, 0, -10); mir.receiveShadow = true; R.add(mir);
    // reflected clouds: flipped puffs lying on the sheet,
    // drifting with the sky (registered for update)
    for (let i = 0; i < 7; i++) {
      const w = 16 + r() * 22;
      const geo = new THREE.PlaneGeometry(w, w * 0.36);
      geo.scale(1, -1, 1); // flip: a reflection, not a copy
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: cloudHD(500 + i * 53, CLOUD_DAY), transparent: true, depthWrite: false, opacity: 0.34,
      }));
      const x0 = -58 + r() * 116;
      m.rotation.x = -Math.PI / 2;
      m.position.set(x0, 0.012, -34 + r() * 52);
      m.renderOrder = 1; m.layers.set(NOINK); R.add(m);
      this.reflClouds.push({ m, x0, sp: 0.30 + (i % 3) * 0.14 });
    }
    // twinkling glints on the water film
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      const sc = 0.6 + r() * 1.1;
      sp.scale.set(sc, sc * 0.4, 1);
      sp.position.set(-46 + r() * 92, 0.06, -30 + r() * 44);
      sp.layers.set(NOINK); R.add(sp);
      this.glints.push({ sp, ph: r() * 20 });
    }
    // salt mounds (harvest piles) on the ring, edges of the sheet
    const moundM = lam2({ map: rep(saltTex(), 2, 1), color: "#ffffff" });
    const moundSpots: [number, number, number][] = [
      [-24, 16, 1.2], [-19, 19, 0.9], [27, 14, 1.4], [33, 18, 0.8], [-38, -34, 1.1], [42, -30, 1.3], [18, 22, 0.7],
    ];
    for (const [x, z, h] of moundSpots) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(h * 1.15, h, 12), moundM);
      m.position.set(x, h / 2 - 0.02, z); m.castShadow = true; R.add(m);
    }
    // distant volcanoes + mountain silhouettes on the horizon:
    // FAR and plain-coloured, so fog hazes them into the sky —
    // silhouettes, never brick pyramids
    const farM = lam2({ color: "#7d94ac" });
    const farM2 = lam2({ color: "#8aa2ba" });
    const farCone = (h: number, rad: number, x: number, z: number, m: THREE.Material) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 14), m);
      cone.position.set(x, h / 2 - 0.5, z); R.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.3, h * 0.3, 14), lam2({ color: "#e8edf2" }));
      cap.position.set(x, h * 0.85 - 0.5, z); R.add(cap);
    };
    farCone(26, 48, -150, -320, farM);
    farCone(22, 40, 120, -340, farM2);
    farCone(30, 55, 0, -395, farM);
    const hillM = lam2({ color: "#7d94ac" });
    for (const [hx, hz, hs] of [[-190, -60, 34], [185, -40, 28], [-170, 90, 30], [175, 110, 26]] as [number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hs, 14, 10), hillM);
      hill.scale.y = 0.32; hill.position.set(hx, 0, hz); R.add(hill);
    }
  }

  // ---------------- the dry hexagon field ----------------
  private buildDryField(R: THREE.Group, r: () => number) {
    const dry = new THREE.Mesh(new THREE.PlaneGeometry(110, 84), lam2({ map: rep(dryHexTex(), 9, 7), color: "#ffffff" }));
    dry.rotation.x = -Math.PI / 2; dry.position.set(0, 0.004, 125); dry.receiveShadow = true; R.add(dry);
    // scattered crust chunks at the field's edge
    const chunkM = lam2({ map: rep(saltTex(), 1, 1), color: "#f6f6f0" });
    for (let i = 0; i < 14; i++) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.10 + r() * 0.2, 7, 6), chunkM);
      const a = r() * Math.PI * 2, rad = 12 + r() * 30;
      st.position.set(Math.cos(a) * rad, 0.03, 125 + Math.sin(a) * rad * 0.7);
      st.scale.y = 0.5; st.castShadow = true; R.add(st);
    }
  }

  // ---------------- Incahuasi island ----------------
  private buildIsland(R: THREE.Group, r: () => number) {
    const rockM = lam2({ map: rep(stone("salarIslandRock", ["#9c7c5e", "#86644a", "#ad8a68", "#77573f"]), 6, 3), color: "#b08c60", flatShading: true });
    // the rocky hill: a wide cone, vertices jittered hard so
    // the silhouette breaks — a crag, never a smooth pyramid
    const hillGeo = new THREE.ConeGeometry(17, 7.5, 26, 3);
    const posA = hillGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < posA.count; i++) {
      const y = posA.getY(i);
      if (y < 3.4) {
        posA.setX(i, posA.getX(i) * (1 + (r() - 0.5) * 0.24));
        posA.setZ(i, posA.getZ(i) * (1 + (r() - 0.5) * 0.24));
        posA.setY(i, y + (r() - 0.5) * 0.8);
      }
    }
    hillGeo.computeVertexNormals();
    const hill = new THREE.Mesh(hillGeo, rockM);
    hill.position.set(ISLAND[0], 3.55, ISLAND[2]); hill.scale.set(1, 1, 0.82); hill.castShadow = true; hill.receiveShadow = true; R.add(hill);
    blob(R, ISLAND[0], 0.012, ISLAND[2], 40, 40, 0.4);
    // the giant cacti: the 10 m giant near the top, family around
    const hillY = (x: number, z: number) => {
      const d = Math.hypot(x - ISLAND[0], z - ISLAND[2]);
      return Math.max(0, 7.3 * (1 - d / 17)) - 0.25;
    };
    const cactusSpots: [number, number, number][] = [
      [-53.5, -69.5, 10], [-47, -70, 7.5], [-56, -62, 6], [-45.5, -61.5, 5],
      [-51, -58.5, 4.2], [-58.5, -67, 5.4], [-43.8, -66.5, 3.6],
    ];
    cactusSpots.forEach(([x, z, h], i) => {
      const c = makeCactus(h, i + 2);
      c.position.set(x, hillY(x, z), z);
      c.rotation.y = r() * 3;
      R.add(c);
    });
    // boulders spilling off the island's skirts
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2, rad = 15 + r() * 7;
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.4 + r() * 0.9, 9, 7), rockM);
      st.position.set(ISLAND[0] + Math.cos(a) * rad, 0.2, ISLAND[2] + Math.sin(a) * rad);
      st.scale.y = 0.65; st.castShadow = true; R.add(st);
    }
  }

  // ---------------- the ancient lake (flashback) ----------------
  private buildLake(R: THREE.Group, r: () => number) {
    this.lakeT = rep(lakeTex(), 8, 5);
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(190, 100), lam2({ map: this.lakeT, color: "#cfe2f2" }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(0, 0.002, 238); lake.receiveShadow = true; R.add(lake);
    // the volcano shore behind the lake
    const v1 = makeVolcano(30, 46); v1.position.set(-52, 0, 292); R.add(v1);
    const v2 = makeVolcano(38, 56); v2.position.set(38, 0, 300); R.add(v2);
    const v3 = makeVolcano(22, 36, false); v3.position.set(96, 0, 282); R.add(v3);
    // a lazy smoke plume over the big volcano (drifts in update)
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(38, 39, 300); sp.layers.set(NOINK); R.add(sp);
      this.volcSmoke.push({ sp, off: i / 3 });
    }
    // ---- the totora reed boat the hero rides ----
    const boat = new THREE.Group();
    const reedM = lam2({ color: "#d8b878", map: rep(reedTex(), 3, 1) });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 4.8, 10), reedM);
    hull.rotation.z = Math.PI / 2; hull.scale.z = 0.62; hull.castShadow = true; boat.add(hull);
    for (const sx of [-1, 1]) {
      const prow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.7, 9), reedM);
      prow.position.set(sx * 2.9, 0.55, 0); prow.rotation.z = -sx * 1.05; prow.castShadow = true; boat.add(prow);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.8), lam2({ color: "#8a6a3c", map: rep(reedTex(), 1, 1) }));
    bench.position.set(0, 0.52, 0); boat.add(bench);
    boat.position.set(HERO_LAKE[0], 0.18, HERO_LAKE[2]);
    boat.rotation.y = 0.35;
    R.add(boat);
    this.boat = boat;
    void r;
  }

  // ---------------- props: jeep, level, lithium, satellite ----------------
  private buildProps(R: THREE.Group, r: () => number) {
    // ---- the tour jeep (shot 2), engine idling ----
    const jeep = new THREE.Group();
    const bodyM = lam2({ color: "#ddd8cc" });
    const darkM = lam2({ color: "#2c343c" });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.05, 1.95), bodyM);
    body.position.y = 1.02; body.castShadow = true; jeep.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 1.8), bodyM);
    cabin.position.set(-0.2, 1.98, 0); cabin.castShadow = true; jeep.add(cabin);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.6, 1.84), darkM);
    glass.position.set(-0.2, 2.02, 0); jeep.add(glass);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.5), darkM);
    rack.position.set(-0.2, 2.55, 0); jeep.add(rack);
    const wheelG = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14);
    for (const [wx, wz] of [[-1.55, 1.0], [1.55, 1.0], [-1.55, -1.0], [1.55, -1.0]] as [number, number][]) {
      const w = new THREE.Mesh(wheelG, darkM);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.52, wz); w.castShadow = true; jeep.add(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 10), lam2({ color: "#9aa2ac" }));
      hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.52, wz); jeep.add(hub);
    }
    const spare = new THREE.Mesh(wheelG, darkM);
    spare.rotation.x = Math.PI / 2; spare.position.set(-2.45, 1.25, 0); jeep.add(spare);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.9), darkM);
    bumper.position.set(2.35, 0.55, 0); jeep.add(bumper);
    jeep.position.set(JEEP[0], 0, JEEP[2]);
    jeep.rotation.y = 0.55;
    R.add(jeep);
    this.jeep = jeep;
    blob(R, JEEP[0], 0.014, JEEP[2], 6.4, 4.2, 0.5);
    // ---- the long spirit level on the crust (shot 3) ----
    const lvl = new THREE.Group();
    const beamM = lam2({ color: "#f2c018" });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.13, 0.3), beamM);
    beam.castShadow = true; lvl.add(beam);
    const vialM = new THREE.MeshLambertMaterial({ color: "#b8e86a", emissive: "#5d9428", emissiveIntensity: 0.5 });
    for (const vx of [-1.1, 0, 1.1]) {
      const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8), vialM);
      vial.rotation.z = Math.PI / 2; vial.position.set(vx, 0.075, 0); lvl.add(vial);
    }
    lvl.position.set(LEVEL[0], 0.09, LEVEL[2]);
    lvl.rotation.y = 0.35;
    R.add(lvl);
    // ---- the lithium set (shot 8): dry patch, slab, brine pool, battery ----
    const patch = new THREE.Mesh(new THREE.CircleGeometry(3.6, 26), lam2({ map: rep(saltTex(), 3, 3), color: "#ffffff" }));
    patch.rotation.x = -Math.PI / 2; patch.position.set(LITH[0], 0.006, LITH[2]); patch.receiveShadow = true; R.add(patch);
    this.poolMat = new THREE.MeshLambertMaterial({ color: "#59d8c4", emissive: "#1fae94", emissiveIntensity: 1.1 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.55, 24), this.poolMat);
    pool.rotation.x = -Math.PI / 2; pool.position.set(LITH[0] - 0.3, 0.014, LITH[2]); R.add(pool);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, 2.1), lam2({ map: rep(saltTex(), 2, 2), color: "#ffffff" }));
    slab.position.set(LITH[0] - 1.5, 0.85, LITH[2] - 0.4); slab.rotation.z = 0.52; slab.rotation.y = 0.3; slab.castShadow = true; R.add(slab);
    const prop = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 7), lam2({ map: rep(stoneHD("salarProp", ["#9c7c5e", "#86644a", "#ad8a68", "#77573f"], "#543e2a"), 1, 1), color: "#c4a582" }));
    prop.position.set(LITH[0] - 0.35, 0.2, LITH[2] - 0.5); prop.castShadow = true; R.add(prop);
    this.poolGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, color: "#7fe8d8" }));
    this.poolGlow.position.set(LITH[0] - 0.3, 0.5, LITH[2]); this.poolGlow.scale.set(4.4, 2.2, 1); this.poolGlow.layers.set(NOINK); R.add(this.poolGlow);
    // the battery: dark shell, glowing charge fill, cap
    const batt = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.15, 0.44), lam2({ color: "#2c343c" }));
    shell.position.y = 0.58; shell.castShadow = true; batt.add(shell);
    this.battMat = new THREE.MeshLambertMaterial({ color: "#7de87a", emissive: "#2fae4e", emissiveIntensity: 1.2 });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.47), this.battMat);
    fill.position.y = 0.5; batt.add(fill);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), lam2({ color: "#9aa2ac" }));
    cap.position.y = 1.21; batt.add(cap);
    batt.position.set(LITH[0] + 1.5, 0, LITH[2] - 1.3);
    batt.rotation.y = -0.4;
    R.add(batt);
    // ---- the calibration satellite (shot 5): crosses the sky ----
    const sat = new THREE.Group();
    const satBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 2.6), lam2({ color: "#c9ced6" }));
    sat.add(satBody);
    const panelM = lam2({ color: "#33507e" });
    for (const sx of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 2.1), panelM);
      panel.position.set(sx * 3.6, 0, 0); sat.add(panel);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 7), lam2({ color: "#8a929c" }));
      arm.rotation.z = Math.PI / 2; arm.position.set(sx * 1.4, 0, 0); sat.add(arm);
    }
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 12, 1, true), lam2({ color: "#e8ecf2" }));
    dish.position.set(0, -1.2, 0.6); dish.rotation.x = Math.PI; sat.add(dish);
    this.satBlink = new THREE.MeshBasicMaterial({ color: "#ff4444" });
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), this.satBlink);
    blink.position.set(0, 1.0, 0); sat.add(blink);
    sat.position.set(300, 15.5, -38);
    R.add(sat);
    this.sat = sat;
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
    const dt = Math.max(0, tt - this.lastTt); this.lastTt = tt;
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
    const S0 = s.a / FPS, SLEN = Math.max(0.01, (s.b - s.a) / FPS);
    const U = clamp01((t - S0) / SLEN); // shot-local progress
    void U; void dt;
    // ---- STANDAR GERAK: everything that should move, moves ----
    this.clouds.forEach((c2, i) => {
      const b = this.cloudBase[i];
      if (b) c2.position.x = b.x + tt * b.sp;
      const m = c2.material as THREE.SpriteMaterial;
      m.color.set("#ffffff");
      m.opacity = 0.94;
    });
    // the reflected clouds drift across the mirror with the sky
    for (const rc of this.reflClouds) {
      rc.m.position.x = rc.x0 + ((tt * rc.sp) % 130);
      if (rc.m.position.x > 66) rc.m.position.x -= 132;
    }
    // glints twinkle on the water film
    for (const gl of this.glints) {
      const s2 = Math.max(0, Math.sin(tt * 1.8 + gl.ph));
      (gl.sp.material as THREE.SpriteMaterial).opacity = s2 ** 6 * 0.75;
    }
    // the jeep's engine idles
    this.jeep.position.y = Math.sin(tt * 9.2) * 0.006 + Math.sin(tt * 23.7) * 0.003;
    // ---------------- THE SATELLITE (shot 5) ----------------
    // crosses the sky high over the flat while the hero points:
    // x sweeps -14 → +8 across the shot-5 window of global time
    {
      const SAT_T0 = SHOTS[4].a / FPS - 1.2, SAT_T1 = SHOTS[4].b / FPS + 0.6;
      if (tt > SAT_T0 && tt < SAT_T1) {
        const u = (tt - SAT_T0) / (SAT_T1 - SAT_T0);
        this.sat.position.set(-15 + u * 25, 15.5 - u * 1.5, -38);
        this.sat.rotation.y = 0.4; this.sat.rotation.z = 0.06;
      } else this.sat.position.set(300, 15.5, -38);
      this.satBlink.color.set((tt * 1.6) % 1 < 0.45 ? "#ff4444" : "#571414");
    }
    // the brine pool breathes; the battery charge glows with it
    const pulse = 0.5 + 0.5 * Math.sin(tt * 2.4);
    this.poolMat.emissiveIntensity = 0.85 + pulse * 0.6;
    this.battMat.emissiveIntensity = 0.9 + pulse * 0.7;
    (this.poolGlow.material as THREE.SpriteMaterial).opacity = 0.26 + pulse * 0.22;
    const pgs = 4.4 + pulse * 0.7;
    this.poolGlow.scale.set(pgs, pgs * 0.5, 1);
    // the reed boat bobs on the ancient lake; the water drifts
    this.boat.position.y = 0.18 + Math.sin(tt * 1.6) * 0.045;
    this.boat.rotation.z = Math.sin(tt * 1.25) * 0.022;
    this.boat.rotation.x = Math.cos(tt * 0.9) * 0.014;
    this.lakeT.offset.set(tt * 0.004, tt * 0.0016);
    // the volcano's smoke plume rises and dissolves
    for (const sm of this.volcSmoke) {
      const cyc = (tt * 0.09 + sm.off) % 1;
      sm.sp.position.set(38 + cyc * 3.2, 39.5 + cyc * 5.5, 300);
      const sc2 = 5 + cyc * 9;
      sm.sp.scale.set(sc2, sc2 * 0.7, 1);
      (sm.sp.material as THREE.SpriteMaterial).opacity = 0.30 * (1 - cyc) * Math.min(1, cyc * 7);
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
