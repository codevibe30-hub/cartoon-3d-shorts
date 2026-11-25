// The Debus ground, Banten as one three.js scene for the
// Fafnir-ID format: an open village performance ground in
// bright daylight — a woven mat where the performer presses
// the iron spike, the troupe's painted banner overhead,
// pennant strings fluttering, houses and layered trees
// around, a hazy mountain behind — and, far down +z, the
// sultanate pendopo above its training field for the war
// flashback. VISUAL CORE: the pressing act on the mat,
// sunlit dust, everything textured (anti-banding: grain +
// speckle on every surface). Layered light rig: sun key w/
// soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, stoneHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, clamp01, lin, MAT, PERF, MUS1, MUS2, STAND } from "./story";

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
const skyTexDay = () => ctex("debusSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("debusGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("debusBlob", 256, 256, (g) => {
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
/** village grass: deep green body, light patches, blades */
const grassTex = () => ctex("debusGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c6c36"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "34,54,20" : "120,150,76";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#2f4c1c", "#426628", "#5c8a40", "#7ea454", "#3a5c26"];
  g.lineCap = "round";
  for (let i = 0; i < 12000; i++) {
    const x = r() * S, y = r() * S, l = 7 + r() * 13, lean = (r() - 0.5) * 6;
    wrapDraw(S, x, y, 16, (xx, yy) => {
      g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
      g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + lean, yy - l); g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.55 ? "122,94,58" : "210,226,160"},${0.10 + r() * 0.18})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.6, 0, 7); g.fill(); }
});
/** packed performance earth: swept dirt with scuffs + speckle */
const dirtTex = () => ctex("debusDirt", 512, 512, (g, r) => {
  g.fillStyle = "#8a6c48"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "52,38,20" : "196,164,116"},${0.12 + r() * 0.18})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 24, 4 + r() * 15, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 3200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "40,28,14" : "226,204,160"},${0.05 + r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  g.strokeStyle = "rgba(60,44,24,0.20)"; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    g.beginPath();
    const x = r() * 512, y = r() * 512;
    g.moveTo(x, y); g.quadraticCurveTo(x + 20 - r() * 40, y + 8 - r() * 16, x + 44 - r() * 88, y + 14 - r() * 28); g.stroke();
  }
});
/** the woven performance mat: red-brown pandan weave with
 *  cream stripe bands and a worn centre */
const matTex = () => ctex("debusMat", 512, 512, (g, r) => {
  g.fillStyle = "#9c4030"; g.fillRect(0, 0, 512, 512);
  const cell = 32;
  for (let y = 0; y < 512 / cell; y++) for (let x = 0; x < 512 / cell; x++) {
    const over = (x + y) % 2 === 0;
    g.fillStyle = over ? "rgba(255,190,140,0.13)" : "rgba(40,10,6,0.13)";
    if (over) g.fillRect(x * cell, y * cell, cell, cell * 0.52); else g.fillRect(x * cell, y * cell, cell * 0.52, cell);
  }
  g.strokeStyle = "#e8c832"; g.lineWidth = 7;
  g.beginPath(); g.arc(256, 256, 196, 0, 7); g.stroke();
  g.strokeStyle = "#f2ede2"; g.lineWidth = 3.4;
  g.beginPath(); g.arc(256, 256, 178, 0, 7); g.stroke();
  g.beginPath(); g.arc(256, 256, 214, 0, 7); g.stroke();
  const worn = g.createRadialGradient(256, 256, 10, 256, 256, 150);
  worn.addColorStop(0, "rgba(240,220,180,0.20)"); worn.addColorStop(1, "rgba(240,220,180,0)");
  g.fillStyle = worn; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,8,4" : "255,214,170"},${0.04 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});
/** the troupe's banner: cream cloth, red double border,
 *  diamond motifs, DEBUS BANTEN in bold dark red */
const bannerTex = () => ctex("debusBanner", 1024, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#f4ead2"); grad.addColorStop(0.55, "#ecdfc0"); grad.addColorStop(1, "#dccda6");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,96,58" : "255,252,240"},${0.04 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.strokeStyle = "#a02318"; g.lineWidth = 13; g.strokeRect(14, 14, 996, 228);
  g.strokeStyle = "#c9862e"; g.lineWidth = 4; g.strokeRect(36, 36, 952, 184);
  const diamond = (x: number, y: number, s: number, col: string) => {
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
    g.fillStyle = col; g.fillRect(-s / 2, -s / 2, s, s);
    g.strokeStyle = "#7a1a12"; g.lineWidth = 3; g.strokeRect(-s / 2, -s / 2, s, s);
    g.restore();
  };
  diamond(96, 128, 44, "#c9862e"); diamond(928, 128, 44, "#c9862e");
  diamond(160, 128, 24, "#a02318"); diamond(864, 128, 24, "#a02318");
  g.fillStyle = "#8e1f14";
  g.font = "900 104px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.save();
  g.shadowColor = "rgba(90,40,10,0.35)"; g.shadowOffsetY = 4; g.shadowBlur = 0;
  g.fillText("DEBUS BANTEN", 512, 132);
  g.restore();
});
/** leaf-fleck canopy texture in layered greens */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#5d7d40"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(14,28,10,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(200,228,160,${0.12 + r() * 0.22})` : `rgba(10,24,6,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** a torch flame: white-hot core, gold body, soft halo */
const flameTex = () => ctex("debusFlame", 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256);
  const halo = g.createRadialGradient(64, 150, 4, 64, 150, 120);
  halo.addColorStop(0, "rgba(255,190,90,0.5)"); halo.addColorStop(1, "rgba(255,190,90,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 128, 256);
  const body = g.createRadialGradient(64, 168, 2, 64, 150, 62);
  body.addColorStop(0, "rgba(255,252,238,1)"); body.addColorStop(0.35, "rgba(255,214,110,0.95)");
  body.addColorStop(0.75, "rgba(244,140,40,0.75)"); body.addColorStop(1, "rgba(244,140,40,0)");
  g.fillStyle = body;
  g.beginPath(); g.ellipse(64, 148, 30, 62, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,246,0.95)";
  g.beginPath(); g.ellipse(64, 168, 11, 26, 0, 0, 7); g.fill();
});
/** a soft smoke puff */
const smokeTex = () => ctex("debusSmoke", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(226,228,232,0.55)"); gr.addColorStop(0.6, "rgba(210,212,218,0.28)"); gr.addColorStop(1, "rgba(210,212,218,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** a soft dust mote dot */
const dustTex = () => ctex("debusDust", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  gr.addColorStop(0, "rgba(255,246,220,0.9)"); gr.addColorStop(1, "rgba(255,246,220,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A round village tree: textured trunk + a canopy of
 *  layered flecked blobs (never a green ball). */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#8a6a48", map: rep(dirtTex(), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.34, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "debusFoliageDeep"), folM(greens[0], "debusFoliageMid"), folM(greens[1] ?? greens[0], "debusFoliageLite")];
  const cy = h * 0.78, cr = h * 0.42;
  const blobs: [number, number, number, number][] = [
    [0, cy, 0, cr], [-cr * 0.55, cy - cr * 0.18, cr * 0.1, cr * 0.72], [cr * 0.55, cy - cr * 0.14, -cr * 0.08, cr * 0.78],
    [0, cy + cr * 0.42, 0, cr * 0.62], [-cr * 0.2, cy + cr * 0.1, cr * 0.5, cr * 0.55], [cr * 0.25, cy + cr * 0.16, -cr * 0.45, cr * 0.5],
  ];
  blobs.forEach(([x, y, z, rad], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 10), mats[i % 3]);
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
  });
  return g;
};

/** The debus tool as a 3D prop: an iron spike (shaft + cone
 *  tip) with its steel-banded wooden base block. */
const makeSpikeProp = (len = 0.95) => {
  const g = new THREE.Group();
  const steel = lam2({ color: "#c9ced6" });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len * 0.72, 8), steel);
  shaft.rotation.z = Math.PI / 2; shaft.position.x = -len * 0.1; shaft.castShadow = true; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, len * 0.28, 8), steel);
  tip.rotation.z = -Math.PI / 2; tip.position.x = -len * 0.1 - len * 0.36 - len * 0.14 + 0.028; tip.castShadow = true; g.add(tip);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.17, 0.11), lam2({ color: "#8a5a34", map: rep(dirtTex(), 1, 1) }));
  block.position.x = len * 0.32; block.castShadow = true; g.add(block);
  const bandM = lam2({ color: "#5d6670" });
  for (const dy of [-0.055, 0.055]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.022, 0.125), bandM);
    band.position.set(len * 0.32, dy, 0); g.add(band);
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
  private trees: { g: THREE.Group; ph: number }[] = [];
  private sunGlows: THREE.Sprite[] = [];
  // ---- episode systems ----
  private banner!: THREE.Mesh;
  private pennants: { m: THREE.Mesh; ph: number }[] = [];
  private torchFlame!: THREE.Sprite;
  private torchLight!: THREE.PointLight;
  private smokes: { sp: THREE.Sprite; off: number }[] = [];
  private dust!: THREE.Points;
  private dustBase!: Float32Array;
  private dustPh: number[] = [];
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(69);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#5d7a44", 0.55);
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
    this.buildArena(R, r);
    this.buildVillage(R, r);
    this.buildPendopo(R, r);
    this.buildDust(R, r);
  }

  // ---------------- the performance ground ----------------
  private buildArena(R: THREE.Group, r: () => number) {
    // swept dirt in the middle, grass all around
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(64, 58), lam2({ map: rep(dirtTex(), 10, 9), color: "#c8ab7e" }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, 0, -8); dirt.receiveShadow = true; R.add(dirt);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(190, 150), lam2({ map: rep(grassTex(), 22, 17), color: "#9db87e" }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.03, 8); grass.receiveShadow = true; R.add(grass);
    // the woven mat
    const mat = new THREE.Mesh(new THREE.CircleGeometry(5.6, 36), lam2({ map: matTex(), color: "#e8b49c" }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(MAT[0], 0.015, MAT[2]); mat.receiveShadow = true; R.add(mat);
    // ---- the banner rig: two bamboo poles + crossbar + the cloth ----
    const bambooM = lam2({ color: "#a8894e", map: rep(dirtTex(), 1, 3) });
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.2, 8), bambooM);
      pole.position.set(sx * 7.6, 3.6, -27); pole.castShadow = true; R.add(pole);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lam2({ color: "#c0353a" }));
      knob.position.set(sx * 7.6, 7.28, -27); R.add(knob);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 15.6, 8), bambooM);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 6.9, -27); R.add(bar);
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.85),
      new THREE.MeshLambertMaterial({ map: bannerTex(), side: THREE.DoubleSide }));
    this.banner.geometry.translate(0, -1.425, 0);
    this.banner.position.set(0, 6.82, -27); this.banner.castShadow = true; R.add(this.banner);
    // ---- pennant strings: pole tops out to side poles ----
    const flagCols = ["#c0353a", "#e8c832", "#3f74b5", "#58a05c", "#e8e2d2", "#e07b39"];
    const sidePole = (x: number, z: number) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 8), bambooM);
      p.position.set(x, 2.3, z); p.castShadow = true; R.add(p);
      return new THREE.Vector3(x, 4.55, z);
    };
    const strings: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(-7.6, 7.1, -27), sidePole(-16, -12)],
      [new THREE.Vector3(7.6, 7.1, -27), sidePole(16, -12)],
      [new THREE.Vector3(-7.6, 7.1, -27), sidePole(-15, -34)],
      [new THREE.Vector3(7.6, 7.1, -27), sidePole(15, -34)],
    ];
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, 0.34, -0.1, 0, 0.05, -0.52, 0,
    ]), 3));
    flagGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0]), 2));
    flagGeo.computeVertexNormals();
    for (const [a, b] of strings) {
      const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -1.5, 0)), b);
      const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.02, 5), lam2({ color: "#4c3a26" }));
      R.add(rope);
      for (let i = 1; i <= 9; i++) {
        const p = curve.getPoint(i / 10);
        const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: flagCols[i % flagCols.length], side: THREE.DoubleSide }));
        flag.position.copy(p);
        flag.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
        R.add(flag);
        this.pennants.push({ m: flag, ph: i * 0.9 + a.x });
      }
    }
    // ---- the musicians' drums beside their seats ----
    const drumAt = (x: number, z: number, big: boolean) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.21 : 0.17, big ? 0.26 : 0.2, big ? 0.78 : 0.34, 12),
        lam2({ color: "#7a4a26", map: rep(dirtTex(), 2, 1) }));
      body.rotation.z = Math.PI / 2; body.rotation.y = 0.5; body.castShadow = true; g.add(body);
      const skinM = lam2({ color: "#e8dcc0" });
      for (const e of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.CircleGeometry(big ? 0.2 : 0.165, 12), skinM);
        cap.position.set(e * (big ? 0.4 : 0.18), 0, 0);
        cap.rotation.y = e > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 + 0.5;
        g.add(cap);
      }
      g.position.set(x, big ? 0.3 : 0.2, z);
      R.add(g);
      blob(R, x, 0.012, z, 1.2, 1.2, 0.5);
    };
    drumAt(MUS1[0] + 0.9, MUS1[2] + 0.5, true);
    drumAt(MUS2[0] + 0.8, MUS2[2] + 0.4, false);
    // ---- the carved stand + the debus tool laid on it (shot 7) ----
    const standG = new THREE.Group();
    const woodM = lam2({ color: "#6e4a2a", map: rep(dirtTex(), 1, 1) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.62), woodM);
    top.position.y = 0.8; top.castShadow = true; top.receiveShadow = true; standG.add(top);
    for (const [lx, lz] of [[-0.72, -0.22], [0.72, -0.22], [-0.72, 0.22], [0.72, 0.22]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.8, 0.11), woodM);
      leg.position.set(lx, 0.4, lz); leg.castShadow = true; standG.add(leg);
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.5), woodM);
    shelf.position.y = 0.28; standG.add(shelf);
    const spike = makeSpikeProp(1.05);
    spike.position.set(-0.1, 0.9, 0); spike.rotation.y = 0.5; spike.rotation.z = 0.1;
    standG.add(spike);
    const spike2 = makeSpikeProp(0.8);
    spike2.position.set(0.15, 0.36, 0.05); spike2.rotation.y = -0.35;
    standG.add(spike2);
    const godo = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), lam2({ color: "#8a5a34" }));
    godo.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 10), lam2({ color: "#5d4030" }));
    head.rotation.z = Math.PI / 2; head.position.y = 0.24; godo.add(head);
    godo.position.set(0.62, 0.85, 0.18); godo.rotation.z = -0.5;
    standG.add(godo);
    standG.position.set(STAND[0], 0, STAND[2]);
    standG.rotation.y = -0.4;
    R.add(standG);
    blob(R, STAND[0], 0.012, STAND[2], 2.0, 1.4, 0.5);
    // a low offering tray + spare coconuts at the mat's edge
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.14, 14), lam2({ color: "#8a6a34" }));
    tray.position.set(-4.6, 0.07, -23.8); tray.castShadow = true; R.add(tray);
    const cocoM = lam2({ color: "#5d4126", map: rep(dirtTex(), 1, 1) });
    for (const [cx, cz] of [[-4.75, -23.7], [-4.4, -24.05], [3.8, -24.6]] as [number, number][]) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), cocoM);
      coco.position.set(cx, 0.2, cz); coco.castShadow = true; R.add(coco);
    }
    // ---- the torch flame + smoke (shot 3, positioned in update) ----
    this.torchFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.torchFlame.scale.set(0.62, 1.0, 1); this.torchFlame.layers.set(NOINK);
    this.torchFlame.visible = false; R.add(this.torchFlame);
    this.torchLight = new THREE.PointLight("#ff9a3c", 0, 16, 2);
    R.add(this.torchLight);
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.layers.set(NOINK); sp.visible = false; R.add(sp);
      this.smokes.push({ sp, off: i / 4 });
    }
    // scattered stones on the dirt (anti-flat detail)
    const stoneM = lam2({ map: rep(stoneHD("debusStone", ["#a8a094", "#98917f", "#bab3a2", "#8a8474"], "#655d4f"), 1, 1), color: "#c4beb0" });
    for (let i = 0; i < 26; i++) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.08 + r() * 0.13, 8, 6), stoneM);
      const a = r() * Math.PI * 2, rad = 8 + r() * 20;
      st.position.set(Math.cos(a) * rad, 0.03, -14 + Math.sin(a) * rad * 0.7);
      st.scale.y = 0.55; st.castShadow = true; R.add(st);
    }
  }

  // ---------------- houses, trees, the mountain ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    const wallM = lam2({ map: rep(stoneHD("debusHouseWall", ["#d8cbb2", "#cbbc9e", "#e2d6bc", "#bfb094"], "#8a7c62"), 3, 2), color: "#e0d2b4" });
    const roofM = lam2({ color: "#9c4a34", map: rep(dirtTex(), 3, 3) });
    const woodM = lam2({ color: "#6e4a2a", map: rep(dirtTex(), 1, 1) });
    const houseAt = (x: number, z: number, ry: number, w = 7) => {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, 3.1, 5.4), wallM);
      walls.position.y = 1.55; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
      for (const sx of [-1, 1]) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.18, 6.6), roofM);
        slab.position.set(sx * w * 0.24, 3.95, 0); slab.rotation.z = -sx * 0.62; slab.castShadow = true; g.add(slab);
      }
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 6.4), woodM);
      ridge.position.y = 4.62; g.add(ridge);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), woodM);
      door.position.set(-w * 0.22, 1.05, 2.72); g.add(door);
      for (const wx of [w * 0.18, w * 0.36]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.08), woodM);
        win.position.set(wx, 1.8, 2.72); g.add(win);
        const glowP = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.85),
          new THREE.MeshLambertMaterial({ color: "#ffe2a8", emissive: "#ff9a3c", emissiveIntensity: 0.22 }));
        glowP.position.set(wx, 1.8, 2.77); g.add(glowP);
      }
      g.position.set(x, 0, z); g.rotation.y = ry;
      R.add(g);
      blob(R, x, 0.008, z, w + 2.5, 8, 0.45);
    };
    houseAt(-21, -30, 0.5);
    houseAt(22.5, -28, -0.45);
    houseAt(-24, -2, 1.15, 6);
    houseAt(25, 2, -1.2, 6.4);
    houseAt(-19, 16, 1.45, 5.6);
    houseAt(20, 17, -1.5, 5.6);
    // the hazy mountain behind the ground (Gunung Karang mood)
    const mtnM = lam2({ color: "#5d7d9e" });
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(58, 44, 7), mtnM);
    mtn.position.set(-46, 0, -185); R.add(mtn);
    const mtn2 = new THREE.Mesh(new THREE.ConeGeometry(40, 28, 7), lam2({ color: "#7490ac" }));
    mtn2.position.set(58, 0, -165); R.add(mtn2);
    const hillM = lam2({ color: "#6d8a58" });
    for (const [hx, hz, hs] of [[-95, -95, 30], [100, -80, 24], [-110, 30, 26]] as [number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hs, 14, 10), hillM);
      hill.scale.y = 0.36; hill.position.set(hx, 0, hz); R.add(hill);
    }
    // trees around the ground (they sway in update)
    const greens: [string, string, string] = ["#8ab464", "#a2cc7c", "#74a452"];
    const treeSpots: [number, number, number][] = [
      [-14, -33, 7.5], [13, -35, 8.5], [-29, -18, 7], [30, -16, 9], [-13, 6, 6.5],
      [-31, 8, 8], [31, 10, 7.5], [16, 12, 6], [-27, 26, 8], [27, 27, 7],
    ];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, i * 7 + 3);
      t.position.set(x, 0, z); R.add(t);
      this.trees.push({ g: t, ph: i * 0.83 });
      blob(R, x, 0.01, z, h * 0.9, h * 0.9, 0.5);
    });
    void r;
  }

  // ---------------- the sultanate yard (flashback) ----------------
  private buildPendopo(R: THREE.Group, r: () => number) {
    // packed earth field
    const field = new THREE.Mesh(new THREE.PlaneGeometry(120, 62), lam2({ map: rep(dirtTex(), 14, 8), color: "#bfa87e" }));
    field.rotation.x = -Math.PI / 2; field.position.set(0, -0.01, 120); field.receiveShadow = true; R.add(field);
    const grass2 = new THREE.Mesh(new THREE.PlaneGeometry(190, 90), lam2({ map: rep(grassTex(), 22, 10), color: "#93ad74" }));
    grass2.rotation.x = -Math.PI / 2; grass2.position.set(0, -0.04, 128); grass2.receiveShadow = true; R.add(grass2);
    // ---- the pendopo: stone base, columns, tiered roofs ----
    const hall = new THREE.Group();
    const stoneM = lam2({ map: rep(stoneHD("debusPendopo", ["#b3a68e", "#a2947a", "#c0b49c", "#978a72"], "#6e6152"), 5, 1), color: "#cfc4ae" });
    const base = new THREE.Mesh(new THREE.BoxGeometry(19, 1.1, 11), stoneM);
    base.position.set(0, 0.55, 152); base.castShadow = true; base.receiveShadow = true; hall.add(base);
    const steps = new THREE.Mesh(new THREE.BoxGeometry(5, 0.55, 2.2), stoneM);
    steps.position.set(0, 0.27, 145.6); steps.receiveShadow = true; hall.add(steps);
    const colM = lam2({ color: "#5d4030", map: rep(dirtTex(), 1, 2) });
    for (const cx of [-8, -4, 0, 4, 8]) for (const cz of [148.5, 155.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.6, 10), colM);
      col.position.set(cx, 3.4, cz); col.castShadow = true; hall.add(col);
    }
    const roofM = lam2({ color: "#4c3a34", map: rep(dirtTex(), 4, 4) });
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(13.4, 3.6, 4), roofM);
    roof1.rotation.y = Math.PI / 4; roof1.scale.set(1, 1, 0.62); roof1.position.set(0, 7.4, 152); roof1.castShadow = true; hall.add(roof1);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(8.2, 3.0, 4), roofM);
    roof2.rotation.y = Math.PI / 4; roof2.scale.set(1, 1, 0.62); roof2.position.set(0, 10.2, 152); roof2.castShadow = true; hall.add(roof2);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), lam2({ color: "#d9a83c", emissive: "#8a5f10", emissiveIntensity: 0.35 }));
    finial.position.set(0, 12.4, 152); hall.add(finial);
    // a deep red inner curtain wall behind the columns
    const inner = new THREE.Mesh(new THREE.BoxGeometry(16.5, 3.9, 0.4), lam2({ color: "#7e2a20", map: rep(dirtTex(), 3, 1) }));
    inner.position.set(0, 3.05, 155.8); hall.add(inner);
    R.add(hall);
    // ---- the training gear: a spear rack + a tool mat ----
    const rack = new THREE.Group();
    const postM = lam2({ color: "#5d4630", map: rep(dirtTex(), 1, 1) });
    for (const px of [-1.4, 1.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), postM);
      post.position.set(px, 0.75, 0); post.castShadow = true; rack.add(post);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 0.12), postM);
    cross.position.y = 1.32; rack.add(cross);
    const spearM = lam2({ color: "#8a6a44" });
    const steelM = lam2({ color: "#c9ced6" });
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 7), spearM);
      shaft.position.y = 1.15; sp.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 7), steelM);
      tip.position.y = 2.45; sp.add(tip);
      sp.position.set(-1.15 + i * 0.58, 0, 0.1);
      sp.rotation.z = 0.16; sp.rotation.x = -0.12;
      rack.add(sp);
    }
    rack.position.set(9.5, 0, 130); rack.rotation.y = -0.5;
    R.add(rack);
    const toolMat = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), lam2({ map: matTex(), color: "#d8a184" }));
    toolMat.rotation.x = -Math.PI / 2; toolMat.position.set(-9, 0.012, 127); toolMat.receiveShadow = true; R.add(toolMat);
    for (let i = 0; i < 3; i++) {
      const sp2 = makeSpikeProp(0.9);
      sp2.position.set(-9.7 + i * 0.7, 0.09, 127.4 - i * 0.35);
      sp2.rotation.y = 0.9 + i * 0.3;
      R.add(sp2);
    }
    // plain red war banners on poles flanking the field
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.6, 8), postM);
      pole.position.set(sx * 13, 2.8, 124); pole.castShadow = true; R.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.6),
        new THREE.MeshLambertMaterial({ color: "#a02318", side: THREE.DoubleSide }));
      cloth.geometry.translate(0, -1.3, 0);
      cloth.position.set(sx * 13, 5.55, 124); cloth.castShadow = true; R.add(cloth);
      this.pennants.push({ m: cloth, ph: sx * 2.2 });
    }
    // trees at the field's edges
    const greens: [string, string, string] = ["#8ab464", "#a2cc7c", "#74a452"];
    const spots: [number, number, number][] = [[-24, 108, 8], [23, 106, 7.5], [-20, 142, 9], [21, 144, 8], [-30, 124, 7]];
    spots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, i * 11 + 5);
      t.position.set(x, 0, z); R.add(t);
      this.trees.push({ g: t, ph: i * 1.31 + 4 });
      blob(R, x, 0.01, z, h * 0.9, h * 0.9, 0.5);
    });
    void r;
  }

  // ---------------- sunlit dust over the ground ----------------
  private buildDust(R: THREE.Group, r: () => number) {
    const N = 200;
    const pos = new Float32Array(N * 3);
    this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = -16 + r() * 32, y = 0.3 + r() * 6.5, z = -32 + r() * 30;
      pos.set([x, y, z], i * 3); this.dustBase.set([x, y, z], i * 3);
      this.dustPh.push(r() * 20);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      map: dustTex(), size: 0.13, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true,
    }));
    this.dust.layers.set(NOINK);
    R.add(this.dust);
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
    void U; void dt; void lin;
    // ---- STANDAR GERAK: everything that should move, moves ----
    this.clouds.forEach((c2, i) => {
      const b = this.cloudBase[i];
      if (b) c2.position.x = b.x + tt * b.sp;
      const m = c2.material as THREE.SpriteMaterial;
      m.color.set("#ffffff");
      m.opacity = 0.94;
    });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // the banner cloth breathes in the wind; pennants flutter
    this.banner.rotation.x = Math.sin(tt * 1.7) * 0.045;
    this.banner.rotation.y = Math.sin(tt * 1.1) * 0.03;
    for (const pn of this.pennants) {
      pn.m.rotation.x = Math.sin(tt * 6.5 + pn.ph) * 0.38;
      pn.m.rotation.z = Math.cos(tt * 5.2 + pn.ph * 1.3) * 0.16;
    }
    // ---------------- THE TORCH (shot 3 only) ----------------
    // the performer's brand tip in world space: his sprite
    // (scale 1.5) holds it at canvas (468, 240) — local
    // (+0.545 m, 2.38 m) — swung by the billboard's yaw
    const torchOn = id === 3;
    this.torchFlame.visible = torchOn;
    if (!torchOn) this.torchLight.intensity = 0;
    for (const sm of this.smokes) sm.sp.visible = torchOn;
    if (torchOn) {
      const yaw = Math.atan2(c.pos[0] - PERF[0], c.pos[2] - PERF[2]);
      const lx = 0.545, lz = 0.1;
      const wx = PERF[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw);
      const wz = PERF[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw);
      const flick = 0.9 + 0.18 * Math.sin(tt * 13.7) * Math.sin(tt * 7.9 + 1.3);
      this.torchFlame.position.set(wx, 2.52, wz);
      this.torchFlame.scale.set(0.62 * flick, 1.0 * (2 - flick), 1);
      (this.torchFlame.material as THREE.SpriteMaterial).opacity = 0.88 + 0.12 * Math.sin(tt * 11.3);
      this.torchLight.position.set(wx, 2.5, wz + 0.3);
      this.torchLight.intensity = 26 * (0.88 + 0.16 * Math.sin(tt * 12.3) * Math.sin(tt * 6.1 + 2));
      for (const sm of this.smokes) {
        const cyc = (tt * 0.14 + sm.off) % 1;
        sm.sp.position.set(wx + Math.sin(tt * 0.9 + sm.off * 9) * 0.22 * cyc + cyc * 0.35, 2.75 + cyc * 1.6, wz - cyc * 0.2);
        const sc2 = 0.35 + cyc * 0.85;
        sm.sp.scale.set(sc2, sc2, 1);
        (sm.sp.material as THREE.SpriteMaterial).opacity = 0.34 * (1 - cyc) * Math.min(1, cyc * 6);
      }
    }
    // dust motes drift over the ground, sinking slowly
    {
      const attr = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < this.dustPh.length; i++) {
        const ph = this.dustPh[i];
        arr[i * 3] = this.dustBase[i * 3] + Math.sin(tt * 0.3 + ph) * 0.45;
        arr[i * 3 + 1] = 0.3 + ((this.dustBase[i * 3 + 1] - 0.3 - tt * 0.06 - ph * 0.11) % 6.5 + 6.5) % 6.5;
        arr[i * 3 + 2] = this.dustBase[i * 3 + 2] + Math.cos(tt * 0.24 + ph * 1.7) * 0.4;
      }
      attr.needsUpdate = true;
      this.dust.visible = id !== 6; // arena shots only
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
