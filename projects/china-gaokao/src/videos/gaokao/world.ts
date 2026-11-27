// China Gaokao as one three.js scene for the Fafnir-ID format:
// a bright Chinese school campus in June — a wide paved plaza,
// a red-banded 3-storey school building, a big gate, and a SEA
// of students in white shirts streaming through it. The papers
// are state secrets: an armed police convoy hauls sealed boxes
// to the gate while the whole city stops around the school —
// jammers, drones, closed roads, a silent crane, parents praying
// behind the cordon. VISUAL CORE: bright June daylight, warm
// cream + red school colours, saturated greens, textured
// everything (anti-banding: speckled sky, flecked paving, woven
// foliage). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, GATE_Z, SCHOOL_Z, HERO_SPOT, HALL_C, clamp01, crowdAt, convoyAt, boxLidAt } from "./story";

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
const skyTexDay = () => ctex("gaokaoSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("gaokaoGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("gaokaoBirds", 256, 96, (g, r) => {
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
/** RICH grass: deep shadow pockets, a mid-green body, sunlit
 *  fleck clusters and thousands of individual blades in five
 *  greens with hard value contrast. */
const grassRichTex = () => ctex("gaokaoGrassRich", 1024, 1024, (g, r) => {
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
/** bare earth for tree bases: warm brown speckled with darker
 *  clods and pale grit, never a flat sticker */
const soilTex = () => ctex("gaokaoSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("gaokaoPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("gaokaoBark", 256, 256, (g, r) => {
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
const paveTex = () => ctex("gaokaoPave", 512, 512, (g, r) => {
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
const asphaltTex = () => ctex("gaokaoAsphalt", 512, 512, (g, r) => {
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
const blobTex = () => ctex("gaokaoBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** red banner cloth with big white GAOKAO letters + gold trim */
const bannerTex = () => ctex("gaokaoBanner", 1024, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#d21f26"); grad.addColorStop(0.5, "#c0161d"); grad.addColorStop(1, "#a81218");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,200" : "90,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.strokeStyle = "#f6c21c"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.shadowColor = "rgba(60,0,0,0.5)"; g.shadowBlur = 0; g.shadowOffsetY = 6;
  g.fillText("GAOKAO", 512, 132);
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
    folM(greens[2] ?? greens[0], "gaokaoFoliageDeep"),
    folM(greens[0], "gaokaoFoliageMid"),
    folM(greens[1] ?? greens[0], "gaokaoFoliageLite"),
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
 *  vertex-coloured dark base -> sunlit tip. */
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

/** The school building: 3-storey cream block, red trim bands,
 *  a grid of dark-glass windows with white frames + glints, a
 *  big red GAOKAO banner, flat roof + parapet + flagpole. Front
 *  faces +Z. */
const makeSchool = () => {
  const g = new THREE.Group();
  const W = 34, D = 9, H = 11;
  const wallM = lam2({ map: rep(plasterTex("gaokaoPlaster", "#f2e8d2"), 4, 2) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallM);
  body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // red trim bands between floors + plinth
  const trimM = lam2({ color: "#b81c22" });
  for (const y of [0.5, 4.0, 7.6]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.35, D + 0.3), trimM);
    band.position.y = y; g.add(band);
  }
  // parapet + roof slab
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.7, D + 0.4), trimM);
  parapet.position.y = H + 0.35; parapet.castShadow = true; g.add(parapet);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, D), lam2({ color: "#8a8f96" }));
  roof.position.y = H + 0.05; g.add(roof);
  // windows: 8 cols x 3 rows, dark glass, white frames, glint
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#2e4a66" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.5 });
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      const x = -14 + col * 4, y = 2.2 + row * 3.6;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.1), frameM);
      fr.position.set(x, y, D / 2 + 0.03); g.add(fr);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.12), glassM);
      gl.position.set(x, y, D / 2 + 0.04); g.add(gl);
      const mv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.03), frameM);
      mv.position.set(x, y, D / 2 + 0.11); g.add(mv);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.03), frameM);
      mh.position.set(x, y, D / 2 + 0.11); g.add(mh);
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.4), glintM);
      glint.position.set(x - 0.4, y + 0.1, D / 2 + 0.105); glint.rotation.z = 0.5; g.add(glint);
    }
  }
  // main entrance: double doors + steps + two red pillars
  const doorM = lam2({ color: "#7a1f24" });
  const door = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 0.18), doorM);
  door.position.set(0, 1.7, D / 2 + 0.06); g.add(door);
  const doorF = new THREE.Mesh(new THREE.BoxGeometry(4.9, 3.7, 0.1), frameM);
  doorF.position.set(0, 1.85, D / 2 + 0.02); g.add(doorF);
  const door2 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 0.2), doorM);
  door2.position.set(0, 1.7, D / 2 + 0.08); g.add(door2);
  for (const s of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 4.0, 10), lam2({ color: "#b81c22" }));
    pil.position.set(s * 3.1, 2.0, D / 2 + 0.5); pil.castShadow = true; g.add(pil);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lam2({ color: "#f6c21c" }));
    ball.position.set(s * 3.1, 4.2, D / 2 + 0.5); g.add(ball);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 1.6), lam2({ color: "#a39a8b" }));
  step.position.set(0, 0.15, D / 2 + 0.9); step.receiveShadow = true; g.add(step);
  // red GAOKAO banner across the front, between floor 2 and 3
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 4),
    new THREE.MeshLambertMaterial({ map: bannerTex() }));
  banner.position.set(0, 8.6, D / 2 + 0.08); g.add(banner);
  return g;
};

/** The school gate at GATE_Z: two red pillars with gold balls,
 *  an arch beam carrying GAOKAO, two swaying red lanterns. */
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

/** A police van: dark-navy box body + cab, wheels, red/blue
 *  light bar on the roof, white stripe. */
const makeVan = () => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: "#1e3a5f" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 4.6), bodyM);
  body.position.y = 1.35; body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 1.4), lam2({ color: "#274b78" }));
  cab.position.set(0, 1.15, 2.7); cab.castShadow = true; g.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), lam2({ color: "#9fc4e8" }));
  glass.position.set(0, 1.35, 3.42); g.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 4.62), lam2({ color: "#e8e8e8" }));
  stripe.position.y = 1.0; g.add(stripe);
  const wheelM = lam2({ color: "#1a1a1c" });
  for (const [x, z] of [[-1.0, 1.6], [1.0, 1.6], [-1.0, -1.6], [1.0, -1.6]] as [number, number][]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w);
  }
  const redL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
    new THREE.MeshLambertMaterial({ color: "#ff2a2a", emissive: "#ff2020", emissiveIntensity: 1.2 }));
  redL.position.set(-0.55, 2.45, 0.6); g.add(redL);
  const blueL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
    new THREE.MeshLambertMaterial({ color: "#2a6aff", emissive: "#2050ff", emissiveIntensity: 1.2 }));
  blueL.position.set(0.55, 2.45, 0.6); g.add(blueL);
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

/** A tower crane, silent: mast, jib, counter-jib, hook cable
 *  hanging still — the construction site that stopped for Gaokao. */
const makeCrane = () => {
  const g = new THREE.Group();
  const m = lam2({ color: "#e8c832" });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 14, 0.9), m);
  mast.position.y = 7; mast.castShadow = true; g.add(mast);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), lam2({ color: "#f2ede2" }));
  cab.position.set(0, 14.4, 0); g.add(cab);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 0.5), m);
  jib.position.set(4.5, 15.0, 0); jib.castShadow = true; g.add(jib);
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.5), m);
  cjib.position.set(-3.2, 15.0, 0); g.add(cjib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.0), lam2({ color: "#8a8f96" }));
  counter.position.set(-5.0, 14.4, 0); g.add(counter);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 5), lam2({ color: "#2c2c30" }));
  cable.position.set(8.6, 12.7, 0); g.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), lam2({ color: "#3a3a3e" }));
  hook.position.set(8.6, 10.2, 0); g.add(hook);
  return g;
};

/** A patrol drone: dark body, 4 arms, spinning rotors, red blink. */
const makeDrone = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.7), lam2({ color: "#2c2c30" }));
  body.castShadow = true; g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#222222", emissive: "#ff2020", emissiveIntensity: 1.5 }));
  eye.position.set(0, -0.05, 0.38); g.add(eye);
  const rotors: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] as [number, number][]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), lam2({ color: "#3a3a3e" }));
    arm.position.set(x * 0.7, 0.05, z * 0.7); arm.rotation.y = Math.atan2(z, x); g.add(arm);
    const rot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.09), lam2({ color: "#c8c8cc" }));
    rot.position.set(x, 0.12, z); g.add(rot); rotors.push(rot);
  }
  (g as unknown as { userData: { rotors: THREE.Mesh[] } }).userData = { rotors };
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
  private flag!: THREE.Mesh;
  private drone!: THREE.Group;
  private droneRotors: THREE.Mesh[] = [];
  private plane!: THREE.Group;
  private vans: THREE.Group[] = [];
  private cctvLight!: THREE.MeshLambertMaterial;
  private boxLid!: THREE.Mesh;
  private papers: THREE.Mesh[] = [];
  private craneHook!: THREE.Mesh;

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
    this.buildCampus(R, r);
  }

  // ---------------- the campus: plaza, school, gate, street, hall ----------------
  private buildCampus(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the paved plaza: warm slabs from the foreground to the gate
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(34, 52), lam2({ map: rep(paveTex(), 6, 9) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0, 2); plaza.receiveShadow = true; R.add(plaza);
    // grass verges flanking the plaza + sun pools + shade pools
    for (const s of [1, -1]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(9, 52), lam2({ map: rep(grassRichTex(), 3, 18) }));
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
    // ---- the school building + gate ----
    const school = makeSchool();
    school.position.set(0, 0, SCHOOL_Z - 4.5);
    R.add(school);
    blob(R, 0, 0.13, SCHOOL_Z - 4.5, 38, 14, 0.28);
    this.gate = makeGate();
    this.gate.position.set(0, 0, GATE_Z);
    R.add(this.gate);
    this.lanterns = (this.gate as unknown as { userData: { lanterns: THREE.Group[] } }).userData.lanterns;
    // flagpole on the school roof with a red flag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 8), lam2({ color: "#d8d8dc" }));
    pole.position.set(-13, SCHOOL_Z - 4.5 + 0, 0); pole.position.set(-13, 14.5, SCHOOL_Z - 4.5); pole.castShadow = true; R.add(pole);
    const flagM = lam2({ color: "#d21f26", side: THREE.DoubleSide });
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), flagM);
    this.flag.position.set(-11.6, 17.4, SCHOOL_Z - 4.5); this.flag.castShadow = true; R.add(this.flag);
    // ---- plaza trees, mixed sizes, both sides ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
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
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
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
    // ---- the silent construction site (east) ----
    const crane = makeCrane();
    crane.position.set(19, 0, -6); crane.rotation.y = 0.5; R.add(crane);
    this.craneHook = crane.children[6] as THREE.Mesh; // hook (children: mast, cab, jib, cjib, counter, cable, hook)
    const fenceM = lam2({ color: "#2e5d8a" });
    for (let i = 0; i < 5; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.08), fenceM);
      panel.position.set(15.5 + i * 2.25, 1.0, 2.5); panel.rotation.y = 0.15; R.add(panel);
    }
    const scaffold = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 2.5), lam2({ color: "#b9a06a", map: rep(planks(), 2, 1) }));
    scaffold.position.set(19, 1.6, -11); scaffold.castShadow = true; R.add(scaffold);
    // ---- the police convoy (vans) — positions animated in update() ----
    for (let k = 0; k < 2; k++) {
      const van = makeVan();
      van.rotation.y = Math.PI; // nose toward -Z (toward the gate)
      R.add(van); this.vans.push(van);
    }
    // ---- sealed exam boxes stacked by the gate ----
    const boxM = lam2({ color: "#a87c4c", map: rep(planks(), 1, 1) });
    const sealM = lam2({ color: "#d21f26" });
    const sealedBox = (x: number, y: number, z: number, s = 1) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.8 * s, 1.1 * s), boxM);
      b.position.y = 0.4 * s; b.castShadow = true; g.add(b);
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(1.14 * s, 0.1 * s, 0.22 * s), sealM);
      s1.position.y = 0.82 * s; g.add(s1);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.1 * s, 1.14 * s), sealM);
      s2.position.y = 0.82 * s; g.add(s2);
      g.position.set(x, y, z); g.rotation.y = r() * 0.6 - 0.3;
      R.add(g); blob(R, x, 0.06, z, 1.6, 1.6, 0.3);
      return g;
    };
    sealedBox(-6.8, 0, -13.2);
    sealedBox(-5.6, 0, -13.8, 0.9);
    sealedBox(-6.3, 0.8, -13.5, 0.85);
    // ---- CCTV pole by the gate ----
    const cctvPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.2, 8), lam2({ color: "#3a3a3e" }));
    cctvPole.position.set(7.2, 2.1, -14); cctvPole.castShadow = true; R.add(cctvPole);
    const cam2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.8), lam2({ color: "#e8e8e8" }));
    cam2.position.set(7.2, 4.2, -13.7); cam2.rotation.x = 0.5; R.add(cam2);
    this.cctvLight = new THREE.MeshLambertMaterial({ color: "#ff2020", emissive: "#ff2020", emissiveIntensity: 1.5 });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.cctvLight);
    dot.position.set(7.2, 4.05, -13.35); R.add(dot);
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
    const examBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3), boxM);
    examBox.position.set(3.5, 1.36, -14.5); examBox.castShadow = true; R.add(examBox);
    const es1 = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 0.24), sealM);
    es1.position.set(3.5, 1.82, -14.5); R.add(es1);
    this.boxLid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.1, 1.34), boxM);
    this.boxLid.position.set(3.5, 1.86, -14.5); this.boxLid.castShadow = true; R.add(this.boxLid);
    // paper sheets that flutter out when the box opens
    const paperM = lam2({ color: "#fdfdf8", side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), paperM);
      p.position.set(3.5, 1.9, -14.5); p.visible = false; R.add(p); this.papers.push(p);
    }
    // ---- the patrol drone + the diverted airliner ----
    this.drone = makeDrone();
    this.droneRotors = (this.drone as unknown as { userData: { rotors: THREE.Mesh[] } }).userData.rotors;
    R.add(this.drone);
    this.plane = makePlane();
    R.add(this.plane);
    // ---- the exam hall (interior stage set, west) ----
    this.buildHall(R, r);
    void r;
  }

  /** The exam hall: floor, walls, blackboard, clock, rows of desks.
   *  Students are seated by cast.ts (mode "sit"). No roof — the sun
   *  rig lights the room from above, as in the house style. */
  private buildHall(R: THREE.Group, r: () => number) {
    const cx = HALL_C[0], cz = HALL_C[2];
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), lam2({ map: rep(planks(), 4, 4), color: "#c9a06a" }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ map: rep(plasterTex("gaokaoHallPlaster", "#efe6cf"), 3, 1) });
    const back = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 0.3), wallM);
    back.position.set(cx, 3.25, cz - 7); back.receiveShadow = true; R.add(back);
    for (const s of [1, -1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.5, 14), wallM);
      side.position.set(cx + s * 8, 3.25, cz); side.receiveShadow = true; R.add(side);
    }
    // blackboard with chalk writing lines
    const board = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.6, 0.12), lam2({ color: "#2e5d3a" }));
    board.position.set(cx, 2.6, cz - 6.8); R.add(board);
    const chalkM = new THREE.MeshBasicMaterial({ color: "#f2f0e6" });
    for (let i = 0; i < 4; i++) {
      const ln = new THREE.Mesh(new THREE.BoxGeometry(5.2 - i * 0.9, 0.09, 0.03), chalkM);
      ln.position.set(cx - 0.4 + (i % 2) * 0.5, 3.3 - i * 0.5, cz - 6.72); R.add(ln);
    }
    // wall clock above the blackboard, centred on the frame axis
    // (cx - 2 = the camera look target) so it is not clipped right
    const clockF = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), lam2({ color: "#f2ead6" }));
    clockF.position.set(cx - 7, 4.5, cz - 6.82); R.add(clockF);
    const handM = lam2({ color: "#1c1c20" });
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.03), handM);
    h1.position.set(cx - 7, 4.62, cz - 6.8); h1.rotation.z = 0.5; R.add(h1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.03), handM);
    h2.position.set(cx - 7 + 0.1, 4.5, cz - 6.8); h2.rotation.z = -1.1; R.add(h2);
    // teacher's desk at the front
    const tdesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.0), lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) }));
    tdesk.position.set(cx + 5.5, 0.45, cz - 5.2); tdesk.castShadow = true; R.add(tdesk);
    // student desks: 3 rows x 4 cols (seats face the blackboard, -Z)
    const deskM = lam2({ color: "#8a6844", map: rep(planks(), 1, 1) });
    const chairM = lam2({ color: "#5a4632" });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const x = cx - 5.2 + col * 3.4, z = cz - 1.5 - row * 3.0;
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.9), deskM);
        top.position.set(x, 0.78, z); top.castShadow = true; R.add(top);
        for (const [dx, dz] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]] as [number, number][]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), chairM);
          leg.position.set(x + dx, 0.39, z + dz); R.add(leg);
        }
        // exam paper on the desk
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), lam2({ color: "#fdfdf8" }));
        paper.rotation.x = -Math.PI / 2; paper.rotation.z = (r() - 0.5) * 0.4;
        paper.position.set(x, 0.84, z); R.add(paper);
        // chair behind the desk
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.1), chairM);
        ch.position.set(x, 0.55, z + 0.85); ch.castShadow = true; R.add(ch);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.5), chairM);
        seat.position.set(x, 0.45, z + 0.6); R.add(seat);
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
    // the school flag waves
    this.flag.rotation.y = Math.sin(tt * 2.2) * 0.12;
    this.flag.rotation.z = Math.sin(tt * 1.6) * 0.04;
    // the convoy crawls toward the gate (shots 1-7: parked by the gate after shot 3)
    this.vans.forEach((van, k) => {
      const p = convoyAt(Math.min(tt, SHOTS[2].b / FPS - 0.01), k);
      van.position.set(p.x, 0, p.z);
    });
    // the patrol drone hovers + drifts over the plaza, rotors spinning
    this.drone.position.set(6 + Math.sin(tt * 0.35) * 3.5, 13.5 + Math.sin(tt * 1.4) * 0.5, -10 + Math.cos(tt * 0.28) * 3);
    this.droneRotors.forEach((rot, i) => { rot.rotation.y = tt * 40 * (i % 2 ? 1 : -1); });
    // the airliner banks away across the sky
    const pu = ((tt * 0.008) % 1);
    this.plane.position.set(-130 + pu * 260, 62, -160);
    this.plane.rotation.z = -0.12; this.plane.rotation.y = Math.PI / 2 + 0.15;
    // CCTV red dot blinks
    this.cctvLight.emissiveIntensity = (Math.sin(tt * 4) > 0) ? 1.6 : 0.15;
    // the crane hook sways almost imperceptibly — the site is silent
    this.craneHook.position.y = 10.2 + Math.sin(tt * 0.5) * 0.05;
    // shot 6: the sealed box opens, papers flutter out
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
