// The cast of the Nyepi Bali short as lit flat sprites in the 3D world: the hero
// narrator, a pecalang (adat patrol), his family, parade crowds + gamelan
// players, tourists, an airport staffer. Same pool + card machinery as the
// house style: one canvas per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. Fact cards float as ink-outlined boards via
// drawCardFit (auto-fit: text NEVER overflows the board).
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts, KID,
} from "./toon";
import { FPS, SHOTS, L, clamp01 } from "./story";
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
/** the hero's phone: dead screen, crossed-out signal bars, "TIDAK ADA SINYAL" */
export const drawPhone = (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(14, 14, 228, 484, 30);
  g.fillStyle = "#14181f"; g.fill();
  g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.roundRect(34, 54, 188, 380, 12);
  g.fillStyle = "#26313d"; g.fill();
  // signal bars, all grey, with a red cross
  for (let i = 0; i < 4; i++) { g.fillStyle = "#5a6672"; g.fillRect(66 + i * 26, 150 - i * 18, 16, 34 + i * 18); }
  g.strokeStyle = "#e2453c"; g.lineWidth = 13; g.lineCap = "round";
  g.beginPath(); g.moveTo(56, 96); g.lineTo(178, 196); g.moveTo(178, 96); g.lineTo(56, 196); g.stroke();
  g.fillStyle = "#e8eef4"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 37px 'Arial Black', Arial, sans-serif";
  g.fillText("TIDAK ADA", 128, 268);
  g.fillText("SINYAL", 128, 316);
  g.fillStyle = "#8fa2b2"; g.font = "700 25px Arial, sans-serif";
  g.fillText("sejak 06.00", 128, 372);
  g.fillStyle = "#39434e"; g.beginPath(); g.arc(128, 466, 15, 0, 7); g.fill();
};

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream udeng-style cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "nyepiHero" };
// PECALANG: adat patrol — black shirt, pale kamen sarong, dark udeng.
const PECALANG: Who = { i: 61, o: { jacket: "#1f232a", pants: "#d8d2c2", boots: "#2c2620", hat: "cap", cap: "#15181d" }, okey: "nyepiPecalang" };
// FAMILY on the hero porch.
const FATHER: Who = { i: 62, o: { ...townsfolk(4), dress: undefined, jacket: "#7a4a3a", pants: "#4a4238", hat: "cap", cap: "#e8e0cc" }, okey: "nyepiFather" };
const MOTHER: Who = { i: 63, o: townsfolk(3), okey: "nyepiMother" };
const KIDW: Who = { i: 64, o: KID, okey: "nyepiKid" };
// TOURISTS stuck at the hotel.
const TOUR_A: Who = { i: 65, o: { ...townsfolk(0), dress: undefined, jacket: "#e8b13c", pants: "#5a6e8c", hat: "cap", cap: "#e2453c" }, okey: "nyepiTourA" };
const TOUR_B: Who = { i: 66, o: townsfolk(5), okey: "nyepiTourB" };
// NURSE at the hospital door (the one lit building).
const NURSE: Who = { i: 67, o: { ...townsfolk(2), dress: undefined, jacket: "#eef0ea", pants: "#7a8894", boots: "#e8e6df", hat: "cap", cap: "#f2f2ee" }, okey: "nyepiNurse" };
// CROWD + carriers + gamelan players (townsfolk variants).
const folk = (i: number, v: number): Who => ({ i, o: townsfolk(v), okey: `nyepiFolk${i}` });
const F1 = folk(71, 0), F2 = folk(72, 1), F3 = folk(73, 2), F4 = folk(74, 3), F5 = folk(75, 4), F6 = folk(76, 5), F7 = folk(77, 6), F8 = folk(78, 7 % 7);

// Zone anchors (must match world.ts): road x -3.2..3.2; pecalang post (0,0,-1);
// hero spots (1.2,0,3.4) day/night / (3.9,0,6.2) phone; porch floor y 0.35,
// x 4.2..6.4, z -1.0..4.2 (family stands on it);
// ogoh-ogoh platform centre (0,0,-4), bearers at x ±0.95, z -2.9..-5.6;
// gamelan row x -3.25 (boxes -3.8), z -1..-3.4; hotel door (-5.5,0,-13);
// hospital (8.3,0,-16), front face x 5.5, nurse at (5.15,0,-16.8).

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

  if (id === 1) {
    // HOOK (empty street, day): ONE pecalang in the middle of the road, the
    // hero narrating from the sidewalk — the emptiness is the picture
    out.places.push(stand(PECALANG, 0, 0, -1, "stern", 0)); blob(out, 0, 0, -1);
    out.places.push(stand(HERO, 1.2, 0, 3.4, "grin", -0.3)); blob(out, 1.2, 0, 3.4);
  }
  if (id === 2) {
    // SEMALAM (dusk): the same street ALIVE — crowd, gamelan row, onlookers
    out.places.push(stand(F1, -3.25, 0, -1.0, "grin", 0.3)); blob(out, -3.25, 0, -1.0);
    out.places.push(stand(F2, -3.25, 0, -2.2, "grin", 0.3)); blob(out, -3.25, 0, -2.2);
    out.places.push(stand(F3, -3.25, 0, -3.4, "neutral", 0.3)); blob(out, -3.25, 0, -3.4);
    out.places.push(stand(F4, 2.9, 0, 1.2, "laugh", -0.3)); blob(out, 2.9, 0, 1.2);
    out.places.push(stand(F5, -2.4, 0, 2.2, "grin", 0.2)); blob(out, -2.4, 0, 2.2);
    out.places.push(stand(F6, 3.1, 0, -6.8, "grin", -0.2)); blob(out, 3.1, 0, -6.8);
    out.places.push(stand(F7, -1.9, 0, -6.2, "neutral", 0.3)); blob(out, -1.9, 0, -6.2);
    out.places.push(stand(F8, 0.6, 0, -9.2, "grin", 0)); blob(out, 0.6, 0, -9.2);
    out.places.push(stand(HERO, 1.7, 0, 3.2, "grin", -0.3)); blob(out, 1.7, 0, 3.2);
    cardFx("cardSemalam", drawCardFit(["SEMALAM", "SEBELUMNYA"], "#7a3a1e", "#ffffff", 104), L[1] / FPS + 0.4, 2.6, 0, 4.6, -8, 5.4, 2.7);
  }
  if (id === 3) {
    // OGOH-OGOH: eight bearers under the raft (bobbing with the world group),
    // onlookers cheering at the sides
    const bob = 0.055 * Math.abs(Math.sin(tt * 2.3));
    const bearers = [F1, F2, F3, F4, F5, F6, F7, F8];
    bearers.forEach((w2, i2) => {
      const x = i2 % 2 === 0 ? -0.95 : 0.95, z = -2.9 - Math.floor(i2 / 2) * 0.9;
      out.places.push(stand(w2, x, bob, z, "grin", 0)); blob(out, x, 0, z);
    });
    out.places.push(stand(TOUR_A, 3.2, 0, -1.2, "laugh", -0.4)); blob(out, 3.2, 0, -1.2);
    out.places.push(stand(MOTHER, -3.3, 0, -6.4, "grin", 0.4)); blob(out, -3.3, 0, -6.4);
    out.places.push(stand(KIDW, 2.9, 0, -8.6, "laugh", -0.3)); blob(out, 2.9, 0, -8.6);
    cardFx("cardOgoh", drawCardFit(["OGOH-OGOH"], "#8e2432", "#ffd98a", 110), L[2] / FPS + 0.3, 2.4, -0.6, 5.6, -7.0, 3.0, 1.5);
    burstFx(L[2] / FPS + 0.35, 0.7, 0, 4.4, -4.2, 2.6);
  }
  if (id === 4) {
    // CATUR BRATA: the family settles on the porch as the lamps die
    out.places.push(stand(FATHER, 5.6, 0.35, 2.6, "neutral", -0.2)); blob(out, 5.6, 0.35, 2.6);
    out.places.push(stand(MOTHER, 6.0, 0.35, 1.4, "neutral", 0.2)); blob(out, 6.0, 0.35, 1.4);
    out.places.push(stand(KIDW, 5.7, 0.35, 3.4, "neutral", 0)); blob(out, 5.7, 0.35, 3.4);
    cardFx("cardBrata", drawCardFit(["CATUR BRATA", "4 LARANGAN"], "#2e5f8a", "#ffffff", 100), L[3] / FPS + 0.35, 2.8, 4.8, 3.7, 2.2, 2.1, 1.05);
  }
  if (id === 5) {
    // EMPTY (crane wide): the road deserted — one distant pecalang, that's all
    out.places.push(stand(PECALANG, 0, 0, -10, "neutral", 0)); blob(out, 0, 0, -10);
    cardFx("card24", drawCardFit(["24 JAM"], "#2f6fb4", "#ffffff", 120), L[4] / FPS + 0.4, 2.6, 0, 6.5, -20, 3.2, 1.6);
  }
  if (id === 6) {
    // AIRPORT: nobody — a single staffer far away by the terminal doors
    out.places.push(stand(NURSE, 92, 0, -16, "neutral", 0)); blob(out, 92, 0, -16);
    cardFx("card440", drawCardFit(["440 PENERBANGAN", "BATAL"], "#2e5f8a", "#ffffff", 96), L[5] / FPS + 0.4, 2.8, 97, 7.0, -20, 6.0, 3.0);
  }
  if (id === 7) {
    // PHONE: the hero checks his phone — grin curdles into frustration
    const dead = tt > L[6] / FPS + 1.0;
    out.places.push(stand(HERO, 3.9, 0, 6.2, dead ? "nervous" : "grin", -0.2)); blob(out, 3.9, 0, 6.2);
    if (tt >= L[6] / FPS + 0.2) out.fx.push({ key: "phoneDead", cw: 256, ch: 512, draw: drawPhone, x: 3.28, y: 1.42, z: 5.8, w: 0.5, h: 1.0 });
    cardFx("card2018", drawCardFit(["SEJAK 2018"], "#23272f", "#ffd98a", 104), L[6] / FPS + 1.1, 2.2, 4.7, 2.35, 4.5, 1.3, 0.65);
  }
  if (id === 8) {
    // PECALANG (night): the patrol mid-road (flashlight beam lives in world.ts),
    // two tourists peeking from the dark hotel doorway
    out.places.push(stand(PECALANG, -1.4, 0, -3, "stern", 0.2)); blob(out, -1.4, 0, -3);
    out.places.push(stand(TOUR_A, -5.0, 0, -12.2, "nervous", 0.4)); blob(out, -5.0, 0, -12.2);
    out.places.push(stand(TOUR_B, -5.45, 0, -13.4, "nervous", 0.3)); blob(out, -5.45, 0, -13.4);
    cardFx("cardPecalang", drawCardFit(["DIJAGA", "PECALANG"], "#1f3a5f", "#ffffff", 104), L[7] / FPS + 0.4, 2.6, -2.6, 3.3, -7.5, 2.6, 1.3);
  }
  if (id === 9) {
    // JUJUR (night wide): the hero tells it straight; the nurse stands in the
    // hospital's lit doorway — emergencies never sleep
    out.places.push(stand(HERO, -0.5, 0, -2, "relief_open", 0)); blob(out, -0.5, 0, -2);
    out.places.push(stand(NURSE, 5.15, 0, -16.8, "neutral", -0.3)); blob(out, 5.15, 0, -16.8);
    cardFx("cardDarurat", drawCardFit(["DARURAT", "TETAP JALAN"], "#eef0ea", "#c0353a", 100), L[8] / FPS + 0.4, 2.8, 2.6, 4.3, -11.2, 2.8, 1.4);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again under the stars — pecalang post, hero laughing
    out.places.push(stand(PECALANG, 0, 0, -1, "neutral", 0)); blob(out, 0, 0, -1);
    const a = L[9] / FPS, dur = (L[10] - L[9]) / FPS;
    if (tt < a + dur * 0.45) {
      out.places.push(stand(HERO, 1.2, 0, 3.4, "grin", -0.3)); blob(out, 1.2, 0, 3.4);
    } else {
      out.places.push(person(cam, HERO, 1.2, 0, 3.4, { mode: "stand", expr: "laugh", blink: lidAt(t, 41), look: 0, wave: 1 }));
      blob(out, 1.2, 0, 3.4);
    }
    starsFx(0, 2.0, -1.5, 1.2);
  }
  return out;
};
export { FPS };
