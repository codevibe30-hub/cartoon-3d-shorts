// Buton Island, Southeast Sulawesi as one three.js scene for
// the Fafnir-ID short: a white-sand beach in the foreground, a
// coastal village with wooden stilt houses (rumah panggung) and
// palms behind it, turquoise sea to the right with moving
// ripples, and two jungle-green hill ridges behind. The hills
// are custom geometry whose crests follow story.hillAt /
// hillBackAt, painted with a textured jungle canvas so they read
// as living rainforest, never flat color.
// VISUAL CORE: bright tropical daylight, deep blue sky with
// layered clouds, turquoise sea, white sand — textured everything
// (anti-banding: speckled sky, flecked sand, speckled rock).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_SPOT, BUTON_SPOT, SEA_X, hillAt, hillBackAt, terrainY } from "./story";

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
const skyTexDay = () => ctex("butonSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0e4fb8"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
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
const glowTex = () => ctex("butonGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant seagulls, painted as one sprite */
const birdTex = () => ctex("butonBirds", 256, 96, (g, r) => {
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
  g.fillStyle = "#7fae62"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(24,58,20,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(220,255,180,${0.12 + r() * 0.22})` : `rgba(20,50,16,${0.10 + r() * 0.18})`;
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
/** Tropical jungle grass: deep green with sunlit flecks and
 *  thousands of individual blades, on a deeper base that
 *  survives the sun lift. */
const jungleGrassTex = () => ctex("butonJungleGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4a7a30"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "38,72,22" : "120,170,70";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(180,220,120,${0.10 + r() * 0.20})` : `rgba(30,60,18,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#3a5a22", "#4a6a2a", "#6a8a3a", "#8aaa4e", "#c25a7a"];
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
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(26,46,16,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** white sand: warm pale base, shell flecks, soft ripples */
const sandTex = () => ctex("butonSand", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#f2e3c2"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 90;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = r() < 0.5 ? "226,200,150" : "255,246,220";
      gr.addColorStop(0, `rgba(${c},0.30)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 7000; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = r() > 0.5 ? `rgba(255,250,230,${0.12 + r() * 0.22})` : `rgba(180,150,100,${0.10 + r() * 0.20})`;
    g.fillRect(x, y, 1.8, 1.8);
  }
  // a few tiny shells + coral bits
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = ["#e86a9a", "#f2f0e6", "#e8c832", "#c25a7a"][Math.floor(r() * 4) % 4];
    g.beginPath(); g.ellipse(x, y, 3 + r() * 4, 2 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
/** bare earth for the path and house feet */
const soilTex = () => ctex("butonSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("butonPatch", 256, 256, (g) => {
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
const blobTex = () => ctex("butonBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** turquoise sea: bright aqua with moving ripple rings painted in */
const seaTex = () => ctex("butonSea", 512, 512, (g, r) => {
  g.fillStyle = "#1e9ab0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = r() * 512, rad = 12 + r() * 46;
    g.strokeStyle = `rgba(220,245,255,${0.10 + r() * 0.16})`; g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.ellipse(x, y, rad, rad * 0.45, r() * 3, 0, 7); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "220,245,255" : "10,60,80"},${0.06 + r() * 0.14})`;
    g.fillRect(r() * 512, r() * 512, 1.8, 1.8);
  }
  const lg = g.createLinearGradient(0, 0, 512, 512);
  lg.addColorStop(0, "rgba(255,255,255,0.12)"); lg.addColorStop(1, "rgba(10,40,60,0.18)");
  g.fillStyle = lg; g.fillRect(0, 0, 512, 512);
});
/** woven bamboo wall texture for the stilt houses */
const weaveTex = () => ctex("butonWeave", 256, 256, (g, r) => {
  g.fillStyle = "#c9a86a"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      const over = ((x + y) / 16) % 2 === 0;
      g.fillStyle = over ? "rgba(160,120,60,0.55)" : "rgba(220,190,130,0.55)";
      g.fillRect(x, y, 16, 16);
    }
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,60,20,${0.08 + r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** thatch roof texture: layered straw strokes */
const thatchTex = () => ctex("butonThatch", 256, 256, (g, r) => {
  g.fillStyle = "#b08a4a"; g.fillRect(0, 0, 256, 256);
  g.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = r() * 256, y = r() * 256, l = 10 + r() * 18;
    g.strokeStyle = ["#8a6a2a", "#c9a86a", "#e8c878", "#6a4a1a"][Math.floor(r() * 4) % 4];
    g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  g.globalAlpha = 1;
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A hill ridge: front slope + back slope as one custom
 *  geometry. Front slope runs base (y=0, zFront) → crest
 *  (y=crest(x), zCrest); back slope runs crest → (y=0, zBack).
 *  UV v follows the slope height. DoubleSide: the cameras dolly
 *  across the ridge and the slope must never go dark. */
const makeHillGeo = (w: number, crestFn: (x: number) => number, zFront: number, zCrest: number, zBack: number) => {
  const NX = 64, NV = 10;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const grid = (face: 0 | 1) => {
    const base = pos.length / 3;
    for (let iv = 0; iv <= NV; iv++) {
      const v = iv / NV;
      for (let ix = 0; ix <= NX; ix++) {
        const u = ix / NX;
        const x = -w / 2 + w * u;
        const c = crestFn(x);
        let y: number, z: number;
        if (face === 0) { y = v * c; z = zFront + (zCrest - zFront) * v; }
        else { y = (1 - v) * c; z = zCrest + (zBack - zCrest) * v; }
        pos.push(x, y, z); uv.push(u, face === 0 ? v : 1 - v);
      }
    }
    for (let iv = 0; iv < NV; iv++) for (let ix = 0; ix < NX; ix++) {
      const a = base + iv * (NX + 1) + ix, b = a + 1, c2 = a + NX + 1, d = c2 + 1;
      idx.push(a, b, d, a, d, c2);
    }
  };
  grid(0); grid(1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#3a5a22"), tip = new THREE.Color("#8aaa4e"), tmp = new THREE.Color();
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

/** A palm frond: a long tapered blade, slightly drooping — built
 *  from a flattened, bent cone so it reads as ONE frond, never a
 *  flat umbrella. Layered rings of fronds make the crown. */
const frondGeo = () => {
  const geo = new THREE.ConeGeometry(0.55, 3.2, 6);
  geo.translate(0, 1.6, 0);
  geo.scale(1, 1, 0.18);
  return geo;
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
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private seaMat: THREE.MeshLambertMaterial | null = null;
  private seaTexRef: THREE.Texture | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private bushes: { g: THREE.Group; ph: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1575);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#6a7a4a", 0.55);
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
    // the sun's halo + core, upper left down the valley
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant seagull flocks, small + high
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildButon(R, r);
  }

  // ---------------- Buton: beach, village, sea, hills ----------------
  private buildButon(R: THREE.Group, r: () => number) {
    // white-sand beach (z +32 down to the village edge z +6)
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(160, 30), lam2({ map: rep(sandTex(), 10, 2) }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.04, 19); sand.receiveShadow = true; R.add(sand);
    // grassy village ground (z +6 down to the front hill base)
    const land = new THREE.Mesh(new THREE.PlaneGeometry(160, 20), lam2({ map: rep(jungleGrassTex(), 24, 4) }));
    land.rotation.x = -Math.PI / 2; land.position.set(-40, -0.05, -4); land.receiveShadow = true; R.add(land);
    // ---- THE TURQUOISE SEA: right side + far band behind the hills ----
    const seaT = seaTex();
    seaT.wrapS = seaT.wrapT = THREE.RepeatWrapping;
    this.seaTexRef = seaT;
    const seaM = lam2({ map: rep(seaT, 8, 6) });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(46, 95), seaM);
    sea.rotation.x = -Math.PI / 2; sea.position.set(SEA_X + 23, 0.02, -15); sea.receiveShadow = true; R.add(sea);
    this.seaMat = seaM;
    const seaFar = new THREE.Mesh(new THREE.PlaneGeometry(260, 40), lam2({ map: rep(seaTex(), 12, 2), color: "#9fc4d4" }));
    seaFar.rotation.x = -Math.PI / 2; seaFar.position.set(0, -0.02, -80); R.add(seaFar);
    // foam line where the sea meets the sand
    const foamM = lam2({ color: "#f2fbff" });
    for (let i = 0; i < 12; i++) {
      const z = 28 - i * 4.4;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + r() * 1.4, 2.2), foamM);
      f.rotation.x = -Math.PI / 2; f.rotation.z = 0.2 + r() * 0.2;
      f.position.set(SEA_X - 0.4 + r() * 1.2, 0.06, z); R.add(f);
    }
    // ---- THE FRONT JUNGLE HILL RIDGE: green, textured, the star backdrop ----
    const hillM = lam2({ map: rep(jungleGrassTex(), 10, 3) });
    const hill = new THREE.Mesh(makeHillGeo(140, hillAt, -12, -18, -30), hillM);
    hill.castShadow = true; hill.receiveShadow = true; R.add(hill);
    // ---- the back ridge: muted green, hazed by distance ----
    const farM = lam2({ map: rep(jungleGrassTex(), 8, 2), color: "#8f96a8" });
    const far = new THREE.Mesh(makeHillGeo(220, hillBackAt, -34, -42, -60), farM);
    far.receiveShadow = true; R.add(far);
    // ---- STILT HOUSES (rumah panggung): woven walls, thatch roofs ----
    const weaveM = lam2({ map: rep(weaveTex(), 2, 1) });
    const thatchM = lam2({ map: rep(thatchTex(), 2, 1) });
    const woodM = lam2({ color: "#6a4a2c" });
    const buildHouse = (hx: number, hz: number, s: number, rotY: number) => {
      const g = new THREE.Group();
      // stilts
      for (const [sx, sz] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]] as [number, number][]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 1.6 * s, 8), woodM);
        st.position.set(sx * s, 0.8 * s, sz * s); st.castShadow = true; g.add(st);
      }
      // floor + woven walls
      const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2 * s, 0.25 * s, 3 * s), woodM);
      floor.position.y = 1.7 * s; floor.castShadow = true; g.add(floor);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(3.8 * s, 2.2 * s, 2.6 * s), weaveM);
      walls.position.y = 2.9 * s; walls.castShadow = true; g.add(walls);
      // door + windows (dark insets with frames)
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8 * s, 1.6 * s), lam2({ color: "#3a2a1a" }));
      door.position.set(-0.6 * s, 2.6 * s, 1.32 * s); g.add(door);
      for (const wx of [-1.2, 1.2]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7 * s, 0.7 * s), lam2({ color: "#2a3a4a" }));
        win.position.set(wx * s, 3.2 * s, 1.32 * s); g.add(win);
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 0.9 * s), lam2({ color: "#f2ede2" }));
        frame.position.set(wx * s, 3.2 * s, 1.31 * s); g.add(frame);
        const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7 * s, 0.7 * s), lam2({ color: "#2a3a4a" }));
        win2.position.set(wx * s, 3.2 * s, 1.33 * s); g.add(win2);
      }
      // thatch roof: two sloped slabs + ridge cap
      for (const side of [-1, 1]) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(4.8 * s, 0.18 * s, 2.2 * s), thatchM);
        slab.position.set(0, 4.9 * s, side * 0.95 * s);
        slab.rotation.x = side * 0.62; slab.castShadow = true; g.add(slab);
      }
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 4.9 * s, 8), thatchM);
      ridge.rotation.z = Math.PI / 2; ridge.position.y = 5.55 * s; ridge.castShadow = true; g.add(ridge);
      // ladder up to the door
      for (let i = 0; i < 4; i++) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.08 * s, 0.08 * s), woodM);
        rung.position.set(-0.6 * s, 0.4 * s + i * 0.4 * s, 1.9 * s + i * 0.08 * s); g.add(rung);
      }
      g.position.set(hx, 0, hz); g.rotation.y = rotY; R.add(g);
      blob(R, hx, 0.12, hz, 6 * s, 5 * s, 0.30);
    };
    buildHouse(-12, -6, 1.15, 0.35);
    buildHouse(-19, 2, 0.95, -0.2);
    buildHouse(-8, -11, 0.85, 0.5);
    // ---- PALMS: curved trunks + layered frond crowns, never mushroom umbrellas ----
    const palmTrunk = lam2({ color: "#6a4a2c" });
    const frondMats = [lam2({ color: "#2e6a26", side: THREE.DoubleSide }), lam2({ color: "#3a7a2e", side: THREE.DoubleSide }), lam2({ color: "#244a1e", side: THREE.DoubleSide })];
    const palmPts: [number, number, number][] = [
      [-9, -2, 1.2], [8, -6, 1.35], [-16, 6, 1.0], [12, 4, 1.1], [-5, -13, 1.25], [17, -12, 1.0], [-22, -8, 1.15], [6, 14, 0.9],
    ];
    palmPts.forEach(([x, z, s], i) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 5.2 * s, 8), palmTrunk);
      trunk.position.y = 2.6 * s; trunk.rotation.z = 0.08 * (i % 2 ? 1 : -1); trunk.castShadow = true; g.add(trunk);
      // coconuts clustered under the crown
      for (let c = 0; c < 3; c++) {
        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 8, 6), lam2({ color: "#6a4a1a" }));
        nut.position.set((c - 1) * 0.3 * s, 5.1 * s, (c % 2 ? 0.2 : -0.2) * s); g.add(nut);
      }
      // two rings of fronds: upper ring up-out, lower ring drooping out-down
      for (let ring = 0; ring < 2; ring++) {
        const n = 7, tilt = ring === 0 ? -0.5 : 0.55;
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2 + ring * 0.45;
          const fr = new THREE.Mesh(frondGeo(), frondMats[(i + j + ring) % 3]);
          fr.position.set(Math.cos(a) * 0.3 * s, (5.2 - ring * 0.25) * s, Math.sin(a) * 0.3 * s);
          fr.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
          fr.rotation.y = -a;
          fr.scale.setScalar(s);
          fr.castShadow = true; g.add(fr);
        }
      }
      g.position.set(x, 0, z); R.add(g);
      this.palms.push({ g, ph: i * 2.11 + 0.4 });
      blob(R, x, 0.12, z, 2.2 * s, 2.2 * s, 0.30);
    });
    // ---- jungle bushes: layered green blobs with hibiscus tops, never mushroom umbrellas ----
    const bushMats = [
      lam2({ color: "#2e5a24", map: rep(foliageTex("butonFoliageBush"), 2, 1) }),
      lam2({ color: "#3a6a2a", map: rep(foliageTex("butonFoliageBush"), 2, 1) }),
      lam2({ color: "#24401e", map: rep(foliageTex("butonFoliageBush"), 2, 1) }),
    ];
    const bushPts: [number, number][] = [
      [-14, -8], [16, -12], [-22, 6], [22, 10], [-8, 16], [12, 18], [-26, -14], [28, -6],
    ];
    bushPts.forEach(([x, z], i) => {
      const g = new THREE.Group();
      const rad = 0.8 + r() * 0.5;
      for (let j = 0; j < 4; j++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(rad * (0.55 + r() * 0.3), 10, 8), bushMats[(i + j) % 3]);
        b.position.set((r() - 0.5) * rad * 1.2, 0.25 + rad * (0.35 + r() * 0.3), (r() - 0.5) * rad * 1.2);
        b.scale.y = 0.72 + r() * 0.14; b.castShadow = true; g.add(b);
      }
      // hibiscus flowers poking out of the bush
      for (let j = 0; j < 3; j++) {
        const th = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lam2({ color: "#e86a9a" }));
        th.position.set((r() - 0.5) * rad, 0.7 + rad * 0.5 + r() * 0.3, (r() - 0.5) * rad);
        g.add(th);
      }
      g.position.set(x, 0, z); R.add(g);
      this.bushes.push({ g, ph: i * 1.93 + 0.7 });
      blob(R, x, 0.12, z, rad * 2.2, rad * 2.2, 0.30);
    });
    // ---- grey-brown boulders scattered on the beach ----
    const rockMats = [lam2({ color: "#8a8378" }), lam2({ color: "#6e675c" }), lam2({ color: "#9a9184" })];
    const rocks: [number, number, number][] = [
      [-4, 12, 0.9], [10, 8, 0.7], [-10, 20, 0.6], [16, 14, 0.8], [4, -20, 0.55],
      [-18, 12, 0.75], [10, 24, 0.5], [-2, -26, 0.65], [20, -40, 0.9],
    ];
    rocks.forEach(([x, z, s], i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMats[i % rockMats.length]);
      rock.position.set(x, s * 0.4, z); rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.scale.y = 0.62; rock.castShadow = true; R.add(rock);
      blob(R, x, 0.12, z, s * 2.4, s * 2.4, 0.30);
    });
    // ---- ground dressing: sun pools, shade patches ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.8 + r() * 7.5), 0.128, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#4a7a30", s * (6.8 + r() * 7.5), 0.129, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    // ---- jungle grass tufts, instanced ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 64, z = 28 - r() * 60;
      if (Math.hypot(x - HERO_SPOT[0], z - HERO_SPOT[2]) < 1.6) continue;
      if (Math.hypot(x - BUTON_SPOT[0], z - BUTON_SPOT[2]) < 1.6) continue;
      pushTuft(x, z, 0.65 + r() * 0.8);
    }
    for (const [bx, bz] of bushPts) for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      pushTuft(bx + Math.cos(a) * d, bz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.29 + (r() - 0.5) * 0.04, 0.42, 0.82 + (r() - 0.5) * 0.14);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // ---- tropical flowers: hibiscus + frangipani dots ----
    const fl2 = ["#e86a9a", "#c25a7a", "#e8c832", "#f2f0e6", "#ff8a5a", "#ffffff"];
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
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // seagull flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // sea ripples drift: the texture offset slides with time
    if (this.seaTexRef) { this.seaTexRef.offset.x = (tt * 0.008) % 1; this.seaTexRef.offset.y = (tt * 0.005) % 1; }
    // jungle bushes sway in the breeze, pivoting at the base
    for (const b2 of this.bushes) {
      b2.g.rotation.z = Math.sin(tt * 1.15 + b2.ph) * 0.012;
      b2.g.rotation.x = Math.cos(tt * 0.85 + b2.ph * 1.7) * 0.009;
    }
    // palms sway gently, pivoting at the base
    for (const p2 of this.palms) {
      p2.g.rotation.z = Math.sin(tt * 0.9 + p2.ph) * 0.008;
    }
    // jungle tufts bend with the same wind (phase travels across the ground)
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
