// The cast of the Jembatan Akar (Titian Aka) short as lit
// flat sprites in the 3D world: the series hero narrator
// (teal shirt, cream cap) crossing a LIVING bridge of woven
// banyan roots, Pakiah Sokan the bridge's planter (shot 4),
// two local villagers, and the giant claim cards. Same pool
// + card machinery as the house style: one canvas per
// distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as
// an ink-outlined board via drawCardFit (auto-fit: text
// NEVER overflows the board), glued to the view axis so it
// always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxSplash, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, BANK_Y, TREE_A, TREE_B, NAME_BOARD, deckYAt, heroWalkAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "akarHero" };
// PAKIAH SOKAN: the bridge's planter — cream shirt, dark peci (shot 4).
const PAKIAH: Who = { i: 71, o: { jacket: "#f0e8d8", pants: "#4a3b2c", boots: "#5a3b2a", hat: "cap", cap: "#26221e" }, okey: "akarPakiah" };
// LOCALS: Minangkabau villagers who cross the bridge daily.
const VILLAGER_A: Who = { i: 61, o: { jacket: "#2e8a5a", pants: "#5a3b2a", boots: "#5a3b2a", hat: "cap", cap: "#d8402e" }, okey: "akarVillagerA" };
const VILLAGER_B: Who = { i: 62, o: { jacket: "#b8402e", dress: "#e8b83a", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#8a5a34" }, okey: "akarVillagerB" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A hand-drawn SLIPPERY warning sign (256x320): post and a
 *  yellow triangle with a slipping figure — the bridge's one
 *  honest warning (shot 9). */
export const drawSlipSign = (p: Pen) => {
  p.poly([[118, 210], [138, 210], [138, 316], [118, 316]], "#6a4a2c", 6);
  p.poly([[128, 18], [238, 200], [18, 200]], "#f2c018", 7);
  // the slipping figure: head, flailing body, skid lines
  p.ell(150, 96, 15, 15, "#1c1503", 0);
  p.line([[146, 112], [118, 148]], "#1c1503", 11, false);
  p.line([[118, 148], [88, 142]], "#1c1503", 10, false);
  p.line([[118, 148], [140, 168]], "#1c1503", 10, false);
  p.line([[146, 116], [178, 100]], "#1c1503", 9, false);
  p.line([[142, 118], [168, 136]], "#1c1503", 9, false);
  p.line([[66, 168], [104, 168]], "#1c1503", 6, false);
  p.line([[58, 182], [96, 182]], "#1c1503", 6, false);
};

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale);
  const standBlob = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) => {
    out.places.push(stand(who, x, y, z, expr, look, extra, scale));
    blob(out, x, y, z, scale);
  };
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number, soft = false) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h, soft });
  };
  // axis-glued cards: placed on the camera's TRUE view axis (cam.dir)
  // so they are always centred in frame, whole board inside the FOV.
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
  void U;
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);

  if (id === 1) {
    // THE COVER (frame 0): the LIVING root bridge itself fills
    // the frame — roots creeping at mid-span, the river racing
    // below — the hero SHOCKED on the near bank at screen right,
    // never covering the bridge; claim board high.
    standBlob(HERO, 0.6, deckYAt(-7.5) + 0.12, -7.5, "shock", -0.15, {}, 1.35);
    card("cardHook", ["JEMBATANNYA", "HIDUP!"], 0, 7, -2, 5.4, 0.52);
  } else if (id === 2) {
    // THE MEASURE: the hero crosses the whole span, tiny on the
    // sagging deck — 25 metres of woven root over the gorge
    const wp = heroWalkAt(2, t);
    out.places.push(person(cam, HERO, wp.x, wp.y, wp.z,
      { mode: "stroll", phase: (t * 1.5) % 1, expr: "dazed", blink: lidAt(t, HERO.i), look: 0.2 }, 1.05));
    blob(out, wp.x, wp.y, wp.z, 1.05);
    card("cardMeasure", ["25 METER!"], 0, 7, 0, 5.6, 0.5);
  } else if (id === 3) {
    // THE TWINS: two banyans facing off across the river, the
    // hero pointing up at the pair — roots from BOTH sides
    standBlob(HERO, 0.8, deckYAt(-8) + 0.12, -8, "grin", 0.3, { wave: 1 }, 1.15);
    card("cardTwins", ["DUA", "BERINGIN!"], TREE_B[0], 9, TREE_B[2], 5.8, 0.5);
  } else if (id === 4) {
    // 1890: Pakiah Sokan kneels by his two saplings, guiding
    // the first root along the bamboo arc — the planting
    standBlob(PAKIAH, -3.4, BANK_Y, -8.6, "relief_open", 0.25, {}, 1.1);
    card("cardPlant", ["DITANAM", "1890!"], TREE_A[0], 7, TREE_A[2], 4.6, 0.5);
  } else if (id === 5) {
    // THE LONG WAIT: roots weaving thicker over the bamboo,
    // year after year — the hero watches the span take shape
    standBlob(HERO, 0.3, deckYAt(6) + 0.12, 6, "dazed", -0.2, {}, 1.15);
    card("cardWait", ["26 TAHUN!"], 0, 7.5, 0, 5.2, 0.5);
  } else if (id === 6) {
    // FIRST CROSSING (the mid-video re-hook): the hero leads
    // two villagers across the finished bridge, through the
    // turning year ring
    const wp = heroWalkAt(6, t);
    out.places.push(person(cam, HERO, wp.x, wp.y, wp.z,
      { mode: "stroll", phase: (t * 1.5) % 1, expr: "grin", blink: lidAt(t, HERO.i), look: 0 }, 1.1));
    blob(out, wp.x, wp.y, wp.z, 1.1);
    out.places.push(person(cam, VILLAGER_A, -0.4, deckYAt(-5.2) + 0.12, -5.2,
      { mode: "stroll", phase: (t * 1.5 + 0.4) % 1, expr: "grin", blink: lidAt(t, VILLAGER_A.i), look: 0.1 }, 1.0));
    blob(out, -0.4, deckYAt(-5.2) + 0.12, -5.2);
    out.places.push(person(cam, VILLAGER_B, 0.5, deckYAt(-7.6) + 0.12, -7.6,
      { mode: "stroll", phase: (t * 1.5 + 0.7) % 1, expr: "grin", blink: lidAt(t, VILLAGER_B.i), look: -0.1 }, 1.0));
    blob(out, 0.5, deckYAt(-7.6) + 0.12, -7.6);
    card("cardCross", ["BISA", "DILEWATI!"], 0, 7.5, -2, 4.8, 0.5);
  } else if (id === 7) {
    // THE TWIST: iron rusts, concrete cracks — the hero smug
    // beside the dumped miniatures on the far bank
    standBlob(HERO, 3.4, BANK_Y, 9.6, "grin", 0.2, { wave: 1 }, 1.2);
    card("cardTwist", ["KEBALIKANNYA!"], 6.6, BANK_Y + 2, 13, 4.4, 0.5);
  } else if (id === 8) {
    // THE FLOOD: the river rises and batters the span — the
    // hero hangs on, nervous, as the living bridge flexes
    standBlob(HERO, 0.3, deckYAt(1.5) + 0.12, 1.5, "nervous", 0, { tilt: 0.07 }, 1.15);
    card("cardFlood", ["BANJIR", "BESAR!"], 0, 8, 0, 5.0, 0.5);
  } else if (id === 9) {
    // STILL CROSSING: a century on, the hero crosses with a
    // villager, slipping once on the wet roots — the sign
    // warned him
    const wp = heroWalkAt(9, t);
    const slip = U > 0.45 && U < 0.62 ? Math.sin((U - 0.45) / 0.17 * Math.PI) * 0.16 : 0;
    out.places.push(person(cam, HERO, wp.x, wp.y, wp.z,
      { mode: "stroll", phase: (t * 1.5) % 1, expr: U > 0.45 && U < 0.62 ? "nervous" : "grin", blink: lidAt(t, HERO.i), look: 0, tilt: slip }, 1.1));
    blob(out, wp.x, wp.y, wp.z, 1.1);
    out.places.push(person(cam, VILLAGER_B, 0.4, deckYAt(3.4) + 0.12, 3.4,
      { mode: "stroll", phase: (t * 1.5 + 0.5) % 1, expr: "grin", blink: lidAt(t, VILLAGER_B.i), look: -0.1 }, 1.0));
    blob(out, 0.4, deckYAt(3.4) + 0.12, 3.4);
    out.fx.push({ key: "slipSign", cw: 256, ch: 320, draw: drawSlipSign, x: 1.15, y: deckYAt(0.5) + 0.55, z: 0.5, w: 0.9, h: 1.1 });
    card("cardAge", ["100 TAHUN!"], 0, 7.5, 2, 5.2, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP (golden hour): back at the cover
    // bank — the hero LAUGHING, slapping a root cable; a
    // splash of river spray bursts where his hand lands
    standBlob(HERO, 0.6, deckYAt(-7.5) + 0.12, -7.5, "laugh", -0.15, {}, 1.35);
    const lt = tt - S0;
    if (lt > 0.25 && lt < 1.35) {
      const st3 = Math.min(2, Math.floor((lt - 0.25) / 0.37));
      out.fx.push({ key: `splash${st3}`, cw: 256, ch: 256, draw: (p) => fxSplash(p, 0.15 + st3 * 0.3), x: 1.4, y: deckYAt(-4) + 0.4, z: -4, w: 1.5, h: 1.5, soft: true });
    }
    card("cardStrong", ["MAKIN", "KUAT!"], 0, 7, -2, 5.2, 0.52);
  }
  return out;
};
export { FPS };
