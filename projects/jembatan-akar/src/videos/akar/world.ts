// Jembatan Akar (Titian Aka) as one three.js scene for the
// Fafnir-ID format: a lush Sumatran river gorge — the Batang
// Bayang racing between jungle banks while a LIVING bridge of
// woven banyan roots sags across it, anchored in two giant
// banyans. Roots still creep and weave at mid-span from frame
// 0 (the bridge is alive). VISUAL CORE: deep jungle greens,
// brown-green rushing water with foam, wet rock, buttress
// roots and hanging aerial roots. Layered light rig: sun key
// w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, grassHD, stoneHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, clamp01, BANK_Y, TREE_A, TREE_B, NAME_BOARD, deckYAt } from "./story";

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
const skyTexDay = () => ctex("akarSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1c5cc4"); grad.addColorStop(0.34, "#3f83dd"); grad.addColorStop(0.62, "#7db1ee");
  grad.addColorStop(0.85, "#c9e4d8"); grad.addColorStop(1, "#eef0cd");
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
const glowTex = () => ctex("akarGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const birdTex = () => ctex("akarBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
const foliageTex = (key: string, base = "#4d7038") => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(24,44,16,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(226,246,180,${0.12 + r() * 0.22})` : `rgba(16,34,10,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** banyan bark: grey-brown with long vertical fissure streaks */
const barkTex = () => ctex("akarBark", 512, 512, (g, r) => {
  g.fillStyle = "#7d6a52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) {
    const x = r() * 512, y = r() * 512, l = 26 + r() * 90;
    g.strokeStyle = r() > 0.45 ? `rgba(52,40,26,${0.10 + r() * 0.16})` : `rgba(214,196,164,${0.08 + r() * 0.12})`;
    g.lineWidth = 2 + r() * 3.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "232,216,182" : "40,30,18"},${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // moss patches creeping up the trunk
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(74,110,52,${0.10 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 512, 300 + r() * 212, 14 + r() * 30, 8 + r() * 18, r() * 3, 0, 7); g.fill();
  }
});
/** root surface: darker, damper bark with ring ridges */
const rootTex = () => ctex("akarRoot", 512, 512, (g, r) => {
  g.fillStyle = "#6b543c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 340; i++) {
    const x = r() * 512, y = r() * 512, l = 18 + r() * 60;
    g.strokeStyle = r() > 0.4 ? `rgba(38,26,14,${0.12 + r() * 0.16})` : `rgba(206,178,138,${0.08 + r() * 0.12})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "226,204,160" : "30,20,10"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 20; i++) {
    g.fillStyle = `rgba(84,124,58,${0.10 + r() * 0.15})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 24, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
});
const woodTex = () => ctex("akarWood", 256, 256, (g, r) => {
  g.fillStyle = "#8a6a44"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(52,36,18,${0.16 + r() * 0.22})` : `rgba(226,196,148,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** whitewater foam streaks racing along the river */
const foamTex = () => ctex("akarFoam", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 512, y = r() * 256, l = 22 + r() * 90;
    g.strokeStyle = `rgba(244,252,250,${0.10 + r() * 0.30})`;
    g.lineWidth = 1.4 + r() * 3.2; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 7); g.stroke();
  }
  for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(248,253,252,${0.12 + r() * 0.3})`; g.beginPath(); g.arc(r() * 512, r() * 256, 0.8 + r() * 2.2, 0, 7); g.fill(); }
});
/** gorge cliff: big irregular rock blocks, moss in the cracks — NOT a brick wall */
const cliffTex = () => ctex("akarCliffTex", 512, 512, (g, r) => {
  g.fillStyle = "#6e6252"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = r() * 512, y = r() * 512, w = 40 + r() * 110, h = 26 + r() * 60;
    const cols = ["#77806c", "#626d58", "#868f78", "#57614c", "#707a64"];
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w * (0.7 + r() * 0.5), y + (r() - 0.5) * 12);
    g.lineTo(x + w, y + h);
    g.lineTo(x + w * (0.2 + r() * 0.3), y + h * (0.85 + r() * 0.3));
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(30,26,18,0.35)"; g.lineWidth = 2.5; g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "226,214,188" : "26,22,14"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 34; i++) {
    g.fillStyle = `rgba(80,116,54,${0.12 + r() * 0.18})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 12 + r() * 30, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  // wet streaks running down the face
  for (let i = 0; i < 26; i++) {
    const x = r() * 512;
    g.strokeStyle = `rgba(40,44,30,${0.10 + r() * 0.14})`; g.lineWidth = 3 + r() * 6;
    g.beginPath(); g.moveTo(x, r() * 200); g.lineTo(x + (r() - 0.5) * 14, 512); g.stroke();
  }
});
/** the name board's painted face */
const boardTex = (title: string, sub: string) => ctex(`akarBoard${title}`, 512, 300, (g, r) => {
  g.fillStyle = "#5d4226"; g.fillRect(0, 0, 512, 300);
  for (let i = 0; i < 130; i++) {
    const y = r() * 300;
    g.strokeStyle = `rgba(30,18,8,${0.12 + r() * 0.2})`; g.lineWidth = 1.6 + r() * 2.4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 8); g.stroke();
  }
  g.strokeStyle = "#e8cf8e"; g.lineWidth = 8; g.strokeRect(14, 14, 484, 272);
  g.fillStyle = "#f4e3ae"; g.textAlign = "center";
  g.font = "900 74px Arial, sans-serif";
  g.fillText(title, 256, 138);
  g.font = "700 40px Arial, sans-serif"; g.fillStyle = "#d9bd76";
  g.fillText(sub, 256, 208);
  // a little root squiggle under the words
  g.strokeStyle = "#a8c686"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(116, 244);
  g.bezierCurveTo(200, 224, 300, 264, 396, 240); g.stroke();
});
const patchTex = () => ctex("akarPatch", 256, 256, (g) => {
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
const blobTex = () => ctex("akarBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(20,26,16,0.62)"); gr.addColorStop(0.6, "rgba(20,26,16,0.34)"); gr.addColorStop(1, "rgba(20,26,16,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** A banyan: a short massive trunk on buttress flares, wide
 *  limbs, a broad layered crown — and AERIAL ROOTS: strands
 *  dropping from the limbs, some already rooted as prop
 *  columns. Trunk top ~6.4*s, crown top ~10.5*s. */
const makeBanyan = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 19);
  const barkM = lam2({ map: rep(barkTex(), 2, 2), color: "#a08a6c" });
  const pts: THREE.Vector2[] = [];
  const prof: [number, number][] = [
    [0.02, 0], [1.55, 0], [1.38, 0.4], [1.16, 1.6], [1.02, 3.2], [0.94, 4.6], [0.86, 5.8], [0.72, 6.4],
  ];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x * s, y * s));
  const trunk = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), barkM);
  trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
  // buttress flares: flat fins radiating at the base
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + tr() * 0.5;
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.34 * s, 2.0 * s, 6), barkM);
    fin.position.set(Math.cos(a) * 1.42 * s, 0.55 * s, Math.sin(a) * 1.42 * s);
    fin.rotation.set(Math.sin(a) * 0.66, 0, -Math.cos(a) * 0.66);
    fin.scale.set(1, 1, 0.45);
    fin.castShadow = true; g.add(fin);
  }
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM("#4a7030", "akarFoliageDeep"), folM("#639344", "akarFoliageMid"), folM("#84b45e", "akarFoliageLite"),
  ];
  const tips: THREE.Vector3[] = [];
  const nBr = 7;
  for (let i = 0; i < nBr; i++) {
    const a = (i / nBr) * Math.PI * 2 + tr() * 0.7;
    const reach = (2.6 + tr() * 1.6) * s, rise = (1.9 + tr() * 0.8) * s;
    const base = new THREE.Vector3(Math.cos(a) * 0.5 * s, 6.1 * s, Math.sin(a) * 0.5 * s);
    const tip = new THREE.Vector3(Math.cos(a) * reach, 6.1 * s + rise, Math.sin(a) * reach);
    const dir = tip.clone().sub(base), len = dir.length();
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.34 * s, len, 8), barkM);
    limb.position.copy(base).addScaledVector(dir, 0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    limb.castShadow = true; g.add(limb);
    tips.push(tip);
    for (const sgn of [1, -1]) {
      const tw2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.0 * s, 6), barkM);
      const td = new THREE.Vector3(Math.cos(a + sgn * 0.55) * 0.8, 0.85, Math.sin(a + sgn * 0.55) * 0.8).normalize();
      tw2.position.copy(tip).addScaledVector(td, 0.45 * s);
      tw2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), td);
      g.add(tw2);
      tips.push(tip.clone().addScaledVector(td, 0.95 * s));
    }
  }
  for (const tp of tips) {
    const b = new THREE.Mesh(new THREE.SphereGeometry((0.95 + tr() * 0.55) * s, 10, 8), mats[Math.floor(tr() * 3) % 3]);
    b.position.copy(tp).add(new THREE.Vector3((tr() - 0.5) * 0.5 * s, 0.3 * s, (tr() - 0.5) * 0.5 * s));
    b.scale.set(1.3, 0.72, 1.3);
    b.castShadow = true; g.add(b);
  }
  // aerial roots: strands dropping from the outer limbs —
  // the banyan's signature; a few reach the ground as props
  const rootM = lam2({ map: rep(rootTex(), 1, 3), color: "#8a7154" });
  const strands: { mesh: THREE.Mesh; ph: number; top: THREE.Vector3 }[] = [];
  for (let i = 0; i < 9; i++) {
    const tp = tips[Math.floor(tr() * tips.length)];
    const grounded = i % 3 === 0;
    const len = grounded ? tp.y : tp.y * (0.45 + tr() * 0.3);
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.055 * s, len, 5), rootM);
    strand.position.set(tp.x, tp.y - len / 2, tp.z);
    g.add(strand);
    strands.push({ mesh: strand, ph: i * 1.47, top: tp.clone() });
  }
  return { g, strands };
};

/** a generic jungle tree: slim trunk + 3 layered blobs */
const makeJungleTree = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 391 + 7);
  const woodM = lam2({ map: rep(woodTex(), 1, 2), color: "#8a7156" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10 * s, 0.20 * s, 3.4 * s, 7), woodM);
  trunk.position.y = 1.7 * s; trunk.rotation.z = (tr() - 0.5) * 0.14; trunk.castShadow = true; g.add(trunk);
  const mats = [
    lam2({ color: "#44682e", map: rep(foliageTex("akarFoliageJ1"), 1, 1) }),
    lam2({ color: "#5c8a3e", map: rep(foliageTex("akarFoliageJ2"), 1, 1) }),
    lam2({ color: "#79a854", map: rep(foliageTex("akarFoliageJ3"), 1, 1) }),
  ];
  for (const [dx, dy, r] of [[0, 4.3, 1.9], [0.9, 3.8, 1.4], [-0.95, 3.9, 1.3]] as [number, number, number][]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 10, 8), mats[Math.floor(tr() * 3) % 3]);
    b.position.set(dx * s, dy * s, (tr() - 0.5) * 0.5 * s);
    b.scale.set(1.25, 0.78, 1.25);
    b.castShadow = true; g.add(b);
  }
  return g;
};

/** a stilt hut with a steep roof (rumah-style), drawn plain */
const makeHut = (s: number, seed: number) => {
  const g = new THREE.Group();
  const tr = rng(seed * 517 + 3);
  const woodM = lam2({ map: rep(woodTex(), 2, 1), color: "#9a7c58" });
  const wallM = lam2({ map: rep(planks(), 2, 1), color: "#c8a878" });
  for (const [px, pz] of [[-1.1, -0.8], [1.1, -0.8], [-1.1, 0.8], [1.1, 0.8]] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.11 * s, 1.2 * s, 6), woodM);
    post.position.set(px * s, 0.6 * s, pz * s); g.add(post);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.8 * s, 1.7 * s, 2.1 * s), wallM);
  body.position.y = 2.05 * s; body.castShadow = true; g.add(body);
  const roofM = lam2({ map: rep(woodTex(), 3, 1), color: "#6e4f30" });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35 * s, 1.5 * s, 4), roofM);
  roof.position.y = 3.65 * s; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.9);
  roof.castShadow = true; g.add(roof);
  const winM = new THREE.MeshBasicMaterial({ color: "#ffe9a8" });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55 * s, 0.55 * s), winM);
  win.position.set(0.5 * s, 2.1 * s, 1.06 * s); g.add(win);
  void tr;
  return g;
};

/** one grass tuft geometry (green jungle version) */
const grassTuftGeo = () => {
  const tr = rng(70707);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#2c4d1c"), tip = new THREE.Color("#9cc86a"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.32 + tr() * 0.26, w = 0.05;
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
  private strands: { mesh: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  // ---- set pieces with per-shot behaviour ----
  private river: THREE.Mesh | null = null;
  private riverMap: THREE.Texture | null = null;
  private foam: THREE.Mesh | null = null;
  private foamMap: THREE.Texture | null = null;
  private bridgeGroup = new THREE.Group();
  private bambooGroup = new THREE.Group();
  private twistGroup = new THREE.Group();
  private treeA: THREE.Group | null = null;
  private treeB: THREE.Group | null = null;
  private creepTips: THREE.Mesh[] = [];
  private yearRing: THREE.Mesh | null = null;
  private splashRings: THREE.Mesh[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1916);
    // ---- light rig ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#5a7048", 0.55);
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
    this.buildGorge(R, r);
  }

  // ---------------- the gorge, the river, the living bridge ----------------
  private buildGorge(R: THREE.Group, r: () => number) {
    // ---- the river: brown-green water racing along X ----
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(220, 15), lam2({ color: "#3d4a26", map: rep(stoneHD("akarBed", ["#5a6248", "#4c5638", "#68724e", "#424e30"]), 24, 2) }));
    bed.rotation.x = -Math.PI / 2; bed.position.set(0, -0.5, 0); R.add(bed);
    const wmap = rep(water(), 26, 2);
    this.riverMap = wmap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(220, 13.4),
      new THREE.MeshBasicMaterial({ map: wmap, color: "#8fae7c", transparent: true, opacity: 0.93, depthWrite: false }));
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0, 0); river.renderOrder = 1; R.add(river);
    this.river = river;
    const fmap = rep(foamTex(), 18, 1);
    this.foamMap = fmap;
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(220, 12.6),
      new THREE.MeshBasicMaterial({ map: fmap, transparent: true, opacity: 0.55, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.06, 0); foam.renderOrder = 2; R.add(foam);
    this.foam = foam;
    // rocks in the current + splash rings pulsing around them
    const rockM = lam2({ map: rep(stoneHD("akarRock", ["#8a8578", "#767264", "#98927f", "#6a665a"]), 1, 1), color: "#b0aa9a" });
    const rockSpots: [number, number, number][] = [
      [-14, -2.5, 1.5], [-6.5, 3.4, 1.1], [3.8, -3.8, 1.8], [9.5, 2.8, 1.2], [16, -1.5, 1.6],
      [-20, 1.8, 1.3], [22, 3.6, 1.4], [-11, 4.6, 0.8], [13, -4.8, 0.9],
    ];
    for (const [x, z, s] of rockSpots) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(x, s * 0.18, z);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.scale.y = 0.62;
      rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
      const ring = new THREE.Mesh(new THREE.RingGeometry(s * 1.05, s * 1.3, 22),
        new THREE.MeshBasicMaterial({ color: "#eef8f2", transparent: true, opacity: 0.5, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.09, z); ring.renderOrder = 3; R.add(ring);
      this.splashRings.push(ring);
    }
    // ---- banks: grassy plateaus + rocky cliff faces ----
    const grassM = lam2({ map: rep(grassHD(), 40, 14), color: "#9cc47e" });
    for (const sgn of [1, -1]) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(220, 64), grassM);
      bank.rotation.x = -Math.PI / 2; bank.rotation.z = sgn > 0 ? Math.PI : 0;
      bank.position.set(0, BANK_Y, sgn * (9.2 + 32));
      bank.receiveShadow = true; R.add(bank);
      const cliff = new THREE.Mesh(new THREE.PlaneGeometry(220, 7.4),
        lam2({ map: rep(cliffTex(), 12, 1), color: "#c9c2ae" }));
      cliff.position.set(0, BANK_Y / 2 - 0.2, sgn * 7.9);
      cliff.rotation.y = sgn > 0 ? Math.PI : 0;
      cliff.rotation.x = sgn * 0.10;
      cliff.receiveShadow = true; R.add(cliff);
      // a dirt path from each bridge end wandering off
      softPatch(R, patchTex(), "#8a6c42", sgn > 0 ? 2.5 : -2.5, BANK_Y + 0.06, sgn * 13.5, 3.4, 9, 0.5, sgn * 0.2);
      softPatch(R, patchTex(), "#6d8a4a", sgn > 0 ? -6 : 6, BANK_Y + 0.06, sgn * 20, 6, 10, 0.28, r() * 3);
    }
    // ---- THE TWO BANYANS ----
    const a = makeBanyan(1.55, 11);
    a.g.position.set(TREE_A[0], BANK_Y, TREE_A[2]);
    R.add(a.g); this.treeA = a.g;
    this.trees.push({ g: a.g, ph: 0.4, k: 0.005 });
    this.strands.push(...a.strands.map((x) => ({ mesh: x.mesh, ph: x.ph })));
    blob(R, TREE_A[0], BANK_Y + 0.05, TREE_A[2], 8.5, 8.5, 0.32);
    const b = makeBanyan(1.45, 29);
    b.g.position.set(TREE_B[0], BANK_Y, TREE_B[2]);
    b.g.rotation.y = 2.1;
    R.add(b.g); this.treeB = b.g;
    this.trees.push({ g: b.g, ph: 2.3, k: 0.005 });
    this.strands.push(...b.strands.map((x) => ({ mesh: x.mesh, ph: x.ph })));
    blob(R, TREE_B[0], BANK_Y + 0.05, TREE_B[2], 8, 8, 0.32);
    // ---- THE LIVING BRIDGE ----
    this.buildBridge(R);
    // ---- the bamboo guide (1890: the scaffold the roots followed) ----
    {
      const bg = this.bambooGroup;
      const bamM = lam2({ color: "#c9b06a", map: rep(woodTex(), 4, 1) });
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.9, BANK_Y + 0.75, -9.6),
        new THREE.Vector3(-0.5, deckYAt(-4) - 0.25, -4),
        new THREE.Vector3(-0.3, deckYAt(0) - 0.25, 0),
        new THREE.Vector3(0.1, deckYAt(4) - 0.25, 4),
        new THREE.Vector3(0.5, BANK_Y + 0.75, 9.6),
      ]);
      const arc = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.09, 6), bamM);
      bg.add(arc);
      for (let i = 0; i <= 8; i++) {
        const z = -8 + i * 2;
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 5), bamM);
        stick.rotation.z = Math.PI / 2;
        stick.position.set(-0.3, deckYAt(z) - 0.3, z);
        bg.add(stick);
      }
      bg.visible = false; R.add(bg);
    }
    // ---- the twist props (shot 7): a rusty mini iron bridge
    // and a cracked concrete slab, dumped on the far bank ----
    {
      const tg = this.twistGroup;
      const rustM = lam2({ color: "#a05a30", map: rep(rootTex(), 1, 1) });
      const truss = new THREE.Group();
      for (const sgn of [1, -1]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 4.6), rustM);
        beam.position.set(sgn * 0.55, 0.75, 0); truss.add(beam);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 4.6), rustM);
        deck.position.set(sgn * 0.55, 0.1, 0); truss.add(deck);
        for (let i = 0; i < 4; i++) {
          const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 5), rustM);
          diag.position.set(sgn * 0.55, 0.42, -1.7 + i * 1.13);
          diag.rotation.x = i % 2 ? 0.7 : -0.7; truss.add(diag);
        }
      }
      truss.position.set(6.6, BANK_Y, 13.2); truss.rotation.y = 0.5; truss.rotation.z = 0.06;
      tg.add(truss);
      const concM = lam2({ color: "#9a9a96", map: rep(stoneHD("akarConc", ["#a8a8a2", "#989892", "#b2b2aa", "#8e8e88"]), 1, 1) });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.9), concM);
      slab.position.set(9.3, BANK_Y + 0.2, 11.2); slab.rotation.set(0.1, 0.9, 0.22);
      slab.castShadow = true; tg.add(slab);
      const slab2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 1.4), concM);
      slab2.position.set(10.3, BANK_Y + 0.12, 12.6); slab2.rotation.set(-0.06, 0.4, -0.15);
      tg.add(slab2);
      tg.visible = false; R.add(tg);
    }
    // ---- the year ring (shot 6): 26 years turning over the span ----
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: "#ffcf4d", transparent: true, opacity: 0.9 }));
    ring.position.set(0, deckYAt(0) + 1.6, 0);
    ring.visible = false; R.add(ring);
    this.yearRing = ring;
    // ---- the name board at the south end ----
    {
      const board = new THREE.Group();
      const postM = lam2({ map: rep(woodTex(), 1, 2), color: "#7a5c38" });
      for (const s of [1, -1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 7), postM);
        post.position.set(s * 1.3, 1.0, 0); post.castShadow = true; board.add(post);
      }
      const face = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.9, 0.14),
        lam2({ map: boardTex("TITIAN AKA", "JEMBATAN AKAR · BAYANG"), color: "#ffffff" }));
      face.position.y = 2.3; face.castShadow = true; board.add(face);
      board.position.set(5.8, BANK_Y, -12.6);
      board.rotation.y = -0.9;
      R.add(board);
    }
    // ---- villages: stilt huts on both banks ----
    const hutSpots: [number, number, number, number][] = [
      [-10.5, -14.5, 1.1, 0.4], [8.5, -15.5, 0.95, -0.3], [-16, -12.5, 1.2, 0.9],
      [-9.5, 14, 1.05, 2.6], [-14, 16.5, 1.15, 3.4], [16.5, 12.5, 0.9, 2.2],
    ];
    for (const [x, z, s, ry] of hutSpots) {
      const hut = makeHut(s, Math.floor(Math.abs(x) * 7 + Math.abs(z)));
      hut.position.set(x, BANK_Y, z);
      hut.rotation.y = ry;
      R.add(hut);
    }
    // ---- jungle filling both banks + distant ridges ----
    const jungle: [number, number, number][] = [
      [-7.5, -13, 1.2], [9, -18, 1.0], [-13, -17, 1.35], [12, -18, 1.15], [3, -19, 1.4],
      [-5, 13.8, 1.1], [6.5, 14.5, 1.3], [-12.5, 17.5, 1.2], [13, 18.5, 1.4], [-2, 19.5, 1.05],
      [-19, -15, 1.3], [19, -14, 1.25], [-19.5, 16, 1.35], [20, 16.5, 1.2],
      [-9, -24, 1.5], [9.5, -25, 1.45], [-8, 25, 1.5], [8.5, 26, 1.4],
    ];
    jungle.forEach(([x, z, s], i) => {
      const t = makeJungleTree(s, 71 + i * 13);
      t.position.set(x, BANK_Y, z);
      t.rotation.y = r() * 3;
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.71, k: 0.012 });
    });
    const bushMats = [
      lam2({ color: "#4c7034", map: rep(foliageTex("akarFoliageBush"), 2, 1) }),
      lam2({ color: "#5f8540", map: rep(foliageTex("akarFoliageBush"), 2, 1) }),
      lam2({ color: "#3c5c2a", map: rep(foliageTex("akarFoliageBush"), 2, 1) }),
    ];
    for (let i = 0; i < 54; i++) {
      const sgn = i % 2 ? 1 : -1;
      const bx = (r() - 0.5) * 44, bz = sgn * (10.5 + r() * 15);
      if (Math.abs(bx) < 5 && Math.abs(bz) < 13.5) continue;
      if (bx > 3 && bz < -6 && bz > -16) continue; // keep the cover camera's foreground clear
      const rad = 0.45 + r() * 0.6;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 9, 7), bushMats[i % 3]);
      b.position.set(bx, BANK_Y + rad * 0.5, bz);
      b.scale.set(1 + (r() - 0.5) * 0.3, 0.66 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    }
    // distant green ridges closing the gorge ends
    const ridgeM = lam2({ color: "#5d7f56", map: rep(foliageTex("akarFoliageRidge"), 3, 1) });
    for (const [x, z, w, h] of [[-95, -30, 60, 26], [100, 25, 66, 30], [-105, 35, 55, 22], [95, -38, 58, 24]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.55, h, 5), ridgeM);
      hill.position.set(x, h / 2 - 2, z);
      hill.rotation.y = r() * 3;
      R.add(hill);
    }
    // ---- grass tufts along both banks ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 900; i++) {
      const sgn = r() < 0.5 ? 1 : -1;
      const x = (r() - 0.5) * 46, z = sgn * (9.6 + r() * 13);
      if (Math.abs(x) < 3.4 && Math.abs(z) < 12.5) continue;
      tuftPts.push({ x, z, s: 0.7 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, BANK_Y + 0.02, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.26 + (r() - 0.5) * 0.03, 0.42, 0.8 + (r() - 0.5) * 0.22);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    void r;
  }

  /** THE LIVING BRIDGE: two main root cables, a woven deck of
   *  span roots with lashings, root handrails, hanging aerial
   *  roots underneath — and three CREEP TIPS at mid-span that
   *  keep growing/weaving (frame-0 motion: it is alive). */
  private buildBridge(R: THREE.Group) {
    const bg = this.bridgeGroup;
    const rootM = lam2({ map: rep(rootTex(), 3, 1), color: "#9a7c5c" });
    const rootDark = lam2({ map: rep(rootTex(), 2, 1), color: "#7d6248" });
    const spanCurve = (x: number, lift: number) => new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 0.7, BANK_Y + 1.0, -10.6),
      new THREE.Vector3(x - 0.3, deckYAt(-5) + lift, -5),
      new THREE.Vector3(x, deckYAt(0) + lift, 0),
      new THREE.Vector3(x + 0.3, deckYAt(5) + lift, 5),
      new THREE.Vector3(x + 0.7, BANK_Y + 1.0, 10.6),
    ]);
    // main cables under the deck edges
    for (const sgn of [1, -1]) {
      const cable = new THREE.Mesh(new THREE.TubeGeometry(spanCurve(sgn * 0.78, -0.34), 36, 0.17, 7), rootDark);
      cable.castShadow = true; bg.add(cable);
    }
    // deck: nine span roots side by side, lashed together
    for (let i = 0; i < 9; i++) {
      const x = -0.8 + i * 0.2;
      const root = new THREE.Mesh(new THREE.TubeGeometry(spanCurve(x, -0.10), 36, 0.085, 6), i % 2 ? rootM : rootDark);
      root.castShadow = true; root.receiveShadow = true; bg.add(root);
    }
    // lashings: vine wraps binding the deck every ~2 units
    const lashM = lam2({ color: "#5d7a3a", map: rep(foliageTex("akarLash"), 1, 1) });
    for (let i = 0; i <= 8; i++) {
      const z = -8 + i * 2;
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.055, 6, 18), lashM);
      wrap.position.set(0, deckYAt(z) - 0.05, z);
      wrap.scale.set(1, 0.32, 1);
      bg.add(wrap);
    }
    // handrails: a root rail each side on root posts
    for (const sgn of [1, -1]) {
      const rail = new THREE.Mesh(new THREE.TubeGeometry(spanCurve(sgn * 0.92, 0.92), 36, 0.07, 6), rootM);
      bg.add(rail);
      for (let i = 0; i <= 6; i++) {
        const z = -7.5 + i * 2.5;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 5), rootDark);
        post.position.set(sgn * 0.9, deckYAt(z) + 0.42, z);
        post.rotation.z = sgn * 0.1;
        bg.add(post);
      }
    }
    // hanging aerial roots under the span, reaching for the water
    const hangM = lam2({ map: rep(rootTex(), 1, 2), color: "#8a7154" });
    for (let i = 0; i < 11; i++) {
      const z = -7.5 + i * 1.5, x = (i % 3 - 1) * 0.4;
      const len = 1.1 + ((i * 37) % 10) / 10 * 1.6;
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, len, 5), hangM);
      strand.position.set(x, deckYAt(z) - 0.2 - len / 2, z);
      bg.add(strand);
      this.strands.push({ mesh: strand, ph: i * 0.93 });
    }
    // CREEP TIPS: young roots at mid-span still weaving —
    // bright green-tipped cones that extend and curl
    const tipM = lam2({ color: "#a8c686", map: rep(rootTex(), 1, 1) });
    for (let i = 0; i < 3; i++) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.15, 6), tipM);
      const z = -1.2 + i * 1.1;
      tip.position.set(-0.95, deckYAt(z) + 0.25, z);
      tip.rotation.z = Math.PI / 2 + 0.35;
      bg.add(tip);
      this.creepTips.push(tip);
    }
    // leafy sprouts along the rails — proof of life
    const sproutM = lam2({ color: "#74a24e", map: rep(foliageTex("akarSprout"), 1, 1) });
    for (let i = 0; i < 8; i++) {
      const z = -7 + i * 2, sgn = i % 2 ? 1 : -1;
      const spr = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6), sproutM);
      spr.position.set(sgn * 0.95, deckYAt(z) + 1.05, z);
      spr.scale.set(1.2, 0.7, 1.2);
      bg.add(spr);
      this.trees.push({ g: spr as unknown as THREE.Group, ph: i * 1.13, k: 0.05 });
    }
    R.add(bg);
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
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.05 + tr2.ph) * tr2.k;
      tr2.g.rotation.x = Math.cos(tt * 0.8 + tr2.ph * 1.7) * tr2.k * 0.7;
    }
    // aerial roots swaying in the gorge breeze
    for (const st of this.strands) {
      st.mesh.rotation.z = Math.sin(tt * 1.25 + st.ph) * 0.045;
      st.mesh.rotation.x = Math.cos(tt * 0.95 + st.ph * 1.3) * 0.035;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, BANK_Y + 0.02, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---- the river: always racing; in shot 8 it RISES ----
    const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
    const flood = id === 8 ? Math.sin(Math.min(1, U * 1.15) * Math.PI) * 2.7 : 0;
    const speed = id === 8 ? 0.55 : 0.22;
    if (this.riverMap) this.riverMap.offset.set(-tt * speed, 0);
    if (this.foamMap) this.foamMap.offset.set(-tt * speed * 1.7, 0);
    if (this.river) this.river.position.y = flood;
    if (this.foam) { this.foam.position.y = 0.06 + flood; (this.foam.material as THREE.MeshBasicMaterial).opacity = id === 8 ? 0.8 : 0.55; }
    this.splashRings.forEach((ring, i) => {
      const ph = (tt * 0.7 + i * 0.37) % 1;
      ring.scale.setScalar(1 + ph * 0.5);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ph);
      ring.position.y = 0.09 + flood;
    });
    // ---- the bridge: breathing sway; storm shaking in shot 8 ----
    const swayK = id === 8 ? 0.028 : 0.006;
    this.bridgeGroup.rotation.x = Math.sin(tt * (id === 8 ? 2.6 : 1.2)) * swayK;
    this.bridgeGroup.position.y = Math.sin(tt * 1.7) * 0.03 - flood * 0.12;
    // creep tips keep weaving at mid-span (it is ALIVE)
    this.creepTips.forEach((tip, i) => {
      const grow = 0.85 + Math.sin(tt * 1.5 + i * 2.1) * 0.18;
      tip.scale.set(1, grow, 1);
      tip.rotation.y = Math.sin(tt * 0.9 + i * 1.7) * 0.3;
    });
    // ---- time travel: the banyans grow up across shots 4-5 ----
    const growScale = id === 4 ? 0.16 : id === 5 ? 0.16 + U * 0.55 : 1;
    if (this.treeA) this.treeA.scale.setScalar(growScale);
    if (this.treeB) this.treeB.scale.setScalar(growScale);
    this.bridgeGroup.visible = id !== 4;
    this.bambooGroup.visible = id === 4 || id === 5;
    this.twistGroup.visible = id === 7;
    if (this.yearRing) {
      this.yearRing.visible = id === 6;
      if (id === 6) this.yearRing.rotation.z = tt * 0.8;
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
