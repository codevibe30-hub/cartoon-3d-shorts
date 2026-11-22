// The cast of "Pria Ini Diterkam Beruang, Ditinggal Mati, Lalu
// Merangkak Pulang🤫" as DASIMAN-STYLE stickman sprites: round
// WHITE heads, thin black limbs, one coloured torso each
// (stick.ts). The hero — Hugh Glass himself, telling his own
// story in first person — wears the mascot's red tie under a
// frontiersman's buckskin and wide-brim hat. Same pool + sprite
// machinery as episodes 1-4: one canvas per distinct drawing,
// yaw-only billboards shaded by cardShade(), soft contact blobs.
// The grizzly is a big Pen-drawn sprite of the same family; the
// crawl is a dedicated side-profile sprite. Violence is
// stylised, NO gore: bandages, a pained face, a long trail.
import * as THREE from "three";
import { Pen, fxBurst, fxShadow, fxContact, INK } from "./toon";
import { stick, StickOutfit, StickOpts, StickExpr } from "./stick";
import { FPS, SHOTS, L, clamp01, smooth, GLASS_FALL, GRAVE, SIGNPOST, CRAWL_Z, crawlX, raftX, RAFT_Z, LANDING, GATE_X } from "./story";
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

// HUGH GLASS, the hero and narrator: buckskin shirt, wide-brim
// hat, and the mascot's RED TIE — it is his story, told by him.
const GLASS: Who = { i: 61, o: { torso: "#8a6a48", tie: "#c0272d", hat: "#5d4630", belt: "#4a3823" }, okey: "glass" };
// GLASS, MAULED: the same man with his wounds dressed — head wrap
// and torso wrap (stick.ts bandage), the hat gone.
const GLASS_HURT: Who = { i: 62, o: { torso: "#8a6a48", tie: "#c0272d", belt: "#4a3823", bandage: true }, okey: "glassHurt" };
// GLASS IN THE BEAR'S SKIN: from the leg-setting on, he travels
// wrapped in the hide of the bear that mauled him (brown torso).
const GLASS_SKIN: Who = { i: 63, o: { torso: "#6e4a2c", tie: "#c0272d", belt: "#4a3823", bandage: true }, okey: "glassSkin" };
// THE STORYTELLER (the channel's witness, final shot): white
// shirt, the red tie.
const HERO: Who = { i: 41, o: { torso: "#f5f2ea", tie: "#c0272d" }, okey: "hero" };
// JOHN FITZGERALD: older, grey at the ears, hard-faced.
const FITZ: Who = { i: 71, o: { torso: "#4f4438", belt: "#33291e", tufts: "#8a8d8f" }, okey: "fitz" };
// JIM BRIDGER, 19: young, slight, not yet a legend.
const BRIDGER: Who = { i: 72, o: { torso: "#54655e", belt: "#3a453f", hat: "#4c3d2c" }, okey: "bridger" };
const BRIDGER_S = 0.88;
// GENERAL ASHLEY: the expedition's commander, dark coat.
const ASHLEY: Who = { i: 73, o: { torso: "#2e3440", tie: "#4a2e35", belt: "#22242a" }, okey: "ashley" };
// Two more trappers of the brigade.
const TRAPPER_B: Who = { i: 74, o: { torso: "#6d5a43", hat: "#54432e", belt: "#3a2d1e" }, okey: "trapperB" };
const TRAPPER_C: Who = { i: 75, o: { torso: "#71563a", hat: "#6b4e2e", belt: "#453322" }, okey: "trapperC" };
// A man of Fort Kiowa.
const FORT_MAN: Who = { i: 76, o: { torso: "#4a5d7a", belt: "#2e3a4a", hat: "#3d3227" }, okey: "fortMan" };

// ---------------- the grizzly (Pen-drawn sprite) ----------------
// A rearing mother grizzly in the same 600x1000 design space as
// the stickmen (ground at y=975): hump, round ears, open jaw —
// big, brown and furious, but drawn soft: no gore anywhere.
const FUR = "#6e4a2c", FUR_D = "#59391f", FUR_L = "#86603c", SNOUT = "#a8845c";
const drawBear = (cub: boolean) => (p: Pen) => {
  const s = cub ? 0.92 : 1; // cubs: nearly the same drawing, placed small with a bigger head
  // hind legs + paws
  p.stroke([[238, 690], [228, 950]], 66, FUR_D); p.stroke([[362, 690], [372, 950]], 66, FUR_D);
  p.ell(222, 962, 44, 16, FUR_D, 0); p.ell(378, 962, 44, 16, FUR_D, 0);
  // body: the great barrel
  p.ell(300, 545, 188, 292, FUR, 7);
  p.ell(300, 600, 118, 198, FUR_L, 0);
  // the grizzly hump over the shoulders
  p.ell(300, 292, 128, 74, FUR, 0);
  // raised forelegs, paws out, claws showing (she is rearing, not striking — yet)
  if (!cub) {
    p.stroke([[168, 430], [104, 302], [76, 178]], 58, FUR);
    p.stroke([[432, 430], [496, 302], [524, 178]], 58, FUR);
    p.ell(74, 168, 40, 44, FUR, 5); p.ell(526, 168, 40, 44, FUR, 5);
    for (const sgn of [-1, 1]) for (let c = 0; c < 3; c++) {
      const bx = 300 + sgn * 226 + (c - 1) * 22;
      p.stroke([[bx, 138], [bx + sgn * 4, 104]], 7, "#e8e2d2");
    }
  } else {
    p.stroke([[180, 470], [150, 640], [142, 800]], 50, FUR);
    p.stroke([[420, 470], [450, 640], [458, 800]], 50, FUR);
    p.ell(142, 812, 34, 30, FUR, 5); p.ell(458, 812, 34, 30, FUR, 5);
  }
  // head
  const hr = cub ? 126 : 106, hy = cub ? 196 : 182;
  p.ell(214, hy - 76, 36, 34, FUR, 5); p.ell(386, hy - 76, 36, 34, FUR, 5);
  p.ell(214, hy - 76, 17, 15, FUR_D, 0); p.ell(386, hy - 76, 17, 15, FUR_D, 0);
  p.ell(300, hy, hr, hr * 0.94, FUR, 7);
  // snout + open jaw
  p.ell(300, hy + 52, 54, 42, SNOUT, 4);
  p.ell(300, hy + 30, 21, 13, "#2a1c10", 0);
  p.ell(300, hy + 82, 27, 19, "#3a1512", 0);
  p.poly([[278, hy + 66], [292, hy + 66], [285, hy + 82]], "#f2ede0", 0);
  p.poly([[308, hy + 66], [322, hy + 66], [315, hy + 82]], "#f2ede0", 0);
  // eyes: small, dark, furious; brows angled down to the nose
  p.dot(258, hy - 14, 10, INK); p.dot(342, hy - 14, 10, INK);
  p.stroke([[232, hy - 44], [272, hy - 28]], 9, FUR_D);
  p.stroke([[368, hy - 44], [328, hy - 28]], 9, FUR_D);
  void s;
};
const bear = (cam: CamInfo, x: number, y: number, z: number, scale: number, cub = false, tilt: { pitch?: number; roll?: number } = {}): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  return {
    key: `B|${cub ? "cub" : "bear"}`, x, y, z, scale,
    draw: drawBear(cub), size: [w, h, k], pitch: tilt.pitch, roll: tilt.roll,
  };
};

// ---------------- flat ground dressing (fx draws) ----------------
// the bear's skin, spread flat: an irregular brown hide with the
// head lump still on it — a blanket, a shroud, a trophy
const drawSkin = (p: Pen) => {
  p.poly([[70, 150], [130, 78], [250, 52], [392, 60], [452, 128], [430, 196], [300, 226], [150, 218], [84, 192]], FUR, 5);
  p.poly([[120, 150], [190, 104], [300, 96], [392, 128], [360, 178], [220, 190], [140, 182]], FUR_L, 0);
  p.ell(96, 120, 34, 26, FUR, 4); // the head, ears folded
  p.ell(78, 100, 10, 9, FUR_D, 0); p.ell(112, 98, 10, 9, FUR_D, 0);
};
// a rifle lying in the grass where it fell
const drawRifleGround = (p: Pen) => {
  p.stroke([[18, 88], [238, 40]], 11, "#2c2c30");
  p.stroke([[150, 56], [238, 40]], 24, "#6e4a2c");
  p.stroke([[18, 88], [66, 76]], 20, "#6e4a2c");
};
// a campfire's warm glow (the flame itself is world's geometry)
const drawGlow = (warm: string) => (p: Pen) => {
  const g = p.g;
  const gr = g.createRadialGradient(256, 256, 8, 256, 256, 254);
  gr.addColorStop(0, "rgba(255,252,244,0.95)");
  gr.addColorStop(0.35, warm);
  gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
};
// the drag trail: a long soft smear in the grass behind a crawling man
const drawTrail = (p: Pen) => {
  const g = p.g;
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, "rgba(74,62,40,0)");
  gr.addColorStop(0.25, "rgba(74,62,40,0.5)");
  gr.addColorStop(1, "rgba(74,62,40,0.62)");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(256, 32, 250, 20, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(90,76,48,0.35)";
  g.beginPath(); g.ellipse(256, 32, 250, 9, 0, 0, 7); g.fill();
};
// ---------------- the crawl (side-profile sprite) ----------------
// Glass dragging himself west: drawn side-on in a wide canvas —
// bear-skin cloak over his back, white head low and set forward,
// one arm reaching, legs trailing. Placed as a camera-facing Fx
// card; shot 11's camera travels perpendicular to the crawl, so
// the profile reads true.
const drawCrawl = (reach: number) => (p: Pen) => {
  const g = p.g;
  // trailing legs (thin black, one bent, one dragging straight)
  p.stroke([[620, 218], [760, 236], [908, 252]], 17, INK);
  p.stroke([[626, 196], [724, 168], [838, 196], [916, 182]], 17, INK);
  p.ell(922, 254, 26, 11, INK, 0); p.ell(922, 180, 26, 11, INK, 0);
  // the bear-skin cloak: a long brown mound over the whole back
  p.poly([[150, 208], [210, 118], [420, 84], [640, 108], [700, 190], [660, 232], [240, 238], [168, 232]], FUR, 6);
  p.poly([[230, 150], [330, 112], [520, 112], [620, 150], [560, 180], [300, 182]], FUR_L, 0);
  p.ell(168, 128, 26, 20, FUR, 4); // the bear's head, riding at his shoulder
  // the reaching arm, swinging with the drag (reach: -1..1)
  const hx = 196 + reach * 26, hy2 = 268 - Math.abs(reach) * 10;
  p.stroke([[238, 196], [216, 238], [hx, hy2]], 16, INK);
  p.ell(hx, hy2, 15, 15, "#ffffff", 5);
  // the planted arm under the shoulder
  p.stroke([[330, 210], [322, 258], [348, 282]], 16, INK);
  p.ell(348, 282, 15, 15, "#ffffff", 5);
  // head: low, forward, jaw set — profile: one eye, a grim line
  p.ell(148, 168, 62, 58, "#ffffff", 7);
  p.dot(128, 160, 8, INK);
  p.stroke([[104, 196], [138, 192]], 6, INK);
  p.stroke([[100, 138], [140, 146]], 6.5, INK); // the brow, angled down: effort
  // the red tie, hanging from his neck over the cloak's edge
  p.poly([[182, 196], [198, 200], [192, 246], [178, 224]], "#c0272d", 2);
  void g;
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
  const kneel = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y, z, { pose: "kneel", expr, blink: lidAt(t, who.i), ...extra }, scale));
  // Glass down: the standing sprite pitched far forward reads as a
  // body lying face-down on the ground, head toward the camera.
  const prone = (who: Who, x: number, y: number, z: number, expr: StickExpr, extra: Partial<StickOpts> = {}, scale = 1) =>
    out.places.push(person(cam, who, x, y + (y < 0.2 ? 0.3 : 0.06), z, { pose: "stand", expr, blink: lidAt(t, who.i), ...extra }, scale, { pitch: 1.18 }));
  const B = (who: Who, x: number, y: number, z: number, sc = 1) => blob(out, x, y, z, sc);
  const glowFx = (key: string, x: number, y: number, z: number, w: number, a: number) => {
    if (a <= 0.01) return;
    out.fx.push({ key: `glow|${key}|${q(a, 12)}`, cw: 512, ch: 512, draw: drawGlow("rgba(255,180,110,0.5)"), x, y, z, w, h: w, soft: true });
  };
  const skinFx = (x: number, z: number, w = 3.1, rot = 0.4) =>
    out.fx.push({ key: "bearskin", cw: 512, ch: 256, draw: drawSkin, x, y: 0.045, z, w, h: w * 0.5, flat: true, rot });
  void tt;

  if (id === 1) {
    // HOOK = the dramatic cover (no card in this lane): a bright
    // morning on the Grand River — the grizzly rearing huge over
    // Glass sprawled in the grass, his rifle flung wide, her two
    // cubs small behind her. Nobody has fired a shot yet.
    out.places.push(bear(cam, -3.6, 0, -82.6, 1.38));
    blob(out, -3.6, 0, -82.6, 1.5);
    out.places.push(bear(cam, -7.6, 0, -87.5, 0.5, true));
    out.places.push(bear(cam, -5.9, 0, -89, 0.44, true));
    prone(GLASS, GLASS_FALL[0], 0, GLASS_FALL[2], "shock", { armR: [150, 8] });
    out.fx.push({ key: "rifleground", cw: 256, ch: 128, draw: drawRifleGround, x: 1.9, y: 0.03, z: -77.6, w: 1.7, h: 0.85, flat: true, rot: 0.7 });
  } else if (id === 2) {
    // 1823: a scout walks the Grand River with his rifle, easy
    // in a country that has not hurt him yet.
    const wx = -13 + u * 9;
    walk(GLASS, wx, 0, -83.5, "neutral", { prop: "rifle" }, 1, 1.7);
    B(GLASS, wx, 0, -83.5);
  } else if (id === 3) {
    // THE CHARGE: Glass backs up the bank, rifle coming up; she
    // bursts from the thicket and closes the distance all shot.
    const gx = -6.5 + u * 1.2;
    if (u < 0.3) walk(GLASS, gx, 0, -82.5, "shock", { prop: "rifle" }, 1, 2.6);
    else stand(GLASS, gx, 0, -82.5, "shock", { prop: "rifle", armR: [42, 10] });
    B(GLASS, gx, 0, -82.5);
    const bx = -8.5 + u * 4.6, bz = -88 + u * 5.2;
    out.places.push(bear(cam, bx, 0, bz, 1.3));
    blob(out, bx, 0, bz, 1.4);
    out.places.push(bear(cam, -9.8, 0, -89.5, 0.5, true));
    out.places.push(bear(cam, -8.2, 0, -91, 0.44, true));
  } else if (id === 4) {
    // THE WOUNDS: grey light. Glass face-down in the grass,
    // bandaged already by hands that did what they could; two
    // trappers kneel over him, out of ideas.
    prone(GLASS_HURT, GLASS_FALL[0], 0, GLASS_FALL[2], "pained", {});
    kneel(TRAPPER_B, 0.9, 0, -78.6, "sad", { armR: [38, 30] });
    B(TRAPPER_B, 0.9, 0, -78.6);
    kneel(TRAPPER_C, -3.4, 0, -78.2, "sad", {});
    B(TRAPPER_C, -3.4, 0, -78.2);
  } else if (id === 5) {
    // THE BEAR IS DEAD — on her side in the foreground grass.
    // Beyond her, the men stand over Glass and shake their heads:
    // no one expects the shape on the ground to live.
    out.places.push(bear(cam, 2.2, 0.52, -76.8, 1.3, false, { roll: 1.52 }));
    prone(GLASS_HURT, GLASS_FALL[0], 0, GLASS_FALL[2], "pained", {});
    stand(TRAPPER_B, 1.4, 0, -83.8, "sad", { armL: [20, 60], look: Math.sin(t * 0.7) * 0.2 });
    B(TRAPPER_B, 1.4, 0, -83.8);
    stand(FITZ, -3.9, 0, -84.2, "stern", { look: Math.sin(t * 0.5 + 2) * 0.25 });
    B(FITZ, -3.9, 0, -84.2);
    stand(ASHLEY, -6.4, 0, -83.4, "sad", {});
    B(ASHLEY, -6.4, 0, -83.4);
  } else if (id === 6) {
    // THE VIGIL: camp. Glass lies by the fire on the bear's own
    // skin; Ashley names the two who will stay: Fitzgerald, and
    // the boy Bridger, nineteen.
    skinFx(GRAVE[0], GRAVE[2], 2.2, 0.3);
    prone(GLASS_HURT, GRAVE[0], 0.06, GRAVE[2], "pained", {});
    stand(ASHLEY, 83.4, 0, 9.6, "stern", { armR: [118, 8], prop: "paper" });
    B(ASHLEY, 83.4, 0, 9.6);
    stand(FITZ, 86.2, 0, 6.8, "stern", {});
    B(FITZ, 86.2, 0, 6.8);
    stand(BRIDGER, 87.3, 0, 8.6, "nervous", {}, BRIDGER_S);
    B(BRIDGER, 87.3, 0, 8.6, BRIDGER_S);
    glowFx("fire", 76.5, 0.9, 12, 4.2, 0.5 + 0.1 * Math.sin(t * 7.3));
  } else if (id === 7) {
    // FIVE DAYS — and they go. From the grave's own level: two
    // backs walking into the bright, Fitzgerald carrying a rifle
    // that is not his. Under the skin: nothing moves.
    skinFx(GRAVE[0], GRAVE[2], 2.2, 0.3);
    const wx = 84 + u * 11, wz = 8 + u * 7.5;
    walk(FITZ, wx, 0, wz, "stern", { prop: "rifle" }, 1, 1.6);
    B(FITZ, wx, 0, wz);
    walk(BRIDGER, wx + 1.6, 0, wz + 1.4, "sad", {}, BRIDGER_S, 1.6);
    B(BRIDGER, wx + 1.6, 0, wz + 1.4, BRIDGER_S);
  } else if (id === 8) {
    // THE LIE: "Glass is dead, we were attacked." But the grave
    // is shallow and the man in it is breathing — late in the
    // shot, under the dragged-back skin, his eyes open.
    skinFx(GRAVE[0] + 1.3, GRAVE[2] + 0.9, 2.0, 0.9);
    if (u < 0.55) prone(GLASS_HURT, GRAVE[0], 0.06, GRAVE[2], "pained", {});
    else prone(GLASS_HURT, GRAVE[0], 0.06, GRAVE[2], "shock", { blink: 0 });
    glowFx("firefar", 76.5, 0.9, 12, 3.4, 0.3);
  } else if (id === 9) {
    // ALONE: he sits up in a world with nothing in it — no
    // rifle, no food, one bad leg, and a signpost that reads
    // like a death sentence: FORT KIOWA, 200 MIL.
    sit(GLASS_HURT, -7.6, 0, 66.2, u < 0.5 ? "sad" : "stern", { look: 0.5 });
    blob(out, -7.6, 0, 66.2);
  } else if (id === 10) {
    // HE SETS HIS OWN LEG: seated, teeth gritted, hands at the
    // splint — and by the end of it he is wearing the bear.
    const who = u < 0.45 ? GLASS_HURT : GLASS_SKIN;
    sit(who, -5.8, 0, 66.5, "pained", { armL: [34, 42], armR: [30, 46] });
    blob(out, -5.8, 0, 66.5);
    out.fx.push({ key: "rifleground", cw: 256, ch: 128, draw: drawRifleGround, x: -3.4, y: 0.03, z: 68.6, w: 1.4, h: 0.7, flat: true, rot: 2.4 });
  } else if (id === 11) {
    // THE CRAWL: six weeks in one shot — a man dragging himself
    // across the whole frame, the trail unspooling behind him,
    // the plains refusing to end.
    const cx = crawlX(u);
    const reach = Math.sin(t * 1.9);
    out.fx.push({
      key: `crawl|${q(reach, 24)}`, cw: 1024, ch: 320, draw: drawCrawl(reach),
      x: cx, y: 0.62, z: CRAWL_Z, w: 3.3, h: 1.03,
    });
    const trailLen = Math.max(0.5, 4.5 - cx);
    out.fx.push({
      key: "crawltrail", cw: 512, ch: 64, draw: drawTrail,
      x: cx + trailLen / 2 + 1.2, y: 0.03, z: CRAWL_Z + 0.15, w: trailLen, h: 0.85, flat: true, rot: 0,
    });
    blob(out, cx, 0, CRAWL_Z, 1.6);
  } else if (id === 12) {
    // THE RAFT: the Cheyenne carries what the plains could not
    // kill. Glass lies across the logs in the bear's skin; the
    // fort's landing is ahead, and men are already staring.
    const rx = raftX(u);
    prone(GLASS_SKIN, rx + 0.2, 0.42, RAFT_Z, u < 0.6 ? "sad" : "relief", {}, 1.3);
    if (u > 0.75) {
      stand(FORT_MAN, LANDING[0], 0, LANDING[2], "shock", { armR: [128 + Math.sin(t * 2.2) * 10, 10] });
      B(FORT_MAN, LANDING[0], 0, LANDING[2]);
      stand(TRAPPER_B, LANDING[0] + 2.2, 0, LANDING[2] + 0.8, "shock", {});
      B(TRAPPER_B, LANDING[0] + 2.2, 0, LANDING[2] + 0.8);
    }
    glowFx("river", rx - 2, 1.4, RAFT_Z - 2, 5, 0.3);
  } else if (id === 13) {
    // FORGIVENESS: inside the palisade. He came for revenge —
    // and finds a boy of nineteen on his knee, head down. The
    // scarred hand rises… and opens. A pardon, not a blow.
    stand(GLASS_SKIN, -118.6, 0, -23.2, u < 0.5 ? "stern" : "relief", u < 0.5 ? { prop: "stick", armR: [24, 14] } : { armR: [128, 10] });
    B(GLASS_SKIN, -118.6, 0, -23.2);
    kneel(BRIDGER, -120.6, 0, -25.6, "sad", {}, BRIDGER_S);
    B(BRIDGER, -120.6, 0, -25.6, BRIDGER_S);
    stand(TRAPPER_C, -115.8, 0, -26.4, "neutral", {});
    B(TRAPPER_C, -115.8, 0, -26.4);
  } else if (id === 14) {
    // CLOSE: the gate at gold hour. Glass on his feet in the
    // middle of it — whole enough to stand, scarred enough to
    // prove it — the storyteller beside him. Not strength.
    // Refusing to die.
    stand(GLASS, GATE_X, 0, -27.2, "relief_open", {});
    B(GLASS, GATE_X, 0, -27.2);
    stand(HERO, GATE_X + 3.1, 0, -26.6, "smile", {}, 1.28);
    B(HERO, GATE_X + 3.1, 0, -26.6, 1.28);
    glowFx("gate", GATE_X, 2.6, -29, 10, 0.25);
    const bu = (tt - S0(13)) / 1.8;
    if (bu >= 0 && bu < 1) out.fx.push({ key: `burst${q(bu, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(bu, 24)), x: GATE_X, y: 3.6, z: -27, w: 4.2, h: 4.2, soft: true });
  }
  return out;
};
