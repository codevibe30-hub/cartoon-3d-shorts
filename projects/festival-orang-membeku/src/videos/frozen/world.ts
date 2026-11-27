// Frozen Dead Guy Days as one three.js scene for the Fafnir-ID format:
// a snowy Colorado mountain town in March — a white town square,
// the wooden Tuff Shed with its glowing ice coffin, snow pines,
// festival tents and string lights. Grandpa Bredo Morstoel died
// in 1989 and has been kept FROZEN for 37 years on dry ice; the
// town celebrates him with coffin races, frozen t-shirt contests
// and a parade of hearses. VISUAL CORE: cold winter daylight,
// pale blue sky, white snow with blue shadows, warm festival
// lights, textured everything (anti-banding: speckled sky,
// flecked snow, woven pine foliage). Layered light rig: sun key
// w/ soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, GATE_Z, SHED_Z, HERO_SPOT, SLOPE_C, clamp01, crowdAt, truckAt, raceAt, boxLidAt } from "./story";

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
const skyTexDay = () => ctex("frozenSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2a5ea8"); grad.addColorStop(0.34, "#5a90cc"); grad.addColorStop(0.62, "#9cc3e8");
  grad.addColorStop(0.85, "#d6e8f8"); grad.addColorStop(1, "#f2f8ff");
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
const glowTex = () => ctex("frozenGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("frozenBirds", 256, 96, (g, r) => {
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
/** wrap-draw: calls fn at every tiled offset an item of radius
 *  `rad` at (x, y) bleeds into, so a canvas tiles without seams */
const wrapDraw = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  const xs = [x], ys = [y];
  if (x < rad) xs.push(x + S); if (x > S - rad) xs.push(x - S);
  if (y < rad) ys.push(y + S); if (y > S - rad) ys.push(y - S);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
};
/** SNOW: soft blue shadow drifts, a bright white body, sunlit
 *  sparkle flecks and thousands of tiny ice crystals with hard
 *  value contrast. */
const snowTex = () => ctex("frozenGrassRich", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e8f1fa"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    wrapDraw(S, x, y, rad * 1.3, (xx, yy) => {
      const gr = g.createRadialGradient(xx, yy, rad * 0.15, xx, yy, rad);
      const c = dark ? "140,170,210" : "255,255,255";
      gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(xx, yy, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
    });
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 8, (xx, yy) => {
      g.fillStyle = r() > 0.45 ? `rgba(255,255,255,${0.14 + r() * 0.24})` : `rgba(120,150,195,${0.10 + r() * 0.20})`;
      g.beginPath(); g.ellipse(xx, yy, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
    });
  }
  const blades = ["#9db8d8", "#b8cfe8", "#d6e6f5", "#ffffff", "#8aa8cc"];
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
        g.strokeStyle = b % 2 ? "#cfe0f2" : "#9db8d8"; g.globalAlpha = 0.65 + r() * 0.35; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + b * 2.2, yy - h * 0.6, xx + b * 3.4, yy - h); g.stroke();
      }
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(74,58,32,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 1.8, 0, 7); g.fill(); }
  const flw = ["#ffffff", "#dceaf8", "#bcd4ee", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S;
    wrapDraw(S, x, y, 6, (xx, yy) => { g.fillStyle = flw[Math.floor(r() * flw.length) % flw.length]; g.beginPath(); g.arc(xx, yy, 2 + r() * 1.6, 0, 7); g.fill(); });
  }
});
/** bare earth for tree bases: warm brown speckled with darker
 *  clods and pale grit, never a flat sticker */
const soilTex = () => ctex("frozenSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("frozenPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft tinted pool lying on the ground — the blob-shadow trick, tinted */
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("frozenBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** pale paving: warm grey slabs with speckle, hairline joints
 *  and a few darker stained tiles — the school plaza floor */
const paveTex = () => ctex("frozenPave", 512, 512, (g, r) => {
  g.fillStyle = "#b9b2a4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,240" : "70,60,45"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "120,105,80" : "210,200,180"},${0.05 + r() * 0.06})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 40, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(90,80,65,0.55)"; g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y <= 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
});
/** dark asphalt with speckle + faint tyre wear bands */
const asphaltTex = () => ctex("frozenAsphalt", 512, 512, (g, r) => {
  g.fillStyle = "#4a4a50"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,200,210" : "10,10,14"},${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(20,20,24,${0.05 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 70, 18 + r() * 30, r() * 3, 0, 7); g.fill();
  }
});
/** quiet plaster noise for the school walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const blobTex = () => ctex("frozenBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** red banner cloth with big white FROZEN DEAD GUY DAYS letters + gold trim */
const bannerTex = () => ctex("frozenBanner", 1024, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#d21f26"); grad.addColorStop(0.5, "#c0161d"); grad.addColorStop(1, "#a81218");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,200" : "90,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.strokeStyle = "#f6c21c"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 72px 'Arial Black', Arial, sans-serif";
  g.shadowColor = "rgba(60,0,0,0.5)"; g.shadowBlur = 0; g.shadowOffsetY = 5;
  g.fillText("FROZEN DEAD GUY", 512, 98);
  g.fillText("DAYS", 512, 182);
});
// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A tree with a REAL canopy: bark trunk, angled branches, and
 *  9-13 overlapping foliage blobs in three depth layers. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "frozenFoliageDeep"),
    folM(greens[0], "frozenFoliageMid"),
    folM(greens[1] ?? greens[0], "frozenFoliageLite"),
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
  // snow cap on the crown
  const cap = new THREE.Mesh(new THREE.SphereGeometry(cr * 0.5, 10, 8), lam2({ color: "#eef4fb" }));
  cap.position.set(0, cy + cr * 0.55, 0); cap.scale.y = 0.55; g.add(cap);
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip. */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#7d99b8"), tip = new THREE.Color("#eef4fb"), tmp = new THREE.Color();
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

/** The Tuff Shed: small wooden shed with a snow-loaded roof,
 *  plank walls, a door standing open with cold blue glow + vapour
 *  spilling out — Grandpa Bredo's frozen home. Front faces +Z. */
const makeShed = () => {
  const g = new THREE.Group();
  const W = 7, D = 6, H = 4.2;
  const wallM = lam2({ map: rep(planks(), 2, 1), color: "#a8875e" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallM);
  body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // snow-loaded gable roof
  const roofM = lam2({ color: "#eef4fb" });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.2, 4), roofM);
  roof.position.y = H + 1.0; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.95); roof.castShadow = true; g.add(roof);
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.25, D + 0.5), lam2({ color: "#6a4a2c" }));
  roofTrim.position.y = H + 0.05; g.add(roofTrim);
  // open door: dark inside + cold glow
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.0),
    new THREE.MeshLambertMaterial({ color: "#bfe0ff", emissive: "#7fb8ee", emissiveIntensity: 0.9 }));
  doorGlow.position.set(-1.2, 1.5, D / 2 + 0.03); g.add(doorGlow);
  const doorF = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.3, 0.12), lam2({ color: "#5a4026" }));
  doorF.position.set(-1.2, 1.65, D / 2 - 0.02); g.add(doorF);
  const doorOpen = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.0, 0.1), lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) }));
  doorOpen.position.set(0.35, 1.5, D / 2 + 0.55); doorOpen.rotation.y = -0.9; doorOpen.castShadow = true; g.add(doorOpen);
  // glowing ice coffin visible through the door
  const iceM = new THREE.MeshLambertMaterial({ color: "#bfe0ff", emissive: "#5a9ed8", emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
  const coffin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 3.2), iceM);
  coffin.position.set(-1.2, 0.45, D / 2 - 1.2); coffin.castShadow = true; g.add(coffin);
  const coffinLid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 3.3), lam2({ color: "#dceefb" }));
  coffinLid.position.set(-1.2, 0.98, D / 2 - 1.2); g.add(coffinLid);
  // small frosted window + "TUFF SHED" sign board
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.08), lam2({ color: "#9fc4e8" }));
  win.position.set(2.0, 2.6, D / 2 + 0.03); g.add(win);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.1), lam2({ color: "#f2ead6", map: rep(planks(), 1, 1) }));
  sign.position.set(0, 3.6, D / 2 + 0.06); g.add(sign);
  return g;
};

/** A festival tent: striped canopy on poles, warm light inside. */
const makeTent = (stripe: string) => {
  const g = new THREE.Group();
  const poleM = lam2({ color: "#5a4632" });
  for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]] as [number, number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 8), poleM);
    pole.position.set(x, 1.7, z); pole.castShadow = true; g.add(pole);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.8, 4),
    lam2({ color: stripe }));
  roof.position.y = 4.2; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(3.0, 0.9, 4), lam2({ color: "#eef4fb" }));
  snowCap.position.y = 4.9; snowCap.rotation.y = Math.PI / 4; g.add(snowCap);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.6),
    new THREE.MeshLambertMaterial({ color: "#ffe9b0", emissive: "#ffcf6a", emissiveIntensity: 0.55, transparent: true, opacity: 0.85 }));
  glow.position.set(0, 1.6, 0); g.add(glow);
  return g;
};

/** The festival gate at GATE_Z: two red pillars with gold balls,
 *  an arch beam carrying FROZEN DEAD GUY DAYS, two swaying lanterns. */
const makeGate = () => {
  const g = new THREE.Group();
  const pilM = lam2({ color: "#b81c22" });
  for (const s of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.4, 1.1), pilM);
    pil.position.set(s * 5.2, 3.2, 0); pil.castShadow = true; g.add(pil);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), lam2({ color: "#f6c21c" }));
    cap.position.set(s * 5.2, 6.55, 0); g.add(cap);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lam2({ color: "#f6c21c" }));
    ball.position.set(s * 5.2, 7.0, 0); g.add(ball);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(12.6, 1.5, 0.9),
    new THREE.MeshLambertMaterial({ map: bannerTex() }));
  beam.position.set(0, 6.2, 0); beam.castShadow = true; g.add(beam);
  // red lanterns hanging from the beam
  const lantM = new THREE.MeshLambertMaterial({ color: "#d21f26", emissive: "#a01208", emissiveIntensity: 0.5 });
  const goldM = lam2({ color: "#f6c21c" });
  const lanterns: THREE.Group[] = [];
  for (const x of [-3.4, 3.4]) {
    const lg = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), lam2({ color: "#3a2a10" }));
    cord.position.y = -0.35; lg.add(cord);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), lantM);
    body.scale.y = 1.15; body.position.y = -1.25; lg.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.16, 8), goldM);
    top.position.y = -0.62; lg.add(top);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 8), goldM);
    bot.position.y = -1.95; lg.add(bot);
    lg.position.set(x, 5.4, 0);
    g.add(lg); lanterns.push(lg);
  }
  (g as unknown as { userData: { lanterns: THREE.Group[] } }).userData = { lanterns };
  return g;
};

/** A dry-ice delivery truck: white box body + cab, blue stripe,
 *  frost on the roof, wheels. */
const makeTruck = () => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: "#eef2f6" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 4.6), bodyM);
  body.position.y = 1.35; body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 1.4), lam2({ color: "#c8d8ea" }));
  cab.position.set(0, 1.15, 2.7); cab.castShadow = true; g.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), lam2({ color: "#9fc4e8" }));
  glass.position.set(0, 1.35, 3.42); g.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 4.62), lam2({ color: "#2e6db4" }));
  stripe.position.y = 1.0; g.add(stripe);
  const wheelM = lam2({ color: "#1a1a1c" });
  for (const [x, z] of [[-1.0, 1.6], [1.0, 1.6], [-1.0, -1.6], [1.0, -1.6]] as [number, number][]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w);
  }
  const frost = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 4.2), lam2({ color: "#dceefb" }));
  frost.position.set(0, 2.4, -0.2); g.add(frost);
  return g;
};

/** A race coffin: dark-wood box on small wheels, lid slightly
 *  ajar, pushed down the track by its team. */
const makeCoffin = () => {
  const g = new THREE.Group();
  const woodM = lam2({ color: "#4a2e1c", map: rep(planks(), 1, 1) });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 2.4), woodM);
  box.position.y = 0.55; box.castShadow = true; g.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 2.46), lam2({ color: "#5d3a24" }));
  lid.position.y = 0.88; lid.rotation.z = 0.06; lid.castShadow = true; g.add(lid);
  const wheelM = lam2({ color: "#1a1a1c" });
  for (const [x, z] of [[-0.5, 0.9], [0.5, 0.9], [-0.5, -0.9], [0.5, -0.9]] as [number, number][]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.16, z); g.add(w);
  }
  return g;
};

/** A road barrier: striped red-white board on two feet. */
const makeBarrier = () => {
  const g = new THREE.Group();
  const stripeM = (c: string) => lam2({ color: c });
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.08), stripeM(i % 2 ? "#e8e8e8" : "#d21f26"));
    seg.position.set(-1.55 + i * 0.62, 0.85, 0); g.add(seg);
  }
  for (const s of [1, -1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.7), lam2({ color: "#3a3a3e" }));
    foot.position.set(s * 1.45, 0.35, 0); g.add(foot);
  }
  return g;
};

/** A distant airliner crossing the sky, banking away. */
const makePlane = () => {
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 10), lam2({ color: "#eef2f6" }));
  fus.rotation.x = Math.PI / 2; g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 10), lam2({ color: "#dfe6ee" }));
  nose.rotation.x = -Math.PI / 2; nose.position.z = 4.2; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 1.6), lam2({ color: "#dfe6ee" }));
  g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.1), lam2({ color: "#c0161d" }));
  tail.position.z = -3.2; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 1.4), lam2({ color: "#c0161d" }));
  fin.position.set(0, 0.8, -3.2); g.add(fin);
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
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private gate!: THREE.Group;
  private lanterns: THREE.Group[] = [];
  private plane!: THREE.Group;
  private trucks: THREE.Group[] = [];
  private coffins: THREE.Group[] = [];
  private boxLid!: THREE.Mesh;
  private papers: THREE.Mesh[] = [];
  private snowPts: THREE.Points | null = null;
  private snowBase: { x: number; y: number; z: number; sp: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(20260607);
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
    // falling snow over the square (STANDAR GERAK: winter moves)
    const snowGeo = new THREE.BufferGeometry();
    const SN = 220, spos = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) {
      const x = -30 + r() * 60, y = r() * 24, z = -40 + r() * 65;
      spos.set([x, y, z], i * 3);
      this.snowBase.push({ x, y, z, sp: 1.2 + r() * 1.6 });
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(spos, 3));
    this.snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    this.snowPts.layers.set(NOINK); this.snowPts.frustumCulled = false; R.add(this.snowPts);
    this.buildCampus(R, r);
  }

  // ---------------- the town: square, shed, gate, street, slope ----------------
  private buildCampus(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(snowTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the snow-packed square: pale slabs from the foreground to the gate
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(34, 52), lam2({ map: rep(snowTex(), 6, 9) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0, 2); plaza.receiveShadow = true; R.add(plaza);
    // snow verges flanking the square + sun pools + shade pools
    for (const s of [1, -1]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(9, 52), lam2({ map: rep(snowTex(), 3, 18) }));
      verge.rotation.x = -Math.PI / 2; verge.position.set(s * 21.5, 0.02, 2); verge.receiveShadow = true; R.add(verge);
      softPatch(R, patchTex(), "#2c5420", s * 19, 0.125, 2, 3.0, 46, 0.30);
    }
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (4 + r() * 11), 0.128, 20 - r() * 42, 4.5 + r() * 5, 6 + r() * 7, 0.14 + r() * 0.10, r() * 3);
    }
    // the asphalt street along the east edge (convoy lane)
    const street = new THREE.Mesh(new THREE.PlaneGeometry(7, 60), lam2({ map: rep(asphaltTex(), 2, 16) }));
    street.rotation.x = -Math.PI / 2; street.position.set(10, 0.05, 0); street.receiveShadow = true; R.add(street);
    for (let z = 24; z > -30; z -= 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.6), lam2({ color: "#e8e8e8" }));
      dash.rotation.x = -Math.PI / 2; dash.position.set(10, 0.07, z); R.add(dash);
    }
    // ---- the Tuff Shed + festival tents ----
    const shed = makeShed();
    shed.scale.setScalar(1.35);
    shed.position.set(0, 0, -30);
    R.add(shed);
    blob(R, 0, 0.13, -30, 14, 11, 0.28);
    const tentA = makeTent("#c0161d");
    tentA.position.set(-13, 0, -26); R.add(tentA);
    const tentB = makeTent("#2e6db4");
    tentB.position.set(13, 0, -26); R.add(tentB);
    this.gate = makeGate();
    this.gate.position.set(0, 0, GATE_Z);
    R.add(this.gate);
    this.lanterns = (this.gate as unknown as { userData: { lanterns: THREE.Group[] } }).userData.lanterns;
    // (flag removed: the pole floated detached in frame)
    // ---- plaza trees, mixed sizes, both sides ----
    const greens = ["#2e5d43", "#3f7a55", "#27503a"];
    const treePts: [number, number][] = [];
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0.1, z); R.add(t);
      this.trees.push({ g: t, ph: seed * 1.31 });
      treePts.push([x, z]);
    };
    treeAt(-15.5, 18, 5.2, 3); treeAt(21, 12, 4.6, 7); treeAt(-18.5, -2, 5.8, 11);
    treeAt(21, -8, 5.0, 15); treeAt(-15.5, -12, 4.4, 19); treeAt(-26, 14, 6.2, 23);
    treeAt(24, -14, 5.6, 27); treeAt(-24, -20, 5.0, 31); treeAt(26, 8, 4.8, 35);
    const soilM = lam2({ map: rep(soilTex(), 1, 1) });
    for (const [tx, tz] of treePts) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.35, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(tx, 0.12, tz);
      disc.receiveShadow = true; R.add(disc);
    }
    // ---- grass tufts along the plaza edges ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (const s of [1, -1]) for (let z = 26; z > -16; z -= 0.6 + r() * 0.5) {
      if (r() < 0.8) tuftPts.push({ x: s * (17.2 + r() * 0.6), z: z + (r() - 0.5), s: 0.85 + r() * 0.8 });
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = 0.55 + r() * 0.5;
      tuftPts.push({ x: tx + Math.cos(a) * d, z: tz + Math.sin(a) * d, s: 0.8 + r() * 0.7 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.1, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.58, 0.12, 0.88 + (r() - 0.5) * 0.2);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // ---- road barriers across the street (lockdown) ----
    for (const [x, z, yaw] of [[7.2, -6, 0.12], [12.6, -6, -0.1], [7.2, 4, -0.08], [12.6, 4, 0.1]] as [number, number, number][]) {
      const b = makeBarrier();
      b.position.set(x, 0, z); b.rotation.y = yaw; R.add(b);
    }
    // traffic cones along the cordon
    const coneM = lam2({ color: "#e8542e" });
    for (let i = 0; i < 8; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 8), coneM);
      cone.position.set(6.4 + (i % 2) * 0.4, 0.38, 18 - i * 4.6); cone.castShadow = true; R.add(cone);
    }
    // ---- festival string lights over the square ----
    const bulbM = new THREE.MeshLambertMaterial({ color: "#ffe9b0", emissive: "#ffcf6a", emissiveIntensity: 1.0 });
    const poleM2 = lam2({ color: "#3a3a3e" });
    const lightPoles: [number, number][] = [[-14, 6], [14, 6], [-14, -10], [14, -10]];
    for (const [px, pz] of lightPoles) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), poleM2);
      pole.position.set(px, 2.6, pz); pole.castShadow = true; R.add(pole);
    }
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const bx = -14 + t * 28, by = 5.2 - Math.sin(t * Math.PI) * 0.9;
      for (const pz of [6, -10]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bulbM);
        bulb.position.set(bx, by, pz); R.add(bulb);
      }
    }
    // ---- the dry-ice trucks — positions animated in update() ----
    for (let k = 0; k < 2; k++) {
      const truck = makeTruck();
      truck.rotation.y = Math.PI; // nose toward -Z (toward the shed)
      R.add(truck); this.trucks.push(truck);
    }
    // ---- race coffins — positions animated in update(), shot 5 only ----
    for (let k = 0; k < 4; k++) {
      const cf = makeCoffin();
      R.add(cf); this.coffins.push(cf);
    }
    // ---- dry-ice blocks stacked by the gate ----
    const iceBlockM = lam2({ color: "#bfe0ff", transparent: true, opacity: 0.92 });
    const frostCapM = lam2({ color: "#eef4fb" });
    const iceBlock = (x: number, y: number, z: number, s = 1) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.8 * s, 1.1 * s), iceBlockM);
      b.position.y = 0.4 * s; b.castShadow = true; g.add(b);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.14 * s, 0.1 * s, 1.14 * s), frostCapM);
      cap.position.y = 0.82 * s; g.add(cap);
      g.position.set(x, y, z); g.rotation.y = r() * 0.6 - 0.3;
      R.add(g); blob(R, x, 0.06, z, 1.6, 1.6, 0.3);
      return g;
    };
    iceBlock(-6.8, 0, -13.2);
    iceBlock(-5.6, 0, -13.8, 0.9);
    iceBlock(-6.3, 0.8, -13.5, 0.85);
    // a big ice pile for the re-hook (shot 4): blocks stacked high
    iceBlock(-7.6, 0, -11.8, 1.5);
    iceBlock(-5.9, 0, -12.6, 1.3);
    iceBlock(-6.8, 1.2, -12.2, 1.2);
    // ---- parents' cordon: posts + yellow-black tape ----
    const postM = lam2({ color: "#3a3a3e" });
    for (const z of [-6, -1, 4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), postM);
      post.position.set(-8, 0.55, z); R.add(post);
    }
    const tapeM = new THREE.MeshLambertMaterial({ color: "#f6c21c" });
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 10.2), tapeM);
    tape.position.set(-8, 0.95, -1); R.add(tape);
    // ---- the gate table + sealed exam box (shot 6) ----
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) }));
    table.position.set(3.5, 0.85, -14.5); table.castShadow = true; R.add(table);
    for (const [dx, dz] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]] as [number, number][]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), lam2({ color: "#4a3520" }));
      leg.position.set(3.5 + dx, 0.42, -14.5 + dz); R.add(leg);
    }
    const iceCoffinM = lam2({ color: "#bfe0ff", transparent: true, opacity: 0.92 });
    const frostBandM = lam2({ color: "#dceefb" });
    const iceCoffin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3), iceCoffinM);
    iceCoffin.position.set(3.5, 1.36, -14.5); iceCoffin.castShadow = true; R.add(iceCoffin);
    const es1 = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 0.24), frostBandM);
    es1.position.set(3.5, 1.82, -14.5); R.add(es1);
    this.boxLid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.1, 1.34), iceCoffinM);
    this.boxLid.position.set(3.5, 1.86, -14.5); this.boxLid.castShadow = true; R.add(this.boxLid);
    // frost shards that burst out when the coffin opens
    const paperM = lam2({ color: "#cfe6fb", side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), paperM);
      p.position.set(3.5, 1.9, -14.5); p.visible = false; R.add(p); this.papers.push(p);
    }
    // ---- the diverted airliner ----
    this.plane = makePlane();
    R.add(this.plane);
    // ---- the Norway slope (flashback stage set, west) ----
    this.buildSlope(R, r);
    void r;
  }

  /** The Norway slope: a snowy mountainside stage set, west — a
   *  sloped snow plane, painted mountain backdrop, pines and ski
   *  tracks. Grandpa skis down it (cast.ts, mode "march"). */
  private buildSlope(R: THREE.Group, r: () => number) {
    const cx = SLOPE_C[0], cz = SLOPE_C[2];
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), lam2({ map: rep(snowTex(), 4, 4) }));
    slope.rotation.x = -Math.PI / 2 + 0.18; slope.rotation.z = 0.12;
    slope.position.set(cx, 0.4, cz); slope.receiveShadow = true; R.add(slope);
    const mtnM = lam2({ color: "#8fb0d8" });
    const mtnM2 = lam2({ color: "#7a9cc8" });
    for (const [mx, mz, w, h, m] of [[-54, -50, 13, 11, mtnM], [-38, -51, 10, 9, mtnM2], [-26, -50, 9, 7, mtnM]] as [number, number, number, number, THREE.MeshLambertMaterial][]) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h, 4), m);
      tri.position.set(mx, h / 2 - 0.5, mz); tri.rotation.y = Math.PI / 4; R.add(tri);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w / 4, h * 0.32, 4), lam2({ color: "#ffffff" }));
      cap.position.set(mx, h - h * 0.16 - 0.5, mz); cap.rotation.y = Math.PI / 4; R.add(cap);
    }
    const greens = ["#2e5d43", "#3f7a55", "#27503a"];
    for (const [tx, tz, th] of [[-48, -24, 4.2], [-36, -34, 5.0], [-46, -33, 3.6], [-34, -25, 4.4]] as [number, number, number][]) {
      const t = makeTree(th, greens, Math.round(tx * 3 + tz));
      t.position.set(tx, 0.3, tz); R.add(t);
      this.trees.push({ g: t, ph: tx * 1.31 });
    }
    const trackM = lam2({ color: "#8aa8cc" });
    for (const dx of [-0.5, 0.5]) {
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 13), trackM);
      tr.rotation.x = -Math.PI / 2 + 0.18; tr.rotation.z = 0.12;
      tr.position.set(cx - 1 + dx, 0.55, cz + 0.5); R.add(tr);
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
    // gate lanterns sway gently
    this.lanterns.forEach((lg, i) => { lg.rotation.z = Math.sin(tt * 1.1 + i * 1.7) * 0.05; lg.rotation.x = Math.cos(tt * 0.9 + i) * 0.03; });
    // the trucks crawl toward the shed (shots 1-7: parked by the shed after shot 3)
    this.trucks.forEach((truck, k) => {
      const p = truckAt(Math.min(tt, SHOTS[2].b / FPS - 0.01), k);
      truck.position.set(p.x, 0, p.z);
    });
    // the race coffins speed down the track — shot 5 only
    this.coffins.forEach((cf, k) => {
      const p = raceAt(tt, k);
      cf.position.set(p.x, 0, p.z);
      cf.visible = id === 5;
    });
    // snow falls over the square, drifting with the wind
    if (this.snowPts) {
      const attr = this.snowPts.geometry.getAttribute("position") as THREE.BufferAttribute;
      this.snowBase.forEach((b, i) => {
        const y = (((b.y - tt * b.sp) % 24) + 24) % 24;
        attr.setXYZ(i, b.x + Math.sin(tt * 0.7 + i) * 0.8, y, b.z + Math.cos(tt * 0.5 + i * 0.7) * 0.5);
      });
      attr.needsUpdate = true;
    }
    // the airliner banks away across the sky
    const pu = ((tt * 0.008) % 1);
    this.plane.position.set(-130 + pu * 260, 62, -160);
    this.plane.rotation.z = -0.12; this.plane.rotation.y = Math.PI / 2 + 0.15;
    // shot 6: the ice coffin opens, frost shards burst out
    const lid = id === 6 ? boxLidAt(tt) : 0;
    this.boxLid.rotation.z = lid * 1.9;
    this.boxLid.position.x = 3.5 + lid * 0.5;
    this.boxLid.position.y = 1.86 + lid * 0.35;
    this.papers.forEach((p, i) => {
      const vis = id === 6 && lid > 0.05;
      p.visible = vis;
      if (vis) {
        const ph = i * 1.7;
        p.position.set(3.5 + Math.sin(tt * 1.8 + ph) * (0.3 + lid * 0.7), 1.95 + lid * (0.9 + i * 0.35) + Math.sin(tt * 2.4 + ph) * 0.12, -14.5 + Math.cos(tt * 1.5 + ph) * (0.25 + lid * 0.5));
        p.rotation.set(Math.sin(tt * 2.1 + ph) * 0.7, tt * 1.2 + ph, Math.cos(tt * 1.7 + ph) * 0.6);
      }
    });
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
