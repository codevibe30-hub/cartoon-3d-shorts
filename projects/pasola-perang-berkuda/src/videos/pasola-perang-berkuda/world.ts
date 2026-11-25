// Pasola, Sumba Barat as one three.js scene for the Fafnir-ID
// format: a sun-beaten savanna arena where two ranks of
// horsemen charge each other with blunt wooden spears — golden
// grass, red dust, megalithic stone tombs and tall-roofed uma
// houses around the field, and the sea glittering beyond the
// southern beach where the nyale worms come ashore. VISUAL
// CORE: hot dry-season daylight, textured everything
// (anti-banding: speckled sky, flecked hide, straw-grain
// thatch, scuffed red dirt). Layered light rig: sun key w/
// soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, FIELD_Y, RACK, SPROUT, TOMB, RATO_SPOT, riderAt, RiderPose, clamp01 } from "./story";

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
const skyTexDay = () => ctex("pasolaSkyDay2", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#c3d9ef"); grad.addColorStop(1, "#f2ecd8");
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
const glowTex = () => ctex("pasolaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("pasolaBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture in dry olive greens */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#a8b394"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(43,56,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(238,244,214,${0.12 + r() * 0.22})` : `rgba(38,54,26,${0.10 + r() * 0.18})`;
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
/** DRY savanna ground: golden packed earth and straw grass —
 *  umber pockets, a straw-tan body, pale grit and thousands of
 *  dry blades in ochres and olive drabs. */
const dryGroundTex = () => ctex("pasolaDryGround", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#9a7c4c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "84,60,30" : "196,164,100";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(232,214,150,${0.10 + r() * 0.20})` : `rgba(56,40,18,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#6d5a24", "#8a7433", "#a8903e", "#c9bd6a", "#7a7a3a"];
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
  for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "52,38,20" : "214,190,140"},${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.4, 0, 7); g.fill(); }
});
/** the arena dirt: red-brown earth scuffed by a thousand hooves */
const arenaTex = () => ctex("pasolaArena", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#96683f"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "110,72,40" : "188,142,92";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // hoof scuffs: short pale arcs scattered everywhere
  for (let i = 0; i < 2600; i++) {
    const x = r() * S, y = r() * S;
    g.strokeStyle = `rgba(${r() > 0.5 ? "226,192,140" : "70,44,22"},${0.10 + r() * 0.18})`;
    g.lineWidth = 2 + r() * 2;
    g.beginPath(); g.arc(x, y, 3 + r() * 5, r() * 3, r() * 3 + 1.6); g.stroke();
  }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "238,214,160" : "60,38,18"},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** beach sand: pale warm grains with shell flecks */
const sandTex = () => ctex("pasolaSand", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d9bd8a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "240,222,175" : "178,148,100"},${0.10 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, 30 + r() * 90, 16 + r() * 50, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,248,225" : "150,120,76"},${0.08 + r() * 0.16})`; g.fillRect(r() * S, r() * S, 2, 2); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(250,244,235,${0.3 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 3, 1.4 + r() * 2, r() * 3, 0, 7); g.fill(); }
});
/** horse hide: a warm base with dapples, darker points and grain */
const hideTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,230,190" : "30,18,8"},${0.04 + r() * 0.06})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 44, 10 + r() * 30, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 900; i++) { // dapples: faint rings
    g.strokeStyle = `rgba(255,240,210,${0.05 + r() * 0.07})`; g.lineWidth = 1.6;
    g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 6, 0, 7); g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,238,205" : "24,14,6"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** ikat cloth: bold woven bands + diamond motifs */
const ikatTex = (key: string, base: string, band: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    g.fillStyle = band; g.fillRect(0, y + 22, 256, 20);
    g.fillStyle = "rgba(255,240,200,0.8)";
    for (let x = 16; x < 256; x += 42) {
      g.save(); g.translate(x, y + 32); g.rotate(Math.PI / 4); g.fillRect(-5, -5, 10, 10); g.restore();
    }
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 2, 1.4); }
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
/** megalith stone: grey-brown, pocked and cracked */
const stoneTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#8d8474"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "196,188,168" : "84,76,62"},${0.08 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 70, 14 + r() * 44, r() * 3, 0, 7); g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    let x = r() * 512, yy = r() * 512;
    g.strokeStyle = `rgba(40,34,26,${0.25 + r() * 0.2})`; g.lineWidth = 1.4 + r() * 1.4;
    g.beginPath(); g.moveTo(x, yy);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 30; yy += 16 + r() * 26; g.lineTo(x, yy); }
    g.stroke();
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "230,224,205" : "40,34,26"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** a palm frond: a rib with long leaflets, alpha-cut */
const frondTex = () => ctex("pasolaFrond", 256, 128, (g, r) => {
  g.clearRect(0, 0, 256, 128);
  g.strokeStyle = "#4d6d2f"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(4, 64); g.quadraticCurveTo(128, 52, 252, 70); g.stroke();
  for (let i = 0; i < 26; i++) {
    const u = i / 25, x = 12 + u * 232, y = 64 - Math.sin(u * Math.PI) * 10 + u * 8;
    const l = 34 + Math.sin(u * Math.PI) * 26;
    g.strokeStyle = `rgba(${86 + r() * 30},${118 + r() * 30},52,0.95)`; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - l * 0.62); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + l * 0.58); g.stroke();
  }
});
const blobTex = () => ctex("pasolaBlob", 256, 256, (g) => {
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

/** A savanna tree: a leaning trunk and a FLAT-topped canopy of
 *  layered foliage blobs (never a green ball). */
const makeSavTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#7a6248", map: rep(hideTex("pasolaBark" + seed, "#6d5a44"), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, h * 0.52, 8), trunkM);
  trunk.position.y = h * 0.26; trunk.rotation.z = (tr() - 0.5) * 0.22; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, h * 0.34, 6), trunkM);
    br.position.set(Math.cos(a) * h * 0.11, h * 0.6, Math.sin(a) * h * 0.11);
    br.rotation.set(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7);
    g.add(br);
  }
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "pasolaFoliageDeep"), folM(greens[0], "pasolaFoliageMid"), folM(greens[1] ?? greens[0], "pasolaFoliageLite")];
  const cy = h * 0.82, cr = h * 0.42;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.42 + tr() * 0.1, 1 + (tr() - 0.5) * 0.3); // the flat umbrella top
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  blobAt(0, cy, 0, cr * 0.95, 1);
  for (let i = 0; i < 5; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.5 + tr() * 0.5);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.5) * cr * 0.16, Math.sin(a) * d, cr * (0.45 + tr() * 0.22), i % 2 ? 0 : 2);
  }
  return g;
};

/** A lontar palm: a trunk of stacked, slowly curving segments
 *  and a crown of drooping painted fronds. */
const makePalm = (h: number, lean: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const trunkM = lam2({ color: "#8a7358", map: rep(hideTex("pasolaPalmTrunk" + seed, "#77644c"), 1, 3) });
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
  const nutM = lam2({ color: "#6d5a24" });
  for (let i = 0; i < 4; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), nutM);
    nut.position.set(x + (tr() - 0.5) * 0.4, y - 0.14, (tr() - 0.5) * 0.4); g.add(nut);
  }
  return g;
};

/** A megalithic stone tomb: four squat supports, a massive
 *  flat slab, a cap stone — Sumba's signature graves. */
const makeTomb = (stoneM: THREE.MeshLambertMaterial, s = 1) => {
  const g = new THREE.Group();
  for (const [sx, sz] of [[-1.05, -0.6], [1.05, -0.6], [-1.05, 0.6], [1.05, 0.6]] as [number, number][]) {
    const sup = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.85, 0.52), stoneM);
    sup.position.set(sx, 0.42, sz); sup.castShadow = true; sup.receiveShadow = true; g.add(sup);
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 1.9), stoneM);
  slab.position.y = 1.06; slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.1), stoneM);
  cap.position.y = 1.47; cap.rotation.y = 0.04; cap.castShadow = true; g.add(cap);
  g.scale.setScalar(s);
  return g;
};

/** An uma: a timber house under a towering thatched roof —
 *  the roof IS the house in Sumba. */
const makeUma = (seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 191 + 3);
  const wallM = lam2({ color: "#8a6a48", map: rep(planks(), 2, 1) });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.9, 3.8), wallM);
  walls.position.y = 0.95; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ map: rep(thatchTex("pasolaThatch" + seed), 2, 2), color: "#c8a86a" });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 5.4, 4), roofM);
  roof.position.y = 1.9 + 2.7; roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.18, 1, 0.98);
  roof.castShadow = true; g.add(roof);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.34), wallM);
  peak.position.y = 7.55; g.add(peak);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.08), lam2({ color: "#3a2a16" }));
  door.position.set(0.6, 0.72, 1.93); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.4 }));
  win.position.set(-1.2, 1.15, 1.93); g.add(win);
  void r;
  return g;
};

/** One dry grass tuft: seven tapered blades fanned from a dark
 *  root, vertex-coloured dark base -> straw tip. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#4d4218"), tip = new THREE.Color("#c9bd6a"), tmp = new THREE.Color();
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

// ---------------- the horses ----------------
type HorseRig = {
  g: THREE.Group; legs: THREE.Group[]; lowers: THREE.Group[]; tail: THREE.Group;
  head: THREE.Group; body: THREE.Group; spray: THREE.Sprite[];
  phase: number; lastX: number; lastZ: number; seed: number;
};
/** One Sandalwood pony, facing -Z: a compact barrel body, an
 *  arched neck, a fine head with pricked ears and a dark mane,
 *  an ikat saddle cloth in its side's colours, and the rider's
 *  blunt spear carried upright at the saddle. Legs pivot at the
 *  shoulder/hip so update() can gallop them. */
const makeHorse = (hide: string, clothKey: string, clothBase: string, clothBand: string, seed: number): HorseRig => {
  const g = new THREE.Group();
  const r = rng(seed * 421 + 7);
  const hideM = lam2({ map: rep(hideTex("pasolaHide" + seed, hide), 1, 1) });
  const darkM = lam2({ color: "#2c1e10" });
  const maneM = lam2({ color: "#241708" });
  const body = new THREE.Group(); body.position.y = 1.24; g.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.74, 14, 10), hideM);
  torso.scale.set(0.54, 0.56, 1.1); torso.castShadow = true; body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), hideM);
  chest.position.set(0, -0.03, -0.76); chest.scale.set(0.9, 0.95, 0.85); body.add(chest);
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hideM);
  rump.position.set(0, 0.03, 0.7); rump.scale.set(0.92, 0.92, 0.85); body.add(rump);
  // neck: a thick angled column rising to the head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.23, 0.7, 9), hideM);
  neck.position.set(0, 0.36, -0.92); neck.rotation.x = -0.62; neck.castShadow = true; body.add(neck);
  // mane: a dark crest strip along the neck's top edge
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.3), maneM);
  mane.position.set(0, 0.44, -0.78); mane.rotation.x = -0.62; body.add(mane);
  // head on a pivot at the neck top
  const head = new THREE.Group(); head.position.set(0, 0.68, -1.16); body.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.38, 0.66), hideM);
  skull.position.set(0, -0.04, -0.18); skull.rotation.x = 0.58; skull.castShadow = true; head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.24, 0.34), hideM);
  muzzle.position.set(0, -0.28, -0.46); muzzle.rotation.x = 0.58; head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), darkM);
  nose.position.set(0, -0.36, -0.56); nose.rotation.x = 0.52; head.add(nose);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.17, 6), hideM);
    ear.position.set(s * 0.10, 0.23, 0.04); ear.rotation.z = s * -0.16; head.add(ear);
  }
  const forelock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), maneM);
  forelock.position.set(0, 0.2, -0.06); forelock.rotation.x = 0.4; head.add(forelock);
  // the ikat saddle cloth + side drapes in the side's colours
  const clothM = lam2({ map: rep(ikatTex(clothKey, clothBase, clothBand), 1, 1) });
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.88), clothM);
  cloth.position.set(0, 0.46, 0.02); cloth.castShadow = true; body.add(cloth);
  for (const s of [1, -1]) {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.8), clothM);
    drape.position.set(s * 0.37, 0.22, 0.02); body.add(drape);
  }
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.045, 0.9), lam2({ color: "#f6c83c" }));
  trim.position.set(0, 0.4, 0.02); body.add(trim);
  // legs: pivot groups at shoulder/hip, lower leg + hoof below
  const legs: THREE.Group[] = []; const lowers: THREE.Group[] = [];
  for (const [lx, lz] of [[-0.24, -0.55], [0.24, -0.55], [-0.24, 0.58], [0.24, 0.58]] as [number, number][]) {
    const pivot = new THREE.Group(); pivot.position.set(lx, 1.06, lz); g.add(pivot);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.056, 0.54, 7), hideM);
    upper.position.y = -0.27; upper.castShadow = true; pivot.add(upper);
    const lower = new THREE.Group(); lower.position.y = -0.54; pivot.add(lower);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.44, 7), hideM);
    shin.position.y = -0.2; lower.add(shin);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.17), darkM);
    hoof.position.set(0, -0.44, -0.01); lower.add(hoof);
    legs.push(pivot); lowers.push(lower);
  }
  // tail: pivot at the rump, long and dark
  const tail = new THREE.Group(); tail.position.set(0, 1.52, 0.98); g.add(tail);
  const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.018, 0.86, 6), maneM);
  tailMesh.position.y = -0.42; tail.add(tailMesh);
  const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 6), maneM);
  tuft.position.y = -0.92; tuft.rotation.x = Math.PI; tail.add(tuft);
  // the rider's spear, carried upright at the saddle: a long
  // wooden shaft with a BLUNT rounded tip (the modern rule)
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 1.9, 6), lam2({ color: "#9a6a3a" }));
  spear.add(shaft);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.037, 7, 6), lam2({ color: "#c9a061" }));
  tip.position.y = 0.97; tip.scale.y = 1.5; spear.add(tip);
  spear.position.set(0.37, 1.78, -0.18); spear.rotation.x = -0.34; spear.rotation.z = 0.1;
  g.add(spear);
  blob(g, 0, 0.03, 0, 1.8, 2.9, 0.30);
  // dust spray sprites, recycled by update() while charging
  const spray: THREE.Sprite[] = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#c9ab74", transparent: true, depthWrite: false, opacity: 0 }));
    sp.layers.set(NOINK); g.add(sp); spray.push(sp);
  }
  void r;
  return { g, legs, lowers, tail, head, body, spray, phase: seed * 1.7, lastX: 0, lastZ: 0, seed };
};

/** A far rank horse for the wide standoff shot: a simplified
 *  silhouette rig (no leg pivots) posed mid-gallop. */
const makeFarHorse = (hide: string, cloth: string, seed: number) => {
  const g = new THREE.Group();
  const hideM = lam2({ color: hide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.74, 10, 8), hideM);
  body.scale.set(0.54, 0.56, 1.1); body.position.y = 1.24; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.7, 7), hideM);
  neck.position.set(0, 1.58, -0.92); neck.rotation.x = -0.62; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.62), hideM);
  head.position.set(0, 1.86, -1.3); head.rotation.x = 0.52; g.add(head);
  const clothM = lam2({ color: cloth });
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.84), clothM);
  cl.position.set(0, 1.68, 0.02); g.add(cl);
  const legM = hideM;
  const poses: [number, number][] = [[-0.9, 0.3], [-0.5, -0.4], [0.85, -0.3], [0.5, 0.45]]; // gallop: fronts reach, backs drive
  [[-0.24, -0.55], [0.24, -0.55], [-0.24, 0.58], [0.24, 0.58]].forEach(([lx, lz], i) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 1.02, 6), legM);
    leg.position.set(lx, 0.62, lz + poses[i][1] * 0.5);
    leg.rotation.x = poses[i][0];
    g.add(leg);
  });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.8, 5), lam2({ color: "#241708" }));
  tail.position.set(0, 1.35, 1.1); tail.rotation.x = 0.5; g.add(tail);
  void seed;
  return g;
};

/** A flying spear (shaft along +Z so lookAt aims it). */
const makeFlySpear = () => {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.02, 0.023, 1.7, 6);
  geo.rotateX(Math.PI / 2);
  const shaft = new THREE.Mesh(geo, lam2({ color: "#9a6a3a" }));
  g.add(shaft);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 6), lam2({ color: "#c9a061" }));
  tip.position.z = 0.88; tip.scale.z = 1.6; g.add(tip);
  return g;
};

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
  private seaMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private flags: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private foam: THREE.Mesh | null = null;
  // ---- the cast of horses ----
  private rigs: HorseRig[][] = [[], []]; // [side A crimson][side B indigo]
  private farHerd: THREE.Group[] = [];
  private flySpears: THREE.Group[] = [];
  private sprouts: THREE.Group | null = null;
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#a8906a", 0.55);
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
    this.buildBeach(R, r);
    // ---- the eight hero horses: 4 crimson (A) + 4 indigo (B) ----
    const hides = ["#7a4a2a", "#4a3220", "#96603a", "#8a7a68"];
    for (let idx = 0; idx < 4; idx++) {
      const a = makeHorse(hides[idx % 4], "pasolaIkatA", "#a8232a", "#f6c83c", idx * 3 + 11);
      R.add(a.g); this.rigs[0].push(a);
      const b = makeHorse(hides[(idx + 2) % 4], "pasolaIkatB", "#2e4a9e", "#f2ede2", idx * 5 + 23);
      R.add(b.g); this.rigs[1].push(b);
    }
    // ---- far ranks for the wide standoff (shot 2) ----
    for (let i = 0; i < 6; i++) {
      const fa = makeFarHorse(hides[i % 4], "#a8232a", i);
      fa.position.set(-16 + i * 6.4, FIELD_Y, -60 - (i % 2) * 3);
      fa.rotation.y = Math.PI;
      R.add(fa); this.farHerd.push(fa);
      const fb = makeFarHorse(hides[(i + 1) % 4], "#2e4a9e", i + 9);
      fb.position.set(-16 + i * 6.4 + 3, FIELD_Y, 60 + (i % 2) * 3);
      R.add(fb); this.farHerd.push(fb);
    }
    // ---- flying spears + the answering sprouts ----
    for (let i = 0; i < 3; i++) { const sp = makeFlySpear(); R.add(sp); this.flySpears.push(sp); }
    const sprouts = new THREE.Group();
    const bladeM = lam2({ color: "#4d9b3a" });
    const bladeM2 = lam2({ color: "#67b34d" });
    for (let i = 0; i < 16; i++) {
      const bl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42 + (i % 4) * 0.09, 5), i % 2 ? bladeM : bladeM2);
      const a = (i / 16) * Math.PI * 2, d = 0.2 + (i % 5) * 0.16;
      bl.position.set(SPROUT[0] + Math.cos(a) * d, 0.2, SPROUT[2] + Math.sin(a) * d);
      bl.rotation.z = Math.cos(a) * 0.24; bl.rotation.x = Math.sin(a) * 0.24;
      sprouts.add(bl);
    }
    sprouts.position.y = FIELD_Y;
    R.add(sprouts);
    this.sprouts = sprouts;
  }

  // ---------------- the field: arena, fences, tombs, houses, trees ----------------
  private buildField(R: THREE.Group, r: () => number) {
    // base land: golden savanna under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(dryGroundTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, 0.08, -20); land.receiveShadow = true; R.add(land);
    // the worn dirt arena the horses thunder over
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(22.5, 130), lam2({ map: rep(arenaTex(), 3, 18), color: "#d8b58e" }));
    arena.rotation.x = -Math.PI / 2; arena.position.set(0, FIELD_Y, 0); arena.receiveShadow = true; R.add(arena);
    // ---- crowd fences: posts + double rails along both edges ----
    const postM = lam2({ color: "#6d4c2c", map: rep(planks(), 1, 1) });
    for (const s of [1, -1]) {
      for (let z = -56; z <= 56; z += 4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), postM);
        post.position.set(s * 12.5, 0.55, z); post.castShadow = true; R.add(post);
      }
      for (const ry of [0.62, 1.02]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 114), postM);
        rail.position.set(s * 12.5, ry, 0); R.add(rail);
      }
    }
    // corner flags: the field's four corners, flying hard
    const flagCols = ["#c22e2e", "#2e4a9e", "#c22e2e", "#2e4a9e"];
    ([[-12.5, -52], [12.5, -52], [-12.5, 52], [12.5, 52]] as [number, number][]).forEach(([x, z], i) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.6, 6), lam2({ color: "#4a3a24" }));
      pole.position.set(x, 1.8, z); R.add(pole);
      const flagGeo = new THREE.PlaneGeometry(1.5, 0.9, 6, 1);
      flagGeo.translate(0.75, 0, 0);
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: flagCols[i], side: THREE.DoubleSide }));
      flag.position.set(x, 3.25, z);
      if (x > 0) flag.rotation.y = Math.PI;
      R.add(flag);
      this.flags.push({ m: flag, ph: i * 1.7 });
    });
    // ---- megalithic tombs ring the field ----
    const stoneM = lam2({ map: rep(stoneTex("pasolaStone"), 1, 1), color: "#b0a894" });
    const great = makeTomb(stoneM, 1.4);
    great.position.set(TOMB[0], 0.08, TOMB[2]); great.rotation.y = 0.5; R.add(great);
    const tombSpots: [number, number, number][] = [[-21, -32, 1.0], [19, -40, 0.9], [24, 32, 1.05], [-25, 46, 0.95], [20, 58, 0.85]];
    tombSpots.forEach(([x, z, s], i) => {
      const t = makeTomb(stoneM, s);
      t.position.set(x, 0.08, z); t.rotation.y = r() * 1.2 - 0.6 + i;
      R.add(t);
    });
    // ---- uma houses with their towering roofs ----
    const umaSpots: [number, number][] = [[-26, -10], [-29, 24], [27, -20], [30, 14], [-28, -46], [26, 46]];
    umaSpots.forEach(([x, z], i) => {
      const u = makeUma(i * 3 + 1);
      u.position.set(x, 0.08, z);
      u.rotation.y = (x < 0 ? 1 : -1) * (Math.PI / 2) + (r() - 0.5) * 0.4;
      R.add(u);
      blob(R, x, 0.095, z, 6.4, 5.6, 0.26);
    });
    // ---- the spear rack (shot 7): crossed posts, a bar, six blunt spears leaning ----
    const rack = new THREE.Group();
    const woodM = lam2({ color: "#6d4c2c", map: rep(planks(), 1, 1) });
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6), woodM);
      post.position.set(s * 0.9, 0.75, 0); post.rotation.z = s * 0.18; rack.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), woodM);
    bar.rotation.z = Math.PI / 2; bar.position.y = 1.32; rack.add(bar);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.023, 1.85, 6), lam2({ color: "#9a6a3a" }));
      sp.add(shaft);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 6), lam2({ color: "#c9a061" }));
      tip.position.y = 0.95; tip.scale.y = 1.5; sp.add(tip);
      sp.position.set(-0.75 + i * 0.3, 0.86, 0.12);
      sp.rotation.x = 0.38; sp.rotation.z = (i - 2.5) * 0.03;
      rack.add(sp);
    }
    rack.position.set(RACK[0], FIELD_Y, RACK[2]);
    rack.rotation.y = -0.5;
    R.add(rack);
    // ---- trees: flat-top savanna trees + lontar palms ----
    const greens = ["#8a9455", "#a3a869", "#767f43"];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeSavTree(h, greens, seed);
      t.position.set(x, 0.08, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.37 });
    };
    treeAt(-19, -58, 5.2, 3); treeAt(21, -64, 4.6, 5); treeAt(-22, 8, 5.6, 7);
    treeAt(23, 52, 5.0, 11); treeAt(-20, 62, 4.4, 13); treeAt(34, -34, 5.8, 17);
    treeAt(-36, -22, 5.4, 19); treeAt(38, 30, 4.8, 23);
    const palmAt = (x: number, z: number, h: number, lean: number, seed: number) => {
      const p = makePalm(h, lean, seed);
      p.position.set(x, 0.08, z);
      R.add(p);
      this.trees.push({ g: p, ph: seed * 0.83 });
    };
    palmAt(-16, -70, 6.4, 0.14, 29); palmAt(18, -74, 7.0, -0.1, 31); palmAt(-31, 36, 6.2, 0.08, 37);
    palmAt(33, -2, 6.8, -0.14, 41); palmAt(-14, -88, 6.6, 0.12, 43); palmAt(15, -90, 7.2, -0.08, 47);
    // ---- the rolling hills of Sumba on the horizon ----
    const hillM = lam2({ map: rep(dryGroundTex(), 24, 8), color: "#c2a878" });
    const hillSpots: [number, number, number, number][] = [
      [-95, 150, 85, 15], [30, 165, 105, 19], [130, 140, 80, 13], [-160, 60, 90, 14], [165, 30, 95, 16], [-150, -60, 85, 12],
    ];
    hillSpots.forEach(([x, z, w, h]) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), hillM);
      hill.scale.set(w, h, w * 0.42);
      hill.position.set(x, -h * 0.25, z);
      R.add(hill);
    });
    // ---- dry tufts: ragged edges everywhere the grass shows ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (let i = 0; i < 700; i++) {
      const side = r() < 0.5 ? 1 : -1;
      const x = side * (12.2 + r() * 42), z = 66 - r() * 156;
      if (z < -90) continue;
      pushTuft(x, z, 0.6 + r() * 0.9);
    }
    for (let i = 0; i < 130; i++) { // sparse tufts invading the arena edges
      const side = r() < 0.5 ? 1 : -1;
      pushTuft(side * (10.4 + r() * 1.2), 60 - r() * 120, 0.5 + r() * 0.6);
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.08, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.13 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    void r;
  }

  // ---------------- the beach: sand, sea, the nyale shore ----------------
  private buildBeach(R: THREE.Group, r: () => number) {
    // grass slope strip between field and sand
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(190, 34), lam2({ map: rep(dryGroundTex(), 26, 5), color: "#cbb27e" }));
    slope.rotation.x = -Math.PI / 2; slope.position.set(0, 0.085, -79); slope.receiveShadow = true; R.add(slope);
    // sand
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(190, 36), lam2({ map: rep(sandTex(), 10, 2) }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.09, -106); sand.receiveShadow = true; R.add(sand);
    // wet band at the shoreline
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(190, 7),
      new THREE.MeshBasicMaterial({ color: "#8a6f4d", transparent: true, opacity: 0.35, depthWrite: false }));
    wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.1, -113.5); wet.renderOrder = 1; R.add(wet);
    // the sea
    const seaMap = rep(water(), 7, 5);
    this.seaMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(360, 150), lam2({ map: seaMap, color: "#8fd0dd" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.12, -196); sea.receiveShadow = true; R.add(sea);
    // foam line breathing at the shore
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(190, 2.4),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.145, -117.5); foam.renderOrder = 2; R.add(foam);
    this.foam = foam;
    // ---- the nyale: bright worm clusters on the wet sand ----
    const wormCols = ["#d8402e", "#39a047", "#e8862e", "#7a3fae", "#e86a9a", "#f2c018"];
    const wormGeo = new THREE.SphereGeometry(1, 7, 5);
    for (let i = 0; i < 110; i++) {
      const m = new THREE.Mesh(wormGeo, new THREE.MeshLambertMaterial({ color: wormCols[i % wormCols.length], emissive: wormCols[i % wormCols.length], emissiveIntensity: 0.18 }));
      const x = -17 + r() * 30, z = -110.5 - r() * 3.4;
      m.position.set(x, 0.13, z);
      m.scale.set(0.13 + r() * 0.09, 0.045, 0.05);
      m.rotation.y = r() * Math.PI;
      R.add(m);
    }
    // the Rato's woven basket, already half full of nyale
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.27, 0.32, 10, 1, true), lam2({ map: rep(planks(), 3, 1), color: "#c99058", side: THREE.DoubleSide }));
    basket.position.set(RATO_SPOT[0] + 0.62, 0.24, RATO_SPOT[2] + 0.35); basket.castShadow = true; R.add(basket);
    const basketBase = new THREE.Mesh(new THREE.CircleGeometry(0.27, 10), lam2({ color: "#8a6134" }));
    basketBase.rotation.x = -Math.PI / 2; basketBase.position.set(RATO_SPOT[0] + 0.62, 0.09, RATO_SPOT[2] + 0.35); R.add(basketBase);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(wormGeo, new THREE.MeshLambertMaterial({ color: wormCols[(i + 2) % wormCols.length], emissive: wormCols[(i + 2) % wormCols.length], emissiveIntensity: 0.2 }));
      m.position.set(RATO_SPOT[0] + 0.62 + (r() - 0.5) * 0.4, 0.4, RATO_SPOT[2] + 0.35 + (r() - 0.5) * 0.4);
      m.scale.set(0.13, 0.05, 0.05); m.rotation.y = r() * 3;
      R.add(m);
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

  /** Animate one horse rig from its story pose: legs gallop by
   *  distance actually travelled, tails always swish, heads
   *  bob, dust sprays off the hooves at charging speed; at wait
   *  the horse paws the dirt and shifts its weight. */
  private animateHorse(rig: HorseRig, pose: RiderPose, tt: number, dt: number) {
    rig.g.visible = pose.mode !== "gone";
    if (pose.mode === "gone") { rig.lastX = pose.x; rig.lastZ = pose.z; return; }
    rig.g.position.set(pose.x, FIELD_Y, pose.z);
    rig.g.rotation.y = pose.yaw;
    const dist = Math.hypot(pose.x - rig.lastX, pose.z - rig.lastZ);
    const speed = dt > 0 ? dist / dt : 0;
    rig.lastX = pose.x; rig.lastZ = pose.z;
    const charging = pose.mode === "charge";
    if (charging) rig.phase += Math.max(speed, 7) * dt * 2.0;
    const amp = charging ? 0.8 : 0;
    const offs = [0, 0.25, Math.PI, Math.PI + 0.25]; // rotary gallop: fronts together, backs together
    rig.legs.forEach((leg, li) => {
      const target = amp * Math.sin(rig.phase + offs[li]);
      leg.rotation.x += (target - leg.rotation.x) * (charging ? 1 : 0.1);
      rig.lowers[li].rotation.x = amp * 0.7 * Math.sin(rig.phase + offs[li] - 0.7) * (charging ? 1 : 0.25);
    });
    if (!charging) {
      // impatient at the wait: a front hoof scrapes the dirt in pulses
      const paw = Math.max(0, Math.sin(tt * 0.9 + rig.seed * 2.3)) ** 3;
      rig.legs[0].rotation.x = -0.34 * paw;
      rig.lowers[0].rotation.x = 0.44 * paw;
    }
    rig.body.position.y = 1.24 + (charging ? Math.abs(Math.sin(rig.phase)) * 0.055 : Math.sin(tt * 1.7 + rig.seed) * 0.008);
    rig.body.rotation.x = charging ? Math.sin(rig.phase) * 0.02 : Math.sin(tt * 1.1 + rig.seed) * 0.005;
    rig.head.rotation.x = charging ? Math.sin(rig.phase + 0.4) * 0.055 - 0.03 : Math.sin(tt * 0.8 + rig.seed * 1.7) * 0.05;
    rig.head.rotation.y = Math.sin(tt * 0.55 + rig.seed * 2.9) * 0.06;
    rig.tail.rotation.z = Math.sin(tt * 2.4 + rig.seed * 1.9) * 0.42;
    rig.tail.rotation.x = 0.18 + Math.sin(tt * 1.7 + rig.seed) * 0.1;
    // dust: recycled sprites cycling behind the hooves
    rig.spray.forEach((sp, i) => {
      if (!charging) { (sp.material as THREE.SpriteMaterial).opacity = 0; return; }
      const cyc = (tt * 2.8 + i * 0.618 + rig.seed) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.4 + (i % 5) * 0.2), 0.22 + cyc * 0.9, 1.1 + cyc * 2.4);
      const sc = 0.5 + cyc * 1.6;
      sp.scale.set(sc, sc * 0.75, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.4 * (1 - cyc);
    });
  }

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
    this.skyDay.visible = true;
    for (const c2 of this.clouds) c2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    if (this.seaMap) this.seaMap.offset.set(tt * 0.004, tt * 0.016);
    if (this.foam) (this.foam.material as THREE.MeshBasicMaterial).opacity = 0.38 + Math.sin(tt * 0.9) * 0.14;
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    for (const fl of this.flags) {
      fl.m.rotation.y = Math.sin(tt * 3.1 + fl.ph) * 0.38;
      fl.m.rotation.z = Math.sin(tt * 2.2 + fl.ph * 1.7) * 0.06;
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
    // ---------------- the horses ----------------
    for (const side of [0, 1] as const) {
      for (let idx = 0; idx < 4; idx++) {
        this.animateHorse(this.rigs[side][idx], riderAt(id, side, idx, t), tt, dt);
      }
    }
    // the far ranks stand only for the wide standoff shot
    this.farHerd.forEach((h, i) => {
      h.visible = id === 2;
      if (id === 2) h.position.y = FIELD_Y + Math.sin(tt * 1.8 + i * 1.3) * 0.02;
    });
    // ---------------- spears in the air ----------------
    const chargeShot = id === 1 || id === 3 || id === 8 || id === 9 || id === 10;
    const leadA = riderAt(id, 0, 0, t), leadB = riderAt(id, 1, 0, t);
    const zc = (leadA.z + leadB.z) / 2;
    this.flySpears.forEach((sp, k) => {
      if (!chargeShot) { sp.visible = false; return; }
      const cyc = (tt * 0.85 + k * 0.381) % 1;
      if (cyc >= 0.42) { sp.visible = false; return; }
      const u = cyc / 0.42, dirn = k % 2 ? 1 : -1;
      const from = new THREE.Vector3(dirn * -4.4, 2.1, zc - dirn * 6.5);
      const to = new THREE.Vector3(dirn * 4.4, 1.7, zc + dirn * 6.5);
      const pos = from.clone().lerp(to, u);
      pos.y += Math.sin(u * Math.PI) * 1.5;
      const vel = to.clone().sub(from);
      vel.y += Math.cos(u * Math.PI) * Math.PI * 1.5;
      sp.visible = true;
      sp.position.copy(pos);
      sp.lookAt(pos.clone().add(vel));
    });
    // ---------------- the answering sprouts (shot 8's twist) ----------------
    if (this.sprouts) {
      const S0 = s.a / FPS, SLEN = Math.max(0.01, (s.b - s.a) / FPS);
      const u8 = clamp01((t - S0) / SLEN);
      const pop = id === 8 ? clamp01((u8 - 0.45) / 0.25) : 0;
      this.sprouts.visible = pop > 0;
      this.sprouts.scale.setScalar(Math.max(0.001, pop));
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
