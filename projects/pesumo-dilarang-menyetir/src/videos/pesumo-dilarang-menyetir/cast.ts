// The cast of the Pesumo cover frame as lit flat sprites in
// the 3D world: the series hero narrator (teal shirt, cream cap)
// standing SHOCKED on a Tokyo sidewalk beside a GIANT pesumo
// towering behind a small red car, and the giant claim card.
// The pesumo is a stout bodyFront figure: bare skin torso, dark
// mawashi sash at the waist, and a chonmage topknot (new hat type
// in toon.ts). Same pool + card machinery as the house style: one
// canvas per distinct drawing, yaw-only billboards shaded by
// cardShade(), soft contact blobs. The claim card floats as an
// ink-outlined board via drawCardFit (auto-fit: text NEVER
// overflows the board), glued to the view axis so it always sits
// in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, fxShadow, fxContact, fxNote, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, clamp01, camAt, SMALL_CAR, LUX_CAR, CRASH_CAR, VINTAGE_CAR, DOHYO, BANZUKE, heroSpotAt, pesumoSpotAt } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "pesumoHero" };
// THE PESUMO: giant stout body, bare skin torso, dark mawashi
// (sash band at the waist + dark lower body), black topknot.
const PESUMO: Who = { i: 71, o: { jacket: "#e8b48a", pants: "#33272e", boots: "#2c2620", hat: "topknot", hair: "#1d1410", sash: "#241f2e", skin: "#e8b48a", build: "stout" }, okey: "pesumoWrestler" };
// THE CHAUFFEUR: dark uniform + cap, small beside the giant.
const CHAUFFEUR: Who = { i: 72, o: { jacket: "#232936", pants: "#232936", boots: "#1d1410", hat: "cap", cap: "#1d2733" }, okey: "pesumoChauffeur" };
// THE OYAKATA: the stablemaster — grey hair, moustache, dark robe.
const OYAKATA: Who = { i: 73, o: { jacket: "#4a3a5a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a8578", moustache: "#4a3020" }, okey: "pesumoOyakata" };
// TOKYO PEDESTRIANS: a salaryman, a schoolgirl, an elderly man.
const VILLAGER_A: Who = { i: 61, o: { jacket: "#33415c", pants: "#232936", boots: "#2c2620", hat: "cap", cap: "#1d2733" }, okey: "pesumoSalaryman" };
const VILLAGER_B: Who = { i: 62, o: { jacket: "#c94f6d", dress: "#f2e6c8", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#e8b48a" }, okey: "pesumoSchoolgirl" };
const VILLAGER_C: Who = { i: 63, o: { jacket: "#5a6b4a", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#d8cfc0" }, okey: "pesumoElder" };

// ---------------- episode props (drawn, never pasted) ----------------
/** A 1985 newspaper: white paper, big "1985" headline, ruled
 *  lines, a small car sketch (256x320) — the Mitoizumi flashback. */
export const drawNewspaper = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#f6f1e2";
  g.beginPath(); g.roundRect(28, 16, 200, 288, 8); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  // headline
  g.fillStyle = "#1c1503"; g.font = "900 52px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("1985", 128, 58);
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(44, 92); g.lineTo(212, 92); g.stroke();
  // small car sketch: body + cabin + wheels
  g.fillStyle = "#3a6ac9";
  g.beginPath(); g.roundRect(58, 132, 140, 34, 8); g.fill();
  g.beginPath(); g.roundRect(88, 108, 80, 30, 8); g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#1c1e22";
  for (const wx of [86, 172]) { g.beginPath(); g.arc(wx, 170, 13, 0, 7); g.fill(); }
  // ruled lines
  g.strokeStyle = "#8a94a6"; g.lineWidth = 5; g.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const y = 206 + i * 22;
    g.beginPath(); g.moveTo(52, y); g.lineTo(i === 3 ? 150 : 204, y); g.stroke();
  }
  // red stamp
  g.fillStyle = "rgba(196,42,42,0.85)";
  g.beginPath(); g.arc(196, 268, 18, 0, 7); g.fill();
};
/** A banzuke ranking board: tall paper, rank rows, a big red
 *  DOWN arrow (256x384) — the Kyokutenho demotion. */
export const drawBanzuke = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#fbf7ec";
  g.beginPath(); g.roundRect(28, 12, 200, 360, 10); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#1c1503"; g.font = "900 34px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("BANZUKE", 128, 46);
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(44, 72); g.lineTo(212, 72); g.stroke();
  // rank rows: name bars, the last one struck through
  for (let i = 0; i < 4; i++) {
    const y = 104 + i * 44;
    g.fillStyle = i === 3 ? "#c03028" : "#3b3f52";
    g.beginPath(); g.roundRect(52, y - 12, 110, 24, 6); g.fill();
    if (i === 3) {
      g.strokeStyle = "#c03028"; g.lineWidth = 6;
      g.beginPath(); g.moveTo(48, y - 14); g.lineTo(166, y + 14); g.stroke();
    }
  }
  // big red down arrow
  g.fillStyle = "#c03028";
  g.beginPath();
  g.moveTo(128, 300); g.lineTo(168, 252); g.lineTo(144, 252); g.lineTo(144, 226);
  g.lineTo(112, 226); g.lineTo(112, 252); g.lineTo(88, 252); g.closePath();
  g.fill();
  g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#c03028"; g.font = "900 30px 'Arial Black', Arial, sans-serif";
  g.fillText("TURUN!", 128, 336);
};
/** A fine ticket: small paper, "DENDA" headline, ruled lines,
 *  red seal (256x192) — the oyakata pays too. */
export const drawTicket = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#fbf7ec";
  g.beginPath(); g.roundRect(16, 16, 224, 160, 10); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#c03028"; g.font = "900 40px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("DENDA", 128, 52);
  g.strokeStyle = "#8a94a6"; g.lineWidth = 5; g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const y = 92 + i * 22;
    g.beginPath(); g.moveTo(40, y); g.lineTo(i === 2 ? 140 : 216, y); g.stroke();
  }
  g.fillStyle = "rgba(196,42,42,0.85)";
  g.beginPath(); g.arc(196, 140, 18, 0, 7); g.fill();
};
/** A driving licence card: blue-white card, "SIM" headline, a
 *  photo square, ruled lines (256x160) — the retirement prize. */
export const drawLicense = (p: Pen) => {
  const g = p.g;
  const grad = g.createLinearGradient(16, 16, 240, 160);
  grad.addColorStop(0, "#2f6fc0"); grad.addColorStop(1, "#1d4a8a");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(16, 16, 224, 128, 12); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#ffffff"; g.font = "900 44px 'Arial Black', Arial, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText("SIM", 36, 52);
  // photo square: a tiny pesumo face (skin disc + topknot dot)
  g.fillStyle = "#f2ede2";
  g.beginPath(); g.roundRect(168, 34, 56, 56, 6); g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#e8b48a";
  g.beginPath(); g.arc(196, 68, 16, 0, 7); g.fill();
  g.fillStyle = "#1d1410";
  g.beginPath(); g.arc(196, 46, 6, 0, 7); g.fill();
  // ruled lines
  g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 5; g.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const y = 100 + i * 20;
    g.beginPath(); g.moveTo(36, y); g.lineTo(150, y); g.stroke();
  }
};
/** A yellow crash starburst (256x256): the "BENTUR!" gag over
 *  the wrecked car. */
export const drawCrashStar = (p: Pen) => {
  const g = p.g;
  const cx = 128, cy = 128;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 52 : 118;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  const grad = g.createRadialGradient(cx, cy, 10, cx, cy, 118);
  grad.addColorStop(0, "#fff3b0"); grad.addColorStop(0.6, "#ffd94d"); grad.addColorStop(1, "#f6a800");
  g.fillStyle = grad; g.fill();
  g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#1c1503"; g.font = "900 44px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("DUAR!", cx, cy + 2);
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
  // the hero on the ground at his per-shot spot (story.heroSpotAt)
  const heroAt = (expr: Expr, look = -0.15, scale = 1.4) => {
    const hp = heroSpotAt(id, t);
    out.places.push(stand(HERO, hp.x, 0.15, hp.z, expr, look, {}, scale));
    blob(out, hp.x, 0.15, hp.z, scale);
  };
  // a giant fact card glued to the view axis for the whole shot
  const card = (key: string, lines: string[], tx: number, ty: number, tz: number, up: number, sf = 0.52) =>
    cardAerial(key, drawCardFit(lines, "#f2c018", "#1c1503", 100), S0, SLEN, tx, ty, tz, 0.5, up, sf, true);
  // pedestrians strolling across the zebra, opposite directions
  const crosser = (who: Who, dir: number, z: number, phase: number) => {
    const u = (U + phase) % 1;
    const x = dir > 0 ? -5 + 10 * u : 5 - 10 * u;
    out.places.push(person(cam, who, x, 0.15, z,
      { mode: "stroll", phase: (t * 1.35 + phase) % 1, expr: "grin", blink: lidAt(t, who.i), look: 0 }, 1.0));
    blob(out, x, 0.15, z);
  };
  const sidewalkPed = (who: Who, x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}) => {
    out.places.push(stand(who, x, 0.15, z, expr, 0.1, extra, 1.0));
    blob(out, x, 0.15, z);
  };

  // the pesumo at his per-shot spot (story.pesumoSpotAt) — giant,
  // stout, topknot, mawashi; behind cars the car occludes his legs
  const sumoAt = (expr: Expr, look = 0) => {
    const sp = pesumoSpotAt(id, t);
    out.places.push(stand(PESUMO, sp.x, 0.15, sp.z, expr, look, {}, sp.scale));
    blob(out, sp.x, 0.15, sp.z, sp.scale);
  };
  // the oyakata (stablemaster) and the chauffeur
  const oyakataAt = (x: number, z: number, expr: Expr) => {
    out.places.push(stand(OYAKATA, x, 0.15, z, expr, -0.1, {}, 1.0));
    blob(out, x, 0.15, z);
  };
  const chauffeurAt = (x: number, z: number) => {
    out.places.push(stand(CHAUFFEUR, x, 0.15, z, "grin", 0.1, { headTilt: 0.3 }, 1.0));
    blob(out, x, 0.15, z);
  };

  if (id === 1) {
    // THE COVER (frame 0): the hero's SHOCK face big on the
    // sidewalk beside the SMALL RED CAR — the GIANT PESUMO
    // towering behind it, already shifting, and the claim as one
    // GIANT board. The anomaly itself, big, from frame 0.
    heroAt("shock", -0.15);
    sumoAt("shock", -0.15);
    sidewalkPed(VILLAGER_A, 7.2, 10, "grin", { wave: 1 });
    sidewalkPed(VILLAGER_C, -7.4, 4, "grin");
    card("cardHook", ["DILARANG", "NYETIR?!"], SMALL_CAR[0], 2.5, SMALL_CAR[2], 4.6, 0.55);
  } else if (id === 2) {
    // THE RULE: high wide over the dohyo plaza — clay ring, straw
    // bales, four pillars, roof; the pesumo STERN in the ring
    heroAt("grin", 0);
    sumoAt("stern", 0);
    sidewalkPed(VILLAGER_C, -7.5, -30, "grin");
    card("cardName", ["ATURAN", "RESMI!"], DOHYO[0], 2.5, DOHYO[2], 4.2, 0.5);
  } else if (id === 3) {
    // TOO BIG FOR THE CAR: the pesumo stuck at the small car's
    // door, arms spread, the car far too small for him
    heroAt("grin", 0.2);
    sumoAt("shock", -0.3);
    card("cardFour", ["NGGAK", "MUAT!"], 3.4, 2.2, 6.5, 3.6, 0.5);
  } else if (id === 4) {
    // THE CRASH: the red car tilted against the pole, the pesumo
    // DAZED beside it, a crash starburst over the wreck
    heroAt("shock", -0.2);
    sumoAt("dazed", 0.2);
    out.fx.push({ key: "crashStar", cw: 256, ch: 256, draw: drawCrashStar, x: CRASH_CAR[0], y: 2.4, z: CRASH_CAR[2], w: 1.6, h: 1.6, soft: true });
    card("cardCrash", ["SUSAH", "KELUAR!"], CRASH_CAR[0], 2.0, CRASH_CAR[2], 3.6, 0.5);
  } else if (id === 5) {
    // 1985 FLASHBACK: golden light, the vintage car + newspaper —
    // the crash that tightened the rule
    heroAt("shock", -0.2);
    sumoAt("nervous", 0.3);
    out.fx.push({ key: "news1985", cw: 256, ch: 320, draw: drawNewspaper, x: -6.5, y: 1.9, z: -12.0, w: 1.05, h: 1.31, soft: true });
    card("card1985", ["TAHUN", "1985!"], VINTAGE_CAR[0], 2.2, VINTAGE_CAR[2], 3.6, 0.5);
  } else if (id === 6) {
    // THE DEMOTION: the banzuke board with the red down arrow —
    // one tournament out, rank dropped
    heroAt("grin", -0.1);
    sumoAt("nervous", -0.2);
    out.fx.push({ key: "banzukeProp", cw: 256, ch: 384, draw: drawBanzuke, x: 8.6, y: 1.8, z: 4.6, w: 1.2, h: 1.8, soft: true });
    card("cardBanzuke", ["TURUN", "PERINGKAT!"], BANZUKE[0], 2.5, BANZUKE[2], 3.6, 0.5);
  } else if (id === 7) {
    // THE COACH PAYS TOO: the oyakata STERN with the fine ticket,
    // the pesumo peeking nervously behind him
    heroAt("grin", -0.1);
    oyakataAt(5.0, 6.0, "stern");
    sumoAt("nervous", -0.2);
    // FIX 2 (stills-check round 2): ticket was at y 1.7 — dead on the
    // oyakata's face. Lowered to chest height so his face stays visible;
    // nudged right (x 4.6) so the paper isn't hidden behind the hero.
    out.fx.push({ key: "ticketProp", cw: 256, ch: 192, draw: drawTicket, x: 4.6, y: 1.15, z: 6.9, w: 1.0, h: 0.75, soft: true });
    card("cardOyakata", ["PELATIH", "KENA JUGA!"], 5.0, 2.5, 6.0, 3.6, 0.5);
  } else if (id === 8) {
    // CHAUFFEURED: the pesumo's head above the small car's roof,
    // the chauffeur BOWING at the door, the hero waving
    const hp = heroSpotAt(8, t);
    out.places.push(stand(HERO, hp.x, 0.15, hp.z, "grin", -0.15, { wave: 1 }, 1.4));
    blob(out, hp.x, 0.15, hp.z, 1.4);
    sumoAt("grin", -0.15);
    chauffeurAt(4.0, 7.5);
    card("cardChauffeur", ["DISETIRIN", "SOPIR!"], SMALL_CAR[0], 2.2, SMALL_CAR[2], 4.2, 0.5);
  } else if (id === 9) {
    // STATUS SYMBOL: the BLACK LUXURY CAR, the chauffeur bowing,
    // the pesumo GRINNING behind it — being driven is prestige
    heroAt("grin", 0.1);
    sumoAt("grin", 0.15);
    chauffeurAt(4.0, -3.5);
    card("cardStatus", ["SIMBOL", "STATUS!"], LUX_CAR[0], 2.2, LUX_CAR[2], 3.8, 0.5);
  } else if (id === 10) {
    // THE PUNCHLINE LOOP: back on the cover framing — same car,
    // same claim, but the hero is LAUGHING and the pesumo holds
    // his new driving licence. Loop to frame 0.
    heroAt("laugh", -0.15);
    sumoAt("laugh", -0.15);
    out.fx.push({ key: "licenseProp", cw: 256, ch: 160, draw: drawLicense, x: 1.3, y: 2.2, z: 5.2, w: 1.1, h: 0.69, soft: true });
    sidewalkPed(VILLAGER_A, 7.2, 10, "grin", { wave: 1 });
    sidewalkPed(VILLAGER_C, -7.4, 4, "grin");
    card("cardHook2", ["DILARANG", "NYETIR?!"], SMALL_CAR[0], 2.5, SMALL_CAR[2], 4.6, 0.55);
  }
  return out;
};
export { FPS };
