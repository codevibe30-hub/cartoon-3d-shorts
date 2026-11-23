// Jigokudani, Nagano as one three.js scene for the Fafnir-ID
// short: a steaming turquoise onsen pool ringed with stones in a
// snowy valley, dark snow-capped pines, rocky cliffs at the back,
// the wooden Korakukan inn (snow roof, warm paper windows, its
// own wooden bath) far back-left — and snow falling over
// everything. VISUAL CORE: bright winter daylight, white snow +
// blue shadows, turquoise steaming water, red monkey faces.
// Layered light rig: sun key w/ soft shadows + hemisphere fill +
// rim — the house style. STANDAR GERAK: water scrolls, clouds
// drift, pines sway, snow falls, steam rises — nothing is a poster.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, water, planks, stone } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, POOL_C, POOL_WATER_Y, INN_C } from "./story";

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
    lobes.push([cx + (t - 0.5) * s * 1.7, cy + Math.sin(t * Math.PI) * -s * 0.22, s * (0.3 + r() * 0.22)]);
  }
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aab8d4"); // shaded belly
  layer(0, 0, "#d7e2f2");        // mid tone
  layer(-s * 0.14, -s * 0.08, "#ffffff"); // sunlit crown
};
const skyTexWinter = () => ctex("monyetSkyWinter", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#7fb2e0"); grad.addColorStop(0.45, "#a9cbe8"); grad.addColorStop(0.75, "#d8e8f6"); grad.addColorStop(1, "#f2f7fc");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // fine speckle so the gradient never bands
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`;
    g.fillRect(r() * 2048, r() * 1024, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.5)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w);
  }
  const clusters: [number, number, number][] = [
    [300, 300, 260], [760, 220, 320], [1240, 330, 280], [1680, 240, 340], [1980, 360, 240],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,220,0.95)"); sn.addColorStop(1, "rgba(255,250,220,0)");
  g.fillStyle = sn; g.fillRect(160, -60, 520, 520);
});
const glowTex = () => ctex("monyetGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,214,0.9)"); gr.addColorStop(0.5, "rgba(255,240,200,0.28)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Soft radial blob: steam puffs + snowflakes share it. */
const softTex = () => ctex("monyetSoft", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.6, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const snowTex = () => ctex("monyetSnow", 1024, 1024, (g, r) => {
  g.fillStyle = "#f4f7fb"; g.fillRect(0, 0, 1024, 1024);
  // blue-shadow drifts: big soft radial patches
  for (let i = 0; i < 26; i++) {
    const cx = 512 + (r() - 0.5) * 900, cy = 512 + (r() - 0.5) * 900, rad = 60 + r() * 480;
    const gr = g.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
    const c = r() < 0.5 ? "178,198,228" : "255,255,255";
    gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // sparkle speckle
  for (let i = 0; i < 5200; i++) {
    const x = r() * 1024, y = r() * 1024, dark = r() < 0.5;
    g.fillStyle = dark ? `rgba(170,190,220,${0.12 + r() * 0.25})` : `rgba(255,255,255,${0.25 + r() * 0.4})`;
    g.fillRect(x, y, 2 + r() * 2, 2 + r() * 2);
  }
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#1e4a24"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() < 0.5 ? `rgba(20,60,28,${0.2 + r() * 0.3})` : `rgba(90,140,70,${0.15 + r() * 0.3})`;
    g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
  }
});
const barkTex = () => ctex("monyetBark", 256, 256, (g, r) => {
  g.fillStyle = "#4a3226"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = `rgba(20,12,8,${0.25 + r() * 0.35})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
});
const blobTex = () => ctex("monyetBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(40,42,60,0.55)"); gr.addColorStop(1, "rgba(40,42,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  m.layers.set(NOINK); parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** A snow pine: dark-green cone layers, each capped with a
 *  flattened white snow cone + a snow blob on the crown — the
 *  layered, textured look the 23 Nov standard demands. */
const makeSnowPine = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 29);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#5a4030" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [folM("#1e4a24", "monyetPineDeep"), folM("#2c5c2e", "monyetPineMid"), folM("#4a7a3a", "monyetPineLite")];
  const snowM = lam2({ color: "#f6f9fd" });
  const layers = 4;
  for (let li = 0; li < layers; li++) {
    const y = h * (0.5 + li * 0.13), rad = h * (0.34 - li * 0.055);
    const disc = new THREE.Mesh(new THREE.ConeGeometry(rad, h * 0.3, 10), mats[Math.min(li, 2)]);
    disc.position.y = y; disc.castShadow = true; g.add(disc);
    // snow cap: a slightly wider, flatter white cone riding the layer
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.04, h * 0.12, 10), snowM);
    cap.position.y = y + h * 0.1; cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 3; i++) {
      const a = tr() * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.42, 10, 8), mats[li % 3]);
      b.position.set(Math.cos(a) * rad * 0.7, y + (tr() - 0.5) * 0.4, Math.sin(a) * rad * 0.7);
      b.scale.y = 0.7; b.castShadow = true; g.add(b);
    }
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(h * 0.09, 10, 8), snowM);
  crown.position.y = h * 1.02; crown.scale.y = 0.8; g.add(crown);
  return g;
};
/** A rocky cliff face: big faceted boulders with snow caps.
 *  (v2: v1 used the stone() texture on flat boxes — the block
 *  pattern read as a BRICK WALL at this scale. Faceted geometry
 *  + plain colour reads as mountain rock.) */
const makeCliff = (w: number, h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 977 + 7);
  const rockM = lam2({ color: "#8a8578" });
  const snowM = lam2({ color: "#f6f9fd" });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const rw = w * (0.24 + tr() * 0.14), rh = h * (0.45 + tr() * 0.35);
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockM);
    b.scale.set(rw, rh, w * 0.22);
    b.position.set((i - (n - 1) / 2) * w * 0.24 + (tr() - 0.5) * 2, rh * 0.42, (tr() - 0.5) * 2);
    b.rotation.set((tr() - 0.5) * 0.4, tr() * 3, (tr() - 0.5) * 0.4);
    b.castShadow = true; b.receiveShadow = true; g.add(b);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), snowM);
    cap.scale.set(rw * 0.95, rh * 0.28, w * 0.2);
    cap.position.set(b.position.x, b.position.y + rh * 0.72, b.position.z);
    g.add(cap);
  }
  return g;
};
/** The Korakukan inn: dark wood + warm paper windows + a heavy
 *  snow-covered roof, veranda facing the pool. */
const makeInn = () => {
  const g = new THREE.Group();
  const woodM = lam2({ map: rep(planks(), 2, 1), color: "#7a5a3c" });
  const beamM = lam2({ color: "#2c1e14" });
  const snowM = lam2({ color: "#f6f9fd" });
  const paperM = new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 5), woodM);
  body.position.y = 1.8; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // veranda deck + posts
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.25, 1.6), beamM);
  deck.position.set(0, 0.35, 3.1); deck.receiveShadow = true; g.add(deck);
  for (const x of [-3.9, -1.3, 1.3, 3.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), beamM);
    post.position.set(x, 1.9, 3.8); post.castShadow = true; g.add(post);
  }
  // warm paper windows on the front
  for (const x of [-2.6, 0, 2.6]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 0.08), paperM);
    win.position.set(x, 2.1, 2.55); g.add(win);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.8, 0.05), beamM);
    fr.position.set(x, 2.1, 2.5); g.add(fr);
  }
  // snow roof: two slopes + a thick snow blanket on top
  for (const s of [1, -1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 3.6), lam2({ map: rep(planks(), 2, 1), color: "#4a3626" }));
    slope.position.set(0, 4.6, s * 1.5); slope.rotation.x = s * 0.5; slope.castShadow = true; g.add(slope);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.35, 3.7), snowM);
    blanket.position.set(0, 4.95, s * 1.5); blanket.rotation.x = s * 0.5; blanket.castShadow = true; g.add(blanket);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 9.4, 8), snowM);
  ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 5.6, 0); g.add(ridge);
  return g;
};
/** The inn's wooden bath: a round cedar tub, water steaming. */
const makeBath = () => {
  const g = new THREE.Group();
  const woodM = lam2({ map: rep(planks(), 2, 1), color: "#8a6a44" });
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.2, 1.0, 14, 1, true), woodM);
  tub.position.y = 0.5; tub.castShadow = true; tub.receiveShadow = true; g.add(tub);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.09, 8, 16), woodM);
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.0; g.add(rim);
  const wMap = water(); wMap.repeat.set(1, 1);
  const w = new THREE.Mesh(new THREE.CircleGeometry(1.28, 16),
    new THREE.MeshLambertMaterial({ map: wMap, color: "#8fd0c8" }));
  w.rotation.x = -Math.PI / 2; w.position.y = 0.85; g.add(w);
  return g;
};
/** A grey boulder with a snow cap, for the pool surround. */
const makeRock = (s: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 3);
  const rockM = lam2({ map: rep(stone("monyetRockB"), 1, 1), color: "#8a8578" });
  const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
  b.position.y = s * 0.55; b.rotation.set(tr() * 0.6, tr() * 3, tr() * 0.6);
  b.scale.y = 0.7; b.castShadow = true; b.receiveShadow = true; g.add(b);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(s * 0.85, 10, 8), lam2({ color: "#f6f9fd" }));
  cap.position.y = s * 1.05; cap.scale.y = 0.35; g.add(cap);
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c4d8ec", 20, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private pondMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private steams: THREE.Sprite[] = [];
  private steamBase: { x: number; y: number; z: number; ph: number; sc: number }[] = [];
  private snow: THREE.Points | null = null;
  private snowBase: Float32Array | null = null;
  private snowFall: Float32Array | null = null;
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2403);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + sun glow + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexWinter(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false }));
    glow.position.set(-160, 120, -320); glow.scale.set(220, 220, 1); glow.layers.set(NOINK); R.add(glow);
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(11 + i * 7), transparent: true, depthWrite: false, fog: false }));
      const x = -220 + i * 72 + r() * 30, y = 62 + r() * 42, z = -260 + r() * 110;
      c.position.set(x, y, z);
      const sc = 90 + r() * 90; c.scale.set(sc, sc * 0.42, 1);
      c.layers.set(NOINK);
      this.clouds.push(c); this.cloudBase.push({ x, sp: 0.5 + r() * 0.9 });
      R.add(c);
    }
    // ---- snow ground: white with blue-shadow drifts ----
    const snowM = lam2({ map: rep(snowTex(), 8, 8) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), snowM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -15);
    ground.receiveShadow = true; R.add(ground);
    // snow drifts: low flattened white mounds at the valley edges
    const driftM = lam2({ color: "#f8fbff" });
    for (const [dx, dz, ds] of [[-14, 6, 6], [15, 4, 7], [-18, -22, 8], [17, -20, 6.5], [-8, 18, 5], [10, 16, 6], [20, -34, 9], [-22, -32, 8]] as const) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(ds, 12, 8), driftM);
      d.position.set(dx, -0.4, dz); d.scale.set(1, 0.22, 0.7);
      d.receiveShadow = true; R.add(d);
    }
    // ---- the onsen pool: turquoise water + stone rim ----
    const pondMap = water();
    pondMap.repeat.set(2, 1);
    this.pondMap = pondMap;
    const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(4.5, 28),
      new THREE.MeshLambertMaterial({ map: pondMap, color: "#8fd0c8" }));
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(POOL_C[0], POOL_WATER_Y, POOL_C[2]);
    waterMesh.scale.set(1, 0.78, 1); waterMesh.receiveShadow = true; R.add(waterMesh);
    // basin wall under the water line
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.55, 4.55, 0.55, 28, 1, true),
      lam2({ map: rep(stone("monyetBasin"), 3, 1), color: "#7a7264", side: THREE.BackSide }));
    basin.position.set(POOL_C[0], 0.2, POOL_C[2]); basin.scale.set(1, 1, 0.78); R.add(basin);
    // rim stones around the ellipse
    const rimM = lam2({ map: rep(stone("monyetRim"), 1, 1), color: "#9a9284" });
    const snowCapM = lam2({ color: "#f6f9fd" });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const rx = 4.7, rz = 3.7;
      const x = POOL_C[0] + Math.cos(a) * rx, z = POOL_C[2] + Math.sin(a) * rz;
      const s = 0.42 + r() * 0.25;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rimM);
      st.position.set(x, 0.42 + r() * 0.08, z);
      st.rotation.set(r() * 0.8, r() * 3, r() * 0.8); st.scale.y = 0.7;
      st.castShadow = true; st.receiveShadow = true; R.add(st);
      if (r() < 0.7) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(s * 0.8, 8, 6), snowCapM);
        cap.position.set(x, 0.42 + s * 0.55, z); cap.scale.y = 0.3; R.add(cap);
      }
    }
    // ---- boulders around the pool ----
    for (const [bx, bz, bs, bseed] of [[-6.5, -6.5, 1.1, 5], [6.8, -6.2, 0.9, 7], [-7.2, -13.5, 1.3, 9], [7.4, -14, 1.0, 11], [-5.8, -16.5, 0.8, 13], [5.6, -16.8, 1.2, 15]] as const) {
      const rock = makeRock(bs, bseed);
      rock.position.set(bx, 0, bz); rock.rotation.y = r() * Math.PI * 2;
      R.add(rock);
    }
    // ---- the Korakukan inn + its wooden bath ----
    const inn = makeInn();
    inn.position.set(INN_C[0], INN_C[1], INN_C[2]);
    inn.rotation.y = 0.35;
    R.add(inn);
    const bath = makeBath();
    bath.position.set(-11, 0, -16);
    R.add(bath);
    // ---- snow pines ringing the valley ----
    const pineSpots: [number, number, number, number][] = [
      [-12, -24, 9, 3], [12, -26, 8.5, 5], [-16, -30, 10, 7], [16, -32, 9, 9],
      [-20, -12, 8, 11], [20, -14, 8.5, 13], [-10, -38, 11, 15], [10, -40, 10, 17],
      [-24, -30, 9, 19], [24, -28, 10, 21], [-18, 4, 7.5, 23], [18, 2, 8, 25],
      [-8, -44, 12, 27], [8, -46, 11, 29], [0, -50, 13, 31],
    ];
    for (const [mx, mz, mh, ms] of pineSpots) {
      const t = makeSnowPine(mh, ms);
      t.position.set(mx, 0, mz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
      blob(R, mx, 0.06, mz, mh * 1.15, mh * 1.15, 0.55);
    }
    // ---- cliffs at the back of the valley ----
    for (const [cx, cz, cw, ch, cs] of [[-22, -48, 26, 16, 41], [0, -56, 30, 20, 43], [22, -48, 26, 16, 47]] as const) {
      const cliff = makeCliff(cw, ch, cs);
      cliff.position.set(cx, 0, cz);
      R.add(cliff);
    }
    // ---- steam sprites over the pool + the inn bath ----
    const steamTex = softTex();
    const steamSpots: [number, number, number, number][] = [
      [-2.4, 0.6, -9.2, 1.6], [0.2, 0.6, -10.4, 1.9], [2.6, 0.6, -9.0, 1.5],
      [-1.2, 0.6, -11.5, 1.7], [1.6, 0.6, -11.8, 1.4], [-11, 1.0, -16, 1.3],
    ];
    for (const [sx, sy, sz, ss] of steamSpots) {
      const mat = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.3, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.position.set(sx, sy, sz); sp.scale.set(ss, ss, 1); sp.layers.set(NOINK);
      this.steams.push(sp); this.steamBase.push({ x: sx, y: sy, z: sz, ph: r() * 6, sc: ss });
      R.add(sp);
    }
    // ---- snowfall: 700 flakes in a box over the valley ----
    const N = 700;
    const pos = new Float32Array(N * 3);
    const base = new Float32Array(N * 3);
    const fall = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      base[i * 3] = (r() - 0.5) * 70;
      base[i * 3 + 1] = r() * 25;
      base[i * 3 + 2] = -10 + (r() - 0.5) * 70;
      fall[i] = 0.8 + r() * 1.2;
    }
    pos.set(base);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const snow = new THREE.Points(geo, new THREE.PointsMaterial({
      map: softTex(), size: 0.22, transparent: true, opacity: 0.9, depthWrite: false, color: "#ffffff",
    }));
    snow.layers.set(NOINK);
    this.snow = snow; this.snowBase = base; this.snowFall = fall;
    R.add(snow);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

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
    this.sunCache.set(id, v);
    return v;
  }

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
    // pool water flows gently (texture scroll, not a poster)
    if (this.pondMap) this.pondMap.offset.set(tt * 0.02, tt * 0.055);
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // snow pines sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // steam rises off the hot water, growing and fading
    this.steams.forEach((sp, i) => {
      const b = this.steamBase[i];
      const ph = (tt * 0.12 + b.ph * 0.13) % 1;
      sp.position.set(b.x + Math.sin(tt * 0.5 + b.ph) * 0.25, b.y + ph * 1.4, b.z);
      const sc2 = b.sc * (1 + ph * 1.4);
      sp.scale.set(sc2, sc2, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.4 * (1 - ph) * Math.min(1, ph / 0.08);
    });
    // snow falls and drifts, wrapping deterministically with time
    if (this.snow && this.snowBase && this.snowFall) {
      const attr = this.snow.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const N = this.snowFall.length;
      for (let i = 0; i < N; i++) {
        const y0 = this.snowBase[i * 3 + 1];
        let y = y0 - tt * this.snowFall[i];
        y = ((y % 25) + 25) % 25;
        arr[i * 3] = this.snowBase[i * 3] + Math.sin(tt * 0.5 + i * 1.7) * 0.9;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = this.snowBase[i * 3 + 2];
      }
      attr.needsUpdate = true;
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
