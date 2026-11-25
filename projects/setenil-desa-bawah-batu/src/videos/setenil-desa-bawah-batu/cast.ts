// The cast of the Setenil de las Bodegas short as lit flat
// sprites in the 3D world: the series hero narrator (teal shirt,
// cream cap) standing SHOCKED on the gorge street under the
// hanging rock, villagers living their under-the-rock life
// around him — café guests in the sun, a stroller in the
// sunless Sombra tunnel, defenders on the castle wall — and the
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
import { FPS, SHOTS, clamp01, camAt, STREET_Y, HERO_SPOT, HOUSE_W, CAFE, BODEGA, CASTLE } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "setenilHero" };
// VILLAGERS: life under the rock — a café regular, a neighbour
// out for a stroll, the café waiter.
const VILLAGER_A: Who = { i: 61, o: { jacket: "#d8542e", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f6ecd2" }, okey: "setenilVillagerA" };
const VILLAGER_B: Who = { i: 62, o: { jacket: "#2e6da4", dress: "#e8e3d5", pants: "#3b3f52", boots: "#8a5a34", hat: "hair", hair: "#2a1a10", skin: "#c99067" }, okey: "setenilVillagerB" };
const VILLAGER_C: Who = { i: 63, o: { jacket: "#f0ead8", pants: "#2c2c30", boots: "#3a2c1c", hat: "hair", hair: "#14100c", skin: "#a06a3c" }, okey: "setenilVillagerC" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A hanging wooden street sign (512x256): two rope strokes, a
 *  plank board with a warm gradient + grain, and the street's
 *  name in cream — Cuevas del Sol / Cuevas de la Sombra. */
const drawSign = (l1: string, l2: string) => (p: Pen) => {
  const g = p.g;
  g.strokeStyle = "#6a4a2c"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(120, 4); g.lineTo(150, 58); g.moveTo(392, 4); g.lineTo(362, 58); g.stroke();
  const bx = 46, by = 56, bw = 420, bh = 168, br = 18;
  g.save();
  g.shadowColor = "rgba(20,10,0,0.5)"; g.shadowBlur = 16; g.shadowOffsetY = 9;
  g.beginPath(); g.roundRect(bx, by, bw, bh, br); g.fillStyle = "#7a4a26"; g.fill();
  g.restore();
  const grad = g.createLinearGradient(bx, by, bx, by + bh);
  grad.addColorStop(0, "#96683a"); grad.addColorStop(1, "#6e4520");
  g.beginPath(); g.roundRect(bx, by, bw, bh, br); g.fillStyle = grad; g.fill();
  const rs = rng(41);
  for (let i = 0; i < 380; i++) {
    g.fillStyle = `rgba(${rs() > 0.5 ? "255,225,170" : "30,16,4"},${0.04 + rs() * 0.05})`;
    g.fillRect(bx + rs() * bw, by + rs() * bh, 2.2, 2.2);
  }
  g.beginPath(); g.roundRect(bx, by, bw, bh, br); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#f8edd2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 54px 'Arial Black', Arial, sans-serif";
  g.save();
  g.shadowColor = "rgba(30,15,0,0.6)"; g.shadowOffsetY = 3;
  g.fillText(l1, bx + bw / 2, by + bh / 2 - 34);
  g.fillText(l2, bx + bw / 2, by + bh / 2 + 36);
  g.restore();
};
/** A bunch of wine grapes (256x320): a stem, a leaf, and three
 *  layers of purple spheres with glossy highlights — the bodega
 *  punchline prop the hero shows off. */
export const drawGrapes = (p: Pen) => {
  const g = p.g;
  p.line([[128, 14], [122, 58]], "#5a4020", 10, false);
  p.ell(168, 44, 40, 20, "#3d7a32", 5);
  const rows: [number, number, number][] = [
    [128, 84, 3], [104, 122, 4], [152, 122, 4], [92, 164, 4], [128, 166, 4],
    [164, 164, 4], [108, 208, 3], [146, 208, 3], [127, 248, 2],
  ];
  const cols = ["#5b2a86", "#6d349e", "#4a2070", "#7a3fae"];
  let n = 0;
  for (const [cx, cy, cnt] of rows) {
    for (let i = 0; i < cnt; i++) {
      const x = cx + (i - (cnt - 1) / 2) * 34, y = cy + ((n + i) % 2) * 5;
      p.ell(x, y, 21, 21, cols[(n + i) % cols.length], 4);
      p.ell(x - 6, y - 7, 5.5, 5.5, "rgba(255,255,255,0.75)", 0);
      n++;
    }
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
  // the hero on the street, with the idle life in his body
  // (a breath bob — he is never a frozen cutout)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_SPOT[0], z = HERO_SPOT[2], extra: Partial<FrontOpts> = {}) => {
    const y = STREET_Y + Math.sin(t * 2.2) * 0.012;
    out.places.push(stand(HERO, x, y, z, expr, look, extra, scale));
    blob(out, x, STREET_Y, z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const strollerB = (x: number, z0: number, z1: number) => {
    const z = z0 + (z1 - z0) * U;
    out.places.push(person(cam, VILLAGER_B, x, STREET_Y, z,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, VILLAGER_B.i), look: 0.15 }, 1.0));
    blob(out, x, STREET_Y, z);
  };

  if (id === 1) {
    // THE COVER (frame 0): the street canyon — white houses
    // wedged under the HANGING ROCK on both sides, the hero's
    // SHOCK face big beside it, arm up at the rock, the claim
    // as one GIANT board. The dolly is already moving.
    heroAt("shock", -0.15, 1.5, HERO_SPOT[0], HERO_SPOT[2], { wave: 1 });
    strollerB(-2.6, 3, -7);
    out.places.push(stand(VILLAGER_A, 3.2, STREET_Y, -2.5, "grin", 0.1, { wave: 1 }, 1.0)); blob(out, 3.2, STREET_Y, -2.5);
    card("cardHook", ["DI BAWAH", "BATU?!"], 0, 4.5, -25, 5.2, 0.55);
  } else if (id === 2) {
    // THE NAME: high wide over the whole gorge — the hero small
    // on the street below, the village running away to the castle
    heroAt("grin", 0, 1.1);
    strollerB(-2.6, -6, -16);
    card("cardName", ["SETENIL!"], 0, 2, -50, 4.6, 0.5);
  } else if (id === 3) {
    // ONE WALL + A ROCK: the hero gestures up at the white front
    // wall of a house whose roof and back wall are the cliff
    // itself (he stands on the street across the river, centred
    // in the camera's line — the first staging at z -5.2 fell
    // outside the portrait frustum, and the neighbour at the
    // door stood hidden inside the house volume)
    heroAt("grin", 0.3, 1.2, -2.9, -0.5, { wave: 1 });
    card("cardWall", ["ATAPNYA", "BATU!"], HOUSE_W[0], 3, HOUSE_W[2], 3.8, 0.5);
  } else if (id === 4) {
    // CUEVAS DEL SOL: the hero takes coffee on a terrace under
    // the sunny overhang; the waiter works the tables
    out.places.push(person(cam, HERO, 3.4, STREET_Y, -25.2,
      { mode: "sit", expr: "grin", blink: lidAt(t, HERO.i), look: 0.1 }, 1.05));
    out.places.push(stand(VILLAGER_C, 5.1, STREET_Y, -27.5, "grin", 0, {}, 1.0)); blob(out, 5.1, STREET_Y, -27.5);
    out.places.push(person(cam, VILLAGER_A, 4.6, STREET_Y, -23.4,
      { mode: "sit", expr: "grin", blink: lidAt(t, VILLAGER_A.i), look: -0.1 }, 1.0));
    out.fx.push({ key: "signSol", cw: 512, ch: 256, draw: drawSign("CUEVAS", "DEL SOL"), x: 5.9, y: 3.6, z: -20.5, w: 2.2, h: 1.1, soft: true }); // z -20.5: clear of the café awnings (they hid half the sign)
    card("cardSol", ["GUA", "MATAHARI!"], CAFE[0], 2.5, CAFE[2], 4.0, 0.5);
  } else if (id === 5) {
    // CUEVAS DE LA SOMBRA (the mid-video re-hook): the hero
    // strolls INTO the rock tunnel, glancing up at a ceiling
    // that is solid stone — no sun has ever reached this street
    const hz = -60 + U * 7;
    out.places.push(person(cam, HERO, 0.6, STREET_Y, hz,
      { mode: "stroll", phase: (t * 1.4) % 1, expr: "nervous", blink: lidAt(t, HERO.i), look: 0.25 }, 1.15));
    blob(out, 0.6, STREET_Y, hz, 1.15);
    const bz = -57 - U * 6; // further from the tunnel camera — at -52-U*8 she crossed half-cropped at the frame edge
    out.places.push(person(cam, VILLAGER_B, -2.2, STREET_Y, bz,
      { mode: "stroll", phase: (t * 1.3) % 1, expr: "grin", blink: lidAt(t, VILLAGER_B.i), look: -0.15 }, 1.0));
    blob(out, -2.2, STREET_Y, bz);
    out.fx.push({ key: "signSombra", cw: 512, ch: 256, draw: drawSign("CUEVAS DE", "LA SOMBRA"), x: -3.4, y: 3.3, z: -54.5, w: 2.2, h: 1.1, soft: true });
    card("cardSombra", ["NOL", "MATAHARI!"], 0, 2.2, -66, 3.6, 0.5);
  } else if (id === 6) {
    // FREE AIR-CONDITIONING: across the street the neighbour
    // swelters in the sun; the hero, two steps into the rock's
    // shade, is blissfully cool. (Close shot — card rides HIGH,
    // clear of the hero's face; stills-checked before dispatch.)
    heroAt("relief_open", 0.1, 1.35, 2.0, -20.5);
    out.places.push(stand(VILLAGER_A, -1.9, STREET_Y, -17.2, "nervous", 0.2, {}, 1.05)); blob(out, -1.9, STREET_Y, -17.2);
    card("cardAC", ["AC", "GRATIS!"], 2.0, 2.2, -20.5, 4.6, 0.46);
  } else if (id === 7) {
    // SEPTEM NIHIL: high over the gorge rim — the castle that
    // seven sieges could not take, flags flying, defenders on
    // the wall (the hero stands far below, out of this frame)
    heroAt("stern", 0, 1.0, 1.4, -80);
    out.places.push(stand(VILLAGER_A, -6.2, CASTLE[1] + 3.6, CASTLE[2] + 1.6, "grin", 0, { wave: 1 }, 0.8)); // on the curtain wall top (y 16.1) — the old spot was inside the keep
    out.places.push(stand(VILLAGER_B, 1.8, CASTLE[1], CASTLE[2] + 5.8, "grin", 0.1, {}, 0.8)); // on the bluff top at its front edge (z -112.2) — further back, a low camera loses him behind the bluff face (feet y = bluff top) — the old spot was inside the keep
    card("cardNihil", ["TUJUH KALI", "NIHIL!"], CASTLE[0] - 2.5, CASTLE[1] - 1, CASTLE[2], 2.2, 0.52); // anchored LOW over the bluff face: raised, it covered the keep's crenellations, flags and defenders
  } else if (id === 8) {
    // THE SIEGES: closer on the castle — two defenders wave
    // from the wall walk while the hero points up at them,
    // stern as a herald reading the score: seven-nil
    heroAt("stern", -0.2, 1.1, 2.2, -101, { wave: 1 }); // street end below the frame — shot 8 is the castle + defenders + card; the hero's pointing silhouette stays out of this one
    out.places.push(stand(VILLAGER_A, -6.2, CASTLE[1] + 3.6, CASTLE[2] + 1.6, "grin", 0, { wave: 1 }, 0.8)); // on the curtain wall top (y 16.1) — the old spot was inside the keep
    out.places.push(stand(VILLAGER_B, 1.8, CASTLE[1], CASTLE[2] + 5.8, "grin", 0.1, {}, 0.8)); // on the bluff top at its front edge (z -112.2) — further back, a low camera loses him behind the bluff face (feet y = bluff top) — the old spot was inside the keep
    card("cardSiege", ["7x GAGAL", "DITEMBUS!"], CASTLE[0] - 2.5, CASTLE[1] + 2, CASTLE[2], 4.6, 0.5); // shifted left + raised: dead-centre it hid the defenders
  } else if (id === 9) {
    // DE LAS BODEGAS: wine barrels stacked in the cool under
    // the rock — the hero shows off a bunch of grapes
    heroAt("grin", 0.1, 1.15, 2.3, -89.3);
    out.fx.push({ key: "grapes", cw: 256, ch: 320, draw: drawGrapes, x: 2.95, y: 1.15, z: -89.2, w: 0.52, h: 0.65, soft: true });
    out.places.push(stand(VILLAGER_C, 5.4, STREET_Y, -92.5, "grin", 0, {}, 1.0)); blob(out, 5.4, STREET_Y, -92.5);
    card("cardBodega", ["GUDANG", "ANGGUR!"], BODEGA[0], 2.5, BODEGA[2], 3.8, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same
    // street, same rock, same claim, but the hero is laughing
    // now: a roof that never leaks. Loop to frame 0.
    heroAt("laugh", -0.15, 1.5, HERO_SPOT[0], HERO_SPOT[2], { wave: 1 });
    strollerB(-2.6, 3, -7);
    out.places.push(stand(VILLAGER_A, 3.2, STREET_Y, -2.5, "grin", 0.1, { wave: 1 }, 1.0)); blob(out, 3.2, STREET_Y, -2.5);
    card("cardHook2", ["DI BAWAH", "BATU?!"], 0, 4.5, -25, 5.2, 0.55);
  }
  return out;
};
export { FPS };
