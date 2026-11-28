// The cast of the Sumpit frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// who has just committed the ultimate Japanese table taboo, and
// his Japanese FRIEND (indigo shirt, black hair) who watches in
// horror. Props — the GIANT rice bowl with chopsticks standing
// upright (tatebashi), the household altar set with incense and
// candles, the chopstick-to-chopstick passing pair, the
// cremation urn, and the correct hashioki rest. Same pool + card
// machinery as the house style: one canvas per distinct drawing,
// yaw-only billboards shaded by cardShade(), soft contact blobs.
// The claim card floats as an ink-outlined board via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the view
// axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, FRIEND_SPOT, leavesAt } from "./story";
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
// In this episode he plants his chopsticks upright in the rice.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "sumpitHero" };
// FRIEND: the Japanese host — indigo shirt, black hair, the one
// who has to explain why the whole table just went silent.
const FRIEND: Who = { i: 63, o: { jacket: "#37456e", pants: "#2e3440", boots: "#2a2a2e", hat: "hair", hair: "#22222a", skin: "#eec39a" }, okey: "sumpitFriend" };

// ---------------- episode props (drawn, never pasted) ----------------
/** The GIANT rice bowl with chopsticks standing UPRIGHT in
 *  the rice — tatebashi, the episode's visual signature.
 *  1024x768 canvas: red lacquer tray, big white bowl with a
 *  blue rim band, a dome of rice, two chopsticks planted
 *  vertically like incense sticks, steam curling up, a small
 *  pickle dish beside it. */
export const drawBowlUpright = (p: Pen) => {
  const g = p.g;
  // red lacquer tray under the bowl
  g.fillStyle = "#8e2323";
  g.beginPath(); g.ellipse(512, 668, 400, 52, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 7;
  g.beginPath(); g.ellipse(512, 668, 400, 52, 0, 0, 7); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.beginPath(); g.ellipse(430, 652, 220, 20, 0, 0, 7); g.fill();
  // the bowl body — wide white ceramic
  g.fillStyle = "#f7f3ea";
  g.beginPath();
  g.moveTo(212, 430);
  g.quadraticCurveTo(240, 620, 420, 652);
  g.lineTo(604, 652);
  g.quadraticCurveTo(784, 620, 812, 430);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 9;
  g.beginPath();
  g.moveTo(212, 430);
  g.quadraticCurveTo(240, 620, 420, 652);
  g.lineTo(604, 652);
  g.quadraticCurveTo(784, 620, 812, 430);
  g.closePath(); g.stroke();
  // blue rim band with a wave pattern
  g.fillStyle = "#2e5f9e";
  g.beginPath(); g.ellipse(512, 430, 300, 44, 0, 0, 7); g.fill();
  g.strokeStyle = "#f7f3ea"; g.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.arc(300 + i * 84, 430, 20, Math.PI, 0); g.stroke();
  }
  // foot ring
  g.fillStyle = "#e8e2d2";
  g.beginPath(); g.roundRect(452, 648, 120, 22, 6); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.roundRect(452, 648, 120, 22, 6); g.stroke();
  // the rice dome
  g.fillStyle = "#fffdf6";
  g.beginPath(); g.ellipse(512, 428, 282, 92, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "rgba(28,21,3,0.35)"; g.lineWidth = 4;
  g.beginPath(); g.ellipse(512, 428, 282, 92, 0, Math.PI, 0); g.stroke();
  const rs = rng(31);
  g.fillStyle = "rgba(160,150,130,0.5)";
  for (let i = 0; i < 130; i++) {
    const a = rs() * Math.PI, rr2 = rs();
    g.beginPath(); g.ellipse(512 + Math.cos(a) * 250 * rr2, 428 - Math.sin(a) * 74 * rr2, 5, 3, a, 0, 7); g.fill();
  }
  // THE CHOPSTICKS — planted upright in the rice like incense
  for (const dx of [-26, 26]) {
    g.strokeStyle = "#1c1503"; g.lineWidth = 30; g.lineCap = "round";
    g.beginPath(); g.moveTo(512 + dx, 420); g.lineTo(512 + dx * 1.5, 96); g.stroke();
    g.strokeStyle = "#8a5a2e"; g.lineWidth = 20;
    g.beginPath(); g.moveTo(512 + dx, 420); g.lineTo(512 + dx * 1.5, 96); g.stroke();
    g.strokeStyle = "rgba(255,235,190,0.7)"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(512 + dx - 5, 400); g.lineTo(512 + dx * 1.5 - 5, 120); g.stroke();
  }
  // steam curls rising off the rice
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 9; g.lineCap = "round";
  for (const sx of [330, 700]) {
    g.beginPath(); g.moveTo(sx, 380);
    g.bezierCurveTo(sx - 26, 320, sx + 26, 280, sx, 214);
    g.bezierCurveTo(sx - 20, 168, sx + 14, 140, sx, 104); g.stroke();
  }
  // small pickle dish at the side
  g.fillStyle = "#dce8f2";
  g.beginPath(); g.ellipse(196, 640, 74, 26, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(196, 640, 74, 26, 0, 0, 7); g.stroke();
  for (const [px, col] of [[168, "#7da23c"], [200, "#e8b83c"], [228, "#7da23c"]] as const) {
    g.fillStyle = col; g.beginPath(); g.arc(px, 628, 13, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 3; g.beginPath(); g.arc(px, 628, 13, 0, 7); g.stroke();
  }
  // gloss sweep on the bowl
  g.fillStyle = "rgba(255,255,255,0.20)";
  g.beginPath(); g.ellipse(360, 520, 90, 130, 0.25, 0, 7); g.fill();
};
/** The household altar set (butsudan): dark cabinet, a framed
 *  portrait silhouette, two candles, an incense burner with
 *  three sticks and smoke, a mini offering bowl — 1024x640. */
export const drawAltarSet = (p: Pen) => {
  const g = p.g;
  // cabinet body
  g.fillStyle = "#3a2417";
  g.beginPath(); g.roundRect(112, 110, 800, 460, 14); g.fill();
  g.strokeStyle = "#120a04"; g.lineWidth = 10;
  g.beginPath(); g.roundRect(112, 110, 800, 460, 14); g.stroke();
  g.fillStyle = "#4a2e1e";
  g.beginPath(); g.roundRect(140, 138, 744, 340, 10); g.fill();
  g.strokeStyle = "#c9a227"; g.lineWidth = 4;
  g.beginPath(); g.roundRect(140, 138, 744, 340, 10); g.stroke();
  // shelf the offerings stand on
  g.fillStyle = "#2a1a0e";
  g.fillRect(140, 478, 744, 92);
  // framed portrait of the deceased (silhouette only)
  g.fillStyle = "#c9a227";
  g.beginPath(); g.roundRect(427, 158, 170, 216, 8); g.fill();
  g.fillStyle = "#cfd4d8";
  g.beginPath(); g.roundRect(441, 172, 142, 188, 6); g.fill();
  g.fillStyle = "#5a6068";
  g.beginPath(); g.arc(512, 240, 34, 0, 7); g.fill();
  g.beginPath(); g.ellipse(512, 336, 52, 30, 0, Math.PI, 0); g.fill();
  // two candles with living flames
  for (const cx of [268, 756]) {
    g.fillStyle = "#8a8f96";
    g.beginPath(); g.roundRect(cx - 34, 452, 68, 14, 4); g.fill();
    g.fillStyle = "#f4f1ea";
    g.beginPath(); g.roundRect(cx - 13, 356, 26, 98, 6); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 4;
    g.beginPath(); g.roundRect(cx - 13, 356, 26, 98, 6); g.stroke();
    const fl = g.createRadialGradient(cx, 322, 2, cx, 322, 44);
    fl.addColorStop(0, "rgba(255,220,120,0.95)"); fl.addColorStop(1, "rgba(255,160,40,0)");
    g.fillStyle = fl; g.beginPath(); g.arc(cx, 322, 44, 0, 7); g.fill();
    g.fillStyle = "#ffb52e";
    g.beginPath(); g.ellipse(cx, 326, 10, 22, 0, 0, 7); g.fill();
    g.fillStyle = "#fff3c4";
    g.beginPath(); g.ellipse(cx, 334, 5, 11, 0, 0, 7); g.fill();
  }
  // incense burner with three sticks, centre front
  g.fillStyle = "#6e5a2e";
  g.beginPath(); g.ellipse(512, 500, 74, 26, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(452, 492); g.lineTo(572, 492); g.lineTo(548, 452); g.lineTo(476, 452); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(512, 500, 74, 26, 0, 0, 7); g.stroke();
  for (const dx of [-24, 0, 24]) {
    g.strokeStyle = "#7a4a26"; g.lineWidth = 7; g.lineCap = "round";
    g.beginPath(); g.moveTo(512 + dx, 456); g.lineTo(512 + dx, 356); g.stroke();
    g.fillStyle = "#e2453c"; g.beginPath(); g.arc(512 + dx, 350, 6, 0, 7); g.fill();
  }
  // incense smoke curling up past the portrait
  g.strokeStyle = "rgba(230,230,235,0.75)"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(512, 330);
  g.bezierCurveTo(486, 280, 540, 240, 514, 186);
  g.bezierCurveTo(496, 148, 524, 128, 512, 100); g.stroke();
  // mini offering bowl, left of the burner
  g.fillStyle = "#f7f3ea";
  g.beginPath(); g.ellipse(348, 486, 52, 18, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(348, 472, 44, 16, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "#7a4a26"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(340, 466); g.lineTo(338, 408); g.stroke();
  g.beginPath(); g.moveTo(356, 466); g.lineTo(358, 408); g.stroke();
  // flower vase, right of the burner
  g.fillStyle = "#3f5a78";
  g.beginPath(); g.moveTo(664, 506); g.lineTo(700, 506); g.lineTo(692, 446); g.lineTo(672, 446); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(664, 506); g.lineTo(700, 506); g.lineTo(692, 446); g.lineTo(672, 446); g.closePath(); g.stroke();
  g.strokeStyle = "#3f7d38"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(682, 446); g.lineTo(668, 396); g.stroke();
  g.beginPath(); g.moveTo(682, 446); g.lineTo(698, 392); g.stroke();
  for (const [fx2, fy2] of [[664, 388], [702, 384]] as const) {
    g.fillStyle = "#f4f1ea"; g.beginPath(); g.arc(fx2, fy2, 13, 0, 7); g.fill();
    g.fillStyle = "#f6c21c"; g.beginPath(); g.arc(fx2, fy2, 5, 0, 7); g.fill();
  }
};
/** Two pairs of chopsticks meeting tip-to-tip, passing a
 *  pale morsel between them — hashiwatashi, the gesture that
 *  mirrors the kotsuage bone ritual. 1024x512 canvas. */
export const drawPassing = (p: Pen) => {
  const g = p.g;
  const stick = (x0: number, y0: number, x1: number, y1: number) => {
    g.strokeStyle = "#1c1503"; g.lineWidth = 26; g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "#8a5a2e"; g.lineWidth = 17;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "rgba(255,235,190,0.65)"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x0, y0 - 5); g.lineTo(x1, y1 - 5); g.stroke();
  };
  // left pair converging to the centre
  stick(52, 96, 468, 238);
  stick(52, 196, 468, 282);
  // right pair converging to the centre
  stick(972, 96, 556, 238);
  stick(972, 196, 556, 282);
  // the morsel being passed — a pale bone-like piece
  g.fillStyle = "#efe6d0";
  g.beginPath(); g.roundRect(468, 238, 88, 44, 20); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(468, 238, 88, 44, 20); g.stroke();
  for (const kx of [468, 556]) {
    g.fillStyle = "#efe6d0"; g.beginPath(); g.arc(kx, 244, 17, 0, 7); g.fill();
    g.beginPath(); g.arc(kx, 276, 17, 0, 7); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 5;
    g.beginPath(); g.arc(kx, 244, 17, 0, 7); g.stroke();
    g.beginPath(); g.arc(kx, 276, 17, 0, 7); g.stroke();
  }
  // trembling motion arcs above the meeting point
  g.strokeStyle = "rgba(28,21,3,0.55)"; g.lineWidth = 6; g.lineCap = "round";
  for (const [ax, ay, r] of [[452, 168, 26], [512, 148, 30], [572, 168, 26]] as const) {
    g.beginPath(); g.arc(ax, ay, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  }
  // a dropped grain of rice below, for comedy
  g.fillStyle = "#fffdf6";
  g.beginPath(); g.ellipse(512, 420, 16, 10, 0.4, 0, 7); g.fill();
  g.strokeStyle = "rgba(28,21,3,0.4)"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(512, 420, 16, 10, 0.4, 0, 7); g.stroke();
};
/** The cremation urn on its cloth, with a tray of pale bone
 *  fragments and the long ritual chopsticks — the kotsuage
 *  referent. 512x512 canvas. */
export const drawUrn = (p: Pen) => {
  const g = p.g;
  // indigo cloth beneath
  g.fillStyle = "#37456e";
  g.beginPath(); g.ellipse(256, 428, 190, 34, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(256, 428, 190, 34, 0, 0, 7); g.stroke();
  // urn body — round grey-blue ceramic
  g.fillStyle = "#6a707c";
  g.beginPath(); g.ellipse(256, 300, 118, 112, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.20)";
  g.beginPath(); g.ellipse(214, 258, 40, 62, 0.3, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 7;
  g.beginPath(); g.ellipse(256, 300, 118, 112, 0, 0, 7); g.stroke();
  // gold band + lid with knob
  g.fillStyle = "#c9a227";
  g.fillRect(146, 236, 220, 12);
  g.fillStyle = "#7d838e";
  g.beginPath(); g.ellipse(256, 196, 84, 30, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.ellipse(256, 196, 84, 30, 0, Math.PI, 0); g.stroke();
  g.fillStyle = "#c9a227";
  g.beginPath(); g.arc(256, 158, 15, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 4;
  g.beginPath(); g.arc(256, 158, 15, 0, 7); g.stroke();
  // white label with abstract ink strokes (no real text)
  g.fillStyle = "#f4f1ea";
  g.beginPath(); g.roundRect(226, 272, 60, 84, 6); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 4;
  g.beginPath(); g.roundRect(226, 272, 60, 84, 6); g.stroke();
  g.strokeStyle = "#2a2a33"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(244, 288); g.lineTo(244, 338); g.stroke();
  g.beginPath(); g.moveTo(268, 288); g.lineTo(268, 324); g.stroke();
  g.beginPath(); g.moveTo(238, 302); g.lineTo(274, 302); g.stroke();
  // tray of pale bone fragments, front left
  g.fillStyle = "#8e2323";
  g.beginPath(); g.ellipse(120, 424, 74, 18, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 4;
  g.beginPath(); g.ellipse(120, 424, 74, 18, 0, 0, 7); g.stroke();
  for (const [bx, by, br2] of [[92, 410, 15], [128, 402, 18], [158, 412, 13]] as const) {
    g.fillStyle = "#efe6d0";
    g.beginPath(); g.roundRect(bx - br2, by - 8, br2 * 2, 16, 8); g.fill();
    g.strokeStyle = "#1c1503"; g.lineWidth = 3.5;
    g.beginPath(); g.roundRect(bx - br2, by - 8, br2 * 2, 16, 8); g.stroke();
  }
  // the long ritual chopsticks resting on a stand, right side
  g.strokeStyle = "#1c1503"; g.lineWidth = 13; g.lineCap = "round";
  g.beginPath(); g.moveTo(356, 448); g.lineTo(452, 330); g.stroke();
  g.beginPath(); g.moveTo(380, 456); g.lineTo(476, 338); g.stroke();
  g.strokeStyle = "#8a5a2e"; g.lineWidth = 8;
  g.beginPath(); g.moveTo(356, 448); g.lineTo(452, 330); g.stroke();
  g.beginPath(); g.moveTo(380, 456); g.lineTo(476, 338); g.stroke();
};
/** The CORRECT way: chopsticks lying flat on a ceramic
 *  hashioki rest beside a plain bowl of rice — 1024x512. */
export const drawHashiokiSet = (p: Pen) => {
  const g = p.g;
  // dark wood table band
  g.fillStyle = "#4a2e1e";
  g.fillRect(0, 372, 1024, 140);
  g.strokeStyle = "rgba(20,10,4,0.6)"; g.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(0, 408 + i * 36); g.lineTo(1024, 402 + i * 36); g.stroke();
  }
  g.fillStyle = "#2a1a0e";
  g.fillRect(0, 372, 1024, 10);
  // plain bowl of rice, left — NO sticks in it
  g.fillStyle = "#f7f3ea";
  g.beginPath();
  g.moveTo(120, 268);
  g.quadraticCurveTo(140, 366, 240, 380);
  g.lineTo(360, 380);
  g.quadraticCurveTo(460, 366, 480, 268);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 8;
  g.beginPath();
  g.moveTo(120, 268);
  g.quadraticCurveTo(140, 366, 240, 380);
  g.lineTo(360, 380);
  g.quadraticCurveTo(460, 366, 480, 268);
  g.closePath(); g.stroke();
  g.fillStyle = "#2e5f9e";
  g.beginPath(); g.ellipse(300, 268, 180, 26, 0, 0, 7); g.fill();
  g.fillStyle = "#fffdf6";
  g.beginPath(); g.ellipse(300, 264, 168, 52, 0, Math.PI, 0); g.fill();
  // steam off the plain bowl
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 8; g.lineCap = "round";
  g.beginPath(); g.moveTo(300, 196);
  g.bezierCurveTo(278, 150, 322, 122, 300, 70); g.stroke();
  // the chopsticks lying FLAT, tips on the hashioki
  for (const dy of [0, 26]) {
    g.strokeStyle = "#1c1503"; g.lineWidth = 24; g.lineCap = "round";
    g.beginPath(); g.moveTo(520, 330 + dy); g.lineTo(952, 318 + dy); g.stroke();
    g.strokeStyle = "#8a5a2e"; g.lineWidth = 15;
    g.beginPath(); g.moveTo(520, 330 + dy); g.lineTo(952, 318 + dy); g.stroke();
  }
  // the ceramic rest — a small blue-white pillow
  g.fillStyle = "#dce8f2";
  g.beginPath(); g.roundRect(566, 330, 96, 40, 16); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 5;
  g.beginPath(); g.roundRect(566, 330, 96, 40, 16); g.stroke();
  g.fillStyle = "#2e5f9e";
  g.beginPath(); g.arc(614, 350, 9, 0, 7); g.fill();
  // a green teacup at the right end
  g.fillStyle = "#3f7d5a";
  g.beginPath();
  g.moveTo(880, 268); g.lineTo(968, 268); g.lineTo(956, 330); g.lineTo(892, 330); g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath();
  g.moveTo(880, 268); g.lineTo(968, 268); g.lineTo(956, 330); g.lineTo(892, 330); g.closePath(); g.stroke();
  g.fillStyle = "#cfe3b8";
  g.beginPath(); g.ellipse(924, 268, 44, 10, 0, 0, 7); g.fill();
};
/** A plain bowl of rice with the chopsticks resting ACROSS
 *  the rim — the everyday, allowed sight. 512x384 canvas. */
export const drawBowlPlain = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#8e2323";
  g.beginPath(); g.ellipse(256, 322, 190, 26, 0, 0, 7); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 6;
  g.beginPath(); g.ellipse(256, 322, 190, 26, 0, 0, 7); g.stroke();
  g.fillStyle = "#f7f3ea";
  g.beginPath();
  g.moveTo(76, 190);
  g.quadraticCurveTo(92, 292, 176, 308);
  g.lineTo(336, 308);
  g.quadraticCurveTo(420, 292, 436, 190);
  g.closePath(); g.fill();
  g.strokeStyle = "#1c1503"; g.lineWidth = 8;
  g.beginPath();
  g.moveTo(76, 190);
  g.quadraticCurveTo(92, 292, 176, 308);
  g.lineTo(336, 308);
  g.quadraticCurveTo(420, 292, 436, 190);
  g.closePath(); g.stroke();
  g.fillStyle = "#2e5f9e";
  g.beginPath(); g.ellipse(256, 190, 180, 26, 0, 0, 7); g.fill();
  g.fillStyle = "#fffdf6";
  g.beginPath(); g.ellipse(256, 188, 168, 50, 0, Math.PI, 0); g.fill();
  // chopsticks resting flat across the rim
  for (const dy of [0, 20]) {
    g.strokeStyle = "#1c1503"; g.lineWidth = 17; g.lineCap = "round";
    g.beginPath(); g.moveTo(56, 148 + dy); g.lineTo(456, 138 + dy); g.stroke();
    g.strokeStyle = "#8a5a2e"; g.lineWidth = 10;
    g.beginPath(); g.moveTo(56, 148 + dy); g.lineTo(456, 138 + dy); g.stroke();
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
  // the GIANT tatebashi bowl — the hook prop on the low table
  const bowlFx = (x: number, y: number, z: number, w: number) => {
    out.fx.push({ key: "bowlUpright", cw: 1024, ch: 768, draw: drawBowlUpright, x, y, z, w, h: w * 0.75, soft: true });
  };
  const altarFx = (x: number, y: number, z: number, w = 4.4) => {
    out.fx.push({ key: "altarSet", cw: 1024, ch: 640, draw: drawAltarSet, x, y, z, w, h: w * 0.625, soft: true });
  };
  const passingFx = (x: number, y: number, z: number, w = 3.4) => {
    out.fx.push({ key: "passing", cw: 1024, ch: 512, draw: drawPassing, x, y, z, w, h: w / 2, soft: true });
  };
  const urnFx = (x: number, y: number, z: number, w = 1.7) => {
    out.fx.push({ key: "urn", cw: 512, ch: 512, draw: drawUrn, x, y, z, w, h: w, soft: true });
  };
  const hashiokiFx = (x: number, y: number, z: number, w = 3.6) => {
    out.fx.push({ key: "hashiokiSet", cw: 1024, ch: 512, draw: drawHashiokiSet, x, y, z, w, h: w / 2, soft: true });
  };
  const bowlPlainFx = (x: number, y: number, z: number, w = 1.8) => {
    out.fx.push({ key: "bowlPlain", cw: 512, ch: 384, draw: drawBowlPlain, x, y, z, w, h: w * 0.75, soft: true });
  };
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = -0.15, extra: Partial<FrontOpts> = {}, scale = 1.5) =>
    out.places.push(stand(HERO, x, y, z, expr, look, extra, scale));
  const friendAt = (x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}) =>
    out.places.push(stand(FRIEND, x, 0, z, expr, 0.1, extra, 1.5));

  if (id === 1) {
    // THE COVER (frame 0) — UJI 1 DETIK: the GIANT BOWL with
    // chopsticks standing UPRIGHT in the rice, incense-smoke
    // steam curling, the altar glowing behind — the anomaly
    // reads in one second with NO text and NO VO: that bowl is
    // dressed exactly like an offering for the dead. The hero
    // shocked BESIDE it near the camera axis, his friend
    // already horrified on the other side, the claim GIANT.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "shock", -0.15, { wave: 0.7 });
    friendAt(FRIEND_SPOT[0], FRIEND_SPOT[2], "nervous", { wave: 0.4 });
    bowlFx(0, 1.5, -5.0, 3.8);
    altarFx(0, 2.1, -11.5, 4.6);
    card("cardHook", ["BUAT ORANG", "MATI!"], 0, 2.6, -8, 5.0, 0.52);
  } else if (id === 2) {
    // THE NAME: the whole dining corner — low table, the
    // tatebashi bowl on it, the altar behind with its portrait
    // and candles. The friend points the meaning out.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "nervous", 0);
    friendAt(FRIEND_SPOT[0], FRIEND_SPOT[2], "stern", { wave: 0.5 });
    bowlFx(0, 1.35, -5.6, 2.7);
    altarFx(0, 2.1, -11.5, 4.6);
    bowlPlainFx(-1.9, 1.15, -4.6, 1.5);
    card("cardName", ["TATEBASHI"], 0, 3.0, -10, 4.2, 0.5);
  } else if (id === 3) {
    // THE COMPARISON: close on the bowl, the altar's incense
    // sticks standing in their burner right behind it — the
    // two silhouettes are the same shape. The friend leans in
    // from the left, the bowl stays centre-axis.
    friendAt(FRIEND_SPOT[0], FRIEND_SPOT[2], "nervous");
    bowlFx(0.3, 1.55, -4.6, 4.3);
    altarFx(1.6, 2.2, -10.5, 3.8);
    card("cardDupa", ["PERSIS", "DUPA"], 0, 2.6, -4.5, 4.2, 0.5);
  } else if (id === 4) {
    // THE RE-HOOK (new fact): the hero, mid-meal, passes a
    // morsel chopstick-to-chopstick. The passing pair floats
    // IN FRONT of the actors' line (z -3.0 vs actors -3.4) so
    // no body hides it (Lempar HP v3 depth lesson). The
    // friend throws both hands up — stop!
    heroAt(1.5, 0, -3.4, "nervous", -0.15, {});
    friendAt(-0.7, -3.4, "shock", { wave: 1.0 });
    passingFx(0.2, 1.55, -3.0, 3.5);
    card("cardOper", ["JANGAN", "DIOPER"], 0, 2.6, -8, 4.0, 0.5);
  } else if (id === 5) {
    // THE RITUAL ITSELF: the kotsuage urn in front-right
    // (z -3.1, in front of the actors at -3.5), the passing
    // gesture echoed smaller behind-left. The friend explains,
    // stern; the hero goes pale.
    heroAt(1.5, 0, -3.5, "nervous", -0.15, {});
    friendAt(-0.8, -3.5, "stern", { wave: 0.5 });
    urnFx(0.85, 1.05, -3.1, 1.7);
    card("cardTulang", ["RITUAL", "TULANG"], 0, 2.6, -8, 4.6, 0.5);
  } else if (id === 6) {
    // THE FIX: chopsticks lying flat on the hashioki rest,
    // the set piece IN FRONT of the actors (z -3.0 vs -3.4).
    // Both grin — table manners saved.
    heroAt(1.5, 0, -3.4, "grin", -0.15, { wave: 0.5 });
    friendAt(-0.8, -3.4, "grin", { wave: 0.5 });
    hashiokiFx(0.1, 1.15, -3.0, 3.7);
    card("cardRebah", ["TARUH", "REBAH"], 0, 2.6, -8, 4.6, 0.5);
  } else if (id === 7) {
    // THE PUNCHLINE LOOP: back on the cover framing in golden
    // light — the bowl still stands there dressed for the
    // dead, the hero laughs nervously, the friend laughs.
    // Loop to frame 0.
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "laugh", -0.15, { wave: 0.7 });
    friendAt(FRIEND_SPOT[0], FRIEND_SPOT[2], "laugh", { wave: 0.8 });
    bowlFx(0, 1.5, -5.0, 3.8);
    altarFx(0, 2.1, -11.5, 4.6);
    card("cardPunch", ["BUAT ORANG", "MATI!"], 0, 2.6, -8, 5.0, 0.52);
  }
  return out;
};
export { FPS };
