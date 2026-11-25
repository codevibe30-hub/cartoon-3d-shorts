// The Baños ridge, Ecuador as one three.js scene for the
// Fafnir-ID format: a grassy cliff-top ridge with a great
// tree, a wooden treehouse (the volcano lookout post), and
// the famous plank swing hanging over the drop — the green
// valley far below with its own sea of clouds drifting UNDER
// the swing, and the active cone of Tungurahua towering in
// front. VISUAL CORE: the swing itself, already flying at
// frame 0. Everything textured (anti-banding: grain +
// speckle on every surface). Layered light rig: sun key w/
// soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, stoneHD, grass, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, TREE, PIVOT, SWING_L, HUT, SIGN, VOLCANO, swingTheta } from "./story";

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
const skyTexDay = () => ctex("ayunanSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2a5ca8"); grad.addColorStop(0.34, "#4a80c4"); grad.addColorStop(0.62, "#8ab0dd");
  grad.addColorStop(0.85, "#ccd9e4"); grad.addColorStop(1, "#e2e8d2");
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
const glowTex = () => ctex("ayunanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("ayunanBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** the valley floor: patchwork fields in many greens with a
 *  pale river winding through — painted once, seen from high */
const valleyTex = () => ctex("ayunanValley", 1024, 1024, (g, r) => {
  g.fillStyle = "#4d7a34"; g.fillRect(0, 0, 1024, 1024);
  const greens = ["#5d8a3c", "#6f9a44", "#87a844", "#a8b45c", "#3f6c2c", "#79a04e", "#c2bc6a", "#548238"];
  for (let i = 0; i < 90; i++) {
    const x = r() * 1024, y = r() * 1024, w = 60 + r() * 190, h = 40 + r() * 130;
    g.fillStyle = greens[Math.floor(r() * greens.length)];
    g.globalAlpha = 0.55 + r() * 0.4;
    g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(30,50,20,0.35)"; g.lineWidth = 3; g.strokeRect(x, y, w, h);
  }
  // the river: a pale winding band down the middle
  g.strokeStyle = "#a8c8dc"; g.lineCap = "round";
  g.lineWidth = 26;
  g.beginPath(); g.moveTo(430, -10);
  g.bezierCurveTo(560, 260, 380, 480, 520, 720);
  g.bezierCurveTo(600, 880, 540, 960, 580, 1034); g.stroke();
  g.strokeStyle = "rgba(230,244,252,0.7)"; g.lineWidth = 9;
  g.beginPath(); g.moveTo(430, -10);
  g.bezierCurveTo(560, 260, 380, 480, 520, 720);
  g.bezierCurveTo(600, 880, 540, 960, 580, 1034); g.stroke();
  // a tiny town: pale roof dots clustered mid-valley (Baños)
  for (let i = 0; i < 130; i++) {
    const x = 640 + (r() - 0.5) * 190, y = 560 + (r() - 0.5) * 150;
    g.fillStyle = r() > 0.4 ? "#e8e2d2" : "#c46a4a";
    g.fillRect(x, y, 7 + r() * 8, 5 + r() * 6);
  }
  for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "220,240,190" : "16,36,10"},${0.03 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
});
/** the steep slope: broken green-brown rock and scrub */
const slopeTex = () => ctex("ayunanSlope", 1024, 1024, (g, r) => {
  g.fillStyle = "#5a7038"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 240; i++) {
    const x = r() * 1024, y = r() * 1024, w = 20 + r() * 90;
    g.fillStyle = `rgba(${r() > 0.5 ? "122,104,72" : "52,84,32"},${0.16 + r() * 0.3})`;
    g.beginPath(); g.ellipse(x, y, w, w * (0.4 + r() * 0.4), r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 260; i++) { // scrub bushes: dark green blobs with a lit rim
    const x = r() * 1024, y = r() * 1024, s = 8 + r() * 22;
    g.fillStyle = "rgba(28,58,20,0.8)"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.fillStyle = "rgba(140,190,90,0.55)"; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.35, s * 0.55, 0, 7); g.fill();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,240,200" : "20,30,12"},${0.04 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2.2, 2.2); }
});
/** tree bark: dark vertical streaks over warm brown */
const barkTex = () => ctex("ayunanBark", 256, 512, (g, r) => {
  g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 256;
    g.strokeStyle = `rgba(${r() > 0.5 ? "46,30,16" : "146,110,70"},${0.3 + r() * 0.4})`;
    g.lineWidth = 2 + r() * 6;
    g.beginPath(); g.moveTo(x, -6);
    g.bezierCurveTo(x + (r() - 0.5) * 22, 170, x + (r() - 0.5) * 22, 340, x + (r() - 0.5) * 12, 518); g.stroke();
  }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,200,150" : "20,12,6"},${0.05 + r() * 0.12})`; g.fillRect(r() * 256, r() * 512, 2, 2); }
});
/** leaf canopy: layered green blobs, lit crowns, deep shade */
const leafTex = () => ctex("ayunanLeaf", 512, 512, (g, r) => {
  g.fillStyle = "#2e5c26"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) {
    const x = r() * 512, y = r() * 512, s = 10 + r() * 30;
    g.fillStyle = `rgba(${20 + r() * 30},${80 + r() * 60},${18 + r() * 26},0.5)`;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  for (let i = 0; i < 200; i++) {
    const x = r() * 512, y = r() * 512, s = 5 + r() * 14;
    g.fillStyle = `rgba(${140 + r() * 60},${200 + r() * 40},${80 + r() * 40},0.5)`;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
});
/** the wooden site sign */
const signTex = () => ctex("ayunanSign", 1024, 512, (g, r) => {
  g.fillStyle = "#7a5a34"; g.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 86) {
    g.fillStyle = `rgba(${40 + r() * 30},${26 + r() * 18},10,0.35)`; g.fillRect(0, y, 1024, 5);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,200,150" : "30,20,8"},${0.05 + r() * 0.1})`; g.fillRect(r() * 1024, y + r() * 80, 3, 2); }
  }
  g.strokeStyle = "#3a2812"; g.lineWidth = 18; g.strokeRect(9, 9, 1006, 494);
  g.fillStyle = "#fdf6da"; g.textAlign = "center";
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  g.fillText("LA CASA", 512, 168);
  g.fillText("DEL ÁRBOL", 512, 300);
  g.font = "900 64px 'Arial Black', Arial, sans-serif";
  g.fillStyle = "#ffd94a";
  g.fillText("2.600 m", 512, 428);
});
/** a soft smoke puff */
const smokeTex = () => ctex("ayunanSmoke", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(238,240,244,0.55)"); gr.addColorStop(0.6, "rgba(220,222,228,0.28)"); gr.addColorStop(1, "rgba(220,222,228,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** a darker ash puff for the eruption column */
const ashTex = () => ctex("ayunanAsh", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(96,92,98,0.6)"); gr.addColorStop(0.6, "rgba(110,106,112,0.3)"); gr.addColorStop(1, "rgba(110,106,112,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** a cylinder strut between two points */
const strut = (a: THREE.Vector3, b: THREE.Vector3, rad: number, mat: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 8), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
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
  private seaClouds: { sp: THREE.Sprite; x0: number; sp2: number }[] = [];
  private canopy!: THREE.Group;
  private tufts: { g: THREE.Group; ph: number }[] = [];
  private swing!: THREE.Group;
  private volcSmoke: { sp: THREE.Sprite; off: number }[] = [];
  private ash: { sp: THREE.Sprite; off: number }[] = [];
  private led!: THREE.MeshBasicMaterial;
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(53);
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
    this.buildLand(R, r);
    this.buildTree(R, r);
    this.buildSwing(R, r);
  }

  // ---------------- land: ridge, slope, valley, volcano ----------------
  private buildLand(R: THREE.Group, r: () => number) {
    // the grassy ridge top
    const ridge = new THREE.Mesh(new THREE.PlaneGeometry(190, 74), lam2({ map: rep(grass(), 30, 12), color: "#cfe8b0" }));
    ridge.rotation.x = -Math.PI / 2; ridge.position.set(0, 0, 29); ridge.receiveShadow = true; R.add(ridge);
    // the long slope from the edge (z=-8, y=0) down to the
    // valley floor (z=-110, y=-58)
    const slopeLen = Math.hypot(102, 58);
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(190, slopeLen), lam2({ map: rep(slopeTex(), 16, 12), color: "#d8e4c0" }));
    slope.rotation.x = -Math.PI / 2 - Math.atan2(58, 102);
    slope.position.set(0, -29, -59); slope.receiveShadow = true; R.add(slope);
    // the valley floor: patchwork fields + the river + a tiny town
    const valley = new THREE.Mesh(new THREE.PlaneGeometry(360, 205), lam2({ map: valleyTex(), color: "#e8f0d8" }));
    valley.rotation.x = -Math.PI / 2; valley.position.set(0, -58, -212.5); valley.receiveShadow = true; R.add(valley);
    // far side hills behind the valley (layered depth)
    const hillM = lam2({ color: "#5d7d94" });
    for (const [hx, hz, hs] of [[-215, -120, 46], [205, -95, 38], [-190, 30, 40], [200, 60, 34]] as [number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hs, 14, 10), hillM);
      hill.scale.y = 0.34; hill.position.set(hx, -6, hz); R.add(hill);
    }
    // ---- TUNGURAHUA: the great cone, strata rock, snow cap ----
    const volc = new THREE.Group();
    const rockM = lam2({ map: rep(stoneHD("ayunanVolc", ["#7d6a58", "#6b5844", "#8d7862", "#5a4634"], "#463628"), 9, 6), color: "#9a7c5e" });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(98, 120, 26), rockM);
    cone.position.y = 60; volc.add(cone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(98 * 0.16, 120 * 0.16, 26), lam2({ color: "#f2f4f0" }));
    cap.position.y = 120 * 0.92; volc.add(cap);
    const crater = new THREE.Mesh(new THREE.CylinderGeometry(7, 10, 3, 14), lam2({ color: "#4c3a2a" }));
    crater.position.y = 120.5; volc.add(crater);
    volc.position.set(VOLCANO[0], VOLCANO[1], VOLCANO[2]);
    R.add(volc);
    // its lazy smoke plume (drifts in update)
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(VOLCANO[0], 64, VOLCANO[2]); sp.layers.set(NOINK); R.add(sp);
      this.volcSmoke.push({ sp, off: i / 3 });
    }
    // the eruption ash column (shot 9): darker, taller, denser
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ashTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(VOLCANO[0], 64, VOLCANO[2]); sp.layers.set(NOINK); R.add(sp);
      this.ash.push({ sp, off: i / 5 });
    }
    // ---- the cloud sea IN the valley, below the swing ----
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(700 + i * 41, CLOUD_DAY), transparent: true, depthWrite: false, opacity: 0.88 }));
      const x0 = -150 + r() * 300;
      sp.position.set(x0, -12 - r() * 14, -35 - r() * 85);
      const w = 60 + r() * 80;
      sp.scale.set(w, w * 0.30, 1);
      sp.layers.set(NOINK); R.add(sp);
      this.seaClouds.push({ sp, x0, sp2: 1.4 + (i % 4) * 0.5 });
    }
    // grass tufts on the ridge near the action (sway in update)
    const tuftM = lam2({ color: "#4d7a2e" });
    const tuftM2 = lam2({ color: "#679c3a" });
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      const blades = 3 + Math.floor(r() * 3);
      for (let b = 0; b < blades; b++) {
        const bl = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.5 + r() * 0.4, 5), b % 2 ? tuftM : tuftM2);
        bl.position.set((r() - 0.5) * 0.3, 0.26, (r() - 0.5) * 0.3);
        bl.rotation.z = (r() - 0.5) * 0.5; bl.rotation.x = (r() - 0.5) * 0.5;
        g.add(bl);
      }
      g.position.set(-16 + r() * 34, 0, -7 + r() * 16);
      R.add(g);
      this.tufts.push({ g, ph: r() * 9 });
    }
    // scattered rocks + bushes on the ridge
    const rockM2 = lam2({ map: rep(stoneHD("ayunanRock", ["#9a8d7a", "#877a66", "#aa9c86", "#77694f"], "#5d5342"), 1, 1), color: "#c0b098" });
    for (let i = 0; i < 9; i++) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.3 + r() * 0.65, 9, 7), rockM2);
      st.position.set(-20 + r() * 44, 0.14, -6 + r() * 20);
      st.scale.y = 0.62; st.castShadow = true; R.add(st);
    }
    const bushM = lam2({ map: rep(leafTex(), 2, 2), color: "#b8d890" });
    for (const [bx, bz, bs] of [[-11, 3.5, 1.5], [8.5, 4.5, 1.2], [13, -3, 1.7], [-15, -4, 1.3], [6.5, 8, 1.1]] as [number, number, number][]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(bs, 1), bushM);
      b.position.set(bx, bs * 0.62, bz); b.scale.y = 0.78; b.castShadow = true; R.add(b);
    }
    // the safety fence along the edge: posts + a sagging rope
    const postM = lam2({ color: "#6b4a2e", map: rep(barkTex(), 1, 1) });
    const ropeM = lam2({ color: "#8a7a5c" });
    let prev: THREE.Vector3 | null = null;
    for (let x = -15; x <= 11; x += 3.25) {
      const top = new THREE.Vector3(x, 1.05, -7.4 + Math.sin(x * 0.4) * 0.3);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.1, 7), postM);
      post.position.set(x, 0.55, top.z); post.castShadow = true; R.add(post);
      if (prev) {
        const mid = prev.clone().lerp(top, 0.5); mid.y -= 0.14;
        R.add(strut(prev, mid, 0.022, ropeM));
        R.add(strut(mid, top, 0.022, ropeM));
      }
      prev = top;
    }
    void r;
  }

  // ---------------- the tree + the treehouse ----------------
  private buildTree(R: THREE.Group, r: () => number) {
    const barkM = lam2({ map: rep(barkTex(), 2, 3), color: "#c8a878" });
    // the trunk, slightly leaning toward the valley
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 1.05, 9.2, 10), barkM);
    trunk.position.set(TREE[0], 4.6, TREE[2]); trunk.rotation.x = -0.05; trunk.castShadow = true; R.add(trunk);
    // roots flaring at the base
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.30, 1.7, 7), barkM);
      root.position.set(TREE[0] + Math.cos(a) * 0.85, 0.35, TREE[2] + Math.sin(a) * 0.85);
      root.rotation.z = Math.cos(a) * 0.9; root.rotation.x = -Math.sin(a) * 0.9;
      R.add(root);
    }
    // the great branch reaching out over the edge — it passes
    // over the swing's PIVOT
    const b0 = new THREE.Vector3(TREE[0] + 0.2, 8.3, TREE[2]);
    const b1 = new THREE.Vector3(PIVOT[0] + 0.4, PIVOT[1] + 0.55, PIVOT[2] + 0.3);
    const b2 = new THREE.Vector3(3.0, 7.6, -7.8);
    R.add(strut(b0, b1, 0.30, barkM));
    R.add(strut(b1, b2, 0.20, barkM));
    // a second branch up-left for the crown's balance
    R.add(strut(new THREE.Vector3(TREE[0], 8.4, TREE[2]), new THREE.Vector3(-8.6, 10.4, -4.6), 0.24, barkM));
    // ---- the canopy: layered leafy blobs (sways in update) ----
    const canopy = new THREE.Group();
    const leafM = lam2({ map: rep(leafTex(), 3, 3), color: "#cfe0a0", flatShading: true });
    const blobs: [number, number, number, number][] = [
      [-4.4, 11.3, -2.6, 3.6], [-7.6, 10.2, -4.2, 2.7], [-1.6, 10.6, -4.4, 2.9],
      [-5.8, 12.3, -1.2, 2.6], [-2.6, 12.0, -1.4, 2.4], [-8.8, 11.4, -1.8, 2.2], [0.2, 11.6, -2.2, 2.3],
    ];
    for (const [x, y, z, s] of blobs) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leafM);
      b.position.set(x, y, z); b.scale.y = 0.82; b.castShadow = true; canopy.add(b);
    }
    R.add(canopy);
    this.canopy = canopy;
    // ---- THE TREEHOUSE: the lookout post in the crown ----
    const hut = new THREE.Group();
    const woodM = lam2({ map: rep(planks(), 2, 2), color: "#d8b088" });
    const darkWoodM = lam2({ map: rep(planks(), 1, 1), color: "#8a6a48" });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.5, 3.0), woodM);
    walls.position.y = 1.25; walls.castShadow = true; hut.add(walls);
    // pitched roof: two glossy slabs + a ridge beam
    const roofM = lam2({ color: "#a34a34", map: rep(planks(), 2, 1) });
    for (const sx of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 3.6), roofM);
      slab.position.set(sx * 0.95, 2.95, 0); slab.rotation.z = -sx * 0.62; slab.castShadow = true; hut.add(slab);
    }
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.7, 7), darkWoodM);
    ridge.rotation.x = Math.PI / 2; ridge.position.y = 3.55; hut.add(ridge);
    // the window facing the volcano (warm glass) + a side window
    const winM = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#c07f28", emissiveIntensity: 0.55 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.95), winM);
    win.position.set(0.4, 1.5, -1.51); win.rotation.y = Math.PI; hut.add(win);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.85), winM);
    win2.position.set(1.71, 1.5, 0.3); win2.rotation.y = Math.PI / 2; hut.add(win2);
    // the door on the balcony side
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.8, 0.08), darkWoodM);
    door.position.set(-0.7, 0.95, 1.52); hut.add(door);
    hut.position.set(HUT[0], HUT[1], HUT[2]);
    hut.rotation.y = 0.12;
    R.add(hut);
    // support posts from the hut floor down to the ridge
    for (const [px, pz] of [[-7.2, -3.4], [-4.4, -3.6], [-7.0, -0.8], [-4.2, -0.9]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, HUT[1], 7), darkWoodM);
      post.position.set(px, HUT[1] / 2, pz); post.castShadow = true; R.add(post);
    }
    // ---- the lookout balcony: platform + railing + gear ----
    const balc = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 1.7), woodM);
    deck.castShadow = true; balc.add(deck);
    const railM = darkWoodM;
    for (const [rx, rz, rw, rd] of [[0, 0.82, 3.8, 0.07], [-1.87, 0, 0.07, 1.7], [1.87, 0, 0.07, 1.7]] as [number, number, number, number][]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.07, rd), railM);
      rail.position.set(rx, 0.62, rz); balc.add(rail);
      for (const px of [-0.8, 0.8]) {
        const bal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), railM);
        bal.position.set(rx === 0 ? px * 2 : rx, 0.31, rz === 0 ? px * 0.9 : rz); balc.add(bal);
      }
    }
    // the seismic box with its blinking LED + antenna
    const seis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.3), lam2({ color: "#5a646e" }));
    seis.position.set(-1.3, 0.32, 0.55); seis.castShadow = true; balc.add(seis);
    this.led = new THREE.MeshBasicMaterial({ color: "#ff4444" });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), this.led);
    led.position.set(-1.3, 0.44, 0.72); balc.add(led);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.5, 6), lam2({ color: "#3a424a" }));
    ant.position.set(-1.55, 1.1, 0.55); balc.add(ant);
    // binoculars on a tripod, aimed at the volcano
    const tripod = new THREE.Group();
    const legM = lam2({ color: "#3a424a" });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 6), legM);
      leg.position.set(Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22);
      leg.rotation.z = Math.cos(a) * 0.35; leg.rotation.x = -Math.sin(a) * 0.35;
      tripod.add(leg);
    }
    const binoM = lam2({ color: "#22282e" });
    for (const sx of [-1, 1]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.34, 9), binoM);
      tube.rotation.x = Math.PI / 2 - 0.18; tube.position.set(sx * 0.1, 1.12, -0.05); tripod.add(tube);
    }
    tripod.position.set(0.9, 0.08, 0.45);
    tripod.rotation.y = Math.PI + 0.3; // lenses toward -z, the volcano
    balc.add(tripod);
    balc.position.set(-3.9, 5.44, -0.5);
    R.add(balc);
    // the ladder down from the balcony to the ground
    const ladM = darkWoodM;
    for (const sx of [-1, 1]) {
      const rail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.6, 7), ladM);
      rail2.position.set(-2.6 + sx * 0.3, 2.7, 0.35); rail2.rotation.x = 0.1; R.add(rail2);
    }
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), ladM);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(-2.6, 0.5 + i * 0.75, 0.35 - i * 0.075);
      R.add(rung);
    }
    // ---- the wooden site sign ----
    const sign = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.45, 0.12),
      [darkWoodM, darkWoodM, darkWoodM, darkWoodM, new THREE.MeshLambertMaterial({ map: signTex() }), darkWoodM] as unknown as THREE.Material);
    board.position.y = 1.55; board.castShadow = true; sign.add(board);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.6, 7), darkWoodM);
      post.position.set(sx * 1.15, 0.8, 0); post.castShadow = true; sign.add(post);
    }
    sign.position.set(SIGN[0], 0, SIGN[2]);
    sign.rotation.y = 0.15;
    R.add(sign);
    blob(R, SIGN[0], 0.012, SIGN[2], 3.6, 1.6, 0.45);
    void r;
  }

  // ---------------- the swing ----------------
  private buildSwing(R: THREE.Group, r: () => number) {
    // the push-off platform at the edge, under the rest seat
    const woodM = lam2({ map: rep(planks(), 2, 1), color: "#c8a878" });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 2.4), woodM);
    plat.position.set(PIVOT[0], 0.08, PIVOT[2] + 0.6); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    blob(R, PIVOT[0], 0.012, PIVOT[2] + 0.6, 3.8, 3.0, 0.4);
    // the swing itself: a group hung from the PIVOT, rotated
    // by the shared pendulum clock in update()
    const swing = new THREE.Group();
    const ropeM = lam2({ color: "#a0854f" });
    const steelM = lam2({ color: "#9aa2ac" });
    for (const sx of [-1, 1]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, SWING_L, 7), ropeM);
      rope.position.set(sx * 0.55, -SWING_L / 2, 0); rope.castShadow = true; swing.add(rope);
      // the modern steel safety cable beside each rope
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, SWING_L, 6), steelM);
      cable.position.set(sx * 0.55 + 0.09, -SWING_L / 2, 0.02); swing.add(cable);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.44), woodM);
    seat.position.y = -SWING_L; seat.castShadow = true; swing.add(seat);
    // the safety lap strap across the plank
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.47), lam2({ color: "#c23b2e" }));
    strap.position.y = -SWING_L + 0.07; swing.add(strap);
    swing.position.set(PIVOT[0], PIVOT[1], PIVOT[2]);
    R.add(swing);
    this.swing = swing;
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
    void dt;
    // ---- STANDAR GERAK: everything that should move, moves ----
    this.clouds.forEach((c2, i) => {
      const b = this.cloudBase[i];
      if (b) c2.position.x = b.x + tt * b.sp;
      const m = c2.material as THREE.SpriteMaterial;
      m.color.set("#ffffff");
      m.opacity = 0.94;
    });
    // the cloud sea drifts through the valley below
    for (const s2 of this.seaClouds) {
      s2.sp.position.x = s2.x0 + ((tt * s2.sp2) % 190);
      if (s2.sp.position.x > 165) s2.sp.position.x -= 330;
    }
    // THE SWING never stops swinging
    this.swing.rotation.x = swingTheta(tt);
    // the canopy breathes; the grass tufts sway
    this.canopy.rotation.z = Math.sin(tt * 0.7) * 0.008;
    this.canopy.rotation.x = Math.cos(tt * 0.53) * 0.006;
    for (const tf of this.tufts) tf.g.rotation.z = Math.sin(tt * 1.9 + tf.ph) * 0.07;
    // the volcano's smoke plume rises and dissolves
    for (const sm of this.volcSmoke) {
      const cyc = (tt * 0.07 + sm.off) % 1;
      sm.sp.position.set(VOLCANO[0] + cyc * 6, 64 + cyc * 10, VOLCANO[2]);
      const sc2 = 10 + cyc * 18;
      sm.sp.scale.set(sc2, sc2 * 0.7, 1);
      (sm.sp.material as THREE.SpriteMaterial).opacity = 0.38 * (1 - cyc) * Math.min(1, cyc * 7);
    }
    // the eruption ash column: only during the viral-photo
    // shot (id 9), fading in and out with the shot window
    {
      const s9 = SHOTS[8];
      const inWin = tt * FPS >= s9.a - 10 && tt * FPS < s9.b + 10 ? 1 : 0;
      for (const a2 of this.ash) {
        const cyc = (tt * 0.16 + a2.off) % 1;
        a2.sp.position.set(VOLCANO[0] + (a2.off - 0.5) * 6 + cyc * 3, 64 + cyc * 30, VOLCANO[2]);
        const sc2 = 11 + cyc * 24;
        a2.sp.scale.set(sc2, sc2 * 0.85, 1);
        (a2.sp.material as THREE.SpriteMaterial).opacity = inWin * 0.55 * Math.sin(Math.min(1, cyc * 3) * Math.PI * 0.5) * (1 - cyc * 0.5);
      }
    }
    // the seismic LED blinks its watch over the volcano
    this.led.color.set((tt * 1.4) % 1 < 0.4 ? "#ff4444" : "#571414");
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
