// The cast of the Salar short as lit flat sprites in the
// 3D world: the series hero narrator reacting beside the
// mirror, a local tour guide, two tourists, and the pink
// flamingos of the shallows (custom-drawn) — plus the giant
// claim card. Same pool + card machinery as the house style:
// one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The claim card floats
// as an ink-outlined board via drawCardFit (auto-fit: text
// NEVER overflows the board), glued to the view axis so it
// always sits in frame. On the flooded flat every standing
// figure also gets a REFLECTION: the same drawing flipped
// and squashed onto a soft flat sheet on the water film.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, FLOOR_Y, HERO_HOOK, GUIDE, HERO_NAME, HERO_FLAT, HERO_WALK, FLAM1, FLAM2, FLAM3, HERO_SAT, HERO_HEX, HERO_ISLAND, HERO_LITH, HERO_LAKE } from "./story";
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
/** The claim board, painted RICH (anti-flat): a deep drop
 *  shadow floating off the board, a diagonal amber gradient
 *  with a glossy top sheen and fine grain, a double border
 *  with character (heavy ink outside, pinstripe inside),
 *  corner rivets like a real road sign, and the text itself
 *  carrying a soft shadow so it sits IN the board. */
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

// ---------------- the flamingos (custom-drawn) ----------------
/** An Andean flamingo standing in the shallows, drawn in the
 *  same 600x1000 design space as bodyFront: body at y ≈ 470,
 *  S-neck rising to the head at y ≈ 200, stilt legs to the
 *  waterline at y ≈ 960. `dip` (0..1, quantized) lowers the
 *  neck in a slow feeding dip. */
const drawFlamingo = (dip: number, seed: number) => (p: Pen) => {
  const g = p.g;
  g.lineCap = "round";
  // legs: two pink stilts, one bent at the "ankle" (backwards knee)
  g.strokeStyle = INK; g.lineWidth = 13;
  g.beginPath(); g.moveTo(272, 560); g.lineTo(262, 760); g.lineTo(276, 962); g.stroke();
  g.beginPath(); g.moveTo(330, 560); g.lineTo(352, 742); g.lineTo(338, 962); g.stroke();
  g.strokeStyle = "#e2607e"; g.lineWidth = 8;
  g.beginPath(); g.moveTo(272, 560); g.lineTo(262, 760); g.lineTo(276, 962); g.stroke();
  g.beginPath(); g.moveTo(330, 560); g.lineTo(352, 742); g.lineTo(338, 962); g.stroke();
  // feet: little webs in the water
  g.strokeStyle = INK; g.lineWidth = 9;
  g.beginPath(); g.moveTo(276, 962); g.lineTo(244, 972); g.moveTo(276, 962); g.lineTo(310, 972); g.stroke();
  g.beginPath(); g.moveTo(338, 962); g.lineTo(308, 972); g.moveTo(338, 962); g.lineTo(370, 972); g.stroke();
  // tail feathers, swept up at the back
  g.fillStyle = "#ef8fab";
  g.beginPath(); g.moveTo(196, 452); g.quadraticCurveTo(128, 408, 116, 344); g.quadraticCurveTo(178, 372, 226, 420); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4.5; g.stroke();
  g.fillStyle = "#3a3230";
  g.beginPath(); g.moveTo(150, 372); g.quadraticCurveTo(128, 352, 118, 330); g.quadraticCurveTo(146, 344, 168, 360); g.closePath(); g.fill();
  // body: a plump teardrop
  const bg = g.createLinearGradient(180, 380, 420, 560);
  bg.addColorStop(0, "#f7b1c4"); bg.addColorStop(0.55, "#f28bab"); bg.addColorStop(1, "#e56a8d");
  g.fillStyle = bg;
  g.beginPath(); g.ellipse(306, 478, 128, 88, -0.1, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
  // wing: layered scallops with a dark flight-feather band
  g.fillStyle = "#f59eb8";
  g.beginPath(); g.ellipse(300, 486, 96, 60, -0.08, 0, 7); g.fill();
  g.strokeStyle = "rgba(160,50,80,0.5)"; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.ellipse(268 + i * 24, 500 + (i % 2) * 8, 30, 16, -0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }
  g.fillStyle = "#42383a";
  g.beginPath(); g.ellipse(352, 512, 52, 20, 0.25, 0, 7); g.fill();
  g.fillStyle = "rgba(255,235,240,0.5)";
  g.beginPath(); g.ellipse(262, 436, 52, 20, -0.35, 0, 7); g.fill();
  // the S-neck: rises from the chest, dips with `dip`
  const hy = 208 + dip * 120, hx = 398 + dip * 26;
  g.strokeStyle = INK; g.lineWidth = 27;
  g.beginPath(); g.moveTo(392, 452);
  g.bezierCurveTo(452, 400, 428, 316, hx - 6, hy + 66);
  g.quadraticCurveTo(hx + 2, hy + 30, hx, hy + 8); g.stroke();
  g.strokeStyle = "#f28bab"; g.lineWidth = 19;
  g.beginPath(); g.moveTo(392, 452);
  g.bezierCurveTo(452, 400, 428, 316, hx - 6, hy + 66);
  g.quadraticCurveTo(hx + 2, hy + 30, hx, hy + 8); g.stroke();
  // head + the bent beak (pale base, black tip)
  g.fillStyle = "#f7b1c4";
  g.beginPath(); g.ellipse(hx + 6, hy, 27, 21, 0.25, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4.2; g.stroke();
  g.fillStyle = "#fdf3d8";
  g.beginPath(); g.moveTo(hx + 24, hy - 8); g.quadraticCurveTo(hx + 58, hy - 2, hx + 52, hy + 16); g.quadraticCurveTo(hx + 36, hy + 14, hx + 22, hy + 8); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3.6; g.stroke();
  g.fillStyle = "#2b2320";
  g.beginPath(); g.moveTo(hx + 52, hy + 16); g.quadraticCurveTo(hx + 50, hy + 34, hx + 38, hy + 38); g.quadraticCurveTo(hx + 40, hy + 24, hx + 40, hy + 15); g.closePath(); g.fill();
  // eye: yellow ring, black pupil
  g.fillStyle = "#ffd94a"; g.beginPath(); g.arc(hx + 8, hy - 3, 6.4, 0, 7); g.fill();
  g.fillStyle = "#1c1712"; g.beginPath(); g.arc(hx + 8, hy - 3, 3.2, 0, 7); g.fill();
};

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2", skin: "#d99e63" }, okey: "salarHero" };
// THE GUIDE: a local Uyuni tour guide — orange vest, dark cap.
const GUIDE_WHO: Who = { i: 51, o: { jacket: "#e07b39", pants: "#4a4238", boots: "#3a2c1c", hat: "cap", cap: "#37474f", skin: "#a06a3c" }, okey: "salarGuide" };
// THE TOURISTS.
const TOURISTS: Who[] = [
  { i: 61, o: { jacket: "#c9562e", pants: "#4a5a3a", boots: "#5a3b2a", hat: "hair", hair: "#1c1712", skin: "#a06a3c" }, okey: "salarTour1" },
  { i: 62, o: { jacket: "#3f74b5", dress: "#e8c832", pants: "#5a4632", boots: "#8a5a34", hat: "hair", hair: "#2a1a10", skin: "#8a5a30" }, okey: "salarTour2" },
];

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1, pitch = 0) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale, pitch);
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number, soft = false) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h, soft });
  };
  // axis-glued cards: placed on the camera's TRUE view axis (cam.dir)
  // so they are always centred in frame, with the FIT GUARD clamping
  // the vertical offset so the whole board stays in the real FOV.
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
  // a standing figure's mirror reflection: the same drawing,
  // flipped + squashed onto a soft sheet lying on the water
  // film, running from the feet toward the camera (+z side in
  // every mirror shot). Alpha is baked into the drawing.
  const reflect = (key: string, draw: (p: Pen) => void, x: number, z: number, scale: number, wob = 0) => {
    const w = 600 * SU * scale * 1.02, len = 1000 * SU * scale * 0.85;
    out.fx.push({
      key: `refl|${key}`, cw: 512, ch: 512,
      draw: (p) => {
        const g = p.g;
        g.save();
        g.globalAlpha = 0.5;
        // canvas top = the FEET side of the sheet (the plane's
        // -z edge), canvas bottom = the head, far toward camera:
        // design y 1000 (feet) -> canvas 0, design y 0 -> canvas 506
        g.translate(256 + wob * 22, 0);
        g.scale(512 / 600, -506 / 1000);
        g.translate(-300, -1000);
        draw(p);
        g.restore();
        // ripple streaks chewing the reflection's far end
        const rs = rng(913);
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 26; i++) {
          g.fillStyle = `rgba(0,0,0,${0.10 + rs() * 0.16})`;
          g.fillRect(rs() * 512, 280 + rs() * 220, 26 + rs() * 60, 2.2);
        }
        g.globalCompositeOperation = "source-over";
      },
      x, y: 0.015, z: z + len / 2, w, h: len, flat: true, soft: true,
    });
  };
  // the hero, with the idle life in his body (a breath bob)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_HOOK[0], z = HERO_HOOK[2], y = FLOOR_Y, extra: Partial<FrontOpts> = {}, wet = true) => {
    const yy = y + Math.sin(t * 2.2) * 0.012;
    const pl = stand(HERO, x, yy, z, expr, look, extra, scale);
    out.places.push(pl);
    if (wet) reflect(pl.key, pl.draw, x, z, scale, Math.sin(t * 1.7) * 0.4);
    else blob(out, x, y, z, scale);
  };
  const npc = (who: Who, x: number, z: number, expr: Expr, scale = 1, y = FLOOR_Y, extra: Partial<FrontOpts> = {}, wet = true) => {
    const yy = y + Math.sin(t * 2.2 + who.i) * 0.012;
    const pl = stand(who, x, yy, z, expr, 0, extra, scale);
    out.places.push(pl);
    if (wet) reflect(pl.key, pl.draw, x, z, scale);
    else blob(out, x, y, z, scale);
  };
  // a flamingo in the shallows, with its slow feeding dip
  const flamingo = (x: number, z: number, scale: number, seed: number) => {
    const dip = Math.round((0.5 + 0.5 * Math.sin(t * 0.45 + seed * 2.1)) * 3) / 3;
    const d = cam.pos.distanceTo(tmp.set(x, 1.0, z)) / scale;
    const [w, h, k] = tier(d);
    const draw = drawFlamingo(dip, seed);
    const key = `FLAM|${seed}|${dip}`;
    out.places.push({ key, draw, x, y: Math.sin(t * 1.9 + seed) * 0.008, z, scale, size: [w, h, k] });
    reflect(key, draw, x, z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);

  if (id === 1) {
    // THE COVER: the mirror itself fills the frame, already
    // shimmering under the dolly — the hero front-right,
    // shocked at his own reflection, never covering the sheet
    heroAt("shock", -0.15, 1.45, HERO_HOOK[0], HERO_HOOK[2], FLOOR_Y, { wave: 1 });
    card("cardHook", ["CERMIN TERBESAR", "DUNIA?!"], 0.2, 1.0, -13, 5.6, 0.55);
  } else if (id === 2) {
    // THE NAME WIDE: white to the horizon — the jeep small,
    // the guide waving, two tourists tiny, the hero grinning
    npc(GUIDE_WHO, GUIDE[0], GUIDE[2], "grin", 1.05, FLOOR_Y, { wave: 1 });
    npc(TOURISTS[0], -7.8, -12.5, "grin", 0.95, FLOOR_Y, { wave: 0.6 });
    npc(TOURISTS[1], 7.2, -13.5, "neutral", 0.95);
    heroAt("grin", 0, 1.15, HERO_NAME[0], HERO_NAME[2], FLOOR_Y, { wave: 1 });
    card("cardName", ["SALAR DE", "UYUNI!"], 0, 0.8, -18, 5.4, 0.5);
  } else if (id === 3) {
    // THE FLAT: the hero over the long spirit level on the
    // crust — one metre of rise in ten thousand square km
    heroAt("shock", -0.05, 1.3, HERO_FLAT[0], HERO_FLAT[2], FLOOR_Y, { wave: 0.4 });
    card("cardFlat", ["CUMA 1", "METER!"], -2.0, 0.5, -19.5, 4.4, 0.5);
  } else if (id === 4) {
    // THE MIRROR WALK: the hero strolls on the sky itself,
    // flamingos standing in the shallows beside him
    const d = cam.pos.distanceTo(tmp.set(HERO_WALK[0], 1.2, HERO_WALK[2])) / 1.35;
    const [w, h, k] = tier(d);
    const light = light2D(cam, false), seed = seedOf(HERO.i);
    const f2: FrontOpts = { mode: "stroll", phase: t * 2.4, expr: "grin", blink: lidAt(t, HERO.i), look: -0.1, light, seed };
    const wkey = `F|${HERO.okey}|walk|${q(t * 2.4 % (Math.PI * 2), 40)}|${lidAt(t, HERO.i)}`;
    const wdraw = (p: Pen) => bodyFront(p, HERO.o, f2);
    out.places.push({ key: wkey, draw: wdraw, x: HERO_WALK[0], y: FLOOR_Y, z: HERO_WALK[2], scale: 1.35, size: [w, h, k] });
    reflect(wkey, wdraw, HERO_WALK[0], HERO_WALK[2], 1.35, Math.sin(t * 1.7) * 0.4);
    flamingo(FLAM1[0], FLAM1[2], 1.05, 3);
    flamingo(FLAM2[0], FLAM2[2], 0.95, 5);
    flamingo(FLAM3[0], FLAM3[2], 1.1, 8);
    card("cardWalk", ["JALAN DI", "ATAS AWAN!"], 1.6, 1.0, -10, 5.2, 0.52);
  } else if (id === 5) {
    // THE SATELLITE: the hero points up at the satellite
    // crossing the sky (a world sprite), the mirror below
    heroAt("shock", -0.1, 1.4, HERO_SAT[0], HERO_SAT[2], FLOOR_Y, { wave: 1 });
    card("cardSat", ["KALIBRASI", "SATELIT!"], 1.2, 2.6, -12, 5.2, 0.52);
  } else if (id === 6) {
    // THE HEXAGONS (re-hook): the dry field — the hero
    // stands amazed over the giant salt polygons
    heroAt("nervous", 0.05, 1.35, HERO_HEX[0], HERO_HEX[2], FLOOR_Y, {}, false);
    card("cardHex", ["SEGI ENAM", "RAKSASA!"], 0, 0.4, 122, 4.8, 0.5);
  } else if (id === 7) {
    // THE ISLAND: Incahuasi — the hero small under a giant
    // cactus on the rocky island in the white sea
    heroAt("shock", -0.1, 1.15, HERO_ISLAND[0], HERO_ISLAND[2], FLOOR_Y, { wave: 0.5 }, false);
    card("cardIsland", ["KAKTUS 10", "METER!"], -47, 3.0, -63, 5.2, 0.5);
  } else if (id === 8) {
    // THE LITHIUM: the hero beside the levered-up salt slab
    // — the brine pool glows beneath it (world prop)
    heroAt("grin", -0.05, 1.3, HERO_LITH[0], HERO_LITH[2], FLOOR_Y, { wave: 0.4 }, false);
    card("cardLith", ["LITIUM", "RAKSASA!"], -14.6, 0.5, -32.8, 4.4, 0.5);
  } else if (id === 9) {
    // THE ANCIENT LAKE: the hero rides a reed boat on
    // prehistoric Lake Minchin, volcanoes on the shore
    const yy = HERO_LAKE[1] + Math.sin(t * 1.6) * 0.03;
    out.places.push(stand(HERO, HERO_LAKE[0], yy, HERO_LAKE[2], "grin", 0, { wave: 1 }, 1.2));
    card("cardLake", ["DANAU", "PURBA!"], -0.6, 1.1, 227.5, 4.8, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE: the cover angle again — the dolly over
    // the mirror, the hero laughing at his reflection: the
    // world's biggest mirror is an ancient lake bed
    heroAt("laugh", -0.1, 1.45, HERO_HOOK[0], HERO_HOOK[2], FLOOR_Y, { wave: 1 });
    card("cardHook2", ["CERMIN TERBESAR", "DUNIA?!"], 0.2, 1.0, -13, 5.4, 0.52);
  }
  return out;
};
export { FPS };
