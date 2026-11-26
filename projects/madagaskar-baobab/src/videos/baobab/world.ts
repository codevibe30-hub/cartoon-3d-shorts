// Madagaskar as one three.js scene for the Fafnir-ID format:
// the Avenue of the Baobabs near Morondava — a red dirt road
// running to the horizon between bottle-trunk GIANTS whose
// root-like crowns claw at a hot blue sky. The hero tree's
// trunk carries a living water window: the 120,000 litres the
// claim is about, pulsing inside the bark from frame 0.
// VISUAL CORE: savanna daylight, red earth, salmon-pink smooth
// baobab bark, dry gold grass — textured everything (anti-
// banding: speckled sky, flecked crowns, gritty road). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, clamp01, HERO_TREE, FRUIT_TREE, SPONGE_TREE, FENCE_TREE, MAP_BOARD, FLIP_TREE } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
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
const skyTexDay = () => ctex("baobabSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1c5cc4"); grad.addColorStop(0.34, "#3f83dd"); grad.addColorStop(0.62, "#7db1ee");
  grad.addColorStop(0.85, "#c4ddf2"); grad.addColorStop(1, "#f2e8ce");
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
const glowTex = () => ctex("baobabGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const birdTex = () => ctex("baobabBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#8aa063"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(40,58,22,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(238,246,196,${0.12 + r() * 0.22})` : `rgba(30,48,18,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** DRY savanna ground: straw-gold blades and parched flecks on
 *  a warm ochre base — the grassRich recipe re-paletted dry. */
const dryGrassTex = () => ctex("baobabDryGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#a37f36"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "110,78,30" : "206,170,92";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(240,214,140,${0.10 + r() * 0.20})` : `rgba(80,56,18,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#7a5c22", "#96742e", "#b8903e", "#d3ac58", "#e8cc82"];
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
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(120,72,36,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.2, 0, 7); g.fill(); }
});
/** the red dirt road: laterite red-orange, twin wheel ruts,
 *  pale grit and dark pebble flecks */
const dirtTex = () => ctex("baobabDirt", 512, 1024, (g, r) => {
  g.fillStyle = "#a5572e"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "70,36,16" : "206,130,80"},${0.08 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 1024, 10 + r() * 34, 8 + r() * 22, r() * 3, 0, 7); g.fill();
  }
  // wheel ruts: two darker soft bands running the road's length
  for (const x of [128, 384]) {
    const gr = g.createLinearGradient(x - 42, 0, x + 42, 0);
    gr.addColorStop(0, "rgba(80,40,18,0)"); gr.addColorStop(0.5, "rgba(80,40,18,0.30)"); gr.addColorStop(1, "rgba(80,40,18,0)");
    g.fillStyle = gr; g.fillRect(x - 42, 0, 84, 1024);
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "52,28,12" : "226,168,116"},${0.10 + r() * 0.22})`; g.fillRect(r() * 512, r() * 1024, 2, 2); }
});
/** baobab bark: smooth salmon-pink with fine pale vertical
 *  streaks — Grandidier bark is famously smooth, not fissured */
const baobabBarkTex = () => ctex("baobabBark", 512, 512, (g, r) => {
  g.fillStyle = "#c08a5e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.42 ? `rgba(240,206,170,${0.08 + r() * 0.13})` : `rgba(140,88,52,${0.08 + r() * 0.12})`;
    g.lineWidth = 2 + r() * 3.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke();
  }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,226,190" : "110,66,36"},${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** dry wood for fences, boards and the fallen column */
const dryWoodTex = () => ctex("baobabDryWood", 256, 256, (g, r) => {
  g.fillStyle = "#8a6a44"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(52,36,18,${0.16 + r() * 0.22})` : `rgba(226,196,148,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const soilTex = () => ctex("baobabSoil", 256, 256, (g, r) => {
  g.fillStyle = "#7a4c2a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "48,28,12" : "160,110,66"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "34,20,8" : "206,160,104"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const patchTex = () => ctex("baobabPatch", 256, 256, (g) => {
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
const blobTex = () => ctex("baobabBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(30,20,40,0.62)"); gr.addColorStop(0.6, "rgba(30,20,40,0.34)"); gr.addColorStop(1, "rgba(30,20,40,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** the monument board's painted face: a little baobab over
 *  ruled lines — a sign, drawn not pasted */
const monumentTex = () => ctex("baobabMonument", 512, 340, (g, r) => {
  g.fillStyle = "#efe3c2"; g.fillRect(0, 0, 512, 340);
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(120,90,40,${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 340, 2, 2); }
  g.strokeStyle = "#5a4020"; g.lineWidth = 10; g.strokeRect(10, 10, 492, 320);
  // the tree: fat trunk + root crown
  g.fillStyle = "#8a5a34";
  g.beginPath(); g.moveTo(226, 210); g.lineTo(238, 96); g.lineTo(274, 96); g.lineTo(286, 210); g.closePath(); g.fill();
  g.strokeStyle = "#8a5a34"; g.lineWidth = 13; g.lineCap = "round";
  for (const dx of [-52, -26, 0, 26, 52]) { g.beginPath(); g.moveTo(256, 100); g.lineTo(256 + dx, 52 - Math.abs(dx) * 0.3); g.stroke(); }
  g.fillStyle = "#5d8148"; g.beginPath(); g.ellipse(256, 44, 74, 20, 0, 0, 7); g.fill();
  g.fillStyle = "#3a2c14"; g.textAlign = "center"; g.font = "900 44px Arial, sans-serif";
  g.fillText("MONUMEN ALAM", 256, 268);
  g.fillStyle = "#7a6238";
  for (const y of [292, 312]) g.fillRect(156, y, 200, 7);
});

// ---------------- builders ----------------
/** A Grandidier baobab: a bottle trunk on a lathe profile
 *  (flare at the base, long smooth swell, shoulder under the
 *  crown), thick root-like branches clawing up and out, and a
 *  FLAT-topped crown of small leafy blobs — the silhouette that
 *  reads "upside-down tree". Trunk height ~11.4*s, crown top
 *  ~14.5*s. */
const makeBaobab = (s: number, seed: number, fruit = false) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 19);
  const barkM = lam2({ map: rep(baobabBarkTex(), 2, 2), color: "#d8a878" });
  const pts: THREE.Vector2[] = [];
  const prof: [number, number][] = [
    [0.02, 0], [1.95, 0], [1.80, 0.5], [1.62, 2.2], [1.52, 4.2], [1.44, 6.2],
    [1.34, 8.2], [1.20, 9.8], [1.02, 10.8], [0.80, 11.4],
  ];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x * s, y * s));
  const trunk = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), barkM);
  trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
  // root flares gripping the earth
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + tr() * 0.5;
    const flare = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.5 * s, 7), barkM);
    flare.position.set(Math.cos(a) * 1.72 * s, 0.32 * s, Math.sin(a) * 1.72 * s);
    flare.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62);
    flare.castShadow = true; g.add(flare);
  }
  // branches: thick tapered limbs from the shoulder, clawing
  // up-out like roots — each tipped with a twig fork
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM("#5f7f36", "baobabFoliageDeep"), folM("#7ba24b", "baobabFoliageMid"), folM("#9dc168", "baobabFoliageLite"),
  ];
  const tips: THREE.Vector3[] = [];
  const nBr = 6;
  for (let i = 0; i < nBr; i++) {
    const a = (i / nBr) * Math.PI * 2 + tr() * 0.7;
    const reach = (2.2 + tr() * 1.3) * s, rise = (2.6 + tr() * 0.9) * s;
    const base = new THREE.Vector3(Math.cos(a) * 0.55 * s, 10.9 * s, Math.sin(a) * 0.55 * s);
    const tip = new THREE.Vector3(Math.cos(a) * reach, 10.9 * s + rise, Math.sin(a) * reach);
    const dir = tip.clone().sub(base), len = dir.length();
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.42 * s, len, 8), barkM);
    limb.position.copy(base).addScaledVector(dir, 0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    limb.castShadow = true; g.add(limb);
    tips.push(tip);
    for (const sgn of [1, -1]) {
      const tw2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.11 * s, 1.1 * s, 6), barkM);
      const td = new THREE.Vector3(Math.cos(a + sgn * 0.55) * 0.8, 0.85, Math.sin(a + sgn * 0.55) * 0.8).normalize();
      tw2.position.copy(tip).addScaledVector(td, 0.5 * s);
      tw2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), td);
      g.add(tw2);
      tips.push(tip.clone().addScaledVector(td, 1.05 * s));
    }
  }
  // flat crown: leafy blobs clustered at the limb tips, wider
  // than tall — a green tabletop, never a lollipop ball
  for (const tp of tips) {
    const b = new THREE.Mesh(new THREE.SphereGeometry((0.85 + tr() * 0.5) * s, 10, 8), mats[Math.floor(tr() * 3) % 3]);
    b.position.copy(tp).add(new THREE.Vector3((tr() - 0.5) * 0.5 * s, 0.25 * s, (tr() - 0.5) * 0.5 * s));
    b.scale.set(1.25, 0.55, 1.25);
    b.castShadow = true; g.add(b);
  }
  // hanging fruit pods (monkey bread): velvet-brown capsules on
  // long ropes from the crown — returned for the sway registry
  const pods: { pivot: THREE.Group; ph: number }[] = [];
  if (fruit) {
    const podM = lam2({ color: "#b08144", map: rep(dryWoodTex(), 1, 1) });
    const ropeM = lam2({ color: "#6a4c2a" });
    for (let i = 0; i < 9; i++) {
      const tp = tips[i % tips.length];
      const pivot = new THREE.Group();
      pivot.position.copy(tp);
      const ropeLen = (1.1 + tr() * 0.9) * s;
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, ropeLen, 5), ropeM);
      rope.position.y = -ropeLen / 2; pivot.add(rope);
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.30 * s, 9, 8), podM);
      pod.scale.set(1, 1.45, 1);
      pod.position.y = -ropeLen - 0.35 * s;
      pod.castShadow = true; pivot.add(pod);
      g.add(pivot);
      pods.push({ pivot, ph: i * 1.31 });
    }
  }
  return { g, pods };
};

/** an umbrella acacia: leaning trunk, two flat canopy discs */
const makeAcacia = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 391 + 7);
  const woodM = lam2({ map: rep(dryWoodTex(), 1, 2), color: "#9a7a52" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 2.6 * s, 7), woodM);
  trunk.position.y = 1.3 * s; trunk.rotation.z = 0.10; trunk.castShadow = true; g.add(trunk);
  for (const sgn of [1, -1]) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 1.7 * s, 6), woodM);
    br.position.set(sgn * 0.55 * s, 3.0 * s, 0); br.rotation.z = sgn * 0.7; g.add(br);
  }
  const folM = lam2({ color: "#6d8a3c", map: rep(foliageTex("baobabFoliageAcacia"), 2, 1) });
  for (const [dx, dy, r] of [[0, 3.9, 2.3], [0.9, 3.6, 1.6], [-1.0, 3.7, 1.5]] as [number, number, number][]) {
    const disc = new THREE.Mesh(new THREE.SphereGeometry(r * s, 11, 8), folM);
    disc.position.set(dx * s, dy * s, (tr() - 0.5) * 0.4 * s);
    disc.scale.set(1.3, 0.30, 1.3);
    disc.castShadow = true; g.add(disc);
  }
  return g;
};

/** the little tree planted UPSIDE-DOWN (shot 8's visual gag):
 *  leaf ball half-buried, roots clawing at the sky */
const makeFlippedTree = () => {
  const g = new THREE.Group();
  const folM = lam2({ color: "#5d8148", map: rep(foliageTex("baobabFoliageFlip"), 1, 1) });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.05, 11, 9), folM);
  ball.position.y = 0.28; ball.scale.set(1.15, 0.62, 1.15); ball.castShadow = true; g.add(ball);
  const woodM = lam2({ map: rep(dryWoodTex(), 1, 1), color: "#9a7a52" });
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.20, 0.8, 7), woodM);
  stub.position.y = 0.95; stub.rotation.z = 0.12; g.add(stub);
  const rr2 = rng(4242);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rr2() * 0.6;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.085, 1.15 + rr2() * 0.5, 6), woodM);
    root.position.set(Math.cos(a) * 0.34, 1.75, Math.sin(a) * 0.34);
    root.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    g.add(root);
  }
  return g;
};

/** one dry grass tuft: seven tapered straw blades, vertex-
 *  coloured dark root -> pale tip. Instanced over the savanna. */
const grassTuftGeo = (dry = true) => {
  const tr = rng(dry ? 60606 : 90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#6e5016"), tip = new THREE.Color("#e3c06a"), tmp = new THREE.Color();
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
  private fog = new THREE.Fog("#c8d4e8", 18, 190);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number; k: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private pods: { pivot: THREE.Group; ph: number }[] = [];
  // ---- set pieces with per-shot behaviour ----
  private heroWater: THREE.Mesh | null = null;
  private heroWaterMap: THREE.Texture | null = null;
  private spongeWater: THREE.Mesh | null = null;
  private rain: THREE.Points | null = null;
  private rainSeed: number[] = [];
  private measureGroup: THREE.Group | null = null;
  private timeRing: THREE.Mesh | null = null;
  private fallPod: THREE.Mesh | null = null;
  private mapBoard: THREE.Group | null = null;
  private columnsGroup: THREE.Group | null = null;
  private spongeGroup: THREE.Group | null = null;
  private flipGroup: THREE.Group | null = null;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2800);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#a8895a", 0.55);
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
    this.buildSavanna(R, r);
  }

  // ---------------- the avenue and its set pieces ----------------
  private buildSavanna(R: THREE.Group, r: () => number) {
    // parched savanna floor under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(dryGrassTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the red dirt road to Morondava, straight down -Z
    const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 165), lam2({ map: rep(dirtTex(), 1, 22), color: "#d89a6a" }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -52); road.receiveShadow = true; R.add(road);
    // roadside grit: pebble lines softening both edges
    const pebM = lam2({ color: "#8a5a34" });
    for (let i = 0; i < 130; i++) {
      const s = i % 2 ? 1 : -1;
      const pb = new THREE.Mesh(new THREE.SphereGeometry(0.07 + r() * 0.09, 6, 5), pebM);
      pb.position.set(s * (3.6 + r() * 0.5), 0.05, 20 - r() * 135);
      pb.scale.y = 0.6; R.add(pb);
    }
    // ---- THE AVENUE: giants flanking the road, shrinking into the haze ----
    const avenue: [number, number, number][] = [
      // x, z, scale — HERO_TREE first (the cover giant)
      [HERO_TREE[0], HERO_TREE[2], 1.0],
      [4.6, -12, 0.92], [FRUIT_TREE[0], FRUIT_TREE[2], 1.05], [FENCE_TREE[0], FENCE_TREE[2], 0.88],
      [-5.0, -36, 0.97], [4.8, -44, 1.10], [-5.4, -53, 0.90], [5.4, -62, 1.0],
      [-5.2, -71, 0.85], [5.0, -80, 0.95], [-5.6, -92, 1.02], [5.6, -103, 0.9],
    ];
    avenue.forEach(([x, z, s], i) => {
      const isFruit = x === FRUIT_TREE[0] && z === FRUIT_TREE[2];
      const { g, pods } = makeBaobab(s, 100 + i * 17, isFruit);
      g.position.set(x, 0, z);
      g.rotation.y = r() * Math.PI * 2;
      R.add(g);
      this.trees.push({ g, ph: i * 1.93, k: 0.006 });
      this.pods.push(...pods);
      blob(R, x, 0.04, z, 6.4 * s, 6.4 * s, 0.30);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.6 * s, 14), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, 0.03, z);
      disc.receiveShadow = true; R.add(disc);
    });
    // ---- the hero tree's WATER WINDOW: the stored 120,000
    // litres, alive inside the bark — a curved water panel set
    // into the trunk's camera side, scrolling + breathing ----
    const wmap = rep(water(), 1, 2);
    this.heroWaterMap = wmap;
    const hw = new THREE.Mesh(
      new THREE.CylinderGeometry(1.30, 1.84, 4.6, 14, 1, true, -0.50, 1.00),
      new THREE.MeshBasicMaterial({ map: wmap, color: "#79c6ee", transparent: true, opacity: 0.82, depthWrite: false }));
    hw.position.set(HERO_TREE[0], 4.0, HERO_TREE[2]);
    hw.renderOrder = 1; R.add(hw);
    this.heroWater = hw;
    // ---- the SPONGE tree (shot 5): a ghosted cutaway trunk
    // with the water level itself rising and falling inside ----
    const sponge = new THREE.Group();
    const ghostM = new THREE.MeshLambertMaterial({ map: rep(baobabBarkTex(), 2, 2), color: "#e0b088", transparent: true, opacity: 0.45, depthWrite: false });
    const prof: [number, number][] = [[0.02, 0], [1.95, 0], [1.80, 0.5], [1.62, 2.2], [1.52, 4.2], [1.44, 6.2], [1.34, 8.2], [1.20, 9.8], [1.02, 10.8], [0.80, 11.4]];
    const spts = prof.map(([x, y]) => new THREE.Vector2(x * 0.92, y * 0.92));
    const sTrunk = new THREE.Mesh(new THREE.LatheGeometry(spts, 18), ghostM);
    sTrunk.castShadow = true; sponge.add(sTrunk);
    const swMap = rep(water(), 1, 2);
    const sw = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.42, 8.6, 14),
      new THREE.MeshBasicMaterial({ map: swMap, color: "#5fb2e8", transparent: true, opacity: 0.88, depthWrite: false }));
    sw.position.y = 4.3; sw.renderOrder = 1; sponge.add(sw);
    this.spongeWater = sw;
    // a few ghost branches so the cutaway still reads as a tree
    const gbM = new THREE.MeshLambertMaterial({ map: rep(baobabBarkTex(), 1, 1), color: "#e0b088", transparent: true, opacity: 0.45, depthWrite: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.36, 3.4, 7), gbM);
      limb.position.set(Math.cos(a) * 1.15, 11.3, Math.sin(a) * 1.15);
      limb.rotation.set(Math.sin(a) * 0.65, 0, -Math.cos(a) * 0.65);
      sponge.add(limb);
    }
    sponge.position.set(SPONGE_TREE[0], 0, SPONGE_TREE[2]);
    R.add(sponge);
    this.spongeGroup = sponge;
    blob(R, SPONGE_TREE[0], 0.04, SPONGE_TREE[2], 6, 6, 0.28);
    // ---- rain over the sponge tree (shot 5, first half): a
    // point shower that exists only while the clouds open ----
    const NRAIN = 380;
    const rpos = new Float32Array(NRAIN * 3);
    for (let i = 0; i < NRAIN; i++) {
      this.rainSeed.push(r());
      rpos[i * 3] = SPONGE_TREE[0] + (r() - 0.5) * 9;
      rpos[i * 3 + 1] = r() * 12;
      rpos[i * 3 + 2] = SPONGE_TREE[2] + (r() - 0.5) * 9;
    }
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
    const dropCv = document.createElement("canvas"); dropCv.width = dropCv.height = 64;
    const dctx = dropCv.getContext("2d")!;
    const dgr = dctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    dgr.addColorStop(0, "rgba(255,255,255,1)"); dgr.addColorStop(0.55, "rgba(205,232,255,0.85)"); dgr.addColorStop(1, "rgba(205,232,255,0)");
    dctx.fillStyle = dgr; dctx.fillRect(0, 0, 64, 64);
    this.rain = new THREE.Points(rgeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dropCv), color: "#cfe8ff", size: 0.34, transparent: true, opacity: 0.8, depthWrite: false, alphaTest: 0.02 }));
    this.rain.visible = false; R.add(this.rain);
    // ---- measure lines (shot 2): the 30 m height + 11 m girth
    // drawn as surveyor's marks beside the hero tree ----
    const mg = new THREE.Group();
    const markM = new THREE.MeshBasicMaterial({ color: "#ffd23e" });
    const vline = new THREE.Mesh(new THREE.BoxGeometry(0.10, 13.6, 0.10), markM);
    vline.position.set(2.9, 6.8, 0); mg.add(vline);
    const hline = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.10, 0.10), markM);
    hline.position.set(0, 0.45, 2.6); mg.add(hline);
    for (const [x, y, rot] of [[2.9, 13.75, 0], [2.9, 0.1, Math.PI]] as [number, number, number][]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8), markM);
      tip.position.set(x, y, 0); tip.rotation.x = rot; mg.add(tip);
    }
    for (const x of [-2.2, 2.2]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8), markM);
      tip.position.set(x, 0.45, 2.6); tip.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2; mg.add(tip);
    }
    mg.position.set(HERO_TREE[0], 0, HERO_TREE[2]);
    mg.visible = false; R.add(mg);
    this.measureGroup = mg;
    // ---- the time ring (shot 4): 2,800 years turning slowly
    // around the hero trunk ----
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.075, 8, 48),
      new THREE.MeshBasicMaterial({ color: "#ffcf4d", transparent: true, opacity: 0.9 }));
    ring.position.set(HERO_TREE[0], 5.2, HERO_TREE[2]);
    ring.rotation.x = Math.PI / 2 - 0.16;
    ring.visible = false; R.add(ring);
    this.timeRing = ring;
    // ---- Roman traces (shot 4): two pale columns + a fallen
    // drum by the road — the ancient world the tree outlived ----
    const marbleM = lam2({ color: "#e8e0cc", map: rep(dryWoodTex(), 1, 1) });
    const cols = new THREE.Group();
    const columnAt = (x: number, z: number, h: number) => {
      const c = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, h, 12), marbleM);
      shaft.position.y = h / 2 + 0.3; shaft.castShadow = true; c.add(shaft);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.32, 1.15), marbleM);
      cap.position.y = h + 0.46; c.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), marbleM);
      base.position.y = 0.15; c.add(base);
      c.position.set(x, 0, z); cols.add(c);
    };
    columnAt(2.1, -11.5, 4.6);
    columnAt(-7.8, -12.5, 3.4);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.1, 12), marbleM);
    drum.rotation.z = Math.PI / 2; drum.rotation.y = 0.5;
    drum.position.set(3.4, 0.44, -8.6); drum.castShadow = true; cols.add(drum);
    R.add(cols);
    this.columnsGroup = cols;
    // ---- the MAP BOARD (shot 6): the island, lit green, with
    // six little baobabs standing on it and nowhere else ----
    const board = new THREE.Group();
    const postM = lam2({ map: rep(dryWoodTex(), 1, 2), color: "#8a6844" });
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 7), postM);
      post.position.set(s * 2.2, 1.7, 0); post.castShadow = true; board.add(post);
    }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.4, 0.14), new THREE.MeshBasicMaterial({ map: rep(planks(), 2, 1), color: "#f2e3c2" }));
    panel.position.y = 3.1; panel.castShadow = true; board.add(panel);
    // Madagascar's silhouette, drawn as a tilted island shape
    const isl = new THREE.Shape();
    const ipts: [number, number][] = [
      [0.25, 1.0], [0.55, 0.8], [0.60, 0.45], [0.45, 0.1], [0.50, -0.3], [0.30, -0.7],
      [0.10, -1.0], [-0.15, -0.85], [-0.20, -0.4], [-0.35, -0.05], [-0.30, 0.3], [-0.15, 0.6], [-0.05, 0.85],
    ];
    isl.moveTo(ipts[0][0], ipts[0][1]);
    for (let i = 1; i < ipts.length; i++) isl.lineTo(ipts[i][0], ipts[i][1]);
    isl.closePath();
    const islMesh = new THREE.Mesh(new THREE.ShapeGeometry(isl),
      new THREE.MeshLambertMaterial({ color: "#69b34c", emissive: "#2a5d18", emissiveIntensity: 0.55 }));
    islMesh.scale.set(1.55, 1.55, 1);
    islMesh.position.set(-0.7, 3.1, 0.10);
    board.add(islMesh);
    // six endemic stars: mini baobabs standing ON the island
    const miniM = lam2({ color: "#7a4c26" });
    const miniLeaf = lam2({ color: "#4d7d33" });
    const spots: [number, number][] = [[-0.85, 3.9], [-0.45, 3.35], [-0.95, 2.8], [-0.35, 2.45], [-0.7, 1.95], [-0.15, 3.0]];
    for (const [mx, my] of spots) {
      const mt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.10, 0.42, 6), miniM);
      mt.position.set(mx, my, 0.16); board.add(mt);
      const mc = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), miniLeaf);
      mc.position.set(mx, my + 0.30, 0.16); mc.scale.set(1.3, 0.55, 1); board.add(mc);
    }
    board.position.set(MAP_BOARD[0], 0, MAP_BOARD[2]);
    board.rotation.y = -0.42;
    R.add(board);
    this.mapBoard = board;
    // ---- the falling pod (shot 7): one monkey-bread capsule
    // drops and bounces beside the hero ----
    const fp = new THREE.Mesh(new THREE.SphereGeometry(0.30, 9, 8), lam2({ color: "#b08144", map: rep(dryWoodTex(), 1, 1) }));
    fp.scale.set(1, 1.45, 1);
    fp.castShadow = true; fp.visible = false; R.add(fp);
    this.fallPod = fp;
    // ---- the flipped sapling (shot 8) ----
    const flip = makeFlippedTree();
    flip.position.set(FLIP_TREE[0], 0, FLIP_TREE[2]);
    flip.scale.setScalar(1.5);
    R.add(flip);
    this.flipGroup = flip;
    this.trees.push({ g: flip, ph: 2.2, k: 0.02 });
    blob(R, FLIP_TREE[0], 0.04, FLIP_TREE[2], 3.8, 3.8, 0.3);
    // ---- the protected giant (shot 9): a wooden fence ring +
    // the monument board by the road ----
    const fence = new THREE.Group();
    const fr = 3.9;
    const postN = 11;
    for (let i = 0; i < postN; i++) {
      const a = (i / postN) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.05, 6), postM);
      post.position.set(Math.cos(a) * fr, 0.52, Math.sin(a) * fr);
      post.castShadow = true; fence.add(post);
      const a2 = ((i + 1) / postN) * Math.PI * 2;
      const mx = (Math.cos(a) + Math.cos(a2)) / 2 * fr, mz = (Math.sin(a) + Math.sin(a2)) / 2 * fr;
      const segLen = Math.hypot(Math.cos(a2) * fr - Math.cos(a) * fr, Math.sin(a2) * fr - Math.sin(a) * fr);
      for (const ry of [0.42, 0.82]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, segLen, 5), postM);
        rail.position.set(mx, ry, mz);
        rail.rotation.z = Math.PI / 2;
        rail.rotation.y = -Math.atan2(Math.sin(a2) * fr - Math.sin(a) * fr, Math.cos(a2) * fr - Math.cos(a) * fr);
        fence.add(rail);
      }
    }
    fence.position.set(FENCE_TREE[0], 0, FENCE_TREE[2]);
    R.add(fence);
    const mon = new THREE.Group();
    const mpost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6), postM);
    mpost.position.y = 0.75; mon.add(mpost);
    const mface = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.26, 0.08),
      lam2({ map: monumentTex(), color: "#ffffff" }));
    mface.position.y = 1.85; mface.rotation.x = -0.14; mface.castShadow = true; mon.add(mface);
    mon.position.set(2.9, 0, -23.6);
    mon.rotation.y = 0.5;
    R.add(mon);
    // ---- acacias + dry bushes scattered over the savanna ----
    const aca: [number, number, number][] = [[-13, -18, 1.1], [14, -34, 1.3], [-16, -48, 1.0], [15, -58, 1.2], [-12, -70, 1.35], [17, -84, 1.05], [-19, -95, 1.25]];
    aca.forEach(([x, z, s], i) => {
      const a2 = makeAcacia(s, 55 + i * 9);
      a2.position.set(x, 0, z);
      a2.rotation.y = r() * 3;
      R.add(a2);
      this.trees.push({ g: a2, ph: 4.1 + i * 1.37, k: 0.012 });
    });
    const bushMats = [
      lam2({ color: "#7a6a30", map: rep(foliageTex("baobabFoliageBush"), 2, 1) }),
      lam2({ color: "#8a7a3a", map: rep(foliageTex("baobabFoliageBush"), 2, 1) }),
      lam2({ color: "#67702c", map: rep(foliageTex("baobabFoliageBush"), 2, 1) }),
    ];
    for (let i = 0; i < 46; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const bx = s * (8.5 + r() * 22), bz = 12 - r() * 118;
      if (avenue.some(([ax, az]) => Math.abs(bx - ax) < 4 && Math.abs(bz - az) < 4)) continue;
      const rad = 0.4 + r() * 0.55;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 9, 7), bushMats[i % 3]);
      b.position.set(bx, rad * 0.5, bz);
      b.scale.set(1 + (r() - 0.5) * 0.3, 0.66 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    }
    // ---- distant table hills closing the horizon ----
    const hillM = lam2({ color: "#8d7fa8" });
    for (const [x, z, w, h] of [[-70, -165, 95, 15], [62, -178, 110, 19], [0, -195, 150, 13]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.36, w * 0.5, h, 4), hillM);
      hill.position.set(x, h / 2 - 0.5, z);
      hill.rotation.y = Math.PI / 4;
      R.add(hill);
    }
    // ---- world-space tone layering + dry tufts ----
    for (const s of [1, -1]) {
      softPatch(R, patchTex(), "#8a6428", s * 9.5, 0.10, -46, 6.5, 138, 0.30);
      softPatch(R, patchTex(), "#e8d194", s * 14, 0.10, -46, 7, 138, 0.20);
    }
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (7 + r() * 14), 0.105, 8 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.13 + r() * 0.08, r() * 3);
    }
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (const s of [1, -1]) for (let z = 20; z > -112; z -= 0.6 + r() * 0.6) {
      if (r() < 0.85) pushTuft(s * (4.1 + r() * 0.7), z + (r() - 0.5), 0.85 + r() * 0.8);
      if (r() < 0.30) pushTuft(s * (5.6 + r() * 1.2), z - 0.4, 0.7 + r() * 0.7);
    }
    for (const [ax, az] of avenue) for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 2.2 + r() * 1.1;
      pushTuft(ax + Math.cos(a) * d, az + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 700; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (4.6 + r() * 20), z = 16 - r() * 122;
      if (avenue.some(([ax, az]) => Math.abs(z - az) < 3.4 && Math.abs(x - ax) < 3.4)) continue;
      pushTuft(x, z, (0.65 + r() * 0.8) * (z > -30 ? 1.2 : 1));
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.02, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.11 + (r() - 0.5) * 0.03, 0.42, 0.82 + (r() - 0.5) * 0.22);
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
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the savanna wind, pivoting at the ground —
    // giants barely breathe (k small), saplings dance
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.05 + tr2.ph) * tr2.k;
      tr2.g.rotation.x = Math.cos(tt * 0.8 + tr2.ph * 1.7) * tr2.k * 0.7;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.02, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // fruit pods swing on their ropes
    for (const pd of this.pods) {
      pd.pivot.rotation.z = Math.sin(tt * 1.4 + pd.ph) * 0.10;
      pd.pivot.rotation.x = Math.cos(tt * 1.1 + pd.ph * 1.3) * 0.07;
    }
    // ---- set pieces per shot ----
    const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
    // the hero tree's stored water: always scrolling, breathing
    if (this.heroWaterMap) this.heroWaterMap.offset.set(0, -tt * 0.13);
    if (this.heroWater) {
      this.heroWater.visible = id === 1 || id === 10;
      const pulse = 1 + Math.sin(tt * 2.2) * 0.012;
      this.heroWater.scale.set(pulse, 1, pulse);
    }
    // set pieces that belong to ONE shot only — never leak into the others
    if (this.mapBoard) this.mapBoard.visible = id === 6;
    if (this.columnsGroup) this.columnsGroup.visible = id === 4;
    if (this.spongeGroup) this.spongeGroup.visible = id === 5;
    if (this.flipGroup) this.flipGroup.visible = id === 8;
    // shot 2: surveyor's marks on the giant
    if (this.measureGroup) this.measureGroup.visible = id === 2;
    // shot 4: the years turn around the trunk
    if (this.timeRing) {
      this.timeRing.visible = id === 4;
      if (id === 4) {
        this.timeRing.rotation.z = tt * 0.9;
        this.timeRing.position.y = 5.2 + Math.sin(tt * 0.8) * 0.35;
      }
    }
    // shot 5: rain fills the sponge, then the sun drinks it down
    if (this.rain) {
      const raining = id === 5 && U < 0.48;
      this.rain.visible = raining;
      if (raining) {
        const pos = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const fall = (tt * 9 + this.rainSeed[i] * 12) % 12;
          pos.setY(i, 12 - fall);
        }
        pos.needsUpdate = true;
      }
    }
    if (this.spongeWater) {
      const lvl = id === 5 ? (U < 0.48 ? 0.30 + (U / 0.48) * 0.68 : 0.98 - ((U - 0.48) / 0.52) * 0.40) : 0.8;
      this.spongeWater.scale.y = Math.max(0.05, lvl);
      this.spongeWater.position.y = 4.3 * Math.max(0.05, lvl);
    }
    // shot 7: one pod lets go and bounces by the hero's feet
    if (this.fallPod) {
      if (id === 7) {
        this.fallPod.visible = true;
        const fx0 = FRUIT_TREE[0] + 1.3, fz0 = FRUIT_TREE[2] + 2.6;
        if (U < 0.55) { this.fallPod.position.set(fx0, 5.4, fz0); }
        else {
          const u = Math.min(1, (U - 0.55) / 0.18);
          const drop = 5.4 - 0.42;
          let y = 5.4 - drop * u * u;
          if (u >= 1) { const bt = (U - 0.73) / 0.27; y = 0.42 + Math.abs(Math.sin(bt * Math.PI * 2.2)) * 0.35 * (1 - bt); }
          this.fallPod.position.set(fx0, y, fz0);
          this.fallPod.rotation.z = u * 1.2;
        }
      } else this.fallPod.visible = false;
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
