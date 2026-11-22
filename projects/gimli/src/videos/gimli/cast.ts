// The cast of the Gimli Glider short as lit flat sprites in the
// 3D world: the hero narrator (series continuity: teal shirt,
// cream cap), Captain Pearson + First Officer Quintal in Air
// Canada navy, the cheerful fueler who loaded POUNDS for
// KILOGRAMS, passengers, drag racers and the Gimli crowd — staged
// per shot around the apron, the sky and the drag strip. Same pool
// + card machinery as the house style: one canvas per distinct
// drawing, yaw-only billboards shaded by cardShade(), soft contact
// blobs. Fact cards float as ink-outlined boards via drawCardFit
// (auto-fit: text NEVER overflows the board), glued to the view
// axis so they always sit in frame.
import * as THREE from "three";
import {
  Pen, bodyFront, KID, fxBurst, fxStars, fxShadow, fxContact, INK,
  Outfit, Expr, FrontOpts,
} from "./toon";
import { FPS, SHOTS, L, clamp01, smooth, camAt, DIE_T, TOUCH_T, PLANE_LAND, SKY_C, GIMLI_C } from "./story";
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
const HERO: Who = { i: 41, o: { jacket: "#2e7f86", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2ede2" }, okey: "gimliHero" };
// CAPTAIN PEARSON: Air Canada navy uniform + navy cap, calm grey hair.
const CAPTAIN: Who = { i: 81, o: { jacket: "#22355e", pants: "#22355e", boots: "#23262b", hat: "cap", cap: "#22355e", hair: "#9a958c" }, okey: "gimliCaptain" };
// FIRST OFFICER QUINTAL: the same navy, a shade lighter, dark hair.
const COPILOT: Who = { i: 82, o: { jacket: "#33507e", pants: "#22355e", boots: "#23262b", hat: "cap", cap: "#22355e", hair: "#2a1c12" }, okey: "gimliCopilot" };
// THE FUELER: hi-vis orange, yellow cap — a happy man with a hose
// and a conversion factor he should never have been given.
const FUELER: Who = { i: 83, o: { jacket: "#e8862c", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#e8c832" }, okey: "gimliFueler" };
// PASSENGERS + CROWD
const PAX_F: Who = { i: 84, o: { jacket: "#7b5ac9", dress: "#d9a441", pants: "#3b3f52", boots: "#c99067", hat: "hair", hair: "#1d1410", skin: "#c99067" }, okey: "gimliPaxF" };
const PAX_M: Who = { i: 85, o: { jacket: "#2f5f6a", pants: "#33383e", boots: "#c99067", hat: "cap", cap: "#f2ede2", skin: "#f5c9a0" }, okey: "gimliPaxM" };
const PAX_R: Who = { i: 86, o: { jacket: "#b8352c", pants: "#2e3138", boots: "#eec39b", hat: "hair", hair: "#4a3020" }, okey: "gimliPaxR" };
const KIDW: Who = { i: 87, o: { ...KID, skin: "#c99067", boots: "#eec39b" }, okey: "gimliKid" };
// DRAG RACERS: red + blue fire-suit jackets
const RACER_A: Who = { i: 88, o: { jacket: "#c0272d", pants: "#23262b", boots: "#23262b", hat: "cap", cap: "#c0272d" }, okey: "gimliRacerA" };
const RACER_B: Who = { i: 89, o: { jacket: "#2e6cd2", pants: "#23262b", boots: "#23262b", hat: "cap", cap: "#2e6cd2" }, okey: "gimliRacerB" };

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
      // FIT GUARD: clamp the vertical offset so the whole card —
      // centre offset plus its half height — stays inside the
      // shot's real vertical FOV.
      const w0 = 2 * distT * 0.466 * 0.5625 * screenFrac;
      const halfTan = Math.tan((camAt(id, Math.round(tt * FPS)).fov * Math.PI) / 360);
      const upMax = Math.max(0.05, distT * halfTan * 0.93 - w0 / 4);
      const upC = Math.max(-upMax, Math.min(up, upMax));
      const ux = cam.right.y * cam.dir.z - cam.right.z * cam.dir.y;
      const uy = cam.right.z * cam.dir.x - cam.right.x * cam.dir.z;
      const uz = cam.right.x * cam.dir.y - cam.right.y * cam.dir.x;
      x = cam.pos.x + cam.dir.x * distT + ux * upC;
      y = cam.pos.y + cam.dir.y * distT + uy * upC;
      z = cam.pos.z + cam.dir.z * distT + uz * upC;
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
  const S0 = (i: number) => L[i] / FPS;

  if (id === 1) {
    // HOOK = CLICKBAIT COVER (frame 0): the silent giant glides
    // huge behind, the hero's SHOCK face big in the near foreground
    // (cockpit framing), the claim as one GIANT board from frame 0
    out.places.push(stand(HERO, -131.3, 60.3, -6.8, "shock", -0.2, {}, 1.5));
    cardAerial("cardHook", drawCardFit(["KEHABISAN", "BENSIN!"], "#f2c018", "#1c1503", 104),
      0, 2.9, SKY_C[0], SKY_C[1] + 6, SKY_C[2], 0.5, 5.5, 0.5);
  }
  if (id === 2) {
    // MONTREAL 1983: the crew at the parked jet, the hero waving
    // from the apron foreground — a brand-new 767, a routine day
    out.places.push(stand(CAPTAIN, 7.5, 0, 2.5, "grin", -0.15)); blob(out, 7.5, 0, 2.5);
    out.places.push(stand(COPILOT, 9.4, 0, 3.6, "neutral", 0.15)); blob(out, 9.4, 0, 3.6);
    out.places.push(stand(HERO, -3, 0, 13.5, "grin", -0.2, { wave: 1 }, 1.1)); blob(out, -3, 0, 13.5, 1.1);
    cardAerial("card1983", drawCardFit(["KANADA", "1983"], "#274a7a", "#ffffff", 110),
      S0(1) + 0.35, 2.6, 0, 5, -14, 0.30, -0.5);
  }
  if (id === 3) {
    // THE MIX-UP: the fueler couples the hose, squinting at the
    // drip sheet — pounds, kilos, what's the difference? (It is
    // 2.2x the difference.) The captain watches from the wing
    out.places.push(stand(FUELER, 4.6, 0, 1.6, "nervous", 0.2)); blob(out, 4.6, 0, 1.6);
    out.places.push(stand(CAPTAIN, 8.6, 0, 5.6, "stern", -0.25)); blob(out, 8.6, 0, 5.6);
    cardAerial("cardMix", drawCardFit(["PON DIKIRA", "KILO!"], "#c96a1e", "#ffffff", 104),
      S0(2) + 0.35, 2.6, 3, 1.5, 0, 0.38, 1.3, 0.58);
  }
  if (id === 4) {
    // THE NUMBERS: the fueler, smug, pats the wing tank — job
    // done! The hero in the foreground smells something wrong
    out.places.push(stand(FUELER, -1.5, 0, 2.2, "grin", 0.1)); blob(out, -1.5, 0, 2.2);
    out.places.push(stand(HERO, -7.5, 0, 8.5, "nervous", -0.2, {}, 1.05)); blob(out, -7.5, 0, 8.5, 1.05);
    cardAerial("cardNum", drawCardFit(["22.300 PON?!", "= 10.100 KILO"], "#b8352c", "#ffffff", 96),
      S0(3) + 0.3, 2.8, 0, 3, -6, 0.40, 1.2, 0.58);
  }
  if (id === 5) {
    // ENGINES DIE: nobody on screen but the jet and the grey —
    // one dull pop at DIE_T, then the loudest silence in Canada
    burstFx(DIE_T, 0.7, -139, 59.5, -19, 2.4);
    cardAerial("cardDie", drawCardFit(["MESIN", "MATI!"], "#22354f", "#ffd98a", 110),
      DIE_T - 0.2, 2.4, SKY_C[0], SKY_C[1], SKY_C[2], 0.40, 1.5, 0.58);
  }
  if (id === 6) {
    // THE GLIDER PILOT: Pearson BIG in the cockpit framing, hands
    // steady, jaw set — he has done this a thousand times, just
    // never in a 767. Quintal behind him, doing the math
    out.places.push(stand(CAPTAIN, -134.9, 59.6, -11.6, "stern", -0.1, {}, 1.55));
    out.places.push(stand(COPILOT, -136.8, 59.0, -15.8, "nervous", 0.2, {}, 1.3));
    cardAerial("cardGlider", drawCardFit(["PILOT LAYANG", "17 MENIT!"], "#1e7a46", "#ffffff", 96),
      S0(5) + 0.35, 2.6, SKY_C[0], SKY_C[1], SKY_C[2], 0.42, 4.0, 0.42);
  }
  if (id === 7) {
    // GIMLI FROM ABOVE: race day — the crowd at the rails, the
    // racers by their cars, nobody looking up. Yet.
    out.places.push(stand(PAX_F, 140, 0, 11.5, "grin", 0.1, { wave: 1 })); blob(out, 140, 0, 11.5);
    out.places.push(stand(PAX_M, 147, 0, 11.8, "neutral", -0.15)); blob(out, 147, 0, 11.8);
    out.places.push(stand(KIDW, 152, 0, 11.3, "grin", 0.2, {}, 0.78)); blob(out, 152, 0, 11.3, 0.78);
    out.places.push(stand(PAX_R, 133, 0, 11.6, "neutral", 0)); blob(out, 133, 0, 11.6);
    out.places.push(stand(RACER_A, 159.5, 0, 6, "neutral", -0.2)); blob(out, 159.5, 0, 6);
    out.places.push(stand(RACER_B, 167, 0, -6, "neutral", 0.2)); blob(out, 167, 0, -6);
    cardAerial("cardGimli", drawCardFit(["TUJUAN:", "GIMLI"], "#7a4a8c", "#ffffff", 110),
      S0(6) + 0.35, 2.6, GIMLI_C[0], 2, GIMLI_C[2], 0.34, 1.6, 0.58);
  }
  if (id === 8) {
    // THE LANDING: the racers dive off the strip, the crowd goes
    // from cheering the drag race to screaming at the sky
    out.places.push(stand(RACER_A, 150, 0, 12.5, "shock", -0.2, {}, 1.05)); blob(out, 150, 0, 12.5, 1.05);
    out.places.push(stand(RACER_B, 170, 0, -12, "shock", 0.2, {}, 1.05)); blob(out, 170, 0, -12, 1.05);
    out.places.push(stand(PAX_F, 140, 0, 11.5, "shock", 0.1)); blob(out, 140, 0, 11.5);
    out.places.push(stand(PAX_M, 146, 0, 11.8, "shock", -0.1)); blob(out, 146, 0, 11.8);
    out.places.push(stand(KIDW, 152, 0, 11.3, "shock", 0.15, {}, 0.78)); blob(out, 152, 0, 11.3, 0.78);
    cardAerial("cardRace", drawCardFit(["LANDASAN", "BALAPAN!"], "#b8352c", "#ffffff", 104),
      TOUCH_T - 1.3, 2.6, 156, 2, 0, 0.42, 1.1, 0.58);
  }
  if (id === 9) {
    // 69 SAFE: down the slide and onto the strip — hugs, tears,
    // laughter; the crew last out, grinning like schoolboys
    out.places.push(stand(CAPTAIN, 143.5, 0, 4.5, "grin", -0.1)); blob(out, 143.5, 0, 4.5);
    out.places.push(stand(COPILOT, 141.3, 0, 5.6, "relief_open", 0.15)); blob(out, 141.3, 0, 5.6);
    out.places.push(stand(PAX_F, 147, 0, 6.5, "laugh", 0.1)); blob(out, 147, 0, 6.5);
    out.places.push(stand(PAX_M, 149.5, 0, 5.0, "relief", -0.15)); blob(out, 149.5, 0, 5.0);
    out.places.push(stand(KIDW, 151.2, 0, 7.0, "grin", 0.2, { wave: 1 }, 0.78)); blob(out, 151.2, 0, 7.0, 0.78);
    out.places.push(stand(PAX_R, 153.5, 0, 4.2, "grin", 0, { wave: 1 })); blob(out, 153.5, 0, 4.2);
    starsFx(146, 3.6, 4.5, 1.7);
    cardAerial("cardSafe", drawCardFit(["69 ORANG", "SELAMAT!"], "#1e7a46", "#ffffff", 104),
      S0(8) + 0.35, 2.6, 148, 2, 0, 0.38, 1.3, 0.58);
  }
  if (id === 10) {
    // PUNCHLINE: the resting giant, nose on the ground like a
    // tired horse — and the hero laughing under the payoff card
    out.places.push(stand(HERO, 136, 0, 13, "laugh", -0.15, {}, 1.3)); blob(out, 136, 0, 13, 1.3);
    out.places.push(stand(CAPTAIN, 146, 0, 7, "grin", -0.1)); blob(out, 146, 0, 7);
    out.places.push(stand(COPILOT, 148.6, 0, 8.2, "grin", 0.15)); blob(out, 148.6, 0, 8.2);
    cardAerial("cardFinal", drawCardFit(["PON VS", "KILO"], "#f2c018", "#1c1503", 110),
      S0(9) + 0.3, 2.7, PLANE_LAND[0], 5, PLANE_LAND[2], 1.0, 4.4, 0.52);
  }
  return out;
};
export { FPS };
