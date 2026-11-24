// Wae Rebo, Flores as one three.js scene for the Fafnir-ID
// cover frame: a Manggarai village at 1,200 m on a grassy
// mountain saddle — SEVEN giant cone houses (Mbaru Niang) in a
// ring around the compang stone altar, forested ridges all
// around, a cloud sea drifting below the rim, a dirt trek path
// climbing in through coffee gardens, and one house being
// re-thatched at the build site. VISUAL CORE: bright mountain
// morning, saturated greens, golden thatch cones, white mist —
// textured everything (anti-banding: speckled sky, flecked
// grass, streaked thatch). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the series style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, COMPANG, HOUSES, BUILD_SITE, PEAKS, clamp01 } from "./story";

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
const skyTexDay = () => ctex("waeReboSkyDay2", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("waeReboGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("waeReboBirds", 256, 96, (g, r) => {
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
const grassRichTex = () => ctex("waeReboGrassRich", 1024, 1024, (g, r) => {
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
const soilTex = () => ctex("waeReboSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("waeReboPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("waeReboBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** thatch: golden-brown vertical straw streaks over darker
 *  horizontal layer bands — the Mbaru Niang roof, woven ijuk
 *  and lontar fibre, never a flat cone */
const thatchTex = () => ctex("waeReboThatch", 512, 512, (g, r) => {
  g.fillStyle = "#b98a3c"; g.fillRect(0, 0, 512, 512);
  const straws = ["#8a6a20", "#d9a441", "#c8920c", "#6a4a1c", "#e8c45a"];
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = straws[Math.floor(r() * straws.length) % straws.length];
    g.globalAlpha = 0.35 + r() * 0.45; g.lineWidth = 1.6 + r() * 2.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
  g.globalAlpha = 1;
  // horizontal thatch-layer bands, darker seams every ~46 px
  for (let y = 20; y < 512; y += 46) {
    g.fillStyle = "rgba(60,38,8,0.35)";
    g.fillRect(0, y, 512, 5);
    g.fillStyle = "rgba(255,236,170,0.18)";
    g.fillRect(0, y + 5, 512, 3);
  }
});
const blobTex = () => ctex("waeReboBlob", 256, 256, (g) => {
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

/** A Mbaru Niang cone house: a thatch cone sweeping almost to
 *  the ground on a low stone base ring, a dark door facing the
 *  compang, a small wooden finial on the apex. Built without
 *  nails in the real village — here without a single flat face. */
const makeConeHouse = (scale = 1, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 5);
  const thatchM = lam2({ map: rep(thatchTex(), 3, 2), color: "#d9b25e" });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 12, 14), thatchM);
  cone.position.y = 6.4; cone.castShadow = true; cone.receiveShadow = true; g.add(cone);
  // the thatch sweeps past the wall to the ground: a skirt ring
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.9, 1.2, 14, 1, true), thatchM);
  skirt.position.y = 0.6; g.add(skirt);
  // low stone base ring the cone sits on
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 6.0, 0.8, 14), lam2({ color: "#8d8578" }));
  base.position.y = 0.4; base.receiveShadow = true; g.add(base);
  // the door, dark, facing +Z (the group is rotated to face the compang).
  // It LEANS with the cone slope (24.6°) and hugs the surface:
  // stills-check 2026-11-25 caught the upright door floating 1 m
  // off the cone at its top, reading as a giant blue slab.
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.14), lam2({ color: "#241726" }));
  door.position.set(0, 1.2, 5.13); door.rotation.x = -0.43; g.add(door);
  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.18), lam2({ color: "#6a4a2c" }));
  doorTop.position.set(0, 2.08, 4.9); doorTop.rotation.x = -0.43; g.add(doorTop);
  // a small woven band around the cone, a hand's breadth above the door
  const band = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 8, 20), lam2({ color: "#7a4a1c" }));
  band.rotation.x = Math.PI / 2; band.position.y = 3.4; g.add(band);
  // the apex finial: a short wooden post with a small ball
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 8), lam2({ color: "#6a4a2c" }));
  fin.position.y = 12.7; g.add(fin);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lam2({ color: "#c8920c" }));
  ball.position.y = 13.2; g.add(ball);
  // a few straw tufts sticking out of the thatch, for silhouette life.
  // They sit ON the cone surface: the cone radius at height y is
  // 5.5 * (1 - (y - 0.4) / 12) — stills-check 2026-11-25 caught the
  // old fixed-radius tufts floating in mid-air as black triangles.
  for (let i = 0; i < 5; i++) {
    const a = tr() * Math.PI * 2, yy = 4 + tr() * 5;
    const rr2 = 5.5 * (1 - (yy - 0.4) / 12) + 0.12;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 5), lam2({ color: "#e8c45a" }));
    tuft.position.set(Math.cos(a) * rr2, yy, Math.sin(a) * rr2);
    tuft.rotation.z = (tr() - 0.5) * 0.8; g.add(tuft);
  }
  g.scale.setScalar(scale);
  return g;
};

/** The cone frame of a house being rebuilt: eight bamboo poles
 *  leaning to one apex, half the cone thatched, the other half
 *  open skeleton — the community rebuilding three houses by hand. */
const makeConeFrame = () => {
  const g = new THREE.Group();
  const poleM = lam2({ color: "#a8845f", map: rep(barkTex(), 1, 2) });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 12.6, 6), poleM);
    pole.position.set(Math.cos(a) * 2.75, 6.3, Math.sin(a) * 2.75);
    pole.rotation.z = Math.cos(a) * 0.42;
    pole.rotation.x = -Math.sin(a) * 0.42;
    pole.castShadow = true; g.add(pole);
  }
  // half the cone already thatched (the finished half)
  const half = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 12, 14, 1, true, 0, Math.PI), lam2({ map: rep(thatchTex(), 3, 2), color: "#d9b25e" }));
  half.position.y = 6.4; half.castShadow = true; g.add(half);
  // ring beams tying the poles together
  for (const yy of [3.4, 7.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5 * (1 - yy / 13.2), 0.09, 6, 20), poleM);
    ring.rotation.x = Math.PI / 2; ring.position.y = yy; g.add(ring);
  }
  // bamboo poles lying ready beside the frame
  for (let i = 0; i < 4; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 6), poleM);
    pole.rotation.z = Math.PI / 2; pole.rotation.y = 0.2 + i * 0.12;
    pole.position.set(6.5 + i * 0.3, 0.12 + i * 0.16, 2.5 - i * 0.4);
    pole.castShadow = true; g.add(pole);
  }
  return g;
};

/** The compang: the round stone altar at the village heart — a
 *  low stone platform, a smaller raised ring, a few sacred stones. */
const makeCompang = () => {
  const g = new THREE.Group();
  const stone = lam2({ color: "#8d8578" });
  const dark = lam2({ color: "#6a6358" });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 16), stone);
  platform.position.y = 0.25; platform.receiveShadow = true; g.add(platform);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.4, 12), dark);
  ring.position.y = 0.7; g.add(ring);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 2) * 0.08, 0), stone);
    s.position.set(Math.cos(a) * 1.7, 0.62, Math.sin(a) * 1.7);
    s.rotation.y = i * 1.3; s.castShadow = true; g.add(s);
  }
  return g;
};

/** A sacred rock: a lumpy grey boulder, flat-shaded so its
 *  facets read. */
const makeRock = (r: number, seed = 1) => {
  const tr = rng(seed * 911 + 5);
  const geo = new THREE.DodecahedronGeometry(r, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (tr() - 0.5) * 0.22;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (0.75 + tr() * 0.2), pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, lam2({ color: "#8d8578" }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
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
    folM(greens[2] ?? greens[0], "waeReboFoliageDeep"),
    folM(greens[0], "waeReboFoliageMid"),
    folM(greens[1] ?? greens[0], "waeReboFoliageLite"),
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

/** A coffee bush: a dark-green rounded bush with red cherries —
 *  the cash crop growing along the trek path. */
const makeCoffeeBush = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 771 + 3);
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8),
    lam2({ color: "#2f6a2a", map: rep(foliageTex("waeReboCoffee"), 1, 1) }));
  bush.scale.y = 0.75; bush.position.y = 0.45; bush.castShadow = true; g.add(bush);
  const berryM = lam2({ color: "#c0353a" });
  for (let i = 0; i < 8; i++) {
    const a = tr() * Math.PI * 2, yy = 0.35 + tr() * 0.5;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), berryM);
    b.position.set(Math.cos(a) * 0.5, yy, Math.sin(a) * 0.5);
    g.add(b);
  }
  return g;
};

/** A guardian peak: a big forested cone with a grey rock cap —
 *  one of the seven peaks that watch over the village. */
const makePeak = (h: number, rad: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 557 + 11);
  void tr;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 10),
    lam2({ color: "#3f6a34", map: rep(foliageTex("waeReboPeak"), 2, 2) }));
  cone.position.y = h / 2 - 2; cone.castShadow = true; g.add(cone);
  const capH = h * 0.28, capR = rad * 0.28;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, 10), lam2({ color: "#8d8578" }));
  cap.position.y = h - 2 - capH / 2; g.add(cap);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced all over
 *  the saddle so lawn edges stop being ruler-straight lines. */
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
  private mist: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private mistBase: { x: number; sp: number }[] = [];
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
    // ---- sky dome + high clouds ----
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
    // LOW MIST: the cloud sea drifting below the saddle rim —
    // big soft sprites hugging the ground around the village,
    // so frame 0 already has moving cloud from the first frame.
    // NOTE (stills-check 2026-11-25): the first mist drifted
    // 0.5-1.0 m/s — by shot 10 a sprite had drifted 40 m and sat
    // 9 m in front of the cover camera, washing the whole frame
    // white. Mist now drifts SLOW (0.15-0.3 m/s, ≤16 m over the
    // film) and starts OUTSIDE the village, never on a camera path.
    const mistSpots: [number, number, number, number, number][] = [
      // x, y, z, width, opacity
      [-55, 2.5, -45, 90, 0.55], [55, 3, -50, 100, 0.6], [0, 2, -65, 110, 0.5],
      [-70, 1.5, -15, 80, 0.5], [70, 2, -20, 85, 0.55], [-60, 3.5, 10, 75, 0.45],
      [60, 2.5, 15, 80, 0.5], [-25, 1.5, -35, 70, 0.55], [25, 2, -35, 70, 0.5],
    ];
    mistSpots.forEach(([x, y, z, w, op], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(400 + i * 53, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: op }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.3, 1);
      sp.layers.set(NOINK); R.add(sp); this.mist.push(sp);
      this.mistBase.push({ x, sp: 0.15 + (i % 3) * 0.07 });
    });
    // the sun's halo + core, upper left over the ridge
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
  }

  // ---------------- the village: saddle, houses, compang, ridges, trail ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    // the saddle: flat grass at y = 0, big enough to hold the
    // village, the trail and the ridge ring's feet
    const saddle = new THREE.Mesh(new THREE.CircleGeometry(85, 48), lam2({ map: rep(grassRichTex(), 12, 12), color: "#7a9a58" }));
    saddle.rotation.x = -Math.PI / 2; saddle.position.set(0, 0, -10); saddle.receiveShadow = true; R.add(saddle);
    // the valley far below the rim: a huge fogged green floor so
    // looking out past the saddle edge never shows void
    const valley = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lam2({ color: "#5a7a4a" }));
    valley.rotation.x = -Math.PI / 2; valley.position.set(0, -28, -60); R.add(valley);
    // sun patches + shade pools on the saddle grass
    softPatch(R, patchTex(), "#fff6be", -8, 0.015, -14, 22, 14, 0.35, 0.4);
    softPatch(R, patchTex(), "#fff6be", 10, 0.015, 4, 16, 10, 0.3, -0.3);
    softPatch(R, patchTex(), "#2c4a22", 6, 0.015, -20, 26, 16, 0.22, 0.2);
    // ---- the seven Mbaru Niang in a ring around the compang ----
    HOUSES.forEach((h, i) => {
      const house = makeConeHouse(h.main ? 1.15 : 1, i * 3 + 1);
      house.position.set(h.pos[0], 0, h.pos[2]);
      // the door faces the compang
      house.rotation.y = Math.atan2(COMPANG[0] - h.pos[0], COMPANG[2] - h.pos[2]);
      R.add(house);
      blob(R, h.pos[0], 0.03, h.pos[2], 13.5, 13.5, 0.32);
    });
    // ---- the compang at the village heart ----
    const compang = makeCompang();
    compang.position.set(COMPANG[0], 0, COMPANG[2]);
    R.add(compang);
    blob(R, COMPANG[0], 0.04, COMPANG[2], 5.5, 5.5, 0.3);
    // ---- the build site: a house being re-thatched ----
    const frame = makeConeFrame();
    frame.position.set(BUILD_SITE[0], 0, BUILD_SITE[2]);
    frame.rotation.y = 0.4;
    R.add(frame);
    blob(R, BUILD_SITE[0], 0.03, BUILD_SITE[2], 14, 14, 0.3);
    // ---- the seven guardian peaks on the far ridge ----
    PEAKS.forEach(([px, pz, ph], i) => {
      const peak = makePeak(ph, 13 + (i % 3) * 2, i * 5 + 2);
      peak.position.set(px, -2, pz);
      R.add(peak);
    });
    // ---- forested ridge mounds ringing the saddle (not across
    // the trail corridor, which climbs in from +Z) ----
    const ridgeAngles = [0, 30, 60, 120, 150, 180, 210, 240, 270, 300, 330];
    ridgeAngles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const rr = 52 + r() * 12, rx = Math.cos(a) * rr, rz = -10 + Math.sin(a) * rr;
      const rad = 16 + r() * 8, sy = 0.55 + r() * 0.2;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 14),
        lam2({ map: rep(grassRichTex(), 4, 4), color: "#5a7a44" }));
      mound.scale.set(1, sy, 1);
      mound.position.set(rx, -rad * sy * 0.45, rz);
      mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
      // a tree or two on each ridge
      if (i % 2 === 0) {
        const t = makeTree(4.5 + r() * 1.5, ["#2f6a2a", "#3f8a3a", "#26511a"], i * 11 + 5);
        t.position.set(rx + (r() - 0.5) * 8, rad * sy * 0.5 - 0.5, rz + (r() - 0.5) * 8);
        R.add(t);
        this.trees.push({ g: t, ph: i * 1.93 + 0.7 });
      }
    });
    // ---- the trek path: a dirt ribbon climbing in from the foreground ----
    const pathPts: [number, number][] = [[0, 32], [2, 24], [-1, 16], [1, 9], [0, 3]];
    const pathGeo = (() => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      const W = 1.15;
      for (let i = 0; i < pathPts.length; i++) {
        const [x, z] = pathPts[i];
        const [nx, nz] = i < pathPts.length - 1 ? pathPts[i + 1] : pathPts[i - 1];
        const [px, pz] = i > 0 ? pathPts[i - 1] : pathPts[i + 1];
        const dx = nx - px, dz = nz - pz, len = Math.hypot(dx, dz) || 1;
        const ox = (-dz / len) * W, oz = (dx / len) * W;
        pos.push(x - ox, 0.02, z - oz, x + ox, 0.02, z + oz);
        uv.push(0, i * 2, 1, i * 2);
        if (i > 0) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    })();
    const path = new THREE.Mesh(pathGeo, lam2({ map: rep(soilTex(), 2, 8) }));
    path.receiveShadow = true; R.add(path);
    // ---- coffee gardens along the trail ----
    const coffeeSpots: [number, number][] = [
      // (3.4, 22) was 4 m from the shot-3 camera and filled the
      // foreground corner as a dark blob — moved out to (5.5, 20)
      [-3.2, 26], [5.5, 20], [-3.8, 18], [3.6, 14], [-3.4, 11], [3.2, 7.5],
      // (5.8, 5) sat 4 m in front of the shot-8 camera as a dark
      // blob — moved to the right, out of the camera path
      [-6, 20], [6.2, 17], [-5.5, 8], [9, 6.5],
    ];
    coffeeSpots.forEach(([x, z], i) => {
      const bush = makeCoffeeBush(i * 3 + 2);
      bush.position.set(x, 0, z);
      bush.rotation.y = i * 1.1;
      R.add(bush);
    });
    // ---- the forest on the saddle: trees ringing the village ----
    const greens = ["#2f6a2a", "#3f8a3a", "#26511a"];
    const treeSpots: [number, number, number][] = [
      [-20, -30, 5.2], [22, -32, 5.6], [-26, -16, 6.0], [26, -18, 5.4],
      [-18, 12, 6.2], [20, 10, 5.0], [-30, -2, 4.8], [30, -4, 5.0],
      [-14, -40, 4.6], [16, -42, 5.8], [-34, -26, 4.4], [34, -28, 5.2],
      [-8, 26, 5.4], [8, 28, 5.0], [-12, 20, 4.8], [12, 22, 5.2],
    ];
    const treePts: [number, number][] = [];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, i * 7 + 3);
      t.position.set(x, -0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + 0.7 });
      treePts.push([x, z]);
    });
    // ---- grass tufts all over the saddle ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (const [tx, tz] of treePts) for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2, d = 0.9 + r() * 0.8;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 44;
      const x = Math.cos(a) * d, z = -10 + Math.sin(a) * d;
      // keep the village heart + the trail clear of tufts
      if (Math.hypot(x, z + 10) < 14) continue;
      if (Math.abs(x) < 2.5 && z > 0 && z < 34) continue;
      pushTuft(x, z, 0.65 + r() * 0.8);
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
    // bare-earth discs grounding every tree
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3;
      disc.position.set(tx, 0.02, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    // a few rocks scattered on the saddle for texture
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = 18 + r() * 26;
      const rock = makeRock(0.5 + r() * 0.9, 40 + i * 7);
      rock.position.set(Math.cos(a) * d, 0.2, -10 + Math.sin(a) * d);
      rock.rotation.y = r() * 3; R.add(rock);
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
    for (const m2 of this.mist) m2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // high clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // the low mist sea drifts too — slowly, so frame 0 is already alive
    this.mist.forEach((m2, i) => { const b = this.mistBase[i]; if (b) m2.position.x = b.x + tt * b.sp; });
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
