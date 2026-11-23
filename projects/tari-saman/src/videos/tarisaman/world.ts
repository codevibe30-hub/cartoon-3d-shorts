// The Tari Saman world as one three.js scene for the Fafnir-ID
// short: a giant woven mat on a Gayo highland field, covered in
// rows of seated dancers; a grandstand closing the field behind
// them (Stadion Seribu Bukit, 2017), a tall-roofed adat house in
// the side clearing, flag poles along the mat, and the layered
// Bukit Barisan ridges closing the horizon. VISUAL CORE: bright
// highland daylight, saturated greens, colourful kerawang
// costumes on a pandan-woven mat — textured everything (anti-
// banding: speckled sky, flecked grass, woven mat). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim —
// the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, clamp01 } from "./story";

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
const skyTexDay = () => ctex("samanSkyDay2", 2048, 1024, (g, r) => {
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
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("samanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("samanBirds", 256, 96, (g, r) => {
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
/** RICH grass (anti-flat): deep base, organic value blotches,
 *  thousands of individual blades in five greens with hard value
 *  contrast, tuft glyphs and soil flecks — never a neon sheet. */
const grassRichTex = () => ctex("samanGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c8433"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "38,84,26" : "126,186,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(196,240,150,${0.10 + r() * 0.20})` : `rgba(24,56,16,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#2c5c1d", "#3f7d29", "#5da23e", "#8fce62", "#b9e586"];
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
        g.strokeStyle = b % 2 ? "#69b047" : "#356f24"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** THE WOVEN MAT (tikar pandan): interlaced over-under strips in
 *  natural pandan tones with a dyed red-gold border pattern woven
 *  in — the dancers' stage, read clearly even from the stadium
 *  camera. Drawn as one big non-tiling canvas for the whole mat. */
const tikarTex = () => ctex("samanTikar", 1024, 1024, (g, r) => {
  const S = 1024, cell = 32;
  for (let y = 0; y < S / cell; y++) for (let x = 0; x < S / cell; x++) {
    const over = (x + y) % 2 === 0;
    const tone = 0.86 + r() * 0.26;
    const base = over ? [196, 172, 116] : [172, 146, 96];
    g.fillStyle = `rgb(${Math.round(base[0] * tone)},${Math.round(base[1] * tone)},${Math.round(base[2] * tone)})`;
    g.fillRect(x * cell, y * cell, cell, cell);
    g.fillStyle = over ? "rgba(90,64,28,0.20)" : "rgba(255,240,200,0.13)";
    if (over) g.fillRect(x * cell, y * cell + cell - 5, cell, 5); else g.fillRect(x * cell + cell - 5, y * cell, 5, cell);
  }
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "70,50,20" : "255,246,214"},${0.04 + r() * 0.05})`; g.fillRect(r() * S, r() * S, 2, 2); }
  // woven border bands: red with gold diamonds, near every edge
  const border = (x0: number, y0: number, w: number, h: number, horiz: boolean) => {
    g.fillStyle = "#8c2f39"; g.fillRect(x0, y0, w, h);
    g.fillStyle = "#d9a441";
    const n = Math.floor((horiz ? w : h) / 44);
    for (let i = 0; i < n; i++) {
      const cx = horiz ? x0 + 22 + i * 44 : x0 + w / 2, cy = horiz ? y0 + h / 2 : y0 + 22 + i * 44;
      g.beginPath(); g.moveTo(cx, cy - 11); g.lineTo(cx + 11, cy); g.lineTo(cx, cy + 11); g.lineTo(cx - 11, cy); g.closePath(); g.fill();
    }
  };
  border(0, 0, S, 52, true); border(0, S - 52, S, 52, true);
  border(0, 0, 52, S, false); border(S - 52, 0, 52, S, false);
  g.strokeStyle = "rgba(60,40,14,0.55)"; g.lineWidth = 5; g.strokeRect(26, 26, S - 52, S - 52);
});
/** grandstand crowd: thousands of tiny heads/shirts speckled over
 *  shaded concrete — a crowd, never a flat stand */
const crowdTex = () => ctex("samanCrowd", 1024, 256, (g, r) => {
  g.fillStyle = "#7d7468"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "52,46,40" : "168,158,142"},${0.10 + r() * 0.12})`; g.fillRect(0, r() * 256, 1024, 3 + r() * 7); }
  const cols = ["#d8d3c8", "#c23b2e", "#274b9f", "#e8c832", "#2e7d4f", "#e8862c", "#7b3a9f", "#3aa6b9", "#f2f0e6"];
  for (let i = 0; i < 9000; i++) {
    const x = r() * 1024, y = r() * 256;
    g.fillStyle = cols[Math.floor(r() * cols.length) % cols.length];
    g.globalAlpha = 0.5 + r() * 0.5;
    g.fillRect(x, y, 3.4, 4.4);
    g.fillStyle = "rgba(40,30,22,0.8)"; g.fillRect(x + 0.6, y - 2.2, 2.2, 2.2);
  }
  g.globalAlpha = 1;
});
/** the merah-putih flag, painted with soft wave shading */
const flagTex = () => ctex("samanFlag", 256, 160, (g, r) => {
  g.fillStyle = "#d42f2f"; g.fillRect(0, 0, 256, 80);
  g.fillStyle = "#f6f2e8"; g.fillRect(0, 80, 256, 80);
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 52;
    const gr = g.createLinearGradient(x, 0, x + 30, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.13)"); gr.addColorStop(0.5, "rgba(255,255,255,0.10)"); gr.addColorStop(1, "rgba(0,0,0,0.13)");
    g.fillStyle = gr; g.fillRect(x, 0, 30, 160);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(60,20,20,${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 160, 1.8, 1.8); }
});
/** bare earth for tree bases */
const soilTex = () => ctex("samanSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit field variation */
const patchTex = () => ctex("samanPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("samanBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for the adat house walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const thatchTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6800; i++) {
    const x = r() * 512, y = r() * 512, l = 10 + r() * 26;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,230,165" : "36,22,8"},${0.09 + r() * 0.16})`;
    g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + l); g.stroke();
  }
  for (let y = 42; y < 512; y += 62) {
    const sh = g.createLinearGradient(0, y, 0, y + 22);
    sh.addColorStop(0, "rgba(28,17,6,0.42)"); sh.addColorStop(1, "rgba(28,17,6,0)");
    g.fillStyle = sh; g.fillRect(0, y, 512, 22);
    g.fillStyle = "rgba(255,232,170,0.20)"; g.fillRect(0, y - 3, 512, 3);
  }
});
const blobTex = () => ctex("samanBlob", 256, 256, (g) => {
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

/** A tree with a REAL canopy: bark-textured trunk with angled
 *  branches, 9-13 overlapping foliage blobs in three depth
 *  layers, all carrying a leaf-fleck texture. Organic, never
 *  lollipops. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "samanFoliageDeep"),
    folM(greens[0], "samanFoliageMid"),
    folM(greens[1] ?? greens[0], "samanFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.3, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.52, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.35 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.34 + tr() * cr * 0.14, Math.sin(a) * d, cr * (0.42 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 0.92, 1);
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.45 + tr() * 0.45);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.4, Math.sin(a) * d, cr * (0.44 + tr() * 0.22), 1);
  }
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.2 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy + cr * (0.36 + tr() * 0.2), Math.sin(a) * d, cr * (0.34 + tr() * 0.16), 2);
  }
  return g;
};

/** A Bukit Barisan ridge: a jagged silhouette extruded deep,
 *  clothed in flecked forest — fog does the atmospheric fade. */
const makeRidge = (w: number, peak: number, col: string, seed: number) => {
  const r = rng(seed);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  const n = 26;
  let prevY = peak * (0.35 + r() * 0.3);
  shape.lineTo(-w / 2, prevY);
  for (let i = 1; i <= n; i++) {
    const x = -w / 2 + (i / n) * w;
    const y = peak * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + seed)) * (0.55 + r() * 0.45));
    shape.lineTo(x - w / n * 0.5, prevY * 0.55 + y * 0.3);
    shape.lineTo(x, y);
    prevY = y;
  }
  shape.lineTo(w / 2, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: false });
  const m = new THREE.Mesh(geo, lam2({ color: col, map: rep(foliageTex("samanFoliageRidge"), 24, 3) }));
  return m;
};

/** The adat house (rumah pitu ruang silhouette): a modest wall
 *  box under a VERY tall steep thatch roof — Gayo highlands. */
const makeAdatHouse = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(plasterTex("samanPlasterA", "#e6d9c0"), 2, 1) });
  const roofM = lam2({ map: rep(thatchTex("samanThatchA", "#7d5c2c"), 2, 2) });
  const w = 7, d = 5.6, wallH = 2.3, roofH = 6.2;
  // stilts + floor platform (highland houses stand off the ground)
  const plat = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.3, d + 0.8), lam2({ color: "#6a4a2c" }));
  plat.position.y = 0.85; plat.castShadow = true; g.add(plat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.85, 7), lam2({ color: "#5d4028" }));
    st.position.set(sx * (w / 2 - 0.4), 0.42, sz * (d / 2 - 0.4)); g.add(st);
  }
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallM);
  walls.position.y = 1.0 + wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.5, 0); shape.lineTo(w / 2 + 0.5, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.8, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.8) / 2);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.y = 1.0 + wallH - 0.05; roof.castShadow = true; g.add(roof);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallM);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, 1.0 + wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    g.add(tri);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, d + 0.85, 8), lam2({ color: "#4c3420" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 1.0 + wallH + roofH - 0.02, 0); g.add(ridge);
  // carved gable board + door + small windows on the front
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), lam2({ color: "#8c2f39" }));
  board.position.set(0, 1.0 + wallH + roofH * 0.45, d / 2 + 0.42); g.add(board);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.08), lam2({ color: "#5d3a22" }));
  door.position.set(0, 1.95, d / 2 + 0.03); g.add(door);
  const frameM = lam2({ color: "#f4f1ea" });
  for (const wx of [-2.2, 2.2]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.08), frameM);
    fr.position.set(wx, 2.6, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.94, 0.09), lam2({ color: "#3d5a78" }));
    gl.position.set(wx, 2.6, d / 2 + 0.04); g.add(gl);
  }
  // steps up to the door
  for (let i = 0; i < 3; i++) {
    const stp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.4), lam2({ color: "#8a7358" }));
    stp.position.set(0, 0.85 - i * 0.28, d / 2 + 0.6 + i * 0.34); g.add(stp);
  }
  return g;
};

/** The grandstand of Stadion Seribu Bukit: six concrete steps
 *  full of crowd speckle, a shaded roof strip on posts, and a
 *  red-white banner band along the front. */
const makeGrandstand = () => {
  const g = new THREE.Group();
  const W = 96;
  const concM = lam2({ color: "#9a9184" });
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(W, 1.05, 2.3), concM);
    step.position.set(0, 0.5 + i * 1.05, -i * 2.3);
    step.castShadow = true; step.receiveShadow = true; g.add(step);
    const crowd = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.5),
      lam2({ map: rep(crowdTex(), 3, 1), color: "#cfc8ba" }));
    crowd.rotation.x = -Math.PI / 2 + 0.42;
    crowd.position.set(0, 1.15 + i * 1.05, -0.4 - i * 2.3);
    g.add(crowd);
  }
  // banner band along the front face
  const band = new THREE.Mesh(new THREE.BoxGeometry(W, 0.85, 0.15), lam2({ color: "#b03030" }));
  band.position.set(0, 0.55, 1.25); g.add(band);
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, 0.15), lam2({ color: "#f2eee4" }));
  band2.position.set(0, 1.18, 1.25); g.add(band2);
  // roof strip on posts over the top step
  const postM = lam2({ color: "#5a5f6a" });
  for (let x = -W / 2 + 4; x < W / 2; x += 11.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 7), postM);
    post.position.set(x, 6.3 + 2.3, -12.6); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 0.18, 7.5), lam2({ color: "#707a88" }));
  roof.position.set(0, 10.9, -11.4); roof.rotation.x = 0.1; roof.castShadow = true; g.add(roof);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced around the
 *  mat and over the open field. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#26511a"), tip = new THREE.Color("#93cc5e"), tmp = new THREE.Color();
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
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private flags: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(12262);
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
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildField(R, r);
  }

  // ---------------- the field: grass, mat, stand, ridges, house ----------------
  private buildField(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.08, -40); land.receiveShadow = true; R.add(land);
    // THE MAT: one giant woven tikar under the whole company
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(60, 54), lam2({ map: tikarTex(), color: "#e8dcc0" }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.0, -17); mat.receiveShadow = true; R.add(mat);
    // worn earth strip between the mat and the grandstand
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(96, 7), lam2({ map: rep(soilTex(), 24, 2), color: "#b59a72" }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, -0.02, -48.5); strip.receiveShadow = true; R.add(strip);
    // ---- the grandstand closing the field ----
    const stand = makeGrandstand();
    stand.position.set(0, 0, -53);
    R.add(stand);
    blob(R, 0, 0.0, -51.5, 100, 4, 0.22);
    // ---- Bukit Barisan: two ridge layers behind the stand ----
    const ridge1 = makeRidge(560, 52, "#5d8a52", 7);
    ridge1.position.set(-30, 0, -128); R.add(ridge1);
    const ridge2 = makeRidge(720, 84, "#54749c", 21);
    ridge2.position.set(40, 0, -185); R.add(ridge2);
    // ---- the adat house in the side clearing (shot 6) ----
    const house = makeAdatHouse();
    house.position.set(-28, 0, -35);
    house.rotation.y = 0.62;
    R.add(house);
    blob(R, -28, 0.02, -35, 11, 9, 0.3);
    // ---- trees: field edges, foothills, house clearing ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treePts: [number, number][] = [];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.37 });
      treePts.push([x, z]);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, 0.02, z);
      disc.receiveShadow = true; R.add(disc);
    };
    treeAt(-24.5, -27.5, 4.6, 5); treeAt(-33.5, -29, 5.4, 9); treeAt(-22.5, -38.5, 4.1, 13);
    treeAt(34, -8, 5.2, 17); treeAt(37, -24, 4.4, 23); treeAt(-36, -6, 4.8, 29);
    treeAt(-38, -44, 5.6, 31); treeAt(38, -42, 5.0, 37); treeAt(33, 4, 4.2, 41);
    treeAt(-34, 6, 4.5, 43); treeAt(52, -30, 6.4, 47); treeAt(-54, -34, 6.0, 53);
    for (let i = 0; i < 8; i++) treeAt(-70 + i * 19, -104 - (i % 2) * 9, 8.5 + (i % 3) * 1.8, 90 + i * 7);
    // ---- flag poles along both sides of the mat — the flags
    // WAVE all film long (standar gerak) ----
    const poleM = lam2({ color: "#8a8f98" });
    for (const s of [1, -1]) for (const z of [7, -11, -29]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 7.6, 7), poleM);
      pole.position.set(s * 31.5, 3.8, z); pole.castShadow = true; R.add(pole);
      const flagGeo = new THREE.PlaneGeometry(2.3, 1.45);
      flagGeo.translate(1.15, 0, 0);
      const flag = new THREE.Mesh(flagGeo, lam2({ map: flagTex(), side: THREE.DoubleSide }));
      flag.position.set(s * 31.5, 6.7, z);
      if (s < 0) flag.rotation.y = Math.PI;
      R.add(flag);
      this.flags.push({ m: flag, ph: z * 0.7 + (s > 0 ? 0 : 2.1) });
      blob(R, s * 31.5, 0.01, z, 1.2, 1.2, 0.4);
    }
    // ---- grass dressing: tone pools on the open field + tufts
    // fringing the mat and scattered outside it ----
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (36 + r() * 26), 0.0, 8 - r() * 70, 6 + r() * 6, 7 + r() * 7, 0.15 + r() * 0.1, r() * 3);
    }
    for (let i = 0; i < 6; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (36 + r() * 24), 0.005, 6 - r() * 64, 6 + r() * 5, 7 + r() * 6, 0.24 + r() * 0.1, r() * 3);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let z = 12; z > -46; z -= 0.9 + r() * 0.8) {
      if (r() < 0.9) tuftPts.push({ x: 30.6 + r() * 0.8, z, s: 0.85 + r() * 0.8 });
      if (r() < 0.9) tuftPts.push({ x: -31.4 + r() * 0.8, z, s: 0.85 + r() * 0.8 });
    }
    for (let i = 0; i < 420; i++) {
      const s = r() < 0.5 ? 1 : -1;
      tuftPts.push({ x: s * (33 + r() * 30), z: 12 - r() * 66, s: 0.7 + r() * 0.9 });
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      tuftPts.push({ x: tx + Math.cos(a) * d, z: tz + Math.sin(a) * d, s: 0.8 + r() * 0.7 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // wildflower knots on the open field
    const fl2 = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6", "#e86a9a", "#9a6ae0"];
    for (let i = 0; i < 60; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const cx = s * (34 + r() * 22), cz = 10 - r() * 58;
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055 + r() * 0.05, 6, 5), lam2({ color: fl2[Math.floor(r() * fl2.length) % fl2.length] }));
        dot.position.set(cx + (r() - 0.5) * 0.55, 0.18 + r() * 0.14, cz + (r() - 0.5) * 0.55);
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
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // the flags WAVE: yaw sweep + a cloth flap on the free edge
    for (const fl of this.flags) {
      const base = fl.m.position.x < 0 ? Math.PI : 0;
      fl.m.rotation.y = base + Math.sin(tt * 2.3 + fl.ph) * 0.38;
      fl.m.rotation.z = Math.sin(tt * 3.1 + fl.ph * 1.7) * 0.07;
      const sq = 1 + Math.sin(tt * 4.3 + fl.ph) * 0.05;
      fl.m.scale.set(1, sq, 1);
    }
    // grass tufts bend with the same wind (phase travels across the field)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0, p.z);
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
