// Pulau Run, Kepulauan Banda, Maluku as one three.js scene for
// the Fafnir-ID short: a blazing tropical morning — turquoise sea,
// white sand, a tiny green nutmeg island, 17th-century tall ships
// with English and Dutch flags, a stone fort, a nutmeg grove heavy
// with red fruit, New Amsterdam's wooden town + windmill, the
// treaty table, and a GIANT balance weighing the island against
// Manhattan. The ships are low-poly rigs (hull, masts, sails,
// flags) so they can bob, sail away and sail in; the balance tips
// in shot 9; the modern skyline rises only for the punchline loop.
// VISUAL CORE: bright tropical light above, turquoise sea below;
// textured everything (anti-banding: speckled sky, sand, sea).
// Layered light rig: sun key w/ soft shadows + hemisphere fill +
// rim — the house style. STANDAR GERAK: clouds drift, gulls fly,
// palms + nutmeg trees sway, waves roll, ships bob, the windmill
// spins, flags wave, the balance tips.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, clamp01,
  ISLAND, SHIP_EN, SHIP_NL, GROVE_X, FORT_X, TOWN_X,
  sailAwayAt, fleetAt, tipAt,
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
/** Tropical sky: deep blue up top, pale turquoise at the horizon —
 *  bright, warm, never flat. */
const skyTexDay = () => ctex("runSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0a4fc0"); grad.addColorStop(0.34, "#2f7fe0"); grad.addColorStop(0.62, "#6fb8ef");
  grad.addColorStop(0.85, "#c8e8f4"); grad.addColorStop(1, "#fdf3d0");
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
/** soft radial glow sprite (sun halo, sea sparkle) */
const glowTex = () => ctex("runGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant gulls, painted as one sprite */
const birdTex = () => ctex("runBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** turquoise sea: gradient bands, wave streaks, white sparkle */
const seaTex = () => ctex("runSea", 1024, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0a7fa8"); grad.addColorStop(0.45, "#14a8c8"); grad.addColorStop(0.8, "#3ec8de"); grad.addColorStop(1, "#7fe0e8");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 130; i++) {
    const y = r() * 1024, x = r() * 1024, w = 40 + r() * 160;
    g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`;
    g.lineWidth = 2 + r() * 4;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + w * 0.5, y + (r() - 0.5) * 10, x + w, y + (r() - 0.5) * 8);
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const y = r() * 1024, x = r() * 1024, w = 20 + r() * 70;
    g.strokeStyle = `rgba(6,60,90,${0.06 + r() * 0.1})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (r() - 0.5) * 6); g.stroke();
  }
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.16})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});
/** white sand: pale base, speckles, tiny shells */
const sandTex = () => ctex("runSand", 512, 512, (g, r) => {
  g.fillStyle = "#f2e3c0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "180,150,100" : "255,250,230"},${0.10 + r() * 0.18})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
/** nutmeg canopy: deep green flecks with red fruit dots */
const nutmegLeafTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#2e6b34"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "20,60,25" : "90,160,80"},${0.12 + r() * 0.2})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 7 + r() * 18, 5 + r() * 12, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.5 ? `rgba(200,230,170,${0.10 + r() * 0.2})` : `rgba(15,45,20,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
  // red nutmeg fruit peeking through the leaves
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(200,50,30,${0.7 + r() * 0.3})`;
    g.beginPath(); g.arc(r() * 256, r() * 256, 3 + r() * 3, 0, 7); g.fill();
  }
});
/** palm bark: ringed, fibrous trunk */
const palmBarkTex = () => ctex("runPalmBark", 256, 256, (g, r) => {
  g.fillStyle = "#8a6a48"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 12) {
    g.strokeStyle = `rgba(60,40,20,${0.25 + r() * 0.2})`; g.lineWidth = 3 + r() * 2;
    g.beginPath(); g.moveTo(0, y + r() * 4); g.lineTo(256, y + r() * 4); g.stroke();
  }
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "60,40,20" : "200,170,130"},${0.10 + r() * 0.16})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** stone wall: grey blocks with mortar lines */
const stoneTex = () => ctex("runStone", 256, 256, (g, r) => {
  g.fillStyle = "#9a958c"; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 4; col++) {
      const x = col * 64 + (row % 2) * 32, y = row * 32;
      g.fillStyle = `rgba(${120 + r() * 60},${115 + r() * 55},${105 + r() * 50},0.85)`;
      g.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "60,55,50" : "210,205,195"},${0.08 + r() * 0.14})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** wood planks, painted warm for the Dutch town */
const townPlankTex = () => ctex("runTownPlank", 256, 256, (g, r) => {
  g.fillStyle = "#a87a4a"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = `rgba(${140 + r() * 40},${95 + r() * 30},${55 + r() * 20},0.9)`;
    g.fillRect(0, y + 2, 256, 28);
    g.strokeStyle = "rgba(60,40,20,0.5)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
  }
  for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(60,40,20,${0.06 + r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
const blobTex = () => ctex("runBlob", 256, 256, (g) => {
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

/** A nutmeg tree: brown trunk, layered deep-green canopy in
 *  blobs, red fruit — never a lollipop. */
const makeNutmeg = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(palmBarkTex(), 1, 2), color: "#7a5a3a" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(nutmegLeafTex(key), 1, 1) });
  const mats = [
    folM("#245c2c", "runNutDeep"),
    folM("#2e6b34", "runNutMid"),
    folM("#4a8a44", "runNutLite"),
  ];
  const cy = h * 0.72, cr = h * 0.32;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.72 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.35 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.34 + tr() * cr * 0.14, Math.sin(a) * d, cr * (0.42 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 0.9, 1);
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.45 + tr() * 0.45);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.4, Math.sin(a) * d, cr * (0.44 + tr() * 0.22), 1);
  }
  blobAt(0, cy + cr * 0.45, 0, cr * 0.36, 2);
  // red fruit clusters hanging low enough to see
  const fruitM = lam2({ color: "#c83220" });
  for (let i = 0; i < 6; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.5 + tr() * 0.4);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), fruitM);
    f.position.set(Math.cos(a) * d, cy - cr * 0.3 + tr() * cr * 0.3, Math.sin(a) * d);
    g.add(f);
  }
  return g;
};

/** A palm: leaning ringed trunk, drooping fronds. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 7);
  const trunkM = lam2({ map: rep(palmBarkTex(), 1, 2), color: "#8a6a48" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h, 8), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = 0.08; trunk.castShadow = true; g.add(trunk);
  const frondM = lam2({ color: "#3f8a3c", side: THREE.DoubleSide });
  const top = new THREE.Group();
  top.position.set(0.16, h, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.4;
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.6, 4), frondM);
    fr.position.set(Math.cos(a) * 1.1, -0.35, Math.sin(a) * 1.1);
    fr.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    fr.scale.set(1, 1, 0.22);
    top.add(fr);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lam2({ color: "#6a4a2c" }));
  crown.position.y = 0.1; top.add(crown);
  g.add(top);
  return { g, top };
};

/** A 17th-century tall ship: wooden hull, two masts, billowing
 *  sails, a stern castle — flag is a separate mesh so update()
 *  can wave it. `flag` = "en" (red cross) or "nl" (orange/white/
 *  blue) or "none". */
export type ShipRig = { g: THREE.Group; flag: THREE.Mesh; sailF: THREE.Mesh; sailA: THREE.Mesh; base: V3; phase: number };
const makeShip = (flag: "en" | "nl" | "none", seed = 1): ShipRig => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 13);
  const hullM = lam2({ color: "#5d3a22", map: rep(planks(), 2, 1) });
  const darkM = lam2({ color: "#3a2a1a" });
  // hull: a long box with a raised bow + stern
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 7.5), hullM);
  hull.position.y = 0.9; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 2.2, 8), hullM);
  bow.rotation.x = Math.PI / 2; bow.position.set(0, 0.9, 4.4); bow.scale.set(1, 1, 0.6); g.add(bow);
  const stern = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.4), hullM);
  stern.position.set(0, 1.5, -3.6); stern.castShadow = true; g.add(stern);
  const railM = lam2({ color: "#c9a83a" });
  for (const s of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 7.5), railM);
    rail.position.set(s * 1.12, 1.55, 0); g.add(rail);
  }
  // gun ports along the side
  for (let i = 0; i < 4; i++) {
    for (const s of [1, -1]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.28), darkM);
      port.position.set(s * 1.12, 0.95, -2.2 + i * 1.5); g.add(port);
    }
  }
  // two masts + sails
  const mastM = lam2({ color: "#6a4a2c" });
  const sailM = lam2({ color: "#f2ead8", side: THREE.DoubleSide });
  const mkMast = (z: number, h: number, w: number) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, h, 8), mastM);
    mast.position.set(0, 1.4 + h / 2, z); mast.castShadow = true; g.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(w, h * 0.62), sailM);
    sail.position.set(0, 1.4 + h * 0.62, z + 0.06);
    sail.rotation.y = 0; g.add(sail);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w + 0.3, 6), mastM);
    yard.rotation.z = Math.PI / 2; yard.position.set(0, 1.4 + h * 0.95, z); g.add(yard);
    return sail;
  };
  const sailF = mkMast(1.8, 5.2, 3.2);
  const sailA = mkMast(-1.6, 4.4, 2.8);
  // bowsprit
  const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.2, 6), mastM);
  sprit.rotation.x = Math.PI / 2 - 0.5; sprit.position.set(0, 1.8, 5.2); g.add(sprit);
  // the flag at the stern masthead
  const flagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6),
    new THREE.MeshLambertMaterial({ color: "#ffffff", side: THREE.DoubleSide }));
  flagMesh.position.set(0, 6.4, -3.4);
  {
    // paint the flag on a canvas so the cross / stripes read clearly
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 84;
    const fg = cv.getContext("2d")!;
    if (flag === "en") {
      fg.fillStyle = "#f4f1ea"; fg.fillRect(0, 0, 128, 84);
      fg.fillStyle = "#c02020"; fg.fillRect(58, 0, 12, 84); fg.fillRect(0, 36, 128, 12);
    } else if (flag === "nl") {
      fg.fillStyle = "#e8821e"; fg.fillRect(0, 0, 128, 28);
      fg.fillStyle = "#f4f1ea"; fg.fillRect(0, 28, 128, 28);
      fg.fillStyle = "#2c4a8a"; fg.fillRect(0, 56, 128, 28);
    } else {
      fg.fillStyle = "#f4f1ea"; fg.fillRect(0, 0, 128, 84);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    (flagMesh.material as THREE.MeshLambertMaterial).map = tex;
    (flagMesh.material as THREE.MeshLambertMaterial).needsUpdate = true;
  }
  g.add(flagMesh);
  void tr;
  return { g, flag: flagMesh, sailF, sailA, base: [0, 0, 0], phase: tr() * 6.28 };
};

/** A small stone fort: square walls, corner bastion, cannons,
 *  flagpole — front +Z toward the sea. */
const makeFort = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(stoneTex(), 2, 1), color: "#b0a89c" });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.2, 5.5), wallM);
  walls.position.y = 1.1; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const top = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.35, 6.0), lam2({ color: "#8a8378" }));
  top.position.y = 2.35; top.castShadow = true; g.add(top);
  // crenellations
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), wallM);
    c.position.set(-3 + i, 2.7, 2.9); g.add(c);
  }
  // gate arch on the land side
  const gate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.15), lam2({ color: "#4a3426" }));
  gate.position.set(0, 0.9, 2.78); g.add(gate);
  // two cannons pointing seaward
  const ironM = lam2({ color: "#2a2a2e" });
  for (const s of [1, -1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 10), ironM);
    barrel.rotation.x = Math.PI / 2 - 0.12; barrel.position.set(s * 1.8, 2.6, 3.4); barrel.castShadow = true; g.add(barrel);
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.0), lam2({ color: "#6a4a2c" }));
    carriage.position.set(s * 1.8, 2.35, 3.0); g.add(carriage);
  }
  // flagpole on the roof
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 6), lam2({ color: "#6a4a2c" }));
  pole.position.set(0, 4.4, 0); g.add(pole);
  return g;
};

/** A Dutch wooden town house: gabled, stepped gable front,
 *  shutters, door — front +Z. */
const makeTownHouse = (w: number, h: number, col: string, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 401 + 5);
  const wallM = lam2({ map: rep(townPlankTex(), 1, 1), color: col });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), wallM);
  walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.2, 0); shape.lineTo(w / 2 + 0.2, 0); shape.lineTo(0, h * 0.55); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: w * 0.8 + 0.2, bevelEnabled: false });
  roofGeo.translate(0, 0, -(w * 0.8 + 0.2) / 2);
  const roof = new THREE.Mesh(roofGeo, lam2({ color: "#5d3a2c" }));
  roof.position.y = h; roof.castShadow = true; g.add(roof);
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#3d5a78" });
  for (const wx of [-w * 0.28, w * 0.28]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), frameM);
    fr.position.set(wx, h * 0.55, w * 0.41); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.1), glassM);
    gl.position.set(wx, h * 0.55, w * 0.42); g.add(gl);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.08), lam2({ color: "#3a2a1a" }));
  door.position.set(0, 0.75, w * 0.41); g.add(door);
  void tr;
  return g;
};

/** A windmill: four-legged tower + a fan that spins in update(). */
const makeWindmill = (h: number) => {
  const g = new THREE.Group();
  const legM = lam2({ color: "#7a7a80" });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), legM);
    leg.position.set(sx * 0.8, h / 2, sz * 0.8);
    leg.rotation.z = -sx * 0.1; leg.rotation.x = sz * 0.1;
    g.add(leg);
  }
  const fan = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8), legM);
  hub.rotation.x = Math.PI / 2; fan.add(hub);
  const bladeM = lam2({ color: "#c8c8d0", side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.5), bladeM);
    blade.position.set(Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.12);
    blade.rotation.z = a + 0.5;
    fan.add(blade);
  }
  fan.position.set(0, h + 0.4, 0.35);
  g.add(fan);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), bladeM);
  tail.position.set(0, h + 0.4, -0.9); tail.rotation.y = Math.PI / 2;
  g.add(tail);
  return { g, fan };
};

/** A giant nutmeg: warm-brown sphere with a soft red-orange mace
 *  lacing — the fruit that was worth more than gold. The lacing
 *  bands sit at staggered heights/tilts so they read as a loose
 *  net, never a starburst at the poles. */
const makeGiantNutmeg = () => {
  const g = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 14),
    lam2({ color: "#a5703c", emissive: "#3a2210", emissiveIntensity: 0.9 }));
  nut.scale.set(1, 1.15, 1); nut.castShadow = true; g.add(nut);
  // red-orange mace lacing over the shell, staggered so no
  // two bands share the same pole crossing
  const maceM = lam2({ color: "#b04020", emissive: "#40140a", emissiveIntensity: 0.4 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 6, 24), maceM);
    band.position.y = (i - 2) * 0.18;
    band.rotation.set(Math.PI / 2 + i * 0.3, a, 0.2 * (i % 2 ? 1 : -1));
    band.scale.set(1, 1, 1.15);
    g.add(band);
  }
  g.scale.setScalar(0.72);
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#cfe8f2", 18, 170);
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
  private palms: { top: THREE.Group; ph: number }[] = [];
  private windmillFan: THREE.Group | null = null;
  private shipEn: ShipRig | null = null;
  private shipNl: ShipRig | null = null;
  private fleet: ShipRig[] = [];
  private fortFlagEn: THREE.Mesh | null = null;
  private fortFlagNl: THREE.Mesh | null = null;
  private balanceBeam: THREE.Group | null = null;
  private balancePanL: THREE.Group | null = null;
  private balancePanR: THREE.Group | null = null;
  private skyline: THREE.Group | null = null;
  private foam: THREE.Mesh[] = [];
  private giantNutmeg: THREE.Group | null = null;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1667);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#c8a882", 0.55);
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
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.5 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.7 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildBeach(R, r);
    this.buildGroveSet(R, r);
    this.buildFortSet(R, r);
    this.buildTownSet(R, r);
  }

  // ---------------- SET A: the cover beach + sea + island ----------------
  private buildBeach(R: THREE.Group, r: () => number) {
    // the sea: one big turquoise plane from the shoreline out
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(560, 280), lam2({ map: rep(seaTex(), 10, 5), color: "#2fb8d8" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.15, -70); sea.receiveShadow = true; R.add(sea);
    // the beach: white sand strip in front of the sea
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(140, 26), lam2({ map: rep(sandTex(), 8, 2), color: "#f2e3c0" }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.0, 12); sand.receiveShadow = true; R.add(sand);
    // distant sister islands on the horizon
    const farM = lam2({ color: "#5a8a7a" });
    for (const [hx, hz, hw, hh2] of [[-95, -115, 60, 5], [70, -125, 80, 7], [150, -105, 50, 4]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), farM);
      hill.position.set(hx, -1, hz); hill.scale.set(hw, hh2, 16); R.add(hill);
    }
    // ---- Run island: a green hill rising out of the sea ----
    const isl = new THREE.Group();
    const hillM = lam2({ color: "#3f7a3a" });
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), hillM);
    hill.position.y = 0.4; hill.scale.set(16, 5.5, 10); hill.castShadow = true; isl.add(hill);
    const sandRing = new THREE.Mesh(new THREE.RingGeometry(15.2, 17.5, 32), lam2({ color: "#f2e3c0" }));
    sandRing.rotation.x = -Math.PI / 2; sandRing.position.y = 0.02; isl.add(sandRing);
    // nutmeg trees + palms crowning the island
    const treePts: [number, number, number][] = [
      [-6, -2, 4.2], [5, -3, 4.6], [-2, 2, 3.8], [8, 1, 4.0], [-9, 1, 3.6], [2, -5, 4.4], [-4, -5, 3.9],
    ];
    treePts.forEach(([x, z, h], i) => {
      const t = makeNutmeg(h, 31 + i * 7);
      t.position.set(x, 1.2, z);
      isl.add(t);
      this.trees.push({ g: t, ph: i * 1.31 });
    });
    for (const [px, pz] of [[-11, 3], [11, -4]] as [number, number][]) {
      const p = makePalm(5.5, 51 + px);
      p.g.position.set(px, 1.0, pz);
      isl.add(p.g);
      this.palms.push({ top: p.top, ph: px * 0.7 });
    }
    // a few tiny island houses with rust-red roofs
    for (const [hx2, hz2] of [[-3, 4], [4, 3]] as [number, number][]) {
      const h = new THREE.Group();
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.8), lam2({ color: "#e8dcc4" }));
      w.position.y = 0.7; w.castShadow = true; h.add(w);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.0, 4), lam2({ color: "#8f4a3a" }));
      roof.position.y = 1.9; roof.rotation.y = Math.PI / 4; h.add(roof);
      h.position.set(hx2, 1.6, hz2);
      isl.add(h);
    }
    isl.position.set(ISLAND[0], 0, ISLAND[2]);
    R.add(isl);
    // foam rings lapping the island shore
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(16.5 + i * 1.6, 17.3 + i * 1.6, 40),
        new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35 - i * 0.12, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(ISLAND[0], 0.02 + i * 0.01, ISLAND[2]);
      R.add(ring);
      this.foam.push(ring);
    }
    // ---- the two tall ships at anchor off the island ----
    const en = makeShip("en", 101);
    en.g.position.set(...SHIP_EN); en.g.rotation.y = 0.35;
    R.add(en.g); this.shipEn = en;
    const nl = makeShip("nl", 202);
    nl.g.position.set(...SHIP_NL); nl.g.rotation.y = -0.5;
    R.add(nl.g); this.shipNl = nl;
    // beach palms framing the cover shot
    for (const [px, pz, h] of [[-14, 14, 6.5], [14, 16, 6.0], [-20, 6, 5.5]] as [number, number, number][]) {
      const p = makePalm(h, 61 + px);
      p.g.position.set(px, 0, pz);
      R.add(p.g);
      this.palms.push({ top: p.top, ph: px * 0.9 });
    }
    // the GIANT nutmeg on the sand beside the hero
    const nut = makeGiantNutmeg();
    nut.position.set(4.2, 1.05, 12.5);
    nut.scale.setScalar(1.1);
    R.add(nut);
    this.giantNutmeg = nut;
    // shells scattered on the sand
    const shellM = lam2({ color: "#fff8ec" });
    for (let i = 0; i < 16; i++) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), shellM);
      sh.position.set(-18 + r() * 36, 0.06, 4 + r() * 14);
      sh.rotation.set(Math.PI / 2 + (r() - 0.5), 0, r() * 3);
      R.add(sh);
    }
    void r;
  }

  // ---------------- SET B: the nutmeg grove (x = GROVE_X) ----------------
  private buildGroveSet(R: THREE.Group, r: () => number) {
    const X = GROVE_X;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), lam2({ color: "#7a9a4a", map: rep(sandTex(), 4, 3) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0.0, -6); floor.receiveShadow = true; R.add(floor);
    // a ring of nutmeg trees heavy with fruit
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const tx = X + Math.cos(a) * 11, tz = -6 + Math.sin(a) * 9;
      if (Math.abs(tx - (X - 3.5)) < 3 && Math.abs(tz - 4.5) < 3) continue; // hero's clearing
      const t = makeNutmeg(4.6 + (i % 3) * 0.5, 71 + i * 11);
      t.position.set(tx, 0, tz);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 });
    }
    // the gold: a pile of coins at the hero's feet
    const coinM = lam2({ color: "#e8b820" });
    for (let i = 0; i < 30; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), coinM);
      c.position.set(X - 2 + (r() - 0.5) * 2.2, 0.04 + (i % 4) * 0.05, 6 + (r() - 0.5) * 1.6);
      c.rotation.y = r() * Math.PI; c.castShadow = true; R.add(c);
    }
    // fallen nutmegs on the ground
    const nutM = lam2({ color: "#8a5a30" });
    for (let i = 0; i < 12; i++) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), nutM);
      n.position.set(X - 8 + r() * 16, 0.14, -12 + r() * 14);
      n.scale.y = 1.15; R.add(n);
    }
    void r;
  }

  // ---------------- SET C: Courthope's fort (x = FORT_X) ----------------
  private buildFortSet(R: THREE.Group, r: () => number) {
    const X = FORT_X;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), lam2({ color: "#5a7a44" }));
    hill.position.set(X, -1.2, -4); hill.scale.set(11, 4.5, 9); hill.receiveShadow = true; R.add(hill);
    const fort = makeFort();
    fort.position.set(X, 3.2, -4); fort.rotation.y = 0.15;
    R.add(fort);
    // the flagpole flags: English while Courthope holds it,
    // Dutch after the fall (swapped per shot in update). The pole
    // spans world y 5.5–9.7 (fort at y 3.2 + pole local 2.3–6.5),
    // so the flag flies at y 9.6.
    const poleTop = new THREE.Vector3(X, 3.2 + 6.4, -4);
    const mkFlag = (cols: string[]) => {
      const cv = document.createElement("canvas"); cv.width = 96; cv.height = 64;
      const fg = cv.getContext("2d")!;
      if (cols.length === 1) {
        fg.fillStyle = cols[0]; fg.fillRect(0, 0, 96, 64);
        fg.fillStyle = "#c02020"; fg.fillRect(44, 0, 9, 64); fg.fillRect(0, 28, 96, 9);
      } else {
        const h = 64 / cols.length;
        cols.forEach((c, i) => { fg.fillStyle = c; fg.fillRect(0, i * h, 96, h); });
      }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0),
        new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      m.position.copy(poleTop); m.position.x += 0.78;
      R.add(m);
      return m;
    };
    this.fortFlagEn = mkFlag(["#f4f1ea"]);
    this.fortFlagNl = mkFlag(["#e8821e", "#f4f1ea", "#2c4a8a"]);
    this.fortFlagNl.visible = false;
    // scrub + a palm on the hill
    const bushM = lam2({ color: "#5a7a3a" });
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.4, 9, 7), bushM);
      b.position.set(X - 8 + r() * 16, 0.4, -10 + r() * 12);
      b.scale.y = 0.7; b.castShadow = true; R.add(b);
    }
    const p = makePalm(5.5, 91);
    p.g.position.set(X + 8, 0, 2);
    R.add(p.g);
    this.palms.push({ top: p.top, ph: 3.3 });
    void r;
  }

  // ---------------- SET D: New Amsterdam + treaty + balance (x = TOWN_X) ----------------
  private buildTownSet(R: THREE.Group, r: () => number) {
    const X = TOWN_X;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), lam2({ color: "#b09a78", map: rep(sandTex(), 5, 3) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(X, 0.0, -4); ground.receiveShadow = true; R.add(ground);
    // the wooden Dutch town along the shore
    const houses: [number, number, number, number, string][] = [
      [-14, -10, 3.4, 3.0, "#c9a86a"], [-8, -13, 3.0, 2.7, "#b08a5a"], [6, -12, 3.8, 3.3, "#d9b878"],
      [12, -8, 3.0, 2.6, "#a87a4a"], [-2, -16, 4.2, 3.6, "#c9a86a"],
    ];
    houses.forEach(([hx, hz, w, h, col], i) => {
      const hs = makeTownHouse(w, h, col, 111 + i * 7);
      hs.position.set(X + hx, 0, hz);
      hs.rotation.y = (i % 3 - 1) * 0.15;
      R.add(hs);
    });
    // the church with its steeple
    const ch = makeTownHouse(3.6, 3.4, "#e8dcc4", 151);
    ch.position.set(X + 14, 0, -14);
    R.add(ch);
    const steeple = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.6, 4), lam2({ color: "#5d3a2c" }));
    steeple.position.set(X + 14, 4.6, -14); steeple.rotation.y = Math.PI / 4; steeple.castShadow = true; R.add(steeple);
    // the windmill on the town's edge
    const wm = makeWindmill(7.5);
    wm.g.position.set(X - 18, 0, 4);
    R.add(wm.g);
    this.windmillFan = wm.fan;
    // the treaty table: planks, papers, quill, wax seal, small scale
    const table = new THREE.Group();
    const topM = lam2({ color: "#6a4a2c", map: rep(planks(), 2, 1) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.8), topM);
    top.position.y = 0.95; top.castShadow = true; table.add(top);
    for (const [lx, lz] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]] as [number, number][]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), topM);
      leg.position.set(lx, 0.48, lz); table.add(leg);
    }
    const paperM = lam2({ color: "#f4f1ea" });
    for (const [px, pz, ry] of [[-0.7, 0.2, 0.2], [0.7, -0.2, -0.3]] as [number, number, number][]) {
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.5), paperM);
      paper.position.set(px, 1.05, pz); paper.rotation.y = ry; table.add(paper);
    }
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10), lam2({ color: "#a02020" }));
    seal.position.set(0.1, 1.08, 0.4); table.add(seal);
    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.7, 6), lam2({ color: "#f4f1ea" }));
    quill.position.set(-0.2, 1.1, 0.5); quill.rotation.z = 1.1; table.add(quill);
    table.position.set(X + 0.5, 0, -2);
    R.add(table);
    // ---- the GIANT balance: post + beam + two pans ----
    const bal = new THREE.Group();
    const postM = lam2({ color: "#4a3426" });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 5.2, 10), postM);
    post.position.y = 2.6; post.castShadow = true; bal.add(post);
    const beam = new THREE.Group();
    beam.position.y = 4.9;
    const beamBar = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 0.22), lam2({ color: "#c9a83a" }));
    beamBar.castShadow = true; beam.add(beamBar);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lam2({ color: "#c9a83a" }));
    finial.position.y = 0.25; beam.add(finial);
    const mkPan = (x: number) => {
      const pan = new THREE.Group();
      pan.position.set(x, 0, 0);
      for (const s of [1, -1]) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), postM);
        chain.position.set(s * 0.45, -0.55, 0); chain.rotation.z = s * 0.35; pan.add(chain);
      }
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.55, 0.35, 14), lam2({ color: "#8a6a3a" }));
      dish.position.y = -1.2; dish.castShadow = true; pan.add(dish);
      beam.add(pan);
      return pan;
    };
    const panL = mkPan(-3.4), panR = mkPan(3.4);
    // the tiny island on the left pan, the city on the right
    const miniIsl = new THREE.Group();
    const mh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), lam2({ color: "#3f7a3a" }));
    mh.scale.set(1, 0.5, 0.8); mh.position.y = -0.95; miniIsl.add(mh);
    const mt = makeNutmeg(0.7, 201);
    mt.position.y = -1.0; mt.scale.setScalar(0.45); miniIsl.add(mt);
    panL.add(miniIsl);
    const miniCity = new THREE.Group();
    const cityM = lam2({ color: "#3a4a6a" });
    [[-0.5, 0.9], [0, 1.3], [0.5, 0.8]].forEach(([cx, ch2]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, ch2, 0.4), cityM);
      b.position.set(cx, -1.0 + ch2 / 2, 0); b.castShadow = true; miniCity.add(b);
    });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), lam2({ color: "#c9a83a" }));
    spire.position.set(0, -0.1, 0); miniCity.add(spire);
    panR.add(miniCity);
    bal.add(beam);
    bal.position.set(X + 2, 0, -4);
    R.add(bal);
    this.balanceBeam = beam;
    this.balancePanL = panL;
    this.balancePanR = panR;
    // ---- the fleet for shot 7: two extra English ships ----
    for (let i = 0; i < 2; i++) {
      const fs = makeShip("en", 301 + i * 17);
      fs.g.rotation.y = 0.3 + i * 0.2;
      fs.g.visible = false;
      R.add(fs.g);
      this.fleet.push(fs);
    }
    // ---- the modern NYC skyline — punchline only (shot 10) ----
    const sky = new THREE.Group();
    const winTex = ctex("runWin", 128, 256, (g, wr) => {
      g.fillStyle = "#2c3a58"; g.fillRect(0, 0, 128, 256);
      for (let y = 8; y < 248; y += 16) for (let x = 8; x < 120; x += 14) {
        g.fillStyle = wr() > 0.55 ? "#ffd76a" : "#1a2438";
        g.fillRect(x, y, 8, 10);
      }
    });
    const skyM = lam2({ map: rep(winTex, 1, 1), color: "#8a9ab8" });
    const heights = [9, 13, 18, 11, 15, 21, 12, 16, 10, 14];
    heights.forEach((h, i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 3.2), skyM);
      b.position.set(-27 + i * 6, h / 2, (i % 3 - 1) * 2);
      b.castShadow = true; sky.add(b);
    });
    const esb = new THREE.Mesh(new THREE.BoxGeometry(3.6, 24, 3.6), skyM);
    esb.position.set(0, 12, -2); esb.castShadow = true; sky.add(esb);
    const esp = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.5, 6), lam2({ color: "#c9a83a" }));
    esp.position.set(0, 26, -2); sky.add(esp);
    sky.position.set(0, 0, -70);
    sky.visible = false;
    R.add(sky);
    this.skyline = sky;
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

  /** Pose one ship rig: gentle bob + sail flutter, or sailing
   *  (bigger heel + faster bob). */
  private poseShip(s: ShipRig, t: number, mode: "anchor" | "sail" = "anchor") {
    const ph = t * 1.1 + s.phase;
    const amp = mode === "sail" ? 0.09 : 0.04;
    s.g.position.y = Math.sin(ph) * amp;
    s.g.rotation.z = Math.sin(ph * 0.8) * (mode === "sail" ? 0.05 : 0.02);
    s.g.rotation.x = Math.sin(ph * 0.6 + 1) * 0.015;
    s.sailF.rotation.y = Math.sin(t * 1.5 + s.phase) * 0.03;
    s.sailA.rotation.y = Math.sin(t * 1.3 + s.phase + 1) * 0.03;
    s.flag.rotation.y = Math.sin(t * 2.2 + s.phase) * 0.28;
  }

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
    for (const pl of this.palms) {
      pl.top.rotation.z = Math.sin(tt * 1.3 + pl.ph) * 0.06;
      pl.top.rotation.x = Math.cos(tt * 1.0 + pl.ph * 1.7) * 0.04;
    }
    if (this.windmillFan) this.windmillFan.rotation.z = tt * 1.6;
    for (const fo of this.foam) {
      const sc2 = 1 + Math.sin(tt * 0.9 + fo.position.x) * 0.02;
      fo.scale.set(sc2, sc2, 1);
      (fo.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(tt * 0.9) * 0.06;
    }
    // ---- the ships, posed per shot ----
    const en = this.shipEn, nl = this.shipNl;
    if (en) {
      en.g.visible = (id === 1 || id === 2 || id === 4 || id === 6 || id === 10);
      if (id === 6) {
        // sailing away from the FORT into the sunset: the fort
        // anchorage -> a speck on the horizon (fort-relative, so
        // the ship stays in this shot's camera at FORT_X)
        const u = sailAwayAt(6, tt);
        en.g.position.set(
          (FORT_X - 9) - 19 * u,
          0, -20 - 55 * u);
        en.g.rotation.y = 0.35 + u * 0.2;
        this.poseShip(en, t, "sail");
      } else {
        en.g.position.set(...SHIP_EN);
        en.g.rotation.y = 0.35;
        this.poseShip(en, t, "anchor");
      }
    }
    if (nl) {
      nl.g.visible = (id === 1 || id === 2 || id === 4 || id === 10);
      nl.g.position.set(...SHIP_NL);
      nl.g.rotation.y = -0.5;
      this.poseShip(nl, t, "anchor");
    }
    // the fleet sails in off New Amsterdam (shot 7 only)
    this.fleet.forEach((fs, i) => {
      fs.g.visible = (id === 7);
      if (id === 7) {
        const u = fleetAt(7, tt);
        fs.g.position.set(
          (TOWN_X - 40 + i * 12) + (28 - i * 6) * u,
          0, (-70 + i * 8) + 42 * u);
        fs.g.rotation.y = 0.3 + i * 0.2;
        this.poseShip(fs, t, "sail");
      }
    });
    // ---- the fort flags: English while Courthope holds it,
    // Dutch rising after the fall (shot 6) ----
    if (this.fortFlagEn) this.fortFlagEn.visible = (id <= 5);
    if (this.fortFlagNl) {
      this.fortFlagNl.visible = (id >= 6);
      if (id === 6) {
        // the Dutch flag climbs the pole across the shot
        const u = clamp01((tt - (SHOTS[5].a / FPS)) / Math.max(0.01, (SHOTS[5].b - SHOTS[5].a) / FPS));
        this.fortFlagNl.position.y = 6.7 + u * 2.9;
      } else {
        this.fortFlagNl.position.y = 9.6;
      }
    }
    // ---- the giant balance tips (shot 9) ----
    if (this.balanceBeam) {
      const tip = tipAt(9, tt);
      this.balanceBeam.rotation.z = tip * 0.16;
      if (this.balancePanL) this.balancePanL.rotation.z = -tip * 0.16;
      if (this.balancePanR) this.balancePanR.rotation.z = -tip * 0.16;
    }
    // ---- the modern skyline rises only for the punchline ----
    if (this.skyline) this.skyline.visible = (id === 10);
    // ---- the giant nutmeg: beach for cover + loop, grove for shot 3 ----
    if (this.giantNutmeg) {
      if (id === 3) {
        this.giantNutmeg.visible = true;
        this.giantNutmeg.position.set(GROVE_X + 1, 0.83, 2.5);
      } else if (id === 1 || id === 10) {
        this.giantNutmeg.visible = true;
        this.giantNutmeg.position.set(4.6, 0.83, 12.5);
      } else {
        this.giantNutmeg.visible = false;
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
