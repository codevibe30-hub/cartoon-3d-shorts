// The cast of the Lempar HP frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// marvelling at the flying phone, the THROWER — a Finnish
// athlete in blue with a headband, mid-throw — and the JUDGE
// (dark jacket, cap, score card). Props — the GIANT flying
// brick phone, distance boards, the green recycle bin full of
// old phones. Same pool + card machinery as the house style:
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
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, THROWER_SPOT, JUDGE_SPOT, BIN_SPOT, leavesAt } from "./story";
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
// In this episode he marvels at the giant flying phone.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "lemparHero" };
// THROWER: a Finnish phone-throwing athlete — blue jacket, blonde
// hair, blue headband, white sneakers.
const THROWER: Who = { i: 55, o: { jacket: "#2b5ea8", pants: "#2e3440", boots: "#f2ede2", hat: "cap", cap: "#2b5ea8", skin: "#e8b98a" }, okey: "lemparThrower" };
// JUDGE: the championship judge — dark jacket, dark cap, clipboard.
const JUDGE: Who = { i: 77, o: { jacket: "#3b3f52", pants: "#2e3440", boots: "#2a2a2e", hat: "cap", cap: "#1c1c22", skin: "#d9a06a" }, okey: "lemparJudge" };

// ---------------- episode props (drawn, never pasted) ----------------
/** An old brick phone (Nokia-style) with antenna — 256x512 canvas.
 *  The episode's visual signature: dark grey body, green screen,
 *  chunky keypad, little antenna on top. */
export const drawPhone = (p: Pen) => {
  const g = p.g;
  // antenna
  p.line([[196, 26], [196, 78]], "#3a3a3a", 14);
  p.ell(196, 22, 12, 12, "#3a3a3a", 0);
  // body — rounded brick
  p.poly([[76, 78], [196, 78], [210, 470], [62, 470]], "#4a4a52", 10);
  g.fillStyle = "#5c5c66";
  g.beginPath(); g.roundRect(76, 78, 134, 392, 26); g.fill();
  g.strokeStyle = "#22222a"; g.lineWidth = 8;
  g.beginPath(); g.roundRect(76, 78, 134, 392, 26); g.stroke();
  // earpiece + green screen
  p.ell(143, 112, 34, 8, "#22222a", 0);
  g.fillStyle = "#9fd68a";
  g.beginPath(); g.roundRect(96, 138, 94, 78, 8); g.fill();
  g.strokeStyle = "#22222a"; g.lineWidth = 5;
  g.beginPath(); g.roundRect(96, 138, 94, 78, 8); g.stroke();
  g.fillStyle = "#2e5a22"; g.font = "900 26px 'Arial Black', Arial, sans-serif"; g.textAlign = "center";
  g.fillText("101 m", 143, 184);
  // keypad — 3 x 4 chunky buttons
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const kx = 103 + c * 34, ky = 240 + r * 52;
    g.fillStyle = "#d8d8de";
    g.beginPath(); g.roundRect(kx, ky, 26, 40, 6); g.fill();
    g.strokeStyle = "#22222a"; g.lineWidth = 3;
    g.beginPath(); g.roundRect(kx, ky, 26, 40, 6); g.stroke();
  }
  // gloss stripe down the left edge
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath(); g.roundRect(84, 86, 14, 376, 7); g.fill();
};
/** A phone spinning through the air: same brick phone, tilted. */
export const drawPhoneFly = (rot: number) => (p: Pen) => {
  p.rot = [rot, 128, 256];
  drawPhone(p);
  p.rot = null;
};
/** A white distance board on two posts — 512x256 canvas. */
export const drawBoard = (label: string) => (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.roundRect(16, 16, 480, 180, 18); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 10;
  g.beginPath(); g.roundRect(16, 16, 480, 180, 18); g.stroke();
  g.strokeStyle = "rgba(28,21,3,0.4)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(34, 34, 444, 144, 12); g.stroke();
  g.fillStyle = "#1c1503"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 96px 'Arial Black', Arial, sans-serif";
  g.fillText(label, 256, 112);
};
/** A green recycle bin overflowing with old phones — 512x512 canvas. */
export const drawBin = (p: Pen) => {
  const g = p.g;
  // phones poking out of the top
  p.poly([[150, 150], [170, 60], [200, 150]], "#4a4a52", 8);
  p.poly([[300, 150], [330, 50], [360, 150]], "#3a3a3a", 8);
  p.poly([[220, 150], [240, 80], [268, 150]], "#5c5c66", 8);
  // bin body — tapered green box
  p.poly([[120, 150], [392, 150], [360, 450], [152, 450]], "#2e8b47", 10);
  g.fillStyle = "#37a355";
  g.beginPath(); g.moveTo(120, 150); g.lineTo(392, 150); g.lineTo(360, 450); g.lineTo(152, 450); g.closePath(); g.fill();
  g.strokeStyle = "#1c4a2a"; g.lineWidth = 8;
  g.beginPath(); g.moveTo(120, 150); g.lineTo(392, 150); g.lineTo(360, 450); g.lineTo(152, 450); g.closePath(); g.stroke();
  // rim
  g.fillStyle = "#2e8b47"; g.fillRect(104, 132, 304, 28);
  g.strokeStyle = "#1c4a2a"; g.lineWidth = 6; g.strokeRect(104, 132, 304, 28);
  // recycle arrows — three bent arrows in a triangle
  g.strokeStyle = "#f4ead2"; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.arc(256, 300, 52, -1.2, 0.6); g.stroke();
  g.beginPath(); g.arc(256, 300, 52, 1.0, 2.8); g.stroke();
  g.beginPath(); g.arc(256, 300, 52, 3.2, 5.0); g.stroke();
  // gloss stripe
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.beginPath(); g.moveTo(150, 160); g.lineTo(190, 160); g.lineTo(168, 440); g.lineTo(150, 440); g.closePath(); g.fill();
};
/** The judge's score card: white board, big "12" — 256x256 canvas. */
export const drawScore = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#f4ead2";
  g.beginPath(); g.roundRect(16, 16, 224, 224, 16); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 10;
  g.beginPath(); g.roundRect(16, 16, 224, 224, 16); g.stroke();
  g.fillStyle = "#1c1503"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.fillText("12", 128, 140);
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
  // phones spinning through the sky, drifting across the field
  const phonesFx = () => {
    for (let i = 0; i < 3; i++) {
      const ph = (leavesAt(tt) + i / 3) % 1;
      out.fx.push({
        key: `phone${i}`, cw: 256, ch: 512, draw: drawPhoneFly((i - 1) * 0.5 + tt * 0.8),
        x: -1.2 + i * 1.2, y: 4.2 - ph * 1.8, z: -6 + i * 0.8 - ph * 2,
        w: 0.55, h: 1.1, soft: true,
      });
    }
  };
  // the GIANT phone — the hook prop, tumbling through the sky
  const phoneBigFx = (x: number, y: number, z: number, w: number, h: number) => {
    out.fx.push({ key: "phoneBig", cw: 256, ch: 512, draw: drawPhoneFly(Math.sin(tt * 1.4) * 0.35), x, y, z, w, h, soft: true });
  };
  const phoneFx = (x: number, y: number, z: number, w = 0.5) => {
    out.fx.push({ key: "phone", cw: 256, ch: 512, draw: drawPhone, x, y: y + 0.4, z, w, h: w * 2, soft: true });
  };
  const boardFx = (label: string, x: number, y: number, z: number, w = 2.6) => {
    out.fx.push({ key: `board${label}`, cw: 512, ch: 256, draw: drawBoard(label), x, y: y + 1.3, z, w, h: w / 2, soft: true });
  };
  const binFx = (x: number, y: number, z: number, w = 2.4) => {
    out.fx.push({ key: "bin", cw: 512, ch: 512, draw: drawBin, x, y: y + w / 2, z, w, h: w, soft: true });
  };
  const scoreFx = (x: number, y: number, z: number, w = 1.1) => {
    out.fx.push({ key: "score", cw: 256, ch: 256, draw: drawScore, x, y: y + 0.5, z, w, h: w, soft: true });
  };
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = -0.15, extra: Partial<FrontOpts> = {}, scale = 1.5) =>
    out.places.push(stand(HERO, x, y, z, expr, look, extra, scale));
  const throwerAt = (x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(THROWER, x, 0, z, expr, 0.1, extra, 1.5));
  const judgeAt = (x: number, z: number, expr: Expr = "neutral", extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(JUDGE, x, 0, z, expr, -0.1, extra, 1.5));

  if (id === 1) {
    // THE COVER (frame 0): the GIANT PHONE tumbling through the
    // sky, the thrower fresh off the throw, the hero shocked
    // BESIDE it near the camera axis, the claim GIANT.
    // (Santa v2 lesson: hero/thrower at x 1.2/-0.8 — near the axis,
    // ~4 deg / ~9 deg off-axis from the cover camera.)
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "shock", -0.15, { wave: 0.7 });
    throwerAt(THROWER_SPOT[0], THROWER_SPOT[2], "grin", { wave: 1.0 });
    phoneBigFx(0, 5.0, -8, 2.4, 4.8);
    phonesFx();
    card("cardHook", ["101", "METER"], 0, 2.6, -8, 5.0, 0.52);
  } else if (id === 2) {
    // THE WIDE: the whole throwing field, white throwing line,
    // distance boards, pines lining the sides, the lake behind
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "grin", 0);
    throwerAt(THROWER_SPOT[0], THROWER_SPOT[2], "grin", { wave: 0.5 });
    judgeAt(JUDGE_SPOT[0], JUDGE_SPOT[2], "neutral");
    boardFx("50 M", -3.4, 0, -14, 2.6);
    boardFx("100 M", 3.4, 0, -24, 2.6);
    phonesFx();
    card("cardField", ["SAVONLINNA"], 0, 3.0, -10, 4.2, 0.5);
  } else if (id === 3) {
    // THE WIND-UP: close on the thrower gripping the phone —
    // the phone in his raised hand, the judge beside him.
    // Thrower at (-0.8, -2.6) is on-axis for the shot-3 camera
    // (~0 deg); judge at (0.4, -3.4) is ~7 deg — both in frame.
    throwerAt(THROWER_SPOT[0], THROWER_SPOT[2], "grin", { wave: 1.0 });
    judgeAt(JUDGE_SPOT[0], JUDGE_SPOT[2], "neutral");
    // the phone sits IN the thrower's raised hand (hand ≈ (0.1, 1.6, -2.7))
    phoneFx(0.1, 1.6, -2.7, 0.5);
    card("cardOrg", ["HP", "PANITIA"], 0, 2.6, -4.5, 4.2, 0.5);
  } else if (id === 4) {
    // FREESTYLE: the thrower mid-trick, arm high, phone in the
    // air — the judge holds up the score card "12".
    // Thrower at (0.0, -3.0) on-axis for the shot-4 camera;
    // judge at (1.2, -3.6) ~5 deg off-axis.
    throwerAt(0.0, -3.0, "laugh", { wave: 1.0 });
    judgeAt(1.2, -3.6, "grin");
    scoreFx(1.9, 1.4, -3.8, 1.1);
    phoneBigFx(0.6, 4.6, -6, 1.2, 2.4);
    card("cardFree", ["GAYA", "BEBAS"], 0, 2.6, -4.5, 4.2, 0.5);
  } else if (id === 5) {
    // THE RECORD: Ere's 101.46 m throw — the thrower releases,
    // the phone sails far down the field, the hero cheers.
    throwerAt(0.2, -3.4, "laugh", { wave: 1.0 });
    heroAt(1.6, 0, -2.6, "laugh", -0.15, { wave: 0.8 });
    phoneBigFx(-0.5, 5.2, -14, 1.6, 3.2);
    boardFx("100 M", 3.4, 0, -24, 2.6);
    card("cardRecord", ["REKOR", "DUNIA"], 0, 2.6, -8, 4.0, 0.5);
  } else if (id === 6) {
    // THE RECYCLE: the green bin overflowing with old phones —
    // the hero gives a thumbs-up beside it.
    heroAt(1.4, 0, -2.8, "grin", -0.15, { wave: 0.5 });
    binFx(BIN_SPOT[0], 0, BIN_SPOT[2], 2.4);
    phonesFx();
    card("cardRecycle", ["DIDAUR", "ULANG"], 0, 2.6, -8, 4.6, 0.5);
  } else if (id === 7) {
    // THE PUNCHLINE LOOP: back on the cover framing in golden
    // light — the thrower laughs, the hero laughs, the phone
    // tumbles on. Loop to frame 0.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "laugh", -0.15, { wave: 0.7 });
    throwerAt(THROWER_SPOT[0], THROWER_SPOT[2], "laugh", { wave: 1.0 });
    phoneBigFx(0, 5.0, -8, 2.4, 4.8);
    phonesFx();
    card("cardPunch", ["NEGERI", "NOKIA"], 0, 2.6, -8, 5.0, 0.52);
  }
  return out;
};
export { FPS };
