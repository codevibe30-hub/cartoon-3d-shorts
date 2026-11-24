// Green Bank, West Virginia as one three.js scene for the
// Fafnir-ID cover frame: a little town of ~150 people in a green
// Appalachian valley, one valley road, clapboard houses on both
// sides, and the giant white dish of the Green Bank Telescope
// rising over the rooftops — listening to the universe while the
// town stays radio-silent. The hero stands on the roadside grass
// in the near foreground, shocked at the size of the claim.
// VISUAL CORE: bright Appalachian daylight, layered green hills,
// white dish — textured everything (anti-banding: speckled sky,
// flecked grass, shingled roofs). Layered light rig: sun key w/
// soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, DISH_POS, DISH_D, vanAt, clamp01 } from "./story";

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
const skyTexDay = () => ctex("greenbankSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("greenbankGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("greenbankBirds", 256, 96, (g, r) => {
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
/** RICH grass (round-3 anti-flat pass): deep shadow pockets, a
 *  mid-green body, sunlit fleck clusters and thousands of
 *  individual blades in five greens with hard value contrast. */
const grassRichTex = () => ctex("greenbankGrassRich", 1024, 1024, (g, r) => {
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
/** bare earth for tree bases and bush feet: warm brown speckled
 *  with darker clods and pale grit, never a flat sticker */
const soilTex = () => ctex("greenbankSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("greenbankPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("greenbankBark", 256, 256, (g, r) => {
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
/** roof shingles: dark courses with a soft shadow under each
 *  row so the roof reads as laid shingles, not a flat slab */
const shingleTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++) {
    const y = row * 44;
    const sh = g.createLinearGradient(0, y, 0, y + 18);
    sh.addColorStop(0, "rgba(10,10,14,0.45)"); sh.addColorStop(1, "rgba(10,10,14,0)");
    g.fillStyle = sh; g.fillRect(0, y, 512, 18);
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, y - 2, 512, 2);
    g.strokeStyle = "rgba(20,18,22,0.35)"; g.lineWidth = 2;
    for (let x = (row % 2) * 32; x <= 512; x += 64) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 44); g.stroke();
    }
  }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,240" : "8,8,12"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
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
/** asphalt: dark grey with pale grit + a few tar seams */
const asphaltTex = () => ctex("greenbankAsphalt", 512, 512, (g, r) => {
  g.fillStyle = "#3a3d42"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,205,215" : "12,13,16"},${0.05 + r() * 0.10})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = `rgba(16,17,20,${0.14 + r() * 0.14})`; g.lineWidth = 1.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
});
/** dish panels: white base with radial ribs (vertical stripes,
 *  one per lathe segment) + concentric ring seams (horizontal)
 *  + speckle — the giant dish is never a smooth bowl */
const dishTex = () => ctex("greenbankDish", 512, 512, (g, r) => {
  g.fillStyle = "#f4f6f8"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) {
    g.fillStyle = "rgba(120,130,145,0.28)"; g.fillRect(x, 0, 2, 512);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 3, 0, 2, 512);
  }
  for (let y = 0; y < 512; y += 48) {
    g.fillStyle = "rgba(120,130,145,0.22)"; g.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,100,115"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const blobTex = () => ctex("greenbankBlob", 256, 256, (g) => {
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
/** a strut between two points: a cylinder aimed by quaternion */
const strut = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  m.castShadow = true; parent.add(m);
  return m;
};

/** An Appalachian clapboard house: brick or plaster walls, steep
 *  shingled gable roof, white-framed windows, a flower box.
 *  Front faces +Z; yaw it toward the road when placing. */
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
  // flower bed between the house and the road (local +Z front)
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.55, 0.4),
    lam2({ color: "#4d7d33", map: rep(foliageTex("greenbankFoliageHedge"), 3, 1) }));
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
    folM(greens[2] ?? greens[0], "greenbankFoliageDeep"),
    folM(greens[0], "greenbankFoliageMid"),
    folM(greens[1] ?? greens[0], "greenbankFoliageLite"),
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
 *  vertex-coloured dark base -> sunlit tip. Instanced all over
 *  the verges so lawn edges stop being ruler-straight lines. */
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

/** A layered Appalachian hill: a flattened dome with grass
 *  texture, sunk slightly into the ground so its base never
 *  floats. Stacked in depth, they close the valley. */
const makeHill = (rx: number, h: number, rz: number, seed = 1) => {
  const g = new THREE.Group();
  const m = lam2({ map: rep(grassRichTex(), 6, 6), color: "#7fae62" });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), m);
  dome.scale.set(rx, h, rz);
  dome.position.y = -h * 0.18;
  dome.receiveShadow = true; g.add(dome);
  // a darker tree-line cap on the ridge so the hill is not a bald dome
  const capM = lam2({ color: "#3d6a2e", map: rep(foliageTex("greenbankFoliageHill"), 4, 1) });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), capM);
  cap.scale.set(rx * 0.96, h * 0.42, rz * 0.96);
  cap.position.y = h * 0.52;
  g.add(cap);
  void seed;
  return g;
};

/** THE GIANT DISH: a parabolic lathe bowl with panel ribs, a
 *  rim torus, three feed legs converging on the feed horn, all
 *  tilted up at the sky on a concrete pedestal + yoke. Returns
 *  { group, yoke } — the yoke yaws slowly (tracking) in update().
 *  Stylised scale: 24 m across (real GBT: 100 m). */
const makeDish = (diam: number) => {
  const R = diam / 2, depth = R * 0.30;
  const group = new THREE.Group();
  // concrete pedestal + equipment hut at its foot
  const pedM = lam2({ color: "#b9b3a8" });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.1, 9, 12), pedM);
  ped.position.y = 4.5; ped.castShadow = true; ped.receiveShadow = true; group.add(ped);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), lam2({ color: "#e8e4da" }));
  hut.position.set(4.6, 1.5, 2.5); hut.castShadow = true; group.add(hut);
  const hutRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 4.4), lam2({ color: "#5d6a72" }));
  hutRoof.position.set(4.6, 3.1, 2.5); group.add(hutRoof);
  // the yawing yoke: two arms holding the tilt axle
  const yoke = new THREE.Group();
  yoke.position.y = 9.2;
  const armM = lam2({ color: "#8a929a" });
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 1.4), armM);
    arm.position.set(s * (R * 0.34), 1.2, 0); arm.castShadow = true; yoke.add(arm);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, R * 0.72, 10), armM);
  axle.rotation.z = Math.PI / 2; axle.position.y = 2.6; yoke.add(axle);
  // the tilt group: the bowl itself, tipped 40° from vertical
  const tilt = new THREE.Group();
  tilt.position.y = 2.6;
  tilt.rotation.x = 0.7; // boresight ~50° elevation, opening toward +Z
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector2(Math.max(0.01, u * R), (u * u) * depth));
  }
  const dishGeo = new THREE.LatheGeometry(pts, 48);
  const dish = new THREE.Mesh(dishGeo, lam2({ map: rep(dishTex(), 4, 1), color: "#f4f6f8" }));
  dish.castShadow = true; dish.receiveShadow = true; tilt.add(dish);
  // back-up structure: a shallow cone behind the bowl so the
  // dish is never a paper-thin shell from behind
  const back = new THREE.Mesh(new THREE.ConeGeometry(R * 0.98, depth * 0.9, 48, 1, true),
    lam2({ color: "#c8ced4", side: THREE.DoubleSide }));
  back.rotation.x = Math.PI; back.position.y = -depth * 0.45; tilt.add(back);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.02, 8, 48), lam2({ color: "#dfe5ea" }));
  rim.rotation.x = Math.PI / 2; rim.position.y = depth; tilt.add(rim);
  // feed legs + feed horn above the bowl centre
  const feedY = depth + R * 0.55;
  const legM = lam2({ color: "#c8ced4" });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    strut(tilt, new THREE.Vector3(Math.cos(a) * R * 0.92, depth * 0.92, Math.sin(a) * R * 0.92),
      new THREE.Vector3(0, feedY, 0), 0.09, legM);
  }
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.6, 10), lam2({ color: "#e8ebee" }));
  horn.position.y = feedY; horn.castShadow = true; tilt.add(horn);
  const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 10), lam2({ color: "#9aa2ab" }));
  hornTip.rotation.x = Math.PI; hornTip.position.y = feedY - 1.2; tilt.add(hornTip);
  yoke.add(tilt);
  group.add(yoke);
  return { group, yoke };
};

/** A simple boxy vehicle, front toward +Z: body, cabin, wheels,
 *  bumpers, headlights. `kind` picks the silhouette + details. */
const makeVehicle = (kind: "truck" | "van" | "car", bodyCol: string) => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: bodyCol });
  const darkM = lam2({ color: "#2c313a" });
  const glassM = lam2({ color: "#3d5a78" });
  const wheelM = lam2({ color: "#1d1d20" });
  const wheel = (x: number, z: number, r = 0.42) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(x, r, z); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.32, 8), lam2({ color: "#c8c8c8" }));
    hub.rotation.z = Math.PI / 2; hub.position.set(x, r, z); g.add(hub);
  };
  if (kind === "truck") {
    // old diesel flatbed: long hood, cab, open bed, exhaust stack
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 2.6), bodyM);
    bed.position.set(0, 0.85, -1.1); bed.castShadow = true; g.add(bed);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 1.5), bodyM);
    cab.position.set(0, 1.35, 0.9); cab.castShadow = true; g.add(cab);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 1.4), bodyM);
    hood.position.set(0, 0.95, 2.3); hood.castShadow = true; g.add(hood);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.08), glassM);
    shield.position.set(0, 1.6, 1.66); g.add(shield);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8), darkM);
    stack.position.set(0.8, 1.9, 1.2); g.add(stack);
    const grill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), darkM);
    grill.position.set(0, 0.85, 3.02); g.add(grill);
    for (const s of [1, -1]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6),
        new THREE.MeshLambertMaterial({ color: "#ffe9a8", emissive: "#ffca3c", emissiveIntensity: 0.5 }));
      light.position.set(s * 0.62, 0.95, 3.05); g.add(light);
    }
    wheel(-0.95, 2.2); wheel(0.95, 2.2); wheel(-0.95, -1.6); wheel(0.95, -1.6);
  } else if (kind === "van") {
    // patrol van: tall box body, cab nose, roof antenna + mini dish
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 3.6), bodyM);
    body.position.set(0, 1.35, -0.4); body.castShadow = true; g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 1.0), bodyM);
    nose.position.set(0, 0.85, 1.85); nose.castShadow = true; g.add(nose);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.08), glassM);
    shield.position.set(0, 1.5, 1.42); shield.rotation.x = -0.25; g.add(shield);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 3.62), lam2({ color: "#d42f2f" }));
    stripe.position.set(0, 1.0, -0.4); g.add(stripe);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6), darkM);
    mast.position.set(-0.7, 3.0, -1.2); g.add(mast);
    const miniDish = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam2({ color: "#e8ebee", side: THREE.DoubleSide }));
    miniDish.position.set(0.6, 2.5, -1.0); miniDish.rotation.x = -0.6; g.add(miniDish);
    for (const s of [1, -1]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshLambertMaterial({ color: "#ffe9a8", emissive: "#ffca3c", emissiveIntensity: 0.5 }));
      light.position.set(s * 0.6, 0.8, 2.37); g.add(light);
    }
    wheel(-0.95, 1.9); wheel(0.95, 1.9); wheel(-0.95, -1.5); wheel(0.95, -1.5);
  } else {
    // small gasoline sedan, bright red — the one that must turn back
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 3.4), bodyM);
    body.position.set(0, 0.72, 0); body.castShadow = true; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.7), glassM);
    cabin.position.set(0, 1.28, -0.2); cabin.castShadow = true; g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.5), bodyM);
    roof.position.set(0, 1.6, -0.2); g.add(roof);
    for (const s of [1, -1]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshLambertMaterial({ color: "#ffe9a8", emissive: "#ffca3c", emissiveIntensity: 0.4 }));
      light.position.set(s * 0.55, 0.72, 1.72); g.add(light);
    }
    wheel(-0.85, 1.15, 0.36); wheel(0.85, 1.15, 0.36); wheel(-0.85, -1.15, 0.36); wheel(0.85, -1.15, 0.36);
  }
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
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private dishYoke: THREE.Group;
  private patrolVan: THREE.Group;
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
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
    // (down -Z, low enough to sit in the upper frame). Layered near -> far.
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
    // the sun's halo + core, upper left down the valley
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
    this.buildValley(R, r);
    // ---- the giant dish + two smaller dishes ----
    const big = makeDish(DISH_D);
    big.group.position.set(DISH_POS[0], 0, DISH_POS[2]);
    R.add(big.group);
    this.dishYoke = big.yoke;
    blob(R, DISH_POS[0], 0.13, DISH_POS[2], 30, 30, 0.28);
    const small1 = makeDish(14);
    small1.group.position.set(-28, 0, -95); small1.group.scale.setScalar(0.9);
    R.add(small1.group);
    const small2 = makeDish(10);
    small2.group.position.set(30, 0, -105); small2.group.scale.setScalar(0.9);
    R.add(small2.group);
    // ---- vehicles: diesel truck (parked), gas car (turned away), patrol van (drives shot 8) ----
    const truck = makeVehicle("truck", "#3a5a3a");
    truck.position.set(-3.2, 0.02, -14); truck.rotation.y = 0.06;
    R.add(truck);
    blob(R, -3.2, 0.05, -14, 3.4, 6.4, 0.32);
    const gasCar = makeVehicle("car", "#c23a2e");
    gasCar.position.set(3.5, 0.02, -22); gasCar.rotation.y = Math.PI;
    R.add(gasCar);
    blob(R, 3.5, 0.05, -22, 3.0, 5.2, 0.32);
    this.patrolVan = makeVehicle("van", "#f2f0e6");
    this.patrolVan.position.set(3.5, 0.02, -20);
    R.add(this.patrolVan);
    blob(R, 3.5, 0.05, -20, 3.2, 6.0, 0.32);
  }

  // ---------------- the valley: road, lawns, houses, hills ----------------
  private buildValley(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the valley road: asphalt running away down -Z
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 155), lam2({ map: rep(asphaltTex(), 2, 40) }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.12, -45); road.receiveShadow = true; R.add(road);
    // dashed yellow centre line + white edge lines
    const lineM = lam2({ color: "#e8c832" });
    for (let z = 28; z > -118; z -= 6) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 2.4), lineM);
      dash.position.set(0, 0.14, z); R.add(dash);
    }
    const edgeM = lam2({ color: "#f2f0e6" });
    for (const s of [1, -1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 155), edgeM);
      edge.rotation.x = -Math.PI / 2; edge.position.set(s * 3.0, 0.135, -45); R.add(edge);
    }
    // grass verges + gravel shoulders flanking the road
    for (const s of [1, -1]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(13, 155), lam2({ map: rep(grassRichTex(), 5, 55) }));
      verge.rotation.x = -Math.PI / 2; verge.position.set(s * 10.2, 0.1, -45); verge.receiveShadow = true; R.add(verge);
      const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 155), lam2({ color: "#9a958c" }));
      shoulder.rotation.x = -Math.PI / 2; shoulder.position.set(s * 3.9, 0.125, -45); shoulder.receiveShadow = true; R.add(shoulder);
    }
    // ---- clapboard houses lining the road, fronts to the road ----
    // (kept clear of the dish footprint: dish spans z -53..-71)
    const wallMats = [
      lam2({ map: rep(brickTex("greenbankBrickA", "#9c4f38"), 2, 1) }),
      lam2({ map: rep(plasterTex("greenbankPlasterA", "#f0e6d2"), 2, 1) }),
      lam2({ map: rep(brickTex("greenbankBrickB", "#7a4a42"), 2, 1) }),
      lam2({ map: rep(plasterTex("greenbankPlasterB", "#e8dcc4"), 2, 1) }),
      lam2({ map: rep(brickTex("greenbankBrickC", "#a86a44"), 2, 1) }),
    ];
    const roofMats = [
      lam2({ map: rep(shingleTex("greenbankShingleA", "#4a4a52"), 2, 1) }),
      lam2({ map: rep(shingleTex("greenbankShingleB", "#5d4632"), 2, 1) }),
      lam2({ map: rep(shingleTex("greenbankShingleC", "#46505c"), 2, 1) }),
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
    [-4, -19, -34, -88, -100].forEach((z, i) => houseAt(1, z, i));
    [-11, -26, -40, -94, -108].forEach((z, i) => houseAt(-1, z, i + 2));
    // extra roadside trees between the houses, mixed sizes
    const extraTrees: [number, number, number][] = [[7.9, -44, 4.6], [-8.3, -48, 5.2], [8.1, -80, 4.2], [-7.8, -82, 4.8], [8.4, 2, 3.8], [-8.2, -6, 4.4]];
    extraTrees.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      treePts.push([x, z]);
    });
    // ---- far backdrop: layered hills closing the valley + a tree
    // line on the nearest ridge so the road never runs into bare sky ----
    const hills: [number, number, number, number, number][] = [
      [-60, -150, 70, 26, 60], [40, -160, 80, 32, 70], [130, -145, 60, 22, 55],
      [-140, -140, 55, 20, 50], [0, -185, 95, 38, 80], [-30, -125, 45, 12, 38],
    ];
    hills.forEach(([x, z, rx, h, rz], i) => {
      const hill = makeHill(rx, h, rz, 20 + i * 5);
      hill.position.set(x, 0, z);
      R.add(hill);
    });
    for (let i = 0; i < 9; i++) {
      const t = makeTree(7.5 + (i % 3) * 1.6, greens, 90 + i * 7);
      t.position.set(-52 + i * 13, 0, -118 - (i % 2) * 7);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
    }
    // ---- the observatory control building beside the big dish ----
    const ctrl = new THREE.Group();
    const cbody = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), lam2({ color: "#e8e4da" }));
    cbody.position.y = 1.6; cbody.castShadow = true; ctrl.add(cbody);
    const croof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.25, 5.4), lam2({ color: "#5d6a72" }));
    croof.position.y = 3.3; ctrl.add(croof);
    const cwinM = lam2({ color: "#3d5a78" });
    for (const wx of [-2, 0, 2]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.08), cwinM);
      win.position.set(wx, 1.8, 2.54); ctrl.add(win);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.5, 6), lam2({ color: "#6a7076" }));
    mast.position.set(2.8, 5.4, -1); ctrl.add(mast);
    ctrl.position.set(16, 0, -72); ctrl.rotation.y = -0.4;
    R.add(ctrl);
    blob(R, 16, 0.13, -72, 9, 7, 0.28);
    // flower dots along the roadside
    const fcols = ["#d83a4a", "#e8c832", "#e86a9a", "#f2f0e6", "#e8542e"];
    for (let i = 0; i < 60; i++) {
      const s = i % 2 ? 1 : -1;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.05, 6, 5), lam2({ color: fcols[i % fcols.length] }));
      fl.position.set(s * (5.9 + r() * 1.6), 0.22, 18 - r() * 105);
      R.add(fl);
    }
    // ---- round 3: grass dressing — the lawn stops being a sheet ----
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
      lam2({ color: greens[2], map: rep(foliageTex("greenbankFoliageBush"), 2, 1) }),
      lam2({ color: greens[0], map: rep(foliageTex("greenbankFoliageBush"), 2, 1) }),
      lam2({ color: greens[1], map: rep(foliageTex("greenbankFoliageBush"), 2, 1) }),
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
    // road verges, garden fronts and tree bases, loose scatter
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
    // ---- STANDAR GERAK: everything that should move, moves ----
    // the giant dish TRACKS the sky: a slow yaw sweep, never frozen
    this.dishYoke.rotation.y = -0.3 + Math.sin(tt * 0.05) * 0.12;
    // the patrol van drives its beat (shot 8) or sits parked
    const vp = vanAt(id, tt);
    this.patrolVan.position.set(vp.x, 0.02, vp.z);
    this.patrolVan.rotation.y = vp.yaw;
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
