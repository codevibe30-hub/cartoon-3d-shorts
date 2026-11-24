// The cast of the Trunyan short as lit flat sprites in the 3D
// world: the series hero narrator (teal shirt, cream cap), the
// adat elder in white who guards the cemetery's rules, the
// boatman who rows visitors across Lake Batur, and the giant
// claim card. Same pool + card machinery as the house style:
// one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always
// sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, TREE, CAGE_CLOSE, ALTAR, BOAT, heroSpotAt, elderSpotAt, boatAt, boatBobAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "trunyanHero" };
// ELDER: the adat guardian — all in pemangku white, white headcloth cap.
const ELDER: Who = { i: 71, o: { jacket: "#f0ead8", pants: "#4a3b2a", boots: "#5a3b2a", hat: "cap", cap: "#f8f4e8", skin: "#c99067" }, okey: "trunyanElder" };
// BOATMAN: rows the jukung across Lake Batur — orange jacket, yellow cap.
const BOATMAN: Who = { i: 61, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "trunyanBoatman" };
// VILLAGER: a Trunyan woman at the jetty — purple jacket, dark hair.
const VILLAGER_W: Who = { i: 62, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "trunyanVillagerW" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A stylised skull (256x256): cream cranium, dark eye sockets,
 *  a simple jaw — respectful cartoon shorthand for the bones on
 *  the stone altar, never graphic. */
export const drawSkull = (p: Pen) => {
  const g = p.g;
  // cranium
  g.fillStyle = "#efe6cf";
  g.beginPath(); g.ellipse(128, 108, 74, 82, 0, 0, 7); g.fill();
  g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // jaw
  g.fillStyle = "#e7dcc0";
  g.beginPath(); g.roundRect(92, 168, 72, 44, 12); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  // teeth lines
  g.lineWidth = 4;
  for (const x of [108, 128, 148]) { g.beginPath(); g.moveTo(x, 174); g.lineTo(x, 206); g.stroke(); }
  // eye sockets + nose
  g.fillStyle = "#241a10";
  g.beginPath(); g.ellipse(100, 116, 17, 21, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(156, 116, 17, 21, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(128, 140); g.lineTo(118, 162); g.lineTo(138, 162); g.closePath(); g.fill();
  // crack + moss flecks (it has rested here a long time)
  g.strokeStyle = "rgba(90,80,60,0.7)"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(150, 40); g.lineTo(142, 66); g.lineTo(152, 84); g.stroke();
  g.fillStyle = "rgba(96,138,62,0.55)";
  for (const [x, y, r] of [[84, 66, 9], [176, 84, 7], [104, 186, 6]] as [number, number, number][]) {
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // sunlit crown highlight (gloss)
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath(); g.ellipse(100, 62, 30, 16, -0.5, 0, 7); g.fill();
};
/** A fragrance wisp (256x256): pale-gold curls rising and
 *  uncurling — the taru menyan scent made visible. Drawn soft. */
export const drawWisp = (p: Pen) => {
  const g = p.g;
  g.lineCap = "round";
  const curl = (x: number, y: number, s: number, a: number) => {
    g.strokeStyle = `rgba(255,214,120,${a})`; g.lineWidth = 13 * s;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x - 34 * s, y - 44 * s, x + 40 * s, y - 74 * s, x + 4 * s, y - 112 * s);
    g.stroke();
    g.strokeStyle = `rgba(255,244,200,${a * 0.8})`; g.lineWidth = 6 * s;
    g.beginPath();
    g.moveTo(x + 3 * s, y - 4 * s);
    g.bezierCurveTo(x - 26 * s, y - 44 * s, x + 32 * s, y - 72 * s, x + 5 * s, y - 106 * s);
    g.stroke();
  };
  curl(96, 238, 1.0, 0.85);
  curl(158, 244, 0.78, 0.65);
  curl(66, 248, 0.6, 0.5);
};
/** A fragrant mote (128x128): a tiny four-point sparkle — the
 *  scent particles drifting down through the canopy light. */
export const drawSparkle = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "rgba(255,226,140,0.95)";
  g.beginPath();
  g.moveTo(64, 6); g.quadraticCurveTo(70, 52, 122, 64); g.quadraticCurveTo(70, 76, 64, 122);
  g.quadraticCurveTo(58, 76, 6, 64); g.quadraticCurveTo(58, 52, 64, 6);
  g.fill();
  g.fillStyle = "rgba(255,252,230,0.95)";
  g.beginPath(); g.arc(64, 64, 9, 0, 7); g.fill();
};
/** A canang offering (256x160): a woven palm tray with flower
 *  petals and a frangipani — the small daily offering that sits
 *  on the altar and the gate posts. */
export const drawOffering = (p: Pen) => {
  const g = p.g;
  // woven tray
  g.fillStyle = "#7fae4c";
  g.beginPath(); g.ellipse(128, 112, 104, 34, 0, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.strokeStyle = "rgba(46,84,26,0.6)"; g.lineWidth = 3;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(128 + i * 26, 84); g.lineTo(128 + i * 30, 140); g.stroke(); }
  // petals + flowers
  const cols = ["#f6a8c0", "#ffd94d", "#ffffff", "#e8862c", "#b48ce8"];
  const rr2 = rng(31);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = cols[Math.floor(rr2() * cols.length) % cols.length];
    g.beginPath(); g.ellipse(58 + rr2() * 140, 88 + rr2() * 30, 7 + rr2() * 5, 4 + rr2() * 3, rr2() * 3, 0, 7); g.fill();
  }
  // frangipani on top
  g.fillStyle = "#fffaf0";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath(); g.ellipse(128 + Math.cos(a) * 13, 82 + Math.sin(a) * 9, 11, 6.5, a, 0, 7); g.fill();
  }
  g.fillStyle = "#ffd94d"; g.beginPath(); g.arc(128, 82, 6, 0, 7); g.fill();
};
/** A carved wooden gate sign (256x320): dark plank post + board
 *  with three carved grooves — the adat rule made wood. */
export const drawGateSign = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#5a4026";
  g.beginPath(); g.roundRect(112, 150, 32, 160, 6); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  const grad = g.createLinearGradient(28, 20, 228, 150);
  grad.addColorStop(0, "#8a6136"); grad.addColorStop(1, "#6e4a26");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(28, 20, 200, 130, 12); g.fill();
  g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // carved grooves + a small red rule mark
  g.strokeStyle = "rgba(40,24,8,0.75)"; g.lineWidth = 6; g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const y = 58 + i * 30;
    g.beginPath(); g.moveTo(56, y); g.lineTo(i === 1 ? 150 : 200, y); g.stroke();
  }
  g.fillStyle = "#c03028";
  g.beginPath(); g.arc(196, 118, 13, 0, 7); g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
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
  // the hero on the ground at his per-shot spot (story.heroSpotAt)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.4, extra: Partial<FrontOpts> = {}) => {
    const hp = heroSpotAt(id, t);
    out.places.push(stand(HERO, hp.x, 0, hp.z, expr, look, extra, scale));
    blob(out, hp.x, 0, hp.z, scale);
  };
  // the elder at his per-shot spot (story.elderSpotAt)
  const elderAt = (expr: Expr, scale = 1.12) => {
    const ep = elderSpotAt(id, t);
    out.places.push(stand(ELDER, ep.x, 0, ep.z, expr, 0.15, {}, scale));
    blob(out, ep.x, 0, ep.z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // fragrant motes drifting down through the canopy light
  const motes = (cx: number, cz: number, n: number, top: number) => {
    for (let i = 0; i < n; i++) {
      const fall = ((t * 0.55 + i * 1.93) % 6.5);
      out.fx.push({ key: `mote${i % 3}`, cw: 128, ch: 128, draw: drawSparkle,
        x: cx + Math.sin(t * 0.8 + i * 2.4) * 1.6 + (i % 3 - 1) * 2.2,
        y: top - fall, z: cz + Math.cos(t * 0.6 + i * 1.7) * 1.2,
        w: 0.34, h: 0.34, soft: true });
    }
  };
  // fragrance wisps drifting from the tree out over the lake
  const wisps = (n: number) => {
    for (let i = 0; i < n; i++) {
      const u = (t * 0.045 + i / n) % 1;
      out.fx.push({ key: `wisp${i}`, cw: 256, ch: 256, draw: drawWisp,
        x: -2 + u * 9 + Math.sin(t * 0.7 + i * 2.1) * 0.8,
        y: 2.4 + u * 1.8 + Math.sin(t * 0.9 + i) * 0.3,
        z: -16 + u * 34, w: 1.0 + u * 1.2, h: 1.0 + u * 1.2, soft: true });
    }
  };

  if (id === 1) {
    // THE COVER (frame 0): the GIANT TARU MENYAN TREE and the arc
    // of bamboo cages beneath it fill the frame — the hero's SHOCK
    // face big on the path beside them, never covering the cages,
    // the claim as one GIANT board. The anomaly itself, big and
    // already moving (leaves swaying, lake rippling), from frame 0.
    heroAt("shock", -0.15, 1.45);
    out.places.push(stand(VILLAGER_W, 3.8, 0, -8, "grin", 0.2, {}, 1.0)); blob(out, 3.8, 0, -8);
    motes(0, -14, 3, 8.5);
    card("cardHook", ["NGGAK", "DIKUBUR?!"], TREE[0], 3.4, TREE[2], 4.9, 0.55);
  } else if (id === 2) {
    // THE BOAT CROSSING: the hero stands in the jukung riding its
    // bob, the boatman grinning at the stern — behind them the
    // shore, the giant tree, Mount Batur.
    const bp = boatAt(id, t);
    const by = 0.62 + boatBobAt(t);
    out.places.push(stand(HERO, bp.x - 0.4, by, bp.z - 0.6, "grin", -0.1, {}, 1.3));
    out.places.push(stand(BOATMAN, bp.x + 1.15, by, bp.z + 1.5, "grin", 0.15, {}, 1.0));
    card("cardBoat", ["CUMA NAIK", "PERAHU!"], BOAT[0], 1.8, BOAT[2], 3.6, 0.5);
  } else if (id === 3) {
    // THE ANCAK SAJI: close on the featured cage — bamboo lattice,
    // the white cloth bundle resting inside — the hero beside it.
    heroAt("grin", -0.3, 1.15);
    card("cardCage", ["ANCAK", "SAJI!"], CAGE_CLOSE[0], 1.2, CAGE_CLOSE[2], 3.3, 0.5);
  } else if (id === 4) {
    // NO SMELL AT ALL: among the cages the hero sniffs the air —
    // puzzled, then relieved. Fragrant motes drift past his nose.
    heroAt("relief_open", 0.1, 1.35, { headTilt: -0.18 });
    motes(-0.6, -12, 4, 7.5);
    card("cardSmell", ["KOK NGGAK", "BAU?!"], -0.6, 1.6, -13, 3.8, 0.5);
  } else if (id === 5) {
    // TARU MENYAN: low angle up the giant trunk — the layered
    // canopy fills the top of the frame, motes raining gently
    // through the light, wisps curling off the leaves.
    heroAt("grin", -0.1, 1.15);
    motes(0, -16, 6, 11);
    wisps(2);
    card("cardTree", ["TARU", "MENYAN!"], 0, 7.0, -20, 2.2, 0.5);
  } else if (id === 6) {
    // ONLY ELEVEN (the mid-video re-hook): the high wide — the
    // whole arc of exactly 11 cages countable under the tree.
    heroAt("shock", -0.2, 1.05);
    out.places.push(stand(VILLAGER_W, 5.6, 0, -3.5, "grin", 0.2, {}, 0.95)); blob(out, 5.6, 0, -3.5);
    card("cardEleven", ["CUMA", "11!"], 0, 2.0, -19, 4.6, 0.52);
  } else if (id === 7) {
    // THE RULE IS STRICT: the elder stands stern guard by the
    // carved gate sign, the hero nervous at his side.
    elderAt("stern");
    heroAt("nervous", 0.2, 1.3);
    out.fx.push({ key: "gateSign", cw: 256, ch: 320, draw: drawGateSign, x: -8.1, y: 1.25, z: -13.8, w: 1.15, h: 1.44, soft: true });
    card("cardStrict", ["SYARATNYA", "KETAT!"], -5.6, 1.8, -12.2, 3.8, 0.5);
  } else if (id === 8) {
    // THE OLDEST MOVES: at the mossy stone altar the elder lays a
    // skull down with care among the row — the hero watches,
    // respectful; a fresh offering sits on the altar's edge.
    elderAt("grin", 1.08);
    heroAt("grin", 0.2, 1.25);
    const ep = elderSpotAt(id, t);
    out.fx.push({ key: "skullHand", cw: 256, ch: 256, draw: drawSkull, x: ep.x + 0.62, y: 1.02, z: ep.z + 0.55, w: 0.44, h: 0.44, soft: true });
    out.fx.push({ key: "offeringAltar", cw: 256, ch: 160, draw: drawOffering, x: ALTAR[0] + 0.4, y: 1.28, z: ALTAR[2] + 0.9, w: 0.8, h: 0.5, soft: true });
    card("cardAltar", ["YANG LAMA", "PINDAH!"], ALTAR[0], 1.6, ALTAR[2], 3.8, 0.5);
  } else if (id === 9) {
    // THE LEGEND (golden): the fragrance leaves the tree and
    // drifts out across the lake toward the far island — the
    // scent a king once feared would summon enemies from Java.
    heroAt("shock", -0.1, 1.35);
    wisps(4);
    card("cardJava", ["SAMPAI KE", "JAWA?!"], -1, 4.0, -22, 3.4, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same tree,
    // same cages, same claim, but the hero is LAUGHING now: the
    // tree is the village's natural air freshener. Loop to frame 0.
    heroAt("laugh", -0.15, 1.45);
    out.places.push(stand(VILLAGER_W, 3.8, 0, -8, "grin", 0.2, { wave: 1 }, 1.0)); blob(out, 3.8, 0, -8);
    motes(0, -14, 3, 8.5);
    card("cardHook2", ["NGGAK", "DIKUBUR?!"], TREE[0], 3.4, TREE[2], 4.9, 0.55);
  }
  return out;
};
export { FPS };

