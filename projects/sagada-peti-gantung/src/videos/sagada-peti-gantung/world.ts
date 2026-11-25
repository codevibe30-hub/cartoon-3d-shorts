// Sagada, Philippines as one three.js scene for the Fafnir-ID
// format: a cool Cordillera pine valley under a sheer
// limestone cliff — Echo Valley — whose face carries dozens
// of hanging coffins, with the town, its little church and
// the rice terraces below, and the stacked coffins of
// Lumiang Cave to the east. VISUAL CORE: pale layered
// limestone, dark pine green, textured everything
// (anti-banding: speckled sky, flecked foliage, grainy
// thatch, scuffed earth). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, CLIFF_Z, CLIFF_TOP, GROUND_Y, HERO_SPOT, HOIST_X, HOIST_TOP, CARVE_SPOT, SMALL_SPOT, CHAIR_SPOT, CAVE, VILLAGE, clamp01, lin } from "./story";

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
const skyTexDay = () => ctex("sagadaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#c3d9ef"); grad.addColorStop(1, "#eef0da");
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
const glowTex = () => ctex("sagadaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("sagadaBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture in cool pine greens */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#4d6b3a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(18,34,14,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(206,232,170,${0.12 + r() * 0.22})` : `rgba(14,30,10,${0.10 + r() * 0.18})`;
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
/** COOL mountain grassland: deep green body, meadow-light
 *  patches, thousands of grass blades, flecks of bare earth. */
const grassTex = () => ctex("sagadaGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#55763c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "40,64,26" : "128,160,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#36521f", "#486e2c", "#639146", "#84a856", "#40622a"];
  g.lineCap = "round";
  for (let i = 0; i < 13000; i++) {
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
/** worn town earth: red-brown dirt, footpath scuffs, grit */
const dirtTex = () => ctex("sagadaDirt", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#84643f"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 100; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "92,60,32" : "168,128,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.30 : 0.26})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "232,206,160" : "56,36,18"},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** limestone: pale warm grey with strata bands, pockets and
 *  cracks — the Echo Valley wall rock */
const limeTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#b3a88f"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 46 + Math.floor(r() * 22)) {
    g.fillStyle = `rgba(90,78,58,${0.16 + r() * 0.12})`; g.fillRect(0, y, 512, 4 + r() * 5);
    g.fillStyle = `rgba(238,230,208,${0.10 + r() * 0.1})`; g.fillRect(0, y + 7, 512, 6);
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "196,186,160" : "104,94,74"},${0.08 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 16 + r() * 60, 10 + r() * 34, r() * 3, 0, 7); g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    let x = r() * 512, yy = r() * 512;
    g.strokeStyle = `rgba(52,44,32,${0.22 + r() * 0.2})`; g.lineWidth = 1.3 + r() * 1.3;
    g.beginPath(); g.moveTo(x, yy);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 26; yy += 14 + r() * 24; g.lineTo(x, yy); }
    g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "240,234,214" : "40,34,24"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** dark cave rock: charcoal-brown, heavily pocked */
const caveTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#5d564a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "140,130,112" : "30,26,20"},${0.10 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 54, 10 + r() * 30, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,192,170" : "16,13,10"},${0.05 + r() * 0.09})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** a coffin's long side: pine planks washed with a faded
 *  colour, iron bands, and — on the honoured ones — a lizard
 *  glyph for long life, painted white */
const coffinTex = (key: string, wash: string, lizard: boolean) => ctex(key, 512, 160, (g, r) => {
  g.fillStyle = "#9a7648"; g.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 2400; i++) {
    g.strokeStyle = `rgba(${r() > 0.45 ? "214,182,124" : "110,80,44"},${0.12 + r() * 0.16})`;
    g.lineWidth = 1.2 + r() * 1.2;
    const x = r() * 512, y = r() * 160;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 22 + r() * 40, y + (r() - 0.5) * 4); g.stroke();
  }
  if (wash !== "none") { g.fillStyle = wash; g.globalAlpha = 0.42; g.fillRect(0, 0, 512, 160); g.globalAlpha = 1; }
  for (const y of [10, 148]) { g.fillStyle = "rgba(52,36,18,0.55)"; g.fillRect(0, y, 512, 4); }
  for (const x of [26, 470]) { g.fillStyle = "#3c3f45"; g.fillRect(x, 0, 12, 160); g.fillStyle = "rgba(230,235,240,0.5)"; g.fillRect(x, 0, 3, 160); }
  if (lizard) {
    g.strokeStyle = "rgba(246,242,230,0.92)"; g.lineWidth = 7; g.lineCap = "round";
    g.beginPath(); g.moveTo(196, 84);
    g.quadraticCurveTo(250, 58, 306, 80); g.quadraticCurveTo(330, 88, 322, 66); g.stroke();
    for (const [lx, ly, dx, dy] of [[222, 76, -16, 20], [238, 70, -6, 24], [282, 72, 8, 22], [298, 78, 18, 16]] as [number, number, number, number][]) {
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + dx, ly + dy); g.stroke();
    }
    g.fillStyle = "rgba(246,242,230,0.92)"; g.beginPath(); g.arc(322, 64, 7, 0, 7); g.fill();
  }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(40,26,12,${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 160, 2.4, 2.4); }
});
const blobTex = () => ctex("sagadaBlob", 256, 256, (g) => {
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

/** A Cordillera pine: a tall straight trunk and a canopy of
 *  layered dark-green blobs in tiers (never a green ball). */
const makePine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#6d5138", map: rep(caveTex("sagadaBark" + seed), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, h * 0.62, 8), trunkM);
  trunk.position.y = h * 0.31; trunk.rotation.z = (tr() - 0.5) * 0.06; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM("#476b32", "sagadaFoliageDeep"), folM("#5d8140", "sagadaFoliageMid"), folM("#77994f", "sagadaFoliageLite")];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const u = i / (tiers - 1);
    const cy = h * (0.52 + u * 0.42), cr = h * 0.30 * (1 - u * 0.55);
    const b = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 9), mats[i % 3]);
    b.position.set((tr() - 0.5) * 0.3, cy, (tr() - 0.5) * 0.3);
    b.scale.set(1.15, 0.42, 1.15);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(cr * 0.62, 10, 8), mats[(i + 1) % 3]);
    b2.position.set((tr() - 0.5) * cr, cy + cr * 0.22, (tr() - 0.5) * cr);
    b2.scale.set(1.1, 0.45, 1.1);
    b2.castShadow = true; g.add(b2);
  }
  return g;
};

/** A round highland tree for the town's shade. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#6d5138", map: rep(caveTex("sagadaBarkT" + seed), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "sagadaFoliageDeep"), folM(greens[0], "sagadaFoliageMid"), folM(greens[1] ?? greens[0], "sagadaFoliageLite")];
  const cy = h * 0.78, cr = h * 0.4;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  blobAt(0, cy, 0, cr * 0.95, 1);
  for (let i = 0; i < 5; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.5 + tr() * 0.5);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.5) * cr * 0.3, Math.sin(a) * d, cr * (0.45 + tr() * 0.22), i % 2 ? 0 : 2);
  }
  return g;
};

const COFFIN_WASHES: [string, string][] = [
  ["none", "#a8845a"], ["#a03a2c", "#9c6a44"], ["#2e5f8a", "#8a6a48"], ["#e8e2d2", "#a08a64"], ["#3f7a4a", "#96754a"],
];
/** One hanging coffin: a plank body + a heavier lid, its long
 *  side painted by coffinTex (wash + optional lizard). Length
 *  varies — the old fetal coffins are barely a metre. */
const makeCoffin = (len: number, variant: number, lizard = false) => {
  const g = new THREE.Group();
  const [wash, plain] = COFFIN_WASHES[variant % COFFIN_WASHES.length];
  const sideM = lam2({ map: coffinTex(`sagadaCoffin${variant}${lizard ? "L" : ""}`, wash, lizard) });
  const endM = lam2({ color: plain, map: rep(planks(), 1, 1) });
  const lidM = lam2({ color: plain, map: rep(planks(), 2, 1) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.52, 0.55), [endM, endM, lidM, endM, sideM, sideM]);
  body.castShadow = true; g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(len * 1.03, 0.17, 0.62), lidM);
  lid.position.y = 0.34; lid.castShadow = true; g.add(lid);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.1, 0.5), endM);
  foot.position.y = -0.3; g.add(foot);
  return g;
};

/** The sangadil death chair: a pine seat with a tall back,
 *  hung beside its coffin. */
const makeChair = () => {
  const g = new THREE.Group();
  const woodM = lam2({ color: "#8a6a42", map: rep(planks(), 1, 1) });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.55), woodM);
  seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.06), woodM);
  back.position.set(0, 0.5, -0.26); back.castShadow = true; g.add(back);
  for (const [lx, lz] of [[-0.26, 0.22], [0.26, 0.22], [-0.26, -0.22], [0.26, -0.22]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.5, 6), woodM);
    leg.position.set(lx, -0.27, lz); g.add(leg);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), woodM);
  rail.rotation.z = Math.PI / 2; rail.position.set(0, 0.92, -0.26); g.add(rail);
  return g;
};

/** A town house: wooden plank walls under a pitched tin roof,
 *  a dark door and one small window (shared material, so the
 *  whole town lights up together at dusk). */
const makeHouse = (winMat: THREE.MeshLambertMaterial, seed = 1) => {
  const g = new THREE.Group();
  const wallM = lam2({ color: "#b08a5c", map: rep(planks(), 2, 1) });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.8), wallM);
  walls.position.y = 1.0; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ color: seed % 2 ? "#9aa2a8" : "#a8542e", map: rep(planks(), 3, 1) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.5, 4), roofM);
  roof.position.y = 2.75; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.95); roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.4, 0.08), lam2({ color: "#2e2012" }));
  door.position.set(0.5, 0.72, 1.43); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), winMat);
  win.position.set(-0.95, 1.2, 1.43); g.add(win);
  return g;
};

/** St. Mary's little church: white walls, a steep roof and a
 *  bell tower with a cross, on its rise above the valley. */
const makeChurch = (winMat: THREE.MeshLambertMaterial) => {
  const g = new THREE.Group();
  const wallM = lam2({ color: "#e9e2d2", map: rep(limeTex("sagadaChurchWall"), 2, 1) });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 7.2), wallM);
  nave.position.y = 1.5; nave.castShadow = true; nave.receiveShadow = true; g.add(nave);
  const roofM = lam2({ color: "#7a4a3a", map: rep(planks(), 3, 2) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.2, 4), roofM);
  roof.position.y = 4.1; roof.rotation.y = Math.PI / 4; roof.scale.set(0.82, 1, 1.28); roof.castShadow = true; g.add(roof);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 5.6, 1.7), wallM);
  tower.position.set(0, 2.8, 4.2); tower.castShadow = true; g.add(tower);
  const belfry = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 4), roofM);
  belfry.position.set(0, 6.4, 4.2); belfry.rotation.y = Math.PI / 4; g.add(belfry);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 8), lam2({ color: "#8a6f2e" }));
  bell.position.set(0, 5.35, 4.2); g.add(bell);
  const crossM = lam2({ color: "#f4efe2" });
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), crossM);
  cv.position.set(0, 7.6, 4.2); g.add(cv);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.09), crossM);
  ch.position.set(0, 7.68, 4.2); g.add(ch);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.08), winMat);
  win.position.set(0, 1.9, 3.66); g.add(win);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.08), lam2({ color: "#3a2a18" }));
  door.position.set(0, 1.0, 5.11); g.add(door);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark
 *  root, vertex-coloured dark base -> bright tip. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#263d16"), tip = new THREE.Color("#93b862"), tmp = new THREE.Color();
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

/** Stretch a unit cylinder between two points (ropes, beams). */
const setBeam = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length() || 0.001;
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
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
  private winMat: THREE.MeshLambertMaterial;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private sunGlows: THREE.Sprite[] = [];
  // ---- episode systems ----
  private hangCoffins: { g: THREE.Group; ph: number }[] = [];
  private hoist!: { g: THREE.Group; coffin: THREE.Group; ropeL: THREE.Mesh; ropeR: THREE.Mesh };
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2010);
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
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow); this.sunGlows.push(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core); this.sunGlows.push(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    // shared window material (the town lights up together)
    this.winMat = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.15 });
    this.buildTerrain(R, r);
    this.buildCliff(R, r);
    this.buildVillage(R, r);
    this.buildCave(R, r);
    this.buildYard(R, r);
  }

  // ---------------- terrain: valley floor, terraces, pines ----------------
  private buildTerrain(R: THREE.Group, r: () => number) {
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, 0.08, -10); land.receiveShadow = true; R.add(land);
    // distant blue-green ranges on the horizon
    const farM = lam2({ map: rep(grassTex(), 16, 8), color: "#7d94b8" });
    ([[-170, -180, 100, 30], [60, -200, 120, 34], [190, -140, 90, 24], [-200, -60, 85, 22], [210, 40, 95, 26]] as [number, number, number, number][]).forEach(([x, z, w, h]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), farM);
      m.scale.set(w, h, w * 0.45);
      m.position.set(x, -h * 0.3, z);
      R.add(m);
    });
    // ---- the rice terraces stepping down the western slope ----
    const terrM = lam2({ map: rep(grassTex(), 10, 2), color: "#a8c686" });
    const terrEdge = lam2({ map: rep(dirtTex(), 10, 1), color: "#9a7a52" });
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(30, 0.85, 3.6), i % 2 ? terrM : terrEdge);
      step.position.set(-66, 4.4 - i * 0.8, 4 + i * 3.8);
      step.rotation.y = 0.35;
      step.receiveShadow = true;
      R.add(step);
    }
    // ---- pines: rim top, valley scatter, cave grove ----
    const pineAt = (x: number, y: number, z: number, h: number, seed: number) => {
      const t = makePine(h, seed);
      t.position.set(x, y, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.37 });
    };
    for (let i = 0; i < 11; i++) pineAt(-72 + i * 14.5, CLIFF_TOP + 0.8, CLIFF_Z - 8 - (i % 3) * 3, 7 + (i % 4), 100 + i * 7);
    pineAt(-30, 0.08, -18, 8.5, 3); pineAt(26, 0.08, -20, 9.2, 5); pineAt(-44, 0.08, -6, 7.6, 7);
    pineAt(52, 0.08, -26, 8.8, 11); pineAt(-58, 0.08, 14, 9.4, 13); pineAt(58, 0.08, 6, 7.8, 17);
    pineAt(-20, 0.08, 26, 8.2, 19); pineAt(44, 0.08, 20, 9.0, 23); pineAt(64, 0.08, -14, 8.4, 29);
    pineAt(-38, 0.08, -24, 7.4, 31); pineAt(12, 0.08, -24, 7.9, 37);
    const greens = ["#5d8140", "#77994f", "#476b32"];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0.08, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 0.83 });
    };
    treeAt(8, 26, 5.2, 41); treeAt(30, 24, 5.8, 43); treeAt(-24, 34, 5.4, 47); treeAt(38, 38, 5.0, 53);
    // ---- grass tufts everywhere the meadow shows ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 650; i++) {
      const x = (r() - 0.5) * 190, z = 56 - r() * 190;
      if (z < CLIFF_Z + 9) continue; // not on the talus / cliff
      if (Math.hypot(x - VILLAGE[0], z - VILLAGE[2]) < 14) continue; // not in the town clearing
      if (Math.hypot(x - CAVE[0], z - CAVE[2]) < 10) continue; // not in the cave clearing
      tuftPts.push({ x, z, s: 0.6 + r() * 0.9 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.08, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.4, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    void r;
  }

  // ---------------- the cliff + its coffins + the hoist ----------------
  private buildCliff(R: THREE.Group, r: () => number) {
    // the wall: overlapping limestone slabs, strata-textured
    const limeM = [lam2({ map: rep(limeTex("sagadaLimeA"), 3, 3), color: "#e8dec6" }),
                   lam2({ map: rep(limeTex("sagadaLimeB"), 3, 3), color: "#ddd0b0" })];
    for (let i = 0; i < 12; i++) {
      const x = -76 + i * 13.8, h = CLIFF_TOP + 3 + (i % 3) * 1.6;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(15.5, h, 11), limeM[i % 2]);
      seg.position.set(x, h / 2 - 2.5, CLIFF_Z - 5.2 + (i % 2) * 0.7);
      seg.rotation.y = ((i * 37) % 5 - 2) * 0.012;
      seg.receiveShadow = true; seg.castShadow = true;
      R.add(seg);
    }
    // the top plateau the pines stand on
    const top = new THREE.Mesh(new THREE.BoxGeometry(190, 3, 30), lam2({ map: rep(grassTex(), 40, 6), color: "#8fae6d" }));
    top.position.set(0, CLIFF_TOP + 0.6, CLIFF_Z - 17); top.receiveShadow = true; R.add(top);
    // the talus slope at the foot
    const talus = new THREE.Mesh(new THREE.PlaneGeometry(185, 10.5), lam2({ map: rep(caveTex("sagadaTalus"), 24, 2), color: "#a3967c" }));
    talus.rotation.x = -Math.PI / 2 + 0.42;
    talus.position.set(0, 1.55, CLIFF_Z + 4.6); talus.receiveShadow = true; R.add(talus);
    // boulders where the wall meets the grass
    const bouldM = lam2({ map: rep(caveTex("sagadaBoulder"), 1, 1), color: "#96907f" });
    ([[-34, -27, 1.4], [22, -26.5, 1.8], [-18, -28, 1.0], [48, -27.5, 1.5], [-56, -26, 1.9], [12, -28.5, 0.8]] as [number, number, number][]).forEach(([x, z, s], i) => {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), bouldM);
      b.position.set(x, s * 0.35, z); b.rotation.set(i * 1.3, i * 2.1, i * 0.7);
      b.castShadow = true; b.receiveShadow = true; R.add(b);
    });
    // ---- the coffins on the face ----
    // [x, y, len, variant, lizard?] — rows across the whole
    // wall; the hoist lane (x ≈ HOIST_X) stays clear below 17,
    // and the chair close-up spot (x 5..10, y 10..13) stays clear.
    const spots: [number, number, number, number, number?][] = [
      [-52, 14, 1.6, 0], [-49, 16, 1.3, 1], [-50.5, 11, 1.9, 2], [-44, 18.5, 1.4, 3],
      [-41, 13, 1.7, 4], [-38, 20.5, 1.2, 0, 1], [-33, 10, 1.8, 1], [-30, 16.5, 1.5, 2],
      [-27, 21.5, 1.3, 3], [-22, 12, 1.9, 4], [-19, 18, 1.4, 0], [-15, 9, 1.6, 1],
      [-12, 19.5, 1.35, 2], [-8, 13.5, 1.7, 3], [-6.5, 21.5, 1.25, 4],
      [0.5, 20.5, 1.5, 0], [3, 15.5, 1.8, 1],
      [11.5, 18.5, 1.4, 2], [14.5, 13, 1.6, 3], [17.5, 21, 1.3, 4], [21, 10, 1.85, 0],
      [24.5, 16.5, 1.45, 1, 1], [28, 13.5, 1.6, 2], [31.5, 19.5, 1.35, 3], [36, 11, 1.7, 4],
      [42, 15.5, 1.5, 0], [47, 9.5, 1.8, 1], [52, 17.5, 1.4, 2], [57, 12.5, 1.6, 3], [61, 20.5, 1.3, 4],
      // the dense cover band around the hoist lane — the wall
      // the opening frame stares at (lane x -5..-1 stays clear
      // below y 17; the chair spot stays clear)
      [-13, 11, 1.7, 2], [-10, 16.5, 1.4, 3], [-9, 8.5, 1.55, 4], [-7, 18.5, 1.3, 0, 1],
      [-16, 14, 1.5, 1], [-4, 22.5, 1.2, 2], [-1.5, 19, 1.6, 3], [1.5, 12, 1.45, 4],
      [2, 8, 1.65, 0], [4.5, 21.5, 1.35, 1], [6, 16, 1.7, 2], [-18.5, 20, 1.4, 3],
    ];
    const beamM = lam2({ color: "#6d4c2c", map: rep(planks(), 1, 1) });
    const ropeM = new THREE.MeshBasicMaterial({ color: "#4a3826" });
    spots.forEach(([x, y, len, variant, liz], i) => {
      // support beams driven into the wall under the coffin
      for (const bx of [x - len * 0.32, x + len * 0.32]) {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 6), beamM);
        beam.rotation.x = Math.PI / 2;
        beam.position.set(bx, y - 0.42, CLIFF_Z + 0.35);
        R.add(beam);
      }
      // the sway group pivots at the hang point above
      const g = new THREE.Group();
      g.position.set(x, y + 1.9, CLIFF_Z + 0.62);
      const coffin = makeCoffin(len, variant, !!liz);
      coffin.position.set(0, -1.9, 0.12);
      g.add(coffin);
      for (const rx of [-len * 0.36, len * 0.36]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.95, 5), ropeM);
        rope.position.set(rx, -0.95, 0.05);
        rope.rotation.z = rx > 0 ? 0.1 : -0.1;
        g.add(rope);
      }
      R.add(g);
      this.hangCoffins.push({ g, ph: i * 1.71 });
    });
    // ---- the chair close-up pair (shot 7) ----
    {
      const g = new THREE.Group();
      g.position.set(6.2, CHAIR_SPOT[1] + 1.9, CLIFF_Z + 0.62);
      const coffin = makeCoffin(1.9, 1, true);
      coffin.position.set(0, -1.9, 0.12);
      g.add(coffin);
      for (const rx of [-0.68, 0.68]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.95, 5), ropeM);
        rope.position.set(rx, -0.95, 0.05);
        g.add(rope);
      }
      R.add(g);
      this.hangCoffins.push({ g, ph: 3.3 });
      const chair = makeChair();
      chair.position.set(8.7, CHAIR_SPOT[1] - 0.4, CLIFF_Z + 0.85);
      chair.rotation.y = 0.15;
      R.add(chair);
      for (const rx of [8.35, 9.05]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3, 5), ropeM);
        rope.position.set(rx, CHAIR_SPOT[1] + 0.75, CLIFF_Z + 0.7);
        R.add(rope);
      }
    }
    // ---- the little coffin on the grass (shot 6) ----
    const small = makeCoffin(1.05, 0, false);
    small.position.set(SMALL_SPOT[0], 0.48, SMALL_SPOT[2]);
    small.rotation.y = 0.5;
    R.add(small);
    blob(R, SMALL_SPOT[0], 0.1, SMALL_SPOT[2], 1.7, 1.1, 0.3);
    // ---- the hoist: a beam gantry at the lane top + the
    // travelling coffin on its ropes ----
    const gantry = new THREE.Group();
    const postM = lam2({ color: "#6d4c2c", map: rep(planks(), 1, 1) });
    for (const px of [HOIST_X - 1.7, HOIST_X + 1.7]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 7), postM);
      post.position.set(px, 17.6, CLIFF_Z + 1.5); post.castShadow = true; gantry.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 7), postM);
    bar.rotation.z = Math.PI / 2; bar.position.set(HOIST_X, 18.9, CLIFF_Z + 1.5); bar.castShadow = true; gantry.add(bar);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 2.2), postM);
    deck.position.set(HOIST_X, 16.35, CLIFF_Z + 1.4); deck.castShadow = true; gantry.add(deck);
    R.add(gantry);
    const hg = new THREE.Group();
    hg.position.set(HOIST_X, 18.75, CLIFF_Z + 1.5);
    const hcoffin = makeCoffin(1.8, 2, false);
    hg.add(hcoffin);
    const ropeGeo = new THREE.CylinderGeometry(0.024, 0.024, 1, 5);
    const ropeL = new THREE.Mesh(ropeGeo, ropeM);
    const ropeR = new THREE.Mesh(ropeGeo, ropeM);
    hg.add(ropeL, ropeR);
    R.add(hg);
    this.hoist = { g: hg, coffin: hcoffin, ropeL, ropeR };
    void r;
  }

  // ---------------- the town in its valley ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    const clearing = new THREE.Mesh(new THREE.CircleGeometry(17, 26), lam2({ map: rep(dirtTex(), 7, 7) }));
    clearing.rotation.x = -Math.PI / 2; clearing.position.set(VILLAGE[0], 0.09, VILLAGE[2]); clearing.receiveShadow = true; R.add(clearing);
    // the footpath from the cliff down to the town
    const path = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 52), lam2({ map: rep(dirtTex(), 2, 13) }));
    path.rotation.x = -Math.PI / 2; path.rotation.z = -0.42;
    path.position.set(2, 0.095, 4); path.receiveShadow = true; R.add(path);
    const houseSpots: [number, number, number][] = [
      [10, 26, 0.4], [18, 23, -0.2], [26, 27, 0.9], [13, 35, -0.5],
      [23, 37, 0.2], [30, 33, -0.9], [18, 42, 0.6],
    ];
    houseSpots.forEach(([x, z, yaw], i) => {
      const h = makeHouse(this.winMat, i * 3 + 1);
      h.position.set(x, GROUND_Y, z);
      h.rotation.y = yaw;
      R.add(h);
      blob(R, x, 0.095, z, 4.6, 4.0, 0.26);
    });
    // the church on its rise, west of the houses
    const church = makeChurch(this.winMat);
    church.position.set(-2, GROUND_Y, 40);
    church.rotation.y = -0.5;
    R.add(church);
    blob(R, -2, 0.095, 40, 6.4, 8.6, 0.24);
    void r;
  }

  // ---------------- Lumiang cave: the stacked coffins ----------------
  private buildCave(R: THREE.Group, r: () => number) {
    const g = new THREE.Group();
    g.position.set(CAVE[0], 0, CAVE[2]);
    g.rotation.y = -0.62; // the mouth faces south-west, toward the path
    const rockM = lam2({ map: rep(caveTex("sagadaCaveRock"), 2, 2), color: "#8d8474" });
    // the rock mass around a dark mouth
    const back = new THREE.Mesh(new THREE.BoxGeometry(11, 8.5, 3), rockM);
    back.position.set(0, 4.2, -2.6); back.castShadow = true; back.receiveShadow = true; g.add(back);
    for (const px of [-4.6, 4.6]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7.6, 3.4), rockM);
      pillar.position.set(px, 3.8, -0.6); pillar.rotation.y = px > 0 ? -0.14 : 0.14;
      pillar.castShadow = true; g.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 3.6), rockM);
    lintel.position.set(0, 8.2, -0.6); lintel.castShadow = true; g.add(lintel);
    // the dark inside
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 6.4),
      new THREE.MeshBasicMaterial({ color: "#0a0806" }));
    dark.position.set(0, 3.1, -1.05); g.add(dark);
    // the stacks: three piles of old coffins in the mouth
    const stackAt = (sx: number, n: number, seed: number) => {
      let y = 0.35;
      for (let i = 0; i < n; i++) {
        const c = makeCoffin(1.5 + ((seed + i) % 3) * 0.22, (seed + i) % 5, i === n - 1 && seed % 2 === 0);
        c.position.set(sx + ((i * 37) % 3 - 1) * 0.07, y, 0.15 + (i % 2) * 0.1);
        c.rotation.y = ((i * 53) % 5 - 2) * 0.05;
        c.rotation.z = ((i * 29) % 3 - 1) * 0.02;
        g.add(c);
        y += 0.72;
      }
    };
    stackAt(-2.2, 5, 3); stackAt(0.1, 4, 7); stackAt(2.3, 3, 11);
    // fallen rocks at the mouth
    for (const [bx, bz, s] of [[-4.2, 2.2, 0.9], [4.4, 1.8, 1.2], [3.1, 3.1, 0.6]] as [number, number, number][]) {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      b.position.set(bx, s * 0.4, bz); b.rotation.set(bx, bz * 2, bx * 0.7);
      b.castShadow = true; g.add(b);
    }
    R.add(g);
    blob(R, CAVE[0] - 1, 0.1, CAVE[2] + 3.4, 10, 5, 0.3);
    void r;
  }

  // ---------------- the carving yard (shot 4) ----------------
  private buildYard(R: THREE.Group, r: () => number) {
    const g = new THREE.Group();
    g.position.set(CARVE_SPOT[0], GROUND_Y, CARVE_SPOT[2]);
    g.rotation.y = -0.4;
    // the pine log on its stump trestles, half hollowed
    const logM = lam2({ color: "#a8845a", map: rep(planks(), 3, 1) });
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12), logM);
    log.rotation.z = Math.PI / 2; log.position.set(0, 0.78, 0); log.castShadow = true; g.add(log);
    const hollow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.55),
      new THREE.MeshBasicMaterial({ color: "#241608" }));
    hollow.position.set(-0.2, 1.06, 0); g.add(hollow);
    for (const sx of [-1.3, 1.3]) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.55, 9), lam2({ color: "#7a5c38", map: rep(caveTex("sagadaStump"), 1, 1) }));
      stump.position.set(sx, 0.27, 0); stump.castShadow = true; g.add(stump);
    }
    // a finished coffin leaning by the log + wood chips
    const done = makeCoffin(1.7, 3, false);
    done.position.set(2.6, 0.5, -0.7); done.rotation.set(0, 0.5, 0.1);
    g.add(done);
    const chipM = lam2({ color: "#d8b878" });
    for (let i = 0; i < 14; i++) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.16 + (i % 3) * 0.06, 0.03, 0.07), chipM);
      chip.position.set(-1.4 + (i * 0.77) % 3.2, 0.03, 0.8 + (i % 4) * 0.3);
      chip.rotation.y = i * 1.3;
      g.add(chip);
    }
    R.add(g);
    blob(R, CARVE_SPOT[0], 0.1, CARVE_SPOT[2], 6.4, 4.4, 0.28);
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
    this.winMat.emissiveIntensity = s.light === "golden" ? 0.55 : 0.15;
    const S0 = s.a / FPS, SLEN = Math.max(0.01, (s.b - s.a) / FPS);
    const U = clamp01((t - S0) / SLEN); // shot-local progress
    // ---- STANDAR GERAK: everything that should move, moves ----
    this.clouds.forEach((c2, i) => {
      const b = this.cloudBase[i];
      if (b) c2.position.x = b.x + tt * b.sp;
      const m = c2.material as THREE.SpriteMaterial;
      m.color.set("#ffffff");
      m.opacity = 0.94;
    });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.08, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---------------- the coffins sway on their ropes ----------------
    for (const hc of this.hangCoffins) {
      hc.g.rotation.z = Math.sin(tt * 0.85 + hc.ph) * 0.02;
      hc.g.rotation.x = Math.cos(tt * 0.6 + hc.ph * 1.3) * 0.008;
    }
    // ---------------- the hoist ----------------
    {
      let ropeLen = 1.9, moving = false;
      if (id === 1) { ropeLen = 10.9 - 3.2 * U; moving = true; }
      else if (id === 5) { ropeLen = 8.9 + (1.9 - 8.9) * (U < 0.85 ? (1 - Math.cos(Math.min(1, U / 0.85) * Math.PI)) / 2 : 1); moving = U < 0.9; }
      const amp = moving ? 0.05 : 0.018;
      this.hoist.g.rotation.z = Math.sin(tt * 1.3) * amp;
      this.hoist.g.rotation.x = Math.cos(tt * 0.9) * amp * 0.4;
      this.hoist.coffin.position.set(0, -ropeLen - 0.35, 0);
      this.hoist.coffin.rotation.y = Math.sin(tt * 0.7) * 0.05;
      setBeam(this.hoist.ropeL, new THREE.Vector3(-0.55, 0, 0), new THREE.Vector3(-0.4, -ropeLen, 0));
      setBeam(this.hoist.ropeR, new THREE.Vector3(0.55, 0, 0), new THREE.Vector3(0.4, -ropeLen, 0));
    }
    void dt;
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
