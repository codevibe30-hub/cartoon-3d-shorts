// The cast of the Danau Toba short as lit flat sprites in the 3D lake
// world: the hero narrator (series continuity: teal shirt, cream cap),
// Batak locals with a red ulos sash, staged per shot — hero in his boat
// mid-lake, villagers on the Samosir terrace, the hero at Danau Sidihoni.
// Same pool + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact blobs.
// Fact cards float as ink-outlined boards via drawCardFit (auto-fit: text
// NEVER overflows the board). Aerial-shot cards are glued to the view axis
// (computed from the live camera each frame) so they always sit in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, fxBurst, fxStars, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, clamp01, islandH, SIDIHONI, SIDIHONI_Y, VILLAGE_Y, BOAT, SPLASH6_T } from "./story";
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

// ---------------- gear overlays (drawn in the same 600x1000 design space) ----------------
// Torso spans roughly x 205–395, y 430–650 (adult build, see toon.ts).
/** the ulos: a red woven sash worn diagonally, white zigzag threads */
const drawUlos = (p: Pen) => {
  p.line([[222, 452], [382, 618]], "#8c2f26", 52);
  p.line([[222, 452], [382, 618]], "#6e1f18", 52, false);
  p.line([[232, 470], [372, 600]], "#e8e2d2", 5, false);
  p.line([[246, 452], [388, 590]], "#e8c45a", 4, false);
  p.line([[214, 478], [352, 622]], "#e8e2d2", 5, false);
};
type Gear = { ulos?: boolean };
const dressed = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, gear: Gear, scale = 1): Place => {
  const base = person(cam, who, x, y, z, fo, scale);
  return {
    ...base, key: `${base.key}|G${gear.ulos ? "U" : ""}`,
    draw: (p) => { base.draw(p); if (gear.ulos) drawUlos(p); },
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
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "tobaHero" };
// BATAK LOCALS: dark clothes + the red ulos sash.
const LOCAL_A: Who = { i: 61, o: { jacket: "#4a3b30", pants: "#33383e", boots: "#2c2620", hat: "cap", cap: "#23272f" }, okey: "tobaLocalA" };
const LOCAL_B: Who = { i: 62, o: { jacket: "#5d2a24", pants: "#3b3f52", boots: "#2c2620", hat: "hair", hair: "#241a14" }, okey: "tobaLocalB" };
const FISHER: Who = { i: 63, o: { ...townsfolk(3), jacket: "#31556e", hat: "cap", cap: "#8c2f26" }, okey: "tobaFisher" };

// Zone anchors (must match world.ts + story.ts): island centre (0,0,-30);
// village terrace VILLAGE (14, 8) at VILLAGE_Y; Sidihoni (-24, -46);
// hero boat BOAT (30, 0, 42), deck ~0.8; eruption vent (0, 0, -30).

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
  // aerial cards: glued to the view axis toward a world target so they are
  // always framed, whatever the dolly does. Size is computed from the
  // card's distance to camera so the board always spans the same share of
  // the frame WIDTH (screenFrac) — a fixed world size crops on close
  // cameras (the VEI 8 lesson) and shrinks to nothing on far ones.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60) => {
    const x = cam.pos.x + (tx - cam.pos.x) * frac;
    const y = cam.pos.y + (ty - cam.pos.y) * frac + up;
    const z = cam.pos.z + (tz - cam.pos.z) * frac;
    const d = Math.hypot(x - cam.pos.x, y - cam.pos.y, z - cam.pos.z);
    const w = 2 * d * 0.466 * 0.5625 * screenFrac; // tan(25°) x aspect(1080/1920)
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2);
  };
  const inBoat = (who: Who, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}) =>
    person(cam, who, BOAT[0], 0.45, BOAT[2], { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra });

  if (id === 1) {
    // HOOK (aerial): no people — the island-in-the-lake IS the picture;
    // the claim card lands at 0.15 s over the island
    cardAerial("card100km", drawCardFit(["100 KILOMETER!", "ADA PULAU DI TENGAH"], "#1450a0", "#ffffff", 96),
      L[0] / FPS + 0.15, 2.6, 0, 4, -28, 0.30, 5);
  }
  if (id === 2) {
    // SAMOSIR: the hero waves from his boat, small in the wide lake
    out.places.push(inBoat(HERO, "grin", -0.2));
    cardAerial("cardSamosir", drawCardFit(["SAMOSIR", "630 KM²"], "#1e7a46", "#ffffff", 110),
      L[1] / FPS + 0.35, 2.6, 0, 8, -26, 0.32, 3.5);
  }
  if (id === 3) {
    // 74.000 (eruption wide): empty ash plain, the boom burst at the vent
    burstFx(L[2] / FPS + 0.25, 1.1, 0, 12, -30, 15);
    cardAerial("card74k", drawCardFit(["74.000", "TAHUN LALU"], "#23272f", "#ffb35c", 110),
      L[2] / FPS + 0.4, 2.6, 0, 26, -30, 0.35, 2);
  }
  if (id === 4) {
    // VEI 8 (eruption closer): a second burst under the column
    burstFx(L[3] / FPS + 0.3, 1.2, 0, 9, -30, 11);
    cardAerial("cardVei8", drawCardFit(["VEI 8!"], "#7a1f1f", "#ffffff", 120),
      L[3] / FPS + 0.4, 2.6, 0, 32, -30, 0.30, 2, 0.66);
  }
  if (id === 5) {
    // ASH: the grey aftermath — no people, ash falling like snow
    cardAerial("cardAbu", drawCardFit(["ABU SAMPAI", "KE AFRIKA"], "#4a4a48", "#f2ede2", 104),
      L[4] / FPS + 0.4, 2.6, 0, 16, -30, 0.35, 3);
  }
  if (id === 6) {
    // 505 METER (RE-HOOK): the hero in his boat, working the plumb line —
    // grin while it sinks, shock when it keeps going and hits bottom
    const splashed = tt >= SPLASH6_T;
    out.places.push(inBoat(HERO, splashed ? "shock" : "grin", 0.25));
    burstFx(SPLASH6_T, 0.6, BOAT[0] + 1.15, 0.35, BOAT[2] + 0.9, 1.7);
    cardFx("card505", drawCardFit(["505 METER"], "#0e5a54", "#ffffff", 104), L[5] / FPS + 0.4, 2.8, BOAT[0] - 3.8, 3.6, BOAT[2] - 3.8, 3.6, 1.8);
  }
  if (id === 7) {
    // VILLAGE: the hero meets the locals on the terrace; a fisher at the dock boat
    out.places.push(stand(HERO, 16.6, VILLAGE_Y, 12.2, "grin", -0.3)); blob(out, 16.6, VILLAGE_Y, 12.2);
    out.places.push(dressed(cam, LOCAL_A, 12.2, VILLAGE_Y, 13.8, { mode: "stand", expr: "neutral", blink: lidAt(t, 61), look: 0.3 }, { ulos: true }));
    blob(out, 12.2, VILLAGE_Y, 13.8);
    out.places.push(dressed(cam, LOCAL_B, 12.5, VILLAGE_Y, 13.5, { mode: "stand", expr: "grin", blink: lidAt(t, 62), look: 0, wave: 1 }, { ulos: true }));
    blob(out, 12.5, VILLAGE_Y, 13.5);
    cardFx("cardHidup", drawCardFit(["PULAU", "BERPENDUDUK!"], "#1e7a46", "#ffffff", 100), L[6] / FPS + 0.4, 2.6, 17.6, VILLAGE_Y + 4.4, 14.5, 3.3, 1.65);
  }
  if (id === 8) {
    // RUMAH BOLON: a local shows the hero the great boat-roofed house
    const gy = islandH(15.2, 8.6);
    out.places.push(dressed(cam, LOCAL_A, 15.2, gy, 8.6, { mode: "stand", expr: "grin", blink: lidAt(t, 61), look: -0.35 }, { ulos: true }));
    blob(out, 15.2, gy, 8.6);
    const hy = islandH(17.8, 10.8);
    out.places.push(stand(HERO, 17.8, hy, 10.8, "shock", 0.3)); blob(out, 17.8, hy, 10.8);
    cardFx("cardBolon", drawCardFit(["RUMAH BOLON"], "#8a5a1f", "#ffffff", 104), L[7] / FPS + 0.4, 2.6, 12.3, islandH(12.3, 5) + 5.6, 5, 3.1, 1.55);
  }
  if (id === 9) {
    // SIDIHONI: the hero at the little lake's shore, high on the island
    const sy = islandH(-15.5, -40.5);
    out.places.push(stand(HERO, -15.5, sy, -40.5, "grin", -0.25)); blob(out, -15.5, sy, -40.5);
    starsFx(-19, sy + 3.1, -43, 1.4);
    cardAerial("cardSidihoni", drawCardFit(["DANAU DI ATAS", "PULAU!"], "#1450a0", "#ffffff", 104),
      L[8] / FPS + 0.35, 2.7, SIDIHONI[0], SIDIHONI_Y, SIDIHONI[2], 0.30, 2.5);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1's framing again — the hero laughs + waves from the
    // boat in the last stretch, the hook card returns
    out.places.push(inBoat(HERO, "grin", -0.2));
    const a = L[9] / FPS, dur = (L[10] - L[9]) / FPS;
    if (tt >= a + dur * 0.45) {
      out.places.pop();
      out.places.push(person(cam, HERO, BOAT[0], 0.45, BOAT[2], { mode: "stand", expr: "laugh", blink: lidAt(t, 41), look: 0, wave: 1 }));
    }
    cardAerial("cardLoop", drawCardFit(["PULAU DI DALAM", "DANAU!"], "#1450a0", "#ffffff", 104),
      L[9] / FPS + 0.3, 2.6, 0, 4, -28, 0.30, 5);
  }
  void FISHER;
  return out;
};
export { FPS };
