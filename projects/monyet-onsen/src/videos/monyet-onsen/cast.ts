// The cast of the Monyet Onsen short as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// reacting to Japanese macaques — red-faced snow monkeys soaking
// in a 42°C onsen while snow falls — plus winter visitors and the
// giant claim cards. Same pool + card machinery as the house
// style: one canvas per distinct drawing, yaw-only billboards
// shaded by cardShade(), soft contact blobs. The claim card floats
// as an ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always sits
// in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, SIGN_SPOT, heroAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "monyetOnsenHero" };
// WINTER VISITORS: tourists in puffy coats + wool hats, cameras
// in hand, watching the monkeys from the inn veranda.
const VISITOR_A: Who = { i: 71, o: { jacket: "#c23a22", pants: "#2c3550", boots: "#3a2a1a", hat: "hair", hair: "#1d1410" }, okey: "monyetOnsenVisitorA" };
const VISITOR_B: Who = { i: 72, o: { jacket: "#2c6e8a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8542e" }, okey: "monyetOnsenVisitorB" };
const VISITOR_C: Who = { i: 73, o: { jacket: "#e8c832", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a6a72" }, okey: "monyetOnsenVisitorC" };

// ---------------- the snow monkey, drawn (never pasted) ----------------
// Design space 600 x 1000 (soles at y = 975), same as the body
// geometry: a Japanese macaque — round brown-grey fur body, pale
// belly, RED face (the species' signature), small round ears with
// fur tufts, long arms. `pose`: "soak" (sitting chest-deep, only
// head + shoulders + forearms read above the water), "sit"
// (on land, knees up), "stand" (upright on two legs), "hop"
// (mid-jump, arms up). `sleep` closes the eyes contentedly;
// `snow` dusts the head + shoulders white; `towel` puts the
// famous little white towel on its head; `baby` adds a tiny infant
// clinging to its chest.
export type MonkeyOpts = { pose?: "soak" | "sit" | "stand" | "hop"; sleep?: boolean; snow?: boolean; towel?: boolean; baby?: boolean };
const FUR = "#7a5c44", FUR_DARK = "#5d4632", FUR_LITE = "#9a7a5e", BELLY = "#c9a87e", FACE = "#d96a5a", FACE_LITE = "#f2b8a8";
export const drawMonkey = (o: MonkeyOpts = {}) => (p: Pen) => {
  const g = p.g;
  const pose = o.pose ?? "soak";
  const cx = 300;
  if (pose === "hop") {
    // tail up behind, arms thrown up, knees tucked — mid-jump
    p.line([[cx - 120, 700], [cx - 210, 560], [cx - 260, 420]], FUR_DARK, 26);
    p.line([[cx - 150, 420], [cx - 220, 300]], FUR, 30);
    p.line([[cx + 150, 420], [cx + 220, 300]], FUR, 30);
  }
  // tail: a curved fur line behind the body (all poses)
  if (pose !== "hop") p.line([[cx - 130, 720], [cx - 210, 820], [cx - 250, 940]], FUR_DARK, 24);
  // body: big rounded fur torso
  const bodyCy = pose === "stand" ? 620 : 700;
  p.ell(cx, bodyCy, 165, 185, FUR, 12);
  // belly: paler oval down the front
  p.ell(cx, bodyCy + 60, 105, 125, BELLY, 6);
  // fur shading: darker crescent on the body's far side
  g.save();
  g.globalAlpha = 0.35;
  p.ell(cx + 95, bodyCy + 20, 70, 150, FUR_DARK, 0);
  g.restore();
  // sitting knees: two round fur knees at the base
  if (pose === "soak" || pose === "sit") {
    p.ell(cx - 120, 900, 78, 62, FUR, 10);
    p.ell(cx + 120, 900, 78, 62, FUR, 10);
  }
  // standing legs: short fur legs + dark feet
  if (pose === "stand" || pose === "hop") {
    p.line([[cx - 70, 830], [cx - 80, 950]], FUR, 34);
    p.line([[cx + 70, 830], [cx + 80, 950]], FUR, 34);
    p.ell(cx - 80, 958, 42, 18, FUR_DARK, 8);
    p.ell(cx + 80, 958, 42, 18, FUR_DARK, 8);
  }
  // arms: long, resting on the knees (sit/soak) or down (stand)
  if (pose === "soak" || pose === "sit") {
    p.line([[cx - 140, 560], [cx - 185, 760], [cx - 150, 880]], FUR, 30);
    p.line([[cx + 140, 560], [cx + 185, 760], [cx + 150, 880]], FUR, 30);
    p.ell(cx - 150, 885, 34, 24, FUR_LITE, 8);
    p.ell(cx + 150, 885, 34, 24, FUR_LITE, 8);
  } else if (pose === "stand") {
    p.line([[cx - 150, 560], [cx - 175, 780]], FUR, 30);
    p.line([[cx + 150, 560], [cx + 175, 780]], FUR, 30);
    p.ell(cx - 175, 790, 30, 22, FUR_LITE, 8);
    p.ell(cx + 175, 790, 30, 22, FUR_LITE, 8);
  }
  // head: round fur skull
  const hy = pose === "stand" ? 330 : 330;
  p.ell(cx, hy, 132, 128, FUR, 12);
  // fur tufts: spiky crown + cheek ruffs
  p.poly([[cx - 120, 260], [cx - 90, 200], [cx - 50, 240], [cx - 10, 195], [cx + 30, 240], [cx + 70, 200], [cx + 110, 250], [cx + 120, 300], [cx - 120, 300]], FUR, 8);
  // ears: small round ears with pale inner
  p.ell(cx - 132, hy + 10, 30, 34, FUR, 8);
  p.ell(cx + 132, hy + 10, 30, 34, FUR, 8);
  p.ell(cx - 132, hy + 10, 16, 20, FACE_LITE, 4);
  p.ell(cx + 132, hy + 10, 16, 20, FACE_LITE, 4);
  // face: the RED mask — pale pink-red oval, the species signature
  p.ell(cx, hy + 22, 96, 104, FACE, 10);
  // face shading: lighter on the forehead
  p.ell(cx, hy - 30, 60, 34, FACE_LITE, 4);
  // eyes: dark dots with a white glint — or closed content curves
  if (o.sleep) {
    p.stroke([[cx - 58, hy + 8], [cx - 36, hy + 18], [cx - 14, hy + 8]], 7, INK);
    p.stroke([[cx + 14, hy + 8], [cx + 36, hy + 18], [cx + 58, hy + 8]], 7, INK);
  } else {
    p.ell(cx - 36, hy + 12, 15, 19, "#241726", 0);
    p.ell(cx + 36, hy + 12, 15, 19, "#241726", 0);
    p.ell(cx - 41, hy + 4, 5, 7, "#ffffff", 0);
    p.ell(cx + 31, hy + 4, 5, 7, "#ffffff", 0);
  }
  // brows: two short fur strokes above the eyes
  p.stroke([[cx - 58, hy - 22], [cx - 30, hy - 28]], 6, FUR_DARK);
  p.stroke([[cx + 30, hy - 28], [cx + 58, hy - 22]], 6, FUR_DARK);
  // nose: tiny dark oval + mouth: small content curve
  p.ell(cx, hy + 52, 12, 9, "#8a3a30", 0);
  if (o.sleep) p.stroke([[cx - 22, hy + 82], [cx, hy + 90], [cx + 22, hy + 82]], 6, INK);
  else p.stroke([[cx - 18, hy + 80], [cx, hy + 88], [cx + 18, hy + 80]], 6, INK);
  // snow dusting on the head + shoulders
  if (o.snow) {
    g.save(); g.globalAlpha = 0.92;
    p.ell(cx - 40, hy - 105, 52, 20, "#ffffff", 0);
    p.ell(cx + 35, hy - 95, 44, 18, "#ffffff", 0);
    p.ell(cx, hy - 118, 34, 14, "#ffffff", 0);
    p.ell(cx - 130, bodyCy - 130, 40, 16, "#ffffff", 0);
    p.ell(cx + 125, bodyCy - 120, 36, 15, "#ffffff", 0);
    g.restore();
  }
  // the famous towel: a little white towel folded on the head
  if (o.towel) {
    p.poly([[cx - 62, hy - 108], [cx + 62, hy - 108], [cx + 56, hy - 66], [cx - 56, hy - 66]], "#f4f6f8", 8);
    p.line([[cx - 62, hy - 88], [cx + 62, hy - 88]], "#c8d4dc", 5, false);
  }
  // baby: a tiny infant riding high on her shoulder, head peeking
  // beside hers — LOW on the chest it would sit under the water
  // line (y 0.45) and vanish; up here it reads clearly.
  if (o.baby) {
    p.ell(cx + 125, hy + 130, 55, 60, FUR_DARK, 10);
    p.ell(cx + 125, hy + 148, 36, 38, BELLY, 6);
    p.ell(cx + 130, hy + 30, 46, 44, FUR_DARK, 10);
    p.ell(cx + 130, hy + 40, 32, 34, FACE, 8);
    p.ell(cx + 117, hy + 34, 6, 8, "#241726", 0);
    p.ell(cx + 143, hy + 34, 6, 8, "#241726", 0);
    p.ell(cx + 130, hy + 58, 5, 4, "#8a3a30", 0);
    p.line([[cx + 90, hy + 90], [cx + 115, hy + 150]], FUR_DARK, 14);
  }
};
/** A monkey Place: same tier sizing as a person, custom draw. */
const monkey = (cam: CamInfo, x: number, y: number, z: number, opts: MonkeyOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 0.5, z)) / scale;
  const [w, h, k] = tier(d);
  const key = `M|monkey|${opts.pose ?? "soak"}|s${opts.sleep ? 1 : 0}${opts.snow ? 1 : 0}${opts.towel ? 1 : 0}${opts.baby ? 1 : 0}`;
  return { key, x, y, z, scale, draw: drawMonkey(opts), size: [w, h, k] };
};

// ---------------- props (drawn, never pasted) ----------------
// The wooden JIGOKUDANI signpost (shot 6): two bolted boards on
// a post — the park name and its founding year, 1964.
export const drawSign = (p: Pen) => {
  const g = p.g;
  // post
  p.poly([[240, 300], [272, 300], [272, 640], [240, 640]], "#7a5c38", 10);
  // top board: park name
  p.poly([[36, 120], [476, 120], [476, 300], [36, 300]], "#c9a86e", 12);
  p.line([[36, 210], [476, 210]], "#a8824e", 6, false);
  g.fillStyle = "#3a2a12"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 64px 'Arial Black', Arial, sans-serif";
  g.fillText("JIGOKUDANI", 256, 165);
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("YAEN-KOEN", 256, 258);
  // bottom board: founding year + monkey glyph
  p.poly([[76, 330], [436, 330], [436, 470], [76, 470]], "#e8d9b8", 12);
  g.font = "900 84px 'Arial Black', Arial, sans-serif";
  g.fillStyle = "#8a2a1e";
  g.fillText("1964", 256, 400);
  // bolts
  for (const [bx, by] of [[56, 140], [456, 140], [56, 280], [456, 280], [96, 350], [416, 350], [96, 450], [416, 450]]) {
    p.ell(bx, by, 8, 8, "#3a2a10", 0);
  }
  // snow cap on the top board
  g.save(); g.globalAlpha = 0.95;
  p.ell(256, 122, 200, 18, "#ffffff", 0);
  g.restore();
};
// The LIFE magazine cover, January 1970 (shot 9): red masthead,
// a snow monkey's red face in the snow, "SNOW MONKEYS" + year.
export const drawMagazine = (p: Pen) => {
  const g = p.g;
  // cover paper
  p.poly([[40, 20], [472, 20], [472, 620], [40, 620]], "#f6f2e8", 12);
  // red masthead band
  p.poly([[40, 20], [472, 20], [472, 120], [40, 120]], "#c0352a", 0);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 84px 'Arial Black', Arial, sans-serif";
  g.fillText("LIFE", 256, 72);
  // the monkey portrait: fur + red face, snow on its head
  p.ell(256, 330, 150, 145, FUR, 10);
  p.ell(256, 350, 108, 118, FACE, 8);
  p.ell(124, 340, 30, 34, FUR, 8);
  p.ell(388, 340, 30, 34, FUR, 8);
  p.ell(220, 352, 15, 19, "#241726", 0);
  p.ell(292, 352, 15, 19, "#241726", 0);
  p.ell(215, 344, 5, 7, "#ffffff", 0);
  p.ell(287, 344, 5, 7, "#ffffff", 0);
  p.ell(256, 392, 12, 9, "#8a3a30", 0);
  p.stroke([[238, 420], [256, 428], [274, 420]], 6, INK);
  g.save(); g.globalAlpha = 0.92;
  p.ell(216, 222, 52, 20, "#ffffff", 0);
  p.ell(296, 212, 44, 18, "#ffffff", 0);
  g.restore();
  // cover lines
  g.fillStyle = "#1c1503"; g.font = "900 52px 'Arial Black', Arial, sans-serif";
  g.fillText("SNOW MONKEYS", 256, 520);
  g.fillStyle = "#c0352a"; g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("JAPAN · 1970", 256, 575);
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
  // the hero on the snow, big and whole in the cover frame
  const heroStand = (expr: Expr, look = -0.15, scale = 2.0) => {
    const hp = heroAt(id, t);
    const y = 0.02 + Math.sin(t * 1.3) * 0.02;
    out.places.push(stand(HERO, hp.x, y, hp.z, expr, look, {}, scale));
    blob(out, hp.x, 0.02, hp.z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // a soaking monkey: seated on the submerged rock ledge (y 0.15)
  // so head + shoulders read above the 0.45 m water line; scale
  // 0.33 = a real macaque's sitting height (~0.56 m). NO blob —
  // it is IN the water, not on the ground.
  const soak = (x: number, z: number, opts: MonkeyOpts = {}, scale = 0.33) =>
    out.places.push(monkey(cam, x, 0.15, z, { pose: "soak", ...opts }, scale));
  // a monkey on land: full body + contact blob
  const land = (x: number, z: number, opts: MonkeyOpts, scale = 0.35) => {
    out.places.push(monkey(cam, x, 0.02, z, opts, scale));
    blob(out, x, 0.02, z, scale * 0.5);
  };

  switch (id) {
    case 1: // COVER: hero shock BIG right, 3 monkeys soaking, steam, claim card
      // (v2: hero scale 1.6 at [1.3, 2.0] — v1 scale 2.0 at [1.7, 5.0]
      // was 12.6° off-axis and cut at the right edge; monkeys 0.6 —
      // v1 0.33 read as red dots in the pool)
      heroStand("shock", -0.15, 1.6);
      soak(-2.4, -9.2, { sleep: true, snow: true }, 0.6);
      soak(0.2, -10.4, { towel: true, snow: true }, 0.6);
      soak(2.6, -9.0, { sleep: true }, 0.6);
      card("cover", ["MONYET", "BERENDAM?!"], 0.4, 2.6, -10, 1.5, 0.6);
      break;
    case 2: // HIGH WIDE: the whole snowy valley — hero small on
      // the snow at the pool edge, monkeys soaking below
      // (v2: hero on the wide axis [3, -5] — v1 [1.7, 5.0] was 33°
      // off-axis, invisible; monkeys 0.45)
      heroStand("grin", -0.1, 1.0);
      soak(-2.8, -9.0, { snow: true }, 0.45);
      soak(0.4, -10.6, { sleep: true, snow: true }, 0.45);
      soak(3.0, -9.4, {}, 0.45);
      card("alt", ["850", "METER!"], 0, 2.0, -12, 2.2, 0.42);
      break;
    case 3: // CLOSE-UP: ONE soaking monkey fills the frame — red
      // face, towel on its head, snow dusting, eyes closed in bliss
      soak(0, -10, { sleep: true, towel: true, snow: true }, 0.33);
      card("temp", ["42", "DERAJAT!"], 0, 1.2, -10, 0.9, 0.5);
      break;
    case 4: // 1963 FLASHBACK: the Korakukan inn's wooden bath —
      // one young monkey stands on the tub rim, guests watch from the veranda
      out.places.push(monkey(cam, -10.3, 1.0, -15.3, { pose: "stand", snow: true }, 0.5));
      out.places.push(stand(VISITOR_A, -13.2, 0.02, -17.2, "shock", 0.2, {}, 1.0));
      blob(out, -13.2, 0.02, -17.2, 1.0);
      out.places.push(stand(VISITOR_B, -11.9, 0.02, -17.5, "grin", -0.2, {}, 1.0));
      blob(out, -11.9, 0.02, -17.5, 1.0);
      card("y1963", ["TAHUN", "1963!"], -11.2, 2.2, -16, 1.6, 0.5);
      break;
    case 5: // RE-HOOK: monkeys hopping into the pool one by one —
      // each hops in its own window of the shot (U-staggered),
      // the first already soaking
      soak(-1.2, -10.2, { sleep: true });
      {
        const hops: [number, number][] = [[3.2, -7.6], [2.0, -8.2], [0.8, -8.8], [-0.4, -9.4]];
        hops.forEach(([hx, hz], i) => {
          const ph = clamp01((U - i * 0.14) / 0.3);
          const hopY = 0.02 + Math.sin(ph * Math.PI) * 0.55;
          const z = hz + ph * -1.2;
          out.places.push(monkey(cam, hx, hopY, z, { pose: ph > 0.05 && ph < 0.95 ? "hop" : "stand", snow: true }, 0.45));
          if (ph <= 0.05 || ph >= 0.95) blob(out, hx, 0.02, z, 0.18);
        });
      }
      card("rehook", ["TURUN", "TEMURUN!"], 0, 2.4, -10, 1.6, 0.52);
      break;
    case 6: // THE SIGN: wooden JIGOKUDANI 1964 signpost by the
      // pool, hero reading it, the monkeys' own bath behind
      out.fx.push({ key: "sign", cw: 512, ch: 640, draw: drawSign, x: SIGN_SPOT[0], y: 0.95, z: SIGN_SPOT[2], w: 1.5, h: 1.9 });
      // (v2: hero at [-1.0, -7.8] — v1 [-2.0, -5.2] stood directly
      // in front of the sign and hid it; monkeys 0.45 — v1 0.33
      // were invisible at this distance)
      out.places.push(stand(HERO, -1.0, 0.02, -7.8, "grin", 0.3, {}, 1.0));
      blob(out, -1.0, 0.02, -7.8, 1.0);
      soak(-1.0, -10.0, { sleep: true, snow: true }, 0.45);
      soak(1.4, -10.8, {}, 0.45);
      card("ownpool", ["KOLAM", "SENDIRI!"], -3.0, 2.2, -8, 1.5, 0.5);
      break;
    case 7: // GROOMING CLOSE: two monkeys picking each other's
      // fur in the warm water, spa chatter — the pair TOGETHER on
      // the axis (v1: 1.4 m apart at 2.6 m, both fell off-frame)
      soak(-0.35, -10.1, { snow: true });
      soak(0.35, -10.1, { sleep: true, snow: true });
      card("groom", ["SALING", "SISIRAN!"], 0, 1.6, -10.1, 0.9, 0.5);
      break;
    case 8: // MOTHER + BABY: the baby clings to her chest in the
      // water, both faces red in the steam — the second monkey is
      // DROPPED (v1: at 57° off-axis, invisible; this shot is only
      // about mother + baby)
      soak(0.6, -10.5, { baby: true, snow: true });
      card("redface", ["MUKA", "MERAH!"], 0.6, 1.6, -10.5, 0.9, 0.5);
      break;
    case 9: // LIFE 1970: the giant magazine cover + camera
      // flashes, the monkey posing like a celebrity behind it
      // (v2: magazine 1.7 x 2.1 — v1 2.0 x 2.5 was cropped by the
      // frame and hid the posing monkey; monkeys at ±1.2, beside
      // the cover instead of behind it)
      out.fx.push({ key: "magazine", cw: 512, ch: 640, draw: drawMagazine, x: 0, y: 1.5, z: -6.5, w: 1.7, h: 2.1 });
      soak(-1.2, -9.0, { towel: true, snow: true }, 0.45);
      soak(1.2, -9.0, {}, 0.45);
      cardFx("flash", (p) => fxBurst(p, U * 2.4, "#fff3b0", 12, 40, 230), S0 + 0.4, 0.5, 0, 1.9, -8, 2.2, 2.2, true);
      card("life", ["LIFE", "1970!"], 0, 2.6, -10, 1.4, 0.5);
      break;
    default: // 10: PUNCHLINE LOOP — same cover framing, hero laughs
      heroStand("laugh", -0.15, 1.6);
      soak(-2.4, -9.2, { sleep: true, snow: true }, 0.6);
      soak(0.2, -10.4, { towel: true, snow: true }, 0.6);
      soak(2.6, -9.0, { sleep: true }, 0.6);
      card("cover2", ["MONYET", "BERENDAM?!"], 0.4, 2.6, -10, 1.5, 0.6);
      break;
  }
  return out;
};
