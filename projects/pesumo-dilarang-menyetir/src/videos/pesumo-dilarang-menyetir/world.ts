// Tokyo, Jepang as one three.js scene for the Fafnir-ID cover
// frame: a bright daytime street — a zebra crossing, cars waiting
// and rolling, pedestrians, buildings with signs receding down
// the street, and a dohyo ring plaza (clay ring + straw bales +
// four pillars + roof) closing the far-left lawn for the sumo
// shot. The hero stands on the sidewalk beside a SMALL RED CAR
// with a GIANT pesumo towering behind it, shocked at the size
// of the claim. VISUAL CORE: bright Tokyo daylight, warm asphalt,
// saturated signs — textured everything (anti-banding: speckled
// sky, flecked road, woven awnings). Layered light rig: sun key
// w/ soft shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, SMALL_CAR, LUX_CAR, CRASH_CAR, VINTAGE_CAR, DOHYO, clamp01 } from "./story";

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
const skyTexDay = () => ctex("pesumoSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("pesumoGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("pesumoBirds", 256, 96, (g, r) => {
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
const grassRichTex = () => ctex("pesumoGrassRich", 1024, 1024, (g, r) => {
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
const soilTex = () => ctex("pesumoSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit variation */
const patchTex = () => ctex("pesumoPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("pesumoBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for plain-walled buildings */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** asphalt: dark grey with aggregate speckle + faint tyre bands */
const asphaltTex = () => ctex("pesumoAsphalt", 512, 512, (g, r) => {
  g.fillStyle = "#3d3f45"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "200,205,215" : "12,14,18"},${0.04 + r() * 0.08})`;
    g.fillRect(r() * 512, r() * 512, 1.6, 1.6);
  }
  for (let i = 0; i < 24; i++) {
    g.fillStyle = `rgba(20,22,26,${0.05 + r() * 0.07})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 70, 14 + r() * 26, r() * 3, 0, 7); g.fill();
  }
});
const blobTex = () => ctex("pesumoBlob", 256, 256, (g) => {
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

/** A Tokyo street building: textured slab, a grid of windows with
 *  sky glints, a coloured sign band + a tall vertical sign, and a
 *  shop front with awning at street level. Front faces +Z; yaw it
 *  toward the street when placing. */
const makeBuilding = (w: number, h: number, d: number, wallCol: string, signCols: string[], seed = 1) => {
  const g = new THREE.Group();
  const r = rng(seed * 911 + 7);
  const wallM = lam2({ map: rep(plasterTex(`pesumoPlaster${seed}`, wallCol), 2, Math.max(1, Math.round(h / 4))) });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
  walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  // roof rim + a rooftop box (AC unit / water tank silhouette)
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), lam2({ color: "#4a4640" }));
  rim.position.y = h + 0.15; g.add(rim);
  const roofBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.9, d * 0.3), lam2({ color: "#6a6560" }));
  roofBox.position.set(w * 0.2, h + 0.8, 0); roofBox.castShadow = true; g.add(roofBox);
  // window grid on the front face: dark glass, white frames, glints
  const frameM = lam2({ color: "#e8e4da" });
  const glassM = lam2({ color: "#2c4258" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.5 });
  const floors = Math.max(2, Math.floor((h - 3.2) / 3.1));
  const cols = Math.max(2, Math.floor(w / 2.6));
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = -w / 2 + (c + 0.5) * (w / cols), wy = 3.4 + f * 3.1;
      if (wy > h - 1) continue;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.08), frameM);
      fr.position.set(wx, wy, d / 2 + 0.02); g.add(fr);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.1), glassM);
      gl.position.set(wx, wy, d / 2 + 0.03); g.add(gl);
      if (r() < 0.6) {
        const gt = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.0), glintM);
        gt.position.set(wx - 0.3, wy + 0.1, d / 2 + 0.09); gt.rotation.z = 0.5; g.add(gt);
      }
      // some windows lit warm (someone home)
      if (r() < 0.22) {
        const lit = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5),
          new THREE.MeshBasicMaterial({ color: "#ffd98a", transparent: true, opacity: 0.75 }));
        lit.position.set(wx, wy, d / 2 + 0.09); g.add(lit);
      }
    }
  }
  // horizontal sign band + tall vertical sign (coloured panels, no
  // text — drawn lettering would gibberish at this scale)
  const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 1.1, 0.14), lam2({ color: signCols[0] }));
  band.position.set(0, h - 1.6, d / 2 + 0.08); g.add(band);
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.5, 0.16), lam2({ color: signCols[1] ?? signCols[0] }));
  band2.position.set(0, h - 1.6, d / 2 + 0.1); g.add(band2);
  const vSign = new THREE.Mesh(new THREE.BoxGeometry(0.9, Math.min(6.5, h * 0.55), 0.14), lam2({ color: signCols[2] ?? signCols[0] }));
  vSign.position.set(w / 2 - 0.8, h * 0.62, d / 2 + 0.08); g.add(vSign);
  const vBand = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.4, 0.16), lam2({ color: "#f2ede2" }));
  vBand.position.set(w / 2 - 0.8, h * 0.62 + 1.2, d / 2 + 0.09); g.add(vBand);
  // shop front: glass + door + striped awning at street level
  const shopGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 2.2, 0.1), glassM);
  shopGlass.position.set(-w * 0.12, 1.35, d / 2 + 0.03); g.add(shopGlass);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.12), lam2({ color: "#2e5d3a" }));
  door.position.set(w * 0.32, 1.15, d / 2 + 0.04); g.add(door);
  const awnCols = ["#d84040", "#f2ede2"];
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.08, 1.1),
    lam2({ color: awnCols[seed % 2] }));
  awn.position.set(0, 2.85, d / 2 + 0.55); awn.rotation.x = 0.35; awn.castShadow = true; g.add(awn);
  // awning stripes: thin boxes alternating colour along the front edge
  for (let i = 0; i < 7; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86 / 7, 0.09, 1.12),
      lam2({ color: i % 2 ? "#f2ede2" : "#d84040" }));
    st.position.set(-w * 0.43 + (i + 0.5) * (w * 0.86 / 7), 2.85, d / 2 + 0.55);
    st.rotation.x = 0.35; g.add(st);
  }
  return g;
};

/** A simple boxy city car: body + cabin + windows + wheels +
 *  headlights. Faces -Z by default (yaw it to flip direction). */
const makeCar = (bodyCol: string, vintage = false) => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: bodyCol });
  const glassM = lam2({ color: "#24384a" });
  const len = vintage ? 3.9 : 4.3, wid = 1.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.62, len), bodyM);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.25, 0.55, len * 0.52), glassM);
  cabin.position.set(0, 1.1, vintage ? 0.1 : -0.15); cabin.castShadow = true; g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.2, 0.07, len * 0.5), bodyM);
  roof.position.set(0, 1.4, vintage ? 0.1 : -0.15); g.add(roof);
  // bumpers + grille
  for (const e of [1, -1]) {
    const bump = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.06, 0.16, 0.18), lam2({ color: "#c8ccd2" }));
    bump.position.set(0, 0.42, e * (len / 2 + 0.02)); g.add(bump);
  }
  const wheelM = lam2({ color: "#1c1e22" });
  const hubM = lam2({ color: "#9aa0a8" });
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]] as [number, number][]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), wheelM);
    wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.34, wz); wh.castShadow = true; g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10), hubM);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.34, wz); g.add(hub);
  }
  // headlights (front = -Z) + taillights
  for (const s of [1, -1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshLambertMaterial({ color: "#fff6d8", emissive: "#ffedb0", emissiveIntensity: 0.8 }));
    hl.position.set(s * 0.62, 0.62, -len / 2 - 0.02); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06),
      new THREE.MeshLambertMaterial({ color: "#c02020", emissive: "#a01818", emissiveIntensity: 0.7 }));
    tl.position.set(s * 0.62, 0.68, len / 2 + 0.02); g.add(tl);
  }
  return g;
};


/** A sumo dohyo: clay ring + straw-bale circle + four coloured
 *  pillars (green/red/white/black, the four gods) + a square
 *  pyramid roof — the ring plaza on the far-left lawn. */
const makeDohyo = () => {
  const g = new THREE.Group();
  // clay ring: a low cylinder, warm packed-earth clay
  const clay = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.18, 28), lam2({ color: "#c9a06a" }));
  clay.position.y = 0.09; clay.receiveShadow = true; g.add(clay);
  // straw-bale ring: a torus of pale straw around the clay
  const straw = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.16, 10, 32), lam2({ color: "#d8b93a" }));
  straw.rotation.x = Math.PI / 2; straw.position.y = 0.2; straw.castShadow = true; g.add(straw);
  // four pillars at the corners, the four gods' colours
  const pillarCols = ["#2c7a3a", "#c03028", "#f2ede2", "#1d1d22"];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(a) * 3.1, pz = Math.sin(a) * 3.1;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.2, 10), lam2({ color: pillarCols[i] }));
    pillar.position.set(px, 2.1, pz); pillar.castShadow = true; g.add(pillar);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lam2({ color: "#c9a84a" }));
    cap.position.set(px, 4.3, pz); g.add(cap);
  }
  // square pyramid roof, dark blue-green, floating over the ring
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 1.6, 4), lam2({ color: "#1d4a5a" }));
  roof.position.y = 5.1; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lam2({ color: "#c9a84a" }));
  finial.position.y = 6.0; g.add(finial);
  return g;
};

/** A red vending machine: glowing drink window, white band. */
const makeVendingMachine = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.95, 0.8), lam2({ color: "#c03030" }));
  body.position.y = 0.98; body.castShadow = true; g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.35, 0.82), lam2({ color: "#f2ede2" }));
  band.position.y = 1.55; g.add(band);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9),
    new THREE.MeshLambertMaterial({ color: "#ffe9a8", emissive: "#ffcf5e", emissiveIntensity: 0.5 }));
  win.position.set(0, 1.05, 0.41); g.add(win);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.06), lam2({ color: "#1e1e22" }));
  slot.position.set(0, 0.45, 0.41); g.add(slot);
  return g;
};

/** A utility pole with crossarm + sagging wires to the next pole. */
const makeUtilityPole = (withWires: THREE.Vector3 | null) => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), lam2({ color: "#4a3a28" }));
  pole.position.y = 3.5; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.12), lam2({ color: "#4a3a28" }));
  arm.position.y = 6.4; g.add(arm);
  for (const s of [1, -1]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 6), lam2({ color: "#e8e4da" }));
    ins.position.set(s * 0.85, 6.55, 0); g.add(ins);
  }
  if (withWires) {
    const wireM = new THREE.LineBasicMaterial({ color: "#1e1e22" });
    for (const dy of [6.4, 6.1]) {
      const pts = [new THREE.Vector3(0, dy, 0), new THREE.Vector3(withWires.x / 2, dy - 0.7, withWires.z / 2), new THREE.Vector3(withWires.x, dy, withWires.z)];
      const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12));
      g.add(new THREE.Line(geo, wireM));
    }
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
    folM(greens[2] ?? greens[0], "pesumoFoliageDeep"),
    folM(greens[0], "pesumoFoliageMid"),
    folM(greens[1] ?? greens[0], "pesumoFoliageLite"),
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
 *  vertex-coloured dark base -> sunlit tip. Instanced around the
 *  dohyo lawn so the grass edges stop being ruler-straight. */
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
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private cars: { g: THREE.Group; lane: number; dir: number; speed: number; off: number; ph: number }[] = [];
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
    // the sun's halo + core, upper left down the street
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
    this.buildStreet(R, r);
  }

  // ---------------- the street: road, sidewalks, buildings, dohyo ----------------
  private buildStreet(R: THREE.Group, r: () => number) {
    // base ground under everything (urban grey)
    const base = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ color: "#565b61" }));
    base.rotation.x = -Math.PI / 2; base.position.set(0, -0.12, -20); base.receiveShadow = true; R.add(base);
    // the road: asphalt running away down -Z
    const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), lam2({ map: rep(asphaltTex(), 2, 24) }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -20); road.receiveShadow = true; R.add(road);
    // centre dashes (yellow) + stop lines (white), skipping the zebra zone
    const dashM = lam2({ color: "#e8c832" });
    for (let z = 32; z > -68; z -= 4) {
      if (Math.abs(z) < 3.5) continue;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.6), dashM);
      dash.position.set(0, 0.02, z); R.add(dash);
    }
    const stopM = lam2({ color: "#f2f0e6" });
    for (const z of [3.2, -3.2]) {
      const stop = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.02, 0.5), stopM);
      stop.position.set(0, 0.02, z); R.add(stop);
    }
    // the zebra crossing: five white stripes across the road at z = 0
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.02, 0.7), stopM);
      stripe.position.set(0, 0.02, i * 0.88); R.add(stripe);
    }
    // sidewalks + curbs (footpaths — the hero's ground)
    for (const s of [1, -1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 120), lam2({ map: rep(cobble(), 2, 40), color: "#b8b2a4" }));
      walk.rotation.x = -Math.PI / 2; walk.position.set(s * 7.25, 0.15, -20); walk.receiveShadow = true; R.add(walk);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 120), lam2({ color: "#8a8578" }));
      curb.position.set(s * 4.6, 0.05, -20); R.add(curb);
      // tactile paving strip (yellow, dotted) along the sidewalk edge
      const tact = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 120), lam2({ color: "#d8b93a" }));
      tact.position.set(s * 5.3, 0.17, -20); R.add(tact);
    }
    // ---- buildings lining both sides, fronts to the street ----
    const wallCols = ["#d8cbb2", "#c9b8a0", "#b8c4cc", "#d8a878", "#a8b8c8", "#e0d8c8"];
    const signSets: string[][] = [
      ["#d84040", "#2f6fc0", "#e8c832"], ["#2f6fc0", "#d84040", "#3d8a3a"],
      ["#e8a020", "#c03028", "#2f6fc0"], ["#3d8a3a", "#e8c832", "#d84040"],
      ["#c03028", "#2f6fc0", "#e8a020"], ["#7b5ac9", "#d84040", "#2f6fc0"],
    ];
    const buildRow = (side: number, list: [number, number, number, number][]) => {
      list.forEach(([z, w, h, i]) => {
        const b = makeBuilding(w, h, 8, wallCols[i % wallCols.length], signSets[i % signSets.length], i * 7 + (side > 0 ? 3 : 11));
        b.position.set(side * 15.5, 0.15, z);
        b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        R.add(b);
        blob(R, side * 15.5, 0.16, z, w + 3, 10, 0.25);
      });
    };
    buildRow(1, [[14, 10, 14, 0], [-2, 12, 20, 1], [-20, 9, 11, 2], [-36, 11, 17, 3], [-52, 10, 24, 4], [-66, 12, 15, 5]]);
    buildRow(-1, [[18, 9, 12, 2], [2, 11, 18, 3], [-14, 10, 13, 4], [-48, 12, 21, 5], [-62, 9, 16, 0]]);
    // ---- the dohyo plaza (far-left, sumo shot) ----
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(7, 24), lam2({ map: rep(grassRichTex(), 3, 3) }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.set(-11, 0.16, -34); lawn.receiveShadow = true; R.add(lawn);
    const dohyo = makeDohyo();
    dohyo.position.set(DOHYO[0], 0.15, DOHYO[2]);
    R.add(dohyo);
    const pineGreens = ["#2c5c2c", "#3d7a32", "#24401e"];
    for (const [px, pz, ph] of [[-13.5, -30, 6], [-6.5, -38, 5.4], [-13.5, -38, 6.4]] as [number, number, number][]) {
      const pine = makeTree(ph, pineGreens, Math.round(px * 10 + pz));
      pine.position.set(px, 0.15, pz); R.add(pine);
      this.trees.push({ g: pine, ph: px * 1.3 + pz * 0.4 });
    }
    // ---- street trees along both sidewalks ----
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const treePts: [number, number][] = [];
    const streetTrees: [number, number, number][] = [
      [5.8, -6, 4.2], [5.8, -22, 3.8], [5.8, -40, 4.6], [5.8, -56, 4.0],
      [-5.8, -14, 4.4], [-5.8, -48, 3.9], [-5.8, -62, 4.3],
    ];
    streetTrees.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, 40 + i * 13);
      t.position.set(x, 0.15, z); R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      treePts.push([x, z]);
      const soilM = lam2({ map: rep(soilTex(), 1, 1) });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 0.3, 12), soilM);
      disc.rotation.x = -Math.PI / 2; disc.rotation.z = r() * 3; disc.position.set(x, 0.16, z);
      disc.receiveShadow = true; R.add(disc);
    });
    // ---- utility poles + sagging wires ----
    const poleZs = [-12, -32, -52];
    for (const s of [1, -1]) {
      poleZs.forEach((z, i) => {
        const next = i < poleZs.length - 1 ? new THREE.Vector3(0, 0, poleZs[i + 1] - z) : null;
        const pole = makeUtilityPole(next);
        pole.position.set(s * 5.2, 0.15, z);
        R.add(pole);
      });
    }
    // ---- the vending machine ----
    const vend = makeVendingMachine();
    vend.position.set(6.4, 0.15, 12); vend.rotation.y = -Math.PI / 2; R.add(vend);
    // ---- cars: the SMALL RED CAR the pesumo towers behind (shots 1/3/8/10),
    // the BLACK LUXURY CAR (shot 9), the CRASHED CAR tilted against the pole
    // (shot 4), one waiting at the stop line, three rolling, one vintage parked ----
    const smallCar = makeCar("#d84040");
    smallCar.position.set(SMALL_CAR[0], 0, SMALL_CAR[2]);
    smallCar.rotation.y = Math.PI; // nose toward the camera
    R.add(smallCar);
    blob(R, SMALL_CAR[0], 0.05, SMALL_CAR[2], 2.6, 5.0, 0.32);
    const luxCar = makeCar("#14141c");
    luxCar.position.set(LUX_CAR[0], 0, LUX_CAR[2]);
    luxCar.rotation.y = Math.PI * 0.95;
    R.add(luxCar);
    blob(R, LUX_CAR[0], 0.05, LUX_CAR[2], 2.6, 5.0, 0.32);
    const crashCar = makeCar("#c03028");
    crashCar.position.set(CRASH_CAR[0], 0, CRASH_CAR[2]);
    crashCar.rotation.y = -0.5; crashCar.rotation.z = 0.12; // tilted against the pole
    R.add(crashCar);
    blob(R, CRASH_CAR[0], 0.05, CRASH_CAR[2], 2.6, 5.0, 0.32);
    const waitCar = makeCar("#3a6ac9");
    waitCar.position.set(-2.2, 0, 6.5);
    R.add(waitCar);
    blob(R, -2.2, 0.05, 6.5, 2.6, 5.0, 0.32);
    const vintageCar = makeCar("#2c4a34", true);
    vintageCar.position.set(VINTAGE_CAR[0], 0, VINTAGE_CAR[2]); vintageCar.rotation.y = 0.1;
    R.add(vintageCar);
    blob(R, VINTAGE_CAR[0], 0.05, VINTAGE_CAR[2], 2.6, 4.6, 0.32);
    const rolling: [string, number, number, number, number][] = [
      ["#d84040", -2.2, -1, 8, 0], ["#3a6ac9", 2.2, 1, 7, 40], ["#e8e8e8", -2.2, -1, 9, 65],
    ];
    for (const [col, lane, dir, speed, off] of rolling) {
      const c = makeCar(col);
      if (dir > 0) c.rotation.y = Math.PI;
      R.add(c);
      this.cars.push({ g: c, lane, dir, speed, off, ph: lane * 1.7 + off * 0.6 });
    }
    // ---- round 3: grass dressing on the dohyo lawn ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = 1.5 + r() * 5;
      tuftPts.push({ x: -11 + Math.cos(a) * d, z: -34 + Math.sin(a) * d * 0.8, s: 0.7 + r() * 0.7 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.15, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // sun pools + shade pools on the sidewalks so the paving is layered
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.5 + r() * 2), 0.17, 10 - r() * 80, 3.5 + r() * 3, 4 + r() * 5, 0.14 + r() * 0.08, r() * 3);
    }
    for (let i = 0; i < 6; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, blobTex(), "#5d6a58", s * (6.5 + r() * 2), 0.17, 8 - r() * 75, 4 + r() * 3, 5 + r() * 4, 0.22 + r() * 0.08, r() * 3);
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
    // cars roll through the intersection, always.
    for (const car of this.cars) {
      const z = car.dir > 0 ? -70 + ((tt * car.speed + car.off) % 105) : 35 - ((tt * car.speed + car.off) % 105);
      car.g.position.set(car.lane, 0.02 + Math.sin(tt * 1.3 + car.ph) * 0.012, z);
      car.g.rotation.z = Math.sin(tt * 0.9 + car.ph) * 0.008;
    }
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // dohyo lawn tufts bend with the same wind (phase travels across the lawn)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.15, p.z);
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
