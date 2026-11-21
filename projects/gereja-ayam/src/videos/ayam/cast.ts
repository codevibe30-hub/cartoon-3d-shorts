// The cast of the Gereja Ayam short as lit flat sprites in the 3D
// Bukit Rhema world: the hero narrator (series continuity: teal
// shirt, cream cap), Daniel the builder, two visitors, a guide and
// a kid — staged per shot around the giant chicken. Same pool +
// card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact
// blobs. Fact cards float as ink-outlined boards via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the view
// axis (computed from the live camera each frame) so they always
// sit in frame. The dove — the film's twist — is a hand-drawn Pen
// sprite that flies in the dream shot and perches in the twist shot.
import * as THREE from "three";
import {
  Pen, bodyFront, townsfolk, KID, fxBurst, fxStars, fxPuff, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, clamp01, smooth, DOVE_T, CHEER_T, HEAD, DECK, HERO_SPOT, stairY } from "./story";
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

// ---------------- our people ----------------
// HERO: the narrator — teal shirt, cream cap (series continuity).
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#e8e6df", hat: "cap", cap: "#f2ede2" }, okey: "ayamHero" };
// DANIEL: the builder — an older man, brown jacket, grey moustache.
const DANIEL: Who = { i: 61, o: { jacket: "#5a4632", pants: "#33383e", boots: "#2c2620", hat: "hair", hair: "#9a958c", moustache: "#9a958c" }, okey: "ayamDaniel" };
// VISITORS: a woman in purple, a man in maroon, a guide in green.
const VIS_F: Who = { i: 62, o: { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#2a1c14" }, okey: "ayamVisF" };
const VIS_M: Who = { i: 63, o: { jacket: "#7a1f1f", pants: "#33383e", boots: "#2c2620", hat: "cap", cap: "#23272f" }, okey: "ayamVisM" };
const GUIDE: Who = { i: 64, o: { jacket: "#1e7a46", pants: "#3d4440", boots: "#2c2620", hat: "cap", cap: "#f2ede2" }, okey: "ayamGuide" };
// THE KID: straight from the shared wardrobe.
const KIDW: Who = { i: 65, o: { ...KID }, okey: "ayamKid" };
void townsfolk;

// Zone anchors (must match world.ts + story.ts): the chicken's body
// centre BODY_C (0, 5.2, -16), head HEAD (0, 12.3, -7.2), crown deck
// DECK (0, 14.3, -6.4), chest door at z=-8.4 on the base (top y=1.1),
// the flank stair x=6.1 with tread heights stairY(z), café (7.5,-25).

// ---------------- the dove ----------------
// A small white dove in side profile, drawn on a 600x400 canvas:
// plump body, fanned tail, a wing that flaps with `ph` (0..1), a
// tiny orange beak. The twist of the whole film, in one sprite.
const drawDove = (ph: number) => (p: Pen) => {
  const g = p.g;
  const flap = Math.sin(ph * Math.PI * 2); // -1..1
  // tail fan
  p.poly([[128, 218], [52, 178], [46, 226], [60, 268], [140, 252]], "#eef1f4", 7);
  // far wing (behind body, paler)
  p.ell(268, 168 - flap * 26, 96, 26, "#dfe5ea", 5, 0, 360, -0.5 - flap * 0.35);
  // body
  p.ell(272, 216, 138, 64, "#ffffff", 8, 0, 360, -0.10);
  // near wing: sweeps up on the flap
  p.ell(258, 158 - flap * 58, 108, 30, "#f7f9fa", 6, 0, 360, -0.55 - flap * 0.45);
  // head + beak + eye
  p.ell(404, 172, 36, 31, "#ffffff", 7);
  p.poly([[434, 164], [472, 174], [434, 186]], "#e8862c", 4);
  p.dot(412, 166, 5.5, INK);
  void g;
};

// ---------------- staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tt = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const stand = (who: Who, x: number, y: number, z: number, expr: Expr, look = 0, extra: Partial<FrontOpts> = {}, scale = 1) =>
    person(cam, who, x, y, z, { mode: "stand", expr, blink: lidAt(t, who.i), look, ...extra }, scale);
  const burstFx = (t0: number, dur: number, x: number, y: number, z: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u >= 0 && u < 1) out.fx.push({ key: `burst${q(u, 24)}`, cw: 800, ch: 800, draw: (p) => fxBurst(p, q(u, 24)), x, y, z, w, h: w });
  };
  const starsFx = (x: number, y: number, z: number, w: number) =>
    out.fx.push({ key: `stars${q((tt * 0.7) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxStars(p, q((tt * 0.7) % 1, 20)), x, y, z, w, h: w, soft: true });
  const cardFx = (key: string, draw: (p: Pen) => void, t0: number, dur: number, x: number, y: number, z: number, w: number, h: number) => {
    if (tt >= t0 && tt < t0 + dur) out.fx.push({ key, cw: 512, ch: 256, draw, x, y, z, w, h });
  };
  // axis-glued cards: placed on the camera's TRUE view axis (cam.dir)
  // so they are always centred in frame. Size scales with the card's
  // distance so the board spans a fixed share of the frame WIDTH.
  const cardAerial = (key: string, draw: (p: Pen) => void, t0: number, dur: number,
    tx: number, ty: number, tz: number, frac: number, up: number, screenFrac = 0.60) => {
    let x: number, y: number, z: number, d: number;
    if (cam.dir) {
      const distT = cam.pos.distanceTo(tmp.set(tx, ty, tz)) * frac;
      const ux = cam.right.y * cam.dir.z - cam.right.z * cam.dir.y;
      const uy = cam.right.z * cam.dir.x - cam.right.x * cam.dir.z;
      const uz = cam.right.x * cam.dir.y - cam.right.y * cam.dir.x;
      x = cam.pos.x + cam.dir.x * distT + ux * up;
      y = cam.pos.y + cam.dir.y * distT + uy * up;
      z = cam.pos.z + cam.dir.z * distT + uz * up;
      d = distT;
    } else {
      x = cam.pos.x + (tx - cam.pos.x) * frac;
      y = cam.pos.y + (ty - cam.pos.y) * frac + up;
      z = cam.pos.z + (tz - cam.pos.z) * frac;
      d = Math.hypot(x - cam.pos.x, y - cam.pos.y, z - cam.pos.z);
    }
    const w = 2 * d * 0.466 * 0.5625 * screenFrac;
    cardFx(key, draw, t0, dur, x, y, z, w, w / 2);
  };
  const doveFx = (t0: number, dur: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number) => {
    const u = (tt - t0) / dur;
    if (u < 0 || u > 1) return;
    const x = ax + (bx - ax) * u, y = ay + (by - ay) * u + Math.sin(u * Math.PI) * 0.7, z = az + (bz - az) * u;
    const ph = (tt * 7) % 1;
    out.fx.push({ key: `dove${q(ph, 14)}`, cw: 600, ch: 400, draw: drawDove(ph), x, y, z, w, h: w * 400 / 600 });
  };
  const S0 = (i: number) => L[i] / FPS;

  if (id === 1) {
    // HOOK = CLICKBAIT COVER (frame 0): the giant head + crown loom
    // overhead, the hero big in the foreground with the exaggerated
    // SHOCK face, the kid pointing up, and the claim as one GIANT
    // board from the very first frame: "GEREJA AYAM / RAKSASA?!"
    out.places.push(stand(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], "shock", -0.2, {}, 1.35)); blob(out, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], 1.35);
    cardAerial("cardHook", drawCardFit(["GEREJA AYAM", "RAKSASA?!"], "#f2c018", "#1c1503", 104),
      0, 2.9, HEAD[0], HEAD[1], HEAD[2], 1.0, 4.5, 0.52);
  }
  if (id === 2) {
    // WIDE: the whole bird on its hill; the hero waves from the path,
    // a visitor photographs it from the grass
    out.places.push(stand(HERO, 0.8, 0, 10, "grin", -0.2, { wave: 1 })); blob(out, 0.8, 0, 10);
    out.places.push(stand(VIS_F, 0.5, 0, 7.5, "neutral", 0.15)); blob(out, 0.5, 0, 7.5);
    cardAerial("cardRhema", drawCardFit(["BUKIT RHEMA", "MAGELANG"], "#274a7a", "#ffffff", 110),
      S0(1) + 0.35, 2.6, 0, 6, -16, 0.30, -0.5);
  }
  if (id === 3) {
    // THE DREAM (GOLDEN): Daniel on the path at dawn, gazing up in a
    // daze; the white dove crosses the sky where the crown will be
    out.places.push(stand(DANIEL, 0.8, 0, -5.5, "dazed", -0.3)); blob(out, 0.8, 0, -5.5);
    doveFx(DOVE_T, 4.6, -16, 14.5, -16, 15, 13.2, -22, 3.4);
    starsFx(-2, 13.8, -18, 1.6);
    cardAerial("cardDream", drawCardFit(["MIMPI 1988", "MERPATI PUTIH"], "#7a4a8c", "#ffffff", 104),
      S0(2) + 0.35, 2.6, 0, 10.6, -9, 0.34, 1.6, 0.58);
  }
  if (id === 4) {
    // FOR EVERYONE: the hero holds the chest door as visitors of
    // every kind stream up the steps and in
    out.places.push(stand(HERO, 2.3, 1.1, -6.4, "grin", -0.25, { wave: 1 })); blob(out, 2.3, 1.1, -6.4);
    out.places.push(stand(VIS_F, 0.9, 1.1, -4.6, "grin", 0.1)); blob(out, 0.9, 1.1, -4.6);
    out.places.push(stand(DANIEL, -0.6, 1.1, -5.9, "neutral", 0.2)); blob(out, -0.6, 1.1, -5.9);
    out.places.push(stand(VIS_M, 1.6, 0, -3.4, "neutral", -0.1)); blob(out, 1.6, 0, -3.4);
    out.places.push(stand(KIDW, 0.3, 0.54, -3.85, "grin", 0, {}, 0.78)); blob(out, 0.3, 0.54, -3.85, 0.78);
    cardAerial("cardAll", drawCardFit(["RUMAH DOA", "BUAT SEMUA!"], "#1e7a46", "#ffffff", 104),
      S0(3) + 0.4, 2.6, 0, 2.6, -8.6, 0.36, 1.5, 0.58);
  }
  if (id === 5) {
    // THE TWIST: tight on the head. The hero stands ON the crown
    // deck in shock; a small real dove perches by the spikes — the
    // building's true shape, at 1/20th the size
    out.places.push(stand(HERO, DECK[0] + 0.55, DECK[1] + 0.08, DECK[2], "shock", 0.3, {}, 0.95)); blob(out, DECK[0] + 0.55, DECK[1] + 0.08, DECK[2], 0.95);
    out.fx.push({ key: "dovePerch", cw: 600, ch: 400, draw: drawDove(0.82), x: 1.5, y: 14.55, z: -7.6, w: 1.15, h: 1.15 * 400 / 600 });
    cardAerial("cardTwist", drawCardFit(["ASLINYA…", "MERPATI!"], "#c8352c", "#ffffff", 110),
      S0(4) + 0.35, 2.6, HEAD[0], HEAD[1], HEAD[2], 0.42, 1.1, 0.58);
  }
  if (id === 6) {
    // THE RUIN (STORM): the hero picks through the weeds before the
    // streaked, vine-hung bird — nobody has come here for years
    out.places.push(stand(HERO, -3.2, 0, 2.5, "nervous", 0.3, {}, 1.05)); blob(out, -3.2, 0, 2.5, 1.05);
    out.places.push(stand(VIS_M, -5.6, 0, 6.5, "nervous", -0.2, {}, 0.95)); blob(out, -5.6, 0, 6.5, 0.95);
    cardAerial("cardRuin", drawCardFit(["MANGKRAK", "15 TAHUN!"], "#3a3f47", "#ffb35c", 110),
      S0(5) + 0.35, 2.6, 0, 6, -16, 0.30, -0.5);
  }
  if (id === 7) {
    // FAMOUS (GOLDEN): a happy crowd on the path, phones up, camera
    // flashes popping; the hero basks, grinning, waving at them
    out.places.push(stand(HERO, 1.2, 0, 0.5, "grin", -0.25, { wave: 1 })); blob(out, 1.2, 0, 0.5);
    out.places.push(stand(VIS_F, -1.8, 0, 2.5, "grin", 0.2)); blob(out, -1.8, 0, 2.5);
    out.places.push(stand(VIS_M, 2.2, 0, -1.0, "grin", -0.15)); blob(out, 2.2, 0, -1.0);
    out.places.push(stand(KIDW, -0.6, 0, 4.2, "grin", 0.1, {}, 0.78)); blob(out, -0.6, 0, 4.2, 0.78);
    burstFx(CHEER_T, 0.7, 0.5, 3.2, 1.5, 1.1);
    burstFx(CHEER_T + 1.1, 0.7, -1.5, 2.8, 3.5, 0.9);
    cardAerial("cardFame", drawCardFit(["GARA-GARA", "AADC 2!"], "#b8352c", "#ffffff", 104),
      S0(6) + 0.4, 2.6, 0, 9.2, -9, 0.36, 1.4, 0.58);
  }
  if (id === 8) {
    // THE CLIMB: hero + kid on the flank stair, the guide waiting
    // on the neck platform far above them
    out.places.push(stand(HERO, 6.1, stairY(-4), -4, "grin", -0.3)); blob(out, 6.1, stairY(-4), -4);
    out.places.push(stand(KIDW, 6.15, stairY(-7.5), -7.5, "grin", 0.2, {}, 0.78)); blob(out, 6.15, stairY(-7.5), -7.5, 0.78);
    out.places.push(stand(GUIDE, 6.1, 9.75, -12.6, "neutral", 0.25, { wave: 1 })); blob(out, 6.1, 9.75, -12.6);
    cardAerial("cardClimb", drawCardFit(["7 LANTAI", "SAMPAI MAHKOTA!"], "#0e5a54", "#ffffff", 100),
      S0(7) + 0.4, 2.6, 0.5, 10.2, -10.5, 0.40, 0.6, 0.58);
  }
  if (id === 9) {
    // THE CROWN VISTA: no cast — the view is the actor. Borobudur
    // left, Merapi + Merbabu right, the railing at the frame's feet
    cardAerial("cardVista", drawCardFit(["BOROBUDUR,", "MERAPI + MERBABU!"], "#31556e", "#ffffff", 96),
      S0(8) + 0.4, 2.8, -10, 4, -110, 0.16, 2.6, 0.58);
  }
  if (id === 10) {
    // PUNCHLINE: shot 1 again — the hero LAUGHING under the great
    // head; a small white dove crosses the top of the frame and the
    // claim card closes the loop
    out.places.push(stand(HERO, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], "laugh", -0.15, {}, 1.35)); blob(out, HERO_SPOT[0], HERO_SPOT[1], HERO_SPOT[2], 1.35);
    starsFx(HERO_SPOT[0], HERO_SPOT[1] + 2.6, HERO_SPOT[2], 1.2);
    doveFx(S0(9) + 0.5, 3.4, -10, 15.6, -12, 11, 14.6, -16, 2.3);
    cardAerial("cardHook10", drawCardFit(["GEREJA AYAM", "RAKSASA?!"], "#f2c018", "#1c1503", 104),
      S0(9) + 0.3, 2.7, HEAD[0], HEAD[1], HEAD[2], 1.0, 4.5, 0.52);
  }
  return out;
};
export { FPS };
