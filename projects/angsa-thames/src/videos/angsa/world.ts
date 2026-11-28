// The River Thames as one three.js scene for the Fafnir-ID
// cover frame: the Swan Upping — a blue-green river, grassy
// banks, willows lining both sides, Windsor Castle far behind,
// a big RIVER THAMES sign. The hero prop is the GIANT crowned
// white swan (a billboard in cast.ts), smaller swans gliding,
// petals drifting. VISUAL CORE: bright English daylight, river
// + castle against layered willows, textured everything
// (anti-banding: speckled sky, flecked banks). Layered light
// rig: sun key w/ soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, RIVER_HALF, BANK_R, BANK_L, HERO_SPOT, SIGN_POS, CASTLE_POS } from "./story";

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
const skyTexDay = () => ctex("angsaSkyDay", 2048, 1024, (g, r) => {
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
const skyTexGolden = () => ctex("angsaSkyGolden", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("angsaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** The river sign: deep blue board, cream border, giant THAMES. */
const thamesSignTex = () => ctex("angsaSign", 1024, 512, (g) => {
  g.fillStyle = "#1e4a8a"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#f4ead2"; g.lineWidth = 18; g.strokeRect(22, 22, 980, 468);
  g.strokeStyle = "rgba(244,234,210,0.55)"; g.lineWidth = 5; g.strokeRect(48, 48, 928, 416);
  g.fillStyle = "#f4ead2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.fillText("RIVER", 512, 180);
  g.fillText("THAMES", 512, 350);
});
/** river water texture: blue-green with current streaks and
 *  ripple flecks — the map scrolls slowly so the river moves. */
const riverTex = () => ctex("angsaRiver", 512, 512, (g, r) => {
  g.fillStyle = "#3d7fa8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    const y = r() * 512;
    g.strokeStyle = r() > 0.5 ? "rgba(220,240,250,0.28)" : "rgba(20,70,100,0.25)";
    g.lineWidth = 2 + r() * 4; g.lineCap = "round";
    const x = r() * 512, l = 40 + r() * 120;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 6); g.stroke();
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,235,250" : "15,60,90"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 40; i++) {
    const x = r() * 512, y = r() * 512;
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 10 + r() * 22, 4 + r() * 5, 0, 0, 7); g.stroke();
  }
});
/** grassy bank texture: layered greens, speckled, mowing bands. */
const bankTex = () => ctex("angsaBank", 512, 512, (g, r) => {
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
/** stone wall texture for Windsor Castle: warm grey blocks. */
const stoneTex = () => ctex("angsaStone", 512, 512, (g, r) => {
  g.fillStyle = "#b8ab8e"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 42) {
    const off = (y / 42) % 2 ? 40 : 0;
    for (let x = -40; x < 512; x += 80) {
      g.fillStyle = `rgba(${120 + r() * 40},${105 + r() * 35},${80 + r() * 25},0.35)`;
      g.fillRect(x + off + 2, y + 2, 76, 38);
    }
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "240,230,200" : "80,70,55"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.5, 2.5); }
});
/** a single drifting petal: tiny pale dot */
const petalTex = () => ctex("angsaPetal", 64, 64, (g) => {
  g.fillStyle = "#fffbe8";
  g.beginPath(); g.ellipse(32, 32, 10, 6, -0.6, 0, 7); g.fill();
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.ellipse(30, 30, 6, 4, -0.6, 0, 7); g.fill();
});
const blobTex = () => ctex("angsaBlob", 256, 256, (g) => {
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

/** A willow tree: trunk + drooping foliage blobs — the
 *  silhouette of an English riverbank, never a round blob. */
const makeWillow = (seed = 1) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.2, 8), lam2({ color: "#5d4028" }));
  trunk.position.y = 1.1; trunk.castShadow = true; g.add(trunk);
  const leafM = lam2({ color: "#3a6b2e" });
  const leafM2 = lam2({ color: "#4a7d3a" });
  // drooping crown: overlapping spheres hanging low
  const blobs: [number, number, number, number][] = [
    [0, 3.4, 0, 1.5], [0.9, 2.9, 0.3, 1.1], [-0.9, 2.9, -0.3, 1.1],
    [0.5, 2.2, 0.6, 0.8], [-0.5, 2.2, -0.6, 0.8], [0, 4.2, 0, 1.0],
  ];
  blobs.forEach(([x, y, z, r2], i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r2, 10, 8), i % 2 ? leafM2 : leafM);
    b.position.set(x, y, z); b.scale.set(1, 1.25, 1); b.castShadow = true; g.add(b);
  });
  void seed;
  return g;
};
/** Windsor Castle: stone keep + two round towers with cone
 *  roofs + battlements + a red flag on the tallest tower. */
const makeCastle = () => {
  const g = new THREE.Group();
  const stone = lam2({ map: rep(stoneTex(), 2, 1) });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 10), stone);
  keep.position.y = 4.5; keep.castShadow = true; keep.receiveShadow = true; g.add(keep);
  // battlements along the keep top
  for (let i = 0; i < 7; i++) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.6), stone);
    merlon.position.set(-7 + i * 2.3, 9.6, 5); g.add(merlon);
  }
  // two round towers with cone roofs
  for (const s of [1, -1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 12, 12), stone);
    tower.position.set(s * 10.5, 6, 0); tower.castShadow = true; g.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 12), lam2({ color: "#3a4a5a" }));
    roof.position.set(s * 10.5, 13.7, 0); roof.castShadow = true; g.add(roof);
  }
  // warm windows on the keep face
  for (const wx of [-5, -2.5, 0, 2.5, 5]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.12), lam2({ color: "#ffd98a" }));
    win.position.set(wx, 5.5, 5.05); g.add(win);
  }
  // red flag on the tallest tower
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), lam2({ color: "#5d4028" }));
  pole.position.set(10.5, 17, 0); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ color: "#b02030", side: THREE.DoubleSide }));
  flag.position.set(11.6, 17.8, 0); g.add(flag);
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
  private waterMat: THREE.MeshLambertMaterial | null = null;

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
    // the sun's halo + core, upper left over the river
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // drifting petals: tiny pale flecks over the river
    const leafM = new THREE.SpriteMaterial({ map: petalTex(), transparent: true, depthWrite: false, opacity: 0.9 });
    for (let i = 0; i < 42; i++) {
      const sp = new THREE.Sprite(leafM.clone());
      const bx = -14 + r() * 28, by = 0.5 + r() * 13, bz = -26 + r() * 34;
      sp.position.set(bx, by, bz);
      const sc = 0.14 + r() * 0.22;
      sp.scale.set(sc, sc, 1); sp.layers.set(NOINK);
      R.add(sp); this.leaves.push(sp);
      this.leafBase.push({ x: bx, y: by, z: bz, sp: 0.7 + r() * 0.9, ph: r() * 6.28 });
    }
    this.buildThames(R, r);
  }

  // ---------------- the River Thames ----------------
  private buildThames(R: THREE.Group, r: () => number) {
    // the river itself: blue-green water, scrolling texture
    const riverMap = rep(riverTex(), 2, 24);
    riverMap.wrapS = THREE.RepeatWrapping; riverMap.wrapT = THREE.RepeatWrapping;
    this.waterMat = lam2({ map: riverMap, color: "#ffffff" });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_HALF * 2, 260), this.waterMat);
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0, -80); river.receiveShadow = true; R.add(river);
    // grassy banks on both sides, slightly raised
    const bankMap = rep(bankTex(), 4, 24);
    for (const s of [1, -1]) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(14, 260), lam2({ map: bankMap, color: "#ffffff" }));
      bank.rotation.x = -Math.PI / 2;
      bank.position.set(s * (RIVER_HALF + 7), 0.12, -80);
      bank.receiveShadow = true; R.add(bank);
      // stone edging where bank meets water
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 260), lam2({ color: "#8a8578" }));
      edge.position.set(s * (RIVER_HALF + 0.2), 0.1, -80); R.add(edge);
    }
    // ---- WINDSOR CASTLE far behind the river ----
    const castle = makeCastle();
    castle.position.set(CASTLE_POS[0], 0, CASTLE_POS[2]);
    R.add(castle);
    blob(R, CASTLE_POS[0], 0.05, CASTLE_POS[2], 30, 16, 0.25);
    // ---- the RIVER THAMES sign board on the right bank ----
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3),
      new THREE.MeshBasicMaterial({ map: thamesSignTex(), side: THREE.DoubleSide }));
    sign.position.set(SIGN_POS[0] - 0.6, 3.4, SIGN_POS[2]); sign.rotation.y = -0.55; sign.castShadow = true; R.add(sign);
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 6), lam2({ color: "#5d4028" }));
      post.position.set(SIGN_POS[0] - 0.6 + s * 1.7, 1.7, SIGN_POS[2] + s * 0.95); R.add(post);
    }
    blob(R, SIGN_POS[0], 0.05, SIGN_POS[2], 9, 8, 0.25);
    // ---- willows along both banks ----
    const treeSpots: [number, number][] = [[7.5, -12], [-7.5, -30], [8.5, -40], [-7.5, -6], [9.5, -22], [-9.5, -18], [8.5, -55], [-8.5, -48]];
    treeSpots.forEach(([x, z], i) => {
      const tr = makeWillow(i + 1);
      tr.position.set(x, 0.12, z);
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
    // the river current scrolls downstream
    if (this.waterMat?.map) this.waterMat.map.offset.y = (tt * 0.008) % 1;
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // petals drift + fall over the river, looping
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
