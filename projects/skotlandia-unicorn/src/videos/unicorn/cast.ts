// The cast of the Unicorn / Scotland short as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap),
// a giant white unicorn with a golden spiral horn (the national
// animal that never existed), a golden English lion, a Scottish
// king, a knight with the unicorn banner, English redcoats, and
// the giant claim card. Same pool + card machinery as the house
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
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, UNI_SPOT, POND, unicornGallop } from "./story";
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
// Wide plane for the unicorn / lion sprite: design space 900x700,
// feet at design y=700 sit on the ground.
export const UNICORN_GEO = (() => { const g = new THREE.PlaneGeometry(900 * SU, 700 * SU); g.translate(0, (700 - 350) * SU, 0); return g; })();
export const LION_GEO = UNICORN_GEO;
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "unicorn" | "lion"; roll?: number; pitch?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; dir?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
// Wide-sprite tiers (unicorn / lion, 900x700 design space).
const wideTier = (d: number): [number, number, number] =>
  d < 3.2 ? [2700, 2100, 3.0] : d < 6.5 ? [1620, 1260, 1.8] : d < 16 ? [720, 560, 0.8] : [360, 280, 0.4];

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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "unicornHero" };
// KING WILLIAM I: red royal robe, white hair, gold belt — the crown is a separate Fx above his head.
const KING: Who = { i: 51, o: { jacket: "#a02020", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#e8e0cc", belt: "#d9a441" }, okey: "unicornKing" };
// ROBERT THE BRUCE: steel-blue knight, sword at his side, banner in hand.
const BRUCE: Who = { i: 52, o: { jacket: "#5a6a7a", pants: "#3b3f52", boots: "#3a2a1a", hat: "hair", hair: "#3a2a1a", belt: "#d9a441", sword: true }, okey: "unicornBruce" };
// ENGLISH REDCOATS: red jackets, black shakos, rifles.
const REDCOAT: Who = { i: 61, o: { jacket: "#c0353a", pants: "#2e2a36", boots: "#1a1a1a", hat: "shako", belt: "#f1efe6", buttons: "#e8c45a", rifle: true }, okey: "unicornRedcoat" };

// ---------------- the unicorn (drawn, never pasted) ----------------
// Side profile on a 900x700 design canvas, head LEFT, tail RIGHT,
// feet at design y=700. White horse-like body, flowing cream mane,
// lion tail with a dark tuft, slender stag legs with dark hooves,
// and the golden SPIRAL horn — it MUST read as a unicorn at a
// glance: white horse + one gold horn, never a plain horse.
// pose: "stand" | "gallop" (legs extended, mane streaming) |
// "drink" (neck bent down, horn dipping toward the water).
// chain: the gold coronet + chain of the Scottish royal unicorn.
export type UnicornOpts = { pose?: "stand" | "gallop" | "drink"; chain?: boolean };
export const drawUnicorn = (o: UnicornOpts = {}) => (p: Pen) => {
  const g = p.g;
  const white = "#f7f5ee", shade = "#e3dcc8", dark = "#b8b0a0", gold = "#e8b92a", goldDark = "#b8860b";
  const pose = o.pose ?? "stand";
  const drink = pose === "drink", gallop = pose === "gallop";
  // LEGS: four slender legs (far pair darker). Gallop: front legs
  // reach forward, back legs kick back.
  const legAt = (x: number, far: boolean, dx = 0) => {
    const col = far ? dark : "#6a5a40";
    const top = far ? 520 : 530;
    p.poly([[x - 15, top], [x + 15, top], [x + 13 + dx, 686], [x - 13 + dx, 686]], far ? "#c9c2ae" : white, 8);
    p.poly([[x - 14 + dx, 686], [x + 14 + dx, 686], [x + 11 + dx, 698], [x - 11 + dx, 698]], col, 4);
  };
  if (gallop) {
    legAt(560, true, 70); legAt(330, true, 70);
    legAt(600, false, -90); legAt(370, false, -90);
  } else {
    legAt(560, true); legAt(330, true);
    legAt(600, false); legAt(370, false);
  }
  // TAIL: lion tail — thin, hanging, dark tuft at the end.
  // Gallop: streams back horizontally.
  if (gallop) {
    p.line([[700, 420], [800, 400], [860, 430]], "#e3dcc8", 16);
    p.ell(872, 436, 34, 22, "#8a6a2a", 8);
  } else {
    p.line([[700, 410], [760, 500], [780, 580]], "#e3dcc8", 16);
    p.ell(782, 592, 30, 42, "#8a6a2a", 8);
  }
  // BODY: big horse body + chest + rump, shaded underneath.
  p.ell(450, 430, 280, 180, white, 12);
  p.ell(450, 480, 230, 120, "#fbf9f2", 8);
  p.ell(250, 450, 110, 130, white, 10); // chest
  p.ell(640, 440, 120, 140, white, 10); // rump
  // belly shading
  g.fillStyle = "rgba(190,178,150,0.35)";
  g.beginPath(); g.ellipse(470, 540, 220, 60, 0, 0, 7); g.fill();
  // speckles on the coat
  const rs = rng(45);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(190,178,150,${0.15 + rs() * 0.25})`;
    g.beginPath(); g.arc(220 + rs() * 480, 300 + rs() * 240, 2 + rs() * 3, 0, 7); g.fill();
  }
  if (drink) {
    // NECK bent down: from shoulder (300, 380) the neck curves
    // down-left so the head dips toward the water at the left.
    p.poly([[280, 360], [200, 420], [170, 470], [230, 500], [300, 430], [330, 380]], white, 10);
    p.line([[285, 380], [215, 440]], shade, 8, false);
    // MANE along the top of the bent neck
    p.ell(250, 400, 90, 26, "#f2ead0", 8);
    p.ell(210, 440, 70, 22, "#f2ead0", 8);
    // HEAD lowered, pointing down-left toward the water
    p.ell(168, 500, 66, 52, white, 10);
    p.ell(128, 520, 32, 20, shade, 6); // muzzle
    p.poly([[140, 470], [152, 428], [176, 466]], white, 8); // ear up
    p.poly([[186, 462], [206, 424], [214, 464]], white, 8); // ear up
    p.dot(152, 492, 8); // eye
    g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(149, 489, 3, 0, 7); g.fill();
    p.dot(116, 516, 5, "#4a3426"); // nostril
    // THE HORN dips down-left into the water
    p.line([[150, 470], [96, 548]], gold, 20);
    p.line([[146, 484], [128, 500]], goldDark, 6, false);
    p.line([[132, 502], [114, 518]], goldDark, 6, false);
  } else {
    // NECK: long upright, slightly S-curved, head end at top-left
    p.poly([[270, 380], [215, 150], [255, 120], [310, 150], [330, 380]], white, 10);
    p.line([[285, 360], [245, 170]], shade, 8, false);
    // MANE: flowing cream-gold along the neck, wavy strands.
    // Gallop: streams back to the right.
    const mx = gallop ? 60 : 0;
    p.ell(300 + mx, 190, 66, 110, "#f2ead0", 8);
    p.ell(320 + mx, 280, 56, 96, "#f2ead0", 8);
    p.ell(330 + mx, 360, 44, 70, "#f2ead0", 8);
    p.line([[296 + mx, 150], [330 + mx, 320]], "#d9b45a", 5, false);
    // HEAD: horse profile pointing left, long face, ears UP
    p.ell(238, 118, 72, 58, white, 10);
    p.poly([[196, 82], [206, 28], [232, 72]], white, 8); // left ear
    p.poly([[262, 74], [282, 24], [296, 76]], white, 8); // right ear
    p.ell(196, 132, 34, 22, shade, 6); // muzzle
    p.dot(222, 104, 9); // eye
    g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(219, 100, 3, 0, 7); g.fill(); // eye glint
    p.dot(182, 128, 5, "#4a3426"); // nostril
    p.line([[186, 140], [214, 146]], "#4a3426", 5, false); // mouth
    // THE HORN: long golden spiral, up-left from the forehead.
    // Thick gold shaft + darker spiral ridges + bright glint.
    p.line([[214, 78], [138, 8]], gold, 22);
    p.line([[196, 62], [172, 44]], goldDark, 6, false);
    p.line([[176, 44], [156, 30]], goldDark, 6, false);
    p.line([[158, 26], [144, 14]], goldDark, 6, false);
    p.line([[208, 70], [150, 18]], "#fff2b8", 5, false);
  }
  if (o.chain) {
    // Gold coronet + chain around the neck: a band at the neck
    // base with a dangling chain loop and a small medallion.
    const ny = drink ? 430 : 300;
    p.line([[268, ny - 40], [330, ny - 10], [336, ny + 60]], gold, 10);
    for (const [cx, cy] of [[276, ny - 30], [292, ny - 14], [310, ny + 2], [324, ny + 22], [332, ny + 44]] as [number, number][]) {
      p.dot(cx, cy, 7, goldDark);
    }
    p.dot(336, ny + 78, 12, gold);
    p.dot(336, ny + 78, 6, "#c0353a");
  }
};

// ---------------- the English lion (drawn, never pasted) ----------------
// Side profile on a 900x700 design canvas, head LEFT, feet at
// design y=700. Golden body, huge dark-gold mane, tufted tail —
// it MUST read as a lion at a glance: mane + tuft, never a dog.
export const drawLion = (p: Pen) => {
  const g = p.g;
  const gold = "#d9a441", goldDark = "#b8860b", mane = "#8a5a1a", maneLite = "#b08030";
  // LEGS: four sturdy legs
  const legAt = (x: number, far: boolean) => {
    p.poly([[x - 18, 530], [x + 18, 530], [x + 15, 686], [x - 15, 686]], far ? "#a87820" : gold, 8);
    p.poly([[x - 19, 686], [x + 19, 686], [x + 14, 698], [x - 14, 698]], "#6a4a10", 4);
  };
  legAt(560, true); legAt(330, true);
  legAt(600, false); legAt(370, false);
  // TAIL: long, curling up, dark tuft at the end
  p.line([[700, 420], [790, 480], [830, 400]], gold, 16);
  p.ell(836, 384, 30, 40, "#4a3426", 8);
  // BODY
  p.ell(480, 450, 260, 170, gold, 12);
  p.ell(480, 500, 210, 110, "#e8c878", 8);
  // MANE: huge dark-gold ring around the head
  p.ell(250, 210, 150, 160, mane, 10);
  p.ell(250, 210, 118, 128, maneLite, 8);
  const rs = rng(31);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(60,40,10,${0.15 + rs() * 0.3})`;
    g.beginPath(); g.arc(140 + rs() * 220, 80 + rs() * 260, 2 + rs() * 4, 0, 7); g.fill();
  }
  // FACE: tan, pointing left, small round ears
  p.ell(225, 220, 78, 64, "#e8c878", 10);
  p.ell(190, 158, 26, 22, "#e8c878", 8); // ear
  p.ell(196, 240, 36, 24, "#d9b45a", 6); // muzzle
  p.dot(210, 206, 9); // eye
  g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(207, 202, 3, 0, 7); g.fill();
  p.dot(176, 236, 6, "#4a3426"); // nose
  p.line([[180, 250], [208, 256]], "#4a3426", 5, false); // mouth
};

// ---------------- heraldic props (drawn, never pasted) ----------------
/** A heraldic shield (512x512): "royal" = blue field, white
 *  unicorn + gold crown; "union" = split red/blue, gold lion
 *  left + white unicorn right. Gold border, glossy sheen. */
export const drawShield = (variant: "royal" | "union" = "royal") => (p: Pen) => {
  const g = p.g;
  const shieldPath: [number, number][] = [
    [56, 40], [456, 40], [456, 240], [400, 360], [256, 472], [112, 360], [56, 240],
  ];
  // field
  if (variant === "union") {
    p.poly(shieldPath, "#a02020", 0);
    g.save();
    g.beginPath();
    g.moveTo(256, 40); g.lineTo(456, 40); g.lineTo(456, 240); g.lineTo(400, 360); g.lineTo(256, 472); g.closePath();
    g.clip(); g.fillStyle = "#2a4a8a"; g.fillRect(256, 40, 200, 432);
    g.restore();
  } else {
    p.poly(shieldPath, "#2a4a8a", 0);
  }
  // gold border
  p.poly(shieldPath, null, 14);
  g.strokeStyle = "#e8b92a"; g.lineWidth = 10;
  g.beginPath();
  shieldPath.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath(); g.stroke();
  // glossy sheen
  g.save();
  g.beginPath();
  shieldPath.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath(); g.clip();
  const sheen = g.createLinearGradient(56, 40, 456, 472);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)"); sheen.addColorStop(0.5, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(0,0,0,0.12)");
  g.fillStyle = sheen; g.fillRect(56, 40, 400, 432);
  g.restore();
  // the beasts, pictogram-simple
  const miniUni = (cx: number, cy: number, s: number) => {
    g.fillStyle = "#f7f5ee"; g.strokeStyle = INK; g.lineWidth = 6;
    g.beginPath(); g.ellipse(cx, cy + 20 * s, 70 * s, 42 * s, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cx - 58 * s, cy - 8 * s, 26 * s, 20 * s, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 72 * s, cy - 22 * s); g.lineTo(cx - 92 * s, cy - 62 * s); g.lineTo(cx - 58 * s, cy - 34 * s); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "#e8b92a"; g.lineWidth = 9 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx - 66 * s, cy - 24 * s); g.lineTo(cx - 96 * s, cy - 78 * s); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 5 * s;
    for (const lx of [-40, -10, 30, 55]) {
      g.beginPath(); g.moveTo(cx + lx * s, cy + 52 * s); g.lineTo(cx + lx * s, cy + 92 * s); g.stroke();
    }
  };
  const miniLion = (cx: number, cy: number, s: number) => {
    g.fillStyle = "#e8b92a"; g.strokeStyle = INK; g.lineWidth = 6;
    g.beginPath(); g.ellipse(cx, cy + 20 * s, 70 * s, 42 * s, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#8a5a1a";
    g.beginPath(); g.arc(cx - 58 * s, cy - 8 * s, 44 * s, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#e8c878";
    g.beginPath(); g.arc(cx - 58 * s, cy - 8 * s, 26 * s, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 5 * s;
    for (const lx of [-40, -10, 30, 55]) {
      g.beginPath(); g.moveTo(cx + lx * s, cy + 52 * s); g.lineTo(cx + lx * s, cy + 92 * s); g.stroke();
    }
  };
  if (variant === "union") {
    miniLion(160, 200, 0.85);
    miniUni(352, 200, 0.85);
  } else {
    miniUni(256, 210, 1.15);
    // small gold crown above the unicorn
    g.fillStyle = "#e8b92a"; g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(216, 96); g.lineTo(216, 66); g.lineTo(236, 84); g.lineTo(256, 58); g.lineTo(276, 84); g.lineTo(296, 66); g.lineTo(296, 96); g.closePath();
    g.fill(); g.stroke();
  }
};
/** A unicorn banner on a pole (256x512): blue flag, white unicorn,
 *  gold fringe — Robert the Bruce's war banner. */
export const drawBanner = (p: Pen) => {
  const g = p.g;
  p.line([[128, 20], [128, 500]], "#6a4a2c", 14);
  p.dot(128, 16, 12, "#e8b92a"); // finial
  p.poly([[128, 30], [240, 30], [240, 210], [128, 210]], "#2a4a8a", 8);
  g.fillStyle = "#f7f5ee";
  g.beginPath(); g.ellipse(184, 130, 34, 20, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(156, 112, 13, 10, 0, 0, 7); g.fill();
  g.strokeStyle = "#e8b92a"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(150, 106); g.lineTo(136, 76); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3;
  for (const lx of [168, 184, 200, 214]) {
    g.beginPath(); g.moveTo(lx, 146); g.lineTo(lx, 168); g.stroke();
  }
  for (let x = 128; x <= 240; x += 14) {
    g.fillStyle = "#e8b92a";
    g.beginPath(); g.moveTo(x, 210); g.lineTo(x + 7, 226); g.lineTo(x + 14, 210); g.closePath(); g.fill();
  }
};
/** A gold crown with red jewels (256x256), worn by the king. */
export const drawCrown = (p: Pen) => {
  const g = p.g;
  p.poly([[48, 200], [48, 110], [88, 150], [128, 84], [168, 150], [208, 110], [208, 200]], "#e8b92a", 10);
  p.poly([[48, 200], [208, 200], [208, 224], [48, 224]], "#d9a441", 8);
  for (const [jx, jy] of [[88, 168], [128, 160], [168, 168]] as [number, number][]) {
    p.dot(jx, jy, 10, "#c0353a");
    g.fillStyle = "#ff8a8a"; g.beginPath(); g.arc(jx - 3, jy - 3, 3, 0, 7); g.fill();
  }
  p.dot(128, 76, 8, "#e8b92a");
};
/** A sagging gold chain between two canvas points (512x256
 *  canvas): small linked circles along a quadratic sag. */
export const drawChainArc = (x0: number, y0: number, x1: number, y1: number, sag = 60) => (p: Pen) => {
  const g = p.g;
  const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + sag;
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
    const y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
    g.fillStyle = i % 2 ? "#e8b92a" : "#b8860b";
    g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
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
  // one unicorn as a wide sprite: scale 1.0 ≈ 1.9 m long, head LEFT
  const unicorn = (x: number, z: number, scale = 1.0, mirror = false, opts: UnicornOpts = {}) => {
    const d = cam.pos.distanceTo(tmp.set(x, 0.5, z)) / scale;
    const [w, h, k] = wideTier(d);
    const key = `U|${opts.pose ?? "s"}|${opts.chain ? "c" : "n"}|${q(x, 8)}|${q(z, 8)}`;
    out.places.push({
      key, x, y: 0, z, scale, mirror, geo: "unicorn", size: [w, h, k],
      draw: drawUnicorn(opts),
    });
    blob(out, x, 0, z, 2.0 * scale, 2.4 * scale);
  };
  // one lion as a wide sprite: scale 1.0 ≈ 1.9 m long, head LEFT
  const lion = (x: number, z: number, scale = 1.0, mirror = false) => {
    const d = cam.pos.distanceTo(tmp.set(x, 0.5, z)) / scale;
    const [w, h, k] = wideTier(d);
    out.places.push({
      key: `L|${q(x, 8)}|${q(z, 8)}`, x, y: 0, z, scale, mirror, geo: "lion", size: [w, h, k],
      draw: drawLion,
    });
    blob(out, x, 0, z, 2.0 * scale, 2.4 * scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, x: number, z: number, look = -0.15, scale = 1.5) =>
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));
  // the king's gold crown, floating just above his head
  const crownFx = (x: number, z: number, scale = 1.2, yOff = 0) =>
    out.fx.push({ key: "crown", cw: 256, ch: 256, draw: drawCrown, x, y: 2.35 * scale + yOff, z: z + 0.1, w: 0.62 * scale, h: 0.62 * scale });

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big in the near
    // foreground — behind him the giant white unicorn, golden horn
    // catching the light, castle + hills stacked behind, and the
    // claim as one GIANT board. The unicorn stands OFFSET RIGHT
    // (x 3.0, scale 1.8) so its head + horn clear the hero — at
    // UNI_SPOT the head hid directly behind the hero's head and
    // the horn read as a hat on him (stills check 2026-11-24).
    heroAt("shock", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    unicorn(3.0, UNI_SPOT[2], 1.8);
    card("cardHook", ["TAK PERNAH", "ADA?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE SCALE: high wide — the whole green moor in one sweep,
    // the white unicorn standing proud, the hero small beside it
    // (the scale joke: the beast is REAL in the frame)
    unicorn(0, -2, 1.6);
    out.places.push(stand(HERO, -2.2, 0, 1, "grin", -0.3, {}, 1.0)); blob(out, -2.2, 0, 1);
    card("cardScale", ["BUKAN SINGA!"], 0, 2, -25, 4.2, 0.5);
  } else if (id === 3) {
    // THE 12TH CENTURY: King William I in his red robe, crown on,
    // the royal shield with the white unicorn beside him, the
    // castle rock rising behind.
    out.places.push(stand(KING, 0, 0, 2, "stern", -0.1, {}, 1.2)); blob(out, 0, 0, 2);
    crownFx(0, 2, 1.2);
    // shield at x 1.2, not 2.4: at 2.4 its right half fell outside
    // the frame (stills check 2026-11-24)
    out.fx.push({ key: "shieldRoyal", cw: 512, ch: 512, draw: drawShield("royal"), x: 1.2, y: 2.4, z: -2, w: 2.4, h: 2.4 });
    card("cardCentury", ["ABAD KE-12!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 4) {
    // THE LEGEND: the wild unicorn gallops across the misty moor —
    // the strongest, proudest beast alive, impossible to catch.
    // The camera rides along with it (camAt tracks the gallop).
    const g = unicornGallop(t);
    unicorn(g.x, g.z, 1.5, false, { pose: "gallop" });
    card("cardWild", ["PALING KUAT!"], 0, 3, -8, 4.0, 0.5);
  } else if (id === 5) {
    // THE HORN PURIFIES: the unicorn dips its golden horn into
    // the dark pond — the water clears where the horn touches.
    // Hero watches amazed from the bank.
    // at x 4.5 the drinking head + the pond fell outside the
    // right edge (stills check 2026-11-24); at 3.5 the head dips
    // at the pond's left edge and stays in frame
    unicorn(3.5, 1, 1.2, true, { pose: "drink" });
    out.places.push(stand(HERO, 1.5, 0, 4, "shock", 0.3, {}, 1.1)); blob(out, 1.5, 0, 4);
    card("cardHorn", ["ANTIRACUN!"], 3, 2, -2, 3.8, 0.5);
  } else if (id === 6) {
    // ROBERT THE BRUCE: the knight plants the unicorn banner
    // while the English redcoats advance — the emblem of war.
    out.places.push(stand(BRUCE, 0, 0, 3, "stern", -0.2, {}, 1.2)); blob(out, 0, 0, 3);
    // banner at x 1.0, not 1.8: the pole hid the (3,-6) redcoat
    // behind it; rightmost redcoat pulled in from 5.5 so it is
    // not cut at the frame edge (stills check 2026-11-24)
    out.fx.push({ key: "banner", cw: 256, ch: 512, draw: drawBanner, x: 1.0, y: 2.6, z: 0, w: 1.1, h: 2.2 });
    for (const [sx, sz] of [[4, -3], [5.0, -5], [3, -6]] as [number, number][]) {
      out.places.push(stand(REDCOAT, sx, 0, sz, "stern", 0.2, {}, 1.0)); blob(out, sx, 0, sz);
    }
    card("cardBruce", ["LAWAN INGGRIS!"], 1, 2.5, -4, 3.8, 0.5);
  } else if (id === 7) {
    // THE GOLD CHAIN: close on the unicorn's head — the golden
    // coronet and chain, the mark of the Scottish royal beast.
    // Smaller + further right than the first pass: at scale 1.5 /
    // x 0 the horn tip was cut at the left edge and the tail at
    // the right (stills check 2026-11-24); camera also pulled
    // back in story.ts case 7.
    unicorn(0.2, 6, 1.2, false, { chain: true });
    card("cardChain", ["RANTAI EMAS!"], 0, 2.5, -2, 4.0, 0.5);
  } else if (id === 8) {
    // THE TAMING: the king holds the golden chain — the wild beast
    // stands calm beside him. Only the king could tame it.
    // Unicorn at x 1.0 (was 2.5): at 2.5 it was outside the right
    // edge and only a sliver showed (stills check 2026-11-24);
    // crown lowered 0.5 so it sits just above the king's head
    // instead of floating high; chain arc shortened to match.
    out.places.push(stand(KING, -1.2, 0, 5, "grin", 0.15, {}, 1.2)); blob(out, -1.2, 0, 5);
    crownFx(-1.2, 5, 1.2, -0.5);
    unicorn(1.0, 4, 1.0, false, { chain: true });
    out.fx.push({ key: "chainArc", cw: 512, ch: 256, draw: drawChainArc(40, 60, 470, 90, 70), x: 0.0, y: 1.5, z: 4.5, w: 2.6, h: 1.3 });
    card("cardTame", ["CUMA RAJA BISA!"], 0, 2.5, -2, 4.0, 0.5);
  } else if (id === 9) {
    // THE UNION 1603: the great shield between them — the English
    // lion on the left, the Scottish unicorn on the right, mortal
    // enemies holding up one shield together. Flankers at ±2.2
    // (was ±3.2): at ±3.2 both were half cut at the frame edges
    // (stills check 2026-11-24); camera also pulled back in
    // story.ts case 9.
    out.fx.push({ key: "shieldUnion", cw: 512, ch: 512, draw: drawShield("union"), x: 0, y: 3, z: -4, w: 3.2, h: 3.2 });
    lion(-2.2, -1, 1.1, true);
    unicorn(2.2, -1, 1.1, false);
    card("cardUnion", ["MUSUH", "JADI SATU!"], 0, 3, -8, 4.2, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same moor,
    // same unicorn, same claim, but the hero is laughing now.
    // Loop to frame 0. Unicorn offset right like shot 1 so its
    // head + horn clear the hero.
    heroAt("laugh", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    unicorn(3.0, UNI_SPOT[2], 1.8);
    card("cardHook2", ["TAK PERNAH", "ADA?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };
