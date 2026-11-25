// The cast of the Debus short as lit flat sprites in the
// 3D world: the series hero narrator reacting beside the
// act, the debus performer himself (custom-drawn poses: the
// iron spike pressed to his belly, the spike pressed to his
// forearm, a burning torch in hand with a coconut balanced
// on his head), the mallet assistant whose godo strikes in
// rhythm, the white-robed syekh, the gendang musicians, the
// crowd, and the sultanate soldiers of the flashback — plus
// the giant claim card. Same pool + card machinery as the
// house style: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs. The
// claim card floats as an ink-outlined board via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the
// view axis so it always sits in frame. All weapon contact
// is stage-pose only: blades rest ON skin, never in it.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, FLOOR_Y, MAT, PERF, ASST, HERO_HOOK, SYEKH, MUS1, MUS2, HERO_TORCH, HERO_CROWD, SYEKH_SIT, HERO_DZIKIR, STAND, HERO_TOOL, SYEKH8, HERO_FEST, FIELD_SPOT, HERO_WAR, strikeAt, pressAt } from "./story";
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
/** The claim board, painted RICH (anti-flat): a deep drop
 *  shadow floating off the board, a diagonal amber gradient
 *  with a glossy top sheen and fine grain, a double border
 *  with character (heavy ink outside, pinstripe inside),
 *  corner rivets like a real road sign, and the text itself
 *  carrying a soft shadow so it sits IN the board. */
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

// ---------------- the performer's custom poses ----------------
// Canvas layout of bodyFront (adult build): head centre
// (300, 267), chin 385, torso bottom 645, belly ≈ (300, 545).
// Every weapon here rests ON the skin in a stage pose — flat
// contact, no penetration, no wound, ever.
const drawSpike = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, wdt: number) => {
  g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = wdt + 5;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = "#c9ced6"; g.lineWidth = wdt;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(2, wdt * 0.3);
  g.beginPath(); g.moveTo(x0, y0 - wdt * 0.22); g.lineTo(x1, y1 - wdt * 0.22); g.stroke();
};
const drawWoodBlock = (g: CanvasRenderingContext2D, x: number, y: number, ang: number) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#8a5a34"; g.fillRect(-17, -26, 34, 52);
  g.strokeStyle = INK; g.lineWidth = 4.5; g.strokeRect(-17, -26, 34, 52);
  g.strokeStyle = "rgba(60,36,16,0.55)"; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(-17, -9); g.lineTo(17, -9); g.moveTo(-17, 9); g.lineTo(17, 9); g.stroke();
  g.fillStyle = "#5d6670"; g.fillRect(-19, -29, 38, 7); g.fillRect(-19, 22, 38, 7);
  g.restore();
};
/** POSE A — the spike pressed flat to the belly, its wooden
 *  base out to his left where the assistant's godo lands.
 *  `press` (0..1, quantized) leans the whole rig a touch. */
const drawPerfPress = (o: Outfit, f2: FrontOpts, press: number) => (p: Pen) => {
  bodyFront(p, o, f2);
  const g = p.g, dx = -5 * press;
  // the spike: tip resting at the belly, shaft out to the block
  drawSpike(g, 298 + dx, 548, 128 + dx, 614, 11);
  drawWoodBlock(g, 112 + dx, 622, 0.42);
  // his right forearm comes across to grip the shaft mid-way
  g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = 17;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(330, 520, 218 + dx, 588); g.stroke();
  g.strokeStyle = "#8a5a30"; g.lineWidth = 12.5;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(330, 520, 218 + dx, 588); g.stroke();
  g.fillStyle = o.skin ?? "#ffe2c2";
  g.beginPath(); g.arc(212 + dx, 590, 12, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke();
};
/** POSE B — the torch: a burning brand high in his right
 *  hand, a whole coconut balanced on his head. The live
 *  flame itself is a world sprite; this paints the brand
 *  and a base flame shape under it. */
const drawPerfTorch = (o: Outfit, f2: FrontOpts) => (p: Pen) => {
  bodyFront(p, o, f2);
  const g = p.g;
  // the coconut on his crown
  g.fillStyle = "#5d4126";
  g.beginPath(); g.arc(300, 124, 35, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4.5; g.stroke();
  g.strokeStyle = "rgba(30,20,10,0.5)"; g.lineWidth = 2.2;
  for (const a of [-0.7, -0.2, 0.35, 0.85]) {
    g.beginPath(); g.moveTo(300 + Math.cos(a) * 8, 124 + Math.sin(a) * 8);
    g.quadraticCurveTo(300 + Math.cos(a) * 24, 124 + Math.sin(a) * 24, 300 + Math.cos(a) * 33, 124 + Math.sin(a) * 33); g.stroke();
  }
  g.fillStyle = "rgba(255,235,200,0.25)";
  g.beginPath(); g.ellipse(288, 108, 12, 7, -0.5, 0, 7); g.fill();
  // right arm raised, gripping the brand
  g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = 17;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(430, 380, 452, 322); g.stroke();
  g.strokeStyle = "#8a5a30"; g.lineWidth = 12.5;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(430, 380, 452, 322); g.stroke();
  // the brand: wrapped handle up to a cloth head
  g.strokeStyle = INK; g.lineWidth = 15;
  g.beginPath(); g.moveTo(452, 330); g.lineTo(466, 252); g.stroke();
  g.strokeStyle = "#6e4a2a"; g.lineWidth = 10;
  g.beginPath(); g.moveTo(452, 330); g.lineTo(466, 252); g.stroke();
  g.fillStyle = "#3d2c1c";
  g.beginPath(); g.ellipse(468, 240, 15, 20, 0.12, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3.6; g.stroke();
  g.fillStyle = o.skin ?? "#ffe2c2";
  g.beginPath(); g.arc(452, 326, 12, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke();
};
/** POSE C — the secret: he presses the spike against his
 *  own raised left forearm with his right hand. Flat stage
 *  contact on the forearm, nothing more. */
const drawPerfArm = (o: Outfit, f2: FrontOpts) => (p: Pen) => {
  bodyFront(p, o, f2);
  const g = p.g;
  g.lineCap = "round";
  // left forearm raised horizontal across the chest
  g.strokeStyle = INK; g.lineWidth = 17;
  g.beginPath(); g.moveTo(224, 420); g.quadraticCurveTo(250, 486, 336, 478); g.stroke();
  g.strokeStyle = "#a06a38"; g.lineWidth = 12.5;
  g.beginPath(); g.moveTo(224, 420); g.quadraticCurveTo(250, 486, 336, 478); g.stroke();
  // the spike standing on the forearm, handle up
  drawSpike(g, 322, 470, 344, 336, 10);
  drawWoodBlock(g, 348, 322, -0.1);
  // right hand gripping the shaft
  g.strokeStyle = INK; g.lineWidth = 17;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(372, 380, 350, 356); g.stroke();
  g.strokeStyle = "#8a5a30"; g.lineWidth = 12.5;
  g.beginPath(); g.moveTo(378, 420); g.quadraticCurveTo(372, 380, 350, 356); g.stroke();
  g.fillStyle = o.skin ?? "#ffe2c2";
  g.beginPath(); g.arc(348, 352, 12, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke();
};
/** POSE D — the celebration: both halves of the cracked
 *  coconut held up for the crowd. */
const drawPerfCoconut = (o: Outfit, f2: FrontOpts) => (p: Pen) => {
  bodyFront(p, o, { ...f2, wave: 1 });
  const g = p.g;
  const half = (x: number, y: number, flip: number) => {
    g.save(); g.translate(x, y); g.scale(flip, 1);
    g.fillStyle = "#5d4126";
    g.beginPath(); g.arc(0, 0, 27, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 4.2; g.stroke();
    g.fillStyle = "#f4ead2";
    g.beginPath(); g.ellipse(0, 2, 24, 7.5, 0, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    g.restore();
  };
  half(472, 258, 1);
  half(128, 606, -1);
};

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2", skin: "#d99e63" }, okey: "debusHero" };
// THE PERFORMER: brown vest, red sash, red headcloth (cap), bare arms in paint.
const PERF_WHO: Who = { i: 51, o: { jacket: "#7a4a21", pants: "#2e2a33", boots: "#3a2c1c", hat: "cap", cap: "#a02318", sash: "#c0353a", buttons: "#7a4a21", skin: "#c98a5a" }, okey: "debusPerf" };
// THE ASSISTANT: blue shirt, works the godo mallet.
const ASST_WHO: Who = { i: 52, o: { jacket: "#3f74b5", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#2e4a6b", skin: "#a06a3c" }, okey: "debusAsst" };
// THE SYEKH: white robe + white peci, calm at the mat's edge.
const SYEKH_WHO: Who = { i: 53, o: { jacket: "#f2ede2", dress: "#e8e2d2", pants: "#d8d2c2", boots: "#8a7a5e", hat: "cap", cap: "#ffffff", skin: "#b98a5e" }, okey: "debusSyekh" };
// THE MUSICIANS.
const MUS_WHO: Who[] = [
  { i: 54, o: { jacket: "#58a05c", pants: "#3a3f66", boots: "#3a2c1c", hat: "cap", cap: "#c93b30", skin: "#8a5a30" }, okey: "debusMus1" },
  { i: 55, o: { jacket: "#c9562e", pants: "#4a5a3a", boots: "#5a3b2a", hat: "hair", hair: "#1c1712", skin: "#a06a3c" }, okey: "debusMus2" },
];
// THE CROWD of Banten villagers.
const CROWD: Who[] = [
  { i: 61, o: { jacket: "#c9562e", pants: "#4a5a3a", boots: "#5a3b2a", hat: "hair", hair: "#1c1712", skin: "#a06a3c" }, okey: "debusVil1" },
  { i: 62, o: { jacket: "#3f74b5", dress: "#e8c832", pants: "#5a4632", boots: "#8a5a34", hat: "hair", hair: "#2a1a10", skin: "#8a5a30" }, okey: "debusVil2" },
  { i: 63, o: { jacket: "#58a05c", pants: "#3a3f66", boots: "#3a2c1c", hat: "cap", cap: "#c93b30", skin: "#6d4525" }, okey: "debusVil3" },
  { i: 64, o: { jacket: "#b03a6e", pants: "#4c3423", boots: "#5a3b2a", hat: "cap", cap: "#f2c14e", skin: "#c98a5a" }, okey: "debusVil4" },
  { i: 65, o: { jacket: "#e8a13c", pants: "#3d4a3a", boots: "#4a3426", hat: "hair", hair: "#241a10", skin: "#7d5230" }, okey: "debusVil5" },
  { i: 66, o: { jacket: "#7a5ac9", dress: "#4a90b8", pants: "#3a3f66", boots: "#5a3b2a", hat: "hair", hair: "#171008", skin: "#9c6b40" }, okey: "debusVil6" },
];
// THE SULTANATE SOLDIERS (flashback): dark war dress, red-brown headcloths.
const SOLDIERS: Who[] = [
  { i: 71, o: { jacket: "#5a4632", pants: "#33302c", boots: "#2c2118", hat: "cap", cap: "#7a3428", skin: "#a06a3c" }, okey: "debusSol1" },
  { i: 72, o: { jacket: "#4c4438", pants: "#2e2a33", boots: "#2c2118", hat: "cap", cap: "#7a3428", skin: "#8a5a30" }, okey: "debusSol2" },
  { i: 73, o: { jacket: "#63503a", pants: "#33302c", boots: "#241c14", hat: "cap", cap: "#8a4030", skin: "#c98a5a" }, okey: "debusSol3" },
  { i: 74, o: { jacket: "#54432e", pants: "#2e2a33", boots: "#2c2118", hat: "cap", cap: "#7a3428", skin: "#6d4525" }, okey: "debusSol4" },
];
// THE COMMANDER (flashback): richer dress, a sash.
const COMMANDER: Who = { i: 75, o: { jacket: "#7a2e22", pants: "#2e2a33", boots: "#241c14", hat: "cap", cap: "#5d2018", sash: "#e8c45a", skin: "#b98a5e" }, okey: "debusCmdr" };

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1, pitch = 0) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale, pitch);
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
  // the hero, with the idle life in his body (a breath bob)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_HOOK[0], z = HERO_HOOK[2], y = FLOOR_Y, extra: Partial<FrontOpts> = {}) => {
    const yy = y + Math.sin(t * 2.2) * 0.012;
    out.places.push(stand(HERO, x, yy, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
  };
  const npc = (who: Who, x: number, z: number, expr: Expr, scale = 1, y = FLOOR_Y, extra: Partial<FrontOpts> = {}, roll = 0) => {
    const yy = y + Math.sin(t * 2.2 + who.i) * 0.012;
    const pl = stand(who, x, yy, z, expr, 0, extra, scale);
    if (roll) pl.roll = roll;
    out.places.push(pl);
    blob(out, x, y, z, scale);
  };
  // the performer in a custom pose, placed like any actor
  const perfPose = (kind: "press" | "torch" | "arm" | "coconut", expr: Expr, x: number, z: number, scale = 1.5) => {
    const d = cam.pos.distanceTo(tmp.set(x, 1.2, z)) / scale;
    const [w, h, k] = tier(d);
    const light = light2D(cam, false), seed = seedOf(PERF_WHO.i);
    const f2: FrontOpts = { mode: "stand", expr, blink: lidAt(t, PERF_WHO.i), look: 0, light, seed };
    const press = Math.round(pressAt(t) * 6) / 6;
    const draw = kind === "press" ? drawPerfPress(PERF_WHO.o, f2, press)
      : kind === "torch" ? drawPerfTorch(PERF_WHO.o, f2)
      : kind === "arm" ? drawPerfArm(PERF_WHO.o, f2)
      : drawPerfCoconut(PERF_WHO.o, f2);
    const key = `P|${kind}|${expr}|${kind === "press" ? press : ""}|${lidAt(t, PERF_WHO.i)}|${q(light, 24)}`;
    const yy = Math.sin(t * 2.2 + 51) * 0.012;
    out.places.push({ key, draw, x, y: yy, z, scale, size: [w, h, k] });
    blob(out, x, FLOOR_Y, z, scale);
  };
  // the assistant, mallet striking on the gendang beat (8-step cycle)
  const assistant = (x: number, z: number, scale = 1.3) => {
    const strike = Math.round(strikeAt(t) * 8) / 8;
    out.places.push(stand(ASST_WHO, x, Math.sin(t * 2.2 + 52) * 0.012, z, "grin", 0, { prop: ["hammer", strike] }, scale));
    blob(out, x, FLOOR_Y, z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);

  if (id === 1) {
    // THE COVER: the performer centre-mat, the spike ALREADY
    // pressed to his belly and the godo ALREADY falling —
    // the hero front-right, shocked, never covering him
    perfPose("press", "grin", -0.95, -17.0, 1.55);
    assistant(-2.3, -17.8, 1.25);
    heroAt("shock", -0.15, 1.3, 1.15, -15.2, FLOOR_Y, { wave: 1 });
    card("cardHook", ["KEBAL SENJATA", "TAJAM?!"], -0.95, 1.6, -17.0, 5.4, 0.55);
  } else if (id === 2) {
    // THE TROUPE WIDE: the whole ground — syekh, musicians,
    // the pressing act small at centre, the crowd ringing
    perfPose("press", "grin", PERF[0], PERF[2], 1.1);
    assistant(ASST[0], ASST[2], 1.0);
    npc(SYEKH_WHO, SYEKH[0], SYEKH[2], "neutral", 1.05);
    npc(MUS_WHO[0], MUS1[0], MUS1[2], "grin", 0.95, FLOOR_Y, { mode: "sit" });
    npc(MUS_WHO[1], MUS2[0], MUS2[2], "neutral", 0.95, FLOOR_Y, { mode: "sit" });
    npc(CROWD[0], -6, -8, "grin", 0.95);
    npc(CROWD[1], -2.5, -6.5, "shock", 0.95);
    npc(CROWD[2], 2, -6, "grin", 0.95);
    npc(CROWD[3], 6.5, -8.5, "neutral", 0.95);
    npc(CROWD[4], 10, -11, "grin", 0.9);
    npc(CROWD[5], -10.5, -11.5, "neutral", 0.9);
    heroAt("grin", 0, 1.1, 6.2, -13.5, FLOOR_Y, { wave: 1 });
    card("cardName", ["DEBUS", "BANTEN!"], MAT[0], 1, MAT[2], 5.2, 0.5);
  } else if (id === 3) {
    // THE ATTRACTIONS: the torch high, the coconut balanced,
    // the hero sweating beside him
    perfPose("torch", "grin", PERF[0], PERF[2], 1.5);
    heroAt("nervous", 0.1, 1.3, HERO_TORCH[0], HERO_TORCH[2]);
    card("cardFire", ["MAKAN", "API?!"], PERF[0], 1.6, PERF[2], 5.0, 0.52);
  } else if (id === 4) {
    // THE CROWD: faces turned toward the mat (and camera) —
    // hands up, eyes wide, the hero grimacing among them
    heroAt("nervous", 0, 1.35, HERO_CROWD[0], HERO_CROWD[2]);
    npc(CROWD[0], -3.4, -8.6, "shock", 1.1);
    npc(CROWD[1], -5.6, -6.8, "nervous", 1.05);
    npc(CROWD[2], 4.6, -8.8, "shock", 1.1);
    npc(CROWD[3], 6.8, -6.6, "nervous", 1.05);
    npc(CROWD[4], -1.2, -5.6, "shock", 1.0);
    npc(CROWD[5], 3.4, -5.4, "nervous", 1.0);
    card("cardCrowd", ["PENONTON", "NGERI!"], 0.5, 1.2, -8, 4.8, 0.5);
  } else if (id === 5) {
    // THE DZIKIR: the troupe seated in a row, swaying as one;
    // the syekh leads from the front, the hero quiet beside
    npc(SYEKH_WHO, SYEKH_SIT[0], SYEKH_SIT[2], "neutral", 1.1, FLOOR_Y, { mode: "sit" }, Math.sin(t * 1.9) * 0.045);
    const row: [Who, number][] = [[PERF_WHO, -4.6], [ASST_WHO, -2.3], [MUS_WHO[0], 2.3], [MUS_WHO[1], 4.6]];
    row.forEach(([who, x], i) => npc(who, x, -19.6, "neutral", 1.0, FLOOR_Y, { mode: "sit" }, Math.sin(t * 1.9 + i * 0.7) * 0.05));
    heroAt("neutral", 0.05, 1.2, HERO_DZIKIR[0], HERO_DZIKIR[2]);
    card("cardDzikir", ["DIBUKA", "DZIKIR!"], 0, 0.9, -18.5, 4.6, 0.5);
  } else if (id === 6) {
    // THE WAR TRAINING: two ranks of sultanate soldiers drill
    // on the field — arms rising together, the commander in
    // front, the hero watching from the side
    npc(COMMANDER, FIELD_SPOT[0], FIELD_SPOT[2], "stern", 1.15, FLOOR_Y, { wave: 0.5 });
    const wv = [0, 0.33, 0.66, 1][Math.floor(t * 2) % 4];
    SOLDIERS.forEach((who, i) => {
      npc(who, -8 + i * 3.4, 128.5, "stern", 1.05, FLOOR_Y, { wave: wv });
      npc(SOLDIERS[(i + 2) % 4], -6.5 + i * 3.4, 132, "stern", 1.0, FLOOR_Y, { wave: wv });
    });
    heroAt("shock", 0.1, 1.2, HERO_WAR[0], HERO_WAR[2]);
    card("cardWar", ["LATIHAN", "PERANG!"], FIELD_SPOT[0], 1, FIELD_SPOT[2], 4.8, 0.5);
  } else if (id === 7) {
    // THE TOOL: no performer — the hero leans in over the
    // carved stand where the spike lies (world prop)
    heroAt("shock", -0.05, 1.35, HERO_TOOL[0], HERO_TOOL[2], FLOOR_Y, { wave: 0.4 });
    card("cardTool", ["BESI 40", "SENTI!"], STAND[0], 0.9, STAND[2], 3.9, 0.48);
  } else if (id === 8) {
    // THE SECRET (re-hook): the forearm press up close, the
    // syekh calm at his shoulder, the hero amazed
    perfPose("arm", "grin", PERF[0], PERF[2], 1.55);
    npc(SYEKH_WHO, SYEKH8[0], SYEKH8[2], "neutral", 1.1);
    heroAt("shock", -0.1, 1.3, 3.4, -14.8);
    card("cardSecret", ["TANPA", "LUKA?!"], PERF[0], 1.5, PERF[2], 4.8, 0.52);
  } else if (id === 9) {
    // THE HERITAGE: the cracked coconut held high, the crowd
    // cheering under the pennants, the hero grinning along
    perfPose("coconut", "laugh", PERF[0], PERF[2], 1.45);
    npc(CROWD[0], -6, -8, "laugh", 0.95, FLOOR_Y, { wave: 1 });
    npc(CROWD[1], -2.5, -6.5, "grin", 0.95, FLOOR_Y, { wave: 0.6 });
    npc(CROWD[2], 2, -6, "laugh", 0.95, FLOOR_Y, { wave: 1 });
    npc(CROWD[3], 6.5, -8.5, "grin", 0.95, FLOOR_Y, { wave: 0.4 });
    npc(CROWD[5], -10.5, -11.5, "grin", 0.9, FLOOR_Y, { wave: 0.8 });
    heroAt("laugh", -0.1, 1.3, HERO_FEST[0], HERO_FEST[2], FLOOR_Y, { wave: 1 });
    card("cardHeritage", ["WARISAN", "BUDAYA!"], MAT[0], 1.2, MAT[2], 5.0, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE: the cover angle again — the spike still
    // pressed, still struck, the hero laughing: in Banten
    // being stabbed is not an accident, it is an art
    perfPose("press", "laugh", -0.95, -17.0, 1.55);
    assistant(-2.3, -17.8, 1.25);
    heroAt("laugh", -0.1, 1.3, 1.15, -15.2, FLOOR_Y, { wave: 1 });
    card("cardHook2", ["KEBAL SENJATA", "TAJAM?!"], -0.95, 1.6, -17.0, 5.2, 0.52);
  }
  return out;
};
export { FPS };
