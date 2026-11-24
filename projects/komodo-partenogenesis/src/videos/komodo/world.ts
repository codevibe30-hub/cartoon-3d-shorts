// Pulau Komodo, Indonesia as one three.js scene for the Fafnir-ID
// short: a bright tropical savanna — dry golden grass, scattered
// flat-top acacia trees, grey boulders, green island hills across
// a turquoise sea, and the hero standing in the open with the
// giant female dragon behind him. The nest mound with eggs sits
// in a fenced zoo corner (shot 4 only). VISUAL CORE: bright
// tropical daylight, warm golds + turquoise, textured everything
// (anti-banding: speckled sky, flecked savanna, woven grass).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, KOMODO_GEO } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_SPOT, FLORA_SPOT, NEST, BEACH_Z, SEA_Z } from "./story";

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
const skyTexDay = () => ctex("komodoSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1a5fc0"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#cfe4f7"); grad.addColorStop(1, "#ffe9c4");
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
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("komodoGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("komodoBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture: light leaf clusters over mid green
 *  with deep shadow pockets — multiplied by the canopy colour */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#9db98d"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(38,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(240,255,214,${0.12 + r() * 0.22})` : `rgba(30,58,24,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** wrap-draw: calls fn at every tiled offset an item of radius
 *  `rad` at (x, y) bleeds into, so a canvas tiles without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** DRY savanna grass: golden straw base with green patches —
 *  deep shadow pockets, sunlit fleck clusters and thousands of
 *  individual blades in five straw-greens with hard value
 *  contrast, on a deeper base that survives the sun lift. */
const savannaGrassTex = () => ctex("komodoSavannaGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#a8894a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "90,74,32" : "216,192,120";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // green patches: the savanna is not one gold sheet
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 90;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      gr.addColorStop(0, "rgba(96,128,52,0.30)"); gr.addColorStop(1, "rgba(96,128,52,0)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(232,216,152,${0.10 + r() * 0.20})` : `rgba(70,54,20,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#8a6d2c", "#a8894a", "#c2a55e", "#d8c078", "#6a8a35"];
  g.lineCap = "round";
  for (let i = 0; i < 15000; i++) {
    const x = r() * S, y = r() * S, l = 7 + r() * 13, lean = (r() - 0.5) * 6;
    wrapDraw(S, x, y, 16, (xx, yy) => {
      g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
      g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + lean, yy - l); g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, h = 9 + r() * 10;
    wrapDraw(S, x, y, 18, (xx, yy) => {
      for (let b = -2; b <= 2; b++) {
        g.strokeStyle = b % 2 ? "#c2a55e" : "#7a6230"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
  const flw = ["#fff6da", "#ffd94d", "#f6a8c0", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases, the nest mound and bush feet */
const soilTex = () => ctex("komodoSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** pale beach sand: warm cream speckled with shell grit */
const sandTex = () => ctex("komodoSand", 512, 512, (g, r) => {
  g.fillStyle = "#d8c49a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "180,150,100" : "240,225,190"},${0.10 + r() * 0.16})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 26, 5 + r() * 14, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,95,60" : "255,245,220"},${0.10 + r() * 0.20})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
  for (let i = 0; i < 60; i++) { // shell flecks
    g.fillStyle = `rgba(255,250,240,${0.3 + r() * 0.4})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("komodoPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground (verge shade, sun
 *  patches, shade patches) — the blob-shadow trick, tinted */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("komodoBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("komodoBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A flat-top acacia: leaning trunk, wide umbrella canopy in
 *  three layered tones — the savanna's signature silhouette. */
const makeAcacia = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#8a6a4a" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, h * 0.62, 8), trunkM);
  trunk.position.y = h * 0.31; trunk.rotation.z = (tr() - 0.5) * 0.16; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "komodoFoliageDeep"),
    folM(greens[0], "komodoFoliageMid"),
    folM(greens[1] ?? greens[0], "komodoFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.42;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.42 + tr() * 0.12, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  // shadow underlayer, main mass, sunlit crown — flat and wide
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.3 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.22 + tr() * cr * 0.1, Math.sin(a) * d, cr * (0.5 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 1.05, 1);
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.4 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.3, Math.sin(a) * d, cr * (0.5 + tr() * 0.2), 2);
  }
  return g;
};
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#8a6d2c"), tip = new THREE.Color("#e8d898"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.30 + tr() * 0.24, w = 0.05;
    const tx = ox + Math.cos(a) * lean, tz = oz + Math.sin(a) * lean;
    const px = -Math.sin(a), pz = Math.cos(a);
    pos.push(ox - px * w, 0, oz - pz * w, ox + px * w, 0, oz + pz * w, tx, h, tz);
    tmp.copy(tip).offsetHSL((tr() - 0.5) * 0.03, 0, (tr() - 0.5) * 0.1);
    col.push(root.r, root.g, root.b, root.r, root.g, root.b, tmp.r, tmp.g, tmp.b);
    idx.push(vi, vi + 1, vi + 2); vi += 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private komodoActors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private fence: THREE.Group | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1575);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
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
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    // the sun's halo + core, upper left down the savanna
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
    this.buildSavanna(R, r);
  }

  // ---------------- the savanna: grass, beach, sea, hills, trees ----------------
  private buildSavanna(R: THREE.Group, r: () => number) {
    // base savanna ground (z +40 down to the beach)
    const land = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), lam2({ map: rep(savannaGrassTex(), 24, 14) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.05, -5); land.receiveShadow = true; R.add(land);
    // the beach: pale sand from the grass line to the water
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(160, 28), lam2({ map: rep(sandTex(), 10, 2) }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.02, -47); beach.receiveShadow = true; R.add(beach);
    // the sea: turquoise water running to the horizon (map kept so
    // update() can scroll it — the water FLOWS, it is not a poster)
    const seaMap = rep(water(), 6, 40);
    this.waterMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 160), lam2({ map: seaMap, color: "#2fa8a0" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.3, -140); sea.receiveShadow = true; R.add(sea);
    // soft reflection band where the sea meets the sand
    const shore = new THREE.Mesh(new THREE.PlaneGeometry(160, 3),
      new THREE.MeshBasicMaterial({ color: "#cfeee8", transparent: true, opacity: 0.35, depthWrite: false }));
    shore.rotation.x = -Math.PI / 2; shore.position.set(0, -0.1, -59); shore.renderOrder = 1; R.add(shore);
    // far backdrop: green island hills rising out of the sea so
    // the horizon never runs into bare sky
    const hillCols = ["#4a7a3a", "#5d8a44", "#3d6a30"];
    const hills: [number, number, number, number][] = [
      [-52, -88, 26, 11], [-8, -102, 34, 15], [44, -92, 28, 12], [88, -110, 30, 13], [-96, -118, 32, 14],
    ];
    hills.forEach(([x, z, w, h], i) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12),
        lam2({ color: hillCols[i % hillCols.length], map: rep(foliageTex("komodoFoliageHill"), 6, 3) }));
      hill.scale.set(w, h, w * 0.55); hill.position.set(x, -0.3 + h * 0.12, z);
      R.add(hill);
    });
    // ---- flat-top acacia trees across the savanna ----
    const greens = ["#5a7a2e", "#6a8a35", "#4a6a26"];
    const treePts: [number, number][] = [];
    const acaciaAt = (x: number, z: number, h: number, i: number) => {
      const t = makeAcacia(h, greens, i * 7 + 3);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + 0.7 });
      treePts.push([x, z]);
      blob(R, x, 0.12, z, h * 0.9, h * 0.9, 0.30);
    };
    const treeList: [number, number, number][] = [
      [-12, -14, 4.5], [14, -20, 5.2], [-20, -30, 6], [18, -8, 4.2], [-8, -30, 5.5], [24, -32, 4.8],
      [-26, -18, 5], [10, -28, 6.2], [-16, 2, 4], [20, 8, 4.5], [-28, -26, 5.8], [30, -18, 5.5],
      [8, -24, 4.6], [-14, 14, 4.2],
    ];
    treeList.forEach(([x, z, h], i) => acaciaAt(x, z, h, i));
    // ---- grey boulders scattered on the grass ----
    const rockMats = [lam2({ color: "#8a8378" }), lam2({ color: "#6e675c" }), lam2({ color: "#9a9184" })];
    const rocks: [number, number, number][] = [
      [-4, -12, 0.9], [12, -16, 0.7], [-10, 4, 0.6], [16, 2, 0.8], [4, -20, 0.55],
      [-18, -6, 0.75], [10, 12, 0.5], [-2, -26, 0.65], [20, -40, 0.9],
    ];
    rocks.forEach(([x, z, s], i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMats[i % rockMats.length]);
      rock.position.set(x, s * 0.4, z); rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.scale.y = 0.62; rock.castShadow = true; R.add(rock);
      blob(R, x, 0.12, z, s * 2.4, s * 2.4, 0.30);
    });
    // ---- the nest mound: a dirt dome where the eggs lie ----
    const nestM = lam2({ map: rep(soilTex(), 1, 1) });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), nestM);
    mound.scale.set(1.05, 0.38, 1.05); mound.position.set(NEST[0], 0.02, NEST[2]);
    mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
    blob(R, NEST[0], 0.12, NEST[2], 2.8, 2.8, 0.35);
    for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2, d = 1.3 + r() * 0.5;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + r() * 0.1, 0), rockMats[i % 3]);
      st.position.set(NEST[0] + Math.cos(a) * d, 0.08, NEST[2] + Math.sin(a) * d);
      st.rotation.set(r() * 3, r() * 3, 0); st.castShadow = true; R.add(st);
    }
    // ---- the zoo fence (visible ONLY in shot 4 — Flora's enclosure) ----
    const fence = new THREE.Group();
    const postM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
    const railM = lam2({ color: "#8a6844" });
    const fenceRect = { x0: 4, x1: 11, z0: -13, z1: -3 };
    const postAt = (x: number, z: number) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 7), postM);
      p.position.set(x, 0.75, z); p.castShadow = true; fence.add(p);
    };
    for (let x = fenceRect.x0; x <= fenceRect.x1; x += 1.75) { postAt(x, fenceRect.z0); postAt(x, fenceRect.z1); }
    for (let z = fenceRect.z0 + 1.75; z < fenceRect.z1; z += 1.75) { postAt(fenceRect.x0, z); postAt(fenceRect.x1, z); }
    const rail = (x1: number, z1: number, x2: number, z2: number, y: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.09), railM);
      m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
      m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.castShadow = true; fence.add(m);
    };
    for (const y of [0.6, 1.15]) {
      rail(fenceRect.x0, fenceRect.z0, fenceRect.x1, fenceRect.z0, y);
      rail(fenceRect.x0, fenceRect.z1, fenceRect.x1, fenceRect.z1, y);
      rail(fenceRect.x0, fenceRect.z0, fenceRect.x0, fenceRect.z1, y);
      rail(fenceRect.x1, fenceRect.z0, fenceRect.x1, fenceRect.z1, y);
    }
    R.add(fence);
    this.fence = fence;
    // ---- ground dressing: sun pools, shade patches, soil discs ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.8 + r() * 7.5), 0.128, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (6.8 + r() * 7.5), 0.129, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    const bushMats = [
      lam2({ color: "#6a7a35", map: rep(foliageTex("komodoFoliageBush"), 2, 1) }),
      lam2({ color: "#7a8a40", map: rep(foliageTex("komodoFoliageBush"), 2, 1) }),
      lam2({ color: "#5a6a2c", map: rep(foliageTex("komodoFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, 0.1 + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    for (const [tx, tz] of treePts) {
      bushAt(tx + 1.2 + r() * 0.8, tz - 1.1 - r() * 0.7, 0.45 + r() * 0.3, Math.floor(r() * 3));
      bushAt(tx - 1.2 - r() * 0.8, tz + 1.1 + r() * 0.7, 0.4 + r() * 0.3, Math.floor(r() * 3));
    }
    // ---- dry grass tufts, instanced: dense fringes, loose scatter ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 64, z = 28 - r() * 60;
      if (Math.hypot(x - NEST[0], z - NEST[2]) < 2.6) continue;
      if (Math.hypot(x - HERO_SPOT[0], z - HERO_SPOT[2]) < 1.6) continue;
      if (Math.hypot(x - FLORA_SPOT[0], z - FLORA_SPOT[2]) < 2.2) continue;
      pushTuft(x, z, 0.65 + r() * 0.8);
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.13 + (r() - 0.5) * 0.04, 0.42, 0.82 + (r() - 0.5) * 0.14);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // ---- sparse savanna wildflowers ----
    const fl2 = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6", "#e86a9a", "#9a6ae0"];
    for (let i = 0; i < 70; i++) {
      const cx = (r() - 0.5) * 60, cz = 26 - r() * 56;
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055 + r() * 0.05, 6, 5), lam2({ color: fl2[Math.floor(r() * fl2.length) % fl2.length] }));
        dot.position.set(cx + (r() - 0.5) * 0.55, 0.2 + r() * 0.14, cz + (r() - 0.5) * 0.55);
        R.add(dot);
      }
    }
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
  private komodoActor(i: number) { while (this.komodoActors.length <= i) this.komodoActors.push(new Actor(this.root, KOMODO_GEO)); return this.komodoActors[i]; }
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
    this.skyDay.visible = true;
    for (const c2 of this.clouds) c2.visible = true;
    // the zoo fence only exists in shot 4 — Flora's enclosure
    if (this.fence) this.fence.visible = (id === 4);
    // ---- STANDAR GERAK: everything that should move, moves ----
    // sea water flows toward the shore (texture scroll, not a poster)
    if (this.waterMap) this.waterMap.offset.set(0, tt * 0.055);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels across the savanna)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.1, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---------------- cast + effects ----------------
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const dir = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(-1);
    const st2 = stage(id, t, { pos: cam.position, right, dir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0, ki = 0;
    const used: Actor[] = [];
    for (const p of st2.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "komodo" ? this.komodoActor(ki++) : this.actor(ai++);
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
    for (let i = ki; i < this.komodoActors.length; i++) this.komodoActors[i].mesh.visible = false;
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
