// A Savonlinna throwing field as one three.js scene for the
// Fafnir-ID cover frame: the Mobile Phone Throwing World
// Championship — a green field, white throwing line, distance
// boards, pine trees lining the sides, a blue lake behind,
// wooden cabins, a big SAVONLINNA sign. The hero prop is the
// GIANT flying brick phone (a billboard in cast.ts), phones
// spinning through the sky, pollen drifting. VISUAL CORE:
// bright Nordic summer daylight, green field + blue lake
// against layered pines, textured everything (anti-banding:
// speckled sky, flecked fields). Layered light rig: sun key
// w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, ROAD_HALF, WALK_R, WALK_L, HERO_SPOT, SIGN_POS } from "./story";

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
const skyTexDay = () => ctex("lemparSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1a55c0"); grad.addColorStop(0.34, "#3a7ed8"); grad.addColorStop(0.62, "#74acee");
  grad.addColorStop(0.85, "#b8d6f6"); grad.addColorStop(1, "#e8f1fb");
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
/** Golden-hour sky (shot 7 only): peach at the horizon rising
 *  through rose to muted mauve at the zenith, bigger warmer sun. */
const skyTexGolden = () => ctex("lemparSkyGolden", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#86708c"); grad.addColorStop(0.3, "#b57d88"); grad.addColorStop(0.55, "#d3866e");
  grad.addColorStop(0.8, "#e29468"); grad.addColorStop(1, "#eaa26e");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,220,170,0.22)"); wg.addColorStop(1, "rgba(255,220,170,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,230,200" : "90,50,60"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 340);
  sn.addColorStop(0, "rgba(255,230,170,0.95)"); sn.addColorStop(0.12, "rgba(255,200,120,0.6)"); sn.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = sn; g.fillRect(60, 0, 720, 560);
  g.fillStyle = "#ffe9bb"; g.beginPath(); g.arc(420, 200, 42, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("lemparGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** The field sign: deep blue board, cream border, giant SAVONLINNA. */
const savonlinnaSignTex = () => ctex("lemparSign", 1024, 512, (g) => {
  g.fillStyle = "#1e4a8a"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#f4ead2"; g.lineWidth = 18; g.strokeRect(22, 22, 980, 468);
  g.strokeStyle = "rgba(244,234,210,0.55)"; g.lineWidth = 5; g.strokeRect(48, 48, 928, 416);
  g.fillStyle = "#f4ead2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.fillText("SAVONLINNA", 512, 215);
  g.font = "900 58px 'Arial Black', Arial, sans-serif";
  g.fillText("LEMpar HP • FINLANDIA", 512, 395);
});
/** grass field texture: layered greens, mowing bands,
 *  speckled anti-banding grain. */
const fieldTex = () => ctex("lemparField", 512, 512, (g, r) => {
  g.fillStyle = "#5da24a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12; i++) {
    const y = r() * 512;
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,60,0,0.08)";
    g.fillRect(0, y, 512, 14 + r() * 26);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "140,190,90" : "20,70,20"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512;
    g.fillStyle = "rgba(30,90,30,0.20)";
    g.beginPath(); g.ellipse(x, y, 8 + r() * 18, 6 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
  }
});
/** mown throwing lane: lighter green strip with mow lines. */
const laneTex = () => ctex("lemparLane", 512, 512, (g, r) => {
  g.fillStyle = "#79b657"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.5 ? "rgba(220,240,180,0.5)" : "rgba(60,110,40,0.35)";
    g.lineWidth = 2 + r() * 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 8); g.stroke();
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,230,160" : "40,90,30"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
/** wooden cabin facade: red-brown vertical planks + a small
 *  window, some lit gold, some dark — never a flat wall. */
const cabinTex = (seed: number) => ctex(`lemparCabin${seed}`, 512, 512, (g, r) => {
  const base = ["#8a4438", "#7a3c30", "#94504a", "#83463e"][seed % 4];
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  // vertical plank lines
  for (let x = 0; x < 512; x += 42) {
    g.fillStyle = "rgba(40,20,12,0.35)"; g.fillRect(x, 0, 3, 512);
    g.fillStyle = "rgba(255,235,200,0.10)"; g.fillRect(x + 3, 0, 2, 512);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,210" : "40,30,20"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.5, 2.5); }
  // ONE door + ONE small window only — v1's 4x4 window grid made
  // every hut read as an apartment block, not a garden hut.
  g.fillStyle = "#3a2418"; g.fillRect(216, 300, 80, 212);
  g.strokeStyle = "rgba(30,22,14,0.7)"; g.lineWidth = 4; g.strokeRect(216, 300, 80, 212);
  g.fillStyle = "#d9b45a"; g.beginPath(); g.arc(282, 410, 7, 0, 7); g.fill();
  const lit = r() > 0.4;
  g.fillStyle = lit ? "#ffd98a" : "#2e3a4e"; g.fillRect(360, 120, 84, 72);
  g.fillStyle = "rgba(20,16,10,0.55)";
  g.fillRect(360, 154, 84, 4); g.fillRect(400, 120, 4, 72);
  g.strokeStyle = "rgba(30,22,14,0.7)"; g.lineWidth = 3; g.strokeRect(360, 120, 84, 72);
  // a horizontal beam across the wall
  g.fillStyle = "rgba(40,26,12,0.4)"; g.fillRect(0, 240, 512, 10);
  // thatch strip along the top edge
  g.fillStyle = "#c9a86a";
  g.beginPath(); g.moveTo(0, 0);
  for (let x = 0; x <= 512; x += 32) g.lineTo(x, 10 + Math.sin(x * 0.05 + seed) * 8);
  g.lineTo(512, 0); g.closePath(); g.fill();
});
/** a single drifting pollen mote: tiny pale dot */
const pollenTex = () => ctex("lemparPollen", 64, 64, (g) => {
  g.fillStyle = "#fffbe8";
  g.beginPath(); g.ellipse(32, 32, 10, 6, -0.6, 0, 7); g.fill();
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.ellipse(30, 30, 6, 4, -0.6, 0, 7); g.fill();
});
/** soft white puff sprite: crowd dust + exhaust */
const puffTex = () => ctex("lemparPuff", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const blobTex = () => ctex("lemparBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(10,30,60,0.55)"); gr.addColorStop(0.6, "rgba(10,30,60,0.3)"); gr.addColorStop(1, "rgba(10,30,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** One wooden cabin: plank box + pitched roof. */
const makeCabin = (w: number, h: number, d: number, seed: number) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    lam2({ map: rep(cabinTex(seed), 1, Math.max(1, Math.round(h / 12))) }));
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // pitched roof: a 4-sided cone, squashed — dark shingle on top
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, h * 0.42, 4), lam2({ color: "#3a3a3a" }));
  roof.position.y = h + h * 0.21; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, d / w); roof.castShadow = true; g.add(roof);
  return g;
};
/** A pine tree: trunk + layered dark-green cones — the
 *  silhouette of a Nordic forest, never a round blob. */
const makePine = (seed = 1) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), lam2({ color: "#5d4028" }));
  trunk.position.y = 0.8; trunk.castShadow = true; g.add(trunk);
  const leafM = lam2({ color: "#1e4d2a" });
  const leafM2 = lam2({ color: "#276035" });
  const cones: [number, number, number][] = [[0, 2.4, 1.5], [0, 3.4, 1.15], [0, 4.3, 0.8]];
  cones.forEach(([x, y, r2], i) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r2, 1.8, 10), i % 2 ? leafM2 : leafM);
    c.position.set(x, y, 0); c.castShadow = true; g.add(c);
  });
  void seed;
  return g;
};
/** The main cabin: wide plank building + big SAVONLINNA sign
 *  board on posts facing the field. The sign is the field's
 *  landmark. */
const makeMainCabin = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 7),
    lam2({ map: rep(cabinTex(1), 1, 1) }));
  body.position.y = 3.25; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(8, 7) * 0.62, 2.8, 4), lam2({ color: "#3a3a3a" }));
  roof.position.y = 6.5 + 1.4; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 7 / 8); roof.castShadow = true; g.add(roof);
  // door facing the field (-X side)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 1.5), lam2({ color: "#3a2418" }));
  door.position.set(-4.05, 1.3, 0.5); g.add(door);
  // warm windows on the field face
  for (const wz of [-2.2, 2.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.4), lam2({ color: "#ffd98a" }));
    win.position.set(-4.05, 3.4, wz); g.add(win);
  }
  // the giant SAVONLINNA sign board on posts, angled toward the camera side
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3),
    new THREE.MeshBasicMaterial({ map: savonlinnaSignTex(), side: THREE.DoubleSide }));
  sign.position.set(-4.6, 3.4, 1.8); sign.rotation.y = -0.55; sign.castShadow = true; g.add(sign);
  for (const s of [1, -1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 6), lam2({ color: "#5d4028" }));
    post.position.set(-4.6 + s * 1.7, 1.7, 1.8 + s * 0.95); g.add(post);
  }
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c8d8ea", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private cloudDay: THREE.Texture[] = [];
  private cloudGold: THREE.Texture[] = [];
  private skyGolden = false;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private cloudBase: { x: number; sp: number }[] = [];
  private leaves: THREE.Sprite[] = [];
  private leafBase: { x: number; y: number; z: number; sp: number; ph: number }[] = [];
  private smokes: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1996);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#3a4a6a", 0.55);
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
      this.cloudDay.push(sp.material.map as THREE.Texture);
      this.cloudGold.push(cloudHD(300 + i * 37, CLOUD_GOLD));
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    // the sun's halo + core, upper left over the field
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // drifting pollen motes: tiny pale flecks over the field
    const leafM = new THREE.SpriteMaterial({ map: pollenTex(), transparent: true, depthWrite: false, opacity: 0.9 });
    for (let i = 0; i < 42; i++) {
      const sp = new THREE.Sprite(leafM.clone());
      const bx = -14 + r() * 28, by = 0.5 + r() * 13, bz = -26 + r() * 34;
      sp.position.set(bx, by, bz);
      const sc = 0.14 + r() * 0.22;
      sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
      R.add(sp); this.leaves.push(sp);
      this.leafBase.push({ x: bx, y: by, z: bz, sp: 0.7 + r() * 0.9, ph: r() * 6.28 });
    }
    this.buildField(R, r);
  }

  // ---------------- the Savonlinna throwing field ----------------
  private buildField(R: THREE.Group, r: () => number) {
    // the grass field itself: layered greens, speckled, endless
    const fieldMap = rep(fieldTex(), 30, 30);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
      lam2({ map: fieldMap, color: "#ffffff" }));
    field.rotation.x = -Math.PI / 2; field.position.set(0, 0, -80); field.receiveShadow = true; R.add(field);
    // the mown throwing lane down the middle
    const laneMap = rep(laneTex(), 1, 24);
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 220),
      lam2({ map: laneMap, color: "#ffffff" }));
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.01, -80); lane.receiveShadow = true; R.add(lane);
    // the white throwing line across the lane at z = -6
    const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 0.35),
      lam2({ color: "#f4f4f4" }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, -6); line.receiveShadow = true; R.add(line);
    // grass strips flanking the lane
    for (const s of [1, -1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 220), lam2({ color: "#6fae4e" }));
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(s * (ROAD_HALF + 1.1), 0.06, -80);
      strip.receiveShadow = true; R.add(strip);
    }
    // the lake far behind the field, blue and still
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(420, 90),
      lam2({ color: "#3d7fc4" }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(0, -0.05, -160); lake.receiveShadow = true; R.add(lake);
    // wooden cabins lining both sides (varied heights/widths)
    const blocks: [number, number, number, number, number][] = [
      // x, z, w, h, d — smaller + further out (tall windowed boxes
      // would line the field like a city street)
      [11.5, -20, 6, 5, 7], [11.5, -33, 6, 4.5, 7], [11.5, -46, 7, 6, 8],
      [-11.5, -12, 7, 5, 8], [-11.5, -25, 6, 4.5, 7], [-11.5, -38, 7, 6, 8], [-11.5, -52, 6, 4.5, 7],
      [12.5, 4, 7, 5, 8], [-12.5, 2, 7, 4.5, 8],
    ];
    blocks.forEach(([x, z, w, h, d], i) => {
      const b = makeCabin(w, h, d, i);
      b.position.set(x, 0, z);
      R.add(b);
    });
    // ---- THE MAIN CABIN with the SAVONLINNA sign (right side, the landmark) ----
    const cabin = makeMainCabin();
    cabin.position.set(SIGN_POS[0], 0, SIGN_POS[2]);
    R.add(cabin);
    blob(R, SIGN_POS[0], 0.05, SIGN_POS[2], 9, 8, 0.25);
    // ---- pine trees along both sides of the field ----
    const treeSpots: [number, number][] = [[6.5, -12], [-6.5, -30], [6.5, -40], [-6.5, -6], [8.5, -22], [-8.5, -18], [7.5, -55], [-7.5, -48]];
    treeSpots.forEach(([x, z], i) => {
      const tr = makePine(i + 1);
      tr.position.set(x, 0, z);
      R.add(tr);
    });
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
    // ---- sky dome + clouds: swap to the golden palette on golden shots ----
    this.skyDay.visible = true;
    const golden = s.light === "golden";
    if (golden !== this.skyGolden) {
      this.skyGolden = golden;
      (this.skyDay.material as THREE.MeshBasicMaterial).map = golden ? skyTexGolden() : skyTexDay();
      (this.skyDay.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.clouds.forEach((c2, i) => {
        (c2.material as THREE.SpriteMaterial).map = golden ? this.cloudGold[i] : this.cloudDay[i];
      });
    }
    for (const c2 of this.clouds) c2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // pollen drifts + falls over the field, looping
    for (let i = 0; i < this.leaves.length; i++) {
      const b = this.leafBase[i], sp = this.leaves[i];
      const fall = (b.y - tt * b.sp) % 13.5;
      sp.position.set(
        b.x + Math.sin(tt * 1.1 + b.ph) * 0.9,
        fall < 0.5 ? 13.5 + fall : fall,
        b.z + Math.cos(tt * 0.8 + b.ph) * 0.5,
      );
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
