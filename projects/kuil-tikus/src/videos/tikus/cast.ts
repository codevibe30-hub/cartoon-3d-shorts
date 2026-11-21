// The cast of the Kuil Tikus short as lit flat sprites in the 3D
// Karni Mata temple world: the hero narrator (series continuity:
// teal shirt, cream cap — here BAREFOOT, temple rules), Karni Mata
// herself, a saffron priest, two devotees and a kid — staged per
// shot around the marble courtyard. Plus the real stars: hundreds
// of CUTE stylised rats (round ears, pink noses, plump bean-world
// bodies — the shock is their NUMBER, never horror), drawn as Pen
// sprites in sit / side / beg poses, and a giant glowing Yama for
// the legend. Same pool + card machinery as the house style: one
// canvas per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. Fact cards float as ink-outlined
// boards via drawCardFit (auto-fit: text NEVER overflows the board),
// glued to the view axis so they always sit in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, KID, fxBurst, fxStars, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, clamp01, smooth, camAt, CROSS_T, WHITE_T, GLINT_T, DOOR, BOWL_A, BOWL_B, BOWL_C, HERO_SPOT, LEDGE } from "./story";
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
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
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
const fitFont = (lines: string[], maxFs: number, g: CanvasRenderingContext2D) => {
  let fs = maxFs;
  for (const ln of lines) {
    g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
    const w = g.measureText(ln).width;
    if (w > 396) fs = Math.floor(fs * (396 / w));
  }
  return fs;
};
export const drawCardFit = (lines: string[], bg: string, fg: string, maxFs = 120) => (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.roundRect(10, 10, 492, 236, 26);
  g.fillStyle = bg; g.fill();
  g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const fs = fitFont(lines, maxFs, g);
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  if (lines.length === 1) g.fillText(lines[0], 256, 132);
  else { g.fillText(lines[0], 256, 82); g.fillText(lines[1], 256, 182); }
};

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
// His "boots" are skin-toned: in this temple everyone is BAREFOOT.
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#eec39b", hat: "cap", cap: "#f2ede2" }, okey: "tikusHero" };
// KARNI MATA: the saint — deep-red sari dress, black hair, warm skin.
const KARNI: Who = { i: 71, o: { jacket: "#8c2f39", dress: "#b8352c", pants: "#8c2f39", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "tikusKarni" };
// THE PRIEST: saffron robes, grey hair + moustache.
const PRIEST: Who = { i: 72, o: { jacket: "#e8862c", pants: "#e8e2d2", boots: "#c99067", hat: "hair", hair: "#9a958c", moustache: "#9a958c", skin: "#c99067" }, okey: "tikusPriest" };
// DEVOTEES: a woman in purple + gold, a man in teal with a cream cap.
const DEV_F: Who = { i: 73, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "tikusDevF" };
const DEV_M: Who = { i: 74, o: { jacket: "#2f5f6a", pants: "#33383e", boots: "#c99067", hat: "cap", cap: "#f2ede2", skin: "#f5c9a0" }, okey: "tikusDevM" };
// THE KID: the shared wardrobe, warm skin — the legend's stepson.
const KIDW: Who = { i: 75, o: { ...KID, skin: "#c99067", boots: "#eec39b" }, okey: "tikusKid" };

// ---------------- the rats ----------------
// Cute stylised rats in the bean-world house style: plump round
// bodies, BIG round ears with pink inners, pink noses, dot eyes, a
// long curling tail. Dark grey-brown for the 25,000; pure white for
// the sacred few. Poses: sit (front), side (profile), stand (beg).
type RatPose = "sit" | "side" | "stand";
const RAT_COL = { body: "#464c56", belly: "#6a7078", ear: "#c98f8f", nose: "#d89a9a", tail: "#a89090" };
const RAT_WHITE = { body: "#f4f0e6", belly: "#ffffff", ear: "#e5a9a9", nose: "#e08f8f", tail: "#cbb5a5" };
const drawRat = (pose: RatPose, white: boolean, ph: number) => (p: Pen) => {
  const C = white ? RAT_WHITE : RAT_COL;
  const sw = Math.sin(ph * Math.PI * 2); // tail sway / ear twitch phase
  if (pose === "side") {
    // profile, facing +x (canvas 300x200): tail curls behind, body
    // plump, head low with a pink nose, one big ear up
    p.stroke([[86, 148], [44, 128 + sw * 7], [16, 92 + sw * 10], [30, 58 + sw * 8]], 11, C.tail);
    p.ell(168, 128, 96, 56, C.body, 7);                       // body
    p.ell(178, 146, 62, 34, C.belly, 0);                      // belly patch
    p.ell(96, 168, 20, 9, C.body, 5); p.ell(216, 170, 20, 9, C.body, 5); // feet
    p.ell(252, 104, 38, 32, C.body, 7);                       // head
    p.ell(284, 112, 15, 11, C.nose, 4);                       // snout
    p.dot(292, 108, 4.5, "#8c4a4a");                          // nose tip
    p.ell(238, 74, 17, 17, C.body, 6); p.ell(238, 74, 9, 9, C.ear, 0); // ear
    p.dot(258, 100, 5, INK);                                  // eye
    p.stroke([[282, 116], [298, 110]], 2.2, INK); p.stroke([[282, 120], [298, 120]], 2.2, INK); // whiskers
  } else if (pose === "stand") {
    // on hind legs, begging (canvas 240x280): paws up at the chest
    p.stroke([[128, 252], [176, 262 + sw * 5], [206, 238 + sw * 7]], 10, C.tail);
    p.ell(120, 176, 63, 92, C.body, 7);
    p.ell(120, 196, 40, 62, C.belly, 0);
    p.ell(88, 262, 19, 9, C.body, 5); p.ell(152, 262, 19, 9, C.body, 5); // feet
    p.ell(96, 138, 13, 17, C.body, 5); p.ell(144, 138, 13, 17, C.body, 5); // begging paws
    p.ell(120, 66, 41, 37, C.body, 7);                        // head
    p.ell(86, 34, 16, 16, C.body, 6); p.ell(86, 34, 8.5, 8.5, C.ear, 0);
    p.ell(154, 34, 16, 16, C.body, 6); p.ell(154, 34, 8.5, 8.5, C.ear, 0);
    p.ell(120, 82, 15, 10, C.nose, 4); p.dot(120, 78, 4, "#8c4a4a");
    p.dot(104, 60, 5, INK); p.dot(136, 60, 5, INK);
    p.stroke([[108, 84], [90, 78]], 2.2, INK); p.stroke([[132, 84], [150, 78]], 2.2, INK);
  } else {
    // sitting front (canvas 240x240): a round furry bell with ears
    p.stroke([[52, 208], [22, 182 + sw * 6], [30, 146 + sw * 8]], 10, C.tail);
    p.ell(120, 152, 79, 84, C.body, 7);
    p.ell(120, 172, 50, 58, C.belly, 0);
    p.ell(76, 224, 21, 10, C.body, 5); p.ell(164, 224, 21, 10, C.body, 5); // feet
    p.ell(94, 168, 12, 16, C.body, 5); p.ell(146, 168, 12, 16, C.body, 5); // front paws
    p.ell(120, 74, 43, 39, C.body, 7);                        // head
    p.ell(84, 40, 17, 17, C.body, 6); p.ell(84, 40, 9, 9, C.ear, 0);
    p.ell(156, 40, 17, 17, C.body, 6); p.ell(156, 40, 9, 9, C.ear, 0);
    p.ell(120, 90, 16, 11, C.nose, 4); p.dot(120, 86, 4.2, "#8c4a4a");
    p.dot(102, 68, 5, INK); p.dot(138, 68, 5, INK);
    p.stroke([[106, 92], [86, 86]], 2.2, INK); p.stroke([[134, 92], [154, 86]], 2.2, INK);
  }
};
const RAT_SIZE: Record<RatPose, { cw: number; ch: number; w: number; h: number }> = {
  sit: { cw: 240, ch: 240, w: 0.36, h: 0.36 },
  side: { cw: 300, ch: 200, w: 0.46, h: 0.31 },
  stand: { cw: 240, ch: 280, w: 0.31, h: 0.36 },
};
const ratFx = (out: Stage, pose: RatPose, white: boolean, tt: number, seed: number,
  x: number, z: number, groundY = 0, scale = 1) => {
  const ph = q((tt * 0.8 + seed * 0.37) % 1, 3);
  const sz = RAT_SIZE[pose];
  const bob = Math.sin(tt * 2.3 + seed * 6.28) * 0.012;
  out.fx.push({
    key: `rat|${pose}|${white ? 1 : 0}|${ph}`, cw: sz.cw, ch: sz.ch, draw: drawRat(pose, white, ph),
    x, y: groundY + (sz.h * scale) / 2 + bob, z, w: sz.w * scale, h: sz.h * scale,
  });
};
/** a deterministic scatter of rats in an ellipse around (cx, cz) */
const rats = (out: Stage, tt: number, cx: number, cz: number, rx: number, rz: number,
  n: number, seedBase: number, groundY = 0, avoid?: { x: number; z: number; r: number }) => {
  for (let i = 0; i < n; i++) {
    const a = hh(i, seedBase) * Math.PI * 2, d = Math.sqrt(hh(i, seedBase + 40));
    let x = cx + Math.cos(a) * rx * d, z = cz + Math.sin(a) * rz * d;
    if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoid.r) { x = avoid.x + (x - avoid.x) * 1.9; z = avoid.z + (z - avoid.z) * 1.9; }
    const pose: RatPose = hh(i, seedBase + 80) < 0.45 ? "sit" : hh(i, seedBase + 80) < 0.85 ? "side" : "stand";
    ratFx(out, pose, false, tt, i * 1.7 + seedBase, x, z, groundY, 0.8 + hh(i, seedBase + 120) * 0.5);
  }
};

// ---------------- Yama, god of death ----------------
// A great glowing bust (canvas 620x760): deep teal-blue skin, a
// gold crown, stern eyes, a vast black moustache — majestic, not
// scary; he is mid-bargain, not mid-battle.
const drawYama = () => (p: Pen) => {
  const g = p.g;
  const glow = g.createRadialGradient(310, 310, 40, 310, 310, 300);
  glow.addColorStop(0, "rgba(255,208,110,0.60)"); glow.addColorStop(1, "rgba(255,208,110,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 620, 640);
  // shoulders / cloak
  p.poly([[96, 760], [128, 520], [200, 452], [420, 452], [492, 520], [524, 760]], "#22354f", 9);
  p.poly([[128, 520], [200, 452], [420, 452], [492, 520], [452, 560], [168, 560]], "#d9a441", 5);
  // neck + face
  p.ell(310, 428, 44, 40, "#33526e", 6);
  p.ell(310, 308, 108, 128, "#3d5a78", 9);
  p.ell(310, 330, 108, 104, "#46688a", 0);
  // crown: gold band + five spikes + red gem
  p.poly([[206, 196], [414, 196], [404, 148], [216, 148]], "#d9a441", 7);
  for (const [sx, sy] of [[226, 108], [268, 84], [310, 72], [352, 84], [394, 108]] as const)
    p.poly([[sx - 17, 152], [sx + 17, 152], [sx, sy]], "#e8bc55", 6);
  p.dot(310, 172, 13, "#c8352c"); p.dot(310, 172, 6, "#ffb35c");
  // earrings
  p.dot(198, 348, 10, "#d9a441"); p.dot(422, 348, 10, "#d9a441");
  // stern eyes under heavy brows, looking DOWN at the mortal
  p.stroke([[248, 282], [282, 276]], 13, "#14100e"); p.stroke([[338, 276], [372, 282]], 13, "#14100e");
  p.ell(265, 302, 13, 8, "#101418", 0); p.ell(355, 302, 13, 8, "#101418", 0);
  // nose + the great moustache + frown
  p.stroke([[310, 316], [302, 348], [312, 354]], 6, "#2c435c");
  p.stroke([[310, 372], [262, 366], [228, 382]], 17, "#14100e");
  p.stroke([[310, 372], [358, 366], [392, 382]], 17, "#14100e");
  p.arc(310, 420, 26, 15, 200, 340, 7, "#14100e");
};

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale);
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  // axis-glued cards: placed on the camera's TRUE view axis (cam.dir)
  // so they are always centred in frame. Size scales with the card's
  // distance so the board spans a fixed share of the frame WIDTH.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60) => {
    let x: number, y: number, z: number, d: number;
    if (cam.dir) {
      const distT = cam.pos.distanceTo(tmp.set(tx, ty, tz)) * frac;
      // FIT GUARD: clamp the vertical offset so the whole card —
      // centre offset plus its half height — stays inside the
      // shot's real vertical FOV (a fixed `up` overshoots the top
      // of frame whenever the card sits close to the camera).
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
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2);
  };
  const S0 = (i: number) => L[i] / FPS;

  if (id === 1) {
    // HOOK = CLICKBAIT COVER (frame 0): the hero stands mid-court
    // in a living CARPET of rats, SHOCK face at scale 1.35, a few
    // rats begging at his feet — and the claim as one GIANT board
    // from the very first frame: "25.000 TIKUS / SUCI?!"
    out.places.push(stand(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], "shock", -0.2, {}, 1.35)); blob(out, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], 1.35);
    rats(out, tt, HERO_SPOT[0], HERO_SPOT[2], 8.5, 7.0, 64, 11, 0, { x: HERO_SPOT[0], z: HERO_SPOT[2], r: 0.8 });
    ratFx(out, "stand", false, tt, 3.1, HERO_SPOT[0] - 0.85, HERO_SPOT[2] + 0.55, 0, 1.15);
    ratFx(out, "stand", false, tt, 5.7, HERO_SPOT[0] + 0.95, HERO_SPOT[2] + 0.3, 0, 1.05);
    ratFx(out, "stand", false, tt, 8.9, 0.05, 7.45, 0, 1.35);
    ratFx(out, "sit", false, tt, 10.4, 5.6, 7.0, 0, 1.25);
    cardAerial("cardHook", drawCardFit(["25.000 TIKUS", "SUCI?!"], "#f2c018", "#1c1503", 104),
      0, 2.9, 0, 6.5, -13, 1.0, 4.4, 0.52);
  }
  if (id === 2) {
    // THE TEMPLE: the wide — hero waves from the courtyard as
    // devotees drift in; rats sun themselves across the marble
    out.places.push(stand(HERO, 0.8, 0, 9, "grin", -0.2, { wave: 1 })); blob(out, 0.8, 0, 9);
    out.places.push(stand(DEV_F, -2.4, 0, 6.5, "neutral", 0.15)); blob(out, -2.4, 0, 6.5);
    out.places.push(stand(DEV_M, 3.1, 0, 5.2, "neutral", -0.1)); blob(out, 3.1, 0, 5.2);
    rats(out, tt, 0, -2, 10, 7, 24, 23);
    cardAerial("cardTemple", drawCardFit(["KUIL KARNI MATA", "DESHNOKE"], "#274a7a", "#ffffff", 110),
      S0(1) + 0.35, 2.6, 0, 5, -13, 0.30, -0.5);
  }
  if (id === 3) {
    // THE LEGEND (GOLDEN): Karni Mata at the pond's edge, the boy
    // beside her — both gazing at the water where he will slip
    out.places.push(stand(KARNI, -14.6, 0, 2.6, "pained", -0.25)); blob(out, -14.6, 0, 2.6);
    out.places.push(stand(KIDW, -15.4, 0, 4.3, "nervous", 0.2, {}, 0.78)); blob(out, -15.4, 0, 4.3, 0.78);
    starsFx(-17.5, 3.4, -2, 1.5);
    cardAerial("cardLegend", drawCardFit(["LEGENDA", "KARNI MATA"], "#7a4a8c", "#ffffff", 104),
      S0(2) + 0.35, 2.6, -17, 2.2, 2, 0.34, 1.6, 0.58);
  }
  if (id === 4) {
    // THE PLEA (GOLDEN): Yama rises huge and glowing behind the
    // pond; Karni KNEELS at the edge, pleading; the boy hides
    // behind her. (He refuses first — the deal lands next shot.)
    out.fx.push({ key: "yama", cw: 620, ch: 760, draw: drawYama(), x: -20.5, y: 3.6, z: -2.5, w: 7.6, h: 9.3, soft: true });
    out.places.push(stand(KARNI, -14.8, 0, 2.2, "nervous", -0.2, { mode: "sit" })); blob(out, -14.8, 0, 2.2);
    out.places.push(stand(KIDW, -15.8, 0, 3.9, "nervous", 0.25, {}, 0.78)); blob(out, -15.8, 0, 3.9, 0.78);
    cardAerial("cardYama", drawCardFit(["MEMOHON KE", "YAMA!"], "#22354f", "#ffd98a", 104),
      S0(3) + 0.4, 2.6, -18.8, 3.4, 0, 0.36, 1.5, 0.58);
  }
  if (id === 5) {
    // REBORN: on the sanctum steps Karni beams as the FIRST rats
    // gather at her feet — the clan, come home in small grey form
    out.places.push(stand(KARNI, 0, 0.9, -11.7, "smile_closed", 0)); blob(out, 0, 0.9, -11.7);
    out.places.push(stand(DEV_F, -2.1, 0.9, -11.1, "grin", 0.15)); blob(out, -2.1, 0.9, -11.1);
    out.places.push(stand(DEV_M, 2.2, 0.9, -11.2, "grin", -0.15)); blob(out, 2.2, 0.9, -11.2);
    rats(out, tt, 0, -10.6, 3.4, 1.6, 9, 37, 0.55);
    ratFx(out, "stand", false, tt, 8.2, 0.75, -11.3, 0.9, 1.1);
    cardAerial("cardReborn", drawCardFit(["LAHIR KEMBALI", "JADI TIKUS!"], "#1e7a46", "#ffffff", 104),
      S0(4) + 0.35, 2.6, DOOR[0], DOOR[1] + 1, DOOR[2], 0.40, 1.2, 0.58);
  }
  if (id === 6) {
    // RE-HOOK — FAMILY: the priest ladles milk at the great bowl
    // while the swarm presses in; the hero watches, delighted.
    // Nobody shoos a single rat: they are family, mid-reincarnation
    out.places.push(stand(PRIEST, 3.1, 0, -4.4, "smile_closed", 0.2)); blob(out, 3.1, 0, -4.4);
    out.places.push(stand(HERO, 5.9, 0, -3.1, "grin", -0.3)); blob(out, 5.9, 0, -3.1);
    rats(out, tt, BOWL_A[0], BOWL_A[2], 2.6, 2.2, 20, 41, 0, { x: BOWL_A[0], z: BOWL_A[2], r: 1.05 });
    cardAerial("cardFamily", drawCardFit(["MEREKA KELUARGA", "YANG REINKARNASI!"], "#b8352c", "#ffffff", 92),
      S0(5) + 0.35, 2.6, BOWL_A[0], 0.8, BOWL_A[2], 0.38, 1.3, 0.58);
  }
  if (id === 7) {
    // BAREFOOT BLESSING: floor level. The hero tiptoes through the
    // carpet, nervous — a rat DARTS over his bare foot (CROSS_T) —
    // shock! — then pure relief: it is a BLESSING here
    const u = (tt - (CROSS_T - 0.7)) / 1.3;
    const expr: Expr = tt < CROSS_T - 0.05 ? "nervous" : tt < CROSS_T + 0.55 ? "shock" : "relief_open";
    out.places.push(stand(HERO, 0.6, 0, 0.6, expr, -0.15, {}, 1.12)); blob(out, 0.6, 0, 0.6, 1.12);
    rats(out, tt, -0.6, -1.8, 4.6, 3.4, 16, 53, 0, { x: 0.6, z: 0.6, r: 0.8 });
    if (u >= 0 && u <= 1) {
      const rx = -2.3 + 5.4 * u, rz = 1.15 - 0.85 * u;
      const sz = RAT_SIZE.side;
      out.fx.push({
        key: `rat|side|0|${q((tt * 7) % 1, 6)}`, cw: sz.cw, ch: sz.ch, draw: drawRat("side", false, q((tt * 7) % 1, 6)),
        x: rx, y: sz.h / 2 + Math.abs(Math.sin(u * Math.PI * 5)) * 0.03, z: rz, w: sz.w * 1.1, h: sz.h * 1.1,
      });
    }
    cardAerial("cardBless", drawCardFit(["LARI LEWAT KAKI", "= BERKAH!"], "#0e5a54", "#ffffff", 100),
      CROSS_T + 0.45, 2.4, 0.4, 0.6, 0, 0.42, 1.1, 0.58);
  }
  if (id === 8) {
    // PRASAD: the devotee sits cross-legged with her plate, eating
    // what the rats nibbled — gladly. The hero tastes his, licking
    // his lips; rats queue politely at the bowls
    out.places.push(stand(DEV_F, 3.6, 0, 1.8, "smile_closed", 0.1, { mode: "sit" })); blob(out, 3.6, 0, 1.8);
    out.places.push(stand(HERO, 5.6, 0, 3.4, "lick", -0.25)); blob(out, 5.6, 0, 3.4);
    rats(out, tt, BOWL_C[0], BOWL_C[2], 2.4, 2.0, 10, 61, 0, { x: BOWL_C[0], z: BOWL_C[2], r: 1.0 });
    rats(out, tt, BOWL_B[0], BOWL_B[2], 2.2, 1.8, 7, 67, 0, { x: BOWL_B[0], z: BOWL_B[2], r: 1.0 });
    cardAerial("cardPrasad", drawCardFit(["BEKAS GIGITAN", "= BERKAH?!"], "#c96a1e", "#ffffff", 104),
      S0(7) + 0.35, 2.6, 3.4, 0.8, 0, 0.38, 1.3, 0.58);
  }
  if (id === 9) {
    // THE WHITE RAT (GOLDEN): devotees scan the colonnade shadows.
    // At WHITE_T the rarest sight in the temple steps onto the
    // marble ledge — Karni Mata herself, they say. Sparkles.
    out.places.push(stand(HERO, -3.6, 0, 0.9, tt < WHITE_T ? "neutral" : "shock", -0.2, tt < WHITE_T ? {} : { wave: 1 }, 1.05)); blob(out, -3.6, 0, 0.9, 1.05);
    out.places.push(stand(DEV_M, -0.7, 0, -3.2, "neutral", 0.3)); blob(out, -0.7, 0, -3.2);
    out.places.push(stand(DEV_F, -5.1, 0, -3.8, "neutral", -0.25)); blob(out, -5.1, 0, -3.8);
    rats(out, tt, -3.4, -4.6, 4.2, 2.2, 9, 71);
    if (tt < WHITE_T) ratFx(out, "sit", false, tt, 4.4, LEDGE[0], LEDGE[2], LEDGE[1], 1.0);
    if (tt >= WHITE_T) {
      ratFx(out, "stand", true, tt, 9.9, LEDGE[0], LEDGE[2], LEDGE[1], 1.25);
      starsFx(LEDGE[0], LEDGE[1] + 0.75, LEDGE[2], 1.5);
    }
    cardAerial("cardWhite", drawCardFit(["TIKUS PUTIH!", "HOKI SEUMUR HIDUP!"], "#f2ede2", "#8a6d1f", 88),
      WHITE_T + 0.15, 2.6, LEDGE[0], LEDGE[1], LEDGE[2], 0.40, 1.2, 0.58);
  }
  if (id === 10) {
    // PUNCHLINE: the wide again — the silver doors GLINT, the
    // carpet ripples in the foreground, and the hero laughs under
    // the payoff card: 25,000 rats, zero plague
    out.places.push(stand(HERO, 1.6, 0, 6.5, "laugh", -0.15, {}, 1.2)); blob(out, 1.6, 0, 6.5, 1.2);
    out.places.push(stand(PRIEST, -2.8, 0, 4.6, "grin", 0.2)); blob(out, -2.8, 0, 4.6);
    rats(out, tt, 0, 1.5, 9, 5.5, 28, 83, 0, { x: 1.6, z: 6.5, r: 0.9 });
    burstFx(GLINT_T, 0.8, 0, 3.4, -13.2, 1.6);
    cardAerial("cardFinal", drawCardFit(["25.000 TIKUS", "NOL WABAH!"], "#f2c018", "#1c1503", 104),
      S0(9) + 0.3, 2.7, 0, 6.5, -13, 1.0, 4.4, 0.52);
  }
  return out;
};
export { FPS };
