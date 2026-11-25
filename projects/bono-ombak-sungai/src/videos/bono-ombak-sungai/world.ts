// The Kampar River, Riau as one three.js scene for the
// Fafnir-ID format: a wide muddy-green river running between
// jungle banks, the stilt village of Teluk Meranti on the
// east bank — and the Bono itself, a foam-crested tidal-bore
// wall that is ALREADY rolling at frame 0 and never stops
// moving in any shot. VISUAL CORE: tea-brown-green water,
// white churned foam, layered jungle greens, textured
// everything (anti-banding: speckled sky, flecked foliage,
// grainy mud). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, water } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, RIVER_HALF, WATER_Y, BANK_Y, JETTY, VILLAGE, NARROWS_Z, CROC_SPOT, GHOST_Z, boreZAt, boreScaleAt, surfPosAt, boatPosAt, clamp01, lin } from "./story";

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
const skyTexDay = () => ctex("bonoSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1c5cc4"); grad.addColorStop(0.34, "#3a7fdd"); grad.addColorStop(0.62, "#7db1ec");
  grad.addColorStop(0.85, "#c6dcef"); grad.addColorStop(1, "#eef0d8");
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
const glowTex = () => ctex("bonoGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a pale full-moon disc with mottling (the tide's master clock) */
const moonTex = () => ctex("bonoMoon", 256, 256, (g, r) => {
  const gr = g.createRadialGradient(128, 128, 60, 128, 128, 126);
  gr.addColorStop(0, "rgba(238,240,244,0.95)"); gr.addColorStop(0.82, "rgba(226,230,238,0.92)"); gr.addColorStop(1, "rgba(226,230,238,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(168,176,192,${0.10 + r() * 0.14})`;
    g.beginPath(); g.arc(50 + r() * 156, 50 + r() * 156, 5 + r() * 15, 0, 7); g.fill();
  }
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("bonoBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture in layered jungle greens */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#476b34"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(16,32,12,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(208,234,168,${0.12 + r() * 0.22})` : `rgba(12,28,8,${0.10 + r() * 0.18})`;
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
/** jungle-floor grass: deep green body, light patches, blades */
const grassTex = () => ctex("bonoGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4f7038"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "36,58,22" : "126,158,80";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.32 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#33511e", "#466c2a", "#619144", "#84a856", "#3e6028"];
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
/** wet river mud: brown-grey, cracked sheen patches, grit */
const mudTex = () => ctex("bonoMud", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#77643f"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 120, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "84,64,36" : "168,140,96";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.30 : 0.24})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.5 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) { // drying cracks
    let x = r() * S, y = r() * S;
    g.strokeStyle = `rgba(52,38,20,${0.25 + r() * 0.2})`; g.lineWidth = 1.4 + r();
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "232,206,160" : "56,36,18"},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 2.2, 2.2); }
});
/** churned foam: white streaks, bubbles and lace edges on
 *  transparent ground — for the crest, the churn and spray */
const foamTex = (key: string) => ctex(key, 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 512, y = r() * 256, rad = 6 + r() * 30;
    const gr = g.createRadialGradient(x, y, 1, x, y, rad);
    gr.addColorStop(0, `rgba(252,254,255,${0.25 + r() * 0.4})`); gr.addColorStop(1, "rgba(252,254,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 130; i++) { // dragged streaks
    const x = r() * 512, y = r() * 256, l = 18 + r() * 60;
    g.strokeStyle = `rgba(250,252,255,${0.16 + r() * 0.3})`; g.lineWidth = 1.5 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 8); g.stroke();
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; g.beginPath(); g.arc(r() * 512, r() * 256, 0.8 + r() * 2.2, 0, 7); g.fill(); }
});
/** the village name board: painted planks + bold lettering */
const signTex = () => ctex("bonoSign", 1024, 256, (g, r) => {
  g.fillStyle = "#7a5a34"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 1600; i++) {
    g.strokeStyle = `rgba(${r() > 0.45 ? "196,158,102" : "96,68,36"},${0.12 + r() * 0.16})`;
    g.lineWidth = 1.2 + r() * 1.2;
    const x = r() * 1024, y = r() * 256;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 + r() * 44, y + (r() - 0.5) * 4); g.stroke();
  }
  for (const y of [84, 168]) { g.fillStyle = "rgba(46,30,14,0.6)"; g.fillRect(0, y, 1024, 5); }
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(40,24,8,0.55)"; g.fillText("TELUK MERANTI", 515, 136);
  g.fillStyle = "#f6e8c8"; g.fillText("TELUK MERANTI", 512, 130);
});
/** the tide board at the jetty: a chalked grid + a moon */
const tideTex = () => ctex("bonoTide", 512, 640, (g, r) => {
  g.fillStyle = "#2e3d33"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "rgba(240,244,230,0.85)"; g.lineWidth = 5; g.strokeRect(14, 14, 484, 612);
  g.font = "900 54px 'Arial Black', Arial, sans-serif"; g.textAlign = "center";
  g.fillStyle = "#f2ecd8"; g.fillText("JADWAL", 256, 78); g.fillText("BONO", 256, 140);
  g.beginPath(); g.arc(256, 228, 44, 0, 7); g.fillStyle = "#e8ecf2"; g.fill();
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(160,168,184,${0.2 + r() * 0.2})`; g.beginPath(); g.arc(228 + r() * 56, 200 + r() * 56, 4 + r() * 8, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(240,244,230,0.6)"; g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(52, 330 + i * 58); g.lineTo(460, 330 + i * 58); g.stroke(); }
  g.beginPath(); g.moveTo(190, 302); g.lineTo(190, 592); g.stroke();
  g.font = "700 40px Arial, sans-serif"; g.fillStyle = "rgba(242,236,216,0.9)";
  for (let i = 0; i < 5; i++) { g.fillText(`${11 + i}.00`, 118, 356 + i * 58); g.fillText("~", 320, 356 + i * 58); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 640, 2.4, 2.4); }
});
const blobTex = () => ctex("bonoBlob", 256, 256, (g) => {
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

/** A round jungle tree: textured trunk + a canopy of layered
 *  flecked blobs (never a green ball). */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ color: "#6d5138", map: rep(mudTex(), 1, 2) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.34, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM(greens[2] ?? greens[0], "bonoFoliageDeep"), folM(greens[0], "bonoFoliageMid"), folM(greens[1] ?? greens[0], "bonoFoliageLite")];
  const cy = h * 0.78, cr = h * 0.42;
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

/** A palm: a leaning ringed trunk and six drooping fronds. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const trunkM = lam2({ color: "#8a7350", map: rep(mudTex(), 1, 3) });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, h, 7), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = 0.1 + tr() * 0.08; trunk.castShadow = true; g.add(trunk);
  const topX = -Math.sin(trunk.rotation.z) * h;
  const frondM = lam2({ color: "#5d8140", map: rep(foliageTex("bonoFoliageMid"), 2, 1), side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + tr() * 0.5;
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, h * 0.52, 1, 4), frondM);
    const pos = fr.geometry.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < pos.count; j++) { const y = pos.getY(j); pos.setZ(j, -((y + h * 0.26) ** 2) * 0.16); }
    fr.geometry.computeVertexNormals();
    fr.position.set(topX, h * 0.99, 0);
    fr.rotation.set(0, a, 0);
    fr.rotateX(-0.5 - tr() * 0.3);
    fr.translateY(h * 0.24);
    fr.castShadow = true; g.add(fr);
  }
  return g;
};

/** A stilt house of Teluk Meranti: plank walls on posts under
 *  a pitched roof, a small stair to the door. */
const makeStiltHouse = (winMat: THREE.MeshLambertMaterial, seed = 1) => {
  const g = new THREE.Group();
  const postM = lam2({ color: "#5f4630", map: rep(planks(), 1, 1) });
  for (const [px, pz] of [[-1.4, -1.1], [1.4, -1.1], [-1.4, 1.1], [1.4, 1.1]] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.5, 7), postM);
    post.position.set(px, 0.75, pz); post.castShadow = true; g.add(post);
  }
  const wallM = lam2({ color: seed % 2 ? "#b08a5c" : "#9aa48e", map: rep(planks(), 2, 1) });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 2.8), wallM);
  walls.position.y = 2.45; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ color: seed % 3 ? "#8d9299" : "#a8542e", map: rep(planks(), 3, 1) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.5, 4), roofM);
  roof.position.y = 4.15; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.95); roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.08), lam2({ color: "#2e2012" }));
  door.position.set(0.5, 2.2, 1.43); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), winMat);
  win.position.set(-0.95, 2.65, 1.43); g.add(win);
  const stair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.7), postM);
  stair.position.set(0.5, 1.15, 2.2); stair.rotation.x = 0.6; g.add(stair);
  return g;
};

/** A wooden sampan: flat bottom, flared sides, upturned ends. */
const makeSampan = (len = 4.6, col = "#8a6a42") => {
  const g = new THREE.Group();
  const woodM = lam2({ color: col, map: rep(planks(), 2, 1) });
  const darkM = lam2({ color: "#4c3a22", map: rep(planks(), 1, 1) });
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, len), darkM);
  bottom.position.y = 0.16; bottom.castShadow = true; g.add(bottom);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, len * 0.94), woodM);
    side.position.set(sx * 0.52, 0.42, 0); side.rotation.z = sx * -0.28; side.castShadow = true; g.add(side);
  }
  for (const sz of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.09), woodM);
    end.position.set(0, 0.52, sz * len * 0.48); end.rotation.x = sz * 0.5; end.castShadow = true; g.add(end);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.4), darkM);
  bench.position.set(0, 0.5, -0.4); g.add(bench);
  const bench2 = bench.clone(); bench2.position.z = 0.9; g.add(bench2);
  return g;
};

/** The rescue boat: a bright hull, a console, an outboard. */
const makeRescueBoat = () => {
  const g = new THREE.Group();
  const hullM = lam2({ color: "#e8e4da", map: rep(planks(), 2, 1) });
  const trimM = lam2({ color: "#d8542e" });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 5.2), hullM);
  hull.position.y = 0.42; hull.castShadow = true; g.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.16, 5.24), trimM);
  stripe.position.y = 0.62; g.add(stripe);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.86, 1.4, 4), hullM);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 0.42, 1);
  bow.position.set(0, 0.42, 3.2); g.add(bow);
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), trimM);
  console_.position.set(0, 0.95, 0.5); console_.castShadow = true; g.add(console_);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.3), lam2({ color: "#2c2f36" }));
  motor.position.set(0, 0.75, -2.75); motor.castShadow = true; g.add(motor);
  return g;
};

/** The bore wall: an extruded curl profile swept across the
 *  river — steep foam-ready face toward +z (upstream), a
 *  curling lip, a long churned back slope. */
const boreWallGeo = (width: number) => {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [5.2, 0], [3.4, 0.8], [2.2, 2.2], [1.35, 3.9], [0.7, 5.3], [0.15, 6.05],
    [-0.8, 5.85], [-1.45, 4.5], [-2.3, 2.4], [-3.4, 0.9], [-5.4, 0],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.lineTo(5.2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, steps: 1 });
  geo.rotateY(-Math.PI / 2); // shape +x (the steep face) -> world +z; extrusion -> -x
  geo.translate(width / 2, 0, 0);
  // vertex colours by height: white foam at the crest, pale churn
  // on the upper face, muddy green-brown below — the wall reads
  // as WATER from any angle (an extrude's UVs are unusable, so
  // no map on the wall; colour carries it)
  const pos = geo.getAttribute("position");
  const cols = new Float32Array(pos.count * 3);
  const cTop = new THREE.Color("#f4f8f2"), cMid = new THREE.Color("#bcc7a6");
  const cLow = new THREE.Color("#79843f"), cBase = new THREE.Color("#4c5527");
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 4.6) tmp.copy(cMid).lerp(cTop, Math.min(1, (y - 4.6) / 1.4));
    else if (y > 2.2) tmp.copy(cLow).lerp(cMid, (y - 2.2) / 2.4);
    else tmp.copy(cBase).lerp(cLow, Math.max(0, y) / 2.2);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return geo;
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
  private waterMap: THREE.Texture | null = null;
  // ---- episode systems ----
  private bore!: THREE.Group;
  private boreCrest!: THREE.Mesh;
  private boreChurn!: THREE.Mesh;
  private churnMap: THREE.Texture | null = null;
  private faceMap: THREE.Texture | null = null;
  private sprays: THREE.Sprite[] = [];
  private ghosts: THREE.Group[] = [];
  private croc!: THREE.Group;
  private crocTail!: THREE.Object3D;
  private rescue!: THREE.Group;
  private board!: THREE.Mesh;
  private sampans: { g: THREE.Group; z: number; amp: number }[] = [];
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
    // ---- sky dome + clouds + moon ----
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
    // the pale full moon, high over the up-river sky (shot 8's clock)
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
    moon.position.set(-30, 62, -190); moon.scale.set(26, 26, 1); moon.layers.set(NOINK); R.add(moon);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    // shared window material (the village lights up together)
    this.winMat = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.15 });
    this.buildTerrain(R, r);
    this.buildVillage(R, r);
    this.buildBore(R, r);
    this.buildCroc(R, r);
  }

  // ---------------- terrain: water, mud banks, jungle floor ----------------
  private buildTerrain(R: THREE.Group, r: () => number) {
    // the river itself: muddy tea-green, flowing (map kept so
    // update() can scroll it — the water FLOWS, it is not a poster)
    const wmap = rep(water(), 34, 110);
    this.waterMap = wmap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(340, 380), lam2({ map: wmap, color: "#5e6b3c" }));
    river.rotation.x = -Math.PI / 2; river.position.set(0, WATER_Y, -40); river.receiveShadow = true; R.add(river);
    // mud banks sloping from the waterline up to the jungle floor
    const mudM = lam2({ map: rep(mudTex(), 40, 3), color: "#b59a6c" });
    for (const sx of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 380), mudM);
      bank.position.set(sx * (RIVER_HALF + 2.6), 0.55, -40);
      bank.rotation.z = sx * -0.19;
      bank.receiveShadow = true; R.add(bank);
      // the jungle floor behind the bank
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(190, 380), lam2({ map: rep(grassTex(), 60, 90), color: "#86a860" }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(sx * (RIVER_HALF + 6 + 95), BANK_Y - 0.02, -40);
      floor.receiveShadow = true; R.add(floor);
    }
    // mud spits pinching the channel far down-river (the narrows
    // the tide squeezes through, seen in the estuary shot)
    const spitM = lam2({ map: rep(mudTex(), 6, 3), color: "#a8905f" });
    for (const sx of [-1, 1]) {
      const spit = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 26), spitM);
      spit.position.set(sx * (RIVER_HALF - 3), 0.12, -84);
      spit.rotation.y = sx * 0.35;
      spit.receiveShadow = true; R.add(spit);
    }
    // the sandbars and mud shoals the cast stands on: a point bar
    // in the foreground bend, a shoal at the narrows, a long
    // mid-river bar for the watchers, a waterline patch by the
    // croc shallows and a mud bar in the estuary reach
    const barM = lam2({ map: rep(mudTex(), 5, 5), color: "#8f7448" });
    const bar = (x: number, y: number, z: number, rad: number, sx: number, sz: number) => {
      const b = new THREE.Mesh(new THREE.CircleGeometry(rad, 26), barM);
      b.rotation.x = -Math.PI / 2; b.position.set(x, y, z); b.scale.set(sx, sz, 1);
      b.receiveShadow = true; R.add(b);
    };
    bar(10, 0.52, 6, 9, 1.35, 0.85);
    bar(-13, 0.42, -19, 7, 1.0, 0.9);
    bar(-13, 0.38, -4, 7, 1.05, 1.9);
    bar(-16.5, 0.1, -1, 5, 1.0, 1.0);
    bar(8, 0.26, -40, 6.5, 1.1, 0.9);
    // distant jungle ranges closing the horizon
    const farM = lam2({ map: rep(grassTex(), 16, 8), color: "#7d94b8" });
    ([[-190, -230, 120, 34], [80, -250, 140, 38], [220, -160, 100, 26], [-230, -80, 95, 24], [230, 30, 100, 28]] as [number, number, number, number][]).forEach(([x, z, w, h]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), farM);
      m.scale.set(w, h, w * 0.45);
      m.position.set(x, -h * 0.3, z);
      R.add(m);
    });
    // ---- the jungle: dense trees + palms along both banks ----
    const greens = ["#5d8140", "#77994f", "#476b32"];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, BANK_Y - 0.05, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 0.83 });
    };
    const palmAt = (x: number, z: number, h: number, seed: number) => {
      const t = makePalm(h, seed);
      t.position.set(x, BANK_Y - 0.05, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.13 });
    };
    let seed = 100;
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 17; i++) {
        const z = 52 - i * 13 - (seed % 5);
        const x = sx * (24 + ((seed * 7) % 16));
        if (sx > 0 && Math.hypot(x - VILLAGE[0], z - VILLAGE[2]) < 15) { seed += 3; continue; }
        if ((seed + i) % 4 === 0) palmAt(x, z, 6.5 + (seed % 3), seed);
        else treeAt(x, z, 6 + (seed % 4), seed);
        seed += 7;
      }
      // a second, deeper row for the layered jungle depth
      for (let i = 0; i < 10; i++) {
        const z = 44 - i * 19 - (seed % 6);
        treeAt(sx * (46 + ((seed * 5) % 20)), z, 8 + (seed % 4), seed + 300);
        seed += 11;
      }
    }
    // ---- grass tufts on the bank floors ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 700; i++) {
      const sx = r() > 0.5 ? 1 : -1;
      const x = sx * (RIVER_HALF + 5 + r() * 26), z = 60 - r() * 230;
      if (sx > 0 && Math.hypot(x - VILLAGE[0], z - VILLAGE[2]) < 13) continue;
      tuftPts.push({ x, z, s: 0.6 + r() * 0.9 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, BANK_Y - 0.02, p.z); dummy.rotation.set(0, yaw, 0);
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

  // ---------------- Teluk Meranti: stilt village + jetty ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    // the village clearing on the east bank
    const clearing = new THREE.Mesh(new THREE.CircleGeometry(16, 26), lam2({ map: rep(mudTex(), 7, 7), color: "#c2a878" }));
    clearing.rotation.x = -Math.PI / 2; clearing.position.set(VILLAGE[0], BANK_Y + 0.01, VILLAGE[2]); clearing.receiveShadow = true; R.add(clearing);
    const houseSpots: [number, number, number][] = [
      [24, 4, 0.5], [31, 2, -0.3], [36, 10, 0.9], [25, 16, -0.6],
      [33, 20, 0.2], [38, 26, -0.9], [27, 30, 0.6], [22, 24, 1.2],
    ];
    houseSpots.forEach(([x, z, yaw], i) => {
      const h = makeStiltHouse(this.winMat, i * 3 + 1);
      h.position.set(x, BANK_Y, z);
      h.rotation.y = yaw - Math.PI / 2; // doors face the river (-x)
      R.add(h);
      blob(R, x, BANK_Y + 0.02, z, 4.6, 4.0, 0.22);
    });
    // the village name board at the path down to the jetty
    {
      const g = new THREE.Group();
      const postM = lam2({ color: "#5f4630", map: rep(planks(), 1, 1) });
      for (const px of [-2.2, 2.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 7), postM);
        post.position.set(px, 1.3, 0); post.castShadow = true; g.add(post);
      }
      const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.3, 0.1), lam2({ map: signTex() }));
      board.position.set(0, 2.2, 0); board.castShadow = true; g.add(board);
      g.position.set(21.5, BANK_Y, 2);
      g.rotation.y = -0.5;
      R.add(g);
    }
    // ---- the jetty: a plank deck on posts over the waterline ----
    {
      const g = new THREE.Group();
      const postM = lam2({ color: "#5f4630", map: rep(planks(), 1, 1) });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.16, 3.2), lam2({ color: "#9a7a52", map: rep(planks(), 4, 2) }));
      deck.position.set(0, 1.05, 0); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
      for (const [px, pz] of [[-3.4, -1.3], [0, -1.3], [3.4, -1.3], [-3.4, 1.3], [0, 1.3], [3.4, 1.3]] as [number, number][]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.6, 7), postM);
        post.position.set(px, 0.3, pz); g.add(post);
      }
      // the tide board stands at the deck's river end
      const tb = new THREE.Group();
      for (const px of [-0.75, 0.75]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.5, 6), postM);
        post.position.set(px, 1.25, 0); tb.add(post);
      }
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 0.07), lam2({ map: tideTex() }));
      panel.position.set(0, 2.6, 0); panel.castShadow = true; tb.add(panel);
      tb.position.set(-3.2, 1.1, -1.1);
      tb.rotation.y = 0.35;
      g.add(tb);
      g.position.set(JETTY[0], 0, JETTY[2]);
      R.add(g);
      blob(R, JETTY[0], 0.06, JETTY[2], 8.6, 4.6, 0.25);
    }
    // moored sampans along the east bank + one at the west bank
    const moor = (x: number, z: number, yaw: number, col: string, amp: number) => {
      const s = makeSampan(4.6, col);
      s.position.set(x, WATER_Y + 0.05, z);
      s.rotation.y = yaw;
      R.add(s);
      this.sampans.push({ g: s, z, amp });
      blob(R, x, 0.06, z, 2.2, 5.4, 0.3);
    };
    moor(14.8, 14.5, 0.25, "#8a6a42", 0.5);
    moor(15.2, -2, -0.15, "#7a5c38", 0.5);
    moor(-13, 10, 0.4, "#6d5138", 1.0);   // the west-bank boat (shot 5) — rocks hard as the bore passes
    moor(9, GHOST_Z + 7, 0.9, "#5f4630", 0.8); // the old sampan among the ghosts (shot 7)
    moor(11.5, -36, -0.3, "#7a5c38", 0.5); // moored by the estuary mud bar (shot 3)
    // the rescue boat, parked by the jetty until shot 6 calls it
    this.rescue = makeRescueBoat();
    this.rescue.position.set(12.5, WATER_Y + 0.02, 20);
    this.rescue.rotation.y = 0.2;
    R.add(this.rescue);
    blob(R, 12.5, 0.06, 20, 2.6, 6.2, 0.3);
    // the hero's surfboard (shot 6) — built now, posed in update
    this.board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 2.6),
      lam2({ color: "#f2b21c", map: rep(planks(), 1, 2) }));
    this.board.castShadow = true;
    this.board.visible = false;
    R.add(this.board);
    void r;
  }

  // ---------------- the Bono itself ----------------
  private buildBore(R: THREE.Group, r: () => number) {
    const g = new THREE.Group();
    const wallM = lam2({ vertexColors: true });
    const wall = new THREE.Mesh(boreWallGeo(RIVER_HALF * 2), wallM);
    wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
    // the foam crest riding the lip — a bright churned band
    const crestMap = rep(foamTex("bonoFoamCrest"), 8, 1);
    this.boreCrest = new THREE.Mesh(new THREE.BoxGeometry(RIVER_HALF * 2, 0.7, 2.6),
      new THREE.MeshBasicMaterial({ map: crestMap, transparent: true, depthWrite: false, opacity: 0.95 }));
    this.boreCrest.position.set(0, 5.9, -0.35);
    this.boreCrest.renderOrder = 3;
    g.add(this.boreCrest);
    // the face wash: a translucent foam-streaked sheet hugging the
    // steep face, its texture scrolling DOWN in update — water
    // visibly rushing down the wall, never a flat green slab
    const faceMap = rep(foamTex("bonoFoamFace"), 6, 1);
    this.faceMap = faceMap;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_HALF * 2, 5.6),
      new THREE.MeshBasicMaterial({ map: faceMap, transparent: true, depthWrite: false, opacity: 0.3, color: "#b9cdc0" }));
    face.position.set(0, 2.75, 2.3);
    face.rotation.x = -0.5;
    face.renderOrder = 3;
    g.add(face);
    // the churn: a boiling foam sheet trailing the wall
    const churnMap = rep(foamTex("bonoFoamChurn"), 7, 3);
    this.churnMap = churnMap;
    this.boreChurn = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_HALF * 2, 13),
      new THREE.MeshBasicMaterial({ map: churnMap, transparent: true, depthWrite: false, opacity: 0.55 }));
    this.boreChurn.rotation.x = -Math.PI / 2;
    this.boreChurn.position.set(0, 0.09, -9.5);
    this.boreChurn.renderOrder = 2;
    g.add(this.boreChurn);
    // two trailing wavelets — Bono is a series, never one wave
    for (const [dz, sy] of [[-10.5, 0.45], [-18, 0.3]] as [number, number][]) {
      const w = new THREE.Mesh(boreWallGeo(RIVER_HALF * 2), wallM);
      w.scale.set(1, sy, 0.8);
      w.position.set(0, 0, dz);
      w.castShadow = true;
      g.add(w);
      const c = new THREE.Mesh(new THREE.BoxGeometry(RIVER_HALF * 2, 0.4, 1.6),
        new THREE.MeshBasicMaterial({ map: crestMap, transparent: true, depthWrite: false, opacity: 0.8 }));
      c.position.set(0, 6.05 * sy, dz - 0.3);
      c.renderOrder = 3;
      g.add(c);
    }
    // spray bursting off the lip
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: foamTex("bonoSpray" + i), transparent: true, depthWrite: false, opacity: 0.75 }));
      sp.position.set(-RIVER_HALF + 3 + i * 2.9 + (r() - 0.5), 6.6 + (r() - 0.5) * 0.7, 0.6);
      sp.scale.set(3.2, 2.0, 1);
      sp.layers.set(NOINK);
      g.add(sp);
      this.sprays.push(sp);
    }
    g.position.set(0, WATER_Y, -20);
    R.add(g);
    this.bore = g;
    // ---- the seven ghosts: a row of seven crests mid-river ----
    for (let i = 0; i < 7; i++) {
      const h = new THREE.Group();
      const w = new THREE.Mesh(boreWallGeo(4.6), wallM);
      w.scale.set(1, 0.5, 0.9);
      w.castShadow = true;
      h.add(w);
      const c = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.34, 1.3),
        new THREE.MeshBasicMaterial({ map: crestMap, transparent: true, depthWrite: false, opacity: 0.85 }));
      c.position.set(0, 3.0, -0.25);
      c.renderOrder = 3;
      h.add(c);
      h.position.set(-15 + i * 5, WATER_Y, GHOST_Z + ((i * 37) % 3 - 1) * 1.2);
      R.add(h);
      this.ghosts.push(h);
    }
    void r;
  }

  // ---------------- the crocodile ----------------
  private buildCroc(R: THREE.Group, r: () => number) {
    const g = new THREE.Group();
    const skinM = lam2({ color: "#556038", map: rep(mudTex(), 2, 1) });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), skinM);
    body.scale.set(0.62, 0.3, 2.3); body.position.y = -0.1; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skinM);
    head.scale.set(0.5, 0.24, 0.9); head.position.set(0, -0.06, 2.6); g.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 1.0), skinM);
    snout.position.set(0, -0.1, 3.9); g.add(snout);
    // the eyes: two bumps with dark pupils, just at the surface
    const eyeM = lam2({ color: "#2c2416" });
    for (const sx of [-1, 1]) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skinM);
      bump.position.set(sx * 0.26, 0.14, 2.75); g.add(bump);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeM);
      eye.position.set(sx * 0.26, 0.22, 2.78); g.add(eye);
      const nos = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeM);
      nos.position.set(sx * 0.14, 0.05, 4.32); g.add(nos);
    }
    // back ridges
    for (let i = 0; i < 6; i++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 5), skinM);
      ridge.position.set(0, 0.16, 1.4 - i * 0.55);
      g.add(ridge);
    }
    // the tail, swaying in update
    const tail = new THREE.Group();
    tail.position.set(0, -0.08, -2.2);
    const tm = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.6, 7), skinM);
    tm.rotation.x = -Math.PI / 2;
    tm.position.set(0, 0, -1.3);
    tm.scale.set(1, 1, 0.45);
    tail.add(tm);
    g.add(tail);
    this.crocTail = tail;
    g.position.set(CROC_SPOT[0], WATER_Y, CROC_SPOT[2]);
    g.rotation.y = 0.5;
    R.add(g);
    this.croc = g;
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
        d.position.set(p.x, BANK_Y - 0.02, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // the river flows downstream (+z), always
    if (this.waterMap) this.waterMap.offset.set(0, tt * 0.045);
    // ---------------- THE BORE: the wall, always rolling ----------------
    {
      const bz = boreZAt(id, U), bs = boreScaleAt(id);
      this.bore.position.set(0, WATER_Y, bz);
      this.bore.scale.set(1, bs * (1 + Math.sin(tt * 2.3) * 0.012), 1);
      this.bore.rotation.z = Math.sin(tt * 1.1) * 0.004;
      if (this.churnMap) this.churnMap.offset.set(tt * 0.35, tt * 0.8);
      if (this.faceMap) this.faceMap.offset.set(0, -tt * 1.4);
      const crash = id === 4 ? 1.7 : 1;
      this.sprays.forEach((sp, i) => {
        const fl = 0.75 + 0.45 * Math.sin(tt * 11 + i * 1.93) * Math.sin(tt * 5.7 + i);
        sp.scale.set(3.2 * fl * crash, 2.0 * fl * crash, 1);
        (sp.material as THREE.SpriteMaterial).opacity = 0.45 + 0.3 * fl;
      });
      void lin;
    }
    // the seven ghosts bob in their line, crests breathing —
    // they exist only in the aerial (shot 2) and their own shot
    // (7); anywhere else they'd clutter the foreground
    this.ghosts.forEach((h, i) => {
      h.visible = id === 2 || id === 7;
      h.position.y = WATER_Y + Math.sin(tt * 1.4 + i * 0.9) * 0.14;
      h.position.z = GHOST_Z + ((i * 37) % 3 - 1) * 1.2 + Math.sin(tt * 0.7 + i) * 0.5;
    });
    // moored boats bob; the west-bank and ghost sampans rock
    // hard while the bore is near their z
    for (const sm of this.sampans) {
      const near = Math.max(0, 1 - Math.abs(boreZAt(id, U) - sm.z) / 16);
      sm.g.position.y = WATER_Y + 0.05 + Math.sin(tt * 1.8 + sm.z) * 0.05;
      sm.g.rotation.z = Math.sin(tt * (1.6 + near * 2.2) + sm.z * 1.3) * (0.02 + near * 0.13 * sm.amp);
      sm.g.rotation.x = Math.cos(tt * 1.3 + sm.z) * (0.012 + near * 0.05 * sm.amp);
    }
    // the crocodile drifts almost imperceptibly, tail swaying
    {
      this.croc.position.x = CROC_SPOT[0] + Math.sin(tt * 0.11) * 0.8;
      this.croc.position.z = CROC_SPOT[2] + Math.sin(tt * 0.07 + 1) * 0.6;
      this.croc.rotation.y = 0.5 + Math.sin(tt * 0.09) * 0.14;
      this.crocTail.rotation.y = Math.sin(tt * 1.1) * 0.16;
    }
    // shot 6: the rescue boat runs with the surfer; the board
    // rides the face under the hero's feet
    if (id === 6) {
      const bp = boatPosAt(U);
      this.rescue.position.set(bp[0], WATER_Y + 0.02 + Math.sin(tt * 2.6) * 0.05, bp[2]);
      this.rescue.rotation.set(Math.sin(tt * 2.2) * 0.02, 0, Math.sin(tt * 1.9) * 0.03);
      const sp2 = surfPosAt(U);
      this.board.visible = true;
      this.board.position.set(sp2[0], sp2[1] - 0.06 + Math.sin(tt * 2.6 + 0.6) * 0.05, sp2[2]);
      this.board.rotation.set(-0.3, 0, Math.sin(tt * 1.7) * 0.05);
    } else {
      this.rescue.position.set(12.5, WATER_Y + 0.02 + Math.sin(tt * 1.8 + 20) * 0.04, 20);
      this.rescue.rotation.set(0, 0.2, Math.sin(tt * 1.5) * 0.015);
      this.board.visible = false;
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
