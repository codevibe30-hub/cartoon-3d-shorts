// The cast of the Hawaii green-sand frame as lit flat
// sprites in the 3D world: the series hero narrator (teal
// shirt, cream cap) on a green sand beach, a pile of olivine
// crystals, a giant peridot, falling cone crumbs, sorting
// grains, and the giant claim card. Same pool + card machinery
// as the house style: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs. The
// claim card floats as an ink-outlined board via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the
// view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_POS, SAND_POS, GEM_POS, SIGN_POS, CRYSTAL_POS, CONE, heroTrailAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "hawaiiHero" };
// BEACHGOERS: a coral-shirt local + a sun-dress visitor.
const LOCAL_A: Who = { i: 61, o: { jacket: "#d96a4a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "hawaiiLocalA" };
const LOCAL_B: Who = { i: 62, o: { jacket: "#33526e", dress: "#e8c832", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#2e211a", skin: "#f5c9a0" }, okey: "hawaiiLocalB" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A HANDFUL OF OLIVINE CRYSTALS (512x256): faceted green
 *  diamonds piled in a heap, lime glints on every facet — the
 *  proof you can hold in your palm that the sand is gemstone. */
const drawCrystals = (p: Pen) => {
  const g = p.g;
  const r = rng(5150);
  const shard = (x: number, y: number, s: number, rot: number, lite: boolean) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    const grad = g.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, lite ? "#d8ec78" : "#a8c832");
    grad.addColorStop(0.55, lite ? "#9ec22e" : "#6b8e1a");
    grad.addColorStop(1, "#3f5a10");
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.8, 0); g.lineTo(0, s); g.lineTo(-s * 0.8, 0); g.closePath(); g.fill();
    g.strokeStyle = "rgba(30,50,5,0.7)"; g.lineWidth = 3; g.stroke();
    g.strokeStyle = "rgba(255,255,230,0.75)"; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-s * 0.45, -s * 0.3); g.lineTo(0, -s * 0.7); g.lineTo(s * 0.4, -s * 0.2); g.stroke();
    g.restore();
  };
  for (let i = 0; i < 16; i++) {
    shard(70 + r() * 372, 60 + r() * 130, 18 + r() * 26, r() * 3.2, r() > 0.45);
  }
  // sparkle stars on the pile
  g.fillStyle = "rgba(255,255,220,0.95)";
  for (const [x, y, s] of [[120, 70, 14], [300, 52, 18], [420, 110, 12], [200, 150, 13]] as const) {
    g.beginPath();
    g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
    g.fill();
  }
};
/** A single olivine chunk (128x128): a faceted green diamond
 *  tumbling off the cone face — shot 5's falling crumbs. */
const drawChunk = (p: Pen) => {
  const g = p.g;
  const grad = g.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, "#c8e64a"); grad.addColorStop(0.55, "#7fae1f"); grad.addColorStop(1, "#4a6a10");
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(64, 8); g.lineTo(120, 64); g.lineTo(64, 120); g.lineTo(8, 64); g.closePath(); g.fill();
  g.strokeStyle = "rgba(30,50,5,0.8)"; g.lineWidth = 5; g.stroke();
  g.strokeStyle = "rgba(255,255,230,0.8)"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(30, 44); g.lineTo(64, 22); g.lineTo(96, 48); g.stroke();
};
/** A black lava grain (64x64): the light stuff the surf sweeps
 *  out to sea — shot 6's sorting beat. */
const drawBlackGrain = (p: Pen) => {
  p.ell(32, 34, 16, 12, "#1c1a16", 0);
  p.ell(28, 30, 6, 4, "#4a463e", 0);
};
/** A green olivine grain (64x64): the heavy stuff that stays. */
const drawGreenGrain = (p: Pen) => {
  p.ell(32, 34, 16, 12, "#7fae1f", 0);
  p.ell(28, 30, 6, 4, "#d8ec78", 0);
};
/** A sparkle star (128x128, soft): the glint on a crystal. */
const drawSparkle = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "rgba(255,252,220,0.95)";
  g.beginPath();
  g.moveTo(64, 4); g.quadraticCurveTo(70, 58, 124, 64); g.quadraticCurveTo(70, 70, 64, 124);
  g.quadraticCurveTo(58, 70, 4, 64); g.quadraticCurveTo(58, 58, 64, 4);
  g.fill();
};
/** THE NO-TAKING SIGN (256x320): post, white disc, red ring, a
 *  hand scooping green sand under a red slash — Papakolea in
 *  one pictogram. */
export const drawNoTake = (p: Pen) => {
  p.poly([[118, 196], [138, 196], [138, 316], [118, 316]], "#6a4a2c", 6);
  p.ell(128, 110, 97, 97, "#d42f2f", 0);
  p.ell(128, 110, 75, 75, "#f6ecd2", 0);
  // a hand scooping a pile of green sand
  p.ell(128, 138, 34, 12, "#f5c9a0", 0);
  p.ell(112, 128, 10, 12, "#f5c9a0", 0);
  p.ell(128, 126, 10, 12, "#f5c9a0", 0);
  p.ell(144, 128, 10, 12, "#f5c9a0", 0);
  p.ell(128, 108, 30, 16, "#7fae1f", 0);
  p.ell(118, 100, 10, 7, "#d8ec78", 0);
  p.ell(140, 98, 8, 6, "#a8c832", 0);
  p.line([[64, 48], [192, 172]], "#d42f2f", 20, false);
};
/** Trail dust (256x256, soft): puffs kicked up by hiking boots. */
const drawDust = (p: Pen) => {
  const r = rng(777);
  for (let i = 0; i < 22; i++) {
    p.dot(40 + r() * 176, 90 + r() * 110, 6 + r() * 14, `rgba(214,196,160,${0.25 + r() * 0.35})`);
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
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_POS[0], z = HERO_POS[2]) => {
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));
    blob(out, x, 0, z, scale);
  };
  const sign = () => out.fx.push({ key: "noTakeSign", cw: 256, ch: 320, draw: drawNoTake, x: SIGN_POS[0], y: 1.22, z: SIGN_POS[2], w: 1.3, h: 1.63 });
  const local = (who: Who, x: number, z: number, expr: Expr, scale = 1.0) => {
    out.places.push(stand(who, x, 0, z, expr, 0.2, {}, scale));
    blob(out, x, 0, z, scale);
  };
  const sparkleFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: "sparkle", cw: 128, ch: 128, draw: drawSparkle, x, y, z, w, h: w, soft: true });

  if (id === 1) {
    // THE COVER (frame 0): the GIANT green sand dune already
    // sparkling with waves washing its base — motion from
    // frame 0. The hero, shocked, at its side; the claim as
    // one GIANT board; the sign says it all.
    heroAt("shock", -0.15);
    local(LOCAL_A, -2.6, 3.0, "grin", 1.0);
    sign();
    sparkleFx(-1.0, 1.9, -2.0, 1.1);
    sparkleFx(2.2, 1.1, -4.5, 0.8);
    card("cardHook", ["PASIR", "HIJAU!"], SAND_POS[0], 2.6, SAND_POS[2], 4.6, 0.52);
  } else if (id === 2) {
    // THE BAY: high wide — Pu'u Mahana wrapping the green
    // beach, turquoise sea beyond, the hero small and happy
    heroAt("grin", 0, 1.05);
    local(LOCAL_A, -5.5, 0.5, "grin", 0.95);
    local(LOCAL_B, 5.8, 1.2, "laugh", 0.95);
    card("cardBay", ["PAPAKOLEA"], -4, 3, -50, 4.6, 0.5);
  } else if (id === 3) {
    // THE PROOF: close on the hero's hands — a heap of green
    // crystals, sparkling. Not lumut, not editan: gemstone.
    heroAt("relief_open", 0.1, 1.2, -1.2, 4.6);
    out.fx.push({ key: "crystals", cw: 512, ch: 256, draw: drawCrystals, x: CRYSTAL_POS[0], y: CRYSTAL_POS[1], z: CRYSTAL_POS[2], w: 1.7, h: 0.85 });
    sparkleFx(CRYSTAL_POS[0] - 0.5, CRYSTAL_POS[1] + 0.35, CRYSTAL_POS[2], 0.5);
    sparkleFx(CRYSTAL_POS[0] + 0.55, CRYSTAL_POS[1] + 0.3, CRYSTAL_POS[2], 0.42);
    card("cardOlivine", ["90%", "OLIVIN"], CRYSTAL_POS[0], 1.15, CRYSTAL_POS[2], 3.4, 0.48);
  } else if (id === 4) {
    // THE GEM: the giant peridot (3D, in world.ts) turning
    // slowly on the sand — the hero grinning beside a gemstone
    heroAt("grin", -0.1, 1.2, 2.2, 0.2);
    sparkleFx(GEM_POS[0] - 0.9, 3.4, GEM_POS[2], 0.7);
    sparkleFx(GEM_POS[0] + 1.1, 2.4, GEM_POS[2], 0.55);
    sparkleFx(GEM_POS[0], 4.1, GEM_POS[2], 0.6);
    card("cardPeridot", ["PERIDOT!"], GEM_POS[0], 2.4, GEM_POS[2], 3.6, 0.5);
  } else if (id === 5) {
    // THE OLD CONE: low angle up at Pu'u Mahana's ash strata —
    // olivine chunks keep tumbling off its face onto the beach
    heroAt("nervous", 0.2, 1.1, 1.8, 0.5);
    for (let j = 0; j < 6; j++) {
      const fall = (U * 1.6 + j * 0.17) % 1;
      out.fx.push({
        key: "crumb", cw: 128, ch: 128, draw: drawChunk,
        x: -6.5 + j * 1.4, y: 10.5 - fall * 8.5, z: -40, w: 0.55, h: 0.55,
      });
    }
    card("cardCone", ["49.000", "TAHUN"], CONE[0], 7, CONE[2], 3.8, 0.5);
  } else if (id === 6) {
    // THE SORTING: low at the waterline — black grains drift
    // out to sea with the wash while green grains stay put
    heroAt("relief_open", 0.15, 1.1, 2.0, 1.0);
    for (let j = 0; j < 8; j++) {
      const drift = (U * 0.9 + j * 0.13) % 1;
      out.fx.push({
        key: "blackGrain", cw: 64, ch: 64, draw: drawBlackGrain,
        x: -3.2 + j * 0.85, y: 0.14, z: -2.5 - drift * 6.5, w: 0.34, h: 0.34,
      });
    }
    for (let j = 0; j < 8; j++) {
      out.fx.push({
        key: "greenGrain", cw: 64, ch: 64, draw: drawGreenGrain,
        x: -2.8 + j * 0.8, y: 0.14, z: -1.2 - (j % 3) * 0.9, w: 0.34, h: 0.34,
      });
    }
    card("cardSort", ["RINGAN", "HANYUT!"], -0.6, 0.8, -8, 3.1, 0.5);
  } else if (id === 7) {
    // THE HIKE: tracking the hero down the dirt trail — dust
    // at his boots, the beach waiting at the end
    const hp = heroTrailAt(7, t);
    out.places.push(stand(HERO, hp.x, 0, hp.z, "grin", 0.1, {}, 1.15));
    blob(out, hp.x, 0, hp.z, 1.15);
    const step = Math.floor(t * 2.4) % 2;
    out.fx.push({ key: `dust${step}`, cw: 256, ch: 256, draw: drawDust, x: hp.x + 0.2, y: 0.3, z: hp.z + 0.4, w: 1.1, h: 1.1, soft: true });
    local(LOCAL_A, 7.8, 12.5, "grin", 1.0);
    card("cardHike", ["4,5 KM", "JALAN KAKI"], 4.5, 1.5, 10, 3.4, 0.5);
  } else if (id === 8) {
    // THE RULE: the no-taking sign — one hand reaching for the
    // sand, the hero shocked at the idea
    heroAt("shock", 0.25, 1.25, 0.8, 6.2);
    sign();
    card("cardRule", ["DILARANG", "AMBIL!"], SIGN_POS[0], 1.5, SIGN_POS[2], 3.2, 0.48);
  } else if (id === 9) {
    // THE TWIST: wide on the cone + the beach as the grey veil
    // (world.ts) creeps over the green — the supply is finite
    heroAt("nervous", -0.1, 1.3, 2.8, 2.0);
    local(LOCAL_B, -4.5, 0.8, "nervous", 1.0);
    card("cardFinite", ["STOK", "TERBATAS!"], -4, 4, -48, 3.9, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — the
    // green sand still sparkling, the hero laughing now.
    // You are walking on gemstones. Loop to frame 0.
    heroAt("laugh", -0.15);
    local(LOCAL_A, -2.6, 3.0, "laugh", 1.0);
    sign();
    sparkleFx(-1.0, 1.9, -2.0, 1.1);
    sparkleFx(2.2, 1.1, -4.5, 0.8);
    card("cardHook2", ["PASIR", "HIJAU!"], SAND_POS[0], 2.6, SAND_POS[2], 4.6, 0.52);
  }
  return out;
};
export { FPS };
