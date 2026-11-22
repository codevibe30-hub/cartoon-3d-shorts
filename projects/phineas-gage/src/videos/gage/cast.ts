// The cast of "Pria Ini Kepalanya Ditembus Besi 1 Meter Dan
// Tetap Hidup🤫" as DASIMAN-STYLE stickman sprites: round WHITE
// heads, thin black limbs, one coloured torso each (stick.ts).
// The hero is PHINEAS GAGE himself — he narrates in first
// person: a work shirt and the mascot's RED TIE. Same pool +
// sprite machinery as episodes 1-6: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft
// contact blobs. TONE: respectful — the accident is never a
// joke and never gore; pain here is quiet.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, DRILL, BENCH_Y, ROD_LAND } from "./story";
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
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; dir?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
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

// ---------------- contact blobs ----------------
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

type Who = { i: number; o: StickOutfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, so: StickOpts, scale = 1, tilt: { pitch?: number; roll?: number } = {}): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const key = `S|${who.okey}|${fkey(so)}|${tilt.pitch ?? 0}|${tilt.roll ?? 0}`;
  return { key, x, y, z, scale, draw: (p) => stick(p, who.o, so), size: [w, h, k], pitch: tilt.pitch, roll: tilt.roll };
};

// PHINEAS GAGE, 25: railroad foreman — a blue-grey work shirt,
// a belt, and the mascot's RED TIE (he is our hero-narrator).
const GAGE: Who = { i: 41, o: { torso: "#5a6b7d", tie: "#c0272d", belt: "#3a3128" }, okey: "gage" };
// GAGE AFTER: the same man, head wrapped in bandages, one cheek
// patched — the bandage outfit draws the crown wrap + cheek pad.
const GAGE_BAND: Who = { i: 42, o: { torso: "#5a6b7d", tie: "#c0272d", belt: "#3a3128", bandage: true }, okey: "gageBand" };
// GAGE IN CHILE: calmer years — a warmer shirt, no tie, a hat.
const GAGE_CHILE: Who = { i: 43, o: { torso: "#7d6a4f", belt: "#3a3128", hat: "#6e5136" }, okey: "gageChile" };
// DR JOHN MARTYN HARLOW: the young country doctor — dark coat,
// doctor's bag (the suitcase prop), a grave kind face.
const HARLOW: Who = { i: 51, o: { torso: "#33383e", belt: "#22242a" }, okey: "harlow" };
// THE OWNER of the railroad company: a black suit, no tie.
const BOSS: Who = { i: 52, o: { torso: "#26262b", belt: "#17171b" }, okey: "boss" };
// The railroad crew: working men in caps and earth colours.
const CREW_A: Who = { i: 61, o: { torso: "#6e5136", cap: "#4a3b26", belt: "#33291e" }, okey: "crewA" };
const CREW_B: Who = { i: 62, o: { torso: "#54655e", cap: "#37423c", belt: "#3a453f" }, okey: "crewB" };
const CREW_C: Who = { i: 63, o: { torso: "#74604a", cap: "#4f4230", belt: "#33291e" }, okey: "crewC" };
// Family at the Vermont house: a woman in a brown dress + bun.
const FAMILY: Who = { i: 64, o: { torso: "#6d5468", bun: "#33241c" }, okey: "family" };
// A neighbour on the village road.
const NEIGHBOUR: Who = { i: 65, o: { torso: "#4f4438", hat: "#54432c", belt: "#33291e" }, okey: "neighbour" };
// A museum visitor, much later: quiet grey.
const VISITOR: Who = { i: 66, o: { torso: "#5d6468", belt: "#3c4043" }, okey: "visitor" };
// A stagecoach passenger in Chile.
const PASSENGER: Who = { i: 67, o: { torso: "#74584f", bun: "#2e2118" }, okey: "passenger" };

// ---------------- fx draws ----------------
// blast dust: warm tan puffs that billow and settle (never fire,
// never blood — the accident is dust and light)
const drawDust = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  g.globalAlpha = a * 0.55;
  for (let i = 0; i < 8; i++) {
    const x = 256 + (hh(seed + i, 5) - 0.5) * 230, y = 320 - i * 26 - hh(seed + i, 6) * 30, r = 46 + hh(seed + i, 7) * 54 + i * 10;
    const gr = g.createRadialGradient(x, y, 4, x, y, r);
    gr.addColorStop(0, "rgba(216,196,164,0.9)"); gr.addColorStop(1, "rgba(216,196,164,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
// a soft warm glow (the sickroom lamp, museum warmth)
const drawGlow = (warm: string) => (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 254);
  gr.addColorStop(0, "rgba(255,252,244,0.95)");
  gr.addColorStop(0.35, warm);
  gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const S0 = (i: number) => L[i] / FPS;
  const u = clamp01((t - S0(id - 1)) / Math.max(0.01, S0(id) - S0(id - 1))); // shot-local progress
  void tt;
  const stand = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, tilt: { pitch?: number; roll?: number } = {}) =>
    out.places.push(person(cam, who, x, y, z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale, tilt));
  const walk = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, rate = 1.85) =>
    out.places.push(person(cam, who, x, y, z, { pose: "walk", phase: q((t * rate + who.i * 0.37) % 1, 30), expr, blink: lidAt(t, who.i), ...extra }, scale));
  const sit = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "sit", expr, blink: lidAt(t, who.i), ...extra }, scale));
  const kneel = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "kneel", expr, blink: lidAt(t, who.i), ...extra }, scale));
  const B = (who: Who, x: number, y: number, z: number, sc = 1) => blob(out, x, y, z, sc);
  void B;
  const dust = (x: number, y: number, z: number, strength: number, seed: number) => {
    for (let k = 0; k < 3; k++) {
      const ph = (u * 1.4 * strength + k / 3) % 1;
      out.fx.push({
        key: `dust${seed + k}|${q(ph, 18)}`, cw: 512, ch: 512, draw: drawDust(seed * 7 + k * 3 + 1, (1 - ph) * 0.9),
        x: x + ph * 1.2 - 0.6, y: y + ph * 2.2, z, w: 1.8 + ph * 3.0, h: 1.8 + ph * 3.0, soft: true,
      });
    }
  };
  const burst = (x: number, y: number, z: number, bu: number, w = 3.6) => {
    if (bu >= 0 && bu < 1) out.fx.push({ key: `burst${q(bu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(bu, 24)), x, y, z, w, h: w, soft: true });
  };
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(255,214,150,0.5)"), x, y, z, w, h: w, soft: true });
  };
  // both arms reaching down-forward to the tamping iron, bobbing
  const tamp = (): Partial<StickOpts> => {
    const b = Math.sin(t * Math.PI * 2 * 0.85) * 9;
    return { armL: [-52 + b, -14], armR: [52 + b, 14] };
  };
  const flinch = (n: number): Partial<StickOpts> => ({ armL: [-150 - n * 4, -20], armR: [150 + n * 4, 20] });

  if (id === 1) {
    // HOOK: the blast instant, held — Gage thrown back onto the
    // bench (seated, stunned), the crew frozen mid-flinch, dust
    // still billowing from the drill hole
    sit(GAGE, 0.2, BENCH_Y, -64.4, "shock", { armL: [-140, -16], armR: [140, 16] });
    stand(CREW_A, -2.8, BENCH_Y, -65.2, "shock", flinch(1));
    stand(CREW_B, 4.6, BENCH_Y, -63.8, "shock", flinch(2));
    burst(DRILL[0], BENCH_Y + 1.1, DRILL[2], clamp01(u * 2.2), 4.4);
    dust(DRILL[0], BENCH_Y + 0.4, DRILL[2], 0.7, 3);
  } else if (id === 2) {
    // THE WORKS: Gage walks the half-built line toward the rock;
    // two crew work the rails behind him
    const gx = -8 + u * 9;
    walk(GAGE, gx, 0, -60.5, "neutral", { look: 0.3 });
    kneel(CREW_A, 6.5, 0, -58.2, "neutral");
    stand(CREW_C, 9.5, 0, -59.5, "neutral", { armL: [-30, -20], armR: [64 + Math.sin(t * 5.2) * 22, 10] });
    stand(CREW_B, -13, 0, -57.5, "neutral", { prop: "can" });
  } else if (id === 3) {
    // THE TAMPING: Gage works the iron in the hole; a crewman
    // holds the powder keg, another watches, hands on hips
    stand(GAGE, 0.4, BENCH_Y, -65.2, "neutral", tamp());
    stand(CREW_A, -2.6, BENCH_Y, -64.6, "neutral", { prop: "can" });
    stand(CREW_B, 4.4, BENCH_Y, -64.2, "nervous", { armL: [-18, -30], armR: [18, 30] });
  } else if (id === 4) {
    // THE EXPLOSION: tamp, tamp — then the hole erupts; by the
    // end Gage is down, seated and dazed against the rock
    if (u < 0.34) {
      stand(GAGE, 0.4, BENCH_Y, -65.2, "neutral", tamp());
      stand(CREW_A, -2.6, BENCH_Y, -64.6, "neutral", { prop: "can" });
      stand(CREW_B, 4.4, BENCH_Y, -64.2, "nervous", { armL: [-18, -30], armR: [18, 30] });
    } else {
      sit(GAGE, 0.1, BENCH_Y, -64.3, "pained", { armL: [-120, -10], armR: [96, 24] });
      stand(CREW_A, -2.6, BENCH_Y, -64.6, "shock", flinch(1));
      stand(CREW_B, 4.4, BENCH_Y, -64.2, "shock", flinch(3));
      burst(DRILL[0], BENCH_Y + 1.0, DRILL[2], clamp01((u - 0.34) * 2.6), 4.0);
      dust(DRILL[0], BENCH_Y + 0.3, DRILL[2], 1.0, 5);
    }
  } else if (id === 5) {
    // THE PATH: the iron is in the dirt (world geometry); Gage,
    // bandaged already by willing hands, sits up by the bench
    // while two crew run in and stop, hardly believing it
    sit(GAGE_BAND, 0.6, BENCH_Y, -64.6, "relief", { armL: [-30, -12], armR: [42, 10] });
    const run1 = -7 + smooth(clamp01(u * 1.6)) * 4.4;
    const run2 = 12 - smooth(clamp01(u * 1.6 - 0.1)) * 5.2;
    if (u < 0.62) {
      walk(CREW_A, run1, BENCH_Y, -63.6, "shock", {}, 1, 2.6);
      walk(CREW_B, run2, BENCH_Y, -63.2, "shock", {}, 1, 2.6);
    } else {
      stand(CREW_A, run1, BENCH_Y, -63.6, "shock", flinch(0));
      stand(CREW_B, run2, BENCH_Y, -63.2, "relief", { armL: [-24, -16], armR: [24, 16] });
    }
    stand(CREW_C, -4.5, BENCH_Y, -66.8, "shock", { armL: [-60, -20], armR: [60, 20] });
  } else if (id === 6) {
    // THE OX CART: Gage sits upright on the cart bed, bandaged,
    // talking; Harlow hurries across the yard with his bag
    sit(GAGE_BAND, 80, 1.02, -30.6, "relief", { armL: [-26, -10], armR: [52 + Math.sin(t * 1.8) * 8, 12] });
    const hx = 73.5 + smooth(clamp01(u * 1.5)) * 3.6;
    if (u < 0.6) walk(HARLOW, hx, 0, -27.8, "stern", { prop: "suitcase" }, 1, 2.4);
    else stand(HARLOW, hx, 0, -27.8, "relief", { prop: "suitcase" });
    stand(FAMILY, 83.5, 0, -35.5, "nervous", { armL: [-20, -24], armR: [20, 24] });
  } else if (id === 7) {
    // THE SICKROOM: Gage sits up in bed, heavily bandaged, weak;
    // Harlow keeps his seat at the bedside, watchful
    sit(GAGE_BAND, -81.5, 0.78, 27.6, "pained", { armL: [-16, -8], armR: [20, 8] });
    sit(HARLOW, -79.2, 0.06, 26.2, "stern", { armL: [-30, -18], armR: [30, 18] });
    glowFx("lamp", -83.5, 2.0, 25.5, 3.2, 0.5 + Math.sin(t * 2.1) * 0.05);
  } else if (id === 8) {
    // THE RECOVERY: Gage walks the yard slowly — bandaged eye,
    // but walking; family watches from the porch, relieved
    const gx = 75.5 + u * 8;
    walk(GAGE_BAND, gx, 0, 43.5, u > 0.6 ? "smile" : "relief", {}, 1, 1.1);
    stand(FAMILY, 85.5, 0.35, 40.5, "relief", { armL: [-128 + Math.sin(t * 2.2) * 10, -14], armR: [24, 14] });
  } else if (id === 9) {
    // NO LONGER GAGE: the argument — then he turns and goes
    if (u < 0.55) {
      stand(GAGE, 0.2, BENCH_Y, -64.2, "stern", { armL: [-40, -16], armR: [58 + Math.sin(t * 6.0) * 16, 18] });
      stand(BOSS, 2.6, BENCH_Y, -64.6, "stern", { armL: [-14, -34], armR: [14, 34] });
      stand(CREW_A, -3.4, BENCH_Y, -63.4, "nervous", { armL: [-16, -20], armR: [16, 20] });
    } else {
      const gx = 0.2 + (u - 0.55) / 0.45 * 7.5;
      walk(GAGE, gx, BENCH_Y, -63.6, "stern", {}, 1, 2.0);
      stand(BOSS, 2.6, BENCH_Y, -64.6, "stern", { armL: [-14, -34], armR: [14, 34] });
      stand(CREW_A, -3.4, BENCH_Y, -63.4, "sad", { armL: [-10, -12], armR: [10, 12] });
    }
  } else if (id === 10) {
    // THE COMPANION: the village road — Gage walks it with the
    // iron riding on his shoulder (the rod prop); a neighbour
    // stops and stares as he passes
    const gx = -85 + u * 10, gz = -48 + u * 5.5;
    walk(GAGE, gx, 0, gz, "neutral", { prop: "rod" });
    stand(NEIGHBOUR, -80.5, 0, -39.5, "shock", { armL: [-30, -14], armR: [30, 14], look: -0.4 });
  } else if (id === 11) {
    // CHILE: Gage on the driver's bench, reins in both hands,
    // calm at last; a passenger waits by the coach door
    sit(GAGE_CHILE, 0.6, 2.28, 76.6, "relief", { armL: [-44, -20], armR: [44, 20] });
    stand(PASSENGER, 3.4, 0, 78.5, "neutral", { prop: "suitcase" });
  } else if (id === 12) {
    // THE MUSEUM: a lone visitor stands before the case a long
    // time, reading the little plaque
    stand(VISITOR, 85, 0, 117.5, "sad", { armL: [-12, -10], armR: [12, 10], look: 0.2 });
    glowFx("case", 85, 2.2, 113.2, 4.2, 0.35);
  } else if (id === 13) {
    // CLOSE: the knoll, golden hour — Gage stands with his iron,
    // looking out over the valley he helped cut through
    stand(GAGE, 32, 0.85, -38, "relief", { prop: "rod", look: 0.4 });
  }
  return out;
};
