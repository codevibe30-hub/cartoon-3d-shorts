// Timeline of the Pulau Ular Brasil short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE island world: a green rocky island in a bright
// sea — Ilha da Queimada Grande, home of the golden lancehead. The hero
// never lands: he watches from a boat offshore. Line boundaries live in the
// L array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story event
// is expressed relative to L so one patch retimes the whole film.
// VISUAL CORE: a lush, beautiful, SUNNY island that nobody may touch —
// golden snakes coiled in the trees, a lighthouse on the peak, the navy
// keeping everyone away. Daytime bright-cool grade, anti-banding textures.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 207, 401, 560, 735, 896, 1075, 1236, 1432, 1620, 1784];
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

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number, off: number) => (L[i] + off) / FPS;
export const STRIKE_T = S(3, 78);   // shot 4: the lancehead strikes at the bird — kick
export const TURN_T = S(9, 26);     // shot 10: the boat turns away on the punchline

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the boat approaches the island
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // 33 KM: the forbidden shore + patrol
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // GOLDEN LANCEHEAD: the snake close-up
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // 5x: the strike at the bird
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // MITOS: aerial — 1 snake per m²?
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // FAKTA: the forest, a few thousand total
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // 11.000 TAHUN: island + mainland wide
  { id: 8, a: L[7], b: L[8], light: "golden", tau: (t) => t }, // LEGENDA: the lighthouse at dusk
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },    // HAMPIR PUNAH: the researcher
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },  // PUNCHLINE: shot 1 again, boat turns away
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10 };
export const FLASH_AT = L[10] + 100; // no white flash in this film

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// Legacy exports kept so shared helpers typecheck; this film has none of these.
export const trainX = (_id: number, _t: number): number => 999;
export const doorOpen = (_id: number, _t: number): number => 0;
export const cargoX = (_id: number, _t: number): number => 999;

// ---------------- island geography (shared with world.ts + cast.ts) ----------------
// Terrain profile: [radius from island centre, height]. Peak plateau r<7
// (lighthouse), forested slopes, rocky shore at r≈48-50, seabed beyond.
export const TERRAIN_PROFILE: [number, number][] = [
  [0, 25], [7, 24.6], [14, 21], [24, 15.5], [34, 10], [44, 5], [50, 1.8], [56, -1.5], [80, -7],
];
export const terrainY = (r: number) => lin(TERRAIN_PROFILE, r);
// The forest clearing set (shots 3/4/6/9): SE slope facing the sea lanes.
export const CLEARING: V3 = [21, 0, 21]; // y filled by terrainY(hypot) ≈ 12.6
export const CLEAR_Y = terrainY(Math.hypot(CLEARING[0], CLEARING[2]));
// The hero tree in the clearing: trunk base + the snake branch point.
// The branch runs along world X at height terrainY(30.5)+2.3 ≈ 14.2, z≈19.8
// (must match world.ts hero-tree build exactly).
export const TREE_POS: V3 = [23.5, terrainY(Math.hypot(23.5, 19.5)), 19.5];
export const BRANCH_PT: V3 = [23.8, TREE_POS[1] + 2.3, 19.8]; // snake A draped here
export const BIRD_PT: V3 = [25.9, TREE_POS[1] + 2.62, 19.8];  // the bird's perch (shot 4)
export const ROCK_PT: V3 = [19.2, CLEAR_Y + 0.55, 23.8];  // snake B's rock (shots 6/9)
export const BOAT_POS: V3 = [4, 0, 100];                  // the hero's boat, offshore
export const SIGN_POS: V3 = [13, 0, 44.5];                 // the warning sign on the shore

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

// shot 1 (HOOK, WIDE from behind the boat): island ahead, hero in frame
const S1a = (f: number) => dolly([5.2, 4.6, 117], [1.5, 10.5, 15], pushK(f, L[0], 0.0016), { fov: 50 });
const S1b = (f: number) => dolly([4.8, 4.4, 115.4], [1.5, 10.5, 15], pushK(f, L[0] + 80, 0.0013), { fov: 48 });
// shot 2 (33 KM, the shore): the sign, the beach, the patrol crossing
const S2a = (f: number) => dolly([27, 4, 84], [10, 5, 44], pushK(f, L[1], 0.0012), { fov: 46 });
const S2b = (f: number) => dolly([26.2, 3.8, 82], [10, 5, 44], pushK(f, L[1] + 60, 0.0011), { fov: 44 });
// shot 3 (GOLDEN LANCEHEAD, CLOSE): the hero tree branch in the clearing
const S3a = (f: number) => dolly([16.5, BRANCH_PT[1] + 1.7, 28.5], [23.6, BRANCH_PT[1] + 0.1, 19.9], pushK(f, L[2], 0.0016), { fov: 42 });
const S3b = (f: number) => dolly([16.2, BRANCH_PT[1] + 1.6, 27.7], [23.6, BRANCH_PT[1] + 0.1, 19.9], pushK(f, L[2] + 60, 0.0014), { fov: 40 });
// shot 4 (STRIKE, MEDIUM): branch + bird perch, a touch wider for the lunge
const S4a = (f: number) => dolly([18.2, BRANCH_PT[1] + 1.8, 27.5], [24.2, BRANCH_PT[1] + 0.3, 19.9], pushK(f, L[3], 0.0012), { fov: 44 });
const S4b = (f: number) => dolly([17.9, BRANCH_PT[1] + 1.7, 26.8], [24.2, BRANCH_PT[1] + 0.3, 19.9], pushK(f, L[3] + 60, 0.0011), { fov: 42 });
// shot 5 (MITOS, AERIAL): high above the island, looking down the slopes
const S5a = (f: number) => dolly([6, 96, 58], [0, 8, 0], pushK(f, L[4], 0.0006), { fov: 50 });
const S5b = (f: number) => dolly([5, 93, 55], [0, 8, 0], pushK(f, L[4] + 55, 0.0006), { fov: 48 });
// shot 6 (FAKTA, FOREST): inside the clearing, snakes here and there
const S6a = (f: number) => dolly([12.5, CLEAR_Y + 1.6, 33.5], [21.5, CLEAR_Y + 0.6, 21.5], pushK(f, L[5], 0.0009), { fov: 46 });
const S6b = (f: number) => dolly([12.1, CLEAR_Y + 1.5, 32.7], [21.5, CLEAR_Y + 0.6, 21.5], pushK(f, L[5] + 60, 0.0008), { fov: 44 });
// shot 7 (ORIGIN, WIDE): island in front, the mainland ridge across the strait
const S7a = (f: number) => dolly([-8, 40, 148], [0, 13, -30], pushK(f, L[6], 0.0006), { fov: 48 });
const S7b = (f: number) => dolly([-7.4, 39.2, 145], [0, 13, -30], pushK(f, L[6] + 55, 0.0006), { fov: 46 });
// shot 8 (LEGENDA, DUSK): the lighthouse + keeper house on the peak
const S8a = (f: number) => dolly([15.5, 30, 18.5], [1.5, 28.3, 1.5], pushK(f, L[7], 0.0012), { fov: 44 });
const S8b = (f: number) => dolly([14.9, 29.7, 17.7], [1.5, 28.3, 1.5], pushK(f, L[7] + 60, 0.0011), { fov: 42 });
// shot 9 (PENELITI, MEDIUM): the researcher keeps his distance in the clearing
const S9a = (f: number) => dolly([14.5, CLEAR_Y + 1.9, 30], [20.8, CLEAR_Y + 0.7, 22.8], pushK(f, L[8], 0.0013), { fov: 44 });
const S9b = (f: number) => dolly([14.1, CLEAR_Y + 1.8, 29.3], [20.8, CLEAR_Y + 0.7, 22.8], pushK(f, L[8] + 60, 0.0012), { fov: 42 });
// shot 10 (PUNCHLINE): shot 1's framing again — the boat turns away
const S10a = (f: number) => dolly([5.2, 4.6, 117], [1.5, 10.5, 15], pushK(f, L[9], 0.0007), { fov: 50 });
const S10b = (f: number) => dolly([4.8, 4.4, 115.4], [1.5, 10.5, 15], pushK(f, L[9] + 55, 0.0006), { fov: 48 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 60, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 60, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 65, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 30, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 60, dur: 28, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 55, dur: 30, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 60, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 60, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 55, dur: 26, s: S10b }],
};

// impact kicks: the strike, the boat turn
const KICKS: [number, number][] = [[STRIKE_T, 0.8], [TURN_T, 0.4]];
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
  { f: 0, cInf: 0.7, focus: () => [0, 18, 0] },
  { f: L[1], cInf: 1.4, focus: () => [12, 4, 45] },
  { f: L[2], cInf: 3.2, focus: () => [23.8, BRANCH_PT[1] + 0.1, 19.8] },
  { f: L[3], cInf: 3.2, focus: () => [24.2, BRANCH_PT[1] + 0.3, 19.9] },
  { f: L[4], cInf: 0.5, focus: () => [0, 8, 0] },
  { f: L[5], cInf: 1.6, focus: () => [21.5, CLEAR_Y + 0.6, 21.5] },
  { f: L[6], cInf: 0.5, focus: () => [0, 13, -30] },
  { f: L[7], cInf: 2.2, focus: () => [2, 29, 2] },
  { f: L[8], cInf: 2.6, focus: () => [20.8, CLEAR_Y + 0.7, 22.8] },
  { f: L[9], cInf: 0.7, focus: () => [0, 18, 0] },
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
