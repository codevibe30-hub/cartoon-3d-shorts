// The cast of the Pendeta Robot short as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// reacting to Mindar — a 195 cm android Kannon in a dark robe
// with a gold halo, preaching the Heart Sutra on his pedestal —
// plus young temple visitors and the giant claim cards. Same
// pool + card machinery as the house style: one canvas per
// distinct drawing, yaw-only billboards shaded by cardShade(),
// soft contact blobs. The claim card floats as an ink-outlined
// board via drawCardFit (auto-fit: text NEVER overflows the
// board), glued to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, MINDAR_SPOT, HERO_SPOT, GATE_Z, heroAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "pendetaRobotHero" };
// YOUNG VISITORS: bright casual clothes, the audience Mindar was built for.
const VISITOR_A: Who = { i: 71, o: { jacket: "#e8542e", pants: "#2c3550", boots: "#f4f1ea", hat: "hair", hair: "#1d1410" }, okey: "pendetaRobotVisitorA" };
const VISITOR_B: Who = { i: 72, o: { jacket: "#2c6e8a", dress: "#f2c018", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#3a2a1a", skin: "#c99067" }, okey: "pendetaRobotVisitorB" };
const VISITOR_C: Who = { i: 73, o: { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "pendetaRobotVisitorC" };
// SEATED WORSHIPPERS: quiet, listening — dark robes, hands folded.
const WORSHIP_A: Who = { i: 81, o: { jacket: "#3d3a4a", pants: "#3d3a4a", boots: "#2c2c30", hat: "hair", hair: "#6a6a72" }, okey: "pendetaRobotWorshipA" };
const WORSHIP_B: Who = { i: 82, o: { jacket: "#4a3a5a", pants: "#4a3a5a", boots: "#2c2c30", hat: "hair", hair: "#1d1410" }, okey: "pendetaRobotWorshipB" };

// ---------------- Mindar: the android Kannon, drawn (never pasted) ----------------
// Design space 600 x 1000 (soles at y = 975), same as the body
// geometry: a dark indigo robe with gold trim, a pale metallic
// face with serene closed eyes, a gold halo ring behind the head,
// silver joint bands at neck + wrists, hands clasped at the chest.
// `glow` (0..1) lights the face + halo for the preaching/wisdom shots.
export const drawMindar = (glow = 0) => (p: Pen) => {
  const g = p.g;
  // halo: gold ring behind the head, brighter when glowing
  g.save();
  g.strokeStyle = glow > 0.5 ? "#ffe98a" : "#e8c45a";
  g.lineWidth = 16; g.globalAlpha = 0.55 + glow * 0.45;
  g.beginPath(); g.arc(300, 205, 148, 0, 7); g.stroke();
  g.lineWidth = 5; g.globalAlpha = 0.35 + glow * 0.4;
  g.beginPath(); g.arc(300, 205, 168, 0, 7); g.stroke();
  g.restore();
  // robe: wide trapezoid, dark indigo with a soft sheen
  p.poly([[196, 400], [404, 400], [470, 950], [130, 950]], "#2c3550", 12);
  // sheen: a lighter indigo panel down the robe's left side
  p.poly([[210, 420], [290, 420], [300, 940], [160, 940]], "#3a4568", 6);
  // gold trim: centre placket + hem border
  p.line([[300, 410], [300, 940]], "#e8c45a", 10, false);
  p.line([[142, 920], [458, 920]], "#e8c45a", 12, false);
  // chest plate: lighter metallic panel
  p.poly([[228, 440], [372, 440], [352, 640], [248, 640]], "#8f9bb0", 8);
  // neck joint: exposed silver band
  p.poly([[252, 330], [348, 330], [348, 385], [252, 385]], "#c8cfd8", 8);
  // sleeves: wide, from shoulders to clasped hands
  p.poly([[196, 400], [258, 420], [300, 600], [246, 660], [176, 520]], "#2c3550", 10);
  p.poly([[404, 400], [342, 420], [300, 600], [354, 660], [424, 520]], "#2c3550", 10);
  // wrist bands: silver, exposed robot joints
  p.line([[252, 620], [292, 640]], "#c8cfd8", 14, false);
  p.line([[348, 620], [308, 640]], "#c8cfd8", 14, false);
  // clasped hands: two pale ovals pressed together at the chest
  p.ell(282, 648, 26, 40, "#dfe3e8", 8, 0, 360, -0.25);
  p.ell(318, 648, 26, 40, "#dfe3e8", 8, 0, 360, 0.25);
  // face: pale metallic, serene — smooth oval, no hair
  p.ell(300, 218, 92, 112, "#dfe3e8", 12);
  // a soft highlight on the face's upper-left cheek
  p.ell(268, 168, 34, 44, "#f2f4f7", 4);
  // gold ushnisha bump on the crown
  p.ell(300, 96, 26, 20, "#e8c45a", 8);
  // serene closed eyes: two gentle downward curves
  p.stroke([[246, 214], [268, 222], [290, 214]], 7, INK);
  p.stroke([[310, 214], [332, 222], [354, 214]], 7, INK);
  // small calm smile
  p.stroke([[282, 268], [300, 276], [318, 268]], 6, INK);
  // face glow: a soft warm wash when preaching
  if (glow > 0) {
    g.save(); g.globalAlpha = glow * 0.28;
    const gg = g.createRadialGradient(300, 210, 10, 300, 210, 190);
    gg.addColorStop(0, "rgba(255,232,150,0.9)"); gg.addColorStop(1, "rgba(255,232,150,0)");
    g.fillStyle = gg; g.fillRect(110, 20, 380, 380); g.restore();
  }
};
/** A Mindar Place: same tier sizing as a person, custom draw. */
const mindar = (cam: CamInfo, x: number, y: number, z: number, glow = 0, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  return { key: `M|mindar|g${Math.round(glow * 10)}`, x, y, z, scale, draw: drawMindar(glow), size: [w, h, k] };
};

// ---------------- episode props (drawn, never pasted) ----------------
/** A glowing sutra scroll (256x384): cream paper, gold border,
 *  lines of Heart Sutra text as flowing gold strokes. */
export const drawSutraScroll = (p: Pen) => {
  const g = p.g;
  p.poly([[28, 20], [228, 20], [228, 364], [28, 364]], "#f6ecd2", 8);
  p.poly([[40, 32], [216, 32], [216, 352], [40, 352]], null, 4);
  const rs = rng(31);
  for (let y = 64; y < 340; y += 30) {
    for (let x = 58; x < 200; x += 22) {
      g.fillStyle = `rgba(160,110,20,${0.55 + rs() * 0.35})`;
      g.fillRect(x, y + rs() * 6, 13, 4);
      g.fillRect(x + 3, y + 8 + rs() * 6, 7, 4);
    }
  }
  // gold end rollers
  p.poly([[16, 8], [240, 8], [240, 24], [16, 24]], "#8a6a2c", 6);
  p.poly([[16, 360], [240, 360], [240, 376], [16, 376]], "#8a6a2c", 6);
};
/** One gold coin (256x256): ¥ stamped on a glossy disc. */
export const drawCoin = (p: Pen) => {
  const g = p.g;
  p.ell(128, 128, 104, 104, "#f6c21c", 10);
  p.ell(128, 128, 82, 82, "#e8a90c", 5);
  g.fillStyle = "#8a5a00"; g.font = "900 120px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("¥", 128, 134);
};
/** A yen banknote (384x192): pale paper, big ¥, gold corners. */
export const drawYenBill = (p: Pen) => {
  const g = p.g;
  p.poly([[10, 14], [374, 14], [374, 178], [10, 178]], "#eef0e2", 8);
  p.poly([[22, 26], [362, 26], [362, 166], [22, 166]], null, 4);
  g.fillStyle = "#2c3550"; g.font = "900 84px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("¥", 192, 100);
  g.fillStyle = "#8a6a2c"; g.font = "900 30px 'Arial Black', Arial, sans-serif";
  g.fillText("10000", 192, 152);
};
/** The pedestal plaque (384x128): dark stone, gold KANNON. */
export const drawPlaque = (p: Pen) => {
  const g = p.g;
  p.poly([[8, 10], [376, 10], [376, 118], [8, 118]], "#3a3a44", 8);
  p.poly([[18, 20], [366, 20], [366, 108], [18, 108]], null, 3);
  g.fillStyle = "#e8c45a"; g.font = "900 56px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("KANNON", 192, 66);
};
/** A glowing program tablet (256x320): dark glass, lines of code. */
export const drawTablet = (p: Pen) => {
  const g = p.g;
  p.poly([[20, 10], [236, 10], [236, 310], [20, 310]], "#1e2438", 8);
  const rs = rng(55);
  for (let y = 44; y < 280; y += 26) {
    const w = 60 + rs() * 110;
    g.fillStyle = `rgba(120,220,160,${0.5 + rs() * 0.4})`;
    g.fillRect(40, y, w, 9);
  }
  p.ell(128, 296, 14, 14, "#78dca0", 4);
};
/** Golden wisdom glow (256x256, soft): radial rays + halo. */
export const drawWisdomGlow = (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,236,160,0.95)"); gr.addColorStop(0.45, "rgba(255,210,90,0.45)"); gr.addColorStop(1, "rgba(255,210,90,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(255,240,180,0.75)"; g.lineWidth = 5; g.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 52, 128 + Math.sin(a) * 52);
    g.lineTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96);
    g.stroke();
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
  // the hero on the gravel, big and whole in the cover frame
  const heroStand = (expr: Expr, look = -0.15, scale = 2.0) => {
    const hp = heroAt(id, t);
    const y = 0.02 + Math.sin(t * 1.3) * 0.02;
    out.places.push(stand(HERO, hp.x, y, hp.z, expr, look, {}, scale));
    blob(out, hp.x, 0.02, hp.z, scale);
  };
  // Mindar on his pedestal (pedestal top at y = 0.9): he never
  // leaves it — his base is bolted to the temple floor.
  const mindarStand = (glow = 0) => {
    out.places.push(mindar(cam, MINDAR_SPOT[0], 0.9, MINDAR_SPOT[2], glow, 1.0));
    blob(out, MINDAR_SPOT[0], 0.92, MINDAR_SPOT[2], 1.1);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // seated worshippers in front of the pedestal, listening
  const worshippers = () => {
    out.places.push(person(cam, WORSHIP_A, -2.6, 0.02, -7.5,
      { mode: "sit", expr: "neutral", blink: lidAt(t, WORSHIP_A.i), look: 0 }, 1.0));
    blob(out, -2.6, 0.02, -7.5);
    out.places.push(person(cam, WORSHIP_B, -1.2, 0.02, -8.0,
      { mode: "sit", expr: "neutral", blink: lidAt(t, WORSHIP_B.i), look: 0 }, 1.0));
    blob(out, -1.2, 0.02, -8.0);
  };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face BIG and WHOLE in
    // the near foreground — behind him Mindar glows on his
    // pedestal in front of the old hall, and the claim is one
    // GIANT board. Nothing covers the card text.
    heroStand("shock", -0.15, 2.0);
    mindarStand(0.4);
    out.fx.push({ key: "wisdomGlowCover", cw: 256, ch: 256, draw: drawWisdomGlow, x: MINDAR_SPOT[0], y: 3.1, z: MINDAR_SPOT[2] - 0.4, w: 3.4, h: 3.4, soft: true });
    card("cardHook", ["PENDETA", "ROBOT?!"], 0, 3.5, -12, 5.0, 0.52);
  } else if (id === 2) {
    // THE TEMPLE: high wide over the whole Kodaiji complex — the
    // hero small on the gravel below, the 400-year-old hall
    // running away to the gate and the pagoda
    out.places.push(stand(HERO, 7.5, 0.02, 2, "grin", 0, {}, 1.15)); blob(out, 7.5, 0.02, 2, 1.15);
    mindarStand(0.2);
    card("card400", ["400", "TAHUN!"], 0, 3, -22, 4.2, 0.5);
  } else if (id === 3) {
    // MINDAR UP CLOSE: the android fills the frame — silicone
    // face, halo ring, robe — a robot built to look like a goddess
    mindarStand(0.7);
    card("cardHeight", ["1,95", "METER!"], MINDAR_SPOT[0], 2.6, MINDAR_SPOT[2], 3.4, 0.46);
  } else if (id === 4) {
    // THE SERMON: Mindar preaches, hands clasped, the sutra
    // scroll glowing beside him; worshippers sit and listen
    mindarStand(1.0);
    worshippers();
    out.fx.push({ key: "sutraScroll", cw: 256, ch: 384, draw: drawSutraScroll, x: -1.6, y: 1.6, z: -11.2, w: 1.1, h: 1.65, soft: true });
    out.fx.push({ key: "noteA", cw: 256, ch: 256, draw: (p) => fxNote(p, 0, "#8a6a2c"), x: 2.4, y: 3.4, z: -11.4, w: 0.5, h: 0.5, soft: true });
    card("card25", ["25", "MENIT!"], MINDAR_SPOT[0], 2.6, MINDAR_SPOT[2], 4.6, 0.44);
  } else if (id === 5) {
    // THE PROGRAM (mid-video re-hook): the hero points at the
    // glowing tablet — the sermon is code, always the same —
    // while Mindar repeats it word for word behind him
    mindarStand(0.6);
    out.places.push(stand(HERO, 2.2, 0.02, -9.0, "grin", -0.3, {}, 1.2)); blob(out, 2.2, 0.02, -9.0, 1.2);
    out.fx.push({ key: "tablet", cw: 256, ch: 320, draw: drawTablet, x: 0.2, y: 1.5, z: -10.0, w: 0.9, h: 1.12, soft: true });
    card("cardSame", ["SELALU", "SAMA!"], MINDAR_SPOT[0], 2.6, MINDAR_SPOT[2], 4.4, 0.46);
  } else if (id === 6) {
    // THE PRICE: gold coins and yen bills rain around the
    // pedestal — a million dollars of robot, falling from the sky
    mindarStand(0.5);
    for (let j = 0; j < 6; j++) {
      const cx = -2.2 + j * 0.88, cy = 4.6 - ((tt * 1.4 + j * 0.9) % 4.2);
      out.fx.push({ key: `coin${j}`, cw: 256, ch: 256, draw: drawCoin, x: cx, y: cy, z: -11 + (j % 2) * 0.8, w: 0.62, h: 0.62, soft: true, rot: (tt + j) * 0.8 });
    }
    out.fx.push({ key: "yenBill", cw: 384, ch: 192, draw: drawYenBill, x: 2.0, y: 3.2 + Math.sin(tt * 1.8) * 0.2, z: -10.8, w: 1.5, h: 0.75, soft: true, rot: 0.3 });
    card("cardPrice", ["1 JUTA", "DOLAR!"], MINDAR_SPOT[0], 2.6, MINDAR_SPOT[2], 4.6, 0.5);
  } else if (id === 7) {
    // THE YOUNG CROWD: visitors stream through the torii gate
    // down the stone path toward the hall — the audience Mindar
    // was built for. (They walk -Z, toward the camera.)
    const gz = 16 - U * 12;
    out.places.push(person(cam, VISITOR_A, -1.6, 0.02, gz,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, VISITOR_A.i), look: 0.1 }, 1.0));
    blob(out, -1.6, 0.02, gz);
    out.places.push(person(cam, VISITOR_B, 0.6, 0.02, gz - 2.5,
      { mode: "stroll", phase: (t * 1.35 + 0.4) % 1, expr: "grin", blink: lidAt(t, VISITOR_B.i), look: -0.1 }, 1.0));
    blob(out, 0.6, 0.02, gz - 2.5);
    out.places.push(person(cam, VISITOR_C, 2.4, 0.02, gz - 5,
      { mode: "stroll", phase: (t * 1.35 + 0.7) % 1, expr: "laugh", blink: lidAt(t, VISITOR_C.i), look: 0.15 }, 1.0));
    blob(out, 2.4, 0.02, gz - 5);
    out.places.push(stand(HERO, 0.2, 0.02, -2, "grin", -0.2, { wave: 1 }, 1.2)); blob(out, 0.2, 0.02, -2, 1.2);
    mindarStand(0.3);
  } else if (id === 8) {
    // THE TWIST: close on the pedestal plaque — it reads KANNON.
    // No hero here: at this range he would fill the frame and
    // cover the card. Mindar + the plaque carry the twist alone.
    mindarStand(0.3);
    out.fx.push({ key: "plaque", cw: 384, ch: 128, draw: drawPlaque, x: MINDAR_SPOT[0], y: 0.55, z: -10.55, w: 1.5, h: 0.5 });
    card("cardStatue", ["PATUNG BISA", "NGOMONG!"], MINDAR_SPOT[0], 2.6, MINDAR_SPOT[2], 5.6, 0.44);
  } else if (id === 9) {
    // UNLIMITED WISDOM: a golden glow swells out of Mindar and
    // fills the hall — the hero looks up, awestruck
    mindarStand(1.0);
    const gw = 2.5 + U * 3.5;
    out.fx.push({ key: "wisdomGlowBig", cw: 256, ch: 256, draw: drawWisdomGlow, x: MINDAR_SPOT[0], y: 3.2, z: MINDAR_SPOT[2] - 0.4, w: gw, h: gw, soft: true });
    out.places.push(stand(HERO, 0.4, 0.02, -7.5, "shock", -0.2, {}, 1.3)); blob(out, 0.4, 0.02, -7.5, 1.3);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same hall,
    // same claim, but the hero is laughing now. Loop to frame 0.
    heroStand("laugh", -0.15, 2.0);
    mindarStand(0.4);
    out.fx.push({ key: "wisdomGlowCover2", cw: 256, ch: 256, draw: drawWisdomGlow, x: MINDAR_SPOT[0], y: 3.1, z: MINDAR_SPOT[2] - 0.4, w: 3.4, h: 3.4, soft: true });
    card("cardHook2", ["PENDETA", "ROBOT?!"], 0, 3.5, -12, 5.0, 0.52);
  }
  return out;
};
export { FPS };
