// Timeline of "Pria Ini Kesamber Petir 7 Kali Dan Tetap Hidup🤫" —
// the Roy Sullivan story, DASIMAN-STYLE story lane episode 3:
// paradox hook -> SEVEN numbered strikes, escalating -> the bear
// -> people avoiding him -> the irony (he died in 1983, NOT by
// lightning) -> moral. ALL visual design follows DASIMAN in full.
// Round WHITE-head stickmen in bright simple 3D sets; frame 0 is a
// dramatic SCENE still, NO claim card; the paradox lives in the
// title. Every strike is stylized LIGHT only — a white hit, a bolt
// sprite, a dust ring, a camera kick — never graphic, never gore,
// nobody ever reads as dead (no X-eyes on living people).
// Geography: one Shenandoah world — the ridge (RIDGE, hook+close),
// the park trail (TRAIL), the fire lookout tower (TOWER), the
// mountain road (ROAD_Z, the truck), Roy's yard (YARD), the ranger
// station interior (STATION), the fishing pond (POND) and a picnic
// clearing (CLEAR).
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L so
// one patch retimes the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 131, 278, 469, 646, 860, 1022, 1164, 1396, 1552, 1734, 1886, 2107, 2263];
export const TOTAL = L[13];
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
export const RIDGE: V3 = [0, 0, -70];       // the ridge: hook + close
export const HERO_SPOT: V3 = [3.4, 0, -65.2]; // hook/close: hero big at frame right
export const ROY_RIDGE: V3 = [-1.8, 0, -68.5]; // Roy on the ridge path
export const TRAIL: V3 = [0, 0, -8];        // the park trail (intro + 1976)
export const TOWER: V3 = [70, 0, -35];      // fire lookout tower base
export const ROAD_Z = 38;                   // the mountain road, runs along X
export const YARD: V3 = [-70, 0, 32];       // Roy's house + front yard
export const STATION: V3 = [-70, 0, -30];   // ranger station interior
export const POND: V3 = [66, 0, 42];        // the fishing pond
export const DOCK: V3 = [61.8, 0, 39.5];    // the dock edge where Roy fishes
export const CLEAR: V3 = [16, 0, 58];       // the picnic clearing (avoided)

// ---------------- story events: THE SEVEN STRIKES (frames; patched to VO word timings) ----------------
// Each strike = one white flash + bolt sprite + dust ring + camera
// kick, timed to the strike word in its line (voice/words.json).
export const HOOK_F = 35;    // shot 1: a bolt lands behind Roy on the ridge as the hook lands
export const STRIKE1_F = 407; // 1942 tower — "petir menyambar"
export const STRIKE2_F = 562; // 1969 truck — "Petir masuk ke kabin"
export const STRIKE3_F = 745; // 1970 yard — "Bahu kirinya kebakar"
export const STRIKE4_F = 937; // 1972 station — "Rambutnya kebakar"
export const STRIKE5_F = 1078; // 1973 truck — "Terpental dari truk"
export const STRIKE6_F = 1327; // 1976 trail — "Percuma"
export const STRIKE7_F = 1504; // 1977 pond — "Petir menyambar dada"
export const STRIKES = [STRIKE1_F, STRIKE2_F, STRIKE3_F, STRIKE4_F, STRIKE5_F, STRIKE6_F, STRIKE7_F];
export const FLASHES = [HOOK_F, ...STRIKES];

// the truck (shot 4): rolls along the road until the strike, then
// stops dead — world.ts moves the truck group and cast.ts places
// Roy with the SAME function
export const truckX = (u: number) => -16 + Math.min(1, u / 0.52) * 26;

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "storm", tau: (t) => t },   // HOOK: the ridge in a storm — dramatic cover, NO card
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },     // ROY SULLIVAN: the ranger on his trail, record holder
  { id: 3, a: L[2], b: L[3], light: "storm", tau: (t) => t },   // STRIKE 1 (1942): the fire lookout tower — a toenail
  { id: 4, a: L[3], b: L[4], light: "storm", tau: (t) => t },   // STRIKE 2 (1969): the truck on the mountain road — eyebrows
  { id: 5, a: L[4], b: L[5], light: "storm", tau: (t) => t },   // STRIKE 3 (1970): his own front yard — the shoulder
  { id: 6, a: L[5], b: L[6], light: "storm", tau: (t) => t },   // STRIKE 4 (1972): the station — HAIR ON FIRE + the water can
  { id: 7, a: L[6], b: L[7], light: "storm", tau: (t) => t },   // STRIKE 5 (1973): thrown from the truck — hair again
  { id: 8, a: L[7], b: L[8], light: "storm", tau: (t) => t },   // STRIKE 6 (1976): the cloud follows him — running is useless
  { id: 9, a: L[8], b: L[9], light: "storm", tau: (t) => t },   // STRIKE 7 (1977): fishing — chest and stomach
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },   // THE BEAR: straight after the strike — comic peak
  { id: 11, a: L[10], b: L[11], light: "storm", tau: (t) => t },// AVOIDED: nobody stands near Roy in a storm anymore
  { id: 12, a: L[11], b: L[12], light: "golden", tau: (t) => t },// THE IRONY: old Roy at peace — 1983, and it wasn't lightning
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// CLOSE: seven bolts tallied — the hero closes
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10, 12: 10 };

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

// shot 1 (HOOK, DRAMATIC COVER): the ridge under a black storm —
// Roy small on the path, a bolt about to land behind him, the hero
// huge at frame right with the SHOCK face; NO card
const S1a = (f: number) => dolly([6.2, 1.6, -60.4], [-0.6, 1.9, -68.2], pushK(f, L[0], 0.0007), { fov: 48 });
const S1b = (f: number) => dolly([6.0, 1.65, -61.1], [-0.6, 1.95, -68.2], pushK(f, L[0] + 70, 0.0006), { fov: 46 });
// shot 2 (INTRO): Roy walks his park trail in uniform, signpost
// beside him, the valley bright — the record holder, introduced
const S2a = (f: number) => dolly([4.6, 2.0, 5.2], [-0.5, 1.5, -7], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([4.2, 1.95, 4.4], [-0.5, 1.5, -7], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (STRIKE 1, TOWER): low angle on the lookout tower — Roy
// ducks in at its base as the storm breaks over it
const S3a = (f: number) => dolly([60.8, 2.5, -21.5], [68.8, 3.6, -33.5], pushK(f, L[2], 0.0008), { fov: 46 });
const S3b = (f: number) => dolly([61.2, 2.4, -22.3], [68.8, 3.4, -33.5], pushK(f, L[2] + 50, 0.0008), { fov: 44 });
// shot 4 (STRIKE 2, TRUCK): tracking the road — the truck rolls
// through frame, the strike stops it dead
const S4a = (f: number) => dolly([2.0, 2.0, 47.5], [2.0, 1.4, 38.5], pushK(f, L[3], 0.0006), { fov: 47 });
const S4b = (f: number) => dolly([4.2, 1.95, 46.8], [6.5, 1.4, 38.5], pushK(f, L[3] + 55, 0.0006), { fov: 45 });
// shot 5 (STRIKE 3, YARD): Roy's own front yard, his house behind
// him — nowhere is safe, not even home
const S5a = (f: number) => dolly([-63.8, 2.1, 42.5], [-70.5, 1.5, 33], pushK(f, L[4], 0.0009), { fov: 45 });
const S5b = (f: number) => dolly([-64.2, 2.05, 41.8], [-70.5, 1.5, 33], pushK(f, L[4] + 50, 0.0008), { fov: 43 });
// shot 6 (STRIKE 4, STATION): inside the ranger station — windows
// behind Roy go white, his hair catches fire, the can saves him
const S6a = (f: number) => dolly([-65.9, 1.8, -24.9], [-70.7, 1.7, -30.6], pushK(f, L[5], 0.001), { fov: 45 });
const S6b = (f: number) => dolly([-66.2, 1.75, -25.6], [-70.7, 1.7, -30.6], pushK(f, L[5] + 50, 0.001), { fov: 43 });
// shot 7 (STRIKE 5, TRUCK AGAIN): the truck parked up the road —
// Roy on the ground beside it, sitting up, hair smoking
const S7a = (f: number) => dolly([24.5, 1.9, 47.2], [31.5, 1.2, 38.8], pushK(f, L[6], 0.0009), { fov: 45 });
const S7b = (f: number) => dolly([24.9, 1.85, 46.5], [31.5, 1.2, 38.8], pushK(f, L[6] + 50, 0.0008), { fov: 43 });
// shot 8 (STRIKE 6, THE CLOUD FOLLOWS): the trail again — one
// black cloud hangs over Roy alone; he runs; it keeps up easily
const S8a = (f: number) => dolly([4.6, 2.1, 3.0], [-0.6, 1.8, -7], pushK(f, L[7], 0.0007), { fov: 46 });
const S8b = (f: number) => dolly([4.2, 2.0, 2.2], [-0.6, 1.8, -7], pushK(f, L[7] + 50, 0.0007), { fov: 44 });
// shot 9 (STRIKE 7, FISHING): the pond, quiet at last — Roy sits
// on the dock with his rod. The sky has other plans.
const S9a = (f: number) => dolly([57.5, 1.9, 33.5], [62.5, 1.2, 40], pushK(f, L[8], 0.0008), { fov: 46 });
const S9b = (f: number) => dolly([57.9, 1.85, 34.3], [62.5, 1.2, 40], pushK(f, L[8] + 50, 0.0008), { fov: 44 });
// shot 10 (THE BEAR): same pond, sun back out — the bear comes for
// the fish; a freshly-struck man picks up a stick
const S10a = (f: number) => dolly([57.2, 2.0, 33.0], [63.5, 1.3, 40.5], pushK(f, L[9], 0.0008), { fov: 46 });
const S10b = (f: number) => dolly([57.6, 1.95, 33.8], [63.5, 1.3, 40.5], pushK(f, L[9] + 50, 0.0008), { fov: 44 });
// shot 11 (AVOIDED): the clearing — a rumble, a far flash, and
// everyone quietly steps AWAY from Roy. He stands alone.
const S11a = (f: number) => dolly([11.5, 2.1, 49.5], [16.6, 1.5, 57.8], pushK(f, L[10], 0.0008), { fov: 46 });
const S11b = (f: number) => dolly([11.9, 2.0, 50.3], [16.6, 1.5, 57.8], pushK(f, L[10] + 50, 0.0008), { fov: 44 });
// shot 12 (THE IRONY, GOLDEN): evening in his yard — old Roy walks
// home slowly through warm light, at peace at last
const S12a = (f: number) => dolly([-64.2, 2.1, 41.8], [-70.2, 1.5, 33.5], pushK(f, L[11], 0.0009), { fov: 46 });
const S12b = (f: number) => dolly([-64.6, 2.0, 41.0], [-70.2, 1.5, 33.5], pushK(f, L[11] + 50, 0.0009), { fov: 44 });
// shot 13 (CLOSE, GOLDEN): the ridge again, warm now — old Roy
// beside the hero; seven little bolts tally up above them
const S13a = (f: number) => dolly([6.4, 2.0, -60.8], [-0.4, 1.7, -67.8], pushK(f, L[12], 0.0008), { fov: 47 });
const S13b = (f: number) => dolly([6.0, 1.9, -61.6], [-0.4, 1.7, -67.8], pushK(f, L[12] + 60, 0.0007), { fov: 45 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 55, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 50, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 50, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 50, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 60, dur: 26, s: S13b }],
};

// impact kicks: one per strike (hard), the hook bolt, the bear
// lunge (comic), the certificate-of-life moment at the close (soft)
const KICKS: [number, number][] = [
  [HOOK_F / FPS, 0.3],
  ...STRIKES.map((s): [number, number] => [s / FPS, 0.34]),
  [L[9] / FPS + 1.2, 0.14], [L[12] / FPS + 0.4, 0.12],
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
  { f: 0, cInf: 0.9, focus: () => [-1, 1.9, -68] },
  { f: L[1], cInf: 0.7, focus: () => [0, 1.6, -6] },
  { f: L[2], cInf: 0.8, focus: () => [67.5, 2.2, -32] },
  { f: L[3], cInf: 1.0, focus: () => [4, 1.4, 38.5] },
  { f: L[4], cInf: 1.0, focus: () => [-70.3, 1.5, 33.5] },
  { f: L[5], cInf: 1.3, focus: () => [-70.6, 1.7, -30.4] },
  { f: L[6], cInf: 1.1, focus: () => [31, 1.2, 39] },
  { f: L[7], cInf: 0.9, focus: () => [0, 1.7, -7] },
  { f: L[8], cInf: 1.0, focus: () => [62.3, 1.3, 39.8] },
  { f: L[9], cInf: 1.0, focus: () => [63.5, 1.4, 40.5] },
  { f: L[10], cInf: 0.9, focus: () => [16, 1.6, 57.5] },
  { f: L[11], cInf: 0.8, focus: () => [-70, 1.6, 34] },
  { f: L[12], cInf: 0.9, focus: () => [-0.5, 1.8, -67.5] },
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
