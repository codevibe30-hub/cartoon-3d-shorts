// The cast of the Uang Thailand frame as lit flat sprites
// in the 3D world: the series hero narrator (teal shirt,
// cream cap) whose foot is about to commit the ultimate
// Thai taboo, and his Thai FRIEND (marigold-orange shirt,
// black hair) who watches in horror. Props — the GIANT baht
// note with the King's portrait sweating on it, the GIANT
// bare foot descending, the King's golden-framed portrait
// shrine, the Pasal 112 law board, the GIANT rolling baht
// coin, and the giant hand that stops it the legal way.
// Same pool + card machinery as the house style: one canvas
// per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text
// NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, HERO_SPOT, FRIEND_SPOT, leavesAt } from "./story";
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
// In this episode his bare foot nearly lands on a baht note.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "uangHero" };
// FRIEND: the Thai host — marigold-orange shirt, black hair,
// the one who has to stop him before the police do.
const FRIEND: Who = { i: 63, o: { jacket: "#e08a2e", pants: "#2e3440", boots: "#2a2a2e", hat: "hair", hair: "#22222a", skin: "#eec39a" }, okey: "uangFriend" };

// ---------------- shared king-face painter ----------------
/** The King's cartoon face inside an oval portrait. Panicked
 *  variant (on the banknote): eyes rolled UP toward the foot,
 *  brows high, sweat drops flying. Calm variant (the shrine
 *  portrait): level gaze, serene. Crown = tiered Thai spire. */
const drawKingFace = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, panic: boolean) => {
  // face
  g.fillStyle = "#f2cf9e";
  g.beginPath(); g.ellipse(cx, cy, r * 0.78, r * 0.92, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = r * 0.07;
  g.beginPath(); g.ellipse(cx, cy, r * 0.78, r * 0.92, 0, 0, 7); g.stroke();
  // tiered spire crown
  g.fillStyle = "#e9b81f";
  g.beginPath();
  g.moveTo(cx - r * 0.52, cy - r * 0.72);
  g.quadraticCurveTo(cx - r * 0.30, cy - r * 0.86, cx - r * 0.20, cy - r * 1.02);
  g.quadraticCurveTo(cx - r * 0.10, cy - r * 1.30, cx, cy - r * 1.62);
  g.quadraticCurveTo(cx + r * 0.10, cy - r * 1.30, cx + r * 0.20, cy - r * 1.02);
  g.quadraticCurveTo(cx + r * 0.30, cy - r * 0.86, cx + r * 0.52, cy - r * 0.72);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = r * 0.06;
  g.beginPath();
  g.moveTo(cx - r * 0.52, cy - r * 0.72);
  g.quadraticCurveTo(cx - r * 0.30, cy - r * 0.86, cx - r * 0.20, cy - r * 1.02);
  g.quadraticCurveTo(cx - r * 0.10, cy - r * 1.30, cx, cy - r * 1.62);
  g.quadraticCurveTo(cx + r * 0.10, cy - r * 1.30, cx + r * 0.20, cy - r * 1.02);
  g.quadraticCurveTo(cx + r * 0.30, cy - r * 0.86, cx + r * 0.52, cy - r * 0.72);
  g.closePath(); g.stroke();
  g.fillStyle = "#c8402e"; g.beginPath(); g.arc(cx, cy - r * 1.06, r * 0.09, 0, 7); g.fill();
  g.strokeStyle = "rgba(28,21,3,0.5)"; g.lineWidth = r * 0.04;
  g.beginPath(); g.moveTo(cx - r * 0.4, cy - r * 0.78); g.lineTo(cx + r * 0.4, cy - r * 0.78); g.stroke();
  // brows
  g.strokeStyle = "#1c1503"; g.lineWidth = r * 0.075; g.lineCap = "round";
  const browY = panic ? cy - r * 0.38 : cy - r * 0.26;
  g.beginPath(); g.moveTo(cx - r * 0.48, browY + r * 0.06); g.quadraticCurveTo(cx - r * 0.28, browY - r * 0.1, cx - r * 0.08, browY + r * 0.02); g.stroke();
  g.beginPath(); g.moveTo(cx + r * 0.08, browY + r * 0.02); g.quadraticCurveTo(cx + r * 0.28, browY - r * 0.1, cx + r * 0.48, browY + r * 0.06); g.stroke();
  // eyes: white ovals; pupils UP (panic) or centred (calm)
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.30;
    g.fillStyle = "#ffffff";
    g.beginPath(); g.ellipse(ex, cy - r * 0.08, r * 0.15, r * 0.19, 0, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = r * 0.05;
    g.beginPath(); g.ellipse(ex, cy - r * 0.08, r * 0.15, r * 0.19, 0, 0, 7); g.stroke();
    g.fillStyle = "#1c1503";
    g.beginPath(); g.arc(ex, cy - r * 0.08 + (panic ? -r * 0.085 : 0), r * 0.07, 0, 7); g.fill();
  }
  // nose + mouth
  g.lineWidth = r * 0.055;
  g.beginPath(); g.moveTo(cx + r * 0.03, cy + r * 0.10); g.quadraticCurveTo(cx - r * 0.05, cy + r * 0.24, cx + r * 0.04, cy + r * 0.30); g.stroke();
  if (panic) {
    g.fillStyle = "#7a2e22";
    g.beginPath(); g.ellipse(cx, cy + r * 0.52, r * 0.13, r * 0.17, 0, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = r * 0.05;
    g.beginPath(); g.ellipse(cx, cy + r * 0.52, r * 0.13, r * 0.17, 0, 0, 7); g.stroke();
    // sweat drops flying off both sides of the face
    for (const s of [-1, 1]) {
      for (const [dx, dy, dr] of [[1.02, -0.30, 0.13], [1.18, 0.12, 0.10]] as const) {
        g.fillStyle = "#a8d4f0";
        g.beginPath();
        g.moveTo(cx + s * r * dx, cy + r * dy - r * dr * 1.5);
        g.quadraticCurveTo(cx + s * r * (dx + 0.10), cy + r * dy + r * dr * 0.4, cx + s * r * dx, cy + r * dy + r * dr);
        g.quadraticCurveTo(cx + s * r * (dx - 0.10), cy + r * dy + r * dr * 0.4, cx + s * r * dx, cy + r * dy - r * dr * 1.5);
        g.fill();
        g.strokeStyle = "rgba(28,21,3,0.45)"; g.lineWidth = r * 0.035;
        g.beginPath();
        g.moveTo(cx + s * r * dx, cy + r * dy - r * dr * 1.5);
        g.quadraticCurveTo(cx + s * r * (dx + 0.10), cy + r * dy + r * dr * 0.4, cx + s * r * dx, cy + r * dy + r * dr);
        g.quadraticCurveTo(cx + s * r * (dx - 0.10), cy + r * dy + r * dr * 0.4, cx + s * r * dx, cy + r * dy - r * dr * 1.5);
        g.stroke();
      }
    }
  } else {
    g.lineWidth = r * 0.06;
    g.beginPath(); g.moveTo(cx - r * 0.18, cy + r * 0.52); g.lineTo(cx + r * 0.18, cy + r * 0.52); g.stroke();
  }
};

// ---------------- episode props (drawn, never pasted) ----------------
/** The GIANT 1000-baht note lying on the stall table — the
 *  episode's visual signature. 1024x640 canvas: violet note,
 *  guilloche rings, corner numerals, and the King's oval
 *  portrait in the middle SWEATING in terror, eyes rolled up
 *  at the foot about to land on him. */
export const drawNoteGiant = (p: Pen) => {
  const g = p.g;
  // note body with a soft violet gradient
  const grad = g.createLinearGradient(0, 0, 1024, 640);
  grad.addColorStop(0, "#cdbcf0"); grad.addColorStop(0.5, "#b39ddb"); grad.addColorStop(1, "#9a7fc9");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(28, 28, 968, 584, 18); g.fill();
  g.strokeStyle = "#3a2a5e"; g.lineWidth = 10;
  g.beginPath(); g.roundRect(28, 28, 968, 584, 18); g.stroke();
  g.strokeStyle = "rgba(58,42,94,0.55)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(52, 52, 920, 536, 12); g.stroke();
  // guilloche rings in the corners
  for (const [cx, cy] of [[150, 150], [874, 150], [150, 490], [874, 490]] as const) {
    for (let rr2 = 16; rr2 <= 64; rr2 += 16) {
      g.strokeStyle = "rgba(58,42,94,0.30)"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(cx, cy, rr2, 0, 7); g.stroke();
    }
  }
  // fine security lines sweeping the field
  g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    g.beginPath(); g.moveTo(60, 90 + i * 42);
    g.bezierCurveTo(340, 60 + i * 42, 680, 120 + i * 42, 964, 90 + i * 42); g.stroke();
  }
  // corner numerals
  g.fillStyle = "#3a2a5e"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 92px 'Arial Black', Arial, sans-serif";
  g.fillText("1000", 168, 108);
  g.fillText("1000", 856, 540);
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("BAHT", 168, 540);
  // the oval portrait frame, gold and ornate
  g.fillStyle = "#e9b81f";
  g.beginPath(); g.ellipse(512, 320, 168, 208, 0, 0, 7); g.fill();
  g.strokeStyle = "#3a2a5e"; g.lineWidth = 7;
  g.beginPath(); g.ellipse(512, 320, 168, 208, 0, 0, 7); g.stroke();
  g.fillStyle = "#7a94c9";
  g.beginPath(); g.ellipse(512, 320, 146, 186, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(255,240,190,0.8)"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(512, 320, 146, 186, 0, 0, 7); g.stroke();
  drawKingFace(g, 512, 330, 118, true);
  // gloss sweep across the note
  g.fillStyle = "rgba(255,255,255,0.13)";
  g.beginPath();
  g.moveTo(120, 612); g.lineTo(430, 28); g.lineTo(620, 28); g.lineTo(310, 612); g.closePath(); g.fill();
};
/** The GIANT bare foot descending from the sky — shorts hem
 *  at the top, a big cartoon sole with five toes aimed down
 *  at the note, speed lines at the sides. 640x800 canvas. */
export const drawFootGiant = (p: Pen) => {
  const g = p.g;
  // shorts hem at the very top
  g.fillStyle = "#3b5b9a";
  g.fillRect(196, 0, 248, 96);
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(196, 62, 248, 12);
  g.strokeStyle = "#1c1503"; g.lineWidth = 8;
  g.beginPath(); g.moveTo(196, 96); g.lineTo(444, 96); g.stroke();
  // the leg coming down
  g.fillStyle = "#eec39a";
  g.beginPath();
  g.moveTo(232, 96); g.lineTo(408, 96);
  g.quadraticCurveTo(420, 240, 404, 330);
  g.lineTo(236, 330);
  g.quadraticCurveTo(220, 240, 232, 96);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 9;
  g.beginPath();
  g.moveTo(232, 96);
  g.quadraticCurveTo(220, 240, 236, 330);
  g.lineTo(404, 330);
  g.quadraticCurveTo(420, 240, 408, 96);
  g.stroke();
  g.fillStyle = "rgba(190,130,80,0.35)";
  g.beginPath(); g.ellipse(262, 220, 18, 90, 0.06, 0, 7); g.fill();
  // the sole: one big rounded pad facing the viewer
  g.fillStyle = "#f2cf9e";
  g.beginPath(); g.ellipse(320, 452, 128, 138, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 10;
  g.beginPath(); g.ellipse(320, 452, 128, 138, 0, 0, 7); g.stroke();
  g.fillStyle = "rgba(190,130,80,0.28)";
  g.beginPath(); g.ellipse(320, 486, 84, 92, 0, 0, 7); g.fill();
  // heel pad
  g.fillStyle = "#eec39a";
  g.beginPath(); g.ellipse(320, 356, 88, 44, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(28,21,3,0.5)"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(320, 356, 88, 44, 0, 0, 7); g.stroke();
  // five toes along the bottom, big toe in the middle-low
  const toes: [number, number, number][] = [[218, 566, 30], [272, 592, 34], [330, 600, 38], [386, 590, 32], [434, 562, 27]];
  for (const [tx, ty, tr] of toes) {
    g.fillStyle = "#f2cf9e";
    g.beginPath(); g.arc(tx, ty, tr, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 7;
    g.beginPath(); g.arc(tx, ty, tr, 0, 7); g.stroke();
    g.fillStyle = "#f7e3c2";
    g.beginPath(); g.ellipse(tx, ty + tr * 0.28, tr * 0.52, tr * 0.34, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(28,21,3,0.55)"; g.lineWidth = 4;
    g.beginPath(); g.ellipse(tx, ty + tr * 0.28, tr * 0.52, tr * 0.34, 0, 0, 7); g.stroke();
  }
  // descent speed lines at both sides
  g.strokeStyle = "rgba(28,21,3,0.5)"; g.lineWidth = 9; g.lineCap = "round";
  for (const [lx, ly, len] of [[110, 240, 120], [140, 420, 90], [530, 240, 120], [500, 420, 90]] as const) {
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly + len); g.stroke();
  }
};
/** The King's portrait shrine: a big golden Thai-gabled
 *  frame, the calm royal portrait inside, marigold pots,
 *  two candles and an incense bowl on the shelf below.
 *  1024x640. Candle flames sit at canvas fractions
 *  (0.22 / 0.78, 0.70) — world.ts halos match. */
export const drawPortraitSet = (p: Pen) => {
  const g = p.g;
  // outer golden frame with a pointed gable crown
  g.fillStyle = "#c99612";
  g.beginPath(); g.roundRect(212, 108, 600, 420, 12); g.fill();
  g.strokeStyle = "#5e4306"; g.lineWidth = 9;
  g.beginPath(); g.roundRect(212, 108, 600, 420, 12); g.stroke();
  g.beginPath();
  g.moveTo(392, 112); g.quadraticCurveTo(470, 66, 512, 18);
  g.quadraticCurveTo(554, 66, 632, 112); g.closePath(); g.fill();
  g.strokeStyle = "#5e4306"; g.lineWidth = 7;
  g.beginPath();
  g.moveTo(392, 112); g.quadraticCurveTo(470, 66, 512, 18);
  g.quadraticCurveTo(554, 66, 632, 112); g.stroke();
  g.fillStyle = "#e9b81f";
  g.beginPath(); g.roundRect(238, 134, 548, 368, 8); g.fill();
  // portrait backdrop: deep royal blue with a soft halo
  g.fillStyle = "#2e4470";
  g.fillRect(262, 158, 500, 320);
  const halo = g.createRadialGradient(512, 300, 10, 512, 300, 210);
  halo.addColorStop(0, "rgba(255,226,150,0.55)"); halo.addColorStop(1, "rgba(255,226,150,0)");
  g.fillStyle = halo; g.fillRect(262, 158, 500, 320);
  // the royal figure: shoulders + sash under the calm face
  g.fillStyle = "#26324e";
  g.beginPath(); g.ellipse(512, 486, 128, 66, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.ellipse(512, 486, 128, 66, 0, Math.PI, 0); g.stroke();
  g.strokeStyle = "#e08a2e"; g.lineWidth = 26;
  g.beginPath(); g.moveTo(428, 452); g.lineTo(580, 492); g.stroke();
  g.strokeStyle = "#f6c21c"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(428, 440); g.lineTo(580, 480); g.stroke();
  drawKingFace(g, 512, 316, 104, false);
  // the shelf the offerings stand on
  g.fillStyle = "#4a2e1e";
  g.fillRect(150, 528, 724, 26);
  g.fillStyle = "#2a1a0e";
  g.fillRect(150, 554, 724, 14);
  // two candles with living flames (fractions 0.22/0.78, ~0.70)
  for (const cx of [225, 799]) {
    g.fillStyle = "#8a8f96";
    g.beginPath(); g.roundRect(cx - 30, 500, 60, 12, 4); g.fill();
    g.fillStyle = "#f4f1ea";
    g.beginPath(); g.roundRect(cx - 11, 428, 22, 74, 5); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 4;
    g.beginPath(); g.roundRect(cx - 11, 428, 22, 74, 5); g.stroke();
    const fl = g.createRadialGradient(cx, 402, 2, cx, 402, 38);
    fl.addColorStop(0, "rgba(255,220,120,0.95)"); fl.addColorStop(1, "rgba(255,160,40,0)");
    g.fillStyle = fl; g.beginPath(); g.arc(cx, 402, 38, 0, 7); g.fill();
    g.fillStyle = "#ffb52e";
    g.beginPath(); g.ellipse(cx, 406, 9, 19, 0, 0, 7); g.fill();
    g.fillStyle = "#fff3c4";
    g.beginPath(); g.ellipse(cx, 413, 4.5, 9.5, 0, 0, 7); g.fill();
  }
  // marigold pots flanking the incense bowl
  for (const cx of [368, 656]) {
    g.fillStyle = "#a8542e";
    g.beginPath(); g.moveTo(cx - 34, 528); g.lineTo(cx + 34, 528); g.lineTo(cx + 24, 482); g.lineTo(cx - 24, 482); g.closePath(); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx - 34, 528); g.lineTo(cx + 34, 528); g.lineTo(cx + 24, 482); g.lineTo(cx - 24, 482); g.closePath(); g.stroke();
    for (const [fx3, fy3] of [[-20, 462], [0, 448], [20, 462], [-10, 474], [12, 476]] as const) {
      g.fillStyle = "#f08a1c"; g.beginPath(); g.arc(cx + fx3, fy3, 13, 0, 7); g.fill();
      g.fillStyle = "#f6c21c"; g.beginPath(); g.arc(cx + fx3, fy3, 6, 0, 7); g.fill();
    }
    g.strokeStyle = "#3f7d38"; g.lineWidth = 5; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx, 486); g.lineTo(cx - 4, 466); g.stroke();
    g.beginPath(); g.moveTo(cx, 486); g.lineTo(cx + 6, 470); g.stroke();
  }
  // incense bowl, centre front, three sticks + smoke
  g.fillStyle = "#6e5a2e";
  g.beginPath(); g.ellipse(512, 512, 62, 22, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(462, 504); g.lineTo(562, 504); g.lineTo(542, 470); g.lineTo(482, 470); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 4.5;
  g.beginPath(); g.ellipse(512, 512, 62, 22, 0, 0, 7); g.stroke();
  for (const dx of [-20, 0, 20]) {
    g.strokeStyle = "#7a4a26"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(512 + dx, 474); g.lineTo(512 + dx, 388); g.stroke();
    g.fillStyle = "#e2453c"; g.beginPath(); g.arc(512 + dx, 382, 5.5, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(230,230,235,0.7)"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(512, 360);
  g.bezierCurveTo(490, 316, 538, 282, 514, 236);
  g.bezierCurveTo(498, 204, 522, 186, 512, 160); g.stroke();
};
/** The GIANT baht coin: gold, milled edge, the King's
 *  profile inside, "10 BAHT" under it. 640x640 canvas. */
export const drawCoinGiant = (p: Pen) => {
  const g = p.g;
  const grad = g.createRadialGradient(280, 260, 40, 320, 320, 310);
  grad.addColorStop(0, "#ffe98a"); grad.addColorStop(0.6, "#f6c21c"); grad.addColorStop(1, "#d99a06");
  g.fillStyle = grad;
  g.beginPath(); g.arc(320, 320, 296, 0, 7); g.fill();
  g.strokeStyle = "#7a5200"; g.lineWidth = 10;
  g.beginPath(); g.arc(320, 320, 296, 0, 7); g.stroke();
  // milled edge ticks
  g.strokeStyle = "rgba(122,82,0,0.65)"; g.lineWidth = 7; g.lineCap = "round";
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(320 + Math.cos(a) * 272, 320 + Math.sin(a) * 272);
    g.lineTo(320 + Math.cos(a) * 292, 320 + Math.sin(a) * 292);
    g.stroke();
  }
  g.strokeStyle = "rgba(122,82,0,0.8)"; g.lineWidth = 5;
  g.beginPath(); g.arc(320, 320, 252, 0, 7); g.stroke();
  g.strokeStyle = "rgba(255,244,200,0.7)"; g.lineWidth = 3;
  g.beginPath(); g.arc(320, 320, 240, 0, 7); g.stroke();
  // the King's profile, facing left, spire crown silhouette
  g.fillStyle = "#a8740a";
  g.beginPath();
  g.moveTo(392, 428);
  g.quadraticCurveTo(300, 436, 262, 396);
  g.quadraticCurveTo(238, 372, 246, 330);
  g.lineTo(228, 316);
  g.quadraticCurveTo(240, 300, 238, 282);
  g.quadraticCurveTo(224, 268, 240, 246);
  g.quadraticCurveTo(232, 200, 268, 168);
  g.quadraticCurveTo(282, 128, 306, 96);
  g.quadraticCurveTo(318, 140, 344, 162);
  g.quadraticCurveTo(386, 196, 388, 262);
  g.quadraticCurveTo(390, 330, 380, 380);
  g.quadraticCurveTo(392, 408, 404, 428);
  g.closePath(); g.fill();
  g.fillStyle = "#f6c21c";
  g.beginPath(); g.arc(300, 258, 13, 0, 7); g.fill();
  // denomination under the profile
  g.fillStyle = "#7a5200"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 64px 'Arial Black', Arial, sans-serif";
  g.fillText("10 BAHT", 320, 500);
  // a sparkle on the rim
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(452, 128); g.lineTo(452, 168); g.stroke();
  g.beginPath(); g.moveTo(432, 148); g.lineTo(472, 148); g.stroke();
};
/** The Pasal 112 law board: a dark official plaque —
 *  "PASAL 112" huge, prison bars and a padlock under it.
 *  1024x640 canvas. */
export const drawLawBoard = (p: Pen) => {
  const g = p.g;
  const grad = g.createLinearGradient(0, 0, 0, 640);
  grad.addColorStop(0, "#3d4450"); grad.addColorStop(1, "#23272f");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(42, 42, 940, 556, 16); g.fill();
  g.strokeStyle = "#c9a227"; g.lineWidth = 8;
  g.beginPath(); g.roundRect(42, 42, 940, 556, 16); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(62, 62, 900, 516, 12); g.stroke();
  for (const [rx, ry] of [[86, 86], [938, 86], [86, 554], [938, 554]]) {
    g.fillStyle = "#c9a227"; g.beginPath(); g.arc(rx, ry, 11, 0, 7); g.fill();
    g.fillStyle = "#5e4306"; g.beginPath(); g.arc(rx - 3, ry - 3, 4, 0, 7); g.fill();
  }
  g.fillStyle = "#f4f1ea"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 150px 'Arial Black', Arial, sans-serif";
  g.fillText("PASAL 112", 512, 168);
  g.fillStyle = "#e2453c";
  g.fillRect(212, 258, 600, 10);
  // prison bars
  for (let i = 0; i < 7; i++) {
    const bx = 272 + i * 80;
    g.fillStyle = "#9aa2ae";
    g.fillRect(bx, 300, 26, 220);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(bx, 300, 7, 220);
  }
  g.fillStyle = "#6a707c";
  g.fillRect(240, 292, 544, 22);
  g.fillRect(240, 506, 544, 22);
  // padlock over the bars
  g.fillStyle = "#e9b81f";
  g.beginPath(); g.roundRect(452, 392, 120, 104, 12); g.fill();
  g.strokeStyle = "#5e4306"; g.lineWidth = 7;
  g.beginPath(); g.roundRect(452, 392, 120, 104, 12); g.stroke();
  g.strokeStyle = "#c9a227"; g.lineWidth = 17;
  g.beginPath(); g.arc(512, 392, 36, Math.PI, 0); g.stroke();
  g.fillStyle = "#5e4306";
  g.beginPath(); g.arc(512, 436, 13, 0, 7); g.fill();
  g.fillRect(506, 436, 12, 26);
};
/** The giant HAND stopping the coin the legal way: an open
 *  cartoon palm coming down from the top-left, fingers spread
 *  in a gentle STOP in front of a small baht coin.
 *  1024x512 canvas. */
export const drawHandStopSet = (p: Pen) => {
  const g = p.g;
  // forearm from the top-left corner
  g.fillStyle = "#eec39a";
  g.beginPath();
  g.moveTo(60, 0); g.lineTo(300, 0);
  g.quadraticCurveTo(330, 120, 356, 196);
  g.lineTo(196, 262);
  g.quadraticCurveTo(130, 140, 60, 0);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 9;
  g.beginPath();
  g.moveTo(60, 0);
  g.quadraticCurveTo(130, 140, 196, 262);
  g.lineTo(356, 196);
  g.quadraticCurveTo(330, 120, 300, 0);
  g.stroke();
  // teal sleeve cuff at the wrist (it is the hero's own hand)
  g.fillStyle = "#2e7f86";
  g.beginPath();
  g.moveTo(86, 26); g.lineTo(292, 26);
  g.quadraticCurveTo(306, 92, 322, 142);
  g.lineTo(168, 196);
  g.quadraticCurveTo(120, 92, 86, 26);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 7;
  g.beginPath();
  g.moveTo(86, 26); g.lineTo(292, 26);
  g.quadraticCurveTo(306, 92, 322, 142);
  g.lineTo(168, 196);
  g.quadraticCurveTo(120, 92, 86, 26);
  g.closePath(); g.stroke();
  // the open palm: one big rounded pad, fingers spread
  g.fillStyle = "#f2cf9e";
  g.beginPath(); g.ellipse(330, 300, 118, 96, 0.5, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 9;
  g.beginPath(); g.ellipse(330, 300, 118, 96, 0.5, 0, 7); g.stroke();
  const fingers: [number, number, number, number][] = [[238, 218, 216, 148], [300, 196, 292, 118], [368, 192, 372, 112], [428, 212, 448, 148], [452, 262, 500, 226]];
  for (const [x0, y0, x1, y1] of fingers) {
    g.strokeStyle = "#1c1503"; g.lineWidth = 47; g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "#f2cf9e"; g.lineWidth = 33;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  // palm creases
  g.strokeStyle = "rgba(160,100,50,0.5)"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(268, 268); g.quadraticCurveTo(330, 300, 392, 268); g.stroke();
  g.beginPath(); g.moveTo(282, 322); g.quadraticCurveTo(336, 344, 386, 318); g.stroke();
  // the small coin stopped dead in front of the palm
  const cg = g.createRadialGradient(700, 330, 20, 724, 356, 120);
  cg.addColorStop(0, "#ffe98a"); cg.addColorStop(1, "#d99a06");
  g.fillStyle = cg;
  g.beginPath(); g.arc(724, 356, 108, 0, 7); g.fill();
  g.strokeStyle = "#7a5200"; g.lineWidth = 8;
  g.beginPath(); g.arc(724, 356, 108, 0, 7); g.stroke();
  g.strokeStyle = "rgba(122,82,0,0.7)"; g.lineWidth = 4;
  g.beginPath(); g.arc(724, 356, 88, 0, 7); g.stroke();
  g.fillStyle = "#a8740a";
  g.beginPath(); g.arc(724, 348, 40, 0, 7); g.fill();
  g.fillStyle = "#7a5200"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 40px 'Arial Black', Arial, sans-serif";
  g.fillText("10", 724, 428);
  // stop-impact ticks between palm and coin
  g.strokeStyle = "rgba(28,21,3,0.6)"; g.lineWidth = 7; g.lineCap = "round";
  for (const [tx, ty] of [[540, 268], [566, 330], [540, 392]] as const) {
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + 30, ty); g.stroke();
  }
};
/** A small everyday baht note for the stall table — the
 *  same design at peace, calm portrait. 512x320 canvas. */
export const drawNoteSmall = (p: Pen) => {
  const g = p.g;
  const grad = g.createLinearGradient(0, 0, 512, 320);
  grad.addColorStop(0, "#cdbcf0"); grad.addColorStop(1, "#9a7fc9");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(14, 14, 484, 292, 12); g.fill();
  g.strokeStyle = "#3a2a5e"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(14, 14, 484, 292, 12); g.stroke();
  g.strokeStyle = "rgba(58,42,94,0.4)"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(30, 30, 452, 260, 8); g.stroke();
  g.fillStyle = "#3a2a5e"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 54px 'Arial Black', Arial, sans-serif";
  g.fillText("1000", 92, 62);
  g.fillText("1000", 420, 262);
  g.fillStyle = "#e9b81f";
  g.beginPath(); g.ellipse(256, 160, 84, 104, 0, 0, 7); g.fill();
  g.strokeStyle = "#3a2a5e"; g.lineWidth = 4.5;
  g.beginPath(); g.ellipse(256, 160, 84, 104, 0, 0, 7); g.stroke();
  g.fillStyle = "#7a94c9";
  g.beginPath(); g.ellipse(256, 160, 72, 92, 0, 0, 7); g.fill();
  drawKingFace(g, 256, 166, 58, false);
};
/** A soft golden halo ring — the sacred head marker.
 *  256x256 canvas, drawn as an fx above the friend's head. */
export const drawHalo = (p: Pen) => {
  const g = p.g;
  const grad = g.createRadialGradient(128, 128, 30, 128, 128, 120);
  grad.addColorStop(0, "rgba(255,220,120,0)");
  grad.addColorStop(0.62, "rgba(255,220,120,0.10)");
  grad.addColorStop(0.8, "rgba(255,214,90,0.85)");
  grad.addColorStop(1, "rgba(255,214,90,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#f6c21c"; g.lineWidth = 13;
  g.beginPath(); g.ellipse(128, 128, 86, 40, 0, 0, 7); g.stroke();
  g.strokeStyle = "rgba(255,246,200,0.9)"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(128, 122, 86, 40, 0, 0, 7); g.stroke();
};
/** Horizontal speed streaks trailing the rolling coin.
 *  512x256 canvas, transparent but for the streaks. */
export const drawSpeedLines = (p: Pen) => {
  const g = p.g;
  g.strokeStyle = "rgba(28,21,3,0.45)"; g.lineCap = "round";
  for (const [y, len, w] of [[52, 300, 13], [104, 380, 17], [156, 330, 13], [204, 240, 11]] as const) {
    g.lineWidth = w;
    g.beginPath(); g.moveTo(20, y); g.lineTo(20 + len, y); g.stroke();
  }
  g.fillStyle = "rgba(120,95,60,0.5)";
  for (const [dx, dy, dr] of [[70, 226, 9], [150, 238, 7], [240, 228, 8]] as const) {
    g.beginPath(); g.arc(dx, dy, dr, 0, 7); g.fill();
  }
};

// ---------------- staging ----------------
/** The giant note on the stall table (or held mid-air). */
const noteFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangNoteGiant", cw: 1024, ch: 640, draw: drawNoteGiant, x, y, z, w, h: w * 0.625 });
};
/** The giant descending foot. */
const footFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangFootGiant", cw: 640, ch: 800, draw: drawFootGiant, x, y, z, w, h: w * 1.25 });
};
/** The King's portrait shrine billboard (the world.ts
 *  platform and candle halos are placed to match it). */
const portraitFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangPortraitSet", cw: 1024, ch: 640, draw: drawPortraitSet, x, y, z, w, h: w * 0.625 });
};
/** The giant coin, upright; rot spins it as it rolls. */
const coinFx = (out: Stage, x: number, y: number, z: number, w: number, rot = 0) => {
  out.fx.push({ key: "uangCoinGiant", cw: 640, ch: 640, draw: drawCoinGiant, x, y, z, w, h: w, rot });
};
/** The Pasal 112 board. */
const lawFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangLawBoard", cw: 1024, ch: 640, draw: drawLawBoard, x, y, z, w, h: w * 0.625 });
};
/** The stopping hand + its coin. */
const handFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangHandStop", cw: 1024, ch: 512, draw: drawHandStopSet, x, y, z, w, h: w * 0.5 });
};
/** A small calm note on the table. */
const noteSmallFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangNoteSmall", cw: 512, ch: 320, draw: drawNoteSmall, x, y, z, w, h: w * 0.625 });
};
/** Speed streaks behind the rolling coin. */
const speedFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangSpeed", cw: 512, ch: 256, draw: drawSpeedLines, x, y, z, w, h: w * 0.5, soft: true });
};
/** The sacred halo over the friend's head. */
const haloFx = (out: Stage, x: number, y: number, z: number, w: number) => {
  out.fx.push({ key: "uangHalo", cw: 256, ch: 256, draw: drawHalo, x, y, z, w, h: w, soft: true });
};
/** The foot's shadow pool on the table, growing as it nears. */
const footShadowFx = (out: Stage, x: number, y: number, z: number, w: number, dark: number) => {
  const cc = hexOf([0.3, 0.3, 0.42], dark);
  out.fx.push({ key: `blob|foot|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y, z, w, h: w * 0.72, flat: true });
};

const heroAt = (out: Stage, cam: CamInfo, tt: number, i: number, x: number, z: number, fo: FrontOpts, scale = 1.5) => {
  const d: FrontOpts = { expr: "neutral", mode: "stand", wave: 0, blink: lidAt(tt, i), ...fo };
  out.places.push(person(cam, HERO, x, 0, z, d, scale));
  blob(out, x, 0.01, z, scale * 0.92, 1);
};
const friendAt = (out: Stage, cam: CamInfo, tt: number, i: number, x: number, z: number, fo: FrontOpts, scale = 1.5) => {
  const d: FrontOpts = { expr: "neutral", mode: "stand", wave: 0, blink: lidAt(tt, i), ...fo };
  out.places.push(person(cam, FRIEND, x, 0, z, d, scale));
  blob(out, x, 0.01, z, scale * 0.92, 1);
};
const card = (out: Stage, cam: CamInfo, lines: string[], x: number, y: number, z: number, w: number, h = 0.92) => {
  const k = `card|${lines.join("/")}`;
  const [cw, ch, kk] = tier(cam.pos.distanceTo(tmp.set(x, y, z)) / (w / 2.1));
  out.fx.push({ key: k, cw: 504, ch: 252, draw: drawCardFit(lines, "#f6c21c", "#1c1503", 120), x, y, z, w, h });
  void cw; void ch; void kk;
};

export const stage = (id: number, tt: number, cam: CamInfo): Stage => {
  const s = SHOTS[id - 1];
  LNAME = s.light;
  const out: Stage = { places: [], fx: [] };
  const shot = id;
  const t0 = s.a / FPS;
  const u = clamp01((tt - t0) / 1.1);
  const pulse = 1 + 0.035 * Math.sin(tt * 5.2);
  const [hx, , hz] = HERO_SPOT;
  const [fx2, , fz] = FRIEND_SPOT;
  const LVS = leavesAt(tt);

  // ---- fx-note icons (the musical-note gag, house style) ----
  const note = (x: number, y: number, z: number, kind: number, w = 0.5) => {
    out.fx.push({ key: `note|${kind}`, cw: 200, ch: 200, draw: (p) => fxNote(p, kind, "#1c2a1e"), x, y, z, w, h: w, soft: true });
  };
  const burst = (x: number, y: number, z: number, w = 2.0) => {
    out.fx.push({ key: `burst|${q(tt * 8, 1)}`, cw: 400, ch: 400, draw: (p) => fxBurst(p, 0.55, "#ffd23e", 10, 34, 180), x, y, z, w, h: w, soft: true });
  };

  if (shot === 1) {
    // HOOK: the GIANT note lies on the stall table, the King's
    // portrait sweating on it, and the GIANT BARE FOOT comes
    // down on it — bobbing lower and lower, ALREADY MOVING in
    // the first frames. Hero recoils at the left of the table
    // grabbing at the leg; his friend freezes on the right.
    const drop = (Math.sin((tt - t0) * 4.4) + 1) / 2;
    noteFx(out, 0, 1.52, -5.3, 3.9 * pulse);
    footFx(out, 0.95, 3.62 - drop * 0.62, -4.35, 2.5);
    footShadowFx(out, 0.9, 0.78, -4.95, 1.7 + drop * 0.7, 0.7 + drop * 0.45);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "shock", wave: 0.95 });
    friendAt(out, cam, tt, 1, fx2, fz, { expr: "shock", wave: 0.85 });
    burst(1.75, 3.1, -4.9, 1.5);
    card(out, cam, ["PENJARA", "15 TAHUN!"], -1.55, 4.62, -6.4, 2.7 * u);
  }
  if (shot === 2) {
    // THE REASON: wide on the market corner — the note and a
    // coin on the table, and the King's golden portrait
    // watching over the stall from the back wall. EVERY baht
    // carries his face; the hero finally gets it.
    noteFx(out, -0.5, 1.42, -5.2, 3.1);
    noteSmallFx(out, -2.35, 1.18, -4.35, 1.35);
    coinFx(out, 1.85, 1.02, -4.5, 1.55);
    portraitFx(out, 0, 2.1, -11.5, 4.6);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "nervous", wave: 0.35 });
    friendAt(out, cam, tt, 1, fx2, fz, { expr: "stern", wave: 0.55 });
    card(out, cam, ["BERGAMBAR", "RAJA"], 0, 4.85, -7.4, 2.7 * u);
  }
  if (shot === 3) {
    // THE LAW: the Pasal 112 board looms behind the table,
    // bars and padlock, while the note sits small and
    // innocent in front of it. Close-up: hero alone with the
    // law (the friend's default spot falls outside this
    // camera's narrow axis, so he stays out of this shot).
    noteFx(out, -0.4, 1.45, -4.7, 3.3);
    lawFx(out, -1.2, 2.7, -8.8, 3.4);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "nervous", wave: 0.2 }, 1.15);
    card(out, cam, ["PASAL", "112"], 0.2, 2.9, -4.5, 2.2 * u);
  }
  if (shot === 4) {
    // RE-HOOK: a baht coin ROLLS in from the left straight at
    // the hero's raised foot — same trap, new object. It
    // travels and spins through the whole shot.
    const s0 = s.a / FPS, s1 = s.b / FPS;
    const ru = clamp01((tt - s0) / ((s1 - s0) * 0.92));
    const cx = -1.7 + ru * 2.0;
    speedFx(out, cx - 1.3, 0.95, -3.0, 1.7);
    coinFx(out, cx, 0.9, -2.9, 1.45, -ru * 5.2);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "shock", wave: 1.0 });
    friendAt(out, cam, tt, 1, -1.1, -3.3, { expr: "shock", wave: 0.9 });
    card(out, cam, ["JANGAN PAKAI", "KAKI!"], 0.3, 3.35, -4.6, 2.3 * u);
  }
  if (shot === 5) {
    // THE SAVE: the giant hand comes down and stops the coin
    // dead — the way Thais actually do it. Both relax.
    handFx(out, 0.55, 1.35, -2.9, 2.6);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "relief", wave: 0.3 });
    friendAt(out, cam, tt, 1, 0.0, -3.2, { expr: "relief_open", wave: 0.5 });
    note(1.9, 3.3, -4.2, Math.floor(tt * 2) % 3, 0.42);
    card(out, cam, ["PAKAI", "TANGAN"], 0.5, 3.3, -4.4, 2.2 * u);
  }
  if (shot === 6) {
    // THE CONTRAST: the hero, relieved, nearly pats his
    // friend on the head — and freezes: a halo of sacredness
    // glows over it. Feet lowest, head highest.
    haloFx(out, 1.6, 2.95, -3.25, 1.15);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "nervous", wave: 0.75 });
    friendAt(out, cam, tt, 1, 1.6, -3.4, { expr: "shock", wave: 0.65 });
    card(out, cam, ["KEPALA ITU", "SUCI"], 0.6, 3.15, -4.6, 2.2 * u);
  }
  if (shot === 7) {
    // PUNCHLINE LOOP (golden): the foot is gone, the note is
    // safe on the table under the portrait's calm gaze, and
    // the hero — wiser now — bows to the money instead.
    noteFx(out, 0, 1.52, -5.3, 3.9 * pulse);
    portraitFx(out, 0, 2.1, -11.5, 4.6);
    heroAt(out, cam, tt, 0, hx, hz, { expr: "laugh", wave: 0.4 });
    friendAt(out, cam, tt, 1, fx2, fz, { expr: "grin", wave: 0.45 });
    note(-1.9, 3.35, -4.2, Math.floor(tt * 2) % 3, 0.42);
    note(2.0, 3.5, -4.4, (Math.floor(tt * 2) + 1) % 3, 0.38);
    card(out, cam, ["PENJARA", "15 TAHUN!"], 0, 4.62, -6.4, 2.85 * u);
  }
  void LVS;
  return out;
};
