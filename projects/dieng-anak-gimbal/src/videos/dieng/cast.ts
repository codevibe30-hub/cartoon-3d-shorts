// The cast of the Dieng Anak Gimbal short as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap),
// a small kid with a HUGE mane of natural dreadlocks (drawn as a
// separate wind-swayed sprite locked to his head), his mother, an
// adat elder, and the villagers of the kirab procession. Same pool
// + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact
// blobs. The claim card floats as an ink-outlined board via
// drawCardFit (auto-fit: text NEVER overflows the board), glued to
// the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, smooth, camAt, KID_POS, HERO_POS, CANDI, LAKE, kirabAt } from "./story";
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
/** The claim board, painted RICH (anti-flat pass): deep drop
 *  shadow, diagonal amber gradient with a glossy top sheen and
 *  fine grain, double border with character, corner rivets like
 *  a real road sign, text pressed in with its own soft shadow. */
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "diengHero" };
// THE GIMBAL KID: small build, orange jacket; his dreadlocks are
// drawn as a separate wind-swayed mane sprite (drawGimbalMane).
const KID: Who = { i: 71, o: { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2e1a0e", skin: "#f5c9a0", build: "kid" }, okey: "diengKid" };
// THE ELDER: adat elder with a grey moustache, deep brown jacket.
const ELDER: Who = { i: 72, o: { jacket: "#6b4423", pants: "#33302c", boots: "#3a2a1a", hat: "hair", hair: "#cfcfcf", moustache: "#d8d8d8", skin: "#e8b98d" }, okey: "diengElder" };
// THE MOTHER: dress, dark hair.
const MUM: Who = { i: 73, o: { jacket: "#7b5ac9", dress: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "diengMum" };
// KIRAB VILLAGERS: festival walkers.
const VILLAGER_A: Who = { i: 61, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "diengVillagerA" };
const VILLAGER_B: Who = { i: 62, o: { jacket: "#3f7d4e", pants: "#33302c", boots: "#5a3b2a", hat: "hair", hair: "#241611" }, okey: "diengVillagerB" };
const VILLAGER_C: Who = { i: 63, o: { jacket: "#b03a3a", dress: "#d9a441", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "diengVillagerC" };

// ---------------- episode props (drawn, never pasted) ----------------
/** THE MANE: a huge head of natural dreadlocks on a 512x400
 *  canvas — thick rope strands rooted on a scalp cap, hanging to
 *  the shoulders and swinging with the mountain wind. `sway`
 *  (-1..1) bends every tip sideways; the drawing is quantised to
 *  a few sway steps so the pool does not redraw every frame. */
export const drawGimbalMane = (sway: number) => (p: Pen) => {
  const g = p.g;
  const cx = 256, top = 66;
  const strands: { a: number; len: number; w: number; lean: number }[] = [];
  const rs = rng(710);
  for (let i = 0; i < 17; i++) {
    const a = -1.25 + (i / 16) * 2.5; // fan angle from the crown
    strands.push({ a, len: 218 + rs() * 96, w: 21 + rs() * 9, lean: (rs() - 0.5) * 26 });
  }
  // back mass first (darker), then the front strands with light
  for (const pass of [0, 1]) {
    for (let i = 0; i < strands.length; i++) {
      const s = strands[i];
      if ((i % 2 === 0) !== (pass === 0)) continue;
      const bx = cx + Math.sin(s.a) * 58, by = top + 26 - Math.cos(s.a) * 14;
      const mx = bx + Math.sin(s.a) * s.len * 0.52 + s.lean * 0.4 + sway * 10;
      const my = by + Math.cos(s.a * 0.4) * s.len * 0.52;
      const tx = bx + Math.sin(s.a) * s.len * 0.94 + s.lean + sway * 30;
      const ty = by + s.len * 0.94;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, v = 1 - u;
        pts.push([v * v * bx + 2 * v * u * mx + u * u * tx, v * v * by + 2 * v * u * my + u * u * ty]);
      }
      const base = pass === 0 ? "#241207" : "#3d2312";
      p.line(pts, INK, s.w + 7);
      p.line(pts, base, s.w);
      // rope segments: lighter dashes along the strand
      for (let k = 1; k < 6; k++) {
        const u = k / 6, v = 1 - u;
        const x = v * v * bx + 2 * v * u * mx + u * u * tx, y = v * v * by + 2 * v * u * my + u * u * ty;
        p.line([[x - 5, y], [x + 5, y + 3]], pass === 0 ? "#4a2c14" : "#6a4220", 4);
      }
      // glossy highlight thread on the sun side
      p.line(pts.map(([x, y]) => [x - s.w * 0.22, y] as [number, number]), "rgba(214,164,96,0.5)", 3.4);
    }
  }
  // the scalp cap the strands root into
  p.ell(cx, top + 22, 74, 40, "#2e1a0e", 0);
  p.ell(cx - 16, top + 8, 40, 16, "rgba(122,76,38,0.55)", 0);
  void g;
};
/** A pair of silver scissors (256x256), blades half open. */
export const drawScissors = (p: Pen) => {
  p.line([[70, 60], [196, 168]], "#c9ccd2", 15);
  p.line([[196, 88], [74, 192]], "#dde1e6", 15);
  p.line([[70, 60], [196, 168]], "#8a929c", 4);
  p.ell(58, 52, 21, 15, null, 9);
  p.ell(60, 202, 21, 15, null, 9);
  p.dot(132, 128, 8, "#5a6068");
};
/** A big red prohibition ring + cross (256x256): NO, not like that. */
export const drawNoCross = (p: Pen) => {
  const ring: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    ring.push([128 + Math.cos(a) * 102, 128 + Math.sin(a) * 102]);
  }
  p.line(ring, "#d42f2f", 24, false);
  p.line([[64, 64], [192, 192]], "#d42f2f", 26, false);
};
/** A fever thermometer (320x128): glass tube, red column high. */
export const drawThermometer = (p: Pen) => {
  p.poly([[26, 52], [268, 52], [268, 76], [26, 76]], "#eef4f6", 5);
  p.poly([[26, 58], [238, 58], [238, 70], [26, 70]], "#d42f2f", 0);
  p.ell(284, 64, 24, 24, "#d42f2f", 5);
  for (let i = 0; i < 5; i++) p.line([[70 + i * 38, 52], [70 + i * 38, 42]], INK, 4, false);
};
/** An ice-cream cone (192x256). */
export const drawIceCream = (p: Pen) => {
  p.poly([[56, 118], [136, 118], [96, 238]], "#d9a441", 5);
  p.line([[66, 150], [118, 128]], "#b57f26", 4, false);
  p.line([[126, 150], [76, 128]], "#b57f26", 4, false);
  p.ell(96, 88, 46, 42, "#f6f0e6", 5);
  p.ell(74, 104, 26, 22, "#f6f0e6", 0);
  p.ell(118, 104, 26, 22, "#f6f0e6", 0);
  p.ell(96, 62, 30, 24, "#e86e78", 5);
  p.dot(88, 52, 4, "#d42f2f"); p.dot(106, 70, 4, "#3f7d4e"); p.dot(96, 84, 4, "#3b5b9a");
};
/** A simple kid's bicycle, side view (384x256). */
export const drawBike = (p: Pen) => {
  p.ell(84, 196, 46, 46, null, 9);
  p.ell(300, 196, 46, 46, null, 9);
  p.dot(84, 196, 8); p.dot(300, 196, 8);
  p.line([[84, 196], [168, 108], [300, 196], [196, 196], [84, 196]], "#d42f2f", 10, false);
  p.line([[168, 108], [196, 196]], "#d42f2f", 10, false);
  p.line([[168, 108], [158, 88]], INK, 8, false);
  p.line([[140, 86], [178, 86]], INK, 9, false);
  p.line([[288, 96], [300, 196]], "#d42f2f", 10, false);
  p.line([[272, 92], [306, 92]], INK, 9, false);
  p.dot(196, 196, 10, "#5a6068");
};
/** A white goat, side view (320x256). */
export const drawGoat = (p: Pen) => {
  p.poly([[96, 96], [238, 90], [246, 138], [104, 146]], "#f2ede2", 6);
  for (const [lx, ly] of [[116, 146], [140, 146], [206, 142], [228, 140]] as [number, number][]) {
    p.line([[lx, ly], [lx - 2, ly + 62]], "#e6dfd0", 11);
    p.line([[lx - 8, ly + 64], [lx + 8, ly + 64]], INK, 6, false);
  }
  p.poly([[238, 92], [286, 70], [296, 96], [262, 128], [240, 122]], "#f2ede2", 6);
  p.ell(272, 92, 7, 9, INK, 0);
  p.line([[252, 66], [240, 40]], "#d9cfb8", 8, false);
  p.line([[272, 62], [268, 34]], "#d9cfb8", 8, false);
  p.poly([[262, 116], [276, 116], [270, 142]], "#e6dfd0", 3);
  p.line([[96, 100], [72, 84]], "#e6dfd0", 9, false);
  p.ell(170, 112, 60, 26, "rgba(190,180,160,0.35)", 0);
};
/** A sesaji offering tray (256x192): woven tray, yellow rice cone, flowers. */
export const drawSesaji = (p: Pen) => {
  p.ell(128, 148, 112, 26, "#b57f26", 5);
  p.ell(128, 140, 112, 26, "#d9a441", 4);
  p.poly([[96, 138], [160, 138], [128, 62]], "#f2c018", 5);
  p.dot(128, 58, 7, "#d42f2f");
  for (const [fx, fy, fc] of [[66, 128, "#e86e78"], [190, 128, "#f6f0e6"], [86, 118, "#f6f0e6"], [170, 118, "#e86e78"], [128, 128, "#e86e78"]] as [number, number, string][]) {
    p.dot(fx, fy, 10, fc); p.dot(fx, fy, 4.5, "#f2c018");
  }
  p.line([[52, 138], [40, 104]], "#3f7d4e", 6, false);
  p.line([[204, 138], [216, 104]], "#3f7d4e", 6, false);
};
/** A small floating clump of cut dreadlocks (192x128) for the larung. */
export const drawLockClump = (p: Pen) => {
  const rs = rng(99);
  for (let i = 0; i < 9; i++) {
    const x0 = 40 + i * 14, bend = (rs() - 0.5) * 30;
    p.line([[x0, 22], [x0 + bend * 0.4, 62], [x0 + bend, 100]], INK, 13);
    p.line([[x0, 22], [x0 + bend * 0.4, 62], [x0 + bend, 100]], "#3d2312", 8);
  }
  p.ell(96, 22, 58, 15, "#2e1a0e", 0);
};
/** Concentric ripple rings on water (256x256, flat). */
export const drawRipple = (p: Pen) => {
  for (const r of [38, 72, 106]) {
    p.ell(128, 128, r, r * 0.42, null, 6);
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
  // the kid + his mane: the mane sprite locks onto the head
  // (kid build: crown ≈ 1.29*scale above the soles, head centre
  // ≈ 1.07*scale) and sways with the wind, quantised to 0.5 steps
  const KID_SCALE = 0.95;
  const kidAt = (x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = KID_SCALE) => {
    out.places.push(stand(KID, x, y, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
    const sway = Math.round(Math.sin(t * 1.9 + x * 0.7) * 2) / 2;
    out.fx.push({
      key: `gimbalMane|${sway}`, cw: 512, ch: 400, draw: drawGimbalMane(sway),
      x, y: y + 1.14 * scale, z: z - 0.04, w: 1.28 * scale, h: 1.0 * scale,
    });
  };
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = -0.15, scale = 1.5) => {
    out.places.push(stand(HERO, x, y, z, expr, look, {}, scale));
    blob(out, x, y, z, scale);
  };

  if (id === 1) {
    // THE COVER (frame 0): the gimbal kid BIG in front of the
    // temples, his mane already swinging in the wind — the hero
    // shocked at his side, mum watching from behind.
    kidAt(KID_POS[0], 0, KID_POS[2], "grin", 0.1);
    heroAt(HERO_POS[0], 0, HERO_POS[2], "shock", -0.2, 1.35);
    out.places.push(stand(MUM, -1.8, 0, 3.4, "grin", 0.25, {}, 1.35)); blob(out, -1.8, 0, 3.4, 1.35);
    card("cardHook", ["RAMBUT GIMBAL", "AJAIB?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE FEVER: the kid at the house yard, pale and nervous, a
    // giant thermometer showing how it all started; mum worries.
    kidAt(KID_POS[0], 0, KID_POS[2], "nervous", 0);
    out.places.push(stand(MUM, -1.7, 0, 5.9, "nervous", 0.3, {}, 1.35)); blob(out, -1.7, 0, 5.9, 1.35);
    out.fx.push({ key: "thermo", cw: 320, ch: 128, draw: drawThermometer, x: KID_POS[0] + 1.55, y: 1.72, z: KID_POS[2] - 0.3, w: 1.5, h: 0.6, soft: true });
    card("cardFever", ["DIAWALI", "DEMAM!"], KID_POS[0], 2.4, KID_POS[2], 3.6, 0.5);
  } else if (id === 3) {
    // TITIPAN LELUHUR: the high wide — elder beside the kid on
    // the field, gesturing to the temples and the misty plateau
    kidAt(-1.4, 0, -6, "grin", 0.1);
    out.places.push(stand(ELDER, 0.9, 0, -6.4, "neutral", -0.2, { wave: 1 }, 1.45)); blob(out, 0.9, 0, -6.4, 1.45);
    heroAt(4.6, 0, -2, "grin", -0.3, 1.4);
    card("cardTitipan", ["TITIPAN", "LELUHUR!"], 0, 2.5, -20, 4.4, 0.52);
  } else if (id === 4) {
    // DON'T CUT: close on the kid while the hero lifts scissors —
    // then the big red NO lands over them. Belief, stated plainly.
    kidAt(KID_POS[0], 0, KID_POS[2], "nervous", 0.1);
    heroAt(0.75, 0, 8.3, "stern", -0.25, 1.45);
    const scY = 1.55 + Math.sin(t * 2.2) * 0.05;
    out.fx.push({ key: "scissors", cw: 256, ch: 256, draw: drawScissors, x: 0.1, y: scY, z: 8.2, w: 0.85, h: 0.85, soft: true });
    if (U > 0.42) {
      const pop = 0.7 + 0.3 * smooth((U - 0.42) / 0.12);
      out.fx.push({ key: "noCross", cw: 256, ch: 256, draw: drawNoCross, x: 0.1, y: scY, z: 8.05, w: 1.05 * pop, h: 1.05 * pop, soft: true });
    }
    card("cardNoCut", ["ASAL POTONG?", "TUMBUH LAGI!"], KID_POS[0], 2.6, KID_POS[2], 3.8, 0.5);
  } else if (id === 5) {
    // THE RITE: on the temple field — the kid seated before the
    // elder, offerings laid out, the hero respectfully quiet
    const rx = 0, rz = CANDI[2] + 7;
    out.places.push(person(cam, KID, rx, 0.35, rz, { mode: "sit", expr: "grin", blink: lidAt(t, KID.i), look: 0.1 }, KID_SCALE));
    blob(out, rx, 0.35, rz, KID_SCALE);
    const sway = Math.round(Math.sin(t * 1.9) * 2) / 2;
    out.fx.push({ key: `gimbalMane|${sway}`, cw: 512, ch: 400, draw: drawGimbalMane(sway), x: rx, y: 1.37, z: rz - 0.04, w: 1.28 * KID_SCALE, h: 1.0 * KID_SCALE });
    out.places.push(stand(ELDER, 1.7, 0.35, rz - 0.4, "neutral", -0.25, {}, 1.45)); blob(out, 1.7, 0.35, rz - 0.4, 1.45);
    out.fx.push({ key: "sesaji", cw: 256, ch: 192, draw: drawSesaji, x: rx - 0.1, y: 0.77, z: rz + 1.15, w: 0.95, h: 0.71, soft: true });
    heroAt(-2.6, 0.35, rz + 0.6, "relief", 0.25, 1.4);
    card("cardRuwat", ["RUWAT RAMBUT", "GIMBAL"], 0, 2.6, CANDI[2], 4.6, 0.52);
  } else if (id === 6) {
    // THE RE-HOOK: close-up — the kid himself sets the condition,
    // waving a finger at the grown-ups (and at the viewer)
    kidAt(KID_POS[0], 0, KID_POS[2], "grin", 0, { wave: 1 });
    card("cardSyarat", ["SYARAT DARI", "ANAKNYA!"], KID_POS[0], 2.6, KID_POS[2], 3.8, 0.5);
  } else if (id === 7) {
    // THE WISHES: ice cream, a bike, then TWO goats parade in
    // beside the kid as he names them — every wish on screen
    kidAt(KID_POS[0], 0, KID_POS[2], "laugh", 0.05);
    heroAt(1.5, 0, 8.6, "laugh", -0.3, 1.4);
    const propIn = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, u0: number, u1: number) => {
      if (U >= u0 && U < u1) {
        const pop = 0.75 + 0.25 * smooth((U - u0) / 0.08);
        out.fx.push({ key, cw, ch, draw, x, y, z, w: w * pop, h: h * pop, soft: true });
      }
    };
    propIn("iceCream", 192, 256, drawIceCream, -1.3, 1.05, 7.0, 0.72, 0.96, 0.04, 0.42);
    propIn("bike", 384, 256, drawBike, 1.2, 0.78, 5.2, 2.3, 1.53, 0.34, 0.72);
    propIn("goatA", 320, 256, drawGoat, -1.35, 0.72, 6.6, 1.5, 1.2, 0.64, 1.01);
    propIn("goatB", 320, 256, drawGoat, 2.7, 0.72, 5.4, 1.5, 1.2, 0.72, 1.01);
    card("cardWajib", ["WAJIB", "DIPENUHI!"], KID_POS[0], 2.8, KID_POS[2], 4.0, 0.5);
  } else if (id === 8) {
    // THE LARUNG: at the lake's edge the kid (hair now short —
    // no mane) and mum release the cut locks onto the rippling
    // water. The clump sinks gently as the rings spread.
    out.places.push(stand(KID, LAKE[0] + 24.2, 0, LAKE[2] + 0.1, "relief", -0.4, {}, KID_SCALE));
    blob(out, LAKE[0] + 24.2, 0, LAKE[2] + 0.1, KID_SCALE);
    out.places.push(stand(MUM, LAKE[0] + 25.4, 0, LAKE[2] + 3.6, "relief", -0.4, {}, 1.35)); blob(out, LAKE[0] + 25.4, 0, LAKE[2] + 3.6, 1.35);
    const sink = smooth(U * 1.15);
    out.fx.push({ key: "lockClump", cw: 192, ch: 128, draw: drawLockClump, x: LAKE[0] + 21.5, y: 0.42 - sink * 0.22, z: LAKE[2] + 1, w: 0.85, h: 0.57, soft: true });
    const rr2 = 0.5 + U * 1.5;
    out.fx.push({ key: "ripple", cw: 256, ch: 256, draw: drawRipple, x: LAKE[0] + 21.5, y: 0.06, z: LAKE[2] + 1, w: rr2, h: rr2, flat: true, soft: true });
    card("cardLarung", ["DILARUNG", "KE TELAGA"], -6, 1.2, 3.5, 3.4, 0.48);
  } else if (id === 9) {
    // THE FESTIVAL: the kirab winds down the path to the temples
    // — walkers in step, banners up, the hero cheering them on
    const walkers: Who[] = [VILLAGER_A, VILLAGER_B, VILLAGER_C, ELDER];
    for (let i = 0; i < 4; i++) {
      const kp = kirabAt(t, i);
      out.places.push(person(cam, walkers[i], kp.x, 0, kp.z,
        { mode: "stroll", phase: (t * 1.35 + i * 0.23) % 1, expr: "grin", blink: lidAt(t, walkers[i].i), look: 0 }, 1.05));
      blob(out, kp.x, 0, kp.z, 1.05);
    }
    const kp0 = kirabAt(t, 0);
    out.fx.push({ key: "sesajiKirab", cw: 256, ch: 192, draw: drawSesaji, x: kp0.x, y: 2.35, z: kp0.z, w: 1.0, h: 0.75, soft: true });
    heroAt(-4.4, 0, -4, "laugh", 0.3, 1.4);
    card("cardFestival", ["DIENG CULTURE", "FESTIVAL"], 0, 2.5, -22, 4.6, 0.52);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same kid,
    // same claim, but everyone is laughing now. Loop to frame 0.
    kidAt(KID_POS[0], 0, KID_POS[2], "laugh", 0.1);
    heroAt(HERO_POS[0], 0, HERO_POS[2], "laugh", -0.2, 1.35);
    out.places.push(stand(MUM, -1.8, 0, 3.4, "laugh", 0.25, {}, 1.35)); blob(out, -1.8, 0, 3.4, 1.35);
    card("cardHook2", ["RAMBUT GIMBAL", "AJAIB?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };
