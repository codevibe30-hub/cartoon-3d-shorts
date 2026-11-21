// The cast of the Api Biru Ijen short as lit flat sprites in the 3D crater:
// the hero narrator, sulfur miners with their bamboo pikulan (shoulder pole +
// two baskets of yellow sulfur), and night hikers with headlamps + gas masks.
// Same pool + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact blobs.
// Fact cards float as ink-outlined boards via drawCardFit (auto-fit: text
// NEVER overflows the board).
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, TRAIL, clamp01 } from "./story";
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
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "night";
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

// ---------------- gear overlays (drawn in the same 600x1000 design space) ----------------
// Head centre ~(300, 309), crown ~198, chin ~420 (adult build, see toon.ts).
const drawGasMask = (p: Pen) => {
  // straps to the sides of the head
  p.line([[250, 348], [204, 330]], "#3c4238", 11);
  p.line([[350, 348], [396, 330]], "#3c4238", 11);
  // mask body over nose + mouth
  p.poly([[250, 330], [350, 330], [362, 376], [342, 408], [258, 408], [238, 376]], "#8f9a84");
  p.dot(268, 386, 15, "#5d6656"); p.dot(268, 386, 7, "#454d40");
  p.dot(332, 386, 15, "#5d6656"); p.dot(332, 386, 7, "#454d40");
  p.dot(300, 366, 9, "#454d40");
};
const drawClothMask = (p: Pen) => {
  p.poly([[252, 336], [348, 336], [344, 384], [256, 384]], "#cfc8b8");
  p.line([[256, 352], [344, 352]], "#a89f88", 5, false);
};
const drawHeadlamp = (p: Pen) => {
  p.poly([[250, 212], [350, 212], [350, 240], [250, 240]], "#2c3138", 6);
  p.dot(300, 226, 12, "#ffd94a");
  p.dot(300, 226, 5, "#fff3b0");
};
/** the pikulan: shoulder pole + ropes + two bamboo baskets of yellow sulfur,
 *  drawn BEHIND the body (the torso covers the pole's middle). */
const drawPikulan = (p: Pen) => {
  p.line([[118, 452], [482, 452]], "#8a6a42", 13);
  p.line([[140, 452], [152, 548]], "#6e5233", 7);
  p.line([[460, 452], [448, 548]], "#6e5233", 7);
  for (const cx of [152, 448]) {
    p.poly([[cx - 32, 548], [cx + 32, 548], [cx + 22, 668], [cx - 22, 668]], "#c8a878");
    p.line([[cx - 29, 582], [cx + 29, 582]], "#a5854f", 5, false);
    p.line([[cx - 26, 618], [cx + 26, 618]], "#a5854f", 5, false);
    // heaped sulfur chunks above the rim
    p.ell(cx, 532, 37, 23, "#f2c41c");
    p.ell(cx - 14, 518, 16, 12, "#ffd83a", 6);
    p.ell(cx + 15, 520, 14, 11, "#e0aa14", 6);
  }
};
type Gear = { mask?: "gas" | "cloth"; lamp?: boolean; pikulan?: boolean };
const geared = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, gear: Gear, scale = 1): Place => {
  const base = person(cam, who, x, y, z, fo, scale);
  const gk = `${gear.pikulan ? "P" : ""}${gear.mask ?? ""}${gear.lamp ? "L" : ""}`;
  return {
    ...base, key: `${base.key}|G${gk}`,
    draw: (p) => {
      if (gear.pikulan) drawPikulan(p);
      base.draw(p);
      if (gear.mask === "gas") drawGasMask(p);
      else if (gear.mask === "cloth") drawClothMask(p);
      if (gear.lamp) drawHeadlamp(p);
    },
  };
};

// ---------------- contact blobs ----------------
import { fxShadow, fxContact } from "./toon";
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
    if (w > 452) fs = Math.floor(fs * (452 / w));
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

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity with Nyepi).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "ijenHero" };
// MINERS: worn work clothes, dark caps, cloth masks, the pikulan.
const MINER_A: Who = { i: 51, o: { jacket: "#6e5136", pants: "#4a4238", boots: "#2c2620", hat: "cap", cap: "#33383e" }, okey: "ijenMinerA" };
const MINER_B: Who = { i: 52, o: { jacket: "#4c5a68", pants: "#3b3f52", boots: "#2c2620", hat: "cap", cap: "#59351f" }, okey: "ijenMinerB" };
const MINER_C: Who = { i: 53, o: { jacket: "#71563e", pants: "#54452e", boots: "#2c2620", hat: "cap", cap: "#2c3138" }, okey: "ijenMinerC" };
// HIKERS: bright jackets, caps, headlamps + gas masks.
const hiker = (i: number, v: number, jacket: string): Who => ({
  i, o: { ...townsfolk(v), dress: undefined, jacket, hat: "cap", cap: "#2c3138" }, okey: `ijenHiker${i}`,
});
const HIK_A = hiker(71, 0, "#c2452d");
const HIK_B = hiker(72, 1, "#2e6da8");
const HIK_C = hiker(73, 4, "#e8b13c");

// Zone anchors (must match world.ts + story.ts): vent (12.5, 0, 5.5);
// lake centre (-11, 0, -5); hero rim spot (18, 14.6, 41); weighing station
// (20, 14.5, 34); trail TRAIL(u) from story.ts.

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra });
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  const onTrail = (who: Who, u: number, expr: Expr, gear: Gear, look = 0) => {
    const [x, y, z] = TRAIL(u);
    out.places.push(geared(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look }, gear));
    blob(out, x, y, z);
  };

  if (id === 1) {
    // HOOK (rim wide): the hero alone above the crater (hikers were outside
    // the re-aimed frame — removed; they star in shot 5 instead)
    out.places.push(stand(HERO, 18, 14.6, 41, "grin", -0.3)); blob(out, 18, 14.6, 41);
  }
  if (id === 2) {
    // BUKAN LAVA: the hero beside the flames, disbelief on his face
    out.places.push(stand(HERO, 9.2, 0, 8.8, "shock", 0.3)); blob(out, 9.2, 0, 8.8);
    cardFx("cardBukanLava", drawCardFit(["BUKAN LAVA!"], "#1d4ed8", "#ffffff", 104), L[1] / FPS + 0.4, 2.4, 13.8, 3.1, 2.2, 2.6, 1.3);
    burstFx(L[1] / FPS + 0.35, 0.7, 12.2, 1.6, 4.4, 2.2);
  }
  if (id === 3) {
    // GAS 600: a miner works the pipes while the jets flare
    out.places.push(geared(cam, MINER_A, 10.6, 0, 9.6, { mode: "stand", expr: "neutral", blink: lidAt(t, 51), look: 0.3 }, { mask: "cloth" }));
    blob(out, 10.6, 0, 9.6);
    cardFx("card600", drawCardFit(["600°C"], "#23272f", "#7db4ff", 120), L[2] / FPS + 0.4, 2.6, 11.9, 4.2, 4.6, 2.0, 1.0);
  }
  if (id === 4) {
    // CUMA 2 (crane panorama): tiny climbers + miners give the crater scale
    onTrail(MINER_B, 0.45, "neutral", { pikulan: true, mask: "cloth" });
    onTrail(HIK_C, 0.8, "neutral", { lamp: true, mask: "gas" }, 0.2);
    out.places.push(stand(HERO, 18, 14.6, 41, "grin", -0.3)); blob(out, 18, 14.6, 41);
    cardFx("cardDua", drawCardFit(["CUMA 2", "DI DUNIA"], "#1e3a5f", "#ffffff", 104), L[3] / FPS + 0.4, 2.8, -4.9, 4.5, 6.4, 6.4, 3.2);
  }
  if (id === 5) {
    // JAM 01.00: the hero leads three hikers up the dark trail, lamps on
    onTrail(HERO, 0.72, "grin", { lamp: true, mask: "gas" }, -0.2);
    onTrail(HIK_A, 0.64, "neutral", { lamp: true, mask: "gas" }, 0.1);
    onTrail(HIK_B, 0.57, "neutral", { lamp: true, mask: "gas" }, 0.1);
    onTrail(HIK_C, 0.5, "nervous", { lamp: true, mask: "gas" }, 0.1);
    cardFx("cardJam", drawCardFit(["JAM 01.00"], "#23272f", "#ffd98a", 110), L[4] / FPS + 0.4, 2.4, 13.2, 10.8, 21.5, 2.4, 1.2);
  }
  if (id === 6) {
    // DANAU TOSKA: one lone miner on the far shore — the lake is the picture
    out.places.push(geared(cam, MINER_C, -19.5, 1.5, -8.5, { mode: "stand", expr: "neutral", blink: lidAt(t, 53), look: 0 }, { pikulan: true, mask: "cloth" }));
    blob(out, -19.5, 1.5, -8.5);
    cardFx("cardPh", drawCardFit(["pH < 0,3"], "#0f766e", "#ffffff", 110), L[5] / FPS + 0.4, 2.6, -13, 4.6, -13, 3.4, 1.7);
  }
  if (id === 7) {
    // 200 METER: the hero leans in, then thinks better of it and backs off
    const back = tt > L[6] / FPS + 1.1;
    out.places.push(stand(HERO, back ? -3.1 : -3.5, 0, 2.5, back ? "nervous" : "grin", 0.2)); blob(out, back ? -3.1 : -3.5, 0, 2.5);
    cardFx("card200", drawCardFit(["200 METER"], "#0e5a54", "#ffffff", 104), L[6] / FPS + 0.4, 2.6, -8.6, 3.3, -1.5, 2.8, 1.4);
  }
  if (id === 8) {
    // PENAMBANG: the climb — one miner close, one higher up the trail
    onTrail(MINER_A, 0.3, "pained", { pikulan: true, mask: "cloth" }, 0.1);
    onTrail(MINER_B, 0.52, "neutral", { pikulan: true, mask: "cloth" }, 0.1);
    cardFx("card90", drawCardFit(["90 KG"], "#8a6d1f", "#ffffff", 120), L[7] / FPS + 0.4, 2.6, 18.5, 8.6, 21.5, 2.2, 1.1);
  }
  if (id === 9) {
    // SERIBU: at the weighing station — the miner delivers, the hero watches
    out.places.push(geared(cam, MINER_A, 18.6, 14.5, 34.6, { mode: "stand", expr: "neutral", blink: lidAt(t, 51), look: 0.2 }, { pikulan: true, mask: "cloth" }));
    blob(out, 18.6, 14.5, 34.6);
    out.places.push(stand(HERO, 22.6, 14.5, 31.6, "relief_open", -0.3)); blob(out, 22.6, 14.5, 31.6);
    cardFx("cardRibu", drawCardFit(["±Rp1.000/KG"], "#2e5f8a", "#ffffff", 92), L[8] / FPS + 0.4, 2.6, 20.3, 18.9, 33.2, 2.6, 1.3);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again — the hero laughs and waves as the fire flares
    out.places.push(stand(HERO, 18, 14.6, 41, "grin", -0.3)); blob(out, 18, 14.6, 41);
    const a = L[9] / FPS, dur = (L[10] - L[9]) / FPS;
    if (tt >= a + dur * 0.45) {
      out.places.pop(); // replace the plain stand with the laughing wave
      out.places.push(person(cam, HERO, 18, 14.6, 41, { mode: "stand", expr: "laugh", blink: lidAt(t, 41), look: 0, wave: 1 }));
    }
    starsFx(18, 17.3, 39, 1.2);
  }
  return out;
};
export { FPS };
