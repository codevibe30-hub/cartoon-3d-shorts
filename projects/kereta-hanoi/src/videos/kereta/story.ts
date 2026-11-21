// Timeline of the Kereta Hanoi short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE alley world: Hanoi Train Street — a single
// active railway track running down a narrow residential alley, colourful
// shophouses hard against the rails on both sides, café tables in the
// few dozen centimetres between rail and wall. A full-size train passes
// in shots 1, 6 and 10; the alley clears for it in shots 4–5 and fills
// back in shot 7. Line boundaries live in the L array (start frame of
// each script line + total), derived from voice/line_starts.json; every
// shot, camera key, DOF key and story event is expressed relative to L
// so one patch retimes the whole film.
// VISUAL CORE: bright cool daylight in a canyon of painted shophouses —
// frame 0 is the strangest sight: the locomotive already looming in the
// alley, bearing down toward the camera over the café tables.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 184, 325, 455, 609, 794, 946, 1092, 1278, 1420, 1606];
export const TOTAL = L[10];
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

// ---------------- shared geography (world.ts + cast.ts MUST match) ----------------
// The alley runs along Z. Track centre x=0, rails at x=±0.75, building
// faces at |x| = WALL_X. The train is TRAIN_HALF wide each side, so the
// gap between a passing train and the walls is under a metre — the whole
// point of the place. Café strip: between the sleeper edge (|x|≈1.05)
// and the walls.
export const WALL_X = 1.95;
export const RAIL_X = 0.75;
export const TRAIN_HALF = 1.15;
export const TRAIN_LEN = 46; // loco 11 + couplings + 3 cars
/** hero's café table, right side foreground (shots 1 + 10) */
export const HERO_TABLE: V3 = [1.62, 0, 20.5];
/** the chess table ON the track (shot 7) */
export const CHESS: V3 = [0, 0, -2];
/** barrier gate across the alley (shot 8) */
export const BARRIER_Z = 27;

// ---------------- the train ----------------
const S = (i: number) => L[i] / FPS;
/** z of the locomotive's leading face at time tt (film seconds), or null
 *  when no train is in the alley. The train always travels toward +z. */
export const trainFront = (id: number, tt: number): number | null => {
  // shot 1 starts MID-PASS (front already at z=21, the loco's flank beside
  // the hero's table): frame 0 is the clickbait cover — the train huge in
  // frame, centimetres from the hero — not an approaching wide shot.
  if (id === 1) return 21 + 13.5 * (tt - S(0));
  if (id === 5) return -105 + 9.5 * (tt - S(4));
  if (id === 6) return -38 + 17 * (tt - S(5));
  if (id === 10) return 14 + 13.5 * (tt - S(9));
  return null;
};
/** true while any part of the train is within the built alley (|z| < 78) */
export const trainInAlley = (id: number, tt: number) => {
  const f = trainFront(id, tt);
  return f !== null && f > -80 && f - TRAIN_LEN < 80;
};

// ---------------- the great clearing (shots 4–7) ----------------
// Mid shot 4 the alley hears the horn and starts moving; by shot 5
// everything is against the walls; the train passes in shot 6; in shot 7
// the furniture flows back onto the track.
export const CLEAR_START = (L[3] + 0.55 * (L[4] - L[3])) / FPS;
export const RELEASE_START = (L[6] + 0.15 * (L[7] - L[6])) / FPS;
export const clearK = (tt: number) => {
  if (tt < CLEAR_START) return 0;
  if (tt < RELEASE_START) return smooth((tt - CLEAR_START) / 2.0);
  return 1 - smooth((tt - RELEASE_START) / 2.5);
};
// ---------------- the 2019 barrier (shot 8) ----------------
export const BARRIER_T = S(7) + 0.7; // the guard starts lowering the arm
export const barrierK = (tt: number) => smooth((tt - BARRIER_T) / 1.4);

// ---------------- story events (film seconds, derived from L) ----------------
export const HORN4_T = CLEAR_START - 0.4;         // a distant horn: the alley stirs
export const PASS1_T = S(0) + (27 - 21) / 13.5;   // shot 1: the loco sweeps past the lens
export const PASS6_T = S(5) + (10.5 + 38) / 17;   // shot 6: the loco sweeps past the lens
export const SWEEP6_T = S(5) + (38 - 2) / 17;     // shot 6: the loco reaches the hero
export const PASS10_T = S(9) + (27 - 14) / 13.5;  // shot 10: past the lens again

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the train in the alley, head-on
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // TRAIN STREET: high oblique over the corridor
  { id: 3, a: L[2], b: L[3], light: "golden", tau: (t) => t }, // 1902: old facades, golden nostalgia
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // ±7 A DAY: café owner + timetable board
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // THE SCRAMBLE: everything to the walls
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // RE-HOOK: the pass, centimetres from the hero
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // LIVING ROOM: tea + chess on the rails
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },    // 2019: the barrier comes down
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },    // CAFÉ ONLY: the owner seats the hero safely
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },  // PUNCHLINE: shot 1 again — coffee, centimetres
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10 };
export const FLASH_AT = L[10] + 100; // no white flash in this film

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
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

// shot 1 (HOOK, TRACK LEVEL): the loco fills the alley, café table at frame right
const S1a = (f: number) => dolly([1.55, 2.05, 27], [0, 1.7, -6], pushK(f, L[0], 0.0012), { fov: 46 });
const S1b = (f: number) => dolly([1.5, 2.0, 26.2], [0, 1.7, -6], pushK(f, L[0] + 70, 0.001), { fov: 44 });
// shot 2 (HIGH OBLIQUE): the whole corridor — rooftops, the ribbon of track
// (camera rides HIGH above the roofline: at y≈12 the lens sat inside the
// rooftops and the corridor vanished — verified on stills, fixed to y≈17)
const S2a = (f: number) => dolly([4.2, 19, 44], [0, 0, -20], pushK(f, L[1], 0.0011), { fov: 52 });
const S2b = (f: number) => dolly([4.0, 18.6, 42.5], [0, 0, -20], pushK(f, L[1] + 55, 0.0009), { fov: 50 });
// shot 3 (1902, GOLDEN): low along the old facades, laundry overhead
// (camera rides the RIGHT strip: from the left strip a first-floor balcony
// slab sits right on the lens and eats the fact card — stills w-3)
const S3a = (f: number) => dolly([1.2, 1.75, 17], [-0.5, 3.4, -22], pushK(f, L[2], 0.0012), { fov: 44 });
const S3b = (f: number) => dolly([1.15, 1.8, 16.2], [-0.5, 3.4, -22], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (±7 A DAY): the owner + his chalkboard, hero at his table
// (camera INSIDE the alley and pulled back: x=2.75 was inside the right
// building row, z=7.5 too close to hold owner + hero in a portrait frame)
const S4a = (f: number) => dolly([1.6, 2.0, 13.5], [-0.5, 1.2, -7], pushK(f, L[3], 0.0012), { fov: 44 });
const S4b = (f: number) => dolly([1.52, 1.95, 12.7], [-0.5, 1.2, -7], pushK(f, L[3] + 55, 0.001), { fov: 42 });
// shot 5 (THE SCRAMBLE): mid-wide, everyone hauling furniture to the walls
// (x=-2.55 was inside the left building row — stills showed a wall filling
// half the frame; camera now rides inside the alley at x=-1.45)
const S5a = (f: number) => dolly([-1.45, 2.3, 15.5], [0.5, 1.1, -5], pushK(f, L[4], 0.001), { fov: 48 });
const S5b = (f: number) => dolly([-1.38, 2.25, 14.7], [0.5, 1.1, -5], pushK(f, L[4] + 55, 0.0009), { fov: 46 });
// shot 6 (RE-HOOK, AT THE WALL): across the hero's shoulder as it sweeps past
// (x=2.5 was inside the right building row; now x=1.5, inside the alley)
const S6a = (f: number) => dolly([1.5, 1.85, 10.5], [-0.9, 1.45, -13], pushK(f, L[5], 0.0009), { fov: 42 });
const S6b = (f: number) => dolly([1.44, 1.82, 9.8], [-0.9, 1.45, -13], pushK(f, L[5] + 55, 0.0008), { fov: 40 });
// shot 7 (LIVING ROOM): tea + chess on the rails, calm again
const S7a = (f: number) => dolly([1.85, 1.55, 9.5], [-0.3, 0.85, -4], pushK(f, L[6], 0.0011), { fov: 44 });
const S7b = (f: number) => dolly([1.78, 1.5, 8.8], [-0.3, 0.85, -4], pushK(f, L[6] + 55, 0.001), { fov: 42 });
// shot 8 (2019 BARRIER): from outside the gate, looking into the closed alley
const S8a = (f: number) => dolly([0.7, 2.3, 36], [0, 1.9, 8], pushK(f, L[7], 0.001), { fov: 46 });
const S8b = (f: number) => dolly([0.66, 2.26, 35.2], [0, 1.9, 8], pushK(f, L[7] + 55, 0.0009), { fov: 44 });
// shot 9 (CAFÉ ONLY): the owner seats the hero behind the yellow line
// (x=-2.45 was inside the left building row; look re-aimed so the owner at
// the left wall stays inside the narrow portrait hfov)
const S9a = (f: number) => dolly([-1.45, 1.8, 3.5], [0.6, 1.15, -9], pushK(f, L[8], 0.0011), { fov: 44 });
const S9b = (f: number) => dolly([-1.38, 1.76, 2.8], [0.6, 1.15, -9], pushK(f, L[8] + 50, 0.001), { fov: 42 });
// shot 10 (PUNCHLINE): shot 1's framing again — the loop closes
const S10a = (f: number) => dolly([1.55, 2.05, 27], [0, 1.7, -6], pushK(f, L[9], 0.0012), { fov: 46 });
const S10b = (f: number) => dolly([1.5, 2.0, 26.2], [0, 1.7, -6], pushK(f, L[9] + 60, 0.001), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 55, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 55, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 60, dur: 26, s: S10b }],
};

// impact kicks: the three passes + the barrier slam + the scramble jolt
const KICKS: [number, number][] = [
  [PASS1_T, 0.4], [CLEAR_START + 0.2, 0.18], [SWEEP6_T, 0.55], [PASS6_T, 0.4],
  [BARRIER_T + 1.4, 0.3], [PASS10_T, 0.4],
];
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
  const len = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * len * a;
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
  { f: 0, cInf: 0.8, focus: () => [0, 1.8, 10] },
  { f: L[1], cInf: 0.7, focus: () => [0, 1, -6] },
  { f: L[2], cInf: 0.8, focus: () => [0, 3, -10] },
  { f: L[3], cInf: 2.6, focus: () => [-1.2, 1.2, -3] },
  { f: L[4], cInf: 1.6, focus: () => [0, 1.2, -4] },
  { f: L[5], cInf: 3.0, focus: () => [-1.8, 1.3, -2] },
  { f: L[6], cInf: 2.6, focus: () => [0, 0.9, -2] },
  { f: L[7], cInf: 1.2, focus: () => [0, 2.2, 24] },
  { f: L[8], cInf: 2.6, focus: () => [1.3, 1.2, -6] },
  { f: L[9], cInf: 0.8, focus: () => [0, 1.8, 10] },
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
