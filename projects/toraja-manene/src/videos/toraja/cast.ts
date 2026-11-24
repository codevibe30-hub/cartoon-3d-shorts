// The cast of the Toraja Ma'Nene cover frame as lit flat sprites
// in the 3D world: the series hero narrator (teal shirt, cream
// cap) standing BESIDE the open Patane coffin as the family lifts
// the ancestor out, the Toraja family in red-and-black woven
// cloth, and the ANCESTOR himself — seated, eyes closed, serene
// — in old faded clothes first, then dressed in a dark suit with
// tie and sunglasses for the family gathering. HOOK RULE
// (Baginda Raja, 24 Nov — VVSA 62% vs 70% breakout): the ANCESTOR
// himself is the star of frame 0 — big, already rising out of
// the coffin from the first frame — the hero reacts beside the
// Patane and never covers him. Same pool + card machinery as the
// house style: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs. The claim
// card floats as an ink-outlined board via drawCardFit (auto-fit:
// text NEVER overflows the board), glued to the view axis so it
// always sits in frame. TONE: this is a real funeral ritual —
// respect it. The humour is only in how unbelievable the
// tradition sounds, never mocking the dead, the ancestors, or
// the family.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, INK, headBlob,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, PATANE_SPOT, ancestorAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "torajaHero" };
// FAMILY_A: the elder — white hair, red woven sash, the one who
// knows every step of the ritual by heart.
const FAMILY_A: Who = { i: 71, o: { jacket: "#6a4a2c", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#e8e0d0", skin: "#c99067", sash: "#a83232" }, okey: "torajaElder" };
// FAMILY_B: the mother — red dress, gold sash, the one who
// dresses the ancestor with such care.
const FAMILY_B: Who = { i: 72, o: { jacket: "#a83232", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "torajaMother" };
// FAMILY_C: the young man — black jacket, red cap, gold sash,
// strong arms for the carrying.
const FAMILY_C: Who = { i: 73, o: { jacket: "#1d1d1d", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#a83232", sash: "#d9a441" }, okey: "torajaYoung" };
// FAMILY_D: the child — small, wide-eyed, holding flowers for
// the great-grandfather she never met.
const FAMILY_D: Who = { i: 74, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1d1410", build: "kid" }, okey: "torajaChild" };

// ---------------- the ancestor ----------------
// The ancestor: seated, eyes CLOSED (blink: 1 — serene, at
// rest), head slightly bowed when in his old clothes. DRESSED
// (the family gathering): dark suit, white shirt V, dark-red
// tie with a gold brooch, sunglasses — the way the family
// remembers him, sharp and proud. OLD (the lifting): faded
// brown-grey clothes, no tie, no sunglasses.
// NEVER a joke figure: no grin, no wave, no silly props.
// mode: "sit" (lifted / carried / seated) or "stand" (shot 5 —
// dressed upright for the family). pitch leans him forward
// as he rises, easing upright (story.ancestorAt).
// OVERLAY GEOMETRY: the tie + sunglasses are computed from the
// SAME head/body measures bodyFront uses (adult build: torso
// 1.1, legs 1.4, head a=118, seed 3) — NOT from fixed canvas
// numbers, because "sit" and "stand" put the face ~250 units
// apart (fixed numbers put the sunglasses on the chest in
// stand mode — caught in stills review).
const ancestorPlace = (cam: CamInfo, x: number, y: number, z: number, dressed: boolean, scale = 1, mode: "sit" | "stand" = "sit", pitch = 0): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const light = light2D(cam, false);
  const o: Outfit = dressed
    ? { jacket: "#2a2a30", pants: "#23232a", boots: "#1a1a1a", hat: "hair", hair: "#9a9a9a", skin: "#b08d68" }
    : { jacket: "#6a5a4a", pants: "#4a3a2a", boots: "#3a2a1a", hat: "hair", hair: "#9a9a9a", skin: "#b08d68" };
  const key = `A|${dressed ? "dressed" : "old"}|${mode}|${w}x${h}|${q(light, 24)}`;
  return {
    key, x, y, z, scale, pitch, size: [w, h, k],
    draw: (p) => {
      bodyFront(p, o, { mode, expr: "neutral", blink: 1, light, seed: 3, headTilt: dressed ? 0 : 0.12 });
      if (dressed) {
        // face centre + chest, same measures as bodyFront (adult)
        const H = headBlob(3, 118, 0), HH = 2 * H.b;
        const torsoBot = mode === "sit" ? 975 - 0.2 * HH : 975 - 1.4 * HH;
        const chin = torsoBot - 1.1 * HH, hc = chin - H.b;
        // white shirt V at the collar, dark-red tie, gold brooch
        p.poly([[284, chin + 5], [316, chin + 5], [300, chin + 50]], "#f2ede2", 2);
        p.poly([[289, chin + 12], [311, chin + 12], [306, chin + 38], [294, chin + 38]], "#7a1e1e", 1.5);
        p.poly([[294, chin + 38], [306, chin + 38], [310, chin + 112], [300, chin + 175], [290, chin + 112]], "#7a1e1e", 1.5);
        p.dot(300, chin + 12, 4, "#d9a441");
        // sunglasses: dark lenses over the closed eyes + bridge
        p.ell(248, hc, 34, 22, "#141414", 2.5);
        p.ell(352, hc, 34, 22, "#141414", 2.5);
        p.band([[282, hc], [318, hc]], "#141414", 5, 1.5, "round");
      }
    },
  };
};

// ---------------- episode props (drawn, never pasted) ----------------
/** An offering basket (256x256): a woven rattan basket with
 *  red, yellow and white flowers heaped inside — what the child
 *  carries for the great-grandfather she never met. */
export const drawBasket = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#a8793f";
  g.beginPath(); g.ellipse(128, 178, 92, 58, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(60,40,16,0.5)"; g.lineWidth = 4;
  for (let i = -2; i <= 2; i++) {
    g.beginPath(); g.moveTo(128 + i * 30, 124); g.quadraticCurveTo(128 + i * 34, 178, 128 + i * 28, 232); g.stroke();
  }
  g.strokeStyle = INK; g.lineWidth = 6;
  g.beginPath(); g.ellipse(128, 178, 92, 58, 0, 0, 7); g.stroke();
  const cols = ["#e8542e", "#e8c832", "#f2f0e6", "#d83a4a", "#e86a9a"];
  const rs = rng(44);
  for (let i = 0; i < 14; i++) {
    const fx = 60 + rs() * 136, fy = 84 + rs() * 52;
    g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.arc(fx, fy, 12 + rs() * 8, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.4)";
    g.beginPath(); g.arc(fx - 4, fy - 4, 4, 0, 7); g.fill();
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
  // the hero standing beside the Patane (HERO_SPOT = shot-1 spot)
  const heroAt = (x: number, y: number, z: number, expr: Expr, look = 0, scale = 1.35) => {
    out.places.push(stand(HERO, x, y, z, expr, look, {}, scale));
    blob(out, x, y, z, scale);
  };
  // a family member at work: arm raised, brushing / adjusting
  const familyWork = (who: Who, x: number, z: number, wave: number, scale = 1.0) => {
    out.places.push(stand(who, x, 0, z, "grin", 0, { wave }, scale));
    blob(out, x, 0, z, scale);
  };
  // the ancestor, placed from story.ancestorAt — the lift height
  // (y) and lean (pitch) live in one place (story.ts); the BASE
  // spot is per-shot: the Patane coffin (1, 8, 10), the low bier
  // beside it (4), standing dressed IN FRONT of the coffin's
  // leaning lid (5 — the lid hides anyone standing behind it),
  // held HIGH among the family (6), seated at the Tongkonan
  // porch (7), resting at the cliff base (9)
  const ancestor = (dressed: boolean, scale = 1.15) => {
    const anc = ancestorAt(id, t);
    const base: [number, number, number, "sit" | "stand"] =
      id === 4 ? [2.6, 0.53, -3.6, "sit"] :
      id === 5 ? [0, 0, -2.4, "stand"] :
      id === 6 ? [0, 0.25, -8, "sit"] :
      id === 7 ? [-11, 0, -2, "sit"] :
      id === 9 ? [-3.5, 0, -17, "sit"] : // off-axis: directly behind the Patane he is hidden by the coffin from the shot-9 camera
      [PATANE_SPOT[0], PATANE_SPOT[1], PATANE_SPOT[2], "sit"];
    const [bx, by, bz, mode] = base;
    out.places.push(ancestorPlace(cam, bx, by + anc.y, bz, dressed, scale, mode, anc.pitch));
    blob(out, bx, 0, bz, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);

  if (id === 1) {
    // THE COVER / HOOK (frame 0): the ANCESTOR himself rises out
    // of the open Patane — big, already moving from the first
    // frame, old faded clothes, eyes closed, serene. The hero BIG
    // beside the coffin, shocked, reacting to him, never covering
    // him. The elder and the mother lift him out, joyful. Motion
    // from frame 0.
    ancestor(false, 1.25);
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "shock", -0.3, 1.25);
    out.places.push(stand(FAMILY_A, -1.5, 0, -3.2, "grin", 0.2, { wave: 0.7 }, 1.0)); blob(out, -1.5, 0, -3.2);
    out.places.push(stand(FAMILY_B, -1.0, 0, -5.4, "grin", -0.2, { wave: 0.7 }, 1.0)); blob(out, -1.0, 0, -5.4);
    card("cardHook", ["JENAZAH GANTI", "BAJU?!"], 0, 2.5, -4, 4.5, 0.60);
  } else if (id === 2) {
    // THE NAME: high wide over the clearing — the hero small,
    // strolling toward the cliff between the Tongkonan houses,
    // the family gathered at the Patane behind him
    const hz = -10 - U * 8;
    out.places.push(person(cam, HERO, 0.5, 0, hz,
      { mode: "stroll", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, HERO.i), look: 0 }, 1.0));
    blob(out, 0.5, 0, hz);
    out.places.push(stand(FAMILY_A, -2.4, 0, -3.2, "grin", 0.2, {}, 1.0)); blob(out, -2.4, 0, -3.2);
    out.places.push(stand(FAMILY_B, -1.6, 0, -5.4, "grin", -0.2, {}, 1.0)); blob(out, -1.6, 0, -5.4);
    out.places.push(stand(FAMILY_C, 2.6, 0, -5.0, "grin", 0, {}, 1.0)); blob(out, 2.6, 0, -5.0);
    card("cardName", ["MA'NENE", "TORAJA!"], 0, 2, -40, 4.2, 0.5);
  } else if (id === 3) {
    // THE COUNT: at the foot of the Lemo cliff — the family
    // looking UP at the niches, counting the generations; the
    // Tau-Tau effigies watch from their ledge above. The hero
    // stays small and off to the side so the cliff face reads.
    heroAt(2.5, 0, -10, "grin", 0.15, 1.0);
    out.places.push(stand(FAMILY_A, -6, 0, -18, "neutral", 0, { headTilt: -0.12 }, 1.0)); blob(out, -6, 0, -18);
    out.places.push(stand(FAMILY_B, 0, 0, -19, "neutral", 0, { headTilt: -0.12 }, 1.0)); blob(out, 0, 0, -19);
    out.places.push(stand(FAMILY_C, 6, 0, -18, "neutral", 0, { headTilt: -0.12 }, 1.0)); blob(out, 6, 0, -18);
    card("cardCount", ["MAKAM", "TEBING!"], 0, 6, -20, 4.2, 0.52);
  } else if (id === 4) {
    // THE BRUSHING: the ancestor seated on the low bier, the
    // mother and the young man gently brushing him clean — the
    // care is the point, not the shock
    ancestor(false, 1.1);
    const wv = 0.35 + 0.35 * Math.sin(t * 6);
    familyWork(FAMILY_B, 3.8, -4.4, wv, 1.0);
    familyWork(FAMILY_C, 2.3, -4.6, 1 - wv, 1.0);
    card("cardBrush", ["DIBERSIHIN", "DULU!"], 2.6, 2.2, -3.6, 4.2, 0.5);
  } else if (id === 5) {
    // THE DRESSING: the ancestor in his NEW clothes — dark suit,
    // tie, sunglasses — seated at the Patane's edge while the
    // elder and the mother adjust his jacket with pride
    ancestor(true, 1.15);
    familyWork(FAMILY_A, -1.1, -2.8, 0.5, 1.0);
    familyWork(FAMILY_B, 1.1, -2.8, 0.6, 1.0);
    card("cardDress", ["PAKAI JAS", "BARU!"], 0, 2.5, -3.2, 4.4, 0.52);
  } else if (id === 6) {
    // THE PROCESSION: the ancestor carried high through the
    // clearing — the young man and the elder march him along the
    // path toward the cliff, the whole family following
    ancestor(true, 1.15);
    const cz = -8 - U * 4;
    out.places.push(person(cam, FAMILY_C, -1.7, 0, cz,
      { mode: "march", phase: (t * 1.35) % 1, expr: "grin", blink: lidAt(t, FAMILY_C.i), look: 0 }, 1.0));
    blob(out, -1.7, 0, cz);
    out.places.push(person(cam, FAMILY_A, 1.7, 0, cz,
      { mode: "march", phase: (t * 1.35 + 0.5) % 1, expr: "grin", blink: lidAt(t, FAMILY_A.i), look: 0 }, 1.0));
    blob(out, 1.7, 0, cz);
    out.places.push(stand(FAMILY_B, 2.8, 0, cz + 2.5, "grin", 0, {}, 1.0)); blob(out, 2.8, 0, cz + 2.5);
    card("cardCarry", ["10 GENERASI", "HADIR!"], 0, 2.5, -10, 4.4, 0.52);
  } else if (id === 7) {
    // THE TONGKONAN GATHERING: the family gathered on the porch
    // of the saddle-roof house — the dressed ancestor seated
    // among them, the hero among the family. This is a reunion,
    // not a funeral: death is not the end of the relationship.
    ancestor(true, 1.15);
    out.places.push(stand(FAMILY_A, -11.5, 0, -4, "grin", 0.2, {}, 1.0)); blob(out, -11.5, 0, -4);
    out.places.push(stand(FAMILY_B, -10, 0, -3.5, "grin", -0.2, {}, 1.0)); blob(out, -10, 0, -3.5);
    out.places.push(stand(FAMILY_C, -12, 0, -0.5, "grin", 0, {}, 1.0)); blob(out, -12, 0, -0.5);
    heroAt(-9.5, 0, 0.5, "grin", 0, 1.1);
    card("cardReunion", ["REUNI", "KELUARGA!"], -13, 2, -2, 4.2, 0.52);
  } else if (id === 8) {
    // THE NUMBERS: wide on the Lemo cliff — niches + Tau-Tau
    // rows, the hero small below, grinning at the camera —
    // seventy-five hand-carved tombs from the 16th century.
    // The hero stands IN FRONT of the Patane (0,0,-2): behind
    // the coffin he is hidden from this camera.
    heroAt(0, 0, -2, "grin", 0, 1.25);
    out.places.push(stand(FAMILY_A, -2.5, 0, -8, "grin", 0.2, {}, 1.0)); blob(out, -2.5, 0, -8);
    out.places.push(stand(FAMILY_B, 2.5, 0, -8, "grin", -0.2, {}, 1.0)); blob(out, 2.5, 0, -8);
    card("cardYears", ["75 MAKAM", "TEBING!"], 0, 8, -22, 4.4, 0.52);
  } else if (id === 9) {
    // THE TWIST: low-angle up the cliff — the highest tombs
    // against the sky, the dressed ancestor resting at the cliff
    // base among his family. They believe he is still HERE.
    ancestor(true, 1.15);
    out.places.push(stand(FAMILY_A, -2.6, 0, -15, "grin", 0.2, {}, 1.0)); blob(out, -2.6, 0, -15);
    out.places.push(stand(FAMILY_B, 2.6, 0, -15, "grin", -0.2, {}, 1.0)); blob(out, 2.6, 0, -15);
    heroAt(0, 0, -12, "grin", 0, 1.2);
    card("cardTwist", ["MAKIN TINGGI", "STATUSNYA!"], 0, 10, -22, 4.4, 0.52);
  } else if (id === 10) {
    // THE PUNCHLINE: the family photo — the ancestor, dressed
    // sharp in his suit and sunglasses, seated in the middle of
    // his family like he never left. The child holds her basket
    // of flowers for the great-grandfather she never met.
    ancestor(true, 1.25);
    heroAt(HERO_SPOT[0], 0, HERO_SPOT[2], "grin", -0.2, 1.25);
    out.places.push(stand(FAMILY_A, -1.5, 0, -3.2, "grin", 0.2, {}, 1.0)); blob(out, -1.5, 0, -3.2);
    out.places.push(stand(FAMILY_B, -0.9, 0, -5.2, "grin", -0.2, {}, 1.0)); blob(out, -0.9, 0, -5.2);
    out.places.push(stand(FAMILY_C, 1.9, 0, -3.2, "grin", 0, {}, 1.0)); blob(out, 1.9, 0, -3.2);
    out.places.push(stand(FAMILY_D, -0.5, 0, -2.2, "grin", 0.2, {}, 0.85)); blob(out, -0.5, 0, -2.2, 0.85);
    out.fx.push({ key: "basket", cw: 256, ch: 256, draw: drawBasket, x: -0.5, y: 0.5, z: -1.7, w: 0.55, h: 0.55 });
    card("cardPhoto", ["FOTO", "BARENG?!"], 0, 2.5, -4, 4.5, 0.55);
  }
  return out;
};
