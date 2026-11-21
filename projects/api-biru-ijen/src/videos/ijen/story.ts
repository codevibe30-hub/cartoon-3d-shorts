// Timeline of the Api Biru Kawah Ijen short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE crater world: a terraced volcanic bowl — turquoise
// acid lake on the west floor, the sulfur vent + mining zone on the east shore,
// a stepped trail spiralling up the inner wall to the rim viewpoint, and the
// weighing station on the rim plateau. Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story event is
// expressed relative to L so one patch retimes the whole film.
// VISUAL CORE: electric-blue flames burning in a dark, TEXTURED crater —
// never flat black: star dome, moonlit terraced rock, glowing turquoise lake,
// yellow sulfur, drifting smoke. All shots are "night" (the blue fire is only
// visible in darkness).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 164, 305, 494, 627, 820, 995, 1163, 1331, 1490, 1683];
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
export const JET3_T = S(2, 10);     // shot 3: a gas jet flares from the pipes — kick
export const FLARE10_T = S(9, 40);  // shot 10: the flames flare up on the punchline

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "night", tau: (t) => t },  // HOOK: rim wide — blue fire below
  { id: 2, a: L[1], b: L[2], light: "night", tau: (t) => t },  // BUKAN LAVA: flames close-up
  { id: 3, a: L[2], b: L[3], light: "night", tau: (t) => t },  // GAS 600: the vent pipes, low angle
  { id: 4, a: L[3], b: L[4], light: "night", tau: (t) => t },  // CUMA 2: crane panorama of the crater
  { id: 5, a: L[4], b: L[5], light: "night", tau: (t) => t },  // JAM 01.00: hikers climb the trail
  { id: 6, a: L[5], b: L[6], light: "night", tau: (t) => t },  // DANAU TOSKA: the acid lake wide
  { id: 7, a: L[6], b: L[7], light: "night", tau: (t) => t },  // 200 METER: at the lake's edge
  { id: 8, a: L[7], b: L[8], light: "night", tau: (t) => t },  // PENAMBANG: the climb with 90 kg
  { id: 9, a: L[8], b: L[9], light: "night", tau: (t) => t },  // SERIBU: the weighing station
  { id: 10, a: L[9], b: L[10], light: "night", tau: (t) => t }, // PUNCHLINE: shot 1 again, flames flare
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

// Zone anchors (must match world.ts): crater centre (0,0,0); lake centre
// (-11, 0, -5) radii 13x8; vent + pipes (12.5, 0, 5.5); rim plateau y ~14.5
// (r 41..58); hero rim spot (18, 14.6, 41); weighing station (20, 14.5, 34);
// trail: stepped path spiralling up the south-east inner wall — TRAIL(u) is
// shared with world.ts (slabs) and cast.ts (climbers).
export const WALL_PROFILE: [number, number][] = [
  [0, 0], [20, 0], [23, 1.8], [26, 4], [30, 6.5], [35, 9.5], [41, 14.5], [58, 15], [72, 9], [92, 1],
];
export const wallY = (r: number) => lin(WALL_PROFILE, r);
export const TRAIL = (u: number): V3 => {
  // u 0 = crater floor by the vent, 1 = rim viewpoint plateau
  const th = 1.14 - 0.96 * u, r = 13 + 30 * u;
  const y = r <= 20 ? 0.3 : Math.min(wallY(r) + 0.3, 14.9);
  return [Math.sin(th) * r, y, Math.cos(th) * r];
};

// shot 1 (HOOK, WIDE from the rim): the bowl, the lake, the blue fire
const S1a = (f: number) => dolly([20, 36, 64], [4, 0, 4], pushK(f, L[0], 0.0020), { fov: 54 });
const S1b = (f: number) => dolly([19.2, 35.2, 62.2], [4, 0, 4], pushK(f, L[0] + 80, 0.0016), { fov: 52 });
// shot 2 (BUKAN LAVA, MEDIUM CLOSE): flame tongues at the vent cracks
const S2a = (f: number) => dolly([7.6, 2.2, 12.6], [12, 0.9, 4.2], pushK(f, L[1], 0.0016), { fov: 42 });
const S2b = (f: number) => dolly([7.3, 2.1, 11.8], [12, 0.9, 4.2], pushK(f, L[1] + 60, 0.0014), { fov: 40 });
// shot 3 (GAS 600, LOW angle): the ceramic pipes jetting blue fire
const S3a = (f: number) => dolly([16.8, 0.8, 10.6], [12.2, 1.6, 5], pushK(f, L[2], 0.0012), { fov: 44 });
const S3b = (f: number) => dolly([16.2, 0.9, 10.0], [12.2, 1.6, 5], pushK(f, L[2] + 65, 0.0011), { fov: 42 });
// shot 4 (CUMA 2, CRANE panorama): the whole crater under the stars
const S4a = (f: number) => dolly([-26, 24, 34], [0, 0, 0], pushK(f, L[3], 0.0006), { fov: 50 });
const S4b = (f: number) => dolly([-24.5, 23.2, 32], [0, 0, 0], pushK(f, L[3] + 55, 0.0006), { fov: 48 });
// shot 5 (JAM 01.00, TRACKING on the trail): headlamps climbing the steps
const S5a = (f: number) => dolly([2, 3, 10], [16.5, 9.5, 26.5], pushK(f, L[4], 0.0009), { fov: 44 });
const S5b = (f: number) => dolly([1.2, 2.8, 9.2], [16.5, 9.5, 26.5], pushK(f, L[4] + 60, 0.0008), { fov: 42 });
// shot 6 (DANAU TOSKA, WIDE dolly): across the steaming turquoise lake
const S6a = (f: number) => dolly([0, 6.5, 14], [-14, 0, -7], pushK(f, L[5], 0.0008), { fov: 48 });
const S6b = (f: number) => dolly([-1, 6.2, 12.6], [-14, 0, -7], pushK(f, L[5] + 60, 0.0007), { fov: 46 });
// shot 7 (200 METER, MEDIUM at the shore): steam, bubbles, the hero backs off
const S7a = (f: number) => dolly([0.5, 1.6, 6.5], [-11, 0.2, -4], pushK(f, L[6], 0.0015), { fov: 42 });
const S7b = (f: number) => dolly([0.2, 1.55, 5.9], [-11, 0.2, -4], pushK(f, L[6] + 60, 0.0013), { fov: 40 });
// shot 8 (PENAMBANG, LOW tracking): the miner climbs the steep trail
const S8a = (f: number) => dolly([8, 2.5, 6], [17, 4.5, 19], pushK(f, L[7], 0.0011), { fov: 44 });
const S8b = (f: number) => dolly([7.4, 2.4, 5.4], [17, 4.5, 19], pushK(f, L[7] + 65, 0.0010), { fov: 42 });
// shot 9 (SERIBU, MEDIUM): the weighing station on the rim
const S9a = (f: number) => dolly([10.5, 18.5, 45], [19.5, 15.5, 33.5], pushK(f, L[8], 0.0015), { fov: 42 });
const S9b = (f: number) => dolly([11, 18.3, 43.8], [19.5, 15.5, 33.5], pushK(f, L[8] + 60, 0.0013), { fov: 40 });
// shot 10 (PUNCHLINE): shot 1's framing again — the flames flare
const S10a = (f: number) => dolly([20, 36, 64], [4, 1.6, 4], pushK(f, L[9], 0.0016), { fov: 54 });
const S10b = (f: number) => dolly([19.4, 35.4, 62.4], [4, 1.6, 4], pushK(f, L[9] + 55, 0.0014), { fov: 52 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 60, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 65, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 55, dur: 30, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 60, dur: 28, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 60, dur: 28, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 60, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 65, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 60, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 55, dur: 26, s: S10b }],
};

// impact kicks: the gas jet flare, the punchline flare
const KICKS: [number, number][] = [[JET3_T, 0.7], [FLARE10_T, 0.6]];
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
  { f: 0, cInf: 1.2, focus: () => [12, 1, 5] },
  { f: L[1], cInf: 3, focus: () => [12, 0.9, 4.2] },
  { f: L[2], cInf: 3, focus: () => [12.4, 1.4, 5.2] },
  { f: L[3], cInf: 0.6, focus: () => [0, 0, 0] },
  { f: L[4], cInf: 2.5, focus: () => [16.5, 9.5, 26.5] },
  { f: L[5], cInf: 0.8, focus: () => [-14, 0, -7] },
  { f: L[6], cInf: 3, focus: () => [-5, 0.4, -1] },
  { f: L[7], cInf: 3, focus: () => [17, 4.5, 19] },
  { f: L[8], cInf: 2.5, focus: () => [19.5, 15.2, 33.5] },
  { f: L[9], cInf: 1.2, focus: () => [12, 1, 5] },
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
