// Papakolea, Hawaii as one three.js scene for the Fafnir-ID
// cover frame: a cove on the Big Island's south coast — a GREEN
// SAND beach in a bay half-circled by the old Pu'u Mahana tuff
// ring, turquoise ocean beyond, palms at the beach edge. The
// sand MUST read unmistakably green: a yellow-green olive base
// with lime highlights and black/white grain speckle. Waves wash
// the shoreline (animated foam), crystals sparkle on the sand,
// and in shot 9 a grey veil creeps over the beach as the green
// drains away. VISUAL CORE: bright tropical daylight, turquoise
// water, green sand, dark ash cone — textured everything
// (anti-banding: speckled sky, flecked water, grainy sand).
// Layered light rig: sun key w/ soft shadows + hemisphere fill
// + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, roof } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, BEACH_C, CONE, GEM_POS, clamp01 } from "./story";

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
const skyTexDay = () => ctex("hawaiiSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#0d5cb5"); grad.addColorStop(0.34, "#3f8fd8"); grad.addColorStop(0.62, "#8ec4ec");
  grad.addColorStop(0.85, "#c4e2f7"); grad.addColorStop(1, "#eaf6fd");
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
const glowTex = () => ctex("hawaiiGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("hawaiiBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** palm frond leaf texture: deep green blades with sunlit ribs */
const frondTex = () => ctex("hawaiiFrond", 256, 256, (g, r) => {
  g.fillStyle = "#3d7a2e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(20,52,14,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(190,230,120,${0.12 + r() * 0.22})` : `rgba(16,44,10,${0.10 + r() * 0.18})`;
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
/** GREEN SAND — the episode's hero texture, and it MUST read
 *  green at any distance: a strong yellow-green olive base,
 *  lime highlights, dark olive hollows, black lava grains and
 *  white shell flecks — built with the same value-contrast
 *  recipe as the house grass so it survives the sun lift
 *  without flattening into brown. */
const greenSandTex = () => ctex("hawaiiGreenSand", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#7fa32c"; g.fillRect(0, 0, S, S);
  // olive value blotches: dark hollows + bright lime rises
  for (let i = 0; i < 130; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110, dark = r() < 0.5;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "58,84,18" : "178,205,72";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.38 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  // crystal glints: thousands of hard-contrast lime flecks
  for (let i = 0; i < 8000; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => {
      const pick = r();
      g.fillStyle = pick > 0.62 ? `rgba(216,236,120,${0.14 + r() * 0.26})` : pick > 0.3 ? `rgba(52,86,16,${0.14 + r() * 0.24})` : `rgba(18,18,14,${0.12 + r() * 0.2})`;
      g.beginPath(); g.ellipse(xx, yy, 1.8 + r() * 3.2, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
    });
  }
  // black lava grains + white shell flecks, scattered
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = r() > 0.5 ? `rgba(20,20,16,${0.3 + r() * 0.4})` : `rgba(244,242,230,${0.3 + r() * 0.4})`;
    g.beginPath(); g.arc(x, y, 1.2 + r() * 2.2, 0, 7); g.fill();
  }
});
/** GREY SAND — the "ordinary beach" veil that creeps over the
 *  green in shot 9: dull grey-brown, the colour Papakolea would
 *  turn if the olivine ran out. */
const greySandTex = () => ctex("hawaiiGreySand", 512, 512, (g, r) => {
  g.fillStyle = "#8a8172"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "168,160,146" : "70,66,58"},${0.12 + r() * 0.22})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 4.4, 1.6 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
/** LAVA FIELD: dark basalt broken by rust-ochre blotches and grit */
const lavaTex = () => ctex("hawaiiLava", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#3a3128"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = 34 + r() * 120, dark = r() < 0.55;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "22,19,16" : "107,74,46";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.36 : 0.28})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 7000; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => {
      const pick = r();
      g.fillStyle = pick > 0.62 ? `rgba(180,150,110,${0.10 + r() * 0.22})` : pick > 0.3 ? `rgba(60,48,36,${0.12 + r() * 0.22})` : `rgba(14,12,10,${0.12 + r() * 0.2})`;
      g.beginPath(); g.ellipse(xx, yy, 1.8 + r() * 3.2, 1.2 + r() * 2, r() * 3, 0, 7); g.fill();
    });
  }
});
/** CONE STRATA: horizontal ash bands — rust, ochre, dark grey —
 *  with a green-olivine speckle band near the base, where the
 *  crystals weather out of the tuff. */
const strataTex = () => ctex("hawaiiStrata", 512, 512, (g, r) => {
  const bands = ["#4a3826", "#6b4a2e", "#2e2a26", "#8a6a3e", "#3a3a32", "#5d4028", "#7a5a34", "#2c2622"];
  let y = 0;
  while (y < 512) {
    const h = 18 + r() * 42;
    g.fillStyle = bands[Math.floor(r() * bands.length)];
    g.fillRect(0, y, 512, h);
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, y + h - 3, 512, 3);
    y += h;
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "190,186,170" : "10,10,10"},${0.05 + r() * 0.1})`;
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
  // olivine speckle near the base (bottom of the canvas)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(150,190,60,${0.2 + r() * 0.4})`;
    g.beginPath(); g.arc(r() * 512, 380 + r() * 132, 1.2 + r() * 2.4, 0, 7); g.fill();
  }
});
/** BASALT ROCK: near-black with vertical column streaks */
const basaltTex = () => ctex("hawaiiBasalt", 512, 512, (g, r) => {
  g.fillStyle = "#3d3d3c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 320; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.42 ? `rgba(14,14,13,${0.14 + r() * 0.2})` : `rgba(150,148,138,${0.10 + r() * 0.14})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "190,186,170" : "10,10,10"},${0.05 + r() * 0.1})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** shore gravel: grey-brown pebble speckle */
const gravelTex = () => ctex("hawaiiGravel", 512, 512, (g, r) => {
  g.fillStyle = "#6d675c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "168,160,146" : "52,50,46"},${0.12 + r() * 0.22})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 4.4, 1.6 + r() * 3, r() * 3, 0, 7); g.fill();
  }
});
/** soft warm light pool for sunlit variation on the field */
const patchTex = () => ctex("hawaiiPatch", 256, 256, (g) => {
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
/** bark: vertical fissured streaks for palm trunks */
const barkTex = () => ctex("hawaiiBark", 256, 256, (g, r) => {
  g.fillStyle = "#6e5138"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(40,26,14,${0.16 + r() * 0.22})` : `rgba(206,172,130,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("hawaiiBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** foam: a soft white ring for the wash line at the shoreline */
const foamTex = () => ctex("hawaiiFoam", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)");
  gr.addColorStop(0.8, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** Pu'u Mahana: a broad tuff cone in layered ash strata, a flat
 *  dark crater on top, and a green-olive skirt at the base where
 *  the olivine weathers out onto the beach. */
const makeCone = () => {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(26, 15, 24, 1, true), lam2({ map: rep(strataTex(), 4, 1) }));
  cone.position.y = 7.5; g.add(cone);
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(27.5, 3.2, 24, 1, true),
    lam2({ color: "#5d7d24", map: rep(greenSandTex(), 6, 1) }));
  skirt.position.y = 1.4; g.add(skirt);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), lam2({ color: "#2c2c2b" }));
  crater.rotation.x = -Math.PI / 2; crater.position.y = 14.9; g.add(crater);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.55, 8, 20), lam2({ map: rep(basaltTex(), 2, 1) }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 14.9; g.add(rim);
  return g;
};

/** A palm: ringed trunk leaning slightly, a crown of drooping
 *  fronds (flattened cones, layered greens) + coconut cluster. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, h, 8), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = 0.08; trunk.castShadow = true; g.add(trunk);
  const topX = Math.sin(0.08) * h, topY = h * 0.99;
  const frondM = lam2({ color: "#4a8a34", map: rep(frondTex(), 1, 1) });
  const frondM2 = lam2({ color: "#6aa844", map: rep(frondTex(), 1, 1) });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.4;
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.6, 4), i % 2 ? frondM : frondM2);
    fr.scale.set(1, 1, 0.16);
    fr.position.set(topX + Math.cos(a) * 1.1, topY + 0.15 - Math.sin(a) * 0.1, Math.sin(a) * 1.1);
    fr.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
    fr.rotation.y = -a;
    fr.castShadow = true; g.add(fr);
  }
  const nutM = lam2({ color: "#6b4a2a" });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutM);
    nut.position.set(topX + (tr() - 0.5) * 0.7, topY - 0.35, (tr() - 0.5) * 0.7);
    g.add(nut);
  }
  return g;
};

/** The giant peridot: a faceted octahedron, glossy yellow-green,
 *  resting on a little green sand mound. */
const makeGem = () => {
  const g = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 10), lam2({ map: rep(greenSandTex(), 3, 3) }));
  mound.scale.set(1.2, 0.3, 1); mound.position.y = 0.05; mound.receiveShadow = true; g.add(mound);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.7, 0),
    new THREE.MeshLambertMaterial({ color: "#8fc41e", emissive: "#2a4a00", emissiveIntensity: 0.35, flatShading: true }));
  gem.scale.set(1, 1.3, 0.85); gem.position.y = 2.0; gem.castShadow = true; g.add(gem);
  const gemTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshLambertMaterial({ color: "#c8e64a", emissive: "#3a5a00", emissiveIntensity: 0.4, flatShading: true }));
  gemTop.scale.set(1, 1.2, 0.85); gemTop.position.set(0.9, 2.9, 0.5); gemTop.rotation.z = 0.5; gemTop.castShadow = true; g.add(gemTop);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. Instanced. */
const grassTuftGeo = () => {
  const tr = rng(4242);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#4a5a22"), tip = new THREE.Color("#b8c46a"), tmp = new THREE.Color();
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
  private fog = new THREE.Fog("#b8d8ee", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private waterMap: THREE.Texture | null = null;
  private foam: THREE.Mesh | null = null;
  private foamMat: THREE.MeshBasicMaterial | null = null;
  private wash: THREE.Mesh | null = null;
  private washMat: THREE.MeshBasicMaterial | null = null;
  private fadeMat: THREE.MeshBasicMaterial | null = null;
  private fadeMesh: THREE.Mesh | null = null;
  private gem: THREE.Group | null = null;
  private sparkles: THREE.Sprite[] = [];
  private sparkleBase: { x: number; y: number; z: number; s: number; ph: number }[] = [];
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2026);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a7a5f", 0.55);
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
    // ---- Pu'u Mahana, the old tuff ring wrapping the bay ----
    const cone = makeCone();
    cone.position.set(CONE[0], 0, CONE[2]);
    R.add(cone);
    // ---- the giant peridot, resting on the green sand ----
    this.gem = makeGem();
    this.gem.position.set(GEM_POS[0], 0, GEM_POS[2]);
    R.add(this.gem);
  }

  // ---------------- the cove: lava field, ocean, green beach, cone base ----------------
  private buildShore(R: THREE.Group, r: () => number) {
    // the lava field under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(lavaTex(), 130, 130) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the ocean: a big turquoise disc north of the beach
    const oceanMap = rep(water(), 9, 7);
    this.waterMap = oceanMap;
    const ocean = new THREE.Mesh(new THREE.CircleGeometry(95, 44), lam2({ map: oceanMap, color: "#2e9db0" }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.0, -105);
    ocean.receiveShadow = true; R.add(ocean);
    // rocky headland under the cone so it does not sit in the sea
    const headland = new THREE.Mesh(new THREE.CircleGeometry(36, 32), lam2({ map: rep(basaltTex(), 10, 10) }));
    headland.rotation.x = -Math.PI / 2; headland.position.set(0, 0.015, -40);
    headland.receiveShadow = true; R.add(headland);
    // THE GREEN SAND BEACH: the ellipse the whole episode is about
    const beach = new THREE.Mesh(new THREE.CircleGeometry(13, 44), lam2({ map: rep(greenSandTex(), 6, 6) }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(BEACH_C[0], 0.03, BEACH_C[2]);
    beach.scale.set(1.0, 0.69, 1); beach.receiveShadow = true; R.add(beach);
    // THE GREEN DUNE: a big sparkling mound at the beach centre —
    // frame 0's anomaly, big and already moving (waves + glints)
    const dune = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), lam2({ map: rep(greenSandTex(), 4, 4) }));
    dune.scale.set(1.15, 0.34, 0.9); dune.position.set(-1.0, -0.15, -2.0);
    dune.castShadow = true; dune.receiveShadow = true; R.add(dune);
    const dune2 = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 12), lam2({ map: rep(greenSandTex(), 3, 3) }));
    dune2.scale.set(1.1, 0.3, 0.9); dune2.position.set(5.5, -0.1, -6.5);
    dune2.castShadow = true; dune2.receiveShadow = true; R.add(dune2);
    // sparkle glints scattered on the dune + beach (twinkle in update)
    const glintSpots: [number, number, number, number][] = [
      [-1.0, 1.35, -2.0, 0.9], [-3.2, 0.9, -0.5, 0.7], [1.2, 0.8, -3.5, 0.8],
      [5.5, 0.75, -6.5, 0.7], [-5.5, 0.35, -6.0, 0.6], [3.0, 0.3, 1.5, 0.6],
      [0, 3.6, -5.5, 0.8], [1.6, 2.6, -4.6, 0.55],
    ];
    glintSpots.forEach(([x, y, z, s], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.7 }));
      sp.position.set(x, y, z); sp.scale.set(s, s, 1); sp.layers.set(NOINK); R.add(sp);
      this.sparkles.push(sp);
      this.sparkleBase.push({ x, y, z, s, ph: i * 1.37 });
    });
    // THE WASH: foam ring at the shoreline, pulsing with the surf
    this.foamMat = new THREE.MeshBasicMaterial({ map: foamTex(), transparent: true, depthWrite: false, opacity: 0.4 });
    this.foam = new THREE.Mesh(new THREE.RingGeometry(11.2, 13.4, 40), this.foamMat);
    this.foam.rotation.x = -Math.PI / 2; this.foam.position.set(BEACH_C[0], 0.045, BEACH_C[2]);
    this.foam.scale.set(1.0, 0.69, 1); this.foam.renderOrder = 2; R.add(this.foam);
    this.washMat = new THREE.MeshBasicMaterial({ map: foamTex(), transparent: true, depthWrite: false, opacity: 0.22 });
    this.wash = new THREE.Mesh(new THREE.CircleGeometry(12.2, 40), this.washMat);
    this.wash.rotation.x = -Math.PI / 2; this.wash.position.set(BEACH_C[0], 0.042, BEACH_C[2] - 1.2);
    this.wash.scale.set(1.0, 0.62, 1); this.wash.renderOrder = 2; R.add(this.wash);
    // THE FADE (shot 9 only): a grey veil creeping over the beach
    this.fadeMat = new THREE.MeshBasicMaterial({ map: greySandTex(), transparent: true, opacity: 0, depthWrite: false });
    this.fadeMesh = new THREE.Mesh(new THREE.CircleGeometry(13, 44), this.fadeMat);
    this.fadeMesh.rotation.x = -Math.PI / 2; this.fadeMesh.position.set(BEACH_C[0], 0.05, BEACH_C[2]);
    this.fadeMesh.scale.set(1.0, 0.69, 1); this.fadeMesh.renderOrder = 3; this.fadeMesh.visible = false; R.add(this.fadeMesh);
    // basalt boulders ringing the beach + scattered on the field
    const rockM = lam2({ map: rep(basaltTex(), 1, 1) });
    const rockAt = (x: number, z: number, s: number) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      rock.position.set(x, s * 0.42, z);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
    };
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + r() * 0.2;
      // ring the beach rim, skipping the north waterline gap
      if (Math.sin(a) < -0.55 && Math.abs(Math.cos(a)) < 0.45) continue;
      rockAt(BEACH_C[0] + Math.cos(a) * 13.4, BEACH_C[2] + Math.sin(a) * 9.4, 0.35 + r() * 0.6);
    }
    for (let i = 0; i < 16; i++) rockAt((r() - 0.5) * 90, 14 - r() * 90, 0.5 + r() * 1.1);
    // cone-base debris: olivine-rich rubble at the foot of Pu'u Mahana
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2;
      rockAt(CONE[0] + Math.cos(a) * (24 + r() * 4), CONE[2] + Math.sin(a) * (24 + r() * 4) * 0.6, 0.4 + r() * 0.7);
    }
    // ---- the hiking trail: dirt path from the lava field to the beach ----
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 10.5), lam2({ map: rep(gravelTex(), 1, 4) }));
    trail.rotation.x = -Math.PI / 2; trail.rotation.z = Math.PI / 4;
    trail.position.set(4.25, 0.02, 10.25); trail.receiveShadow = true; R.add(trail);
    // ---- palms edging the beach ----
    const palmSpots: [number, number, number][] = [
      [-15.5, 2.5, 4.2], [15.8, 3.5, 3.8], [-17.5, -7, 4.6], [17.5, -9, 4.0], [11.5, 9.5, 3.4],
    ];
    palmSpots.forEach(([x, z, h], i) => {
      const p = makePalm(h, 40 + i * 13);
      p.position.set(x, 0, z);
      p.rotation.y = r() * Math.PI * 2;
      R.add(p);
      this.palms.push({ g: p, ph: i * 1.71 });
      blob(R, x, 0.03, z, 3.2, 3.2, 0.3);
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
    // ---- instanced dry-grass tufts over the lava field (never on the beach) ----
    const inBeach = (x: number, z: number) => ((x - BEACH_C[0]) / 13.6) ** 2 + ((z - BEACH_C[2]) / 9.6) ** 2 < 1.12;
    const inOcean = (x: number, z: number) => z < -12 && Math.hypot(x, z + 105) < 96;
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 1500; i++) {
      const x = (r() - 0.5) * 110, z = 18 - r() * 105;
      if (inBeach(x, z) || inOcean(x, z)) continue;
      tuftPts.push({ x, z, s: 0.7 + r() * 0.85 });
    }
    for (let i = 0; i < 260; i++) { // dense fringe hugging the beach rim
      const a = r() * Math.PI * 2;
      const x = BEACH_C[0] + Math.cos(a) * (13.8 + r() * 1.6), z = BEACH_C[2] + Math.sin(a) * (10.3 + r() * 1.2);
      if (z < -12) continue;
      tuftPts.push({ x, z, s: 0.9 + r() * 0.8 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.16 + (r() - 0.5) * 0.05, 0.35, 0.82 + (r() - 0.5) * 0.22);
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
    // ocean breathes (slow texture drift, not a poster)
    if (this.waterMap) this.waterMap.offset.set(tt * 0.008, tt * 0.005);
    // the surf: foam ring pulses in and out with the waves, the
    // wash sheet creeps up the sand and falls back — the cover's
    // motion from frame 0, and the sorting beat in shot 6
    if (this.foam && this.foamMat) {
      const p = 0.5 + 0.5 * Math.sin(tt * Math.PI * 2 * 0.9);
      const k = 0.97 + 0.05 * p;
      this.foam.scale.set(k, 0.69 * k, 1);
      this.foamMat.opacity = 0.28 + 0.3 * p;
    }
    if (this.wash && this.washMat) {
      const p = 0.5 + 0.5 * Math.sin(tt * Math.PI * 2 * 0.9 + 1.1);
      const k = 0.86 + 0.12 * p;
      this.wash.scale.set(k, 0.62 * k, 1);
      this.washMat.opacity = 0.10 + 0.18 * p;
    }
    // crystal glints twinkle on the green sand
    this.sparkles.forEach((sp, i) => {
      const b = this.sparkleBase[i];
      if (!b) return;
      const tw = 0.25 + 0.65 * Math.abs(Math.sin(tt * 2.2 + b.ph));
      (sp.material as THREE.SpriteMaterial).opacity = tw;
      const ss = b.s * (0.8 + 0.35 * Math.abs(Math.sin(tt * 2.2 + b.ph)));
      sp.scale.set(ss, ss, 1);
    });
    // THE FADE (shot 9): the grey veil creeps over the beach as
    // the green drains away — the twist made visible
    if (this.fadeMesh && this.fadeMat) {
      const U = clamp01((f - s.a) / Math.max(1, s.b - s.a));
      this.fadeMesh.visible = id === 9;
      if (id === 9) this.fadeMat.opacity = 0.82 * U;
    }
    // the giant peridot turns slowly in its close-up (shot 4)
    if (this.gem) this.gem.rotation.y = id === 4 ? tt * 0.9 : 0.25;
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // palms sway in the sea breeze
    for (const pl of this.palms) {
      pl.g.rotation.z = Math.sin(tt * 1.15 + pl.ph) * 0.015;
      pl.g.rotation.x = Math.cos(tt * 0.85 + pl.ph * 1.7) * 0.011;
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
