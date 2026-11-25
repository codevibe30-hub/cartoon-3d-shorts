// Iceland as one three.js scene for the Fafnir-ID cover frame:
// a still lake on a moss-and-basalt lava field, colourful
// corrugated-iron houses along the far shore, a church spire,
// and a snow-capped volcano smoking behind — the country with
// (almost) no mosquitoes at all. The lake surface carries an
// animated ICE SHEET (story.ts iceAt): it freezes, thaws and
// freezes again in shot 4, locks the larvae in shot 5, and lies
// thick and stable in shot 6. A plane crosses in shot 7.
// VISUAL CORE: cold bright Nordic daylight, deep blue water,
// moss-green lava, saturated house colours — textured
// everything (anti-banding: speckled sky, flecked water,
// grainy basalt). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, roof } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, LAKE_C, JAR_POS, VOLCANO, ISLETS, clamp01, planeAt, iceAt } from "./story";

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
const skyTexDay = () => ctex("islandiaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#174f9e"); grad.addColorStop(0.34, "#2f6fc4"); grad.addColorStop(0.62, "#6ea6dd");
  grad.addColorStop(0.85, "#b4d2f0"); grad.addColorStop(1, "#e8f1fa");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // high wispy cirrus, faint and stretched
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
const glowTex = () => ctex("islandiaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** grey volcanic smoke puff sprite */
const smokeTex = () => ctex("islandiaSmoke", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 124);
  gr.addColorStop(0, "rgba(238,240,244,0.85)"); gr.addColorStop(0.55, "rgba(200,206,216,0.45)"); gr.addColorStop(1, "rgba(190,198,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("islandiaBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** leaf-fleck canopy texture for the sparse northern trees */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#93ad84"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(34,58,28,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(238,250,208,${0.12 + r() * 0.22})` : `rgba(26,50,22,${0.10 + r() * 0.18})`;
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
/** MOSS-AND-BASALT lava field: a dark volcanic base broken by
 *  cushions of grey-green moss, pale lichen rings and grit —
 *  built with the same value-contrast recipe as the house grass
 *  so it survives the sun lift without flattening. */
const mossLavaTex = () => ctex("islandiaMossLava", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4b4a44"; g.fillRect(0, 0, S, S);
  // basalt value blotches: dark hollows + paler rises
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 34 + r() * 120, dark = r() < 0.55;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "26,26,24" : "112,110,100";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.36 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // moss cushions: clustered grey-green blobs with lit rims
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rad = 12 + r() * 34;
    wrapDraw(S, x, y, rad * 1.4, (xx, yy) => {
      const gr = g.createRadialGradient(xx - rad * 0.2, yy - rad * 0.25, rad * 0.1, xx, yy, rad);
      gr.addColorStop(0, "rgba(146,166,102,0.85)"); gr.addColorStop(0.7, "rgba(104,128,72,0.8)"); gr.addColorStop(1, "rgba(88,110,62,0)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * 0.72, r() * 3, 0, 7); g.fill();
    });
  }
  // moss speckle + grit: thousands of flecks, hard contrast
  for (let i = 0; i < 7000; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => {
      const pick = r();
      g.fillStyle = pick > 0.62 ? `rgba(196,214,150,${0.10 + r() * 0.22})` : pick > 0.3 ? `rgba(70,92,50,${0.12 + r() * 0.22})` : `rgba(16,16,14,${0.12 + r() * 0.2})`;
      g.beginPath(); g.ellipse(xx, yy, 1.8 + r() * 3.2, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
    });
  }
  // pale lichen rings on the stones
  for (let i = 0; i < 130; i++) {
    const x = r() * S, y = r() * S, rad = 3 + r() * 7;
    wrapDraw(S, x, y, rad + 3, (xx, yy) => {
      g.strokeStyle = `rgba(206,210,188,${0.25 + r() * 0.3})`; g.lineWidth = 1.6;
      g.beginPath(); g.arc(xx, yy, rad, 0, 7); g.stroke();
    });
  }
});
/** ICE SHEET: pale blue-white with crack veins, trapped bubbles
 *  and a sparkle grain — reads frozen at any opacity. */
const iceTex = () => ctex("islandiaIce", 1024, 1024, (g, r) => {
  const S = 1024;
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, "#dceef8"); grad.addColorStop(0.5, "#c4e0f2"); grad.addColorStop(1, "#a9cde8");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { // bubbles + frost grain
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.10 + r() * 0.25})` : `rgba(120,160,200,${0.08 + r() * 0.16})`;
    g.beginPath(); g.arc(r() * S, r() * S, 0.8 + r() * 2.4, 0, 7); g.fill();
  }
  // crack veins: branching pale polylines
  g.strokeStyle = "rgba(250,253,255,0.75)"; g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    let x = r() * S, y = r() * S;
    g.lineWidth = 1.4 + r() * 1.8;
    g.beginPath(); g.moveTo(x, y);
    const segs = 3 + Math.floor(r() * 4);
    for (let j = 0; j < segs; j++) { x += (r() - 0.5) * 190; y += (r() - 0.5) * 190; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 500; i++) { // sparkle
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    g.fillRect(r() * S, r() * S, 2, 2);
  }
});
/** SNOW: white with blue-grey shadow speckle for caps + glacier */
const snowTex = () => ctex("islandiaSnow", 512, 512, (g, r) => {
  g.fillStyle = "#eef4fa"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(150,180,215,${0.08 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 44, 8 + r() * 22, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "168,196,226"},${0.10 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
});
/** BASALT ROCK: near-black with vertical column streaks */
const basaltTex = () => ctex("islandiaBasalt", 512, 512, (g, r) => {
  g.fillStyle = "#3d3d3c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 320; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.42 ? `rgba(14,14,13,${0.14 + r() * 0.2})` : `rgba(150,148,138,${0.10 + r() * 0.14})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "190,186,170" : "10,10,10"},${0.05 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** CORRUGATED IRON: vertical ribs with light/shadow alternation —
 *  the Reykjavík house skin, tinted per house. */
const corrugatedTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const gr = g.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, "rgba(255,255,255,0.20)"); gr.addColorStop(0.45, "rgba(255,255,255,0.02)");
    gr.addColorStop(0.8, "rgba(0,0,0,0.16)"); gr.addColorStop(1, "rgba(0,0,0,0.28)");
    g.fillStyle = gr; g.fillRect(x, 0, 16, 256);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "20,20,20"},${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** shore gravel: grey-brown pebble speckle */
const gravelTex = () => ctex("islandiaGravel", 512, 512, (g, r) => {
  g.fillStyle = "#6d675c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "168,160,146" : "52,50,46"},${0.12 + r() * 0.22})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 4.4, 1.6 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
/** soft warm light pool for sunlit variation on the field */
const patchTex = () => ctex("islandiaPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("islandiaBark", 256, 256, (g, r) => {
  g.fillStyle = "#6e5138"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(40,26,14,${0.16 + r() * 0.22})` : `rgba(206,172,130,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("islandiaBlob", 256, 256, (g) => {
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

/** A Reykjavík house: corrugated-iron walls in a saturated
 *  colour, dark pitched roof, white-framed windows with sky
 *  glints, a door with a step and lamp, a low hedge in front.
 *  Front faces +Z. (Adapted from the house builder pattern.) */
const makeHouse = (wallMat: THREE.MeshLambertMaterial, roofMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, roofH: number) => {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.6) / 2);
  const roofM = new THREE.Mesh(roofGeo, roofMat);
  roofM.position.y = wallH - 0.05; roofM.castShadow = true; g.add(roofM);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallMat);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    g.add(tri);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, d + 0.65, 8), lam2({ color: "#2c2f33" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, wallH + roofH - 0.02, 0); ridge.castShadow = true; g.add(ridge);
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#33526e" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.55 });
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
  }
  const doorX = w > 6 ? 0 : w / 3.2;
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.1, 0.09), frameM);
  dfr.position.set(doorX, 1.02, d / 2 + 0.03); g.add(dfr);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.1), lam2({ color: "#26303a" }));
  door.position.set(doorX, 0.95, d / 2 + 0.05); g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
  knob.position.set(doorX + 0.36, 0.95, d / 2 + 0.12); g.add(knob);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.55), lam2({ color: "#8f8a80" }));
  step.position.set(doorX, 0.07, d / 2 + 0.3); step.receiveShadow = true; g.add(step);
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.55 }));
  lampGlass.position.set(doorX + 0.85, 2.16, d / 2 + 0.3); g.add(lampGlass);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), lam2({ color: "#5a5e63" }));
  chim.position.set(w / 4, wallH + roofH * 0.7, 0); chim.castShadow = true; g.add(chim);
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.5, 0.38),
    lam2({ color: "#46682f", map: rep(foliageTex("islandiaFoliageHedge"), 3, 1) }));
  hedge.position.set(0, 0.27, d / 2 + 1.4); hedge.castShadow = true; g.add(hedge);
  return g;
};

/** The church: a tall pale tower with a steep dark spire and a
 *  clock face — the skyline anchor west of the houses. */
const makeChurch = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(corrugatedTex("islandiaChurchWall", "#e8e4da"), 2, 3) });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4.4, 11.5, 4.4), wallM);
  tower.position.y = 5.75; tower.castShadow = true; g.add(tower);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7.5, 4), lam2({ color: "#37404a" }));
  spire.position.y = 15.2; spire.rotation.y = Math.PI / 4; spire.castShadow = true; g.add(spire);
  const clockF = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), lam2({ color: "#f2ead6" }));
  clockF.position.set(0, 8.8, 2.22); g.add(clockF);
  const winM = lam2({ color: "#33526e" });
  for (const wy of [3.6, 6.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), winM);
    win.position.set(0, wy, 2.22); g.add(win);
  }
  const nave = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 5.2), wallM);
  nave.position.set(3.4, 2.1, 0); nave.castShadow = true; g.add(nave);
  const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.4, 4), lam2({ color: "#37404a" }));
  naveRoof.position.set(3.4, 5.4, 0); naveRoof.rotation.y = Math.PI / 4; naveRoof.scale.set(1.25, 1, 0.9); g.add(naveRoof);
  return g;
};

/** The volcano: a broad basalt cone, snow cap, flat crater —
 *  and a permanent smoke plume (sprites, animated in update). */
const makeVolcano = () => {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(27, 17, 24, 1, true), lam2({ map: rep(basaltTex(), 6, 2) }));
  cone.position.y = 8.5; g.add(cone);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(11.5, 7.2, 24, 1, true), lam2({ map: rep(snowTex(), 4, 1) }));
  cap.position.y = 13.6; g.add(cap);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), lam2({ color: "#2c2c2b" }));
  crater.rotation.x = -Math.PI / 2; crater.position.y = 16.9; g.add(crater);
  return g;
};

/** A neighbour islet: a low basalt dome with a moss top — the
 *  kind of place that, unlike Iceland, boils with mosquitoes. */
const makeIslet = (seed: number) => {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 18, 12), lam2({ map: rep(basaltTex(), 4, 2) }));
  dome.scale.set(1.25, 0.32, 0.8); dome.position.y = -0.6; g.add(dome);
  const top = new THREE.Mesh(new THREE.CircleGeometry(8.2, 18), lam2({ map: rep(mossLavaTex(), 6, 6) }));
  top.rotation.x = -Math.PI / 2; top.position.y = 1.55; top.scale.set(1.2, 0.78, 1); g.add(top);
  void seed;
  return g;
};

/** The 1986 flight: a simple airliner — white fuselage, red
 *  cheatline, swept wings, tail fin. Flies only in shot 7. */
const makePlane = () => {
  const g = new THREE.Group();
  const white = lam2({ color: "#eef1f4" });
  const red = lam2({ color: "#c8352e" });
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.4, 12), white);
  fus.rotation.z = Math.PI / 2; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 9), white);
  nose.position.x = 3.2; nose.scale.x = 1.5; g.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.565, 0.565, 5.6, 12, 1, true), red);
  stripe.rotation.z = Math.PI / 2; stripe.position.y = 0.08; g.add(stripe);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 6.8), white);
  wing.position.set(-0.3, -0.25, 0); wing.rotation.y = 0.18; g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), red);
  tail.position.set(-3.3, 0.75, 0); tail.rotation.z = 0.35; g.add(tail);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 2.6), white);
  stab.position.set(-3.3, 0.25, 0); g.add(stab);
  return g;
};

/** A sparse northern tree: bark trunk + layered flecked canopy
 *  (same anti-flat recipe as the house style). */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "islandiaFoliageDeep"),
    folM(greens[0], "islandiaFoliageMid"),
    folM(greens[1] ?? greens[0], "islandiaFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.34;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
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
 *  vertex-coloured dark base -> sunlit tip. Instanced. */
const grassTuftGeo = () => {
  const tr = rng(4242);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#3c5222"), tip = new THREE.Color("#a8c46a"), tmp = new THREE.Color();
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
  private fog = new THREE.Fog("#b8cfe8", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private iceSheet: THREE.Mesh | null = null;
  private iceMat: THREE.MeshBasicMaterial | null = null;
  private plane: THREE.Group;
  private smoke: THREE.Sprite[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private reeds: { m: THREE.Mesh; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2025);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#77875f", 0.55);
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
    this.buildShore(R, r);
    // ---- the volcano, smoking behind the houses ----
    const volc = makeVolcano();
    volc.position.set(VOLCANO[0], 0, VOLCANO[2]);
    R.add(volc);
    for (let i = 0; i < 5; i++) {
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
      sm.position.set(VOLCANO[0], 19 + i * 2.2, VOLCANO[2]);
      sm.scale.set(10 + i * 2.4, 7 + i * 1.6, 1);
      sm.layers.set(NOINK); R.add(sm); this.smoke.push(sm);
    }
    // ---- glacier ridge far north-west: white lumps on the horizon ----
    const snowM = lam2({ map: rep(snowTex(), 3, 1) });
    for (let i = 0; i < 6; i++) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(9 + (i % 3) * 3.5, 14, 10), snowM);
      lump.scale.set(1.5, 0.42, 0.8);
      lump.position.set(-72 + i * 13, 0.5, -98 - (i % 2) * 8);
      R.add(lump);
    }
    // ---- the 1986 flight (hidden until shot 7) ----
    this.plane = makePlane();
    this.plane.visible = false;
    R.add(this.plane);
  }

  // ---------------- the lakeshore: field, lake, houses, church ----------------
  private buildShore(R: THREE.Group, r: () => number) {
    // the lava field under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(mossLavaTex(), 130, 130) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // gravel apron under the lake so the shore has a rim
    const apron = new THREE.Mesh(new THREE.CircleGeometry(13.4, 36), lam2({ map: rep(gravelTex(), 8, 8) }));
    apron.rotation.x = -Math.PI / 2; apron.position.set(LAKE_C[0], 0.0, LAKE_C[2]);
    apron.scale.set(1.18, 0.88, 1); apron.receiveShadow = true; R.add(apron);
    // the lake itself: deep blue, gently scrolling (map kept)
    const lakeMap = rep(water(), 7, 5);
    this.waterMap = lakeMap;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(11.6, 40), lam2({ map: lakeMap, color: "#5d94c4" }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE_C[0], 0.03, LAKE_C[2]);
    lake.scale.set(1.18, 0.88, 1); lake.receiveShadow = true; R.add(lake);
    // THE ICE SHEET: same ellipse, animated from story.iceAt —
    // scale grows from the centre as coverage rises
    this.iceMat = new THREE.MeshBasicMaterial({ map: iceTex(), transparent: true, opacity: 0, depthWrite: false });
    this.iceSheet = new THREE.Mesh(new THREE.CircleGeometry(11.3, 40), this.iceMat);
    this.iceSheet.rotation.x = -Math.PI / 2; this.iceSheet.position.set(LAKE_C[0], 0.055, LAKE_C[2]);
    this.iceSheet.renderOrder = 2; this.iceSheet.visible = false; R.add(this.iceSheet);
    // basalt boulders ringing the shore + scattered on the field
    const rockM = lam2({ map: rep(basaltTex(), 1, 1) });
    const rockAt = (x: number, z: number, s: number) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(x, s * 0.42, z);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
    };
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + r() * 0.2;
      rockAt(LAKE_C[0] + Math.cos(a) * 13.1, LAKE_C[2] + Math.sin(a) * 9.6, 0.35 + r() * 0.55);
    }
    for (let i = 0; i < 14; i++) rockAt((r() - 0.5) * 90, 14 - r() * 90, 0.5 + r() * 1.1);
    // shore reeds: pale northern grasses at the waterline
    const reedM = lam2({ color: "#8a9a58" });
    const reedM2 = lam2({ color: "#a8a468" });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + r() * 0.25;
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8 + r() * 0.6, 5), i % 2 ? reedM : reedM2);
      reed.position.set(LAKE_C[0] + Math.cos(a) * 12.2, 0.4, LAKE_C[2] + Math.sin(a) * 9.0);
      R.add(reed);
      this.reeds.push({ m: reed, ph: i * 0.83 });
    }
    // ---- colourful houses along the far shore, fronts to the lake ----
    const houseCols: [string, string][] = [
      ["#c8352e", "islandiaHouseRed"], ["#2e6da8", "islandiaHouseBlue"], ["#e8b62e", "islandiaHouseYellow"],
      ["#e8e4da", "islandiaHouseWhite"], ["#3d7a44", "islandiaHouseGreen"],
    ];
    const roofM = lam2({ map: rep(roof("#3a3f46"), 2, 1) });
    const houseXs = [-17.5, -10.5, -3.5, 3.5, 17.5];
    houseXs.forEach((hx, i) => {
      const [col, key] = houseCols[i % houseCols.length];
      const wallM = lam2({ map: rep(corrugatedTex(key, col), 2, 1) });
      const w = 6.2 + (i % 3) * 0.8, d = 5.0 + (i % 2) * 0.7;
      const h = makeHouse(wallM, roofM, w, d, 2.9 + (i % 3) * 0.25, 2.3 + (i % 2) * 0.4);
      h.position.set(hx, 0, -26 - (i % 2) * 1.5);
      R.add(h);
      blob(R, hx, 0.03, -26 - (i % 2) * 1.5, w + 2.5, d + 2.5, 0.28);
    });
    // the church west of the houses
    const church = makeChurch();
    church.position.set(-25.5, 0, -30);
    church.rotation.y = 0.22;
    R.add(church);
    // the institute east: a bigger grey house — the jar's home.
    // A stone pedestal in front of it carries the specimen jar
    // (the jar itself is a cast sprite at JAR_POS).
    const instWall = lam2({ map: rep(corrugatedTex("islandiaInstitute", "#9aa0a4"), 2, 1) });
    const inst = makeHouse(instWall, roofM, 7.6, 5.8, 3.4, 2.6);
    inst.position.set(12.5, 0, -25.5);
    inst.scale.setScalar(1.15);
    R.add(inst);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.55, 10), lam2({ map: rep(basaltTex(), 1, 1) }));
    pedestal.position.set(JAR_POS[0], 0.27, JAR_POS[2]); pedestal.castShadow = true; pedestal.receiveShadow = true; R.add(pedestal);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.0), lam2({ color: "#8f8a80" }));
    slab.position.set(JAR_POS[0], 0.6, JAR_POS[2]); slab.receiveShadow = true; R.add(slab);
    // ---- neighbour islets far north (shot 2's swarm hosts) ----
    for (const [ix, , iz] of ISLETS) {
      const isl = makeIslet(3);
      isl.position.set(ix, 0, iz);
      R.add(isl);
    }
    // ---- sparse trees: a few behind the houses + field edges ----
    const greens = ["#4a7a3a", "#5d9247", "#3c6630"];
    const treeSpots: [number, number, number][] = [
      [-20.5, -20, 3.6], [7.6, -21.5, 3.2], [-7.8, -31.5, 4.2], [21.5, -19, 3.8],
      [-14.5, 10, 3.4], [15.5, 12, 3.9], [-24, -6, 4.4], [26, -8, 3.5],
    ];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 30 + i * 11);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.71 });
    });
    // tone layering on the field: warm sun pools + cool shade pools
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (8 + r() * 16), 0.02, 8 - r() * 60, 5 + r() * 6, 6 + r() * 8, 0.13 + r() * 0.09, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#4a5a3a", s * (9 + r() * 15), 0.021, 6 - r() * 55, 5 + r() * 5, 6 + r() * 6, 0.16 + r() * 0.08, r() * 3);
    }
    // ---- instanced grass tufts over the field (never in the lake) ----
    const inLake = (x: number, z: number) => ((x - LAKE_C[0]) / 13.4) ** 2 + ((z - LAKE_C[2]) / 9.9) ** 2 < 1.12;
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 1500; i++) {
      const x = (r() - 0.5) * 110, z = 18 - r() * 105;
      if (inLake(x, z)) continue;
      tuftPts.push({ x, z, s: 0.7 + r() * 0.85 });
    }
    for (let i = 0; i < 260; i++) { // dense fringe hugging the shore
      const a = r() * Math.PI * 2;
      const x = LAKE_C[0] + Math.cos(a) * (13.6 + r() * 1.6), z = LAKE_C[2] + Math.sin(a) * (10.1 + r() * 1.2);
      tuftPts.push({ x, z, s: 0.9 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.21 + (r() - 0.5) * 0.05, 0.32, 0.82 + (r() - 0.5) * 0.22);
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
    // lake water breathes (slow texture drift, not a poster)
    if (this.waterMap) this.waterMap.offset.set(tt * 0.008, tt * 0.005);
    // THE ICE SHEET follows the story: freeze-thaw in shot 4,
    // the killing freeze in shot 5, one stable sheet in shot 6
    if (this.iceSheet && this.iceMat) {
      const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      const ice = iceAt(id, U);
      this.iceSheet.visible = ice.cov > 0.01;
      if (this.iceSheet.visible) {
        const k = 0.22 + 0.78 * ice.cov;
        this.iceSheet.scale.set(1.18 * k, 0.88 * k, 1);
        this.iceMat.opacity = ice.op;
      }
    }
    // the 1986 flight crosses only in shot 7
    const pl = planeAt(tt);
    if (pl) {
      this.plane.visible = true;
      this.plane.position.set(pl.x, pl.y, pl.z);
      this.plane.rotation.z = Math.sin(tt * 2.2) * 0.02;
    } else this.plane.visible = false;
    // volcano smoke: puffs rise, swell and drift east, looping
    this.smoke.forEach((sm, i) => {
      const ph = (tt * 0.11 + i * 0.21) % 1;
      sm.position.set(VOLCANO[0] + ph * 15 + Math.sin(tt * 0.7 + i) * 1.2, 19 + ph * 10, VOLCANO[2]);
      const sc2 = 9 + ph * 13;
      sm.scale.set(sc2, sc2 * 0.68, 1);
      (sm.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - ph * 0.75);
    });
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
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
    // shore reeds sway
    for (const rd of this.reeds) {
      rd.m.rotation.z = Math.sin(tt * 1.9 + rd.ph) * 0.09;
      rd.m.rotation.x = Math.cos(tt * 1.5 + rd.ph) * 0.05;
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
