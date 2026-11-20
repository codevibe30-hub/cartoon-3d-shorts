// The cast of the example short as lit flat sprites in the 3D world: one traveller (the hero)
// and a fellow passenger. Same pool + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact blobs.
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, TWIST_T, STOP_T, DEPART_T, BOARD_T, smooth, clamp01, lin } from "./story";
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

// ---------------- contact blobs ----------------
import { fxShadow, fxContact } from "./toon";
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], storm: [0.2, 0.21, 0.33] };
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

// ---------------- custom drawings ----------------
export const drawCard = (text: string, bg: string, fg: string, fs = 92) => (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(10, 10, 492, 236, 26);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  g.fillText(text, 256, 132);
};
export const drawQuestion = (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.arc(150, 138, 104, 0, Math.PI * 2);
  g.fillStyle = "#fffdf4"; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(118, 252); g.lineTo(104, 292); g.lineTo(152, 258); g.closePath();
  g.fillStyle = "#fffdf4"; g.fill(); g.stroke();
  g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.fillText("?", 150, 142);
};

// ---------------- our people ----------------
const HERO: Who = { i: 41, o: { ...townsfolk(4), hat: "cap", cap: "#e2453c", jacket: "#f2b13c", pants: "#3b3f52" }, okey: "hero" };
const TEMAN: Who = { i: 42, o: { ...townsfolk(1), dress: "#2e8b6e" }, okey: "teman" };
const BENCH_X = -2.6, BENCH_Z = -2.3;

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra });
  const stroll = (who: Who, x: number, y: number, z: number, expr: Expr, dist: number) =>
    person(cam, who, x, y, z, { mode: "stroll", expr, blink: lidAt(t, who.i), phase: dist * 0.55 });
  const sit = (who: Who, x: number, z: number, expr: Expr, look = 0) =>
    person(cam, who, x, 0.12, z, { mode: "sit", expr, blink: lidAt(t, who.i), look });
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });

  if (id === 1) {
    // HOOK: steps off at 2.8, strolls clear of the door, then watches his train leave
    if (tt >= 2.3) {
      if (tt < 3.0) {
        const x = 1.3 - 1.1 * smooth((tt - 2.3) / 0.7);
        out.places.push(stroll(HERO, x, 0, -1.5, "nervous", (tt - 2.3) * 1.6));
        blob(out, x, 0, -1.5);
      } else if (tt < DEPART_T) {
        out.places.push(stand(HERO, 0.2, 0, -1.2, "nervous", Math.sin(tt * 2.4)));
        blob(out, 0.2, 0, -1.2);
      } else {
        out.places.push(stand(HERO, 0.2, 0, -1.2, "shock", -1));
        blob(out, 0.2, 0, -1.2);
      }
    }
  }
  if (id === 2) {
    // WIDE: a tiny figure at the railing, taking in the scale of the place
    out.places.push(stand(HERO, -1, 0, 0.15, "dazed", 0));
    blob(out, -1, 0, 0.15);
  }
  if (id === 3) {
    // the exit hunt: pace to the left end, pause, pace to the right end, pause
    const a = 11.6, walk = (x0: number, x1: number, t0: number, t1: number) => x0 + (x1 - x0) * smooth((tt - t0) / (t1 - t0));
    if (tt < 13.2) {
      const x = walk(-1, -11.5, a, 15.5);
      out.places.push(stroll(HERO, x, 0, -1.1, "nervous", Math.abs(x) * 1.4));
      blob(out, x, 0, -1.1);
    } else if (tt < 13.9) {
      out.places.push(stand(HERO, -11.5, 0, -1.1, "shock", -1));
      blob(out, -11.5, 0, -1.1);
    } else if (tt < 15.5) {
      const x = walk(-11.5, 11.5, 13.9, 15.5);
      out.places.push(stroll(HERO, x, 0, -1.1, "nervous", Math.abs(x) * 1.4));
      blob(out, x, 0, -1.1);
    } else {
      out.places.push(stand(HERO, 11.5, 0, -1.1, "shock", 1));
      blob(out, 11.5, 0, -1.1);
    }
  }
  if (id === 4) {
    // reading the info board while the works train crawls past behind him
    out.places.push(stand(HERO, 1.5, 0, -1.7, tt > 20.5 ? "grin" : "neutral", 0));
    blob(out, 1.5, 0, -1.7);
  }
  if (id === 5) {
    // waves at the regular train; it does not even slow down
    if (tt < 25.3) {
      out.places.push(stand(HERO, 3, 0, -1.2, "grin", 1, { wave: 1 } as Partial<FrontOpts>));
      blob(out, 3, 0, -1.2);
    } else if (tt < 28.3) {
      out.places.push(stand(HERO, 3, 0, -1.2, "shock", 0));
      blob(out, 3, 0, -1.2);
    } else {
      out.places.push(stand(HERO, 3, 0, -1.2, "dazed", 0));
      blob(out, 3, 0, -1.2);
    }
  }
  if (id === 6) {
    // stuck: on the bench, under a big question mark
    out.places.push(sit(HERO, BENCH_X, BENCH_Z, tt > 31.5 ? "dazed" : "nervous"));
    out.fx.push({ key: "q|1", cw: 300, ch: 300, draw: drawQuestion, x: BENCH_X, y: 2.6, z: BENCH_Z, w: 0.8, h: 0.8 });
  }
  if (id === 7) {
    // TWIST: he gets it — relief, then a grin; a burst on the reveal word
    out.places.push(stand(HERO, 0.4, 0, -1.1, tt < TWIST_T + 0.4 ? "relief_open" : "laugh", 0));
    blob(out, 0.4, 0, -1.1);
    burstFx(TWIST_T, 0.8, 0.4, 2.6, -0.9, 3.4);
  }
  if (id === 8) {
    // the view: at the railing, river sparkle around him
    out.places.push(stand(HERO, -3.2, 0, 0.25, "relief", 0));
    blob(out, -3.2, 0, 0.25);
    starsFx(-6.5, 1.0, 10, 5.5);
    starsFx(3.0, 2.6, 15, 6.5);
  }
  if (id === 9) {
    // an audience of two on the bench, like a cinema row
    out.places.push(sit(HERO, BENCH_X - 0.85, BENCH_Z, "grin", 0));
    out.places.push(sit(TEMAN, BENCH_X + 0.85, BENCH_Z, "laugh", 0));
    starsFx(0.5, 3.2, 9, 5);
  }
  if (id === 10) {
    // PUNCHLINE: the fellow passenger waves him off; he boards and is gone
    out.places.push(stand(TEMAN, 4.6, 0, -1.0, "grin", -1, { wave: 1 } as Partial<FrontOpts>));
    blob(out, 4.6, 0, -1.0);
    if (tt < 53.9) {
      out.places.push(stand(HERO, 0.2, 0, -1.2, "laugh", 0));
      blob(out, 0.2, 0, -1.2);
    } else if (tt < BOARD_T) {
      const x = 0.2 + 1.1 * smooth((tt - 53.9) / (BOARD_T - 53.9));
      out.places.push(stroll(HERO, x, 0, -1.5, "grin", (tt - 53.9) * 1.6));
      blob(out, x, 0, -1.5);
    }
  }
  return out;
};
export { FPS };
