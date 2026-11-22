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
import { FPS, SHOTS, L, clamp01, smooth, BOAT_POS, DECK_Y, DOCK_Y } from "./story";
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
// VIOLET JESSOP, 24: a White Star stewardess — navy uniform, hair in a bun.
const VIOLET: Who = { i: 51, o: { torso: "#2e3a5c", bun: "#3a2a1c", belt: "#1d2438" }, okey: "violet" };
// VIOLET THE NURSE, 1916: VAD white, a white cap over the bun.
const VIOLET_NURSE: Who = { i: 52, o: { torso: "#eef0ea", cap: "#f7f7f2", bun: "#3a2a1c" }, okey: "violetNurse" };
// VIOLET THE NURSE, HURT: head wrapped, torso wrapped (the fractured skull).
const VIOLET_HURT: Who = { i: 53, o: { torso: "#eef0ea", cap: "#f7f7f2", bun: "#3a2a1c", bandage: true }, okey: "violetHurt" };
// VIOLET, OLD: grey bun, grey tufts — the lady of the midnight phone call.
const VIOLET_OLD: Who = { i: 54, o: { torso: "#5d6a72", bun: "#c9ccce", tufts: "#c9ccce" }, okey: "violetOld" };
// THE OFFICER who handed her the baby.
const OFFICER: Who = { i: 55, o: { torso: "#23283a", cap: "#23283a", belt: "#141824" }, okey: "officer" };
// A FELLOW STEWARDESS on the boat deck.
const STEWARDESS: Who = { i: 56, o: { torso: "#2e3a5c", bun: "#241a12", belt: "#1d2438" }, okey: "stewardess" };
// A SAILOR.
const SAILOR: Who = { i: 57, o: { torso: "#3a4a63", cap: "#2c3550" }, okey: "sailor" };
// Passengers.
const MAN_A: Who = { i: 71, o: { torso: "#4f4438", belt: "#33291e" }, okey: "manA" };
const WOMAN_A: Who = { i: 72, o: { torso: "#6d5468", bun: "#33241c" }, okey: "womanA" };
const WOMAN_B: Who = { i: 73, o: { torso: "#54655e", bun: "#241a12" }, okey: "womanB" };

// ---------------- fx draws ----------------
// funnel smoke / steam: a soft cluster of pale puffs
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
// a burst of white water: collision, the mine, the jump
const drawSplash = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  g.globalAlpha = a;
  for (let i = 0; i < 26; i++) {
    const x = 256 + (hh(seed + i, 3) - 0.5) * 330, y = 400 - hh(seed + i, 4) * 300, r = 7 + hh(seed + i, 5) * 20;
    g.fillStyle = "rgba(240,248,252,0.9)"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 6; i++) {
    const x = 256 + (hh(seed + i, 6) - 0.5) * 200, y = 330 - i * 34, r = 40 + hh(seed + i, 7) * 34;
    const gr = g.createRadialGradient(x, y, 4, x, y, r);
    gr.addColorStop(0, "rgba(235,245,250,0.55)"); gr.addColorStop(1, "rgba(235,245,250,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
// foam on the water: a soft broken ring of white
const drawFoam = (seed: number, a: number) => (p: Pen) => {
  const g = p.g;
  g.globalAlpha = a;
  for (let i = 0; i < 30; i++) {
    const ang = hh(seed + i, 8) * Math.PI * 2, rad = 60 + hh(seed + i, 9) * 70;
    const x = 128 + Math.cos(ang) * rad, y = 128 + Math.sin(ang) * rad * 0.5, r = 5 + hh(seed + i, 10) * 13;
    g.fillStyle = "rgba(240,248,252,0.75)"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};
// a soft warm glow (lamplight, moonlight, sunset)
const drawGlow = (warm: string) => (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 254);
  gr.addColorStop(0, "rgba(255,252,244,0.95)");
  gr.addColorStop(0.35, warm);
  gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};
// THE BABY: a cream bundle with a tiny sleeping face — the
// officer's gift, carried all night against a cork lifebelt
const drawBundle = () => (p: Pen) => {
  p.ell(256, 270, 120, 92, "#f3ead6", 7);
  p.ell(256, 196, 52, 50, "#ffffff", 5);
  p.dot(238, 192, 4.5, INK); p.dot(274, 192, 4.5, INK);
  p.arc(256, 214, 10, 8, 20, 160, 3.5);
  p.stroke([[168, 300], [344, 252]], 6, "#d8cbae");
  p.stroke([[172, 336], [340, 288]], 6, "#d8cbae");
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const S0 = (i: number) => L[i] / FPS;
  const u = clamp01((t - S0(id - 1)) / Math.max(0.01, S0(id) - S0(id - 1))); // shot-local progress
  const stand = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, tilt: { pitch?: number; roll?: number } = {}) =>
    out.places.push(person(cam, who, x, y, z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale, tilt));
  const walk = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, rate = 1.85) =>
    out.places.push(person(cam, who, x, y, z, { pose: "walk", phase: q((t * rate + who.i * 0.37) % 1, 30), expr, blink: lidAt(t, who.i), ...extra }, scale));
  const sit = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "sit", expr, blink: lidAt(t, who.i), ...extra }, scale));
  const B = (who: Who, x: number, y: number, z: number, sc = 1) => blob(out, x, y, z, sc);
  const wave = (amp = 13): [number, number] => [128 + Math.sin(t * 2.3) * amp, 12];
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number, warm = "rgba(255,214,150,0.5)") => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow(warm), x, y, z, w, h: w, soft: true });
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
  const splash = (key: string, x: number, y: number, z: number, w: number, a: number, seed = 5) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `splash|${key}|${q(a, 14)}`, cw: 512, ch: 512, draw: drawSplash(seed, a), x, y, z, w, h: w * 0.8, soft: true });
  };
  const foam = (key: string, x: number, z: number, w: number, a: number, seed = 9) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `foam|${key}|${q(a, 12)}`, cw: 256, ch: 256, draw: drawFoam(seed, a), x, y: 0.06, z, w, h: w * 0.55, flat: true });
  };
  const bundle = (x: number, y: number, z: number) =>
    out.fx.push({ key: "bundle", cw: 512, ch: 512, draw: drawBundle(), x, y, z, w: 0.62, h: 0.62 });

  if (id === 1) {
    // HOOK = the dramatic cover (no card in this lane): a
    // lifeboat on a black sea — Violet with the baby in her
    // arms, the storyteller beside her, and behind them the
    // greatest ship in the world, lit gold, already listing.
    sit(VIOLET, 1.2, 0.55, -70.2, "nervous", { armL: [38, 42], armR: [-38, 42] });
    bundle(1.2, 1.32, -69.55);
    sit(HERO, 3.5, 0.55, -70.4, "sad", {}, 1.28);
    sit(WOMAN_A, -0.3, 0.55, -69.4, "sad", {});
    sit(SAILOR, 4.9, 0.55, -69.6, "neutral", { armL: [30, 20], armR: [30, 20] });
    foam("boat1", BOAT_POS[0], BOAT_POS[2], 7, 0.5);
    glowFx("moon", -17, 15, -99, 16, 0.30, "rgba(190,214,245,0.5)");
    glowFx("ship", -16, 6, -96, 20, 0.20);
  } else if (id === 2) {
    // MISS UNSINKABLE: the dock at Southampton — Violet with
    // her suitcase before the towering white-star hull, the
    // storyteller presenting her, an officer looking on.
    stand(VIOLET, 70, DOCK_Y, -30.2, "smile", { prop: "suitcase" });
    B(VIOLET, 70, DOCK_Y, -30.2);
    stand(HERO, 67.4, DOCK_Y, -28.4, "smile", { armR: [118, 12] }, 1.28);
    B(HERO, 67.4, DOCK_Y, -28.4, 1.28);
    stand(OFFICER, 73.9, DOCK_Y, -31.2, "neutral", {});
    B(OFFICER, 73.9, DOCK_Y, -31.2);
    steam(63, 10.5, -36, 0.5);
  } else if (id === 3) {
    // 1911: THE COLLISION — from Olympic's deck Violet watches
    // the grey warship grind into the side; spray at the wound.
    stand(VIOLET, -72, 5.0, 36.8, "shock", { armR: [30, 14] }, 0.95);
    stand(SAILOR, -68.2, 5.0, 36.9, "nervous", {}, 0.95);
    splash("hawke", -64.5, 1.6, 29.5, 7, 0.55 + 0.2 * Math.sin(t * 1.7), 11);
    foam("hawke", -64.5, 29.5, 11, 0.65, 21);
  } else if (id === 4) {
    // BOARDING THE TITANIC: golden hour — she climbs the
    // gangplank with her suitcase; the storyteller waves her
    // off, not knowing. The officer receives her at the top.
    const px = 66.8 + u * 4.5, py = DOCK_Y + u * 2.2, pz = -28.2 - u * 4.4;
    walk(VIOLET, px, py, pz, "smile", { prop: "suitcase" }, 1, 1.5);
    stand(OFFICER, 72.4, 2.85, -33.2, "smile", { armR: wave(9) });
    stand(HERO, 64.2, DOCK_Y, -26.8, "smile", { armR: wave() }, 1.28);
    B(HERO, 64.2, DOCK_Y, -26.8, 1.28);
    steam(63, 10.5, -36, 0.6);
    glowFx("gold", 74, 5, -37, 15, 0.22);
  } else if (id === 5) {
    // THE ICEBERG: the boat deck at night — a calm line of
    // stewardesses, passengers strolling as if nothing were
    // wrong, and the white mountain sliding past the rail.
    stand(VIOLET, 71, DECK_Y, 26.8, "neutral", { armR: [18, 10] });
    B(VIOLET, 71, DECK_Y, 26.8);
    stand(STEWARDESS, 72.9, DECK_Y, 26.1, "neutral", {});
    B(STEWARDESS, 72.9, DECK_Y, 26.1);
    stand(MAN_A, 68.4, DECK_Y, 25.4, "neutral", { armL: [24, 12] });
    B(MAN_A, 68.4, DECK_Y, 25.4);
    stand(WOMAN_A, 74.6, DECK_Y, 27.3, "smile", {});
    B(WOMAN_A, 74.6, DECK_Y, 27.3);
    glowFx("moon5", 84, 11, 6, 13, 0.26, "rgba(190,214,245,0.5)");
  } else if (id === 6) {
    // LIFEBOAT 16: closer — the baby against her lifebelt, the
    // ship behind them lower and darker, the long frozen night.
    sit(VIOLET, 1.2, 0.55, -70.2, "sad", { armL: [38, 42], armR: [-38, 42] });
    bundle(1.2, 1.32, -69.55);
    sit(HERO, 3.5, 0.55, -70.4, "sad", {}, 1.28);
    sit(WOMAN_A, -0.3, 0.55, -69.4, "sad", {});
    sit(SAILOR, 4.9, 0.55, -69.6, "neutral", { armL: [30, 20], armR: [30, 20] });
    foam("boat6", BOAT_POS[0], BOAT_POS[2], 7, 0.45);
    glowFx("moon6", -17, 15, -99, 15, 0.24, "rgba(190,214,245,0.5)");
  } else if (id === 7) {
    // NO KAPOK: 1916 — the nurse walks the quay toward the
    // great white hospital ship, past a sailor, unhurried.
    const wx = -77 + u * 9.5;
    walk(VIOLET_NURSE, wx, DOCK_Y, -33.2 - u * 1.2, "neutral", { prop: "suitcase" }, 1, 1.6);
    B(VIOLET_NURSE, wx, DOCK_Y, -33.2 - u * 1.2);
    stand(SAILOR, -63.2, DOCK_Y, -36.2, "neutral", { armR: [20, 10] });
    B(SAILOR, -63.2, DOCK_Y, -36.2);
    steam(-84, 11, -54, 0.45);
  } else if (id === 8) {
    // THE MINE: a kind morning, the white ship at peace —
    // then, past the middle of the line, the sea erupts at
    // her bow and she begins to list.
    if (u > 0.5) {
      const eu = clamp01((u - 0.5) / 0.5);
      splash("mine", -36, 2.2, 59, 6 + eu * 9, 0.9 * (1 - eu * 0.45), 31);
      foam("mine", -35, 59.5, 13, 0.4 + eu * 0.4, 41);
    }
    steam(-26, 12.5, 62, 0.7);
  } else if (id === 9) {
    // THE PROPELLERS: the stern is out of the water, the great
    // screws still turning — and a lifeboat full of nurses is
    // being drawn toward them. Violet sits in it, frozen.
    sit(VIOLET_NURSE, 3.4, 0.55, 54.3, "shock", { armL: [26, 18], armR: [-26, 18] });
    sit(SAILOR, 5.3, 0.55, 54.6, "nervous", { armL: [34, 22], armR: [34, 22] });
    sit(WOMAN_B, 2.1, 0.55, 53.6, "nervous", {});
    foam("stern", 6.5, 57.5, 12, 0.6, 55);
    splash("prop", 9.5, 1.4, 59.5, 6, 0.4 + 0.18 * Math.sin(t * 2.6), 61);
  } else if (id === 10) {
    // THE JUMP: she leaps from the doomed boat — a splash, a
    // blow against the keel — and surfaces, bandaged later,
    // holding on to a lifebelt. Alive.
    if (u < 0.38) {
      sit(VIOLET_NURSE, 3.4, 0.55, 54.3, "shock", { armL: [26, 18], armR: [-26, 18] });
      sit(SAILOR, 5.3, 0.55, 54.6, "nervous", { armL: [34, 22], armR: [34, 22] });
    } else if (u < 0.55) {
      const ju = (u - 0.38) / 0.17;
      stand(VIOLET_NURSE, 4.6 + ju * 1.6, 0.6 + Math.sin(ju * Math.PI) * 1.5 - ju * 1.3, 53.4 - ju * 1.0, "shock", { armL: [150, 20], armR: [-150, 20] });
    } else {
      stand(VIOLET_HURT, 6.3, -1.18, 52.3, "pained", { armL: [52, 30], armR: [-52, 30] });
      foam("jump", 6.3, 52.3, 3.6, 0.75, 71);
    }
    if (u > 0.5 && u < 0.8) splash("jump", 6.2, 0.7, 52.4, 4.5, 0.8 * (1 - (u - 0.5) / 0.3), 81);
    foam("stern10", 6.5, 57.5, 11, 0.5, 55);
  } else if (id === 11) {
    // BACK TO SEA: a golden deck, decades on — Violet, grey
    // at the temples, waves from the rail of another liner.
    stand(VIOLET_OLD, 75.5, DECK_Y, 74.3, "smile", { armR: wave() });
    B(VIOLET_OLD, 75.5, DECK_Y, 74.3);
    stand(WOMAN_B, 72.4, DECK_Y, 75.9, "smile", { prop: "suitcase" });
    B(WOMAN_B, 72.4, DECK_Y, 75.9);
    glowFx("sun11", 88, 7, 62, 16, 0.25);
  } else if (id === 12) {
    // THE PHONE CALL: midnight, a lamplit room. She sits —
    // then the telephone rings, and she stands with it at her
    // ear, hearing a laugh she will wonder about forever.
    if (u < 0.42) {
      sit(VIOLET_OLD, -75.3, 0.7, 73.8, "neutral", {});
      blob(out, -75.3, 0.7, 73.8);
    } else {
      stand(VIOLET_OLD, -74.1, 0, 73.0, "shock", { armR: [146, 34], armL: [18, 10] });
      B(VIOLET_OLD, -74.1, 0, 73.0);
    }
    glowFx("lamp", -75, 2.6, 72.2, 6.5, 0.5);
  } else if (id === 13) {
    // CLOSE: the golden deck — Violet and the storyteller side
    // by side above a calm sea. Three ships, three disasters,
    // one woman who always got back up.
    stand(VIOLET_OLD, 75.2, DECK_Y, 74.2, "smile", {});
    B(VIOLET_OLD, 75.2, DECK_Y, 74.2);
    stand(HERO, 77.5, DECK_Y, 73.5, "smile", { armR: wave(9) }, 1.28);
    B(HERO, 77.5, DECK_Y, 73.5, 1.28);
    glowFx("sun13", 88, 7.5, 62, 17, 0.28);
    const bu = (tt - S0(12)) / 1.8;
    if (bu >= 0 && bu < 1) out.fx.push({ key: `burst${q(bu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(bu, 24)), x: 76, y: 4.6, z: 72, w: 4.2, h: 4.2, soft: true });
  }
  return out;
};
