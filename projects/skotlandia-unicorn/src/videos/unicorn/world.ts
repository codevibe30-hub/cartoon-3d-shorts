// Scotland, Highlands as one three.js scene for the Fafnir-ID
// short: a green moor with purple heather in the foreground, two
// rolling hill ridges behind, Edinburgh Castle on its rock to the
// left, a small loch pond on the right, Scots pines and dry-stone
// walls scattered on the moor, and the hero standing in the open
// with the claim card. The hills are custom geometry whose crests
// follow story.hillAt / hillBackAt, painted with a textured
// grass-and-heather canvas so they read as living moorland, never
// flat color. A pond sits at POND: in shot 5 its water shifts from
// murky green to clear blue as the unicorn's horn touches it.
// VISUAL CORE: bright Scottish highland daylight, deep blue sky
// with layered clouds, green moor, purple heather — textured
// everything (anti-banding: speckled sky, flecked moor, speckled
// rock). Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, UNICORN_GEO, LION_GEO } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_SPOT, POND, hillAt, hillBackAt, terrainY } from "./story";

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
const skyTexDay = () => ctex("unicornSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1453b8"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
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
const glowTex = () => ctex("unicornGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("unicornBirds", 256, 96, (g, r) => {
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
/** Highland moor grass: deep green with purple heather patches —
 *  deep shadow pockets, sunlit fleck clusters and thousands of
 *  individual blades, on a deeper base that survives the sun lift. */
const moorGrassTex = () => ctex("unicornMoorGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5a7a3a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "52,84,30" : "140,178,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // purple heather patches — the moor's signature colour
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 90;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      gr.addColorStop(0, "rgba(122,74,140,0.34)"); gr.addColorStop(1, "rgba(122,74,140,0)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(190,220,130,${0.10 + r() * 0.20})` : `rgba(40,66,24,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#4a6a2a", "#5a7a35", "#7a9a4a", "#9aba5e", "#7a4a8a"];
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
        g.strokeStyle = b % 2 ? "#7a9a4a" : "#3a5a26"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(34,52,22,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** bare earth for the path, wall feet and rock bases */
const soilTex = () => ctex("unicornSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("unicornPatch", 256, 256, (g) => {
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
const blobTex = () => ctex("unicornBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** loch water: deep blue-green with moving ripple rings painted in */
const waterTex = () => ctex("unicornWater", 512, 512, (g, r) => {
  g.fillStyle = "#2e5a6a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = r() * 512, rad = 12 + r() * 46;
    g.strokeStyle = `rgba(180,220,235,${0.10 + r() * 0.16})`; g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.ellipse(x, y, rad, rad * 0.45, r() * 3, 0, 7); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "200,235,245" : "10,40,55"},${0.06 + r() * 0.14})`;
    g.fillRect(r() * 512, r() * 512, 1.8, 1.8);
  }
  const lg = g.createLinearGradient(0, 0, 512, 512);
  lg.addColorStop(0, "rgba(255,255,255,0.10)"); lg.addColorStop(1, "rgba(10,30,45,0.18)");
  g.fillStyle = lg; g.fillRect(0, 0, 512, 512);
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
  const root = new THREE.Color("#4a6a2a"), tip = new THREE.Color("#9aba5e"), tmp = new THREE.Color();
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
  private unicornActors: Actor[] = [];
  private lionActors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private pondMat: THREE.MeshLambertMaterial | null = null;
  private pondGlow: THREE.Sprite | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private bushes: { g: THREE.Group; ph: number }[] = [];
  private pines: { g: THREE.Group; ph: number }[] = [];
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
    // distant bird flocks, small + high
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildHighlands(R, r);
  }

  // ---------------- the Highlands: moor, hills, castle, pond ----------------
  private buildHighlands(R: THREE.Group, r: () => number) {
    // base moor ground (z +40 down to the front hill base)
    const land = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), lam2({ map: rep(moorGrassTex(), 24, 14) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.05, -5); land.receiveShadow = true; R.add(land);
    // ---- THE FRONT HILL RIDGE: green with heather, the star backdrop ----
    const hillM = lam2({ map: rep(moorGrassTex(), 10, 3) });
    const hill = new THREE.Mesh(makeHillGeo(140, hillAt, -12, -18, -30), hillM);
    hill.castShadow = true; hill.receiveShadow = true; R.add(hill);
    // ---- the back ridge: muted green, hazed by distance ----
    const farM = lam2({ map: rep(moorGrassTex(), 8, 2), color: "#8f96a8" });
    const far = new THREE.Mesh(makeHillGeo(220, hillBackAt, -34, -42, -60), farM);
    far.receiveShadow = true; R.add(far);
    // ---- EDINBURGH CASTLE ROCK + CASTLE (left, behind) ----
    const rockM = lam2({ color: "#5a5148" });
    const rock = new THREE.Mesh(new THREE.ConeGeometry(11, 15, 12), rockM);
    rock.position.set(-22, 6.5, -36); rock.scale.set(1.15, 1, 0.85); rock.castShadow = true; R.add(rock);
    const rockBase = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), lam2({ color: "#4a4238" }));
    rockBase.scale.set(13, 5, 10); rockBase.position.set(-22, 0.5, -36); R.add(rockBase);
    // castle: stone keep + two round towers with slate cone roofs
    const wallM = lam2({ color: "#9a8f7a" });
    const roofM = lam2({ color: "#4a5a6a" });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 5), wallM);
    keep.position.set(-22, 16, -36); keep.castShadow = true; R.add(keep);
    for (const [tx, tz] of [[-26.5, -34], [-17.5, -38]] as [number, number][]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 5.5, 12), wallM);
      tower.position.set(tx, 16.2, tz); tower.castShadow = true; R.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.6, 12), roofM);
      roof.position.set(tx, 20.2, tz); roof.castShadow = true; R.add(roof);
    }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 1.2), wallM);
    wall.position.set(-22, 14.6, -33.4); wall.castShadow = true; R.add(wall);
    // a Saltire flag on the keep: blue field, white diagonal cross
    const flagM = new THREE.MeshBasicMaterial({ color: "#2a4a8a", side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), flagM);
    flag.position.set(-22, 20.4, -36); R.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), lam2({ color: "#3a2a1a" }));
    pole.position.set(-23.1, 19.6, -36); R.add(pole);
    // ---- THE LOCH POND (shot 5): murky green until the horn purifies it ----
    const pondM = lam2({ map: waterTex(), color: "#5a6a3a" });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(2.2, 28), pondM);
    pond.rotation.x = -Math.PI / 2; pond.position.set(POND[0], 0.04, POND[2]); pond.receiveShadow = true; R.add(pond);
    this.pondMat = pondM;
    const pglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    pglow.position.set(POND[0], 0.6, POND[2]); pglow.scale.set(6, 6, 1); pglow.layers.set(NOINK); R.add(pglow);
    this.pondGlow = pglow;
    // ---- the dirt path across the moor ----
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (let i = 0; i < 7; i++) {
      const x = -6 + i * 2.2, z = 14 - i * 1.1;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), soilM);
      seg.rotation.x = -Math.PI / 2; seg.rotation.z = 0.42;
      seg.position.set(x, 0.01 + i * 0.002, z); seg.receiveShadow = true; R.add(seg);
    }
    // ---- dry-stone wall: low, rugged, unmistakably Scottish ----
    const stoneM = lam2({ color: "#8a8378" });
    for (let i = 0; i < 9; i++) {
      const bx = -14 + i * 1.1;
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5 + (i % 3) * 0.08, 0.55), stoneM);
      block.position.set(bx, 0.28, 6); block.rotation.y = (r() - 0.5) * 0.06; block.castShadow = true; R.add(block);
      blob(R, bx, 0.12, 6, 1.3, 1.3, 0.25);
    }
    // ---- grey-brown boulders scattered on the moor ----
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
    // ---- thistle bushes: dark green layered blobs with purple tops, never mushroom umbrellas ----
    const bushMats = [
      lam2({ color: "#3a5a2e", map: rep(foliageTex("unicornFoliageBush"), 2, 1) }),
      lam2({ color: "#4a6a35", map: rep(foliageTex("unicornFoliageBush"), 2, 1) }),
      lam2({ color: "#2e4a26", map: rep(foliageTex("unicornFoliageBush"), 2, 1) }),
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
      // purple thistle heads poking out of the bush
      for (let j = 0; j < 3; j++) {
        const th = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lam2({ color: "#9a5ac0" }));
        th.position.set((r() - 0.5) * rad, 0.7 + rad * 0.5 + r() * 0.3, (r() - 0.5) * rad);
        g.add(th);
      }
      g.position.set(x, 0, z); R.add(g);
      this.bushes.push({ g, ph: i * 1.93 + 0.7 });
      blob(R, x, 0.12, z, rad * 2.2, rad * 2.2, 0.30);
    });
    // ---- Scots pines: layered cones, never mushroom umbrellas ----
    const pineTrunk = lam2({ color: "#5a4230" });
    const pineMats = [lam2({ color: "#2e4a26" }), lam2({ color: "#3a5a2e" }), lam2({ color: "#24401e" })];
    const pinePts: [number, number, number][] = [
      [-16, -14, 1.2], [18, -18, 1.4], [-24, 2, 1.0], [24, -2, 1.3], [-10, -24, 1.1], [14, 22, 0.9],
    ];
    pinePts.forEach(([x, z, s], i) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.6 * s, 8), pineTrunk);
      trunk.position.y = 0.8 * s; trunk.castShadow = true; g.add(trunk);
      for (let j = 0; j < 3; j++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.5 - j * 0.35) * s, 1.8 * s, 10), pineMats[(i + j) % 3]);
        cone.position.y = (1.6 + j * 1.1) * s; cone.castShadow = true; g.add(cone);
      }
      g.position.set(x, 0, z); R.add(g);
      this.pines.push({ g, ph: i * 2.11 + 0.4 });
      blob(R, x, 0.12, z, 2.2 * s, 2.2 * s, 0.30);
    });
    // ---- ground dressing: sun pools, shade patches, soil discs ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.8 + r() * 7.5), 0.128, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (6.8 + r() * 7.5), 0.129, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    // ---- moor grass tufts, instanced: dense fringes, loose scatter ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 64, z = 28 - r() * 60;
      if (Math.hypot(x - HERO_SPOT[0], z - HERO_SPOT[2]) < 1.6) continue;
      if (Math.hypot(x - POND[0], z - POND[2]) < 2.8) continue;
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
    // ---- sparse moor wildflowers: purple heather + white bog cotton ----
    const fl2 = ["#9a5ac0", "#7a4a9a", "#e8c832", "#f2f0e6", "#c25a7a", "#e86a9a"];
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
  private unicornActor(i: number) { while (this.unicornActors.length <= i) this.unicornActors.push(new Actor(this.root, UNICORN_GEO)); return this.unicornActors[i]; }
  private lionActor(i: number) { while (this.lionActors.length <= i) this.lionActors.push(new Actor(this.root, LION_GEO)); return this.lionActors[i]; }
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
    // the pond purifies in shot 5 (the horn touches the water):
    // murky green → clear blue, with a soft glow blooming.
    if (this.pondMat && this.pondGlow) {
      if (id === 5) {
        const u = THREE.MathUtils.clamp((f - s.a) / Math.max(1, s.b - s.a), 0, 1);
        const e = u * u * (3 - 2 * u);
        this.pondMat.color.setRGB(0.35 + (0.18 - 0.35) * e, 0.42 + (0.48 - 0.42) * e, 0.23 + (0.72 - 0.23) * e);
        (this.pondGlow.material as THREE.SpriteMaterial).opacity = 0.55 * e;
      } else {
        this.pondMat.color.setRGB(0.35, 0.42, 0.23);
        (this.pondGlow.material as THREE.SpriteMaterial).opacity = 0;
      }
    }
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // thistle bushes sway in the breeze, pivoting at the base
    for (const b2 of this.bushes) {
      b2.g.rotation.z = Math.sin(tt * 1.15 + b2.ph) * 0.012;
      b2.g.rotation.x = Math.cos(tt * 0.85 + b2.ph * 1.7) * 0.009;
    }
    // Scots pines sway gently, pivoting at the base
    for (const p2 of this.pines) {
      p2.g.rotation.z = Math.sin(tt * 0.9 + p2.ph) * 0.008;
    }
    // moor tufts bend with the same wind (phase travels across the moor)
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
    let ai = 0, ui = 0, li = 0;
    const used: Actor[] = [];
    for (const p of st2.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "unicorn" ? this.unicornActor(ui++) : p.geo === "lion" ? this.lionActor(li++) : this.actor(ai++);
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
    for (let i = ui; i < this.unicornActors.length; i++) this.unicornActors[i].mesh.visible = false;
    for (let i = li; i < this.lionActors.length; i++) this.lionActors[i].mesh.visible = false;
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
