// Trunyan, Bali as one three.js scene for the Fafnir-ID short:
// the eastern shore of Lake Batur in bright daylight — rippling
// lake water in the foreground, a wooden jukung bobbing at a
// small jetty, and the Sema Wayah cemetery clearing: the GIANT
// taru menyan tree with a vast layered canopy, ELEVEN triangular
// bamboo cages (ancak saji) in an arc beneath it with their
// white cloth bundles, a mossy stone altar with a row of skulls,
// Balinese houses and a split candi bentar gate to the right,
// forested ridges and Mount Batur closing the background. The
// hero stands on the stone path beside the cages, shocked at
// the claim. VISUAL CORE: bright tropical daylight, deep teal
// lake, saturated greens, warm bamboo and stone — textured
// everything (anti-banding: speckled sky, rippled water, woven
// bamboo). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, cobble, stone } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, TREE, CAGE_CLOSE, ALTAR, BOAT, SHORE_Z, boatBobAt, clamp01 } from "./story";

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
const skyTexDay = () => ctex("trunyanSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("trunyanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("trunyanBirds", 256, 96, (g, r) => {
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
/** RICH grass (anti-flat pass): deep shadow pockets, a mid-green
 *  body, sunlit fleck clusters and thousands of individual blades
 *  in five greens with hard value contrast. */
const grassRichTex = () => ctex("trunyanGrassRich", 1024, 1024, (g, r) => {
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
/** bare earth for tree bases and the cemetery floor: warm brown
 *  speckled with darker clods and pale grit, never a flat sticker */
const soilTex = () => ctex("trunyanSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("trunyanPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("trunyanBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for house walls + the white cloth wrap */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** woven thatch for the house roofs: dense strokes, light over dark */
const thatchTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6800; i++) {
    const x = r() * 512, y = r() * 512, l = 10 + r() * 26;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,230,165" : "36,22,8"},${0.09 + r() * 0.16})`;
    g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke();
  }
});
/** LAKE BATUR water: deep teal body, long ripple streaks running
 *  with the wind, pale crest flecks and sun glints — tiled big so
 *  the surface reads alive; world.update scrolls the offset. */
const lakeTex = () => ctex("trunyanLake", 1024, 1024, (g, r) => {
  const S = 1024;
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, "#1d6f7e"); grad.addColorStop(0.5, "#17616f"); grad.addColorStop(1, "#12505e");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { // ripple streaks, mostly horizontal
    const x = r() * S, y = r() * S, l = 14 + r() * 60;
    wrapDraw(S, x, y, 70, (xx, yy) => {
      g.strokeStyle = r() > 0.5 ? `rgba(190,240,235,${0.05 + r() * 0.10})` : `rgba(6,40,50,${0.06 + r() * 0.10})`;
      g.lineWidth = 1.4 + r() * 1.6;
      g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + l * 0.5, yy + (r() - 0.5) * 5, xx + l, yy); g.stroke();
    });
  }
  for (let i = 0; i < 420; i++) { // sun glints
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = `rgba(255,250,210,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 5, 0.8 + r() * 1.2, 0, 0, 7); g.fill();
    });
  }
});
/** pale volcanic sand for the shore strip */
const sandTex = () => ctex("trunyanSand", 512, 512, (g, r) => {
  g.fillStyle = "#c9b490"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,100,70" : "238,226,196"},${0.08 + r() * 0.14})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 26, 5 + r() * 14, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "90,74,48" : "250,242,220"},${0.10 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 1.7, 1.7); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(60,54,48,${0.25 + r() * 0.3})`; g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 2.4, 0, 7); g.fill(); } // dark volcanic pebbles
});
/** woven bamboo: crossing slats light over dark — the ancak saji
 *  lattice and the jetty fence */
const bambooTex = () => ctex("trunyanBamboo", 256, 256, (g, r) => {
  g.fillStyle = "#b99a58"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "240,220,160" : "110,84,40"},${0.08 + r() * 0.14})`;
    g.fillRect(r() * 256, r() * 256, 2, 2);
  }
  g.strokeStyle = "rgba(90,66,28,0.5)"; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
});
const blobTex = () => ctex("trunyanBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(20,26,16,0.62)"); gr.addColorStop(0.7, "rgba(20,26,16,0.30)"); gr.addColorStop(1, "rgba(20,26,16,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft ground shadow pool under a prop */
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1; parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** A tree with a REAL canopy (anti-flat pass): a bark-textured
 *  trunk with angled branches, and 9-13 overlapping foliage blobs
 *  in three depth layers — deep shadow green low, mid green main
 *  mass, sunlit flecks on top — all carrying a leaf-fleck texture
 *  so no surface is a smooth ball again. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "trunyanFoliageDeep"),
    folM(greens[0], "trunyanFoliageMid"),
    folM(greens[1] ?? greens[0], "trunyanFoliageLite"),
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

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced around the
 *  clearing so the grass edges stop being ruler-straight. */
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

/** THE TARU MENYAN: a giant — a buttressed trunk ~11 m to the
 *  first branches, then a canopy ~22 m wide built from ~26
 *  foliage blobs in three layers. Returns the trunk group; the
 *  canopy lives in its own group (registered for sway) pivoting
 *  at the crown. Hanging lianas + a few aerial roots sell the
 *  banyan-like age. */
const makeGiantTree = (canopy: THREE.Group) => {
  const g = new THREE.Group();
  const tr = rng(4242);
  const trunkM = lam2({ map: rep(barkTex(), 3, 4), color: "#8a6a48" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.9, 11, 12), trunkM);
  trunk.position.y = 5.5; trunk.castShadow = true; g.add(trunk);
  // buttress roots flaring into the clearing floor
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 6), trunkM);
    root.position.set(Math.cos(a) * 1.9, 0.9, Math.sin(a) * 1.9);
    root.rotation.set(Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85);
    root.castShadow = true; g.add(root);
  }
  // main branches reaching out under the canopy
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + tr() * 0.7;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 6.4, 7), trunkM);
    br.position.set(Math.cos(a) * 2.6, 10.6, Math.sin(a) * 2.6);
    br.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
    br.castShadow = true; g.add(br);
  }
  // ---- the canopy: three depth layers of foliage blobs ----
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  // liftK 2.6: the giant canopy is mostly seen from below / self-shadowed — without the extra shade lift
  // its undersides crush to navy under the day preset. Local to this tree's materials only.
  const folML = (hex: string, key: string) => {
    const mm = new THREE.MeshLambertMaterial({ color: hex, map: rep(foliageTex(key), 1, 1) });
    mm.name = key; return twoTone(mm, 2.6);
  };
  const mats = [
    folML("#38632c", "trunyanFoliageDeep"),
    folML("#55963f", "trunyanFoliageMid"),
    folML("#7cbd5a", "trunyanFoliageLite"),
  ];
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 11), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.34, 0.72 + tr() * 0.18, 1 + (tr() - 0.5) * 0.34);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; canopy.add(b);
  };
  for (let i = 0; i < 9; i++) { // deep underlayer, wide and low
    const a = tr() * Math.PI * 2, d = 4.5 + tr() * 5.5;
    blobAt(Math.cos(a) * d, -0.35 + tr() * 1.0, Math.sin(a) * d, 2.3 + tr() * 1.2, 0);
  }
  blobAt(0, 0.2, 0, 4.6, 1);
  for (let i = 0; i < 9; i++) { // main mass
    const a = tr() * Math.PI * 2, d = 3 + tr() * 6.5;
    blobAt(Math.cos(a) * d, 0.7 + tr() * 1.6, Math.sin(a) * d, 2.8 + tr() * 1.4, 1);
  }
  for (let i = 0; i < 7; i++) { // sunlit crown
    const a = tr() * Math.PI * 2, d = 1.5 + tr() * 5;
    blobAt(Math.cos(a) * d, 2.4 + tr() * 1.3, Math.sin(a) * d, 2.2 + tr() * 1.1, 2);
  }
  // hanging lianas from the canopy rim
  const lianaM = lam2({ color: "#4a5a2e" });
  for (let i = 0; i < 10; i++) {
    const a = tr() * Math.PI * 2, d = 6.5 + tr() * 3.5, len = 2.2 + tr() * 2.6;
    const li = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, len, 5), lianaM);
    li.position.set(Math.cos(a) * d, -len / 2 + 0.4, Math.sin(a) * d);
    canopy.add(li);
  }
  canopy.position.set(0, 12.6, 0);
  g.add(canopy);
  return g;
};

/** One ANCAK SAJI: a triangular-prism bamboo cage (~2.3 m long)
 *  — two sloped lattice sides meeting at a ridge pole, end
 *  triangles, and inside it the white cloth bundle resting on
 *  the ground (a rounded, cloth-textured form — stylised and
 *  respectful, no anatomy). Bamboo poles are real cylinders so
 *  the lattice catches light and shadow. */
const makeCage = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const poleM = lam2({ map: rep(bambooTex(), 1, 1), color: "#d8ba7a" });
  const darkM = lam2({ color: "#8a6c34" });
  const L = 2.3, W = 1.15, H = 1.05;
  const pole = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, rad = 0.035, m = poleM) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const len = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 6), m);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    mesh.castShadow = true; g.add(mesh);
  };
  // ridge + base rails
  pole(0, H, -L / 2, 0, H, L / 2, 0.05, darkM);
  pole(-W / 2, 0.03, -L / 2, -W / 2, 0.03, L / 2, 0.045, darkM);
  pole(W / 2, 0.03, -L / 2, W / 2, 0.03, L / 2, 0.045, darkM);
  // sloped side slats: verticals leaning to the ridge + horizontals
  for (const s of [1, -1]) {
    for (let i = 0; i <= 5; i++) {
      const z = -L / 2 + (i / 5) * L;
      pole(s * W / 2, 0.02, z, 0, H, z, 0.03);
    }
    for (const fy of [0.36, 0.68]) {
      pole(s * W / 2 * (1 - fy * 0.92), H * fy, -L / 2, s * W / 2 * (1 - fy * 0.92), H * fy, L / 2, 0.026);
    }
  }
  // end triangles
  for (const e of [1, -1]) {
    pole(-W / 2, 0.02, e * L / 2, W / 2, 0.02, e * L / 2, 0.04, darkM);
    pole(-W / 2, 0.02, e * L / 2, 0, H, e * L / 2, 0.03);
    pole(W / 2, 0.02, e * L / 2, 0, H, e * L / 2, 0.03);
  }
  // the white cloth bundle inside: a low rounded form, cloth
  // texture, a soft fold ridge along its length
  const clothM = lam2({ map: rep(plasterTex("trunyanCloth", "#f4efe2"), 2, 1), color: "#f7f2e4" });
  const bundle = new THREE.Mesh(new THREE.CapsuleGeometry(0.30, L * 0.62, 4, 10), clothM);
  bundle.rotation.x = Math.PI / 2; bundle.rotation.y = (tr() - 0.5) * 0.06;
  bundle.scale.set(1.25, 1, 0.62);
  bundle.position.y = 0.20; bundle.castShadow = true; g.add(bundle);
  const fold = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, L * 0.5, 3, 8), clothM);
  fold.rotation.x = Math.PI / 2; fold.position.set(0.05, 0.42, 0); g.add(fold);
  return g;
};

/** A stylised skull for the altar row: cream cranium, dark
 *  sockets, a jaw — cartoon shorthand, never graphic. */
const makeSkull = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 131 + 3);
  const boneM = lam2({ color: "#ece1c6", map: rep(plasterTex("trunyanBone", "#e9dfc6"), 1, 1) });
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), boneM);
  cranium.scale.set(0.92, 1.02, 1.08); cranium.position.y = 0.24; cranium.castShadow = true; g.add(cranium);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.22), boneM);
  jaw.position.set(0, 0.05, 0.05); jaw.castShadow = true; g.add(jaw);
  const darkM = lam2({ color: "#241a10" });
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), darkM);
    eye.position.set(s * 0.085, 0.27, 0.185); g.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), darkM);
  nose.position.set(0, 0.19, 0.21); g.add(nose);
  // a moss cap: it has rested here a long time
  const moss = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), lam2({ color: "#5d8142", map: rep(foliageTex("trunyanFoliageMid"), 1, 1) }));
  moss.scale.set(1, 0.45, 1); moss.position.set(0.03, 0.42, -0.02); moss.rotation.y = tr() * 3; g.add(moss);
  return g;
};

/** The stone altar: two stacked mossy stone slabs on a rubble
 *  base, with a row of skulls resting on top. */
const makeAltar = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(stone("trunyanAltarStone", ["#9a917e", "#8a8271", "#a89f8a", "#7d7666"]), 2, 1), color: "#b0a892" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 1.7), stoneM);
  base.position.y = 0.25; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.38, 1.35), stoneM);
  top.position.y = 0.69; top.castShadow = true; top.receiveShadow = true; g.add(top);
  // moss patches on the stone
  const mossM = lam2({ color: "#5d8142", map: rep(foliageTex("trunyanFoliageMid"), 1, 1) });
  for (const [x, z, s] of [[-1.2, 0.6, 0.7], [0.9, -0.55, 0.55], [1.5, 0.5, 0.4]] as [number, number, number][]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s * 0.4, 8, 6), mossM);
    m.scale.y = 0.3; m.position.set(x, 0.9, z); g.add(m);
  }
  // the row of skulls, facing the lake (+z local)
  [-1.25, -0.62, 0.05, 0.7, 1.32].forEach((x, i) => {
    const sk = makeSkull(i + 1);
    sk.position.set(x, 0.88, 0.12);
    sk.rotation.y = (i - 2) * 0.07;
    g.add(sk);
  });
  return g;
};

/** A wooden jukung: planked hull with raised bow + stern,
 *  gunwale rails, bench seats and twin outrigger floats on
 *  bamboo arms — the boat that ferries everyone to Sema Wayah.
 *  Bow faces -Z (toward the shore when placed). */
const makeBoat = () => {
  const g = new THREE.Group();
  const hullM = lam2({ map: rep(bambooTex(), 3, 1), color: "#9a6c3a" });
  const darkM = lam2({ color: "#6e4a26" });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 5.2), hullM);
  hull.position.y = 0.28; hull.castShadow = true; g.add(hull);
  for (const e of [1, -1]) { // raised, tapered ends
    const end = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), hullM);
    end.position.set(0, 0.52, e * 2.95); end.rotation.x = e * -0.5; end.castShadow = true; g.add(end);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 6), darkM);
    tip.position.set(0, 0.95, e * 3.3); tip.rotation.x = e * 0.5; g.add(tip);
  }
  for (const s of [1, -1]) { // gunwale rails
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 5.6), darkM);
    rail.position.set(s * 0.6, 0.6, 0); g.add(rail);
  }
  for (const z of [-1.5, 0, 1.5]) { // bench seats
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.4), darkM);
    seat.position.set(0, 0.48, z); g.add(seat);
  }
  // outriggers: bamboo arms + long floats, both sides
  const armM = lam2({ color: "#c8a55e" });
  for (const s of [1, -1]) {
    for (const z of [-1.6, 1.6]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), armM);
      arm.rotation.z = Math.PI / 2; arm.position.set(s * 1.1, 0.62, z); g.add(arm);
    }
    const float = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 3.4, 3, 8), armM);
    float.rotation.x = Math.PI / 2; float.position.set(s * 2.15, 0.08, 0); float.castShadow = true; g.add(float);
  }
  // a resting paddle across the stern bench
  const paddle = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), armM);
  paddle.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.04), darkM);
  blade.position.y = -1.05; paddle.add(blade);
  paddle.position.set(0.35, 0.75, 1.9); paddle.rotation.set(1.25, 0, 0.5);
  g.add(paddle);
  return g;
};

/** A Balinese house: stone base, plaster walls, a steep layered
 *  thatch roof, a carved wooden door + one shuttered window. */
const makeHouse = (w: number, h: number, wallCol: string, seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 517 + 9);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, 4.6), lam2({ map: rep(stone("trunyanHouseStone"), 2, 1), color: "#a89f8a" }));
  base.position.y = 0.25; base.receiveShadow = true; g.add(base);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.2), lam2({ map: rep(plasterTex(`trunyanPlaster${seed}`, wallCol), 2, 1) }));
  walls.position.y = 0.5 + h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ map: rep(thatchTex("trunyanThatch", "#8a6f42"), 2, 2), color: "#a8895a" });
  for (const s of [1, -1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.16, 5.4), roofM);
    slope.position.set(s * w * 0.26, 0.5 + h + 1.05, 0); slope.rotation.z = s * -0.72; slope.castShadow = true; g.add(slope);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 5.5), lam2({ color: "#5a4026" }));
  ridge.position.y = 0.5 + h + 1.95; g.add(ridge);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.08), lam2({ color: "#6e4a26" }));
  door.position.set(-w * 0.22, 1.45, 2.12); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.08), lam2({ color: "#2c4258" }));
  win.position.set(w * 0.26, 0.5 + h * 0.55, 2.12); g.add(win);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.14, 0.05), lam2({ color: "#f0ead8" }));
  frame.position.set(w * 0.26, 0.5 + h * 0.55, 2.1); g.add(frame);
  void r;
  return g;
};

/** A candi bentar split gate: two mirrored stepped stone towers
 *  with a gap between — the village's ceremonial entrance. */
const makeGate = () => {
  const g = new THREE.Group();
  const stoneM = lam2({ map: rep(stone("trunyanGateStone", ["#8a8271", "#7d7666", "#9a917e", "#6e675a"]), 1, 2), color: "#a39a86" });
  for (const s of [1, -1]) {
    const half = new THREE.Group();
    let w = 1.7;
    for (let i = 0; i < 5; i++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 0.85, 1.5 - i * 0.14), stoneM);
      tier.position.set(s * (0.55 + (1.7 - w) / 2), 0.43 + i * 0.85, 0);
      tier.castShadow = true; tier.receiveShadow = true; half.add(tier);
      w *= 0.82;
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), stoneM);
    cap.position.set(s * 0.85, 4.65, 0); cap.rotation.y = Math.PI / 4; cap.castShadow = true; half.add(cap);
    g.add(half);
  }
  return g;
};

/** A forested mountain: a broad cone with layered green + a
 *  rocky, misty crown — background silhouettes for the caldera. */
const makeMountain = (rad: number, h: number, seed = 1) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 24, 3),
    lam2({ color: "#3d6b4a", map: rep(foliageTex("trunyanFoliageDeep"), 4, 2) }));
  body.position.y = h / 2 - 2; g.add(body);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.34, h * 0.36, 18),
    lam2({ color: "#7a7f74", map: rep(stone("trunyanRock", ["#8a8d84", "#767a70", "#969a90"]), 3, 1) }));
  crown.position.y = h * 0.82 - 2; g.add(crown);
  void seed;
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
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private canopy: THREE.Group | null = null;
  private boat: THREE.Group | null = null;
  private lakeMap: THREE.Texture | null = null;
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1717);
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
    // the sun's halo + core
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
    this.buildScene(R, r);
  }

  // ---------------- the shore: lake, clearing, the tree, the village ----------------
  private buildScene(R: THREE.Group, r: () => number) {
    // base ground under everything
    const base = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ color: "#44523e" }));
    base.rotation.x = -Math.PI / 2; base.position.set(0, -0.14, -20); base.receiveShadow = true; R.add(base);
    // the land: rich grass running back from the shore
    const land = new THREE.Mesh(new THREE.PlaneGeometry(420, 190), lam2({ map: rep(grassRichTex(), 26, 12) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.02, SHORE_Z - 95); land.receiveShadow = true; R.add(land);
    // THE LAKE: a huge rippling plane from the shore to the horizon
    const lakeM = lam2({ map: rep(lakeTex(), 12, 6) });
    this.lakeMap = lakeM.map as THREE.Texture;
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(560, 300), lakeM);
    lake.rotation.x = -Math.PI / 2; lake.position.set(0, -0.07, SHORE_Z + 148); lake.receiveShadow = true; R.add(lake);
    // the shore strip: pale volcanic sand easing into the water
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(420, 7), lam2({ map: rep(sandTex(), 30, 1) }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.005, SHORE_Z + 0.8); sand.receiveShadow = true; R.add(sand);
    // the cemetery floor: bare packed earth under the great tree
    const floor = new THREE.Mesh(new THREE.CircleGeometry(13.5, 28), lam2({ map: rep(soilTex(), 7, 7) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(TREE[0], 0.012, TREE[2] + 1); floor.receiveShadow = true; R.add(floor);
    // the stone path: jetty -> clearing -> tree
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 30), lam2({ map: rep(cobble(), 1, 12), color: "#b8b0a0" }));
    path.rotation.x = -Math.PI / 2; path.position.set(0.8, 0.02, -7); path.receiveShadow = true; R.add(path);
    const path2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 12), lam2({ map: rep(cobble(), 1, 5), color: "#b0a894" }));
    path2.rotation.x = -Math.PI / 2; path2.rotation.z = 0.5; path2.position.set(-4.5, 0.02, -11); path2.receiveShadow = true; R.add(path2);

    // ---- THE TARU MENYAN itself ----
    const canopy = new THREE.Group();
    const giant = makeGiantTree(canopy);
    giant.position.set(TREE[0], 0, TREE[2]);
    R.add(giant);
    this.canopy = canopy;
    blob(R, TREE[0], 0.03, TREE[2], 12, 12, 0.42);
    // offerings resting against the trunk
    const off1 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 10), lam2({ color: "#7fae4c" }));
    off1.position.set(1.6, 0.06, TREE[2] + 2.2); R.add(off1);

    // ---- ELEVEN ancak saji in their arc under the tree ----
    const arcAngles = [-1.15, -0.92, -0.69, -0.46, -0.23, 0, 0.259, 0.49, 0.72, 0.95, 1.18];
    arcAngles.forEach((a, i) => {
      const cx = TREE[0] + Math.sin(a) * 7.0, cz = TREE[2] + Math.cos(a) * 7.0;
      const cage = makeCage(i + 1);
      cage.position.set(cx, 0.02, cz);
      cage.rotation.y = a + Math.PI / 2 + (r() - 0.5) * 0.14; // long axis tangent to the arc
      R.add(cage);
      blob(R, cx, 0.03, cz, 3.0, 2.0, 0.35);
    });

    // ---- the stone altar with its row of skulls ----
    const altar = makeAltar();
    altar.position.set(ALTAR[0], 0, ALTAR[2]);
    altar.rotation.y = 0.35;
    R.add(altar);
    blob(R, ALTAR[0], 0.03, ALTAR[2], 4.6, 2.6, 0.4);
    // a low rubble wall behind the altar
    const wallM = lam2({ map: rep(stone("trunyanWallStone"), 4, 1), color: "#a39a86" });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.85, 0.6), wallM);
    wall.position.set(ALTAR[0] - 0.5, 0.42, ALTAR[2] - 1.8); wall.rotation.y = 0.35; wall.castShadow = true; wall.receiveShadow = true; R.add(wall);

    // ---- the jetty + the boat ----
    const jettyM = lam2({ map: rep(bambooTex(), 2, 4), color: "#a8845a" });
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 7.5), jettyM);
    jetty.position.set(BOAT[0], 0.32, 11.5); jetty.castShadow = true; jetty.receiveShadow = true; R.add(jetty);
    const postM = lam2({ color: "#6e5133" });
    for (const [px, pz] of [[BOAT[0] - 0.95, 8.6], [BOAT[0] + 0.95, 8.6], [BOAT[0] - 0.95, 14.6], [BOAT[0] + 0.95, 14.6]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 7), postM);
      post.position.set(px, -0.1, pz); R.add(post);
    }
    const boat = makeBoat();
    boat.position.set(BOAT[0], 0, BOAT[2]);
    boat.rotation.y = 0.22;
    R.add(boat);
    this.boat = boat;
    blob(R, BOAT[0], -0.02, BOAT[2], 3.4, 6.4, 0.3);
    // a second, smaller boat beached on the sand
    const boat2 = makeBoat();
    boat2.scale.setScalar(0.82);
    boat2.position.set(11.5, 0.18, 5.2); boat2.rotation.set(0, -0.7, 0.06);
    R.add(boat2);
    blob(R, 11.5, 0.03, 5.2, 3.2, 5.6, 0.35);

    // ---- the village: houses + the split gate, right side ----
    const gate = makeGate();
    gate.position.set(13.5, 0, 0.5); gate.rotation.y = Math.PI / 2 - 0.25;
    R.add(gate);
    blob(R, 13.5, 0.03, 0.5, 5.4, 3.4, 0.35);
    const houseCols = ["#e3d7bd", "#d9c8a8", "#cdbb96"];
    ([[20, -7, 4.6, 3.4, 0], [25.5, -17, 5.4, 3.9, 1], [20.5, -28, 4.8, 3.5, 2]] as [number, number, number, number, number][]).forEach(([hx, hz, hw, hh, i]) => {
      const house = makeHouse(hw, hh, houseCols[i % 3], i + 1);
      house.position.set(hx, 0, hz);
      house.rotation.y = -Math.PI / 2 + (i - 1) * 0.14;
      R.add(house);
      blob(R, hx, 0.03, hz, hw + 2.5, 6.5, 0.3);
    });

    // ---- forest ring around the clearing + shore palms ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const forestPts: [number, number, number][] = [
      [-14, -6, 6.5], [-17, -16, 7.5], [-15, -28, 6.8], [-9, -36, 7.8], [8, -34, 7.2],
      [14, -30, 6.4], [16, -20, 7.6], [-20, 0, 6.2], [10, -40, 8.2], [-4, -42, 7.4],
    ];
    forestPts.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 60 + i * 13);
      t.position.set(x, 0, z); R.add(t);
      this.trees.push({ g: t, ph: 2.2 + i * 1.47 });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9 + r() * 0.3, 12), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, 0.015, z);
      disc.receiveShadow = true; R.add(disc);
    });
    for (const [x, z, h] of [[-9, 4.5, 8.5], [15, 3.5, 9.2], [-14, 2, 7.8]] as [number, number, number][]) {
      const palm = makeTree(h, ["#3f8a3a", "#63b452", "#2c5c2c"], Math.round(x * 7 + z));
      palm.position.set(x, 0, z); palm.rotation.z = (x > 0 ? -1 : 1) * 0.05;
      R.add(palm);
      this.trees.push({ g: palm, ph: x * 0.9 + z });
    }

    // ---- the caldera backdrop: ridges + Mount Batur + Mount Abang ----
    const ridge = makeMountain(120, 34, 3);
    ridge.position.set(-30, 0, -120); ridge.scale.set(1.6, 1, 0.7); R.add(ridge);
    const ridge2 = makeMountain(100, 28, 4);
    ridge2.position.set(90, 0, -105); ridge2.scale.set(1.5, 1, 0.7); R.add(ridge2);
    const batur = makeMountain(85, 64, 5);
    batur.position.set(-75, 0, -195); R.add(batur);
    const abang = makeMountain(98, 72, 6);
    abang.position.set(100, 0, -220); R.add(abang);

    // ---- grass tufts around the clearing's edge ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const a = r() * Math.PI * 2, d = 12.8 + r() * 5.5;
      tuftPts.push({ x: TREE[0] + Math.cos(a) * d, z: TREE[2] + 1 + Math.sin(a) * d * 0.85, s: 0.7 + r() * 0.7 });
    }
    for (let i = 0; i < 90; i++) {
      tuftPts.push({ x: -12 + r() * 26, z: 2.5 + r() * 3.5, s: 0.6 + r() * 0.6 });
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
    // sun pools + shade pools so the ground reads layered
    for (let i = 0; i < 8; i++) {
      softPatch(R, patchTex(), "#e8f4a4", -14 + r() * 30, 0.03, 4 - r() * 40, 3.5 + r() * 3, 4 + r() * 5, 0.13 + r() * 0.08, r() * 3);
    }
    for (let i = 0; i < 6; i++) {
      softPatch(R, blobTex(), "#5d6a58", -12 + r() * 26, 0.03, 2 - r() * 36, 4 + r() * 3, 5 + r() * 4, 0.2 + r() * 0.08, r() * 3);
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
    // the lake surface crawls: the ripple texture scrolls slowly
    if (this.lakeMap) {
      this.lakeMap.offset.set((tt * 0.0045) % 1, (tt * 0.011) % 1);
    }
    // the jukung rides the lake: bob + a gentle roll, always
    if (this.boat) {
      this.boat.position.y = boatBobAt(tt);
      this.boat.rotation.z = Math.sin(tt * 0.9) * 0.02;
      this.boat.rotation.x = Math.sin(tt * 0.66) * 0.012;
    }
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // the great canopy breathes in the breeze (pivot at the crown)
    if (this.canopy) {
      this.canopy.rotation.z = Math.sin(tt * 1.05) * 0.007;
      this.canopy.rotation.x = Math.cos(tt * 0.8) * 0.005;
    }
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // clearing tufts bend with the same wind (phase travels)
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
