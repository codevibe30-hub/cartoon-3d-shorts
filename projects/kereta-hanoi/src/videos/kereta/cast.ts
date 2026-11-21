// The cast of the Kereta Hanoi short as lit flat sprites in the 3D alley
// world: the hero narrator (series continuity: teal shirt, cream cap),
// the café owner, two residents, a kid, and the barrier guard — staged
// per shot along Hanoi Train Street. Same pool + card machinery as the
// house style: one canvas per distinct drawing, yaw-only billboards
// shaded by cardShade(), soft contact blobs. Fact cards float as
// ink-outlined boards via drawCardFit (auto-fit: text NEVER overflows
// the board). Alley cards are glued to the view axis (computed from the
// live camera each frame) so they always sit in frame, held HIGH — a
// train passes underneath them in shots 1, 6 and 10.
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, KID, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, clamp01, PASS1_T, PASS10_T } from "./story";
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
    // target 396 (not 452): in the headless render the drawn glyphs come
    // out ~12% wider than measureText reports — long lines ("DARI MEJA
    // KOPI!") spilled past the board's edge on stills w-1.
    if (w > 396) fs = Math.floor(fs * (396 / w));
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

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "keretaHero" };
// THE CAFÉ OWNER: terracotta shirt, red cap — he runs the timetable.
const OWNER: Who = { i: 51, o: { jacket: "#b3543a", pants: "#33383e", boots: "#2c2620", hat: "cap", cap: "#8c2f26" }, okey: "keretaOwner" };
// RESIDENTS: a woman in purple, a man in blue-grey.
const RES_A: Who = { i: 52, o: { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#2a1c14" }, okey: "keretaResA" };
const RES_B: Who = { i: 53, o: { jacket: "#31556e", pants: "#3d4440", boots: "#2c2620", hat: "cap", cap: "#23272f" }, okey: "keretaResB" };
// THE KID: straight from the shared wardrobe.
const KIDW: Who = { i: 54, o: { ...KID }, okey: "keretaKid" };
// THE GUARD at the barrier: dark uniform, stern.
const GUARD: Who = { i: 55, o: { jacket: "#2c3440", pants: "#23272f", boots: "#17191d", hat: "cap", cap: "#1d2733" }, okey: "keretaGuard" };
void townsfolk;

// Zone anchors (must match world.ts + story.ts): track centre x=0;
// walls at |x| = 1.95; hero table (1.62, 20.5); movable set A (right,
// z=3.5) slides 1.5 → 2.42 on clearK; set B (left, z=-5) mirrors;
// chalkboard A at (-1.72, -3.5); chess set at (0, -2); barrier z=27.

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale);
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  // axis-glued cards: placed on the camera→target axis so they are always
  // framed; size computed from the card's camera distance so the board
  // spans a fixed share of the frame WIDTH at any camera distance.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60) => {
    const x = cam.pos.x + (tx - cam.pos.x) * frac;
    const y = cam.pos.y + (ty - cam.pos.y) * frac + up;
    const z = cam.pos.z + (tz - cam.pos.z) * frac;
    const d = Math.hypot(x - cam.pos.x, y - cam.pos.y, z - cam.pos.z);
    const w = 2 * d * 0.466 * 0.5625 * screenFrac;
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2);
  };
  const S0 = (i: number) => L[i] / FPS;

  if (id === 1) {
    // HOOK = CLICKBAIT COVER (frame 0): the pass is already ON — the loco
    // fills the frame beside the hero's table and the hero wears an
    // exaggerated SHOCK face until it clears, then relaxes into the grin.
    // The claim rides as one GIANT board from the very first frame:
    // "30 CM / DARI MUKA!" (4 words, thumbnail-readable; the distance is
    // the documented "puluhan sentimeter" clearance, stated as 30 cm).
    const passing1 = tt < PASS1_T + 1.1;
    out.places.push(stand(HERO, 1.66, 0, 19.4, passing1 ? "shock" : "grin", -0.2)); blob(out, 1.66, 0, 19.4);
    out.places.push(stand(RES_B, -1.62, 0, 12, "neutral", 0.2)); blob(out, -1.62, 0, 12);
    cardAerial("cardCm1", drawCardFit(["30 CM", "DARI MUKA!"], "#f2c018", "#1c1503", 110),
      0, 2.67, 0, 5.5, 13.5, 1.0, 0, 0.50);
  }
  if (id === 2) {
    // TRAIN STREET from above: tiny figures in the corridor below
    out.places.push(stand(HERO, 1.62, 0, 12, "grin", -0.2));
    out.places.push(stand(OWNER, -1.6, 0, -3, "neutral", 0.2));
    cardAerial("cardStreet", drawCardFit(["TRAIN STREET", "HANOI"], "#1e7a46", "#ffffff", 110),
      S0(1) + 0.35, 2.6, 0, 1, -8, 0.30, 2.5);
  }
  if (id === 3) {
    // 1902: an old-timer under the laundry lines, golden light
    out.places.push(stand(RES_B, 1.2, 0, -6, "neutral", 0.3)); blob(out, 1.2, 0, -6);
    out.places.push(stand(RES_A, -1.55, 0, -13, "neutral", -0.2)); blob(out, -1.55, 0, -13);
    cardAerial("card1902", drawCardFit(["REL DIBANGUN", "TAHUN 1902"], "#8a5a1f", "#ffffff", 104),
      S0(2) + 0.4, 2.6, 0, 3.5, -12, 0.35, 2.2);
  }
  if (id === 4) {
    // ±7 A DAY: the owner by his chalkboard; hero + resident at their
    // tables — nobody is worried. Yet.
    out.places.push(stand(OWNER, -1.5, 0, -2.0, "grin", 0.25)); blob(out, -1.5, 0, -2.0);
    out.places.push(stand(HERO, 1.52, 0, 2.6, "grin", -0.25)); blob(out, 1.52, 0, 2.6);
    out.places.push(stand(RES_A, -1.52, 0, -6.4, "neutral", 0.1)); blob(out, -1.52, 0, -6.4);
    cardAerial("card7x", drawCardFit(["±7 KERETA", "SEHARI!"], "#0e5a54", "#ffffff", 110),
      S0(3) + 0.4, 2.6, -0.3, 2.2, -4, 0.34, 1.2, 0.58);
  }
  if (id === 5) {
    // THE SCRAMBLE: everyone + everything against the walls (clearK = 1)
    out.places.push(stand(HERO, 1.74, 0, 4.8, "nervous", -0.3)); blob(out, 1.74, 0, 4.8);
    out.places.push(stand(RES_A, -1.74, 0, -4.0, "nervous", 0.2)); blob(out, -1.74, 0, -4.0);
    out.places.push(stand(OWNER, -1.7, 0, -8.8, "neutral", 0)); blob(out, -1.7, 0, -8.8);
    out.places.push(stand(RES_B, -1.82, 0, 1.4, "neutral", -0.2)); blob(out, -1.82, 0, 1.4);
    out.places.push(stand(KIDW, -1.2, 0, 0.4, "shock", 0.1, {}, 0.78)); blob(out, -1.2, 0, 0.4, 0.78);
    burstFx(S0(4) + 0.5, 0.8, -1.2, 2.6, 0.4, 1.1);
    cardAerial("cardWeker", drawCardFit(["JAM WEKER", "SATU KAMPUNG!"], "#7a4a8c", "#ffffff", 104),
      S0(4) + 0.4, 2.6, 0, 2.4, -2, 0.42, 0.3, 0.58);
  }
  if (id === 6) {
    // RE-HOOK: the hero flat against the left wall, the owner at the
    // right — the train sweeps between them, under the card.
    out.places.push(stand(HERO, -1.74, 0, -2, "shock", 0.4)); blob(out, -1.74, 0, -2);
    out.places.push(stand(OWNER, 1.66, 0, -0.5, "nervous", -0.3)); blob(out, 1.66, 0, -0.5);
    cardAerial("cardSapu", drawCardFit(["NYARIS MENYAPU", "DINDING RUMAH!"], "#7a1f1f", "#ffffff", 104),
      S0(5) + 0.4, 2.4, -0.4, 2.6, -4, 0.44, 1.45, 0.60);
  }
  if (id === 7) {
    // LIVING ROOM: chess ON the rails, the kid perched on a rail, tea out
    out.places.push(stand(RES_A, -0.92, 0, -2, "grin", 0.3)); blob(out, -0.92, 0.06, -2);
    out.places.push(stand(RES_B, 0.92, 0, -2.5, "neutral", -0.3)); blob(out, 0.92, 0.06, -2.5);
    out.places.push(stand(KIDW, 0.75, 0.24, 2.6, "grin", 0, {}, 0.78)); blob(out, 0.75, 0.02, 2.6, 0.78);
    out.places.push(stand(HERO, 1.32, 0, -5.6, "grin", -0.25)); blob(out, 1.32, 0, -5.6);
    cardAerial("cardRuangTamu", drawCardFit(["REL JADI", "RUANG TAMU"], "#1e7a46", "#ffffff", 110),
      S0(6) + 0.4, 2.6, 0, 1.6, -3, 0.42, 1.0, 0.58);
  }
  if (id === 8) {
    // 2019: the guard lowers the barrier across the alley mouth
    out.places.push(stand(GUARD, 0.95, 0, 25.0, "stern", 0)); blob(out, 0.95, 0, 25.0);
    out.places.push(stand(RES_A, -0.8, 0, 31.5, "neutral", 0.15)); blob(out, -0.8, 0, 31.5);
    burstFx(S0(7) + 2.15, 0.7, -2.0, 1.6, 27, 1.3);
    cardAerial("card2019", drawCardFit(["2019 DITUTUP", "TOTAL!"], "#23272f", "#ffb35c", 104),
      S0(7) + 0.4, 2.6, 0, 3.2, 18, 0.35, 1.5, 0.58);
  }
  if (id === 9) {
    // CAFÉ ONLY: the owner waves the hero in and seats him by the wall,
    // behind the yellow line — the second board lists the times.
    out.places.push(stand(OWNER, -0.7, 0, -10, "grin", 0.2, { wave: 1 })); blob(out, -0.7, 0, -10);
    out.places.push(stand(HERO, 1.58, 0, -7.2, "grin", -0.2)); blob(out, 1.58, 0, -7.2);
    out.places.push(stand(RES_A, 1.64, 0, -12.6, "neutral", 0.1)); blob(out, 1.64, 0, -12.6);
    cardAerial("cardKafe", drawCardFit(["MASUK CUMA", "LEWAT KAFE"], "#9c4a1f", "#ffffff", 104),
      S0(8) + 0.4, 2.6, 0.4, 2.2, -7, 0.42, 0.9, 0.58);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again — nervous sip, then the laugh as it passes
    const passed = tt >= PASS10_T + 0.7;
    if (passed) {
      out.places.push(stand(HERO, 1.66, 0, 19.4, "laugh", 0, { wave: 1 }));
      starsFx(1.66, 2.9, 19.4, 1.3);
    } else {
      out.places.push(stand(HERO, 1.66, 0, 19.4, "nervous", -0.2));
    }
    blob(out, 1.66, 0, 19.4);
    out.places.push(stand(RES_B, -1.62, 0, 12, "neutral", 0.2)); blob(out, -1.62, 0, 12);
    cardAerial("cardCm10", drawCardFit(["PULUHAN CM", "DARI MEJAMU!"], "#1450a0", "#ffffff", 104),
      S0(9) + 0.3, 2.6, 0, 5.5, 13.5, 1.0, 0, 0.50);
  }
  return out;
};
export { FPS };
