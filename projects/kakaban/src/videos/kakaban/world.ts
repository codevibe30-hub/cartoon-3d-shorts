// Danau Kakaban, Kalimantan Timur as one three.js scene for the
// Fafnir-ID format: a prehistoric marine lake trapped inside a
// coral island — turquoise brackish water stretching to a jungle
// karst ridge, mangroves on the shore, a wooden jetty, and
// MILLIONS of stingless jellyfish (here: dozens of pulsing 3D
// jellies standing in for the millions) — golden Mastigias,
// translucent moon jellies, and upside-down Cassiopea resting on
// the sand bar. The hero's wooden boat floats in the near
// foreground with the hero standing in it, shocked at the size
// of the claim. VISUAL CORE: bright tropical daylight, saturated
// turquoise + jungle green, textured everything (anti-banding:
// speckled sky, flecked water, woven foliage). Layered light
// rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_BOAT, JETTY_X, RIDGE_Z, SAND_BAR, clamp01, heroBoatAt } from "./story";

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
const skyTexDay = () => ctex("kakabanSkyDay2", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("kakabanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("kakabanBirds", 256, 96, (g, r) => {
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
/** RICH grass (anti-flat pass): deep shadow pockets, a mid-green
 *  body, sunlit fleck clusters and thousands of individual blades
 *  in five greens with hard value contrast, on a deep base. */
const grassRichTex = () => ctex("kakabanGrassRich", 1024, 1024, (g, r) => {
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
/** bare earth for tree bases: warm brown speckled with clods */
const soilTex = () => ctex("kakabanSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** pale lake-bed sand for the shallows: fine bright speckle over
 *  a warm sand base with soft darker patches */
const sandTex = () => ctex("kakabanSand", 512, 512, (g, r) => {
  g.fillStyle = "#d9c491"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "168,142,92" : "240,226,180"},${0.10 + r() * 0.16})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 34, 6 + r() * 20, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,96,54" : "255,248,220"},${0.08 + r() * 0.18})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
});
/** karst rock: grey-brown strata bands, cracked speckle and
 *  mossy green stains — the 50 m wall is geology, not a backdrop */
const rockTex = () => ctex("kakabanRock", 512, 512, (g, r) => {
  g.fillStyle = "#8a7a63"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 26 + r() * 22) { // strata
    g.fillStyle = `rgba(${r() > 0.5 ? "58,48,36" : "178,162,132"},${0.16 + r() * 0.14})`;
    g.fillRect(0, y, 512, 5 + r() * 9);
  }
  for (let i = 0; i < 130; i++) { // blocky patches
    g.fillStyle = `rgba(${r() > 0.5 ? "66,56,42" : "186,170,140"},${0.08 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 12 + r() * 38, 8 + r() * 22, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 46; i++) { // moss stains
    g.fillStyle = `rgba(84,120,52,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 26, 6 + r() * 16, r() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(40,32,22,0.35)"; g.lineWidth = 1.6; // cracks
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 26, y + 14 + r() * 30); g.stroke();
  }
  for (let i = 0; i < 3800; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,24,16" : "230,220,196"},${0.05 + r() * 0.10})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("kakabanPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground/water (shade patches,
 *  sun pools) — the blob-shadow trick, tinted */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("kakabanBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("kakabanBlob", 256, 256, (g) => {
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

/** A low wooden boat: flat bottom, flared plank sides, bench
 *  seats. Bow toward +Z. The HERO boat uses plain Lambert
 *  materials on purpose (house lesson: the two-tone shade
 *  multiplier crushes its camera-facing panels into dark violet;
 *  warm amber albedo + real sun keeps it timber). */
const makeBoat = (hullCol: string, len = 4.6, wid = 1.5, hero = false) => {
  const g = new THREE.Group();
  const hullM = hero
    ? new THREE.MeshLambertMaterial({ color: hullCol, map: rep(planks(), 2, 1) })
    : lam2({ color: hullCol, map: rep(planks(), 2, 1) });
  const innerM = hero
    ? new THREE.MeshLambertMaterial({ color: "#bd8a52", map: rep(planks(), 2, 1) })
    : lam2({ color: "#a87c4c", map: rep(planks(), 2, 1) });
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.14, len), hullM);
  bottom.position.y = 0.28; bottom.castShadow = true; g.add(bottom);
  for (const s of [1, -1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, len), hullM);
    side.position.set(s * (wid / 2 - 0.02), 0.55, 0); side.rotation.z = -s * 0.18; side.castShadow = true; g.add(side);
    const rimT = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, len + 0.1), innerM);
    rimT.position.set(s * (wid / 2 + 0.06), 0.83, 0); g.add(rimT);
  }
  for (const e of [1, -1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.1, 0.5, 0.1), hullM);
    end.position.set(0, 0.62, e * (len / 2 - 0.02)); end.rotation.x = e * 0.35; g.add(end);
  }
  for (const bz of [-len / 4, len / 4]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.24, 0.07, 0.42), innerM);
    bench.position.set(0, 0.62, bz); g.add(bench);
  }
  return g;
};

/** The wooden jetty at JETTY_X: a plank deck on posts reaching
 *  from the near shore (z 17) out over the water (z 4), a rail
 *  on the west side and a ladder dropping in at the far end —
 *  the only way into this lake is down that ladder, gently. */
const makeJetty = () => {
  const g = new THREE.Group();
  const deckM = lam2({ map: rep(planks(), 1, 5), color: "#c79a67" });
  const postM = lam2({ color: "#7d5a36", map: rep(barkTex(), 1, 1) });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 13), deckM);
  deck.position.set(0, 0.55, 0); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  for (let i = 0; i < 5; i++) for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 7), postM);
    post.position.set(s * 0.85, -0.1, -5.4 + i * 2.7); post.castShadow = true; g.add(post);
  }
  // west rail: posts + a worn top rail
  for (let i = 0; i < 5; i++) {
    const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), postM);
    rp.position.set(-0.92, 1.0, -5.4 + i * 2.7); g.add(rp);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 12.6), postM);
  rail.position.set(-0.92, 1.42, 0); g.add(rail);
  // the ladder at the far (lake) end: two stiles + three rungs
  for (const s of [1, -1]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.7, 0.07), postM);
    st.position.set(s * 0.4, -0.1, -6.6); g.add(st);
  }
  for (let i = 0; i < 3; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), postM);
    rung.position.set(0, 0.35 - i * 0.42, -6.6); g.add(rung);
  }
  return g;
};

/** A tree with a REAL canopy (anti-flat pass): a bark-textured
 *  trunk with angled branches, and 9-13 overlapping foliage
 *  blobs in three depth layers — deep shadow green low, mid
 *  green main mass, sunlit flecks on top — all carrying a
 *  leaf-fleck texture so no surface is a smooth ball again. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "kakabanFoliageDeep"),
    folM(greens[0], "kakabanFoliageMid"),
    folM(greens[1] ?? greens[0], "kakabanFoliageLite"),
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
 *  vertex-coloured dark base -> sunlit tip. Instanced along the
 *  shores so ground edges stop being ruler-straight lines. */
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

/** A JELLYFISH: a translucent bell with a glowing inner core,
 *  frilly oral arms and a skirt of fine tentacles. The bell
 *  PULSES (update() animates it) — a jellyfish that hangs frozen
 *  fails the motion standard. `simple` drops the tentacles for
 *  the distant crowd; `flip` turns the whole animal upside-down
 *  (Cassiopea resting on the sand bar, arms to the sun). */
const makeJelly = (col: string, s = 1, opts: { flip?: boolean; simple?: boolean } = {}) => {
  const g = new THREE.Group();
  const bellM = new THREE.MeshLambertMaterial({
    color: col, transparent: true, opacity: 0.55, emissive: col, emissiveIntensity: 0.30,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), bellM);
  bell.scale.y = 0.78;
  g.add(bell);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 8),
    new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.8, emissive: col, emissiveIntensity: 0.55, depthWrite: false }));
  core.position.y = 0.10; core.scale.y = 0.55; g.add(core);
  const armM = new THREE.MeshLambertMaterial({
    color: col, transparent: true, opacity: 0.5, emissive: col, emissiveIntensity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  });
  if (opts.simple) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.16, 0.55, 12, 1, true), armM);
    skirt.position.y = -0.32; g.add(skirt);
  } else {
    for (let i = 0; i < 5; i++) { // frilly oral arms from the bell's heart
      const a = (i / 5) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 7), armM);
      arm.position.set(Math.cos(a) * 0.14, -0.34, Math.sin(a) * 0.14);
      arm.rotation.x = Math.PI + Math.sin(a) * 0.22; arm.rotation.z = Math.cos(a) * 0.22;
      g.add(arm);
    }
    const tentM = new THREE.MeshLambertMaterial({
      color: col, transparent: true, opacity: 0.42, emissive: col, emissiveIntensity: 0.18, depthWrite: false,
    });
    for (let i = 0; i < 10; i++) { // fine tentacles around the rim
      const a = (i / 10) * Math.PI * 2;
      const tn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.85, 4), tentM);
      tn.position.set(Math.cos(a) * 0.44, -0.48, Math.sin(a) * 0.44);
      tn.rotation.z = Math.cos(a) * 0.16; tn.rotation.x = -Math.sin(a) * 0.16;
      g.add(tn);
    }
  }
  if (opts.flip) g.rotation.z = Math.PI; // bell down, arms up to the sun
  g.scale.setScalar(s);
  return { g, bell };
};

type JellyRec = { g: THREE.Group; bell: THREE.Mesh; ph: number; y0: number; cx: number; cz: number; drift: number; flip: boolean };

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
  private heroBoat: THREE.Group;
  private heroBlob: THREE.Mesh | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private reeds: { m: THREE.Mesh; ph: number }[] = [];
  private jellies: JellyRec[] = [];
  private mooredBoats: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2377);
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
    // the sun's halo + core, upper left across the lake
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
    this.buildLake(R, r);
    // ---- the hero's boat in the near foreground ----
    this.heroBoat = makeBoat("#c47a3d", 4.6, 1.5, true);
    this.heroBoat.position.set(HERO_BOAT[0], 0.02, HERO_BOAT[2]);
    this.heroBoat.rotation.y = -0.28;
    // lived-in props: a punt pole shipped along the gunwale, a
    // coil of rope, and a crate with the snorkel kit on the foredeck
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 4.4, 7), lam2({ color: "#8a6844", map: rep(barkTex(), 1, 3) }));
    pole.rotation.x = Math.PI / 2 - 0.06; pole.position.set(-0.52, 0.78, -0.2); this.heroBoat.add(pole);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 20), lam2({ color: "#c9b18a" }));
    rope.rotation.x = Math.PI / 2; rope.position.set(0.42, 0.68, 1.55); this.heroBoat.add(rope);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.62), lam2({ color: "#c99058", map: rep(planks(), 1, 1) }));
    crate.position.set(-0.3, 0.82, 1.7); crate.rotation.y = 0.3; crate.castShadow = true; this.heroBoat.add(crate);
    const snorkel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 12, Math.PI * 0.95), lam2({ color: "#e8542e" }));
    snorkel.position.set(-0.28, 1.12, 1.66); snorkel.rotation.z = 0.5; this.heroBoat.add(snorkel);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), lam2({ color: "#2c4a6a" }));
    mask.position.set(-0.05, 1.02, 1.85); mask.rotation.y = -0.4; this.heroBoat.add(mask);
    R.add(this.heroBoat);
    this.heroBlob = blob(R, HERO_BOAT[0], 0.06, HERO_BOAT[2], 3.4, 5.6, 0.35);
  }

  // ---------------- the lake: water, shores, ridge, jetty, jellies ----------------
  private buildLake(R: THREE.Group, r: () => number) {
    // base land under everything (jungle floor beyond the shores)
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.16, -40); land.receiveShadow = true; R.add(land);
    // pale sand margin ringing the water — the beach the jungle
    // hasn't reclaimed, visible wherever the lake ends
    const sandRing = new THREE.Mesh(new THREE.PlaneGeometry(172, 212), lam2({ map: rep(sandTex(), 24, 30) }));
    sandRing.rotation.x = -Math.PI / 2; sandRing.position.set(0, -0.06, -55); sandRing.receiveShadow = true; R.add(sandRing);
    // the lake itself: turquoise-green brackish water (map kept
    // so update() can scroll it — the surface MOVES, no posters)
    const lakeMap = rep(water(), 10, 12);
    this.waterMap = lakeMap;
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(150, 190), lam2({ map: lakeMap, color: "#57bfa5" }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(0, 0, -55); lake.receiveShadow = true; R.add(lake);
    // soft sky-reflection sheen bands drifting on the surface
    const reflM = (col: string, op: number) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false });
    for (const [x, z, w, l] of [[-26, -30, 16, 120], [24, -48, 13, 140], [0, -80, 20, 90]] as [number, number, number, number][]) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(w, l), reflM("#bfe6f2", 0.10));
      band.rotation.x = -Math.PI / 2; band.position.set(x, 0.015, z); band.renderOrder = 1; R.add(band);
    }
    // ---- the sand bar: pale shallows where Cassiopea rest ----
    const bar = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), lam2({ map: rep(sandTex(), 3, 3) }));
    bar.rotation.x = -Math.PI / 2; bar.position.set(SAND_BAR[0], 0.02, SAND_BAR[2]); bar.receiveShadow = true; R.add(bar);
    const bar2 = new THREE.Mesh(new THREE.CircleGeometry(3.4, 16), lam2({ map: rep(sandTex(), 2, 2) }));
    bar2.rotation.x = -Math.PI / 2; bar2.position.set(10.5, 0.02, -6); R.add(bar2);
    // ---- THE JELLYFISH ----
    const GOLD = "#e8a34c", GOLD2 = "#eebd72", MOON = "#cfe4ee", PINK = "#eda4bc";
    const addJelly = (col: string, s: number, x: number, z: number, y0: number, opts: { flip?: boolean; simple?: boolean; drift?: number } = {}) => {
      const { g, bell } = makeJelly(col, s, opts);
      g.position.set(x, y0, z);
      g.rotation.y = r() * Math.PI * 2;
      R.add(g);
      this.jellies.push({ g, bell, ph: r() * 6.28, y0, cx: x, cz: z, drift: opts.drift ?? 0.7, flip: !!opts.flip });
    };
    // the GIANTS around the hero's boat — the frame-0 shock
    addJelly(GOLD, 2.9, -2.3, 4.8, 0.16);
    addJelly(MOON, 2.2, 2.6, 2.4, 0.14);
    addJelly(GOLD2, 1.8, -3.6, -3.8, 0.15);
    addJelly(PINK, 1.5, 3.8, -5.5, 0.12);
    // mediums patrolling the near + middle field
    const medSpots: [number, number][] = [[-8, -8], [9, -12], [-3, -18], [5, -24], [12, -30], [-11, -28], [0, -34], [-6, -42], [8, -48], [14, -6]];
    medSpots.forEach(([x, z], i) => addJelly(i % 3 === 0 ? MOON : i % 3 === 1 ? GOLD : GOLD2, 0.9 + (i % 4) * 0.16, x, z, 0.05));
    // the crowd: dozens of small jellies to the horizon — the
    // "millions" the VO promises, at reading distance
    for (let i = 0; i < 36; i++) {
      const x = (r() - 0.5) * 64, z = -6 - r() * 88;
      if (Math.abs(x) < 5 && z > -22) continue; // keep the cover lane clear
      addJelly(r() < 0.55 ? GOLD : r() < 0.6 ? MOON : PINK, 0.45 + r() * 0.45, x, z, 0.04, { simple: true, drift: 1.1 });
    }
    // Cassiopea: upside-down on the sand bars, farming sunlight
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.6, d = 1.2 + r() * 2.8;
      addJelly(i % 2 ? GOLD2 : PINK, 0.85 + r() * 0.3, SAND_BAR[0] + Math.cos(a) * d, SAND_BAR[2] + Math.sin(a) * d, 0.30, { flip: true, simple: true, drift: 0 });
    }
    for (let i = 0; i < 3; i++) addJelly(GOLD2, 0.8 + r() * 0.25, 10.5 + (r() - 0.5) * 3.4, -6 + (r() - 0.5) * 3, 0.28, { flip: true, simple: true, drift: 0 });
    // ---- the karst ridge: the 50 m wall that traps the lake ----
    const rockM = lam2({ map: rep(rockTex(), 2, 1) });
    const folM = (col: string) => lam2({ color: col, map: rep(foliageTex("kakabanFoliageRidge"), 2, 1) });
    const ridgeGreens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    for (let i = 0; i < 7; i++) {
      const x = -72 + i * 24 + (r() - 0.5) * 6, h = 11 + (i % 3) * 3.5, w = 17 + (i % 2) * 6;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), rockM);
      mound.scale.set(w, h, 11); mound.position.set(x, -1.5, RIDGE_Z - (i % 2) * 7);
      mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
      for (let j = 0; j < 4; j++) { // jungle spilling over the crest
        const fb = new THREE.Mesh(new THREE.SphereGeometry(3.4 + r() * 2.4, 11, 9), folM(ridgeGreens[j % 3]));
        fb.position.set(x + (r() - 0.5) * w * 0.9, h - 2.6 + r() * 1.6, RIDGE_Z - (i % 2) * 7 + (r() - 0.5) * 5);
        fb.scale.y = 0.75; fb.castShadow = true; R.add(fb);
      }
      const t = makeTree(6.5 + (i % 3), ridgeGreens, 120 + i * 9);
      t.position.set(x + (r() - 0.5) * 8, h - 2.2, RIDGE_Z - (i % 2) * 7 - 2);
      R.add(t); this.trees.push({ g: t, ph: 2.2 + i * 1.31 });
    }
    // side hills closing the bowl left + right
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 11), rockM);
      mound.scale.set(15 + i * 2, 8 + i * 2.2, 10);
      mound.position.set(s * (80 + i * 4), -1.5, -52 - i * 30);
      mound.castShadow = true; R.add(mound);
      const fb = new THREE.Mesh(new THREE.SphereGeometry(4.4, 11, 9), folM(ridgeGreens[i % 3]));
      fb.position.set(s * (78 + i * 4), 6.5 + i * 2.2, -52 - i * 30); fb.scale.y = 0.75; R.add(fb);
    }
    // ---- shore jungle: trees ringing the lake ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treePts: [number, number][] = [];
    const shoreTree = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, -0.05, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 0.71 });
      treePts.push([x, z]);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, 0.02, z); R.add(disc);
    };
    // near shore behind the camera-side waterline
    [[-26, 19], [-17, 20.5], [-9, 19.5], [13.5, 19], [21, 20], [29, 19.5], [-33, 17]].forEach(([x, z], i) => shoreTree(x, z, 4.4 + (i % 3) * 0.8, 200 + i * 7));
    // east + west banks running away
    for (let i = 0; i < 6; i++) {
      shoreTree(-46 - (i % 2) * 5, -6 - i * 15, 5 + (i % 3), 240 + i * 11);
      shoreTree(47 + (i % 2) * 5, -12 - i * 15, 5.4 + (i % 2), 280 + i * 13);
    }
    // far shore at the ridge's feet
    for (let i = 0; i < 5; i++) shoreTree(-44 + i * 21, -100 - (i % 2) * 5, 5.6 + (i % 3) * 0.7, 320 + i * 7);
    // mangroves standing IN the shallows, roots in the water
    const mangrove = (x: number, z: number, seed: number) => {
      const t = makeTree(4.6, greens, seed);
      t.position.set(x, 0, z);
      R.add(t); this.trees.push({ g: t, ph: seed * 0.53 });
      const rootM = lam2({ color: "#6a4a30", map: rep(barkTex(), 1, 1) });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + seed;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.5, 5), rootM);
        root.position.set(x + Math.cos(a) * 0.5, -0.25, z + Math.sin(a) * 0.5);
        root.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
        R.add(root);
      }
      blob(R, x, 0.04, z, 3.4, 3.4, 0.3);
    };
    mangrove(-19, 7, 55); mangrove(23, 2, 71); mangrove(-25, -12, 83); mangrove(28, -20, 97); mangrove(-13, -16, 61); mangrove(15, -24, 88);
    // ---- the jetty + its boats ----
    const jetty = makeJetty();
    jetty.position.set(JETTY_X, 0, 10.5);
    R.add(jetty);
    blob(R, JETTY_X, 0.045, 10.5, 3.6, 14.5, 0.30);
    const moored = makeBoat("#3d6a8a", 4.2, 1.4);
    moored.position.set(JETTY_X - 2.1, 0.02, 12.5); moored.rotation.y = 0.05;
    R.add(moored); this.mooredBoats.push({ g: moored, ph: 1.3 });
    blob(R, JETTY_X - 2.1, 0.05, 12.5, 3.0, 5.0, 0.32);
    // a snorkel tour boat waiting mid-lake — it bobs, it waits
    const tour = makeBoat("#a03a30", 4.4, 1.45);
    tour.position.set(-14, 0.02, -38); tour.rotation.y = 0.5;
    R.add(tour); this.mooredBoats.push({ g: tour, ph: 3.9 });
    blob(R, -14, 0.05, -38, 3.2, 5.4, 0.30);
    // ---- waterline reeds along the near shore + sand bar rim ----
    const reedM = lam2({ color: "#4a7a3a" });
    for (let i = 0; i < 46; i++) {
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7 + r() * 0.5, 5), reedM);
      reed.position.set(-26 + i * 1.15 + (r() - 0.5), 0.3, 14.6 + (r() - 0.5) * 0.8);
      R.add(reed);
      this.reeds.push({ m: reed, ph: i * 0.83 });
    }
    // ---- grass dressing on the near shore ----
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (8 + r() * 20), 0.03, 17.5 + r() * 3, 4.5 + r() * 5, 3 + r() * 3, 0.15 + r() * 0.1, r() * 3);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 700; i++) {
      const x = (r() - 0.5) * 72, z = 15.8 + r() * 5.5;
      if (Math.abs(x - JETTY_X) < 1.8 && z < 19) continue;
      tuftPts.push({ x, z, s: 0.7 + r() * 0.8 });
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 8; i++) {
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
    // the hero's boat rides the water: a barely-there bob (zero at
    // frame 0) — and on shot 3 it actually DRIFTS into the jelly
    // field, hull, contact blob and all (heroBoatAt is shared)
    const hb = heroBoatAt(id, tt);
    this.heroBoat.position.set(hb.x, 0.02 + Math.sin(tt * 1.3) * 0.03, hb.z);
    this.heroBoat.rotation.y = hb.yaw;
    this.heroBoat.rotation.z = Math.sin(tt * 0.9) * 0.012;
    if (this.heroBlob) this.heroBlob.position.set(hb.x, 0.06, hb.z);
    // ---- STANDAR GERAK: everything that should move, moves ----
    // lake surface drifts + ripples toward the viewer (texture scroll)
    if (this.waterMap) this.waterMap.offset.set(tt * 0.006, tt * 0.028);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels across the shore)
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
    // waterline reeds sway
    for (const rd of this.reeds) {
      rd.m.rotation.z = Math.sin(tt * 1.9 + rd.ph) * 0.09;
      rd.m.rotation.x = Math.cos(tt * 1.5 + rd.ph) * 0.05;
    }
    // THE JELLYFISH: bells pulse (the swim stroke), bodies bob,
    // free swimmers drift on slow invisible currents; the flipped
    // Cassiopea only pulse gently against the sand
    for (const j of this.jellies) {
      const pulse = Math.sin(tt * 2.3 + j.ph);
      j.bell.scale.set(1 + 0.07 * pulse, 0.78 * (1 - 0.10 * pulse), 1 + 0.07 * pulse);
      if (j.flip) {
        j.g.position.y = j.y0 + Math.sin(tt * 0.8 + j.ph) * 0.008;
      } else {
        j.g.position.y = j.y0 + Math.sin(tt * 0.9 + j.ph) * 0.07;
        j.g.position.x = j.cx + Math.sin(tt * 0.10 + j.ph) * j.drift;
        j.g.position.z = j.cz + Math.cos(tt * 0.083 + j.ph * 1.3) * j.drift;
        j.g.rotation.z = Math.sin(tt * 0.7 + j.ph) * 0.05;
      }
    }
    // moored boats bob at their ropes, out of phase with the hero's
    for (const mb of this.mooredBoats) {
      mb.g.position.y = 0.02 + Math.sin(tt * 1.25 + mb.ph) * 0.025;
      mb.g.rotation.z = Math.sin(tt * 0.9 + mb.ph) * 0.01;
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
