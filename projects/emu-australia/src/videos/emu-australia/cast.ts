// The cast of the Emu War cover frame as lit flat sprites in
// the 3D world: the series hero narrator (teal jacket, cream cap)
// standing SHOCKED in the wheat with a GIANT emu looming behind
// him, veteran soldier-settler farmers, and Major Meredith's
// three-man Lewis-gun detachment — plus the giant claim card.
// Same pool + card machinery as the house style: one canvas per
// distinct drawing, yaw-only billboards shaded by cardShade(),
// soft contact blobs. The claim card floats as an ink-outlined
// board via drawCardFit (auto-fit: text NEVER overflows the
// board), glued to the view axis so it always sits in frame.
// (The emus themselves are 3D low-poly meshes in world.ts, not
// flat sprites — they need to run, zig-zag and tower.)
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxBurst, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import {
  FPS, SHOTS, clamp01, camAt, HERO_SPOT, EMU_GIANT, FARMHOUSE,
  FENCE_Z, DAM_X, TRUCK_X, FENCE_X, heroSpotAt, scatterAt, chaseAt,
} from "./story";
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
// HERO: the narrator — teal jacket, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "emuHero" };
// FARMER_A: a Campion wheat farmer, WWI veteran — khaki work
// shirt, dusty trousers, khaki cap, dark moustache, hammer in hand.
const FARMER_A: Who = { i: 61, o: { jacket: "#a89a6a", pants: "#5a4a3a", boots: "#5a3b2a", hat: "cap", cap: "#8a7a4a", moustache: "#2a1c10" }, okey: "emuFarmerA" };
// FARMER_B: his wife — ochre dress, dark hair tied back, hands
// on hips at the ruined crop.
const FARMER_B: Who = { i: 62, o: { jacket: "#8a5a3a", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#3a2418", skin: "#c99067" }, okey: "emuFarmerB" };
// MEREDITH: Major G.P.W. Meredith — khaki uniform, stout build,
// moustache, cap; the man who had to report the defeat.
const MEREDITH: Who = { i: 81, o: { jacket: "#8a7a4a", pants: "#6a6248", boots: "#4a3426", hat: "cap", cap: "#7a6a3e", moustache: "#4a3020", build: "stout" }, okey: "emuMeredith" };
// GUNNER: Sergeant McMurray at the Lewis gun — khaki, rifle in hand.
const GUNNER: Who = { i: 82, o: { jacket: "#8a7a4a", pants: "#6a6248", boots: "#4a3426", hat: "cap", cap: "#7a6a3e", rifle: true }, okey: "emuGunner" };
// DRIVER: Gunner O'Halloran at the truck wheel — khaki, cap.
const DRIVER: Who = { i: 83, o: { jacket: "#8a7a4a", pants: "#6a6248", boots: "#4a3426", hat: "cap", cap: "#7a6a3e" }, okey: "emuDriver" };

// ---------------- staging ----------------
// the cover hero spot: the wheat field's front-right — near the
// camera, right of the centred claim board, so the board is never
// occluded (shots 1 + 10 share it for the loop)
const COVER_SPOT: [number, number, number] = [6.0, 0, 13.8];
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
  // so they are always centred in frame. Size scales with the card's
  // distance so the board spans a fixed share of the frame WIDTH.
  // lat: lateral offset in metres along the camera's right vector
  // (negative = left) — used by the cover claim card so the hero's
  // head never covers the last word.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60, soft = false, lat = 0) => {
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
    if (lat) { x += cam.right.x * lat; y += cam.right.y * lat; z += cam.right.z * lat; }
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2, soft);
  };

  const S0 = (s.a - SHOTS[0].a) / FPS, SLEN = (s.b - s.a) / FPS;
  const U = clamp01((t - S0) / Math.max(0.01, SLEN)); // shot-local progress 0..1
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52, lat = 0) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true, lat);
  const heroAt = (expr: Expr, spot: [number, number, number], scale = 1, look = -0.15, pitch = 0) => {
    out.places.push(stand(HERO, spot[0], spot[1], spot[2], expr, look, {}, scale, pitch));
    blob(out, spot[0], spot[1], spot[2], scale);
  };
  const stroll = (who: Who, x: number, y: number, z: number, expr: Expr = "grin", scale = 1) => {
    out.places.push(person(cam, who, x, y, z,
      { mode: "stroll", phase: (t * 1.35) % 1, expr, blink: lidAt(t, who.i), look: 0.15 }, scale));
    blob(out, x, y, z, scale);
  };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face BIG in the wheat
    // in the near foreground — behind him one GIANT emu looming
    // and the flock streaming in, and the claim as one GIANT
    // board. He stands at the field's front-right corner, clear
    // of the centred claim board.
    heroAt("shock", COVER_SPOT, 1.5);
    stroll(FARMER_A, -10 + U * 4, 0, -2);
    card("cardHook", ["TENTARA KALAH", "LAWAN EMU!"], 0, 3.5, -30, 4.2, 0.52, -0.9);
  } else if (id === 2) {
    // THE FLOOD: high wide over the wheat sea — hero small in his
    // field below, the farmhouse behind, the emu flood pouring in
    // from the horizon
    heroAt("grin", HERO_SPOT, 0.9, 0);
    stroll(FARMER_A, -9 + U * 3, 0, -6);
    out.places.push(stand(FARMER_B, 10, 0, -10, "nervous", 0.2, {}, 1.0));
    blob(out, 10, 0, -10);
    card("cardFlood", ["20.000 EMU!"], 0, 2, -40, 4.2, 0.5);
  } else if (id === 3) {
    // THE BROKEN FENCE: a farmer hammers at the hole in the wire
    // — stern, then SHOCK as rabbits hop through; his wife stares
    // at the trampled wheat; the hero watches, nervous
    const strike = 0.5 + 0.5 * Math.sin(U * Math.PI * 6);
    out.places.push(stand(FARMER_A, -5.2, 0, FENCE_Z + 0.6,
      "stern", 0, { prop: ["hammer", strike] }, 1.1));
    blob(out, -5.2, 0, FENCE_Z + 0.6, 1.1);
    out.places.push(stand(FARMER_B, -1.8, 0, -4.2, "nervous", 0.15, {}, 1.0));
    blob(out, -1.8, 0, -4.2);
    heroAt("nervous", heroSpotAt(3), 1.1, 0.1);
    card("cardFence", ["PAGAR JEBOL!"], -5, 2.2, FENCE_Z, 3.0, 0.42);
  } else if (id === 4) {
    // THE ARMY ARRIVES: three soldiers, two Lewis guns on tripods
    // and the truck — Meredith stern at the front, the hero small
    // and watching from the wheat
    out.places.push(stand(MEREDITH, -3.5, 0, -3.5, "stern", 0, {}, 1.15));
    blob(out, -3.5, 0, -3.5, 1.15);
    out.places.push(stand(GUNNER, -1.2, 0, -4.2, "stern", 0, {}, 1.1));
    blob(out, -1.2, 0, -4.2, 1.1);
    out.places.push(stand(DRIVER, 1.8, 0, -4.8, "grin", 0.1, {}, 1.05));
    blob(out, 1.8, 0, -4.8, 1.05);
    heroAt("nervous", heroSpotAt(4), 1.0, 0.1);
    card("cardArmy", ["10.000 PELURU!"], -1, 2.4, -8, 3.4, 0.5);
  } else if (id === 5) {
    // FIRST VOLLEY: the gunner fires — muzzle bursts and dust as
    // the emus zig-zag away; Meredith watches through binoculars
    // (stern), the hero ducks, nervous
    const firing = U > 0.18 && U < 0.75;
    out.places.push(stand(GUNNER, -1.2, 0, -4.2, "stern", 0, {}, 1.1));
    blob(out, -1.2, 0, -4.2, 1.1);
    out.places.push(stand(MEREDITH, -3.5, 0, -3.5, "stern", -0.1, {}, 1.15));
    blob(out, -3.5, 0, -3.5, 1.15);
    heroAt("nervous", [3.5, 0, 8.5], 1.0, 0.1);
    if (firing) {
      const ph = (U * 14) % 1;
      out.fx.push({
        key: "muzzle", cw: 512, ch: 512,
        draw: (p) => fxBurst(p, ph, "#ffe9a8", 10, 30, 200),
        x: -1.2, y: 1.5, z: -5.2, w: 2.6, h: 2.6, soft: true,
      });
      out.fx.push({
        key: "gunDust", cw: 512, ch: 512,
        draw: (p) => fxBurst(p, (U * 7) % 1, "#d9c49a", 8, 50, 260),
        x: -1.2, y: 0.4, z: -5.6, w: 3.2, h: 2.2, soft: true,
      });
    }
    card("cardSpeed", ["50 KM/JAM!"], -3, 2.2, -12, 3.2, 0.5);
  } else if (id === 6) {
    // THE LOOKOUT: the hero grins at the field edge while below,
    // small emu groups scatter in every direction (world meshes);
    // a farmer scratches his head, baffled
    heroAt("grin", HERO_SPOT, 1.0, 0.1);
    out.places.push(stand(FARMER_A, 8, 0, -2, "dazed", 0.1, {}, 1.0));
    blob(out, 8, 0, -2);
    card("cardGroups", ["ADA PEMIMPIN!"], -4, 2.4, -10, 3.0, 0.46);
  } else if (id === 7) {
    // THE CHASE: the driver wrestles the bouncing truck wheel,
    // the gunner clings to the mounted gun, Meredith points ahead
    // — the emus are already far in front (world meshes). The
    // riders travel WITH the truck: same chaseAt() as world.ts.
    const tx = (TRUCK_X - 14) + 26 * chaseAt(7, tt);
    out.places.push(stand(DRIVER, tx - 2, 0, 2.2, "stern", 0, {}, 1.1));
    blob(out, tx - 2, 0, 2.2, 1.1);
    out.places.push(stand(GUNNER, tx + 1.5, 0, 0.5, "nervous", 0, {}, 1.1));
    blob(out, tx + 1.5, 0, 0.5, 1.1);
    out.places.push(stand(MEREDITH, tx + 4, 0, 2.0, "stern", 0, {}, 1.1));
    blob(out, tx + 4, 0, 2.0, 1.1);
    card("cardChase", ["TRUK NGGAK", "BISA NGEJAR!"], tx + 1, 2.6, -2, 2.8, 0.48);
  } else if (id === 8) {
    // THE TALLY: Meredith counts on his fingers beside the shell
    // pile while one emu stands calmly next to it; the hero
    // counts along, laughing at the maths
    out.places.push(stand(MEREDITH, FENCE_X - 1.5, 0, 1.5, "dazed", 0, {}, 1.15));
    blob(out, FENCE_X - 1.5, 0, 1.5, 1.15);
    heroAt("laugh", heroSpotAt(8), 1.05, 0.1);
    card("cardTally", ["10 PELURU", "= 1 EMU!"], FENCE_X + 1, 2.0, -2, 2.6, 0.48);
  } else if (id === 9) {
    // THE TANK: low heroic angle — Meredith stands at attention,
    // saluting the emu's toughness; the emu stands like a tank in
    // the golden light (world mesh, giant)
    out.places.push(stand(MEREDITH, FENCE_X - 2.2, 0, 2.8, "stern", 0, {}, 1.15));
    blob(out, FENCE_X - 2.2, 0, 2.8, 1.15);
    heroAt("grin", heroSpotAt(9), 1.0, 0.1);
    card("cardTank", ["KEBAL KAYAK", "TANK!"], FENCE_X + 1.5, 2.6, -3, 2.8, 0.48);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same wheat,
    // same claim, but the hero is laughing now. Loop to frame 0.
    heroAt("laugh", COVER_SPOT, 1.5);
    stroll(FARMER_A, -10 + U * 4, 0, -2);
    card("cardHook2", ["TENTARA KALAH", "LAWAN EMU!"], 0, 3.5, -30, 4.2, 0.52, -0.9);
  }
  return out;
};
export { FPS };
