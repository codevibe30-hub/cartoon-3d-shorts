// The cast of "Pria Ini Menyelamatkan 669 Anak, Lalu Diam 50
// Tahun🤫" as DASIMAN-STYLE stickman sprites: round WHITE heads,
// thin black limbs, one coloured torso each (stick.ts). The
// hero/storyteller wears the mascot's red tie. Same pool +
// sprite machinery as episodes 1-3: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft
// contact blobs. TONE: respectful — nobody is ever a joke here;
// the children are small, the goodbyes are quiet, and the war is
// never shown, only its shadow: a gate coming down.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, PLAT_Y, TRACK_Z, WINTON_WAVE, HERO_SPOT, TRAIN_BASE_X, trainX, CAR_OFF, WIN_Y, WIN_Z, routeAt } from "./story";
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
// NICHOLAS WINTON, 29: a London stockbroker's dark suit.
const WINTON: Who = { i: 61, o: { torso: "#2e3440", tie: "#4a2e35", belt: "#22242a" }, okey: "winton" };
// OLD WINTON, 78: the same suit, greyer; grey tufts at the ears.
const WINTON_OLD: Who = { i: 62, o: { torso: "#43434a", tie: "#4a2e35", tufts: "#c9ccce" }, okey: "wintonOld" };
// GRETE, his wife: a teal dress, hair in a neat bun.
const GRETE: Who = { i: 63, o: { torso: "#5d7a72", bun: "#4a3423" }, okey: "grete" };
// THE PRESENTER (BBC, 1988): a deep-red dress, hair in a bun.
const HOST: Who = { i: 64, o: { torso: "#7a2e3a", bun: "#2e2118" }, okey: "host" };
// Parents of Prague.
const FATHER: Who = { i: 71, o: { torso: "#4f4438", belt: "#33291e" }, okey: "father" };
const MOTHER: Who = { i: 72, o: { torso: "#6d5468", bun: "#33241c" }, okey: "mother" };
const PARENT_B: Who = { i: 73, o: { torso: "#54655e", belt: "#3a453f" }, okey: "parentB" };
const PARENT_C: Who = { i: 74, o: { torso: "#74604a", bun: "#241a12" }, okey: "parentC" };
const PARENT_D: Who = { i: 75, o: { torso: "#4a5468", belt: "#2e3542" }, okey: "parentD" };
// The children: small, in muted coats, each with a little suitcase of a life.
const childWho = (n: number): Who => ({
  i: 200 + n,
  o: { torso: ["#a8b8c8", "#c8a8a0", "#9db08a", "#b8a6c8", "#c2b280", "#a0b4a4"][n % 6] },
  okey: `child${n % 6}`,
});
const CHILD = 0.55;
// The studio audience: grown-up children, 1988.
const AUD_TORSOS = ["#7a5a78", "#4a5d7a", "#6d7a4a", "#8a6a42", "#54655e", "#74584f", "#5d5468", "#86655a"];
const audWho = (n: number): Who => ({
  i: 300 + n,
  o: { torso: AUD_TORSOS[n % 8], ...(n % 3 === 0 ? { tufts: "#c9ccce" } : {}), ...(n % 4 === 1 ? { bun: "#3a2a1c" } : {}) },
  okey: `aud${n}`,
});

// ---------------- fx draws ----------------
// locomotive steam: a soft cluster of white puffs
const drawPuff = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  g.globalAlpha = a * 0.5;
  for (let i = 0; i < 7; i++) {
    const x = 256 + (hh(seed + i, 5) - 0.5) * 190, y = 300 - i * 30 - hh(seed + i, 6) * 26, r = 44 + hh(seed + i, 7) * 52 + i * 9;
    const gr = g.createRadialGradient(x, y, 4, x, y, r);
    gr.addColorStop(0, "rgba(245,248,250,0.85)"); gr.addColorStop(1, "rgba(245,248,250,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
// dark war-smoke for a far horizon (never near people)
const drawSmoke = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  g.globalAlpha = a;
  for (let i = 0; i < 6; i++) {
    const x = 256 + (hh(seed + i, 8) - 0.5) * 170, y = 330 - i * 34, r = 52 + hh(seed + i, 9) * 46 + i * 8;
    const gr = g.createRadialGradient(x, y, 4, x, y, r);
    gr.addColorStop(0, "rgba(38,40,46,0.8)"); gr.addColorStop(1, "rgba(38,40,46,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
// a soft warm glow (lamplight, studio warmth)
const drawGlow = (warm: string) => (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 254);
  gr.addColorStop(0, "rgba(255,252,244,0.95)");
  gr.addColorStop(0.35, warm);
  gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};
// children at the carriage windows: small white heads and hands
// pressed to the glass, drawn over the lit window band
const drawWindowKids = (variant: number) => (p: Pen) => {
  const wins = [129, 314, 499, 684, 869]; // window centres, texture space
  const at = variant === 0 ? [0, 2, 3] : variant === 1 ? [1, 3] : [0, 4];
  for (const wi of at) {
    const x = wins[wi];
    p.ell(x, 150, 34, 36, "#ffffff", 5);
    p.dot(x - 12, 144, 4.5, INK); p.dot(x + 12, 144, 4.5, INK);
    p.arc(x, 168, 11, 8, 200, 340, 4);
    // two small hands pressed flat either side of the head
    p.ell(x - 44, 168, 11, 14, "#ffffff", 4);
    p.ell(x + 44, 168, 11, 14, "#ffffff", 4);
  }
};
// the little train of light that crosses the map
const drawTrainIcon = () => (p: Pen) => {
  p.poly([[60, 150], [330, 150], [330, 210], [60, 210]], "#31473a", 6);
  p.poly([[356, 128], [452, 128], [452, 210], [356, 210]], "#232a26", 6);
  for (let i = 0; i < 4; i++) p.poly([[84 + i * 60, 162], [124 + i * 60, 162], [124 + i * 60, 190], [84 + i * 60, 190]], "#ffd98d", 3);
  p.ell(110, 224, 17, 17, "#7a2e2a", 4); p.ell(190, 224, 17, 17, "#7a2e2a", 4);
  p.ell(290, 224, 17, 17, "#7a2e2a", 4); p.ell(404, 224, 17, 17, "#7a2e2a", 4);
  p.poly([[428, 96], [446, 96], [446, 128], [428, 128]], "#232a26", 4);
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
  const sit = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "sit", expr, blink: lidAt(t, who.i), ...extra }, scale));
  const B = (who: Who, x: number, y: number, z: number, sc = 1) => blob(out, x, y, z, sc);
  const wave = (amp = 13): [number, number] => [128 + Math.sin(t * 2.3) * amp, 12];
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(255,214,150,0.5)"), x, y, z, w, h: w, soft: true });
  };
  const steam = (x: number, y: number, z: number, strength: number) => {
    for (let k = 0; k < 3; k++) {
      const ph = (tt * 0.45 * strength + k / 3) % 1;
      out.fx.push({
        key: `puff${k}|${q(ph, 18)}`, cw: 512, ch: 512, draw: drawPuff(k * 7 + 3, (1 - ph) * 0.85),
        x: x + ph * 1.6, y: y + ph * 2.6, z, w: 1.6 + ph * 2.6, h: 1.6 + ph * 2.6, soft: true,
      });
    }
  };
  const windowKids = (trainGx: number, variants: number[]) => {
    variants.forEach((v, ci) => {
      out.fx.push({
        key: `winkids${v}`, cw: 1024, ch: 256, draw: drawWindowKids(v),
        x: trainGx + CAR_OFF[ci], y: WIN_Y, z: WIN_Z + 0.04, w: 6.8, h: 1.7,
      });
    });
  };
  const applause = (n: number): Partial<StickOpts> => {
    const o = Math.sin(t * 8.5 + n * 1.3) * 13;
    return { armL: [-138 - o, -18], armR: [138 + o, 18] };
  };

  if (id === 1) {
    // HOOK = the dramatic cover (no card in this lane): a night
    // platform in Prague, 1939 — the train lit gold, a child at
    // the window, Winton waving him away into safety, the parents
    // behind the barrier, the storyteller a quiet witness.
    windowKids(TRAIN_BASE_X, [0, 1]);
    steam(TRAIN_BASE_X - 13.2, 3.9, TRACK_Z, 0.7);
    stand(WINTON, WINTON_WAVE[0], PLAT_Y, WINTON_WAVE[2], "nervous", { armR: wave() });
    B(WINTON, WINTON_WAVE[0], PLAT_Y, WINTON_WAVE[2]);
    stand(childWho(1), -3.6, PLAT_Y, -70.4, "sad", { armR: wave(10) }, CHILD);
    B(childWho(1), -3.6, PLAT_Y, -70.4, CHILD);
    stand(MOTHER, -7.4, PLAT_Y, -67.3, "sad", { armR: [118 + Math.sin(t * 1.1) * 9, 10] });
    B(MOTHER, -7.4, PLAT_Y, -67.3);
    stand(FATHER, -8.9, PLAT_Y, -67.5, "sad", { armL: [36, 14] });
    B(FATHER, -8.9, PLAT_Y, -67.5);
    stand(HERO, HERO_SPOT[0], PLAT_Y, HERO_SPOT[2], "sad", {}, 1.28);
    B(HERO, HERO_SPOT[0], PLAT_Y, HERO_SPOT[2], 1.28);
    glowFx("lampL", -12, 4.3, -74.6, 5.5, 0.5);
    glowFx("lampR", 12, 4.3, -74.6, 5.5, 0.5);
  } else if (id === 2) {
    // DECEMBER 1938: a stockbroker crosses Prague with a
    // suitcase, past the hotel — he came to ski; he will stay
    // to work. A mother and child watch from the hotel door.
    const wx = 59 + u * 19;
    walk(WINTON, wx, 0, -30.2, u < 0.5 ? "neutral" : "stern", { prop: "suitcase" }, 1, 1.7);
    B(WINTON, wx, 0, -30.2);
    stand(MOTHER, 78.5, 0, -36.2, "sad", {});
    B(MOTHER, 78.5, 0, -36.2);
    stand(childWho(3), 77.4, 0, -36.0, "neutral", { prop: "suitcase" }, CHILD);
    B(childWho(3), 77.4, 0, -36.0, CHILD);
  } else if (id === 3) {
    // THE QUEUE: the corridor fills with parents — every one of
    // them asking a stranger to take their child somewhere safe.
    const queue: [Who, number, Who | null, number][] = [
      [FATHER, 61.5, childWho(0), 62.6], [MOTHER, 65.5, null, 0],
      [PARENT_B, 69.0, childWho(2), 70.1], [PARENT_C, 73.0, null, 0],
      [PARENT_D, 76.5, childWho(4), 77.6],
    ];
    for (const [who, x, kid, kx] of queue) {
      stand(who, x, 0, 27.4, "sad", kid ? { armR: [18, 8] } : {});
      B(who, x, 0, 27.4);
      if (kid) { stand(kid, kx, 0, 27.7, "neutral", { prop: "suitcase" }, CHILD); B(kid, kx, 0, 27.7, CHILD); }
    }
    stand(WINTON, 82.5, 0, 26.6, "smile", { prop: "paper", armR: [26, 14] });
    B(WINTON, 82.5, 0, 26.6);
  } else if (id === 4) {
    // THE OFFICE: one desk, one family at a time — documents,
    // foster homes, photographs pinned in rows behind him.
    stand(WINTON, -70, 0, 26.4, "neutral", { prop: "paper", armR: [30, 18] });
    B(WINTON, -70, 0, 26.4);
    stand(MOTHER, -68.2, 0, 29.6, "sad", { armL: [30, 20], armR: [24, 16] });
    B(MOTHER, -68.2, 0, 29.6);
    stand(childWho(5), -67.2, 0, 29.9, "neutral", { prop: "suitcase" }, CHILD);
    B(childWho(5), -67.2, 0, 29.9, CHILD);
  } else if (id === 5) {
    // THE ROUTE: eight trains cross the map — a small train of
    // light runs Praha -> the sea -> London while Winton traces
    // the line he built out of paperwork.
    stand(WINTON, -63.8, 0, -32.6, "neutral", { armR: [138, 8], look: -0.4 });
    B(WINTON, -63.8, 0, -32.6);
    const rp = routeAt(0.04 + u * 0.92);
    out.fx.push({ key: "trainicon", cw: 512, ch: 256, draw: drawTrainIcon(), x: rp[0], y: rp[1] + 0.55, z: rp[2], w: 2.3, h: 1.15 });
    glowFx("route", rp[0], rp[1], rp[2] - 0.05, 2.6, 0.55);
  } else if (id === 6) {
    // FIRST TRAIN, 14 MARCH: twenty children. It pulls away
    // slowly, steam and gold windows, and the platform waves
    // until there is nothing left to wave at.
    const gx = trainX(u);
    windowKids(gx, [2, 0]);
    steam(gx - 13.2, 3.9, TRACK_Z, 1.25);
    const still = u < 0.78;
    stand(WINTON, WINTON_WAVE[0], PLAT_Y, WINTON_WAVE[2], still ? "nervous" : "sad", still ? { armR: wave() } : {});
    B(WINTON, WINTON_WAVE[0], PLAT_Y, WINTON_WAVE[2]);
    stand(childWho(1), -3.6, PLAT_Y, -70.4, "sad", still ? { armR: wave(10) } : {}, CHILD);
    B(childWho(1), -3.6, PLAT_Y, -70.4, CHILD);
    stand(MOTHER, -7.4, PLAT_Y, -67.3, "sad", { armR: [118 + Math.sin(t * 1.1) * 9, 10] });
    B(MOTHER, -7.4, PLAT_Y, -67.3);
    stand(FATHER, -8.9, PLAT_Y, -67.5, "sad", { armL: [36, 14] });
    B(FATHER, -8.9, PLAT_Y, -67.5);
  } else if (id === 7) {
    // LEFT BEHIND: the platform, empty now. Two small figures
    // at its edge, still waving at the place the train was.
    stand(MOTHER, -11.8, PLAT_Y, -70.6, "sad", { armR: [116 + Math.sin(t * 0.85) * 10, 10] });
    B(MOTHER, -11.8, PLAT_Y, -70.6);
    stand(FATHER, -10.2, PLAT_Y, -70.9, "sad", { prop: "suitcase" });
    B(FATHER, -10.2, PLAT_Y, -70.9);
  } else if (id === 8) {
    // THE NINTH TRAIN: night, and the train is cold — no steam,
    // no gold in the windows. On the bench, a mother and child
    // who are still waiting for a train that will not move.
    stand(WINTON, -2.5, PLAT_Y, -71, "sad", { prop: "paper", armR: [20, 10] }, 1, { pitch: 0.05 });
    B(WINTON, -2.5, PLAT_Y, -71);
    sit(MOTHER, 10.2, 1.06, -68.5, "sad", {});
    blob(out, 10.2, 1.06, -68.5);
    sit(childWho(2), 11.1, 1.06, -68.4, "sad", { prop: "suitcase" }, CHILD);
    glowFx("lampL", -12, 4.3, -74.6, 5.5, 0.4);
  } else if (id === 9) {
    // 1 SEPTEMBER 1939: the barrier is down, the horizon is
    // dark with far smoke, and there is nothing more to do.
    // Winton turns, and walks away from the gate.
    if (u < 0.45) {
      stand(WINTON, 2.6, 0, 44.2, "sad", { prop: "paper", armR: [16, 8] }, 1, { pitch: 0.05 });
      B(WINTON, 2.6, 0, 44.2);
    } else {
      const wu = (u - 0.45) / 0.55;
      walk(WINTON, 2.6 - wu * 7.5, 0, 44.2 - wu * 3.4, "sad", { prop: "paper" }, 1, 1.15);
      B(WINTON, 2.6 - wu * 7.5, 0, 44.2 - wu * 3.4);
    }
    for (const [sx, sy, ss] of [[-12, 7.5, 15], [4, 9, 19], [17, 8, 16]] as const) {
      out.fx.push({ key: `smoke${ss}`, cw: 512, ch: 512, draw: drawSmoke(ss, 0.5 + 0.14 * Math.sin(t * 0.4 + ss)), x: sx, y: sy, z: 78, w: ss, h: ss * 0.8, soft: true });
    }
  } else if (id === 10) {
    // THE SILENCE: he comes home from work like any other man,
    // hangs up fifty years of it, and sits down in his chair.
    if (u < 0.34) {
      walk(WINTON, 79.5 - (u / 0.34) * 4.4, 0, 71.2 + (u / 0.34) * 1.2, "neutral", { prop: "suitcase" }, 1, 1.5);
      B(WINTON, 79.5 - (u / 0.34) * 4.4, 0, 71.2 + (u / 0.34) * 1.2);
    } else {
      sit(WINTON, 73.5, 0.7, 73.5, u < 0.7 ? "neutral" : "sad", {});
      blob(out, 73.5, 0.7, 73.5);
    }
    glowFx("hearth", 75, 1.6, 70.5, 4.5, 0.3);
  } else if (id === 11) {
    // THE SCRAPBOOK: an attic in 1988 — Grete holds up a book
    // her husband never mentioned, and fifty years open at once.
    stand(GRETE, -73.1, 0, 72.2, u < 0.35 ? "shock" : "smile", { prop: "book", armR: [52, 20] });
    B(GRETE, -73.1, 0, 72.2);
    stand(WINTON_OLD, -76.9, 0, 72.7, u < 0.35 ? "neutral" : u < 0.62 ? "shock" : "relief_open", u >= 0.62 ? { armL: [40, 92] } : {});
    B(WINTON_OLD, -76.9, 0, 72.7);
    glowFx("bulb", -75, 3.4, 74.5, 5.5, 0.5);
  } else if (id === 12) {
    // THAT'S LIFE, 1988: the guest sits down in a television
    // studio, unaware. Then, one by one, the audience stands —
    // every one of them a child he put on a train.
    sit(WINTON_OLD, 0, 1.0, 128.4, u < 0.3 ? "nervous" : u < 0.62 ? "shock" : "relief_open", {});
    blob(out, 0, 1.0, 128.4);
    stand(HOST, 3.1, 0.3, 128.7, "smile", u > 0.22 ? { armR: [122, 14] } : { armR: [24, 12] });
    B(HOST, 3.1, 0.3, 128.7);
    const rows: [number, number][] = [[123.5, 0], [120.8, 0.55], [118.1, 1.1]];
    rows.forEach(([rz, rh], ri) => {
      for (let i = 0; i < 8; i++) {
        const n = ri * 8 + i, x = -7.7 + i * 2.2;
        const who = n === 7 ? HERO : audWho(n);
        const standAt = 0.3 + n * 0.021;
        if (u >= standAt) {
          stand(who, x, rh, rz + 0.85, "smile", applause(n), 1);
          B(who, x, rh, rz + 0.85);
        } else {
          sit(who, x, rh + 0.42, rz + 0.3, "smile", {}, 1);
          blob(out, x, rh + 0.42, rz + 0.3);
        }
      }
    });
    if (u > 0.8) glowFx("studio", 0, 3.0, 130.5, 9, 0.22);
  } else if (id === 13) {
    // CLOSE: a room standing for one quiet man — and the man
    // himself on his feet at last, smiling through it. True
    // kindness never needed the applause. It got it anyway.
    stand(WINTON_OLD, 0, 0.3, 128.2, "relief_open", {});
    B(WINTON_OLD, 0, 0.3, 128.2);
    stand(HOST, 3.1, 0.3, 128.7, "smile", applause(3));
    B(HOST, 3.1, 0.3, 128.7);
    const rows: [number, number][] = [[123.5, 0], [120.8, 0.55], [118.1, 1.1]];
    rows.forEach(([rz, rh], ri) => {
      for (let i = 0; i < 8; i++) {
        const n = ri * 8 + i, x = -7.7 + i * 2.2;
        const who = n === 7 ? HERO : audWho(n);
        stand(who, x, rh, rz + 0.85, "smile", applause(n), 1);
        B(who, x, rh, rz + 0.85);
      }
    });
    glowFx("studio", 0, 3.2, 130.5, 10, 0.25);
    const bu = (tt - S0(12)) / 1.8;
    if (bu >= 0 && bu < 1) out.fx.push({ key: `burst${q(bu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(bu, 24)), x: 0, y: 3.4, z: 127, w: 4.2, h: 4.2, soft: true });
  }
  return out;
};
