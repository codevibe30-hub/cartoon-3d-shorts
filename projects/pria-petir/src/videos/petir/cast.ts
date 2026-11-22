// The cast of "Pria Ini Kesamber Petir 7 Kali Dan Tetap Hidup🤫" as
// DASIMAN-STYLE stickman sprites: round WHITE heads, thin black
// limbs, one coloured torso each (stick.ts). The hero/storyteller
// wears the mascot's red tie. Same pool + sprite machinery as the
// pilot: one canvas per distinct drawing, yaw-only billboards shaded
// by cardShade(), soft contact blobs. The lightning is LIGHT ONLY:
// a bolt sprite, a glow, an expanding dust ring — no gore, ever,
// and nobody ever reads as dead (no X-eyes on living people).
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, HERO_SPOT, ROY_RIDGE, HOOK_F, STRIKES, truckX, ROAD_Z, DOCK } from "./story";
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
// ROY SULLIVAN: park ranger — green-grey uniform shirt, campaign hat.
const ROY: Who = { i: 71, o: { torso: "#5d7263", hat: "#6b5b3e", belt: "#4a3b2c" }, okey: "roy" };
// OLD ROY: same man, decades on — grey tufts under the same hat.
const ROY_OLD: Who = { i: 72, o: { torso: "#8a7a5f", hat: "#6b5b3e", tufts: "#c9ccce" }, okey: "royOld" };
// A fellow ranger + two park visitors for the clearing.
const RANGER2: Who = { i: 73, o: { torso: "#7a7f5d", hat: "#6b5b3e", belt: "#4a3b2c" }, okey: "ranger2" };
const VIS_A: Who = { i: 81, o: { torso: "#b5653f" }, okey: "visA" };
const VIS_B: Who = { i: 82, o: { torso: "#3f6fb5" }, okey: "visB" };

// ---------------- fx draws ----------------
// THE BOLT: a jagged white core with a warm glow — stylized light.
const drawBolt = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  const pts: [number, number][] = [];
  let x = 246 + (hh(seed, 1) - 0.5) * 30;
  pts.push([x, 6]);
  const segs = 6;
  for (let i = 1; i <= segs; i++) {
    x += (hh(seed + i, 2) - 0.5) * 120;
    pts.push([x, 6 + (994 / segs) * i]);
  }
  g.globalAlpha = a * 0.5; p.stroke(pts, 44, "#ffe98a");
  g.globalAlpha = a; p.stroke(pts, 17, "#ffffff");
  // a branch fork near the top
  const b0 = pts[2], b1: [number, number] = [b0[0] + 90 + hh(seed, 3) * 60, b0[1] + 190];
  g.globalAlpha = a * 0.7; p.stroke([b0, [(b0[0] + b1[0]) / 2 + 18, (b0[1] + b1[1]) / 2], b1], 9, "#ffffff");
  g.globalAlpha = 1;
};
// stylized strike light: a soft radial glow (NEVER a fireball on people)
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
const drawFlame = (ph: number) => (p: Pen) => {
  const f = Math.sin(ph * Math.PI * 2);
  p.ell(100, 126, 60, 72 + f * 9, "#e8641e", 0);
  p.ell(100, 140, 39, 49 + f * 7, "#f59b23", 0);
  p.ell(100, 152, 19, 29 + f * 4, "#ffd94d", 0);
};
// THE BEAR: a chunky brown silhouette, side profile facing LEFT
const drawBear = (step: number) => (p: Pen) => {
  const bob = Math.sin(step * Math.PI * 2) * 7;
  const body = "#6e4a2f", dark = "#54371f";
  // legs (two near, two far, offset by the walk step)
  const lp = Math.sin(step * Math.PI * 2) * 22;
  p.poly([[120, 218 + bob], [148, 218 + bob], [146 + lp, 330], [118 + lp, 330]], dark, 4);
  p.poly([[330, 218 + bob], [358, 218 + bob], [360 - lp, 330], [332 - lp, 330]], dark, 4);
  p.poly([[160, 218 + bob], [190, 218 + bob], [188 - lp, 334], [158 - lp, 334]], body, 4);
  p.poly([[292, 218 + bob], [322, 218 + bob], [324 + lp, 334], [294 + lp, 334]], body, 4);
  // body + shoulder hump
  p.ell(250, 168 + bob, 148, 82, body, 6);
  p.ell(158, 128 + bob, 74, 52, body, 0);
  // head: round, snout to the left, one round ear
  p.ell(96, 148 + bob, 56, 50, body, 6);
  p.ell(118, 106 + bob, 17, 17, body, 5);
  p.ell(52, 168 + bob, 30, 22, "#8a6544", 4);
  p.dot(34, 164 + bob, 7, INK);
  p.dot(96, 140 + bob, 8, INK);
  // a little tail
  p.ell(392, 150 + bob, 16, 14, body, 0);
};
// the one dark cloud that follows Roy (shot 8)
const drawCloudDark = () => (p: Pen) => {
  p.ell(150, 150, 110, 52, "#39434f", 0);
  p.ell(256, 128, 130, 66, "#333d48", 0);
  p.ell(362, 150, 110, 52, "#39434f", 0);
  p.ell(256, 168, 170, 44, "#2c353f", 0);
  p.ell(190, 118, 80, 40, "#46525f", 0);
};
// a caught fish in a bucket (the bear's target)
const drawBucket = () => (p: Pen) => {
  p.poly([[52, 70], [148, 70], [138, 168], [62, 168]], "#7d94a6", 5);
  p.stroke([[52, 70], [100, 40], [148, 70]], 6, "#5d7484");
  // a fish tail sticking out of the top
  p.poly([[96, 66], [76, 22], [104, 38], [124, 20], [118, 62]], "#a9c6d8", 4);
};
// one tally bolt for the closing count-up
const drawBoltSmall = () => (p: Pen) => {
  p.poly([[118, 8], [52, 108], [92, 108], [66, 190], [150, 78], [106, 78], [140, 8]], "#ffd94d", 6);
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
  const walk = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, rate = 1.85) =>
    out.places.push(person(cam, who, x, y, z, { pose: "walk", phase: q((t * rate + who.i * 0.37) % 1, 30), expr, blink: lidAt(t, who.i), ...extra }, scale));
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number, soft = false) => {
    const uu = (tt - t0) / dur;
    if (uu >= 0 && uu < 1) out.fx.push({ key: `burst${q(uu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(uu, 24)), x, y, z, w, h: w, soft });
  };
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(200,214,255,0.55)"), x, y, z, w, h: w, soft: true });
  };
  const ringFx = (f0: number, x: number, z: number, maxR: number) => {
    const uu = (fNow - f0) / 26;
    if (uu >= 0 && uu < 1) out.fx.push({ key: `ring${q(uu, 20)}`, cw: 512, ch: 512, draw: drawRing(q(uu, 20)), x, y: 0.06, z, w: maxR * 2 * (0.25 + uu * 0.75), h: maxR * 2 * (0.25 + uu * 0.75), flat: true, soft: true });
  };
  // a full strike at (x, z): bolt sprite for ~8 frames + glow + ring
  const boltFx = (f0: number, x: number, z: number, seed: number, topH = 8.5) => {
    const n = fNow - f0;
    if (n >= 0 && n < 8) {
      const a = [1, 0.95, 0.55, 0.9, 0.6, 0.35, 0.18, 0.06][n];
      out.fx.push({ key: `bolt${seed}|${q(a, 20)}`, cw: 512, ch: 1024, draw: drawBolt(seed, a), x, y: topH / 2 + 0.4, z, w: topH * 0.42, h: topH });
    }
    glowFx(`strike${seed}`, x, 3.4, z, 11, n < 0 ? 0 : Math.max(0, 1 - n / 40));
    ringFx(f0, x, z, 10);
  };
  // hair fire: a small flame riding Roy's crown
  const hairFire = (x: number, y: number, z: number, on: boolean, sc = 1) => {
    if (!on) return;
    const ph = q((tt * 1.6) % 1, 16);
    out.fx.push({ key: `hairflame${ph}`, cw: 200, ch: 200, draw: drawFlame(ph), x, y: y + 2.02 * sc, z, w: 0.44 * sc, h: 0.44 * sc, soft: true });
  };
  const B = (who: Who, x: number, z: number, sc = 1) => blob(out, x, 0, z, sc);

  if (id === 1) {
    // HOOK = the dramatic cover scene (no card in this lane): a
    // black storm over the ridge — Roy small on the path as a bolt
    // lands behind him, the hero huge in front, horrified.
    if (fNow < HOOK_F) { walk(ROY, ROY_RIDGE[0], 0, ROY_RIDGE[2], "nervous"); }
    else stand(ROY, ROY_RIDGE[0], 0, ROY_RIDGE[2], "shock", { armL: [-150, -15], armR: [150, 15] });
    B(ROY, ROY_RIDGE[0], ROY_RIDGE[2]);
    boltFx(HOOK_F, ROY_RIDGE[0] - 1.6, ROY_RIDGE[2] - 2.5, 3);
    stand(HERO, HERO_SPOT[0], 0, HERO_SPOT[2], "shock", { armL: [-150, -15], armR: [150, 15] }, 1.32); B(HERO, HERO_SPOT[0], HERO_SPOT[2], 1.32);
  } else if (id === 2) {
    // THE RECORD HOLDER: Roy walks his trail past the park sign,
    // an ordinary ranger on an ordinary bright morning.
    const zb = -15 + 9.5 * u;
    walk(ROY, 0, 0, zb, "smile"); B(ROY, 0, zb);
  } else if (id === 3) {
    // STRIKE 1 (1942): he ducks INTO the tower's shelter as the
    // storm breaks — the bolt takes the tower itself; Roy comes
    // out of it kneeling, holding his foot. One toenail: gone.
    const sx = 66.6, sz = -30.4;
    if (fNow < STRIKES[0]) { stand(ROY, sx, 0, sz, "nervous", { look: 0.4 }); }
    else if (u < 0.62) out.places.push(person(cam, ROY, sx, 0, sz, { pose: "kneel", expr: "sad", blink: 1 }));
    else walk(ROY, sx - 1.2, 0, sz + 0.8, "sad", {}, 1, 0.9);
    B(ROY, sx, sz);
    boltFx(STRIKES[0], 70, -35, 7, 10.8); // the bolt takes the tower top
  } else if (id === 4) {
    // STRIKE 2 (1969): the truck rolls along the mountain road —
    // the bolt goes through the cab. Roy ends up on the roadside,
    // on his feet, dazed, hands on his head. Eyebrows: gone.
    const uS = clamp01((STRIKES[1] - L[3]) / Math.max(1, L[4] - L[3]));
    const stopX = truckX(uS);
    if (fNow >= STRIKES[1]) {
      stand(ROY, stopX - 3.6, 0, ROAD_Z + 3.2, fNow < STRIKES[1] + 55 ? "shock" : "nervous", { armL: [-128, -38], armR: [128, 38] });
      B(ROY, stopX - 3.6, ROAD_Z + 3.2);
    }
    boltFx(STRIKES[1], stopX - 1.2, ROAD_Z, 11);
  } else if (id === 5) {
    // STRIKE 3 (1970): his own front yard. He is just standing in
    // it, at home, where a man is supposed to be safe.
    const sx = -70.3, sz = 33.8;
    if (fNow < STRIKES[2]) { stand(ROY, sx, 0, sz, "smile", { armR: [24, 14] }); }
    else if (u < 0.6) out.places.push(person(cam, ROY, sx, 0, sz, { pose: "kneel", expr: "sad", blink: lidAt(t, ROY.i) }));
    else stand(ROY, sx, 0, sz, "nervous", { armR: [58, 96] }); // clutching the seared shoulder
    B(ROY, sx, sz);
    boltFx(STRIKES[2], sx, sz, 13);
  } else if (id === 6) {
    // STRIKE 4 (1972): inside the station — the windows go white,
    // his HAIR CATCHES FIRE, and the famous can of water is born.
    const sx = -70.6, sz = -30.2;
    const since = fNow - STRIKES[3];
    if (fNow < STRIKES[3]) { stand(ROY, sx, 0, sz, "neutral", { armR: [30, 18] }); }
    else if (since < 34) stand(ROY, sx, 0, sz, "shock", { armL: [-150, -15], armR: [150, 15] });
    else if (since < 78) stand(ROY, sx, 0, sz, "nervous", { prop: "can", armR: [46, 30], armL: [-120, -30] });
    else stand(ROY, sx, 0, sz, "relief", { prop: "can", armR: [30, 16] });
    B(ROY, sx, sz);
    hairFire(sx, 0, sz, since >= 4 && since < 62);
    boltFx(STRIKES[3], sx - 0.5, sz - 5.5, 17, 7); // the bolt comes through the window line
    glowFx("station", sx, 2.4, sz - 3, 11, since < 0 ? 0 : Math.max(0, 1 - since / 40));
  } else if (id === 7) {
    // STRIKE 5 (1973): beside the parked truck — thrown clean out
    // of the cab story-wise; he sits on the ground, hair smoking,
    // then gets up like a man late for work. Again.
    const sx = 31.6, sz = ROAD_Z + 2.4;
    const since = fNow - STRIKES[4];
    if (fNow < STRIKES[4]) { walk(ROY, sx - 3.5 + 3.5 * u * 2.4, 0, sz, "neutral"); }
    else if (since < 66) {
      out.places.push(person(cam, ROY, sx, 0, sz, { pose: "sit", expr: "sad", blink: lidAt(t, ROY.i) }));
      hairFire(sx, 0, sz, since >= 4 && since < 40, 0.8);
    } else stand(ROY, sx, 0, sz, "nervous", { prop: "can", armR: [28, 14] });
    B(ROY, sx, sz);
    boltFx(STRIKES[4], sx - 1.5, sz - 1.5, 19);
  } else if (id === 8) {
    // STRIKE 6 (1976): one black cloud hangs over Roy alone. He
    // walks. He looks up. He RUNS. The cloud keeps up. Percuma.
    const runStart = 0.42;
    const zb = u < runStart ? -13 + 5 * (u / runStart) : -8 + 9 * ((u - runStart) / (1 - runStart));
    const since = fNow - STRIKES[5];
    if (fNow >= STRIKES[5]) {
      walk(ROY, 0, 0, zb, "sad", {}, 1, 0.85); // the limp home
    } else if (u < runStart) {
      walk(ROY, 0, 0, zb, "nervous", {}, 1, 1.85);
    } else {
      walk(ROY, 0, 0, zb, "shock", {}, 1, 3.6); // the run
    }
    B(ROY, 0, zb);
    // the cloud: glued above him until the strike, then drifting off
    const cx = since > 0 ? 0 + Math.min(6, since / 14) : 0;
    out.fx.push({ key: "stormcloud", cw: 512, ch: 256, draw: drawCloudDark(), x: cx, y: 6.8, z: zb - 0.5, w: 7.5, h: 3.75, soft: true });
    boltFx(STRIKES[5], 0, zb, 23);
  } else if (id === 9) {
    // STRIKE 7 (1977): peace and quiet, a rod, a pond. The bolt
    // takes the water beside the dock; Roy ends up standing on
    // the dock clutching his chest, burned again, alive again.
    const sx = DOCK[0], sz = DOCK[2];
    const since = fNow - STRIKES[6];
    if (fNow < STRIKES[6]) {
      out.places.push(person(cam, ROY, sx, 0.5, sz, { pose: "sit", expr: "smile", prop: "rod", blink: lidAt(t, ROY.i) }));
    } else if (since < 40) {
      out.places.push(person(cam, ROY, sx, 0.5, sz, { pose: "sit", expr: "shock", blink: lidAt(t, ROY.i) }, 1, { roll: -0.1 }));
    } else {
      stand(ROY, sx, 0.5, sz, "nervous", { armL: [44, 98] }); // clutching his chest
    }
    blob(out, sx, 0.5, sz);
    out.fx.push({ key: "bucket", cw: 200, ch: 200, draw: drawBucket(), x: sx - 1.05, y: 0.78, z: sz + 0.55, w: 0.5, h: 0.5 });
    boltFx(STRIKES[6], sx + 2.6, sz + 2.2, 29);
  } else if (id === 10) {
    // THE BEAR: sun's out. The bear comes down the bank for the
    // fish bucket; Roy — struck seven times, most recently TODAY —
    // picks up a stick and explains the situation to the bear.
    const sx = DOCK[0], sz = DOCK[2];
    const bearIn = clamp01(u / 0.38), bearOut = clamp01((u - 0.68) / 0.3);
    const bx = 71.5 - bearIn * 7.6 + bearOut * 5.2, bz = 45.5 - bearIn * 5.6 + bearOut * 2.2;
    if (u < 0.4) stand(ROY, sx, 0.5, sz, "shock", { armL: [-140, -15], armR: [140, 15] });
    else if (u < 0.78) stand(ROY, sx, 0.5, sz, "stern", { prop: "stick", armR: [142 + Math.sin(t * 7) * 16, 10], armL: [-60, -20] });
    else stand(ROY, sx, 0.5, sz, "grin", { prop: "stick", armR: [40, 16] });
    blob(out, sx, 0.5, sz);
    out.fx.push({ key: "bucket", cw: 200, ch: 200, draw: drawBucket(), x: sx - 1.05, y: 0.78, z: sz + 0.55, w: 0.5, h: 0.5 });
    const step = q((t * 1.5) % 1, 24);
    out.fx.push({ key: `bear${step}`, cw: 512, ch: 384, draw: drawBear(step), x: bx, y: 1.31, z: bz, w: 2.9, h: 2.18 });
    blob(out, bx, 0.5, bz, 1.4);
  } else if (id === 11) {
    // AVOIDED: a far rumble — and three people quietly relocate.
    // Roy, can in hand, watches them go. It is funny. It is sad.
    const sx = 16, sz = 58;
    const away = smooth((u - 0.38) / 0.3);
    stand(ROY, sx, 0, sz, u < 0.75 ? "sad" : "smile", { prop: "can", armR: [26, 12] }); B(ROY, sx, sz);
    stand(RANGER2, sx - 1.9 - away * 1.1, 0, sz - 0.6 - away * 0.8, away > 0.3 ? "nervous" : "smile", { look: 0.5 }); B(RANGER2, sx - 2.1, sz - 0.6);
    stand(VIS_A, sx + 2.0 + away * 1.2, 0, sz + 0.4 + away * 0.7, away > 0.3 ? "nervous" : "smile", { look: -0.5 }); B(VIS_A, sx + 2.3, sz + 0.4);
    stand(VIS_B, sx + 0.6 + away * 1.2, 0, sz + 2.4 + away * 1.2, away > 0.3 ? "nervous" : "neutral", {}); B(VIS_B, sx + 0.6, sz + 2.6);
    if (u > 0.3 && u < 0.5) glowFx("far", sx + 14, 4, sz + 10, 16, 0.35);
  } else if (id === 12) {
    // THE IRONY (golden): evening, his own yard, an old man walking
    // home through warm light. Lightning never got him in the end.
    const wx = -65.5 - 5.6 * u, wz = 36.5 - 3.2 * u;
    walk(ROY_OLD, wx, 0, wz, "smile", {}, 1, 0.85); B(ROY_OLD, wx, wz);
    stand(HERO, -72.5, 0, 31.5, "smile", {}, 1.02); B(HERO, -72.5, 31.5, 1.02);
  } else if (id === 13) {
    // CLOSE (golden): the ridge, warm now. Old Roy beside the
    // hero — and above them, the count: one, two, ... SEVEN.
    stand(ROY_OLD, -1.7, 0, -67.6, "relief", {}, 1.12); B(ROY_OLD, -1.7, -67.6, 1.12);
    stand(HERO, HERO_SPOT[0], 0, HERO_SPOT[2], "grin", { armR: [158 + Math.sin(t * 6) * 10, 12] }, 1.3); B(HERO, HERO_SPOT[0], HERO_SPOT[2], 1.3);
    for (let i = 0; i < 7; i++) {
      if (fNow > L[12] + 26 + i * 15) {
        out.fx.push({ key: "tallybolt", cw: 200, ch: 200, draw: drawBoltSmall(), x: -3.6 + i * 1.05, y: 3.35, z: -66.8, w: 0.62, h: 0.62, soft: true });
      }
    }
    burstFx(S0(12) + 0.3, 1.6, -0.5, 3.6, -66.5, 3.0, true);
  }
  return out;
};
