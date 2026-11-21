// Timeline of the Nyepi Bali short (±55 s, Fafnir-ID format, bottom two-word
// subtitles). ONE street world along z (road x -3.2..3.2, shops/houses both
// sides, candi bentar split gate at z -26, pura silhouette behind it), plus a
// separate airport set far east (x ~90) for shot 6. Line boundaries live in the
// L array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story event is
// expressed relative to L so one patch retimes the whole film.
// VISUAL CORE: the contrast — a loud, colourful ogoh-ogoh parade at dusk
// (shots 2-3) vs the total silence of Nyepi (day shots 1/5/6/7 EMPTY, night
// shots 8/9/10 starlit and readable, never flat black).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 21 Nov 2026, total 59.38 s;
// raw assembly 61.16 s brought into spec with a 1.03x atempo on the voice).
export const L: number[] = [2, 214, 361, 534, 746, 881, 1064, 1230, 1387, 1561, 1781];
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
export const REVEAL3_T = S(2, 12);    // shot 3: the ogoh-ogoh fills the frame — kick
export const LAMPS4_T = S(3, 62);     // shot 4: the porch lamps go OUT (amati geni)
export const REVEAL6_T = S(5, 10);    // shot 6: the empty airport reveal — kick
export const STAR10_T = S(9, 46);     // shot 10: a shooting star on the punchline

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the famous street, EMPTY at noon
  { id: 2, a: L[1], b: L[2], light: "golden", tau: (t) => t }, // SEMALAM: dusk — the street fills up
  { id: 3, a: L[2], b: L[3], light: "golden", tau: (t) => t }, // OGOH-OGOH: the giant rides through
  { id: 4, a: L[3], b: L[4], light: "golden", tau: (t) => t }, // CATUR BRATA: porch lamps go out
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // EMPTY: high crane over the silent road
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // AIRPORT: closed, planes parked
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // PHONE: no signal since 2018
  { id: 8, a: L[7], b: L[8], light: "night", tau: (t) => t },  // PECALANG: night patrol, flashlight
  { id: 9, a: L[8], b: L[9], light: "night", tau: (t) => t },  // JUJUR: the hospital stays lit
  { id: 10, a: L[9], b: L[10], light: "night", tau: (t) => t }, // PUNCHLINE: shot 1 under the Milky Way
];
export const XFADE: Record<number, number> = { 2: 10, 6: 8, 8: 10, 10: 10 };
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

// Zone anchors (must match world.ts): road x -3.2..3.2, z -40..20; pecalang
// post (0, 0, -1); hero sidewalk spot (1.2, 0, 3.4); hero house porch centre
// (5.3, 0, 1.6) (porch floor y 0.35, x 4.2..6.4); ogoh-ogoh platform centre
// (0, 0, -4); hotel door (-5.5, 0, -13); hospital (8.3, 0, -16), front face
// x 5.5; airport set centred x ~97 (terminal z -22, planes z -12).

// shot 1 (HOOK, LOW angle): down the empty road toward the split gate
const S1a = (f: number) => dolly([2.6, 1.5, 10.5], [-0.3, 1.0, -2], pushK(f, L[0], 0.0022), { fov: 44 });
const S1b = (f: number) => dolly([2.35, 1.45, 9.4], [-0.3, 1.0, -2], pushK(f, L[0] + 90, 0.0018), { fov: 42 });
// shot 2 (SEMALAM, WIDE drift at dusk): the same street alive with people
const S2a = (f: number) => dolly([-1.6, 4.6, 14.5], [0.6, 1.0, -7], pushK(f, L[1], 0.0007), { fov: 48 });
const S2b = (f: number) => dolly([-1.2, 4.3, 12.6], [0.6, 1.0, -7], pushK(f, L[1] + 55, 0.0007), { fov: 46 });
// shot 3 (OGOH-OGOH, LOW tracking): the giant on its raft, torches around
const S3a = (f: number) => dolly([3.4, 1.6, 3.5], [0, 2.3, -4.5], pushK(f, L[2], 0.0012), { fov: 45 });
const S3b = (f: number) => dolly([2.9, 1.5, 1.8], [0, 2.3, -4.5], pushK(f, L[2] + 70, 0.0011), { fov: 43 });
// shot 4 (CATUR BRATA, MEDIUM): the hero house porch on the right bank
const S4a = (f: number) => dolly([2.6, 5.2, 10.5], [5.6, 1.2, 1.4], pushK(f, L[3], 0.0016), { fov: 44 });
const S4b = (f: number) => dolly([2.35, 5.0, 9.7], [5.6, 1.2, 1.4], pushK(f, L[3] + 75, 0.0014), { fov: 42 });
// shot 5 (EMPTY, HIGH crane): the silent road from above
const S5a = (f: number) => dolly([7.5, 9.0, 14], [-0.5, 0, -14], pushK(f, L[4], 0.0006), { fov: 50 });
const S5b = (f: number) => dolly([6.8, 8.5, 11.8], [-0.5, 0, -14], pushK(f, L[4] + 55, 0.0006), { fov: 48 });
// shot 6 (AIRPORT, WIDE dolly): terminal + tower + parked planes, nobody moves
const S6a = (f: number) => dolly([86, 3.8, 16], [98.5, 2.8, -19], pushK(f, L[5], 0.0009), { fov: 48 });
const S6b = (f: number) => dolly([88, 3.5, 12], [98.5, 2.8, -19], pushK(f, L[5] + 60, 0.0009), { fov: 46 });
// shot 7 (PHONE, MEDIUM CLOSE): the hero on the sidewalk, phone in hand
const S7a = (f: number) => dolly([2.2, 1.6, 9.6], [3.7, 1.35, 6.2], pushK(f, L[6], 0.0018), { fov: 44 });
const S7b = (f: number) => dolly([2.05, 1.55, 8.8], [3.7, 1.35, 6.2], pushK(f, L[6] + 65, 0.0016), { fov: 42 });
// shot 8 (PECALANG, MEDIUM night): the patrol and his flashlight beam
const S8a = (f: number) => dolly([2.8, 1.7, 3.5], [-1.2, 1.1, -3.5], pushK(f, L[7], 0.0015), { fov: 44 });
const S8b = (f: number) => dolly([2.55, 1.62, 2.6], [-1.2, 1.1, -3.5], pushK(f, L[7] + 70, 0.0013), { fov: 42 });
// shot 9 (JUJUR, calm WIDE night): dark town, ONE lit building — the hospital
const S9a = (_f: number) => ({ pos: [-2.9, 3.4, 8.5] as V3, look: [4, 1.5, -14] as V3, fov: 47 });
const S9b = (_f: number) => ({ pos: [-2.5, 3.2, 6.9] as V3, look: [4, 1.5, -15] as V3, fov: 47 });
// shot 10 (PUNCHLINE): shot 1's framing again — but night, under the Milky Way
const S10a = (f: number) => dolly([2.6, 1.5, 10.5], [-0.3, 1.7, -5], pushK(f, L[9], 0.0016), { fov: 44 });
const S10b = (f: number) => dolly([2.4, 1.45, 9.6], [-0.3, 1.7, -5], pushK(f, L[9] + 55, 0.0014), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 90, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 30, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 70, dur: 28, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 75, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 30, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 60, dur: 28, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 65, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 70, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 12, dur: 110, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 55, dur: 26, s: S10b }],
};

// impact kicks: the statue reveal, the lamps going out, the airport reveal, the star
const KICKS: [number, number][] = [[REVEAL3_T, 0.8], [LAMPS4_T, 0.5], [REVEAL6_T, 0.6], [STAR10_T, 0.5]];
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
  { f: 0, cInf: 2.5, focus: () => [0, 1.1, -1] },
  { f: L[1], cInf: 0.8, focus: () => [0, 1.5, -4] },
  { f: L[2], cInf: 3, focus: () => [0, 2.3, -4] },
  { f: L[3], cInf: 2.5, focus: () => [5.7, 1.2, 1.8] },
  { f: L[4], cInf: 0 },
  { f: L[5], cInf: 1.0, focus: () => [97, 3, -14] },
  { f: L[6], cInf: 3.5, focus: () => [3.9, 1.3, 6.2] },
  { f: L[7], cInf: 3, focus: () => [-1.4, 1.1, -3] },
  { f: L[8], cInf: 0.8, focus: () => [8.3, 2, -16] },
  { f: L[9], cInf: 2.5, focus: () => [0, 1.1, -1] },
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
