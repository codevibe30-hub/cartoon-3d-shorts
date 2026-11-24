// The cast of the Komodo short as lit flat sprites in the 3D
// world: the series hero narrator (teal shirt, cream cap), the
// giant female Komodo dragon (Flora) drawn as a wide low sprite,
// her seven baby dragons, a lab-coat scientist with a glowing
// DNA helix, eggs, giant Z/W chromosome letters, and the giant
// claim card. Same pool + card machinery as the house style: one
// canvas per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as an
// ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always sits
// in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, FLORA_SPOT, NEST, dragonWalkAt } from "./story";
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
// Wide low plane for the dragon sprite: design space 1500x500,
// feet at design y=500 sit on the ground.
export const KOMODO_GEO = (() => { const g = new THREE.PlaneGeometry(1500 * SU, 500 * SU); g.translate(0, (500 - 250) * SU, 0); return g; })();
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing" | "komodo"; roll?: number; pitch?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; dir?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
// Dragon design space is 1500x500 (wide + low): same distance tiers, wider canvas.
const komodoTier = (d: number): [number, number, number] =>
  d < 3.2 ? [4500, 1500, 3.0] : d < 6.5 ? [2700, 900, 1.8] : d < 16 ? [1200, 400, 0.8] : [600, 200, 0.4];

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
  g.save();
  g.shadowColor = "rgba(24,14,0,0.55)"; g.shadowBlur = 22; g.shadowOffsetX = 7; g.shadowOffsetY = 13;
  rr(bx, by, bw, bh, br); g.fillStyle = bg; g.fill();
  g.restore();
  const grad = g.createLinearGradient(bx, by, bx + bw * 0.35, by + bh);
  grad.addColorStop(0, "#ffdf52"); grad.addColorStop(0.45, "#f6c21c"); grad.addColorStop(1, "#eda30c");
  rr(bx, by, bw, bh, br); g.fillStyle = grad; g.fill();
  const rs = rng(77);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${rs() > 0.5 ? "255,246,200" : "120,70,0"},${0.03 + rs() * 0.05})`;
    g.fillRect(bx + rs() * bw, by + rs() * bh, 2.4, 2.4);
  }
  g.save(); rr(bx, by, bw, bh, br); g.clip();
  const sheen = g.createLinearGradient(0, by, 0, by + bh * 0.62);
  sheen.addColorStop(0, "rgba(255,255,255,0.42)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.fillRect(bx, by, bw, bh * 0.62);
  const gloss = g.createLinearGradient(bx, by, bx + bw, by + bh);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)"); gloss.addColorStop(0.35, "rgba(255,255,255,0)"); gloss.addColorStop(1, "rgba(120,60,0,0.10)");
  g.fillStyle = gloss; g.fillRect(bx, by, bw, bh);
  g.restore();
  rr(bx, by, bw, bh, br); g.lineWidth = 13; g.strokeStyle = INK; g.stroke();
  rr(bx + 13, by + 13, bw - 26, bh - 26, br - 11); g.lineWidth = 3; g.strokeStyle = "rgba(122,72,0,0.65)"; g.stroke();
  for (const [rx, ry] of [[bx + 30, by + 30], [bx + bw - 30, by + 30], [bx + 30, by + bh - 30], [bx + bw - 30, by + bh - 30]]) {
    g.fillStyle = "#3a2a10"; g.beginPath(); g.arc(rx, ry, 6.5, 0, 7); g.fill();
    g.fillStyle = "rgba(255,240,200,0.85)"; g.beginPath(); g.arc(rx - 2, ry - 2, 2.2, 0, 7); g.fill();
  }
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "komodoHero" };
// SCIENTIST: lab coat, dark hair — the DNA tester.
const SCIENTIST: Who = { i: 63, o: { jacket: "#f2f0e6", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#2a2018" }, okey: "komodoScientist" };

// ---------------- the Komodo dragon (drawn, never pasted) ----------------
// Side profile on a 1500x500 design canvas, head LEFT, tail RIGHT.
// Grey-brown scaled hide, pale belly, dark back spikes, forked
// tongue that flicks (tongueStep in the key so the canvas redraws).
// The drawing MUST read as a monitor lizard at a glance: long low
// body, heavy tail, blunt snout, four clawed legs — never a snake,
// never a crocodile.
export type DragonOpts = { baby?: boolean; tongue?: number; walk?: number };
export const drawKomodo = (o: DragonOpts = {}) => (p: Pen) => {
  const g = p.g;
  const body = o.baby ? "#8f8468" : "#7d7264";
  const dark = o.baby ? "#6a6046" : "#5f564a";
  const belly = o.baby ? "#c2b48f" : "#a89a83";
  const speck = o.baby ? "#d8c88f" : "#c9a86a";
  const w = o.walk ?? 0; // -1..1 leg swing phase
  // TAIL: long taper from the body to a drooping point (drawn first, behind the body)
  p.poly([[1010, 298], [1150, 266], [1320, 268], [1430, 292], [1420, 318], [1300, 336], [1150, 344], [1010, 330]], body, 10);
  p.line([[1060, 302], [1400, 305]], dark, 6, false);
  // BODY: big low ellipse, belly lighter below
  p.ell(660, 300, 390, 132, body, 12);
  p.ell(660, 348, 330, 78, belly, 8);
  // back spikes: a row of small dark triangles along the spine
  for (let i = 0; i < 9; i++) {
    const x = 360 + i * 68;
    p.poly([[x, 178], [x + 26, 178], [x + 13, 148]], dark, 6);
  }
  // speckles across the hide
  const rs = rng(41);
  for (let i = 0; i < 90; i++) {
    const x = 300 + rs() * 720, y = 210 + rs() * 170;
    g.fillStyle = `rgba(201,168,106,${0.25 + rs() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, 4 + rs() * 7, 2.5 + rs() * 4, rs() * 3, 0, 7); g.fill();
  }
  // NECK + HEAD: blunt snout, jaw line, eye, nostril (head kept BIG — it must read as a lizard's head, not a bump)
  p.poly([[340, 262], [305, 205], [245, 172], [150, 168], [88, 196], [76, 232], [116, 260], [200, 286], [295, 292]], body, 12);
  p.line([[86, 234], [285, 270]], dark, 5, false); // jaw
  p.dot(205, 210, 14); // eye
  g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(199, 204, 4, 0, 7); g.fill(); // eye glint
  p.dot(105, 204, 5, dark); // nostril
  // forked tongue: flicks in and out with tongueStep
  const tl = o.tongue === 0 ? 0 : 34 + (o.tongue ?? 0) * 8;
  if (tl > 4) {
    p.line([[82, 236], [82 - tl, 236]], "#d43a4a", 9, false);
    p.line([[82 - tl, 236], [82 - tl - 16, 224]], "#d43a4a", 6, false);
    p.line([[82 - tl, 236], [82 - tl - 16, 248]], "#d43a4a", 6, false);
  }
  // LEGS: four thick clawed legs; near legs darker-edged, far legs darker fill
  const leg = (x: number, far: boolean, swing: number) => {
    const col = far ? dark : body;
    const dx = swing * 14;
    p.poly([[x - 34 + dx, 380], [x + 34 + dx, 380], [x + 30 + dx, 478], [x - 30 + dx, 478]], col, 10);
    for (const cx of [x - 22 + dx, x + dx, x + 22 + dx]) {
      p.poly([[cx - 7, 478], [cx + 7, 478], [cx, 494]], "#d8cbb0", 4);
    }
  };
  leg(990, true, -w); leg(430, true, w);
  leg(950, false, w); leg(390, false, -w);
};
/** One egg: cream ellipse with speckles (256x192 canvas). */
export const drawEgg = (p: Pen) => {
  const g = p.g;
  p.ell(128, 100, 62, 80, "#f2ead6", 10);
  const rs = rng(7);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(150,120,80,${0.2 + rs() * 0.3})`;
    g.beginPath(); g.arc(80 + rs() * 96, 40 + rs() * 120, 2 + rs() * 3, 0, 7); g.fill();
  }
};
/** A cracked egg with a baby dragon's head poking out (256x192). */
export const drawEggCracked = (p: Pen) => {
  const g = p.g;
  p.ell(128, 112, 62, 68, "#f2ead6", 10);
  g.fillStyle = "#241726";
  g.beginPath();
  g.moveTo(70, 92); g.lineTo(100, 72); g.lineTo(128, 90); g.lineTo(156, 70); g.lineTo(186, 92); g.lineTo(186, 112); g.lineTo(70, 112); g.closePath(); g.fill();
  // baby head: grey-brown snout + eye + tiny tongue
  p.poly([[104, 78], [128, 52], [152, 78], [146, 96], [110, 96]], "#8f8468", 8);
  p.dot(118, 70, 6); p.dot(138, 70, 6);
  p.line([[128, 92], [128, 108]], "#d43a4a", 5, false);
};
/** A failed egg: dark, dull, cracked flat (256x192). */
export const drawEggDead = (p: Pen) => {
  const g = p.g;
  p.ell(128, 104, 62, 76, "#8a7d6e", 10);
  g.strokeStyle = "#241726"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(84, 60); g.lineTo(112, 92); g.lineTo(96, 120); g.lineTo(140, 100); g.lineTo(168, 140); g.stroke();
};
/** Glowing DNA helix (512x512 canvas): two sine strands + rungs. */
export const drawDNA = (p: Pen) => {
  const g = p.g;
  g.save(); g.shadowColor = "rgba(58,123,213,0.9)"; g.shadowBlur = 18;
  for (const [col, ph] of [["#3a7bd5", 0], ["#2ec4b6", Math.PI]] as [string, number][]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const y = 30 + (i / 40) * 452;
      pts.push([256 + Math.sin((i / 40) * Math.PI * 3 + ph) * 130, y]);
    }
    p.line(pts, col, 16, false);
  }
  for (let i = 0; i <= 12; i++) {
    const y = 40 + i * 36, a = (i / 12) * Math.PI * 3;
    const x1 = 256 + Math.sin(a) * 130, x2 = 256 + Math.sin(a + Math.PI) * 130;
    p.line([[x1, y], [x2, y]], "#e8f0ff", 7, false);
  }
  g.restore();
};
/** Giant chromosome letter on a glossy board (512x512 canvas). */
export const drawChrom = (letter: string, col: string) => (p: Pen) => {
  const g = p.g;
  const grad = g.createLinearGradient(60, 60, 452, 452);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.5, col); grad.addColorStop(1, "#5a4a8a");
  g.beginPath(); g.roundRect(56, 56, 400, 400, 60); g.fillStyle = grad; g.fill();
  g.lineWidth = 14; g.strokeStyle = INK; g.stroke();
  g.save(); g.beginPath(); g.roundRect(56, 56, 400, 400, 60); g.clip();
  const sheen = g.createLinearGradient(0, 56, 0, 280);
  sheen.addColorStop(0, "rgba(255,255,255,0.5)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.fillRect(56, 56, 400, 224);
  g.restore();
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 300px 'Arial Black', Arial, sans-serif";
  g.shadowColor = "rgba(40,20,60,0.5)"; g.shadowBlur = 0; g.shadowOffsetY = 8;
  g.fillText(letter, 256, 268);
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
  // the giant dragon as a wide sprite: scale 0.93 = 3 m long, head LEFT
  // (cover shots use a bigger 1.3 scale so she reads GIANT behind the hero)
  const dragon = (x: number, z: number, scale = 0.93, mirror = false, walk = 0, baby = false, y = 0) => {
    const d = cam.pos.distanceTo(tmp.set(x, 0.5, z)) / scale;
    const [w, h, k] = komodoTier(d);
    const tongue = Math.round((Math.sin(t * 2.2 + x) + 1) * 2); // 0..4, tongue flick
    const key = `K|${baby ? "b" : "a"}|t${tongue}|w${q(walk, 8)}|${q(x, 8)}|${q(z, 8)}`;
    out.places.push({
      key, x, y, z, scale, mirror, geo: "komodo", size: [w, h, k],
      draw: drawKomodo({ baby, tongue, walk }),
    });
    blob(out, x, 0, z, 3.4 * scale, 4.2 * scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, x: number, z: number, look = -0.15, scale = 1.5) =>
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big in the near
    // foreground — behind him the giant female dragon, sea + hills
    // stacked behind, and the claim as one GIANT board.
    heroAt("shock", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    dragon(FLORA_SPOT[0], FLORA_SPOT[2], 1.3, false, 0);
    card("cardHook", ["TANPA", "JANTAN?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE SCALE: high wide — the giant dragon crosses the savanna
    // while the hero stands small at the side, the joke being the
    // size difference (3 metres of lizard)
    const dw = dragonWalkAt(2, t);
    dragon(dw.x, dw.z, 0.93, false, Math.sin(t * 2.4));
    out.places.push(stand(HERO, 6, 0, 4, "grin", -0.3, {}, 1.0)); blob(out, 6, 0, 4);
    card("cardScale", ["3 METER!"], 0, 2, -12, 4.2, 0.5);
  } else if (id === 3) {
    // THE PAIR: male + female side by side — this is how it
    // normally works, before the twist
    dragon(0.5, -4, 0.93, true);
    dragon(4.2, -6, 0.9, false);
    out.places.push(stand(HERO, -3, 0, 2, "grin", 0.25, {}, 1.1)); blob(out, -3, 0, 2);
    card("cardPair", ["KAWIN DULU!"], 2.5, 2, -5, 3.4, 0.5);
  } else if (id === 4) {
    // FLORA 2006: alone in the zoo enclosure, nest + eggs beside
    // her — no male anywhere in the frame, that is the point
    dragon(5.6, -4.8, 0.93, false);
    for (let i = 0; i < 4; i++) {
      const ex = NEST[0] - 0.7 + (i % 2) * 1.4, ez = NEST[2] - 0.5 + Math.floor(i / 2) * 1.0;
      out.fx.push({ key: `egg${i}`, cw: 256, ch: 192, draw: drawEgg, x: ex, y: 0.35, z: ez, w: 0.55, h: 0.41 });
    }
    card("cardFlora", ["FLORA 2006!"], 6.5, 2, -8, 3.4, 0.5);
  } else if (id === 5) {
    // SEVEN BOYS: the nest hatches — seven babies among cracked
    // eggs, all of them male (front side of the mound + two ON it,
    // so the camera sees them over the dome)
    const babies: [number, number, boolean, number][] = [
      [6.6, -7.6, false, 0], [7.4, -8.2, true, 0], [8.0, -7.4, false, 0], [8.8, -8.0, true, 0],
      [9.4, -7.6, false, 0], [7.6, -8.9, false, 0.28], [8.8, -9.1, true, 0.28],
    ];
    for (const [bx, bz, mir, by] of babies) dragon(bx, bz, 0.26, mir, 0, true, by);
    out.fx.push({ key: "eggC1", cw: 256, ch: 192, draw: drawEggCracked, x: 7.6, y: 0.35, z: -8.2, w: 0.55, h: 0.41 });
    out.fx.push({ key: "eggC2", cw: 256, ch: 192, draw: drawEggCracked, x: 8.8, y: 0.35, z: -8.4, w: 0.55, h: 0.41 });
    out.places.push(stand(HERO, 4.5, 0, -4, "shock", 0.2, {}, 1.0)); blob(out, 4.5, 0, -4);
    card("cardSeven", ["7 JANTAN!"], NEST[0], 1.5, NEST[2], 3.0, 0.5);
  } else if (id === 6) {
    // THE DNA TEST: a scientist holds up a glowing helix — the
    // babies carry only their mother's genes, no father at all
    out.places.push(stand(SCIENTIST, 2.5, 0, 0, "grin", -0.2, {}, 1.15)); blob(out, 2.5, 0, 0);
    out.fx.push({ key: "dna", cw: 512, ch: 512, draw: drawDNA, x: 2.5, y: 2.6, z: -1.2, w: 1.7, h: 1.7, soft: true });
    out.fx.push({ key: "noteA", cw: 256, ch: 256, draw: (p) => fxNote(p, 0, "#2c4a6a"), x: 4.2, y: 2.6, z: -0.6, w: 0.5, h: 0.5, soft: true });
    out.places.push(stand(HERO, -0.5, 0, 3, "shock", 0.3, {}, 1.1)); blob(out, -0.5, 0, 3);
    card("cardDNA", ["TES DNA!"], 2.5, 2.5, 0, 3.6, 0.46);
  } else if (id === 7) {
    // ZW: the giant letters — female is ZW, and the egg doubles
    // her own chromosomes
    out.fx.push({ key: "chromZ", cw: 512, ch: 512, draw: drawChrom("Z", "#3a7bd5"), x: -2.4, y: 2.4, z: -8, w: 2.6, h: 2.6 });
    out.fx.push({ key: "chromW", cw: 512, ch: 512, draw: drawChrom("W", "#e86a9a"), x: 2.4, y: 2.4, z: -8, w: 2.6, h: 2.6 });
    out.places.push(stand(HERO, 0, 0, 2, "grin", 0, {}, 1.2)); blob(out, 0, 0, 2);
    card("cardZW", ["KROMOSOM ZW!"], 0, 2.5, -8, 4.0, 0.5);
  } else if (id === 8) {
    // ZZ vs WW: one egg hatches a boy (ZZ), the other fails (WW)
    out.fx.push({ key: "eggZZ", cw: 256, ch: 192, draw: drawEggCracked, x: 7.2, y: 0.35, z: -8.5, w: 0.6, h: 0.45 });
    out.fx.push({ key: "eggWW", cw: 256, ch: 192, draw: drawEggDead, x: 9.6, y: 0.35, z: -8.2, w: 0.6, h: 0.45 });
    dragon(7.2, -7.6, 0.26, false, 0, true);
    out.places.push(stand(HERO, 3.5, 0, -5, "nervous", 0.2, {}, 1.0)); blob(out, 3.5, 0, -5);
    card("cardZZ", ["CUMA JANTAN!"], NEST[0], 1.5, NEST[2], 3.2, 0.46);
  } else if (id === 9) {
    // THE NEW COLONY: one lone female on a new island's beach,
    // her boys around her — a colony started by a single dragon
    dragon(-2.2, -34, 0.93, false);
    const babies: [number, number, boolean][] = [
      [-3.2, -32.4, true], [1.2, -32.8, false], [2.6, -34.6, true], [-0.4, -36.2, false],
    ];
    for (const [bx, bz, mir] of babies) dragon(bx, bz, 0.26, mir, 0, true);
    out.places.push(stand(HERO, -1.8, 0, -30, "grin", 0.2, {}, 1.0)); blob(out, -1.8, 0, -30);
    card("cardColony", ["KOLONI SENDIRI!"], 0, 2, -38, 4.5, 0.55);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // savanna, same claim, but the hero is laughing now, with
    // the dragon family around him. Loop to frame 0.
    heroAt("laugh", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    dragon(FLORA_SPOT[0], FLORA_SPOT[2], 1.3, false, 0);
    dragon(-2.6, 4.5, 0.26, false, 0, true);
    dragon(2.8, 5.2, 0.26, true, 0, true);
    card("cardHook2", ["TANPA", "JANTAN?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };
