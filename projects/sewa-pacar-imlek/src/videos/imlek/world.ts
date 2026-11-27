// Sewa Pacar Imlek as one three.js scene for the Fafnir-ID format:
// a bright Chinese New Year street — red lanterns strung across
// a paved street, a family house front with a red door + spring
// couplets + a big gold 福 banner, shop stalls selling "boyfriends"
// on listing boards, and one GIANT glowing rental listing. The
// contract table stands before the house door; a red stamp slams
// "TIDAK SAH" onto the contract. VISUAL CORE: bright festive
// daylight, warm cream + red house colours, saturated greens,
// textured everything (anti-banding: speckled sky, flecked paving,
// woven foliage). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HOUSE_Z, HERO_SPOT, TABLE_C, CHAIR_C, clamp01, stampAt } from "./story";

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
const skyTexDay = () => ctex("imlekSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("imlekGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("imlekBirds", 256, 96, (g, r) => {
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
const grassRichTex = () => ctex("imlekGrassRich", 1024, 1024, (g, r) => {
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
const soilTex = () => ctex("imlekSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("imlekPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("imlekBark", 256, 256, (g, r) => {
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
const paveTex = () => ctex("imlekPave", 512, 512, (g, r) => {
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
const asphaltTex = () => ctex("imlekAsphalt", 512, 512, (g, r) => {
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
const blobTex = () => ctex("imlekBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** red banner cloth with a big gold 福 (good fortune) + gold trim */
const bannerTex = () => ctex("imlekBanner", 1024, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#d21f26"); grad.addColorStop(0.5, "#c0161d"); grad.addColorStop(1, "#a81218");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,200" : "90,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.strokeStyle = "#f6c21c"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.fillStyle = "#f6c21c"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 170px 'Arial Black', Arial, sans-serif";
  g.shadowColor = "rgba(60,0,0,0.5)"; g.shadowBlur = 0; g.shadowOffsetY = 6;
  g.fillText("福", 512, 132);
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
    folM(greens[2] ?? greens[0], "imlekFoliageDeep"),
    folM(greens[0], "imlekFoliageMid"),
    folM(greens[1] ?? greens[0], "imlekFoliageLite"),
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

/** The family house: 2-storey cream block, red trim bands, a
 *  gabled red-tile roof, warm glowing windows, a big red double
 *  door with gold studs + spring couplets, and a gold 福 banner
 *  across the front. Front faces +Z. */
const makeHouse = () => {
  const g = new THREE.Group();
  const W = 26, D = 9, H = 9;
  const wallM = lam2({ map: rep(plasterTex("imlekPlaster", "#f2e8d2"), 4, 2) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallM);
  body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // red trim bands between floors + plinth
  const trimM = lam2({ color: "#b81c22" });
  for (const y of [0.5, 4.6]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.35, D + 0.3), trimM);
    band.position.y = y; g.add(band);
  }
  // gabled roof: two sloped slabs + ridge beam + upturned eaves hint
  const roofM = lam2({ color: "#a83226" });
  for (const s of [1, -1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 1.6, 0.28, 5.6), roofM);
    slab.position.set(0, H + 1.5, s * 2.2);
    slab.rotation.x = s * 0.5; slab.castShadow = true; g.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(W + 1.8, 0.4, 0.6), lam2({ color: "#7a1f24" }));
  ridge.position.set(0, H + 2.9, 0); g.add(ridge);
  // windows: 5 cols x 2 rows, warm glowing glass, white frames
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9d2e", emissiveIntensity: 0.55 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const x = -10 + col * 5, y = 2.4 + row * 3.8;
      if (Math.abs(x) < 3 && row === 0) continue; // the door lives here
      const fr = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.1), frameM);
      fr.position.set(x, y, D / 2 + 0.03); g.add(fr);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.12), glassM);
      gl.position.set(x, y, D / 2 + 0.04); g.add(gl);
      const mv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.03), frameM);
      mv.position.set(x, y, D / 2 + 0.11); g.add(mv);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.03), frameM);
      mh.position.set(x, y, D / 2 + 0.11); g.add(mh);
    }
  }
  // main entrance: red double doors + gold studs + steps + pillars
  const doorM = lam2({ color: "#a81218" });
  const door = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 0.18), doorM);
  door.position.set(0, 1.8, D / 2 + 0.06); g.add(door);
  const doorF = new THREE.Mesh(new THREE.BoxGeometry(4.9, 3.9, 0.1), frameM);
  doorF.position.set(0, 1.95, D / 2 + 0.02); g.add(doorF);
  const door2 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 0.2), doorM);
  door2.position.set(0, 1.8, D / 2 + 0.08); g.add(door2);
  const studM = lam2({ color: "#f6c21c" });
  for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 3; c2++) {
    for (const s of [1, -1]) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), studM);
      stud.position.set(s * 1.1 + (c2 - 1) * 0.6, 1.0 + r2 * 0.8, D / 2 + 0.2); g.add(stud);
    }
  }
  // spring couplets: red vertical strips with gold trim flanking the door
  for (const s of [1, -1]) {
    const coup = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.08), lam2({ color: "#c0161d" }));
    coup.position.set(s * 3.1, 2.2, D / 2 + 0.08); g.add(coup);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 3.28, 0.04), lam2({ color: "#f6c21c" }));
    trim.position.set(s * 3.1, 2.2, D / 2 + 0.05); g.add(trim);
    const coup2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 3.12, 0.1), lam2({ color: "#c0161d" }));
    coup2.position.set(s * 3.1, 2.2, D / 2 + 0.09); g.add(coup2);
  }
  for (const s of [1, -1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 4.0, 10), lam2({ color: "#b81c22" }));
    pil.position.set(s * 3.1, 2.0, D / 2 + 0.5); pil.castShadow = true; g.add(pil);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lam2({ color: "#f6c21c" }));
    ball.position.set(s * 3.1, 4.2, D / 2 + 0.5); g.add(ball);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 1.6), lam2({ color: "#a39a8b" }));
  step.position.set(0, 0.15, D / 2 + 0.9); step.receiveShadow = true; g.add(step);
  // gold 福 banner across the front, between the two floors
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5),
    new THREE.MeshLambertMaterial({ map: bannerTex() }));
  banner.position.set(0, 6.6, D / 2 + 0.08); g.add(banner);
  return g;
};

/** One red lantern: cord + glowing ribbed body + gold caps. */
const makeLantern = () => {
  const lg = new THREE.Group();
  const lantM = new THREE.MeshLambertMaterial({ color: "#d21f26", emissive: "#a01208", emissiveIntensity: 0.5 });
  const goldM = lam2({ color: "#f6c21c" });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), lam2({ color: "#3a2a10" }));
  cord.position.y = -0.35; lg.add(cord);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), lantM);
  body.scale.y = 1.15; body.position.y = -1.25; lg.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.16, 8), goldM);
  top.position.y = -0.62; lg.add(top);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 8), goldM);
  bot.position.y = -1.95; lg.add(bot);
  return lg;
};

/** A lantern string across the street: two poles, a sagging rope,
 *  and five swaying lanterns. Exposes the lantern groups for sway. */
const makeLanternString = (span: number) => {
  const g = new THREE.Group();
  const poleM = lam2({ color: "#3a2a10" });
  for (const s of [1, -1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8), poleM);
    pole.position.set(s * span / 2, 3.75, 0); pole.castShadow = true; g.add(pole);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lam2({ color: "#f6c21c" }));
    ball.position.set(s * span / 2, 7.6, 0); g.add(ball);
  }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, span, 5), lam2({ color: "#3a2a10" }));
  rope.rotation.z = Math.PI / 2; rope.position.y = 7.2; g.add(rope);
  const lanterns: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const x = -span / 2 + (span * (i + 0.5)) / 5;
    const sag = 0.9 - Math.abs(i - 2) * 0.28;
    const lg = makeLantern();
    lg.position.set(x, 7.2 - sag, 0);
    g.add(lg); lanterns.push(lg);
  }
  (g as unknown as { userData: { lanterns: THREE.Group[] } }).userData = { lanterns };
  return g;
};

/** A Taobao stall: wooden counter, striped red-white awning,
 *  posts, and a listing board with a gold ¥ price. */
const listingTex = (price: string) => ctex(`imlekList${price}`, 512, 256, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#fff6da"); grad.addColorStop(1, "#ffe9a8");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#c0161d"; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = "#c0161d"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 92px 'Arial Black', Arial, sans-serif";
  g.fillText(price, 256, 108);
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("PACAR DISEWA", 256, 196);
});
const makeStall = (price: string) => {
  const g = new THREE.Group();
  const woodM = lam2({ color: "#8a6844", map: rep(planks(), 1, 1) });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.4), woodM);
  counter.position.y = 0.55; counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.12, 1.7), lam2({ color: "#6a4a2c" }));
  top.position.y = 1.16; g.add(top);
  const postM = lam2({ color: "#3a2a10" });
  for (const [x, z] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 0.6], [1.6, 0.6]] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), postM);
    post.position.set(x, 1.3, z); g.add(post);
  }
  // striped awning: alternating red/white panels, slightly sloped
  for (let i = 0; i < 6; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 2.0), lam2({ color: i % 2 ? "#f2ede2" : "#c0161d" }));
    panel.position.set(-1.55 + i * 0.62, 2.65, 0);
    panel.rotation.x = -0.18; panel.castShadow = true; g.add(panel);
  }
  // the listing board on the counter front
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3),
    new THREE.MeshLambertMaterial({ map: listingTex(price) }));
  board.position.set(0, 0.75, 0.72); g.add(board);
  // a few red envelopes + oranges on the counter
  const envM = lam2({ color: "#c0161d" });
  for (let i = 0; i < 3; i++) {
    const env = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.28), envM);
    env.position.set(-0.9 + i * 0.45, 1.25, 0.2); env.rotation.y = (i - 1) * 0.3; g.add(env);
  }
  const orgM = lam2({ color: "#e8862c" });
  for (let i = 0; i < 4; i++) {
    const org = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), orgM);
    org.position.set(0.7 + (i % 2) * 0.3, 1.3, -0.2 - Math.floor(i / 2) * 0.3); g.add(org);
  }
  return g;
};

/** The contract table before the house door: wooden table, the
 *  white contract sheet, and the red stamp hovering above it. */
const makeContractTable = () => {
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.5), lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) }));
  table.position.set(0, 0.85, 0); table.castShadow = true; g.add(table);
  for (const [dx, dz] of [[-1.05, -0.6], [1.05, -0.6], [-1.05, 0.6], [1.05, 0.6]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), lam2({ color: "#4a3520" }));
    leg.position.set(dx, 0.42, dz); g.add(leg);
  }
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), lam2({ color: "#fdfdf8" }));
  paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.08;
  paper.position.set(0, 0.92, 0); g.add(paper);
  const lineM = lam2({ color: "#3a3a3e" });
  for (let i = 0; i < 4; i++) {
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.8 - i * 0.12, 0.03, 0.02), lineM);
    ln.position.set(-0.05 + (i % 2) * 0.08, 0.93, -0.4 + i * 0.24); g.add(ln);
  }
  // the red stamp: base + handle, animated in update() via stampAt
  const stamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.22, 12), lam2({ color: "#c0161d" }));
  base.position.y = 0.11; stamp.add(base);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.5, 8), lam2({ color: "#3a2a10" }));
  handle.position.y = 0.45; stamp.add(handle);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam2({ color: "#c0161d" }));
  knob.position.y = 0.72; stamp.add(knob);
  stamp.position.set(0.3, 2.6, 0.1);
  g.add(stamp);
  (g as unknown as { userData: { stamp: THREE.Group } }).userData = { stamp };
  return g;
};

/** A simple wooden chair — the empty seat the boyfriend leaves behind. */
const makeChair = () => {
  const g = new THREE.Group();
  const woodM = lam2({ color: "#8a6844", map: rep(planks(), 1, 1) });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), woodM);
  seat.position.y = 0.5; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.1), woodM);
  back.position.set(0, 1.0, -0.4); back.castShadow = true; g.add(back);
  for (const [dx, dz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), lam2({ color: "#5a4632" }));
    leg.position.set(dx, 0.25, dz); g.add(leg);
  }
  // a red cushion left behind
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.09, 0.8), lam2({ color: "#c0161d" }));
  cushion.position.y = 0.6; g.add(cushion);
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
  private lanterns: THREE.Group[] = [];
  private stamp!: THREE.Group;
  private stampRestY = 0.93;

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
    this.buildStreet(R, r);
  }

  // ---------------- the street: paving, house, stalls, lantern strings ----------------
  private buildStreet(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.12, -40); land.receiveShadow = true; R.add(land);
    // the paved street: warm slabs from the foreground to the house
    const street = new THREE.Mesh(new THREE.PlaneGeometry(34, 62), lam2({ map: rep(paveTex(), 6, 11) }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0, -2); street.receiveShadow = true; R.add(street);
    // grass verges flanking the street + sun pools + shade pools
    for (const s of [1, -1]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(9, 62), lam2({ map: rep(grassRichTex(), 3, 20) }));
      verge.rotation.x = -Math.PI / 2; verge.position.set(s * 21.5, 0.02, -2); verge.receiveShadow = true; R.add(verge);
      softPatch(R, patchTex(), "#2c5420", s * 19, 0.125, -2, 3.0, 56, 0.30);
    }
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (4 + r() * 11), 0.128, 20 - r() * 46, 4.5 + r() * 5, 6 + r() * 7, 0.14 + r() * 0.10, r() * 3);
    }
    // ---- the family house ----
    const house = makeHouse();
    house.position.set(0, 0, HOUSE_Z - 4.5);
    R.add(house);
    blob(R, 0, 0.13, HOUSE_Z - 4.5, 30, 12, 0.28);
    // red runner carpet from the door to the street
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 12), lam2({ color: "#a81218" }));
    runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.06, -25); runner.receiveShadow = true; R.add(runner);
    const runnerTrim = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 12.3), lam2({ color: "#f6c21c" }));
    runnerTrim.rotation.x = -Math.PI / 2; runnerTrim.position.set(0, 0.05, -25); R.add(runnerTrim);
    const runner2 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 12), lam2({ color: "#a81218" }));
    runner2.rotation.x = -Math.PI / 2; runner2.position.set(0, 0.065, -25); runner2.receiveShadow = true; R.add(runner2);
    // ---- lantern strings across the street (swaying) ----
    for (const z of [8, -8]) {
      const ls = makeLanternString(30);
      ls.position.set(0, 0, z);
      R.add(ls);
      this.lanterns.push(...(ls as unknown as { userData: { lanterns: THREE.Group[] } }).userData.lanterns);
    }
    // ---- street trees with red lanterns, mixed sizes, both sides ----
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
    // red lanterns hanging from the trees
    for (const [tx, tz] of treePts) {
      const lg = makeLantern();
      lg.position.set(tx + 0.8, 3.4, tz + 0.4);
      lg.scale.setScalar(0.8);
      R.add(lg);
      this.lanterns.push(lg);
    }
    // ---- grass tufts along the street edges ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (const s of [1, -1]) for (let z = 26; z > -30; z -= 0.6 + r() * 0.5) {
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
    // ---- Taobao stalls (east side + one west) ----
    const stallSpots: [number, number, number, string][] = [
      [18, -6, -0.35, "¥1000"], [18, 6, 0.3, "¥1500"], [-18, 0, 0.2, "¥800"],
    ];
    for (const [x, z, yaw, price] of stallSpots) {
      const st = makeStall(price);
      st.position.set(x, 0, z); st.rotation.y = yaw; R.add(st);
      blob(R, x, 0.06, z, 4.5, 3, 0.3);
    }
    // ---- the contract table + the empty chair ----
    const ct = makeContractTable();
    ct.position.set(TABLE_C[0], 0, TABLE_C[2]);
    R.add(ct);
    this.stamp = (ct as unknown as { userData: { stamp: THREE.Group } }).userData.stamp;
    this.stampRestY = 0.93;
    const chair = makeChair();
    chair.position.set(CHAIR_C[0], 0, CHAIR_C[2]);
    chair.rotation.y = 0.4;
    R.add(chair);
    blob(R, CHAIR_C[0], 0.06, CHAIR_C[2], 1.6, 1.6, 0.3);
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
    // lanterns sway gently (strings + tree lanterns)
    this.lanterns.forEach((lg, i) => { lg.rotation.z = Math.sin(tt * 1.1 + i * 1.7) * 0.05; lg.rotation.x = Math.cos(tt * 0.9 + i) * 0.03; });
    // shot 5: the red stamp slams down onto the contract
    if (this.stamp) {
      const st = id === 5 ? stampAt(tt) : 0;
      this.stamp.position.y = this.stampRestY + (1 - st) * 1.8;
      this.stamp.rotation.z = (1 - st) * 0.25;
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
