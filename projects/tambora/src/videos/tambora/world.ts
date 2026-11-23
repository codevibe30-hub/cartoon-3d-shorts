// Gunung Tambora, Sumbawa as one three.js scene for the
// Fafnir-ID short: a giant stratovolcano tearing itself apart
// over a dry savanna village — ash column, lava fountains,
// lightning in the plume — plus the three far sets of the 1816
// aftermath: a northern village buried in July snow, a dead
// wheat field, and a gothic villa in a night storm. Sets are
// built far apart and toggled visible per shot. VISUAL CORE:
// textured everything (anti-banding: speckled sky, flecked
// savanna, strata rock), layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, VOLCANO_POS, CRATER_Y, clamp01 } from "./story";

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
const skyTexDay = () => ctex("tamboraSkyDay2", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("tamboraGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("tamboraBirds", 256, 96, (g, r) => {
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
/** RICH savanna (anti-flat pass): the old lawn read as one
 *  neon-lime sheet — its strokes sat too close in value to the
 *  base, so the x1.5 sun lift ironed them flat. This one is built
 *  like the canopy texture that already reads well: deep shadow
 *  pockets, a mid-green body, sunlit fleck clusters and thousands
 *  of individual blades in five greens with hard value contrast,
 *  on a deeper base that survives the lift without going neon. */
const grassRichTex = () => ctex("tamboraGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#7d7031"; g.fillRect(0, 0, S, S);
  // large organic value blotches: shaded hollows + sunlit rises
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "74,62,24" : "178,158,84";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // leaf-fleck speckle, same recipe as the canopy: lit flecks
  // over deep shadow pockets, thousands of them
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(196,240,150,${0.10 + r() * 0.20})` : `rgba(24,56,16,${0.10 + r() * 0.22})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  // individual blades: five greens, hard contrast, slight lean
  const blades = ["#5c5222", "#77682c", "#94813a", "#bfa856", "#dcc987"];
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
  // drawn tuft glyphs: little dark-rooted fans that read as clumps
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, h = 9 + r() * 10;
    wrapDraw(S, x, y, 18, (xx, yy) => {
      for (let b = -2; b <= 2; b++) {
        g.strokeStyle = b % 2 ? "#a8934e" : "#6b5c26"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  // sparse soil flecks + a few tiny wildflowers in the texture
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
  const flw = ["#fff6da", "#ffd94d", "#f6a8c0", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases and bush feet: warm brown speckled
 *  with darker clods and pale grit, never a flat sticker */
const soilTex = () => ctex("tamboraSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("tamboraPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("tamboraBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for the plain-walled houses */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const thatchTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // woven straw: dense near-vertical strokes, light over dark —
  // round 2: stronger contrast so the weave reads at distance
  for (let i = 0; i < 6800; i++) {
    const x = r() * 512, y = r() * 512, l = 10 + r() * 26;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,230,165" : "36,22,8"},${0.09 + r() * 0.16})`;
    g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + l); g.stroke();
  }
  // horizontal binding bands of a laid thatch roof, each with a
  // soft shadow gradient under it so the courses stack in depth
  for (let y = 42; y < 512; y += 62) {
    const sh = g.createLinearGradient(0, y, 0, y + 22);
    sh.addColorStop(0, "rgba(28,17,6,0.42)"); sh.addColorStop(1, "rgba(28,17,6,0)");
    g.fillStyle = sh; g.fillRect(0, y, 512, 22);
    g.fillStyle = "rgba(255,232,170,0.20)"; g.fillRect(0, y - 3, 512, 3);
  }
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
const blobTex = () => ctex("tamboraBlob", 256, 256, (g) => {
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

/** A thatched Dutch farmhouse: brick or plaster walls, steep
 *  woven-thatch gable roof, white-framed windows, a flower box.
 *  Front faces +Z; yaw it toward the canal when placing. */
const makeHouse = (wallMat: THREE.MeshLambertMaterial, roofMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, roofH: number) => {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  // gable roof: a triangular prism, extruded along the depth
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.45, 0); shape.lineTo(w / 2 + 0.45, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.7) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = wallH - 0.05; roof.castShadow = true; g.add(roof);
  // gable infill above the front/back walls (wall colour triangles)
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallMat);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    tri.castShadow = false; g.add(tri);
  }
  // ridge cap + white gable trim boards tracing the front slopes
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
  // windows: dark glass, white frames, cross muntins, shutters,
  // a painted sky glint, and a flower box on the front
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#3d5a78" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.55 });
  const shutterM = lam2({ color: "#2e5d3a" });
  const winXs = w > 6 ? [-w / 4, w / 4] : [0];
  for (const wx of winXs) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.5, 0.1), frameM);
    fr.position.set(wx, wallH * 0.55, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.12), glassM);
    gl.position.set(wx, wallH * 0.55, d / 2 + 0.04); g.add(gl);
    // cross muntins over the glass
    const mv = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 0.03), frameM);
    mv.position.set(wx, wallH * 0.55, d / 2 + 0.11); g.add(mv);
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.03), frameM);
    mh.position.set(wx, wallH * 0.55, d / 2 + 0.11); g.add(mh);
    // diagonal sky glint on the pane
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.85), glintM);
    glint.position.set(wx - 0.18, wallH * 0.55 + 0.05, d / 2 + 0.105); glint.rotation.z = 0.5; g.add(glint);
    // louvred shutters flanking the window
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.44, 0.06), shutterM);
      sh.position.set(wx + s * 0.82, wallH * 0.55, d / 2 + 0.05); sh.rotation.y = s * 0.16; g.add(sh);
    }
    // flower box under the window: red + pink geranium dots
    const boxF = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.3), lam2({ color: "#6a4a2c" }));
    boxF.position.set(wx, wallH * 0.55 - 0.95, d / 2 + 0.16); g.add(boxF);
    const cols = ["#d83a4a", "#e86a9a", "#e8542e", "#f2f0e6"];
    for (let i = 0; i < 6; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lam2({ color: cols[i % cols.length] }));
      fl.position.set(wx - 0.5 + i * 0.2, wallH * 0.55 - 0.78, d / 2 + 0.2); g.add(fl);
    }
  }
  // door: white frame, panelled leaf, stone step, knob, wall lamp
  const doorX = w > 6 ? 0 : w / 3.2;
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.1, 0.09), frameM);
  dfr.position.set(doorX, 1.02, d / 2 + 0.03); g.add(dfr);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.1), lam2({ color: "#2e5d3a" }));
  door.position.set(doorX, 0.95, d / 2 + 0.05); g.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.03), lam2({ color: "#26502f" }));
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
  // chimney with a cap slab
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.55), lam2({ color: "#8a4a3a" }));
  chim.position.set(w / 4, wallH + roofH * 0.72, 0); chim.castShadow = true; g.add(chim);
  const chimCap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.75), lam2({ color: "#6e463c" }));
  chimCap.position.set(w / 4, wallH + roofH * 0.72 + 0.58, 0); g.add(chimCap);
  // front garden: a clipped hedge, a white picket fence and a
  // flower bed between the house and the towpath (local +Z front)
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.55, 0.4),
    lam2({ color: "#4d7d33", map: rep(foliageTex("tamboraFoliageHedge"), 3, 1) }));
  hedge.position.set(0, 0.3, d / 2 + 1.55); hedge.castShadow = true; g.add(hedge);
  const picketM = lam2({ color: "#f2eee4" });
  const nPick = Math.floor(w / 0.55);
  for (let i = 0; i <= nPick; i++) {
    if (Math.abs(-w / 2 + i * 0.55 - doorX) < 0.8) continue; // gate gap at the door
    const pk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.04), picketM);
    pk.position.set(-w / 2 + i * 0.55, 0.31, d / 2 + 2.15); g.add(pk);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.05), picketM);
  rail.position.set(0, 0.48, d / 2 + 2.15); g.add(rail);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.1, 0.5), lam2({ color: "#4c3826" }));
  bed.position.set(0, 0.06, d / 2 + 0.95); g.add(bed);
  const bcols = ["#d83a4a", "#e8c832", "#e86a9a", "#f2f0e6", "#e8542e"];
  for (let i = 0; i < 14; i++) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), lam2({ color: bcols[i % bcols.length] }));
    fl.position.set(-w * 0.38 + (i / 13) * w * 0.76, 0.2, d / 2 + 0.95 + (i % 2 ? 0.1 : -0.1)); g.add(fl);
  }
  return g;
};

/** A tree with a REAL canopy (round-2 anti-flat pass): a bark-
 *  textured trunk with angled branches, and 9-13 overlapping
 *  foliage blobs in three depth layers — deep shadow green low,
 *  mid green main mass, sunlit flecks on top — all carrying a
 *  leaf-fleck texture so no surface is a smooth ball again.
 *  Silhouettes are jittered per seed: organic, never lollipops. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "tamboraFoliageDeep"),
    folM(greens[0], "tamboraFoliageMid"),
    folM(greens[1] ?? greens[0], "tamboraFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  // branches reaching into the canopy
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.3, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.52, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  // shadow underlayer, main mass, sunlit crown — in that order
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
 *  vertex-coloured dark base -> sunlit tip. Instanced all over
 *  the banks so lawn edges stop being ruler-straight lines. */
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


// ---------------- Tambora textures ----------------
/** Volcano rock: dark strata bands, ash-grey weathering streaks
 *  running downhill, speckle — never a smooth grey cone. */
const rockTex = () => ctex("tamboraRock", 512, 512, (g, r) => {
  g.fillStyle = "#6e5a49"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 26 + r() * 30) { // strata bands
    g.fillStyle = `rgba(${r() > 0.5 ? "46,36,28" : "146,124,100"},${0.07 + r() * 0.11})`;
    g.fillRect(0, y, 512, 5 + r() * 12);
  }
  for (let i = 0; i < 130; i++) { // weathering streaks downhill
    const x = r() * 512, y = r() * 400, l = 40 + r() * 110;
    g.strokeStyle = `rgba(${r() > 0.45 ? "30,24,18" : "178,158,132"},${0.10 + r() * 0.16})`;
    g.lineWidth = 2 + r() * 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 9, y + l); g.stroke();
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "24,18,12" : "196,176,148"},${0.05 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});
/** Snow: near-white with blue shadow pockets and sparkle grit. */
const snowTex = () => ctex("tamboraSnow", 512, 512, (g, r) => {
  g.fillStyle = "#e9eef4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(166,186,214,${0.05 + r() * 0.09})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 42, 8 + r() * 22, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; g.fillRect(r() * 512, r() * 512, 1.7, 1.7); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(140,160,190,${0.10 + r() * 0.14})`; g.fillRect(r() * 512, r() * 512, 1.6, 1.6); }
});
/** Lava crust: black basalt plates floating on orange fire —
 *  for the crater lake disc. */
const lavaTex = () => ctex("tamboraLava", 256, 256, (g, r) => {
  g.fillStyle = "#ff7a22"; g.fillRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 150);
  gr.addColorStop(0, "rgba(255,226,140,0.9)"); gr.addColorStop(0.55, "rgba(255,150,40,0.25)"); gr.addColorStop(1, "rgba(214,70,10,0.35)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { // crust plates
    g.fillStyle = `rgba(26,16,12,${0.5 + r() * 0.4})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 22, 5 + r() * 13, r() * 3, 0, 7); g.fill();
  }
});
/** A jagged lightning bolt with a hot core (256x384), drawn for
 *  the ash column and the villa storm. */
const boltTex = () => ctex("tamboraBolt", 256, 384, (g) => {
  const pts: [number, number][] = [[150, 4], [118, 96], [142, 104], [96, 208], [122, 216], [74, 330], [88, 336], [150, 224], [124, 214], [168, 108], [140, 100], [178, 6]];
  const draw = (w: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  };
  draw(17, "rgba(190,205,255,0.35)"); draw(7, "rgba(230,238,255,0.8)"); draw(3, "#ffffff");
  // a side branch
  g.strokeStyle = "rgba(230,238,255,0.65)"; g.lineWidth = 3.5; g.beginPath();
  g.moveTo(122, 216); g.lineTo(176, 268); g.lineTo(164, 276); g.lineTo(206, 330); g.stroke();
});
/** A snow-dusted pine: trunk + three foliage cones, each capped
 *  by a slightly smaller white cone so the snow sits ON the
 *  branches instead of replacing them. */
const makePine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 733 + 5);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#8a6a4c" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h * 0.3, 7), trunkM);
  trunk.position.y = h * 0.15; trunk.castShadow = true; g.add(trunk);
  const folM = lam2({ color: "#3d6a42", map: rep(foliageTex("tamboraFoliagePine"), 1, 1) });
  const snowM = lam2({ color: "#eef2f6", map: rep(snowTex(), 1, 1) });
  const tiers: [number, number, number][] = [[0.34, 0.52, 0.30], [0.58, 0.40, 0.27], [0.80, 0.27, 0.24]];
  for (const [ty, tr2, th] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * tr2, h * th, 9), folM);
    cone.position.y = h * ty; cone.rotation.y = tr() * 3; cone.castShadow = true; g.add(cone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(h * tr2 * 0.8, h * th * 0.52, 9), snowM);
    cap.position.y = h * ty + h * th * 0.20; cap.rotation.y = cone.rotation.y + 0.3; g.add(cap);
  }
  return g;
};
/** A bare dead tree: trunk splitting into crooked empty branches
 *  — the wheat field and the villa hill share the silhouette. */
const makeBareTree = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 3);
  const m = lam2({ map: rep(barkTex(), 1, 2), color: "#7a6248" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.17, h * 0.62, 7), m);
  trunk.position.y = h * 0.31; trunk.rotation.z = (tr() - 0.5) * 0.09; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + tr() * 1.2, len = h * (0.3 + tr() * 0.16);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, len, 5), m);
    br.position.set(Math.cos(a) * len * 0.3, h * (0.58 + tr() * 0.14), Math.sin(a) * len * 0.3);
    br.rotation.set(Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85);
    g.add(br);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, len * 0.55, 4), m);
    tw.position.set(Math.cos(a) * len * 0.62, h * (0.72 + tr() * 0.16), Math.sin(a) * len * 0.62);
    tw.rotation.set(Math.sin(a) * 1.15, 0, Math.cos(a) * 1.15);
    g.add(tw);
  }
  return g;
};

const ASH_PAL = { lit: "#9a9186", mid: "#6b6359", shade: "#3d372f" };
const hash1 = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private skyMat: THREE.MeshBasicMaterial;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private dummy = new THREE.Object3D();
  // ---- sets ----
  private setVolcano = new THREE.Group();
  private setSnow = new THREE.Group();
  private setField = new THREE.Group();
  private setVilla = new THREE.Group();
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private glows: THREE.Sprite[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private wheatMesh: THREE.InstancedMesh | null = null;
  private wheatData: { x: number; z: number; s: number; yaw: number }[] = [];
  private pumice: { m: THREE.Mesh; ph: number; y0: number }[] = [];
  private ashClouds: { sp: THREE.Sprite; x: number; y: number; w: number; ph: number }[] = [];
  private darkSky: THREE.Sprite[] = [];
  private lavaDisc: THREE.MeshLambertMaterial | null = null;
  private fountain: THREE.InstancedMesh | null = null;
  private fountainSeed: { a: number; h: number; ph: number; sp: number }[] = [];
  private flowBlobs: { m: THREE.Mesh; az: number; ph: number }[] = [];
  private rings: THREE.Mesh[] = [];
  private bolts: THREE.Sprite[] = [];
  private villaBolt: THREE.Sprite | null = null;
  private ashFall: THREE.InstancedMesh | null = null;
  private ashSeed: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private snowFall: THREE.InstancedMesh | null = null;
  private snowSeed: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private rain: THREE.InstancedMesh | null = null;
  private rainSeed: { x: number; y: number; z: number; sp: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1815);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + day clouds + sun (shared, tinted per shot) ----
    this.skyMat = new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false });
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18), this.skyMat);
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
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow); this.glows.push(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core); this.glows.push(core);
    // the DIM SUN of 1816: a huge pale disc hanging over the
    // volcano set, only shown in shot 5 — the light that failed
    const dimSun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.55, color: "#d8cfc0" }));
    dimSun.position.set(-20, 52, -290); dimSun.scale.set(150, 150, 1); dimSun.layers.set(NOINK);
    dimSun.name = "dimSun"; R.add(dimSun); this.glows.push(dimSun);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    R.add(this.setVolcano, this.setSnow, this.setField, this.setVilla);
    this.buildVolcanoSet(r);
    this.buildSnowSet(r);
    this.buildFieldSet(r);
    this.buildVillaSet(r);
  }

  // ---------------- (A) the volcano set ----------------
  private buildVolcanoSet(r: () => number) {
    const G = this.setVolcano;
    // savanna plain under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(430, 36), lam2({ map: rep(grassRichTex(), 150, 150), color: "#cfc096" }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; G.add(land);
    // ---- THE MOUNTAIN: a jittered stratovolcano cone ----
    const coneGeo = new THREE.CylinderGeometry(7.5, 58, CRATER_Y, 96, 12, true);
    {
      // smooth gully displacement: continuous around the cone so
      // the silhouette stays organic without faceted tears
      const pos = coneGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const th = Math.atan2(z, x), v = (y + CRATER_Y / 2) / CRATER_Y;
        const k = 1 + 0.045 * Math.sin(th * 7 + v * 3.1) + 0.03 * Math.sin(th * 13 + 1.7) + 0.02 * Math.sin(th * 23 + v * 9.0);
        pos.setX(i, x * k); pos.setZ(i, z * k);
      }
      coneGeo.computeVertexNormals();
    }
    const cone = new THREE.Mesh(coneGeo, lam2({ map: rep(rockTex(), 10, 4), color: "#a39890" }));
    cone.position.set(VOLCANO_POS[0], CRATER_Y / 2, VOLCANO_POS[2]);
    cone.castShadow = true; cone.receiveShadow = true; G.add(cone);
    // crater rim + the lava lake inside
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(7.4, 1.15, 9, 28), lam2({ map: rep(rockTex(), 6, 1), color: "#8d7a64" }));
    rim2.rotation.x = Math.PI / 2; rim2.position.set(VOLCANO_POS[0], CRATER_Y + 0.4, VOLCANO_POS[2]); rim2.castShadow = true; G.add(rim2);
    this.lavaDisc = new THREE.MeshLambertMaterial({ map: lavaTex(), emissive: "#ff5a14", emissiveIntensity: 1.6, emissiveMap: lavaTex(), color: "#3a1408" });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(7.3, 24), this.lavaDisc);
    lake.rotation.x = -Math.PI / 2; lake.position.set(VOLCANO_POS[0], CRATER_Y + 0.25, VOLCANO_POS[2]); G.add(lake);
    // glowing flow blobs that RUN down the slopes (3 gullies)
    const flowM = new THREE.MeshLambertMaterial({ color: "#2a0f04", emissive: "#ff6a1e", emissiveIntensity: 2.0 });
    for (let i = 0; i < 26; i++) {
      const az = [0.3, 0.95, 1.5][i % 3] + (r() - 0.5) * 0.22;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.55 + r() * 0.75, 8, 6), flowM);
      b.scale.y = 0.55;
      G.add(b);
      this.flowBlobs.push({ m: b, az, ph: r() });
    }
    // lava fountain: instanced fire drops arcing out of the crater
    const fGeo = new THREE.SphereGeometry(0.34, 7, 6);
    const fMat = new THREE.MeshLambertMaterial({ color: "#2a0f04", emissive: "#ff7a26", emissiveIntensity: 2.3 });
    this.fountain = new THREE.InstancedMesh(fGeo, fMat, 42);
    this.fountain.frustumCulled = false; G.add(this.fountain);
    for (let i = 0; i < 42; i++) this.fountainSeed.push({ a: r() * Math.PI * 2, h: 5 + r() * 7, ph: r(), sp: 0.4 + r() * 0.35 });
    // shockwave rings breathing out of the crater
    const ringM = () => new THREE.MeshBasicMaterial({ color: "#fff2d8", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 48), ringM());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(VOLCANO_POS[0], CRATER_Y + 2, VOLCANO_POS[2]);
      ring.layers.set(NOINK); G.add(ring); this.rings.push(ring);
    }
    // ---- the ash column: stacked billowing cloud sprites ----
    for (let i = 0; i < 12; i++) {
      const w = 17 + i * 5.2;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(700 + i * 53, ASH_PAL), transparent: true, depthWrite: false, fog: false, opacity: 0.96 }));
      const x = VOLCANO_POS[0] + (r() - 0.5) * 7, y = CRATER_Y + 5 + i * 6.4, z = VOLCANO_POS[2] + (r() - 0.5) * 7;
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.52, 1); sp.layers.set(NOINK); G.add(sp);
      this.ashClouds.push({ sp, x, y, w, ph: i * 0.83 });
    }
    for (let i = 0; i < 5; i++) { // the stratospheric canopy
      const w = 95 + r() * 55;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(900 + i * 71, ASH_PAL), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      const x = VOLCANO_POS[0] + (i - 2) * 34 + (r() - 0.5) * 14, y = 122 + r() * 12, z = VOLCANO_POS[2] + (r() - 0.5) * 16;
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.3, 1); sp.layers.set(NOINK); G.add(sp);
      this.ashClouds.push({ sp, x, y, w, ph: 4 + i * 1.13 });
    }
    // the black noon sky of shot 4/5: huge dark veils overhead
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(1100 + i * 47, { lit: "#4c463f", mid: "#35312b", shade: "#211e1a" }), transparent: true, depthWrite: false, fog: false, opacity: 0.97 }));
      sp.position.set((i - 1.5) * 55, 74 + (i % 2) * 14, -120 - (i % 3) * 22);
      sp.scale.set(190, 62, 1); sp.layers.set(NOINK); sp.visible = false; G.add(sp);
      this.darkSky.push(sp);
    }
    // lightning inside the plume
    for (const [bx, by, bs] of [[-7, 84, 15], [8, 66, 11]] as [number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: boltTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
      sp.position.set(bx, by, VOLCANO_POS[2] + 4); sp.scale.set(bs * 0.62, bs, 1); sp.layers.set(NOINK); sp.visible = false; G.add(sp);
      this.bolts.push(sp);
    }
    // ---- hero's rocky ridge in the near foreground ----
    const knoll = new THREE.Mesh(new THREE.SphereGeometry(7.5, 18, 12), lam2({ map: rep(grassRichTex(), 4, 4), color: "#cbb98a" }));
    knoll.scale.set(1.25, 0.14, 1); knoll.position.set(0, -0.15, 12); knoll.receiveShadow = true; G.add(knoll);
    const rockM = lam2({ map: rep(rockTex(), 1, 1), color: "#a08b6e" });
    [[4.6, 9.0, 1.0], [-2.8, 11.6, 1.15], [5.8, 12.6, 0.75], [-3.6, 8.6, 0.7]].forEach(([x, z, s], i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(x, s * 0.22, z); rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; rock.receiveShadow = true; G.add(rock);
      void i;
    });
    // ---- the village at the mountain's foot ----
    const wallMats = [
      lam2({ map: rep(brickTex("tamboraBrickA", "#9c4f38"), 2, 1) }),
      lam2({ map: rep(plasterTex("tamboraPlasterA", "#f0e6d2"), 2, 1) }),
      lam2({ map: rep(brickTex("tamboraBrickB", "#7a4a42"), 2, 1) }),
      lam2({ map: rep(plasterTex("tamboraPlasterB", "#e8dcc4"), 2, 1) }),
    ];
    const roofMats = [
      lam2({ map: rep(thatchTex("tamboraThatchA", "#8a6a34"), 2, 1) }),
      lam2({ map: rep(thatchTex("tamboraThatchB", "#77572c"), 2, 1) }),
    ];
    const greens = ["#6a8a3a", "#7da24a", "#55702f"];
    const treePts: [number, number][] = [];
    const houseAt = (side: number, x: number, z: number, i: number) => {
      const w = 6.2 + (i % 3) * 0.8, d = 5.0 + (i % 2) * 0.7, wallH = 2.8 + (i % 3) * 0.25, roofH = 2.4 + (i % 2) * 0.5;
      const h = makeHouse(wallMats[i % wallMats.length], roofMats[i % roofMats.length], w, d, wallH, roofH);
      h.position.set(x, 0.05, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 + 0.2 : Math.PI / 2 - 0.2;
      G.add(h);
      const t = makeTree(3.8 + (i % 3) * 0.7, greens, i * 7 + (side > 0 ? 3 : 11));
      t.position.set(x + side * 3.4, 0.05, z + (i % 2 ? 4.2 : -4.4));
      G.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + (side > 0 ? 0.7 : 2.4) });
      treePts.push([t.position.x, t.position.z]);
      blob(G, x, 0.08, z, w + 2.5, d + 2.5, 0.30);
    };
    houseAt(1, 19, -42, 0); houseAt(1, 24, -56, 1); houseAt(-1, -18, -48, 2); houseAt(-1, -24, -62, 3); houseAt(1, 17, -64, 4);
    const extraTrees: [number, number, number][] = [[11, -34, 4.4], [-11, -38, 5.0], [13, -72, 4.2], [-13, -76, 4.8], [30, -38, 3.8], [-31, -44, 4.4]];
    extraTrees.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.05, z); G.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      treePts.push([x, z]);
    });
    // dirt path from the ridge down to the village
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 52), lam2({ map: rep(cobble(), 1, 18), color: "#bfae8e" }));
    path.rotation.x = -Math.PI / 2; path.position.set(0.6, 0.06, -12); path.receiveShadow = true; G.add(path);
    // background ridge hills closing the horizon
    for (const [hx, hz, hr, hh2] of [[-78, -158, 42, 25], [88, -168, 50, 31], [-30, -185, 60, 20]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh2, 20), lam2({ map: rep(rockTex(), 6, 2), color: "#97836c" }));
      hill.position.set(hx, hh2 / 2 - 0.5, hz); G.add(hill);
    }
    // ---- the bay to the east, with pumice rafts ----
    const seaMap = rep(water(), 12, 14);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(170, 200), lam2({ map: seaMap, color: "#79b7c9" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(132, -0.06, -58); sea.receiveShadow = true; G.add(sea);
    const shore = new THREE.Mesh(new THREE.PlaneGeometry(11, 200), lam2({ map: rep(soilTex(), 2, 40), color: "#d8c49a" }));
    shore.rotation.x = -Math.PI / 2; shore.position.set(44, -0.02, -58); shore.receiveShadow = true; G.add(shore);
    const pumM = lam2({ color: "#8d8578", map: rep(rockTex(), 1, 1) });
    for (let i = 0; i < 18; i++) {
      const px = 54 + r() * 30, pz = -12 - r() * 85;
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 1.5, 9), pumM);
      p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 3; p.position.set(px, 0.02, pz); G.add(p);
      this.pumice.push({ m: p, ph: i * 1.31, y0: 0.02 });
    }
    // ---- savanna grass tufts: fringes + scatter ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 110, z = 16 - r() * 105;
      if (Math.abs(x) < 3.4 && z < 14 && z > -38) continue;        // keep the path clear
      if (Math.hypot(x - VOLCANO_POS[0], z - VOLCANO_POS[2]) < 52) continue; // not on the cone
      tuftPts.push({ x, z, s: 0.8 + r() * 0.9 });
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      tuftPts.push({ x: tx + Math.cos(a) * d, z: tz + Math.sin(a) * d, s: 0.8 + r() * 0.7 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide, color: "#d9c287" }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.04, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.11 + (r() - 0.5) * 0.03, 0.32, 0.85 + (r() - 0.5) * 0.2);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; G.add(tufts);
    this.tuftMesh = tufts;
    // ---- falling ash (shots 4-5): a grey snow of cinders ----
    const aGeo = new THREE.PlaneGeometry(0.1, 0.1);
    const aMat = new THREE.MeshBasicMaterial({ color: "#a49c8e", transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    this.ashFall = new THREE.InstancedMesh(aGeo, aMat, 320);
    this.ashFall.frustumCulled = false; this.ashFall.visible = false; G.add(this.ashFall);
    for (let i = 0; i < 320; i++) this.ashSeed.push({ x: (r() - 0.5) * 68, y: r() * 42, z: 16 - r() * 100, sp: 1.0 + r() * 0.9, ph: r() * 6.28 });
  }

  // ---------------- (B) the snow set: July 1816, New England ----------------
  private buildSnowSet(r: () => number) {
    const G = this.setSnow, X = 320;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 120), lam2({ map: rep(snowTex(), 26, 20) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(X, 0, -38); ground.receiveShadow = true; G.add(ground);
    // houses with snow-loaded roofs
    const wallMats = [
      lam2({ map: rep(brickTex("tamboraBrickS", "#8a4a3a"), 2, 1) }),
      lam2({ map: rep(plasterTex("tamboraPlasterS", "#e6ddca"), 2, 1) }),
    ];
    const snowRoof = lam2({ map: rep(snowTex(), 2, 1), color: "#f4f7fa" });
    const houseAt = (x: number, z: number, i: number, yaw: number) => {
      const h = makeHouse(wallMats[i % 2], snowRoof, 6.4, 5.2, 2.9, 2.4);
      h.position.set(x, 0.02, z); h.rotation.y = yaw; G.add(h);
      blob(G, x, 0.04, z, 9, 7.5, 0.22);
      // drifts piled against the walls
      for (let j = 0; j < 3; j++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.8, 10, 8), lam2({ map: rep(snowTex(), 1, 1) }));
        d.scale.y = 0.42;
        d.position.set(x + (r() - 0.5) * 6.4, 0.05, z + (r() - 0.5) * 5.4);
        d.receiveShadow = true; G.add(d);
      }
    };
    houseAt(X - 13, -46, 0, 0.25); houseAt(X + 12, -50, 1, -0.2); houseAt(X - 4, -62, 2, 0.05);
    // pines everywhere, snow on every branch
    const pinePts: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const x = X + (r() - 0.5) * 76, z = -8 - r() * 66;
      if (Math.hypot(x - X, z + 30) < 9) continue;
      const p = makePine(4.6 + r() * 2.6, i * 3 + 1);
      p.position.set(x, 0, z); G.add(p);
      this.trees.push({ g: p, ph: 2.2 + i * 1.47 });
      pinePts.push([x, z]);
    }
    // a horse-drawn sleigh, abandoned mid-path (the horses are gone)
    const sleigh = new THREE.Group();
    const slM = lam2({ color: "#7a3a2e", map: rep(planks(), 1, 1) });
    const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 2.6), slM); bed2.position.y = 0.55; bed2.castShadow = true; sleigh.add(bed2);
    for (const s of [1, -1]) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 3.1), lam2({ color: "#4c4438" }));
      runner.position.set(s * 0.72, 0.16, 0); sleigh.add(runner);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), slM);
      post.position.set(s * 0.72, 0.36, 0.9); sleigh.add(post);
      const post2 = post.clone(); post2.position.z = -0.9; sleigh.add(post2);
    }
    sleigh.position.set(X - 2.5, 0, -33); sleigh.rotation.y = 0.5; G.add(sleigh);
    blob(G, X - 2.5, 0.03, -33, 2.6, 3.6, 0.3);
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(1.1 + r() * 1.6, 10, 8), lam2({ map: rep(snowTex(), 1, 1) }));
      d.scale.y = 0.3;
      d.position.set(X + (r() - 0.5) * 34, 0.02, -14 - r() * 30);
      d.receiveShadow = true; G.add(d);
    }
    // falling snow
    const sGeo = new THREE.CircleGeometry(0.075, 6);
    const sMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    this.snowFall = new THREE.InstancedMesh(sGeo, sMat, 300);
    this.snowFall.frustumCulled = false; G.add(this.snowFall);
    for (let i = 0; i < 300; i++) this.snowSeed.push({ x: X + (r() - 0.5) * 52, y: r() * 26, z: -2 - r() * 58, sp: 0.75 + r() * 0.7, ph: r() * 6.28 });
  }

  // ---------------- (C) the field set: the failed harvest ----------------
  private buildFieldSet(r: () => number) {
    const G = this.setField, X = -320;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(95, 28), lam2({ map: rep(soilTex(), 30, 30), color: "#b39d6e" }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(X, -0.04, -38); ground.receiveShadow = true; G.add(ground);
    // the dead wheat: thousands of dry tufts gone grey-gold
    const wPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 1500; i++) {
      const x = X + (r() - 0.5) * 74, z = -14 - r() * 58;
      if (Math.abs(x - X) < 2.6 && z > -44) continue; // the path stays clear
      wPts.push({ x, z, s: 1.15 + r() * 0.8 });
    }
    const wheat = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide, color: "#c2b28c" }), wPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    wPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(p.s, p.s * 1.5, p.s); dummy.updateMatrix();
      wheat.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.1 + (r() - 0.5) * 0.02, 0.18 + r() * 0.14, 0.8 + (r() - 0.5) * 0.22);
      wheat.setColorAt(i, tint);
      this.wheatData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    wheat.receiveShadow = true; wheat.frustumCulled = false; G.add(wheat);
    this.wheatMesh = wheat;
    // the path the draisine will roll down
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 46), lam2({ map: rep(cobble(), 1, 16), color: "#b3a184" }));
    path.rotation.x = -Math.PI / 2; path.position.set(X, 0.03, -24); path.receiveShadow = true; G.add(path);
    // the market stall: posts, a sagging canopy, EMPTY crates
    const stall = new THREE.Group();
    const postM = lam2({ color: "#6e5136", map: rep(barkTex(), 1, 1) });
    for (const [px, pz] of [[-2.2, -1.4], [2.2, -1.4], [-2.2, 1.4], [2.2, 1.4]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 7), postM);
      post.position.set(px, 1.3, pz); post.castShadow = true; stall.add(post);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 3.8), lam2({ color: "#9a4a3a", map: rep(planks(), 2, 1) }));
    canopy.position.y = 2.68; canopy.rotation.z = 0.05; canopy.castShadow = true; stall.add(canopy);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 1.1), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
    counter.position.set(0, 0.45, 1.2); counter.castShadow = true; stall.add(counter);
    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), lam2({ color: "#a87c4c", map: rep(planks(), 1, 1) }));
      crate.position.set(-1.6 + i * 1.5, 1.12, 1.2); crate.rotation.y = r() * 0.5; crate.castShadow = true; stall.add(crate);
    }
    stall.position.set(X + 8.5, 0, -47); stall.rotation.y = -0.35; G.add(stall);
    blob(G, X + 8.5, 0.02, -47, 6.4, 5, 0.3);
    // one bare tree + a broken fence along the path
    const bt = makeBareTree(5.2, 7); bt.position.set(X - 13, 0, -52); G.add(bt);
    this.trees.push({ g: bt, ph: 4.4 });
    const bt2 = makeBareTree(4.4, 12); bt2.position.set(X + 16, 0, -30); G.add(bt2);
    this.trees.push({ g: bt2, ph: 5.9 });
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), postM);
      post.position.set(X - 3.4, 0.45, -10 - i * 5.2); post.rotation.z = (r() - 0.5) * 0.14; post.castShadow = true; G.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 27), postM);
    rail.position.set(X - 3.4, 0.78, -23); rail.rotation.x = 0.01; G.add(rail);
  }

  // ---------------- (D) the villa set: Frankenstein's storm ----------------
  private buildVillaSet(r: () => number) {
    const G = this.setVilla, Z = 380;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 28), lam2({ map: rep(grassRichTex(), 34, 34), color: "#5d7050" }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.06, 356); ground.receiveShadow = true; G.add(ground);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(48, 9.5, 24), lam2({ map: rep(grassRichTex(), 12, 6), color: "#66785a" }));
    hill.position.set(0, 2.4, Z + 6); hill.receiveShadow = true; G.add(hill);
    // the villa: grey stone, steep slate roof, a tower, lit windows
    const villa = new THREE.Group();
    const stoneM = lam2({ map: rep(brickTex("tamboraBrickV", "#7d7a72"), 2, 2), color: "#b9b4a8" });
    const main = new THREE.Mesh(new THREE.BoxGeometry(13, 8.5, 9), stoneM);
    main.position.y = 4.25; main.castShadow = true; main.receiveShadow = true; villa.add(main);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-7.1, 0); roofShape.lineTo(7.1, 0); roofShape.lineTo(0, 4.6); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 9.8, bevelEnabled: false });
    roofGeo.translate(0, 0, -4.9);
    const roof = new THREE.Mesh(roofGeo, lam2({ color: "#2e3238", map: rep(planks(), 3, 2) }));
    roof.position.y = 8.45; roof.castShadow = true; villa.add(roof);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 12.5, 10), stoneM);
    tower.position.set(-7.6, 6.25, 1.5); tower.castShadow = true; villa.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.9, 5.2, 10), lam2({ color: "#23262c" }));
    spire.position.set(-7.6, 15.1, 1.5); spire.castShadow = true; villa.add(spire);
    // glowing windows (MeshBasic: they burn through the night grade)
    const winM = new THREE.MeshBasicMaterial({ color: "#ffc978" });
    const winD = new THREE.MeshBasicMaterial({ color: "#4a3a26" });
    const winAt = (x: number, y: number, lit: boolean) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.5), lit ? winM : winD);
      w.position.set(x, y, -4.53); w.rotation.y = Math.PI; villa.add(w);
      const mv = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.03), lam2({ color: "#2c2620" }));
      mv.position.set(x, y, -4.56); villa.add(mv);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.07, 0.03), lam2({ color: "#2c2620" }));
      mh.position.set(x, y, -4.56); villa.add(mh);
    };
    winAt(-4.2, 5.6, true); winAt(-1.4, 5.6, false); winAt(1.4, 5.6, true); winAt(4.2, 5.6, true);
    winAt(-4.2, 2.4, false); winAt(4.2, 2.4, true);
    const towerWin = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), winM);
    towerWin.position.set(-7.6, 9.6, -0.85); towerWin.rotation.y = Math.PI + 0.35; villa.add(towerWin);
    // the doorway the monster stands in: a dark arch on the front
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.1, 0.18), lam2({ color: "#14100c" }));
    door.position.set(0, 1.55, -4.55); villa.add(door);
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), lam2({ color: "#8d867a" }));
    step.position.set(0, 0.11, -5.1); villa.add(step);
    villa.position.set(0, 5.0, Z);
    G.add(villa);
    // the path up the hill + dead trees + a leaning fence
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 20), lam2({ map: rep(cobble(), 1, 7), color: "#8d8474" }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.03, 342); path.receiveShadow = true; G.add(path);
    [[-9, 362, 5.6], [10.5, 358, 4.8], [-13, 344, 5.2], [14, 338, 4.4]].forEach(([x, z, h], i) => {
      const t = makeBareTree(h, 21 + i * 5);
      t.position.set(x, 0.4, z); G.add(t);
      this.trees.push({ g: t, ph: 6.3 + i * 1.31 });
    });
    // lightning over the villa
    const bolt = new THREE.Sprite(new THREE.SpriteMaterial({ map: boltTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    bolt.position.set(-17, 30, 366); bolt.scale.set(11, 17, 1); bolt.layers.set(NOINK); bolt.visible = false; G.add(bolt);
    this.villaBolt = bolt;
    // rain: instanced streaks slanting through the storm
    const rGeo = new THREE.BoxGeometry(0.022, 0.72, 0.022);
    const rMat = new THREE.MeshBasicMaterial({ color: "#aebfd4", transparent: true, opacity: 0.5, depthWrite: false });
    this.rain = new THREE.InstancedMesh(rGeo, rMat, 260);
    this.rain.frustumCulled = false; G.add(this.rain);
    for (let i = 0; i < 260; i++) this.rainSeed.push({ x: (r() - 0.5) * 54, y: r() * 30, z: 322 + r() * 62, sp: 12 + r() * 5 });
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
    // ---- per-shot set + sky management ----
    const DAYISH = id === 1 || id === 2 || id === 3 || id === 6 || id === 7 || id === 8 || id === 10;
    this.setVolcano.visible = id <= 5 || id === 10;
    this.setSnow.visible = id === 6;
    this.setField.visible = id === 7 || id === 8;
    this.setVilla.visible = id === 9;
    const SKY_TINT: Record<number, string> = { 1: "#ffffff", 2: "#ffffff", 3: "#f2f4ff", 4: "#78828e", 5: "#969da3", 6: "#e9eff5", 7: "#ffd9b0", 8: "#ffffff", 9: "#2e4266", 10: "#ffffff" };
    this.skyMat.color.set(SKY_TINT[id] ?? "#ffffff");
    this.skyDay.visible = true;
    for (const cl of this.clouds) cl.visible = DAYISH;
    this.glows.forEach((g2, i) => { g2.visible = i === 2 ? id === 5 : DAYISH; });
    for (const b2 of this.birds) b2.visible = id === 1 || id === 2 || id === 10;
    for (const d2 of this.darkSky) d2.visible = id === 4 || id === 5;
    if (this.ashFall) this.ashFall.visible = id === 4 || id === 5;
    // ---------------- STANDAR GERAK: everything alive, moves ----------------
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.04, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.08, p.yaw, Math.cos(tt * 1.35 + ph) * 0.08);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    if (this.wheatMesh) {
      const d = this.dummy, tm = this.wheatMesh;
      this.wheatData.forEach((p, i) => {
        const ph = p.x * 0.4 + p.z * 0.35;
        d.position.set(p.x, 0, p.z);
        d.rotation.set(Math.sin(tt * 1.1 + ph) * 0.035, p.yaw, Math.cos(tt * 0.9 + ph) * 0.035);
        d.scale.set(p.s, p.s * 1.5, p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
    // ---- the eruption itself (volcano set) ----
    if (this.setVolcano.visible) {
      for (const a of this.ashClouds) {
        a.sp.position.x = a.x + Math.sin(tt * 0.3 + a.ph) * 1.6 + tt * 0.22;
        a.sp.position.y = a.y + Math.sin(tt * 0.45 + a.ph * 1.7) * 0.8;
        const w = a.w * (1 + 0.05 * Math.sin(tt * 0.6 + a.ph));
        a.sp.scale.set(w, w * (a.y > 100 ? 0.3 : 0.52), 1);
      }
      if (this.lavaDisc) this.lavaDisc.emissiveIntensity = 1.6 + 0.4 * Math.sin(tt * 2.3);
      if (this.fountain) {
        const d = this.dummy;
        this.fountainSeed.forEach((sd, i) => {
          const u = (tt * sd.sp + sd.ph) % 1;
          const rad = 0.6 + u * 3.6;
          d.position.set(VOLCANO_POS[0] + Math.cos(sd.a) * rad, CRATER_Y + 0.6 + sd.h * Math.sin(u * Math.PI), VOLCANO_POS[2] + Math.sin(sd.a) * rad);
          d.scale.setScalar(1.15 - u * 0.65);
          d.rotation.set(0, 0, 0); d.updateMatrix();
          this.fountain!.setMatrixAt(i, d.matrix);
        });
        this.fountain.instanceMatrix.needsUpdate = true;
      }
      for (const fb of this.flowBlobs) {
        const u = (tt * 0.1 + fb.ph) % 1;
        const rad = 8.5 + u * 43;
        fb.m.position.set(VOLCANO_POS[0] + Math.cos(fb.az) * rad, CRATER_Y - 0.5 - u * (CRATER_Y - 2.5), VOLCANO_POS[2] + Math.sin(fb.az) * rad);
        const sc2 = 0.8 + u * 0.9;
        fb.m.scale.set(sc2, 0.55 * sc2, sc2);
      }
      this.rings.forEach((ring, i) => {
        const u = (tt * 0.4 + i / 3) % 1;
        const sc2 = 2 + u * 30;
        ring.scale.set(sc2, sc2, 1);
        ring.position.y = CRATER_Y + 2 + u * 7;
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - u) * (id === 3 ? 0.55 : 0.28);
      });
      const boltOn = id === 1 || id === 2 || id === 3 || id === 10;
      this.bolts.forEach((b2, i) => { b2.visible = boltOn && hash1(Math.floor(tt * 22) + i * 7.3) > 0.84; });
      for (const p of this.pumice) {
        p.m.position.y = p.y0 + Math.sin(tt * 1.2 + p.ph) * 0.03;
        p.m.rotation.z = Math.sin(tt * 0.5 + p.ph) * 0.2;
      }
      if (this.ashFall && this.ashFall.visible) {
        const d = this.dummy;
        this.ashSeed.forEach((sd, i) => {
          const y = ((sd.y - tt * sd.sp * 2.3) % 42 + 42) % 42;
          d.position.set(sd.x + Math.sin(tt * 0.8 + sd.ph) * 1.1, y, sd.z);
          d.rotation.set(tt * 0.7 + sd.ph, sd.ph, tt * 0.5);
          d.scale.setScalar(1); d.updateMatrix();
          this.ashFall!.setMatrixAt(i, d.matrix);
        });
        this.ashFall.instanceMatrix.needsUpdate = true;
      }
    }
    // ---- snowfall (snow set) ----
    if (this.setSnow.visible && this.snowFall) {
      const d = this.dummy;
      this.snowSeed.forEach((sd, i) => {
        const y = ((sd.y - tt * sd.sp * 1.7) % 26 + 26) % 26;
        d.position.set(sd.x + Math.sin(tt * 0.9 + sd.ph) * 0.8, y, sd.z);
        d.rotation.set(0, 0, Math.sin(tt * 0.6 + sd.ph) * 0.4);
        d.scale.setScalar(1); d.updateMatrix();
        this.snowFall!.setMatrixAt(i, d.matrix);
      });
      this.snowFall.instanceMatrix.needsUpdate = true;
    }
    // ---- rain + lightning (villa set) ----
    if (this.setVilla.visible) {
      if (this.rain) {
        const d = this.dummy;
        this.rainSeed.forEach((sd, i) => {
          const y = ((sd.y - tt * sd.sp) % 30 + 30) % 30;
          d.position.set(sd.x + (30 - y) * 0.05, y, sd.z);
          d.rotation.set(0, 0, 0.16);
          d.scale.setScalar(1); d.updateMatrix();
          this.rain!.setMatrixAt(i, d.matrix);
        });
        this.rain.instanceMatrix.needsUpdate = true;
      }
      if (this.villaBolt) {
        const on = hash1(Math.floor(tt * 18) + 99.7) > 0.8;
        this.villaBolt.visible = on;
        if (on) this.hemi.intensity = Lp.hemiI + 0.55;
      }
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
