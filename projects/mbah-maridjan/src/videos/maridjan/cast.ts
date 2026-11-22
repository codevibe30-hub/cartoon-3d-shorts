// The cast of "Pria Ini Menolak Turun Saat Gunungnya Meletus🤫"
// as DASIMAN-STYLE stickman sprites: round WHITE heads, thin
// black limbs, one coloured torso each (stick.ts). The
// hero/storyteller wears the mascot's red tie. Same pool +
// sprite machinery as episodes 1-4: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft
// contact blobs. TONE: respectful and solemn — the gatekeeper
// of Merapi is never a joke; the eruption is a far grey wall,
// and his death is told by bowed heads at dawn, never shown.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, PORCH, PORCH_Y, BENCH, ROAD_Z, MOSQUE, GRAVE, HERO_SPOT, truckX, truckArriveX, TRUCK_BED_Y } from "./story";
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
// MBAH MARIDJAN, the gatekeeper: a plain dark-brown shirt, a
// dark sarong belt, white-grey tufts at his ears — and the key.
const MARIDJAN: Who = { i: 61, o: { torso: "#4a3b2c", belt: "#2e241a", tufts: "#d9d9d9" }, okey: "maridjan" };
// MARIDJAN IN 1982, younger: the same brown, his hair still black.
const MARIDJAN_YOUNG: Who = { i: 62, o: { torso: "#5a4632", belt: "#33291e" }, okey: "maridjanYoung" };
// MARIDJAN AFTER THE 2006 BLAST: bandaged head and chest — alive.
const MARIDJAN_HURT: Who = { i: 63, o: { torso: "#4a3b2c", belt: "#2e241a", tufts: "#d9d9d9", bandage: true }, okey: "maridjanHurt" };
// THE SULTAN'S ENVOY: keraton gold-brown, the decree in his hand.
const ENVOY: Who = { i: 64, o: { torso: "#7a5c22", belt: "#4a3814" }, okey: "envoy" };
// THE EVACUATION OFFICIAL: a grey-green uniform shirt and cap.
const OFFICIAL: Who = { i: 71, o: { torso: "#54655e", cap: "#37474f", belt: "#37474f" }, okey: "official" };
// SAR / TAGANA: rescue orange, there to help — and to bow.
const SAR: Who = { i: 72, o: { torso: "#c96a1e", cap: "#8a4a12", belt: "#8a4a12" }, okey: "sar" };
// HIS WIFE: a muted maroon kebaya, hair in a neat bun.
const WIFE: Who = { i: 73, o: { torso: "#6d3a44", bun: "#241a12" }, okey: "wife" };
// The people of Kinahrejo: farmers, mothers, neighbours.
const VIL_TORSOS = ["#7a8a5a", "#5a6d8a", "#8a6a42", "#6d5468", "#4f7a6a", "#94765a", "#707a4a", "#86655a"];
const vilWho = (n: number): Who => ({
  i: 100 + n,
  o: { torso: VIL_TORSOS[n % 8], ...(n % 3 === 1 ? { bun: "#2e2118" } : {}), ...(n % 4 === 2 ? { cap: "#5d4a30" } : {}) },
  okey: `vil${n}`,
});
const CHILD = 0.55;
const kidWho = (n: number): Who => ({
  i: 200 + n,
  o: { torso: ["#a8b8c8", "#c8a8a0", "#9db08a", "#c2b280"][n % 4] },
  okey: `kid${n % 4}`,
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
  const stand = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, tilt: { pitch?: number; roll?: number } = {}) =>
    out.places.push(person(cam, who, x, y, z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale, tilt));
  const walk = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, rate = 1.85) =>
    out.places.push(person(cam, who, x, y, z, { pose: "walk", phase: q((t * rate + who.i * 0.37) % 1, 30), expr, blink: lidAt(t, who.i), ...extra }, scale));
  const sit = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "sit", expr, blink: lidAt(t, who.i), ...extra }, scale));
  const kneel = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1, pitch = 0.3) =>
    out.places.push(person(cam, who, x, y, z, { pose: "kneel", expr, blink: lidAt(t, who.i), ...extra }, scale, { pitch }));
  const B = (who: Who, x: number, y: number, z: number, sc = 1) => blob(out, x, y, z, sc);
  const wave = (amp = 13): [number, number] => [128 + Math.sin(t * 2.3) * amp, 12];
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(255,214,150,0.5)"), x, y, z, w, h: w, soft: true });
  };
  // drifting ash: soft grey puffs that hang in the air (never near faces)
  const ash = (x: number, y: number, z: number, w: number, a: number, seed: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `ash${seed}|${q(a, 10)}`, cw: 512, ch: 512, draw: drawSmoke(seed, a), x, y, z, w, h: w * 0.8, soft: true });
  };
  void tt;

  if (id === 1) {
    // HOOK = the dramatic cover (no card in this lane): ash-grey
    // dusk on the slope — the evacuation truck loaded with his
    // neighbours rolls away east, and the gatekeeper stands
    // before his house and does NOT get on. The storyteller
    // watches, quiet, from the roadside.
    const gx = truckX(u);
    const riders: [Who, number][] = [[vilWho(0), -1.7], [vilWho(3), -0.6], [vilWho(5), 0.5]];
    for (const [who, off] of riders) {
      stand(who, gx + off, TRUCK_BED_Y, ROAD_Z, "sad", {});
      B(who, gx + off, TRUCK_BED_Y, ROAD_Z);
    }
    stand(kidWho(1), gx + 1.5, TRUCK_BED_Y, ROAD_Z, "sad", { armR: wave(9) }, CHILD);
    B(kidWho(1), gx + 1.5, TRUCK_BED_Y, ROAD_Z, CHILD);
    stand(MARIDJAN, PORCH[0], PORCH[1], PORCH[2], "stern", { prop: "key", look: -0.3 });
    B(MARIDJAN, PORCH[0], PORCH[1], PORCH[2]);
    stand(WIFE, 9.9, PORCH_Y, -26.6, "sad", {});
    B(WIFE, 9.9, PORCH_Y, -26.6);
    stand(vilWho(2), 0.5, 0, -19, "sad", {});
    B(vilWho(2), 0.5, 0, -19);
    stand(vilWho(6), -2.5, 0, -17.5, "sad", {});
    B(vilWho(6), -2.5, 0, -17.5);
    stand(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], "sad", {}, 1.28);
    B(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], 1.28);
  } else if (id === 2) {
    // THE GATEKEEPER: a bright Kinahrejo morning — the old man
    // among his people, the key at his side, the mountain behind.
    stand(MARIDJAN, 0, 0, -24, "smile", { prop: "key" });
    B(MARIDJAN, 0, 0, -24);
    stand(vilWho(1), -3.6, 0, -22.6, "smile", {});
    B(vilWho(1), -3.6, 0, -22.6);
    stand(vilWho(4), 3.9, 0, -23.2, "smile", { armR: [24, 10] });
    B(vilWho(4), 3.9, 0, -23.2);
    stand(vilWho(7), -1.6, 0, -27.5, "neutral", {});
    B(vilWho(7), -1.6, 0, -27.5);
    stand(vilWho(0), 5.8, 0, -27.8, "neutral", {});
    B(vilWho(0), 5.8, 0, -27.8);
    stand(kidWho(0), 2.2, 0, -21.8, "grin", {}, CHILD);
    B(kidWho(0), 2.2, 0, -21.8, CHILD);
  } else if (id === 3) {
    // 1982: before his own house, the Sultan's envoy reads the
    // decree — and the younger Maridjan lifts the great key of
    // Merapi for the first time. The hamlet watches.
    stand(ENVOY, 6.1, 0, -24.2, "neutral", { prop: "paper", armR: [30, 16] });
    B(ENVOY, 6.1, 0, -24.2);
    stand(MARIDJAN_YOUNG, 8.9, 0, -24.2, "smile", { prop: "key", armR: [122, 10] });
    B(MARIDJAN_YOUNG, 8.9, 0, -24.2);
    stand(vilWho(2), 4.2, 0, -27.6, "smile", {});
    B(vilWho(2), 4.2, 0, -27.6);
    stand(vilWho(5), 10.8, 0, -27.6, "smile", {});
    B(vilWho(5), 10.8, 0, -27.6);
    stand(vilWho(3), 7.4, 0, -28.4, "neutral", {});
    B(vilWho(3), 7.4, 0, -28.4);
    stand(kidWho(2), 5.2, 0, -26.4, "grin", {}, CHILD);
    B(kidWho(2), 5.2, 0, -26.4, CHILD);
  } else if (id === 4) {
    // LABUHAN: the year's offerings climb toward the crater —
    // trays carried high, flowers and a little golden tumpeng,
    // the gatekeeper leading with his key.
    walk(MARIDJAN, -1.6, 0, -50, "neutral", { prop: "key" }, 1, 1.5);
    B(MARIDJAN, -1.6, 0, -50);
    const line: [Who, number, number][] = [
      [vilWho(0), -3.4, -44], [vilWho(1), -4.6, -39], [vilWho(4), -2.8, -34.5],
      [vilWho(6), -5.0, -30], [vilWho(3), -3.6, -26],
    ];
    for (const [who, x, z] of line) {
      walk(who, x, 0, z, "neutral", { prop: "tray", armL: [-152, -6], armR: [152, 6] }, 1, 1.5);
      B(who, x, 0, z);
    }
    walk(kidWho(3), -0.9, 0, -37, "smile", {}, CHILD, 1.9);
    B(kidWho(3), -0.9, 0, -37, CHILD);
  } else if (id === 5) {
    // THE PORCH, golden hour: the gatekeeper on his bench, the
    // key across his knees, reading the smoke over the crater
    // the way other men read a letter. One dollar a month.
    sit(MARIDJAN, BENCH[0], BENCH[1], BENCH[2], "neutral", { prop: "key", look: -0.45 });
    blob(out, BENCH[0], BENCH[1], BENCH[2]);
    stand(WIFE, 9.9, PORCH_Y, -26.7, "smile", {});
    B(WIFE, 9.9, PORCH_Y, -26.7);
    sit(kidWho(0), 4.9, 0, -22.6, "smile", {}, CHILD);
    blob(out, 4.9, 0, -22.6, CHILD);
  } else if (id === 6) {
    // 2006: the truck is loaded and leaving; an official pleads
    // with the old man — the Sultan himself sent word. He shakes
    // his head, and walks east, toward the little mosque.
    const gx = truckX(u);
    const riders: [Who, number][] = [[vilWho(1), -1.6], [vilWho(4), -0.5], [vilWho(7), 0.6]];
    for (const [who, off] of riders) {
      stand(who, gx + off, TRUCK_BED_Y, ROAD_Z, "sad", {});
      B(who, gx + off, TRUCK_BED_Y, ROAD_Z);
    }
    stand(OFFICIAL, 3.5, 0, -11, "stern", { armR: [104, 8] });
    B(OFFICIAL, 3.5, 0, -11);
    if (u < 0.45) {
      stand(MARIDJAN, 8, 0, -13.5, "stern", { prop: "key", look: -0.2 });
      B(MARIDJAN, 8, 0, -13.5);
    } else {
      const wu = (u - 0.45) / 0.55;
      walk(MARIDJAN, 8 + wu * 15, 0, -13.5 + wu * 2.5, "neutral", { prop: "key" }, 1, 1.5);
      B(MARIDJAN, 8 + wu * 15, 0, -13.5 + wu * 2.5);
    }
    stand(vilWho(2), -1.2, 0, -10.6, "sad", { prop: "suitcase" });
    B(vilWho(2), -1.2, 0, -10.6);
    stand(vilWho(6), 0.4, 0, -10.3, "sad", { prop: "suitcase" });
    B(vilWho(6), 0.4, 0, -10.3);
    ash(30, 9, -60, 26, 0.3 + 0.2 * Math.sin(t * 0.5), 41);
    ash(-24, 11, -70, 30, 0.26, 42);
  } else if (id === 7) {
    // THE MOSQUE: first, the prayer — the gatekeeper kneeling
    // with his neighbours as the ash drifts down. Then the days
    // after: bandaged, seated on the mosque steps, alive — and
    // his people around him, half grief, half wonder.
    const mx = MOSQUE[0], mz = MOSQUE[2];
    if (u < 0.6) {
      kneel(MARIDJAN, mx, 0, mz + 4.4, "neutral", { prop: null }, 1, 0.34);
      blob(out, mx, 0, mz + 4.4);
      kneel(vilWho(0), mx - 2.6, 0, mz + 4.7, "neutral", {}, 1, 0.32);
      blob(out, mx - 2.6, 0, mz + 4.7);
      kneel(vilWho(4), mx + 2.6, 0, mz + 4.7, "neutral", {}, 1, 0.32);
      blob(out, mx + 2.6, 0, mz + 4.7);
      kneel(vilWho(1), mx - 5.0, 0, mz + 5.2, "neutral", {}, 1, 0.3);
      blob(out, mx - 5.0, 0, mz + 5.2);
      kneel(vilWho(6), mx + 5.0, 0, mz + 5.2, "neutral", {}, 1, 0.3);
      blob(out, mx + 5.0, 0, mz + 5.2);
      ash(mx - 8, 7.5, mz - 4, 20, 0.22 + 0.3 * u, 51);
      ash(mx + 9, 8.5, mz - 6, 24, 0.2 + 0.3 * u, 52);
    } else {
      sit(MARIDJAN_HURT, mx, 0.55, mz + 1.6, "relief", {});
      blob(out, mx, 0.55, mz + 1.6);
      stand(WIFE, mx - 1.9, 0, mz + 2.6, "relief", { armL: [26, 14] });
      B(WIFE, mx - 1.9, 0, mz + 2.6);
      stand(vilWho(3), mx + 2.2, 0, mz + 2.8, "smile", {});
      B(vilWho(3), mx + 2.2, 0, mz + 2.8);
      stand(vilWho(5), mx + 4.3, 0, mz + 1.6, "neutral", {});
      B(vilWho(5), mx + 4.3, 0, mz + 1.6);
      stand(SAR, mx - 4.2, 0, mz + 1.2, "neutral", {});
      B(SAR, mx - 4.2, 0, mz + 1.2);
    }
  } else if (id === 8) {
    // THE RETURN: five months later he walks the village path
    // home — and the whole hamlet is out along the way, waving
    // its gatekeeper back to his mountain.
    const mz2 = -6 - u * 15;
    walk(MARIDJAN, 3, 0, mz2, "smile", { prop: "key" }, 1, 1.6);
    B(MARIDJAN, 3, 0, mz2);
    stand(vilWho(0), -0.6, 0, -11.5, "smile", { armR: wave() });
    B(vilWho(0), -0.6, 0, -11.5);
    stand(vilWho(4), 6.6, 0, -13.5, "smile", { armR: wave(11) });
    B(vilWho(4), 6.6, 0, -13.5);
    stand(vilWho(1), -0.9, 0, -18.5, "smile", { armR: wave(12) });
    B(vilWho(1), -0.9, 0, -18.5);
    stand(vilWho(7), 6.9, 0, -20.5, "smile", { armL: [-128 - Math.sin(t * 2.3) * 11, -12] });
    B(vilWho(7), 6.9, 0, -20.5);
    stand(kidWho(1), 1.2, 0, -16, "grin", { armR: wave(14) }, CHILD);
    B(kidWho(1), 1.2, 0, -16, CHILD);
    stand(WIFE, PORCH[0] + 1.2, PORCH_Y, PORCH[2] - 0.4, "smile", { armR: wave(10) });
    B(WIFE, PORCH[0] + 1.2, PORCH_Y, PORCH[2] - 0.4);
  } else if (id === 9) {
    // 2010: the truck rolls in from the east once more. The
    // neighbours come down with their bundles and climb aboard.
    // At his porch the old man bows his head — and stays.
    const gx = truckArriveX(u);
    stand(OFFICIAL, gx + 3.6, 0, ROAD_Z + 2.0, "stern", { armR: [42, 10] });
    B(OFFICIAL, gx + 3.6, 0, ROAD_Z + 2.0);
    const bu = clamp01(u * 1.35);
    const bx = 2 + (gx - 3.4 - 2) * bu, bz = -16 + (-10.6 + 16) * bu;
    walk(vilWho(2), bx, 0, bz, "sad", { prop: "suitcase" }, 1, 1.7);
    B(vilWho(2), bx, 0, bz);
    const bx2 = 4.5 + (gx - 1.8 - 4.5) * bu, bz2 = -17.5 + (-10.9 + 17.5) * bu;
    walk(vilWho(6), bx2, 0, bz2, "sad", { prop: "suitcase" }, 1, 1.7);
    B(vilWho(6), bx2, 0, bz2);
    if (u > 0.55) {
      stand(vilWho(0), gx - 0.8, TRUCK_BED_Y, ROAD_Z, "sad", {});
      B(vilWho(0), gx - 0.8, TRUCK_BED_Y, ROAD_Z);
      stand(vilWho(3), gx + 0.5, TRUCK_BED_Y, ROAD_Z, "sad", {});
      B(vilWho(3), gx + 0.5, TRUCK_BED_Y, ROAD_Z);
    }
    stand(MARIDJAN, PORCH[0], PORCH[1], PORCH[2], "sad", { prop: "key" }, 1, { pitch: 0.06 });
    B(MARIDJAN, PORCH[0], PORCH[1], PORCH[2]);
    stand(WIFE, 9.9, PORCH_Y, -26.6, "sad", { armL: [20, 10] });
    B(WIFE, 9.9, PORCH_Y, -26.6);
    ash(36, 10, -64, 28, 0.3, 43);
    ash(-28, 12, -74, 32, 0.26, 44);
  } else if (id === 10) {
    // THE WORDS: night, lamplight, the old man on his porch
    // saying the sentence the whole country would remember —
    // to an official who writes it down and cannot answer it.
    stand(MARIDJAN, PORCH[0], PORCH[1], PORCH[2] - 0.2, u < 0.7 ? "neutral" : "sad", { prop: "key", look: Math.sin(t * 0.6) * 0.12 });
    B(MARIDJAN, PORCH[0], PORCH[1], PORCH[2] - 0.2);
    stand(OFFICIAL, 5.7, 0, -22.4, "neutral", { prop: "paper", armR: [26, 14] });
    B(OFFICIAL, 5.7, 0, -22.4);
    glowFx("window", 9.9, 1.85, -27.1, 4.6, 0.5);
    glowFx("porchlamp", PORCH[0] - 2.6, 2.6, PORCH[2] + 0.6, 3.4, 0.3);
  } else if (id === 11) {
    // HE SENDS THEM DOWN: lantern light after lantern light
    // going down the path to safety, bundles on shoulders. On
    // the porch, the gatekeeper watches them go — then turns,
    // and goes into his house, and the door closes behind him.
    const walkers: [Who, number, number, boolean][] = [
      [vilWho(1), 2.0, 0.0, true], [vilWho(4), 4.4, 0.16, false],
      [vilWho(7), 2.8, 0.34, true], [vilWho(3), 4.9, 0.5, false],
    ];
    for (const [who, wx, off, bag] of walkers) {
      const wu = clamp01(u * 1.25 - off);
      const wz = -27 + wu * 36;
      if (wz > 3.5) continue;
      walk(who, wx, 0, wz, "sad", bag ? { prop: "suitcase" } : {}, 1, 1.7);
      B(who, wx, 0, wz);
      glowFx(`lant${who.i}`, wx + 0.55, 1.05, wz + 0.3, 1.7, 0.42);
    }
    if (u < 0.7) {
      stand(MARIDJAN, PORCH[0], PORCH[1], PORCH[2], "sad", { prop: "key" });
      B(MARIDJAN, PORCH[0], PORCH[1], PORCH[2]);
    } else if (u < 0.93) {
      const wu = (u - 0.7) / 0.23;
      walk(MARIDJAN, PORCH[0] + wu * 0.3, PORCH_Y, PORCH[2] - wu * 1.7, "sad", { prop: "key" }, 1, 1.1);
      B(MARIDJAN, PORCH[0] + wu * 0.3, PORCH_Y, PORCH[2] - wu * 1.7);
    }
    glowFx("window", 9.9, 1.85, -27.1, 4.2, 0.45);
  } else if (id === 12) {
    // 26 OCTOBER 2010: first, the grey wall itself — the
    // wedhus gembel rolling down over an empty village (world
    // carries the cloud; no one is shown in its path). Then the
    // grey dawn: the rescuers and the neighbours standing with
    // bowed heads before his house. Nothing more is shown.
    if (u >= 0.55) {
      stand(SAR, 5.0, 0, -19.5, "sad", {}, 1, { pitch: 0.26 });
      B(SAR, 5.0, 0, -19.5);
      stand(SAR, 11.2, 0, -19.2, "sad", {}, 1, { pitch: 0.24 });
      B(SAR, 11.2, 0, -19.2);
      stand(vilWho(1), 6.7, 0, -18.2, "sad", {}, 1, { pitch: 0.3 });
      B(vilWho(1), 6.7, 0, -18.2);
      stand(vilWho(4), 9.5, 0, -18.4, "sad", {}, 1, { pitch: 0.3 });
      B(vilWho(4), 9.5, 0, -18.4);
      stand(vilWho(6), 3.4, 0, -18.8, "sad", {}, 1, { pitch: 0.28 });
      B(vilWho(6), 3.4, 0, -18.8);
      kneel(WIFE, 7.9, 0, -20.6, "sad", {}, 1, 0.42);
      blob(out, 7.9, 0, -20.6);
    }
  } else if (id === 13) {
    // SRUNEN: a simple grave under the trees — flowers on the
    // earth, his people around it with bowed heads that lift,
    // slowly, as the storyteller closes the story. Behind them
    // the mountain stands calm in the golden morning.
    const gx2 = GRAVE[0], gz2 = GRAVE[2];
    const bow = u < 0.5 ? 0.3 : 0.3 - (u - 0.5) * 0.36;
    const ring: [Who, number, number][] = [
      [vilWho(0), -3.6, 2.6], [vilWho(1), -1.7, 3.7], [vilWho(4), 0.4, 3.9],
      [vilWho(6), 2.4, 3.3], [vilWho(3), 3.9, 2.2],
    ];
    for (const [who, dx, dz] of ring) {
      stand(who, gx2 + dx, 0, gz2 + dz, u < 0.5 ? "sad" : "smile", {}, 1, { pitch: Math.max(0.1, bow) });
      B(who, gx2 + dx, 0, gz2 + dz);
    }
    stand(WIFE, gx2 - 0.2, 0, gz2 + 4.6, "sad", {}, 1, { pitch: Math.max(0.12, bow) });
    B(WIFE, gx2 - 0.2, 0, gz2 + 4.6);
    stand(kidWho(2), gx2 + 1.6, 0, gz2 + 4.4, "sad", {}, CHILD, { pitch: Math.max(0.1, bow) });
    B(kidWho(2), gx2 + 1.6, 0, gz2 + 4.4, CHILD);
    stand(HERO, gx2 + 5.6, 0, gz2 + 5.6, "smile", {}, 1.28);
    B(HERO, gx2 + 5.6, 0, gz2 + 5.6, 1.28);
  }
  return out;
};
