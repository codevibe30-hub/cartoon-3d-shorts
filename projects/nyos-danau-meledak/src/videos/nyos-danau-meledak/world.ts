// Lake Nyos, Cameroon as one three.js scene for the Fafnir-ID
// format: a crater lake cupped in green highland hills, its
// deep blue water hiding a silent load of magmatic CO2 — a
// valley village below the southern outlet, cattle on the
// pasture, and (today) the white fountains of the degassing
// pipes. VISUAL CORE: lush volcanic green, textured everything
// (anti-banding: speckled sky, flecked foliage, grainy thatch,
// scuffed earth). Layered light rig: sun/moon key w/ soft
// shadows + hemisphere fill + rim — the house style. The
// eruption shots play at readable moonlit night.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, LAKE_C, LAKE_Y, LAKE_RX, LAKE_RZ, GROUND_Y, FOUNTAIN, CRACK, BOTTLE, SLIDE_TOP, SLIDE_END, VILLAGE, PASTURE, RAFT_A, RAFT_B, clamp01 } from "./story";

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
const skyTexDay = () => ctex("nyosSkyDay", 2048, 1024, (g, r) => {
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
/** The night sky: deep indigo, a star field, the moon's halo. */
const skyTexNight = () => ctex("nyosSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060f2a"); grad.addColorStop(0.4, "#0d2148"); grad.addColorStop(0.72, "#1d3a68");
  grad.addColorStop(1, "#3d5a86");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 1500; i++) {
    const y = r() * 760;
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.65 * (1 - y / 900)})`;
    const s = r() > 0.92 ? 3 : 1.8;
    g.fillRect(r() * 2048, y, s, s);
  }
  // the moon: a bright disc with a soft halo, upper right
  const mn = g.createRadialGradient(1560, 190, 8, 1560, 190, 240);
  mn.addColorStop(0, "rgba(235,242,255,0.9)"); mn.addColorStop(0.12, "rgba(200,218,250,0.35)"); mn.addColorStop(1, "rgba(200,218,250,0)");
  g.fillStyle = mn; g.fillRect(1280, 0, 560, 480);
  g.fillStyle = "#eef3ff"; g.beginPath(); g.arc(1560, 190, 34, 0, 7); g.fill();
  g.fillStyle = "rgba(190,205,235,0.5)"; g.beginPath(); g.arc(1548, 178, 8, 0, 7); g.fill();
  g.beginPath(); g.arc(1572, 204, 6, 0, 7); g.fill();
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "6,12,30"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
});
/** soft radial glow sprite */
const glowTex = () => ctex("nyosGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("nyosBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture in lush highland greens */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#7d9a58"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(30,48,20,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(226,242,190,${0.12 + r() * 0.22})` : `rgba(24,44,18,${0.10 + r() * 0.18})`;
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
/** LUSH highland grassland: deep green body, meadow-light
 *  patches, thousands of grass blades, flecks of bare earth. */
const grassTex = () => ctex("nyosGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5d8140"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "46,74,30" : "140,172,92";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#3d5c26", "#527a32", "#6d9a48", "#8fb45e", "#486e2e"];
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
/** worn village earth: red-brown dirt, footpath scuffs, grit */
const dirtTex = () => ctex("nyosDirt", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8a6742"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 100; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "96,62,34" : "172,132,88";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.30 : 0.26})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "232,206,160" : "56,36,18"},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** thatch: vertical straw strokes over a deep golden body */
const thatchTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#a8874e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const x = r() * 512, y = r() * 512, l = 16 + r() * 30;
    g.strokeStyle = r() > 0.45 ? `rgba(226,198,128,${0.14 + r() * 0.2})` : `rgba(96,72,32,${0.14 + r() * 0.2})`;
    g.lineWidth = 1.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
  for (let y = 42; y < 512; y += 84) { g.fillStyle = "rgba(70,50,20,0.30)"; g.fillRect(0, y, 512, 5); }
});
/** mud-brick wall: warm earth courses with brick seams */
const mudTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#9a6c44"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 42) {
    g.fillStyle = "rgba(70,44,22,0.35)"; g.fillRect(0, y, 512, 3);
    for (let x = (y / 42) % 2 ? 30 : 0; x < 512; x += 84) g.fillRect(x, y, 3, 42);
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "226,190,140" : "60,38,20"},${0.05 + r() * 0.09})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
});
/** volcanic rock: dark grey-brown, pocked and cracked */
const rockTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#6e675c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "168,160,144" : "58,52,44"},${0.08 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 70, 14 + r() * 44, r() * 3, 0, 7); g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    let x = r() * 512, yy = r() * 512;
    g.strokeStyle = `rgba(30,26,20,${0.25 + r() * 0.2})`; g.lineWidth = 1.4 + r() * 1.4;
    g.beginPath(); g.moveTo(x, yy);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 30; yy += 16 + r() * 26; g.lineTo(x, yy); }
    g.stroke();
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "210,204,188" : "30,26,20"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** a palm frond: a rib with long leaflets, alpha-cut */
const frondTex = () => ctex("nyosFrond", 256, 128, (g, r) => {
  g.clearRect(0, 0, 256, 128);
  g.strokeStyle = "#3d6030"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(4, 64); g.quadraticCurveTo(128, 52, 252, 70); g.stroke();
  for (let i = 0; i < 26; i++) {
    const u = i / 25, x = 12 + u * 232, y = 64 - Math.sin(u * Math.PI) * 10 + u * 8;
    const l = 34 + Math.sin(u * Math.PI) * 26;
    g.strokeStyle = `rgba(${70 + r() * 30},${116 + r() * 30},48,0.95)`; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - l * 0.62); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + l * 0.58); g.stroke();
  }
});
const blobTex = () => ctex("nyosBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** white puff sprite for gas, spray and foam */
const puffTex = () => ctex("nyosPuff", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.45, "rgba(250,252,255,0.5)"); gr.addColorStop(1, "rgba(250,252,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A lush highland tree: a straight trunk and a ROUND canopy
 *  of layered foliage blobs (never a green ball). */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#6d5138", map: rep(rockTex("nyosBark" + seed), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, h * 0.32, 6), trunkM);
    br.position.set(Math.cos(a) * h * 0.1, h * 0.56, Math.sin(a) * h * 0.1);
    br.rotation.set(Math.sin(a) * 0.65, 0, Math.cos(a) * 0.65);
    g.add(br);
  }
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "nyosFoliageDeep"), folM(greens[0], "nyosFoliageMid"), folM(greens[1] ?? greens[0], "nyosFoliageLite")];
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

/** A palm: a trunk of stacked, slowly curving segments and a
 *  crown of drooping painted fronds. */
const makePalm = (h: number, lean: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const trunkM = lam2({ color: "#7d6a4e", map: rep(rockTex("nyosPalmTrunk" + seed), 1, 3) });
  let x = 0, y = 0;
  const segH = h / 6;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.008, 0.16 - i * 0.008, segH * 1.06, 7), trunkM);
    seg.position.set(x, y + segH / 2, 0);
    seg.rotation.z = lean * (i / 6) * 0.9;
    seg.castShadow = true; g.add(seg);
    x += Math.sin(lean * (i / 6) * 0.9) * segH * 0.9;
    y += Math.cos(lean * (i / 6) * 0.9) * segH * 0.96;
  }
  const frondM = new THREE.MeshLambertMaterial({ map: frondTex(), transparent: true, alphaTest: 0.42, side: THREE.DoubleSide, color: "#cfe0b0" });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + tr() * 0.5;
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), frondM);
    fr.position.set(x + Math.cos(a) * 0.95, y + 0.12 - (i % 3) * 0.07, Math.sin(a) * 0.95);
    fr.rotation.set(-0.5 - (i % 3) * 0.22, -a + Math.PI / 2, 0, "YXZ");
    fr.castShadow = true; g.add(fr);
  }
  return g;
};

/** A village house: mud-brick walls under a tall conical
 *  thatched roof, a dark door and one small window (its
 *  material is shared, so the whole village lights up at
 *  night together). */
const makeHouse = (winMat: THREE.MeshLambertMaterial, seed = 1) => {
  const g = new THREE.Group();
  const wallM = lam2({ color: "#c09a6c", map: rep(mudTex("nyosMud" + seed), 2, 1) });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.8), wallM);
  walls.position.y = 1.0; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ map: rep(thatchTex("nyosThatch" + seed), 2, 2), color: "#c8a86a" });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.6, 9), roofM);
  roof.position.y = 2.0 + 1.3; roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.4, 0.08), lam2({ color: "#2e2012" }));
  door.position.set(0.5, 0.72, 1.43); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), winMat);
  win.position.set(-0.95, 1.2, 1.43); g.add(win);
  return g;
};

/** One zebu cow: a humped body, a long face, lyre horns.
 *  Legs fold away and the body settles when it lies down. */
type CowRig = { g: THREE.Group; bodyG: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group; tail: THREE.Group; seed: number };
const makeCow = (hide: string, seed: number): CowRig => {
  const g = new THREE.Group();
  const hideM = lam2({ color: hide });
  const darkM = lam2({ color: "#3a2c1c" });
  const bodyG = new THREE.Group(); bodyG.position.y = 0.98; g.add(bodyG);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 9), hideM);
  torso.scale.set(0.52, 0.52, 1.02); torso.castShadow = true; bodyG.add(torso);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), hideM);
  hump.position.set(0, 0.3, -0.38); hump.scale.set(0.8, 0.75, 1); bodyG.add(hump);
  const head = new THREE.Group(); head.position.set(0, 0.12, -0.85); bodyG.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.62), hideM);
  skull.position.set(0, -0.14, -0.2); skull.rotation.x = 0.5; skull.castShadow = true; head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.2), darkM);
  muzzle.position.set(0, -0.36, -0.42); muzzle.rotation.x = 0.5; head.add(muzzle);
  for (const s of [1, -1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.42, 6), lam2({ color: "#d8cbb2" }));
    horn.position.set(s * 0.24, 0.22, 0.02); horn.rotation.z = s * -0.7; head.add(horn);
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.12), hideM);
    ear.position.set(s * 0.26, 0.05, 0.05); ear.rotation.z = s * 0.4; head.add(ear);
  }
  const legs: THREE.Mesh[] = [];
  for (const [lx, lz] of [[-0.22, -0.45], [0.22, -0.45], [-0.22, 0.48], [0.22, 0.48]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.72, 6), hideM);
    leg.position.set(lx, 0.36, lz); leg.castShadow = true; g.add(leg); legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.2, 0.72); g.add(tail);
  const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.014, 0.7, 5), hideM);
  tailMesh.position.y = -0.34; tail.add(tailMesh);
  const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), darkM);
  tuft.position.y = -0.74; tuft.rotation.x = Math.PI; tail.add(tuft);
  blob(g, 0, 0.03, 0, 1.5, 2.4, 0.3);
  return { g, bodyG, legs, head, tail, seed };
};

/** The giant soda bottle of shot 4: glass over cola-brown
 *  liquid, a red cap, a white label band. Bubbles live in
 *  world.ts (they animate). */
const makeBottle = () => {
  const g = new THREE.Group();
  const glassM = new THREE.MeshLambertMaterial({ color: "#cfeaf2", transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  const liquidM = lam2({ color: "#6e3f16" });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.84, 2.0, 14), liquidM);
  liquid.position.y = 1.06; g.add(liquid);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 2.2, 14), glassM);
  body.position.y = 1.14; body.castShadow = true; g.add(body);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.88, 0.55, 14), glassM);
  shoulder.position.y = 2.51; g.add(shoulder);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), glassM);
  neck.position.y = 2.95; g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12), lam2({ color: "#c22a20" }));
  cap.position.y = 3.2; cap.castShadow = true; g.add(cap);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.62, 14, 1, true),
    lam2({ color: "#f2ede2", side: THREE.DoubleSide }));
  label.position.y = 1.2; g.add(label);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.905, 0.905, 0.16, 14, 1, true),
    lam2({ color: "#c22a20", side: THREE.DoubleSide }));
  band.position.y = 1.2; g.add(band);
  blob(g, 0, 0.03, 0, 2.2, 2.2, 0.34);
  return g;
};

/** A degassing raft: a timber platform, a tall pipe, and a
 *  collar where the self-powered fountain bursts out. */
const makeRaft = () => {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 2.6), lam2({ color: "#7a5c38", map: rep(planks(), 2, 2) }));
  deck.position.y = 0.12; deck.castShadow = true; g.add(deck);
  for (const [bx, bz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]] as [number, number][]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 9), lam2({ color: "#2e6da8" }));
    barrel.position.set(bx, -0.1, bz); g.add(barrel);
  }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.8, 10), lam2({ color: "#d8dde2" }));
  pipe.position.y = 1.6; pipe.castShadow = true; g.add(pipe);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.3, 10), lam2({ color: "#8a929c" }));
  collar.position.y = 3.05; g.add(collar);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark
 *  root, vertex-coloured dark base -> bright tip. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#2c4418"), tip = new THREE.Color("#9cc46a"), tmp = new THREE.Color();
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

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c3d2e4", 18, 170);
  private skyDay: THREE.Mesh;
  private skyNight: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private lakeMap: THREE.Texture | null = null;
  private lakeMat!: THREE.MeshLambertMaterial;
  private winMat: THREE.MeshLambertMaterial;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private sunGlows: THREE.Sprite[] = [];
  private shoreFoam: THREE.Mesh | null = null;
  // ---- episode systems ----
  private crackBubbles: THREE.Mesh[] = [];
  private bottleBubbles: THREE.Mesh[] = [];
  private eruptSprites: THREE.Sprite[] = [];
  private eruptFoam: THREE.Mesh;
  private gasSprites: THREE.Sprite[] = [];
  private rocks: THREE.Mesh[] = [];
  private cows: CowRig[] = [];
  private rafts: { g: THREE.Group; spray: THREE.Sprite[]; ph: number }[] = [];
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1986);
    // ---- light rig: sun/moon key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#5d7a44", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky domes + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyNight = new THREE.Mesh(new THREE.SphereGeometry(675, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexNight(), side: THREE.BackSide, fog: false }));
    this.skyNight.layers.set(NOINK); R.add(this.skyNight);
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
    // shared window material (the village lights up together)
    this.winMat = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.15 });
    this.buildTerrain(R, r);
    this.buildVillage(R, r);
    // ---- the lake's hidden load: bubble streams off the crack ----
    const bubGeo = new THREE.SphereGeometry(1, 7, 6);
    const bubMat = new THREE.MeshLambertMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.65 });
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(bubGeo, bubMat);
      const s = 0.05 + (i % 5) * 0.022;
      b.scale.setScalar(s);
      R.add(b); this.crackBubbles.push(b);
    }
    // ---- the bottle's fizz ----
    const bbMat = new THREE.MeshLambertMaterial({ color: "#ffe9c4", transparent: true, opacity: 0.8 });
    for (let i = 0; i < 18; i++) {
      const b = new THREE.Mesh(bubGeo, bbMat);
      b.scale.setScalar(0.045 + (i % 4) * 0.02);
      R.add(b); this.bottleBubbles.push(b);
    }
    // ---- the eruption fountain + its foam collar ----
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.layers.set(NOINK); R.add(sp); this.eruptSprites.push(sp);
    }
    this.eruptFoam = new THREE.Mesh(new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }));
    this.eruptFoam.rotation.x = -Math.PI / 2;
    this.eruptFoam.renderOrder = 2;
    R.add(this.eruptFoam);
    // ---- the gas cloud bank ----
    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.layers.set(NOINK); R.add(sp); this.gasSprites.push(sp);
    }
    // ---- the landslide rocks ----
    const rockM = lam2({ map: rep(rockTex("nyosRock"), 1, 1), color: "#9a9284" });
    for (let i = 0; i < 7; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + (i % 3) * 0.35, 0), rockM);
      rock.castShadow = true;
      R.add(rock); this.rocks.push(rock);
    }
    // ---- the cattle ----
    const hides = ["#8a5a34", "#d8cfc0", "#5d4028", "#a87c4e", "#74604c"];
    const cowSpots: [number, number, number][] = [
      [PASTURE[0] - 3, PASTURE[2] - 2, 0.7], [PASTURE[0] + 2.5, PASTURE[2] + 1.5, -0.4],
      [PASTURE[0] + 6, PASTURE[2] - 1, 2.4], [PASTURE[0] - 6.5, PASTURE[2] + 3.5, 1.5],
      [PASTURE[0] + 9, PASTURE[2] + 4.5, -1.8],
    ];
    cowSpots.forEach(([x, z, yaw], i) => {
      const cow = makeCow(hides[i % hides.length], i * 7 + 3);
      cow.g.position.set(x, GROUND_Y, z);
      cow.g.rotation.y = yaw;
      R.add(cow.g); this.cows.push(cow);
    });
    // ---- the degassing rafts ----
    for (const [spot, ph] of [[RAFT_A, 0], [RAFT_B, 2.2]] as [V3, number][]) {
      const raft = makeRaft();
      raft.position.set(spot[0], LAKE_Y, spot[2]);
      R.add(raft);
      const spray: THREE.Sprite[] = [];
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }));
        sp.layers.set(NOINK); R.add(sp); spray.push(sp);
      }
      this.rafts.push({ g: raft, spray, ph });
    }
  }

  // ---------------- terrain: grassland, crater rim, the lake ----------------
  private buildTerrain(R: THREE.Group, r: () => number) {
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, 0.08, -10); land.receiveShadow = true; R.add(land);
    // the lake basin: dark wet rock under the water's edge
    const basin = new THREE.Mesh(new THREE.CircleGeometry(1, 40), lam2({ map: rep(rockTex("nyosBasin"), 8, 8), color: "#7d7468" }));
    basin.rotation.x = -Math.PI / 2;
    basin.scale.set(LAKE_RX + 3.5, LAKE_RZ + 3.5, 1);
    basin.position.set(LAKE_C[0], 0.14, LAKE_C[1]); basin.receiveShadow = true; R.add(basin);
    // the lake itself
    const lakeMap = rep(water(), 6, 4);
    this.lakeMap = lakeMap;
    this.lakeMat = lam2({ map: lakeMap, color: "#86c6dc" });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 44), this.lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(LAKE_RX, LAKE_RZ, 1);
    lake.position.set(LAKE_C[0], LAKE_Y, LAKE_C[1]); lake.receiveShadow = true; R.add(lake);
    // a breathing foam line where the water meets the shore
    const foam = new THREE.Mesh(new THREE.RingGeometry(0.965, 1.03, 44),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2;
    foam.scale.set(LAKE_RX, LAKE_RZ, 1);
    foam.position.set(LAKE_C[0], LAKE_Y + 0.02, LAKE_C[1]); foam.renderOrder = 1; R.add(foam);
    this.shoreFoam = foam;
    // ---- the crater rim: green hills ringing the lake, a gap to the south ----
    const hillM = lam2({ map: rep(grassTex(), 20, 10), color: "#9db87e" });
    const rimSpots: [number, number, number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (0.08 + (i / 11) * 0.84) + Math.PI; // the northern arc (through west & east)
      const rad = 56 + (i % 3) * 7;
      rimSpots.push([LAKE_C[0] + Math.cos(a) * rad * 1.18, LAKE_C[1] + Math.sin(a) * rad * 0.82, 30 + (i % 4) * 6, 11 + (i % 3) * 3.5]);
    }
    rimSpots.push([-58, -18, 34, 12], [58, -20, 36, 13], [-64, -64, 40, 15], [66, -70, 42, 14]);
    rimSpots.forEach(([x, z, w, h]) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), hillM);
      hill.scale.set(w, h, w * 0.5);
      hill.position.set(x, -h * 0.3, z);
      hill.receiveShadow = true;
      R.add(hill);
    });
    // distant blue mountains on the horizon
    const farM = lam2({ map: rep(grassTex(), 16, 8), color: "#7d94b8" });
    ([[-150, -190, 90, 26], [40, -210, 110, 30], [170, -160, 85, 22], [-190, -90, 80, 20]] as [number, number, number, number][]).forEach(([x, z, w, h]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), farM);
      m.scale.set(w, h, w * 0.45);
      m.position.set(x, -h * 0.3, z);
      R.add(m);
    });
    // ---- the two sister lakes, far behind the rim (shot 9) ----
    for (const [lx, lz, lr] of [[-27, -92, 9.5], [29, -96, 11]] as [number, number, number][]) {
      const w2 = new THREE.Mesh(new THREE.CircleGeometry(1, 28), lam2({ map: rep(water(), 3, 3), color: "#86c6dc" }));
      w2.rotation.x = -Math.PI / 2; w2.scale.set(lr, lr * 0.72, 1);
      w2.position.set(lx, LAKE_Y - 0.05, lz); R.add(w2);
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.15 + i * 0.35) + Math.PI;
        const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hillM);
        hill.scale.set(lr * 1.15, lr * 0.42, lr * 0.6);
        hill.position.set(lx + Math.cos(a) * lr * 1.25, -lr * 0.12, lz + Math.sin(a) * lr * 0.95);
        R.add(hill);
      }
    }
    // ---- the magma crack in the shallows: a glowing fissure ----
    const crack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.7),
      new THREE.MeshLambertMaterial({ color: "#ff7a2e", emissive: "#ff5a00", emissiveIntensity: 1.6 }));
    crack.position.set(CRACK[0], 0.30, CRACK[2]); crack.rotation.y = 0.5; R.add(crack);
    const crackRock = lam2({ map: rep(rockTex("nyosCrackRock"), 1, 1), color: "#8a8174" });
    for (const [ox, oz, s] of [[-1.9, 0.5, 0.8], [1.8, -0.6, 1.0], [0.4, 1.1, 0.6]] as [number, number, number][]) {
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), crackRock);
      rk.position.set(CRACK[0] + ox, 0.25, CRACK[2] + oz); rk.castShadow = true; R.add(rk);
    }
    // ---- the giant soda bottle on the south shore ----
    const bottle = makeBottle();
    bottle.position.set(BOTTLE[0], GROUND_Y, BOTTLE[2]);
    bottle.rotation.y = 0.4;
    R.add(bottle);
    // ---- shore boulders ----
    const bouldM = lam2({ map: rep(rockTex("nyosBoulder"), 1, 1), color: "#96907f" });
    ([[-30, -30, 1.3], [24, -24, 1.7], [-20, -70, 1.1], [33, -58, 1.5], [12, -27.5, 0.8], [-36, -46, 1.9]] as [number, number, number][]).forEach(([x, z, s], i) => {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), bouldM);
      b.position.set(x, s * 0.4, z); b.rotation.set(i * 1.3, i * 2.1, i * 0.7);
      b.castShadow = true; b.receiveShadow = true; R.add(b);
    });
    // ---- trees: lush rounds + palms around shore and slopes ----
    const greens = ["#6d9a48", "#86b45e", "#557c36"];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0.08, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.37 });
    };
    treeAt(-26, -16, 5.4, 3); treeAt(20, -14, 4.8, 5); treeAt(-38, -34, 6.0, 7);
    treeAt(40, -40, 5.2, 11); treeAt(-30, 8, 5.6, 13); treeAt(30, 4, 4.6, 17);
    treeAt(-14, 16, 5.0, 19); treeAt(38, 22, 5.8, 23); treeAt(-40, -66, 5.4, 29);
    treeAt(44, -72, 6.2, 31); treeAt(-27, -31, 4.4, 37); treeAt(24, -33, 4.2, 41);
    const palmAt = (x: number, z: number, h: number, lean: number, seed: number) => {
      const p = makePalm(h, lean, seed);
      p.position.set(x, 0.08, z);
      R.add(p);
      this.trees.push({ g: p, ph: seed * 0.83 });
    };
    palmAt(-18, -8, 6.4, 0.14, 43); palmAt(24, -8, 7.0, -0.1, 47); palmAt(-24, 22, 6.2, 0.08, 53);
    palmAt(28, 34, 6.8, -0.14, 59); palmAt(-20, -18, 6.0, 0.1, 61);
    // ---- grass tufts everywhere the meadow shows ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 650; i++) {
      const x = (r() - 0.5) * 190, z = 52 - r() * 190;
      const ex = (x - LAKE_C[0]) / (LAKE_RX + 2), ez = (z - LAKE_C[1]) / (LAKE_RZ + 2);
      if (ex * ex + ez * ez < 1) continue; // not in the lake
      if (Math.hypot(x - VILLAGE[0], z - VILLAGE[2]) < 13) continue; // not in the village clearing
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

  // ---------------- the village in its valley ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    const clearing = new THREE.Mesh(new THREE.CircleGeometry(17, 26), lam2({ map: rep(dirtTex(), 7, 7) }));
    clearing.rotation.x = -Math.PI / 2; clearing.position.set(VILLAGE[0], 0.09, VILLAGE[2]); clearing.receiveShadow = true; R.add(clearing);
    // the footpath from the shore down to the village
    const path = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 46), lam2({ map: rep(dirtTex(), 2, 12) }));
    path.rotation.x = -Math.PI / 2; path.rotation.z = 0.32;
    path.position.set(4, 0.095, 2); path.receiveShadow = true; R.add(path);
    const houseSpots: [number, number, number][] = [
      [8, 24, 0.4], [16, 21, -0.2], [24, 25, 0.9], [11, 33, -0.5],
      [21, 35, 0.2], [28, 31, -0.9], [16, 40, 0.6],
    ];
    houseSpots.forEach(([x, z, yaw], i) => {
      const h = makeHouse(this.winMat, i * 3 + 1);
      h.position.set(x, GROUND_Y, z);
      h.rotation.y = yaw;
      R.add(h);
      blob(R, x, 0.095, z, 4.6, 4.0, 0.26);
    });
    // pasture fence: posts + a rail along the pasture's south edge
    const postM = lam2({ color: "#6d4c2c", map: rep(planks(), 1, 1) });
    for (let x = 2; x <= 22; x += 3.3) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.05, 0.13), postM);
      post.position.set(x, 0.52, 15.5); post.castShadow = true; R.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(21, 0.08, 0.07), postM);
    rail.position.set(12, 0.85, 15.5); R.add(rail);
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
    const night = s.light === "night";
    this.skyDay.visible = !night;
    this.skyNight.visible = night;
    for (const gl of this.sunGlows) gl.visible = !night;
    for (const b2 of this.birds) b2.visible = !night;
    this.winMat.emissiveIntensity = night ? 1.3 : s.light === "golden" ? 0.55 : 0.15;
    this.lakeMat.color.set(id === 8 ? "#c97b3f" : "#86c6dc");
    this.lakeMat.emissive.set(id === 8 ? "#542a08" : "#000000");
    const S0 = s.a / FPS, SLEN = Math.max(0.01, (s.b - s.a) / FPS);
    const U = clamp01((t - S0) / SLEN); // shot-local progress
    // ---- STANDAR GERAK: everything that should move, moves ----
    if (this.lakeMap) this.lakeMap.offset.set(tt * 0.004, tt * 0.016);
    if (this.shoreFoam) (this.shoreFoam.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(tt * 0.8) * 0.09;
    this.clouds.forEach((c2, i) => {
      const b = this.cloudBase[i];
      if (b) c2.position.x = b.x + tt * b.sp;
      const m = c2.material as THREE.SpriteMaterial;
      m.color.set(night ? "#546a8f" : "#ffffff");
      m.opacity = night ? 0.5 : 0.94;
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
    // ---------------- the crack's bubble streams ----------------
    this.crackBubbles.forEach((b, i) => {
      const cyc = (tt * 0.24 + i * 0.618) % 1;
      const ang = i * 2.39, rad = 0.3 + (i % 5) * 0.35;
      b.position.set(
        CRACK[0] + Math.cos(ang) * rad + Math.sin(tt * 2.2 + i * 1.7) * 0.14,
        -0.45 + cyc * (LAKE_Y + 0.95),
        CRACK[2] + Math.sin(ang) * rad * 0.5 + Math.cos(tt * 1.9 + i) * 0.1);
      const sc2 = (0.05 + (i % 5) * 0.022) * (0.7 + cyc * 0.7) * 2.6;
      b.scale.setScalar(sc2);
    });
    // ---------------- the bottle's fizz ----------------
    this.bottleBubbles.forEach((b, i) => {
      const cyc = (tt * 0.32 + i * 0.55) % 1;
      const ang = i * 2.7, rad = 0.14 + (i % 4) * 0.13;
      b.position.set(BOTTLE[0] + Math.cos(ang) * rad, GROUND_Y + 0.25 + cyc * 1.75, BOTTLE[2] + Math.sin(ang) * rad);
    });
    // ---------------- the eruption ----------------
    const eruptI = id === 1 ? 1 : id === 5 ? clamp01((U - 0.5) / 0.4) * 0.85 : id === 6 ? 0.5 : 0;
    this.eruptSprites.forEach((sp, i) => {
      const m = sp.material as THREE.SpriteMaterial;
      if (eruptI <= 0.02) { m.opacity = 0; sp.visible = false; return; }
      sp.visible = true;
      const cyc = (tt * 0.5 + i * 0.618) % 1;
      const ang = i * 2.4, spread = cyc * 2.4 * eruptI;
      sp.position.set(
        FOUNTAIN[0] + Math.cos(ang) * spread,
        LAKE_Y + 0.4 + cyc * 12.5 * eruptI,
        FOUNTAIN[2] + Math.sin(ang) * spread * 0.7);
      const scp = (2.2 + cyc * 7.5) * (0.5 + eruptI * 0.6);
      sp.scale.set(scp, scp * 0.92, 1);
      m.opacity = 0.85 * (1 - cyc) * eruptI;
      m.color.set(night ? "#cdd9ec" : "#ffffff");
    });
    {
      const fm = this.eruptFoam.material as THREE.MeshBasicMaterial;
      const atSlide = id === 5;
      this.eruptFoam.position.set(atSlide ? SLIDE_END[0] : FOUNTAIN[0], LAKE_Y + 0.05, atSlide ? SLIDE_END[2] : FOUNTAIN[2]);
      const fs = eruptI > 0.02 ? (3.2 + Math.sin(tt * 5.2) * 0.5) * (0.4 + eruptI) : 0.001;
      this.eruptFoam.scale.set(fs, fs * 0.7, 1);
      fm.opacity = 0.55 * eruptI;
    }
    // ---------------- the gas cloud ----------------
    this.gasSprites.forEach((sp, i) => {
      const m = sp.material as THREE.SpriteMaterial;
      if (id === 1) {
        sp.visible = true;
        const ang = i * 2.4, rad = (2 + (i % 6) * 2.6) * (0.32 + U * 0.85);
        sp.position.set(FOUNTAIN[0] + Math.cos(ang) * rad, 2.2 + (i % 4) * 1.1 + U * 1.5, FOUNTAIN[2] + Math.sin(ang) * rad * 0.62 + U * 6);
        const scp = 7 + U * 16 + (i % 5) * 2;
        sp.scale.set(scp, scp * 0.52, 1);
        m.opacity = 0.30;
        m.color.set("#dbe6f5");
      } else if (id === 6) {
        sp.visible = true;
        const zi = -6 + i * 1.55 + ((f - s.a) / FPS) * 2.2;
        sp.position.set(7 + Math.sin(i * 2.7) * 7.5, 1.2 + (i % 4) * 0.8, zi);
        const scp = 10 + i * 0.8 + U * 4;
        sp.scale.set(scp, scp * 0.42, 1);
        m.opacity = 0.13 + (i % 4) * 0.035;
        m.color.set("#dbe6f5");
      } else {
        sp.visible = false; m.opacity = 0;
      }
    });
    // ---------------- the landslide ----------------
    this.rocks.forEach((rock, k) => {
      const ox = (k % 3 - 1) * 1.6, oz = (k % 2) * 2 - 1;
      if (id === 5) {
        const uk = clamp01((U - k * 0.06) / 0.52);
        const ex = SLIDE_TOP[0] + ox + (SLIDE_END[0] - SLIDE_TOP[0] - ox) * uk;
        const ez = SLIDE_TOP[2] + oz + (SLIDE_END[2] - SLIDE_TOP[2] - oz) * uk;
        const ey = uk >= 1 ? LAKE_Y - 0.15
          : (SLIDE_TOP[1] + (0.4 - SLIDE_TOP[1]) * uk) + Math.abs(Math.sin(uk * Math.PI * 3)) * 1.1 * (1 - uk);
        rock.position.set(ex, ey, ez);
        rock.rotation.set(uk * 7 + k, k * 1.7 + uk * 4, uk * 5);
      } else {
        rock.position.set(SLIDE_TOP[0] + ox, LAKE_Y - 3, SLIDE_TOP[2] + oz);
        rock.rotation.set(k * 1.3, k * 2.1, k * 0.7);
      }
    });
    // ---------------- the cattle ----------------
    for (const cow of this.cows) {
      const lying = id === 7;
      cow.bodyG.position.y = lying ? 0.52 : 0.98 + Math.sin(tt * 1.3 + cow.seed) * 0.012;
      cow.legs.forEach((leg) => {
        leg.scale.y = lying ? 0.26 : 1;
        leg.position.y = lying ? 0.1 : 0.36;
      });
      cow.head.rotation.x = lying ? 0.55 : Math.sin(tt * 0.6 + cow.seed * 1.9) * 0.16 + 0.06;
      cow.tail.rotation.z = Math.sin(tt * 2.2 + cow.seed * 2.7) * (lying ? 0.08 : 0.4);
    }
    // ---------------- the degassing rafts ----------------
    for (const raft of this.rafts) {
      raft.g.position.y = LAKE_Y + Math.sin(tt * 0.9 + raft.ph) * 0.05;
      raft.g.rotation.z = Math.sin(tt * 0.7 + raft.ph) * 0.02;
      raft.spray.forEach((sp, i) => {
        const cyc = (tt * 0.85 + i * 0.37 + raft.ph) % 1;
        sp.position.set(raft.g.position.x, LAKE_Y + 3.2 + cyc * 1.5, raft.g.position.z);
        const scp = 0.55 + cyc * 1.5;
        sp.scale.set(scp, scp * 1.15, 1);
        (sp.material as THREE.SpriteMaterial).opacity = 0.65 * (1 - cyc);
      });
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
