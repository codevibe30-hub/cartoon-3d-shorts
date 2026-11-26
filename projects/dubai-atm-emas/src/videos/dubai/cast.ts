// The cast of the Dubai Gold ATM frame as lit flat sprites
// in the 3D world: the series hero narrator (teal shirt,
// cream cap) before the GIANT gold ATM in a palatial lobby,
// a sheikh and tourists, giant turning gold coins, a live
// price chart on the machine's screen, the red rejection X,
// and the giant claim card. Same pool + card machinery as
// the house style: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs. The
// claim card floats as an ink-outlined board via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the
// view axis so it always sits in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, smooth, camAt, ATM_C, HERO_POS, SCREEN_POS, SLOT_POS, PALACE_C } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "dubaiHero" };
// SHEIKH: white thobe + white head-cloth (cap stands in), dark beard tones.
const SHEIKH: Who = { i: 71, o: { jacket: "#f0ead8", dress: "#e6dfc8", pants: "#e8e2d0", boots: "#5a3b2a", hat: "cap", cap: "#f6f2e6", skin: "#eebd8f" }, okey: "dubaiSheikh" };
// TOURISTS: bright holiday colours.
const TURIS_A: Who = { i: 72, o: { jacket: "#c0353a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#f2c018" }, okey: "dubaiTurisA" };
const TURIS_B: Who = { i: 73, o: { jacket: "#33526e", dress: "#e8a13a", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#2e211a", skin: "#f5c9a0" }, okey: "dubaiTurisB" };
// A KID in the queue.
const ANAK: Who = { i: 74, o: { jacket: "#3f9e4d", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#33526e", build: "kid" }, okey: "dubaiAnak" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A GOLD BAR (512x320): a chunky trapezoid ingot seen
 *  front-three-quarter, mirror-bright top face, stamped
 *  "10 g / FINE GOLD / 999,9", gloss sweeping the bevel. */
export const drawGoldBar = (p: Pen) => {
  const g = p.g;
  // side face (darker, the ingot's thickness)
  g.beginPath();
  g.moveTo(96, 128); g.lineTo(416, 128); g.lineTo(452, 236); g.lineTo(60, 236); g.closePath();
  const side = g.createLinearGradient(0, 128, 0, 236);
  side.addColorStop(0, "#c8920e"); side.addColorStop(1, "#8a5f06");
  g.fillStyle = side; g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.lineJoin = "round"; g.stroke();
  // top face (the bright trapezoid)
  g.beginPath();
  g.moveTo(150, 66); g.lineTo(362, 66); g.lineTo(416, 128); g.lineTo(96, 128); g.closePath();
  const top = g.createLinearGradient(96, 66, 416, 128);
  top.addColorStop(0, "#ffe98a"); top.addColorStop(0.45, "#ffd23e"); top.addColorStop(1, "#f2b41c");
  g.fillStyle = top; g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.stroke();
  // gloss sweep on the top face
  g.save();
  g.beginPath(); g.moveTo(150, 66); g.lineTo(362, 66); g.lineTo(416, 128); g.lineTo(96, 128); g.closePath(); g.clip();
  const gl = g.createLinearGradient(120, 60, 330, 130);
  gl.addColorStop(0, "rgba(255,255,255,0.55)"); gl.addColorStop(0.4, "rgba(255,255,255,0.05)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gl; g.fillRect(90, 60, 340, 80);
  g.restore();
  // the stamp
  g.fillStyle = "rgba(122,78,4,0.9)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("10 g", 256, 168);
  g.font = "900 25px 'Arial Black', Arial, sans-serif";
  g.fillText("FINE GOLD 999,9", 256, 206);
};
/** A GOLD COIN (384x384): reeded rim, two-tone gold, and a
 *  bold central motif — kangaroo, maple leaf or springbok
 *  drawn as clean silhouette shapes. */
const drawCoin = (motif: "roo" | "maple" | "bok") => (p: Pen) => {
  const g = p.g;
  const rim = g.createRadialGradient(150, 140, 30, 192, 192, 190);
  rim.addColorStop(0, "#ffe98a"); rim.addColorStop(0.7, "#f6c21c"); rim.addColorStop(1, "#c8920e");
  g.fillStyle = rim; g.beginPath(); g.arc(192, 192, 182, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  // reeding: short ticks around the rim
  g.strokeStyle = "rgba(122,78,4,0.55)"; g.lineWidth = 5;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(192 + Math.cos(a) * 158, 192 + Math.sin(a) * 158);
    g.lineTo(192 + Math.cos(a) * 176, 192 + Math.sin(a) * 176);
    g.stroke();
  }
  g.fillStyle = "rgba(255,244,190,0.5)"; g.beginPath(); g.arc(192, 192, 148, 0, 7); g.fill();
  g.strokeStyle = "rgba(122,78,4,0.7)"; g.lineWidth = 4; g.beginPath(); g.arc(192, 192, 148, 0, 7); g.stroke();
  // glossy crescent
  g.save(); g.beginPath(); g.arc(192, 192, 148, 0, 7); g.clip();
  const gl = g.createLinearGradient(60, 40, 260, 240);
  gl.addColorStop(0, "rgba(255,255,255,0.5)"); gl.addColorStop(0.45, "rgba(255,255,255,0)");
  g.fillStyle = gl; g.fillRect(40, 40, 310, 310);
  g.restore();
  g.fillStyle = "#a8740a";
  if (motif === "roo") {
    // kangaroo silhouette: body, tail sweep, head + ears, legs
    g.beginPath();
    g.moveTo(150, 268); g.quadraticCurveTo(96, 262, 74, 292); g.quadraticCurveTo(70, 300, 84, 300);
    g.quadraticCurveTo(140, 296, 168, 282); g.lineTo(196, 292); g.lineTo(238, 292); g.lineTo(214, 268);
    g.lineTo(226, 214); g.quadraticCurveTo(252, 196, 246, 158); g.lineTo(258, 128); g.lineTo(240, 122);
    g.lineTo(228, 96); g.lineTo(214, 120); g.quadraticCurveTo(188, 106, 172, 128);
    g.quadraticCurveTo(150, 156, 158, 196); g.quadraticCurveTo(140, 238, 150, 268);
    g.closePath(); g.fill();
  } else if (motif === "maple") {
    // maple leaf: a bold star-leaf from triangles
    g.beginPath();
    const cx = 192, cy = 196;
    const pts: [number, number][] = [
      [0, -104], [20, -58], [52, -84], [48, -36], [92, -44], [58, -2], [92, 8], [44, 34], [50, 76], [12, 52], [8, 104], [-8, 104], [-12, 52], [-50, 76], [-44, 34], [-92, 8], [-58, -2], [-92, -44], [-48, -36], [-52, -84], [-20, -58],
    ];
    pts.forEach(([x, y], i) => { if (i === 0) g.moveTo(cx + x, cy + y); else g.lineTo(cx + x, cy + y); });
    g.closePath(); g.fill();
  } else {
    // springbok: horned head in profile, bold strokes
    g.lineWidth = 17; g.strokeStyle = "#a8740a"; g.lineCap = "round";
    g.beginPath(); g.moveTo(150, 268); g.quadraticCurveTo(196, 196, 226, 128); g.stroke();
    g.lineWidth = 13;
    g.beginPath(); g.moveTo(226, 128); g.quadraticCurveTo(258, 92, 250, 62); g.stroke();
    g.beginPath(); g.moveTo(214, 138); g.quadraticCurveTo(232, 96, 214, 70); g.stroke();
    g.fillStyle = "#a8740a";
    g.beginPath(); g.ellipse(238, 138, 30, 21, 0.7, 0, 7); g.fill();
    g.beginPath(); g.moveTo(262, 122); g.lineTo(292, 142); g.lineTo(258, 152); g.closePath(); g.fill();
  }
  g.fillStyle = "rgba(122,78,4,0.95)"; g.textAlign = "center";
  g.font = "900 30px 'Arial Black', Arial, sans-serif";
  g.fillText(motif === "roo" ? "KANGAROO" : motif === "maple" ? "MAPLE LEAF" : "KRUGERRAND", 192, 330);
};
/** THE PRICE CHART (512x320): a dark trading screen, grid,
 *  and a jagged gold line that climbs — three variants cycle
 *  so the screen feels LIVE. A green up-arrow + "Au" tag. */
const drawChart = (variant: number) => (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#0d1b26"; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(120,200,255,0.16)"; g.lineWidth = 2;
  for (let x = 42; x < 512; x += 47) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 282); g.stroke(); }
  for (let y = 30; y < 300; y += 42) { g.beginPath(); g.moveTo(14, y); g.lineTo(498, y); g.stroke(); }
  const r = rng(500 + variant * 131);
  const pts: [number, number][] = [];
  let y = 218;
  for (let i = 0; i <= 12; i++) {
    pts.push([26 + i * 38, y]);
    y += (r() - 0.62) * 52;
    y = Math.max(52, Math.min(248, y));
  }
  pts.push([482, 66]);
  // area glow under the line
  g.beginPath(); g.moveTo(pts[0][0], 282);
  for (const [x, yy] of pts) g.lineTo(x, yy);
  g.lineTo(482, 282); g.closePath();
  g.fillStyle = "rgba(246,194,28,0.20)"; g.fill();
  g.beginPath();
  pts.forEach(([x, yy], i) => { if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); });
  g.strokeStyle = "#f6c21c"; g.lineWidth = 7; g.lineJoin = "round"; g.stroke();
  g.fillStyle = "#ffd94d";
  for (const [x, yy] of pts) { g.beginPath(); g.arc(x, yy, 5.5, 0, 7); g.fill(); }
  // up arrow + price tag
  g.fillStyle = "#57e389";
  g.beginPath(); g.moveTo(452, 30); g.lineTo(478, 58); g.lineTo(462, 58); g.lineTo(462, 84); g.lineTo(442, 84); g.lineTo(442, 58); g.lineTo(426, 58); g.closePath(); g.fill();
  g.fillStyle = "#ffd94d"; g.textAlign = "left"; g.textBaseline = "middle";
  g.font = "900 40px 'Arial Black', Arial, sans-serif";
  g.fillText("Au 999,9", 26, 42);
  g.fillStyle = "rgba(190,225,255,0.85)";
  g.font = "700 25px Arial, sans-serif";
  g.fillText("LIVE • per 10 menit", 26, 296);
};
/** THE REJECTION (384x384): a red no-entry disc with a fat
 *  white X — the machine refusing a fourth buy. */
const drawRedX = (p: Pen) => {
  const g = p.g;
  const rg = g.createRadialGradient(160, 150, 30, 192, 192, 186);
  rg.addColorStop(0, "#ff7a66"); rg.addColorStop(0.65, "#e8352a"); rg.addColorStop(1, "#b01c14");
  g.fillStyle = rg; g.beginPath(); g.arc(192, 192, 178, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 9; g.stroke();
  g.save(); g.beginPath(); g.arc(192, 192, 168, 0, 7); g.clip();
  const gl = g.createLinearGradient(40, 30, 240, 220);
  gl.addColorStop(0, "rgba(255,255,255,0.4)"); gl.addColorStop(0.5, "rgba(255,255,255,0)");
  g.fillStyle = gl; g.fillRect(20, 20, 350, 350);
  g.restore();
  g.strokeStyle = "#ffffff"; g.lineWidth = 44; g.lineCap = "round";
  g.beginPath(); g.moveTo(112, 112); g.lineTo(272, 272); g.stroke();
  g.beginPath(); g.moveTo(272, 112); g.lineTo(112, 272); g.stroke();
};
/** A sparkle star (128x128, soft): the glint on gold. */
const drawSparkle = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "rgba(255,252,220,0.95)";
  g.beginPath();
  g.moveTo(64, 4); g.quadraticCurveTo(70, 58, 124, 64); g.quadraticCurveTo(70, 70, 64, 124);
  g.quadraticCurveTo(58, 70, 4, 64); g.quadraticCurveTo(58, 58, 64, 4);
  g.fill();
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
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, look = -0.15, scale = 1.5, x = HERO_POS[0], z = HERO_POS[2]) => {
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));
    blob(out, x, 0, z, scale);
  };
  const local = (who: Who, x: number, z: number, expr: Expr, scale = 1.0, y = 0) => {
    out.places.push(stand(who, x, y, z, expr, 0.2, {}, scale));
    blob(out, x, y, z, scale);
  };
  const sparkleFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: "sparkle", cw: 128, ch: 128, draw: drawSparkle, x, y, z, w, h: w, soft: true });

  if (id === 1) {
    // THE COVER (frame 0): the GIANT gold ATM in the palace
    // lobby, a gold bar ALREADY sliding out of its slot (the
    // bar is a world mesh, animated from frame 0). The hero,
    // shocked, at its side; the claim as one GIANT board.
    heroAt("shock", -0.15);
    local(SHEIKH, -0.1, 3.0, "grin", 1.05);
    sparkleFx(0.75, 2.15, -5.0, 0.5);
    card("cardHook", ["KELUAR", "EMAS!"], ATM_C[0], 2.4, ATM_C[2], 5.1, 0.52);
  } else if (id === 2) {
    // THE LOBBY: high wide — the golden machine at the centre
    // of its palace, the bay + skyline through the glass
    heroAt("grin", 0, 1.05);
    local(TURIS_A, -2.2, 0.2, "grin", 0.95);
    local(SHEIKH, 3.9, 1.4, "smile", 0.95);
    card("cardName", ["GOLD", "TO GO"], ATM_C[0], 2.4, ATM_C[2], 4.7, 0.5);
  } else if (id === 3) {
    // THE BAR: tight on the machine's face — lit screen, and
    // the bar gliding out of the slot toward the tray
    heroAt("relief_open", 0.15, 0.95, 2.7, -2.0);
    sparkleFx(-0.7, 2.2, -4.9, 0.44);
    sparkleFx(0.85, 1.35, -4.8, 0.38);
    card("cardKarat", ["24 KARAT!"], SLOT_POS[0], 1.6, SLOT_POS[2], 2.5, 0.48);
  } else if (id === 4) {
    // THE COINS: three GIANT gold coins turning slowly in
    // front of the machine — kangaroo, maple, Krugerrand
    const wob = Math.sin(tt * 1.7) * 0.16;
    out.fx.push({ key: "coinRoo", cw: 384, ch: 384, draw: drawCoin("roo"), x: -1.0, y: 2.05, z: -3.6, w: 1.05, h: 1.05, rot: wob });
    out.fx.push({ key: "coinMaple", cw: 384, ch: 384, draw: drawCoin("maple"), x: 0.0, y: 2.35, z: -3.6, w: 1.3, h: 1.3, rot: -wob * 0.8 });
    out.fx.push({ key: "coinBok", cw: 384, ch: 384, draw: drawCoin("bok"), x: 1.0, y: 2.05, z: -3.6, w: 1.05, h: 1.05, rot: wob * 0.9 });
    sparkleFx(-1.2, 2.9, -3.0, 0.4);
    sparkleFx(1.5, 1.4, -3.0, 0.34);
    heroAt("grin", 0.1, 0.9, 1.3, -1.2);
    card("cardCoins", ["KOIN", "EMAS!"], 0, 1.9, -3.3, 2.9, 0.48);
  } else if (id === 5) {
    // THE LIVE PRICE: the machine's screen IS the chart —
    // three variants cycle so the line keeps redrawing
    const variant = Math.floor(tt * 1.6) % 3;
    out.fx.push({ key: `chart${variant}`, cw: 512, ch: 320, draw: drawChart(variant), x: SCREEN_POS[0], y: SCREEN_POS[1], z: SCREEN_POS[2] + 0.06, w: 1.54, h: 0.96 });
    card("cardPrice", ["TIAP 10", "MENIT!"], SCREEN_POS[0], 3.0, SCREEN_POS[2], 2.1, 0.44);
  } else if (id === 6) {
    // SOLD OUT (the re-hook): a little queue of buyers at the
    // machine, the hero pointing — the gold is GONE
    local(TURIS_A, 0.2, -1.6, "nervous", 1.0);
    local(ANAK, -0.7, -0.6, "shock", 0.85);
    local(SHEIKH, 1.3, -2.6, "stern", 1.0);
    heroAt("shock", 0.15, 1.15, 2.9, 2.8);
    card("cardGone", ["LUDES", "SEHARI!"], ATM_C[0], 2.2, ATM_C[2], 4.5, 0.5);
  } else if (id === 7) {
    // THE KNOCK: the hero raps the machine's flank — DENG! —
    // five hundred kilos of armoured gold don't even tremble
    heroAt("grin", 0.1, 1.2, 2.3, -2.4);
    if (U > 0.3 && U < 0.75) sparkleFx(1.35, 2.3, -4.9, 0.55);
    card("cardArmor", ["500 KILO!"], ATM_C[0], 2.2, ATM_C[2], 4.4, 0.5);
  } else if (id === 8) {
    // REJECTED: the fourth try — the screen slams up its red
    // X and the hero recoils, three buys a day and NO more
    out.fx.push({ key: "redX", cw: 384, ch: 384, draw: drawRedX, x: SCREEN_POS[0], y: SCREEN_POS[1], z: SCREEN_POS[2] + 0.35, w: 1.7, h: 1.7 });
    heroAt("nervous", -0.1, 1.45);
    local(TURIS_B, 0.0, 2.6, "laugh", 0.95);
    card("cardMax", ["MAKS 3", "KALI!"], ATM_C[0], 2.4, ATM_C[2], 5.0, 0.52);
  } else if (id === 9) {
    // THE TWIST: across the bay, the golden domes of the
    // Emirates Palace — Abu Dhabi had the FIRST one, in 2010
    card("cardTwist", ["BUKAN", "DUBAI!"], PALACE_C[0], 8, PALACE_C[2], 5.5, 0.40);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — another
    // bar gliding out of the golden machine, the hero
    // laughing now. Other countries: cash. Dubai? Gold.
    heroAt("laugh", -0.15);
    local(SHEIKH, -0.1, 3.0, "laugh", 1.05);
    sparkleFx(0.75, 2.15, -5.0, 0.5);
    card("cardHook2", ["KELUAR", "EMAS!"], ATM_C[0], 2.4, ATM_C[2], 5.1, 0.52);
  }
  return out;
};
export { FPS };
