// Pontianak, Kalimantan Barat as one three.js scene for the
// Fafnir-ID cover frame: the Tugu Khatulistiwa standing on its
// paved plaza, the red-white equator line painted across the
// floor straight through the monument base, the Kapuas river
// behind, palms swaying in the tropical midday. The hero stands
// beside the monument, shocked at the size of the claim.
// VISUAL CORE: bright tropical daylight, white stone, the
// red-white line, saturated greens — textured everything
// (anti-banding: speckled sky, flecked water, woven thatch).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style. At culmination (shot 5) the sun
// swings to the zenith and the shadows shrink to nothing.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, MON, EQUATOR_Z, DOME_POS } from "./story";

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
const skyTexDay = () => ctex("pontianakSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#bcd9f7"); grad.addColorStop(1, "#e9f2fb");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // high wispy cirrus, faint and stretched
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  // cumulus clusters in the band the cover camera actually sees
  // (canvas y ~300-540 = just above the horizon), all the way around
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
const glowTex = () => ctex("pontianakGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("pontianakBirds", 256, 96, (g, r) => {
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
  for (let i = 0; i < 240; i++) { // shadow pockets
    g.fillStyle = `rgba(38,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { // individual leaf flecks
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
/** RICH tropical grass: deep shadow pockets, a mid-green body,
 *  sunlit fleck clusters and thousands of individual blades in
 *  five greens with hard value contrast, on a deeper base that
 *  survives the sun lift without going neon. */
const grassRichTex = () => ctex("pontianakGrassRich", 1024, 1024, (g, r) => {
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
  const flw = ["#fff6da", "#ffd94d", "#f6a8c0", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases and bush feet: warm brown speckled
 *  with darker clods and pale grit, never a flat sticker */
const soilTex = () => ctex("pontianakSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("pontianakPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("pontianakBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for the stone monument + shophouse walls */
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
const brickTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(240,235,225,0.35)"; g.lineWidth = 3;
  for (let y = 0; y <= 512; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let row = 0; row < 13; row++) for (let x = (row % 2) * 42; x <= 512; x += 84) {
    g.beginPath(); g.moveTo(x, row * 42); g.lineTo(x, row * 42 + 42); g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,220" : "30,16,10"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});
const blobTex = () => ctex("pontianakBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** the monument's bronze plaque: EVENAR + the coordinates + 1928 */
const plaqueTex = () => ctex("pontianakPlaque", 512, 256, (g) => {
  g.fillStyle = "#4a3a22"; g.fillRect(0, 0, 512, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#6a5326"); grad.addColorStop(1, "#3a2c14");
  g.fillStyle = grad; g.fillRect(8, 8, 496, 240);
  g.strokeStyle = "#d9b04a"; g.lineWidth = 6; g.strokeRect(16, 16, 480, 224);
  g.fillStyle = "#f2d98a"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 72px 'Arial Black', Arial, sans-serif";
  g.fillText("EVENAR", 256, 74);
  g.font = "900 56px 'Arial Black', Arial, sans-serif";
  g.fillText("0° 0' 0''", 256, 150);
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("1928", 256, 210);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A tree with a REAL canopy: a bark-textured trunk with angled
 *  branches, and 9-13 overlapping foliage blobs in three depth
 *  layers — deep shadow green low, mid green main mass, sunlit
 *  flecks on top — all carrying a leaf-fleck texture so no
 *  surface is a smooth ball again. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "pontianakFoliageDeep"),
    folM(greens[0], "pontianakFoliageMid"),
    folM(greens[1] ?? greens[0], "pontianakFoliageLite"),
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

/** A coconut palm: ringed trunk leaning slightly, a crown of
 *  drooping fronds and a small coconut cluster. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 557 + 31);
  const trunkM = lam2({ map: rep(barkTex(), 1, 3), color: "#b08a5e" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, h * 0.72, 8), trunkM);
  trunk.position.y = h * 0.36; trunk.rotation.z = (tr() - 0.5) * 0.12; trunk.castShadow = true; g.add(trunk);
  const frondM = lam2({ color: "#3f8a35", map: rep(foliageTex("pontianakFrond"), 1, 1) });
  const frondM2 = lam2({ color: "#5da24a", map: rep(foliageTex("pontianakFrond2"), 1, 1) });
  const topY = h * 0.72;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.4;
    const fr = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), i % 2 ? frondM : frondM2);
    fr.scale.set(0.32, 0.10, 1.55);
    fr.position.set(Math.cos(a) * 1.15, topY + 0.25 - (i % 3) * 0.18, Math.sin(a) * 1.15);
    fr.rotation.y = -a + Math.PI / 2;
    fr.rotation.x = -0.42 - tr() * 0.15;
    fr.castShadow = true; g.add(fr);
  }
  const nutM = lam2({ color: "#6a4a2c" });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), nutM);
    nut.position.set(Math.cos(i * 2.1) * 0.22, topY - 0.12, Math.sin(i * 2.1) * 0.22);
    g.add(nut);
  }
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced all over
 *  the lawns so lawn edges stop being ruler-straight lines. */
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

/** THE monument: white-stone steps + pedestal + tall pillar,
 *  a gold ring (the equator's circle) + arrow on top, and the
 *  bronze EVENAR / 0° 0' 0'' / 1928 plaque facing the camera.
 *  Total height ~10 m — it must DOMINATE frame 0. */
const makeMonument = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(plasterTex("pontianakStone", "#f0e8d8"), 2, 2) });
  const stoneDarkM = lam2({ map: rep(plasterTex("pontianakStoneDark", "#d8cbb0"), 2, 1) });
  const goldM = lam2({ color: "#d9a441" });
  const goldBrightM = new THREE.MeshLambertMaterial({ color: "#f2c14e", emissive: "#8a6a10", emissiveIntensity: 0.25 });
  // three steps up to the pedestal
  const steps: [number, number][] = [[6.4, 0.3], [5.4, 0.3], [4.4, 0.3]];
  steps.forEach(([w, h], i) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), i % 2 ? stoneDarkM : stoneM);
    st.position.y = h / 2 + i * 0.3; st.castShadow = true; st.receiveShadow = true; g.add(st);
  });
  // pedestal
  const ped = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 2.4), stoneM);
  ped.position.y = 0.9 + 0.65; ped.castShadow = true; ped.receiveShadow = true; g.add(ped);
  const pedCap = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 2.7), stoneDarkM);
  pedCap.position.y = 0.9 + 1.3 + 0.11; pedCap.castShadow = true; g.add(pedCap);
  // the tall pillar (slightly tapered: two stacked boxes)
  const pil1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.4, 1.15), stoneM);
  pil1.position.y = 0.9 + 1.3 + 0.22 + 1.7; pil1.castShadow = true; g.add(pil1);
  const pil2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.0, 0.85), stoneM);
  pil2.position.y = 0.9 + 1.3 + 0.22 + 3.4 + 1.0; pil2.castShadow = true; g.add(pil2);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 1.35), goldM);
  collar.position.y = 0.9 + 1.3 + 0.22 + 3.4 + 0.09; collar.castShadow = true; g.add(collar);
  // the gold ring: the equator's circle, facing the camera
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.15, 12, 36), goldBrightM);
  ring.position.y = 0.9 + 1.3 + 0.22 + 5.4 + 1.05; ring.castShadow = true; g.add(ring);
  // the arrow above the ring, pointing straight up
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), goldM);
  shaft.position.y = 0.9 + 1.3 + 0.22 + 5.4 + 2.1 + 0.75; shaft.castShadow = true; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 8), goldBrightM);
  tip.position.y = 0.9 + 1.3 + 0.22 + 5.4 + 2.1 + 1.5 + 0.31; tip.castShadow = true; g.add(tip);
  // bronze plaque on the pedestal front (+Z, camera side)
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85),
    new THREE.MeshLambertMaterial({ map: plaqueTex() }));
  plaque.position.set(0, 0.9 + 0.65, 1.21); g.add(plaque);
  return g;
};

/** The dome pavilion sheltering the ORIGINAL small tugu: four
 *  columns + a terracotta dome over a miniature pillar + ring. */
const makeDomePavilion = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(plasterTex("pontianakDomeStone", "#e8dcc4"), 1, 1) });
  const terraM = lam2({ color: "#b85c38" });
  const goldM = lam2({ color: "#d9a441" });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.3, 20), stoneM);
  plat.position.y = 0.15; plat.castShadow = true; plat.receiveShadow = true; g.add(plat);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.6, 8), stoneM);
    col.position.set(Math.cos(a) * 1.9, 0.3 + 1.3, Math.sin(a) * 1.9); col.castShadow = true; g.add(col);
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), terraM);
  dome.position.y = 2.9; dome.castShadow = true; g.add(dome);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), goldM);
  finial.position.y = 2.9 + 2.3 + 0.1; g.add(finial);
  // the original small tugu inside
  const mini = new THREE.Group();
  const mBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), stoneM);
  mBase.position.y = 0.125; mini.add(mBase);
  const mPil = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), stoneM);
  mPil.position.y = 0.25 + 0.6; mini.add(mPil);
  const mRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 20), goldM);
  mRing.position.y = 0.25 + 1.2 + 0.3; mini.add(mRing);
  const mTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), goldM);
  mTip.position.y = 0.25 + 1.2 + 0.6 + 0.22; mini.add(mTip);
  mini.position.y = 0.3; g.add(mini);
  return g;
};

/** A simple two-storey shophouse for the far backdrop: plaster
 *  walls, a tiled roof, an awning, a sign band. Front faces +Z. */
const makeShophouse = (wallMat: THREE.MeshLambertMaterial, roofCol: string, signCol: string, w: number, h: number) => {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.5), wallMat);
  walls.position.y = h / 2; walls.castShadow = true; g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 1.6, 4), lam2({ color: roofCol }));
  roof.position.y = h + 0.8; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.7); roof.castShadow = true; g.add(roof);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.08, 1.1), lam2({ color: signCol }));
  awn.position.set(0, h * 0.45, 2.6); awn.rotation.x = 0.25; g.add(awn);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.7, 0.08), lam2({ color: "#f2ead6" }));
  sign.position.set(0, h * 0.82, 2.28); g.add(sign);
  const winM = lam2({ color: "#3d5a78" });
  for (const wx of [-w / 4, w / 4]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.08), winM);
    win.position.set(wx, h * 0.6, 2.27); g.add(win);
  }
  return g;
};

/** A small thatch-roof warung stall: counter, roof, hanging lamp. */
const makeWarung = () => {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.0), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
  counter.position.y = 0.5; counter.castShadow = true; g.add(counter);
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 7), lam2({ color: "#6a4a2c" }));
    post.position.set(s * 1.0, 1.2, 0); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), lam2({ map: rep(thatchTex("pontianakThatchWarung", "#8a6a34"), 2, 1) }));
  roof.position.y = 2.9; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.7); roof.castShadow = true; g.add(roof);
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.55 }));
  lampGlass.position.set(0, 2.3, 0); g.add(lampGlass);
  return g;
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
  private riverMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];
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
    // cloud sprites placed IN the cover camera's view corridor
    // (down -Z, low enough to sit in the upper frame). Layered near -> far.
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
    // the sun's halo + core, upper left down the plaza
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
    this.buildPlaza(R, r);
  }

  // ---------------- the plaza: paving, equator line, monument, river ----------------
  private buildPlaza(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the paved plaza disc, centred on the monument
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(26, 40), lam2({ map: rep(cobble(), 18, 18), color: "#d8cbb0" }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(MON[0], 0.02, MON[2]); plaza.receiveShadow = true; R.add(plaza);
    // the monument's raised circular platform
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.0, 0.24, 36), lam2({ map: rep(plasterTex("pontianakPlatform", "#cbbfa6"), 4, 1) }));
    plat.position.set(MON[0], 0.12, MON[2]); plat.receiveShadow = true; R.add(plat);
    // ---- THE EQUATOR LINE: red-white segments across the plaza,
    // straight through the monument base at z = EQUATOR_Z ----
    const segLen = 6, segW = 0.55;
    for (let i = -5; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.05, segW),
        lam2({ color: i % 2 === 0 ? "#d42f2f" : "#f6f0e0" }));
      seg.position.set(i * segLen + segLen / 2, 0.06, EQUATOR_Z);
      seg.receiveShadow = true; R.add(seg);
    }
    // a thin gold centre stripe along the whole line
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(60, 0.02, 0.08), lam2({ color: "#d9a441" }));
    stripe.position.set(0, 0.09, EQUATOR_Z); R.add(stripe);
    // ---- THE monument ----
    const mon = makeMonument();
    mon.position.set(MON[0], 0.24, MON[2]);
    R.add(mon);
    blob(R, MON[0], 0.26, MON[2], 8.5, 8.5, 0.30);
    // ---- the dome pavilion with the original small tugu ----
    const dome = makeDomePavilion();
    dome.position.set(DOME_POS[0], 0, DOME_POS[2]);
    R.add(dome);
    blob(R, DOME_POS[0], 0.06, DOME_POS[2], 6.5, 6.5, 0.28);
    // ---- the Kapuas river: brown-green water flowing far behind ----
    const riverMap = rep(water(), 8, 2);
    this.riverMap = riverMap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(150, 22), lam2({ map: riverMap, color: "#6a8a5a" }));
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0, -69); river.receiveShadow = true; R.add(river);
    // far bank: a grass strip + a soft tree line closing the horizon
    const farBank = new THREE.Mesh(new THREE.PlaneGeometry(150, 10), lam2({ map: rep(grassRichTex(), 12, 2) }));
    farBank.rotation.x = -Math.PI / 2; farBank.position.set(0, 0.1, -85); R.add(farBank);
    const greens = ["#3d7a32", "#4a8a3a", "#2e6a28"];
    for (let i = 0; i < 12; i++) {
      const t = makeTree(7 + (i % 3) * 1.8, greens, 90 + i * 7);
      t.position.set(-60 + i * 11, 0, -88 - (i % 2) * 6);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
    }
    // ---- palms + broadleaf trees ringing the plaza ----
    const palmPts: [number, number, number][] = [
      [14, -24, 7.5], [-15, -26, 8.2], [18, 2, 6.8], [-19, 4, 7.6], [10, -38, 8.6], [-12, -40, 7.2],
    ];
    palmPts.forEach(([x, z, h], i) => {
      const p = makePalm(h, 20 + i * 11);
      p.position.set(x, 0, z);
      R.add(p);
      this.palms.push({ g: p, ph: 2.2 + i * 1.43 });
      blob(R, x, 0.06, z, 1.6, 1.6, 0.25);
    });
    const treePts: [number, number][] = [];
    const treeRing: [number, number, number][] = [
      [22, -18, 5.2], [-23, -14, 4.6], [24, -34, 5.8], [-25, -32, 4.9], [16, -46, 5.5], [-17, -48, 5.0],
    ];
    treeRing.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      treePts.push([x, z]);
    });
    // ---- shophouses closing the far sides of the plaza ----
    const wallMats = [
      lam2({ map: rep(plasterTex("pontianakShopA", "#f0e6d2"), 2, 1) }),
      lam2({ map: rep(plasterTex("pontianakShopB", "#e8dcc4"), 2, 1) }),
      lam2({ map: rep(brickTex("pontianakShopC", "#9c6a4a"), 2, 1) }),
    ];
    const roofCols = ["#8a4a3a", "#3d5a78", "#7a4a42"];
    const signCols = ["#d83a4a", "#e8c832", "#2e7f86"];
    const shopAt = (x: number, z: number, i: number, yaw: number) => {
      const sh = makeShophouse(wallMats[i % wallMats.length], roofCols[i % roofCols.length], signCols[i % signCols.length], 7 + (i % 2) * 1.5, 5.2 + (i % 3) * 0.6);
      sh.position.set(x, 0, z);
      sh.rotation.y = yaw;
      R.add(sh);
      blob(R, x, 0.06, z, 9, 6, 0.22);
    };
    shopAt(-26, -44, 0, 0.25);
    shopAt(-14, -48, 1, 0.1);
    shopAt(24, -46, 2, -0.2);
    shopAt(34, -30, 0, -0.5);
    shopAt(-34, -28, 1, 0.5);
    // ---- the warung stall near the plaza edge ----
    const warung = makeWarung();
    warung.position.set(11, 0, 3);
    warung.rotation.y = -0.4;
    R.add(warung);
    blob(R, 11, 0.06, 3, 3.2, 3.2, 0.25);
    // ---- benches along the plaza rim ----
    for (const [bx, bz, byaw] of [[-8, 6, 0.3], [8, 8, -0.3]] as [number, number, number][]) {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
      seat.position.y = 0.55; seat.castShadow = true; bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
      back.position.set(0, 0.95, -0.28); back.rotation.x = -0.15; bench.add(back);
      for (const s of [1, -1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.55), lam2({ color: "#3a3a3a" }));
        leg.position.set(s * 0.95, 0.27, 0); bench.add(leg);
      }
      bench.position.set(bx, 0, bz); bench.rotation.y = byaw;
      R.add(bench);
    }
    // ---- grass dressing: tone pools, soil discs, bushes, tufts ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (16 + r() * 14), 0.128, -10 - r() * 40, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (16 + r() * 14), 0.129, -8 - r() * 42, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    const bushMats = [
      lam2({ color: greens[2], map: rep(foliageTex("pontianakFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("pontianakFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("pontianakFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, 0.1 + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 12;
      bushAt(Math.cos(a) * d, -12 + Math.sin(a) * d * 0.8, 0.45 + r() * 0.35, Math.floor(r() * 3));
    }
    // 3D grass tufts, instanced: dense fringes around the plaza rim
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let i = 0; i < 900; i++) {
      const a = r() * Math.PI * 2, d = 27 + r() * 16;
      pushTuft(Math.cos(a) * d, -12 + Math.sin(a) * d * 0.75, 0.75 + r() * 0.85);
    }
    for (let i = 0; i < 400; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (28 + r() * 20), z = 8 - r() * 70;
      pushTuft(x, z, 0.65 + r() * 0.8);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // wildflower clusters nestled in the lawns
    const fl2 = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6", "#e86a9a", "#9a6ae0"];
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = 28 + r() * 16;
      const cx = Math.cos(a) * d, cz = -12 + Math.sin(a) * d * 0.75;
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
    // CULMINATION (shot 5): the sun stands at the zenith — straight
    // overhead, so every cast shadow shrinks to a pool directly
    // under its object and the painted blobs vanish with it.
    const elDeg = id === 5 ? 85 : Lp.el;
    const az = THREE.MathUtils.degToRad(Lp.az), el = THREE.MathUtils.degToRad(elDeg);
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
    // the Kapuas flows behind the plaza (texture scroll, not a poster)
    if (this.riverMap) this.riverMap.offset.set(tt * 0.03, 0);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // palms sway wider — fronds catch the tropical wind
    for (const pm of this.palms) {
      pm.g.rotation.z = Math.sin(tt * 1.05 + pm.ph) * 0.022;
      pm.g.rotation.x = Math.cos(tt * 0.9 + pm.ph * 1.3) * 0.014;
    }
    // grass tufts bend with the same wind (phase travels across the lawn)
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
