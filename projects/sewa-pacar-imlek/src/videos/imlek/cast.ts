// The cast of the Sewa Pacar Imlek cover frame as lit flat sprites
// in the 3D world: the series hero narrator (teal shirt, cream
// cap) standing SHOCKED beside a GIANT glowing rental listing
// board, the heroine (red sweater, suitcase) shocked beside it,
// shoppers streaming down a lantern-lit CNY street. Same pool +
// card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact
// blobs. The claim card floats as an ink-outlined board via
// drawCardFit (auto-fit: text NEVER overflows the board), glued
// to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HOUSE_Z, DOOR_Z, TABLE_Z, HERO_SPOT, HEROIN_SPOT, DOOR_C, TABLE_C, CHAIR_C, crowdAt, stampAt, vanishAt, moneyAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "imlekHero" };
// HEROIN: the client — single woman home for CNY, red sweater, suitcase in hand.
const HEROIN: Who = { i: 51, o: { jacket: "#c0161d", pants: "#2e3a52", boots: "#5a3b2a", hat: "hair", hair: "#1d1410" }, okey: "imlekHeroin" };
// BOYFRIEND: the rental — handsome, navy suit, white shirt, red scarf.
const BOYFRIEND: Who = { i: 61, o: { jacket: "#1e3a5f", pants: "#1e2a3a", boots: "#1a1a1c", hat: "hair", hair: "#14100c" }, okey: "imlekBoyfriend" };
// DAD: grey hair, navy jacket — delighted at the door.
const DAD: Who = { i: 91, o: { jacket: "#2e4a66", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a8a8a" }, okey: "imlekDad" };
// MOM: grey hair, purple jacket, warm dress — clutching red envelopes.
const MOM: Who = { i: 92, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#e8e8e8", skin: "#c99067" }, okey: "imlekMom" };
// AUNTIE: nosy relative in warm colours.
const AUNTIE_A: Who = { i: 93, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a4a3a" }, okey: "imlekAuntieA" };
const AUNTIE_B: Who = { i: 94, o: { jacket: "#3d7a4a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a8a8a" }, okey: "imlekAuntieB" };
// SHOPPERS: the CNY street crowd — festive colours, red accents.
const SHOPPER_A: Who = { i: 71, o: { jacket: "#f2f2ee", pants: "#2e3a52", boots: "#3a3a3e", hat: "hair", hair: "#1d1410" }, okey: "imlekShopperA" };
const SHOPPER_B: Who = { i: 72, o: { jacket: "#dfe9f5", pants: "#2e3a52", boots: "#3a3a3e", hat: "hair", hair: "#14100c" }, okey: "imlekShopperB" };
const SHOPPER_C: Who = { i: 73, o: { jacket: "#c0161d", pants: "#2e3a52", boots: "#3a3a3e", hat: "cap", cap: "#f6c21c" }, okey: "imlekShopperC" };
const SHOPPER_D: Who = { i: 74, o: { jacket: "#7fb3d9", pants: "#2e3a52", boots: "#3a3a3e", hat: "hair", hair: "#1d1410" }, okey: "imlekShopperD" };
const SHOPPERS = [SHOPPER_A, SHOPPER_B, SHOPPER_C, SHOPPER_D];

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
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // the hero at his street spot, beside the crowd, never covering it
  const heroSpot = (expr: Expr, look = -0.15, scale = 1.5) => {
    out.places.push(stand(HERO, HERO_SPOT[0], 0, HERO_SPOT[2], expr, look, {}, scale));
    blob(out, HERO_SPOT[0], 0, HERO_SPOT[2], scale);
  };
  // the heroine at her street spot (frame-0 cover + loop)
  const heroinSpot = (expr: Expr, look = 0.15, scale = 1.45) => {
    out.places.push(stand(HEROIN, HEROIN_SPOT[0], 0, HEROIN_SPOT[2], expr, look, {}, scale));
    blob(out, HEROIN_SPOT[0], 0, HEROIN_SPOT[2], scale);
  };
  // shoppers streaming down the CNY street (dir -1 toward the house, +1 toward camera)
  const crowd = (dir: -1 | 1, n: number) => {
    for (let i = 0; i < n; i++) {
      const c = crowdAt(id, t, i, dir);
      const who = SHOPPERS[i % SHOPPERS.length];
      const expr: Expr = i % 5 === 0 ? "nervous" : i % 5 === 1 ? "grin" : "neutral";
      out.places.push(person(cam, who, c.x, 0, c.z,
        { mode: "march", phase: c.phase, expr, blink: lidAt(t, who.i), look: 0 }, 0.95 + (i % 3) * 0.05));
      blob(out, c.x, 0, c.z, 0.95);
    }
  };
  // the rented boyfriend, standing tall — or vanishing (shot 6: scale to 0 once gone)
  const boyfriend = (x: number, z: number, expr: Expr, look = 0, scale = 1.35) => {
    const v = id === 6 ? vanishAt(t) : 1;
    if (v <= 0.02) return;
    out.places.push(stand(BOYFRIEND, x, 0, z, expr, look, {}, scale * v));
    blob(out, x, 0, z, scale * v);
  };
  // a yuan note fluttering away (shot 6) — drawn as a small green-gold card
  const yuanNote = (i: number) => {
    const m = moneyAt(t, i);
    const draw = (p: Pen) => {
      const g = p.g;
      g.save();
      g.fillStyle = "#7fae4e"; g.fillRect(0, 0, 220, 110);
      g.fillStyle = "#f6c21c"; g.fillRect(8, 8, 204, 94);
      g.fillStyle = "#2e5d3a"; g.font = "900 52px 'Arial Black', Arial, sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("¥100", 110, 58);
      g.restore();
    };
    out.fx.push({ key: `yuan|${i}`, cw: 256, ch: 128, draw, x: m.x, y: m.y, z: m.z, w: 0.9, h: 0.45, rot: m.rot });
  };

  if (id === 1) {
    // THE COVER (frame 0): the LISTING BOARD itself is the anomaly
    // — a giant glowing Taobao-style rental card, already big and
    // swaying, shoppers streaming past, the heroine shocked BESIDE
    // it, the hero narrator beside her.
    crowd(-1, 12);
    heroSpot("shock", -0.15);
    heroinSpot("shock", 0.15);
    card("cardHook", ["10.000 YUAN", "SEHARI!"], 0, 3.5, -18, 5.0, 0.52);
  } else if (id === 2) {
    // THE MONEY: the heroine counts a huge stack of yuan while the
    // rented boyfriend poses proudly beside her; the hero counts
    // along, shocked at the price.
    out.places.push(stand(HEROIN, -2.5, 0, -6, "nervous", 0.1, {}, 1.45)); blob(out, -2.5, 0, -6);
    boyfriend(2.5, -6, "grin", -0.1);
    heroSpot("shock", -0.15);
    card("cardMoney", ["Rp22 JUTA!", "SEHARI"], 0, 3.5, -18, 5.0, 0.52);
  } else if (id === 3) {
    // THE SHOPS: high wide — the street of Taobao stalls, listing
    // boards everywhere, the heroine scrolling her phone.
    crowd(-1, 10);
    out.places.push(stand(HEROIN, -3, 0, -8, "neutral", 0.1, {}, 1.3)); blob(out, -3, 0, -8);
    heroSpot("grin", -0.15);
    card("cardShops", ["300 TOKO!", "TAOBAO"], 4, 3, -20, 4.5, 0.55);
  } else if (id === 4) {
    // THE MENU: close on the giant price board — chat 30, dinner
    // 50, kiss 50 — the boyfriend chats with dad, then eats; the
    // heroine counts cash at the table.
    out.places.push(stand(BOYFRIEND, -2.5, 0, -12, "grin", 0.1, {}, 1.35)); blob(out, -2.5, 0, -12);
    out.places.push(stand(DAD, 2.5, 0, -12, "grin", -0.1, {}, 1.1)); blob(out, 2.5, 0, -12);
    out.places.push(stand(HEROIN, 0.5, 0, -8, "nervous", 0, {}, 1.3)); blob(out, 0.5, 0, -8);
    card("cardMenu", ["CIUMAN", "50 YUAN!"], 0, 3, -16, 3.4, 0.5);
  } else if (id === 5) {
    // THE TWIST: the contract lies on the table — the red stamp
    // slams down "TIDAK SAH". Parents + boyfriend frozen mid-smile.
    out.places.push(stand(DAD, -3, 0, -22, "shock", 0.1, {}, 1.1)); blob(out, -3, 0, -22);
    out.places.push(stand(MOM, 3, 0, -22, "shock", -0.1, {}, 1.1)); blob(out, 3, 0, -22);
    boyfriend(0, -20, "nervous", 0);
    out.places.push(stand(HEROIN, -1.5, 0, -18, "shock", 0.1, {}, 1.3)); blob(out, -1.5, 0, -18);
    card("cardStamp", ["TIDAK", "SAH!"], 0, 3, -20, 4.2, 0.5);
  } else if (id === 6) {
    // THE PUNCHLINE LOOP: golden hour — the boyfriend is GONE,
    // yuan notes flutter away, the heroine stands alone with her
    // suitcase by the same giant listing board; the hero laughs.
    // (boyfriend() no-ops once vanishAt hits 0.)
    for (let i = 0; i < 5; i++) yuanNote(i);
    crowd(1, 10);
    heroinSpot("nervous", 0.15);
    heroSpot("laugh", -0.15);
    card("cardHook2", ["10.000 YUAN", "SEHARI!"], 0, 3.5, -18, 5.0, 0.52);
  }
  return out;
};
export { FPS };
