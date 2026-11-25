// The cast of the Ayunan short as lit flat sprites in the
// 3D world: the series hero narrator riding the great swing
// and reacting beside it, Carlos the volcano lookout, his
// grandkid, and two tourists — plus the giant claim card.
// Same pool + card machinery as the house style: one canvas
// per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text
// NEVER overflows the board), glued to the view axis so it
// always sits in frame. The RIDER is placed on the swing's
// seat every frame from the shared pendulum clock (story.ts
// swingSeat), seated (mode "sit"), pitched with the swing.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, FLOOR_Y, HERO_NAME, HERO_SWING, HERO_VOLC, HERO_HUT, CARLOS_SPOT, HERO_LISTEN, CARLOS_PUSH, HERO_WATCH, PHOTOG, swingSeat } from "./story";
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

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2", skin: "#d99e63" }, okey: "ayunanHero" };
// CARLOS: the lookout — an old vigía: grey hair + grey
// moustache, work vest, no hat.
const CARLOS: Who = { i: 71, o: { jacket: "#7a5230", pants: "#4a4238", boots: "#3a2c1c", hat: "hair", hair: "#b8b4ac", moustache: "#b8b4ac", skin: "#c99067" }, okey: "ayunanCarlos" };
// THE GRANDKID: small build, bright orange jacket, red cap.
const KID: Who = { i: 81, o: { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", skin: "#e8b083", build: "kid" }, okey: "ayunanKid" };
// THE TOURISTS.
const RIDER_T: Who = { i: 61, o: { jacket: "#c9562e", pants: "#4a5a3a", boots: "#5a3b2a", hat: "hair", hair: "#1c1712", skin: "#a06a3c" }, okey: "ayunanTour1" };
const PHOTOG_WHO: Who = { i: 62, o: { jacket: "#3f74b5", pants: "#5a4632", boots: "#8a5a34", hat: "cap", cap: "#37474f", skin: "#8a5a30" }, okey: "ayunanTour2" };

/** the photographer: bodyFront with the raised wave arm, plus
 *  a phone painted into the raised hand (design-space spot
 *  calibrated to the wave arm's endpoint) */
const drawPhotog = (fo: FrontOpts) => (p: Pen) => {
  bodyFront(p, PHOTOG_WHO.o, fo);
  const g = p.g;
  g.save();
  g.translate(428, 268); g.rotate(-0.16);
  g.fillStyle = "#1c2126";
  g.beginPath(); g.roundRect(-21, -34, 42, 68, 8); g.fill();
  g.fillStyle = "#9fd4f2"; g.fillRect(-16, -28, 32, 46);
  g.fillStyle = "#e8f6fd"; g.beginPath(); g.arc(0, 26, 4.5, 0, 7); g.fill();
  g.restore();
};
/** a camera flash starburst (drawn only on flash frames) */
const drawFlash = (p: Pen) => {
  const g = p.g;
  const cx = 128, cy = 128;
  const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 120);
  grad.addColorStop(0, "rgba(255,255,255,0.95)"); grad.addColorStop(0.25, "rgba(255,250,220,0.55)"); grad.addColorStop(1, "rgba(255,250,220,0)");
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 120, 0, 7); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    g.lineWidth = i % 2 ? 5 : 8;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
    g.lineTo(cx + Math.cos(a) * (i % 2 ? 62 : 92), cy + Math.sin(a) * (i % 2 ? 62 : 92)); g.stroke();
  }
};

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
  // a standing figure, with the idle life in his body (a breath bob)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_NAME[0], z = HERO_NAME[2], y = FLOOR_Y, extra: Partial<FrontOpts> = {}) => {
    const yy = y + Math.sin(t * 2.2) * 0.012;
    out.places.push(stand(HERO, x, yy, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
  };
  const npc = (who: Who, x: number, z: number, expr: Expr, scale = 1, y = FLOOR_Y, extra: Partial<FrontOpts> = {}, look = 0) => {
    const yy = y + Math.sin(t * 2.2 + who.i) * 0.012;
    out.places.push(stand(who, x, yy, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
  };
  // THE RIDER: seated on the swing's plank, following the
  // shared pendulum — position from swingSeat(t), pitched
  // with the swing so he stays glued to the seat. The sprite
  // origin is the soles; a seated figure's hip rides ~0.13
  // (design-calibrated) above the origin per unit scale, so
  // the mesh drops that far below the plank's top surface.
  const rider = (who: Who, expr: Expr, scale = 1.5) => {
    const seat = swingSeat(t);
    const d = cam.pos.distanceTo(tmp.set(seat.x, seat.y + 0.8, seat.z)) / scale;
    const [w, h, k] = tier(d);
    const light = light2D(cam, false), seed = seedOf(who.i);
    const f2: FrontOpts = { mode: "sit", expr, blink: lidAt(t, who.i), look: 0, light, seed };
    const key = `R|${who.okey}|${fkey(f2)}|${q(seat.theta, 24)}`;
    out.places.push({
      key, draw: (p) => bodyFront(p, who.o, f2),
      x: seat.x, y: seat.y + 0.06 - 0.13 * scale, z: seat.z,
      scale, pitch: seat.theta * 0.9, size: [w, h, k],
    });
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);

  if (id === 1) {
    // THE HOOK: the swing itself fills the centre, ALREADY
    // flying out over the drop — the hero rides it, shocked,
    // the valley and its cloud sea far below, Tungurahua behind
    rider(HERO, "shock", 1.5);
    card("cardHook", ["AYUNAN DI ATAS", "JURANG?!"], -0.9, 2.2, -4.5, 5.6, 0.55);
  } else if (id === 2) {
    // THE NAME WIDE: the whole site — tree, treehouse, sign;
    // the hero waves beside the tree, Carlos watches from
    // his balcony above
    heroAt("grin", 0, 1.3, HERO_NAME[0], HERO_NAME[2], FLOOR_Y, { wave: 1 });
    npc(CARLOS, HERO_HUT[0], HERO_HUT[2], "neutral", 1.0, HERO_HUT[1], { wave: 0.5 });
    card("cardName", ["AYUNAN UJUNG", "DUNIA!"], 0, 2.6, -4, 5.4, 0.5);
  } else if (id === 3) {
    // THE SWING ITSELF: ropes, plank, steel cable swinging
    // past — the hero stands at the edge holding his breath
    heroAt("nervous", -0.05, 1.35, HERO_SWING[0], HERO_SWING[2], FLOOR_Y, {});
    card("cardSwing", ["PAPAN + TALI", "DOANG!"], -1.0, 4.2, -3.6, 4.6, 0.5);
  } else if (id === 4) {
    // THE DROP: the hero flies out over the valley, grinning,
    // kicking at the clouds BELOW him
    rider(HERO, "grin", 1.5);
    card("cardDrop", ["AWAN DI", "BAWAH KAKI!"], -1.4, -3.0, -16, 5.2, 0.52);
  } else if (id === 5) {
    // THE VOLCANO (re-hook): Tungurahua towers over everything;
    // a tourist rides small in front of it, the hero points up
    rider(RIDER_T, "grin", 1.2);
    heroAt("shock", -0.1, 1.35, HERO_VOLC[0], HERO_VOLC[2], FLOOR_Y, { wave: 1 });
    card("cardVolc", ["GUNUNG BERAPI", "AKTIF!"], 3.2, 7.0, -40, 3.0, 0.52);
  } else if (id === 6) {
    // THE LOOKOUT POST: the hero up on the treehouse balcony,
    // beside the tripod binoculars and the blinking seismic box
    out.places.push(stand(HERO, HERO_HUT[0], HERO_HUT[1] + Math.sin(t * 2.2) * 0.012, HERO_HUT[2], "shock", -0.1, { wave: 0.4 }, 1.15));
    blob(out, HERO_HUT[0], HERO_HUT[1], HERO_HUT[2], 1.15);
    card("cardPost", ["POS PANTAU", "LETUSAN!"], -5.0, 6.1, -2.2, 4.2, 0.5);
  } else if (id === 7) {
    // THE LOOKOUT HIMSELF: Carlos on his ridge, the hero
    // listening — years of watching the mountain from a tree
    npc(CARLOS, CARLOS_SPOT[0], CARLOS_SPOT[2], "stern", 1.3);
    heroAt("neutral", 0.1, 1.25, HERO_LISTEN[0], HERO_LISTEN[2], FLOOR_Y, {});
    card("cardGuard", ["PENJAGA", "GUNUNG!"], -1.8, 1.9, -3.6, 4.8, 0.5);
  } else if (id === 8) {
    // THE TWIST: the grandkid rides the swing, Carlos pushes,
    // the hero laughs — it was a family toy all along
    rider(KID, "grin", 1.3);
    npc(CARLOS, CARLOS_PUSH[0], CARLOS_PUSH[2], "grin", 1.25, FLOOR_Y, { wave: 0.5 });
    heroAt("laugh", -0.1, 1.25, HERO_WATCH[0], HERO_WATCH[2], FLOOR_Y, {});
    card("cardKid", ["BUAT CUCU", "DOANG!"], -1.0, 1.9, -4.2, 5.2, 0.52);
  } else if (id === 9) {
    // THE VIRAL PHOTO: a tourist flies for the camera while
    // Tungurahua puffs ash behind — the shot that went worldwide
    rider(RIDER_T, "grin", 1.45);
    {
      const d = cam.pos.distanceTo(tmp.set(PHOTOG[0], 1.2, PHOTOG[2])) / 1.3;
      const [w, h, k] = tier(d);
      const light = light2D(cam, false), seed = seedOf(PHOTOG_WHO.i);
      const f2: FrontOpts = { mode: "stand", expr: "neutral", blink: lidAt(t, PHOTOG_WHO.i), look: -0.2, wave: 1, light, seed };
      const key = `F|${PHOTOG_WHO.okey}|phone|${fkey(f2)}`;
      out.places.push({ key, draw: drawPhotog(f2), x: PHOTOG[0], y: Math.sin(t * 2.2 + PHOTOG_WHO.i) * 0.012, z: PHOTOG[2], scale: 1.3, size: [w, h, k] });
      blob(out, PHOTOG[0], FLOOR_Y, PHOTOG[2], 1.3);
      // the flash: bursts roughly twice a second
      const ph = (tt * 1.7) % 1;
      if (ph < 0.07) {
        out.fx.push({
          key: `flash|${Math.floor(tt * 1.7)}`, cw: 256, ch: 256, draw: drawFlash,
          x: PHOTOG[0] - 0.55, y: 1.62, z: PHOTOG[2] - 0.5, w: 1.5, h: 1.5, soft: true,
        });
      }
    }
    card("cardViral", ["FOTO VIRAL", "SEDUNIA!"], -0.8, 2.5, -5.2, 5.2, 0.52);
  } else if (id === 10) {
    // THE PUNCHLINE: the cover angle again — the hero rides
    // laughing: a grandkid's toy on a volcano post became
    // the most famous swing at the end of the world
    rider(HERO, "laugh", 1.5);
    card("cardHook2", ["AYUNAN DI ATAS", "JURANG?!"], -0.9, 2.2, -4.5, 5.4, 0.52);
  }
  return out;
};
export { FPS };
