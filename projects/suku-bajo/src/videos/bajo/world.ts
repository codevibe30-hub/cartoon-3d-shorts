// Suku Bajo, Sulawesi as one three.js scene for the Fafnir-ID
// short: a village that lives ON the sea — stilt houses over
// turquoise water, plank walkways for streets, lepa boats with
// lateen sails for cars, a sand island with palms closing the
// horizon — and, below the same channel, a lit reef world of
// coral, seaweed and sand where the hero dives and walks the
// bottom on a single breath. VISUAL CORE: bright tropical
// daylight, saturated turquoise, warm timber — textured
// everything (anti-flat). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_BOAT, UW_FLOOR, clamp01, heroBoatAt } from "./story";

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
const skyTexDay = () => ctex("bajoSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("bajoGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("bajoBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture (island trees + palm shade) */
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
/** wrap-draw helper so canvas textures tile without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** RICH grass for the island (same anti-flat recipe as the
 *  house style: deep base, value blotches, flecks, blades) */
const grassRichTex = () => ctex("bajoGrassRich", 1024, 1024, (g, r) => {
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
});
/** tropical sand: pale grains, shell flecks, darker wet patches */
const sandTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#dec493"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "168,138,88" : "246,232,190"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 34, 6 + r() * 20, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,94,52" : "255,248,220"},${0.08 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(250,244,230,${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2.5 + r() * 3, 1.6 + r() * 2, r() * 3, 0, 7); g.fill(); }
});
/** reef sand (underwater floor): cooler, bluer, with coral grit */
const reefSandTex = () => ctex("bajoReefSand", 512, 512, (g, r) => {
  g.fillStyle = "#b7a678"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "110,96,60" : "226,214,170"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 30, 5 + r() * 18, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.45 ? "80,70,44" : "240,232,200"},${0.08 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
  const grit = ["#e86a4a", "#e8a13c", "#f2f0e6", "#c95d8f"];
  for (let i = 0; i < 130; i++) { g.fillStyle = grit[Math.floor(r() * grit.length) % grit.length]; g.globalAlpha = 0.35 + r() * 0.4; g.beginPath(); g.arc(r() * 512, r() * 512, 1.4 + r() * 2.2, 0, 7); g.fill(); }
  g.globalAlpha = 1;
});
/** coral speckle: polyp dots over a warm base, multiplied by colour */
const coralTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#cbb49a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,240,220,${0.10 + r() * 0.25})` : `rgba(70,40,30,${0.10 + r() * 0.22})`;
    g.beginPath(); g.arc(r() * 256, r() * 256, 1.2 + r() * 2.4, 0, 7); g.fill();
  }
  for (let i = 0; i < 240; i++) { g.fillStyle = `rgba(255,255,255,${0.16 + r() * 0.2})`; g.beginPath(); g.arc(r() * 256, r() * 256, 2.6 + r() * 2, 0, 7); g.fill(); }
});
/** the underwater backdrop: a vertical blue gradient with
 *  painted god-ray streaks and particulate speckle — the water
 *  volume itself, never a flat fill */
const uwBackdropTex = () => ctex("bajoUwBackdrop", 1024, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#3d8bc4"); grad.addColorStop(0.4, "#1d639c"); grad.addColorStop(0.75, "#114a7d"); grad.addColorStop(1, "#0a3357");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 9; i++) {
    const x = 60 + r() * 900, w = 26 + r() * 60;
    const rg = g.createLinearGradient(x, 0, x + 130, 512);
    rg.addColorStop(0, `rgba(190,230,255,${0.10 + r() * 0.10})`); rg.addColorStop(1, "rgba(190,230,255,0)");
    g.fillStyle = rg;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 130, 512); g.lineTo(x + 130, 512); g.closePath(); g.fill();
  }
  for (let i = 0; i < 3800; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 512, 1.8, 1.8); }
});
/** soft warm light pool (sun patches, shallows, caustics) */
const patchTex = () => ctex("bajoPatch", 256, 256, (g) => {
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
/** bark: vertical fissured streaks for trunks + stilt poles */
const barkTex = () => ctex("bajoBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** woven thatch for the stilt-house roofs */
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
/** painted plank wall: vertical boards in a warm tint with
 *  grain streaks and nail dots — multiplied by the wall colour */
const plankWallTex = (key: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#c8b294"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,240,214" : "96,70,40"},${0.05 + r() * 0.07})`;
    g.fillRect(x, 0, 64, 512);
    g.fillStyle = "rgba(40,26,12,0.55)"; g.fillRect(x, 0, 3, 512);
    for (let i = 0; i < 26; i++) {
      const gx = x + 6 + r() * 52, gy = r() * 512, l = 20 + r() * 60;
      g.strokeStyle = `rgba(90,62,32,${0.10 + r() * 0.14})`; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (r() - 0.5) * 3, gy + l); g.stroke();
    }
    g.fillStyle = "rgba(30,20,10,0.8)";
    g.beginPath(); g.arc(x + 32, 26, 3, 0, 7); g.arc(x + 32, 486, 3, 0, 7); g.fill();
  }
});
const blobTex = () => ctex("bajoBlob", 256, 256, (g) => {
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

/** A Bajo stilt house: nibung-palm poles rising out of the sea,
 *  a plank floor at y = 1.0, woven-plank walls, a steep thatch
 *  roof, shuttered windows, a porch with a ladder down to the
 *  water and a clothes line — the village's whole architecture.
 *  Front faces +Z; yaw it toward the channel when placing. */
const makeStiltHouse = (wallMat: THREE.MeshLambertMaterial, roofMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, roofH: number, seed: number) => {
  const g = new THREE.Group();
  const r = rng(seed * 977 + 31);
  const poleM = lam2({ map: rep(barkTex(), 1, 2), color: "#8a6844" });
  // poles: front + back rows, sunk into the sea, barnacle band at the waterline
  for (const px of [-w / 2 + 0.4, 0, w / 2 - 0.4]) for (const pz of [-d / 2 + 0.4, d / 2 - 0.4]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.4, 7), poleM);
    pole.position.set(px, -0.55, pz); pole.castShadow = true; g.add(pole);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.3, 7), lam2({ color: "#cfd4c8" }));
    band.position.set(px, 0.02, pz); g.add(band);
  }
  // floor platform + edge beams
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.14, d + 0.7), lam2({ map: rep(planks(), 2, 2), color: "#b0824f" }));
  floor.position.y = 1.0; floor.castShadow = true; floor.receiveShadow = true; g.add(floor);
  // walls + gable roof (prism, thatch), same construction as the house style
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = 1.07 + wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.45, 0); shape.lineTo(w / 2 + 0.45, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.7) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 1.07 + wallH - 0.05; roof.castShadow = true; g.add(roof);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallMat);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, 1.07 + wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    g.add(tri);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, d + 0.75, 8), lam2({ color: "#5d4028" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 1.07 + wallH + roofH - 0.02, 0); g.add(ridge);
  // windows: dark glass, pale frames, louvred shutters, sky glint
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#2c4a63" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.55 });
  const shutterM = lam2({ color: "#276a72" });
  const winXs = w > 6 ? [-w / 4, w / 4] : [0];
  for (const wx of winXs) {
    const wy = 1.07 + wallH * 0.58;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.1), frameM);
    fr.position.set(wx, wy, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.12), glassM);
    gl.position.set(wx, wy, d / 2 + 0.04); g.add(gl);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.8), glintM);
    glint.position.set(wx - 0.17, wy + 0.05, d / 2 + 0.105); glint.rotation.z = 0.5; g.add(glint);
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.34, 0.06), shutterM);
      sh.position.set(wx + s * 0.79, wy, d / 2 + 0.05); sh.rotation.y = s * 0.16; g.add(sh);
    }
  }
  // door + porch + ladder down to the water
  const doorX = w > 6 ? 0 : w / 3.2;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.1), lam2({ color: "#7a4a2c" }));
  door.position.set(doorX, 1.07 + 0.95, d / 2 + 0.05); g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
  knob.position.set(doorX + 0.36, 1.07 + 0.95, d / 2 + 0.12); g.add(knob);
  for (let i = 0; i < 4; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), poleM);
    rung.position.set(doorX + 1.15, 0.75 - i * 0.42, d / 2 + 0.62); g.add(rung);
  }
  for (const s of [1, -1]) {
    const railP = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 6), poleM);
    railP.position.set(doorX + 1.15 + s * 0.38, 0.0, d / 2 + 0.62); g.add(railP);
  }
  // drying fish rack on the porch: a pole with hanging silver fish
  const rack = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), poleM);
  rack.rotation.z = Math.PI / 2; rack.position.set(-w / 4, 2.6, d / 2 + 0.55); g.add(rack);
  const fishM = lam2({ color: "#c8d2d8" });
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), fishM);
    f.scale.set(0.35, 1.15, 0.7); f.position.set(-w / 4 - 0.85 + i * 0.42, 2.32, d / 2 + 0.55); g.add(f);
  }
  // laundry line off the side: two bright cloth rectangles
  const clothCols = ["#e8542e", "#e8c832", "#f2f0e6"];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), lam2({ color: clothCols[i % 3], side: THREE.DoubleSide }));
    c.position.set(w / 2 + 0.75, 2.35 - 0.35, -d / 4 + i * 0.62); c.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.3; g.add(c);
  }
  return g;
};

/** A wooden sea boat (lepa-style): flat bottom, flared plank
 *  sides, bench seats, a prow post. Bow toward +Z. The HERO
 *  boat adds a mast, a lateen sail, a little roofed cabin and
 *  outrigger floats — and uses plain Lambert materials so its
 *  warm timber stays bright in the cover frame. */
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
  // high prow post, curving up at the bow — the lepa silhouette
  const prow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 1.15, 7), innerM);
  prow.position.set(0, 1.15, len / 2 - 0.05); prow.rotation.x = 0.28; prow.castShadow = true; g.add(prow);
  for (const bz of [-len / 4, len / 4]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.24, 0.07, 0.42), innerM);
    bench.position.set(0, 0.62, bz); g.add(bench);
  }
  if (hero) {
    // outrigger floats on bamboo arms
    const bamM = new THREE.MeshLambertMaterial({ color: "#a8895a", map: rep(barkTex(), 1, 2) });
    for (const s of [1, -1]) {
      const armF = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.9, 6), bamM);
      armF.rotation.z = Math.PI / 2; armF.position.set(0, 0.72, 0.9); g.add(armF);
      const armB = armF.clone(); armB.position.z = -1.1; g.add(armB);
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 7), innerM);
      fl.rotation.x = Math.PI / 2; fl.position.set(s * 1.5, 0.22, -0.1); g.add(fl);
    }
    // little roofed cabin aft: four posts + a thatch cap
    const cabM = new THREE.MeshLambertMaterial({ map: rep(planks(), 1, 1), color: "#caa06a" });
    for (const px of [0.5, -0.5]) for (const pz of [-2.35, -1.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6), bamM);
      post.position.set(px, 1.1, pz); g.add(post);
    }
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 1.5),
      new THREE.MeshLambertMaterial({ map: rep(thatchTex("bajoThatchBoat", "#96753c"), 1, 1), color: "#c8a86a" }));
    cabRoof.position.set(0, 1.58, -1.98); cabRoof.rotation.z = 0.05; cabRoof.castShadow = true; g.add(cabRoof);
    const cabWall = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.06), cabM);
    cabWall.position.set(0, 1.0, -2.38); g.add(cabWall);
    // a basket of fish + a coiled rope + the paddle shipped aboard
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.3, 9), bamM);
    basket.position.set(0.38, 0.8, 1.5); g.add(basket);
    const fishM = new THREE.MeshLambertMaterial({ color: "#c8d2d8" });
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), fishM);
      f.scale.set(0.35, 0.5, 1.1); f.position.set(0.38 + (i - 1) * 0.13, 0.98, 1.5 + (i % 2) * 0.08); f.rotation.y = i * 0.7; g.add(f);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 8, 20), new THREE.MeshLambertMaterial({ color: "#c9b18a" }));
    rope.rotation.x = Math.PI / 2; rope.position.set(-0.42, 0.68, 1.55); g.add(rope);
    const paddle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 3.4, 6), bamM);
    paddle.rotation.x = Math.PI / 2 - 0.05; paddle.position.set(-0.55, 0.8, -0.2); g.add(paddle);
  }
  return g;
};

/** The hero's lateen sail: a cream triangle of woven cloth on a
 *  bamboo yard, hung from the mast. Built as its own group so
 *  update() can flutter it in the breeze. */
const makeSail = () => {
  const g = new THREE.Group();
  const clothTex = () => ctex("bajoSailCloth", 256, 256, (g2, r) => {
    g2.fillStyle = "#f2e7cd"; g2.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 36) { g2.fillStyle = "rgba(150,120,80,0.35)"; g2.fillRect(0, y, 256, 2.5); }
    for (let i = 0; i < 2200; i++) { g2.fillStyle = `rgba(${r() > 0.5 ? "255,252,240" : "140,110,70"},${0.04 + r() * 0.06})`; g2.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
    for (let i = 0; i < 7; i++) { // patched repairs, darker squares
      g2.fillStyle = `rgba(196,164,110,${0.25 + r() * 0.2})`;
      g2.fillRect(r() * 200, r() * 200, 22 + r() * 20, 18 + r() * 16);
    }
  });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0, 3.1); shape.lineTo(2.35, 0.25); shape.closePath();
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4),
    new THREE.MeshLambertMaterial({ map: clothTex(), side: THREE.DoubleSide, color: "#f7efdb", emissive: "#8a7a58", emissiveIntensity: 0.38 }));
  cloth.castShadow = true; g.add(cloth);
  const yardM = lam2({ color: "#8a6844", map: rep(barkTex(), 1, 2) });
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.9, 6), yardM);
  yard.position.set(1.05, 1.62, 0); yard.rotation.z = 1.02; g.add(yard);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), yardM);
  boom.position.set(1.12, 0.14, 0); boom.rotation.z = Math.PI / 2 - 0.06; g.add(boom);
  return g;
};

/** A coconut palm: a ringed trunk leaning over the water, a
 *  crown of drooping fronds (leaf-fleck texture on bent cones),
 *  and a cluster of coconuts. Sways as one group in update(). */
const makePalm = (h: number, lean: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 613 + 7);
  const trunkM = lam2({ map: rep(barkTex(), 1, 3), color: "#9a7a56" });
  const segs = 5;
  let x = 0, y = 0;
  for (let i = 0; i < segs; i++) {
    const segH = h / segs;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.012, 0.16 - i * 0.012, segH + 0.06, 8), trunkM);
    const nx = x + lean * (i + 0.5) * 0.32, ny = y + segH / 2;
    seg.position.set(nx, ny, 0); seg.rotation.z = -Math.atan(lean * 0.32 / segH) * 0.9;
    seg.castShadow = true; g.add(seg);
    x += lean * 0.32; y += segH;
  }
  const topX = x + lean * 0.1, topY = y;
  const frondM = lam2({ color: "#4d9440", map: rep(foliageTex("bajoPalmFrond"), 1, 1), side: THREE.DoubleSide });
  const frondM2 = lam2({ color: "#3d7d33", map: rep(foliageTex("bajoPalmFrond"), 1, 1), side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + tr() * 0.5;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.30, 2.6 + tr() * 0.9, 5), i % 2 ? frondM : frondM2);
    frond.scale.set(1, 1, 0.16);
    frond.position.set(topX + Math.cos(a) * 1.05, topY + 0.28 - (i % 3) * 0.1, Math.sin(a) * 1.05);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15 + Math.PI);
    frond.castShadow = true; g.add(frond);
  }
  const nutM = lam2({ color: "#6a8a3a" });
  for (let i = 0; i < 4; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), nutM);
    nut.position.set(topX + (tr() - 0.5) * 0.5, topY - 0.22, (tr() - 0.5) * 0.5); g.add(nut);
  }
  return g;
};

/** A leafy island tree (the house canopy recipe): bark
 *  trunk, branches, 9-13 foliage blobs in three depth layers. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "bajoFoliageDeep"),
    folM(greens[0], "bajoFoliageMid"),
    folM(greens[1] ?? greens[0], "bajoFoliageLite"),
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

/** One coral cluster: a rock core, brain-coral domes with polyp
 *  speckle, staghorn cones branching up, a soft fan — the reef's
 *  furniture, in the saturated reef palette. */
const makeCoral = (seed: number, scale = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 449 + 13);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), lam2({ color: "#8a7a66", map: rep(coralTex("bajoRock"), 1, 1) }));
  rock.scale.set(1.25, 0.62, 1.1); rock.position.y = 0.2; rock.rotation.y = r() * 3; rock.castShadow = true; g.add(rock);
  const cols = ["#e86a4a", "#e8a13c", "#c95d8f", "#8a6ae0", "#3fae8a", "#e8542e"];
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const col = cols[Math.floor(r() * cols.length) % cols.length];
    const a = r() * Math.PI * 2, d = 0.35 + r() * 0.65;
    const px = Math.cos(a) * d, pz = Math.sin(a) * d;
    if (r() < 0.55) { // brain dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3 + r() * 0.26, 10, 8), lam2({ color: col, map: rep(coralTex("bajoCoralA"), 1, 1) }));
      dome.scale.y = 0.62; dome.position.set(px, 0.42 + r() * 0.2, pz); dome.castShadow = true; g.add(dome);
    } else { // staghorn thicket
      for (let j = 0; j < 4; j++) {
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.07 + r() * 0.05, 0.7 + r() * 0.7, 6), lam2({ color: col, map: rep(coralTex("bajoCoralB"), 1, 1) }));
        branch.position.set(px + (r() - 0.5) * 0.4, 0.6 + r() * 0.3, pz + (r() - 0.5) * 0.4);
        branch.rotation.set((r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7);
        g.add(branch);
      }
    }
  }
  // an anemone puff: a squashed sphere with a lighter polyp top
  const an = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 7), lam2({ color: "#c95d8f", map: rep(coralTex("bajoCoralA"), 1, 1) }));
  an.scale.y = 0.5; an.position.set((r() - 0.5) * 0.9, 0.5, (r() - 0.5) * 0.9); g.add(an);
  g.scale.setScalar(scale);
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
  private sunSprites: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private heroBoat: THREE.Group;
  private heroBlob: THREE.Mesh | null = null;
  private sail: THREE.Group | null = null;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private seaMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private weeds: { m: THREE.Mesh; ph: number }[] = [];
  private mooredBoats: { g: THREE.Group; ph: number; y0: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2024);
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
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    this.sunSprites.push(glow, core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildVillage(R, r);
    this.buildReef(R, r);
    // ---- the hero's lepa in the near foreground ----
    this.heroBoat = makeBoat("#c47a3d", 5.4, 1.6, true);
    this.heroBoat.position.set(HERO_BOAT[0], 0.02, HERO_BOAT[2]);
    this.heroBoat.rotation.y = -0.28;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.9, 7),
      new THREE.MeshLambertMaterial({ color: "#8a6844", map: rep(barkTex(), 1, 3) }));
    mast.position.set(-0.25, 2.5, -1.15); mast.castShadow = true; this.heroBoat.add(mast);
    this.sail = makeSail();
    this.sail.position.set(-0.13, 0.95, -1.2);
    this.sail.rotation.y = -0.5;
    this.heroBoat.add(this.sail);
    R.add(this.heroBoat);
    this.heroBlob = blob(R, HERO_BOAT[0], 0.06, HERO_BOAT[2], 3.6, 6.2, 0.35);
  }

  // ---------------- the village: sea, stilt houses, walkways, island ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    // the sea itself: turquoise, textured, flowing (map kept so
    // update() can scroll it — the water MOVES, it is not a poster)
    const seaMap = rep(water(), 42, 30);
    this.seaMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(460, 320), lam2({ map: seaMap, color: "#5db5a9" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -70); sea.receiveShadow = true; R.add(sea);
    // shallows + deep patches painted ON the water: pale sand
    // banks under the village, a darker channel down the middle
    for (let i = 0; i < 10; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8dcb0", s * (7 + r() * 9), 0.02, 6 - r() * 100, 7 + r() * 8, 9 + r() * 10, 0.13 + r() * 0.08, r() * 3);
    }
    for (let i = 0; i < 6; i++) {
      softPatch(R, patchTex(), "#1d6a86", (r() - 0.5) * 6, 0.021, -6 - r() * 90, 5 + r() * 5, 10 + r() * 12, 0.13 + r() * 0.07, r() * 3);
    }
    // sparkle flecks riding the surface near the village
    const sparkM = new THREE.MeshBasicMaterial({ color: "#eafffb", transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 130; i++) {
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.3 + r() * 0.5, 0.07), sparkM);
      sp.rotation.x = -Math.PI / 2; sp.rotation.z = r() * 3;
      sp.position.set((r() - 0.5) * 60, 0.025, 16 - r() * 115);
      sp.renderOrder = 1; R.add(sp);
    }
    // ---- stilt houses lining both sides of the channel ----
    const wallMats = [
      lam2({ map: rep(plankWallTex("bajoWallA"), 2, 1), color: "#d8b98a" }),
      lam2({ map: rep(plankWallTex("bajoWallB"), 2, 1), color: "#a8c8c0" }),
      lam2({ map: rep(plankWallTex("bajoWallC"), 2, 1), color: "#e0cfa8" }),
      lam2({ map: rep(plankWallTex("bajoWallD"), 2, 1), color: "#c8a888" }),
      lam2({ map: rep(plankWallTex("bajoWallE"), 2, 1), color: "#b8d0da" }),
    ];
    const roofMats = [
      lam2({ map: rep(thatchTex("bajoThatchA", "#8a6a34"), 2, 1) }),
      lam2({ map: rep(thatchTex("bajoThatchB", "#77572c"), 2, 1) }),
      lam2({ map: rep(thatchTex("bajoThatchC", "#96753c"), 2, 1) }),
    ];
    const houseAt = (side: number, z: number, i: number) => {
      const w = 6.4 + (i % 3) * 0.9, d = 5.2 + (i % 2) * 0.8, wallH = 2.7 + (i % 3) * 0.25, roofH = 2.4 + (i % 2) * 0.5;
      const h = makeStiltHouse(wallMats[i % wallMats.length], roofMats[i % roofMats.length], w, d, wallH, roofH, i * 3 + (side > 0 ? 1 : 2));
      h.position.set(side * 10.6, 0, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      blob(R, side * 10.6, 0.04, z, w + 3.5, d + 3.5, 0.30);
    };
    [-4, -19, -49, -64, -82].forEach((z, i) => houseAt(1, z, i));
    [-11, -26, -56, -73, -90].forEach((z, i) => houseAt(-1, z, i + 2));
    // ---- plank walkways: the village's streets, at floor level ----
    const walkM = lam2({ map: rep(planks(), 1, 24), color: "#bb905c" });
    const poleM = lam2({ map: rep(barkTex(), 1, 2), color: "#8a6844" });
    for (const s of [1, -1]) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 104), walkM);
      walk.position.set(s * 6.9, 1.0, -44); walk.castShadow = true; walk.receiveShadow = true; R.add(walk);
      for (let z = 6; z > -94; z -= 6.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 6), poleM);
        post.position.set(s * 6.9 + (r() - 0.5) * 0.2, -0.2, z); R.add(post);
      }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 104, 6), poleM);
      rail.rotation.x = Math.PI / 2; rail.position.set(s * 6.15, 1.85, -44); R.add(rail);
      for (let z = 4; z > -92; z -= 8) {
        const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), poleM);
        rp.position.set(s * 6.15, 1.45, z); R.add(rp);
      }
    }
    // the cross-walkway at z = -34 (villagers cross between sides)
    const cross = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.12, 1.7), walkM);
    cross.position.set(0, 1.0, -34); cross.castShadow = true; cross.receiveShadow = true; R.add(cross);
    for (let x = -6; x <= 6; x += 3) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 6), poleM);
      post.position.set(x, -0.2, -34); R.add(post);
    }
    // ---- moored boats: the village's parked "cars" ----
    const moored: [string, number, number, number][] = [
      ["#3d6a8a", -4.6, -14, 0.10], ["#a03a30", 4.7, -24.5, -0.08], ["#3a7a4a", -4.6, -45, 0.06],
      ["#7a4a2e", 4.7, -58, -0.05], ["#4a5a8a", -4.6, -70, 0.08], ["#8a2f35", 4.7, -38, 0.03],
    ];
    for (const [col, x, z, yaw] of moored) {
      const b = makeBoat(col, 4.2, 1.4);
      b.position.set(x, 0.02, z); b.rotation.y = yaw;
      R.add(b);
      this.mooredBoats.push({ g: b, ph: x * 1.7 - z * 0.6, y0: 0.02 });
      blob(R, x, 0.05, z, 3.0, 5.0, 0.32);
    }
    // one boat mid-channel in the distance, poled along — traffic!
    const traffic = makeBoat("#2e6a72", 4.4, 1.45);
    traffic.position.set(-1.4, 0.02, -52); traffic.rotation.y = 0.05;
    R.add(traffic);
    this.mooredBoats.push({ g: traffic, ph: 2.9, y0: 0.02 });
    blob(R, -1.4, 0.05, -52, 3.2, 5.4, 0.32);
    // floating fish-trap baskets + buoys bobbing near the houses
    const trapM = lam2({ color: "#a8895a", map: rep(barkTex(), 1, 1) });
    for (let i = 0; i < 8; i++) {
      const s = i % 2 ? 1 : -1;
      const trap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.55, 8, 1, true), trapM);
      trap.position.set(s * (5.6 + r() * 1.2), 0.12, -8 - i * 10 - r() * 4);
      R.add(trap);
      this.mooredBoats.push({ g: trap as unknown as THREE.Group, ph: i * 2.3, y0: 0.12 });
      const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lam2({ color: i % 2 ? "#e8542e" : "#e8c832" }));
      buoy.position.set(s * 5.2, 0.14, -10 - i * 10 - r() * 4);
      R.add(buoy);
      this.mooredBoats.push({ g: buoy as unknown as THREE.Group, ph: i * 3.1 + 1, y0: 0.14 });
    }
    // ---- the island backdrop: sand, grass, palms, two huts ----
    const island = new THREE.Mesh(new THREE.CircleGeometry(58, 30), lam2({ map: rep(sandTex("bajoSand"), 10, 10) }));
    island.rotation.x = -Math.PI / 2; island.scale.set(1, 0.42, 1); island.position.set(0, 0.18, -128);
    island.receiveShadow = true; R.add(island);
    const grassTop = new THREE.Mesh(new THREE.CircleGeometry(40, 26), lam2({ map: rep(grassRichTex(), 22, 22) }));
    grassTop.rotation.x = -Math.PI / 2; grassTop.scale.set(1, 0.36, 1); grassTop.position.set(-4, 0.3, -130);
    grassTop.receiveShadow = true; R.add(grassTop);
    const palmSpots: [number, number, number, number][] = [
      [-26, -122, 6.5, 0.8], [-12, -127, 7.5, -0.6], [4, -124, 6.0, 0.5], [18, -128, 7.2, -0.9],
      [30, -123, 5.8, 0.7], [-38, -126, 6.8, -0.4], [42, -127, 6.4, 0.3],
    ];
    palmSpots.forEach(([x, z, h, lean], i) => {
      const p = makePalm(h, lean, 20 + i * 7);
      p.position.set(x, 0.25, z);
      p.rotation.y = r() * 3;
      R.add(p);
      this.trees.push({ g: p, ph: i * 1.71 });
    });
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    [[-20, -133, 5.4], [12, -134, 6.2], [34, -132, 5.0]].forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 60 + i * 11);
      t.position.set(x, 0.25, z);
      R.add(t);
      this.trees.push({ g: t, ph: 4.2 + i * 1.93 });
    });
    const hut1 = makeStiltHouse(wallMats[1], roofMats[0], 6.2, 5.0, 2.6, 2.3, 91);
    hut1.position.set(-30, 0.1, -131); hut1.rotation.y = 0.4; R.add(hut1);
    const hut2 = makeStiltHouse(wallMats[3], roofMats[2], 5.6, 4.8, 2.6, 2.2, 97);
    hut2.position.set(24, 0.1, -133); hut2.rotation.y = -0.3; R.add(hut2);
    void r;
  }

  // ---------------- the reef: the underwater world below the channel ----------------
  private buildReef(R: THREE.Group, r: () => number) {
    // backdrop: the blue volume itself, god rays painted in
    const back = new THREE.Mesh(new THREE.PlaneGeometry(320, 46),
      new THREE.MeshBasicMaterial({ map: uwBackdropTex(), fog: false }));
    back.position.set(0, -26.5, -82); R.add(back);
    // the surface seen from below: a bright rippling ceiling
    const ceilTex = ctex("bajoCeil", 512, 512, (g, rr) => {
      g.fillStyle = "#7fc6de"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        g.strokeStyle = `rgba(255,255,255,${0.10 + rr() * 0.22})`; g.lineWidth = 2 + rr() * 3;
        const x = rr() * 512, y = rr() * 512, l = 14 + rr() * 40;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y + (rr() - 0.5) * 8, x + l, y); g.stroke();
      }
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rr() > 0.5 ? "255,255,255" : "30,90,130"},${0.04 + rr() * 0.07})`; g.fillRect(rr() * 512, rr() * 512, 2, 2); }
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(170, 130),
      new THREE.MeshBasicMaterial({ map: rep(ceilTex, 6, 5), transparent: true, opacity: 0.94, side: THREE.DoubleSide, fog: false }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, -5.2, -28); R.add(ceil);
    // sand floor with coral grit + caustic light pools
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 140), lam2({ map: rep(reefSandTex(), 14, 11) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, UW_FLOOR, -30); floor.receiveShadow = false; R.add(floor);
    for (let i = 0; i < 12; i++) {
      softPatch(R, patchTex(), "#cfeeff", (r() - 0.5) * 44, UW_FLOOR + 0.03, -8 - r() * 44, 4 + r() * 6, 5 + r() * 7, 0.08 + r() * 0.05, r() * 3);
    }
    // coral clusters scattered over the reef flat
    const coralSpots: [number, number, number][] = [
      [-7.5, -30, 1.5], [6.8, -33, 1.7], [-11, -20, 1.2], [11.5, -22, 1.3], [-4.2, -38, 1.4],
      [3.8, -42, 1.6], [-13.5, -36, 1.8], [14.5, -40, 1.5], [0.5, -30, 0.9], [-8.8, -45, 1.6],
      [9.2, -48, 1.8], [-2.5, -18, 0.8], [5.5, -16.5, 0.85], [-15, -26, 1.4], [16, -30, 1.35],
      [1.8, -52, 1.9], [-6.5, -55, 1.7],
    ];
    coralSpots.forEach(([x, z, s], i) => {
      const c = makeCoral(i * 3 + 1, s);
      c.position.set(x, UW_FLOOR, z);
      c.rotation.y = r() * 3;
      R.add(c);
    });
    // rocks between the corals
    for (let i = 0; i < 10; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + r() * 0.7, 0), lam2({ color: "#8a7a66", map: rep(coralTex("bajoRock"), 1, 1) }));
      rock.scale.y = 0.6; rock.position.set((r() - 0.5) * 34, UW_FLOOR + 0.2, -12 - r() * 42);
      rock.rotation.set(r() * 3, r() * 3, 0); rock.castShadow = true; R.add(rock);
    }
    // seaweed meadow: tall blades swaying in the current
    const weedM = lam2({ color: "#2e7d46", side: THREE.DoubleSide });
    const weedM2 = lam2({ color: "#3f9e57", side: THREE.DoubleSide });
    for (let i = 0; i < 30; i++) {
      const h = 1.7 + r() * 1.6;
      const weed = new THREE.Mesh(new THREE.ConeGeometry(0.14 + r() * 0.08, h, 5), i % 2 ? weedM : weedM2);
      weed.position.set((r() - 0.5) * 36, UW_FLOOR + h / 2, -10 - r() * 46);
      R.add(weed);
      this.weeds.push({ m: weed, ph: i * 0.91 });
    }
    // god-ray shafts slanting down from the surface
    const rayTex = ctex("bajoRay", 128, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 128, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
      const gv = g.createLinearGradient(0, 0, 0, 256);
      gv.addColorStop(0, "rgba(0,0,0,0)"); gv.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = gv; g.fillRect(0, 0, 128, 256);
    });
    for (const [x, z, w, op] of [[-6, -26, 5, 0.15], [3, -34, 7, 0.12], [10, -20, 4, 0.10], [-13, -40, 6, 0.11]] as [number, number, number, number][]) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(w, 19),
        new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      ray.position.set(x, -14.5, z); ray.rotation.z = 0.32; ray.rotation.y = 0.4;
      ray.renderOrder = 3; R.add(ray);
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
    const uw = id === 4 || id === 6; // underwater shots: the reef world takes over
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
    if (uw) {
      // the water volume: dense blue fog, dimmed blue light,
      // the sky world switched off entirely
      this.fog.color.set("#0d4a73"); this.fog.near = 5; this.fog.far = 82;
      this.sun.intensity = Lp.sunI * 0.5;
      this.hemi.intensity = 0.8; this.hemi.color.set("#9fd0e8"); this.hemi.groundColor.set("#1d4a66");
      this.skyDay.visible = false;
      for (const c2 of this.clouds) c2.visible = false;
      for (const b2 of this.birds) b2.visible = false;
      for (const sp of this.sunSprites) sp.visible = false;
    } else {
      untone(Lp.fog, this.fog.color);
      this.fog.near = Lp.fogNear * 1.6; this.fog.far = Lp.fogFar * 1.6;
      this.skyDay.visible = true;
      for (const c2 of this.clouds) c2.visible = true;
      for (const b2 of this.birds) b2.visible = true;
      for (const sp of this.sunSprites) sp.visible = true;
    }
    scene.fog = this.fog; scene.background = null;
    // the hero's boat rides the water: a barely-there bob (zero at
    // frame 0) — and on shot 3 it actually SAILS down-channel
    const hb = heroBoatAt(id, tt);
    this.heroBoat.position.set(hb.x, 0.02 + Math.sin(tt * 1.3) * 0.03, hb.z);
    this.heroBoat.rotation.y = hb.yaw;
    this.heroBoat.rotation.z = Math.sin(tt * 0.9) * 0.012;
    if (this.heroBlob) this.heroBlob.position.set(hb.x, 0.06, hb.z);
    if (this.sail) {
      this.sail.rotation.y = -0.5 + Math.sin(tt * 1.4) * 0.055;
      this.sail.rotation.z = Math.sin(tt * 1.1 + 0.6) * 0.02;
    }
    // ---- STANDAR GERAK: everything that should move, moves ----
    // the sea flows under the village (texture scroll, not a poster)
    if (this.seaMap) this.seaMap.offset.set(tt * 0.006, tt * 0.016);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // palms + island trees sway in the sea breeze
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.014;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.010;
    }
    // seaweed sways in the current
    for (const wd of this.weeds) {
      wd.m.rotation.z = Math.sin(tt * 1.3 + wd.ph) * 0.10;
      wd.m.rotation.x = Math.cos(tt * 1.05 + wd.ph) * 0.06;
    }
    // moored boats, traps and buoys bob at their ropes
    for (const mb of this.mooredBoats) {
      mb.g.position.y = mb.y0 + Math.sin(tt * 1.25 + mb.ph) * 0.025;
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
