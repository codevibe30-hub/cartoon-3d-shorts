// Dieng, Jawa Tengah as one three.js scene for the Fafnir-ID
// Anak Gimbal short: a cool, bright highland plateau ±2.000 m
// up — an emerald ceremonial field, a dirt path running north to
// the grey stone Arjuna temple cluster, village houses with tile
// roofs, terraced hills climbing east, the Sikidang crater
// steaming sulphur in the far east, a still lake west for the
// larung, and layers of mountain mist drifting through it all.
// VISUAL CORE: the gimbal kid stands on the field in the near
// foreground with the temples behind him; everything textured
// (anti-banding: grain + speckle on every surface). Layered
// light rig: sun key w/ soft shadows + hemisphere fill + rim —
// the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, grassHD, stoneHD, stone, roofHD, water, cobbleHD, planksHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, CANDI, LAKE, CRATER, clamp01 } from "./story";

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
  layer(s * 0.16, 0, "#aebadd");
  layer(s * 0.05, -s * 0.02, "#d7e2f5");
  layer(-s * 0.10, -s * 0.05, "#ffffff");
};
/** Highland sky: deep cool blue up top dissolving into the pale
 *  mist-white of the plateau horizon — Dieng sits IN the clouds. */
const skyTexDay = () => ctex("diengSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2a63b8"); grad.addColorStop(0.34, "#4d88d2"); grad.addColorStop(0.62, "#8fb4e2");
  grad.addColorStop(0.85, "#cfdfef"); grad.addColorStop(1, "#eef0e6");
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
/** soft radial glow sprite */
const glowTex = () => ctex("diengGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("diengBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a soft smoke / mist puff */
const smokeTex = () => ctex("diengSmoke", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(238,240,242,0.55)"); gr.addColorStop(0.6, "rgba(224,226,230,0.28)"); gr.addColorStop(1, "rgba(224,226,230,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** wide thin mist sheet for the valley layers */
const mistTex = () => ctex("diengMist", 512, 128, (g, r) => {
  g.clearRect(0, 0, 512, 128);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = 34 + r() * 60, w = 90 + r() * 190;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, `rgba(255,255,255,${0.10 + r() * 0.13})`); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.22); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
});
/** packed-earth path: warm brown, stone flecks, wheel ruts */
const dirtTex = () => ctex("diengDirt", 512, 512, (g, r) => {
  g.fillStyle = "#9a7a52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "214,186,140" : "110,84,54"},${0.08 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(${120 + r() * 60},${110 + r() * 40},${95 + r() * 30},0.5)`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 5, 0, 7); g.fill(); }
  g.fillStyle = "rgba(90,66,38,0.20)"; g.fillRect(120, 0, 44, 512); g.fillRect(348, 0, 44, 512);
});
/** sulphur crater ground: cracked ochre and pale yellow crust */
const sulphurTex = () => ctex("diengSulphur", 512, 512, (g, r) => {
  g.fillStyle = "#c8b083"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, rad = 26 + r() * 90;
    const wg = g.createRadialGradient(x, y, 2, x, y, rad);
    const c = r() < 0.45 ? "232,206,110" : r() < 0.7 ? "168,140,96" : "240,232,200";
    wg.addColorStop(0, `rgba(${c},0.5)`); wg.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = wg; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(96,74,44,0.5)"; g.lineWidth = 1.6;
  for (let i = 0; i < 42; i++) {
    let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A Dieng stone temple (candi): square body on a stepped base,
 *  a tiered pyramidal roof shrinking in steps — Arjuna cluster. */
const makeCandi = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(stoneHD(`diengCandi${seed}`, ["#b3aa99", "#a29a88", "#c0b8a6", "#948b78"], "#7a7263"), 2, 2), color: "#d9d2c2" });
  const darkM = lam2({ color: "#3c382f" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(h * 0.98, h * 0.16, h * 0.98), wallM);
  base.position.y = h * 0.08; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(h * 0.8, h * 0.13, h * 0.8), wallM);
  base2.position.y = h * 0.225; base2.castShadow = true; g.add(base2);
  const body = new THREE.Mesh(new THREE.BoxGeometry(h * 0.62, h * 0.34, h * 0.62), wallM);
  body.position.y = h * 0.46; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // the dark doorway, facing the field (+z)
  const door = new THREE.Mesh(new THREE.BoxGeometry(h * 0.2, h * 0.27, 0.06), darkM);
  door.position.set(0, h * 0.42, h * 0.32); g.add(door);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(h * 0.3, h * 0.07, 0.09), wallM);
  lintel.position.set(0, h * 0.585, h * 0.32); g.add(lintel);
  // tiered roof: four shrinking slabs + a finial
  let w = h * 0.72, y = h * 0.63;
  for (let i = 0; i < 4; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.085, w), wallM);
    slab.position.y = y; slab.castShadow = true; g.add(slab);
    y += h * 0.088; w *= 0.78;
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(h * 0.07, h * 0.14, 4), wallM);
  fin.position.y = y + h * 0.05; fin.rotation.y = Math.PI / 4; g.add(fin);
  return g;
};

/** A village house: plastered walls, window frames with flower
 *  boxes, a tile roof — lived-in, never a bare box. */
const makeHouse = (wallCol: string, w: number, d: number, wallH: number, roofH: number, seed = 1) => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(stone(`diengHouse${seed}`, [wallCol, wallCol, wallCol, wallCol]), 2, 1), color: "#ffffff" });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallM);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roofM = lam2({ map: rep(roofHD("#a34a32"), 2, 1), color: "#c46a4a" });
  const roofGeo = new THREE.CylinderGeometry(0.01, w * 0.78, roofH, 4, 1);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.y = wallH + roofH / 2 - 0.05; roof.castShadow = true; g.add(roof);
  const winM = lam2({ color: "#2c343c" });
  const frameM = lam2({ color: "#f2ede2" });
  for (const sx of [-1, 1]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.98, 0.06), frameM);
    fr.position.set(sx * w * 0.26, wallH * 0.55, d / 2 + 0.02); g.add(fr);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.84, 0.07), winM);
    win.position.set(sx * w * 0.26, wallH * 0.55, d / 2 + 0.03); g.add(win);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.22), lam2({ color: "#7a4a26" }));
    box.position.set(sx * w * 0.26, wallH * 0.55 - 0.6, d / 2 + 0.1); g.add(box);
    for (let i = 0; i < 3; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), lam2({ color: ["#d83a4a", "#e86a9a", "#e8c832"][i] }));
      fl.position.set(sx * w * 0.26 + (i - 1) * 0.24, wallH * 0.55 - 0.46, d / 2 + 0.12); g.add(fl);
    }
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.7, 0.07), lam2({ color: "#6a4423", map: rep(planksHD(), 1, 1) }));
  door.position.set(0, 0.85, d / 2 + 0.02); g.add(door);
  return g;
};

/** A mountain pine: textured trunk + three layered cone tiers,
 *  each tier jittered so the silhouette stays organic. */
const makePine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.03, h * 0.05, h * 0.34, 7),
    lam2({ color: "#6a4a2c", map: rep(planksHD(), 1, 2) }));
  trunk.position.y = h * 0.17; trunk.castShadow = true; g.add(trunk);
  const greens = ["#2e6b34", "#3d7f3e", "#4c9448"];
  const r = rng(seed * 31 + 7);
  for (let i = 0; i < 3; i++) {
    const rad = h * (0.30 - i * 0.075), y = h * (0.32 + i * 0.21), th = h * 0.30;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, th, 10), lam2({ color: greens[i % 3], map: rep(stone(`diengPine${seed}${i}`, ["#3d7f3e", "#2e6b34", "#4c9448", "#35753a"]), 3, 2) }));
    cone.position.set((r() - 0.5) * 0.2, y + th / 2, (r() - 0.5) * 0.2);
    cone.castShadow = true; g.add(cone);
  }
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c3d2e4", 18, 190);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private mists: { sp: THREE.Sprite; x0: number; drift: number }[] = [];
  private smokes: { sp: THREE.Sprite; off: number }[] = [];
  private pines: { g: THREE.Group; ph: number }[] = [];
  private flags: { m: THREE.Mesh; ph: number }[] = [];
  private lakeT: THREE.Texture | null = null;
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();
  private lastTt = 0;

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(70);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#7a8a6a", 0.55);
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
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, 350, 140],
      [-175, 108, 320, 115], [195, 116, 340, 120], [6, 70, -165, 66], [-128, 64, 155, 60],
      [102, 56, 135, 52], [248, 84, -250, 92],
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
    this.buildPlateau(R, r);
    this.buildTemples(R, r);
    this.buildVillage(R, r);
    this.buildTerraces(R, r);
    this.buildCrater(R, r);
    this.buildLake(R, r);
    this.buildMist(R, r);
  }

  // ---------------- ground: field + path + scattered life ----------------
  private buildPlateau(R: THREE.Group, r: () => number) {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), lam2({ map: rep(grassHD(), 60, 60), color: "#7fae56" }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.03, -30); grass.receiveShadow = true; R.add(grass);
    // the dirt path: village (south) to the temples (north)
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 92), lam2({ map: rep(dirtTex(), 1, 12), color: "#a8845c" }));
    path.rotation.x = -Math.PI / 2; path.position.set(-0.4, 0.005, -6); path.receiveShadow = true; R.add(path);
    // the ceremonial field before the temples: worn cobble apron
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), lam2({ map: rep(cobbleHD(), 6, 3), color: "#b8b2a4" }));
    apron.rotation.x = -Math.PI / 2; apron.position.set(0, 0.008, CANDI[2] + 6); apron.receiveShadow = true; R.add(apron);
    // scattered field stones
    const stoneM = lam2({ map: rep(stone("diengFieldStone", ["#8f8a80", "#7d786e", "#9c968b", "#6f6a60"]), 1, 1), color: "#a8a294" });
    for (let i = 0; i < 26; i++) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.16 + r() * 0.4, 8, 6), stoneM);
      const a = r() * Math.PI * 2, rad = 8 + r() * 46;
      st.position.set(Math.cos(a) * rad, 0.05, 4 + Math.sin(a) * rad * 0.8);
      st.scale.y = 0.55; st.castShadow = true; R.add(st);
    }
    // grass tufts (instanced, wind-bent in update)
    const tuftGeo = new THREE.SphereGeometry(0.21, 7, 5);
    const tuftMat = lam2({ color: "#5d9440" });
    const N = 240;
    this.tuftMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, N);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 90, z = 14 - r() * 90;
      let tx = x;
      if (Math.abs(tx + 0.4) < 3.2 && z < 16 && z > -50) tx += 6;      // off the path
      if (tx < -6 && z > -16) tx = -4 + r() * 3;                        // off the lake
      if (tx > 38 && z < -44) tx = 30;                                  // off the crater
      this.tuftData.push({ x: tx, z, s: 0.75 + r() * 0.45, yaw: r() * 3 });
    }
    R.add(this.tuftMesh);
    // pines ringing the field
    const pineSpots: [number, number, number][] = [
      [-16, -18, 7], [-19, 4, 8.5], [15, -24, 7.5], [18, -2, 6.5], [-14, -34, 9],
      [13, -38, 8], [22, 10, 7], [-23, -8, 6], [26, -30, 9], [-26, 12, 7.5],
    ];
    pineSpots.forEach(([x, z, h], i) => {
      const p = makePine(h, i + 3);
      p.position.set(x, 0, z); p.rotation.y = r() * 3;
      R.add(p); this.pines.push({ g: p, ph: i * 1.37 });
      blob(R, x, 0.012, z, h * 0.5, h * 0.5, 0.35);
    });
    // festival flag poles along the path (flags flutter in update)
    const flagCols = ["#d83a4a", "#e8c832", "#3b7dc2", "#3f9e4d", "#e86a9a"];
    for (let i = 0; i < 6; i++) {
      const z = 6 - i * 9, sx = i % 2 ? 5.5 : -5.8;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.6, 6), lam2({ color: "#8a6844" }));
      pole.position.set(sx, 1.8, z); pole.castShadow = true; R.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.62),
        new THREE.MeshLambertMaterial({ color: flagCols[i % 5], side: THREE.DoubleSide }));
      flag.geometry.translate(0.575, 0, 0);
      flag.position.set(sx, 3.28, z); R.add(flag);
      this.flags.push({ m: flag, ph: i * 0.9 });
    }
  }

  // ---------------- the Arjuna temple cluster ----------------
  private buildTemples(R: THREE.Group, r: () => number) {
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(30, 0.35, 18), lam2({ map: rep(stoneHD("diengPlaza", ["#b3aa99", "#a29a88", "#c0b8a6", "#948b78"], "#7a7263"), 6, 4), color: "#cfc8b8" }));
    plaza.position.set(0, 0.17, CANDI[2]); plaza.receiveShadow = true; plaza.castShadow = true; R.add(plaza);
    const main = makeCandi(7.2, 1); main.position.set(0, 0.35, CANDI[2] - 2); R.add(main);
    const left = makeCandi(5.4, 2); left.position.set(-8.5, 0.35, CANDI[2] + 1); left.rotation.y = 0.16; R.add(left);
    const right = makeCandi(5.9, 3); right.position.set(8.5, 0.35, CANDI[2]); right.rotation.y = -0.12; R.add(right);
    const back = makeCandi(4.6, 4); back.position.set(-3.5, 0.35, CANDI[2] - 9); back.rotation.y = 0.3; R.add(back);
    // low stone fence posts around the plaza
    const postM = lam2({ map: rep(stone("diengPost", ["#8f8a80", "#7d786e", "#9c968b", "#6f6a60"]), 1, 1), color: "#a8a294" });
    for (let i = 0; i < 9; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.32), postM);
      post.position.set(-13 + i * 3.25, 0.4, CANDI[2] + 9.5); post.castShadow = true; R.add(post);
    }
    void r;
  }

  // ---------------- village houses ----------------
  private buildVillage(R: THREE.Group, r: () => number) {
    const houses: [number, number, number, string, number][] = [
      [-13.5, 6, 0.5, "#e8dcc4", 1], [-14.5, -8, 0.35, "#d9c9a8", 2], [13, -14, -0.4, "#e2d4ba", 3],
      [-13, -22, 0.2, "#efe6d0", 4], [15.5, 2, -0.55, "#dccdb0", 5],
    ];
    houses.forEach(([x, z, yaw, col, seed]) => {
      const h = makeHouse(col, 5.6, 4.6, 2.7, 1.7, seed);
      h.position.set(x, 0, z); h.rotation.y = yaw + Math.PI / 2 * (x < 0 ? 1 : -1) * 0 + yaw;
      h.rotation.y = x < 0 ? Math.PI / 2 + yaw : -Math.PI / 2 + yaw;
      R.add(h);
      blob(R, x, 0.012, z, 6.4, 5.4, 0.35);
    });
    void r;
  }

  // ---------------- terraced hills (east) + far mountains ----------------
  private buildTerraces(R: THREE.Group, r: () => number) {
    const wallM = lam2({ map: rep(stone("diengTerraceWall", ["#7d786e", "#6f6a60", "#8f8a80", "#5f5a50"]), 6, 1), color: "#98928a" });
    const cropCols = ["#79b657", "#8fc46a", "#679e4c", "#a5cc7d"];
    for (let i = 0; i < 6; i++) {
      const w = 90 - i * 6, y = 1.1 + i * 1.55, z = -34 + i * 2;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 13), lam2({ map: rep(grassHD(), 14, 2), color: cropCols[i % 4] }));
      tread.position.set(52 + i * 3.5, y, z - i * 6); tread.receiveShadow = true; R.add(tread);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, 0.8), wallM);
      wall.position.set(52 + i * 3.5, y - 0.55, z - i * 6 + 6.8); R.add(wall);
      // crop rows: little green mounds on each tread
      for (let k = 0; k < 12; k++) {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.3, 7, 5), lam2({ color: cropCols[(i + 1) % 4] }));
        mound.position.set(52 + i * 3.5 - w / 2 + 4 + k * (w - 8) / 11, y + 0.32, z - i * 6 + (r() - 0.5) * 6);
        mound.scale.y = 0.6; R.add(mound);
      }
    }
    // far mountain silhouettes: broad cones + ridges, fog-hazed
    const farM = lam2({ color: "#7d94ac" });
    const farM2 = lam2({ color: "#8aa2ba" });
    const farCone = (h: number, rad: number, x: number, z: number, m: THREE.Material) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 14), m);
      cone.position.set(x, h / 2 - 0.5, z); R.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.3, h * 0.3, 14), lam2({ color: "#e8edf2" }));
      cap.position.set(x, h * 0.85 - 0.5, z); R.add(cap);
    };
    farCone(34, 60, -120, -300, farM);
    farCone(28, 48, 130, -320, farM2);
    farCone(40, 66, 10, -380, farM);
    const hillM = lam2({ color: "#7f9c72" });
    for (const [hx, hz, hs] of [[-150, -60, 40], [170, -30, 34], [-140, 60, 30], [150, 90, 28]] as [number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hs, 14, 10), hillM);
      hill.scale.y = 0.34; hill.position.set(hx, 0, hz); R.add(hill);
    }
  }

  // ---------------- the Sikidang crater (far east, steaming) ----------------
  private buildCrater(R: THREE.Group, r: () => number) {
    const [cx, , cz] = CRATER;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(17, 24), lam2({ map: rep(sulphurTex(), 5, 5), color: "#d8c096" }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(cx, 0.02, cz); ground.receiveShadow = true; R.add(ground);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(10.5, 1.6, 8, 22), lam2({ map: rep(sulphurTex(), 6, 2), color: "#bfae8a" }));
    rim.rotation.x = Math.PI / 2; rim.position.set(cx, 0.3, cz); rim.scale.z = 0.5; R.add(rim);
    const poolM = new THREE.MeshLambertMaterial({ color: "#cfd8b0", emissive: "#7a8a4a", emissiveIntensity: 0.35 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6.4, 22), poolM);
    pool.rotation.x = -Math.PI / 2; pool.position.set(cx, 0.09, cz); R.add(pool);
    // the steam plume: sprites that rise, swell and dissolve
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0 }));
      sp.position.set(cx, 3, cz); sp.layers.set(NOINK); R.add(sp);
      this.smokes.push({ sp, off: i / 5 });
    }
    void r;
  }

  // ---------------- the lake (west, for the larung) ----------------
  private buildLake(R: THREE.Group, r: () => number) {
    const [lx, , lz] = LAKE;
    this.lakeT = rep(water(), 10, 7);
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(46, 30), lam2({ map: this.lakeT, color: "#84b4d2" }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(lx, 0.02, lz); lake.receiveShadow = true; R.add(lake);
    // stony shore ring
    const shoreM = lam2({ map: rep(stone("diengShore", ["#8f8a80", "#7d786e", "#9c968b", "#6f6a60"]), 1, 1), color: "#a8a294" });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.3 + r() * 0.5, 8, 6), shoreM);
      st.position.set(lx + Math.cos(a) * 23.5, 0.08, lz + Math.sin(a) * 15.5);
      st.scale.y = 0.55; st.castShadow = true; R.add(st);
    }
    // a wooden jetty stub reaching into the water
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.22, 1.6), lam2({ map: rep(planksHD(), 2, 1), color: "#a8845c" }));
    jetty.position.set(lx + 20.5, 0.32, lz + 3.4); jetty.rotation.y = 0.5; jetty.castShadow = true; R.add(jetty);
    for (const [px, pz] of [[lx + 18.6, lz + 2.6], [lx + 22.4, lz + 4.2]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), lam2({ color: "#6a4a2c" }));
      post.position.set(px, 0.1, pz); R.add(post);
    }
  }

  // ---------------- valley mist layers ----------------
  private buildMist(R: THREE.Group, r: () => number) {
    const spots: [number, number, number, number][] = [
      [0, 6, -120, 300], [-40, 9, -180, 380], [30, 4.5, -70, 220], [0, 12, -240, 420], [-70, 5, -40, 180],
    ];
    spots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.75 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.16, 1); sp.layers.set(NOINK); R.add(sp);
      this.mists.push({ sp, x0: x, drift: 0.5 + (i % 3) * 0.3 });
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
    const dt = Math.max(0, tt - this.lastTt); this.lastTt = tt;
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
    void dt;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // valley mist slides slowly sideways, breathing in opacity
    this.mists.forEach((m2, i) => {
      m2.sp.position.x = m2.x0 + Math.sin(tt * 0.05 * m2.drift + i * 1.7) * 14;
      (m2.sp.material as THREE.SpriteMaterial).opacity = 0.6 + 0.18 * Math.sin(tt * 0.11 + i * 2.1);
    });
    // crater steam rises, swells and dissolves in a loop
    for (const sm of this.smokes) {
      const cyc = (tt * 0.07 + sm.off) % 1;
      sm.sp.position.set(CRATER[0] + cyc * 4.5, 2.5 + cyc * 8, CRATER[2]);
      const sc2 = 6 + cyc * 13;
      sm.sp.scale.set(sc2, sc2 * 0.72, 1);
      (sm.sp.material as THREE.SpriteMaterial).opacity = 0.34 * (1 - cyc) * Math.min(1, cyc * 6);
    }
    // lake water drifts (texture scroll, not a poster)
    if (this.lakeT) this.lakeT.offset.set(tt * 0.006, tt * 0.0025);
    // pines sway in the mountain wind
    for (const pn of this.pines) {
      pn.g.rotation.z = Math.sin(tt * 1.1 + pn.ph) * 0.011;
      pn.g.rotation.x = Math.cos(tt * 0.8 + pn.ph * 1.7) * 0.008;
    }
    // festival flags flutter
    for (const fl of this.flags) {
      fl.m.rotation.y = Math.sin(tt * 5.2 + fl.ph) * 0.38;
      fl.m.rotation.z = Math.sin(tt * 3.7 + fl.ph * 1.3) * 0.1;
    }
    // grass tufts bend with the same wind (phase travels the field)
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.05, p.z);
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
