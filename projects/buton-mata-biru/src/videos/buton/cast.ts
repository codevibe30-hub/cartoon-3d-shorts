// The cast of the Buton / blue-eyes short as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap),
// a dignified Buton man with BRIGHT BLUE eyes, his family (wife
// + heterochromia child: one blue eye, one brown), and the giant
// claim card. Same pool + card machinery as the house style: one
// canvas per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as an
// ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always sits
// in frame. TONE: respectful — the Buton people are drawn as
// dignified, ordinary people, never caricatures.
// BLUE EYES: the toon.ts eye() draws coloured irises when the
// outfit carries `eyes: [left, right]` — blue #35a8ff reads
// clearly even at shot distance; the heterochromia child gets
// one blue + one brown iris.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, HERO_SPOT, BUTON_SPOT } from "./story";
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body"; roll?: number; pitch?: number; size?: [number, number, number];
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "butonHero" };
// BLUE: bright sky-blue irises, both eyes.
const BLUE: [string, string] = ["#35a8ff", "#35a8ff"];
const BROWN = "#6a4a26";
// BUTON MAN: a dignified Buton islander — deep sea-blue shirt,
// dark hair, warm brown skin, BRIGHT BLUE eyes. The face of the
// episode; drawn wajar dan bermartabat, never a caricature.
const BUTON_MAN: Who = { i: 71, o: { jacket: "#2e6b8a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1a1a1a", skin: "#b57a4a", eyes: BLUE }, okey: "butonMan" };
// BUTON WOMAN: batik-red dress, dark hair, warm brown skin, blue eyes.
const BUTON_WOMAN: Who = { i: 72, o: { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1a1a1a", skin: "#b57a4a", dress: "#c25a7a", eyes: BLUE }, okey: "butonWoman" };
// BUTON CHILD (kid build): heterochromia — left eye blue, right eye brown.
const BUTON_KID: Who = { i: 73, o: { jacket: "#e8822c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#2e6b8a", skin: "#b57a4a", build: "kid", eyes: ["#35a8ff", BROWN] }, okey: "butonKid" };

// ---------------- the DNA helix (drawn, never pasted) ----------------
// A glowing double helix on a 512x512 canvas: two CONTINUOUS sine
// strands (cyan + amber) with ladder rungs, on a dark navy disc so
// it pops off the bright green hill. It must read as DNA at a
// glance: two twisting strands + ladder rungs.
export const drawHelix = (bright = 1) => (p: Pen) => {
  const g = p.g;
  const a = bright > 1 ? 1 : 0.75;
  // dark navy backing disc — contrast against the green hill
  const disc = g.createRadialGradient(256, 256, 30, 256, 256, 250);
  disc.addColorStop(0, `rgba(8,28,58,${0.62 * a + 0.12})`);
  disc.addColorStop(0.75, `rgba(10,34,68,${0.5 * a})`);
  disc.addColorStop(1, "rgba(10,34,68,0)");
  g.fillStyle = disc;
  g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  // halo
  const halo = g.createRadialGradient(256, 256, 20, 256, 256, 250);
  halo.addColorStop(0, `rgba(80,200,255,${0.30 * a})`); halo.addColorStop(1, "rgba(80,200,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 512, 512);
  // continuous twisting strands with glow
  const strand = (phase: number, color: string) => {
    g.strokeStyle = color; g.lineWidth = 16; g.lineJoin = "round"; g.lineCap = "round";
    g.shadowColor = color; g.shadowBlur = 22;
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const y = 40 + (i / 60) * 432, ph = phase + (i / 60) * Math.PI * 3.2;
      const x = 256 + Math.sin(ph) * 120;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.shadowBlur = 0;
  };
  strand(0, `rgba(53,168,255,${0.95 * a})`);
  strand(Math.PI, `rgba(232,185,42,${0.95 * a})`);
  // rungs between the strands
  for (let i = 0; i <= 12; i++) {
    const y = 40 + (i / 12) * 432, ph = (i / 12) * Math.PI * 3.2;
    const x1 = 256 + Math.sin(ph) * 120, x2 = 256 - Math.sin(ph) * 120;
    g.strokeStyle = `rgba(240,245,255,${0.8 * a})`; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
  }
  // glow dots on the strands
  for (let i = 0; i <= 24; i++) {
    const y = 40 + i * 18, ph = (i / 24) * Math.PI * 3.2;
    const x1 = 256 + Math.sin(ph) * 120, x2 = 256 - Math.sin(ph) * 120;
    g.fillStyle = `rgba(255,255,255,${0.95 * a})`;
    g.beginPath(); g.arc(x1, y, 6, 0, 7); g.fill();
    g.beginPath(); g.arc(x2, y, 6, 0, 7); g.fill();
  }
};

// ---------------- the old Portuguese caravel (drawn, never pasted) ----------------
// Side profile on a 700x520 canvas: wooden hull, two masts with
// cream sails, a red cross on the main sail, riding small waves.
// It must read as an old sailing ship at a glance — hull + masts
// + sails, never a modern boat.
export const drawShip = (p: Pen) => {
  const g = p.g;
  // sea under the hull
  p.ell(350, 470, 320, 34, "#2e7fa8", 8);
  p.ell(350, 478, 260, 22, "#7cc4e0", 6);
  // hull: curved wooden body, darker below the waterline
  p.poly([[140, 380], [560, 380], [520, 450], [180, 450]], "#6a4a2c", 10);
  p.poly([[140, 380], [560, 380], [540, 415], [160, 415]], "#8a5a34", 8);
  for (let x = 200; x <= 500; x += 60) {
    g.fillStyle = "rgba(40,26,12,0.5)";
    g.fillRect(x, 396, 8, 44);
  }
  // stern castle + bow
  p.poly([[520, 380], [580, 340], [580, 380]], "#6a4a2c", 8);
  p.poly([[140, 380], [110, 340], [150, 380]], "#6a4a2c", 8);
  // masts
  p.line([[250, 380], [250, 140]], "#4a3426", 12);
  p.line([[430, 380], [430, 180]], "#4a3426", 12);
  // sails: cream, billowing
  p.poly([[250, 150], [330, 210], [330, 320], [250, 320]], "#f2ead6", 8);
  p.poly([[250, 150], [170, 210], [170, 320], [250, 320]], "#e8dcc0", 8);
  p.poly([[430, 190], [490, 240], [490, 320], [430, 320]], "#f2ead6", 8);
  // red cross on the main sail (the Portuguese mark)
  g.strokeStyle = "#c0353a"; g.lineWidth = 14; g.lineCap = "round";
  g.beginPath(); g.moveTo(290, 220); g.lineTo(290, 280); g.moveTo(262, 250); g.lineTo(318, 250); g.stroke();
  // crow's nest + flag
  p.ell(250, 138, 20, 10, "#8a5a34", 6);
  p.line([[250, 140], [250, 100]], "#4a3426", 6);
  p.poly([[250, 100], [292, 110], [250, 122]], "#c0353a", 4);
  // the big red X over the whole ship: this story is a MYTH
  g.strokeStyle = "#d42f2f"; g.lineWidth = 34; g.lineCap = "round";
  g.beginPath(); g.moveTo(90, 60); g.lineTo(610, 460); g.moveTo(610, 60); g.lineTo(90, 460); g.stroke();
  g.strokeStyle = "#ffffff"; g.lineWidth = 10;
  g.beginPath(); g.moveTo(90, 60); g.lineTo(610, 460); g.moveTo(610, 60); g.lineTo(90, 460); g.stroke();
};

// ---------------- the viral photo frame (drawn, never pasted) ----------------
// A big framed "photograph" on a 512x640 canvas: warm portrait
// background, a dignified face with TWO BRIGHT BLUE EYES front
// and centre — the eyes are the whole point of the picture.
// Gold frame, glossy sheen, small caption plate "BUTON 2020".
export const drawPhoto = (p: Pen) => {
  const g = p.g;
  // gold frame
  p.poly([[8, 8], [504, 8], [504, 632], [8, 632]], "#d9a441", 10);
  p.poly([[28, 28], [484, 28], [484, 612], [28, 612]], "#8a5a1a", 6);
  // portrait background: warm sunset gradient
  const bg = g.createLinearGradient(28, 28, 28, 612);
  bg.addColorStop(0, "#f2c98a"); bg.addColorStop(0.6, "#e8a86a"); bg.addColorStop(1, "#c97a4a");
  g.fillStyle = bg; g.fillRect(28, 28, 456, 584);
  // sun glow top-right
  const sun = g.createRadialGradient(420, 110, 8, 420, 110, 190);
  sun.addColorStop(0, "rgba(255,246,200,0.9)"); sun.addColorStop(1, "rgba(255,246,200,0)");
  g.fillStyle = sun; g.fillRect(230, 28, 254, 300);
  // shoulders + shirt
  p.poly([[120, 612], [170, 430], [342, 430], [392, 612]], "#2e6b8a", 8);
  // face: warm brown skin, bean-head shape
  p.ell(256, 250, 118, 128, "#b57a4a", 10);
  // dark hair cap
  g.fillStyle = "#1a1a1a";
  g.beginPath(); g.ellipse(256, 168, 118, 62, 0, Math.PI, 0); g.fill();
  g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  // THE EYES: two big bright-blue irises with black pupils +
  // glints — the whole photograph is about these eyes.
  for (const ex of [200, 312]) {
    p.ell(ex, 250, 34, 30, "#ffffff", 4);
    p.ell(ex, 250, 22, 20, "#35a8ff", 3);
    p.dot(ex, 252, 9);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex - 7, 242, 5, 0, 7); g.fill();
  }
  // brows + nose + smile
  g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(168, 208); g.quadraticCurveTo(200, 196, 232, 208); g.stroke();
  g.beginPath(); g.moveTo(280, 208); g.quadraticCurveTo(312, 196, 344, 208); g.stroke();
  g.beginPath(); g.moveTo(256, 262); g.quadraticCurveTo(262, 292, 252, 300); g.stroke();
  g.beginPath(); g.moveTo(216, 330); g.quadraticCurveTo(256, 356, 296, 330); g.stroke();
  // glossy sheen over the photo
  g.save();
  g.beginPath(); g.rect(28, 28, 456, 584); g.clip();
  const sheen = g.createLinearGradient(28, 28, 484, 612);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)"); sheen.addColorStop(0.5, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(0,0,0,0.10)");
  g.fillStyle = sheen; g.fillRect(28, 28, 456, 584);
  g.restore();
  // caption plate
  p.poly([[156, 560], [356, 560], [356, 596], [156, 596]], "#f2ede2", 5);
  g.fillStyle = "#1c1503"; g.font = "900 26px 'Arial Black', Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("BUTON 2020", 256, 579);
};

// ---------------- sound waves (drawn, never pasted) ----------------
// Expanding arcs on a 512x512 canvas, centred on the listener's
// ear side; `phase` 0..1 grows the rings outward. Keyed by
// quantized phase so the canvas redraws as the rings expand.
export const drawWaves = (phase: number) => (p: Pen) => {
  const g = p.g;
  // expanding arcs only — no floating ear: the arcs radiate from
  // just beside the listener's own head, toward his ear.
  for (let k = 0; k < 3; k++) {
    const u = (phase + k / 3) % 1;
    const r = 60 + 170 * u, a = 0.85 * (1 - u);
    g.strokeStyle = `rgba(53,168,255,${a.toFixed(3)})`;
    g.lineWidth = 14 * (1 - u) + 4;
    g.beginPath(); g.arc(256, 256, r, -0.9, 0.9); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - u)).toFixed(3)})`;
    g.lineWidth = 6;
    g.beginPath(); g.arc(256, 256, r, -0.9, 0.9); g.stroke();
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
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  const heroAt = (expr: Expr, x: number, z: number, look = -0.15, scale = 1.5) =>
    out.places.push(stand(HERO, x, 0, z, expr, look, {}, scale));
  const butonAt = (expr: Expr, x: number, z: number, look = 0.15, scale = 1.5) =>
    out.places.push(stand(BUTON_MAN, x, 0, z, expr, look, {}, scale));

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big in the near
    // foreground — beside him the blue-eyed Buton man, his bright
    // blue eyes catching the light, turquoise sea + palms + hills
    // stacked behind, and the claim as one GIANT board. The man
    // stands OFFSET RIGHT (x 2.3) so his head never hides behind
    // the hero's head and his blue eyes stay visible — and he stays
    // fully inside the narrow 9:16 frame.
    heroAt("shock", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    butonAt("smile", BUTON_SPOT[0], BUTON_SPOT[2], 0.15, 1.5);
    card("cardHook", ["MATA BIRU?!"], 0, 3.5, -30, 5.0, 0.52);
  } else if (id === 2) {
    // THE VILLAGE: high wide — the whole coastal village in one
    // sweep: stilt houses, palms, turquoise sea, the hero small
    // beside a Buton family (the scale joke: the blue eyes are
    // REAL in the frame, at human scale)
    out.places.push(stand(BUTON_MAN, -1.5, 0, -1, "smile", -0.2, {}, 1.0)); blob(out, -1.5, 0, -1);
    out.places.push(stand(BUTON_WOMAN, 0.5, 0, -2, "smile", 0.1, {}, 1.0)); blob(out, 0.5, 0, -2);
    out.places.push(stand(HERO, -3.2, 0, 1, "grin", -0.3, {}, 1.0)); blob(out, -3.2, 0, 1);
    card("cardVillage", ["BIRU TERANG!"], 0, 2, -25, 4.2, 0.5);
  } else if (id === 3) {
    // HETEROCHROMIA: close on the child's face — one bright blue
    // eye, one brown eye. The child stands BIG at the origin so
    // the two different irises fill the frame and read clearly.
    out.places.push(stand(BUTON_KID, 0, 0, 0, "smile", 0, {}, 1.6)); blob(out, 0, 0, 0);
    card("cardHetero", ["SEBELAH BIRU!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 4) {
    // THE SYNDROME: the glowing DNA helix floats over the village
    // — Waardenburg, one in 40,000. Hero watches amazed, close
    // enough to the axis to stay fully in frame (x 1.3).
    out.fx.push({ key: "helix", cw: 512, ch: 512, draw: drawHelix(1), x: 0, y: 3.5, z: -6, w: 4.4, h: 4.4 });
    out.places.push(stand(HERO, 1.3, 0, 2, "shock", -0.25, {}, 1.1)); blob(out, 1.3, 0, 2);
    card("cardDna", ["1 DARI 40 RIBU!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 5) {
    // THE FAMILY: the Buton family together on the beach — man,
    // woman and child, several bright blue eyes in one family.
    // The child stands between the parents, never hidden.
    out.places.push(stand(BUTON_MAN, -1.8, 0, -1, "smile", -0.15, {}, 1.2)); blob(out, -1.8, 0, -1);
    out.places.push(stand(BUTON_WOMAN, 0.6, 0, -2, "smile", 0.1, {}, 1.2)); blob(out, 0.6, 0, -2);
    out.places.push(stand(BUTON_KID, 1.9, 0, 0, "grin", 0.2, {}, 1.0)); blob(out, 1.9, 0, 0);
    card("cardFamily", ["NURUN KELUARGA!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 6) {
    // THE VIRAL PHOTO: the big framed photograph of the blue eyes
    // — hero beside it, grinning, as if he just took the picture.
    // Frame at x 0.5, hero at x -1.4: neither covers the other,
    // and the hero stays fully inside the narrow 9:16 frame.
    out.fx.push({ key: "photo", cw: 512, ch: 640, draw: drawPhoto, x: 0.5, y: 3.4, z: -4, w: 2.6, h: 3.25 });
    out.places.push(stand(HERO, -1.4, 0, 1, "grin", 0.25, {}, 1.2)); blob(out, -1.4, 0, 1);
    card("cardViral", ["VIRAL 2020!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 7) {
    // THE MYTH BUSTED: the old Portuguese caravel with a big red
    // X over it — not European blood. Hero stern beside it, close
    // enough to the axis to stay fully in frame (x 1.4).
    out.fx.push({ key: "ship", cw: 700, ch: 520, draw: drawShip, x: -1, y: 2.6, z: -6, w: 3.6, h: 2.7 });
    out.places.push(stand(HERO, 1.4, 0, 2, "stern", -0.25, {}, 1.2)); blob(out, 1.4, 0, 2);
    card("cardMyth", ["BUKAN BULE!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 8) {
    // THE MUTATION: the helix blazes brighter while the little
    // ship fades behind it — the cause is a gene mutation. The
    // faded ship is pushed down-left, clear of the helix, and the
    // hero stands close to the axis (x 1.3) so he stays in frame.
    out.fx.push({ key: "helixBright", cw: 512, ch: 512, draw: drawHelix(1.6), x: 0, y: 3.5, z: -6, w: 4.4, h: 4.4 });
    out.fx.push({ key: "shipFade", cw: 700, ch: 520, draw: drawShip, x: -2.8, y: 1.6, z: -9, w: 1.6, h: 1.2, soft: true });
    out.places.push(stand(HERO, 1.3, 0, 2, "grin", -0.25, {}, 1.1)); blob(out, 1.3, 0, 2);
    card("cardGene", ["MUTASI GEN!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 9) {
    // THE PACKAGE: the Buton man listens calmly as sound waves
    // drift toward his ear — the syndrome is a genetic package,
    // not a fashion choice. Respectful, no caricature.
    butonAt("smile", 0, 0, 0, 1.3);
    const ph = clamp01(((tt - S0) / Math.max(0.01, SLEN)) % 1);
    out.fx.push({ key: `waves|${Math.floor(ph * 12)}`, cw: 512, ch: 512, draw: drawWaves(ph), x: 0.45, y: 2.2, z: 0.5, w: 1.6, h: 1.6 });
    card("cardPackage", ["PAKET GENETIK!"], 0, 2, -8, 4.0, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same beach,
    // same blue eyes, same claim, but the hero is laughing now.
    // Loop to frame 0. The man stands offset right like shot 1
    // so his head + blue eyes clear the hero.
    heroAt("laugh", HERO_SPOT[0], HERO_SPOT[2], -0.15, 1.5);
    butonAt("laugh", BUTON_SPOT[0], BUTON_SPOT[2], 0.15, 1.5);
    card("cardHook2", ["MATA BIRU?!"], 0, 3.5, -30, 5.0, 0.52);
  }
  return out;
};
export { FPS };
