// The Sedlec Ossuary, Kutná Hora as one three.js scene for
// the Fafnir-ID format: a stone chapel nave whose every
// decoration is human bone — the great bone chandelier
// ALREADY SWAYING at frame 0, four bell-shaped bone pyramids
// in the corners, skull garlands on the vault, the
// Schwarzenberg coat of arms in bone on the altar wall —
// and, far down +z, the Cemetery Church of All Saints above
// its graveyard for the 1278 origin story. VISUAL CORE:
// pale bone against dark layered stone, candle glow,
// drifting dust in the window light, textured everything
// (anti-banding: grain + speckle on every surface).
// Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim + warm candle points — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, stoneHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, clamp01, lin, CHANDELIER, CHANDELIER_PIVOT_Y, PYRAMIDS, COA_POS, GRAVE_SPOT, swayAt, swayXAt } from "./story";

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
const skyTexDay = () => ctex("sedlecSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("sedlecGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("sedlecBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a skull face painted for a sphere: the face sits at u≈0.25
 *  (the sphere's +z), bone-white shading, dark sockets, nose
 *  slit and teeth — reads instantly at any tier distance */
const skullTex = () => ctex("sedlecSkull", 256, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#f2ead6"); grad.addColorStop(0.55, "#e2d6ba"); grad.addColorStop(1, "#bfae8c");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,100,70" : "255,252,240"},${0.04 + r() * 0.07})`; g.fillRect(r() * 256, r() * 256, 2.2, 2.2); }
  const cx = 64, cy = 104;
  // cranium shading: a soft shadow under the brow + cheek hollows
  const sh = g.createRadialGradient(cx, cy - 26, 8, cx, cy - 26, 62);
  sh.addColorStop(0, "rgba(255,255,255,0.35)"); sh.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.beginPath(); g.arc(cx, cy - 26, 62, 0, 7); g.fill();
  g.fillStyle = "rgba(96,80,54,0.35)";
  g.beginPath(); g.ellipse(cx - 34, cy + 34, 13, 9, 0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + 34, cy + 34, 13, 9, -0.4, 0, 7); g.fill();
  // eye sockets
  for (const dx of [-21, 21]) {
    const eg = g.createRadialGradient(cx + dx, cy, 2, cx + dx, cy, 15);
    eg.addColorStop(0, "#120d08"); eg.addColorStop(0.8, "#241a10"); eg.addColorStop(1, "rgba(36,26,16,0)");
    g.fillStyle = eg; g.beginPath(); g.arc(cx + dx, cy, 15, 0, 7); g.fill();
  }
  // nose slit
  g.fillStyle = "#1d150c";
  g.beginPath(); g.moveTo(cx, cy + 16); g.lineTo(cx - 7, cy + 34); g.lineTo(cx + 7, cy + 34); g.closePath(); g.fill();
  // teeth
  g.strokeStyle = "rgba(70,56,36,0.85)"; g.lineWidth = 2.4;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 7, cy + 48); g.lineTo(cx + i * 7, cy + 62); g.stroke(); }
  g.beginPath(); g.moveTo(cx - 24, cy + 48); g.lineTo(cx + 24, cy + 48); g.stroke();
  // a crack on the crown
  g.strokeStyle = "rgba(90,74,48,0.5)"; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(cx - 8, cy - 58); g.lineTo(cx - 2, cy - 42); g.lineTo(cx - 10, cy - 28); g.stroke();
});
/** a dense field of skulls + crossed long bones on dark
 *  shadow — the surface of the great bone pyramids and the
 *  grave-side bone heaps */
const bonePileTex = () => ctex("sedlecBonePile", 512, 512, (g, r) => {
  g.fillStyle = "#3d2f21"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "16,10,6" : "110,88,58"},${0.05 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  const bone = (x: number, y: number, a: number, l: number) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = "#ddd0b2";
    g.fillRect(-l / 2, -4.5, l, 9);
    for (const e of [-l / 2, l / 2]) { g.beginPath(); g.arc(e, -4, 7.5, 0, 7); g.arc(e, 4, 7.5, 0, 7); g.fill(); }
    g.fillStyle = "rgba(120,100,70,0.35)"; g.fillRect(-l / 2, 1.5, l, 3);
    g.restore();
  };
  const skull = (x: number, y: number, s: number) => {
    const gr = g.createRadialGradient(x - s * 0.3, y - s * 0.35, s * 0.2, x, y, s);
    gr.addColorStop(0, "#f0e7d2"); gr.addColorStop(0.75, "#d9cbab"); gr.addColorStop(1, "#a8946e");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.fillStyle = "#171008";
    g.beginPath(); g.arc(x - s * 0.34, y + s * 0.02, s * 0.21, 0, 7); g.fill();
    g.beginPath(); g.arc(x + s * 0.34, y + s * 0.02, s * 0.21, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x, y + s * 0.3); g.lineTo(x - s * 0.11, y + s * 0.52); g.lineTo(x + s * 0.11, y + s * 0.52); g.closePath(); g.fill();
  };
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const x = 44 + col * 84 + (row % 2) * 40 + (r() - 0.5) * 14, y = 46 + row * 84 + (r() - 0.5) * 12;
    bone(x + (r() - 0.5) * 30, y + 26, r() * 0.9 - 0.45, 74);
    skull(x, y, 25 + r() * 6);
  }
});
/** the Schwarzenberg coat of arms, built of bone: a bone-
 *  white shield border of skulls on deep red, the black
 *  raven pecking at a Turk's head (the 1598 victory), crossed
 *  bones below — flat-painted, ink-outlined, heraldic */
const coaTex = () => ctex("sedlecCoa", 512, 640, (g, r) => {
  g.fillStyle = "#3d2c1e"; g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "0,0,0" : "150,128,96"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 640, 2.4, 2.4); }
  // the shield
  const sx = 76, sy = 52, sw = 360, sh = 470;
  g.beginPath();
  g.moveTo(sx, sy); g.lineTo(sx + sw, sy); g.lineTo(sx + sw, sy + sh * 0.62);
  g.quadraticCurveTo(sx + sw, sy + sh * 0.9, sx + sw / 2, sy + sh);
  g.quadraticCurveTo(sx, sy + sh * 0.9, sx, sy + sh * 0.62);
  g.closePath();
  const grad = g.createLinearGradient(sx, sy, sx, sy + sh);
  grad.addColorStop(0, "#a33338"); grad.addColorStop(0.6, "#7e2126"); grad.addColorStop(1, "#57161c");
  g.fillStyle = grad; g.fill();
  g.lineWidth = 10; g.strokeStyle = "#17100b"; g.stroke();
  // skull border along the shield rim
  const rim: [number, number][] = [];
  for (let i = 0; i <= 10; i++) rim.push([sx + 18 + (i * (sw - 36)) / 10, sy + 20]);
  for (let i = 1; i <= 7; i++) rim.push([sx + sw - 20, sy + 20 + (i * sh * 0.6) / 7]);
  for (let i = 1; i <= 7; i++) rim.push([sx + 20, sy + 20 + (i * sh * 0.6) / 7]);
  for (const [x, y] of rim) {
    g.fillStyle = "#e9dfc6"; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill();
    g.fillStyle = "#17100b";
    g.beginPath(); g.arc(x - 4.5, y + 1, 3.4, 0, 7); g.arc(x + 4.5, y + 1, 3.4, 0, 7); g.fill();
  }
  // the Turk's head (pale, turbaned) low-centre, the raven above it
  const hx = 256, hy = 400;
  g.fillStyle = "#e6d3ac"; g.beginPath(); g.arc(hx, hy, 40, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = "#17100b"; g.stroke();
  g.fillStyle = "#274a6b"; g.beginPath(); g.arc(hx, hy - 26, 30, Math.PI, 0); g.fill(); // turban cap
  g.fillStyle = "#17100b"; g.beginPath(); g.arc(hx + 14, hy + 2, 5, 0, 7); g.fill(); // the eye being pecked
  // the raven: black body, wing, tail, beak down at the eye
  g.fillStyle = "#14161c";
  g.beginPath(); g.ellipse(216, 318, 52, 26, -0.5, 0, 7); g.fill(); // body
  g.beginPath(); g.ellipse(196, 296, 44, 15, -0.9, 0, 7); g.fill(); // wing
  g.beginPath(); g.moveTo(168, 330); g.lineTo(128, 356); g.lineTo(176, 352); g.closePath(); g.fill(); // tail
  g.beginPath(); g.arc(258, 330, 17, 0, 7); g.fill(); // head
  g.fillStyle = "#0c0d10";
  g.beginPath(); g.moveTo(270, 336); g.lineTo(288, 366); g.lineTo(258, 348); g.closePath(); g.fill(); // beak to the eye
  g.fillStyle = "#e9dfc6"; g.beginPath(); g.arc(262, 326, 3.2, 0, 7); g.fill(); // raven eye
  // crossed long bones under the shield
  const bone = (x: number, y: number, a: number, l: number) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = "#e9dfc6"; g.fillRect(-l / 2, -6, l, 12);
    for (const e of [-l / 2, l / 2]) { g.beginPath(); g.arc(e, -5, 10, 0, 7); g.arc(e, 5, 10, 0, 7); g.fill(); }
    g.restore();
  };
  bone(256, 572, 0.42, 190); bone(256, 572, -0.42, 190);
  g.lineWidth = 3; g.strokeStyle = "rgba(23,16,11,0.6)";
  g.strokeRect(10, 10, 492, 620);
});
/** Rint's signature — IN BONE, on the wall by the door */
const sigTex = () => ctex("sedlecSig", 512, 128, (g) => {
  g.clearRect(0, 0, 512, 128);
  g.font = "italic 700 82px Georgia, serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(90,74,48,0.55)"; g.fillText("Rint", 258, 68);
  g.fillStyle = "#ece1c8"; g.fillText("Rint", 256, 64);
  g.font = "italic 700 30px Georgia, serif";
  g.fillStyle = "rgba(236,225,200,0.8)"; g.fillText("· 1870 ·", 256, 112);
});
/** a candle flame: white-hot core, gold body, soft halo */
const flameTex = () => ctex("sedlecFlame", 128, 256, (g) => {
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
/** a soft dust mote dot */
const dustTex = () => ctex("sedlecDust", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  gr.addColorStop(0, "rgba(255,246,220,0.9)"); gr.addColorStop(1, "rgba(255,246,220,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
/** a daylight shaft: warm gradient fading down its length */
const shaftTex = () => ctex("sedlecShaft", 128, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,240,200,0.5)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  const side = g.createLinearGradient(0, 0, 128, 0);
  side.addColorStop(0, "rgba(0,0,0,1)"); side.addColorStop(0.25, "rgba(0,0,0,0)");
  side.addColorStop(0.75, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = side; g.fillRect(0, 0, 128, 256);
  g.globalCompositeOperation = "source-over";
});
/** wrap-draw: calls fn at every tiled offset an item of radius
 *  `rad` at (x, y) bleeds into, so a canvas tiles without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** churchyard grass: deep green body, light patches, blades */
const grassTex = () => ctex("sedlecGrass", 1024, 1024, (g, r) => {
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
/** fresh grave earth: dark clumped soil */
const soilTex = () => ctex("sedlecSoil", 512, 512, (g, r) => {
  g.fillStyle = "#4c3823"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "24,16,8" : "128,100,64"},${0.14 + r() * 0.2})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 22, 4 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "16,10,5" : "170,140,96"},${0.06 + r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
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

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** one skull on a sphere, face turned along +z of its parent */
const makeSkull = (rad: number) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 18, 14), lam2({ map: skullTex(), color: "#f4ecd8" }));
  m.castShadow = true;
  return m;
};
/** one long bone: a capsule with knobbed ends (two small
 *  spheres at each tip) — unmistakably a femur at a glance */
const makeLongBone = (len: number) => {
  const g = new THREE.Group();
  const mat = lam2({ color: "#e7dcc0" });
  const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, len, 3, 8), mat);
  shaft.castShadow = true; g.add(shaft);
  for (const e of [-1, 1]) for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), mat);
    knob.position.set(s * 0.06, e * (len / 2 + 0.05), 0); knob.castShadow = true; g.add(knob);
  }
  return g;
};

/** A round churchyard tree: textured trunk + a canopy of
 *  layered flecked blobs (never a green ball). */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#8a6a48", map: rep(soilTex(), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.34, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "sedlecFoliageDeep"), folM(greens[0], "sedlecFoliageMid"), folM(greens[1] ?? greens[0], "sedlecFoliageLite")];
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
  private sunGlows: THREE.Sprite[] = [];
  // ---- episode systems ----
  private chandelier!: THREE.Group;
  private flames: { sp: THREE.Sprite; ph: number; base: number }[] = [];
  private candleLights: THREE.PointLight[] = [];
  private hangers: { g: THREE.Group; ph: number }[] = [];
  private dust!: THREE.Points;
  private dustBase!: Float32Array;
  private dustPh: number[] = [];
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(66);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#5d7a44", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds (over the churchyard, far +z) ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const cloudSpots: [number, number, number, number][] = [
      [-105, 88, 230, 105], [48, 104, 280, 125], [138, 76, 195, 82], [-24, 118, 350, 140],
      [-175, 108, 320, 115], [195, 116, 340, 120], [6, 70, 165, 66], [-128, 64, 155, 60],
      [102, 56, 135, 52], [248, 84, 250, 92],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, 300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow); this.sunGlows.push(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, 300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core); this.sunGlows.push(core);
    // shared window material (chapel + church windows glow together)
    this.winMat = new THREE.MeshLambertMaterial({ color: "#ffe2a8", emissive: "#ff9a3c", emissiveIntensity: 0.3 });
    this.buildChapel(R, r);
    this.buildChandelier(R, r);
    this.buildPyramids(R, r);
    this.buildExterior(R, r);
    this.buildDust(R, r);
  }

  // ---------------- the chapel interior ----------------
  private buildChapel(R: THREE.Group, r: () => number) {
    const wallM = lam2({ map: rep(stoneHD("sedlecWall", ["#b3a68e", "#a2947a", "#c0b49c", "#978a72"], "#6e6152"), 8, 2), color: "#cfc4ae" });
    const wallM2 = lam2({ map: rep(stoneHD("sedlecWall", ["#b3a68e", "#a2947a", "#c0b49c", "#978a72"], "#6e6152"), 3, 2), color: "#c6bba6" });
    const vaultM = lam2({ map: rep(stoneHD("sedlecVault", ["#9a8d76", "#8b7f6a", "#aa9e86", "#7e7260"], "#5d5346"), 10, 3), color: "#b0a48e" });
    const floorM = lam2({ map: rep(stoneHD("sedlecFloor", ["#8d8272", "#7d7264", "#98907e", "#6e6455"], "#4c4237"), 8, 18), color: "#b8b1a4" });
    // floor + altar step
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 66), floorM);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -23); floor.receiveShadow = true; R.add(floor);
    const step = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 7), wallM2);
    step.position.set(0, 0.25, -48.5); step.receiveShadow = true; step.castShadow = true; R.add(step);
    // side walls, altar wall, entrance wall
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.4, 62), wallM);
      w.position.set(sx * 13.6, 3.7, -23); w.receiveShadow = true; R.add(w);
    }
    const altar = new THREE.Mesh(new THREE.BoxGeometry(28.4, 7.4, 1.2), wallM);
    altar.position.set(0, 3.7, -52.6); altar.receiveShadow = true; R.add(altar);
    const entry = new THREE.Mesh(new THREE.BoxGeometry(28.4, 7.4, 1.2), wallM);
    entry.position.set(0, 3.7, 6.6); entry.receiveShadow = true; R.add(entry);
    // tympanum half-discs: the end walls rise INTO the vault
    // arch, so no crescent of sky leaks over the wall tops
    const tymShape = new THREE.Shape();
    tymShape.moveTo(-13.4, 7.0);
    tymShape.absarc(0, 7.0, 13.4, Math.PI, 0, true);
    tymShape.lineTo(13.4, 7.0); tymShape.closePath();
    const tymGeo = new THREE.ShapeGeometry(tymShape, 24);
    { const uv = tymGeo.getAttribute("uv"); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.12, uv.getY(i) * 0.12); }
    const tymA = new THREE.Mesh(tymGeo, wallM2);
    tymA.position.set(0, 0, -51.95); tymA.receiveShadow = true; R.add(tymA);
    const tymB = new THREE.Mesh(tymGeo, wallM2);
    tymB.position.set(0, 0, 5.95); tymB.rotation.y = Math.PI; tymB.receiveShadow = true; R.add(tymB);
    // the great wooden door (shut) + Rint's bone signature beside it
    const door = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.8, 0.25), lam2({ color: "#4a3421", map: rep(soilTex(), 1, 1) }));
    door.position.set(0, 2.4, 5.92); R.add(door);
    const sig = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.58),
      new THREE.MeshBasicMaterial({ map: sigTex(), transparent: true }));
    sig.position.set(4.4, 1.8, 5.96); sig.rotation.y = Math.PI; R.add(sig);
    // the barrel vault + its ribs
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(13.4, 13.4, 62, 24, 1, true, Math.PI / 2, Math.PI), vaultM);
    vault.rotation.x = Math.PI / 2; vault.position.set(0, 7.0, -23);
    vault.material.side = THREE.BackSide; R.add(vault);
    const ribM = lam2({ map: rep(stoneHD("sedlecVault", ["#9a8d76", "#8b7f6a", "#aa9e86", "#7e7260"], "#5d5346"), 6, 1), color: "#8f8471" });
    for (const z of [-48, -36, -24, -12, 0]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(13.25, 0.3, 8, 32, Math.PI), ribM);
      rib.position.set(0, 7.0, z); R.add(rib);
    }
    // columns with bases + capitals
    const colM = lam2({ map: rep(stoneHD("sedlecWall", ["#b3a68e", "#a2947a", "#c0b49c", "#978a72"], "#6e6152"), 1, 3), color: "#d2c7b2" });
    for (const sx of [-1, 1]) for (const z of [-46, -34, -22, -10, 2]) {
      const c = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 6.6, 12), colM);
      shaft.position.y = 3.8; shaft.castShadow = true; shaft.receiveShadow = true; c.add(shaft);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), colM);
      base.position.y = 0.25; base.castShadow = true; c.add(base);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), colM);
      cap.position.y = 7.3; cap.castShadow = true; c.add(cap);
      c.position.set(sx * 11.3, 0, z); R.add(c);
    }
    // windows high on both walls + their daylight shafts (+x side)
    for (const sx of [-1, 1]) for (const z of [-40, -22, -4]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.4), this.winMat);
      win.position.set(sx * 12.95, 4.9, z); win.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; R.add(win);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16, 0, Math.PI), this.winMat);
      arch.position.set(sx * 12.95, 6.6, z); arch.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; R.add(arch);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 2.2), ribM);
      frame.position.set(sx * 13.1, 4.9, z); R.add(frame);
    }
    const shaftM = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, opacity: 0.34 });
    for (const z of [-40, -22, -4]) {
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        12.8, 6.4, z - 1.1, 12.8, 6.4, z + 1.1, 4.2, 0.1, z + 1.8,
        12.8, 6.4, z - 1.1, 4.2, 0.1, z + 1.8, 4.2, 0.1, z - 1.8,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), 2));
      geo.computeVertexNormals();
      const shaft = new THREE.Mesh(geo, shaftM);
      shaft.renderOrder = 4; shaft.layers.set(NOINK); R.add(shaft);
    }
    // the Schwarzenberg coat of arms IN BONE on the altar wall
    const coa = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.25), new THREE.MeshLambertMaterial({ map: coaTex(), emissive: "#ffffff", emissiveMap: coaTex(), emissiveIntensity: 0.38 }));
    coa.position.set(COA_POS[0], COA_POS[1], -51.9); coa.castShadow = true; R.add(coa);
    blob(R, 0, 0.52, -48.5, 15, 5.5, 0.5);
    // skull garlands across the vault: bone tubes on a sagging
    // curve, skulls hanging below on strings (they sway)
    const garM = lam2({ map: rep(bonePileTex(), 10, 1), color: "#e2d6ba" });
    for (const z of [-34, -12]) {
      const grp = new THREE.Group(); grp.position.set(0, 7.4, z);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-12.6, 0, 0), new THREE.Vector3(0, -3.2, 0), new THREE.Vector3(12.6, 0, 0));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.11, 8), garM);
      tube.castShadow = true; grp.add(tube);
      for (const tt2 of [0.18, 0.34, 0.5, 0.66, 0.82]) {
        const p = curve.getPoint(tt2);
        const hang = new THREE.Group(); hang.position.copy(p);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 5), lam2({ color: "#5a4c38" }));
        str.position.y = -0.21; hang.add(str);
        const sk = makeSkull(0.21); sk.position.y = -0.55; hang.add(sk);
        grp.add(hang); this.hangers.push({ g: hang, ph: tt2 * 9 + z });
      }
      R.add(grp);
    }
    // candle stands: iron poles, cream candles, live flames
    const ironM = lam2({ color: "#2c2622" });
    const waxM = lam2({ color: "#efe3c2" });
    const candleAt = (x: number, z: number, n: number) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.15, 8), ironM);
      pole.position.y = 0.58; pole.castShadow = true; g.add(pole);
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), ironM);
      tray.position.y = 1.16; g.add(tray);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, cx = Math.cos(a) * 0.24, cz = Math.sin(a) * 0.24;
        const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), waxM);
        cd.position.set(cx, 1.36, cz); g.add(cd);
        const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        fl.position.set(cx, 1.66, cz); fl.scale.set(0.3, 0.46, 1); fl.layers.set(NOINK); g.add(fl);
        this.flames.push({ sp: fl, ph: r() * 20, base: 1 });
      }
      g.position.set(x, 0, z); R.add(g);
      blob(R, x, 0.02, z, 1.1, 1.1, 0.55);
    };
    candleAt(-5.5, -34, 3); candleAt(5.5, -34, 3); candleAt(-5.5, -12, 3); candleAt(5.5, -12, 3);
    candleAt(-3.2, -46.5, 4); candleAt(3.2, -46.5, 4);
    // warm candle point lights (flickered in update)
    const pl1 = new THREE.PointLight("#ff9a3c", 42, 30, 2); pl1.position.set(0, 2.6, -22); R.add(pl1);
    const pl2 = new THREE.PointLight("#ff9a3c", 30, 24, 2); pl2.position.set(0, 2.6, -45); R.add(pl2);
    this.candleLights.push(pl1, pl2);
    // loose bones on the floor near the monk's pyramid
    for (let i = 0; i < 7; i++) {
      const b = makeLongBone(0.85);
      b.position.set(-7.5 + r() * 3.4, 0.09, -39.5 - r() * 3);
      b.rotation.set(Math.PI / 2, 0, r() * 3);
      R.add(b);
    }
  }

  // ---------------- THE bone chandelier ----------------
  private buildChandelier(R: THREE.Group, r: () => number) {
    void r;
    // static chain from the vault down to the sway pivot
    const chainM = lam2({ color: "#3a332c" });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 7.6, 6), chainM);
    chain.position.set(CHANDELIER[0], (CHANDELIER_PIVOT_Y + 19.4) / 2 + 0.4, CHANDELIER[2]); R.add(chain);
    const g = new THREE.Group();
    g.position.set(CHANDELIER[0], CHANDELIER_PIVOT_Y, CHANDELIER[2]);
    const boneM = lam2({ color: "#e9dfc6" });
    const link = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), chainM);
    link.position.y = -0.65; g.add(link);
    // central spike: a vertical long bone with a skull crown
    const spike = makeLongBone(2.6); spike.position.y = -4.4; g.add(spike);
    const crown = makeSkull(0.3); crown.position.y = -2.9; g.add(crown);
    // three tiers of skull rings + radial long bones + candles
    const tiers: [number, number, number][] = [
      [1.15, -3.3, 8], [1.75, -4.25, 12], [2.35, -5.25, 16],
    ];
    for (const [rad, y, n] of tiers) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.085, 8, 40), boneM);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.castShadow = true; g.add(ring);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        const sk = makeSkull(0.21);
        sk.position.set(x, y - 0.3, z); sk.rotation.y = Math.atan2(x, z);
        g.add(sk);
        const lb = makeLongBone(0.8);
        lb.position.set(x * 1.02, y + 0.06, z * 1.02);
        lb.rotation.set(0, -a + Math.PI / 2, Math.PI / 2 - 0.18);
        g.add(lb);
      }
    }
    // candles on the middle tier
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26, x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.75;
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), lam2({ color: "#efe3c2" }));
      cd.position.set(x, -4.0, z); g.add(cd);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      fl.position.set(x, -3.72, z); fl.scale.set(0.3, 0.46, 1); fl.layers.set(NOINK); g.add(fl);
      this.flames.push({ sp: fl, ph: i * 2.7, base: 1 });
    }
    // a descending cluster of skulls below the hub
    let py = -5.9;
    for (const rad of [0.24, 0.2, 0.16]) {
      const sk = makeSkull(rad); sk.position.y = py; g.add(sk); py -= 0.48;
    }
    this.chandelier = g;
    R.add(g);
  }

  // ---------------- the four bone pyramids ----------------
  private buildPyramids(R: THREE.Group, r: () => number) {
    const pyrM = lam2({ map: rep(bonePileTex(), 3, 2), color: "#e6dbc2" });
    const profile: [number, number][] = [
      [1.95, 0], [1.85, 0.45], [1.55, 1.4], [1.2, 2.4], [0.85, 3.3], [0.5, 3.95], [0.02, 4.12],
    ];
    const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
    for (const [px, , pz] of PYRAMIDS) {
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), pyrM);
      m.position.set(px, 0, pz); m.castShadow = true; m.receiveShadow = true; R.add(m);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + px;
        const sk = makeSkull(0.23);
        sk.position.set(px + Math.cos(a) * 2.05, 0.2, pz + Math.sin(a) * 2.05);
        sk.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
        R.add(sk);
      }
      const top = makeSkull(0.27); top.position.set(px, 4.32, pz); R.add(top);
      blob(R, px, 0.015, pz, 5.4, 5.4, 0.6);
    }
    // low bone heaps spilling on the floor between the pyramids
    for (const [hx, hz, s] of [[-6, -24, 1.1], [6.5, -30, 0.9], [-2.5, -11, 0.95], [-6.5, -46, 0.85]] as [number, number, number][]) {
      const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), pyrM);
      heap.scale.set(s, s * 0.7, s); heap.position.set(hx, 0, hz);
      heap.castShadow = true; heap.receiveShadow = true; R.add(heap);
      const sk1 = makeSkull(0.2); sk1.position.set(hx + s * 0.3, s * 0.5, hz + s * 0.2); sk1.rotation.y = r() * 3; R.add(sk1);
      const sk2 = makeSkull(0.17); sk2.position.set(hx - s * 0.42, s * 0.38, hz - s * 0.3); sk2.rotation.y = r() * 3; R.add(sk2);
    }
  }

  // ---------------- the church + graveyard (exterior) ----------------
  private buildExterior(R: THREE.Group, r: () => number) {
    const grassM = lam2({ map: rep(grassTex(), 20, 15), color: "#9db87e" });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 135), grassM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, 122); ground.receiveShadow = true; R.add(ground);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(90, 62), lam2({ map: rep(grassTex(), 10, 7), color: "#93ad74" }));
    court.rotation.x = -Math.PI / 2; court.position.set(0, -0.03, 36); court.receiveShadow = true; R.add(court);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 50), lam2({ map: rep(soilTex(), 1, 9), color: "#b3a184" }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.005, 118); path.receiveShadow = true; R.add(path);
    // ---- the Cemetery Church of All Saints ----
    const church = new THREE.Group();
    const stoneM = lam2({ map: rep(stoneHD("sedlecWall", ["#b3a68e", "#a2947a", "#c0b49c", "#978a72"], "#6e6152"), 4, 2), color: "#cfc4ae" });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(17, 9, 11), stoneM);
    nave.position.set(0, 4.5, 155.5); nave.castShadow = true; nave.receiveShadow = true; church.add(nave);
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.6),
      lam2({ map: ctex("sedlecFacade", 1024, 640, (g2) => {
        const grad = g2.createLinearGradient(0, 0, 0, 640);
        grad.addColorStop(0, "#d3c7ae"); grad.addColorStop(1, "#b3a68c");
        g2.fillStyle = grad; g2.fillRect(0, 0, 1024, 640);
        const rr = rng(9);
        for (let i = 0; i < 5200; i++) { g2.fillStyle = `rgba(${rr() > 0.5 ? "90,76,54" : "240,232,210"},${0.04 + rr() * 0.07})`; g2.fillRect(rr() * 1024, rr() * 640, 2.6, 2.6); }
        g2.strokeStyle = "rgba(96,82,60,0.5)"; g2.lineWidth = 3;
        for (let y = 80; y < 640; y += 80) { g2.beginPath(); g2.moveTo(0, y); g2.lineTo(1024, y); g2.stroke(); }
        // tall gothic windows
        for (const wx of [212, 812]) {
          g2.fillStyle = "#2e3440"; g2.fillRect(wx - 52, 170, 104, 300);
          g2.beginPath(); g2.moveTo(wx - 52, 170); g2.lineTo(wx, 96); g2.lineTo(wx + 52, 170); g2.closePath(); g2.fill();
          g2.strokeStyle = "#e8dfc8"; g2.lineWidth = 7; g2.strokeRect(wx - 52, 170, 104, 300);
          g2.beginPath(); g2.moveTo(wx, 96); g2.lineTo(wx - 52, 170); g2.lineTo(wx + 52, 170); g2.closePath(); g2.stroke();
          g2.strokeStyle = "rgba(232,223,200,0.8)"; g2.lineWidth = 4;
          g2.beginPath(); g2.moveTo(wx, 120); g2.lineTo(wx, 470); g2.stroke();
        }
        // the door
        g2.fillStyle = "#3d2b18"; g2.fillRect(452, 380, 120, 260);
        g2.beginPath(); g2.moveTo(452, 380); g2.lineTo(512, 316); g2.lineTo(572, 380); g2.closePath(); g2.fill();
        g2.strokeStyle = "#241a10"; g2.lineWidth = 8; g2.strokeRect(452, 380, 120, 260);
      }), color: "#ffffff" }));
    facade.position.set(0, 4.3, 149.92); facade.rotation.y = Math.PI; church.add(facade);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), this.winMat);
    rose.position.set(0, 6.6, 149.85); rose.rotation.y = Math.PI; church.add(rose);
    // gable + roof slabs
    const shape = new THREE.Shape();
    shape.moveTo(-8.5, 9); shape.lineTo(8.5, 9); shape.lineTo(0, 12.8); shape.closePath();
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 10.6, bevelEnabled: false }), stoneM);
    gable.position.z = 150.2; gable.castShadow = true; church.add(gable);
    const roofM = lam2({ color: "#5d4a54", map: rep(soilTex(), 3, 3) });
    for (const sx of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.24, 11.6), roofM);
      slab.position.set(sx * 3.95, 10.95, 155.5); slab.rotation.z = -sx * 0.635; slab.castShadow = true; church.add(slab);
    }
    // the tower + spire + cross
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5.4, 16, 5.4), stoneM);
    tower.position.set(-11.5, 8, 153); tower.castShadow = true; church.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4.3, 6.5, 4), roofM);
    spire.position.set(-11.5, 19.2, 153); spire.rotation.y = Math.PI / 4; spire.castShadow = true; church.add(spire);
    const goldM = lam2({ color: "#d9a83c", emissive: "#8a5f10", emissiveIntensity: 0.4 });
    const cross1 = new THREE.Group();
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), goldM); cv.position.y = 0.65; cross1.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.14), goldM); ch.position.y = 0.85; cross1.add(ch);
    cross1.position.set(-11.5, 22.4, 153); church.add(cross1);
    const cross2 = cross1.clone(); cross2.position.set(0, 12.8, 150.4); cross2.scale.setScalar(0.8); church.add(cross2);
    const twin = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), this.winMat);
    twin.position.set(-11.5, 12.5, 150.25); twin.rotation.y = Math.PI; church.add(twin);
    R.add(church);
    // ---- gravestones: rows of them, some tilting with age ----
    const graveM = lam2({ map: rep(stoneHD("sedlecGrave", ["#a8a094", "#98917f", "#bab3a2", "#8a8474"], "#655d4f"), 1, 1), color: "#c4beb0" });
    const graveAt = (x: number, z: number, tilt: number, cross: boolean) => {
      const g = new THREE.Group();
      if (cross) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.2), graveM); v.position.y = 0.75; v.castShadow = true; g.add(v);
        const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.2), graveM); hbar.position.y = 1.05; hbar.castShadow = true; g.add(hbar);
      } else {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.17), graveM);
        slab.position.y = 0.65; slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
        const top = new THREE.Mesh(new THREE.CircleGeometry(0.475, 14, 0, Math.PI), graveM);
        top.position.y = 1.3; top.material.side = THREE.DoubleSide; g.add(top);
      }
      g.position.set(x, 0, z);
      g.rotation.set(0, (r() - 0.5) * 0.7, tilt);
      R.add(g);
    };
    let gi = 0;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 9; col++) {
      const x = -25 + col * 6.2 + (r() - 0.5) * 2.4, z = 100 + row * 7.2 + (r() - 0.5) * 2.2;
      if (Math.abs(x) < 3.6) continue; // keep the path clear
      const old = z < 118; // the oldest rows lean the most (shot 5)
      graveAt(x, z, (r() - 0.5) * (old ? 0.42 : 0.16), gi % 5 === 0);
      gi++;
    }
    // bone heaps breaking out of the oldest graves (shot 5)
    const heapM = lam2({ map: rep(bonePileTex(), 2, 1), color: "#e6dbc2" });
    for (const [hx, hz, s] of [[-8, 108, 1.0], [7, 112, 0.8], [-14, 116, 0.9], [12, 106, 0.7], [3.5, 114, 0.65], [-6, 118, 0.85]] as [number, number, number][]) {
      const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), heapM);
      heap.scale.set(s, s * 0.4, s); heap.position.set(hx, 0, hz); heap.castShadow = true; R.add(heap);
    }
    // the abbot's soil mound + his sack of Holy Land earth
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), lam2({ map: rep(soilTex(), 2, 2), color: "#8a6c48" }));
    mound.scale.set(1, 0.42, 1); mound.position.set(GRAVE_SPOT[0] - 0.4, 0, GRAVE_SPOT[2] - 1.6);
    mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), lam2({ color: "#7a5c36", map: rep(soilTex(), 1, 1) }));
    sack.scale.set(1, 0.78, 1); sack.position.set(GRAVE_SPOT[0] + 1.1, 0.32, GRAVE_SPOT[2] - 0.4);
    sack.castShadow = true; R.add(sack);
    // the churchyard fence
    const fenceM = lam2({ color: "#4c3a26", map: rep(soilTex(), 2, 1) });
    for (const sx of [-1, 1]) {
      for (let z = 96; z <= 140; z += 4.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), fenceM);
        post.position.set(sx * 29, 0.57, z); post.castShadow = true; R.add(post);
      }
      for (const ry of [0.45, 0.9]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 45), fenceM);
        rail.position.set(sx * 29, ry, 118); R.add(rail);
      }
    }
    // trees around the yard (they sway in update)
    const greens: [string, string, string] = ["#8ab464", "#a2cc7c", "#74a452"];
    const treeSpots: [number, number, number][] = [
      [-24, 106, 7.5], [21, 103, 8.5], [-19, 143, 7], [25, 147, 9], [15, 95, 6.5],
      [-31, 124, 8], [31, 118, 7.5], [-15, 162, 9], [19, 163, 8],
    ];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, i * 7 + 3);
      t.position.set(x, 0, z); R.add(t);
      this.trees.push({ g: t, ph: i * 0.83 });
      blob(R, x, 0.01, z, h * 0.9, h * 0.9, 0.5);
    });
  }

  // ---------------- drifting dust in the window light ----------------
  private buildDust(R: THREE.Group, r: () => number) {
    const N = 240;
    const pos = new Float32Array(N * 3);
    this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = -11 + r() * 22, y = 0.3 + r() * 8.6, z = -50 + r() * 54;
      pos.set([x, y, z], i * 3); this.dustBase.set([x, y, z], i * 3);
      this.dustPh.push(r() * 20);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      map: dustTex(), size: 0.14, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true,
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
    this.winMat.emissiveIntensity = s.light === "golden" ? 0.55 : 0.3;
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
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // ---------------- THE CHANDELIER: swaying, always ----------------
    this.chandelier.rotation.z = swayAt(tt);
    this.chandelier.rotation.x = swayXAt(tt);
    // the garland skulls swing on their strings
    for (const h of this.hangers) {
      h.g.rotation.z = Math.sin(tt * 1.1 + h.ph) * 0.13;
      h.g.rotation.x = Math.cos(tt * 0.9 + h.ph * 1.3) * 0.09;
    }
    // candle flames flicker; the point lights breathe with them
    for (const fl of this.flames) {
      const f1 = 0.88 + 0.16 * Math.sin(tt * 13 + fl.ph) * Math.sin(tt * 7.3 + fl.ph * 2.1);
      fl.sp.scale.set(0.3 * f1 * fl.base, 0.46 * (2 - f1) * fl.base, 1);
      (fl.sp.material as THREE.SpriteMaterial).opacity = 0.85 + 0.15 * Math.sin(tt * 11 + fl.ph);
    }
    this.candleLights.forEach((pl, i) => {
      pl.intensity = (i === 0 ? 42 : 30) * (0.9 + 0.13 * Math.sin(tt * 12.7 + i * 4.1) * Math.sin(tt * 6.3 + i));
    });
    // dust motes drift in the window light, sinking slowly
    {
      const attr = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < this.dustPh.length; i++) {
        const ph = this.dustPh[i];
        arr[i * 3] = this.dustBase[i * 3] + Math.sin(tt * 0.3 + ph) * 0.45;
        arr[i * 3 + 1] = 0.3 + ((this.dustBase[i * 3 + 1] - 0.3 - tt * 0.07 - ph * 0.13) % 8.6 + 8.6) % 8.6;
        arr[i * 3 + 2] = this.dustBase[i * 3 + 2] + Math.cos(tt * 0.24 + ph * 1.7) * 0.4;
      }
      attr.needsUpdate = true;
      this.dust.visible = id <= 2 || id >= 6; // interior shots only
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
