// The cast of the Karapan Sapi short as lit flat sprites in the
// 3D world: the series hero narrator (teal shirt, cream cap) as
// the jockey standing SHOCKED on the kaleles behind his pair of
// bulls, festival crowds along the fences, handlers pampering
// the bulls at the paddock, and the giant claim card. Same pool
// + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft
// contact blobs. The claim card floats as an ink-outlined board
// via drawCardFit (auto-fit: text NEVER overflows the board),
// glued to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_TEAM, PADDOCK, FINISH_Z, heroTeamAt } from "./story";
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
// HERO: the narrator — teal shirt, cream cap (series continuity),
// here riding as the jockey (tukang tongko') on the kaleles.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "karapanHero" };
// HANDLERS + CROWD: Madura festival colours, red-white stripes
// nodding to the classic Madurese shirt.
const HANDLER_A: Who = { i: 61, o: { jacket: "#d8402e", pants: "#2e2a26", boots: "#5a3b2a", hat: "cap", cap: "#26221e" }, okey: "karapanHandlerA" };
const HANDLER_B: Who = { i: 62, o: { jacket: "#f2ede2", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "karapanHandlerB" };
const CROWD: Who[] = [
  { i: 71, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "karapanCrowd1" },
  { i: 72, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "karapanCrowd2" },
  { i: 73, o: { jacket: "#2e7a4a", pants: "#2e2a26", boots: "#5a3b2a", hat: "cap", cap: "#d8402e" }, okey: "karapanCrowd3" },
  { i: 74, o: { jacket: "#e8c832", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#241a12" }, okey: "karapanCrowd4" },
  { i: 75, o: { jacket: "#3a6ac9", pants: "#2e2a26", boots: "#c99067", hat: "cap", cap: "#f2ede2", skin: "#c99067" }, okey: "karapanCrowd5" },
  { i: 76, o: { jacket: "#d86a9a", dress: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1d1410" }, okey: "karapanCrowd6" },
];

// ---------------- episode props (drawn, never pasted) ----------------
/** The Rp100 coin (512x512): gold disc, milled rim, a tiny bull
 *  team at full gallop over the big denomination — the twist
 *  visual: this race used to live on pocket change. */
export const drawCoin = (p: Pen) => {
  const g = p.g;
  g.save();
  g.shadowColor = "rgba(60,35,0,0.5)"; g.shadowBlur = 18; g.shadowOffsetY = 10;
  p.ell(256, 256, 238, 238, "#c9962e", 0);
  g.restore();
  p.ell(256, 256, 238, 238, "rgba(0,0,0,0)", 10);
  p.ell(256, 256, 208, 208, "#e9bc4a", 0);
  p.ell(256, 256, 208, 208, "rgba(0,0,0,0)", 5);
  // milled rim ticks
  g.strokeStyle = "rgba(122,84,10,0.55)"; g.lineWidth = 7;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * 216, 256 + Math.sin(a) * 216);
    g.lineTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232);
    g.stroke();
  }
  // sunlit sheen
  const sheen = g.createLinearGradient(60, 40, 420, 460);
  sheen.addColorStop(0, "rgba(255,252,220,0.5)"); sheen.addColorStop(0.4, "rgba(255,252,220,0)");
  sheen.addColorStop(1, "rgba(120,70,0,0.18)");
  p.ell(256, 256, 206, 206, "#e9bc4a", 0);
  g.fillStyle = sheen; g.beginPath(); g.arc(256, 256, 206, 0, 7); g.fill();
  // the galloping pair + jockey silhouette, stamped in relief
  g.fillStyle = "#8a5f14"; g.strokeStyle = "#8a5f14"; g.lineCap = "round";
  const bull = (cx: number, cy: number, s: number) => {
    g.beginPath(); g.ellipse(cx, cy, 44 * s, 17 * s, 0, 0, 7); g.fill();           // body
    g.beginPath(); g.ellipse(cx - 52 * s, cy - 8 * s, 15 * s, 11 * s, -0.4, 0, 7); g.fill(); // head
    g.lineWidth = 6 * s;                                                            // legs at gallop
    for (const [lx, ly] of [[-30, 22], [-8, 26], [18, 26], [36, 20]] as [number, number][]) {
      g.beginPath(); g.moveTo(cx + lx * s, cy + 10 * s); g.lineTo(cx + (lx - 10) * s, cy + ly * s); g.stroke();
    }
    g.lineWidth = 5 * s;                                                            // tail up
    g.beginPath(); g.moveTo(cx + 44 * s, cy - 6 * s); g.quadraticCurveTo(cx + 58 * s, cy - 22 * s, cx + 52 * s, cy - 34 * s); g.stroke();
  };
  bull(196, 168, 0.92); bull(316, 168, 0.92);
  g.lineWidth = 6; g.beginPath(); g.moveTo(196, 150); g.lineTo(316, 150); g.stroke(); // yoke
  g.beginPath(); g.moveTo(226, 152); g.lineTo(252, 196); g.moveTo(286, 152); g.lineTo(260, 196); g.stroke(); // rails
  p.dot(256, 208, 9);                                                                  // jockey head
  g.lineWidth = 7; g.beginPath(); g.moveTo(256, 214); g.lineTo(256, 238); g.stroke();   // jockey body
  g.fillStyle = "#7a520e"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  g.fillText("100", 256, 330);
  g.font = "900 40px 'Arial Black', Arial, sans-serif";
  g.fillText("RUPIAH", 256, 402);
};
/** A champion's trophy cup (256x320): gold cup, two handles,
 *  a star stamped on the bowl, wooden base. */
export const drawTrophy = (p: Pen) => {
  const g = p.g;
  p.poly([[78, 44], [178, 44], [172, 130], [84, 130]], "#e9bc4a", 6);
  p.poly([[78, 52], [178, 52], [174, 92], [82, 92]], "#f6d878", 0);
  p.poly([[84, 130], [172, 130], [146, 168], [110, 168]], "#c9962e", 5);
  p.poly([[118, 168], [138, 168], [138, 196], [118, 196]], "#8a5f14", 4);
  p.poly([[82, 196], [174, 196], [174, 224], [82, 224]], "#6a4a2c", 5);
  p.poly([[88, 202], [168, 202], [168, 218], [88, 218]], "#54381e", 0);
  // handles
  g.strokeStyle = "#c9962e"; g.lineWidth = 11;
  g.beginPath(); g.arc(66, 84, 24, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.arc(190, 84, 24, Math.PI * 1.5, Math.PI * 0.5); g.stroke();
  // star stamp
  g.fillStyle = "#8a5f14";
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 9 : 21;
    const x = 128 + Math.cos(a) * rad, y = 92 + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
};
/** A basket of eggs (256x192): woven basket, a mound of pale
 *  eggs — the athletes' breakfast, 80 a day. */
export const drawEggs = (p: Pen) => {
  const g = p.g;
  for (const [x, y] of [[70, 74], [110, 62], [150, 62], [186, 74], [90, 92], [128, 88], [166, 92]] as [number, number][]) {
    p.ell(x, y, 21, 26, "#f4e8d2", 4);
    p.ell(x - 6, y - 8, 6, 8, "#fffaf0", 0);
  }
  p.poly([[38, 96], [218, 96], [200, 168], [56, 168]], "#a8742e", 6);
  g.strokeStyle = "rgba(70,42,8,0.6)"; g.lineWidth = 4;
  for (const y of [116, 136, 154]) { g.beginPath(); g.moveTo(44, y); g.lineTo(212, y - 2); g.stroke(); }
  for (const x of [84, 128, 172]) { g.beginPath(); g.moveTo(x, 98); g.lineTo(x - 4, 166); g.stroke(); }
  p.poly([[30, 88], [226, 88], [226, 102], [30, 102]], "#7c5220", 4);
};
/** A winner's garland (384x256): a ring of marigolds and red
 *  blooms with ribbon tails — hung on the champion bulls. */
export const drawGarland = (p: Pen) => {
  const g = p.g;
  g.strokeStyle = "#2e7a32"; g.lineWidth = 10;
  g.beginPath(); g.ellipse(192, 118, 118, 82, 0, 0, 7); g.stroke();
  const cols = ["#f2a81c", "#e8542e", "#f6d878", "#d8402e", "#f2a81c", "#e86a9a"];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = 192 + Math.cos(a) * 118, y = 118 + Math.sin(a) * 82;
    p.dot(x, y, 15, cols[i % cols.length]);
    p.dot(x, y, 6, "#fff3c8");
  }
  p.poly([[176, 196], [192, 196], [186, 248], [172, 248]], "#d8402e", 3);
  p.poly([[192, 196], [208, 196], [214, 248], [200, 248]], "#f2c018", 3);
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
  // the hero on the kaleles, riding the sled's exact bob (the
  // platform height + the team's gallop bounce live in world.ts;
  // the base heights here mirror makeTeam's platform top)
  const heroRiding = (expr: Expr, look = -0.15, scale = 1.5) => {
    const tp = heroTeamAt(id, t);
    const gallop = tp.mode === "race" ? Math.abs(Math.sin(t * 11)) * 0.09 : 0;
    const y = 0.62 + Math.sin(t * 2.2) * 0.015 + gallop;
    out.places.push(stand(HERO, tp.x, y, tp.z + 2.62, expr, look, {}, scale));
    blob(out, tp.x, 0.02, tp.z + 2.6, 1.1);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // the festival crowd along both fences: waving, bobbing,
  // never frozen (STANDAR GERAK) — thinned per shot distance
  const crowd = (step = 3.4, zFrom = 15, zTo = -42) => {
    let n = 0;
    for (let z = zFrom; z > zTo; z -= step) {
      for (const sd of [1, -1]) {
        if ((n + (sd > 0 ? 0 : 1)) % 2 === 1 && id === 4) continue; // close shot: halve the crowd
        const who = CROWD[Math.abs(Math.round(z * 7 + (sd > 0 ? 3 : 0))) % CROWD.length];
        const x = sd * (7.7 + hh(n, 4) * 0.9);
        const bobY = 0.02 + Math.abs(Math.sin(t * 2.6 + n * 1.7)) * 0.05;
        out.places.push(person(cam, who, x, bobY, z + hh(n, 8) * 1.2,
          { mode: "stand", expr: n % 3 === 0 ? "laugh" : "grin", blink: lidAt(t, who.i + n), look: sd > 0 ? -0.3 : 0.3, wave: n % 2 === 0 ? 1 : 0 }, 0.98));
        n++;
      }
    }
  };

  if (id === 1) {
    // THE COVER (frame 0): the bulls pawing at the start line,
    // the hero's SHOCK face big on the kaleles behind them, the
    // claim as one GIANT board over the festival skyline
    heroRiding("shock", -0.15);
    crowd();
    card("cardHook", ["SAPI BALAP", "40 KM/JAM!"], HERO_TEAM[0], 3.5, HERO_TEAM[2], 5.2, 0.52);
  } else if (id === 2) {
    // THE NAME: high wide over the whole arena — both teams at
    // the start, crowds, tents, flags, the finish far away
    heroRiding("grin", 0, 1.3);
    crowd(4.2);
    card("cardName", ["KARAPAN", "SAPI"], 0, 2, -20, 5.0, 0.5);
  } else if (id === 3) {
    // THE RACE: the hero hangs on for dear life as the pair
    // gallops — grin through gritted teeth, crowd a blur of arms
    heroRiding("nervous", 0.1, 1.45);
    crowd(3.0);
    const tp = heroTeamAt(3, t);
    card("card200", ["200", "METER!"], tp.x, 2.5, tp.z, 3.4, 0.48);
  } else if (id === 4) {
    // THE JOCKEY: close on the kaleles — standing, knees bent,
    // reins in hand, dead serious about not falling off
    heroRiding("stern", -0.2, 1.6);
    crowd();
    card("cardStand", ["JOKI", "BERDIRI!"], HERO_TEAM[0], 2.5, HERO_TEAM[2], 3.6, 0.48);
  } else if (id === 5) {
    // THE FLYING SLED (the mid-video re-hook): the team screams
    // past the low camera and the little platform hangs in the
    // air behind the bulls — the hero's face says it all
    heroRiding("shock", 0, 1.45);
    crowd(3.0);
    const tp = heroTeamAt(5, t);
    card("cardFly", ["PAPANNYA", "MELAYANG!"], tp.x, 2.5, tp.z, 3.2, 0.5);
  } else if (id === 6) {
    // THE PAMPERING: at the team tent the athletes get their
    // massage — one handler rubs a shoulder, one offers eggs;
    // the hero supervises like a proud coach
    out.places.push(stand(HERO, PADDOCK[0] - 3.4, 0.02, PADDOCK[2] + 3.4, "grin", 0.3, {}, 1.1)); blob(out, PADDOCK[0] - 3.4, 0.02, PADDOCK[2] + 3.4);
    out.places.push(person(cam, HANDLER_A, PADDOCK[0] - 0.9, 0.02, PADDOCK[2] - 0.4,
      { mode: "stand", expr: "grin", blink: lidAt(t, HANDLER_A.i), look: 0.4 }, 1.05, 0.30)); blob(out, PADDOCK[0] - 0.9, 0.02, PADDOCK[2] - 0.4);
    out.places.push(person(cam, HANDLER_B, PADDOCK[0] + 1.6, 0.02, PADDOCK[2] + 1.4,
      { mode: "stand", expr: "grin", blink: lidAt(t, HANDLER_B.i), look: -0.3 }, 1.05, -0.18)); blob(out, PADDOCK[0] + 1.6, 0.02, PADDOCK[2] + 1.4);
    out.fx.push({ key: "eggs", cw: 256, ch: 192, draw: drawEggs, x: PADDOCK[0] + 0.9, y: 0.5, z: PADDOCK[2] + 2.2, w: 1.05, h: 0.79 });
    card("cardEggs", ["80 TELUR", "SEHARI!"], PADDOCK[0], 2, PADDOCK[2], 3.6, 0.48);
  } else if (id === 7) {
    // THE PRICE: garlands on the champions, the trophy up —
    // the hero beams like he just sold a sports car with horns
    out.places.push(stand(HERO, PADDOCK[0] - 2.2, 0.02, PADDOCK[2] + 2.6, "laugh", 0.2, { wave: 1 }, 1.3)); blob(out, PADDOCK[0] - 2.2, 0.02, PADDOCK[2] + 2.6);
    out.fx.push({ key: "garlandL", cw: 384, ch: 256, draw: drawGarland, x: PADDOCK[0] - 0.88, y: 1.28, z: PADDOCK[2] - 0.55, w: 1.25, h: 0.83 });
    out.fx.push({ key: "garlandR", cw: 384, ch: 256, draw: drawGarland, x: PADDOCK[0] + 0.88, y: 1.28, z: PADDOCK[2] - 0.55, w: 1.25, h: 0.83 });
    out.fx.push({ key: "trophy", cw: 256, ch: 320, draw: drawTrophy, x: PADDOCK[0] - 1.7, y: 1.15, z: PADDOCK[2] + 2.2, w: 0.85, h: 1.06 });
    card("cardPrice", ["RATUSAN", "JUTA!"], PADDOCK[0], 2.2, PADDOCK[2], 3.8, 0.5);
  } else if (id === 8) {
    // THE TWIST: close on the hero as a giant hundred-rupiah
    // coin rolls in beside him — this race was on the money
    heroRiding("shock", 0);
    const tp = heroTeamAt(8, t);
    out.fx.push({ key: "coin100", cw: 512, ch: 512, draw: drawCoin, x: tp.x + 2.6, y: 1.75, z: tp.z - 0.6, w: 2.3, h: 2.3 });
    card("cardCoin", ["DI KOIN", "100 PERAK?!"], tp.x, 2.2, tp.z, 3.6, 0.46);
  } else if (id === 9) {
    // THE FINAL: through the finish arch — the parade pair walks
    // home under the flags while the winners rest beyond it
    crowd(3.6);
    card("cardCup", ["PIALA", "PRESIDEN!"], 0, 2, FINISH_Z + 6, 4.6, 0.52);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // bulls, same claim, but the hero is laughing now
    heroRiding("laugh", -0.15);
    crowd();
    card("cardHook2", ["SAPI BALAP", "40 KM/JAM!"], HERO_TEAM[0], 3.5, HERO_TEAM[2], 5.2, 0.52);
  }
  return out;
};
export { FPS };
