// The cast of the Kelimutu short as lit flat sprites in the 3D
// world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED on the stone viewpoint terrace, the twin
// crater lakes in two impossible colours behind him, two local
// villagers, three drifting soul-wisps for the twist, and the
// giant claim card. Same pool + card machinery as the house
// style: one canvas per distinct drawing, yaw-only billboards
// shaded by cardShade(), soft contact blobs. The claim card
// floats as an ink-outlined board via drawCardFit (auto-fit:
// text NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, RIM_TNM, RIM_TAP, heroWalkAt } from "./story";
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
/** The claim board, painted RICH: a deep drop shadow floating
 *  off the board, a diagonal amber gradient with a glossy top
 *  sheen and fine grain, a double border with character (heavy
 *  ink outside, pinstripe inside), corner rivets like a real
 *  sign, and the text itself carrying a soft shadow so it sits
 *  IN the board instead of on it. */
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "kelimutuHero" };
// LOCALS: life around the lakes.
const LOCAL_A: Who = { i: 61, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "kelimutuLocalA" };
const LOCAL_B: Who = { i: 62, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "kelimutuLocalB" };

// ---------------- episode props (drawn, never pasted) ----------------
/** One soul-wisp (256x256): a soft rounded ghost body with a
 *  wavy tail, two calm eyes — tinted per lake (blue for the
 *  elders, turquoise for the young, rust for the wicked). Drawn
 *  with translucent fills so it glows against the sky. */
export const drawWisp = (col: string, glow: string) => (p: Pen) => {
  const g = p.g;
  const halo = g.createRadialGradient(128, 120, 8, 128, 120, 118);
  halo.addColorStop(0, glow); halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 256, 256);
  // body: a dome with a three-wave tail
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; pts.push([128 + Math.cos(a) * 62, 118 - Math.sin(a) * 66]); }
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([190 - u * 124, 118 + Math.sin(u * Math.PI * 3) * 9 + u * 16]); }
  p.poly(pts, col, 0);
  const hi = g.createRadialGradient(104, 78, 4, 104, 78, 60);
  hi.addColorStop(0, "rgba(255,255,255,0.5)"); hi.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hi; g.beginPath(); g.arc(104, 78, 60, 0, 7); g.fill();
  p.dot(106, 108, 7.5, "#22303c"); p.dot(150, 108, 7.5, "#22303c");
  p.arc(128, 128, 13, 7, 25, 155, 4.5, "#22303c");
};
/** A sesajen offering tray (256x160): woven palm tray, flower
 *  petals, a small fruit stack and a curl of incense smoke. */
export const drawSesajen = (p: Pen) => {
  p.ell(128, 118, 108, 30, "#a8834f", 5);
  p.ell(128, 110, 108, 30, "#c49a5e", 5);
  for (let i = 0; i < 9; i++) { // woven rim ticks
    const x = 44 + i * 21;
    p.line([[x, 96], [x + 8, 122]], "#8a6a3c", 4, false);
  }
  const petals = ["#d83a4a", "#e86a9a", "#f2f0e6", "#e8c832", "#e8542e"];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, d = 26 + (i % 3) * 18;
    p.dot(128 + Math.cos(a) * d, 106 + Math.sin(a) * d * 0.32, 6.5, petals[i % petals.length]);
  }
  p.dot(112, 92, 13, "#e8862c"); p.dot(140, 88, 15, "#d94f30"); p.dot(126, 76, 11, "#e8c832");
  // incense smoke curl
  p.line([[168, 92], [162, 74], [172, 58], [164, 40]], "rgba(230,230,235,0.85)", 5, false);
  p.line([[180, 94], [176, 80], [184, 66]], "rgba(230,230,235,0.6)", 4, false);
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
  // so they are always centred in frame, with the FIT GUARD clamp.
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
  // the hero on the terrace, with a barely-there idle bob (breath)
  const heroTerrace = (expr: Expr, look = -0.15, scale = 1.5) => {
    const y = HERO_SPOT[1] + Math.sin(t * 1.6) * 0.012;
    out.places.push(stand(HERO, HERO_SPOT[0], y, HERO_SPOT[2], expr, look, {}, scale));
    blob(out, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const localTerrace = () => { out.places.push(stand(LOCAL_A, -2.6, HERO_SPOT[1], 11.8, "grin", 0.15, { wave: 1 }, 0.95)); blob(out, -2.6, HERO_SPOT[1], 11.8, 0.95); };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big on the
    // terrace — behind him two lakes in two impossible colours
    // sharing one summit, and the claim as one GIANT board.
    heroTerrace("shock", -0.15);
    localTerrace();
    card("cardHook", ["3 WARNA", "BERUBAH?!"], 0, 4, -30, 5.2, 0.52);
  } else if (id === 2) {
    // THE NAME: high wide over all three lakes — hero small on
    // the terrace below, the summit running away to the ridges
    heroTerrace("grin", 0, 1.1);
    card("cardName", ["KELIMUTU"], 0, 2, -45, 4.4, 0.5);
  } else if (id === 3) {
    // THE WALL WALK: the hero strolls the crest path with a
    // different colour of water falling away on BOTH sides,
    // while a local walks the dirt path below the other way
    const hp = heroWalkAt(3, t);
    out.places.push(person(cam, HERO, hp.x, hp.y + Math.sin(t * 1.6) * 0.01, hp.z,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, HERO.i), look: 0.1 }, 1.05));
    blob(out, hp.x, hp.y, hp.z, 1.05);
    const bz = -2 - U * 9;
    out.places.push(person(cam, LOCAL_B, -2.2, -0.28, bz,
      { mode: "stroll", phase: (t * 1.3) % 1, expr: "grin", blink: lidAt(t, LOCAL_B.i), look: 0.15 }, 1.0));
    blob(out, -2.2, -0.28, bz);
    card("cardWall", ["TEMBOK", "5 METER"], hp.x, hp.y + 2.2, hp.z, 3.0, 0.5);
  } else if (id === 4) {
    // THE COLOUR CHANGE (mid-video re-hook): the hero at TNM's
    // rim, pointing as the turquoise water turns green
    out.places.push(stand(HERO, RIM_TNM[0], RIM_TNM[1], RIM_TNM[2], "shock", 0.25, {}, 1.1)); blob(out, RIM_TNM[0], RIM_TNM[1], RIM_TNM[2], 1.1);
    card("cardChange", ["BERUBAH", "6 KALI!"], -16, 1.5, -46, 3.4, 0.55);
  } else if (id === 5) {
    // VOLCANIC GAS: close on the bubbling, steaming surface —
    // the hero crouches at the rim, listening to the mountain
    out.places.push(stand(HERO, RIM_TNM[0] + 1.5, RIM_TNM[1], RIM_TNM[2] + 2.5, "relief_open", 0.2, {}, 1.05)); blob(out, RIM_TNM[0] + 1.5, RIM_TNM[1], RIM_TNM[2] + 2.5, 1.05);
    card("cardGas", ["GAS", "VULKANIK"], -16, 1.5, -44, 3.6, 0.48);
  } else if (id === 6) {
    // 127 METRES: water-level across TNM past the dead trees —
    // the hero small on the far rim, the lake deep and acid
    out.places.push(stand(HERO, RIM_TNM[0] - 1, RIM_TNM[1], RIM_TNM[2], "nervous", 0.2, {}, 0.95)); blob(out, RIM_TNM[0] - 1, RIM_TNM[1], RIM_TNM[2], 0.95);
    card("cardDepth", ["127", "METER!"], -16, 1.2, -46, 2.8, 0.5);
  } else if (id === 7) {
    // THE RESTING PLACE: reverse wide — all three lakes calm
    // under drifting mist, the terrace tiny in the distance
    heroTerrace("grin", 0, 1.1);
    card("cardRest", ["TEMPAT", "ARWAH"], 0, 2, -48, 4.6, 0.55);
  } else if (id === 8) {
    // THE TWIST: close on the hero as three soul-wisps — blue,
    // turquoise, rust — drift up behind him, one per lake
    heroTerrace("nervous", 0, 1.5);
    const wisp = (key: string, col: string, glow: string, bx: number, by: number, bz: number, ph: number, w: number) => {
      const yy = by + Math.sin(t * 0.9 + ph) * 0.35 + U * 0.9;
      const xx = bx + Math.sin(t * 0.5 + ph * 1.7) * 0.3;
      out.fx.push({ key, cw: 256, ch: 256, draw: drawWisp(col, glow), x: xx, y: yy, z: bz, w, h: w, soft: true });
    };
    wisp("wispBlue", "rgba(120,170,240,0.82)", "rgba(90,140,255,0.55)", -1.8, HERO_SPOT[1] + 3.1, HERO_SPOT[2] - 1.6, 0.5, 1.15);
    wisp("wispTurq", "rgba(110,225,205,0.82)", "rgba(60,220,190,0.55)", 0.4, HERO_SPOT[1] + 3.7, HERO_SPOT[2] - 2.1, 2.4, 1.3);
    wisp("wispRust", "rgba(215,130,80,0.85)", "rgba(220,100,50,0.55)", 2.7, HERO_SPOT[1] + 3.0, HERO_SPOT[2] - 1.5, 4.3, 1.05);
    card("cardSouls", ["ARWAH", "DIPILAH!"], HERO_SPOT[0], 2.2, HERO_SPOT[2], 3.6, 0.46);
  } else if (id === 9) {
    // THE WICKED LAKE: TAP's rust water below; a local bends to
    // set down a sesajen offering at the rim, the hero watching
    out.places.push(stand(HERO, RIM_TAP[0] - 2.2, RIM_TAP[1], RIM_TAP[2] + 1.5, "nervous", -0.25, {}, 1.05)); blob(out, RIM_TAP[0] - 2.2, RIM_TAP[1], RIM_TAP[2] + 1.5, 1.05);
    out.places.push(person(cam, LOCAL_B, RIM_TAP[0], RIM_TAP[1], RIM_TAP[2],
      { mode: "stand", expr: "neutral", blink: lidAt(t, LOCAL_B.i), look: 0.3 }, 1.0, 0.38));
    blob(out, RIM_TAP[0], RIM_TAP[1], RIM_TAP[2]);
    out.fx.push({ key: "sesajen", cw: 256, ch: 160, draw: drawSesajen, x: RIM_TAP[0] + 0.9, y: RIM_TAP[1] + 0.28, z: RIM_TAP[2] - 0.7, w: 1.15, h: 0.72 });
    card("cardWicked", ["DANAU ORANG", "JAHAT"], 14, 1.5, -46, 3.4, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // terrace, same claim, but the hero is laughing now.
    heroTerrace("laugh", -0.15);
    localTerrace();
    card("cardHook2", ["3 WARNA", "BERUBAH?!"], 0, 4, -30, 5.2, 0.52);
  }
  return out;
};
export { FPS };
