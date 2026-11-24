// The cast of the Wae Rebo cover frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED on the mountain saddle in the near foreground,
// Manggarai villagers in woven songke around the ring of cone
// houses, an elder at the compang stone altar for the Waelu'u,
// and the giant claim card. Same pool + card machinery as the
// house style: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs. The claim
// card floats as an ink-outlined board via drawCardFit (auto-fit:
// text NEVER overflows the board), glued to the view axis so it
// always sits in frame. NOTE (Okinoshima lesson, 2026-11-25): a
// claim card must NEVER cover the hero's face in a close-up —
// every camera here keeps the hero's head fully in frame with
// the card clear above it; shot 8 uses the same pulled-back
// camera + 0.46 screen fraction as Okinoshima's fixed shot 8.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, COMPANG, BUILD_SITE, heroSpotAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "waeReboHero" };
// VILLAGER (man): Manggarai — deep-red shirt, woven songke sarong,
// dark-red headcloth. A proud villager, never a caricature.
const VILLAGER: Who = { i: 62, o: { jacket: "#8a2f2a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#7a1f1f", skin: "#c99067" }, okey: "waeReboVillager" };
// VILLAGER (woman): woven songke dress in gold and rose.
const VILLAGER_B: Who = { i: 63, o: { jacket: "#c25a7a", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#f5c9a0" }, okey: "waeReboVillagerB" };
// ELDER: the village elder who leads the Waelu'u — white hair,
// white moustache, dark earth-brown shirt. Dignified, never mocked.
const ELDER: Who = { i: 64, o: { jacket: "#6a4a2c", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#e8e8e8", skin: "#c99067", moustache: "#e8e8e8" }, okey: "waeReboElder" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A hiking backpack (256x256): teal body, orange flap, straps. */
export const drawBackpack = (p: Pen) => {
  p.poly([[88, 40], [168, 40], [178, 120], [168, 220], [88, 220], [78, 120]], "#2e7f86", 6);
  p.poly([[88, 40], [168, 40], [178, 120], [168, 220], [88, 220], [78, 120]], "#357f8a", 0);
  p.poly([[84, 44], [172, 44], [176, 92], [80, 92]], "#e2453c", 6);
  p.line([[96, 92], [96, 200]], "#1f5a60", 6, false);
  p.line([[160, 92], [160, 200]], "#1f5a60", 6, false);
  p.poly([[104, 140], [152, 140], [152, 196], [104, 196]], "#f2ede2", 6);
  p.line([[128, 40], [128, 20]], "#5a3b2a", 8, false);
};
/** The UNESCO gold plaque (256x320): a golden award board with a
 *  star and a ribbon — the 2012 Award of Excellence. */
export const drawAward = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#c0353a";
  g.beginPath(); g.moveTo(108, 232); g.lineTo(128, 296); g.lineTo(148, 232); g.closePath(); g.fill();
  g.fillStyle = "#e8c45a";
  g.beginPath(); g.roundRect(48, 24, 160, 208, 16); g.fill();
  g.lineWidth = 10; g.strokeStyle = INK;
  g.beginPath(); g.roundRect(48, 24, 160, 208, 16); g.stroke();
  const grad = g.createLinearGradient(48, 24, 208, 232);
  grad.addColorStop(0, "#f6e27a"); grad.addColorStop(0.5, "#e8c45a"); grad.addColorStop(1, "#c8920c");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(58, 34, 140, 188, 12); g.fill();
  // a star in the middle
  g.fillStyle = "#fff3b0";
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? 52 : 22;
    const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.beginPath(); g.ellipse(100, 70, 34, 14, -0.5, 0, 7); g.fill();
};
/** The five storeys of one Mbaru Niang (512x512): a cone-house
 *  cross-section in five coloured bands — living, food, seed,
 *  backup, sacred — with a small door at the bottom. The VO names
 *  the bands; the picture shows them. */
export const drawLevels = (p: Pen) => {
  const g = p.g;
  const bands = ["#8a5a2c", "#4a8a3a", "#d9a441", "#c25a2c", "#7b2a4a"];
  g.save();
  g.beginPath(); g.moveTo(256, 30); g.lineTo(470, 460); g.lineTo(42, 460); g.closePath(); g.clip();
  for (let i = 0; i < 5; i++) {
    g.fillStyle = bands[i];
    g.fillRect(0, 60 + i * 82, 512, 82);
  }
  // thatch streaks across the bands
  g.strokeStyle = "rgba(60,30,0,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const x = 60 + i * 16;
    g.beginPath(); g.moveTo(x, 60); g.lineTo(x - 18, 470); g.stroke();
  }
  g.restore();
  g.lineWidth = 10; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(256, 30); g.lineTo(470, 460); g.lineTo(42, 460); g.closePath(); g.stroke();
  // band separators
  g.lineWidth = 5; g.strokeStyle = "rgba(24,14,0,0.7)";
  for (let i = 1; i < 5; i++) {
    const y = 60 + i * 82;
    g.beginPath(); g.moveTo(256 - (y - 30) * 0.5, y); g.lineTo(256 + (y - 30) * 0.5, y); g.stroke();
  }
  // the door at the bottom
  g.fillStyle = "#241726";
  g.beginPath(); g.roundRect(226, 396, 60, 64, 12); g.fill();
  g.fillStyle = "#f6e27a";
  g.beginPath(); g.arc(274, 428, 4, 0, 7); g.fill();
  // a star on the sacred top
  g.fillStyle = "#f6e27a";
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? 16 : 7;
    const x = 256 + Math.cos(a) * r, y = 58 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
};
/** A coffee branch (256x256): dark green leaves, red cherries —
 *  the cash crop of the trail gardens. */
export const drawCoffee = (p: Pen) => {
  p.line([[128, 230], [128, 40]], "#6a4a2c", 8, false);
  for (const [dx, dy, s] of [[-1, 0, 1], [1, 0.4, 1], [-1, 0.8, 0.9], [1, 1.2, 0.9]] as const) {
    p.poly([[128, 60 + dy * 90], [128 + dx * 70 * s, 40 + dy * 90], [128 + dx * 84 * s, 78 + dy * 90], [128, 96 + dy * 90]], "#3a7a2c", 5);
  }
  for (const [x, y] of [[96, 120], [160, 150], [104, 168], [152, 100], [128, 190]] as const) {
    p.ell(x, y, 11, 11, "#c0353a", 0);
    p.ell(x - 3, y - 3, 4, 4, "rgba(255,255,255,0.6)", 0);
  }
};
/** A thatch bundle (256x256): golden straw tied in the middle —
 *  the roofing being carried up at the build site. */
export const drawThatch = (p: Pen) => {
  const g = p.g;
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = i % 2 ? "#d9a441" : "#c8920c"; g.lineWidth = 7;
    const x0 = 40 + i * 13;
    g.beginPath(); g.moveTo(x0, 30); g.quadraticCurveTo(x0 + 8, 128, x0 - 6, 226); g.stroke();
  }
  g.fillStyle = "#7a4a1c";
  g.fillRect(52, 108, 152, 26);
  g.fillStyle = "#5a3410";
  g.fillRect(52, 108, 152, 8);
};
/** The Waelu'u offering (256x256): a terracotta bowl with betel
 *  leaves, a rice mound and one egg — placed at the compang. */
export const drawOfferings = (p: Pen) => {
  p.poly([[58, 150], [198, 150], [178, 210], [78, 210]], "#a85a2c", 6);
  p.poly([[58, 150], [198, 150], [178, 210], [78, 210]], "#c07a44", 0);
  p.ell(128, 150, 66, 22, "#f2ede2", 0);
  p.poly([[92, 132], [128, 84], [164, 132]], "#3a7a2c", 5);
  p.line([[128, 132], [128, 84]], "#2c5c1d", 4, false);
  p.ell(160, 132, 16, 20, "#f2f0e6", 0);
  p.ell(156, 126, 5, 6, "rgba(255,255,255,0.8)", 0);
  p.line([[88, 150], [88, 128]], "#2c5c1d", 4, false);
  p.ell(88, 122, 12, 8, "#4a8a3a", 0);
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
  // everyone stands on the saddle grass at y = 0
  const GROUND_Y = 0;
  // the hero standing on the ground at his per-shot spot
  const heroAt = (expr: Expr, look = 0, scale = 1.5, mode: "stand" | "stroll" | "sit" = "stand", extra: Partial<FrontOpts> = {}) => {
    const sp = heroSpotAt(id, t);
    const y = GROUND_Y;
    const fo: FrontOpts = mode === "stroll"
      ? { mode, expr, blink: lidAt(t, HERO.i), look, phase: t * 2, ...extra }
      : { mode, expr, blink: lidAt(t, HERO.i), look, ...extra };
    out.places.push(person(cam, HERO, sp.x, y, sp.z, fo, scale));
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // a villager standing in the village, with a contact blob
  const villager = (who: Who, x: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}) => {
    out.places.push(stand(who, x, GROUND_Y, z, expr, look, extra, 1.0));
    blob(out, x, GROUND_Y, z);
  };

  if (id === 1) {
    // THE COVER (frame 0): THE VILLAGE ITSELF big in the frame —
    // seven cone houses in the clouds, mist already drifting —
    // the hero SHOCKED big beside it, villagers in the ring,
    // and the claim as one GIANT board.
    heroAt("shock", 0.1);
    villager(VILLAGER, -3, -4, "grin", 0.2);
    villager(VILLAGER_B, 2.5, -6, "grin", -0.2);
    card("cardHook", ["DESA DI ATAS", "AWAN?!"], 0, 5, -12, 5.0, 0.52);
  } else if (id === 2) {
    // HIGH WIDE: the whole saddle — the ring, the ridges, the
    // cloud sea below the rim; hero on the open path south of
    // the ring so he is VISIBLE (stills-check 2026-11-25: at
    // (2,2) he hid behind the centre house)
    heroAt("grin", 0, 1.2);
    villager(VILLAGER, -6, 2, "grin", 0.1);
    villager(VILLAGER_B, 6, 0, "grin", -0.1);
    card("card1200", ["1.200", "METER!"], 0, 4, -12, 4.2, 0.5);
  } else if (id === 3) {
    // THE TREK: the hero hiking up the forest trail past coffee
    // gardens — his pack resting on the path beside him
    heroAt("grin", 0.1, 1.2, "stroll");
    out.fx.push({ key: "packTrail", cw: 256, ch: 256, draw: drawBackpack, x: 1.4, y: 0.45, z: 18.6, w: 0.9, h: 0.9 });
    out.fx.push({ key: "coffeeTrail", cw: 256, ch: 256, draw: drawCoffee, x: -1.8, y: 0.9, z: 17.2, w: 1.4, h: 1.4 });
    out.fx.push({ key: "coffeeTrail2", cw: 256, ch: 256, draw: drawCoffee, x: 2.2, y: 0.9, z: 15.4, w: 1.2, h: 1.2 });
    card("card3jam", ["3 JAM", "JALAN!"], 0, 2, 16, 3.4, 0.5);
  } else if (id === 4) {
    // THE RING: seven cone houses around the compang — the hero
    // among them, villagers in the village. Camera is INSIDE the
    // ring now (round 3), so villagers stand further north, clear
    // of the camera at (0, 2.5, -6).
    heroAt("grin", 0.1, 1.2);
    // all on/near the camera axis — round 3 had them up to 28°
    // off-axis (out of the portrait frame)
    villager(VILLAGER, -2, -16, "grin", 0.3);
    villager(VILLAGER_B, 3, -18, "grin", -0.3);
    villager(VILLAGER, -1, -20, "neutral", 0);
    card("card7rumah", ["7 RUMAH", "KERUCUT!"], 0, 4, -12, 3.6, 0.5);
  } else if (id === 5) {
    // THE FIVE STOREYS: one cone house close, its five levels
    // drawn as a cross-section beside it — the hero points up
    heroAt("grin", -0.4, 1.2, "stand", { wave: 1 });
    // the diagram stands BESIDE the house (left of it), not in
    // front of it — stills-check 2026-11-25: at (-13.5,-15) it sat
    // at the far left frame edge, mostly out of shot
    out.fx.push({ key: "levelsDiagram", cw: 512, ch: 512, draw: drawLevels, x: -11, y: 3.4, z: -15.5, w: 2.6, h: 2.6 });
    villager(VILLAGER_B, -2, -10, "grin", 0.2);
    card("card5lantai", ["5", "LANTAI!"], -9, 6, -18, 3.0, 0.5);
  } else if (id === 6) {
    // THE SEVEN PEAKS: the hero small before the ridge — seven
    // guardian peaks above the village
    heroAt("grin", 0, 1.0);
    card("card7puncak", ["7 PUNCAK", "PENJAGA!"], 0, 12, -45, 3.0, 0.5);
  } else if (id === 7) {
    // THE REBUILD: villagers re-thatching a cone frame at the
    // build site — thatch bundles, bamboo poles, the hero helping
    heroAt("grin", 0.1, 1.2);
    // villagers in front of the frame, flanking the hero — round 4
    // had them at (20,-11.5)/(26.5,-12), hidden BEHIND the frame
    villager(VILLAGER, 26, -3, "grin", 0.2, { wave: 1 });
    villager(VILLAGER_B, 20, -4, "grin", -0.2);
    out.fx.push({ key: "thatch1", cw: 256, ch: 256, draw: drawThatch, x: BUILD_SITE[0] - 1.5, y: 0.8, z: BUILD_SITE[2] + 2.5, w: 1.2, h: 1.2 });
    out.fx.push({ key: "thatch2", cw: 256, ch: 256, draw: drawThatch, x: BUILD_SITE[0] + 1, y: 0.8, z: BUILD_SITE[2] + 3, w: 1.0, h: 1.0, rot: 0.5 });
    card("card4rumah", ["TINGGAL 4", "RUMAH!"], BUILD_SITE[0], 2, BUILD_SITE[2], 3.2, 0.5);
  } else if (id === 8) {
    // THE AWARD: the hero holds the gold UNESCO plaque up,
    // villagers cheering around him — on the south village green
    // (stills-check 2026-11-25: in the ring centre the near
    // house's band crossed the card and its door slab ate the
    // frame edge). Camera pulled back (the Okinoshima shot-8 fix)
    // so the card stays clear above his head.
    heroAt("laugh", 0, 1.3);
    out.fx.push({ key: "awardPlaque", cw: 256, ch: 320, draw: drawAward, x: 0.9, y: 2.2, z: 4, w: 0.9, h: 1.12 });
    // villagers flanking the hero on the open green — round 5 had
    // them at (±2.5, 6), 12.8° off-axis = exactly the portrait
    // frame edge, so only half of each showed; pulled to ±1.8
    villager(VILLAGER, -1.8, 6, "laugh", 0.3, { wave: 1 });
    villager(VILLAGER_B, 1.8, 6, "laugh", -0.3, { wave: 1 });
    out.fx.push({ key: "noteCheer", cw: 256, ch: 256, draw: (p) => fxNote(p, 0, "#2c4a6a"), x: -1.8, y: 3.2, z: 6, w: 0.55, h: 0.55, soft: true });
    card("cardUnesco", ["MENANG", "UNESCO!"], 0, 2, 3, 3.5, 0.46);
  } else if (id === 9) {
    // WAELU'U: the elder at the compang, offerings before him —
    // the hero kneeling respectfully, asking the ancestors' leave
    out.places.push(stand(ELDER, COMPANG[0] - 1, GROUND_Y, COMPANG[2] - 1, "neutral", 0.2, {}, 1.0));
    blob(out, COMPANG[0] - 1, GROUND_Y, COMPANG[2] - 1);
    heroAt("nervous", 0.2, 1.2, "sit");
    out.fx.push({ key: "offerings", cw: 256, ch: 256, draw: drawOfferings, x: COMPANG[0] + 0.3, y: 0.45, z: COMPANG[2] + 0.6, w: 1.0, h: 1.0 });
    villager(VILLAGER_B, -3.5, -8, "neutral", 0.2);
    card("cardWaeluu", ["IZIN", "LELUHUR!"], COMPANG[0], 1.5, COMPANG[2], 3.2, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // village, same claim, but the hero is laughing now. Loop to frame 0.
    heroAt("laugh", 0.1);
    villager(VILLAGER, -3, -4, "grin", 0.2);
    villager(VILLAGER_B, 2.5, -6, "grin", -0.2);
    card("cardHook2", ["DESA DI ATAS", "AWAN?!"], 0, 5, -12, 5.0, 0.52);
  }
  return out;
};
export { FPS };
