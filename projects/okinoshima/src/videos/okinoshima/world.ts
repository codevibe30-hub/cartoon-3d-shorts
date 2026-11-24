// Okinoshima, Fukuoka as one three.js scene for the Fafnir-ID
// cover frame: a sacred Shinto island rising from the Genkai Sea
// — the whole island is a kami. A vermilion torii and the small
// Okitsu-miya shrine on the forested slope, three reef rocks
// standing in the sea as a natural torii gate, a sandy beach
// where the rope barrier stops visitors, and the hero's wooden
// boat in the near foreground with the hero standing in it,
// shocked at the size of the claim. VISUAL CORE: bright sea
// daylight, deep blue-green water, saturated forest greens,
// vermilion + white shrine — textured everything (anti-banding:
// speckled sky, flecked water, woven thatch replaced by bark and
// rock). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the series style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks, cobble } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, HERO_BOAT, ISLAND_C, SHRINE_SPOT, TORII_SPOT, REEF_ROCKS, SACRED_ROCK, clamp01, heroBoatAt } from "./story";

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
const skyTexDay = () => ctex("okinoshimaSkyDay2", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("okinoshimaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("okinoshimaBirds", 256, 96, (g, r) => {
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
const grassRichTex = () => ctex("okinoshimaGrassRich", 1024, 1024, (g, r) => {
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
const soilTex = () => ctex("okinoshimaSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** soft warm light pool for sunlit lawn variation */
const patchTex = () => ctex("okinoshimaPatch", 256, 256, (g) => {
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
const barkTex = () => ctex("okinoshimaBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const blobTex = () => ctex("okinoshimaBlob", 256, 256, (g) => {
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

/** Sand for the beach apron: warm pale grains over a soft base. */
const sandTex = () => ctex("okinoshimaSand", 512, 512, (g, r) => {
  g.fillStyle = "#d9c49a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "180,150,100" : "240,225,190"},${0.10 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 26, 5 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "120,95,60" : "255,244,214"},${0.08 + r() * 0.16})`;
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = ["#f2f0e6", "#e8c8c8", "#d9d9d9"][i % 3];
    g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 2.4, 0, 7); g.fill();
  }
});

/** A vermilion torii gate: two pillars, double lintel, centre
 *  plaque. Front faces +Z. */
const makeTorii = () => {
  const g = new THREE.Group();
  const verm = lam2({ color: "#c8352c" });
  const dark = lam2({ color: "#2c2c30" });
  for (const s of [1, -1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.6, 10), verm);
    pillar.position.set(s * 1.5, 2.3, 0); pillar.castShadow = true; g.add(pillar);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 10), dark);
    base.position.set(s * 1.5, 0.15, 0); g.add(base);
  }
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.34), dark);
  shimaki.position.set(0, 4.75, 0); shimaki.castShadow = true; g.add(shimaki);
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.3, 0.42), verm);
  kasagi.position.set(0, 5.05, 0); kasagi.castShadow = true; g.add(kasagi);
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.2), verm);
  nuki.position.set(0, 3.9, 0); g.add(nuki);
  const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.12), dark);
  gaku.position.set(0, 4.35, 0); g.add(gaku);
  return g;
};

/** A stone lantern (toro): base, pillar, light box, cap. */
const makeStoneLantern = () => {
  const g = new THREE.Group();
  const stone = lam2({ color: "#8a8578" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), stone);
  base.position.y = 0.09; g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 8), stone);
  pillar.position.y = 0.53; g.add(pillar);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), stone);
  box.position.y = 1.05; g.add(box);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 }));
  glow.position.y = 1.05; g.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), stone);
  cap.position.y = 1.4; cap.rotation.y = Math.PI / 4; g.add(cap);
  return g;
};

/** Okitsu-miya: a small Shinto shrine — vermilion pillars, white
 *  walls, dark gabled roof with crossed finials (chigi). Front
 *  faces +Z; sits on a stone terrace. */
const makeShrine = () => {
  const g = new THREE.Group();
  const verm = lam2({ color: "#c8352c" });
  const white = lam2({ color: "#f2ede2" });
  const dark = lam2({ color: "#3a3f4a" });
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 6), lam2({ color: "#9a958c" }));
  terrace.position.y = -0.1; terrace.receiveShadow = true; g.add(terrace);
  for (const [x, z, m] of [[-2.2, 1.8, verm], [2.2, 1.8, verm], [-2.2, -1.8, dark], [2.2, -1.8, dark]] as [number, number, THREE.MeshLambertMaterial][]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 10), m);
    p.position.set(x, 2.1, z); p.castShadow = true; g.add(p);
  }
  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 3.6), white);
  hall.position.set(0, 2.3, -0.4); hall.castShadow = true; g.add(hall);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.1), dark);
  door.position.set(0, 1.5, 1.45); g.add(door);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), lam2({ color: "#d9b04a" }));
  ring.position.set(0, 1.5, 1.52); g.add(ring);
  const shape = new THREE.Shape();
  shape.moveTo(-3.4, 0); shape.lineTo(3.4, 0); shape.lineTo(0, 2.2); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.3);
  const roof = new THREE.Mesh(roofGeo, dark);
  roof.position.y = 3.55; roof.castShadow = true; g.add(roof);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.8, 8), lam2({ color: "#c8352c" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 5.78, 0); g.add(ridge);
  for (const s of [1, -1]) {
    for (const a of [0.5, -0.5]) {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), lam2({ color: "#d9b04a" }));
      ch.position.set(0, 6.15, s * 2.35); ch.rotation.x = a; g.add(ch);
    }
  }
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.8), lam2({ color: "#a39a8b" }));
    st.position.set(0, 0.35 - i * 0.28, 3.4 + i * 0.8); st.receiveShadow = true; g.add(st);
  }
  for (const s of [1, -1]) {
    const lan = makeStoneLantern();
    lan.position.set(s * 2.6, 0.5, 3.6); g.add(lan);
  }
  return g;
};

/** A sacred rock (iwakura): a lumpy grey boulder, flat-shaded so
 *  its facets read. */
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

/** A low wooden fishing boat: flat bottom, flared plank sides,
 *  bench seats. Bow toward +Z. The HERO boat uses
 *  plain Lambert materials on purpose: the two-tone shade
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
    folM(greens[2] ?? greens[0], "okinoshimaFoliageDeep"),
    folM(greens[0], "okinoshimaFoliageMid"),
    folM(greens[1] ?? greens[0], "okinoshimaFoliageLite"),
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
    // the sun's halo + core, upper left over the sea
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
    this.buildIsland(R, r);
    // ---- the hero's boat in the near foreground ----
    // round 2: the hull albedo goes warm + bright (raw timber
    // amber) — round 1's deep brown multiplied through the
    // blue-violet shade tone and read as dark purple plastic.
    this.heroBoat = makeBoat("#c47a3d", 4.6, 1.5, true);
    this.heroBoat.position.set(HERO_BOAT[0], 0.02, HERO_BOAT[2]);
    this.heroBoat.rotation.y = -0.28;
    // lived-in props: a punt pole shipped along the gunwale, a
    // coil of rope, and a small basket of offerings on the foredeck
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 4.4, 7), lam2({ color: "#8a6844", map: rep(barkTex(), 1, 3) }));
    pole.rotation.x = Math.PI / 2 - 0.06; pole.position.set(-0.52, 0.78, -0.2); this.heroBoat.add(pole);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 20), lam2({ color: "#c9b18a" }));
    rope.rotation.x = Math.PI / 2; rope.position.set(0.42, 0.68, 1.55); this.heroBoat.add(rope);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 10), lam2({ color: "#a8845f", map: rep(planks(), 1, 1) }));
    basket.position.set(-0.3, 0.82, 1.7); basket.rotation.y = 0.3; basket.castShadow = true; this.heroBoat.add(basket);
    const offerCols = ["#e8c45a", "#f2f0e6", "#d83a4a"];
    for (let i = 0; i < 3; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lam2({ color: offerCols[i % 3] }));
      orb.position.set(-0.42 + i * 0.13, 1.02, 1.7); this.heroBoat.add(orb);
    }
    R.add(this.heroBoat);
    this.heroBlob = blob(R, HERO_BOAT[0], 0.06, HERO_BOAT[2], 3.4, 5.6, 0.35);
  }

  // ---------------- the island: sea, beach, shrine, torii, forest ----------------
  private buildIsland(R: THREE.Group, r: () => number) {
    // the Genkai Sea: deep blue-green water in every direction
    // (map kept so update() can scroll it — the sea MOVES, it is
    // not a poster)
    const seaMap = rep(water(), 24, 24);
    this.waterMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lam2({ map: seaMap, color: "#3d7ea6" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -40); sea.receiveShadow = true; R.add(sea);
    // the island mound: forested rock rising from the sea
    // (flattened sphere, centre y=-1, ry 8.32 — top at y ~7.3)
    const mound = new THREE.Mesh(new THREE.SphereGeometry(26, 28, 20),
      lam2({ map: rep(grassRichTex(), 8, 8), color: "#7a9a58" }));
    mound.scale.set(1, 0.32, 1); mound.position.set(ISLAND_C[0], -1, ISLAND_C[2]);
    mound.castShadow = true; mound.receiveShadow = true; R.add(mound);
    const moundY = (x: number, z: number) => {
      const d = Math.hypot(x - ISLAND_C[0], z - ISLAND_C[2]) / 26;
      return d >= 1 ? -1 : -1 + 8.32 * Math.sqrt(1 - d * d);
    };
    // rock ring at the waterline so the island reads as ROCK, not a lawn ball
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r() * 0.3;
      const rock = makeRock(1.2 + r() * 1.6, 30 + i * 7);
      rock.position.set(Math.cos(a) * (24.5 + r() * 1.5), -0.2 + r() * 0.4, ISLAND_C[2] + Math.sin(a) * (24.5 + r() * 1.5));
      rock.rotation.y = r() * 3; R.add(rock);
    }
    // the beach apron: pale sand from the waterline to the rock foot
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(32, 20), lam2({ map: rep(sandTex(), 4, 3) }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.12, -22); beach.receiveShadow = true; R.add(beach);
    // ---- Okitsu-miya shrine on its stone terrace ----
    const shrine = makeShrine();
    shrine.position.set(SHRINE_SPOT[0], SHRINE_SPOT[1] - 0.5, SHRINE_SPOT[2]);
    R.add(shrine);
    blob(R, SHRINE_SPOT[0], SHRINE_SPOT[1] + 0.02, SHRINE_SPOT[2], 9, 8, 0.30);
    // ---- the vermilion torii at the foot of the rock ----
    const torii = makeTorii();
    torii.position.set(TORII_SPOT[0], TORII_SPOT[1], TORII_SPOT[2]);
    torii.rotation.y = 0.15;
    R.add(torii);
    blob(R, TORII_SPOT[0], TORII_SPOT[1] + 0.03, TORII_SPOT[2], 5, 2.5, 0.30);
    // ---- the sacred rock on the beach edge ----
    const sacred = makeRock(2.6, 77);
    sacred.position.set(SACRED_ROCK[0], 0.6, SACRED_ROCK[2]);
    sacred.rotation.y = 0.7; R.add(sacred);
    blob(R, SACRED_ROCK[0], 0.14, SACRED_ROCK[2], 6.5, 6, 0.32);
    // ---- the three reef rocks: the island's natural torii gate ----
    REEF_ROCKS.forEach(([rx, , rz], i) => {
      const reef = makeRock(3.2 + (i % 2) * 1.4, 100 + i * 13);
      reef.scale.y = 2.1 + (i % 2) * 0.5;
      reef.position.set(rx, 0.5, rz);
      reef.rotation.y = r() * 3; R.add(reef);
    });
    // ---- the shimenawa rope barrier across the beach ----
    const postM = lam2({ color: "#7d5a36" });
    const ropePts: THREE.Vector3[] = [];
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 8), postM);
      post.position.set(s * 3, 0.85, -18); post.castShadow = true; R.add(post);
    }
    const ropeCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-3, 1.5, -18), new THREE.Vector3(0, 1.15, -18), new THREE.Vector3(3, 1.5, -18));
    const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 20, 0.045, 6),
      lam2({ color: "#d9cfa8" }));
    rope.castShadow = true; R.add(rope);
    // white paper streamers (shide) hanging from the rope
    for (const [sx, sy] of [[-1.5, 1.32], [0, 1.22], [1.5, 1.32]] as [number, number][]) {
      const shide = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5),
        new THREE.MeshBasicMaterial({ color: "#f6f2e6", side: THREE.DoubleSide }));
      shide.position.set(sx, sy - 0.25, -18); shide.rotation.z = (r() - 0.5) * 0.2; R.add(shide);
    }
    // ---- the sacred forest on the mound ----
    const greens = ["#2f6a2a", "#3f8a3a", "#26511a"];
    const treeSpots: [number, number, number][] = [
      [-10, -48, 5.2], [10, -50, 5.6], [-14, -58, 6.0], [12, -62, 5.4],
      [0, -68, 6.2], [-4, -70, 5.0], [16, -52, 4.8], [-18, -50, 5.0],
      [6, -58, 4.6], [-8, -64, 5.8], [18, -60, 4.4], [-20, -62, 5.2],
    ];
    const treePts: [number, number][] = [];
    treeSpots.forEach(([x, z, h], i) => {
      const t = makeTree(h, greens, i * 7 + 3);
      t.position.set(x, moundY(x, z) - 0.1, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.93 + 0.7 });
      treePts.push([x, z]);
    });
    // ---- moored fishing boats near the beach ----
    const moored: [string, number, number, number][] = [
      ["#3d6a8a", -6, -8, 0.06], ["#a03a30", 7, -4, -0.05], ["#3a7a4a", -3, -24, 0.04],
    ];
    for (const [col, x, z, yaw] of moored) {
      const b = makeBoat(col, 4.2, 1.4);
      b.position.set(x, 0.02, z); b.rotation.y = yaw;
      R.add(b);
      this.mooredBoats.push({ g: b, ph: x * 1.7 - z * 0.6 });
      blob(R, x, 0.05, z, 3.0, 5.0, 0.32);
    }
    // ---- beach grass tufts along the sand edges ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    const pushTuft = (x: number, z: number, s = 1) => { tuftPts.push({ x, z, s }); };
    for (const s of [1, -1]) for (let z = -13; z > -30; z -= 0.7 + r() * 0.6) {
      if (r() < 0.8) pushTuft(s * (13.5 + r() * 1.6), z + (r() - 0.5), 0.85 + r() * 0.8);
    }
    for (const [tx, tz] of treePts) for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2, d = 0.9 + r() * 0.8;
      pushTuft(tx + Math.cos(a) * d, tz + Math.sin(a) * d, 0.8 + r() * 0.7);
    }
    for (let i = 0; i < 120; i++) {
      const s = r() < 0.5 ? 1 : -1, x = s * (12.5 + r() * 3), z = -13 - r() * 16;
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
      disc.position.set(tx, moundY(tx, tz) + 0.02, tz);
      disc.receiveShadow = true; R.add(disc);
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
    // frame 0) — hull, contact blob and all (heroBoatAt is shared
    // with cast.ts)
    const hb = heroBoatAt(id, tt);
    this.heroBoat.position.set(hb.x, 0.02 + Math.sin(tt * 1.3) * 0.03, hb.z);
    this.heroBoat.rotation.y = hb.yaw;
    this.heroBoat.rotation.z = Math.sin(tt * 0.9) * 0.012;
    if (this.heroBlob) this.heroBlob.position.set(hb.x, 0.06, hb.z);
    // ---- STANDAR GERAK: everything that should move, moves ----
    // sea water flows toward the viewer (texture scroll, not a poster)
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
