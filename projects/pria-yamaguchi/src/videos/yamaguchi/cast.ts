// The cast of "Pria Ini Kena Dua Bom Atom Dan Tetap Hidup🤫" as
// DASIMAN-STYLE stickman sprites: round WHITE heads, thin black
// limbs, one coloured torso each (stick.ts). The hero/storyteller
// wears the mascot's red tie. Same pool + sprite machinery as the
// pilot: one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The blasts are LIGHT ONLY:
// a glow, an expanding dust ring, papers in the air — no gore, ever.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, HERO_SPOT, FLASH1_F, FLASH2_F, trainOff } from "./story";
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

// ---------------- fact cards (kept from the house machinery; unused in this lane) ----------------
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

// ---------------- our people (Dasiman stickmen) ----------------
type Who = { i: number; o: StickOutfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, so: StickOpts, scale = 1, tilt: { pitch?: number; roll?: number } = {}): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const key = `S|${who.okey}|${fkey(so)}|${tilt.pitch ?? 0}|${tilt.roll ?? 0}`;
  return { key, x, y, z, scale, draw: (p) => stick(p, who.o, so), size: [w, h, k], pitch: tilt.pitch, roll: tilt.roll };
};

// HERO: the storyteller — white shirt, the mascot's RED TIE.
const HERO: Who = { i: 41, o: { torso: "#f5f2ea", tie: "#c0272d" }, okey: "hero" };
// YAMAGUCHI: a Mitsubishi marine engineer — pale work shirt, slate
// tie; BANDAGED after Hiroshima; OLD in the last act, grey tufts.
const YAMA: Who = { i: 71, o: { torso: "#e6e1d3", tie: "#43506b", belt: "#4a3b2c" }, okey: "yama" };
const YAMA_B: Who = { i: 72, o: { torso: "#e6e1d3", tie: "#43506b", belt: "#4a3b2c", bandage: true }, okey: "yamaB" };
const YAMA_OLD: Who = { i: 73, o: { torso: "#77644c", tufts: "#c9ccce" }, okey: "yamaOld" };
// His Hiroshima colleagues: Iwanaga and Sato.
const IWANAGA: Who = { i: 74, o: { torso: "#5d7a8a", belt: "#33383e" }, okey: "iwanaga" };
const SATO: Who = { i: 75, o: { torso: "#8a7a5d", belt: "#33383e" }, okey: "sato" };
// The Nagasaki supervisor: dark suit, dark red tie.
const BOSS: Who = { i: 76, o: { torso: "#3c4048", tie: "#7a1f24" }, okey: "boss" };
// Office coworkers + plaza crowd.
const CO_A: Who = { i: 77, o: { torso: "#7a8a99", belt: "#33383e" }, okey: "coA" };
const CO_B: Who = { i: 78, o: { torso: "#99886a", belt: "#33383e" }, okey: "coB" };
const CR_A: Who = { i: 81, o: { torso: "#b5653f" }, okey: "crA" };
const CR_B: Who = { i: 82, o: { torso: "#3f6fb5" }, okey: "crB" };
const CR_C: Who = { i: 83, o: { torso: "#5d8a5a" }, okey: "crC" };

// ---------------- small fx draws ----------------
const drawPaper = () => (p: Pen) => {
  p.poly([[16, 8], [88, 16], [94, 68], [22, 60]], "#f7f3e6", 3.5);
  p.stroke([[30, 26], [82, 32]], 3.5, "#9a958c");
  p.stroke([[29, 40], [81, 46]], 3.5, "#9a958c");
  p.stroke([[28, 53], [66, 57]], 3.5, "#9a958c");
};
const drawFlame = (ph: number) => (p: Pen) => {
  const f = Math.sin(ph * Math.PI * 2);
  p.ell(100, 126, 60, 72 + f * 9, "#e8641e", 0);
  p.ell(100, 140, 39, 49 + f * 7, "#f59b23", 0);
  p.ell(100, 152, 19, 29 + f * 4, "#ffd94d", 0);
};
// the bomber, tiny and far: a dark silhouette with two parachutes
const drawPlane = () => (p: Pen) => {
  p.ell(200, 62, 120, 17, "#2c3138", 0);
  p.poly([[168, 58], [96, 26], [88, 40], [160, 70]], "#2c3138", 0);
  p.poly([[232, 58], [304, 26], [312, 40], [240, 70]], "#2c3138", 0);
  p.poly([[86, 56], [58, 34], [56, 52], [84, 68]], "#2c3138", 0);
  p.ell(150, 128, 26, 13, "#e8e4da", 3);
  p.stroke([[150, 84], [150, 116]], 2.5, "#8a8578");
  p.ell(258, 142, 22, 11, "#e8e4da", 3);
  p.stroke([[258, 86], [258, 130]], 2.5, "#8a8578");
};
// stylized blast light: a soft radial glow (NEVER a fireball on people)
const drawGlow = (warm: string) => (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 254);
  gr.addColorStop(0, "rgba(255,255,250,0.95)");
  gr.addColorStop(0.35, warm);
  gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};
// the shockwave: an expanding dust ring on the ground
const drawRing = (u: number) => (p: Pen) => {
  const r = 30 + u * 215, a = (1 - u) * 0.85;
  p.ell(256, 256, r, r * 0.98, null, 0);
  p.g.lineWidth = 15 * (1 - u) + 3;
  p.g.strokeStyle = `rgba(226,214,188,${a})`;
  p.g.beginPath(); p.g.arc(256, 256, r, 0, Math.PI * 2); p.g.stroke();
  p.g.lineWidth = 5;
  p.g.strokeStyle = `rgba(255,250,235,${a * 0.8})`;
  p.g.beginPath(); p.g.arc(256, 256, r * 0.82, 0, Math.PI * 2); p.g.stroke();
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const S0 = (i: number) => L[i] / FPS;
  const u = clamp01((t - S0(id - 1)) / Math.max(0.01, S0(id) - S0(id - 1))); // shot-local progress
  const fNow = Math.round(t * FPS);
  const stand = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, tilt: { pitch?: number; roll?: number } = {}) =>
    out.places.push(person(cam, who, x, y, z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale, tilt));
  const walk = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "walk", phase: q((t * 1.85 + who.i * 0.37) % 1, 30), expr, blink: lidAt(t, who.i), ...extra }, scale));
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number, soft = false) => {
    const uu = (tt - t0) / dur;
    if (uu >= 0 && uu < 1) out.fx.push({ key: `burst${q(uu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(uu, 24)), x, y, z, w, h: w, soft });
  };
  const fireFx = (x: number, z: number, sc = 1) => {
    const ph = q((tt * 1.4) % 1, 16);
    out.fx.push({ key: `flame${ph}`, cw: 200, ch: 200, draw: drawFlame(ph), x, y: 0.34 * sc, z, w: 0.72 * sc, h: 0.72 * sc, soft: true });
  };
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(255,214,140,0.55)"), x, y, z, w, h: w, soft: true });
  };
  const ringFx = (f0: number, x: number, z: number, maxR: number) => {
    const uu = (fNow - f0) / 26;
    if (uu >= 0 && uu < 1) out.fx.push({ key: `ring${q(uu, 20)}`, cw: 512, ch: 512, draw: drawRing(q(uu, 20)), x, y: 0.06, z, w: maxR * 2 * (0.25 + uu * 0.75), h: maxR * 2 * (0.25 + uu * 0.75), flat: true, soft: true });
  };
  const B = (who: Who, x: number, z: number, sc = 1) => blob(out, x, 0, z, sc);

  if (id === 1) {
    // HOOK = the dramatic cover scene (no card in this lane): the
    // Nagasaki office, 9 August, 11:00 — a bandaged engineer midway
    // through an impossible story, his boss laughing, the hero huge.
    stand(BOSS, -82.3, 0, -22.6, "laugh", {}, 1.05); B(BOSS, -82.3, -22.6, 1.05);
    stand(YAMA_B, -80.7, 0, -20.2, "nervous", { armR: [42, 24] }, 1.12); B(YAMA_B, -80.7, -20.2, 1.12);
    stand(HERO, HERO_SPOT[0], 0, HERO_SPOT[2], "shock", { armL: [-150, -15], armR: [150, 15] }, 1.32); B(HERO, HERO_SPOT[0], HERO_SPOT[2], 1.32);
  } else if (id === 2) {
    // HIROSHIMA, 6 AUGUST, MORNING: three engineers walk to work
    // down an ordinary street. Nothing has happened yet.
    const zb = 12 - 13 * u;
    walk(YAMA, 0, 0, zb, "neutral"); B(YAMA, 0, zb);
    walk(IWANAGA, -1.8, 0, zb + 1.8, "smile"); B(IWANAGA, -1.8, zb + 1.8);
    walk(SATO, 1.7, 0, zb + 2.2, "neutral"); B(SATO, 1.7, zb + 2.2);
  } else if (id === 3) {
    // THE WALK: alone toward the docks — he had gone back for his
    // forgotten hanko. High behind him: a bomber, two parachutes.
    const zb = 16 - 9 * u;
    walk(YAMA, 0, 0, zb, "neutral"); B(YAMA, 0, zb);
    if (u > 0.35) out.fx.push({ key: "plane", cw: 400, ch: 200, draw: drawPlane(), x: -7.5, y: 13.5, z: -14, w: 7.5, h: 3.75 });
  } else if (id === 4) {
    // FLASH 1 (stylized light only): he walks — the sky ignites —
    // the shockwave throws him flat; then dust, and a man crawling
    // up out of it, burned and bandaged by the story itself.
    const pre = fNow < FLASH1_F;
    if (pre) {
      const zb = 6.5 - 2.5 * u * 3;
      walk(YAMA, 0, 0, zb, "neutral"); B(YAMA, 0, zb);
    } else if (fNow < FLASH1_F + 40) {
      // knocked down by the shockwave: on his knees in the dust,
      // eyes shut, reeling (the flash + ring + camera kick carry
      // the impact — no explosion graphic, no thrown-body gag)
      out.places.push(person(cam, YAMA_B, 0.3, 0, 4.6, { pose: "kneel", expr: "sad", blink: 1 }));
      blob(out, 0.3, 0, 4.6, 1);
    } else {
      // afterwards: still on his knees, then up — bandaged, ears ringing
      if (u < 0.8) out.places.push(person(cam, YAMA_B, 0.3, 0, 4.4, { pose: "kneel", expr: "sad", blink: lidAt(t, YAMA_B.i) }));
      else stand(YAMA_B, 0.3, 0, 4.4, "nervous");
      B(YAMA_B, 0.3, 4.4);
    }
    glowFx("hiro", 0, 7, -26, 34, fNow < FLASH1_F ? 0 : Math.max(0, 1 - (fNow - FLASH1_F) / 90));
    ringFx(FLASH1_F, 0, -2, 15);
  } else if (id === 5) {
    // THE NIGHT: the shelter mouth in the ruins — three survivors
    // sit out the night while the city burns around them. Sober.
    out.places.push(person(cam, YAMA_B, 79.0, 0, -18.4, { pose: "sit", expr: "sad", blink: lidAt(t, YAMA_B.i) })); B(YAMA_B, 79.0, -18.4);
    out.places.push(person(cam, IWANAGA, 80.6, 0, -18.9, { pose: "sit", expr: "sad", blink: lidAt(t, IWANAGA.i) })); B(IWANAGA, 80.6, -18.9);
    out.places.push(person(cam, SATO, 78.2, 0, -17.4, { pose: "sit", expr: "sad", blink: lidAt(t, SATO.i) })); B(SATO, 78.2, -17.4);
    fireFx(74.5, -13.5, 1.3); fireFx(85.5, -15, 1.1); fireFx(71, -19, 0.9);
    glowFx("ruin", 80, 5.5, -30, 30, 0.4 + 0.1 * Math.sin(t * 1.7));
  } else if (id === 6) {
    // THE TRAIN: bandaged head to toe, he boards at the platform —
    // then rides the window out of the ruined city, going home.
    const off = trainOff(u);
    if (u < 0.3) {
      // walks diagonally across the platform to the middle car's
      // door (door world x = 35.1 + off, train side z = 61.2)
      const wx = 29.5 + (u / 0.3) * 5.7, wz = 58.9 + (u / 0.3) * 2.3;
      walk(YAMA_B, wx, 0.5, wz, "sad"); blob(out, wx, 0.5, wz);
    } else {
      stand(YAMA_B, 35.2 + off, 0.55, 61.2, "sad", {}, 0.95);
    }
  } else if (id === 7) {
    // BACK AT WORK, 9 AUGUST: perban di mana-mana — and he still
    // walks in and reports for duty. The room turns to stare.
    const wx = -74.5 - 4.6 * Math.min(1, u / 0.55);
    if (u < 0.55) walk(YAMA_B, wx, 0, -17.8, "nervous");
    else stand(YAMA_B, wx, 0, -17.8, "nervous", { armR: [30, 20] });
    B(YAMA_B, wx, -17.8);
    // coworkers gathered close (the portrait frame is narrow — the
    // boss stays out of this shot; he enters the story in shot 8)
    stand(CO_A, -80.6, 0, -20.6, "shock", { look: 0.7 }); B(CO_A, -80.6, -20.6);
    stand(CO_B, -77.9, 0, -21.6, "nervous", { look: -0.6 }); B(CO_B, -77.9, -21.6);
  } else if (id === 8) {
    // "KAMU GILA": he tells it plainly — one bomb, one city. The
    // supervisor laughs in his face.
    stand(BOSS, -82.3, 0, -22.6, u < 0.45 ? "stern" : "laugh", {}, 1.05); B(BOSS, -82.3, -22.6, 1.05);
    stand(YAMA_B, -80.5, 0, -20.0, "nervous", { armR: [48, 26], look: -0.3 }, 1.08); B(YAMA_B, -80.5, -20.0, 1.08);
  } else if (id === 9) {
    // FLASH 2: mid-sentence — the windows go white. Papers lift.
    // Two men are knocked a step sideways by light itself.
    const hit = fNow >= FLASH2_F;
    const shove = hit ? Math.min(1, (fNow - FLASH2_F) / 8) : 0;
    stand(BOSS, -82.3 - shove * 0.5, 0, -22.6, hit ? "shock" : "laugh", hit ? { armL: [-140, -15], armR: [140, 15] } : {}, 1.05, hit ? { roll: -0.06 } : {});
    B(BOSS, -82.3, -22.6, 1.05);
    stand(YAMA_B, -80.5 + shove * 0.4, 0, -20.0, hit ? "shock" : "nervous", hit ? { armL: [-150, -15], armR: [150, 15] } : { armR: [48, 26], look: -0.3 }, 1.08, hit ? { roll: 0.05 } : {});
    B(YAMA_B, -80.5, -20.0, 1.08);
    if (hit) {
      for (let i = 0; i < 7; i++) {
        const cyc = ((fNow - FLASH2_F) / 55 + i * 0.31) % 1;
        const yy = 3.4 - cyc * 2.9, xx = -81.5 + (hh(i, 7) - 0.5) * 4.6 + Math.sin(t * 2 + i * 2.3) * 0.4, zz = -20.8 + (hh(i, 9) - 0.5) * 3.2;
        if (yy > 0.3) out.fx.push({ key: "paperfly", cw: 110, ch: 84, draw: drawPaper(), x: xx, y: yy, z: zz, w: 0.36, h: 0.28 });
      }
    }
    glowFx("naga", -80, 3.2, -29.5, 22, hit ? Math.max(0, 1 - (fNow - FLASH2_F) / 80) : 0);
    ringFx(FLASH2_F, -80.5, -18, 9);
  } else if (id === 10) {
    // STILL ALIVE: grey light, settling dust. He is on his feet.
    // The supervisor sits on the floor — not laughing now.
    stand(YAMA_B, -80.4, 0, -19.9, fNow > L[9] + 60 ? "relief" : "shock", {}, 1.08); B(YAMA_B, -80.4, -19.9, 1.08);
    out.places.push(person(cam, BOSS, -82.4, 0, -21.6, { pose: "sit", expr: "shock", blink: lidAt(t, BOSS.i) }, 1.05)); B(BOSS, -82.4, -21.6, 1.05);
    for (let i = 0; i < 5; i++) {
      const cyc = (t * 0.05 + i * 0.23) % 1;
      const yy = 3.2 - cyc * 2.8, xx = -81 + (hh(i, 11) - 0.5) * 5.4, zz = -20.5 + (hh(i, 13) - 0.5) * 3.6;
      out.fx.push({ key: "dust", cw: 128, ch: 128, draw: (p) => { const g = p.g; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(200,192,175,0.20)"); gr.addColorStop(1, "rgba(200,192,175,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, x: xx, y: yy, z: zz, w: 1.6, h: 1.6, soft: true });
    }
  } else if (id === 11) {
    // THE LONG LIFE: decades on — an old man walks a rebuilt
    // Nagasaki street in the evening light, unhurried, at peace.
    const zb = 31 - 8.5 * u;
    walk(YAMA_OLD, -80, 0, zb, "smile"); B(YAMA_OLD, -80, zb);
    walk(CR_A, -77.2, 0, zb + 6.5, "neutral", {}, 0.95); B(CR_A, -77.2, zb + 6.5, 0.95);
    stand(CR_B, -76.8, 0, 24.5, "smile", {}, 0.95); B(CR_B, -76.8, 24.5, 0.95);
  } else if (id === 12) {
    // THE ADVOCATE: at a lectern in the plaza, the old survivor
    // spends his last decades on one sentence: never again.
    // he stands BESIDE the lectern, gesturing — behind it only his
    // head would clear the top from this camera
    stand(YAMA_OLD, -81.3, 0, 45.0, "stern", { armR: [36, 20] }, 1.05); B(YAMA_OLD, -81.3, 45.0, 1.05);
    // the crowd clusters tight behind him (portrait frame: at this
    // depth only ±2.6 m around the axis is visible)
    stand(CR_A, -82.9, 0, 48.0, "neutral", {}, 0.95); B(CR_A, -82.9, 48.0, 0.95);
    stand(CR_B, -77.6, 0, 48.2, "neutral", {}, 0.95); B(CR_B, -77.6, 48.2, 0.95);
    stand(CR_C, -81.9, 0, 50.2, "smile", {}, 0.95); B(CR_C, -81.9, 50.2, 0.95);
    stand(HERO, -78.5, 0, 50.0, "neutral", { look: -0.4 }, 1.05); B(HERO, -78.5, 50.0, 1.05);
  } else if (id === 13) {
    // 2009 + PUNCHLINE (golden): the certificate in his hands —
    // the only man ever recognized. The hero closes the story.
    stand(YAMA_OLD, -80.1, 0, 45.0, "relief", { prop: "paper", armR: [38, 18] }, 1.1); B(YAMA_OLD, -80.1, 45.0, 1.1);
    stand(HERO, -77.6, 0, 42.4, "grin", { armR: [158 + Math.sin(t * 6) * 10, 12] }, 1.24); B(HERO, -77.6, 42.4, 1.24);
    burstFx(S0(12) + 0.3, 1.6, -80, 3.4, 43.5, 3.0, true);
  }
  return out;
};
