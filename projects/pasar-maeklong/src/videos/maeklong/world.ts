// Maeklong, Thailand as one three.js scene for the Fafnir-ID
// cover frame: a working wet market whose stalls stand ON the
// active railway — Talat Rom Hup, the "umbrella pulldown market".
// Striped awnings line both sides of the track, shophouses stand
// behind them, and a red diesel railcar rolls down the corridor
// at walking pace while vendors fold everything back and open it
// again. The hero stands shocked on the rails in the near
// foreground, the claim giant above him. VISUAL CORE: bright Thai
// morning light, saturated awning stripes (red/green/blue), produce
// in every colour, warm packed-earth ground, the red railcar.
// Textured everything (anti-banding: speckled sky, flecked
// foliage, woven canvas). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, STATION_Z, trainAt, awningFold, clamp01 } from "./story";

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
const skyTexDay = () => ctex("maeklongSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("maeklongGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("maeklongBirds", 256, 96, (g, r) => {
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
/** RICH packed-earth ground: warm brown base, deep shadow
 *  blotches, sunlit flecks and thousands of grit specks — the
 *  market floor is trodden earth, never a flat sheet. */
const earthTex = () => ctex("maeklongEarth", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8a6f4d"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "90,64,36" : "178,148,104";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(232,214,178,${0.10 + r() * 0.20})` : `rgba(52,38,20,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
});
/** bare earth for tree bases: warm brown speckled with darker
 *  clods and pale grit, never a flat sticker */
const soilTex = () => ctex("maeklongSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("maeklongPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("maeklongBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for the shophouse walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** woven canvas for the awnings: bold vertical stripes in two
 *  market colours, with a fine weave + sun-bleach variation so
 *  the stripes read as cloth, not vector bands */
const stripesTex = (key: string, c1: string, c2: string) => ctex(key, 256, 256, (g, r) => {
  const cols = [c1, c2];
  for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 2]; g.fillRect(i * 32, 0, 32, 256); }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "20,10,0"},${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2.2, 2.2); }
  for (let y = 0; y < 256; y += 6) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(0, y, 256, 1); }
});
const blobTex = () => ctex("maeklongBlob", 256, 256, (g) => {
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
    folM(greens[2] ?? greens[0], "maeklongFoliageDeep"),
    folM(greens[0], "maeklongFoliageMid"),
    folM(greens[1] ?? greens[0], "maeklongFoliageLite"),
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

/** A Thai shophouse: two storeys, a colourful plaster facade, an
 *  OPEN ground-floor shopfront (dark interior + counter + goods),
 *  shuttered upper windows, a small balcony rail, and a low
 *  terracotta-tiled roof with a parapet. Front faces +Z; yaw it
 *  toward the track when placing. */
const makeShophouse = (wallCol: string, w: number, d: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 5);
  const wallM = lam2({ color: "#ffffff", map: rep(plasterTex(`maeklongPlaster${seed}`, wallCol), 2, 1) });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), wallM);
  ground.position.y = 1.3; ground.castShadow = true; ground.receiveShadow = true; g.add(ground);
  // open shopfront: a dark recessed opening with a counter and goods
  const darkM = lam2({ color: "#241a12" });
  const opening = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.0, 0.3), darkM);
  opening.position.set(0, 1.15, d / 2 - 0.1); g.add(opening);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.5, 0.55), lam2({ color: "#7d5a36", map: rep(planks(), 2, 1) }));
  counter.position.set(0, 0.55, d / 2 + 0.18); counter.castShadow = true; g.add(counter);
  const goodsCols = ["#e8542e", "#e8c832", "#5da24a", "#d83a4a", "#f2f0e6"];
  for (let i = 0; i < 5; i++) {
    const gd = new THREE.Mesh(new THREE.SphereGeometry(0.14 + tr() * 0.06, 7, 6), lam2({ color: goodsCols[(i + seed) % goodsCols.length] }));
    gd.position.set(-w * 0.3 + i * w * 0.15, 0.92, d / 2 + 0.18); g.add(gd);
  }
  // sign board above the shopfront (blank colour panel)
  const signCols = ["#c22e2e", "#1d6a4a", "#2456a8", "#d97b16"];
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.5, 0.08), lam2({ color: signCols[seed % signCols.length] }));
  sign.position.set(0, 2.55, d / 2 + 0.06); g.add(sign);
  // upper floor + shuttered windows + balcony rail
  const upper = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, d), wallM);
  upper.position.y = 3.75; upper.castShadow = true; g.add(upper);
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#3d5a78" });
  const shutterM = lam2({ color: "#2e5d3a" });
  const winXs = w > 5 ? [-w / 4, w / 4] : [0];
  for (const wx of winXs) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.35, 0.1), frameM);
    fr.position.set(wx, 3.8, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.12), glassM);
    gl.position.set(wx, 3.8, d / 2 + 0.04); g.add(gl);
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.3, 0.06), shutterM);
      sh.position.set(wx + s * 0.74, 3.8, d / 2 + 0.05); sh.rotation.y = s * 0.14; g.add(sh);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.06), lam2({ color: "#3a3230" }));
    rail.position.set(wx, 3.05, d / 2 + 0.22); g.add(rail);
  }
  // low tiled roof: a shallow prism + ridge cap + parapet
  const roofM = lam2({ color: "#a8542e" });
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.35, 0); shape.lineTo(w / 2 + 0.35, 0); shape.lineTo(0, 1.1); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.5) / 2);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.y = 4.9; roof.castShadow = true; g.add(roof);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, d + 0.55, 8), lam2({ color: "#7a3a20" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 6.0, 0); g.add(ridge);
  // hanging lantern by the door
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.55 }));
  lampGlass.position.set(w / 2 - 0.5, 2.3, d / 2 + 0.3); g.add(lampGlass);
  return g;
};

/** One market stall: a wooden table with a produce pile, a crate
 *  and a sack beside it, a woven basket at the track-side edge
 *  (it SLIDES back when the train comes), and a striped canvas
 *  awning hinged at the shopfront that FOLDS up. The group is
 *  built in local space facing -X (toward the track); place with
 *  rotation.y = 0 for the right side (x > 0), PI for the left.
 *  Returns the group plus the animated parts. */
type StallParts = { g: THREE.Group; awning: THREE.Group; baskets: THREE.Group; side: number; z: number; basketBaseX: number };
const PRODUCE: { col: string; kind: "sphere" | "fish" | "banana" }[] = [
  { col: "#e8862c", kind: "sphere" }, // mangoes
  { col: "#c8d8e8", kind: "fish" },   // fish on ice
  { col: "#7ab648", kind: "sphere" }, // limes
  { col: "#d42f2f", kind: "sphere" }, // chillies
  { col: "#e8c832", kind: "banana" }, // bananas
  { col: "#8a6a3a", kind: "sphere" }, // durian-ish
];
const makeStall = (side: number, z: number, vi: number, stripeA: string, stripeB: string): StallParts => {
  const g = new THREE.Group();
  const tr = rng(vi * 733 + 41);
  const woodM = lam2({ color: "#8a6844", map: rep(planks(), 2, 1) });
  // table: top + legs, 1.9 long (along Z) x 1.1 deep
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 1.9), woodM);
  top.position.set(0, 0.86, 0); top.castShadow = true; top.receiveShadow = true; g.add(top);
  for (const [lx, lz] of [[-0.45, -0.8], [0.45, -0.8], [-0.45, 0.8], [0.45, 0.8]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.86, 0.09), woodM);
    leg.position.set(lx, 0.43, lz); g.add(leg);
  }
  // produce pile on the table
  const prod = PRODUCE[vi % PRODUCE.length];
  const pileM = lam2({ color: prod.col });
  if (prod.kind === "fish") {
    const ice = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.6), lam2({ color: "#dceef8" }));
    ice.position.set(0, 0.96, 0); g.add(ice);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), pileM);
      f.scale.set(1.8, 0.55, 0.6);
      f.position.set(-0.25 + (i % 3) * 0.25, 1.04, -0.55 + Math.floor(i / 3) * 1.1);
      f.rotation.y = tr() * 3; g.add(f);
    }
  } else if (prod.kind === "banana") {
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), pileM);
      b.scale.set(2.2, 0.5, 0.6);
      b.position.set(-0.2 + (i % 3) * 0.2, 0.99 + (i % 2) * 0.08, -0.5 + Math.floor(i / 3) * 1.0);
      b.rotation.y = (tr() - 0.5) * 0.8; g.add(b);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12 + tr() * 0.05, 8, 6), pileM);
      s.position.set(-0.3 + tr() * 0.6, 0.99 + (i % 3) * 0.09, -0.7 + tr() * 1.4);
      g.add(s);
    }
  }
  // crate + sack beside the table (shopfront side)
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), lam2({ color: "#a8763e", map: rep(planks(), 1, 1) }));
  crate.position.set(0.55, 0.2, 0.7); crate.rotation.y = 0.2; crate.castShadow = true; g.add(crate);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lam2({ color: "#c9b18a" }));
  sack.scale.set(1, 0.75, 1); sack.position.set(0.5, 0.24, -0.75); sack.castShadow = true; g.add(sack);
  // the sliding basket: woven, full of the same produce, at the
  // track-side edge of the table — update() slides it back
  const baskets = new THREE.Group();
  const basketM = lam2({ color: "#a8763e" });
  const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.28, 10), basketM);
  bk.position.y = 0.14; bk.castShadow = true; baskets.add(bk);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), pileM);
    s.position.set((tr() - 0.5) * 0.3, 0.3, (tr() - 0.5) * 0.3); baskets.add(s);
  }
  baskets.position.set(-0.42, 0.9, 0.45);
  g.add(baskets);
  // ---- the striped awning, hinged at the shopfront ----
  // hinge at local x = +1.6 (shopfront side), y = 2.7; canvas
  // reaches 3.0 m toward the track (-X), sloping down to 2.3.
  const awning = new THREE.Group();
  awning.position.set(1.6, 2.7, 0);
  const canvasM = lam2({ map: rep(stripesTex(`maeklongStripe${vi % 3}`, stripeA, stripeB), 2, 1), side: THREE.DoubleSide });
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 2.1), canvasM);
  canvas.position.set(-1.5, -0.28, 0); canvas.rotation.z = 0.12; canvas.castShadow = true; awning.add(canvas);
  // valance: a short striped skirt hanging off the front edge
  const valance = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 2.1), canvasM);
  valance.position.set(-2.98, -0.55, 0); awning.add(valance);
  // a hanging lamp under the awning (warm, lived-in)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 }));
  lamp.position.set(-1.2, -0.55, 0.6); awning.add(lamp);
  g.add(awning);
  return { g, awning, baskets, side, z, basketBaseX: -0.42 };
};

/** The red diesel railcar: cream-banded body, yellow stripe,
 *  dark window band, grey roof with an AC box, windshield +
 *  headlights on the nose (+Z), bogies and wheels below. Nose
 *  points +Z — the direction it travels down the market. */
const makeTrain = () => {
  const g = new THREE.Group();
  const redM = lam2({ color: "#a82e24" });
  const creamM = lam2({ color: "#f2ead6" });
  const greyM = lam2({ color: "#7d838c" });
  const darkM = lam2({ color: "#2c3138" });
  const glassM = lam2({ color: "#22384e" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.1, 13), redM);
  body.position.y = 1.85; body.castShadow = true; g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.94, 0.75, 13.02), creamM);
  band.position.y = 1.05; g.add(band);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.12, 13.02), lam2({ color: "#e8c832" }));
  stripe.position.y = 1.48; g.add(stripe);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.32, 12.6), greyM);
  roof.position.y = 3.05; roof.castShadow = true; g.add(roof);
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 3.2), lam2({ color: "#5d6167" }));
  ac.position.set(0, 3.35, -2); g.add(ac);
  // window band along both flanks
  for (const s of [1, -1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 11.4), glassM);
    win.position.set(s * 1.46, 2.25, 0); g.add(win);
    // window mullions: thin red bars splitting the band
    for (let i = 0; i < 6; i++) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.08), redM);
      mull.position.set(s * 1.47, 2.25, -4.75 + i * 1.9); g.add(mull);
    }
  }
  // nose: windshield panes + headlights + marker light
  for (const s of [1, -1]) {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.9, 0.06), glassM);
    shield.position.set(s * 0.62, 2.3, 6.51); g.add(shield);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshLambertMaterial({ color: "#fff6c8", emissive: "#ffe98a", emissiveIntensity: 1.4 }));
    light.position.set(s * 0.85, 1.0, 6.55); g.add(light);
  }
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ff5a4a", emissive: "#d42f2f", emissiveIntensity: 1.0 }));
  marker.position.set(0, 2.95, 6.55); g.add(marker);
  const noseBand = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.3, 0.06), creamM);
  noseBand.position.set(0, 1.5, 6.51); g.add(noseBand);
  // bogies + wheels
  for (const bz of [-4.2, 4.2]) {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 2.6), darkM);
    bogie.position.set(0, 0.42, bz); g.add(bogie);
    for (const wx of [-0.95, 0.95]) for (const wz of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 14), darkM);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.4, bz + wz); g.add(wheel);
    }
  }
  return g;
};

/** Maeklong station at the far end (z = STATION_Z): a low
 *  platform beside the track and a small station house with a
 *  sloped roof, a sign board and lamps — a backdrop silhouette
 *  closing the corridor. */
const makeStation = () => {
  const g = new THREE.Group();
  const plat = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.55, 12), lam2({ map: rep(cobble(), 2, 4), color: "#b9ad97" }));
  plat.position.set(4.6, 0.28, 0); plat.receiveShadow = true; g.add(plat);
  const wallM = lam2({ color: "#ffffff", map: rep(plasterTex("maeklongStationPlaster", "#f0e6d2"), 2, 1) });
  const house = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 6), wallM);
  house.position.set(5.2, 2.15, -1); house.castShadow = true; g.add(house);
  const roofM = lam2({ color: "#8a3a28" });
  const shape = new THREE.Shape();
  shape.moveTo(-3.1, 0); shape.lineTo(3.1, 0); shape.lineTo(0, 1.4); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 6.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -3.3);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.set(5.2, 3.75, -1); roof.castShadow = true; g.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.1), lam2({ color: "#f2ead6" }));
  sign.position.set(5.2, 3.3, 2.05); g.add(sign);
  for (const lx of [2.2, 8.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 7), lam2({ color: "#3a3230" }));
    post.position.set(lx, 1.85, 0); g.add(post);
    const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.6 }));
    lampGlass.position.set(lx, 3.2, 0); g.add(lampGlass);
  }
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced along the
 *  market's outer edges so the ground never ends in a clean line. */
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
  private train: THREE.Group;
  private trainGlow: THREE.Sprite;
  private stalls: StallParts[] = [];
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private bunting: { m: THREE.Mesh; ph: number }[] = [];
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
    // (down -Z, low enough to sit in the upper frame). Layered
    // near -> far, kept modest: accents, not a white ceiling.
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
    // the sun's halo + core, upper left down the market corridor
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
    this.buildMarket(R, r);
    // ---- the train: parked at the station until its shot comes ----
    this.train = makeTrain();
    this.train.position.set(0, 0, -118);
    R.add(this.train);
    this.trainGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.55 }));
    this.trainGlow.scale.set(3.2, 3.2, 1); this.trainGlow.layers.set(NOINK);
    this.train.add(this.trainGlow);
    this.trainGlow.position.set(0, 1.0, 6.8);
  }

  // ---------------- the market: track, stalls, shophouses, station ----------------
  private buildMarket(R: THREE.Group, r: () => number) {
    // packed-earth ground under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ color: "#ffffff", map: rep(earthTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, 0, -40); land.receiveShadow = true; R.add(land);
    // ---- the railway: ballast bed, sleepers, two steel rails ----
    const ballast = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 152), lam2({ map: rep(soilTex(), 2, 40), color: "#8a8078" }));
    ballast.rotation.x = -Math.PI / 2; ballast.position.set(0, 0.04, -46); ballast.receiveShadow = true; R.add(ballast);
    const railM = lam2({ color: "#9aa2ab" });
    for (const s of [1, -1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 152), railM);
      rail.position.set(s * 0.75, 0.11, -46); rail.castShadow = true; R.add(rail);
    }
    // sleepers as one instanced mesh (100 ties, one draw call)
    const sleeperGeo = new THREE.BoxGeometry(2.5, 0.09, 0.4);
    const sleeperM = lam2({ color: "#4a3524" });
    const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperM, 100);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 100; i++) {
      dummy.position.set(0, 0.065, 30 - i * 1.52);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      sleepers.setMatrixAt(i, dummy.matrix);
    }
    sleepers.receiveShadow = true; R.add(sleepers);
    // ---- stalls lining BOTH sides of the track ----
    // awning stripes cycle three market pairings; produce cycles too
    const stripes: [string, string][] = [["#c22e2e", "#f2ead6"], ["#1d6a4a", "#f2ead6"], ["#2456a8", "#f2ead6"]];
    const stallAt = (side: number, z: number, vi: number) => {
      const [sa, sb] = stripes[vi % stripes.length];
      const st = makeStall(side, z, vi, sa, sb);
      // local -X faces the track: right side (x>0) needs no yaw,
      // left side turns around; table centre sits at |x| = 3.8
      st.g.position.set(side * 3.8, 0, z);
      st.g.rotation.y = side > 0 ? 0 : Math.PI;
      R.add(st.g);
      this.stalls.push(st);
      blob(R, side * 3.8, 0.03, z, 3.2, 3.0, 0.28);
    };
    [14, 6, -2, -10, -18, -26, -34, -42, -50, -58, -66, -74, -82, -90].forEach((z, i) => stallAt(1, z, i));
    [10, 2, -6, -14, -22, -30, -38, -46, -54, -62, -70, -78, -86, -94].forEach((z, i) => stallAt(-1, z, i + 2));
    // ---- shophouses behind the stalls, fronts to the track ----
    const facades = ["#2e7f86", "#d9a441", "#d96a7a", "#f0e6d2", "#7ab08a", "#4a7ab0"];
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const shopAt = (side: number, z: number, i: number) => {
      const w = 6.0 + (i % 3) * 0.8, d = 5.0 + (i % 2) * 0.6;
      const h = makeShophouse(facades[i % facades.length], w, d, i * 3 + (side > 0 ? 1 : 2));
      h.position.set(side * 9.8, 0, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      blob(R, side * 9.8, 0.03, z, w + 2.5, d + 2.5, 0.25);
      const t = makeTree(3.8 + (i % 3) * 0.7, greens, i * 7 + (side > 0 ? 3 : 11));
      t.position.set(side * (13.2 + (i % 2) * 1.2), 0, z + (i % 2 ? 3.4 : -3.6));
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + (side > 0 ? 0.7 : 2.4) });
    };
    [-2, -17, -47, -62, -80].forEach((z, i) => shopAt(1, z, i));
    [-9, -24, -54, -71, -88].forEach((z, i) => shopAt(-1, z, i + 2));
    // extra trees behind the shophouse line, mixed sizes
    const extraTrees: [number, number, number][] = [[14.5, -33, 4.6], [-14.8, -40, 5.2], [14.2, -97, 4.2], [-14.5, -104, 4.8], [14.8, 4, 3.8], [-14.6, -6, 4.4]];
    extraTrees.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
    });
    // ---- the station closing the far end ----
    const station = makeStation();
    station.position.set(0, 0, STATION_Z);
    R.add(station);
    // ---- the 1905 plaque: two posts by the track ----
    // (the "1905" board itself is a cast Fx sprite, drawn billboarded
    // — a 3D board here would sit at the same spot and occlude it)
    const plaque = new THREE.Group();
    const postM = lam2({ color: "#6a4a2c" });
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 7), postM);
      post.position.set(s * 0.65, 0.95, 0); plaque.add(post);
    }
    plaque.position.set(4.6, 0, -7);
    plaque.rotation.y = -0.35;
    R.add(plaque);
    // ---- bunting: festival pennant strings across the corridor ----
    // (they flutter in update() — the market is never still)
    const flagCols = ["#d42f2f", "#e8c832", "#1d6a4a", "#2456a8", "#e86a9a"];
    const tri = new THREE.Shape();
    tri.moveTo(-0.22, 0); tri.lineTo(0.22, 0); tri.lineTo(0, -0.42); tri.closePath();
    const triGeo = new THREE.ShapeGeometry(tri);
    for (const bz of [18, -8, -34, -60]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 13.4, 5), lam2({ color: "#3a3230" }));
      line.rotation.z = Math.PI / 2; line.position.set(0, 4.6, bz); R.add(line);
      for (let i = 0; i < 11; i++) {
        const fx = -6 + i * 1.2;
        const sag = 0.35 * (1 - (fx / 6.5) ** 2);
        const flag = new THREE.Mesh(triGeo, lam2({ color: flagCols[(i + bz) % flagCols.length], side: THREE.DoubleSide }));
        flag.position.set(fx, 4.6 - sag, bz);
        R.add(flag);
        this.bunting.push({ m: flag, ph: i * 0.9 + bz * 0.13 });
      }
    }
    // ---- far backdrop: a soft tree line closing the horizon ----
    for (let i = 0; i < 9; i++) {
      const t = makeTree(7.5 + (i % 3) * 1.6, greens, 90 + i * 7);
      t.position.set(-52 + i * 13, 0, -118 - (i % 2) * 7);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
    }
    // ---- ground dressing: sun/shade pools + grass tufts at the edges ----
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8d8a4", s * (7 + r() * 6), 0.02, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.14 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d4a30", s * (7 + r() * 6), 0.021, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.22 + r() * 0.10, r() * 3);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (const s of [1, -1]) for (let z = 17; z > -112; z -= 0.5 + r() * 0.55) {
      if (r() < 0.7) tuftPts.push({ x: s * (12.2 + r() * 2.5), z: z + (r() - 0.5), s: 0.85 + r() * 0.8 });
      if (r() < 0.3) tuftPts.push({ x: s * (16.5 + r() * 2.0), z: z - 0.4, s: 0.7 + r() * 0.7 });
    }
    for (let i = 0; i < 300; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (12.5 + r() * 5), z = 16 - r() * 122;
      tuftPts.push({ x, z, s: 0.65 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy2 = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy2.position.set(p.x, 0, p.z); dummy2.rotation.set(0, yaw, 0);
      dummy2.scale.setScalar(p.s); dummy2.updateMatrix();
      tufts.setMatrixAt(i, dummy2.matrix);
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
    // ---- the train rolls down the corridor (story.ts owns its z) ----
    const tz = trainAt(id, tt).z;
    this.train.position.set(0, Math.sin(tt * 7) * 0.012, tz);
    this.train.rotation.z = Math.sin(tt * 5.3) * 0.004;
    // headlight glow: bright while the train approaches/passes, dim at the station
    const approaching = id === 1 || id === 4 || id === 5 || id === 6 || id === 10;
    (this.trainGlow.material as THREE.SpriteMaterial).opacity = approaching ? 0.75 : 0.3;
    // ---- the awnings fold and unfold, stall by stall, in a wave
    // ahead of the train — and the baskets slide back with them ----
    const fold = awningFold(id, tt);
    for (const st of this.stalls) {
      const foldS = clamp01(fold + (0 - st.z) * 0.006);
      st.awning.rotation.z = -foldS * 1.45;
      st.baskets.position.x = st.basketBaseX + foldS * 0.55;
    }
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
    // grass tufts bend with the same wind (phase travels across the ground)
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
    // bunting flags flutter in the train's draught
    for (const fl of this.bunting) {
      fl.m.rotation.x = Math.sin(tt * 2.6 + fl.ph) * 0.28;
      fl.m.rotation.z = Math.cos(tt * 2.1 + fl.ph) * 0.12;
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
