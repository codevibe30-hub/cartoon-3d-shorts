// Karapan Sapi, Madura as one three.js scene for the Fafnir-ID
// short: a festival arena on dry golden savanna — a wet brown
// mud track running away down -Z between bamboo fences and
// cheering crowds, umbul-umbul flags snapping in the wind, team
// tents, a decorated start gate and the finish arch far away.
// Two pairs of bulls in songket blankets wait at the start; the
// hero pair races the track with the jockey standing the
// kaleles behind them. VISUAL CORE: hot dry midday, saturated
// festival colour against golden fields — textured everything
// (anti-banding: speckled sky, churned mud, cracked earth).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_TEAM, FINISH_Z, START_Z, clamp01, heroTeamAt, rivalTeamAt, TeamPose } from "./story";

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
/** Hot Madura midday sky: deep blue up top melting into a pale
 *  heat-hazed horizon, a hard sun glare, thin cirrus, a few
 *  cumulus towers — and grain everywhere against banding. */
const skyTexHot = () => ctex("karapanSkyHot", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1c56b8"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.60, "#7db1ec");
  grad.addColorStop(0.84, "#c3d9ef"); grad.addColorStop(1, "#eee3c2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 50 + r() * 170, w = 300 + r() * 460;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.15); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [140, 420, 58], [430, 380, 78], [770, 445, 52], [1090, 390, 88], [1430, 440, 56],
    [1710, 375, 80], [1970, 435, 54], [610, 325, 40], [1310, 315, 44], [1860, 295, 38],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1560, 170, 8, 1560, 170, 300);
  sn.addColorStop(0, "rgba(255,252,230,0.98)"); sn.addColorStop(0.1, "rgba(255,244,196,0.6)"); sn.addColorStop(1, "rgba(255,244,196,0)");
  g.fillStyle = sn; g.fillRect(1200, 0, 720, 560);
  g.fillStyle = "#fffdf0"; g.beginPath(); g.arc(1560, 170, 34, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("karapanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("karapanBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
const blobTex = () => ctex("karapanBlob", 256, 256, (g) => {
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
/** DRY EARTH (anti-flat): cracked tan dirt — value blotches,
 *  thousands of grit speckles, hairline crack polylines, small
 *  stones and straw flecks. Never a flat sheet. */
const dirtTex = () => ctex("karapanDirt", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#9a7a4c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 34 + r() * 120, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "104,76,40" : "196,164,104";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.30 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "52,36,16" : "226,198,140"},${0.08 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 2, 2); }
  // hairline cracks wandering the pan
  g.strokeStyle = "rgba(58,40,18,0.5)"; g.lineWidth = 1.6;
  for (let i = 0; i < 46; i++) {
    let x = r() * S, y = r() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 260; i++) { // small stones
    g.fillStyle = `rgba(${r() > 0.5 ? "120,100,74" : "168,146,104"},${0.5 + r() * 0.4})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 4, 1.5 + r() * 3, r() * 3, 0, 7); g.fill();
  }
  const straw = ["#c9a44e", "#b8933e", "#dec06a"];
  g.lineCap = "round";
  for (let i = 0; i < 2600; i++) { // straw flecks
    const x = r() * S, y = r() * S, l = 5 + r() * 9, a = r() * Math.PI;
    g.strokeStyle = straw[Math.floor(r() * 3)]; g.globalAlpha = 0.25 + r() * 0.4; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = 1;
});
/** WET MUD for the track: dark churned brown — glossy wet
 *  blotches, pale drying crust at the edges, hoof-churn ridge
 *  strokes running down-track, and sky glints in the wettest
 *  patches so the surface reads WET, not painted. */
const mudTex = () => ctex("karapanMud", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5d4430"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.55;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "34,24,14" : "128,98,62";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.36 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // churn ridges: short strokes running down-track (canvas Y)
  g.lineCap = "round";
  for (let i = 0; i < 2400; i++) {
    const x = r() * S, y = r() * S, l = 8 + r() * 22;
    g.strokeStyle = r() > 0.45 ? `rgba(24,16,8,${0.12 + r() * 0.2})` : `rgba(168,132,88,${0.10 + r() * 0.18})`;
    g.lineWidth = 2 + r() * 2.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke();
  }
  for (let i = 0; i < 900; i++) { // wet sky glints
    g.fillStyle = `rgba(214,232,244,${0.05 + r() * 0.13})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, 3 + r() * 9, 1.2 + r() * 2.4, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "20,12,6" : "150,116,76"},${0.08 + r() * 0.18})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** DRY SAVANNA GRASS: the grassRich recipe in a golden palette —
 *  deep olive-shadow pockets, sunlit straw flecks, thousands of
 *  individual dry blades. */
const dryGrassTex = () => ctex("karapanDryGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#a8894a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "110,96,40" : "216,186,102";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 4200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(240,220,150,${0.10 + r() * 0.2})` : `rgba(84,70,26,${0.10 + r() * 0.2})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#7a6428", "#97803a", "#b89a4c", "#d3b968", "#e8d084"];
  g.lineCap = "round";
  for (let i = 0; i < 13000; i++) {
    const x = r() * S, y = r() * S, l = 6 + r() * 12, lean = (r() - 0.5) * 6;
    wrapDraw(S, x, y, 16, (xx, yy) => {
      g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
      g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + lean, yy - l); g.stroke();
    });
  }
  g.globalAlpha = 1;
});
/** Cow hide: warm reddish-brown with lighter patch blotches and
 *  a fine speckle — Madura cattle read red-brown in the sun. */
const hideTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,214,170" : "70,36,18"},${0.05 + r() * 0.08})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 26 + r() * 70, 16 + r() * 44, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 3600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,226,190" : "52,26,12"},${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** Songket-style woven blanket: crimson field, gold diamond
 *  lattice, striped end bands — the bulls' racing finery. */
const songketTex = (key: string, field: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = field; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(246,200,60,0.85)"; g.lineWidth = 5;
  for (let i = -8; i < 16; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 512, 512); g.stroke();
    g.beginPath(); g.moveTo(i * 64 + 512, 0); g.lineTo(i * 64, 512); g.stroke();
  }
  g.fillStyle = "rgba(255,232,150,0.9)";
  for (let y = 32; y < 512; y += 64) for (let x = 32; x < 512; x += 64) {
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore();
  }
  for (const y of [0, 496]) { g.fillStyle = "#f6c83c"; g.fillRect(0, y, 512, 16); }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,200" : "40,8,8"},${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** Dry-land foliage: olive canopy flecked with straw-lit leaves
 *  and deep shade pockets — acacia, not rainforest. */
const dryFoliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#8a9455"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(52,58,22,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(238,230,160,${0.12 + r() * 0.22})` : `rgba(44,52,20,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** bark: vertical fissured streaks for trunks and poles */
const barkTex = () => ctex("karapanBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** A painted festival banner: bold text on a coloured field
 *  with a double border and corner stars. */
const bannerTex = (key: string, text: string, bg: string, fg: string) => ctex(key, 1024, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, bg); grad.addColorStop(1, bg);
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.lineWidth = 3; g.strokeRect(34, 34, 956, 188);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  let fs = 120;
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  const w = g.measureText(text).width;
  if (w > 900) { fs = Math.floor(fs * (900 / w)); g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`; }
  g.save();
  g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowOffsetY = 5;
  g.fillText(text, 512, 134);
  g.restore();
  for (const [x, y] of [[70, 128], [954, 128]] as [number, number][]) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 11 : 26;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fillStyle = fg; g.fill();
  }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("karapanPatch", 256, 256, (g) => {
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
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

// ---------------- builders ----------------
const woodMat = () => lam2({ color: "#8a6844", map: rep(barkTex(), 1, 2) });
const darkWoodMat = () => lam2({ color: "#6a4a2c", map: rep(barkTex(), 1, 2) });

/** A dry-land acacia: gnarled trunk, flat-topped layered canopy
 *  (three foliage masses, never one green ball). */
const makeTree = (h: number, seed: number) => {
  const g = new THREE.Group();
  const r = rng(seed);
  const trunkM = lam2({ color: "#7a5c3e", map: rep(barkTex(), 1, 3) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * h * 0.28, 0.24 * h * 0.28, h * 0.62, 7), trunkM);
  trunk.position.y = h * 0.31; trunk.rotation.z = (r() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = lam2({ color: "#7d8c46", map: rep(dryFoliageTex("karapanFoliage" + (seed % 3)), 2, 1) });
  const folM2 = lam2({ color: "#93a355", map: rep(dryFoliageTex("karapanFoliage" + (seed % 3)), 2, 1) });
  const blobs: [number, number, number, number][] = [
    [0, h * 0.78, 0, h * 0.34], [h * 0.22, h * 0.7, h * 0.08, h * 0.26], [-h * 0.24, h * 0.72, -h * 0.06, h * 0.24],
  ];
  blobs.forEach(([x, y, z, rad], i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), i % 2 ? folM2 : folM);
    b.position.set(x, y, z); b.scale.set(1.25, 0.55, 1.15); b.rotation.y = r() * 3;
    b.castShadow = true; g.add(b);
  });
  return g;
};
/** A lontar palm: curved segmented trunk, a crown of long
 *  drooping fronds (planes bent by rotation, two-tone green). */
const makePalm = (h: number, seed: number) => {
  const g = new THREE.Group();
  const r = rng(seed);
  const trunkM = lam2({ color: "#8a7350", map: rep(barkTex(), 2, 4) });
  let px = 0, py = 0;
  const lean = 0.16 + r() * 0.12;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.012, 0.16 - i * 0.012, h / 5, 7), trunkM);
    px += Math.sin(lean) * (h / 5) * i * 0.4; py = (h / 5) * (i + 0.5);
    seg.position.set(px * 0.4, py, 0); seg.rotation.z = -lean * 0.7; seg.castShadow = true; g.add(seg);
  }
  const topX = px * 0.4 + Math.sin(lean) * h * 0.18, topY = h;
  const frondM = lam2({ color: "#67913a", side: THREE.DoubleSide });
  const frondM2 = lam2({ color: "#86a848", side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + r() * 0.4;
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, h * 0.46, 1, 4), i % 2 ? frondM : frondM2);
    fr.position.set(topX + Math.cos(a) * h * 0.16, topY - h * 0.06, Math.sin(a) * h * 0.16);
    fr.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    fr.castShadow = true; g.add(fr);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lam2({ color: "#6a8a3a" }));
  nut.position.set(topX, topY - 0.14, 0); g.add(nut);
  return g;
};
/** A team tent: four poles, a striped canvas roof prism, a back
 *  wall in team colours — the paddock's little palaces. */
const makeTent = (colA: string, colB: string, w = 5.2, d = 4.2) => {
  const g = new THREE.Group();
  const poleM = darkWoodMat();
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]] as [number, number][]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), poleM);
    p.position.set(x, 1.3, z); p.castShadow = true; g.add(p);
  }
  const stripeTex = ctex("karapanTent" + colA + colB, 512, 128, (gg, r) => {
    for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? colA : colB; gg.fillRect(i * 64, 0, 64, 128); }
    for (let i = 0; i < 900; i++) { gg.fillStyle = "rgba(60,40,10," + (0.03 + r() * 0.04) + ")"; gg.fillRect(r() * 512, r() * 128, 2, 2); }
  });
  const roofM = lam2({ map: rep(stripeTex, 2, 1) });
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, 1.15); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.7) / 2);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.y = 2.55; roof.castShadow = true; g.add(roof);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.5), lam2({ color: colA }));
  back.position.set(0, 1.25, -d / 2); g.add(back);
  return g;
};
/** An umbul-umbul: a tall bamboo pole with a long curved
 *  pennant — Madura's festival flags, snapping in the wind. */
const makeFlag = (col: string, h = 6.4) => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, h, 6), lam2({ color: "#b89a58", map: rep(barkTex(), 1, 4) }));
  pole.position.y = h / 2; pole.rotation.z = 0.05; pole.castShadow = true; g.add(pole);
  const flagM = lam2({ color: col, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, h * 0.52, 1, 6), flagM);
  flag.position.set(0.3, h * 0.72, 0);
  flag.rotation.y = 0.2;
  g.add(flag);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), lam2({ color: "#f6c83c" }));
  tip.position.set(0.32, h + 0.02, 0); g.add(tip);
  return { g, flag };
};
/** A gate across the track: two decorated poles, a painted
 *  banner, small pennants on top. Start and finish wear one. */
const makeGate = (tex: THREE.Texture, w = 13.5) => {
  const g = new THREE.Group();
  const poleM = lam2({ color: "#a03a30", map: rep(barkTex(), 1, 3) });
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.6, 8), poleM);
    p.position.set(s * w / 2, 2.8, 0); p.castShadow = true; g.add(p);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 8), lam2({ color: "#f6c83c" }));
    band.position.set(s * w / 2, 4.6, 0); g.add(band);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), lam2({ color: "#f6c83c" }));
    ball.position.set(s * w / 2, 5.85, 0); g.add(ball);
  }
  const bannerGeo = new THREE.PlaneGeometry(w * 0.86, w * 0.86 * 0.25);
  const bannerMat = new THREE.MeshLambertMaterial({ map: tex });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 4.55, 0.03); banner.castShadow = true; g.add(banner);
  const bannerBack = new THREE.Mesh(bannerGeo, bannerMat);
  bannerBack.position.set(0, 4.55, -0.03); bannerBack.rotation.y = Math.PI; g.add(bannerBack);
  return g;
};

// ---------------- the bulls ----------------
type CowRig = {
  legs: THREE.Group[]; lowers: THREE.Group[]; tail: THREE.Group;
  head: THREE.Group; body: THREE.Group;
};
type TeamRig = {
  g: THREE.Group; cows: CowRig[]; phase: number; lastZ: number;
  spray: THREE.Sprite[];
};
/** One racing bull, facing -Z: red-brown hide, a zebu hump, a
 *  songket blanket with gold trim, a flower-bright forehead
 *  cloth and a brass bell. Legs pivot at the shoulder/hip so
 *  update() can gallop them. */
const makeCow = (hide: string, blanketKey: string, blanketCol: string, seed: number): { g: THREE.Group; rig: CowRig } => {
  const g = new THREE.Group();
  const r = rng(seed);
  const hideM = lam2({ map: rep(hideTex("karapanHide" + seed, hide), 1, 1) });
  const darkM = lam2({ color: "#4a2e1a" });
  const body = new THREE.Group(); body.position.y = 1.14; g.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 10), hideM);
  torso.scale.set(0.56, 0.56, 1.12); torso.castShadow = true; body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hideM);
  chest.position.set(0, -0.02, -0.82); chest.scale.set(0.92, 0.95, 0.8); body.add(chest);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), hideM);
  hump.position.set(0, 0.44, -0.5); hump.scale.set(0.8, 0.85, 1.1); hump.castShadow = true; body.add(hump);
  const blanketM = lam2({ map: rep(songketTex(blanketKey, blanketCol), 1, 1) });
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.13, 1.15), blanketM);
  blanket.position.set(0, 0.42, 0.16); blanket.castShadow = true; body.add(blanket);
  for (const sd of [1, -1]) {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 1.1), blanketM);
    drape.position.set(sd * 0.46, 0.16, 0.16); body.add(drape);
  }
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 1.19), lam2({ color: "#f6c83c" }));
  trim.position.set(0, 0.35, 0.16); body.add(trim);
  // head on a neck pivot at the shoulders
  const head = new THREE.Group(); head.position.set(0, 0.22, -0.95); body.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.6, 0.72), hideM);
  skull.position.set(0, -0.04, -0.26); skull.rotation.x = 0.42; skull.castShadow = true; head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.34), lam2({ color: "#caa27e" }));
  muzzle.position.set(0, -0.32, -0.56); muzzle.rotation.x = 0.42; head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.09), lam2({ color: "#5d4038" }));
  nose.position.set(0, -0.41, -0.7); nose.rotation.x = 0.42; head.add(nose);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.16), hideM);
    ear.position.set(s * 0.4, 0.16, -0.14); ear.rotation.z = s * -0.5; head.add(ear);
    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.05, 6, 10, Math.PI * 0.95), lam2({ color: "#e6d7b8" }));
    horn.position.set(s * 0.24, 0.26, -0.12); horn.rotation.set(0.3, s * 0.5, s * 2.2); head.add(horn);
  }
  // forehead finery: a bright cloth diamond + a brass bell
  const jewel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.04), lam2({ color: "#d8402e" }));
  jewel.position.set(0, 0.16, -0.42); jewel.rotation.x = 0.42; jewel.rotation.y = Math.PI / 4; head.add(jewel);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lam2({ color: "#e9bc4a" }));
  bell.position.set(0, -0.48, -0.28); head.add(bell);
  // legs: pivot groups at shoulder/hip, lower leg + hoof below
  const legs: THREE.Group[] = []; const lowers: THREE.Group[] = [];
  for (const [lx, lz] of [[-0.27, -0.6], [0.27, -0.6], [-0.27, 0.62], [0.27, 0.62]] as [number, number][]) {
    const pivot = new THREE.Group(); pivot.position.set(lx, 0.98, lz); g.add(pivot);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.08, 0.56, 7), hideM);
    upper.position.y = -0.28; upper.castShadow = true; pivot.add(upper);
    const lower = new THREE.Group(); lower.position.y = -0.56; pivot.add(lower);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.44, 7), hideM);
    shin.position.y = -0.2; lower.add(shin);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.19), darkM);
    hoof.position.set(0, -0.42, -0.02); lower.add(hoof);
    legs.push(pivot); lowers.push(lower);
  }
  // tail: pivot at the rump, tuft at the end
  const tail = new THREE.Group(); tail.position.set(0, 1.42, 0.92); g.add(tail);
  const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.02, 0.82, 6), hideM);
  tailMesh.position.y = -0.4; tail.add(tailMesh);
  const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 6), darkM);
  tuft.position.y = -0.88; tuft.rotation.x = Math.PI; tail.add(tuft);
  void r;
  return { g, rig: { legs, lowers, tail, head, body } };
};
/** A racing pair + yoke + the kaleles: two bamboo rails running
 *  back from the yoke to the little standing platform the
 *  jockey rides. Team origin = ground centre between the bulls;
 *  bulls face -Z, platform at local z +2.62, top at y 0.62. */
const makeTeam = (hide: string, blanketCol: string, seed: number): TeamRig => {
  const g = new THREE.Group();
  const cows: CowRig[] = [];
  for (const s of [1, -1]) {
    const { g: cowG, rig } = makeCow(hide, "karapanSongket" + blanketCol, blanketCol, seed + (s > 0 ? 1 : 2));
    cowG.position.set(s * 0.88, 0, -0.3);
    g.add(cowG); cows.push(rig);
    blob(g, s * 0.88, 0.03, -0.3, 1.7, 2.9, 0.30);
  }
  const woodM = woodMat();
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.35, 7), woodM);
  yoke.rotation.z = Math.PI / 2; yoke.position.set(0, 1.52, -1.28); yoke.castShadow = true; g.add(yoke);
  for (const s of [1, -1]) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 6, 10), lam2({ color: "#a03a30" }));
    wrap.position.set(s * 0.88, 1.52, -1.28); wrap.rotation.y = Math.PI / 2; g.add(wrap);
  }
  // rails: cylinders stretched between two points
  const rail = (from: THREE.Vector3, to: THREE.Vector3) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, len, 6), woodM);
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; g.add(m);
  };
  rail(new THREE.Vector3(-0.82, 1.3, -0.9), new THREE.Vector3(-0.3, 0.6, 2.55));
  rail(new THREE.Vector3(0.82, 1.3, -0.9), new THREE.Vector3(0.3, 0.6, 2.55));
  rail(new THREE.Vector3(0, 1.34, -1.1), new THREE.Vector3(0, 0.62, 2.55));
  // the kaleles platform + its little handlebar
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.95), lam2({ map: rep(planks(), 1, 1), color: "#b0854e" }));
  deck.position.set(0, 0.585, 2.62); deck.castShadow = true; g.add(deck);
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), woodM);
    post.position.set(s * 0.3, 0.85, 2.32); g.add(post);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.66, 6), woodM);
  grip.rotation.z = Math.PI / 2; grip.position.set(0, 1.1, 2.32); g.add(grip);
  // mud spray sprites, recycled by update() while racing
  const spray: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#7a5a34", transparent: true, depthWrite: false, opacity: 0 }));
    sp.layers.set(NOINK); g.add(sp); spray.push(sp);
  }
  return { g, cows, phase: 0, lastZ: 0, spray };
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#d8cdb2", 18, 170);
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
  private dust: THREE.Sprite[] = [];
  private dustBase: { x: number; z: number; sp: number }[] = [];
  private heroTeam: TeamRig;
  private rivalTeam: TeamRig;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: hot sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#a8905e", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexHot(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const cloudSpots: [number, number, number, number][] = [
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, -350, 140],
      [-175, 108, -320, 115], [195, 116, -340, 120], [6, 70, -165, 66], [-128, 64, -155, 60],
      [102, 56, -135, 52], [248, 84, -250, 92],
      [70, 95, 260, 110], [-90, 105, 290, 120], [10, 75, 210, 70], [-150, 85, 240, 95], [170, 90, 230, 85],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(150, 105, -290); glow.scale.set(130, 130, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(150, 105, -290); core.scale.set(36, 36, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildArena(R, r);
    // ---- the two racing pairs ----
    this.heroTeam = makeTeam("#9c4a26", "#a8232a", 11);
    this.heroTeam.g.position.set(HERO_TEAM[0], 0, HERO_TEAM[2]);
    R.add(this.heroTeam.g);
    this.rivalTeam = makeTeam("#7d4a2c", "#1d5c8a", 23);
    this.rivalTeam.g.position.set(-2.6, 0, 9.5);
    R.add(this.rivalTeam.g);
    // ---- wind-blown dust: the dry season made visible ----
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#d9c49a", transparent: true, depthWrite: false, opacity: 0.10 + (i % 3) * 0.03 }));
      const x = -30 + i * 8, z = 14 - i * 7;
      sp.position.set(x, 0.7 + (i % 3) * 0.5, z);
      sp.scale.set(7 + (i % 4), 2.2 + (i % 3) * 0.6, 1);
      sp.layers.set(NOINK); R.add(sp); this.dust.push(sp);
      this.dustBase.push({ x, z, sp: 0.7 + (i % 4) * 0.35 });
    }
  }

  // ---------------- the arena: track, fences, gates, tents, trees ----------------
  private buildArena(R: THREE.Group, r: () => number) {
    // base land: cracked dry earth under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(dirtTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // savanna fields flanking the arena: golden grass with tone layering
    for (const s of [1, -1]) {
      const field = new THREE.Mesh(new THREE.PlaneGeometry(46, 190), lam2({ map: rep(dryGrassTex(), 16, 60) }));
      field.rotation.x = -Math.PI / 2; field.position.set(s * 32, -0.04, -30); field.receiveShadow = true; R.add(field);
      softPatch(R, patchTex(), "#8a6f30", s * 17, 0.02, -40, 7, 150, 0.30);
      softPatch(R, patchTex(), "#e8d88f", s * 24, 0.021, -20, 8, 60, 0.14, 1.2);
    }
    // the track apron: packed dirt the crowds stand behind
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(19, 150), lam2({ map: rep(dirtTex(), 7, 55) }));
    apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.02, -16); apron.receiveShadow = true; R.add(apron);
    // THE MUD TRACK: wet churned strip down the middle
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(11, 128), lam2({ map: rep(mudTex(), 4, 46) }));
    mud.rotation.x = -Math.PI / 2; mud.position.set(0, 0.02, -14); mud.receiveShadow = true; R.add(mud);
    // drying crust lines along both edges of the mud
    for (const s of [1, -1]) {
      const crust = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 128), lam2({ color: "#8a6a42", map: rep(dirtTex(), 1, 40) }));
      crust.rotation.x = -Math.PI / 2; crust.position.set(s * 5.7, 0.03, -14); crust.receiveShadow = true; R.add(crust);
    }
    // standing puddle shines on the wettest patches
    const shineM = new THREE.MeshBasicMaterial({ color: "#dceef8", transparent: true, opacity: 0.09, depthWrite: false });
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + r() * 1.2, 1.4 + r() * 2.2), shineM);
      p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 3;
      p.position.set((r() - 0.5) * 8.4, 0.035, 8 - r() * 62); p.renderOrder = 1; R.add(p);
    }
    // bamboo fences penning the track, both sides
    const fenceM = lam2({ color: "#a8843e", map: rep(barkTex(), 1, 1) });
    for (const s of [1, -1]) {
      for (let z = 16; z > -58; z -= 3.1) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.25, 6), fenceM);
        post.position.set(s * 6.3, 0.62, z); post.castShadow = true; R.add(post);
      }
      for (const ry of [0.55, 1.0]) {
        const railM = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 76, 6), fenceM);
        railM.rotation.x = Math.PI / 2; railM.position.set(s * 6.3, ry, -21); R.add(railM);
      }
      // the crowd's standing bank: a low packed-earth ridge
      const bank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 118), lam2({ map: rep(dirtTex(), 2, 40), color: "#b08d54" }));
      bank.position.set(s * 7.9, 0.1, -18); bank.receiveShadow = true; R.add(bank);
    }
    // umbul-umbul flags marching down both fences
    const flagCols = ["#d8402e", "#f6c83c", "#2e7a4a", "#2e6ac9", "#e86a9a", "#e8862c"];
    let fi = 0;
    for (let z = 14; z > -52; z -= 8.2) {
      for (const s of [1, -1]) {
        const { g, flag } = makeFlag(flagCols[fi % flagCols.length], 6 + (fi % 3) * 0.5);
        g.position.set(s * 6.9, 0, z + (s > 0 ? 0 : -2.5));
        R.add(g);
        this.flags.push({ m: flag, ph: fi * 1.31 });
        fi++;
      }
    }
    // start gate + finish arch
    const startGate = makeGate(bannerTex("karapanStart", "KARAPAN SAPI", "#a8232a", "#ffe9a8"));
    startGate.position.set(0, 0, START_Z); R.add(startGate);
    const finGate = makeGate(bannerTex("karapanFinish", "FINISH", "#1d4e79", "#ffe9a8"));
    finGate.position.set(0, 0, FINISH_Z); R.add(finGate);
    // checkered bunting strung over the finish
    const buntTex = ctex("karapanBunting", 512, 64, (g2) => {
      for (let i = 0; i < 16; i++) { g2.fillStyle = i % 2 ? "#20242c" : "#f4f1ea"; g2.fillRect(i * 32, 0, 32, 64); }
    });
    const bunt = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 0.55), lam2({ map: rep(buntTex, 1, 1), side: THREE.DoubleSide }));
    bunt.position.set(0, 3.6, FINISH_Z); R.add(bunt);
    // team tents behind both fences + the paddock tent (right, near start)
    const tentCols: [string, string][] = [["#a8232a", "#f4f1ea"], ["#1d5c8a", "#f6c83c"], ["#2e7a4a", "#f4f1ea"], ["#e8862c", "#a8232a"]];
    const tentSpots: [number, number, number][] = [
      [11.5, 1.0, 0], [-11.5, -6, 0], [11.8, -16, 1], [-11.8, -26, 1], [11.6, -34, 0], [-11.6, 8, 0],
    ];
    tentSpots.forEach(([x, z, flip], i) => {
      const t = makeTent(tentCols[i % tentCols.length][0], tentCols[i % tentCols.length][1]);
      t.position.set(x, 0, z);
      t.rotation.y = (x > 0 ? -Math.PI / 2 : Math.PI / 2) + (flip ? 0.15 : -0.1);
      R.add(t);
      blob(R, x, 0.04, z, 6.4, 5.4, 0.26);
    });
    // trees: acacias + lontar palms scattered over the fields
    const treePts: [number, number, number, boolean][] = [
      [15, -12, 4.6, false], [-16, -20, 5.4, true], [18, -44, 4.8, false], [-15, 6, 4.2, true],
      [22, -60, 5.6, false], [-21, -52, 4.6, false], [16, 12, 4.4, true], [-24, -34, 5.8, true],
      [26, -8, 5.0, false], [-27, -66, 5.2, false],
    ];
    treePts.forEach(([x, z, h, palm], i) => {
      const t = palm ? makePalm(h + 1.6, 60 + i * 7) : makeTree(h, 50 + i * 11);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9 + (i % 3) * 0.3, 12), lam2({ color: "#8a6c3c", map: rep(dirtTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.02, z); disc.receiveShadow = true; R.add(disc);
    });
    // distant dry hills closing the horizon + a far tree line
    const hillM = lam2({ color: "#b39b6d" });
    const hillM2 = lam2({ color: "#a08758" });
    const hills: [number, number, number, number, number][] = [
      [-70, -150, 90, 15, 26], [30, -160, 120, 19, 30], [110, -140, 80, 12, 22], [-140, -120, 90, 13, 24],
    ];
    hills.forEach(([x, z, sx, sy, sz], i) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), i % 2 ? hillM2 : hillM);
      h.position.set(x, -sy * 0.35, z); h.scale.set(sx, sy, sz); R.add(h);
    });
    for (let i = 0; i < 11; i++) {
      const t = makeTree(7.5 + (i % 3) * 1.6, 120 + i * 7);
      t.position.set(-60 + i * 13, 0, -112 - (i % 2) * 8);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
    }
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

  /** Animate one team rig from its story pose: legs gallop or
   *  walk by distance actually travelled, tails always swish,
   *  heads bob, mud sprays off the hooves at racing speed. */
  private animateTeam(team: TeamRig, pose: TeamPose, tt: number, dt: number) {
    team.g.visible = pose.mode !== "gone";
    if (pose.mode === "gone") { team.lastZ = pose.z; return; }
    team.g.position.set(pose.x, 0, pose.z);
    team.g.rotation.y = pose.yaw;
    const speed = dt > 0 ? Math.abs(pose.z - team.lastZ) / dt : 0;
    team.lastZ = pose.z;
    const racing = pose.mode === "race";
    const walking = pose.mode === "walk";
    if (racing) team.phase += Math.max(speed, 6) * dt * 2.1;
    else if (walking) team.phase += Math.max(speed, 1.2) * dt * 1.5;
    const amp = racing ? 0.78 : walking ? 0.42 : 0;
    const bobA = racing ? 0.055 : walking ? 0.025 : 0.008;
    team.cows.forEach((cow, ci) => {
      const offs = [0, Math.PI * 0.9, Math.PI * 0.9, 0];
      cow.legs.forEach((leg, li) => {
        const target = amp * Math.sin(team.phase + offs[li] + ci * 0.35);
        leg.rotation.x += (target - leg.rotation.x) * (racing || walking ? 1 : 0.12);
        cow.lowers[li].rotation.x = amp * 0.7 * Math.sin(team.phase + offs[li] + ci * 0.35 - 0.7) * (racing || walking ? 1 : 0.3);
      });
      cow.body.position.y = 1.14 + Math.abs(Math.sin(team.phase + ci * 0.35)) * bobA + Math.sin(tt * 1.8 + ci * 2.1) * 0.006;
      cow.body.rotation.x = racing ? Math.sin(team.phase + ci * 0.35) * 0.022 : Math.sin(tt * 1.1 + ci) * 0.006;
      cow.head.rotation.x = racing ? Math.sin(team.phase * 1.0 + ci) * 0.05 - 0.05 : Math.sin(tt * 0.9 + ci * 1.7) * 0.045;
      cow.head.rotation.y = Math.sin(tt * 0.6 + ci * 2.9) * 0.05;
      cow.tail.rotation.z = Math.sin(tt * 2.4 + ci * 1.9) * 0.42;
      cow.tail.rotation.x = 0.15 + Math.sin(tt * 1.7 + ci) * 0.1;
    });
    // at the start line the bulls paw the mud, impatient (shot 1/10)
    if (pose.mode === "park" && pose.z > 5) {
      const paw = Math.max(0, Math.sin(tt * 1.4)) ** 3;
      team.cows[0].legs[0].rotation.x = -0.4 * paw;
      team.cows[0].lowers[0].rotation.x = 0.5 * paw;
    }
    // the flying sled: on the fly-past the whole rig hangs a
    // breath off the mud at full stretch (shot 5)
    if (racing && pose.z < 2 && pose.z > -24 && team === this.heroTeam) {
      team.g.position.y = 0.05 + Math.sin(tt * 9) * 0.012;
    }
    // mud spray: recycled sprites cycling behind the hooves
    team.spray.forEach((sp, i) => {
      if (!racing) { sp.material.opacity = 0; return; }
      const cyc = (tt * 2.6 + i * 0.618) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.5 + (i % 5) * 0.22), 0.25 + cyc * 1.1, 1.2 + cyc * 2.6);
      const sc = 0.5 + cyc * 1.5;
      sp.scale.set(sc, sc * 0.8, 1);
      sp.material.opacity = 0.42 * (1 - cyc);
    });
  }

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
    // ---- the teams live their poses ----
    const dt = 1 / FPS;
    this.animateTeam(this.heroTeam, heroTeamAt(id, tt), tt, dt);
    this.animateTeam(this.rivalTeam, rivalTeamAt(id, tt), tt, dt);
    // ---- STANDAR GERAK: everything that should move, moves ----
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // festival flags snap and ripple in the same wind
    for (const fl of this.flags) {
      fl.m.rotation.y = 0.2 + Math.sin(tt * 3.1 + fl.ph) * 0.28;
      fl.m.rotation.z = Math.sin(tt * 4.3 + fl.ph * 1.7) * 0.07;
      fl.m.scale.x = 1 + Math.sin(tt * 5.2 + fl.ph) * 0.05;
    }
    // dust sheets drift across the arena on the wind
    this.dust.forEach((d2, i) => {
      const b = this.dustBase[i];
      d2.position.x = b.x + ((tt * b.sp) % 26);
      d2.position.y = 0.7 + (i % 3) * 0.5 + Math.sin(tt * 0.8 + i * 2.0) * 0.15;
    });
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
