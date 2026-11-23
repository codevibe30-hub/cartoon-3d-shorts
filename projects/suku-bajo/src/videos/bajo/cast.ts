// The cast of the Suku Bajo short as lit flat sprites in the
// 3D world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED in his lepa boat in the near foreground,
// Bajo villagers living their sea life behind him — on the
// walkways, in the water, under it — and the giant claim card.
// Same pool + card machinery as the house style: one canvas per
// distinct drawing, yaw-only billboards shaded by cardShade(),
// soft contact blobs. The claim card floats as an ink-outlined
// board via drawCardFit (auto-fit: text NEVER overflows the
// board), glued to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_BOAT, heroBoatAt, diveAt, walkAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "bajoHero" };
// BAJO VILLAGERS: life on the walkways and in the water.
const BAJO_A: Who = { i: 61, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "bajoA" };
const BAJO_B: Who = { i: 62, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "bajoB" };
// BAJO KIDS: born in the water — swimming before they can walk.
const KID_A: Who = { i: 71, o: { jacket: "#d83a4a", pants: "#2c4a6a", boots: "#5a3b2a", hat: "hair", hair: "#1d1410", skin: "#a06a3c" }, okey: "bajoKidA" };
const KID_B: Who = { i: 72, o: { jacket: "#2e9e6a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#241611", skin: "#8a5a30" }, okey: "bajoKidB" };

// ---------------- episode props (drawn, never pasted) ----------------
/** One reef fish in side profile (256x160): an oval body, a
 *  forked tail, a dorsal fin, a gill curve and a bright eye —
 *  painted per colour so the reef can school in several hues. */
export const drawFish = (col: string, belly: string) => (p: Pen) => {
  p.poly([[52, 80], [16, 44], [22, 80], [16, 116]], col, 8);            // tail
  p.ell(140, 80, 92, 46, col, 9);                                       // body
  p.ell(140, 94, 88, 30, belly, 0);                                     // belly light
  p.poly([[110, 40], [150, 14], [168, 42]], col, 7);                    // dorsal fin
  p.arc(168, 80, 26, 40, 70, 290, 7, "#1c2a3a");                        // gill curve
  p.dot(196, 68, 9);                                                    // eye rim
  const g = p.g; g.fillStyle = "#ffffff"; g.beginPath(); g.arc(196, 68, 4.5, 0, 7); g.fill();
};
/** A rising bubble cluster (128x256): stroked rings growing as
 *  they climb, each with a white highlight tick. */
export const drawBubbles = (p: Pen) => {
  const g = p.g;
  const rings: [number, number, number][] = [[38, 218, 13], [66, 168, 18], [44, 112, 24], [74, 52, 31], [52, 14, 15]];
  for (const [x, y, r] of rings) {
    g.strokeStyle = "rgba(230,248,255,0.95)"; g.lineWidth = 4.5;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.strokeStyle = "rgba(255,255,255,1)"; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, r, -2.4, -1.5); g.stroke();
  }
};
/** The spleen (256x256): a dark-red bean with a lighter hilum
 *  notch and a stubby artery — the Bajau's built-in oxygen
 *  tank, drawn as a friendly organ mascot for the re-hook. */
export const drawSpleen = (p: Pen) => {
  const g = p.g;
  p.ell(128, 128, 96, 74, "#a02534", 11);
  p.ell(104, 100, 52, 34, "#c04a58", 0);
  p.ell(176, 128, 20, 34, "#7c1626", 0);
  g.fillStyle = "#e8e2d2";
  g.beginPath(); g.ellipse(182, 128, 9, 26, 0, 0, 7); g.fill();
  p.line([[196, 104], [228, 84]], "#c8b18a", 13);
  p.line([[196, 152], [226, 170]], "#8a4a5a", 11);
  // a few oxygen bubbles escaping the hilum — it is WORKING
  g.strokeStyle = "rgba(230,248,255,0.9)"; g.lineWidth = 3.5;
  for (const [x, y, r] of [[214, 60, 7], [230, 38, 10], [206, 26, 5]] as [number, number, number][]) {
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
};
/** A DNA double helix (256x320): two sine chains of dots with
 *  rungs — evolution you can see, for the genetics beat. */
export const drawHelix = (p: Pen) => {
  const g = p.g;
  const cols = ["#e8c832", "#3fa7d6", "#e86a9a", "#7bc950"];
  for (let i = 0; i <= 10; i++) {
    const y = 18 + i * 28;
    const ph = i * 0.85;
    const x1 = 128 + Math.sin(ph) * 62, x2 = 128 - Math.sin(ph) * 62;
    g.strokeStyle = "rgba(240,244,250,0.75)"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
  }
  for (let i = 0; i <= 20; i++) {
    const y = 18 + i * 14;
    const ph = i * 0.425;
    for (const sgn of [1, -1]) {
      const x = 128 + sgn * Math.sin(ph) * 62;
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.arc(x, y, 10 - Math.abs(Math.cos(ph)) * 3, 0, 7); g.fill();
      g.strokeStyle = "#16222e"; g.lineWidth = 3; g.stroke();
    }
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
  // the hero standing in his boat, riding the hull's exact bob
  const heroInBoat = (expr: Expr, look = -0.15, scale = 1.5) => {
    const bp = heroBoatAt(id, t);
    const y = 0.55 + Math.sin(t * 1.3) * 0.03 + Math.sin(t * 2.4) * 0.01;
    out.places.push(stand(HERO, bp.x, y, bp.z, expr, look, {}, scale));
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const villagerWalkway = () => out.places.push(stand(BAJO_A, -0.8, 1.08, -34, "grin", 0.1, { wave: 1 }, 0.95));
  const villagerPorch = (z = -13) => { out.places.push(stand(BAJO_B, -6.9, 1.08, z, "grin", 0.2, {}, 1.0)); blob(out, -6.9, 1.08, z); };
  // a reef fish crossing the underwater frame, forever swimming
  const fishFx = (key: string, col: string, belly: string, y: number, z: number, sp: number, off: number, w = 1.15) => {
    const x = -17 + ((tt * sp + off) % 36);
    out.fx.push({ key, cw: 256, ch: 160, draw: drawFish(col, belly), x, y, z, w, h: w * 0.625, soft: true });
  };
  // a bubble cluster rising past a point, looping
  const bubbleFx = (key: string, x: number, yBase: number, z: number, ph: number) => {
    const rise = ((tt * 0.85 + ph) % 2.6);
    out.fx.push({ key, cw: 128, ch: 256, draw: drawBubbles, x, y: yBase + rise, z, w: 0.55, h: 1.1, soft: true });
  };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big in the lepa
    // in the near foreground — behind him a whole village living
    // on the water, and the claim as one GIANT board.
    heroInBoat("shock", -0.15);
    villagerWalkway();
    villagerPorch();
    card("cardHook", ["TAHAN NAPAS", "13 MENIT?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE NAME: high wide over the whole sea village — hero small
    // in his boat below, houses running away to the island
    heroInBoat("grin", 0);
    villagerWalkway();
    villagerPorch();
    card("cardName", ["SUKU BAJO"], 0, 2, -40, 4.2, 0.5);
  } else if (id === 3) {
    // THE BOAT RIDE: the hero sails down-channel between the
    // stilt houses while a kid swims alongside and a villager
    // strolls the walkway — traffic here is hulls and splashes
    heroInBoat("grin", 0.15);
    const kz = -2 - U * 9;
    out.places.push(stand(KID_A, -3.6, -0.55, kz, "grin", 0.15, {}, 0.62));
    blob(out, -3.6, 0.02, kz, 0.8);
    out.places.push(person(cam, BAJO_B, 6.9, 1.08, -26 + U * 16,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, BAJO_B.i), look: 0.15 }, 1.0));
    const bp = heroBoatAt(3, t);
    card("cardHours", ["8 JAM", "TIAP HARI!"], bp.x, 2.5, bp.z, 3.2, 0.5);
  } else if (id === 4) {
    // THE DIVE (underwater): the hero sinks head-first past the
    // reef wall, bubbles streaming up, fish crossing — one
    // breath, no tank, down toward 70 metres
    const d = diveAt(t);
    out.places.push({ ...person(cam, HERO, d.x, d.y, d.z,
      { mode: "stand", expr: "stern", blink: lidAt(t, HERO.i), look: 0 }, 1.35, d.pitch), roll: d.roll });
    bubbleFx("bubA", d.x + 0.35, d.y + 1.7, d.z + 0.25, 0);
    bubbleFx("bubB", d.x - 0.3, d.y + 1.2, d.z - 0.3, 1.4);
    fishFx("fishA", "#e8a13c", "#f7d774", -9.5, -31, 1.25, 0);
    fishFx("fishB", "#3fa7d6", "#bfe6f5", -12.5, -34, 0.95, 14);
    fishFx("fishC", "#e86a9a", "#f7c3d8", -7.5, -28, 1.55, 24, 0.9);
    card("cardDepth", ["70 METER!"], d.x, d.y - 1, d.z, 2.8, 0.5);
  } else if (id === 5) {
    // THE RE-HOOK: close on the hero back at his boat as the
    // spleen appears beside him — 50 percent bigger, a built-in
    // oxygen tank science measured in 2018
    heroInBoat("shock", 0);
    out.fx.push({ key: "spleenA", cw: 256, ch: 256, draw: drawSpleen, x: 3.15, y: 2.4, z: 6.9, w: 1.2, h: 1.2, soft: true });
    villagerPorch(-20);
    card("cardSpleen", ["LIMPA +50%!"], HERO_BOAT[0], 2.5, HERO_BOAT[2], 4.6, 0.46);
  } else if (id === 6) {
    // THE BOTTOM WALK (underwater): the hero walks the sand
    // between corals like a Bajau hunter, his spleen glowing at
    // his side, bubbles leaking up — the tank at work
    const w = walkAt(t);
    out.places.push(person(cam, HERO, w.x, w.y, w.z,
      { mode: "stroll", phase: (t * 0.85) % 1, expr: "stern", blink: lidAt(t, HERO.i), look: 0.1 }, 1.3));
    out.fx.push({ key: "spleenB", cw: 256, ch: 256, draw: drawSpleen, x: w.x + 0.62, y: w.y + 1.05, z: w.z + 0.3, w: 0.62, h: 0.62, soft: true });
    bubbleFx("bubC", w.x + 0.2, w.y + 2.1, w.z + 0.2, 0.6);
    fishFx("fishD", "#e8a13c", "#f7d774", -18.5, -30, 1.1, 6);
    fishFx("fishE", "#7bc950", "#d8efb8", -20.5, -27, 1.4, 20, 0.95);
    card("cardTank", ["OKSIGEN", "CADANGAN!"], w.x, w.y + 1.2, w.z, 2.9, 0.48);
  } else if (id === 7) {
    // EVOLUTION: back on the surface the hero grins at the
    // village — a double helix turning beside him; a thousand
    // years of sea life rewrote this DNA
    heroInBoat("grin", 0.1);
    out.fx.push({ key: "helixA", cw: 256, ch: 320, draw: drawHelix, x: 3.05, y: 2.7, z: 6.6, w: 0.85, h: 1.06, soft: true });
    villagerWalkway();
    villagerPorch();
    card("cardEvo", ["EVOLUSI", "NYATA!"], 0, 2.5, -20, 4.2, 0.5);
  } else if (id === 8) {
    // THE KIDS: two children swimming by the houses like fish,
    // the hero watching open-mouthed from the walkway — they
    // swam before they could walk
    out.places.push(stand(KID_A, -5.2, -0.55, -11, "grin", 0.15, {}, 0.62));
    blob(out, -5.2, 0.02, -11, 0.8);
    out.places.push(stand(KID_B, -3.1, -0.55, -15.5, "laugh", 0.1, {}, 0.58));
    blob(out, -3.1, 0.02, -15.5, 0.75);
    out.places.push(stand(HERO, 5.9, 1.08, -6, "shock", -0.25, {}, 1.1));
    card("cardKids", ["BERENANG", "DULUAN!"], -4.2, 0.4, -13, 3.2, 0.5);
  } else if (id === 9) {
    // AVATAR 2: the reverse wide — the same sea village from its
    // far end; somewhere a film crew is taking notes
    heroInBoat("grin", 0);
    villagerWalkway();
    villagerPorch();
    card("cardAvatar", ["INSPIRASI", "AVATAR 2!"], 0, 2, -45, 4.5, 0.55);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same boat,
    // same claim, but the hero is laughing now. Loop to frame 0.
    heroInBoat("laugh", -0.15);
    villagerWalkway();
    villagerPorch();
    card("cardHook2", ["TAHAN NAPAS", "13 MENIT?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };

