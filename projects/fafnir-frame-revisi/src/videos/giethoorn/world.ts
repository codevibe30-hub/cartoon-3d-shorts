// Giethoorn, Belanda as one three.js scene for the Fafnir-ID
// cover frame: a village with NO roads at all — a green canal
// for a main street, thatched-roof farmhouses on both banks,
// an arched wooden bridge, and boats doing every job a car does
// anywhere else. The hero's wooden boat floats in the near
// foreground with the hero standing in it, shocked at the size
// of the claim. VISUAL CORE: bright Dutch daylight, emerald
// water, saturated greens, red-brown thatch and brick — textured
// everything (anti-banding: speckled sky, flecked water, woven
// thatch). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_BOAT, BRIDGE_Z, clamp01, heroBoatAt } from "./story";

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
const skyTexDay = () => ctex("giethoornSkyDay2", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("giethoornGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("giethoornBirds", 256, 96, (g, r) => {
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
/** RICH grass (round-3 anti-flat pass): the old lawn read as one
 *  neon-lime sheet — its strokes sat too close in value to the
 *  base, so the x1.5 sun lift ironed them flat. This one is built
 *  like the canopy texture that already reads well: deep shadow
 *  pockets, a mid-green body, sunlit fleck clusters and thousands
 *  of individual blades in five greens with hard value contrast,
 *  on a deeper base that survives the lift without going neon. */
const grassRichTex = () => ctex("giethoornGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c8433"; g.fillRect(0, 0, S, S);
  // large organic value blotches: shaded hollows + sunlit rises
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
  // drawn tuft glyphs: little dark-rooted fans that read as clumps
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
const soilTex = () => ctex("giethoornSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("giethoornPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("giethoornBark", 256, 256, (g, r) => {
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
const blobTex = () => ctex("giethoornBlob", 256, 256, (g) => {
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
    lam2({ color: "#4d7d33", map: rep(foliageTex("giethoornFoliageHedge"), 3, 1) }));
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

/** A low wooden canal boat (a "punter"): flat bottom, flared
 *  plank sides, bench seats. Bow toward +Z. The HERO boat uses
 *  plain Lambert materials on purpose: the house two-tone shade
 *  multiplier (day shade ~[0.3,0.29,0.36]) crushes its camera-
 *  facing panels into dark violet-brown, while the brief wants
 *  the hero hull warm + bright — real sun + hemisphere light on
 *  a warm amber albedo keeps it timber in light AND shade. */
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

/** The arched wooden bridge over the canal at BRIDGE_Z: deck
 *  segments climbing a parabola, post-and-rail sides. */
const makeBridge = () => {
  const g = new THREE.Group();
  const deckM = lam2({ map: rep(planks(), 3, 1), color: "#c79a67" });
  const postM = lam2({ color: "#7d5a36" });
  const N = 11, span = 12.4, peak = 2.45;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), x = -span / 2 + u * span;
    const y = 0.55 + peak * (1 - ((x / (span / 2)) ** 2));
    const seg = new THREE.Mesh(new THREE.BoxGeometry(span / N + 0.25, 0.14, 2.6), deckM);
    seg.position.set(x, y, 0);
    seg.rotation.z = Math.atan2(-2 * peak * x / ((span / 2) ** 2), 1);
    seg.castShadow = true; seg.receiveShadow = true; g.add(seg);
    if (prev) {
      for (const s of [1, -1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(prev.distanceTo(new THREE.Vector3(x, y, 0)) + 0.15, 0.09, 0.09), postM);
        rail.position.set((prev.x + x) / 2, (prev.y + y) / 2 + 0.85, s * 1.22);
        rail.rotation.z = Math.atan2(y - prev.y, x - prev.x); g.add(rail);
      }
    }
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.9, 0.11), postM);
      post.position.set(x, y + 0.45, s * 1.22); g.add(post);
    }
    prev = new THREE.Vector3(x, y, 0);
  }
  // flower boxes hanging on the railing + lanterns at both ends
  const fcols = ["#d83a4a", "#e86a9a", "#e8c832", "#f2f0e6"];
  for (const fx of [-3.4, 0, 3.4]) {
    const fy = 0.55 + peak * (1 - ((fx / (span / 2)) ** 2));
    for (const s of [1, -1]) {
      const boxF = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 0.26), postM);
      boxF.position.set(fx, fy + 0.78, s * 1.38); g.add(boxF);
      for (let i = 0; i < 5; i++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), lam2({ color: fcols[(i + (s > 0 ? 1 : 0)) % fcols.length] }));
        fl.position.set(fx - 0.44 + i * 0.22, fy + 0.95, s * 1.4); g.add(fl);
      }
    }
  }
  for (const e of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.7, 7), postM);
    post.position.set(e * (span / 2 + 0.4), 1.35, 1.35); post.castShadow = true; g.add(post);
    const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7),
      new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.7 }));
    lampGlass.position.set(e * (span / 2 + 0.4), 2.3, 1.35); g.add(lampGlass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 8), postM);
    cap.position.set(e * (span / 2 + 0.4), 2.48, 1.35); g.add(cap);
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
    folM(greens[2] ?? greens[0], "giethoornFoliageDeep"),
    folM(greens[0], "giethoornFoliageMid"),
    folM(greens[1] ?? greens[0], "giethoornFoliageLite"),
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
  private pads: { m: THREE.Mesh; ph: number; z0: number }[] = [];
  private mooredBoats: { g: THREE.Group; ph: number }[] = [];
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
    // (down -Z, low enough to sit in the upper frame) — round 1
    // scattered them all around the compass at heights the lens
    // never saw, leaving a bare sky. Layered near -> far.
    const cloudSpots: [number, number, number, number][] = [
      // x, y, z, width — kept modest: accents in the sky, not a
      // white ceiling (round 2a sprites at 190-260 wide ate the
      // whole upper frame)
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
    // the sun's halo + core, upper left down the canal
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant bird flocks, small + high (round 2a parked one
    // right over the claim card, where it read as a scratch)
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildVillage(R, r);
    // ---- the hero's boat in the near foreground ----
    // round 2: the hull albedo goes warm + bright (raw timber
    // amber) — round 1's deep brown multiplied through the
    // blue-violet shade tone and read as dark purple plastic.
    this.heroBoat = makeBoat("#c47a3d", 4.6, 1.5, true);
    this.heroBoat.position.set(HERO_BOAT[0], 0.02, HERO_BOAT[2]);
    this.heroBoat.rotation.y = -0.28;
    // lived-in props: a punt pole shipped along the gunwale, a
    // coil of rope, and a crate of tulips on the foredeck
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 4.4, 7), lam2({ color: "#8a6844", map: rep(barkTex(), 1, 3) }));
    pole.rotation.x = Math.PI / 2 - 0.06; pole.position.set(-0.52, 0.78, -0.2); this.heroBoat.add(pole);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 20), lam2({ color: "#c9b18a" }));
    rope.rotation.x = Math.PI / 2; rope.position.set(0.42, 0.68, 1.55); this.heroBoat.add(rope);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.62), lam2({ color: "#c99058", map: rep(planks(), 1, 1) }));
    crate.position.set(-0.3, 0.82, 1.7); crate.rotation.y = 0.3; crate.castShadow = true; this.heroBoat.add(crate);
    const tulipCols = ["#d83a4a", "#e8c832", "#e86a9a"];
    for (let i = 0; i < 5; i++) {
      const sx = -0.3 + (i % 3 - 1) * 0.17, sz = 1.7 + (Math.floor(i / 3) - 0.5) * 0.2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 5), lam2({ color: "#3d7a32" }));
      stem.position.set(sx, 1.12, sz); this.heroBoat.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lam2({ color: tulipCols[i % 3] }));
      head.position.set(sx, 1.3, sz); head.scale.y = 1.25; this.heroBoat.add(head);
    }
    R.add(this.heroBoat);
    this.heroBlob = blob(R, HERO_BOAT[0], 0.06, HERO_BOAT[2], 3.4, 5.6, 0.35);
  }

  // ---------------- the village: canal, banks, houses, bridge ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the canal: emerald water running away down -Z (map kept so
    // update() can scroll it — the water FLOWS, it is not a poster)
    const canalMap = rep(water(), 3, 60);
    this.waterMap = canalMap;
    const canal = new THREE.Mesh(new THREE.PlaneGeometry(8, 170), lam2({ map: canalMap, color: "#7fc4a8" }));
    canal.rotation.x = -Math.PI / 2; canal.position.set(0, 0, -52); canal.receiveShadow = true; R.add(canal);
    // soft reflection bands: the houses' and sky's colour smeared
    // on the water along both banks + the bridge's dark mirror
    const reflM = (col: string, op: number) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false });
    for (const s of [1, -1]) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 168), reflM("#27567f", 0.15));
      band.rotation.x = -Math.PI / 2; band.position.set(s * 2.9, 0.015, -52); band.renderOrder = 1; R.add(band);
    }
    const bridgeRefl = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7), reflM("#1d3a4a", 0.26));
    bridgeRefl.rotation.x = -Math.PI / 2; bridgeRefl.position.set(0, 0.017, BRIDGE_Z); bridgeRefl.renderOrder = 1; R.add(bridgeRefl);
    // lily pads with flowers drifting at the waterline
    const padM = lam2({ color: "#3e7d31" });
    const padM2 = lam2({ color: "#4c9140" });
    for (let i = 0; i < 16; i++) {
      const s = i % 2 ? 1 : -1;
      const px = s * (3.0 + r() * 0.7), pz = 14 - i * 6.4 - r() * 3.5;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.26 + r() * 0.22, 10), i % 2 ? padM : padM2);
      pad.rotation.x = -Math.PI / 2; pad.rotation.z = r() * 3; pad.position.set(px, 0.03, pz); R.add(pad);
      this.pads.push({ m: pad, ph: i * 1.37, z0: pz });
      if (i % 3 === 0) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), lam2({ color: i % 6 === 0 ? "#f2f0e6" : "#e86a9a" }));
        fl.position.set(px + 0.1, 0.1, pz + 0.08); fl.scale.y = 0.8; R.add(fl);
      }
    }
    // grass banks + cobbled towpaths (footpaths — still no roads)
    for (const s of [1, -1]) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(13, 170), lam2({ map: rep(grassRichTex(), 5, 60) }));
      bank.rotation.x = -Math.PI / 2; bank.position.set(s * 10.5, 0.1, -52); bank.receiveShadow = true; R.add(bank);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 170), lam2({ map: rep(cobble(), 1, 60), color: "#cbbfa6" }));
      path.rotation.x = -Math.PI / 2; path.position.set(s * 4.85, 0.14, -52); path.receiveShadow = true; R.add(path);
      // stone edging where lawn meets water
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 170), lam2({ color: "#9a958c" }));
      edge.position.set(s * 4.05, 0.05, -52); R.add(edge);
      // reed tufts along the waterline
      const reedM = lam2({ color: "#4a7a3a" });
      for (let i = 0; i < 42; i++) {
        const reed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7 + r() * 0.5, 5), reedM);
        reed.position.set(s * (3.8 + r() * 0.3), 0.35, 24 - i * 3.6 - r() * 2);
        R.add(reed);
        this.reeds.push({ m: reed, ph: i * 0.83 + (s > 0 ? 2.1 : 0) });
      }
    }
    // ---- thatched houses lining both banks, fronts to the water ----
    const wallMats = [
      lam2({ map: rep(brickTex("giethoornBrickA", "#9c4f38"), 2, 1) }),
      lam2({ map: rep(plasterTex("giethoornPlasterA", "#f0e6d2"), 2, 1) }),
      lam2({ map: rep(brickTex("giethoornBrickB", "#7a4a42"), 2, 1) }),
      lam2({ map: rep(plasterTex("giethoornPlasterB", "#e8dcc4"), 2, 1) }),
      lam2({ map: rep(brickTex("giethoornBrickC", "#a86a44"), 2, 1) }),
    ];
    const roofMats = [
      lam2({ map: rep(thatchTex("giethoornThatchA", "#8a6a34"), 2, 1) }),
      lam2({ map: rep(thatchTex("giethoornThatchB", "#77572c"), 2, 1) }),
      lam2({ map: rep(thatchTex("giethoornThatchC", "#96753c"), 2, 1) }),
    ];
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treePts: [number, number][] = [];   // (x, z) of every near tree — grass dressing anchors
    const houseZs: [number, number][] = [];   // (side, z) of every house
    const houseAt = (side: number, z: number, i: number) => {
      const w = 6.4 + (i % 3) * 0.9, d = 5.2 + (i % 2) * 0.8, wallH = 2.9 + (i % 3) * 0.25, roofH = 2.5 + (i % 2) * 0.5;
      const h = makeHouse(wallMats[i % wallMats.length], roofMats[i % roofMats.length], w, d, wallH, roofH);
      h.position.set(side * 10.6, 0.1, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      const t = makeTree(3.6 + (i % 3) * 0.7, greens, i * 7 + (side > 0 ? 3 : 11));
      t.position.set(side * (7.6 + (i % 2) * 1.4), 0.1, z + (i % 2 ? 3.4 : -3.6));
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + (side > 0 ? 0.7 : 2.4) });
      treePts.push([t.position.x, t.position.z]); houseZs.push([side, z]);
      blob(R, side * 10.6, 0.13, z, w + 2.5, d + 2.5, 0.30);
    };
    [-4, -19, -49, -64, -82].forEach((z, i) => houseAt(1, z, i));
    [-11, -26, -56, -73, -90].forEach((z, i) => houseAt(-1, z, i + 2));
    // extra bank trees between the houses, mixed sizes
    const extraTrees: [number, number, number][] = [[7.9, -33, 4.6], [-8.3, -40, 5.2], [8.1, -97, 4.2], [-7.8, -104, 4.8], [8.4, 2, 3.8], [-8.2, -6, 4.4]];
    extraTrees.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      treePts.push([x, z]);
    });
    // ---- far backdrop: the village church + a soft tree line
    // closing the horizon so the canal never runs into bare sky ----
    const church = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 11, 4.2), lam2({ map: rep(brickTex("giethoornBrickD", "#8a5040"), 1, 2) }));
    tower.position.y = 5.5; tower.castShadow = true; church.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.1, 6.5, 4), lam2({ color: "#3d4652" }));
    spire.position.y = 14.2; spire.rotation.y = Math.PI / 4; church.add(spire);
    const clockF = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), lam2({ color: "#f2ead6" }));
    clockF.position.set(0, 8.6, 2.12); church.add(clockF);
    church.position.set(-27, 0, -108);
    R.add(church);
    for (let i = 0; i < 9; i++) {
      const t = makeTree(7.5 + (i % 3) * 1.6, greens, 90 + i * 7);
      t.position.set(-52 + i * 13, 0, -118 - (i % 2) * 7);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
    }
    // ---- the arched bridge ----
    const bridge = makeBridge();
    bridge.position.set(0, 0, BRIDGE_Z);
    R.add(bridge);
    // ---- moored boats: the village's parked "cars" ----
    const moored: [string, number, number, number, number][] = [
      ["#3d6a8a", -3.1, -14, 0.06, 1], ["#a03a30", 3.15, -24.5, -0.05, 1], ["#3a7a4a", -3.1, -45, 0.04, 1],
      ["#7a4a2e", 3.15, -58, -0.03, 1], ["#4a5a8a", -3.1, -70, 0.05, 1],
    ];
    for (const [col, x, z, yaw] of moored) {
      const b = makeBoat(col, 4.2, 1.4);
      b.position.set(x, 0.02, z); b.rotation.y = yaw;
      R.add(b);
      this.mooredBoats.push({ g: b, ph: x * 1.7 - z * 0.6 });
      blob(R, x, 0.05, z, 3.0, 5.0, 0.32);
    }
    // one boat mid-canal in the distance, poled along — traffic!
    const traffic = makeBoat("#8a2f35", 4.4, 1.45);
    traffic.position.set(-1.1, 0.02, -52); traffic.rotation.y = 0.04;
    R.add(traffic);
    this.mooredBoats.push({ g: traffic, ph: 2.9 }); // traffic bobs too — nothing floats frozen
    blob(R, -1.1, 0.05, -52, 3.2, 5.4, 0.32);
    // flower dots along the towpaths
    const fcols = ["#d83a4a", "#e8c832", "#e86a9a", "#f2f0e6", "#e8542e"];
    for (let i = 0; i < 60; i++) {
      const s = i % 2 ? 1 : -1;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.05, 6, 5), lam2({ color: fcols[i % fcols.length] }));
      fl.position.set(s * (5.9 + r() * 1.6), 0.22, 18 - r() * 105);
      R.add(fl);
    }
    // ---- round 3: grass dressing — the lawn stops being a sheet ----
    // (a) world-space tone layering: a soft dark verge running
    // behind each towpath, a second under the house line, warm sun
    // pools and cool shade pools scattered over the lawns, so the
    // green is layered in the world and not only in the texture
    for (const s of [1, -1]) {
      softPatch(R, patchTex(), "#2c5420", s * 6.7, 0.125, -46, 3.0, 138, 0.40);
      softPatch(R, patchTex(), "#2c5420", s * 13.1, 0.125, -46, 4.8, 138, 0.28);
    }
    for (let i = 0; i < 9; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.8 + r() * 7.5), 0.128, 10 - r() * 105, 4.5 + r() * 5, 6 + r() * 7, 0.16 + r() * 0.10, r() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d8148", s * (6.8 + r() * 7.5), 0.129, 8 - r() * 100, 5 + r() * 5, 6 + r() * 6, 0.26 + r() * 0.10, r() * 3);
    }
    // (b) bare-earth discs grounding every tree, and leaf-fleck
    // bushes filling the gaps along the house fronts
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    const bushMats = [
      lam2({ color: greens[2], map: rep(foliageTex("giethoornFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("giethoornFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("giethoornFoliageBush"), 2, 1) }),
    ];
    const bushAt = (x: number, z: number, rad: number, mi: number) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), bushMats[mi % bushMats.length]);
      b.position.set(x, 0.1 + rad * 0.52, z); b.scale.set(1 + (r() - 0.5) * 0.3, 0.72 + r() * 0.14, 1 + (r() - 0.5) * 0.3);
      b.rotation.y = r() * 3; b.castShadow = true; R.add(b);
    };
    for (const [side, z] of houseZs) {
      bushAt(side * (7.2 + r() * 0.9), z - 4.1 - r() * 0.7, 0.45 + r() * 0.3, Math.floor(r() * 3));
      bushAt(side * (7.2 + r() * 0.9), z + 4.1 + r() * 0.7, 0.4 + r() * 0.3, Math.floor(r() * 3));
      if (r() < 0.7) bushAt(side * (12.9 + r() * 1.6), z + (r() - 0.5) * 3, 0.55 + r() * 0.35, Math.floor(r() * 3));
    }
    // (c) 3D grass tufts, instanced: dense fringes along the
    // towpath verges, garden fronts and tree bases, loose scatter
    // over the open lawns — every lawn edge goes ragged
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (const s of [1, -1]) for (let z = 17; z > -112; z -= 0.5 + r() * 0.55) {
      if (r() < 0.85) pushTuft(s * (5.78 + r() * 0.55), z + (r() - 0.5), 0.85 + r() * 0.8);
      if (r() < 0.30) pushTuft(s * (6.6 + r() * 0.7), z - 0.4, 0.7 + r() * 0.7);
    }
    for (const [side, z] of houseZs) for (let i = 0; i < 30; i++)
      pushTuft(side * (6.3 + r() * 3.6), z + (r() - 0.5) * 8.6, 0.75 + r() * 0.85);
    for (const [tx, tz] of treePts) for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 620; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (6.1 + r() * 10.2), z = 16 - r() * 122;
      if (houseZs.some(([hs, hz]) => hs === s && Math.abs(z - hz) < 4.4 && Math.abs(x) > 7.2 && Math.abs(x) < 14.2)) continue;
      pushTuft(x, z, (0.65 + r() * 0.8) * (z > -30 ? 1.25 : 1));
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // (d) wildflower clusters nestled in the lawns, not just
    // along the paths: little colour knots among the tufts
    const fl2 = ["#e8542e", "#d83a4a", "#e8c832", "#f2f0e6", "#e86a9a", "#9a6ae0"];
    for (let i = 0; i < 90; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const cx = s * (6.2 + r() * 8.5), cz = 14 - r() * 112;
      if (houseZs.some(([hs, hz]) => hs === s && Math.abs(cz - hz) < 4 && Math.abs(cx) > 7.4)) continue;
      const n = 2 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055 + r() * 0.05, 6, 5), lam2({ color: fl2[Math.floor(r() * fl2.length) % fl2.length] }));
        dot.position.set(cx + (r() - 0.5) * 0.55, 0.2 + r() * 0.14, cz + (r() - 0.5) * 0.55);
        R.add(dot);
      }
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
    // frame 0) — and on shot 3 it actually SAILS down-canal, hull,
    // contact blob and all (heroBoatAt is shared with cast.ts)
    const hb = heroBoatAt(id, tt);
    this.heroBoat.position.set(hb.x, 0.02 + Math.sin(tt * 1.3) * 0.03, hb.z);
    this.heroBoat.rotation.y = hb.yaw;
    this.heroBoat.rotation.z = Math.sin(tt * 0.9) * 0.012;
    if (this.heroBlob) this.heroBlob.position.set(hb.x, 0.06, hb.z);
    // ---- STANDAR GERAK: everything that should move, moves ----
    // canal water flows toward the viewer (texture scroll, not a poster)
    if (this.waterMap) this.waterMap.offset.set(0, tt * 0.055);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // grass tufts bend with the same wind (phase travels across the lawn)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.1, p.z);
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
    // lily pads ride the surface: bob + a slow drift sway
    for (const pd of this.pads) {
      pd.m.position.y = 0.03 + Math.sin(tt * 1.3 + pd.ph) * 0.012;
      pd.m.position.z = pd.z0 + Math.sin(tt * 0.21 + pd.ph) * 0.14;
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
