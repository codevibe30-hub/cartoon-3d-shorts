// Timeline of the Seiryu Miharashi short (±55 s, Fafnir-ID format, bottom one-line subtitles).
// ONE location: a cliffside platform over the Nishiki River. Shots are PROVISIONALLY timed
// proportional to the script's word counts; re-derive from voice/line_starts.json after the VO
// is assembled, exactly like the reference production. All animated state is a function of film
// time t (seconds).
import type { LightName } from "./lights";

export const FPS = 30;
export const TOTAL = 1659; // 55.3 s (from the assembled VO)
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story events (film seconds) ----------------
export const STOP_T = 1.9;    // line 1: the train has stopped; the hero steps off at ~2.3
export const DEPART_T = 4.5;  // line 1: the hook lands — the train leaves him behind
export const CARGO_A = 17.5;  // line 4: the little works train carrying beams crosses
export const CARGO_B = 23.5;
export const PASS_A = 25.3;   // line 5: a regular train blasts through without stopping
export const PASS_B = 28.3;
export const TWIST_T = 35.64; // line 7: "memang sengaja dibuat tanpa pintu keluar!"
export const ARRIVE2_T = 53.3; // line 10: the next train arrives (same framing as shot 1)
export const BOARD_T = 54.6;  // line 10: the hero is on board; gone from the platform

// ---------------- shots (boundaries from word counts: 22,16,16,15,15,17,13,15,13,13 = 155) ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 162, light: "day", tau: (t) => t }, // HOOK: train arrives, hero steps off, train leaves
  { id: 2, a: 162, b: 345, light: "day", tau: (t) => t }, // WIDE: the platform on the cliff, river far below
  { id: 3, a: 345, b: 497, light: "day", tau: (t) => t }, // hero hunts for an exit at both ends
  { id: 4, a: 497, b: 736, light: "day", tau: (t) => t }, // FACT: info board + the works train with beams
  { id: 5, a: 736, b: 886, light: "day", tau: (t) => t }, // a regular train passes WITHOUT stopping
  { id: 6, a: 886, b: 1069, light: "day", tau: (t) => t }, // stuck: sitting on the bench, waiting
  { id: 7, a: 1069, b: 1205, light: "day", tau: (t) => t }, // TWIST: on purpose — no exit by design
  { id: 8, a: 1205, b: 1378, light: "day", tau: (t) => t }, // the view: river, mountains, sparkle
  { id: 9, a: 1378, b: 1531, light: "day", tau: (t) => t }, // an audience, not passengers: two sitters
  { id: 10, a: 1531, b: TOTAL, light: "day", tau: (t) => t }, // PUNCHLINE: the next train — he boards (loop)
];
export const XFADE: Record<number, number> = { 10: 10 };
export const FLASH_AT = -100;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the train (posed by world.ts) ----------------
/** x of the passenger train's centre for shot `id` at film time t (seconds). 999 = offstage. */
export const trainX = (id: number, t: number): number => {
  if (id === 1) {
    if (t < 0.3) return 999;
    if (t < STOP_T) return 55 * (1 - easeOut((t - 0.3) / (STOP_T - 0.3)));
    if (t < DEPART_T) return 0;
    if (t < 5.4) return -78 * easeIn((t - DEPART_T) / 0.9);
    return 999;
  }
  if (id === 5) {
    if (t < PASS_A || t > PASS_B) return 999;
    return 88 - (176 * (t - PASS_A)) / (PASS_B - PASS_A);
  }
  if (id === 10) {
    if (t < 51.4) return 999;
    if (t < ARRIVE2_T) return 55 * (1 - easeOut((t - 51.4) / (ARRIVE2_T - 51.4)));
    if (t < 54.7) return 0;
    if (t < 55.3) return -78 * easeIn((t - 54.7) / 0.6);
    return 999;
  }
  return 999;
};
/** x of the little works train (shot 4 only). */
export const cargoX = (id: number, t: number): number => {
  if (id !== 4 || t < CARGO_A || t > CARGO_B) return 999;
  return -62 + (124 * (t - CARGO_A)) / (CARGO_B - CARGO_A);
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// shot 1 (hook): from the river side, the train slides in behind the platform edge
const S1a = (f: number) => dolly([11.5, 3.6, 14.5], [0, 1.9, -0.6], pushK(f, 0, 0.002), { fov: 44 });
const S1b = (f: number) => dolly([9.6, 3.2, 12.2], [0, 1.9, -0.6], pushK(f, 95, 0.0018), { fov: 42 });
// shot 2 (wide): far across the river — the whole cliff, platform a thin line
const S2a = (f: number) => dolly([4, 10, 52], [0, 1.5, -1], pushK(f, 162, 0.0009), { fov: 50 });
const S2b = (f: number) => dolly([1, 8.6, 45], [0, 1.5, -1], pushK(f, 245, 0.0009), { fov: 48 });
// shot 3: along the platform, hero pacing end to end
const S3a = (f: number) => dolly([-7.5, 3.1, 11.5], [-1, 1.6, -0.9], pushK(f, 345, 0.0016), { fov: 43 });
const S3b = (f: number) => dolly([-6.2, 2.8, 9.8], [-1, 1.6, -0.9], pushK(f, 425, 0.0016), { fov: 41 });
// shot 4: the info board at the back of the platform, the works train beyond
const S4a = (f: number) => dolly([5.8, 3.3, 12.5], [1.2, 2.1, -1.8], pushK(f, 497, 0.0017), { fov: 43 });
const S4b = (f: number) => dolly([4.9, 3.0, 10.8], [1.2, 2.1, -1.8], pushK(f, 580, 0.0017), { fov: 41 });
// shot 5: track-level energy — the pass-through
const S5a = (f: number) => dolly([9.5, 3.4, 13.5], [0, 2.0, -2.2], pushK(f, 736, 0.0015), { fov: 45 });
const S5b = (f: number) => dolly([8.2, 3.1, 11.6], [0, 2.0, -2.2], pushK(f, 815, 0.0015), { fov: 43 });
// shot 6: the bench, quiet
const S6a = (f: number) => dolly([-5.2, 2.9, 11], [-2.2, 1.6, -1.4], pushK(f, 886, 0.0016), { fov: 42 });
const S6b = (f: number) => dolly([-4.4, 2.7, 9.6], [-2.2, 1.6, -1.4], pushK(f, 975, 0.0016), { fov: 41 });
// shot 7 (twist): a touch closer, the board readable behind him
const S7a = (f: number) => dolly([4.6, 3.1, 11.5], [0.4, 1.9, -1.5], pushK(f, 1069, 0.0018), { fov: 43 });
const S7b = (f: number) => dolly([3.8, 2.9, 9.9], [0.4, 1.9, -1.5], pushK(f, 1145, 0.0018), { fov: 41 });
// shot 8: hero at the railing, the river sweeping behind the camera side
const S8a = (f: number) => dolly([-6.8, 3.8, -8.2], [-3.0, 1.9, 1.5], pushK(f, 1205, 0.0015), { fov: 44 });
const S8b = (f: number) => dolly([-6.0, 3.5, -7.6], [-3.0, 1.9, 1.5], pushK(f, 1290, 0.0015), { fov: 42 });
// shot 9: the bench again, now two sitters like a cinema row
const S9a = (f: number) => dolly([6.8, 3.3, 12.5], [0.6, 1.8, -1.5], pushK(f, 1378, 0.0016), { fov: 43 });
const S9b = (f: number) => dolly([5.8, 3.0, 10.8], [0.6, 1.8, -1.5], pushK(f, 1455, 0.0016), { fov: 41 });
// shot 10 (punchline): shot 1's framing again — the loop bookends match
const S10a = (f: number) => dolly([11.5, 3.6, 14.5], [0, 1.9, -0.6], pushK(f, 1531, 0.002), { fov: 44 });
const S10b = (f: number) => dolly([9.6, 3.2, 12.2], [0, 1.9, -0.6], pushK(f, 1605, 0.0018), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 95, dur: 26, s: S1b }],
  2: [{ f: 162, s: S2a }, { f: 245, dur: 26, s: S2b }],
  3: [{ f: 345, s: S3a }, { f: 425, dur: 26, s: S3b }],
  4: [{ f: 497, s: S4a }, { f: 580, dur: 26, s: S4b }],
  5: [{ f: 736, s: S5a }, { f: 815, dur: 26, s: S5b }],
  6: [{ f: 886, s: S6a }, { f: 975, dur: 26, s: S6b }],
  7: [{ f: 1069, s: S7a }, { f: 1145, dur: 26, s: S7b }],
  8: [{ f: 1205, s: S8a }, { f: 1290, dur: 26, s: S8b }],
  9: [{ f: 1378, s: S9a }, { f: 1455, dur: 26, s: S9b }],
  10: [{ f: 1531, s: S10a }, { f: 1605, dur: 26, s: S10b }],
};

// impact kicks: the first stop, the pass-through blast, the twist, the final stop
const KICKS: [number, number][] = [[STOP_T, 0.9], [26.8, 1.0], [TWIST_T, 0.9], [ARRIVE2_T, 0.9]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 3 },
  { f: 162, cInf: 0 },
  { f: 1531, cInf: 3, focus: () => [0, 1.6, -1.0] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
