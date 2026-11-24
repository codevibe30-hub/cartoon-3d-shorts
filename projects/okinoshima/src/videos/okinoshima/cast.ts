// The cast of the Okinoshima cover frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED in a wooden boat in the near foreground, a
// woman visitor stopped at the shore rope barrier, a Shinto
// priest in white, men bathing in the sea for purification, and
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
import { FPS, SHOTS, clamp01, camAt, HERO_BOAT, BARRIER_Z, heroBoatAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "okinoshimaHero" };
// WOMAN: a visitor stopped at the rope barrier — she may look,
// but she may not cross. Dress + hair, respectful, never mocked.
const WOMAN: Who = { i: 62, o: { jacket: "#c25a7a", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#f5c9a0" }, okey: "okinoshimaWoman" };
// PRIEST: a Munakata Taisha priest in white, black lacquered cap.
const PRIEST: Who = { i: 63, o: { jacket: "#f2f0e6", pants: "#f2f0e6", boots: "#3a3a3a", hat: "cap", cap: "#1d1d22", skin: "#ecd0b6" }, okey: "okinoshimaPriest" };
// BATHERS: men in white, waist-deep in the sea for misogi.
const BATHER: Who = { i: 64, o: { jacket: "#f2f0e6", pants: "#f2f0e6", boots: "#5a3b2a", hat: "cap", cap: "#f2f0e6", skin: "#c99067" }, okey: "okinoshimaBather" };
const BATHER_B: Who = { i: 65, o: { jacket: "#e8e4d8", pants: "#e8e4d8", boots: "#5a3b2a", hat: "hair", hair: "#2a201a", skin: "#ecd0b6" }, okey: "okinoshimaBatherB" };

// ---------------- episode props (drawn, never pasted) ----------------
/** One green leaf (256x256): the thing that may NOT leave the
 *  island — the punchline prop for "sehelai daun pun dilarang". */
export const drawLeaf = (p: Pen) => {
  p.poly([[128, 20], [205, 105], [185, 215], [128, 240], [71, 215], [51, 105]], "#4a8a3a", 6);
  p.poly([[128, 20], [205, 105], [185, 215], [128, 240], [71, 215], [51, 105]], "#5da24a", 0);
  p.line([[128, 30], [128, 232]], "#2c5c1d", 7, false);
  for (const s of [1, -1]) {
    p.line([[128, 90], [128 + s * 52, 130]], "#2c5c1d", 5, false);
    p.line([[128, 140], [128 + s * 58, 178]], "#2c5c1d", 5, false);
  }
  p.line([[128, 240], [128, 252]], "#6a4a2c", 6, false);
};
/** A golden ritual mirror (256x256): bronze disc with a raised
 *  rim and a small handle — one of the 80,000 National Treasures. */
export const drawMirror = (p: Pen) => {
  p.ell(128, 118, 92, 92, "#b8860b", 0);
  p.ell(128, 118, 80, 80, "#e8c45a", 0);
  p.ell(128, 118, 62, 62, "#f6e27a", 0);
  p.ell(112, 100, 22, 22, "#fffbe8", 0);
  p.poly([[118, 208], [138, 208], [138, 248], [118, 248]], "#8a6a20", 6);
};
/** A ritual sword (256x320): straight blade, guard, wrapped grip. */
export const drawSword = (p: Pen) => {
  p.poly([[118, 30], [138, 30], [138, 190], [128, 205], [118, 190]], "#d7dee8", 0);
  p.line([[128, 40], [128, 185]], "#8a94a8", 5, false);
  p.poly([[92, 196], [164, 196], [164, 214], [92, 214]], "#b8860b", 0);
  p.poly([[118, 214], [138, 214], [138, 288], [118, 288]], "#5a3b2a", 0);
  p.line([[118, 226], [138, 226]], "#2c2c30", 4, false);
  p.line([[118, 250], [138, 250]], "#2c2c30", 4, false);
};
/** A string of ritual beads (256x160): curved row of round beads. */
export const drawBeads = (p: Pen) => {
  const cols = ["#2f8a6a", "#d83a4a", "#e8c45a", "#3f6fb5", "#f2f0e6"];
  for (let i = 0; i < 9; i++) {
    const x = 28 + i * 25, y = 80 + Math.sin(i * 0.7) * 22;
    p.dot(x, y, 13);
    p.ell(x, y, 12, 12, cols[i % cols.length], 0);
    p.ell(x - 3, y - 4, 4, 4, "rgba(255,255,255,0.7)", 0);
  }
};
/** The shore sign (512x320): wooden board, red border, the ban in
 *  two plain lines — "DILARANG MASUK". */
export const drawSign = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#6a4a2c"; g.fillRect(246, 236, 20, 84);
  g.fillStyle = "#e8dcc4";
  g.beginPath(); g.roundRect(56, 20, 400, 216, 18); g.fill();
  g.lineWidth = 12; g.strokeStyle = "#c0353a";
  g.beginPath(); g.roundRect(56, 20, 400, 216, 18); g.stroke();
  g.fillStyle = "#c0353a"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 64px 'Arial Black', Arial, sans-serif";
  g.fillText("DILARANG", 256, 96);
  g.fillText("MASUK", 256, 172);
  g.fillStyle = "#c0353a";
  g.beginPath(); g.arc(256, 40, 0, 0, 0); g.fill();
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
  void U;
  // beach ground height (world.ts builds the sand strip at y = 0.25)
  const BEACH_Y = 0.12;
  // the hero standing in his boat, riding the hull's exact bob
  const heroInBoat = (expr: Expr, look = -0.15, scale = 1.5) => {
    const bp = heroBoatAt(id, t);
    const y = 0.55 + Math.sin(t * 1.3) * 0.03 + Math.sin(t * 2.4) * 0.01;
    out.places.push(stand(HERO, bp.x, y, bp.z, expr, look, {}, scale));
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // the woman stopped at the rope barrier, facing the island
  const womanAtBarrier = (expr: Expr, x = -1.5, z = BARRIER_Z + 0.6) => {
    out.places.push(stand(WOMAN, x, BEACH_Y, z, expr, 0.3, {}, 1.0));
    blob(out, x, BEACH_Y, z);
  };
  // the priest at the rope barrier, stopping her with a raised hand
  const priestAtBarrier = (expr: Expr = "stern", x = 1.6, z = BARRIER_Z + 0.4) => {
    out.places.push(stand(PRIEST, x, BEACH_Y, z, expr, -0.2, { wave: 1 }, 1.0));
    blob(out, x, BEACH_Y, z);
  };
  const signAtBarrier = () =>
    out.fx.push({ key: "banSign", cw: 512, ch: 320, draw: drawSign, x: 0.2, y: 1.5, z: BARRIER_Z - 0.8, w: 1.6, h: 1.0 });

  if (id === 1) {
    // THE COVER (frame 0): THE ISLAND ITSELF big in the frame,
    // waves + reef torii already moving — a woman stopped at the
    // shore rope, the hero SHOCKED big in his boat beside her,
    // and the claim as one GIANT board.
    heroInBoat("shock", -0.15);
    womanAtBarrier("nervous");
    priestAtBarrier("stern");
    signAtBarrier();
    card("cardHook", ["PULAU LARANG", "PEREMPUAN?!"], 0, 4, -40, 5.0, 0.52);
  } else if (id === 2) {
    // THE ISLAND: high wide over the whole sacred island — shrine
    // on the slope, forest, reef torii; hero small in his boat
    heroInBoat("grin", 0);
    womanAtBarrier("nervous");
    card("cardName", ["PULAU SUCI!"], 0, 4, -55, 4.2, 0.5);
  } else if (id === 3) {
    // THE BAN: close on the rope barrier — the woman stopped, the
    // priest's raised hand, the sign. Respectful, never mocked.
    womanAtBarrier("nervous", -1.2, BARRIER_Z + 0.8);
    priestAtBarrier("stern", 0.9, BARRIER_Z + 0.6);
    signAtBarrier();
    card("cardBan", ["PEREMPUAN", "DILARANG!"], -0.5, 2, -18, 3.4, 0.5);
  } else if (id === 4) {
    // MISOGI: men waist-deep in the sea, bathing to purify —
    // waves moving around them; hero watches from his boat
    const bathers: [Who, number, number, Expr][] = [
      [BATHER, -3.5, -11, "grin"], [BATHER_B, -0.5, -12.5, "neutral"], [BATHER, 2.5, -11.5, "grin"],
    ];
    for (const [who, x, z, expr] of bathers) {
      out.places.push(person(cam, who, x, -1.0, z,
        { mode: "stand", expr, blink: lidAt(t, who.i), look: 0.1 }, 1.0));
    }
    heroInBoat("grin", 0.15);
    card("cardBath", ["MANDI", "DULU!"], -1, 1.5, -12, 3.2, 0.5);
  } else if (id === 5) {
    // THE FESTIVAL (re-hook): 200 men in white crowd the beach,
    // boats at the shore — the one day a year the island opened
    const crowd: [number, number, Who, Expr][] = [
      [-4.2, -15.5, BATHER, "grin"], [-2.6, -16.5, BATHER_B, "grin"], [-0.8, -15.2, BATHER, "laugh"],
      [1.0, -16.2, BATHER_B, "grin"], [2.8, -15.5, BATHER, "grin"], [4.4, -16.8, BATHER_B, "laugh"],
    ];
    for (const [x, z, who, expr] of crowd) {
      out.places.push(stand(who, x, BEACH_Y, z, expr, 0.1, { wave: 1 }, 1.0));
      blob(out, x, BEACH_Y, z);
    }
    heroInBoat("grin", 0.3);
    card("card200", ["200 PRIA", "SETAHUN!"], 0, 2, -16, 3.6, 0.55);
  } else if (id === 6) {
    // THE LONE PRIEST: at the shrine steps, praying alone — the
    // island quiet now, only the rotating priest may land
    out.places.push(stand(PRIEST, -6, 5.5, -38, "neutral", 0, {}, 1.0));
    blob(out, -6, 5.5, -38);
    out.fx.push({ key: "noteA", cw: 256, ch: 256, draw: (p) => fxNote(p, 0, "#2c4a6a"), x: -4.5, y: 7.5, z: -38, w: 0.55, h: 0.55, soft: true });
    card("cardPriest", ["CUMA", "PENDETA!"], -6, 6, -40, 3.0, 0.5);
  } else if (id === 7) {
    // THE LEAF: the hero holds up one green leaf — even a leaf may
    // not leave the island. (The priest waits on the beach, out of
    // this shot's frame; his stern refusal is the card + the VO.)
    heroInBoat("nervous", 0.1);
    out.fx.push({ key: "leafHeld", cw: 256, ch: 256, draw: drawLeaf, x: HERO_BOAT[0] + 1.05, y: 2.6, z: HERO_BOAT[2] - 0.2, w: 0.7, h: 0.7 });
    out.places.push(stand(PRIEST, 0.5, BEACH_Y, -16, "stern", -0.2, { headTilt: 0.15 }, 1.0));
    blob(out, 0.5, BEACH_Y, -16);
    card("cardLeaf", ["DAUN PUN", "DILARANG!"], HERO_BOAT[0], 3.6, HERO_BOAT[2], 2.4, 0.5);
  } else if (id === 8) {
    // THE SILENCE: close on the hero's nervous face — what is
    // seen on the island must never be spoken of
    heroInBoat("nervous", 0);
    card("cardSilence", ["DILARANG", "CERITA!"], HERO_BOAT[0], 2.2, HERO_BOAT[2], 3.5, 0.46);
  } else if (id === 9) {
    // THE TREASURE: mirror, sword and beads glinting on the sand
    // — 80,000 offerings, all National Treasures
    out.fx.push({ key: "treasureMirror", cw: 256, ch: 256, draw: drawMirror, x: -0.9, y: 0.55, z: -14, w: 0.9, h: 0.9 });
    out.fx.push({ key: "treasureSword", cw: 256, ch: 320, draw: drawSword, x: 0.7, y: 0.7, z: -14.5, w: 0.55, h: 0.69 });
    out.fx.push({ key: "treasureBeads", cw: 256, ch: 160, draw: drawBeads, x: 0, y: 0.35, z: -13.2, w: 1.5, h: 0.94, flat: true, rot: 0.4 });
    heroInBoat("grin", 0.2);
    card("cardTreasure", ["80 RIBU", "HARTA!"], 0, 1, -14, 3.2, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same boat,
    // same claim, but the hero is laughing now. Loop to frame 0.
    heroInBoat("laugh", -0.15);
    womanAtBarrier("nervous");
    priestAtBarrier("stern");
    signAtBarrier();
    card("cardHook2", ["PULAU LARANG", "PEREMPUAN?!"], 0, 4, -40, 5.0, 0.52);
  }
  return out;
};
export { FPS };
