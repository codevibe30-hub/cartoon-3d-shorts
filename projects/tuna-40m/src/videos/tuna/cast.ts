// The cast of the Shimabara koi-canal short as lit flat sprites in the 3D world: the
// hero resident (blue jacket, red cap), an elder resident, a second resident, and a
// kid who almost feeds the koi. Same pool + card machinery as the house style: one
// canvas per distinct drawing, yaw-only billboards shaded by cardShade(), soft
// contact blobs. Year / fact cards ("1792", "1978", "70 CM") float as ink-outlined
// boards via drawCard.
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, fxSplash, INK,
  Outfit, Expr, FrontOpts, KID,
} from "./toon";
import { FPS, SHOTS, L, clamp01, GAVEL4_T, BID5_T, CHEER10_T } from "./story";
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
export const drawCard2 = (line1: string, line2: string, bg: string, fg: string) => (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(10, 10, 492, 236, 26);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 84px 'Arial Black', Arial, sans-serif`;
  g.fillText(line1, 256, 88);
  g.font = `900 84px 'Arial Black', Arial, sans-serif`;
  g.fillText(line2, 256, 178);
};

// ---------------- our people ----------------
// HERO: the young buyer who narrates to camera — teal work jacket, red cap.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#e2453c" }, okey: "tunaHero" };
// KIMURA, the "Tuna King": stout, near-black suit, black cap, white market boots.
const KIMURA: Who = { i: 47, o: { ...townsfolk(2), dress: undefined, jacket: "#23272f", pants: "#23272f", boots: "#e8e6df", hat: "cap", cap: "#16181d", build: "stout" }, okey: "tunaKimura" };
// AUCTIONEER: white jacket + white cap, up on the platform.
const AUCTIONEER: Who = { i: 48, o: { ...townsfolk(5), dress: undefined, jacket: "#eef0ea", pants: "#4a4f58", boots: "#e8e6df", hat: "cap", cap: "#f2f2ee" }, okey: "tunaAuctioneer" };
// BUYERS: market regulars — townsfolk variants re-dressed with white caps + boots.
const buyer = (i: number, v: number, jacket: string): Who => ({
  i, o: { ...townsfolk(v), jacket, boots: "#e8e6df", hat: "cap", cap: "#e8e6da" }, okey: `tunaBuyer${i}`,
});
const BUYER_A = buyer(51, 1, "#5a6e46");
const BUYER_B = buyer(52, 3, "#7a4a3a");
const BUYER_C = buyer(53, 6, "#4a5a7a");
const BUYER_D = buyer(54, 0, "#8a6d3b");
const BUYER_E = buyer(55, 4, "#63507a");
const BUYER_F = buyer(56, 2, "#3f6b5a");

// Zone anchors (must match world.ts): hall floor y 0; hero tuna centre (0, ~0.75, 2);
// auction platform z -27..-31 top y 0.9; Kimura spot (0.2, 0, -9.8); hero spot (1.9, 0, 3.6);
// scale prop (2.9, 0, -0.6); 2013 tuna pallet (-3.6, 0, -6).

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
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  const crowd1 = (expr: Expr) => {
    // the shot-1/10 arc of buyers around the hero tuna, staring at it
    out.places.push(stand(BUYER_A, -2.0, 0, -1.4, expr, 0.3)); blob(out, -2.0, 0, -1.4);
    out.places.push(stand(BUYER_B, 0.2, 0, -2.0, expr, -0.3)); blob(out, 0.2, 0, -2.0);
    out.places.push(stand(BUYER_C, -2.2, 0, 1.4, expr, 0.4)); blob(out, -2.2, 0, 1.4);
    out.places.push(stand(BUYER_D, 1.7, 0, 1.1, expr, -0.4)); blob(out, 1.7, 0, 1.1);
  };

  if (id === 1) {
    // HOOK (low at the tuna): crowd arc behind the fish, the hero at the right
    crowd1("grin");
    out.places.push(stand(HERO, 2.9, 0, 4.8, "grin", -0.3)); blob(out, 2.9, 0, 4.8);
    starsFx(0, 1.7, 2.2, 1.1);
  }
  if (id === 2) {
    // LOKASI (high crane wide): small figures give the hall its scale
    out.places.push(stand(BUYER_A, 5.5, 0, -6, "neutral", 0)); blob(out, 5.5, 0, -6);
    out.places.push(stand(BUYER_C, -5.8, 0, -12, "neutral", 0)); blob(out, -5.8, 0, -12);
    out.places.push(stand(BUYER_E, 4.2, 0, -20, "neutral", 0)); blob(out, 4.2, 0, -20);
    out.places.push(stroll(BUYER_B, -4.5, 0, -24, "neutral", tt * 1.1)); blob(out, -4.5, 0, -24);
    out.places.push(stand(AUCTIONEER, 0, 0.9, -29.5, "neutral", 0)); blob(out, 0, 0.9, -29.5);
    out.places.push(stand(BUYER_F, -2.2, 0, 3.5, "neutral", 0)); blob(out, -2.2, 0, 3.5);
    // centred on the crane axis, sized to sit FULLY in frame at ~33 m
    cardFx("cardDate", drawCardFit(["5 JAN 2019"], "#2e5f8a", "#ffffff", 96), L[1] / FPS + 0.5, 2.8, 0, 4.8, -10, 6.0, 3.0);
  }
  if (id === 3) {
    // IKAN (close along the flank): no people — the fish carries it; glints ride the skin
    starsFx(0, 1.5, 1.6, 2.0);
    // early-window card, near the axis, small enough for the closest camera point
    cardFx("card278", drawCardFit(["278 KG"], "#c0353a", "#ffffff", 132), L[2] / FPS + 0.27, 2.2, -0.7, 1.9, 1.8, 1.5, 0.75);
  }
  if (id === 4) {
    // HARGA (medium to the board): the auctioneer calls it, buyers watch, the
    // gavel kick lands and the price card pops
    out.places.push(person(cam, AUCTIONEER, 0, 0.9, -29.8, { mode: "stand", expr: "grin", blink: lidAt(t, 48), look: 0, wave: 1 }));
    blob(out, 0, 0.9, -29.8);
    out.places.push(stand(BUYER_A, -3.4, 0, -20, "neutral", 0.2)); blob(out, -3.4, 0, -20);
    out.places.push(stand(BUYER_D, 4.2, 0, -22, "neutral", -0.2)); blob(out, 4.2, 0, -22);
    out.places.push(stand(KIMURA, 0.2, 0, -23, "neutral", 0)); blob(out, 0.2, 0, -23);
    cardFx("cardPrice", drawCardFit(["¥333,6", "JUTA"], "#bf8a12", "#ffffff", 118), GAVEL4_T - 0.1, 2.6, 0, 4.9, -26.5, 3.6, 1.8);
    burstFx(GAVEL4_T + 0.05, 0.7, 0, 3.4, -29.6, 2.4);
  }
  if (id === 5) {
    // PEMBELI (medium close): Kimura's hand shoots up at BID5_T; a rival reacts
    const bid = tt >= BID5_T;
    if (bid) out.places.push(person(cam, KIMURA, 0.2, 0, -9.8, { mode: "stand", expr: "grin", blink: lidAt(t, 47), look: 0, wave: 1 }));
    else out.places.push(stand(KIMURA, 0.2, 0, -9.8, "neutral", 0));
    blob(out, 0.2, 0, -9.8);
    out.places.push(stand(BUYER_B, -1.6, 0, -11.2, bid ? "shock" : "neutral", 0.3)); blob(out, -1.6, 0, -11.2);
    out.places.push(stand(BUYER_C, 1.9, 0, -11.0, "neutral", -0.3)); blob(out, 1.9, 0, -11.0);
    cardFx("cardKing", drawCardFit(["TUNA KING"], "#23272f", "#ffd98a", 96), BID5_T - 0.4, 2.4, 0.2, 2.6, -12.6, 2.2, 1.1);
    burstFx(BID5_T + 0.05, 0.7, 0.2, 3.1, -9.8, 2.2);
  }
  if (id === 6) {
    // REKOR 2013 (flashback): a younger-feeling Kimura beside the smaller tuna
    out.places.push(stand(KIMURA, -2.6, 0, -5.4, "grin", -0.3)); blob(out, -2.6, 0, -5.4);
    out.places.push(stand(BUYER_D, -5.7, 0, -8.6, "neutral", 0.3)); blob(out, -5.7, 0, -8.6);
    out.places.push(stand(BUYER_F, -4.8, 0, -11.5, "neutral", -0.2)); blob(out, -4.8, 0, -11.5);
    cardFx("card2013", drawCardFit(["2013", "¥155,4 JUTA"], "#7a5a34", "#ffffff", 110), L[5] / FPS + 0.33, 2.6, -5.0, 2.3, -8.6, 3.0, 1.5);
  }
  if (id === 7) {
    // PER KILO (close on the scale): no people — steel, a tuna steak, gold bars
    starsFx(3.3, 1.1, -0.2, 1.0);
    cardFx("cardKilo", drawCardFit(["¥1,2 JUTA", "PER KG"], "#2e8b6e", "#ffffff", 104), L[6] / FPS + 0.27, 2.4, 2.45, 1.75, -3.2, 2.2, 1.1);
  }
  if (id === 8) {
    // JUJUR (medium push-in): the hero tells it straight to camera
    out.places.push(stand(HERO, 1.9, 0, 3.6, "relief_open", 0));
    blob(out, 1.9, 0, 3.6);
  }
  if (id === 9) {
    // HARI BIASA (calm wide): the hall nearly empty — one stroller, the
    // auctioneer far away, nobody bidding
    out.places.push(stroll(BUYER_E, -4.8, 0, -14, "neutral", tt * 0.8)); blob(out, -4.8, 0, -14);
    out.places.push(stand(AUCTIONEER, 0, 0.9, -29.5, "neutral", 0)); blob(out, 0, 0.9, -29.5);
    out.places.push(stand(BUYER_A, 6.1, 0, -4, "neutral", 0)); blob(out, 6.1, 0, -4);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again — the crowd grins, the hero laughs and waves
    crowd1("grin");
    const a = L[9] / FPS, dur = (L[10] - L[9]) / FPS;
    if (tt < a + dur * 0.45) {
      out.places.push(stand(HERO, 2.9, 0, 4.8, "grin", -0.3)); blob(out, 2.9, 0, 4.8);
    } else {
      out.places.push(person(cam, HERO, 2.9, 0, 4.8, { mode: "stand", expr: "laugh", blink: lidAt(t, 41), look: 0, wave: 1 }));
      blob(out, 2.9, 0, 4.8);
    }
    burstFx(CHEER10_T, 0.8, 0, 2.6, 0.5, 3.0);
    starsFx(0, 1.7, 2.2, 1.1);
  }
  return out;
};
export { FPS };
