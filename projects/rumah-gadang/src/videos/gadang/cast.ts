// The cast of the Rumah Gadang frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream
// cap) before the great swaying house, Minang locals, the
// women of the house on the porch, two buffaloes facing off
// in the dirt arena — the giant one and the baby with the
// knife-sharp horns — a wooden peg joint, and the giant
// claim card. Same pool + card machinery as the house style:
// one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The claim card floats
// as an ink-outlined board via drawCardFit (auto-fit: text
// NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, smooth, camAt, HOUSE_C, ARENA_C, HERO_POS, BUFFALO_BIG_POS, BUFFALO_BABY_POS, STONE_POS, FLOOR_Y } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "gadangHero" };
// PAK: a Minang elder in maroon + a black cap.
const PAK: Who = { i: 61, o: { jacket: "#a52a22", pants: "#2e2a26", boots: "#5a3b2a", hat: "cap", cap: "#1c1a16" }, okey: "gadangPak" };
// THE WOMEN OF THE HOUSE: baju kurung colours, hair dressed.
const IBU_A: Who = { i: 62, o: { jacket: "#33526e", dress: "#b03a5b", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1c1410", skin: "#f5c9a0" }, okey: "gadangIbuA" };
const IBU_B: Who = { i: 63, o: { jacket: "#7a4a28", dress: "#2e6e5e", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#2e211a", skin: "#eebd8f" }, okey: "gadangIbuB" };
// A KID from the nagari crowd.
const ANAK: Who = { i: 64, o: { jacket: "#e8a13a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#c0353a", build: "kid" }, okey: "gadangAnak" };

// ---------------- episode props (drawn, never pasted) ----------------
/** THE GIANT BUFFALO (512x384), front-facing: a dark water
 *  buffalo's head + shoulders, the great crescent horns
 *  sweeping up and out — the invader's champion, all muscle
 *  and menace, a rope through its nose. */
const drawBuffaloBig = (p: Pen) => {
  const g = p.g;
  // shoulders
  p.ell(256, 400, 235, 120, "#453a30", 0);
  p.ell(180, 330, 90, 60, "#52453a", 0);
  p.ell(330, 330, 90, 60, "#3c332a", 0);
  // ears, wide under the horns
  p.ell(92, 208, 52, 26, "#52453a", 8, -0.5);
  p.ell(420, 208, 52, 26, "#453a30", 8, 0.5);
  p.ell(96, 210, 30, 13, "#8a6a58", 0, -0.5);
  p.ell(416, 210, 30, 13, "#8a6a58", 0, 0.5);
  // THE HORNS: one great crescent band, ivory-grey, dark at
  // the roots and pale at the tips, a gloss line on top
  p.arc(256, 205, 178, 128, 198, 342, 40, "#8f8474");
  p.arc(256, 200, 178, 128, 198, 342, 34, "#d8cbb2");
  p.arc(256, 192, 172, 122, 205, 335, 9, "#f4ecd8");
  // head
  p.ell(256, 218, 104, 112, "#57493c", 8);
  p.ell(256, 168, 88, 62, "#61503f", 0);
  // forehead tuft
  p.ell(256, 118, 44, 22, "#33291f", 0);
  // eyes: hard little glares
  p.ell(206, 224, 13, 15, "#14100c", 0);
  p.ell(306, 224, 13, 15, "#14100c", 0);
  p.dot(210, 219, 4, "#ffffff");
  p.dot(310, 219, 4, "#ffffff");
  // muzzle + nostrils + nose rope
  p.ell(256, 306, 76, 46, "#6e5c4a", 6);
  p.ell(228, 302, 15, 10, "#241a12", 0);
  p.ell(284, 302, 15, 10, "#241a12", 0);
  p.line([[196, 322], [316, 322]], "#3a2c1e", 7, false);
  p.ell(256, 330, 10, 12, "#c8b060", 3);
  g.strokeStyle = "rgba(20,14,8,0.5)"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(266, 336); g.quadraticCurveTo(300, 366, 288, 384); g.stroke();
};
/** THE BABY BUFFALO (512x384), front-facing: a small light-
 *  brown calf with big ears, big innocent eyes — and two
 *  KNIFE-BLADE horns, sharpened steel strapped to its head,
 *  glinting. The Minang champion. */
const drawBuffaloBaby = (p: Pen) => {
  const g = p.g;
  // little shoulders
  p.ell(256, 408, 185, 96, "#7d5c3c", 8);
  p.ell(190, 348, 70, 46, "#96754f", 0);
  // big ears
  p.ell(108, 216, 56, 28, "#8a6a4a", 8, -0.5);
  p.ell(404, 216, 56, 28, "#8a6a4a", 8, 0.5);
  p.ell(112, 218, 33, 14, "#c99b78", 0, -0.5);
  p.ell(400, 218, 33, 14, "#c99b78", 0, 0.5);
  // THE BLADE HORNS: curved steel, bright edge, dark root strap
  for (const s of [-1, 1]) {
    const cx = 256 + s * 108, cy = 128;
    const grad = g.createLinearGradient(cx - 60, cy - 60, cx + 60, cy + 40);
    grad.addColorStop(0, "#f2f5f7"); grad.addColorStop(0.5, "#b9c2c9"); grad.addColorStop(1, "#7e8891");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx - s * 8, cy + 42);
    g.quadraticCurveTo(cx + s * 66, cy + 18, cx + s * 62, cy - 58);
    g.quadraticCurveTo(cx + s * 30, cy - 6, cx + s * 20, cy + 30);
    g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 6; g.lineJoin = "round"; g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx + s * 52, cy - 44); g.quadraticCurveTo(cx + s * 58, cy + 4, cx + s * 30, cy + 24); g.stroke();
    // the leather strap holding the blade
    p.ell(cx - s * 6, cy + 44, 17, 10, "#5d3a1a", 4);
  }
  // head: rounder, higher forehead
  p.ell(256, 232, 96, 104, "#9a7852", 8);
  p.ell(256, 182, 80, 56, "#a8865e", 0);
  p.ell(256, 132, 38, 19, "#6e5136", 0);
  // big innocent eyes
  p.ell(212, 232, 15, 18, "#17110b", 0);
  p.ell(300, 232, 15, 18, "#17110b", 0);
  p.dot(217, 225, 5.5, "#ffffff");
  p.dot(305, 225, 5.5, "#ffffff");
  // soft muzzle, still looking for milk
  p.ell(256, 312, 66, 40, "#b08a62", 6);
  p.ell(232, 308, 12, 8, "#4a3421", 0);
  p.ell(280, 308, 12, 8, "#4a3421", 0);
  // sparkle stars on the blades
  g.fillStyle = "rgba(255,255,240,0.95)";
  for (const [x, y, s] of [[140, 66, 15], [378, 60, 18], [256, 40, 11]] as const) {
    g.beginPath();
    g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
    g.fill();
  }
};
/** THE PEG JOINT (256x256): two great beams crossing, held
 *  by one fat wooden peg — no nail, no bolt, just carved
 *  wood gripping wood. */
const drawPeg = (p: Pen) => {
  const g = p.g;
  const beam = (x: number, y: number, w: number, h: number, vert: boolean) => {
    const grad = vert ? g.createLinearGradient(x, y, x + w, y) : g.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#a8743c"); grad.addColorStop(0.5, "#8a5c30"); grad.addColorStop(1, "#6e4522");
    g.fillStyle = grad; g.fillRect(x, y, w, h);
    g.strokeStyle = INK; g.lineWidth = 7; g.strokeRect(x, y, w, h);
    const rr = rng(x * 7 + y);
    g.strokeStyle = "rgba(46,26,8,0.4)"; g.lineWidth = 2.4;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      if (vert) { const gx = x + 8 + rr() * (w - 16); g.moveTo(gx, y + 6); g.lineTo(gx + (rr() - 0.5) * 5, y + h - 6); }
      else { const gy = y + 8 + rr() * (h - 16); g.moveTo(x + 6, gy); g.lineTo(x + w - 6, gy + (rr() - 0.5) * 5); }
      g.stroke();
    }
  };
  beam(14, 100, 228, 56, false);
  beam(100, 14, 56, 228, true);
  // the peg itself, proud of the joint, with its wedge head
  const pg = g.createRadialGradient(118, 112, 4, 128, 122, 30);
  pg.addColorStop(0, "#c99a5c"); pg.addColorStop(1, "#7a4e22");
  g.fillStyle = pg; g.beginPath(); g.arc(128, 122, 27, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.stroke();
  g.fillStyle = "rgba(60,36,10,0.65)"; g.beginPath(); g.arc(128, 122, 8, 0, 7); g.fill();
  g.fillStyle = "rgba(255,240,200,0.8)"; g.beginPath(); g.arc(119, 112, 5, 0, 7); g.fill();
};
/** A sparkle star (128x128, soft): the glint on a blade. */
const drawSparkle = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "rgba(255,252,220,0.95)";
  g.beginPath();
  g.moveTo(64, 4); g.quadraticCurveTo(70, 58, 124, 64); g.quadraticCurveTo(70, 70, 64, 124);
  g.quadraticCurveTo(58, 70, 4, 64); g.quadraticCurveTo(58, 58, 64, 4);
  g.fill();
};
/** Arena dust (256x256, soft): puffs kicked up by the duel. */
const drawDust = (p: Pen) => {
  const r = rng(777);
  for (let i = 0; i < 22; i++) {
    p.dot(40 + r() * 176, 90 + r() * 110, 6 + r() * 14, `rgba(216,192,148,${0.25 + r() * 0.35})`);
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
  const local = (who: Who, x: number, z: number, expr: Expr, scale = 1.0, y = 0) => {
    out.places.push(stand(who, x, y, z, expr, 0.2, {}, scale));
    blob(out, x, y, z, scale);
  };
  const sparkleFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: "sparkle", cw: 128, ch: 128, draw: drawSparkle, x, y, z, w, h: w, soft: true });
  const buffaloBig = (x: number, z: number, rot = 0, drop = 0) => {
    out.fx.push({ key: "buffaloBig", cw: 512, ch: 384, draw: drawBuffaloBig, x, y: 1.32 - drop, z, w: 3.6, h: 2.7, rot });
    blob(out, x, 0, z, 1.6);
  };
  const buffaloBaby = (x: number, z: number, rot = 0) => {
    out.fx.push({ key: "buffaloBaby", cw: 512, ch: 384, draw: drawBuffaloBaby, x, y: 0.62, z, w: 1.65, h: 1.24, rot });
    blob(out, x, 0, z, 0.8);
  };

  if (id === 1) {
    // THE COVER (frame 0): the GIANT rumah gadang already
    // SWAYING on its stones — motion from frame 0. The hero,
    // shocked, at its side; the claim as one GIANT board.
    heroAt("shock", -0.15);
    local(PAK, -1.4, 3.4, "grin", 1.0);
    card("cardHook", ["TANPA", "PONDASI!"], HOUSE_C[0], 3.4, HOUSE_C[2], 4.9, 0.52);
  } else if (id === 2) {
    // THE VALLEY: high wide — terraces, volcanoes, and the
    // great house at the centre of its world
    heroAt("grin", 0, 1.05);
    local(IBU_A, -4.6, 2.0, "grin", 0.95);
    local(PAK, 6.2, 2.6, "laugh", 0.95);
    card("cardName", ["RUMAH", "GADANG"], HOUSE_C[0], 3.4, HOUSE_C[2], 4.6, 0.5);
  } else if (id === 3) {
    // THE HORNS: low angle up at the gonjong roofline — the
    // hero small below, pointing the eye up at the peaks
    heroAt("grin", 0.1, 1.15, 1.6, 3.6);
    card("cardHorns", ["TANDUK", "KERBAU!"], HOUSE_C[0], 9.2, HOUSE_C[2], 2.4, 0.5);
  } else if (id === 4) {
    // THE CHALLENGE: the arena — a giant buffalo and a baby
    // buffalo face off across the dirt, the nagari watching
    buffaloBig(BUFFALO_BIG_POS[0], BUFFALO_BIG_POS[2]);
    buffaloBaby(BUFFALO_BABY_POS[0], BUFFALO_BABY_POS[2]);
    heroAt("nervous", 0.1, 1.1, 5.2, 25.4);
    local(PAK, -4.7, 25.2, "stern", 1.1);
    local(ANAK, -3.8, 27.2, "grin", 0.85);
    card("cardDuel", ["ADU", "KERBAU!"], ARENA_C[0], 1.6, ARENA_C[2], 3.8, 0.5);
  } else if (id === 5) {
    // THE TRICK: close on the baby — and on the two little
    // blades strapped to its head, sharpened like knives
    buffaloBaby(BUFFALO_BABY_POS[0], BUFFALO_BABY_POS[2]);
    sparkleFx(BUFFALO_BABY_POS[0] - 0.42, 1.62, BUFFALO_BABY_POS[2], 0.42);
    sparkleFx(BUFFALO_BABY_POS[0] + 0.45, 1.68, BUFFALO_BABY_POS[2], 0.36);
    heroAt("relief_open", 0.15, 0.95, 4.3, 22.8);
    card("cardBlades", ["TANDUK", "PISAU!"], BUFFALO_BABY_POS[0], 1.0, BUFFALO_BABY_POS[2], 2.7, 0.48);
  } else if (id === 6) {
    // THE WIN (the re-hook): the baby charges, the giant
    // topples — and the whole nagari erupts
    const charge = smooth((U - 0.12) / 0.4);
    const tip = smooth((U - 0.55) / 0.25);
    buffaloBaby(BUFFALO_BABY_POS[0] + (0.2 - BUFFALO_BABY_POS[0]) * charge, BUFFALO_BABY_POS[2], -0.05 * charge);
    buffaloBig(BUFFALO_BIG_POS[0] - 0.5 * tip, BUFFALO_BIG_POS[2], -1.22 * tip, 0.5 * tip);
    if (U > 0.48 && U < 0.8) {
      out.fx.push({ key: "duelDust", cw: 256, ch: 256, draw: drawDust, x: -0.6, y: 0.5, z: 21, w: 2.4, h: 2.4, soft: true });
    }
    local(PAK, -4.7, 25.2, "laugh", 1.1);
    local(ANAK, -3.8, 27.2, "laugh", 0.85);
    local(IBU_A, 4.9, 26.4, "laugh", 1.0);
    heroAt("laugh", 0.1, 1.1, 5.2, 24.2);
    card("cardWin", ["MENANG!"], ARENA_C[0], 1.6, ARENA_C[2], 3.9, 0.5);
  } else if (id === 7) {
    // THE SECRET, CLOSE: under the house — a post resting on
    // its flat stone, and one fat peg holding the beams
    out.fx.push({ key: "pegJoint", cw: 256, ch: 256, draw: drawPeg, x: STONE_POS[0] + 1.1, y: 0.85, z: STONE_POS[2] + 0.4, w: 1.05, h: 1.05 });
    heroAt("relief_open", 0.15, 1.15, 0.7, 1.9);
    card("cardPeg", ["TANPA", "PAKU!"], STONE_POS[0], 0.8, STONE_POS[2], 2.7, 0.48);
  } else if (id === 8) {
    // THE QUAKE: the ground shakes, dust puffs at the stone
    // row (world.ts), and the great house ROCKS on its
    // stones — dancing, not falling
    heroAt("nervous", -0.1, 1.4, 2.2, 5.4);
    local(IBU_B, -2.4, 4.6, "nervous", 1.0);
    card("cardQuake", ["GEMPA", "8+ SR!"], HOUSE_C[0], 3.6, HOUSE_C[2], 4.7, 0.5);
  } else if (id === 9) {
    // THE OWNERS: the women of the house on their own porch,
    // the hero below the stairs — a guest in their house
    out.places.push(stand(IBU_A, -1.9, FLOOR_Y, -2.7, "grin", 0.1, {}, 1.05));
    blob(out, -1.9, FLOOR_Y, -2.7, 1.05);
    out.places.push(stand(IBU_B, 1.7, FLOOR_Y, -2.8, "smile", -0.1, {}, 1.05));
    blob(out, 1.7, FLOOR_Y, -2.8, 1.05);
    heroAt("grin", 0.1, 1.15, 1.7, 3.4);
    local(PAK, -1.9, 3.6, "grin", 1.0);
    card("cardIbu", ["MILIK", "IBU!"], HOUSE_C[0], 4.6, HOUSE_C[2], 3.1, 0.48);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — the
    // great house still rocking gently on its stones, the
    // hero laughing now. No foundation, no nails — and it
    // has out-danced earthquakes for centuries. Loop home.
    heroAt("laugh", -0.15);
    local(PAK, -1.4, 3.4, "laugh", 1.0);
    card("cardHook2", ["TANPA", "PONDASI!"], HOUSE_C[0], 3.4, HOUSE_C[2], 4.9, 0.52);
  }
  return out;
};
export { FPS };
