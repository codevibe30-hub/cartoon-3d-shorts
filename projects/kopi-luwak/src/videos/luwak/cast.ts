// The cast of the Kopi Luwak frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// marvelling at the giant cup, LUWAK the upright palm civet
// mascot (grey-brown, dark eye mask, long tail, holding a red
// coffee cherry), a Sumatran coffee FARMER (brown jacket, straw
// cap, moustache), and the props — the GIANT steaming coffee cup,
// red coffee cherries, roasted beans and burlap sacks. Same pool
// + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact
// blobs. The claim card floats as an ink-outlined board via
// drawCardFit (auto-fit: text NEVER overflows the board), glued
// to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, LUWAK_SPOT, FARMER_SPOT, CUP_SPOT, SACK_SPOT, CHERRY_SPOTS, leavesAt } from "./story";
import { rng } from "./paint";
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
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: true, side: THREE.DoubleSide });
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
const fitFont = (lines: string[], maxFs: number, g: CanvasRenderingContext2D, maxW = 396) => {
  let fs = maxFs;
  for (const ln of lines) {
    g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
    const w = g.measureText(ln).width;
    if (w > maxW) fs = Math.floor(fs * (maxW / w));
  }
  return fs;
};
/** The claim board, painted RICH (round-2 anti-flat pass): a deep
 *  drop shadow floating off the board, a diagonal amber gradient
 *  with a glossy top sheen and fine grain, a double border with
 *  character (heavy ink outside, pinstripe inside), corner rivets
 *  like a real road sign, and the text itself carrying a soft
 *  shadow so it sits IN the board instead of on it. The board is
 *  inset in the canvas so the shadow has room to fall. */
export const drawCardFit = (lines: string[], bg: string, fg: string, maxFs = 120) => (p: Pen) => {
  const g = p.g;
  const bx = 20, by = 16, bw = 464, bh = 204, br = 30;
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath(); g.roundRect(x, y, w, h, r);
  };
  // drop shadow: an offset, blurred copy of the board silhouette
  g.save();
  g.shadowColor = "rgba(24,14,0,0.55)"; g.shadowBlur = 22; g.shadowOffsetX = 7; g.shadowOffsetY = 13;
  rr(bx, by, bw, bh, br); g.fillStyle = bg; g.fill();
  g.restore();
  // amber gradient body (the flat colour becomes light from above)
  const grad = g.createLinearGradient(bx, by, bx + bw * 0.35, by + bh);
  grad.addColorStop(0, "#ffdf52"); grad.addColorStop(0.45, "#f6c21c"); grad.addColorStop(1, "#eda30c");
  rr(bx, by, bw, bh, br); g.fillStyle = grad; g.fill();
  // fine grain so the surface is not a vector-flat fill
  const rs = rng(77);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${rs() > 0.5 ? "255,246,200" : "120,70,0"},${0.03 + rs() * 0.05})`;
    g.fillRect(bx + rs() * bw, by + rs() * bh, 2.4, 2.4);
  }
  // glossy sheen sweeping the top of the board
  g.save(); rr(bx, by, bw, bh, br); g.clip();
  const sheen = g.createLinearGradient(0, by, 0, by + bh * 0.62);
  sheen.addColorStop(0, "rgba(255,255,255,0.42)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.fillRect(bx, by, bw, bh * 0.62);
  const gloss = g.createLinearGradient(bx, by, bx + bw, by + bh);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)"); gloss.addColorStop(0.35, "rgba(255,255,255,0)"); gloss.addColorStop(1, "rgba(120,60,0,0.10)");
  g.fillStyle = gloss; g.fillRect(bx, by, bw, bh);
  g.restore();
  // double border: heavy ink outside, warm pinstripe inside
  rr(bx, by, bw, bh, br); g.lineWidth = 13; g.strokeStyle = INK; g.stroke();
  rr(bx + 13, by + 13, bw - 26, bh - 26, br - 11); g.lineWidth = 3; g.strokeStyle = "rgba(122,72,0,0.65)"; g.stroke();
  // corner rivets, like a bolted road sign
  for (const [rx, ry] of [[bx + 30, by + 30], [bx + bw - 30, by + 30], [bx + 30, by + bh - 30], [bx + bw - 30, by + bh - 30]]) {
    g.fillStyle = "#3a2a10"; g.beginPath(); g.arc(rx, ry, 6.5, 0, 7); g.fill();
    g.fillStyle = "rgba(255,240,200,0.85)"; g.beginPath(); g.arc(rx - 2, ry - 2, 2.2, 0, 7); g.fill();
  }
  // the claim text, with its own soft shadow pressed into the board
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  // v2: maxW was bw-64 — the longest line sat flush on the borders
  // and the corner rivets overlapped its first/last letters; bw-110
  // leaves a real margin on every card
  const fs = fitFont(lines, maxFs, g, bw - 110);
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  g.save();
  g.shadowColor = "rgba(90,50,0,0.45)"; g.shadowBlur = 0; g.shadowOffsetY = 4;
  const cy = by + bh / 2 + 2;
  if (lines.length === 1) g.fillText(lines[0], bx + bw / 2, cy);
  else { g.fillText(lines[0], bx + bw / 2, cy - bh * 0.235); g.fillText(lines[1], bx + bw / 2, cy + bh * 0.235); }
  g.restore();
};



// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
// In this episode he marvels at the giant cup of kopi luwak.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "luwakHero" };
// FARMER: a Sumatran coffee farmer — brown jacket, straw cap, moustache.
const FARMER: Who = { i: 91, o: { jacket: "#7a5a3c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#d9b45a", moustache: "#4a3020", skin: "#c98f5f" }, okey: "luwakFarmer" };

/** LUWAK — the upright palm civet mascot, drawn with Pen
 *  primitives in the same 600 x 1000 design space bodyFront
 *  uses (soles at y 975): grey-brown body, cream belly, dark
 *  eye mask, pointed ears, a long tail curling up the right
 *  side, one paw raised holding a red coffee cherry. The tail
 *  sway is a mesh roll in stage(), not a redraw — the drawing
 *  itself is static so the pool caches one canvas. */
const drawLuwak = (p: Pen) => {
  const g = p.g;
  const cx = 300;
  const FUR = "#8a7a5c", FUR_D = "#6b5d45", BELLY = "#e8dcc3", MASK = "#3d3226";
  // soft shadow under the feet
  g.save(); g.fillStyle = "rgba(0,0,0,0.16)";
  g.beginPath(); g.ellipse(cx, 982, 120, 12, 0, 0, Math.PI * 2); g.fill(); g.restore();
  // tail — long, curling up the right side, pale tip
  p.line([[cx + 96, 900], [cx + 176, 820], [cx + 196, 660], [cx + 160, 500], [cx + 96, 430]], FUR_D, 44);
  p.ell(cx + 96, 424, 26, 30, BELLY, 8);
  // legs + feet
  p.poly([[cx - 92, 640], [cx - 30, 640], [cx - 26, 940], [cx - 96, 940]], FUR, 10);
  p.poly([[cx + 30, 640], [cx + 92, 640], [cx + 96, 940], [cx + 26, 940]], FUR, 10);
  p.ell(cx - 62, 962, 44, 20, FUR_D, 8);
  p.ell(cx + 62, 962, 44, 20, FUR_D, 8);
  // body — upright oval, cream belly
  p.ell(cx, 500, 138, 168, FUR, 12);
  p.ell(cx, 520, 92, 130, BELLY, 0);
  // speckles on the back
  for (const [dx, dy, r] of [[-96, 430, 12], [-80, 520, 10], [-100, 600, 12], [96, 450, 10], [88, 560, 12]] as const)
    p.dot(cx + dx, dy, r, FUR_D);
  // left arm resting
  p.line([[cx - 128, 420], [cx - 168, 560], [cx - 150, 660]], FUR, 40);
  p.ell(cx - 150, 668, 24, 24, FUR_D, 8);
  // right arm raised, holding a cherry
  p.line([[cx + 128, 420], [cx + 178, 320], [cx + 172, 236]], FUR, 40);
  p.ell(cx + 172, 228, 24, 24, FUR_D, 8);
  p.ell(cx + 172, 190, 22, 26, "#d92c2c", 8);
  p.line([[cx + 172, 168], [cx + 196, 142]], "#3e7a3a", 8);
  // head
  const hy = 208, hr = 108;
  p.ell(cx, hy, hr, hr, FUR, 12);
  // ears — pointed, dark inside
  p.poly([[cx - 96, 132], [cx - 118, 34], [cx - 40, 96]], FUR, 10);
  p.poly([[cx - 88, 112], [cx - 100, 62], [cx - 56, 92]], MASK, 0);
  p.poly([[cx + 96, 132], [cx + 118, 34], [cx + 40, 96]], FUR, 10);
  p.poly([[cx + 88, 112], [cx + 100, 62], [cx + 56, 92]], MASK, 0);
  // dark eye mask + bright eyes
  p.ell(cx - 44, hy - 8, 46, 34, MASK, 0);
  p.ell(cx + 44, hy - 8, 46, 34, MASK, 0);
  p.ell(cx - 44, hy - 8, 16, 18, "#fff", 0);
  p.ell(cx + 44, hy - 8, 16, 18, "#fff", 0);
  p.dot(cx - 44, hy - 8, 9);
  p.dot(cx + 44, hy - 8, 9);
  // nose + muzzle
  p.ell(cx, hy + 40, 30, 20, "#2c2320", 6);
  p.ell(cx, hy + 66, 46, 26, BELLY, 0);
  p.arc(cx, hy + 62, 22, 14, 10, 170, 7);
  // whiskers
  for (const sgn of [-1, 1]) {
    p.line([[cx + sgn * 40, hy + 52], [cx + sgn * 104, hy + 40]], INK, 4);
    p.line([[cx + sgn * 40, hy + 62], [cx + sgn * 104, hy + 66]], INK, 4);
  }
};

// ---------------- episode props (drawn, never pasted) ----------------
/** A red coffee cherry (or two) with a leaf — 256x256 canvas. */
export const drawCherry = (p: Pen) => {
  p.line([[128, 30], [128, 78]], "#3e7a3a", 8);
  p.ell(178, 52, 40, 16, "#3e7a3a", 6, 0, 360, -28);
  p.ell(96, 128, 56, 66, "#d92c2c", 8);
  p.ell(160, 140, 52, 62, "#e84545", 8);
  p.dot(80, 108, 12, "#ff8a8a");
  p.dot(146, 122, 10, "#ff8a8a");
};
/** A fluttering cherry in the wind: same cherry, tilted. */
export const drawCherryFly = (rot: number) => (p: Pen) => {
  p.rot = [rot, 128, 128];
  drawCherry(p);
  p.rot = null;
};
/** A steaming cup of coffee — 512x512 canvas. */
export const drawCup = (p: Pen) => {
  const g = p.g;
  const cx = 236, top = 190, bot = 420;
  // steam curls
  p.arc(cx - 60, 120, 26, 34, 200, 340, 10, "#ffffff");
  p.arc(cx + 20, 96, 26, 34, 180, 320, 10, "#ffffff");
  // cup body
  p.poly([[cx - 130, top], [cx + 130, top], [cx + 96, bot], [cx - 96, bot]], "#fff", 10);
  p.poly([[cx - 130, top], [cx + 130, top], [cx + 118, top + 26], [cx - 118, top + 26]], "#6b3f1d", 0);
  p.ell(cx, top + 12, 124, 18, "#4a2c12", 0);
  // handle
  p.arc(cx + 152, 300, 46, 56, -80, 80, 16, "#fff");
  // saucer
  p.ell(cx, bot + 26, 150, 22, "#f4ead2", 8);
  // "KOPI" label
  g.font = "900 54px Nunito, sans-serif"; g.textAlign = "center"; g.fillStyle = "#6b3f1d";
  g.fillText("KOPI", cx, 330);
};
/** A roasted coffee bean — 256x256 canvas. */
export const drawBean = (p: Pen) => {
  p.ell(128, 128, 78, 98, "#5a3218", 8, 0, 360, 20);
  p.arc(128, 128, 62, 84, -60, 60, 8, "#2c1808");
};
/** A burlap sack of beans — 512x512 canvas. */
export const drawSack = (p: Pen) => {
  const g = p.g;
  p.poly([[166, 130], [346, 130], [396, 420], [116, 420]], "#c9a86a", 10);
  p.poly([[186, 130], [326, 130], [306, 84], [206, 84]], "#a98a52", 8);
  p.line([[176, 128], [336, 128]], "#8a6a42", 10);
  p.poly([[146, 330], [366, 330], [380, 420], [132, 420]], "#a98a52", 0);
  g.font = "900 56px Nunito, sans-serif"; g.textAlign = "center"; g.fillStyle = "#6b4a22";
  g.fillText("KOPI", 256, 300);
};

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale);
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number, soft = false) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h, soft });
  };
  // axis-glued cards: placed on the camera's TRUE view axis (cam.dir)
  // so they are always centred in frame. Size scales with the card's
  // distance so the board spans a fixed share of the frame WIDTH.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60, soft = false) => {
    let x: number, y: number, z: number, d: number;
    if (cam.dir) {
      const distT = cam.pos.distanceTo(tmp.set(tx, ty, tz)) * frac;
      // FIT GUARD: clamp the vertical offset so the whole card —
      // centre offset plus its half height — stays inside the
      // shot's real vertical FOV.
      const w0 = 2 * distT * 0.466 * 0.5625 * screenFrac;
      const halfTan = Math.tan((camAt(id, Math.round(tt * FPS)).fov * Math.PI) / 360);
      const upMax = Math.max(0.05, distT * halfTan * 0.93 - w0 / 4);
      const upC = Math.max(-upMax, Math.min(up, upMax));
      const ux = cam.right.y * cam.dir.z - cam.right.z * cam.dir.y;
      const uy = cam.right.z * cam.dir.x - cam.right.x * cam.dir.z;
      const uz = cam.right.x * cam.dir.y - cam.right.y * cam.dir.x;
      x = cam.pos.x + cam.dir.x * distT + ux * upC;
      y = cam.pos.y + cam.dir.y * distT + uy * upC;
      z = cam.pos.z + cam.dir.z * distT + uz * upC;
      d = distT;
    } else {
      x = cam.pos.x + (tx - cam.pos.x) * frac;
      y = cam.pos.y + (ty - cam.pos.y) * frac + up;
      z = cam.pos.z + (tz - cam.pos.z) * frac;
      d = Math.hypot(x - cam.pos.x, y - cam.pos.y, z - cam.pos.z);
    }
    const w = 2 * d * 0.466 * 0.5625 * screenFrac;
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2, soft);
  };

  const S0 = (s.a - SHOTS[0].a) / FPS, SLEN = (s.b - s.a) / FPS;
  const U = clamp01((t - S0) / Math.max(0.01, SLEN)); // shot-local progress 0..1
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // red cherries fluttering above the garden, drifting down in the wind
  const cherriesFx = () => {
    for (let i = 0; i < 3; i++) {
      const ph = (leavesAt(tt) + i / 3) % 1;
      out.fx.push({
        key: `cherry${i}`, cw: 256, ch: 256, draw: drawCherryFly((i - 1) * 0.4),
        x: -1.2 + i * 1.2, y: 4.2 - ph * 1.8, z: -6 + i * 0.8 - ph * 2,
        w: 0.7, h: 0.7, soft: true,
      });
    }
  };
  const cherryFx = (x: number, y: number, z: number, w = 0.8) => {
    out.fx.push({ key: "cherry", cw: 256, ch: 256, draw: drawCherry, x, y: y + 0.4, z, w, h: w, soft: true });
  };
  const cupFx = (x: number, y: number, z: number, w: number, h: number) => {
    out.fx.push({ key: "cup", cw: 512, ch: 512, draw: drawCup, x, y, z, w, h, soft: true });
  };
  const beanFx = (x: number, y: number, z: number, w = 0.8) => {
    out.fx.push({ key: "bean", cw: 256, ch: 256, draw: drawBean, x, y: y + 0.4, z, w, h: w, soft: true });
  };
  const sackFx = (x: number, y: number, z: number, w = 2.4) => {
    out.fx.push({ key: "sack", cw: 512, ch: 512, draw: drawSack, x, y: y + w / 2, z, w, h: w, soft: true });
  };
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = -0.15, extra: Partial<FrontOpts> = {}, scale = 1.5) =>
    out.places.push(stand(HERO, x, y, z, expr, look, extra, scale));
  const luwakAt = (x: number, z: number, scale = 1.3) => {
    const d = cam.pos.distanceTo(tmp.set(x, 1.2, z)) / scale;
    const [w, h, k] = tier(d);
    out.places.push({ key: `LUWAK|${w}x${h}`, x, y: 0, z, scale, roll: Math.sin(t * 1.6) * 0.04, draw: (p) => drawLuwak(p), size: [w, h, k] });
  };
  const farmerAt = (x: number, z: number, expr: Expr = "grin", extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(FARMER, x, 0, z, expr, 0.1, extra, 1.5));

  if (id === 1) {
    // THE COVER (frame 0): the GIANT steaming cup in the garden,
    // the luwak on its branch picking the ripest cherry, the hero
    // shocked BESIDE it near the camera axis, the claim GIANT.
    // (Santa v2 lesson: hero/luwak at x 1.2/2.2 — near the axis,
    // ~4 deg / ~10 deg off-axis from the cover camera.)
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "shock", -0.15, { wave: 0.7 });
    luwakAt(LUWAK_SPOT[0], LUWAK_SPOT[2]);
    cupFx(CUP_SPOT[0], 2.1, CUP_SPOT[2], 4.2, 4.2);
    cherriesFx();
    card("cardHook", ["DARI", "KOTORAN"], 0, 2.6, -8, 5.0, 0.52);
  } else if (id === 2) {
    // THE WIDE: the whole terraced garden, coffee trees heavy
    // with red cherries, the luwak leaping between branches
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "grin", 0);
    luwakAt(LUWAK_SPOT[0], LUWAK_SPOT[2]);
    farmerAt(FARMER_SPOT[0], FARMER_SPOT[2], "grin");
    cherriesFx();
    card("cardRipe", ["PALING", "MATANG"], 0, 3.0, -10, 4.2, 0.5);
  } else if (id === 3) {
    // THE PICK: close on the luwak choosing the ripest cherry
    luwakAt(LUWAK_SPOT[0], LUWAK_SPOT[2]);
    // v2: cherries smaller + further back (v1's close-up cherries
    // were giant billboards cut off at the frame corners) and no
    // fluttering cherries in the close-up; card raised so it
    // clears the luwak's ears (v1: ears poked into the card).
    cherryFx(CHERRY_SPOTS[0][0], 0.3, CHERRY_SPOTS[0][2], 0.8);
    cherryFx(CHERRY_SPOTS[1][0], 0.3, CHERRY_SPOTS[1][2], 0.7);
    card("cardCurator", ["KURATOR", "RASA"], 0, 2.6, -4.5, 4.2, 0.5);
  } else if (id === 4) {
    // THE COLLECTION: the farmer gathers the droppings, beans
    // beside him — the card is NARROW (0.36) and anchored at the
    // tail end, far from the farmer's face (Lembata lesson).
    // v2: farmer moved on-axis for the shot-4 camera (v1: at
    // FARMER_SPOT x -1.6 he was ~30 deg off-axis = off-frame);
    // beans small + resting on the ground (v1: floating discs).
    farmerAt(2.2, -4.2, "grin");
    beanFx(1.4, 0.15, -4.6, 0.5);
    beanFx(2.9, 0.15, -4.8, 0.4);
    cherriesFx();
    card("cardWash", ["DICUCI", "BERSIH"], 0, 2.6, -11, 4.6, 0.36);
  } else if (id === 5) {
    // THE TASTE: the hero holds the cup, steam rising, beans
    // drying on the racks behind him
    heroAt(1.8, 0, -3.0, "nervous", -0.15, { wave: 0.3 });
    // the cup sits IN the hero's raised hand (hand ≈ (2.45, 1.55, -2.7))
    cupFx(2.45, 1.55, -2.7, 1.6, 1.6);
    // v2: farmer on-axis for the shot-5 camera (v1: x 4.2 was off-frame right).
    farmerAt(2.6, -3.8, "laugh");
    cherriesFx();
    card("cardBitter", ["NGGAK", "PAHIT"], 0, 3.0, -8, 3.0, 0.5);
  } else if (id === 6) {
    // THE PRICE: sacks of beans + the $1000/KG board, the hero
    // counts on his fingers — the payoff number lands
    heroAt(2.8, 0, -2.8, "laugh", 0, { wave: 0.8 });
    // v2b: farmer DROPPED from this shot — the frame is only ~4.9 m
    // wide at this depth (hero 1.6 m + farmer 1.6 m + sack 2.4 m
    // cannot sit side by side), so the farmer always covered the
    // sack. One clear sack left of the hero, KOPI text fully visible.
    sackFx(0.6, 0, -4.6, 2.4);
    cherriesFx();
    card("cardPrice", ["$1000/KG"], 0, 2.6, -4.5, 4.0, 0.5);
  } else if (id === 7) {
    // THE PUNCHLINE LOOP: back on the cover framing in golden
    // light — the hero sips, the luwak laughs from its branch.
    // Loop to frame 0.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "laugh", -0.15, { wave: 0.7 });
    luwakAt(LUWAK_SPOT[0], LUWAK_SPOT[2]);
    cupFx(CUP_SPOT[0], 2.1, CUP_SPOT[2], 4.2, 4.2);
    cherriesFx();
    card("cardPunch", ["SELERA", "MUSANG"], 0, 2.6, -8, 5.0, 0.52);
  }
  return out;
};
export { FPS };
