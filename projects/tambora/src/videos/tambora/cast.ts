// The cast of the Tambora short as lit flat sprites in the 3D
// world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED on a rocky ridge while the largest eruption
// in recorded history fills the sky behind him, villagers at the
// volcano's foot, a snowed-in farmer in the summer of 1816, Karl
// Drais' wooden bicycle, Mary Shelley and her monster at a
// storm-lashed villa. Same pool + card machinery as the house
// style: one canvas per distinct drawing, yaw-only billboards
// shaded by cardShade(), soft contact blobs. The claim card
// floats as an ink-outlined board via drawCardFit (auto-fit:
// text NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, SNOW_HERO, SNOW_X, FIELD_HERO, FIELD_X, VILLA_HERO, VILLA_Z } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "tamboraHero" };
// VILLAGERS: life on the banks and the bridge — no cars, ever.
const VILLAGER_A: Who = { i: 61, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "tamboraVillagerA" };
const VILLAGER_B: Who = { i: 62, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "tamboraVillagerB" };


// FARMER: a northern-Europe farmer of 1816 — brown coat, grey cap.
const FARMER: Who = { i: 63, o: { jacket: "#6a4a2c", pants: "#4a4a52", boots: "#3a2c1c", hat: "cap", cap: "#4a3b2c", skin: "#f5c9a0" }, okey: "tamboraFarmer" };
// SHELLEY: a young writer in a dark plum dress, hair down.
const SHELLEY: Who = { i: 64, o: { jacket: "#4a3550", dress: "#5d4066", pants: "#3b3f52", boots: "#2c2226", hat: "hair", hair: "#2a1a12", skin: "#f5c9a0" }, okey: "tamboraShelley" };
// ---------------- episode props (drawn, never pasted) ----------------
/** Karl Drais' 1817 draisine (512x320): two big spoked wooden
 *  wheels, a curved wooden frame beam, a saddle and a steering
 *  bar — the first bicycle, born of the horse famine of 1816. */
export const drawDraisine = (p: Pen) => {
  const wood = "#8a5f36", woodD = "#6e4a28";
  const wheel = (cx: number) => {
    p.ell(cx, 218, 74, 74, null, 10);
    p.ell(cx, 218, 74, 74, "rgba(0,0,0,0)", 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      p.line([[cx - Math.cos(a) * 66, 218 - Math.sin(a) * 66], [cx + Math.cos(a) * 66, 218 + Math.sin(a) * 66]], woodD, 5, false);
    }
    p.dot(cx, 218, 11, woodD);
  };
  wheel(96); wheel(416);
  // the long curved frame beam joining the wheels
  p.line([[96, 218], [170, 128], [300, 118], [416, 218]], wood, 17);
  // saddle post + saddle
  p.line([[268, 122], [262, 88]], woodD, 9, false);
  p.ell(258, 82, 30, 10, "#4a3020", 5);
  // steering: front fork + handlebar
  p.line([[416, 218], [398, 108]], woodD, 9, false);
  p.line([[368, 100], [428, 112]], woodD, 10);
  // a little support strut to the rear wheel
  p.line([[268, 122], [150, 205]], woodD, 7, false);
};
/** Frankenstein's monster as a doorway silhouette (256x320):
 *  flat-top head, neck bolts, a long dark coat, arms hanging
 *  heavy — pure shadow with a sickly green-grey rim of candle
 *  light. Born in the storm summer Tambora made. */
export const drawMonster = (p: Pen) => {
  const body = "#232b22", rim = "#7d8f6a";
  // coat + shoulders
  p.poly([[58, 318], [62, 138], [84, 108], [172, 108], [194, 138], [198, 318], [150, 318], [140, 210], [116, 210], [106, 318]], body, 0);
  // arms hanging at the sides
  p.poly([[62, 140], [40, 150], [48, 268], [70, 266], [76, 170]], body, 0);
  p.poly([[194, 140], [216, 150], [208, 268], [186, 266], [180, 170]], body, 0);
  // flat-top head with a heavy brow
  p.poly([[88, 112], [90, 44], [96, 30], [160, 30], [166, 44], [168, 112], [146, 124], [110, 124]], body, 0);
  // neck bolts
  p.dot(82, 96, 7, rim); p.dot(174, 96, 7, rim);
  // rim light down one side + the stitched brow line
  p.line([[166, 46], [168, 110]], rim, 4, false);
  p.line([[98, 62], [158, 62]], rim, 3, false);
  // sunken eyes, faintly lit
  p.dot(110, 82, 4.5, "#c8d4a8"); p.dot(146, 82, 4.5, "#c8d4a8");
};
/** A lit candle in a brass holder (128x160): warm glow disc,
 *  wax column, a teardrop flame that the world can flicker by
 *  re-posing — drawn once, soft-blended over the night set. */
export const drawCandle = (p: Pen) => {
  const g = p.g;
  const glow = g.createRadialGradient(64, 62, 4, 64, 62, 62);
  glow.addColorStop(0, "rgba(255,196,92,0.85)"); glow.addColorStop(0.5, "rgba(255,150,50,0.30)"); glow.addColorStop(1, "rgba(255,140,40,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 128, 128);
  p.poly([[52, 158], [76, 158], [72, 132], [56, 132]], "#8a6a30", 4);
  p.poly([[54, 134], [74, 134], [74, 84], [54, 84]], "#f2ead2", 4);
  p.ell(64, 84, 10, 3.5, "#e2d4ae", 0);
  p.ell(64, 58, 7.5, 15, "#ffb03a", 0);
  p.ell(64, 64, 3.6, 8, "#ffe9a8", 0);
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
  // the hero on his ridge, breathing idle (never a statue)
  const heroOnRidge = (expr: Expr, look = -0.15, scale = 1.5) => {
    const y = HERO_SPOT[1] + Math.sin(t * 2.2) * 0.012;
    out.places.push(stand(HERO, HERO_SPOT[0], y, HERO_SPOT[2], expr, look, {}, scale));
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const villagerVillage = () => {
    out.places.push(stand(VILLAGER_A, -16, 0.1, -47, "grin", 0.1, { wave: 1 }, 1.0)); blob(out, -16, 0.1, -47);
    out.places.push(stand(VILLAGER_B, 18.5, 0.1, -54, "grin", -0.2, {}, 1.0)); blob(out, 18.5, 0.1, -54);
  };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big on the ridge
    // in the near foreground — behind him the mountain tears
    // itself apart, and the claim as one GIANT board.
    heroOnRidge("shock", -0.15);
    villagerVillage();
    card("cardHook", ["DUNIA TANPA", "MUSIM PANAS?!"], 0, 8, -45, 5.0, 0.52);
  } else if (id === 2) {
    // THE NAME: high wide over the volcano + village + bay
    heroOnRidge("grin", 0, 1.2);
    villagerVillage();
    card("cardName", ["TAMBORA", "1815"], 0, 6, -70, 4.2, 0.5);
  } else if (id === 3) {
    // 2,600 KM: low angle up the erupting cone — the hero small
    // below, hands clamped over his ears at the blast
    out.places.push(stand(HERO, 12.5, 0.1, -2, "shock", 0.25, {}, 1.3)); blob(out, 12.5, 0.1, -2, 1.3);
    card("cardSound", ["2.600 KM!"], 0, 24, -70, 3.4, 0.5);
  } else if (id === 4) {
    // 150 KM³: the sky gone black at noon — the hero stares up
    // into falling ash; a villager hurries through the murk
    heroOnRidge("nervous", 0.3, 1.4);
    out.places.push(person(cam, VILLAGER_B, -13, 0.1, -38,
      { mode: "stroll", phase: (t * 1.5) % 1, expr: "nervous", blink: lidAt(t, VILLAGER_B.i), look: 0.3 }, 1.0));
    blob(out, -13, 0.1, -38);
    card("cardAsh", ["150 KM³", "ABU!"], 0, 8, -62, 4.4, 0.5);
  } else if (id === 5) {
    // THE RE-HOOK: a pale, sick sun behind the ash veil — the
    // hero points up at the light that stopped warming the world
    out.places.push(stand(HERO, 0.7, 0.35, 8.5, "nervous", 0.35, { wave: 1 }, 1.35)); blob(out, 0.7, 0.35, 8.5, 1.35);
    card("card1816", ["TAHUN TANPA", "MUSIM PANAS"], 0, 10, -70, 4.6, 0.5);
  } else if (id === 6) {
    // SNOW IN JULY: the hero shivering in a buried northern
    // village; a farmer trudges past with empty hands
    out.places.push(stand(HERO, SNOW_HERO[0], SNOW_HERO[1], SNOW_HERO[2], "dazed", 0, {}, 1.4)); blob(out, SNOW_HERO[0], SNOW_HERO[1], SNOW_HERO[2], 1.4);
    out.places.push(stand(FARMER, SNOW_X - 3.5, 0, -36, "nervous", 0.2, {}, 1.05)); blob(out, SNOW_X - 3.5, 0, -36);
    card("cardSnow", ["SALJU DI", "JULI?!"], SNOW_X, 3, -48, 4.2, 0.5);
  } else if (id === 7) {
    // FAILED HARVEST: dead wheat to the horizon, an empty stall,
    // the farmer with nothing to sell
    out.places.push(stand(HERO, FIELD_HERO[0], FIELD_HERO[1], FIELD_HERO[2], "nervous", 0.1, {}, 1.35)); blob(out, FIELD_HERO[0], FIELD_HERO[1], FIELD_HERO[2], 1.35);
    out.places.push(stand(FARMER, FIELD_X + 7.5, 0, -46, "nervous", -0.3, {}, 1.0)); blob(out, FIELD_X + 7.5, 0, -46);
    card("cardCrop", ["PANEN", "GAGAL!"], FIELD_X, 3, -50, 4.2, 0.5);
  } else if (id === 8) {
    // THE BICYCLE IS BORN: the hero strides beside Drais' wooden
    // draisine, pushing it along the field path — no horse needed
    const hz = -16 - U * 16;
    out.places.push(person(cam, HERO, FIELD_X - 1.6, 0.05, hz,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, HERO.i), look: 0.15 }, 1.25));
    blob(out, FIELD_X - 1.6, 0.05, hz, 1.25);
    out.fx.push({ key: "draisine", cw: 512, ch: 320, draw: drawDraisine, x: FIELD_X + 0.75, y: 0.02, z: hz + 0.15, w: 2.7, h: 1.69 });
    card("cardBike", ["SEPEDA", "LAHIR!"], FIELD_X, 2.5, hz - 2, 3.4, 0.5);
  } else if (id === 9) {
    // FRANKENSTEIN: night storm at the villa — the hero writes
    // by candlelight in the foreground while, in the villa
    // doorway behind him, something tall stands watching
    out.places.push(stand(HERO, VILLA_HERO[0], VILLA_HERO[1], VILLA_HERO[2], "stern", -0.1, {}, 1.4)); blob(out, VILLA_HERO[0], VILLA_HERO[1], VILLA_HERO[2], 1.4);
    out.fx.push({ key: "candle", cw: 128, ch: 160, draw: drawCandle, x: VILLA_HERO[0] - 1.25, y: 0.55, z: VILLA_HERO[2] + 0.3, w: 0.62, h: 0.78, soft: true });
    out.places.push(stand(SHELLEY, -5.5, 3.0, 366, "nervous", 0.2, {}, 1.1)); blob(out, -5.5, 3.0, 366, 1.1);
    out.fx.push({ key: "monster", cw: 256, ch: 320, draw: drawMonster, x: 0, y: 6.45, z: 375.1, w: 2.1, h: 2.9 });
    card("cardFrank", ["FRANKENSTEIN", "LAHIR!"], 0, 9, VILLA_Z, 4.4, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same ridge,
    // same claim, but the hero is laughing now. Loop to frame 0.
    heroOnRidge("laugh", -0.15);
    villagerVillage();
    card("cardHook2", ["DUNIA TANPA", "MUSIM PANAS?!"], 0, 8, -45, 5.0, 0.52);
  }
  return out;
};
export { FPS };
