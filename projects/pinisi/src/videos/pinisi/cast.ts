// The cast of the Pinisi frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// marvelling at the giant hull, the PUNGGAWA — the elder master
// shipwright in batik shirt and headcloth, grey moustache —
// and a young WORKER shipwright with an adze. Props — the
// GIANT pinisi hull with two masts, hull under construction,
// timber planks, wooden pegs, a ritual offering tray, the
// UNESCO flag. Same pool + card machinery as the house style:
// one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always
// sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, PUNGGAWA_SPOT, WORKER_SPOT, leavesAt } from "./story";
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
// In this episode he marvels at the giant pinisi hull.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "pinisiHero" };
// PUNGGAWA: the elder master shipwright — batik-brown shirt,
// dark sarong, grey hair + grey moustache, the design of the
// whole ship in his head.
const PUNGGAWA: Who = { i: 55, o: { jacket: "#8a5a2e", pants: "#2e3440", boots: "#2a2a2e", hat: "hair", hair: "#d8d8d8", moustache: "#d8d8d8", skin: "#c98f5f" }, okey: "pinisiPunggawa" };
// WORKER: a young shipwright — green shirt, cap, adze in hand.
const WORKER: Who = { i: 77, o: { jacket: "#3f7d5a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8d44a", skin: "#d9a06a" }, okey: "pinisiWorker" };

// ---------------- episode props (drawn, never pasted) ----------------
/** The GIANT pinisi hull with two masts — the episode's visual
 *  signature. 1024x512 canvas: long wooden hull, plank seams,
 *  white sheer stripe, stern cabin, two tall masts with furled
 *  tan sails, support blocks + sand beneath. */
export const drawPinisiHull = (p: Pen) => {
  const g = p.g;
  // sand mound under the hull
  g.fillStyle = "#d9b06a";
  g.beginPath(); g.ellipse(512, 470, 460, 34, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "#8a6a32"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(512, 470, 460, 34, 0, Math.PI, 0); g.stroke();
  // support blocks
  for (const bx of [240, 512, 784]) {
    g.fillStyle = "#5d4028";
    g.beginPath(); g.roundRect(bx - 26, 420, 52, 52, 6); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 4;
    g.beginPath(); g.roundRect(bx - 26, 420, 52, 52, 6); g.stroke();
  }
  // hull — big curved wooden body
  g.fillStyle = "#7d5a34";
  g.beginPath();
  g.moveTo(90, 300);
  g.quadraticCurveTo(180, 430, 512, 430);
  g.quadraticCurveTo(844, 430, 934, 300);
  g.lineTo(900, 260);
  g.quadraticCurveTo(512, 330, 124, 260);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 9;
  g.beginPath();
  g.moveTo(90, 300);
  g.quadraticCurveTo(180, 430, 512, 430);
  g.quadraticCurveTo(844, 430, 934, 300);
  g.lineTo(900, 260);
  g.quadraticCurveTo(512, 330, 124, 260);
  g.closePath(); g.stroke();
  // plank seams along the hull
  g.strokeStyle = "rgba(40,22,8,0.55)"; g.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const y = 300 + i * 30;
    g.beginPath(); g.moveTo(150, y - 8); g.quadraticCurveTo(512, y + 22, 874, y - 8); g.stroke();
  }
  // white sheer stripe
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.moveTo(124, 260); g.quadraticCurveTo(512, 330, 900, 260); g.lineTo(894, 282); g.quadraticCurveTo(512, 348, 130, 282); g.closePath(); g.fill();
  // stern cabin
  g.fillStyle = "#6a4a2a";
  g.beginPath(); g.roundRect(760, 190, 130, 80, 10); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(760, 190, 130, 80, 10); g.stroke();
  g.fillStyle = "#ffd98a";
  g.beginPath(); g.roundRect(786, 214, 26, 26, 4); g.fill();
  g.beginPath(); g.roundRect(836, 214, 26, 26, 4); g.fill();
  // bow post rising high
  g.strokeStyle = "#5d4028"; g.lineWidth = 16; g.lineCap = "round";
  g.beginPath(); g.moveTo(112, 280); g.lineTo(84, 190); g.stroke();
  // two masts
  for (const mx of [380, 660]) {
    g.strokeStyle = "#5d4028"; g.lineWidth = 14; g.lineCap = "round";
    g.beginPath(); g.moveTo(mx, 300); g.lineTo(mx, 40); g.stroke();
    // furled tan sail bundled on the yard
    g.fillStyle = "#e8d9a8";
    g.beginPath(); g.roundRect(mx - 90, 96, 180, 26, 12); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 5;
    g.beginPath(); g.roundRect(mx - 90, 96, 180, 26, 12); g.stroke();
    // rigging lines
    g.strokeStyle = "rgba(28,21,3,0.7)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(mx, 44); g.lineTo(mx - 150, 300); g.stroke();
    g.beginPath(); g.moveTo(mx, 44); g.lineTo(mx + 150, 300); g.stroke();
  }
  // gloss stripe on the hull
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath(); g.ellipse(512, 360, 320, 26, 0, 0, 7); g.fill();
};
/** A hull under construction — planks half-fitted, ribs
 *  exposed, scaffolding poles. 512x256 canvas. */
export const drawHullBuilding = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#d9b06a";
  g.beginPath(); g.ellipse(256, 232, 230, 18, 0, Math.PI, 0); g.fill();
  // ribs (frames) standing up
  g.strokeStyle = "#6a4a2a"; g.lineWidth = 10; g.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const x = 80 + i * 88;
    g.beginPath(); g.moveTo(x, 210); g.lineTo(x + (i % 2 ? -14 : 14), 110); g.stroke();
  }
  // planks fitted on the lower half only
  g.fillStyle = "#7d5a34";
  g.beginPath(); g.moveTo(40, 150); g.lineTo(472, 150); g.lineTo(440, 210); g.lineTo(72, 210); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(40, 150); g.lineTo(472, 150); g.lineTo(440, 210); g.lineTo(72, 210); g.closePath(); g.stroke();
  g.strokeStyle = "rgba(40,22,8,0.55)"; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(60, 168 + i * 14); g.lineTo(452, 168 + i * 14); g.stroke();
  }
  // scaffolding poles leaning on the hull
  g.strokeStyle = "#5d4028"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(120, 40); g.lineTo(150, 210); g.stroke();
  g.beginPath(); g.moveTo(392, 40); g.lineTo(362, 210); g.stroke();
};
/** A long timber plank with wood grain — 512x128 canvas. */
export const drawPlank = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#8a6238";
  g.beginPath(); g.roundRect(10, 34, 492, 60, 8); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(10, 34, 492, 60, 8); g.stroke();
  g.strokeStyle = "rgba(60,35,15,0.6)"; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.moveTo(20, 46 + i * 12); g.lineTo(492, 44 + i * 12); g.stroke();
  }
};
/** Wooden pegs (dowels) hammered into a plank end — 256x256 canvas. */
export const drawPegs = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#7d5a34";
  g.beginPath(); g.roundRect(28, 60, 200, 130, 10); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(28, 60, 200, 130, 10); g.stroke();
  for (const [px, py] of [[80, 105], [176, 105], [128, 150]] as const) {
    g.fillStyle = "#c9a06a";
    g.beginPath(); g.arc(px, py, 20, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 5;
    g.beginPath(); g.arc(px, py, 20, 0, 7); g.stroke();
    g.fillStyle = "#8a6238";
    g.beginPath(); g.arc(px, py, 8, 0, 7); g.fill();
  }
};
/** A ritual offering tray: banana leaf, rice cone, flowers,
 *  incense smoke — 512x256 canvas. */
export const drawOffering = (p: Pen) => {
  const g = p.g;
  // banana leaf base
  g.fillStyle = "#3f7d38";
  g.beginPath(); g.ellipse(256, 190, 210, 44, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c3a1c"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(256, 190, 210, 44, 0, 0, 7); g.stroke();
  // rice cone (tumpeng)
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.moveTo(256, 60); g.lineTo(316, 178); g.lineTo(196, 178); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(256, 60); g.lineTo(316, 178); g.lineTo(196, 178); g.closePath(); g.stroke();
  // flowers around the cone
  for (const [fx, fy, col] of [[180, 170, "#e2453c"], [332, 170, "#f6c21c"], [220, 186, "#c25a7a"], [292, 186, "#f4f1ea"]] as const) {
    g.fillStyle = col;
    g.beginPath(); g.arc(fx, fy, 12, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 3;
    g.beginPath(); g.arc(fx, fy, 12, 0, 7); g.stroke();
  }
  // incense smoke curling up
  g.strokeStyle = "rgba(244,241,234,0.85)"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(256, 56); g.bezierCurveTo(236, 30, 276, 16, 256, -6); g.stroke();
};
/** The UNESCO flag: blue field, white temple glyph + UNESCO
 *  text — 256x512 canvas. */
export const drawFlagUNESCO = (p: Pen) => {
  const g = p.g;
  g.strokeStyle = "#5d4028"; g.lineWidth = 10; g.lineCap = "round";
  g.beginPath(); g.moveTo(64, 480); g.lineTo(64, 40); g.stroke();
  g.fillStyle = "#1e4a8a";
  g.beginPath(); g.moveTo(64, 44); g.lineTo(210, 70); g.lineTo(64, 120); g.closePath(); g.fill();
  g.strokeStyle = "#1c1c22"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(64, 44); g.lineTo(210, 70); g.lineTo(64, 120); g.closePath(); g.stroke();
  g.fillStyle = "#f4ead2"; g.beginPath(); g.arc(64, 40, 10, 0, 7); g.fill();
  g.strokeStyle = "#1c1c22"; g.lineWidth = 4;
  g.beginPath(); g.arc(64, 40, 10, 0, 7); g.stroke();
  g.fillStyle = "#f4ead2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 30px 'Arial Black', Arial, sans-serif";
  g.fillText("UNESCO", 130, 180);
  g.fillText("2017", 130, 222);
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
  // the GIANT pinisi hull — the hook prop, rising on the beach
  const hullBigFx = (x: number, y: number, z: number, w: number, h: number) => {
    out.fx.push({ key: "hullBig", cw: 1024, ch: 512, draw: drawPinisiHull, x, y, z, w, h, soft: true });
  };
  const hullBuildFx = (x: number, y: number, z: number, w = 4.5) => {
    out.fx.push({ key: "hullBuild", cw: 512, ch: 256, draw: drawHullBuilding, x, y, z, w, h: w / 2, soft: true });
  };
  const plankFx = (x: number, y: number, z: number, w = 3.0) => {
    out.fx.push({ key: "plank", cw: 512, ch: 128, draw: drawPlank, x, y, z, w, h: w / 4, soft: true });
  };
  const pegsFx = (x: number, y: number, z: number, w = 1.2) => {
    out.fx.push({ key: "pegs", cw: 256, ch: 256, draw: drawPegs, x, y, z, w, h: w, soft: true });
  };
  const offeringFx = (x: number, y: number, z: number, w = 2.6) => {
    out.fx.push({ key: "offering", cw: 512, ch: 256, draw: drawOffering, x, y, z, w, h: w / 2, soft: true });
  };
  const flagFx = (x: number, y: number, z: number, w = 1.6) => {
    out.fx.push({ key: "flagUNESCO", cw: 256, ch: 512, draw: drawFlagUNESCO, x, y, z, w, h: w * 2, soft: true });
  };
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = -0.15, extra: Partial<FrontOpts> = {}, scale = 1.5) =>
    out.places.push(stand(HERO, x, y, z, expr, look, extra, scale));
  const punggawaAt = (x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(PUNGGAWA, x, 0, z, expr, 0.1, extra, 1.5));
  const workerAt = (x: number, z: number, expr: Expr = "neutral", extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(WORKER, x, 0, z, expr, -0.1, extra, 1.5));

  if (id === 1) {
    // THE COVER (frame 0) — UJI 1 DETIK: the GIANT PINISI HULL
    // rising on the beach reads as the anomaly in one second
    // with NO text and NO VO: a wooden ship being built by hand,
    // the punggawa carving wood with a hammer, and NO paper /
    // blueprint anywhere in the frame. The hero shocked BESIDE
    // it near the camera axis, the claim GIANT.
    // (Santa v2 lesson: hero/punggawa at x 1.2/-0.8 — near the
    // axis, ~2 deg / ~8 deg off-axis from the cover camera.)
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "shock", -0.15, { wave: 0.7 });
    punggawaAt(PUNGGAWA_SPOT[0], PUNGGAWA_SPOT[2], "grin", { prop: ["hammer", 0.6] });
    hullBigFx(0, 1.6, -8, 6.4, 3.2);
    card("cardHook", ["TANPA", "GAMBAR"], 0, 2.6, -8, 5.0, 0.52);
  } else if (id === 2) {
    // THE WIDE: the whole beach boatyard, hulls in stages,
    // timber stacks, the sea behind, palms lining the sides
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "grin", 0);
    punggawaAt(PUNGGAWA_SPOT[0], PUNGGAWA_SPOT[2], "grin", { wave: 0.5 });
    workerAt(WORKER_SPOT[0], WORKER_SPOT[2], "neutral");
    hullBuildFx(-1.5, 1.0, -12, 4.5);
    hullBigFx(2.0, 1.6, -18, 5.6, 2.8);
    card("cardYard", ["TANA", "BERU"], 0, 3.0, -10, 4.2, 0.5);
  } else if (id === 3) {
    // THE MASTER'S EYE: close on the punggawa measuring the
    // timber by eye and hand — no ruler, no drawing. The
    // plank sits IN FRONT of the punggawa (z -3.2, 0.2 m in
    // front) so his body never hides it (Lempar HP v3 depth
    // lesson).
    punggawaAt(PUNGGAWA_SPOT[0], PUNGGAWA_SPOT[2], "grin", { wave: 0.5 });
    workerAt(0.6, -3.6, "neutral");
    plankFx(-0.4, 0.9, -3.2, 3.0);
    card("cardHead", ["DI", "KEPALA"], 0, 2.6, -4.5, 4.2, 0.5);
  } else if (id === 4) {
    // THE PLANKS: hull planking goes up before the ribs —
    // wooden pegs hammered in, never iron nails. The pegs sit
    // LEFT of the worker (x -0.6) and 0.3 m IN FRONT of him
    // so they clear his body.
    heroAt(1.6, 0, -2.6, "laugh", -0.15, { wave: 0.8 });
    workerAt(0.2, -3.4, "laugh", { wave: 1.0 });
    hullBuildFx(-0.5, 1.0, -12, 4.5);
    pegsFx(-0.6, 1.0, -3.1, 1.2);
    card("cardPegs", ["PASAK", "KAYU"], 0, 2.6, -8, 4.0, 0.5);
  } else if (id === 5) {
    // THE RITUAL: offerings at the keel — the punggawa prays,
    // workers gather around. The offering tray stands IN
    // FRONT of the actors' line (z -3.0 vs actors at -3.4)
    // so no body hides it.
    heroAt(1.6, 0, -2.6, "grin", -0.15, { wave: 0.5 });
    punggawaAt(0.4, -3.6, "grin");
    offeringFx(0, 0.8, -3.0, 2.6);
    card("cardRitual", ["RITUAL", "ADAT"], 0, 2.6, -8, 4.6, 0.5);
  } else if (id === 6) {
    // THE FINISHED SHIP: the 40 m hull + the UNESCO flag.
    // The flag stands LEFT of the hero (x -0.6) and 0.3 m
    // IN FRONT of him so it clears his body.
    heroAt(1.4, 0, -2.8, "grin", -0.15, { wave: 0.5 });
    flagFx(-0.6, 0, -2.5, 1.6);
    hullBigFx(1.9, 1.6, -8, 5.6, 2.8);
    card("cardUnesco", ["UNESCO", "2017"], 0, 2.6, -8, 4.6, 0.5);
  } else if (id === 7) {
    // THE PUNCHLINE LOOP: back on the cover framing in golden
    // light — the punggawa laughs, the hero laughs, the hull
    // rises on the beach. Loop to frame 0.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "laugh", -0.15, { wave: 0.7 });
    punggawaAt(PUNGGAWA_SPOT[0], PUNGGAWA_SPOT[2], "laugh", { wave: 1.0 });
    hullBigFx(0, 1.6, -8, 6.4, 3.2);
    card("cardPunch", ["DARI", "INGATAN"], 0, 2.6, -8, 5.0, 0.52);
  }
  return out;
};
export { FPS };
