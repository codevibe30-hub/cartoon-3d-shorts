// The cast of the Pasola short as lit flat sprites in the 3D
// world: the series hero narrator reacting beside the charge,
// the Rato (Marapu elder) who reads the nyale omen, the two
// ikat-bright rider ranks seated on the 3D horses, and the
// crowd pressed against the arena fences — plus the giant
// claim card. Same pool + card machinery as the house style:
// one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always
// sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, FIELD_Y, HERO_SPOT, TOMB, RACK, RATO_SPOT, SPROUT, riderAt } from "./story";
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
  g.save();
  g.shadowColor = "rgba(24,14,0,0.55)"; g.shadowBlur = 22; g.shadowOffsetX = 7; g.shadowOffsetY = 13;
  rr(bx, by, bw, bh, br); g.fillStyle = bg; g.fill();
  g.restore();
  const grad = g.createLinearGradient(bx, by, bx + bw * 0.35, by + bh);
  grad.addColorStop(0, "#ffdf52"); grad.addColorStop(0.45, "#f6c21c"); grad.addColorStop(1, "#eda30c");
  rr(bx, by, bw, bh, br); g.fillStyle = grad; g.fill();
  const rs = rng(77);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${rs() > 0.5 ? "255,246,200" : "120,70,0"},${0.03 + rs() * 0.05})`;
    g.fillRect(bx + rs() * bw, by + rs() * bh, 2.4, 2.4);
  }
  g.save(); rr(bx, by, bw, bh, br); g.clip();
  const sheen = g.createLinearGradient(0, by, 0, by + bh * 0.62);
  sheen.addColorStop(0, "rgba(255,255,255,0.42)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.fillRect(bx, by, bw, bh * 0.62);
  const gloss = g.createLinearGradient(bx, by, bx + bw, by + bh);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)"); gloss.addColorStop(0.35, "rgba(255,255,255,0)"); gloss.addColorStop(1, "rgba(120,60,0,0.10)");
  g.fillStyle = gloss; g.fillRect(bx, by, bw, bh);
  g.restore();
  rr(bx, by, bw, bh, br); g.lineWidth = 13; g.strokeStyle = INK; g.stroke();
  rr(bx + 13, by + 13, bw - 26, bh - 26, br - 11); g.lineWidth = 3; g.strokeStyle = "rgba(122,72,0,0.65)"; g.stroke();
  for (const [rx, ry] of [[bx + 30, by + 30], [bx + bw - 30, by + 30], [bx + 30, by + bh - 30], [bx + bw - 30, by + bh - 30]]) {
    g.fillStyle = "#3a2a10"; g.beginPath(); g.arc(rx, ry, 6.5, 0, 7); g.fill();
    g.fillStyle = "rgba(255,240,200,0.85)"; g.beginPath(); g.arc(rx - 2, ry - 2, 2.2, 0, 7); g.fill();
  }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const fs = fitFont(lines, maxFs, g, bw - 64);
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2", skin: "#d99e63" }, okey: "pasolaHero" };
// RATO: the Marapu elder — deep-red ikat headcloth, maroon cloth.
const RATO: Who = { i: 51, o: { jacket: "#7a2e2e", pants: "#4a3423", boots: "#3a2a16", hat: "cap", cap: "#b03a2e", skin: "#a06a3c" }, okey: "pasolaRato" };
// THE RIDERS: crimson rank (A) vs indigo rank (B), ikat caps.
const SKINS = ["#c98a5a", "#a06a3c", "#8a5a30", "#e0aa72"];
const RIDER_A = (idx: number): Who => ({ i: 71 + idx, o: { jacket: "#c22e2e", pants: "#3a2c1c", boots: "#2c1e10", hat: "cap", cap: "#e8c832", skin: SKINS[idx % 4] }, okey: "pasolaRiderA" + idx });
const RIDER_B = (idx: number): Who => ({ i: 81 + idx, o: { jacket: "#2e4a9e", pants: "#2c2434", boots: "#2c1e10", hat: "cap", cap: "#f2ede2", skin: SKINS[(idx + 1) % 4] }, okey: "pasolaRiderB" + idx });
// VILLAGERS: the crowd at the fences.
const VILLAGERS: Who[] = [
  { i: 61, o: { jacket: "#e07840", pants: "#4a5a3a", boots: "#5a3b2a", hat: "hair", hair: "#1c1712", skin: "#c98a5a" }, okey: "pasolaVil1" },
  { i: 62, o: { jacket: "#3f74b5", dress: "#e8e3d5", pants: "#5a4632", boots: "#8a5a34", hat: "hair", hair: "#2a1a10", skin: "#a06a3c" }, okey: "pasolaVil2" },
  { i: 63, o: { jacket: "#58a05c", pants: "#3a3f66", boots: "#3a2c1c", hat: "cap", cap: "#c93b30", skin: "#8a5a30" }, okey: "pasolaVil3" },
  { i: 64, o: { jacket: "#b03a6e", pants: "#4c3423", boots: "#5a3b2a", hat: "cap", cap: "#f2c14e", skin: "#e0aa72" }, okey: "pasolaVil4" },
  { i: 65, o: { jacket: "#7a4a9e", pants: "#37474f", boots: "#3a2c1c", hat: "hair", hair: "#33261a", skin: "#c98a5a" }, okey: "pasolaVil5" },
];

// ---------------- episode props (drawn, never pasted) ----------------
const srand = (seed: number) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};
/** The nyale in the Rato's cupped hands (384x256): a wriggling
 *  knot of bright sea worms over two dark palms — fat and
 *  colourful, the good-harvest omen. */
const drawNyale = (p: Pen) => {
  const g = p.g, w = 384, h = 256;
  const r = srand(41);
  g.fillStyle = "#a06a3c";
  g.beginPath(); g.ellipse(w * 0.38, h * 0.78, w * 0.30, h * 0.20, -0.25, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.64, h * 0.78, w * 0.30, h * 0.20, 0.25, 0, 7); g.fill();
  g.fillStyle = "rgba(70,44,20,0.35)";
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.ellipse(w * (0.24 + i * 0.17), h * 0.66, w * 0.045, h * 0.10, (i - 1.5) * 0.2, 0, 7); g.fill();
  }
  const cols = ["#d8402e", "#39a047", "#e8862e", "#7a3fae", "#e86a9a", "#f2c018", "#2e9ec9"];
  for (let i = 0; i < 9; i++) {
    const cx = w * (0.22 + r() * 0.56), cy = h * (0.30 + r() * 0.30);
    g.strokeStyle = cols[i % cols.length];
    g.lineWidth = 11 + r() * 5; g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx - 34, cy);
    g.bezierCurveTo(cx - 12, cy - 20 - r() * 14, cx + 14, cy + 16 + r() * 10, cx + 36, cy - 6);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.beginPath(); g.arc(cx - 8, cy - 6, 3.2, 0, 7); g.fill();
  }
};
/** Falling blood drops for the twist shot (128x256). */
const drawDrops = (p: Pen) => {
  const g = p.g, w = 128, h = 256;
  g.fillStyle = "#c22a20";
  const drop = (x: number, y: number, s: number) => {
    g.beginPath();
    g.moveTo(x, y - s * 1.6);
    g.bezierCurveTo(x + s, y - s * 0.4, x + s * 0.8, y + s * 0.6, x, y + s * 0.8);
    g.bezierCurveTo(x - s * 0.8, y + s * 0.6, x - s, y - s * 0.4, x, y - s * 1.6);
    g.fill();
  };
  drop(w * 0.5, h * 0.22, 13);
  drop(w * 0.3, h * 0.52, 10);
  drop(w * 0.66, h * 0.68, 11);
  drop(w * 0.44, h * 0.86, 8);
};
/** A flat red splash where the blood meets the soil (128x128). */
const drawSplash = (p: Pen) => {
  const g = p.g, w = 128, h = 128;
  const r = srand(19);
  g.fillStyle = "rgba(178,34,24,0.85)";
  g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.30, h * 0.30, 0.3, 0, 7); g.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r() * 0.5;
    g.beginPath();
    g.ellipse(w / 2 + Math.cos(a) * w * (0.3 + r() * 0.14), h / 2 + Math.sin(a) * h * (0.3 + r() * 0.14), 4 + r() * 7, 3 + r() * 5, a, 0, 7);
    g.fill();
  }
};
/** A soft clash-dust cloud where the two charges meet (256x144). */
const drawDust = (p: Pen) => {
  const g = p.g, w = 256, h = 144;
  const r = srand(7);
  for (let i = 0; i < 16; i++) {
    const x = w * (0.15 + r() * 0.7), y = h * (0.3 + r() * 0.45), rad = 16 + r() * 34;
    const gr = g.createRadialGradient(x, y, 2, x, y, rad);
    gr.addColorStop(0, "rgba(216,182,128,0.5)"); gr.addColorStop(1, "rgba(216,182,128,0)");
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
};

// ---------------- staging ----------------
const RIDER_Y = FIELD_Y + 1.55; // sprite origin at the saddle
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
  // so they are always centred in frame, with the FIT GUARD clamping
  // the vertical offset so the whole board stays in the real FOV.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60, soft = false) => {
    let x: number, y: number, z: number, d: number;
    if (cam.dir) {
      const distT = cam.pos.distanceTo(tmp.set(tx, ty, tz)) * frac;
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
  // the hero, with the idle life in his body (a breath bob)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_SPOT[0], z = HERO_SPOT[2], y = FIELD_Y, extra: Partial<FrontOpts> = {}) => {
    const yy = y + Math.sin(t * 2.2) * 0.012;
    out.places.push(stand(HERO, x, yy, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // the riders, seated on the horses world.ts is moving under them
  const riders = () => {
    for (const side of [0, 1] as const) {
      for (let idx = 0; idx < 4; idx++) {
        const pose = riderAt(id, side, idx, t);
        if (pose.mode === "gone") continue;
        const charging = pose.mode === "charge";
        const bob = charging ? Math.abs(Math.sin(t * 8.6 + idx * 1.3 + side * 2.1)) * 0.05 : Math.sin(t * 1.6 + idx) * 0.008;
        const expr: Expr = id === 8 && side === 1 && idx === 0 ? "nervous" : charging ? "stern" : "neutral";
        const who = side === 0 ? RIDER_A(idx) : RIDER_B(idx);
        out.places.push(person(cam, who, pose.x, RIDER_Y + bob, pose.z,
          { mode: "sit", expr, blink: lidAt(t, who.i), look: 0 }, 1.02));
      }
    }
  };
  const fenceCrowd = (spots: [number, number][], exprs: Expr[], base = 0) => {
    spots.forEach(([x, z], i) => {
      const who = VILLAGERS[(i + base) % VILLAGERS.length];
      out.places.push(stand(who, x, 0.08, z, exprs[i % exprs.length], 0, i % 3 === 0 ? { wave: 1 } : {}, 0.92 + (i % 3) * 0.04));
      blob(out, x, 0.08, z, 0.95);
    });
  };

  riders();

  if (id === 1 || id === 10) {
    // THE CHARGE (cover + punchline loop): two riders already at
    // full gallop head-on, spears in the air, dust flying — the
    // hero BIG beside them, shocked (1) / laughing (10), the
    // claim one GIANT board.
    heroAt(id === 1 ? "shock" : "laugh", -0.15, 1.4, HERO_SPOT[0], HERO_SPOT[2], FIELD_Y, { wave: 1 });
    fenceCrowd([[-13.4, -2], [-13.4, 6], [-13.4, 15], [-13.4, 23]], id === 1 ? ["shock", "grin"] : ["grin"]);
    card(id === 1 ? "cardHook" : "cardHook2", ["PERANG", "BERKUDA?!"], -1, 2.2, -8, 5.2, 0.55);
    const la = riderAt(id, 0, 0, t), lb = riderAt(id, 1, 0, t);
    if (Math.abs(la.z - lb.z) < 9) {
      const sc = 3.4 * (1 - Math.abs(la.z - lb.z) / 9) + 0.8;
      out.fx.push({ key: "dustclash" + id, cw: 256, ch: 144, draw: drawDust, x: 0, y: 1.1, z: (la.z + lb.z) / 2, w: sc, h: sc * 0.55, soft: true });
    }
  } else if (id === 2) {
    // THE STANDOFF: high wide — both ranks drawn up, the crowd
    // ringing the fences, tombs and uma roofs around the field
    heroAt("grin", 0, 1.0, -9, 24);
    const west: [number, number][] = [], east: [number, number][] = [];
    for (let i = 0; i < 8; i++) { west.push([-13.3, -40 + i * 11]); east.push([13.3, -36 + i * 11]); }
    fenceCrowd(west, ["grin", "shock"]);
    fenceCrowd(east, ["shock", "grin"], 2);
    card("cardName", ["PASOLA!"], 0, 1, -14, 4.6, 0.5);
  } else if (id === 3) {
    // THE FULL CHARGE: the camera rides with the crimson lead;
    // the hero watches open-mouthed from the west fence
    heroAt("shock", 0.1, 1.1, -11.9, -20, 0.08);
    fenceCrowd([[13.3, -30], [13.3, -8], [13.3, 14], [13.3, 36], [13.3, 52]], ["shock"], 1);
    const lead = riderAt(3, 0, 0, t);
    card("cardScale", ["100+", "PENUNGGANG!"], lead.x, 1.6, lead.z, 4.2, 0.5);
  } else if (id === 4) {
    // THE PRAYER: the hero and the Rato before the great tomb,
    // the ranks hushed in one line behind them
    heroAt("neutral", 0, 1.25, -6.6, 20.6);
    out.places.push(stand(RATO, -8.9, FIELD_Y, 19.4, "stern", 0, {}, 1.12)); blob(out, -8.9, FIELD_Y, 19.4, 1.12);
    out.places.push(stand(VILLAGERS[1], -14.5, 0.08, 24, "neutral", 0, {}, 0.9)); blob(out, -14.5, 0.08, 24, 0.9);
    out.places.push(stand(VILLAGERS[3], 3.5, 0.08, 18, "neutral", 0, {}, 0.9)); blob(out, 3.5, 0.08, 18, 0.9);
    card("cardPrayer", ["DOA", "LELUHUR!"], TOMB[0] + 0.8, 1.2, TOMB[2] + 1, 3.8, 0.5);
  } else if (id === 5) {
    // THE NYALE DAWN (re-hook): the Rato bent over the shoreline
    // gathering the first worms, the hero stunned beside him
    out.places.push(stand(RATO, RATO_SPOT[0], RATO_SPOT[1], RATO_SPOT[2], "neutral", 0, { tilt: 10 }, 1.05)); blob(out, RATO_SPOT[0], RATO_SPOT[1], RATO_SPOT[2], 1.05);
    heroAt("shock", 0.1, 1.3, -3.8, -105.2, 0.02);
    out.places.push(stand(VILLAGERS[0], 4.5, 0.02, -103, "neutral", 0, {}, 0.95)); blob(out, 4.5, 0.02, -103, 0.95);
    out.places.push(stand(VILLAGERS[2], 7.2, 0.02, -100, "grin", 0, {}, 0.95)); blob(out, 7.2, 0.02, -100, 0.95);
    card("cardNyale", ["GARA-GARA", "CACING?!"], RATO_SPOT[0], 0.8, RATO_SPOT[2], 3.7, 0.5);
  } else if (id === 6) {
    // THE OMEN, CLOSE: the Rato holds the fat, colourful nyale
    // up for the hero — the card rides HIGH, clear of both faces
    out.places.push(stand(RATO, RATO_SPOT[0], RATO_SPOT[1], RATO_SPOT[2], "grin", 0, { tilt: 6 }, 1.25)); blob(out, RATO_SPOT[0], RATO_SPOT[1], RATO_SPOT[2], 1.25);
    heroAt("grin", -0.1, 1.3, 1.3, -106.4, 0.02);
    out.fx.push({ key: "nyalehands", cw: 384, ch: 256, draw: drawNyale, x: RATO_SPOT[0] + 0.55, y: 1.08, z: RATO_SPOT[2] - 0.35, w: 0.95, h: 0.63, soft: true });
    // the card stays LOW over the shoreline: both faces ride
    // the upper frame, clear of the board (close-up rule)
    card("cardOmen", ["PERTANDA", "PANEN!"], RATO_SPOT[0] + 0.2, 0.6, RATO_SPOT[2], 0.55, 0.44);
  } else if (id === 7) {
    // THE BLUNT SPEARS: the hero at the rack, showing off the
    // rounded tips; one rider of each side waits behind
    heroAt("grin", 0.1, 1.32, 5.2, 20.2, FIELD_Y, { wave: 1 });
    out.places.push(stand(VILLAGERS[4], 2.2, 0.08, 24.5, "neutral", 0, {}, 0.95)); blob(out, 2.2, 0.08, 24.5, 0.95);
    card("cardBlunt", ["UJUNGNYA", "TUMPUL!"], RACK[0], 1.2, RACK[2], 3.8, 0.5);
  } else if (id === 8) {
    // THE TWIST: the charge again — the indigo lead clutches
    // past bleeding, drops fall, and where they land the rice
    // answers (world.ts grows the sprouts)
    heroAt("shock", -0.1, 1.15, 12.9, -4);
    fenceCrowd([[-13.4, -18], [-13.4, 2], [-13.4, 20]], ["shock"], 2);
    const wb = riderAt(8, 1, 0, t);
    if (U > 0.3 && U < 0.72) {
      const du = (U - 0.3) / 0.42;
      out.fx.push({ key: "blooddrops", cw: 128, ch: 256, draw: drawDrops, x: wb.x + 0.3, y: 1.75 - du * 1.35, z: wb.z, w: 0.5, h: 0.9, soft: true });
    }
    if (U > 0.5) out.fx.push({ key: "bloodpool", cw: 128, ch: 128, draw: drawSplash, x: SPROUT[0], y: FIELD_Y + 0.04, z: SPROUT[2], w: 1.1, h: 1.1, flat: true });
    card("cardTwist", ["DARAH =", "BERKAH?!"], 0, 1.4, 0, 4.4, 0.52);
  } else if (id === 9) {
    // THE ARENA: across the field from the west fence — the
    // riders blast past in the mid-ground and the crowd roars
    // from the far fence, the hero cheering among them
    heroAt("grin", 0, 1.18, 13.0, 1, FIELD_Y, { wave: 1 });
    fenceCrowd([[13.4, -3], [13.5, 3.5], [13.3, 6.5], [13.6, -6.5], [13.4, 10]], ["grin", "shock"]);
    card("cardArena", ["TIAP", "FEB-MARET!"], 2, 1.5, -4, 4.2, 0.5);
  }
  return out;
};
export { FPS };
