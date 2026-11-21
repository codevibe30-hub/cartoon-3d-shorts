// The cast of the Pulau Ular short as lit flat sprites in the 3D island
// world: the hero narrator (on the boat — he never lands), a navy officer
// on the patrol boat, and a lone researcher in the clearing. The snakes
// themselves are 3D in world.ts. Birds are canvas fx (perched + flying).
// Same pool + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact blobs.
// Fact cards float as ink-outlined boards via drawCardFit (auto-fit: text
// NEVER overflows the board).
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, STRIKE_T, TURN_T, BOAT_POS, BRANCH_PT, BIRD_PT, ROCK_PT, terrainY, clamp01 } from "./story";
import type { LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; pitch?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- life: blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, scale = 1, pitch = 0): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const light = light2D(cam, false), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed };
  const key = `F|${who.okey}|${fkey(f2)}|${q(pitch, 24)}`;
  return { key, x, y, z, scale, pitch, draw: (p) => bodyFront(p, who.o, f2), size: [w, h, k] };
};

// ---------------- gear overlays (same 600x1000 design space) ----------------
/** binoculars raised to the hero's eyes (shots 1-2: watching the island). */
const drawBinoculars = (p: Pen) => {
  p.line([[252, 330], [214, 300]], "#2c2620", 8);
  p.line([[348, 330], [386, 300]], "#2c2620", 8);
  p.poly([[238, 292], [292, 292], [292, 344], [238, 344]], "#2e3138");
  p.poly([[308, 292], [362, 292], [362, 344], [308, 344]], "#2e3138");
  p.dot(265, 300, 9, "#7db4d8"); p.dot(335, 300, 9, "#7db4d8");
};
/** the researcher's snake hook, held low in front (shot 9). */
const drawHook = (p: Pen) => {
  p.line([[392, 560], [452, 838]], "#3a3f45", 9);
  p.arc(452, 862, 26, 24, 180, 270, 9, "#3a3f45");
};
type Gear = { binoculars?: boolean; hook?: boolean };
const geared = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, gear: Gear, scale = 1): Place => {
  const base = person(cam, who, x, y, z, fo, scale);
  const gk = `${gear.binoculars ? "B" : ""}${gear.hook ? "H" : ""}`;
  return {
    ...base, key: `${base.key}|G${gk}`,
    draw: (p) => {
      base.draw(p);
      if (gear.binoculars) drawBinoculars(p);
      if (gear.hook) drawHook(p);
    },
  };
};

// ---------------- contact blobs ----------------
import { fxShadow, fxContact } from "./toon";
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], storm: [0.2, 0.21, 0.33], night: [0.13, 0.16, 0.3] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME !== "golden") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- fact cards (auto-fit: text NEVER overflows the board) ----------------
const fitFont = (lines: string[], maxFs: number, g: CanvasRenderingContext2D) => {
  let fs = maxFs;
  for (const ln of lines) {
    g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
    const w = g.measureText(ln).width;
    if (w > 452) fs = Math.floor(fs * (452 / w));
  }
  return fs;
};
export const drawCardFit = (lines: string[], bg: string, fg: string, maxFs = 120) => (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(10, 10, 492, 236, 26);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const fs = fitFont(lines, maxFs, g);
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  if (lines.length === 1) g.fillText(lines[0], 256, 132);
  else { g.fillText(lines[0], 256, 82); g.fillText(lines[1], 256, 182); }
};
/** the myth card: the viral claim, struck through with a big red X. */
const drawMythCard = (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(10, 10, 492, 236, 26);
  g.fillStyle = "#7a1f1f"; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 74px 'Arial Black', Arial, sans-serif";
  g.fillText("1 ULAR", 256, 82);
  g.fillText("PER m²?", 256, 182);
  g.strokeStyle = "#ff3b30"; g.lineWidth = 26; g.lineCap = "round";
  g.beginPath(); g.moveTo(48, 40); g.lineTo(464, 216); g.stroke();
  g.beginPath(); g.moveTo(464, 40); g.lineTo(48, 216); g.stroke();
};

// ---------------- birds (the lancehead's prey) ----------------
/** a perched migrant bird, side-on, in a 400x300 design space. */
const drawBirdPerched = (p: Pen) => {
  p.ell(200, 168, 74, 46, "#7a4a28");                       // body
  p.ell(168, 150, 40, 26, "#96622f");                        // wing shading
  p.dot(262, 128, 30, "#7a4a28");                            // head
  p.poly([[288, 122], [322, 130], [288, 140]], "#2c2620");  // beak
  p.dot(268, 122, 5, "#14100a");                             // eye
  p.poly([[128, 158], [76, 128], [88, 178]], "#5d3a1e");    // tail
  p.line([[188, 210], [188, 238]], "#3a2c1a", 6);           // legs
  p.line([[214, 210], [214, 238]], "#3a2c1a", 6);
};
/** a flying bird, wings at flap phase u (0..1), 400x300 space. */
const drawBirdFlying = (u: number) => (p: Pen) => {
  const lift = Math.sin(u * Math.PI * 2) * 52;
  p.poly([[200, 150], [110, 108 - lift], [96, 128 - lift], [186, 168]], "#6b4423"); // far wing
  p.ell(200, 158, 62, 30, "#7a4a28");
  p.poly([[200, 150], [292, 104 - lift], [306, 126 - lift], [216, 170]], "#8a5a2c"); // near wing
  p.dot(252, 140, 24, "#7a4a28");
  p.poly([[274, 134], [302, 142], [274, 148]], "#2c2620");
  p.dot(256, 134, 4, "#14100a");
  p.poly([[140, 150], [100, 132], [106, 168]], "#5d3a1e");
};

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "ularHero" };
// OFFICER: navy patrol — dark blue uniform + cap.
const OFFICER: Who = { i: 61, o: { jacket: "#274268", pants: "#22304a", boots: "#1c1c1c", hat: "cap", cap: "#1d3557" }, okey: "ularOfficer" };
// RESEARCHER: khaki field kit, dark cap, snake hook, camera strap colours.
const RESEARCHER: Who = { i: 81, o: { jacket: "#8a7d4f", pants: "#5d5644", boots: "#4a3826", hat: "cap", cap: "#5d5136" }, okey: "ularResearcher" };

// Zone anchors (must match world.ts + story.ts): boat (4, 0, 100) deck
// y≈0.95; patrol deck y≈1.3 at z=70; clearing: hero tree branch BRANCH_PT,
// bird perch BIRD_PT, snake rock ROCK_PT.

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra });
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  const birdFx = (key: string, draw: (p: Pen) => void, x: number, y: number, z: number, w: number) =>
    out.fx.push({ key, cw: 400, ch: 300, draw, x, y, z, w, h: w * 0.75 });

  if (id === 1) {
    // HOOK: the hero on his boat, binoculars up, island ahead + the claim
    // card in the first 2 seconds (algorithm rule: specific claim on screen)
    out.places.push(geared(cam, HERO, BOAT_POS[0] + 0.4, 0.95, BOAT_POS[2] + 0.6, { mode: "stand", expr: "grin", blink: lidAt(t, 41), look: 0 }, { binoculars: true }));
    cardFx("cardHook", drawCardFit(["DILARANG MASUK!", "RIBUAN ULAR BERBISA"], "#7a1f1f", "#ffffff", 84), 0.15, 2.3, 4.9, 9.5, 60, 9, 4.5);
  }
  if (id === 2) {
    // 33 KM: the hero lowers the binoculars, nervous; the officer watches
    // from the patrol boat crossing behind him
    out.places.push(stand(HERO, BOAT_POS[0] + 0.4, 0.95, BOAT_POS[2] + 0.6, "nervous", 0.2));
    const dur = (L[2] - L[1]) / FPS;
    const u = Math.max(0, Math.min(1, (tt - L[1] / FPS) / dur));
    const px = -58 + u * 116;
    out.places.push(stand(OFFICER, px, 1.32, 57.2, "stern", 0));
    cardFx("card33", drawCardFit(["33 KM"], "#1d4ed8", "#ffffff", 120), L[1] / FPS + 0.4, 2.6, 16.9, 6.6, 60.2, 2.8, 1.4);
  }
  if (id === 3) {
    // GOLDEN LANCEHEAD: the snake alone on its branch + a perched bird;
    // the hero is NOT here — nobody lands
    birdFx("birdPerched", drawBirdPerched, BIRD_PT[0], BIRD_PT[1], BIRD_PT[2], 0.85);
    cardFx("cardGolden", drawCardFit(["GOLDEN", "LANCEHEAD"], "#8a6d1f", "#ffffff", 96), L[2] / FPS + 0.4, 2.6, 21.9, BRANCH_PT[1] + 2.1, 22, 2.3, 1.15);
  }
  if (id === 4) {
    // THE STRIKE: the bird sits until STRIKE_T, then feathers + escape
    if (tt < STRIKE_T) {
      birdFx("birdPerched", drawBirdPerched, BIRD_PT[0], BIRD_PT[1], BIRD_PT[2], 0.85);
    } else if (tt < STRIKE_T + 0.9) {
      const u = (tt - STRIKE_T) / 0.9;
      birdFx(`birdFly${q(u, 16)}`, drawBirdFlying(q((tt * 6) % 1, 12)),
        BIRD_PT[0] + u * 2.6, BIRD_PT[1] + u * 1.8, BIRD_PT[2] - u * 1.2, 0.85);
      burstFx(STRIKE_T, 0.55, BIRD_PT[0], BIRD_PT[1] + 0.2, BIRD_PT[2], 1.5);
    }
    cardFx("card5x", drawCardFit(["5× LEBIH KUAT"], "#7a1f1f", "#ffffff", 96), L[3] / FPS + 0.3, 1.9, 23.25, BRANCH_PT[1] - 1.1, 21.1, 2.0, 1.0);
  }
  if (id === 5) {
    // MITOS (aerial): the viral claim, crossed out
    cardFx("cardMitos", drawMythCard, L[4] / FPS + 0.4, 3.2, 2.9, 50, 27.8, 16, 8);
  }
  if (id === 6) {
    // FAKTA: the real total for the whole island — a permitted researcher
    // counts from a safe distance beside the rock snake
    const ry = terrainY(Math.hypot(18.6, 25.6));
    out.places.push(geared(cam, RESEARCHER, 18.6, ry, 25.6, { mode: "stand", expr: "neutral", blink: lidAt(t, 81), look: 0.3 }, { hook: true }));
    blob(out, 18.6, ry, 25.6);
    cardFx("cardTotal", drawCardFit(["2.000–4.000", "EKOR SE-PULAU"], "#1e5c38", "#ffffff", 92), L[5] / FPS + 0.4, 2.8, 19.7, ROCK_PT[1] + 2.75, 23.9, 3.4, 1.7);
  }
  if (id === 7) {
    // 11.000 TAHUN: the strait between island and mainland
    cardFx("card11000", drawCardFit(["11.000 TAHUN"], "#2e5f8a", "#ffffff", 110), L[6] / FPS + 0.4, 2.8, -5.3, 34, 88.8, 7, 3.5);
  }
  if (id === 8) {
    // LEGENDA: dusk at the lighthouse — framed as legend, not fact
    cardFx("cardLegenda", drawCardFit(["LEGENDA?"], "#5c3a6e", "#ffd98a", 120), L[7] / FPS + 0.4, 2.8, 6.8, 30.6, 7.7, 2.8, 1.4);
  }
  if (id === 9) {
    // HAMPIR PUNAH: the researcher photographs from a safe distance
    const ry = terrainY(Math.hypot(18.6, 25.6));
    out.places.push(geared(cam, RESEARCHER, 18.6, ry, 25.6, { mode: "stand", expr: "neutral", blink: lidAt(t, 81), look: 0.3 }, { hook: true }));
    blob(out, 18.6, ry, 25.6);
    cardFx("cardPunah", drawCardFit(["HAMPIR PUNAH"], "#7a4a1f", "#ffffff", 100), L[8] / FPS + 0.4, 2.8, 19.4, ROCK_PT[1] + 2.35, 24.4, 2.2, 1.1);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again — the hero waves goodbye as the boat turns
    const a = L[9] / FPS, dur = (L[10] - L[9]) / FPS;
    // the hero rides the boat as it turns away (mirrors world.ts boat anim)
    const tu = Math.max(0, Math.min(1, (tt - TURN_T) / 2.4)), te = tu * tu * (3 - 2 * tu), th = -0.55 * te;
    const hx = BOAT_POS[0] + 0.9 * te + (0.4 * Math.cos(th) + 0.6 * Math.sin(th));
    const hz = BOAT_POS[2] + 0.7 * te + (-0.4 * Math.sin(th) + 0.6 * Math.cos(th));
    if (tt >= a + dur * 0.4) {
      out.places.push(person(cam, HERO, hx, 0.95, hz, { mode: "stand", expr: "laugh", blink: lidAt(t, 41), look: 0, wave: 1 }));
    } else {
      out.places.push(geared(cam, HERO, hx, 0.95, hz, { mode: "stand", expr: "grin", blink: lidAt(t, 41), look: 0 }, { binoculars: true }));
    }
  }
  return out;
};
export { FPS };
