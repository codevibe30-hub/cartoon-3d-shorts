// The Minangkabau valley as one three.js scene for the
// Fafnir-ID cover frame: emerald sawah terraces climbing the
// slopes, blue volcanoes on the north horizon, and at the
// centre the GIANT rumah gadang — carved wooden walls on a
// forest of posts, every post resting on a flat sandi stone
// (never planted), and the great gonjong roof sweeping up
// into buffalo-horn peaks. The house SWAYS on its stones:
// gently in the cover, hard in the earthquake shot — the
// whole point of the episode, visible from frame 0.
// VISUAL CORE: bright highland daylight, layered greens,
// textured everything (anti-banding: speckled sky, flecked
// grass, grainy dirt, fibrous ijuk). Layered light rig: sun
// key w/ soft shadows + hemisphere fill + rim — house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, stone } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HOUSE_C, clamp01, smooth } from "./story";

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
  layer(s * 0.16, 0, "#9fb2cc");            // shaded underside
  layer(s * 0.05, -s * 0.02, "#cfddf2");    // mid tone
  layer(-s * 0.10, -s * 0.05, "#ffffff");   // sunlit crown
};
const skyTexDay = () => ctex("gadangSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0d5cb5"); grad.addColorStop(0.34, "#3f8fd8"); grad.addColorStop(0.62, "#8ec4ec");
  grad.addColorStop(0.85, "#c4e2f7"); grad.addColorStop(1, "#eaf6fd");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 8; i++) {
    const x = r() * 2048, y = 50 + r() * 180, w = 300 + r() * 460;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.22)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.14); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "8,32,80"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("gadangGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("gadangBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
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
/** VALLEY GRASS — the meadow under everything: layered greens
 *  with sunlit flecks and dark hollows, the house value recipe
 *  so it survives the sun lift without flattening. */
const grassTex = () => ctex("gadangGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5d8a2e"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 130; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "38,66,16" : "150,190,80";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.38 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 8000; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => {
      const pick = r();
      g.fillStyle = pick > 0.62 ? `rgba(200,228,120,${0.12 + r() * 0.24})` : pick > 0.3 ? `rgba(52,86,20,${0.12 + r() * 0.22})` : `rgba(24,40,10,${0.10 + r() * 0.18})`;
      g.beginPath(); g.ellipse(xx, yy, 1.8 + r() * 3.2, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
    });
  }
});
/** DIRT YARD — the packed-earth arena + front yard: warm
 *  brown grit with pebble speckle and worn pale patches. */
const dirtTex = () => ctex("gadangDirt", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#8a6a44"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 120, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "84,58,30" : "196,164,110";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.26})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 7000; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = r() > 0.5 ? `rgba(220,196,150,${0.10 + r() * 0.2})` : `rgba(40,26,12,${0.10 + r() * 0.2})`;
    g.beginPath(); g.ellipse(x, y, 1.6 + r() * 3, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** UKIRAN WALL — the carved wooden wall of the great house:
 *  warm plank base, and carved bands in the Minang colours
 *  (gold, deep red, black): repeating diamond + spiral motifs
 *  with a glossy highlight line, so the carving reads carved,
 *  not printed flat. */
const ukiranTex = () => ctex("gadangUkiran", 1024, 512, (g, r) => {
  g.fillStyle = "#7a4a28"; g.fillRect(0, 0, 1024, 512);
  // plank base: vertical boards with grain streaks
  for (let x = 0; x < 1024; x += 64) {
    g.fillStyle = `rgba(40,20,6,${0.16 + r() * 0.1})`; g.fillRect(x, 0, 3, 512);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? "214,164,100" : "52,28,8"},${0.08 + r() * 0.12})`;
      g.lineWidth = 1.4 + r() * 1.6;
      const gx = x + 6 + r() * 52;
      g.beginPath(); g.moveTo(gx, r() * 512); g.lineTo(gx + (r() - 0.5) * 6, r() * 512 + 60); g.stroke();
    }
  }
  const band = (y0: number, h: number) => {
    g.fillStyle = "#5d2418"; g.fillRect(0, y0, 1024, h);
    g.fillStyle = "rgba(255,220,150,0.5)"; g.fillRect(0, y0, 1024, 3); g.fillRect(0, y0 + h - 3, 1024, 3);
    for (let x = 32; x < 1024; x += 64) {
      // diamond motif
      g.save(); g.translate(x, y0 + h / 2);
      g.fillStyle = "#d9a441";
      g.beginPath(); g.moveTo(0, -h * 0.32); g.lineTo(h * 0.32, 0); g.lineTo(0, h * 0.32); g.lineTo(-h * 0.32, 0); g.closePath(); g.fill();
      g.fillStyle = "#a52a22";
      g.beginPath(); g.moveTo(0, -h * 0.18); g.lineTo(h * 0.18, 0); g.lineTo(0, h * 0.18); g.lineTo(-h * 0.18, 0); g.closePath(); g.fill();
      g.fillStyle = "#1c1410"; g.beginPath(); g.arc(0, 0, h * 0.07, 0, 7); g.fill();
      // spiral curls flanking the diamond
      g.strokeStyle = "#d9a441"; g.lineWidth = 4;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(s * h * 0.52, 0, h * 0.16, s > 0 ? 2.6 : 0.5, s > 0 ? 5.6 : 3.6);
        g.stroke();
      }
      g.restore();
    }
    // gloss sweep over the band
    const gr = g.createLinearGradient(0, y0, 0, y0 + h);
    gr.addColorStop(0, "rgba(255,255,255,0.20)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,0.16)");
    g.fillStyle = gr; g.fillRect(0, y0, 1024, h);
  };
  band(36, 92);
  band(384, 92);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,160" : "10,6,2"},${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 512, 2.2, 2.2); }
});
/** IJUK — the fibre roof: near-black palm fibre with long
 *  vertical streaks, sun-bleached tips, a fibrous grain that
 *  keeps big roof planes from banding. */
const ijukTex = () => ctex("gadangIjuk", 512, 512, (g, r) => {
  g.fillStyle = "#4c463e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, l = 26 + r() * 70;
    g.strokeStyle = r() > 0.45 ? `rgba(12,11,9,${0.16 + r() * 0.24})` : `rgba(196,186,164,${0.14 + r() * 0.20})`;
    g.lineWidth = 1.4 + r() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,192,170" : "8,8,6"},${0.04 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** VOLCANO — jungle slopes: deep green bands rising to a
 *  blue-grey bare cone, speckle throughout. */
const mountainTex = () => ctex("gadangMountain", 512, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 512, 0, 0);
  grad.addColorStop(0, "#3f7038"); grad.addColorStop(0.45, "#4a7a4c"); grad.addColorStop(0.75, "#5d7d72"); grad.addColorStop(1, "#7d8ea6");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const y = r() * 512;
    g.fillStyle = `rgba(${r() > 0.5 ? "210,226,200" : "14,30,12"},${0.05 + r() * 0.1})`;
    g.fillRect(r() * 512, y, 2.4, 2.4);
  }
  for (let i = 0; i < 26; i++) { // ridge gullies
    const x = r() * 512;
    g.strokeStyle = `rgba(20,34,20,${0.10 + r() * 0.12})`; g.lineWidth = 2 + r() * 4;
    g.beginPath(); g.moveTo(x, 512); g.lineTo(x + (r() - 0.5) * 60, r() * 200); g.stroke();
  }
});
/** canopy leaf texture for the round trees */
const leafTex = () => ctex("gadangLeaf", 256, 256, (g, r) => {
  g.fillStyle = "#3d7a2e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(20,52,14,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(190,230,120,${0.12 + r() * 0.22})` : `rgba(16,44,10,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("gadangBark", 256, 256, (g, r) => {
  g.fillStyle = "#6e5138"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(40,26,14,${0.16 + r() * 0.22})` : `rgba(206,172,130,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("gadangBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** soft warm light pool for sunlit variation on the ground */
const patchTex = () => ctex("gadangPatch", 256, 256, (g) => {
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

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** THE GONJONG ROOF as a parametric surface: the RIDGE runs
 *  high along the length, its height undulating per bay —
 *  one horn peak per bay — flaring highest at the two ends;
 *  across the width the surface sweeps steeply DOWN from the
 *  ridge to low eaves whose tips curl up, the buffalo-horn
 *  cross-section. */
const roofPeakAt = (x: number, len: number, bays: number) => {
  const u = (((x + len / 2) / (len / bays)) % 1 + 1) % 1;
  let m = 0.84 + 0.26 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (u - 0.5)), 1.3);
  const e = clamp01((Math.abs(x) / (len / 2) - 0.80) / 0.20);
  m *= 1 + 0.13 * smooth(e);
  return m;
};
const roofY = (x: number, z: number, len: number, wid: number, baseY: number, dip: number, peak: number, bays: number) => {
  const W = wid / 2 + 1.15;
  const t = Math.min(1, Math.abs(z) / W); // 0 at the ridge, 1 at the eave
  const eave = 0.12;
  const fall = Math.pow(1 - t, 1.35); // the steep gable sweep down
  const curl = 0.5 * smooth((t - 0.78) / 0.22); // eave tips curl UP
  return baseY + eave + (peak * roofPeakAt(x, len, bays) - eave) * fall + curl;
};
const gonjongRoofGeo = (len: number, wid: number, baseY: number, dip: number, peak: number, bays: number) => {
  const W = wid / 2 + 1.15;
  const nx = 56, nz = 28;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = -len / 2 + (len * i) / nx;
    for (let j = 0; j <= nz; j++) {
      const z = -W + (2 * W * j) / nz;
      pos.push(x, roofY(x, z, len, wid, baseY, dip, peak, bays), z);
      uv.push((x + len / 2) / 3, (z + W) / 3);
    }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = a + nz + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};
const gableGeo = (len: number, wid: number, baseY: number, dip: number, peak: number, bays: number, atX: number) => {
  const W = wid / 2 + 1.15;
  const sh = new THREE.Shape();
  sh.moveTo(-W, baseY - 0.2);
  for (let j = 0; j <= 20; j++) {
    const z = -W + (2 * W * j) / 20;
    sh.lineTo(z, roofY(atX, z, len, wid, baseY, dip, peak, bays) - 0.04);
  }
  sh.lineTo(W, baseY - 0.2);
  sh.closePath();
  return new THREE.ShapeGeometry(sh);
};

type HouseOpts = { len: number; wid: number; floorY: number; wallH: number; bays: number; detail: boolean };
/** A rumah gadang (or its little sibling the rangkiang):
 *  flat sandi stones, a forest of posts resting ON them —
 *  never planted — plank floor, carved ukiran walls, door +
 *  stairs at the front centre, and the gonjong roof. Local
 *  origin at ground centre; the front faces +z. */
const makeHouse = (o: HouseOpts) => {
  const g = new THREE.Group();
  const { len, wid, floorY, wallH, bays } = o;
  const stoneM = lam2({ map: rep(stone("gadangStone", ["#9a958a", "#8a857a", "#a8a296", "#7c776c"]), 1, 1) });
  const postM = lam2({ map: rep(planks(), 1, 1), color: "#9a7a52" });
  const floorM = lam2({ map: rep(planks(), 4, 2), color: "#a8845c" });
  const wallM = lam2({ map: rep(ukiranTex(), 3, 1) });
  const bandM = lam2({ map: rep(ukiranTex(), 5, 0.4) });
  const roofM = lam2({ map: rep(ijukTex(), 6, 2), side: THREE.DoubleSide });
  const goldM = lam2({ color: "#d9a441" });
  const darkM = lam2({ color: "#241a12" });
  // ---- sandi stones + posts ----
  const nX = Math.max(3, Math.round(len / 2.6));
  const xs: number[] = [];
  for (let i = 0; i < nX; i++) xs.push(-len / 2 + 0.75 + ((len - 1.5) * i) / (nX - 1));
  const zs = [-wid / 2 + 0.45, 0, wid / 2 - 0.45];
  for (const x of xs) for (const z of zs) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 1.05), stoneM);
    st.position.set(x, 0.17, z); st.receiveShadow = true; st.castShadow = true; g.add(st);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, floorY - 0.3, 8), postM);
    post.position.set(x, 0.3 + (floorY - 0.3) / 2, z); post.castShadow = true; g.add(post);
  }
  // ---- floor + walls ----
  const floor = new THREE.Mesh(new THREE.BoxGeometry(len + 0.8, 0.22, wid + 0.8), floorM);
  floor.position.y = floorY - 0.11; floor.castShadow = true; floor.receiveShadow = true; g.add(floor);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, wid), wallM);
  walls.position.y = floorY + wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const band = new THREE.Mesh(new THREE.BoxGeometry(len + 0.55, 0.8, wid + 0.55), bandM);
  band.position.y = floorY + wallH - 0.4; band.castShadow = true; g.add(band);
  if (o.detail) {
    // windows: gold-framed dark shutters along the front wall
    for (const wx of [-len * 0.36, -len * 0.19, len * 0.19, len * 0.36]) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.12, 0.07), goldM);
      fr.position.set(wx, floorY + wallH * 0.55, wid / 2 + 0.02); g.add(fr);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.96, 0.09), darkM);
      win.position.set(wx, floorY + wallH * 0.55, wid / 2 + 0.03); g.add(win);
    }
    // the door, front centre
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.0, 0.09), lam2({ color: "#4a2c14", map: rep(planks(), 1, 1) }));
    door.position.set(0, floorY + 1.0, wid / 2 + 0.03); g.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), goldM);
    knob.position.set(0.36, floorY + 1.0, wid / 2 + 0.1); g.add(knob);
    // the stairs down from the door, on two sloped stringers
    const steps = Math.ceil(floorY / 0.29);
    for (let i = 0; i < steps; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.17, 0.44), floorM);
      st.position.set(0, floorY - (i + 0.5) * (floorY / steps), wid / 2 + 0.32 + i * 0.34);
      st.castShadow = true; st.receiveShadow = true; g.add(st);
    }
    const runZ = steps * 0.34, slope = Math.atan2(floorY, runZ), sLen = Math.hypot(floorY, runZ);
    for (const sx of [-0.74, 0.74]) {
      const str = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, sLen), floorM);
      str.position.set(sx, floorY / 2, wid / 2 + 0.32 + runZ / 2 - 0.17);
      str.rotation.x = slope;
      str.castShadow = true; g.add(str);
    }
  } else {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.08), darkM);
    door.position.set(0, floorY + 0.65, wid / 2 + 0.03); g.add(door);
  }
  // ---- THE GONJONG ROOF ----
  const baseY = floorY + wallH, dip = 0.75, peak = 3.55;
  const roof = new THREE.Mesh(gonjongRoofGeo(len, wid, baseY, dip, peak, bays), roofM);
  roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  for (const sx of [-1, 1]) {
    const gab = new THREE.Mesh(gableGeo(len, wid, baseY, dip, peak, bays, sx * len / 2), bandM);
    gab.rotation.y = sx * Math.PI / 2;
    gab.position.x = sx * (len / 2 - 0.02);
    g.add(gab);
  }
  // horn finials ON the ridge, one at every bay peak
  const finM = lam2({ color: "#2c2a26", map: rep(ijukTex(), 1, 1) });
  for (let b = 0; b < bays; b++) {
    const bx = -len / 2 + (len / bays) * (b + 0.5);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.05, 6), finM);
    fin.position.set(bx, roofY(bx, 0, len, wid, baseY, dip, peak, bays) + 0.32, 0);
    fin.castShadow = true; g.add(fin);
  }
  return g;
};

/** A palm: ringed trunk leaning slightly, a crown of drooping
 *  fronds (flattened cones, layered greens) + coconut cluster. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, h, 8), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = 0.08; trunk.castShadow = true; g.add(trunk);
  const topX = Math.sin(0.08) * h, topY = h * 0.99;
  const frondM = lam2({ color: "#4a8a34", map: rep(leafTex(), 1, 1) });
  const frondM2 = lam2({ color: "#6aa844", map: rep(leafTex(), 1, 1) });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.4;
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.6, 4), i % 2 ? frondM : frondM2);
    fr.scale.set(1, 1, 0.16);
    fr.position.set(topX + Math.cos(a) * 1.1, topY + 0.15 - Math.sin(a) * 0.1, Math.sin(a) * 1.1);
    fr.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
    fr.rotation.y = -a;
    fr.castShadow = true; g.add(fr);
  }
  const nutM = lam2({ color: "#6b4a2a" });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutM);
    nut.position.set(topX + (tr() - 0.5) * 0.7, topY - 0.35, (tr() - 0.5) * 0.7);
    g.add(nut);
  }
  return g;
};

/** A round jungle tree: fissured trunk + a canopy of three
 *  layered leaf-blobs (dark base, mid, sunlit crown). */
const makeTree = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 8), lam2({ map: rep(barkTex(), 1, 2), color: "#8a6a4a" }));
  trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
  const cols = ["#3d7a2e", "#4f9440", "#69b354"];
  const blobs: [number, number, number, number][] = [
    [0, h + 0.9, 0, 1.9], [-1.1, h + 0.3, 0.3, 1.35], [1.15, h + 0.45, -0.3, 1.45], [0.2, h + 1.7, -0.4, 1.3],
  ];
  blobs.forEach(([x, y, z, s], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), lam2({ color: cols[i % 3], map: rep(leafTex(), 2, 2), flatShading: true }));
    m.position.set(x + (tr() - 0.5) * 0.3, y, z + (tr() - 0.5) * 0.3);
    m.castShadow = true; g.add(m);
  });
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced. */
const grassTuftGeo = () => {
  const tr = rng(4242);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#4a6423"), tip = new THREE.Color("#c8d47a"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.28 + tr() * 0.22, w = 0.05;
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
  private fog = new THREE.Fog("#b8d8ee", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private house: THREE.Group | null = null;
  private waterMaps: THREE.Texture[] = [];
  private quakeDust: THREE.Sprite[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a7a5f", 0.55);
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
    this.buildValley(R, r);
    // ---- THE RUMAH GADANG ----
    this.house = makeHouse({ len: 17, wid: 6.6, floorY: 2.42, wallH: 2.9, bays: 5, detail: true });
    this.house.position.set(HOUSE_C[0], 0, HOUSE_C[2]);
    R.add(this.house);
    // quake dust puffs waiting at the front stone row (shot 8)
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#cbb489", transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(-6.5 + i * 2.6, 0.55, -2.2);
      sp.scale.set(2.6, 1.5, 1); sp.layers.set(NOINK); R.add(sp);
      this.quakeDust.push(sp);
    }
    // ---- rangkiang: the little rice-barn siblings ----
    const rk1 = makeHouse({ len: 4.8, wid: 2.9, floorY: 1.8, wallH: 1.5, bays: 2, detail: false });
    rk1.position.set(12.2, 0, 1.8); rk1.rotation.y = -0.16; R.add(rk1);
    const rk2 = makeHouse({ len: 4.8, wid: 2.9, floorY: 1.8, wallH: 1.5, bays: 2, detail: false });
    rk2.position.set(-12.8, 0, -0.2); rk2.rotation.y = 0.13; R.add(rk2);
  }

  // ---------------- the valley: meadow, dirt yard, sawah terraces, volcanoes ----------------
  private buildValley(R: THREE.Group, r: () => number) {
    // the meadow under everything
    const ground = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassTex(), 130, 130) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.1, -30); ground.receiveShadow = true; R.add(ground);
    // the packed-dirt yard: house front + the duel arena
    const yard = new THREE.Mesh(new THREE.CircleGeometry(21, 36), lam2({ map: rep(dirtTex(), 9, 9) }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.0, 9);
    yard.scale.set(1.05, 1.25, 1); yard.receiveShadow = true; R.add(yard);
    // ---- sawah terraces climbing east + west ----
    const bundM = lam2({ map: rep(grassTex(), 6, 1), color: "#7fae4c" });
    const terrace = (cx: number, topY: number, wdt: number, dep: number) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(wdt, Math.max(0.5, topY + 0.6), dep), bundM);
      base.position.set(cx, topY - Math.max(0.5, topY + 0.6) / 2 + 0.02, -6);
      base.receiveShadow = true; base.castShadow = true; R.add(base);
      const wm = rep(water(), 5, 10);
      this.waterMaps.push(wm);
      const wtr = new THREE.Mesh(new THREE.PlaneGeometry(wdt - 1.1, dep - 1.1), lam2({ map: wm, color: "#7ec8d8" }));
      wtr.rotation.x = -Math.PI / 2; wtr.position.set(cx, topY + 0.04, -6);
      wtr.receiveShadow = true; R.add(wtr);
    };
    for (let i = 0; i < 4; i++) terrace(23 + i * 8.5, 0.4 + i * 1.25, 8.2, 54);
    for (let i = 0; i < 3; i++) terrace(-23 - i * 8.5, 0.4 + i * 1.25, 8.2, 54);
    // flat paddies on the north plain, behind the house
    for (let i = 0; i < 3; i++) {
      const wm = rep(water(), 6, 3);
      this.waterMaps.push(wm);
      const wtr = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), lam2({ map: wm, color: "#7ec8d8" }));
      wtr.rotation.x = -Math.PI / 2; wtr.position.set(-26 + i * 26, 0.03, -42 - (i % 2) * 13);
      wtr.receiveShadow = true; R.add(wtr);
    }
    // ---- volcanoes on the north horizon ----
    const mtnM = lam2({ map: rep(mountainTex(), 3, 1) });
    const mtn = (x: number, z: number, rad: number, h: number) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 24, 1), mtnM);
      m.position.set(x, h / 2 - 1, z); R.add(m);
    };
    mtn(-58, -155, 58, 46); mtn(50, -172, 68, 54); mtn(0, -200, 52, 36); mtn(-120, -185, 46, 32); mtn(118, -190, 50, 34);
    // ---- palms + round trees around the yard (never in the arena,
    // never blocking the cover axis) ----
    const palmSpots: [number, number, number][] = [
      [-16.5, 6, 4.4], [16.8, 7.5, 4.0], [-19, -12, 4.8], [19.5, -14, 4.2], [13.5, 14.5, 3.6], [-14.5, 16, 3.8],
    ];
    palmSpots.forEach(([x, z, h], i) => {
      const p = makePalm(h, 40 + i * 13);
      p.position.set(x, 0, z);
      p.rotation.y = r() * Math.PI * 2;
      R.add(p);
      this.palms.push({ g: p, ph: i * 1.71 });
      blob(R, x, 0.03, z, 3.2, 3.2, 0.3);
    });
    const treeSpots: [number, number, number][] = [
      [-24, 20, 3.4], [25, 24, 3.8], [-28, -24, 4.2], [29, -27, 4.0], [-9, 30, 3.0], [10, 31, 3.2], [-33, 4, 4.4], [34, 2, 4.2],
    ];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, 90 + i * 7);
      t.position.set(x, 0, z);
      t.rotation.y = r() * Math.PI * 2;
      R.add(t);
      blob(R, x, 0.03, z, 3.6, 3.6, 0.3);
    });
    // tone layering: warm sun pools + cool shade pools
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (10 + r() * 18), 0.02, 10 - r() * 55, 5 + r() * 6, 6 + r() * 8, 0.12 + r() * 0.08, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#4a5a3a", s * (11 + r() * 16), 0.021, 8 - r() * 50, 5 + r() * 5, 6 + r() * 6, 0.14 + r() * 0.08, r() * 3);
    }
    // ---- instanced grass tufts on the meadow (never on the dirt
    // yard, never under the house) ----
    const inYard = (x: number, z: number) => (x / 22.5) ** 2 + ((z - 9) / 27) ** 2 < 1.1;
    const inHouse = (x: number, z: number) => Math.abs(x) < 11 && z > -12 && z < 0;
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 1100; i++) {
      const x = (r() - 0.5) * 120, z = 26 - r() * 110;
      if (inYard(x, z) || inHouse(x, z)) continue;
      tuftPts.push({ x, z, s: 0.5 + r() * 0.5 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.05, 0.4, 0.8 + (r() - 0.5) * 0.22);
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
    // ---- STANDAR GERAK: everything that should move, moves ----
    // sawah water shimmers (slow texture drift, not a poster)
    this.waterMaps.forEach((wm, i) => wm.offset.set(tt * 0.006 * (1 + (i % 3) * 0.3), tt * 0.004));
    // THE HOUSE SWAYS ON ITS STONES — the episode's core motion:
    // a gentle rock in the cover + punchline, a hard rock in
    // the earthquake shot, a whisper under the roof close-up
    if (this.house) {
      const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      let amp = 0, spd = 2.1;
      if (id === 1 || id === 10) { amp = 0.0085; spd = 2.1; }
      else if (id === 8) { amp = 0.05 * Math.sin(Math.PI * Math.min(1, U * 1.12)); spd = 8.5; }
      else if (id === 3 || id === 7) { amp = 0.0035; spd = 1.6; }
      else if (id === 2 || id === 9) { amp = 0.005; spd = 1.8; }
      this.house.rotation.z = amp * Math.sin(tt * spd);
      this.house.rotation.x = amp * 0.55 * Math.sin(tt * spd * 0.83 + 1.1);
      this.house.position.y = id === 8 ? 0.035 * Math.sin(Math.PI * Math.min(1, U * 1.12)) * Math.abs(Math.sin(tt * 8.5)) : 0;
    }
    // quake dust at the stone row (shot 8 only)
    this.quakeDust.forEach((sp, i) => {
      const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      const env = id === 8 ? Math.sin(Math.PI * Math.min(1, U * 1.12)) : 0;
      (sp.material as THREE.SpriteMaterial).opacity = env * (0.16 + 0.14 * Math.abs(Math.sin(tt * 11 + i * 1.9)));
      const ss = 2.2 + 0.8 * Math.abs(Math.sin(tt * 5 + i));
      sp.scale.set(ss, ss * 0.55, 1);
    });
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // palms sway in the highland breeze
    for (const pl of this.palms) {
      pl.g.rotation.z = Math.sin(tt * 1.15 + pl.ph) * 0.015;
      pl.g.rotation.x = Math.cos(tt * 0.85 + pl.ph * 1.7) * 0.011;
    }
    // grass tufts bend with the same wind
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
