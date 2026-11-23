// Derinkuyu, Kapadokya, Turki as one three.js scene for the
// Fafnir-ID short: a sunlit Anatolian plateau town — fairy
// chimneys, stone cave houses, dry olive trees — sitting on top
// of a dollhouse CUTAWAY of the underground city: six glowing
// gallery bands (for the 18 levels) carved into the rock face,
// a 55 m ventilation shaft, stables, a winery, a chapel. Three
// interior sets stand far east: the 1963 basement whose wall
// comes down (x=220), the barrel-vaulted school + church hall
// (x=320), and the rolling-stone-door tunnel (x=420).
// VISUAL CORE: bright warm morning above, torch-amber below;
// textured everything (anti-banding: speckled sky, strata rock,
// woven plaster). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style. STANDAR GERAK:
// clouds drift, trees sway, torches flicker, shaft dust falls,
// the great door ROLLS.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, clamp01, smooth,
  BAND_Y, FACE_Z, SHAFT_X, SHAFT_Z, BASE_X, SCHOOL_X, DOOR_X,
  wallBreakAt, doorRollAt,
} from "./story";

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
const skyTexDay = () => ctex("derinkuyuSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#cfe0f2"); grad.addColorStop(1, "#f6ead2");
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
/** soft radial glow sprite (sun halo, torch glow, dust) */
const glowTex = () => ctex("derinkuyuGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("derinkuyuBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture for the dry Anatolian trees */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#a8a06a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(70,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(244,240,200,${0.12 + r() * 0.22})` : `rgba(52,54,22,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** Cappadocian TUFF: warm beige volcanic rock with horizontal
 *  strata bands, pitted speckle and soft erosion streaks — the
 *  one texture the whole underground city is carved from. */
const rockTex = (key: string, base = "#b99a6e", dark = false) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // strata: soft horizontal bands of lighter/darker tuff
  for (let y = 0; y < 512; y += 30 + Math.floor(r() * 26)) {
    const h = 12 + r() * 22, lite = r() > 0.5;
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, lite ? "rgba(255,238,200,0.20)" : "rgba(70,48,24,0.20)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, y, 512, h);
    g.fillStyle = "rgba(80,56,28,0.35)"; g.fillRect(0, y + h, 512, 2);
  }
  // pitted speckle: thousands of tiny holes + pale grit
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = r() > 0.46 ? `rgba(60,40,18,${0.08 + r() * 0.20})` : `rgba(255,240,205,${0.07 + r() * 0.16})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 0.8 + r() * 2.1, 0, 7); g.fill();
  }
  // erosion streaks running down
  for (let i = 0; i < 130; i++) {
    const x = r() * 512, y = r() * 380, l = 30 + r() * 110;
    g.strokeStyle = `rgba(88,62,30,${0.05 + r() * 0.10})`; g.lineWidth = 2 + r() * 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 7, y + l); g.stroke();
  }
  if (dark) { g.fillStyle = "rgba(24,14,6,0.34)"; g.fillRect(0, 0, 512, 512); }
});
/** dry plateau earth: pale dust, stones, cracked patches */
const soilTex = () => ctex("derinkuyuSoil", 512, 512, (g, r) => {
  g.fillStyle = "#b59a6c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "122,94,54" : "216,192,140"},${0.10 + r() * 0.16})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 30, 7 + r() * 18, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "70,52,26" : "240,222,175"},${0.10 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // cracked-earth polygons
  g.strokeStyle = "rgba(90,66,34,0.35)"; g.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    let x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
});
/** soft warm light pool texture */
const patchTex = () => ctex("derinkuyuPatch", 256, 256, (g) => {
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
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("derinkuyuBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for stone houses */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const brickTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(240,235,225,0.35)"; g.lineWidth = 3;
  for (let y = 0; y <= 512; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let row = 0; row < 13; row++) for (let x = (row % 2) * 42; x <= 512; x += 84) {
    g.beginPath(); g.moveTo(x, row * 42); g.lineTo(x, row * 42 + 42); g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,220" : "30,16,10"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});
const blobTex = () => ctex("derinkuyuBlob", 256, 256, (g) => {
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

/** A stone house (the series house builder): plaster or brick
 *  walls, steep gable roof, white-framed windows with glints,
 *  flower boxes, a panelled door, a chimney. Front faces +Z. */
const makeHouse = (wallMat: THREE.MeshLambertMaterial, roofMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, roofH: number) => {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.45, 0); shape.lineTo(w / 2 + 0.45, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.7) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = wallH - 0.05; roof.castShadow = true; g.add(roof);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallMat);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    tri.castShadow = false; g.add(tri);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, d + 0.75, 8), lam2({ color: "#5d4028" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, wallH + roofH - 0.02, 0); ridge.castShadow = true; g.add(ridge);
  const trimM = lam2({ color: "#f4f1ea" });
  const slopeLen = Math.hypot(w / 2 + 0.45, roofH), slopeAng = Math.atan2(roofH, w / 2 + 0.45);
  for (const s of [1, -1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.13, 0.07), trimM);
    trim.position.set(s * (w / 4 + 0.11), wallH + roofH / 2 - 0.02, d / 2 + 0.38);
    trim.rotation.z = s > 0 ? Math.PI - slopeAng : slopeAng;
    g.add(trim);
  }
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#3d5a78" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.55 });
  const shutterM = lam2({ color: "#7a4a2e" });
  const winXs = w > 6 ? [-w / 4, w / 4] : [0];
  for (const wx of winXs) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.5, 0.1), frameM);
    fr.position.set(wx, wallH * 0.55, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.12), glassM);
    gl.position.set(wx, wallH * 0.55, d / 2 + 0.04); g.add(gl);
    const mv = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 0.03), frameM);
    mv.position.set(wx, wallH * 0.55, d / 2 + 0.11); g.add(mv);
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.03), frameM);
    mh.position.set(wx, wallH * 0.55, d / 2 + 0.11); g.add(mh);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.85), glintM);
    glint.position.set(wx - 0.18, wallH * 0.55 + 0.05, d / 2 + 0.105); glint.rotation.z = 0.5; g.add(glint);
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.44, 0.06), shutterM);
      sh.position.set(wx + s * 0.82, wallH * 0.55, d / 2 + 0.05); sh.rotation.y = s * 0.16; g.add(sh);
    }
    const boxF = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.3), lam2({ color: "#6a4a2c" }));
    boxF.position.set(wx, wallH * 0.55 - 0.95, d / 2 + 0.16); g.add(boxF);
    const cols = ["#d83a4a", "#e86a9a", "#e8542e", "#f2f0e6"];
    for (let i = 0; i < 6; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lam2({ color: cols[i % cols.length] }));
      fl.position.set(wx - 0.5 + i * 0.2, wallH * 0.55 - 0.78, d / 2 + 0.2); g.add(fl);
    }
  }
  const doorX = w > 6 ? 0 : w / 3.2;
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.1, 0.09), frameM);
  dfr.position.set(doorX, 1.02, d / 2 + 0.03); g.add(dfr);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.1), lam2({ color: "#5d3a22" }));
  door.position.set(doorX, 0.95, d / 2 + 0.05); g.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.03), lam2({ color: "#4c2f1a" }));
  panel.position.set(doorX, 1.35, d / 2 + 0.11); g.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
  knob.position.set(doorX + 0.36, 0.95, d / 2 + 0.12); g.add(knob);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.55), lam2({ color: "#a39a8b" }));
  step.position.set(doorX, 0.07, d / 2 + 0.3); step.receiveShadow = true; g.add(step);
  const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), lam2({ color: "#2c2c30" }));
  lampArm.position.set(doorX + 0.85, 2.25, d / 2 + 0.18); g.add(lampArm);
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.55 }));
  lampGlass.position.set(doorX + 0.85, 2.16, d / 2 + 0.34); g.add(lampGlass);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.55), lam2({ color: "#8a4a3a" }));
  chim.position.set(w / 4, wallH + roofH * 0.72, 0); chim.castShadow = true; g.add(chim);
  const chimCap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.75), lam2({ color: "#6e463c" }));
  chimCap.position.set(w / 4, wallH + roofH * 0.72 + 0.58, 0); g.add(chimCap);
  return g;
};

/** A dry Anatolian tree: gnarled bark trunk, branches, and a
 *  layered flecked canopy in dusty olive greens — organic
 *  silhouette, never a lollipop. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "derinkuyuFoliageDeep"),
    folM(greens[0], "derinkuyuFoliageMid"),
    folM(greens[1] ?? greens[0], "derinkuyuFoliageLite"),
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

/** A FAIRY CHIMNEY: a tapered tuff tower with strata texture
 *  and a darker cap rock balanced on top — Kapadokya's signature. */
const makeChimney = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const rockM = lam2({ map: rep(rockTex("derinkuyuRockA"), 2, 3), color: "#cbb086" });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9 + tr() * 0.4, 1.9 + tr() * 0.7, h, 10), rockM);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25 + tr() * 0.4, 1.6 + tr() * 0.7, 10), lam2({ map: rep(rockTex("derinkuyuRockB", "#8a6a44"), 1, 1), color: "#9a7a52" }));
  cap.position.y = h + 0.7; cap.castShadow = true; g.add(cap);
  // a carved window or two, dark with a warm glint
  for (let i = 0; i < 2; i++) {
    const a = tr() * Math.PI * 2, y = h * (0.35 + tr() * 0.3);
    const rad = 1.55 - (y / h) * 0.65;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6),
      new THREE.MeshLambertMaterial({ color: "#4a3418", emissive: "#ff9a3c", emissiveIntensity: i === 0 ? 0.35 : 0.08 }));
    win.position.set(Math.sin(a) * rad, y, Math.cos(a) * rad);
    win.rotation.y = a; g.add(win);
  }
  return g;
};

/** A storage jar (amphora-ish): squashed sphere shoulder on a
 *  tapered cylinder, terracotta or stone grey. */
const makeJar = (h: number, col: string) => {
  const g = new THREE.Group();
  const m = lam2({ color: col, map: rep(plasterTex("derinkuyuJar", "#cbb59a"), 1, 1) });
  const body = new THREE.Mesh(new THREE.SphereGeometry(h * 0.36, 10, 8), m);
  body.position.y = h * 0.38; body.scale.y = 1.25; body.castShadow = true; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.13, h * 0.2, h * 0.3, 9), m);
  neck.position.y = h * 0.88; g.add(neck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(h * 0.14, h * 0.035, 6, 12), m);
  rim.rotation.x = Math.PI / 2; rim.position.y = h * 1.02; g.add(rim);
  return g;
};
const makeBarrel = (h: number) => {
  const g = new THREE.Group();
  const m = lam2({ color: "#8a6844", map: rep(planks(), 1, 1) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.30, h * 0.30, h, 11), m);
  body.position.y = h / 2; body.scale.set(1, 1, 1); body.castShadow = true; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(h * 0.315, 11, 8), m);
  belly.position.y = h / 2; belly.scale.y = h / (h * 0.63) * 0.5; g.add(belly);
  for (const yy of [0.22, 0.78]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.315, h * 0.022, 5, 14), lam2({ color: "#3d3d42" }));
    ring.rotation.x = Math.PI / 2; ring.position.y = h * yy; g.add(ring);
  }
  return g;
};

/** A low-poly cow: blocky body, head down grazing or up, legs,
 *  tail — reads instantly at diorama distance. */
const makeCow = (col: string, patch: string, headDown = false) => {
  const g = new THREE.Group();
  const m = lam2({ color: col });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.85, 0.8), m);
  body.position.y = 1.02; body.castShadow = true; g.add(body);
  const pat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.87, 0.5), lam2({ color: patch }));
  pat.position.set(-0.25, 1.03, 0.18); g.add(pat);
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.46), m);
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), lam2({ color: "#d9a48f" }));
  muzzle.position.set(0, -0.14, 0.36); head.add(muzzle);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.12), m);
    ear.position.set(s * 0.36, 0.14, 0); head.add(ear);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 5), lam2({ color: "#e6d7b8" }));
    horn.position.set(s * 0.2, 0.3, 0); horn.rotation.z = -s * 0.5; head.add(horn);
  }
  head.position.set(0, headDown ? 0.62 : 1.18, 0.95);
  head.rotation.x = headDown ? 0.85 : 0.12;
  g.add(head);
  for (const [lx, lz] of [[-0.6, 0.26], [0.6, 0.26], [-0.6, -0.26], [0.6, -0.26]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.72, 6), m);
    leg.position.set(lx, 0.36, lz); g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.8, 5), m);
  tail.position.set(0, 1.05, -0.48); tail.rotation.x = 0.35; g.add(tail);
  return g;
};
/** A low-poly horse, head up, dark mane. */
const makeHorse = (col: string) => {
  const g = new THREE.Group();
  const m = lam2({ color: col });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.78, 0.66), m);
  body.position.y = 1.28; body.castShadow = true; g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.4), m);
  neck.position.set(0, 1.78, 0.82); neck.rotation.x = -0.6; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.72), m);
  head.position.set(0, 2.12, 1.12); head.rotation.x = 0.5; g.add(head);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.3), lam2({ color: "#2e2018" }));
  mane.position.set(0, 1.86, 0.68); mane.rotation.x = -0.6; g.add(mane);
  for (const [lx, lz] of [[-0.62, 0.2], [0.62, 0.2], [-0.62, -0.2], [0.62, -0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.05, 6), m);
    leg.position.set(lx, 0.52, lz); g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.85, 5), lam2({ color: "#2e2018" }));
  tail.position.set(0, 1.35, -0.45); tail.rotation.x = 0.4; g.add(tail);
  return g;
};

// ---------------- the world ----------------
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
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private torches: { sp: THREE.Sprite; base: number; ph: number; sc: number }[] = [];
  private shaftDust: { sp: THREE.Sprite; x: number; z: number; off: number; sp2: number }[] = [];
  private smoke: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];
  private lampSwing: THREE.Group | null = null;
  private doorPivot: THREE.Group | null = null;
  private doorSpin: THREE.Group | null = null;
  private spears: THREE.Group | null = null;
  private breakL: THREE.Group | null = null;
  private breakR: THREE.Group | null = null;
  private rubble: THREE.Group | null = null;
  private breakDust: THREE.Sprite[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1963);
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
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildSurface(R, r);
    this.buildCutaway(R, r);
    this.buildBasement(R, r);
    this.buildSchool(R, r);
    this.buildDoor(R, r);
  }

  /** a torch/lamp glow sprite that update() flickers */
  private torch(parent: THREE.Object3D, x: number, y: number, z: number, sc = 1.7, col = "#ffb45e", base = 0.85) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, opacity: base }));
    sp.position.set(x, y, z); sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
    parent.add(sp);
    this.torches.push({ sp, base, ph: x * 1.7 + z * 2.3 + y, sc });
    // the flame's hot core
    const coreM = new THREE.Mesh(new THREE.SphereGeometry(0.055 * sc, 7, 6),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff8a2a", emissiveIntensity: 1.6 }));
    coreM.position.set(x, y, z); parent.add(coreM);
    return sp;
  }

  // ---------------- SET A1: the surface town ----------------
  private buildSurface(R: THREE.Group, r: () => number) {
    const rockM = lam2({ map: rep(rockTex("derinkuyuRockA"), 3, 3), color: "#c3a678" });
    // plateau: from the rim (z = FACE_Z) running back to the horizon
    const plateau = new THREE.Mesh(new THREE.PlaneGeometry(460, 190), lam2({ map: rep(soilTex(), 60, 26), color: "#cdb184" }));
    plateau.rotation.x = -Math.PI / 2; plateau.position.set(0, -0.05, FACE_Z - 95); plateau.receiveShadow = true; R.add(plateau);
    // the valley floor far below the face
    const valley = new THREE.Mesh(new THREE.PlaneGeometry(460, 240), lam2({ map: rep(soilTex(), 60, 30), color: "#b89a6c" }));
    valley.rotation.x = -Math.PI / 2; valley.position.set(0, -29.2, FACE_Z + 122); valley.receiveShadow = true; R.add(valley);
    // the hero's TERRACE: a rock promontory jutting over the valley
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(13, 4.5, 17.5), rockM);
    terrace.position.set(1.5, -2.25, 6.5); terrace.castShadow = true; terrace.receiveShadow = true; R.add(terrace);
    const paving = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 17.1), lam2({ map: rep(brickTex("derinkuyuPaving", "#b8a888"), 5, 7), color: "#cbbfa4" }));
    paving.rotation.x = -Math.PI / 2; paving.position.set(1.5, 0.012, 6.5); paving.receiveShadow = true; R.add(paving);
    // a low parapet along the terrace's front edge (with a gap)
    const parM = lam2({ map: rep(rockTex("derinkuyuRockB", "#8a6a44"), 1, 1), color: "#a8895e" });
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.4), parM);
      p.position.set(-3.6 + i * 1.32, 0.28, 14.9); p.castShadow = true; R.add(p);
    }
    // the rim lip: a rock brow running the width of the cutaway
    const lip = new THREE.Mesh(new THREE.BoxGeometry(37, 1.1, 1.6), rockM);
    lip.position.set(0, -0.3, FACE_Z - 0.4); lip.castShadow = true; R.add(lip);
    // ---- the town: stone houses behind the rim ----
    const wallMats = [
      lam2({ map: rep(plasterTex("derinkuyuPlasterA", "#efe3cc"), 2, 1) }),
      lam2({ map: rep(brickTex("derinkuyuBrickA", "#a8765a"), 2, 1) }),
      lam2({ map: rep(plasterTex("derinkuyuPlasterB", "#e6d3ac"), 2, 1) }),
      lam2({ map: rep(brickTex("derinkuyuBrickB", "#96755a"), 2, 1) }),
    ];
    const roofMats = [
      lam2({ map: rep(brickTex("derinkuyuRoofA", "#a85f3d"), 2, 1) }),
      lam2({ map: rep(brickTex("derinkuyuRoofB", "#8f5136"), 2, 1) }),
    ];
    const housePts: [number, number, number][] = [
      [-9, -11, 0.15], [3, -13, -0.1], [12, -10.5, 0.3], [-19, -15, -0.2], [20, -16, 0.1],
      [-4, -22, 0.05], [8, -24, -0.15], [-14, -27, 0.2], [17, -28, 0],
    ];
    let smokeSrc: [number, number, number] | null = null;
    housePts.forEach(([x, z, yaw], i) => {
      const w = 6.2 + (i % 3) * 0.9, d = 5.0 + (i % 2) * 0.7, wallH = 2.8 + (i % 3) * 0.25, roofH = 2.2 + (i % 2) * 0.4;
      const h = makeHouse(wallMats[i % wallMats.length], roofMats[i % roofMats.length], w, d, wallH, roofH);
      h.position.set(x, 0, z); h.rotation.y = yaw;
      R.add(h);
      blob(R, x, 0.02, z, w + 2.4, d + 2.4, 0.28);
      if (i === 1) smokeSrc = [x + w / 4, wallH + roofH * 0.72 + 1.15, z];
    });
    // chimney smoke: thin puffs rising + drifting (registered)
    // (the `as` assertion breaks TS's CFA chain: the let is
    // assigned inside a forEach closure, so without it the value
    // narrows to null and the destructure below errors TS2488)
    const smoke = smokeSrc as [number, number, number] | null;
    if (smoke) {
      const [sx, sy, sz] = smoke;
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#e8e2d4", transparent: true, depthWrite: false, opacity: 0 }));
        sp.position.set(sx, sy, sz); sp.layers.set(NOINK); R.add(sp);
        this.smoke.push({ sp, x: sx, y: sy, z: sz, ph: i / 4 });
      }
    }
    // ---- fairy chimneys on the horizon + flanks ----
    const chimPts: [number, number, number][] = [
      [-26, -32, 15], [27, -36, 18], [-37, -18, 11.5], [39, -22, 12.5], [15, -44, 20], [-17, -47, 16],
      [-46, -40, 14], [48, -44, 15], [0, -58, 22],
    ];
    for (const [x, z, h] of chimPts) {
      const c = makeChimney(h, Math.abs(x) * 3 + h);
      c.position.set(x, -0.1, z);
      R.add(c);
    }
    // dry olive trees + scrub bushes around the town and terrace
    const greens = ["#7a8446", "#97a055", "#5f6c38"];
    const treePts: [number, number, number][] = [
      [-6.5, 12.5, 3.4], [9.5, 13.5, 3.0], [-13, -6, 4.2], [15.5, -5, 3.8], [-24, -10, 4.6],
      [24, -9, 4.2], [-8, -18, 3.6], [13, -19, 4.4], [30, -26, 5.0], [-30, -28, 4.8],
    ];
    treePts.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 21 + i * 9);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.71 });
    });
    const bushM = lam2({ color: "#6c7740", map: rep(foliageTex("derinkuyuFoliageBush"), 2, 1) });
    for (let i = 0; i < 14; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.45, 9, 7), bushM);
      b.position.set(s * (6 + r() * 22), 0.25, 10 - r() * 34);
      b.scale.y = 0.7; b.castShadow = true; R.add(b);
    }
    // a dirt path from the terrace toward the town
    softPatch(R, patchTex(), "#8a6c42", -1, 0.02, -1, 3.4, 12, 0.35, 0.12);
    void r;
  }

  // ---------------- SET A2: the cutaway city ----------------
  private buildCutaway(R: THREE.Group, r: () => number) {
    const rockM = lam2({ map: rep(rockTex("derinkuyuRockA"), 4, 3), color: "#bd9f72" });
    const rockDarkM = lam2({ map: rep(rockTex("derinkuyuRockDark", "#8a6c46", true), 3, 3), color: "#8a6f4c" });
    const slabM = lam2({ map: rep(rockTex("derinkuyuRockA"), 5, 1), color: "#c8ab7e" });
    const doorDarkM = new THREE.MeshBasicMaterial({ color: "#17100a" });
    const winGlowM = new THREE.MeshLambertMaterial({ color: "#ffb45e", emissive: "#ff8a2a", emissiveIntensity: 0.85 });
    // back + side walls + floor of the dollhouse block
    const back = new THREE.Mesh(new THREE.PlaneGeometry(35, 29), rockDarkM);
    back.position.set(0, -13.6, -13); back.receiveShadow = true; R.add(back);
    for (const s of [1, -1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 29), rockDarkM);
      side.position.set(s * 17, -13.6, -7.5); side.rotation.y = -s * Math.PI / 2; R.add(side);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 28.6, 1.7), rockM);
      pillar.position.set(s * 17.4, -13.9, FACE_Z - 0.6); pillar.castShadow = true; R.add(pillar);
    }
    const floorB = new THREE.Mesh(new THREE.PlaneGeometry(35, 11.5), rockDarkM);
    floorB.rotation.x = -Math.PI / 2; floorB.position.set(0, -27.7, -7.5); R.add(floorB);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(36.5, 1.4, 1.7), rockM);
    sill.position.set(0, -28.2, FACE_Z - 0.6); R.add(sill);

    BAND_Y.forEach((fy, bi) => {
      // floor slab (its underside is the ceiling of the band
      // below), built in four pieces around a 2.6 m hole where
      // the ventilation shaft pierces it — one solid slab would
      // cap the tube at every level, and the shaft shot would
      // see nothing but dark slab undersides
      const hx0 = SHAFT_X - 1.3, hx1 = SHAFT_X + 1.3, hz0 = SHAFT_Z - 1.3, hz1 = SHAFT_Z + 1.3;
      const slabPiece = (x0: number, x1: number, z0: number, z1: number) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, z1 - z0), slabM);
        p.position.set((x0 + x1) / 2, fy - 0.25, (z0 + z1) / 2);
        p.castShadow = true; p.receiveShadow = true; R.add(p);
      };
      slabPiece(-17.2, hx0, -13.2, -2.0);
      slabPiece(hx1, 17.2, -13.2, -2.0);
      slabPiece(hx0, hx1, -13.2, hz0);
      slabPiece(hx0, hx1, hz1, -2.0);
      // back-wall doors (dark) + lit windows for this band
      const doorXs = [-13.5, -5.5, 2.5, 11.5];
      doorXs.forEach((dx, di) => {
        if ((di + bi) % 3 === 2) return;
        const d = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), doorDarkM);
        d.position.set(dx + (bi % 2) * 1.3, fy + 1.05, -12.93); R.add(d);
        const arch = new THREE.Mesh(new THREE.CircleGeometry(0.55, 10, 0, Math.PI), doorDarkM);
        arch.position.set(dx + (bi % 2) * 1.3, fy + 2.1, -12.93); R.add(arch);
      });
      [-9.5, 5.5, 14].forEach((wx, wi) => {
        if ((wi + bi) % 2 === 1 && bi !== 5) return;
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), winGlowM);
        w.position.set(wx, fy + 1.7, -12.93); R.add(w);
      });
      // room partitions jutting from the back wall
      for (const px of [-10.5 + bi * 1.2, 4.5 - bi * 0.8]) {
        const part = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.9, 5.6), rockM);
        part.position.set(px, fy + 1.95, -10.2); part.castShadow = true; R.add(part);
      }
      // torches burning on the face of the band + their light pools
      for (const tx of [-14.5, 0.5, 13.5]) {
        if ((tx > 0 && bi % 2 === 1) || (tx < -10 && bi === 5)) continue;
        this.torch(R, tx, fy + 1.9, -4.4, 1.5);
        softPatch(R, patchTex(), "#ff9a3c", tx, fy + 0.03, -5.4, 3.4, 3.0, 0.16);
      }
      // stairs zig-zagging down the side walls between bands
      if (bi < BAND_Y.length - 1) {
        const sideX = bi % 2 === 0 ? -15.6 : 15.6;
        for (let sIdx = 0; sIdx < 6; sIdx++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 1.15), slabM);
          step.position.set(sideX, fy - 0.35 - sIdx * 0.7, -3.6 - sIdx * 1.05);
          step.castShadow = true; R.add(step);
        }
      }
    });

    // ---- band dressing ----
    const B = BAND_Y;
    { // BAND 0 — STABLES: fence, cows, a horse, hay, a trough
      const fenceM = lam2({ color: "#7d5a36", map: rep(planks(), 2, 1) });
      for (let i = 0; i < 6; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), fenceM);
        post.position.set(-14.5 + i * 2.1, B[0] + 0.52, -4.6); R.add(post);
      }
      for (const ry of [0.45, 0.85]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.09, 0.09), fenceM);
        rail.position.set(-9.25, B[0] + ry, -4.6); R.add(rail);
      }
      const cow1 = makeCow("#8a5f43", "#e8dcc4"); cow1.position.set(-11.5, B[0], -7.6); cow1.rotation.y = 0.5; R.add(cow1);
      const cow2 = makeCow("#e0d4c0", "#8a5f43", true); cow2.position.set(-7.6, B[0], -8.8); cow2.rotation.y = -0.4; R.add(cow2);
      const horse = makeHorse("#6e4a30"); horse.position.set(-1.5, B[0], -7.8); horse.rotation.y = -0.55; R.add(horse);
      const hayM = lam2({ color: "#d9b04a" });
      for (const [hx, hz] of [[-13.8, -9.5], [1.8, -9.8]] as [number, number][]) {
        const hay = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.15, 9), hayM);
        hay.position.set(hx, B[0] + 0.57, hz); hay.castShadow = true; R.add(hay);
      }
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.6), fenceM);
      trough.position.set(-4.6, B[0] + 0.21, -5.6); R.add(trough);
    }
    { // BAND 1 — KITCHEN + STORES: hearth fire, jars, barrels, sacks
      const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.8), rockDarkM);
      hearth.position.set(3.2, B[1] + 0.55, -11.8); R.add(hearth);
      this.torch(R, 3.2, B[1] + 0.95, -11.2, 2.3, "#ff8a3c", 0.95);
      const jarCols = ["#b0764a", "#9a7a52", "#a8643c"];
      [[-8.6, -10.5, 1.25], [-7.2, -11, 1.05], [-9.8, -11.2, 0.9], [-6.1, -10.2, 0.8]].forEach(([jx, jz, jh], i) => {
        const j = makeJar(jh, jarCols[i % 3]); j.position.set(jx, B[1], jz); R.add(j);
      });
      const b1 = makeBarrel(1.05); b1.position.set(8.6, B[1], -10.6); R.add(b1);
      const b2 = makeBarrel(1.05); b2.position.set(9.7, B[1], -10.2); R.add(b2);
      const sackM = lam2({ color: "#c2a878" });
      [[12.3, -9.6], [13.3, -10.4], [12.8, -8.7]].forEach(([sx, sz]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.52, 9, 7), sackM);
        s.position.set(sx, B[1] + 0.3, sz); s.scale.y = 0.72; s.castShadow = true; R.add(s);
      });
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), lam2({ color: "#8a6844", map: rep(planks(), 1, 1) }));
      table.position.set(-1.5, B[1] + 0.78, -8.6); R.add(table);
    }
    { // BAND 2 — WINERY: the great press, grape baskets, jars
      const postM = lam2({ color: "#6e4f30", map: rep(planks(), 1, 1) });
      for (const s of [1, -1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.7, 0.3), postM);
        post.position.set(-6 + s * 0.85, B[2] + 1.35, -8.2); post.castShadow = true; R.add(post);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 0.4), postM);
      beam.position.set(-6, B[2] + 2.62, -8.2); R.add(beam);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.7, 9), lam2({ color: "#54402a" }));
      screw.position.set(-6, B[2] + 1.7, -8.2); R.add(screw);
      for (let i = 0; i < 5; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 5, 10), lam2({ color: "#54402a" }));
        rib.rotation.x = Math.PI / 2; rib.position.set(-6, B[2] + 1.05 + i * 0.32, -8.2); R.add(rib);
      }
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 12), postM);
      plate.position.set(-6, B[2] + 0.62, -8.2); R.add(plate);
      const grapeM = lam2({ color: "#5d3a7a" });
      [[-9.3, -7.4], [-8.4, -8.6]].forEach(([gx, gz]) => {
        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.5, 9, 1, true), lam2({ color: "#a8845c", side: THREE.DoubleSide }));
        basket.position.set(gx, B[2] + 0.25, gz); R.add(basket);
        for (let i = 0; i < 6; i++) {
          const gp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), grapeM);
          gp.position.set(gx + (r() - 0.5) * 0.4, B[2] + 0.52, gz + (r() - 0.5) * 0.4); R.add(gp);
        }
      });
      [[5.2, -10.6, 1.3], [6.7, -11, 1.1], [8.1, -10.4, 0.95]].forEach(([jx, jz, jh], i) => {
        const j = makeJar(jh, ["#8a6a8a", "#b0764a", "#9a7a52"][i]); j.position.set(jx, B[2], jz); R.add(j);
      });
      const bb1 = makeBarrel(1.1); bb1.position.set(11.8, B[2], -10.4); R.add(bb1);
      const bb2 = makeBarrel(1.1); bb2.position.set(11.8, B[2] + 1.02, -10.4); R.add(bb2);
    }
    { // BAND 3 — LIVING: bed rolls, a rug, a table (hero lounges here in shot 7)
      const bedM = lam2({ color: "#a03a30" });
      const pilM = lam2({ color: "#e8dcc4" });
      [[-12.6, -9.8], [-11, -10.6], [8.6, -10.2]].forEach(([bx, bz]) => {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.32, 0.95), bedM);
        bed.position.set(bx, B[3] + 0.16, bz); bed.castShadow = true; R.add(bed);
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), pilM);
        pil.rotation.x = Math.PI / 2; pil.position.set(bx - 0.7, B[3] + 0.36, bz); R.add(pil);
      });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), lam2({ color: "#9a3a30" }));
      rug.rotation.x = -Math.PI / 2; rug.position.set(1.5, B[3] + 0.015, -7.6); R.add(rug);
      const rugIn = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), lam2({ color: "#c9862f" }));
      rugIn.rotation.x = -Math.PI / 2; rugIn.position.set(1.5, B[3] + 0.025, -7.6); R.add(rugIn);
    }
    { // BAND 4 — DEEP STORES: sack piles, grain mound, jar row, crates
      const sackM = lam2({ color: "#bfae86" });
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.5 + (i % 3) * 0.07, 9, 7), sackM);
        s.position.set(-12.5 + (i % 4) * 1.05, B[4] + 0.3 + Math.floor(i / 4) * 0.55, -10.6 + (i % 2) * 0.7);
        s.scale.y = 0.72; s.castShadow = true; R.add(s);
      }
      const grain = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.95, 11), lam2({ color: "#d9b04a" }));
      grain.position.set(-5.5, B[4] + 0.47, -9.6); R.add(grain);
      for (let i = 0; i < 5; i++) {
        const j = makeJar(0.95 + (i % 2) * 0.2, "#9a7a52");
        j.position.set(3.5 + i * 1.35, B[4], -11.2); R.add(j);
      }
      const crateM = lam2({ color: "#a87c4c", map: rep(planks(), 1, 1) });
      [[10.6, -10.8, 0], [10.6, -10.8, 0.95], [11.7, -10.6, 0]].forEach(([cx, cz, cy]) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), crateM);
        c.position.set(cx, B[4] + 0.48 + cy, cz); c.castShadow = true; R.add(c);
      });
    }
    { // BAND 5 — THE DEEP CHAPEL: a carved cross, candle glow, near-dark
      const crossM = lam2({ color: "#d9c9a8" });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.16), crossM);
      cv.position.set(-8, B[5] + 1.7, -12.85); R.add(cv);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.16), crossM);
      ch.position.set(-8, B[5] + 2.05, -12.85); R.add(ch);
      this.torch(R, -9.3, B[5] + 0.8, -11.6, 1.1, "#ffc98a", 0.8);
      this.torch(R, -6.7, B[5] + 0.8, -11.6, 1.1, "#ffc98a", 0.8);
    }

    // ---- THE SHAFT: a 2.4 m square tube from the daylight to the deep ----
    {
      // the tube walls are UNLIT basic material: the sun rig never
      // reaches inside the shaft (the two-tone shade crushes a lit
      // interior to a purple void), so the rock reads at a fixed
      // warm dimness and the beam + torch slots carry the depth
      const shaftM = new THREE.MeshBasicMaterial({ map: rep(rockTex("derinkuyuRockDark", "#7a5c38", true), 1, 4), color: "#9a8262" });
      const mkWall = (w: number, x: number, z: number, ry: number) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 27.6), shaftM);
        p.position.set(x, -12.9, z); p.rotation.y = ry; R.add(p);
      };
      mkWall(2.4, SHAFT_X - 1.2, SHAFT_Z, Math.PI / 2);
      mkWall(2.4, SHAFT_X + 1.2, SHAFT_Z, -Math.PI / 2);
      mkWall(2.4, SHAFT_X, SHAFT_Z - 1.2, 0);
      mkWall(2.4, SHAFT_X, SHAFT_Z + 1.2, Math.PI);
      // band openings on the shaft's west wall
      for (const fy of BAND_Y) {
        const op = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.9), new THREE.MeshBasicMaterial({ color: "#120c06" }));
        op.position.set(SHAFT_X - 1.19, fy + 1.15, SHAFT_Z); op.rotation.y = Math.PI / 2; R.add(op);
      }
      // daylight disc + halo at the top, rim stones around the mouth
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.18, 18),
        new THREE.MeshBasicMaterial({ color: "#fff6da" }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(SHAFT_X, 0.72, SHAFT_Z); R.add(disc);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.85 }));
      halo.position.set(SHAFT_X, 0.5, SHAFT_Z); halo.scale.set(5.5, 5.5, 1); halo.layers.set(NOINK); R.add(halo);
      const rimM = lam2({ map: rep(rockTex("derinkuyuRockB", "#8a6a44"), 1, 1), color: "#a8895e" });
      for (const [rx, rz, rw, rd] of [[0, -1.45, 3.4, 0.5], [0, 1.45, 3.4, 0.5], [-1.45, 0, 0.5, 2.4], [1.45, 0, 0.5, 2.4]] as [number, number, number, number][]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.5, rd), rimM);
        st.position.set(SHAFT_X + rx, 0.25, SHAFT_Z + rz); st.castShadow = true; R.add(st);
      }
      // the sunbeam itself: a soft column of light falling the
      // full depth of the tube to the dark below
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.3, 27, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: "#ffedb8", transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      beam.position.set(SHAFT_X, -13, SHAFT_Z); beam.layers.set(NOINK); R.add(beam);
      // torch glows slotted into the tube wall at three depths —
      // warm pools that make the 55 m of depth readable
      this.torch(R, SHAFT_X - 0.75, -6.5, SHAFT_Z, 1.35, "#ffc98a", 0.8);
      this.torch(R, SHAFT_X - 0.75, -14.5, SHAFT_Z, 1.35, "#ffc98a", 0.8);
      this.torch(R, SHAFT_X - 0.75, -22.0, SHAFT_Z, 1.35, "#ffc98a", 0.8);
      // the well rope + bucket, hanging into the deep
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 19.5, 5), lam2({ color: "#c9b18a" }));
      rope.position.set(SHAFT_X + 0.55, -9, SHAFT_Z + 0.45); R.add(rope);
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 9), lam2({ color: "#7d5a36", map: rep(planks(), 1, 1) }));
      bucket.position.set(SHAFT_X + 0.55, -19.2, SHAFT_Z + 0.45); R.add(bucket);
      // dust motes forever sifting down the light (registered)
      for (let i = 0; i < 14; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffe9bb", transparent: true, depthWrite: false, opacity: 0.32 }));
        const mx = SHAFT_X + (r() - 0.5) * 1.7, mz = SHAFT_Z + (r() - 0.5) * 1.7;
        sp.position.set(mx, -r() * 25, mz);
        sp.scale.set(0.34, 0.34, 1); sp.layers.set(NOINK); R.add(sp);
        this.shaftDust.push({ sp, x: mx, z: mz, off: r() * 26, sp2: 0.55 + r() * 0.8 });
      }
    }
    void r;
  }

  // ---------------- SET B: the 1963 basement ----------------
  private buildBasement(R: THREE.Group, r: () => number) {
    const X = BASE_X;
    const wallM = lam2({ map: rep(plasterTex("derinkuyuBaseWall", "#cbb693"), 3, 1), color: "#c9b48c" });
    const stoneM = lam2({ map: rep(brickTex("derinkuyuBaseFloor", "#8a7a64"), 5, 4), color: "#9a8a72" });
    const darkM = lam2({ map: rep(rockTex("derinkuyuRockDark", "#6e5232", true), 2, 2), color: "#6e5638" });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 11.5), stoneM);
    floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0, 0); floor.receiveShadow = true; R.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.4), lam2({ color: "#9a3a30" }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(X - 0.6, 0.012, 0.8); R.add(rug);
    const rugIn = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.5), lam2({ color: "#c9862f" }));
    rugIn.rotation.x = -Math.PI / 2; rugIn.position.set(X - 0.6, 0.02, 0.8); R.add(rugIn);
    // side walls + ceiling with beams
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 3.8), wallM);
      w.position.set(X + s * 6.7, 1.9, 0); w.rotation.y = -s * Math.PI / 2; w.receiveShadow = true; R.add(w);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 11.5), darkM);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(X, 3.75, 0); R.add(ceil);
    const beamM = lam2({ color: "#6e4f30", map: rep(planks(), 3, 1) });
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.24, 0.3), beamM);
      beam.position.set(X, 3.58, -4.2 + i * 2.8); R.add(beam);
    }
    // back wall: fixed segments around the BREAKABLE centre panel
    const backL = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.8, 0.35), wallM);
    backL.position.set(X - 4.55, 1.9, -5.6); backL.castShadow = true; R.add(backL);
    const backR = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.8, 0.35), wallM);
    backR.position.set(X + 4.35, 1.9, -5.6); backR.castShadow = true; R.add(backR);
    const backT = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.85, 0.35), wallM);
    backT.position.set(X - 0.35, 3.32, -5.6); R.add(backT);
    // the panel that comes down: two halves on edge pivots
    const crackM = new THREE.MeshBasicMaterial({ color: "#2a1c10" });
    const mkHalf = (side: number) => {
      const grp = new THREE.Group();
      grp.position.set(X - 0.35 + side * 1.05, 0, -5.6);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.9, 0.33), wallM);
      mesh.position.set(-side * 0.53, 1.45, 0); mesh.castShadow = true; grp.add(mesh);
      for (let i = 0; i < 3; i++) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.7 - i * 0.15, 0.02), crackM);
        crack.position.set(-side * (0.25 + i * 0.22), 2.2 - i * 0.62, 0.18);
        crack.rotation.z = side * (0.4 + i * 0.3); grp.add(crack);
      }
      R.add(grp);
      return grp;
    };
    this.breakL = mkHalf(-1);
    this.breakR = mkHalf(1);
    // rubble that spills when the wall falls (scaled by update())
    this.rubble = new THREE.Group();
    const rubM = lam2({ map: rep(rockTex("derinkuyuRockB", "#8a6a44"), 1, 1), color: "#9a8262" });
    for (let i = 0; i < 9; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + r() * 0.22), rubM);
      rock.position.set(X - 0.35 + (r() - 0.5) * 2.6, 0.14, -5.1 + (r() - 0.5) * 0.9);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      this.rubble.add(rock);
    }
    this.rubble.scale.setScalar(0.001);
    R.add(this.rubble);
    // dust burst sprites (opacity driven by update())
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#cbb59a", transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(X - 0.35 + (i - 1) * 0.8, 1.3 + (i % 2) * 0.5, -5.0);
      sp.scale.set(2.6 + i * 0.8, 2.6 + i * 0.8, 1); sp.layers.set(NOINK); R.add(sp);
      this.breakDust.push(sp);
    }
    // behind the wall: the tunnel mouth, steps dropping away, a warm glow
    const tunFloor = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7), darkM);
    tunFloor.rotation.x = -Math.PI / 2; tunFloor.position.set(X - 0.35, -1.65, -9.2); tunFloor.rotation.z = 0; R.add(tunFloor);
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.95), darkM);
      step.position.set(X - 0.35, -0.2 - i * 0.4, -6.1 - i * 0.92); R.add(step);
    }
    for (const s of [1, -1]) {
      const tw = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.6), darkM);
      tw.position.set(X - 0.35 + s * 2.2, -0.4, -9.2); tw.rotation.y = -s * Math.PI / 2; R.add(tw);
    }
    this.torch(R, X - 0.35, 0.4, -11.8, 3.4, "#ff9a3c", 0.9);
    softPatch(R, patchTex(), "#ff9a3c", X - 0.35, -1.6, -10.6, 3.6, 3.4, 0.2);
    // furniture: a table, jars, sacks, crates — a lived-in basement
    const tableM = lam2({ color: "#7d5a36", map: rep(planks(), 1, 1) });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.15), tableM);
    table.position.set(X + 2.9, 0.82, 1.6); table.castShadow = true; R.add(table);
    for (const [lx, lz] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.09), tableM);
      leg.position.set(X + 2.9 + lx, 0.41, 1.6 + lz); R.add(leg);
    }
    [[-4.6, -3.4, 1.3], [-3.4, -3.9, 1.05], [-5.4, -2.6, 0.9]].forEach(([jx, jz, jh], i) => {
      const j = makeJar(jh, ["#b0764a", "#9a7a52", "#a8643c"][i]); j.position.set(X + jx, 0, jz); R.add(j);
    });
    const sackM = lam2({ color: "#c2a878" });
    [[4.9, -2.8], [5.6, -1.9]].forEach(([sx, sz]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), sackM);
      s.position.set(X + sx, 0.32, sz); s.scale.y = 0.72; R.add(s);
    });
    const crateM = lam2({ color: "#a87c4c", map: rep(planks(), 1, 1) });
    [[-4.2, 3.4, 0], [-4.2, 3.4, 0.92], [-3.2, 3.6, 0]].forEach(([cx, cz, cy]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), crateM);
      c.position.set(X + cx, 0.46 + cy, cz); c.castShadow = true; R.add(c);
    });
    // the hanging lamp, swaying gently (registered)
    this.lampSwing = new THREE.Group();
    this.lampSwing.position.set(X + 0.4, 3.72, 0.6);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.05, 5), lam2({ color: "#2c2c30" }));
    cord.position.y = -0.52; this.lampSwing.add(cord);
    const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 1.1 }));
    lampBall.position.y = -1.12; this.lampSwing.add(lampBall);
    R.add(this.lampSwing);
    this.torch(R, X + 0.4, 2.6, 0.6, 2.4, "#ffc98a", 0.75);
    void r;
  }

  // ---------------- SET C: the school + church hall ----------------
  private buildSchool(R: THREE.Group, r: () => number) {
    const X = SCHOOL_X;
    const rockM = lam2({ map: rep(rockTex("derinkuyuRockA"), 4, 2), color: "#b39468" });
    const rockDarkM = lam2({ map: rep(rockTex("derinkuyuRockDark", "#7a5c38", true), 3, 2), color: "#7d6244" });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(31, 9.6), lam2({ map: rep(brickTex("derinkuyuSchoolFloor", "#8a7a64"), 8, 3), color: "#9a8a72" }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0, 0); floor.receiveShadow = true; R.add(floor);
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(31, 5.4), rockDarkM);
      w.position.set(X, 2.7, s * 4.8); w.rotation.y = s > 0 ? Math.PI : 0; w.receiveShadow = true; R.add(w);
      // dark niches carved into the side walls
      for (const nx of [-9, 0, 9]) {
        const n = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2), new THREE.MeshBasicMaterial({ color: "#140d07" }));
        n.position.set(X + nx, 1.5, s * 4.76); n.rotation.y = s > 0 ? Math.PI : 0; R.add(n);
      }
    }
    // the barrel vault: faceted rock planks on an arc (carved, not built)
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 3 + (i / 6) * (Math.PI * 2 / 3);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(31, 0.22, 1.72), rockM);
      plank.position.set(X, 1.05 + Math.cos(a) * 4.55, Math.sin(a) * 4.55);
      plank.rotation.x = -a; plank.castShadow = true; R.add(plank);
    }
    // end walls: entrance (dark arch) west, the CROSS east
    const endW = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.6), rockDarkM);
    endW.position.set(X - 15.5, 2.8, 0); endW.rotation.y = Math.PI / 2; R.add(endW);
    const archD = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.1), new THREE.MeshBasicMaterial({ color: "#0d0805" }));
    archD.position.set(X - 15.45, 1.55, 0); archD.rotation.y = Math.PI / 2; R.add(archD);
    const endE = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.6), rockM);
    endE.position.set(X + 15.5, 2.8, 0); endE.rotation.y = -Math.PI / 2; R.add(endE);
    const crossM = lam2({ color: "#e2d2ac" });
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 0.52), crossM);
    cv.position.set(X + 15.3, 2.75, 0); R.add(cv);
    const chb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, 2.0), crossM);
    chb.position.set(X + 15.3, 3.15, 0); R.add(chb);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffc98a", transparent: true, depthWrite: false, opacity: 0.55 }));
    halo.position.set(X + 14.9, 2.8, 0); halo.scale.set(4.6, 4.6, 1); halo.layers.set(NOINK); R.add(halo);
    // bench rows + desks (students are cast sprites, sitting)
    const benchM = lam2({ color: "#7d5a36", map: rep(planks(), 2, 1) });
    for (const s of [1, -1]) for (const bx of [-6, 0, 6]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.13, 0.6), benchM);
      seat.position.set(X + bx, 0.52, s * 2.35); seat.castShadow = true; R.add(seat);
      for (const lx of [-2.1, 2.1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.5), benchM);
        leg.position.set(X + bx + lx, 0.26, s * 2.35); R.add(leg);
      }
      const desk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.09, 0.55), benchM);
      desk.position.set(X + bx, 0.78, s * 1.55); desk.rotation.x = s * 0.1; R.add(desk);
    }
    // the teacher's lectern near the cross
    const lect = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.15, 0.55), benchM);
    lect.position.set(X + 11.5, 0.57, 0); lect.rotation.y = -0.4; R.add(lect);
    const lectTop = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.65), benchM);
    lectTop.position.set(X + 11.5, 1.2, 0); lectTop.rotation.set(0, -0.4, 0.28); R.add(lectTop);
    // torches along the walls + a hanging glow mid-hall
    for (const [tx, tz] of [[-10, -4.3], [-1, 4.3], [8, -4.3], [13.5, 4.3]] as [number, number][]) {
      this.torch(R, X + tx, 2.7, tz, 1.8);
      softPatch(R, patchTex(), "#ff9a3c", X + tx, 0.03, tz * 0.82, 3.2, 2.8, 0.15);
    }
    this.torch(R, X, 3.9, 0, 2.6, "#ffc98a", 0.6);
    void r;
  }

  // ---------------- SET D: the rolling-door tunnel ----------------
  private buildDoor(R: THREE.Group, r: () => number) {
    const X = DOOR_X;
    const rockM = lam2({ map: rep(rockTex("derinkuyuRockA"), 3, 1), color: "#a8895e" });
    const rockDarkM = lam2({ map: rep(rockTex("derinkuyuRockDark", "#6e5232", true), 3, 1), color: "#6e5638" });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 22.5), rockDarkM);
    floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0, 0); floor.receiveShadow = true; R.add(floor);
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.75, 22.5), rockM);
      w.position.set(X + s * 1.32, 0.87, 0); w.castShadow = true; R.add(w);
    }
    // faceted arch over the passage
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2.6 + (i / 4) * (Math.PI / 1.3);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 22.5), rockM);
      plank.position.set(X + Math.sin(a) * 1.28, 1.72 + Math.cos(a) * 1.05, 0);
      plank.rotation.z = -a; R.add(plank);
    }
    // the cold dark OUTSIDE (north end) + the warm deep (south end)
    const outM = new THREE.MeshBasicMaterial({ color: "#0d1220" });
    const outP = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), outM);
    outP.position.set(X, 1.9, -11.2); R.add(outP);
    const cold = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#7fa8d8", transparent: true, depthWrite: false, opacity: 0.4 }));
    cold.position.set(X, 1.7, -10.6); cold.scale.set(4.2, 3.4, 1); cold.layers.set(NOINK); R.add(cold);
    const inP = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshBasicMaterial({ color: "#170f08" }));
    inP.position.set(X, 1.9, 11.2); inP.rotation.y = Math.PI; R.add(inP);
    // door frame posts + lintel + the floor groove the disc runs in
    const postM = lam2({ map: rep(rockTex("derinkuyuRockB", "#8a6a44"), 1, 1), color: "#9a7a52" });
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 0.5), postM);
      post.position.set(X + s * 1.06, 1.07, 0); post.castShadow = true; R.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.5), postM);
    lintel.position.set(X, 2.28, 0); R.add(lintel);
    const groove = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.05, 0.55), new THREE.MeshBasicMaterial({ color: "#0f0a05" }));
    groove.position.set(X + 0.35, 0.028, 0); R.add(groove);
    // the pocket in the east wall where the door parks
    const pocket = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.95), new THREE.MeshBasicMaterial({ color: "#120c06" }));
    pocket.position.set(X + 1.58, 0.98, 0); pocket.rotation.y = -Math.PI / 2; R.add(pocket);
    // THE DOOR: a basalt disc Ø 1.56 m on a slide + spin rig
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(X + 1.52, 0.80, 0);
    this.doorSpin = new THREE.Group();
    const discM = lam2({ map: rep(rockTex("derinkuyuDoorStone", "#6a5138", true), 1, 1), color: "#77603f" });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.34, 26), discM);
    disc.rotation.x = Math.PI / 2; disc.castShadow = true; this.doorSpin.add(disc);
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 7, 26), lam2({ color: "#54402a" }));
    this.doorSpin.add(rimT);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 10), lam2({ color: "#3d2c1a" }));
    hub.rotation.x = Math.PI / 2; this.doorSpin.add(hub);
    // grip holes + chisel marks on the face (the spear hole of the stories)
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), new THREE.MeshBasicMaterial({ color: "#0a0603" }));
    hole.position.set(0.3, 0.28, 0.18); this.doorSpin.add(hole);
    this.doorPivot.add(this.doorSpin);
    R.add(this.doorPivot);
    // the enemy outside: spear tips + a shield, waiting in the cold
    this.spears = new THREE.Group();
    const shaftM2 = lam2({ color: "#5d4028" });
    const tipM = lam2({ color: "#b9c2cc" });
    [[-0.55, 1.5], [0.15, 1.15], [0.7, 1.65]].forEach(([sx, sy]) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.7, 6), shaftM2);
      shaft.rotation.x = Math.PI / 2 - 0.12; shaft.position.set(sx, sy, -0.4); this.spears!.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 7), tipM);
      tip.rotation.x = Math.PI / 2 - 0.12; tip.position.set(sx, sy + 0.1, 0.55); this.spears!.add(tip);
    });
    const shield = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), lam2({ color: "#7a2e26", side: THREE.DoubleSide }));
    shield.position.set(-0.95, 1.15, -0.7); this.spears.add(shield);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), tipM);
    shieldBoss.position.set(-0.95, 1.15, -0.62); this.spears.add(shieldBoss);
    this.spears.position.set(X, 0, -3.6);
    R.add(this.spears);
    // a torch inside, near the heroes
    this.torch(R, X - 0.95, 2.05, 3.6, 1.8);
    softPatch(R, patchTex(), "#ff9a3c", X - 0.4, 0.03, 3.2, 3.0, 2.8, 0.16);
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
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // torch + lamp flames flicker, each on its own phase
    for (const tc of this.torches) {
      const fl = 0.84 + 0.16 * Math.sin(tt * 11 + tc.ph) + 0.07 * Math.sin(tt * 23 + tc.ph * 2.7);
      (tc.sp.material as THREE.SpriteMaterial).opacity = tc.base * fl;
      const s2 = tc.sc * (0.94 + 0.10 * fl);
      tc.sp.scale.set(s2, s2, 1);
    }
    // shaft dust sifts down the light forever
    for (const d of this.shaftDust) {
      const y = -(((tt * d.sp2 + d.off) % 26) + 0.5);
      d.sp.position.set(d.x + Math.sin(tt * 0.7 + d.off) * 0.14, y, d.z);
    }
    // chimney smoke rises, fattens and thins
    for (const sm of this.smoke) {
      const u = (tt * 0.13 + sm.ph) % 1;
      sm.sp.position.set(sm.x + u * 1.5, sm.y + u * 3.4, sm.z + u * 0.4);
      const s3 = 0.8 + u * 2.6;
      sm.sp.scale.set(s3, s3 * 0.8, 1);
      (sm.sp.material as THREE.SpriteMaterial).opacity = 0.30 * Math.sin(u * Math.PI);
    }
    // the basement lamp sways on its cord
    if (this.lampSwing) {
      this.lampSwing.rotation.z = Math.sin(tt * 0.85) * 0.045;
      this.lampSwing.rotation.x = Math.cos(tt * 0.62) * 0.03;
    }
    // the 1963 wall: whole, cracking, DOWN (wallBreakAt is shared with cast.ts)
    const brk = wallBreakAt(id, tt);
    if (this.breakL && this.breakR) {
      this.breakL.rotation.y = -brk * 1.85;
      this.breakL.position.y = -brk * 0.55;
      this.breakR.rotation.y = brk * 1.85;
      this.breakR.position.y = -brk * 0.55;
    }
    if (this.rubble) this.rubble.scale.setScalar(Math.max(0.001, brk));
    this.breakDust.forEach((sp, i) => {
      (sp.material as THREE.SpriteMaterial).opacity = brk > 0 && brk < 1 ? 0.42 * Math.sin(brk * Math.PI) : 0;
      const s4 = 2.4 + i * 0.8 + brk * 2.2;
      sp.scale.set(s4, s4, 1);
    });
    // THE DOOR ROLLS (doorRollAt is shared with cast.ts); the
    // enemy outside backs off as the passage seals
    const roll = doorRollAt(id, tt);
    if (this.doorPivot && this.doorSpin) {
      this.doorPivot.position.x = DOOR_X + 1.52 - 1.52 * roll;
      this.doorSpin.rotation.z = (1.52 * roll) / 0.78;
    }
    if (this.spears) {
      this.spears.position.z = -3.6 - roll * 1.5 + Math.sin(tt * 6.3) * 0.045;
      this.spears.position.x = DOOR_X + Math.sin(tt * 2.1) * 0.05;
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
