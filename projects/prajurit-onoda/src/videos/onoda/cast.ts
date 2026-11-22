// The cast of the Prajurit Onoda pilot as DASIMAN-STYLE stickman
// sprites in the 3D Lubang jungle: round WHITE heads, thin black
// limbs, one coloured torso each (stick.ts). The hero/storyteller
// wears the mascot's red tie. Same pool + sprite machinery as the
// house pipeline: one canvas per distinct drawing, yaw-only
// billboards shaded by cardShade(), soft contact blobs.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr, StickPose } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, CAMP, GRAVES, VILLAGE, HILL, CLEARING, HERO_SPOT, LEAFLET_T, FOUND_T, SALUTE_T } from "./story";
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


// ---------------- our people (Dasiman stickmen) ----------------
type Who = { i: number; o: StickOutfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, so: StickOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const key = `S|${who.okey}|${fkey(so)}`;
  return { key, x, y, z, scale, draw: (p) => stick(p, who.o, so), size: [w, h, k] };
};

// HERO: the storyteller — white shirt, the mascot's RED TIE.
const HERO: Who = { i: 41, o: { torso: "#f5f2ea", tie: "#c0272d" }, okey: "hero" };
// ONODA, young (1944) and old (1974): khaki uniform, field cap with
// neck flap, officer's sword; the old man's uniform is sun-faded and
// his side hair has gone grey — the uniform itself is still neat.
const ONODA_Y: Who = { i: 51, o: { torso: "#7c744e", cap: "#6f6a45", belt: "#5d5638", sword: true }, okey: "onodaY" };
const ONODA_O: Who = { i: 52, o: { torso: "#8a8262", cap: "#7a744f", belt: "#6a6248", sword: true, tufts: "#b9bcbe" }, okey: "onodaO" };
const AKATSU: Who = { i: 53, o: { torso: "#776e4a", cap: "#6f6a45", belt: "#5d5638" }, okey: "akatsu" };
const SHIMADA: Who = { i: 54, o: { torso: "#837a52", cap: "#756e47", belt: "#5d5638" }, okey: "shimada" };
const KOZUKA: Who = { i: 55, o: { torso: "#79714c", cap: "#6f6a45", belt: "#5d5638" }, okey: "kozuka" };
// TANIGUCHI: the young major of 1944; the old bookseller of 1974 in
// a dark suit, grey at the temples, the written order in his hand.
const TANI_Y: Who = { i: 56, o: { torso: "#5d6644", cap: "#525c3c", belt: "#454d31", sword: true }, okey: "taniY" };
const TANI_O: Who = { i: 57, o: { torso: "#3c4048", tie: "#7a1f24", tufts: "#c9ccce" }, okey: "taniO" };
// SUZUKI: the adventurer — loud orange jacket, red cap, big backpack.
const SUZUKI: Who = { i: 58, o: { torso: "#d8542e", cap: "#c23b2a", pack: "#5d7a3a" }, okey: "suzuki" };
// Lubang villagers + the watchful policeman.
const VIL_F: Who = { i: 61, o: { torso: "#b5653f" }, okey: "vilF" };
const VIL_M: Who = { i: 62, o: { torso: "#3f6fb5" }, okey: "vilM" };
const POLICE: Who = { i: 63, o: { torso: "#2e4a7a", cap: "#2e4a7a", belt: "#23272e" }, okey: "police" };

// ---------------- small fx draws ----------------
const drawLeaflet = () => (p: Pen) => {
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

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const S0 = (i: number) => L[i] / FPS;
  const u = clamp01((t - S0(id - 1)) / Math.max(0.01, S0(id) - S0(id - 1))); // shot-local progress
  const stand = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale));
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
  const B = (who: Who, x: number, z: number, sc = 1) => blob(out, x, 0, z, sc);

  if (id === 1) {
    // HOOK = the dramatic cover scene (no card in this lane): 1974 —
    // a soldier in a worn 1944 uniform stands alert in the jungle,
    // rifle at the ready; the hero has just stumbled onto him, hands
    // up, SHOCK face, big in frame.
    stand(ONODA_O, 0, 0, 3.2, "stern", { prop: "rifle" }, 1.12); B(ONODA_O, 0, 3.2, 1.12);
    stand(HERO, HERO_SPOT[0], 0, HERO_SPOT[2], "shock", { armL: [-150, -15], armR: [150, 15] }, 1.32); B(HERO, HERO_SPOT[0], HERO_SPOT[2], 1.32);
  } else if (id === 2) {
    // 1944: the patrol in file marches down the path into the jungle,
    // young Onoda at its head.
    const zb = 17 - 9.5 * u;
    walk(ONODA_Y, 0, 0, zb, "stern"); B(ONODA_Y, 0, zb);
    walk(AKATSU, -1.7, 0, zb + 2.6, "neutral"); B(AKATSU, -1.7, zb + 2.6);
    walk(SHIMADA, 1.6, 0, zb + 2.9, "neutral"); B(SHIMADA, 1.6, zb + 2.9);
    walk(KOZUKA, -0.8, 0, zb + 5.6, "neutral"); B(KOZUKA, -0.8, zb + 5.6);
  } else if (id === 3) {
    // THE ORDER: the major binds him — never surrender, never take
    // your own life, we will come back for you.
    stand(TANI_Y, -1.05, 0, 0.6, "stern"); B(TANI_Y, -1.05, 0.6);
    stand(ONODA_Y, 1.05, 0, 0.3, "neutral", { look: -0.4 }); B(ONODA_Y, 1.05, 0.3);
    fireFx(0, -1.6, 0.8);
  } else if (id === 4) {
    // 1945: from the hill, the village celebrates the peace far
    // below — flags, laughter, festival bursts. He watches, and stays.
    stand(ONODA_Y, 9.8, 0, 16.6, "neutral", { look: -0.9 }); B(ONODA_Y, 9.8, 16.6);
    walk(VIL_F, -24.5, 0, 5.5, "grin", {}, 0.95); B(VIL_F, -24.5, 5.5, 0.95);
    stand(VIL_M, -27.2, 0, 7.6, "laugh", { armR: [150, 10] }, 0.95); B(VIL_M, -27.2, 7.6, 0.95);
    stand(POLICE, -22.4, 0, 3.2, "smile", {}, 0.95); B(POLICE, -22.4, 3.2, 0.95);
    burstFx(S0(3) + 0.8, 1.1, -26, 6.8, 5, 3.2, true);
    burstFx(S0(3) + 2.3, 1.1, -23.5, 7.6, 7, 2.6, true);
    burstFx(S0(3) + 3.8, 1.1, -28, 7.2, 3.5, 2.8, true);
  } else if (id === 5) {
    // LEAFLETS: white paper flutters down through the trees. He
    // reads one — and shakes his head. Propaganda.
    stand(ONODA_Y, 0, 0, 1.2, "stern", { look: u > 0.45 && u < 0.8 ? Math.sin(t * 5.2) * 0.75 : 0 }); B(ONODA_Y, 0, 1.2);
    for (let i = 0; i < 9; i++) {
      const cyc = (t * 0.16 + i * 0.37) % 1;
      const yy = 6.4 - cyc * 6.1, xx = (hh(i, 7) - 0.5) * 5.4 + Math.sin(t * 1.4 + i * 2.1) * 0.5, zz = 1.0 + (hh(i, 9) - 0.5) * 4.4;
      if (yy > 0.25) out.fx.push({ key: "leaflet", cw: 110, ch: 84, draw: drawLeaflet(), x: xx, y: yy, z: zz, w: 0.36, h: 0.28 });
    }
    if (t > LEAFLET_T) out.fx.push({ key: "leafletFlat", cw: 110, ch: 84, draw: drawLeaflet(), x: 0.55, y: 0.04, z: 2.3, w: 0.4, h: 0.31, flat: true, rot: 0.7 });
  } else if (id === 6) {
    // THE COMPANIONS THIN OUT (storm): four men at a small fire.
    // Mid-shot, Akatsu rises and walks away down the path — 1950.
    // The others watch him go.
    fireFx(0, -0.4, 1);
    out.places.push(person(cam, ONODA_Y, 1.05, 0, 0.55, { pose: "sit", expr: "neutral", blink: lidAt(t, ONODA_Y.i), look: -0.5 })); B(ONODA_Y, 1.05, 0.55);
    out.places.push(person(cam, SHIMADA, -1.0, 0, -1.15, { pose: "sit", expr: "neutral", blink: lidAt(t, SHIMADA.i), look: 0.4 })); B(SHIMADA, -1.0, -1.15);
    out.places.push(person(cam, KOZUKA, 1.15, 0, -1.25, { pose: "sit", expr: "neutral", blink: lidAt(t, KOZUKA.i), look: -0.3 })); B(KOZUKA, 1.15, -1.25);
    if (u < 0.42) {
      out.places.push(person(cam, AKATSU, -1.15, 0, 0.6, { pose: "sit", expr: "sad", blink: lidAt(t, AKATSU.i) })); B(AKATSU, -1.15, 0.6);
    } else {
      const az = 0.6 + ((u - 0.42) / 0.58) * 9.5;
      walk(AKATSU, -1.15, 0, az, "sad"); B(AKATSU, -1.15, az);
    }
  } else if (id === 7) {
    // THE GRAVES (storm): Shimada 1954, Kozuka 1972 — two mounds,
    // two crosses. Onoda kneels, then stands. Alone.
    if (u < 0.55) out.places.push(person(cam, ONODA_O, 7.3, 0, -6.3, { pose: "kneel", expr: "pained", blink: lidAt(t, ONODA_O.i) }));
    else stand(ONODA_O, 7.3, 0, -6.3, "sad");
    B(ONODA_O, 7.3, -6.3);
  } else if (id === 8) {
    // THE COST: Lubang village — wary faces, a policeman on watch,
    // and far off at the treeline the lone silhouette they fear.
    stand(VIL_F, -25, 0, 5, "nervous"); B(VIL_F, -25, 5);
    stand(VIL_M, -26.5, 0, 3.4, "stern", { look: 0.6 }); B(VIL_M, -26.5, 3.4);
    stand(POLICE, -23, 0, 2.4, "stern", { look: 0.5 }); B(POLICE, -23, 2.4);
    stand(ONODA_O, -33.5, 0, -1.5, "stern", { prop: "rifle" }, 0.9); B(ONODA_O, -33.5, -1.5, 0.9);
  } else if (id === 9) {
    // 1974: SUZUKI steps out of the treeline, hands up, grinning
    // nervously — straight into the muzzle of a 29-year-old war.
    const sz = 14.6 - 3.3 * smooth(Math.min(1, u / 0.35));
    if (u < 0.35) walk(SUZUKI, 2.8, 0, sz, "nervous");
    else stand(SUZUKI, 2.8, 0, sz, "nervous", { armL: [-152, -18], armR: [152, 18] });
    B(SUZUKI, 2.8, sz);
    stand(ONODA_O, 0.2, 0, 8.6, t < FOUND_T + 1.0 ? "shock" : "stern", { prop: "rifle" }); B(ONODA_O, 0.2, 8.6);
  } else if (id === 10) {
    // THE REFUSAL: Suzuki pleads. One head-shake. Then Onoda turns
    // and melts back into the green.
    stand(SUZUKI, 2.8, 0, 11.3, u > 0.6 ? "sad" : "nervous", u > 0.6 ? {} : { armL: [-38, -28], armR: [38, 28] }); B(SUZUKI, 2.8, 11.3);
    if (u < 0.55) stand(ONODA_O, 0.2, 0, 8.6, "stern", { prop: "rifle", look: u > 0.15 && u < 0.5 ? Math.sin(t * 5.0) * 0.8 : 0 });
    else walk(ONODA_O, 0.2, 0, 8.6 - ((u - 0.55) / 0.45) * 4.4, "stern");
    B(ONODA_O, 0.2, 8.6);
  } else if (id === 11) {
    // THE COMMANDER ARRIVES (golden): an old bookseller in a dark
    // suit, a paper in his hand — and a soldier frozen mid-breath.
    stand(TANI_O, 3.0, 0, 10.4, "stern", { prop: "paper", armR: [38, 18] }); B(TANI_O, 3.0, 10.4);
    stand(SUZUKI, 4.2, 0, 11.4, "smile"); B(SUZUKI, 4.2, 11.4);
    stand(ONODA_O, 0.4, 0, 9.2, "shock", { prop: "rifle" }); B(ONODA_O, 0.4, 9.2);
  } else if (id === 12) {
    // STAND DOWN (golden): the order is read aloud. A salute held
    // for 29 years — then the war falls off his shoulders.
    const down = t >= SALUTE_T;
    stand(TANI_O, 3.0, 0, 10.4, down ? "smile" : "stern", { prop: "paper", armR: [38, 18] }); B(TANI_O, 3.0, 10.4);
    stand(SUZUKI, 4.2, 0, 11.4, down ? "relief" : "smile"); B(SUZUKI, 4.2, 11.4);
    if (!down) stand(ONODA_O, 0.4, 0, 9.2, "stern", { prop: "rifle" });
    else if (t < SALUTE_T + 1.7) stand(ONODA_O, 0.4, 0, 9.2, "relief", { armR: [150, 70] });
    else stand(ONODA_O, 0.4, 0, 9.2, "relief_open");
    B(ONODA_O, 0.4, 9.2);
    burstFx(SALUTE_T + 0.1, 1.3, 0.4, 3.3, 9.2, 2.4, true);
  } else if (id === 13) {
    // PUNCHLINE (golden): he walks out of the jungle into the light
    // — unarmed, smiling for the first time. The hero closes it.
    walk(ONODA_O, 0.2, 0, 5.5 + 5.0 * u, "smile"); B(ONODA_O, 0.2, 5.5 + 5.0 * u);
    stand(HERO, 4.4, 0, 12.9, "grin", { armR: [158 + Math.sin(t * 6) * 10, 12] }, 1.22); B(HERO, 4.4, 12.9, 1.22);
    burstFx(S0(12) + 0.3, 1.6, 0.4, 3.4, 4.2, 3.0, true);
  }
  return out;
};
