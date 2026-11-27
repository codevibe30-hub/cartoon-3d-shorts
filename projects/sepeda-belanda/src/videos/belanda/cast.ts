// The cast of the Sepeda Belanda cover frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED beside the SEA OF BIKES, a Dutch local guide
// in an orange shirt + orange cap, and the giant claim card.
// Same pool + card machinery as the house style: one canvas per
// distinct drawing, yaw-only billboards shaded by cardShade(),
// soft contact blobs. The claim card floats as an ink-outlined
// board via drawCardFit (auto-fit: text NEVER overflows the
// board), glued to the view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, smooth, camAt, HERO_SPOT, GUIDE_SPOT, PILE_POS, TROPHY_POS, BABY_BIKE_POS } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "belandaHero" };
// GUIDE: a Dutch local — orange shirt (Netherlands!), jeans, orange cap.
const GUIDE: Who = { i: 63, o: { jacket: "#e8862c", pants: "#3b5b9a", boots: "#5a3b2a", hat: "cap", cap: "#e8862c" }, okey: "belandaGuide" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A baby peeking out of a bike basket (256x288): a wicker
 *  basket with a round baby face above it — tiny orange cap,
 *  dot eyes, open laughing mouth — the punchline, drawn. */
export const drawBaby = (p: Pen) => {
  const g = p.g;
  // wicker basket
  g.fillStyle = "#8a6844";
  g.beginPath(); g.roundRect(28, 150, 200, 110, 14); g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  g.strokeStyle = "rgba(60,40,16,0.7)"; g.lineWidth = 3;
  for (let y = 172; y < 250; y += 22) { g.beginPath(); g.moveTo(32, y); g.lineTo(224, y); g.stroke(); }
  for (let x = 58; x < 220; x += 30) { g.beginPath(); g.moveTo(x, 154); g.lineTo(x, 256); g.stroke(); }
  // baby head
  g.fillStyle = "#ffe2c2";
  g.beginPath(); g.arc(128, 108, 62, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  // tiny orange cap
  g.fillStyle = "#e8862c";
  g.beginPath(); g.arc(128, 92, 62, Math.PI, 0); g.fill();
  g.beginPath(); g.ellipse(128, 92, 62, 14, 0, Math.PI, 0); g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  // dot eyes + laughing mouth
  g.fillStyle = "#241726";
  g.beginPath(); g.arc(104, 108, 6, 0, 7); g.fill();
  g.beginPath(); g.arc(152, 108, 6, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.arc(128, 128, 20, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // blush
  g.fillStyle = "rgba(232,90,90,0.55)";
  g.beginPath(); g.arc(88, 128, 9, 0, 7); g.fill();
  g.beginPath(); g.arc(168, 128, 9, 0, 7); g.fill();
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
  const blobS = (x: number, y: number, z: number, sc = 1, k = 1) => blob(out, x, y, z, sc, k);
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, extra: Partial<FrontOpts> = {}) => {
    out.places.push(stand(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], expr, look, extra, scale));
    blobS(HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2]);
  };
  const guideAt = (expr: Expr, look = 0.15, scale = 1.4, extra: Partial<FrontOpts> = {}) => {
    out.places.push(stand(GUIDE, GUIDE_SPOT[0], GUIDE_SPOT[1], GUIDE_SPOT[2], expr, look, extra, scale));
    blobS(GUIDE_SPOT[0], GUIDE_SPOT[1], GUIDE_SPOT[2]);
  };

  if (id === 1) {
    // THE COVER (frame 0): the BIKE SEA big in the centre — rows
    // of parked bikes along the quay, the canal + gabled houses
    // behind, the tour boat gliding past, the hero's SHOCK face
    // beside it at the right, the guide at the left, and the
    // claim as one GIANT board up-frame.
    heroAt("shock", -0.15);
    guideAt("shock", 0.15);
    card("cardHook", ["LEBIH BANYAK", "SEPEDA!"], 0, 2.2, -9, 5.0, 0.52);
  } else if (id === 2) {
    // AMONG THE BIKES: hero + guide standing in the OPEN quay gap
    // (z -2.5) between the camera and the bike rows — never behind
    // a rack, so no bike can hide them from this camera. Both hug
    // the shot-2 axis (x = 1.0): +/-0.9 m at 5.5 m = 9 deg, inside
    // the portrait half-FOV (~13 deg).
    out.places.push(stand(HERO, 1.9, 0, -2.5, "grin", -0.1, {}, 1.5)); blobS(1.9, 0, -2.5);
    out.places.push(stand(GUIDE, 0.1, 0, -2.5, "grin", 0.1, { wave: 1 }, 1.4)); blobS(0.1, 0, -2.5);
    card("cardBikes", ["23 JUTA", "SEPEDA"], 0, 2, -9, 3.4, 0.5);
  } else if (id === 3) {
    // THE COMPARISON: the bike pile vs a crowd of people — the
    // pile stands EAST in the open quay, the crowd WEST of it,
    // both clear of the bike rows. Extra people for the count.
    out.places.push(stand(HERO, 1.2, 0, -0.5, "grin", -0.3, {}, 1.3)); blobS(1.2, 0, -0.5);
    out.places.push(stand(GUIDE, 2.8, 0, -0.5, "grin", 0.3, { wave: 1 }, 1.3)); blobS(2.8, 0, -0.5);
    const crowd: Who[] = [
      { i: 11, o: { jacket: "#357650", pants: "#3d4440", boots: "#5a3b2a", hat: "cap", cap: "#3a5a8a" }, okey: "crowdA" },
      { i: 22, o: { jacket: "#c0392b", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#2a1a10" }, okey: "crowdB" },
      { i: 33, o: { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "crowdC" },
      { i: 44, o: { jacket: "#2e8a4a", pants: "#3b5b9a", boots: "#5a3b2a", hat: "hair", hair: "#8a6a3a" }, okey: "crowdD" },
      { i: 55, o: { jacket: "#e8b90a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#222222" }, okey: "crowdE" },
      { i: 66, o: { jacket: "#3a9a8a", pants: "#3d4440", boots: "#5a3b2a", hat: "hair", hair: "#1d1410" }, okey: "crowdF" },
    ];
    crowd.forEach((w, i) => {
      const cx = -1.8 - (i % 3) * 1.0, cz = -1.2 - Math.floor(i / 3) * 1.8;
      out.places.push(stand(w, cx, 0, cz, "grin", 0.1 * (i % 2 ? 1 : -1), {}, 1.25));
      blobS(cx, 0, cz, 0.9);
    });
    card("cardPeople", ["18 JUTA", "ORANG"], PILE_POS[0], 2, PILE_POS[2], 3.6, 0.5);
  } else if (id === 4) {
    // THE CANAL CRANE: the barge mid-canal, the claw lifting a
    // dripping bike out of the water — hero + guide watch from
    // the quay edge, clear of the crane's swing.
    out.places.push(stand(HERO, 14.6, 0, -13.2, "shock", -0.4, {}, 1.35)); blobS(14.6, 0, -13.2);
    out.places.push(stand(GUIDE, 12.2, 0, -17.2, "shock", 0.4, {}, 1.3)); blobS(12.2, 0, -17.2);
    card("cardCanal", ["15 RIBU", "/TAHUN"], 10, 2.5, -25, 3.8, 0.5);
  } else if (id === 5) {
    // THE RECORD: close on the gold trophy on its pedestal — the
    // hero and the guide admiring it from the quay, the bike sea
    // behind them.
    out.places.push(stand(HERO, -6.9, 0, -2.2, "laugh", -0.2, {}, 1.35)); blobS(-6.9, 0, -2.2);
    out.places.push(stand(GUIDE, -9.1, 0, -2.2, "laugh", 0.2, { wave: 1 }, 1.3)); blobS(-9.1, 0, -2.2);
    card("cardRecord", ["REKOR", "DUNIA!"], TROPHY_POS[0], 2.2, TROPHY_POS[2], 3.4, 0.5);
  } else if (id === 6) {
    // THE UNDERWATER GARAGE: the ramp diving below the waterline
    // at the canal edge — hero + guide point down at the bikes
    // riding into the portal, the water strip above the lintel.
    out.places.push(stand(HERO, -10.6, 0, -13.8, "shock", -0.35, {}, 1.35)); blobS(-10.6, 0, -13.8);
    out.places.push(stand(GUIDE, -12.3, 0, -13.8, "grin", 0.35, { wave: 1 }, 1.3)); blobS(-12.3, 0, -13.8);
    card("cardGarage", ["PARKIR BAWAH", "AIR!"], -14, 1.5, -20, 3.6, 0.5);
  } else if (id === 7) {
    // THE PUNCHLINE LOOP (golden): back on the cover framing —
    // same bike sea, same claim, but the hero is laughing now,
    // and the baby in the basket steals the shot.
    heroAt("laugh", -0.15);
    guideAt("laugh", 0.15);
    out.fx.push({ key: "babyBasket", cw: 256, ch: 288, draw: drawBaby, x: BABY_BIKE_POS[0] + 0.55, y: 0.85, z: BABY_BIKE_POS[2] + 0.4, w: 0.62, h: 0.7, soft: true });
    card("cardHook2", ["BAYI PUNYA", "SEPEDA!"], 0, 2.2, -9, 5.0, 0.52);
  }
  return out;
};
export { FPS };
