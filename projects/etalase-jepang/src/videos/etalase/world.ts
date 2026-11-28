// Etalase Jepang, Tokyo as one three.js scene for the Fafnir-ID
// cover frame: a restaurant street where the shopfronts show
// shokuhin sampuru — hyper-realistic PLASTIC food — in glass
// display cases. The hero prop is the GIANT glass case in front
// of the ramen shop: shelves of glossy ramen, sushi, tempura and
// onigiri replicas, steam curling off a plastic bowl, sushi
// plates turning slowly on a turntable. Paper lanterns, noren
// curtains, tiled roofs and a sakura tree line the street; the
// Gujo workshop corner sits at the west end. VISUAL CORE: warm
// Japanese daylight, glossy plastic food, red lanterns, textured
// everything (anti-banding: speckled sky, flecked street). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, cobble, planks, roof } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, CASE_POS, turntableAngle } from "./story";

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
const skyTexDay = () => ctex("etalaseSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("etalaseGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("etalaseBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** sakura petal sprite: a soft pink five-petal flake */
const petalTex = () => ctex("etalasePetal", 64, 64, (g) => {
  g.fillStyle = "#f7c3d4";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath(); g.ellipse(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 12, 8, a, 0, 7); g.fill();
  }
  g.fillStyle = "#e89ab5"; g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fill();
});
/** soft steam puff sprite: white radial wisp */
const steamTex = () => ctex("etalaseSteam", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** leaf-fleck canopy texture for the sakura: light pink clusters
 *  over deep rose shadow pockets — multiplied by canopy colour */
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#e8a8bd"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(120,40,70,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(255,225,235,${0.12 + r() * 0.22})` : `rgba(150,60,90,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** bark: vertical fissured streaks for tree trunks */
const barkTex = () => ctex("etalaseBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** quiet plaster noise for shop walls */
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
const blobTex = () => ctex("etalaseBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** shop sign board: bold latin name on a painted board, with a
 *  thin inner pinstripe so the board is never a flat sticker */
const signTex = (key: string, text: string, bg: string, fg: string) => ctex(key, 512, 128, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(255,255,255,0.22)"); grad.addColorStop(0.5, "rgba(255,255,255,0)"); grad.addColorStop(1, "rgba(0,0,0,0.14)");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 512, r() * 128, 2, 2); }
  g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.font = "900 64px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 68);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** One plastic ramen bowl: glossy red-black bowl, orange soup
 *  disc, noodle tangle, egg halves, narutomaki disc, chopsticks
 *  raised. Plastic = bright, saturated, a little too perfect. */
const makeRamenBowl = (s = 1) => {
  const g = new THREE.Group();
  const bowlM = lam2({ color: "#b02828" });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * s, 0.34 * s, 0.34 * s, 20), bowlM);
  bowl.position.y = 0.17 * s; bowl.castShadow = true; g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52 * s, 0.035 * s, 8, 24), lam2({ color: "#1d1d22" }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.34 * s; g.add(rim);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * s, 0.48 * s, 0.03 * s, 20), lam2({ color: "#e08a2e" }));
  soup.position.y = 0.32 * s; g.add(soup);
  // noodle tangle: small tori piled on the soup
  const noodleM = lam2({ color: "#f2d38a" });
  for (let i = 0; i < 5; i++) {
    const n = new THREE.Mesh(new THREE.TorusGeometry(0.09 * s, 0.028 * s, 6, 12), noodleM);
    n.position.set((Math.sin(i * 2.4) * 0.2) * s, 0.35 * s, (Math.cos(i * 1.9) * 0.18) * s);
    n.rotation.set(Math.PI / 2 + (i % 2 ? 0.4 : -0.3), 0, i * 1.1);
    g.add(n);
  }
  // narutomaki: white disc with pink swirl (two stacked discs)
  const naru = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.02 * s, 12), lam2({ color: "#f6f0e2" }));
  naru.position.set(0.2 * s, 0.35 * s, 0.1 * s); g.add(naru);
  const naruP = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.025 * s, 10), lam2({ color: "#e86a9a" }));
  naruP.position.set(0.2 * s, 0.35 * s, 0.1 * s); g.add(naruP);
  // egg halves
  for (const ex of [-0.22, 0.05]) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 10, 8), lam2({ color: "#fdf6e0" }));
    egg.scale.y = 0.7; egg.position.set(ex * s, 0.36 * s, -0.16 * s); g.add(egg);
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), lam2({ color: "#f2a81c" }));
    yolk.position.set(ex * s, 0.4 * s, -0.16 * s); g.add(yolk);
  }
  // chopsticks raised out of the bowl, angled
  const chopM = lam2({ color: "#8a5a2c" });
  for (const dx of [-0.05, 0.05]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * s, 0.012 * s, 0.85 * s, 6), chopM);
    ch.position.set((0.1 + dx) * s, 0.7 * s, 0.05 * s); ch.rotation.z = -0.35; ch.rotation.x = 0.2; g.add(ch);
  }
  return g;
};
/** One plate of nigiri sushi: white plate, salmon + tuna + egg
 *  nigiri in a row, a dab of wasabi. */
const makeSushiPlate = (s = 1) => {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.3 * s, 0.06 * s, 20), lam2({ color: "#f2f0e6" }));
  plate.position.y = 0.03 * s; plate.castShadow = true; g.add(plate);
  const tops: [string, string][] = [["#f28a4a", "#f6f0e2"], ["#c0392b", "#f6f0e2"], ["#f2d38a", "#f6f0e2"]];
  tops.forEach(([tc], i) => {
    const rice = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.09 * s, 0.11 * s), lam2({ color: "#f6f0e2" }));
    rice.position.set((-0.24 + i * 0.24) * s, 0.1 * s, 0); g.add(rice);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.17 * s, 0.04 * s, 0.12 * s), lam2({ color: tc }));
    top.position.set((-0.24 + i * 0.24) * s, 0.16 * s, 0); top.rotation.y = (i - 1) * 0.15; g.add(top);
  });
  const wasabi = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), lam2({ color: "#7a9a3a" }));
  wasabi.position.set(0.32 * s, 0.09 * s, 0.1 * s); g.add(wasabi);
  return g;
};
/** Tempura on a plate: golden battered cones + a dipping bowl. */
const makeTempura = (s = 1) => {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.3 * s, 0.05 * s, 18), lam2({ color: "#2c4a6a" }));
  plate.position.y = 0.025 * s; g.add(plate);
  const batM = lam2({ color: "#e8b84a" });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.34 * s, 8), batM);
    t.position.set((-0.18 + i * 0.18) * s, 0.2 * s, (i % 2 ? 0.08 : -0.06) * s);
    t.rotation.z = (i - 1) * 0.5; t.castShadow = true; g.add(t);
  }
  const dip = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.07 * s, 0.08 * s, 12), lam2({ color: "#f2f0e6" }));
  dip.position.set(0.3 * s, 0.07 * s, 0.12 * s); g.add(dip);
  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * s, 0.075 * s, 0.02 * s, 12), lam2({ color: "#5a3a1a" }));
  sauce.position.set(0.3 * s, 0.1 * s, 0.12 * s); g.add(sauce);
  return g;
};
/** Onigiri: white rice triangle with a dark nori band. */
const makeOnigiri = (s = 1) => {
  const g = new THREE.Group();
  const tri = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.3 * s, 4), lam2({ color: "#f6f0e2" }));
  tri.position.y = 0.15 * s; tri.rotation.y = Math.PI / 4; tri.castShadow = true; g.add(tri);
  const nori = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.12 * s, 0.05 * s), lam2({ color: "#1d2a1a" }));
  nori.position.set(0, 0.1 * s, 0.19 * s); g.add(nori);
  return g;
};
/** A paper lantern (chochin): glowing red globe, dark caps, hung
 *  from a short cord. Returns the group; sway it by rotation. */
const makeLantern = (col = "#d42f2f", s = 1) => {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.5 * s, 6), lam2({ color: "#2c2c30" }));
  cord.position.y = 0.55 * s; g.add(cord);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 12),
    new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 }));
  globe.scale.y = 1.15; globe.position.y = 0; globe.castShadow = true; g.add(globe);
  for (const cy of [0.48, -0.48]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.07 * s, 10), lam2({ color: "#2c2c30" }));
    cap.position.y = cy * s; g.add(cap);
  }
  return g;
};
/** A sakura tree: dark trunk + layered pink canopy blobs with
 *  leaf-fleck texture — never a smooth lollipop. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "etalaseFoliageDeep"),
    folM(greens[0], "etalaseFoliageMid"),
    folM(greens[1] ?? greens[0], "etalaseFoliageLite"),
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

// ---------------- the street ----------------
/** One shopfront: plaster wall, tiled kawara roof with a ridge,
 *  a dark door with a noren curtain, a lit window, and a painted
 *  sign board. Front faces +Z. */
const makeShop = (w: number, wallCol: string, roofCol: string, sign: string, signBg: string, signFg: string) => {
  const g = new THREE.Group();
  const wallH = 3.4;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.6),
    lam2({ map: rep(plasterTex("etalasePlaster" + sign, wallCol), 2, 1) }));
  wall.position.y = wallH / 2; wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
  // timber posts framing the front
  const postM = lam2({ color: "#5d4028" });
  for (const px of [-w / 2 + 0.15, w / 2 - 0.15]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 0.7), postM);
    post.position.set(px, wallH / 2, 0.05); g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.7), postM);
  beam.position.set(0, wallH - 0.15, 0.05); g.add(beam);
  // kawara roof: two sloped slabs + ridge cap
  const roofM = lam2({ map: rep(roof(roofCol), 2, 1) });
  for (const s of [1, -1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.18, 2.2), roofM);
    slab.position.set(0, wallH + 0.75, s * 0.85);
    slab.rotation.x = s * 0.5; slab.castShadow = true; g.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, w + 0.9, 8), lam2({ color: "#2c2c30" }));
  ridge.rotation.z = Math.PI / 2; ridge.position.set(0, wallH + 1.35, 0); g.add(ridge);
  // sign board above the door
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85),
    new THREE.MeshLambertMaterial({ map: signTex("etalaseSign" + sign, sign, signBg, signFg) }));
  signMesh.position.set(0, wallH + 0.55, 0.36); g.add(signMesh);
  // door: dark opening + noren curtain (two hanging panels)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.1), lam2({ color: "#241a12" }));
  door.position.set(-w / 4, 1.1, 0.32); g.add(door);
  const norenM = lam2({ color: "#e8e0c8" });
  for (const s of [1, -1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.0, 0.04), norenM);
    panel.position.set(-w / 4 + s * 0.36, 1.85, 0.38); g.add(panel);
  }
  // lit window with a warm glow + a small display shelf inside it
  const winF = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.08), lam2({ color: "#f2e6c8" }));
  winF.position.set(w / 4, 1.7, 0.32); g.add(winF);
  const winG = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.1),
    new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 }));
  winG.position.set(w / 4, 1.7, 0.33); g.add(winG);
  const muntV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.04), postM);
  muntV.position.set(w / 4, 1.7, 0.39); g.add(muntV);
  const muntH = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.04), postM);
  muntH.position.set(w / 4, 1.7, 0.39); g.add(muntH);
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
  private lanterns: { g: THREE.Group; ph: number }[] = [];
  private petals: THREE.Sprite[] = [];
  private petalBase: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private steams: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];
  private turntable: THREE.Group | null = null;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1717);
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

  // ---------------- the restaurant street ----------------
  private buildStreet(R: THREE.Group, r: () => number) {
    // ground: cobbled street + a lighter sidewalk strip in front
    // of the shops (map kept simple: no scrolling needed here)
    const street = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), lam2({ map: rep(cobble(), 18, 5), color: "#b8b0a0" }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0, -2); street.receiveShadow = true; R.add(street);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(90, 5.5), lam2({ map: rep(cobble(), 18, 1.2), color: "#d8cfba" }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.04, -7.2); walk.receiveShadow = true; R.add(walk);
    // ---- the shop row (facades at z = -10, fronts to +Z) ----
    const shops: [number, number, string, string, string, string, string][] = [
      // x, w, wall, roof, sign, signBg, signFg
      [0, 15, "#e8dcc4", "#3a4a6a", "RAMEN", "#b02828", "#f6ecd2"],
      [-13.5, 11, "#d8c8a8", "#4a3a5a", "SUSHI", "#2c4a6a", "#f6ecd2"],
      [13.5, 11, "#e0d0b0", "#5a3a2a", "IZAKAYA", "#2e5d3a", "#f6ecd2"],
    ];
    for (const [x, w, wall, roofC, sign, bg, fg] of shops) {
      const shop = makeShop(w, wall, roofC, sign, bg, fg);
      shop.position.set(x, 0.04, -10);
      R.add(shop);
      blob(R, x, 0.06, -9.4, w + 2, 3.4, 0.28);
    }
    // ---- the GIANT display case in front of the ramen shop ----
    const cx = CASE_POS[0], cz = CASE_POS[2];
    const caseG = new THREE.Group();
    // wooden base cabinet
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.0, 1.7), lam2({ color: "#5d4028", map: rep(planks(), 2, 1) }));
    base.position.y = 0.5; base.castShadow = true; caseG.add(base);
    // glass box: transparent panels + dark metal frame
    const glassM = new THREE.MeshPhysicalMaterial({ color: "#dfeef2", transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide });
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.3, 1.7), glassM);
    glassBox.position.y = 2.15; caseG.add(glassBox);
    const frameM = lam2({ color: "#2c2c30" });
    for (const [fx, fy, fz, sx, sy, sz] of [
      [-2.8, 2.15, 0.86, 0.12, 2.3, 0.12], [2.8, 2.15, 0.86, 0.12, 2.3, 0.12],
      [-2.8, 2.15, -0.86, 0.12, 2.3, 0.12], [2.8, 2.15, -0.86, 0.12, 2.3, 0.12],
      [0, 3.3, 0.86, 5.7, 0.12, 0.12], [0, 1.0, 0.86, 5.7, 0.12, 0.12],
      [0, 3.3, -0.86, 5.7, 0.12, 0.12], [0, 1.0, -0.86, 5.7, 0.12, 0.12],
    ] as [number, number, number, number, number, number][]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameM);
      f.position.set(fx, fy, fz); caseG.add(f);
    }
    // two glass shelves inside the case
    const shelfM = new THREE.MeshPhysicalMaterial({ color: "#dfeef2", transparent: true, opacity: 0.22, roughness: 0.08, side: THREE.DoubleSide });
    for (const sy of [1.75, 2.55]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 1.5), shelfM);
      sh.position.y = sy; caseG.add(sh);
    }
    // THE GIANT RAMEN — centre of the case, bottom shelf
    const bigRamen = makeRamenBowl(1.35);
    bigRamen.position.set(-0.6, 1.02, 0); caseG.add(bigRamen);
    // turntable with sushi plates — top shelf, spins forever
    const tt = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 24), lam2({ color: "#2c2c30" }));
    disc.position.y = 0; tt.add(disc);
    const sp1 = makeSushiPlate(0.85); sp1.position.set(-0.45, 0.05, 0.15); tt.add(sp1);
    const sp2 = makeSushiPlate(0.85); sp2.position.set(0.45, 0.05, -0.15); tt.add(sp2);
    const sp3 = makeSushiPlate(0.7); sp3.position.set(0, 0.05, 0.45); tt.add(sp3);
    tt.position.set(1.6, 2.6, 0); caseG.add(tt);
    this.turntable = tt;
    // tempura + onigiri on the middle shelf
    const temp = makeTempura(1.0); temp.position.set(-1.9, 1.78, 0.1); caseG.add(temp);
    const oni = makeOnigiri(1.2); oni.position.set(0.6, 1.78, -0.2); caseG.add(oni);
    const oni2 = makeOnigiri(1.0); oni2.position.set(1.1, 1.78, 0.25); oni2.rotation.y = 0.7; caseG.add(oni2);
    // a parfait glass on the top shelf, far right
    const parfait = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.5, 12),
      new THREE.MeshPhysicalMaterial({ color: "#dfeef2", transparent: true, opacity: 0.35, roughness: 0.05 }));
    glass.position.y = 0.25; parfait.add(glass);
    const cream = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lam2({ color: "#f6f0e2" }));
    cream.position.y = 0.52; parfait.add(cream);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lam2({ color: "#d42f2f" }));
    cherry.position.set(0.05, 0.62, 0.03); parfait.add(cherry);
    parfait.position.set(2.3, 2.6, -0.2); caseG.add(parfait);
    // steam sprites above the big ramen (animated in update)
    const steamM = new THREE.SpriteMaterial({ map: steamTex(), transparent: true, depthWrite: false, opacity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(steamM.clone());
      sp.position.set(-0.6 + (i - 1) * 0.3, 2.6, 0.2);
      sp.scale.set(0.5, 0.7, 1); sp.layers.set(NOINK);
      caseG.add(sp);
      this.steams.push({ sp, x: -0.6 + (i - 1) * 0.3, y: 2.5, z: 0.2, ph: i * 0.33 });
    }
    caseG.position.set(cx, 0, cz);
    R.add(caseG);
    blob(R, cx, 0.06, cz, 7.2, 3.2, 0.32);
    // ---- paper lanterns strung along the shopfronts ----
    const lanternSpots: [number, number, number, string][] = [
      [-6.5, 3.6, -9.2, "#d42f2f"], [6.5, 3.6, -9.2, "#d42f2f"],
      [-19, 3.6, -9.2, "#e8c832"], [19, 3.6, -9.2, "#e8c832"],
      [-1.5, 4.6, -9.2, "#d42f2f"],
    ];
    for (const [lx, ly, lz, col] of lanternSpots) {
      const lan = makeLantern(col, 0.9);
      lan.position.set(lx, ly, lz);
      R.add(lan);
      this.lanterns.push({ g: lan, ph: lx * 0.7 });
    }
    // ---- sakura trees flanking the street ----
    const pinks = ["#e8a0b8", "#f2b8cc", "#d67a9c"];
    const sakuraPts: [number, number, number][] = [[-9.5, -8.5, 4.8], [9.8, -8.5, 5.4], [-20, -8.5, 4.2], [21, -8.5, 4.6]];
    sakuraPts.forEach(([x, z, h], i) => {
      const t = makeTree(h, pinks, 20 + i * 13);
      t.position.set(x, 0.04, z);
      R.add(t);
      this.trees.push({ g: t, ph: 3.1 + i * 1.61 });
      blob(R, x, 0.06, z, 2.6, 2.6, 0.3);
    });
    // ---- falling sakura petals over the street ----
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: petalTex(), transparent: true, depthWrite: false, opacity: 0.95 }));
      const px = -16 + r() * 34, py = 1 + r() * 7, pz = -9 + r() * 12;
      sp.position.set(px, py, pz);
      const sc = 0.22 + r() * 0.2;
      sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
      R.add(sp);
      this.petals.push(sp);
      this.petalBase.push({ x: px, y: py, z: pz, sp: 0.55 + r() * 0.5, ph: i * 1.7 });
    }
    // ---- the Gujo workshop corner (west end): workbench, paint pots, tempura ----
    const wb = new THREE.Group();
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.1), lam2({ color: "#8a6844", map: rep(planks(), 2, 1) }));
    bench.position.y = 0.95; bench.castShadow = true; wb.add(bench);
    for (const [bx, bz] of [[-1.2, -0.45], [1.2, -0.45], [-1.2, 0.45], [1.2, 0.45]] as [number, number][]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), lam2({ color: "#5d4028" }));
      leg.position.set(bx, 0.48, bz); wb.add(leg);
    }
    const wTemp = makeTempura(0.9); wTemp.position.set(-0.6, 1.05, 0); wb.add(wTemp);
    const wOni = makeOnigiri(1.0); wOni.position.set(0.4, 1.05, 0.15); wb.add(wOni);
    const potCols = ["#e8b84a", "#d42f2f", "#2c4a6a"];
    potCols.forEach((c, i) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.14, 10), lam2({ color: c }));
      pot.position.set(0.85 + i * 0.22, 1.12, -0.3); wb.add(pot);
    });
    wb.position.set(-14, 0, -6.5);
    R.add(wb);
    blob(R, -14, 0.06, -6.5, 3.6, 2.2, 0.3);
    // workshop sign above the bench
    const wbSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshLambertMaterial({ map: signTex("etalaseSignGUJO", "GUJO", "#5d4028", "#f6ecd2") }));
    wbSign.position.set(-14, 3.1, -9.6); R.add(wbSign);
    // ---- street table near the hero: onigiri replica + REAL ramen (shot 7) ----
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 18), lam2({ color: "#8a6844", map: rep(planks(), 1, 1) }));
    top.position.y = 0.85; top.castShadow = true; table.add(top);
    const tleg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.85, 8), lam2({ color: "#2c2c30" }));
    tleg.position.y = 0.42; table.add(tleg);
    const tOni = makeOnigiri(1.1); tOni.position.set(-0.35, 0.9, 0.1); table.add(tOni);
    const realRamen = makeRamenBowl(0.9); realRamen.position.set(0.35, 0.9, -0.1); table.add(realRamen);
    // steam above the REAL ramen bowl (animated in update)
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
      sp.position.set(0.35 + (i - 0.5) * 0.25, 1.9, -0.1);
      sp.scale.set(0.4, 0.55, 1); sp.layers.set(NOINK);
      table.add(sp);
      this.steams.push({ sp, x: 0, y: 0, z: 0, ph: i * 0.5 + 0.2 });
      // NOTE: table-local steam — re-anchored below in update via parent offset
      (sp as unknown as { userData: { tableLocal: boolean } }).userData = { tableLocal: true };
    }
    table.position.set(3.4, 0, -4.6);
    R.add(table);
    blob(R, 3.4, 0.06, -4.6, 2.4, 2.4, 0.3);
    // ---- far backdrop: rooftops + a soft tree line closing the street ----
    for (let i = 0; i < 5; i++) {
      const roofG = new THREE.Group();
      const blk = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), lam2({ color: "#8a7a68" }));
      blk.position.y = 1.5; roofG.add(blk);
      const rf = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.2, 4.8), lam2({ map: rep(roof("#3a4a6a"), 1, 1) }));
      rf.position.y = 3.1; rf.rotation.x = 0; roofG.add(rf);
      roofG.position.set(-28 + i * 14, 0, -26 - (i % 2) * 6);
      R.add(roofG);
    }
    for (let i = 0; i < 8; i++) {
      const t = makeTree(6.5 + (i % 3) * 1.4, pinks, 90 + i * 7);
      t.position.set(-48 + i * 13, 0, -30 - (i % 2) * 6);
      R.add(t);
      this.trees.push({ g: t, ph: 5.3 + i * 1.17 });
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
    // sakura trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // paper lanterns sway gently from their cords
    for (const ln of this.lanterns) {
      ln.g.rotation.z = Math.sin(tt * 1.3 + ln.ph) * 0.05;
      ln.g.rotation.x = Math.cos(tt * 1.1 + ln.ph) * 0.03;
    }
    // sakura petals fall + drift across the street
    this.petals.forEach((p, i) => {
      const b = this.petalBase[i];
      const fall = (tt * b.sp + b.ph) % 8;
      p.position.set(b.x + Math.sin(tt * 0.9 + b.ph) * 1.2, b.y - fall, b.z + Math.cos(tt * 0.6 + b.ph) * 0.6);
      p.material.rotation = tt * 0.8 + b.ph;
    });
    // the sushi turntable spins — the case is ALIVE from frame 0
    if (this.turntable) this.turntable.rotation.y = turntableAngle(tt);
    // steam curls up off the plastic ramen AND the real bowl:
    // rise + grow + fade, looped per puff
    for (const st of this.steams) {
      const ph = (tt * 0.45 + st.ph) % 1;
      const mat = st.sp.material as THREE.SpriteMaterial;
      mat.opacity = 0.55 * (1 - ph);
      const sc = 0.35 + ph * 0.55;
      st.sp.scale.set(sc, sc * 1.4, 1);
      if (st.sp.userData.tableLocal) {
        st.sp.position.set(0.35 + (st.ph - 0.2) * 0.5 + Math.sin(tt * 1.4 + st.ph * 9) * 0.08, 1.75 + ph * 1.1, -0.1);
      } else {
        st.sp.position.set(st.x + Math.sin(tt * 1.4 + st.ph * 9) * 0.08, st.y + ph * 1.1, st.z);
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
