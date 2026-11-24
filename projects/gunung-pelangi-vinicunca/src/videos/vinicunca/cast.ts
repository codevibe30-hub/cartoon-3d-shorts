// The cast of the Vinicunca short as lit flat sprites in the 3D
// world: the series hero narrator (teal shirt, cream cap), three
// hikers climbing the trail, two alpacas grazing beside the path,
// a giant layer-cake slice (the mineral bands as kue lapis), and
// the giant claim card. Same pool + card machinery as the house
// style: one canvas per distinct drawing, yaw-only billboards
// shaded by cardShade(), soft contact blobs. The claim card
// floats as an ink-outlined board via drawCardFit (auto-fit:
// text NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, hikerAt } from "./story";
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
// Wide plane for the alpaca sprite: design space 900x700,
// feet at design y=700 sit on the ground.
export const ALPACA_GEO = (() => { const g = new THREE.PlaneGeometry(900 * SU, 700 * SU); g.translate(0, (700 - 350) * SU, 0); return g; })();
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "alpaca"; roll?: number; pitch?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; dir?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
// Alpaca design space is 900x700 (wide + low): same distance tiers, wider canvas.
const alpacaTier = (d: number): [number, number, number] =>
  d < 3.2 ? [2700, 2100, 3.0] : d < 6.5 ? [1620, 1260, 1.8] : d < 16 ? [720, 560, 0.8] : [360, 280, 0.4];

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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "vinicuncaHero" };
// HIKERS: three tourists climbing the trail, distinct jackets + caps.
const HIKER_A: Who = { i: 71, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "vinicuncaHikerA" };
const HIKER_B: Who = { i: 72, o: { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#2f5f6a" }, okey: "vinicuncaHikerB" };
const HIKER_C: Who = { i: 73, o: { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#2a2018" }, okey: "vinicuncaHikerC" };
const HIKERS = [HIKER_A, HIKER_B, HIKER_C];

// ---------------- the alpaca (drawn, never pasted) ----------------
// Side profile on a 900x700 design canvas, head LEFT, tail RIGHT.
// Fluffy cream wool body, long upright neck, small head with two
// pointy ears, four thin dark legs — it MUST read as an alpaca at
// a glance: long neck + cloud body + small head, never a sheep,
// never a llama with a flat back. bob: head-bob phase (the canvas
// redraws when the quantized bob changes).
export type AlpacaOpts = { bob?: number; wool?: string };
export const drawAlpaca = (o: AlpacaOpts = {}) => (p: Pen) => {
  const g = p.g;
  const wool = o.wool ?? "#efe6d0";
  const woolDark = "#d8c9a8";
  const woolLite = "#f7f0dd";
  const leg = "#6a4a30";
  const bob = o.bob ?? 0; // -2..2 px head bob
  // LEGS: four thin dark legs (far pair darker)
  const legAt = (x: number, far: boolean) => {
    p.poly([[x - 17, 540], [x + 17, 540], [x + 15, 686], [x - 15, 686]], far ? "#4a3426" : leg, 8);
    p.poly([[x - 18, 686], [x + 18, 686], [x + 14, 698], [x - 14, 698]], "#3a2a1a", 4);
  };
  legAt(560, true); legAt(330, true);
  legAt(600, false); legAt(370, false);
  // TAIL: small wool puff at the rear (right)
  p.ell(760, 400, 62, 82, wool, 10);
  p.ell(752, 392, 44, 58, woolLite, 6);
  // BODY: big fluffy cloud — main mass + fluff bumps on top
  p.ell(450, 430, 280, 180, wool, 12);
  p.ell(450, 480, 230, 120, woolLite, 8);
  for (const [fx, fy, fr] of [[300, 300, 62], [420, 268, 72], [540, 292, 66], [650, 330, 56]] as [number, number, number][]) {
    p.ell(fx, fy, fr, fr * 0.78, wool, 8);
  }
  // wool speckle
  const rs = rng(41);
  for (let i = 0; i < 80; i++) {
    const x = 220 + rs() * 480, y = 300 + rs() * 240;
    g.fillStyle = `rgba(216,201,168,${0.25 + rs() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, 4 + rs() * 7, 2.5 + rs() * 4, rs() * 3, 0, 7); g.fill();
  }
  // NECK: long upright, slightly S-curved, head end at top-left
  p.poly([[270, 380], [215, 150 + bob], [255, 120 + bob], [310, 150 + bob], [330, 380]], wool, 10);
  p.line([[285, 360], [245, 170 + bob]], woolDark, 8, false);
  // HEAD: small, rounded, ears UP — the alpaca's signature
  p.ell(238, 118 + bob, 72, 58, wool, 10);
  p.poly([[196, 82 + bob], [206, 28 + bob], [232, 72 + bob]], wool, 8); // left ear
  p.poly([[262, 74 + bob], [282, 24 + bob], [296, 76 + bob]], wool, 8); // right ear
  p.ell(196, 132 + bob, 34, 22, woolDark, 6); // muzzle
  p.dot(222, 104 + bob, 9); // eye
  g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(219, 100 + bob, 3, 0, 7); g.fill(); // eye glint
  p.dot(182, 128 + bob, 5, "#4a3426"); // nostril
  p.line([[186, 140 + bob], [214, 146 + bob]], "#4a3426", 5, false); // mouth
};
/** A slice of layer cake on a plate (512x512 canvas): five
 *  mineral bands as cake layers — red, pink, mustard, green,
 *  white — with frosting drips and a cherry on top. The joke
 *  made visible: the mountain is a giant kue lapis. */
export const drawLayerCake = (p: Pen) => {
  const g = p.g;
  // plate
  p.ell(256, 440, 195, 34, "#f2f0e6", 10);
  p.ell(256, 432, 195, 28, "#ffffff", 6);
  // cake slab: five bands, bottom to top
  const layers: [number, number, string][] = [
    [350, 410, "#e8e0cc"], [300, 350, "#5a8a4a"], [250, 300, "#d9a441"],
    [200, 250, "#d97b6c"], [150, 200, "#a83c2a"],
  ];
  for (const [y0, y1, col] of layers) {
    p.poly([[116, y0], [400, y0], [400, y1], [116, y1]], col, 8);
  }
  // frosting top + drips
  p.poly([[116, 150], [400, 150], [400, 132], [116, 132]], "#fff6da", 8);
  for (const [dx, dl] of [[150, 34], [210, 48], [280, 30], [340, 44]] as [number, number][]) {
    p.poly([[dx - 12, 150], [dx + 12, 150], [dx + 8, 150 + dl], [dx - 8, 150 + dl]], "#fff6da", 6);
  }
  // cherry on top
  p.dot(256, 112, 18, "#d43a4a");
  g.fillStyle = "#ff8a8a"; g.beginPath(); g.arc(250, 106, 5, 0, 7); g.fill();
  p.line([[256, 96], [272, 72]], "#3a5a2e", 6, false);
  // speckle on the bands
  const rs = rng(23);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,246,220,${0.2 + rs() * 0.3})`;
    g.beginPath(); g.arc(130 + rs() * 256, 160 + rs() * 240, 2 + rs() * 3, 0, 7); g.fill();
  }
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
  // one alpaca as a wide sprite: scale 1.0 ≈ 1.9 m long, head LEFT
  const alpaca = (x: number, z: number, scale = 1.0, mirror = false, wool?: string) => {
    const d = cam.pos.distanceTo(tmp.set(x, 0.5, z)) / scale;
    const [w, h, k] = alpacaTier(d);
    const bob = Math.round(Math.sin(t * 1.8 + x) * 2); // head bob, quantized so the canvas redraws
    const key = `A|${wool ?? "c"}|b${bob}|${q(x, 8)}|${q(z, 8)}`;
    out.places.push({
      key, x, y: 0, z, scale, mirror, geo: "alpaca", size: [w, h, k],
      draw: drawAlpaca({ bob, wool }),
    });
    blob(out, x, 0, z, 2.0 * scale, 2.4 * scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, x: number, z: number, look = -0.15, scale = 1.5) =>
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big in the near
    // foreground — behind him the striped rainbow ridge, Ausangate
    // stacked behind, and the claim as one GIANT board.
    heroAt("shock", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    card("cardHook", ["GUNUNG", "PELANGI?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE SCALE: high wide — the whole striped ridge in one sweep,
    // the trail climbing it, the hero small on the trail (trailAt(0.55):
    // close to the camera he sat at the bottom edge, half cut)
    out.places.push(stand(HERO, 1.25, 0, -5.8, "grin", -0.3, {}, 1.0)); blob(out, 1.25, 0, -5.8);
    card("cardScale", ["5.036 METER!"], 0, 2, -25, 4.2, 0.5);
  } else if (id === 3) {
    // THE STRIPES: medium on the hero pointing at the bands —
    // red, yellow, green, white, all of it REAL
    out.places.push(stand(HERO, -2, 0, 2, "grin", 0.3, {}, 1.1)); blob(out, -2, 0, 2);
    card("cardReal", ["BUKAN CAT!"], 1, 3, -28, 4.0, 0.5);
  } else if (id === 4) {
    // THE LAYERS: the giant layer-cake slice — 65 million years
    // of sediment, served like kue lapis
    out.fx.push({ key: "cake", cw: 512, ch: 512, draw: drawLayerCake, x: 0.5, y: 1.4, z: -10, w: 2.4, h: 2.4 });
    out.places.push(stand(HERO, -0.8, 0, -8, "grin", 0.25, {}, 1.1)); blob(out, -0.8, 0, -8);
    card("cardLayers", ["65 JUTA TAHUN!"], 0.5, 2.5, -12, 3.8, 0.5);
  } else if (id === 5) {
    // THE MINERALS: hero laughing with a cake slice in hand, the
    // red/green/yellow bands behind him
    out.fx.push({ key: "cake2", cw: 512, ch: 512, draw: drawLayerCake, x: 0.6, y: 1.4, z: 3, w: 1.4, h: 1.4 });
    out.places.push(stand(HERO, 0, 0, 4, "laugh", 0.2, {}, 1.15)); blob(out, 0, 0, 4);
    card("cardCake", ["KUE LAPIS!"], 0.5, 2, -8, 3.6, 0.5);
  } else if (id === 6) {
    // THE SNOW PAST: the ridge buried WHITE under snow — the
    // rainbow hidden for centuries, hero shivering in the cold
    out.places.push(stand(HERO, 0, 0, 10, "nervous", -0.15, {}, 1.2)); blob(out, 0, 0, 10);
    card("cardSnow", ["KETUTUP SALJU!"], 0, 3, -30, 5.0, 0.52);
  } else if (id === 7) {
    // THE MELT: half snow, half stripes — 2013, the reveal
    // hero pulled nearer the camera (was [-1,0,6]): his feet sat on the
    // bottom edge, half-hidden behind the subtitle
    out.places.push(stand(HERO, -0.5, 0, 4, "grin", 0.2, {}, 1.1)); blob(out, -0.5, 0, 4);
    card("cardMelt", ["2013 TERBUKA!"], 0, 4, -28, 4.2, 0.5);
  } else if (id === 8) {
    // THE CROWD: the trail queue — hikers climbing in a loose zigzag,
    // the hero LEADS at the front (biggest, nearest camera), alpacas
    // grazing OFF-trail on both sides so nothing hides them.
    // (looking straight down the trail stacked the queue into a totem
    // pole and hid both alpacas behind the hero)
    const lat = [-1.6, 1.6, -1.6, 1.6];
    const hp0 = hikerAt(0, t);
    out.places.push(stand(HERO, hp0.x + lat[0], hp0.y, hp0.z, "grin", 0.2, {}, 1.1)); blob(out, hp0.x + lat[0], hp0.y, hp0.z);
    for (let i = 0; i < 3; i++) {
      const hp = hikerAt(i + 1, t);
      out.places.push(stand(HIKERS[i], hp.x + lat[i + 1], hp.y, hp.z, "grin", 0.2, {}, 1.0)); blob(out, hp.x + lat[i + 1], hp.y, hp.z);
    }
    alpaca(4.2, -4, 1.0, false);
    alpaca(5.5, -12, 0.9, true, "#d8c9a8");
    card("cardCrowd", ["REBUTAN TURIS!"], 1.5, 2, -8, 3.6, 0.5);
  } else if (id === 9) {
    // OUT OF BREATH: close on the hero, bent over, panting at
    // 5,000 metres — the altitude is the punchline setup
    // card lifted to max (was up 4.0): the hero's head touched the card text
    out.places.push(stand(HERO, 0, 0, 10, "pained", -0.3, {}, 1.3)); blob(out, 0, 0, 10);
    card("cardBreath", ["NGOS-NGOSAN!"], 0, 2.5, -20, 5.2, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // rainbow ridge, same claim, but the hero is laughing now.
    // Loop to frame 0.
    heroAt("laugh", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    alpaca(-3.5, 6, 0.9, false);
    card("cardHook2", ["GUNUNG", "PELANGI?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };
