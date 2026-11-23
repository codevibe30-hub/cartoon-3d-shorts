// Bengkulu rainforest clearing as one three.js scene for the
// Fafnir-ID short: a GIANT brick-red Rafflesia arnoldii (white
// spots, central cup) blooming on the leaf litter at the centre
// of a jungle clearing, a second smaller flower back-left, the
// Tetrastigma host vine climbing a big tree at the right-back
// with a bud at its base, jungle trees ringing the clearing,
// ferns, boulders, a fallen log, flies orbiting the flower and
// leaves falling through the light. VISUAL CORE: bright tropical
// daylight, deep jungle green + brick red, sun rays through the
// canopy. Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim — the house style. STANDAR GERAK: clouds drift,
// trees sway, the flower breathes, flies orbit, leaves fall,
// the bud grows in shot 7, the flower wilts in shot 8 — nothing
// is a poster. NOTE (Monyet lesson): no semi-transparent surface
// anywhere near text — the flower, water and glass are all opaque.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, FLOWER_C, FLOWER2_C, VINE_SPOT, BUD_SPOT, HERO_SPOT } from "./story";

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
const skyTexTropis = () => ctex("raffSkyTropis", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#5f9fe0"); grad.addColorStop(0.45, "#8fc3e8"); grad.addColorStop(0.75, "#cfe8f6"); grad.addColorStop(1, "#f2f7e8");
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
const glowTex = () => ctex("raffGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,214,0.9)"); gr.addColorStop(0.5, "rgba(255,240,200,0.28)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Soft radial blob: pollen sparkles + falling leaves share it. */
const softTex = () => ctex("raffSoft", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.6, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Leaf-litter floor: dark jungle green-brown with fallen-leaf
 *  speckles in ochre, rust and lime — never a flat plane. */
const leafLitterTex = () => ctex("raffLitter", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a5a2c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) {
    const cx = 512 + (r() - 0.5) * 900, cy = 512 + (r() - 0.5) * 900, rad = 40 + r() * 140;
    const gr = g.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
    const c = r() < 0.5 ? "46,64,32" : "84,74,42";
    gr.addColorStop(0, `rgba(${c},0.18)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  const leafCols = ["#5a6a2e", "#7a6a3a", "#8a5a2e", "#4a5a1e", "#6a5a2e"];
  for (let i = 0; i < 3500; i++) {
    const x = r() * 1024, y = r() * 1024;
    g.fillStyle = leafCols[Math.floor(r() * leafCols.length)];
    g.globalAlpha = 0.12 + r() * 0.2;
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI);
    g.fillRect(-2 - r() * 3, -1.5, 4 + r() * 5, 2 + r() * 2);
    g.restore();
  }
  g.globalAlpha = 1;
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#2c5c2e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() < 0.5 ? `rgba(20,60,28,${0.2 + r() * 0.3})` : `rgba(90,140,70,${0.15 + r() * 0.3})`;
    g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
  }
});
const barkTex = () => ctex("raffBark", 256, 256, (g, r) => {
  g.fillStyle = "#5a4030"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = `rgba(20,12,8,${0.25 + r() * 0.35})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
});
const blobTex = () => ctex("raffBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(28,40,20,0.4)"); gr.addColorStop(1, "rgba(28,40,20,0)");
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
/** A jungle tree: tall trunk + 3 layered canopy tiers of
 *  textured green blobs, each tier a different green — the
 *  layered, textured look the 23 Nov standard demands. */
const makeJungleTree = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 29);
  const trunkM = twoTone(new THREE.MeshLambertMaterial({ map: rep(barkTex(), 1, 2), color: "#7a5a40" }), 0.2);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, h * 0.62, 8), trunkM);
  trunk.position.y = h * 0.31; trunk.castShadow = true; g.add(trunk);
  // liftK 0.3 on foliage: the day preset's blue-tilted shade lift
  // turns shaded green NAVY at liftK 1 (shot-2 still, v1) — a low
  // lift keeps shaded leaves GREEN, not teal.
  const folM = (col: string, key: string) => twoTone(new THREE.MeshLambertMaterial({ color: col, map: rep(foliageTex(key), 1, 1) }), 0.3);
  const mats = [folM("#2c5c2e", "raffTreeDeep"), folM("#3f7a35", "raffTreeMid"), folM("#5a9a45", "raffTreeLite")];
  const tiers = 3;
  for (let li = 0; li < tiers; li++) {
    const y = h * (0.58 + li * 0.14), rad = h * (0.3 - li * 0.05);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + tr() * 0.8;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad * (0.5 + tr() * 0.25), 10, 8), mats[(li + i) % 3]);
      b.position.set(Math.cos(a) * rad * 0.45, y + (tr() - 0.5) * 0.5, Math.sin(a) * rad * 0.45);
      b.scale.y = 0.62; b.castShadow = true; g.add(b);
    }
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.55, 10, 8), mats[li % 3]);
    crown.position.y = y + rad * 0.3; crown.scale.y = 0.6; crown.castShadow = true; g.add(crown);
  }
  // hanging vines: thin cylinders draping from the canopy
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2;
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h * 0.25, 5), lam2({ color: "#4a5a22" }));
    vine.position.set(Math.cos(a) * h * 0.14, h * 0.55, Math.sin(a) * h * 0.14);
    g.add(vine);
  }
  return g;
};
/** A fern: flattened green cones arranged radially, low to the ground. */
const makeFern = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 3);
  const m1 = lam2({ color: "#3a7a3a" });
  const m2 = lam2({ color: "#4a8a3a" });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.3;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 6), i % 2 ? m1 : m2);
    frond.position.set(Math.cos(a) * 0.22, 0.28, Math.sin(a) * 0.22);
    frond.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    frond.scale.set(1, 1, 0.4);
    frond.castShadow = true; g.add(frond);
  }
  return g;
};
/** A grey boulder with a moss cap, for the clearing edge. */
const makeRock = (s: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 3);
  const rockM = lam2({ color: "#7a7264" });
  const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
  b.position.y = s * 0.55; b.rotation.set(tr() * 0.6, tr() * 3, tr() * 0.6);
  b.scale.y = 0.7; b.castShadow = true; b.receiveShadow = true; g.add(b);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 10, 8), lam2({ color: "#4a7a2e" }));
  cap.position.y = s * 0.95; cap.scale.y = 0.22; g.add(cap);
  return g;
};
/** A fallen log, mossy on top. */
const makeLog = () => {
  const g = new THREE.Group();
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.6, 10), twoTone(new THREE.MeshLambertMaterial({ map: rep(barkTex(), 2, 1), color: "#6a4a30" }), 0.2));
  log.rotation.z = Math.PI / 2; log.position.y = 0.26; log.castShadow = true; log.receiveShadow = true; g.add(log);
  // moss: a thin green slab riding the log's top (v1's moss cylinder
  // was smaller than the log and hid inside it)
  const moss = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.34), twoTone(new THREE.MeshLambertMaterial({ color: "#4a6a2e" }), 0.3));
  moss.position.y = 0.5; g.add(moss);
  return g;
};
/** THE FLOWER: Rafflesia arnoldii — 5 thick brick-red petals
 *  (flattened spheres, white warts on top), a raised diaphragm
 *  ring (torus), an orange-red central disk with small pale
 *  processes, a dark cup opening. ~1.1 m across at scale 1.
 *  Returns the group + the petal pivots and petal material so
 *  update() can breathe, and wilt in shot 8. */
type FlowerParts = { group: THREE.Group; petals: { pivot: THREE.Group; mat: THREE.MeshLambertMaterial }[]; baseTilt: number };
const makeRafflesia = (seed = 1): FlowerParts => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 5);
  const petalBase = new THREE.Color("#c23a1e");
  const petals: FlowerParts["petals"] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + (seed % 2 ? 0.3 : -0.2);
    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    // liftK 0.15: the day preset's shade lift is blue-tilted —
    // at liftK 1 a shaded red petal goes MAUVE (shot-3 still).
    // A low lift keeps shaded petals RED, not violet.
    const mat = twoTone(new THREE.MeshLambertMaterial({ color: petalBase.clone().offsetHSL(0, 0, (tr() - 0.5) * 0.06) }), 0.15);
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), mat);
    petal.scale.set(0.62, 0.16, 1.0);
    petal.position.set(0, 0.24, 0.22);
    petal.rotation.x = -0.38;
    petal.castShadow = true; petal.receiveShadow = true;
    // white warts: small pale flattened blobs riding the petal top
    const wartM = lam2({ color: "#f2e8d8" });
    for (let w = 0; w < 6; w++) {
      const wart = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), wartM);
      wart.position.set((tr() - 0.5) * 0.32, 0.3, (tr() - 0.5) * 0.5);
      wart.scale.set(1, 0.35, 1);
      petal.add(wart);
    }
    pivot.add(petal);
    g.add(pivot);
    petals.push({ pivot, mat });
  }
  // diaphragm ring: a raised torus around the cup
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 10, 20), lam2({ color: "#8a2a1a" }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; ring.castShadow = true; g.add(ring);
  // central disk + pale processes + dark cup opening
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 16), lam2({ color: "#c0562f" }));
  disk.position.y = 0.28; g.add(disk);
  const procM = lam2({ color: "#d8c49a" });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), procM);
    cone.position.set(Math.cos(a) * 0.09, 0.34, Math.sin(a) * 0.09);
    g.add(cone);
  }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), lam2({ color: "#2a1208" }));
  cup.position.y = 0.31; g.add(cup);
  return { group: g, petals, baseTilt: -0.38 };
};
/** The Tetrastigma host vine: a thick green-brown tube snaking
 *  from the leaf litter up the big tree at VINE_SPOT. */
const makeVine = () => {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 0.05, 0.6),
    new THREE.Vector3(-0.2, 0.5, 0.2),
    new THREE.Vector3(0.1, 1.4, -0.1),
    new THREE.Vector3(0.0, 2.6, 0.1),
    new THREE.Vector3(0.3, 3.8, -0.3),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.09, 8), twoTone(new THREE.MeshLambertMaterial({ color: "#3a5a28" }), 0.3));
  tube.castShadow = true; g.add(tube);
  // a few vine leaves along the tube
  const leafM = lam2({ color: "#3a6a2a" });
  for (const [lx, ly, lz] of [[-0.3, 1.0, 0.3], [0.15, 2.0, -0.2], [-0.1, 3.0, 0.1]] as const) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), leafM);
    leaf.position.set(lx, ly, lz); leaf.scale.set(1.6, 0.25, 0.9);
    leaf.rotation.y = lx; g.add(leaf);
  }
  return g;
};
/** The bud at the vine base: a cabbage-like green-brown sphere
 *  with scale bumps — grows in shot 7. */
const makeBud = () => {
  const g = new THREE.Group();
  const m = lam2({ color: "#5a3a28" });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), m);
  core.scale.y = 0.9; core.castShadow = true; g.add(core);
  const bumpM = lam2({ color: "#3a2418" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), bumpM);
    bump.position.set(Math.cos(a) * 0.12, (i % 2 ? 0.06 : -0.04), Math.sin(a) * 0.12);
    bump.scale.y = 0.6; g.add(bump);
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
  private fog = new THREE.Fog("#c4d8ec", 20, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private flower: FlowerParts;
  private flower2: FlowerParts;
  private bud: THREE.Group;
  private flies: { m: THREE.Mesh; r: number; h: number; sp: number; ph: number }[] = [];
  private pollenFly: THREE.Mesh;
  private leaves: THREE.Points | null = null;
  private leavesBase: Float32Array | null = null;
  private leavesFall: Float32Array | null = null;
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
      new THREE.MeshBasicMaterial({ map: skyTexTropis(), side: THREE.BackSide, fog: false }));
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
    // ---- leaf-litter ground ----
    const groundM = lam2({ map: rep(leafLitterTex(), 7, 7) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundM);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -15);
    ground.receiveShadow = true; R.add(ground);
    // ---- THE GIANT FLOWER at the clearing centre ----
    this.flower = makeRafflesia(1);
    this.flower.group.position.set(FLOWER_C[0], FLOWER_C[1], FLOWER_C[2]);
    R.add(this.flower.group);
    blob(R, FLOWER_C[0], 0.06, FLOWER_C[2], 1.4, 1.4, 0.22);
    // ---- the second flower (pollination partner) back-left ----
    this.flower2 = makeRafflesia(2);
    this.flower2.group.position.set(FLOWER2_C[0], FLOWER2_C[1], FLOWER2_C[2]);
    this.flower2.group.scale.setScalar(0.7);
    this.flower2.group.rotation.y = 1.2;
    R.add(this.flower2.group);
    blob(R, FLOWER2_C[0], 0.06, FLOWER2_C[2], 1.8, 1.8, 0.4);
    // ---- the host tree + Tetrastigma vine + bud ----
    const hostTree = makeJungleTree(12, 41);
    hostTree.position.set(VINE_SPOT[0], VINE_SPOT[1], VINE_SPOT[2]);
    this.trees.push({ g: hostTree, ph: r() * 6 });
    R.add(hostTree);
    blob(R, VINE_SPOT[0], 0.06, VINE_SPOT[2], 3.2, 3.2, 0.4);
    const vine = makeVine();
    vine.position.set(VINE_SPOT[0] - 0.3, 0, VINE_SPOT[2] + 0.4);
    R.add(vine);
    this.bud = makeBud();
    this.bud.position.set(BUD_SPOT[0], 0.16, BUD_SPOT[2]);
    this.bud.scale.setScalar(0.001); // hidden until shot 6
    R.add(this.bud);
    // ---- jungle trees ringing the clearing ----
    const treeSpots: [number, number, number, number][] = [
      [-12, -24, 9, 3], [12, -26, 8.5, 5], [-16, -30, 10, 7], [16, -32, 9, 9],
      [-20, -12, 8, 11], [20, -14, 8.5, 13], [-10, -38, 11, 15], [10, -40, 10, 17],
      [-24, -30, 9, 19], [24, -28, 10, 21], [-18, 4, 7.5, 23], [18, 2, 8, 25],
      [-8, -44, 12, 27], [8, -46, 11, 29], [0, -50, 13, 31],
    ];
    for (const [mx, mz, mh, ms] of treeSpots) {
      const t = makeJungleTree(mh, ms);
      t.position.set(mx, 0, mz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
      blob(R, mx, 0.06, mz, mh * 1.15, mh * 1.15, 0.4);
    }
    // ---- ferns, rocks, fallen log ----
    for (const [fx, fz, fs] of [[-3, -7, 5], [4, -6, 7], [-6, -12, 9], [6.5, -15, 11], [-2, -16, 13], [2.5, 2.5, 15], [-4, 0, 17]] as const) {
      const fern = makeFern(fs);
      fern.position.set(fx, 0, fz);
      fern.rotation.y = r() * Math.PI * 2;
      R.add(fern);
    }
    for (const [bx, bz, bs, bseed] of [[-6.5, -6.5, 1.1, 5], [6.8, -6.2, 0.9, 7], [-9.5, -15.5, 1.3, 9], [7.4, -14, 1.0, 11], [-5.8, -16.5, 0.8, 13], [5.6, -16.8, 1.2, 15]] as const) {
      const rock = makeRock(bs, bseed);
      rock.position.set(bx, 0, bz); rock.rotation.y = r() * Math.PI * 2;
      R.add(rock);
    }
    const log = makeLog();
    log.position.set(-5.0, 0, -8.0); log.rotation.y = 0.4;
    R.add(log);
    // ---- flies orbiting the giant flower (they ARE the story) ----
    // Small (r 0.02) and unlit black: at close range a toon-shaded
    // fly renders as a big blue ball (shot-3 still, v1).
    const flyM = new THREE.MeshBasicMaterial({ color: "#1a1a1a" });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), flyM);
      m.scale.set(1.2, 1, 1);
      this.flies.push({ m, r: 0.45 + r() * 0.25, h: 0.35 + r() * 0.2, sp: 1.6 + r() * 1.2, ph: r() * 6 });
      R.add(m);
    }
    // the pollen fly: flies flower 1 -> flower 2 in shot 5 only
    this.pollenFly = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), flyM);
    this.pollenFly.scale.set(1.2, 1, 1);
    this.pollenFly.visible = false;
    R.add(this.pollenFly);
    // ---- falling leaves: 140 leaves drifting down over the clearing ----
    const N = 140;
    const pos = new Float32Array(N * 3);
    const base = new Float32Array(N * 3);
    const fall = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      base[i * 3] = (r() - 0.5) * 50;
      base[i * 3 + 1] = r() * 18;
      base[i * 3 + 2] = -10 + (r() - 0.5) * 50;
      fall[i] = 0.5 + r() * 0.8;
    }
    pos.set(base);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const leaves = new THREE.Points(geo, new THREE.PointsMaterial({
      map: softTex(), size: 0.18, transparent: true, opacity: 0.85, depthWrite: false, color: "#c8a83a",
    }));
    leaves.layers.set(NOINK);
    this.leaves = leaves; this.leavesBase = base; this.leavesFall = fall;
    R.add(leaves);
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
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // jungle trees sway in the breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // the giant flower BREATHES: petals rise and fall almost imperceptibly
    const breathe = Math.sin(tt * 0.9) * 0.03;
    for (const p of this.flower.petals) {
      const mesh = p.pivot.children[0] as THREE.Mesh;
      mesh.rotation.x = -0.38 + breathe;
    }
    // flies orbit the flower — the smell is the story
    for (const fl of this.flies) {
      const a = tt * fl.sp + fl.ph;
      fl.m.position.set(
        FLOWER_C[0] + Math.cos(a) * fl.r,
        fl.h + Math.sin(tt * 2.2 + fl.ph) * 0.12,
        FLOWER_C[2] + Math.sin(a) * fl.r * 0.8,
      );
    }
    // shot 5: the pollen fly carries pollen flower 1 -> flower 2 (arc, with a pollen dust puff)
    const U = (f - s.a) / Math.max(1, s.b - s.a);
    if (id === 5) {
      this.pollenFly.visible = true;
      const x = FLOWER_C[0] + (FLOWER2_C[0] - FLOWER_C[0]) * U;
      const z = FLOWER_C[2] + (FLOWER2_C[2] - FLOWER_C[2]) * U;
      const y = 0.6 + Math.sin(U * Math.PI) * 1.2;
      this.pollenFly.position.set(x, y, z);
    } else {
      this.pollenFly.visible = false;
    }
    // shot 6: the bud is a small knob at the vine base; shot 7: it GROWS (time-lapse)
    if (id === 6) this.bud.scale.setScalar(0.45);
    else if (id === 7) this.bud.scale.setScalar(0.35 + U * 0.85);
    else this.bud.scale.setScalar(0.001);
    // shot 8: THE WILT — petals droop and blacken (snaps back at shot 9 behind the crossfade)
    const wilt = id === 8 ? Math.min(1, U * 1.4) : 0;
    const wiltCol = new THREE.Color("#2e2018");
    for (const p of this.flower.petals) {
      const mesh = p.pivot.children[0] as THREE.Mesh;
      mesh.rotation.x = -0.38 + breathe - wilt * 0.55;
      mesh.scale.y = 0.16 - wilt * 0.06;
      p.mat.color.lerpColors(new THREE.Color("#c23a1e"), wiltCol, wilt);
    }
    // leaves fall and drift, wrapping deterministically with time
    if (this.leaves && this.leavesBase && this.leavesFall) {
      const attr = this.leaves.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const N = this.leavesFall.length;
      for (let i = 0; i < N; i++) {
        const y0 = this.leavesBase[i * 3 + 1];
        let y = y0 - tt * this.leavesFall[i];
        y = ((y % 18) + 18) % 18;
        arr[i * 3] = this.leavesBase[i * 3] + Math.sin(tt * 0.5 + i * 1.7) * 0.9;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = this.leavesBase[i * 3 + 2];
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
