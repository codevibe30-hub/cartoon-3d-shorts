// Timeline of the Danau Toba short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE lake world: a giant caldera lake (water disc
// r=340), Pulau Samosir in the middle (a mesa island built from the shared
// islandH() height field), a ring of caldera-rim mountains, a Batak village
// on Samosir's south shore, and — for the flashback shots 3–5 — an eruption
// group that replaces the island (ash plain + plume where the lake will be).
// Line boundaries live in the L array (start frame of each script line +
// total), derived from voice/line_starts.json; every shot, camera key, DOF
// key and story event is expressed relative to L so one patch retimes the
// whole film.
// VISUAL CORE: bright cool daylight over a vast blue lake and a green
// island — the strangest sight (an island inside a lake inside an island)
// is frame 0. Eruption flashback = storm-grey ash world, never flat.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 178, 416, 578, 740, 902, 1074, 1235, 1375, 1579, 1804];
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
// Lake centre (0,0,0), water at y=0. Samosir centre ISL_C, an elliptical
// mesa: islandH() is the single source of truth for the island's surface —
// world.ts displaces its geometry with it, cast.ts grounds people with it.
export const ISL_C: V3 = [0, 0, -30];
export const islandH = (x: number, z: number) => {
  const dx = (x - ISL_C[0]) / 88, dz = (z - ISL_C[2]) / 58;
  const d = Math.hypot(dx, dz);
  let h = 12 * smooth((1.12 - d) / 0.5);
  h += 11.5 * Math.exp(-(((x + 26) / 24) ** 2 + ((z + 52) / 18) ** 2)); // west hill
  h += 7.5 * Math.exp(-(((x - 36) / 20) ** 2 + ((z + 14) / 16) ** 2)); // east hill
  const tv = Math.exp(-(((x - 14) / 17) ** 2 + ((z - 8) / 13) ** 2)); // village terrace
  h = h * (1 - tv) + 10.4 * tv;
  const sd = Math.exp(-(((x + 24) / 11) ** 2 + ((z + 46) / 9) ** 2)); // Sidihoni dip
  h -= 2.1 * sd;
  return h - 2;
};
export const SIDIHONI: V3 = [-24, 0, -46];
export const SIDIHONI_Y = islandH(SIDIHONI[0], SIDIHONI[2]) + 0.55; // little lake surface
export const VILLAGE: V3 = [14, 0, 8];
export const VILLAGE_Y = islandH(VILLAGE[0], VILLAGE[2]);
export const BOAT: V3 = [44, 0, 56];        // hero's boat, open water SE of Samosir (shots 2, 6, 10)
export const ERU: V3 = [0, 0, -30];         // eruption vent = where Samosir will rise

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number, off: number) => (L[i] + off) / FPS;
export const BOOM3_T = S(2, 8);      // shot 3: the supervolcano blows — kick
export const BOOM4_T = S(3, 10);     // shot 4: second, bigger pulse
export const SPLASH6_T = S(5, 58);   // shot 6: the plumb weight hits 505 m
export const REVEAL9_T = S(8, 12);   // shot 9: Sidihoni reveal — small kick

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },   // HOOK: aerial — island inside the lake
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },   // SAMOSIR: closer oblique aerial
  { id: 3, a: L[2], b: L[3], light: "storm", tau: (t) => t }, // 74.000: the eruption, wide + low
  { id: 4, a: L[3], b: L[4], light: "storm", tau: (t) => t }, // VEI 8: closer, ash column fills the sky
  { id: 5, a: L[4], b: L[5], light: "storm", tau: (t) => t }, // ASH: grey aftermath, ash falling like snow
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },   // 505 METER: hero's boat + plumb line (RE-HOOK)
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },   // VILLAGE: Samosir is lived on
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },   // RUMAH BOLON: the boat-roofed houses
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },   // SIDIHONI: a lake on the island in the lake
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t }, // PUNCHLINE: shot 1 again, a touch closer
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

// shot 1 (HOOK, HIGH AERIAL): the whole geometry joke in one frame —
// green island, blue lake ring, caldera rim behind
const S1a = (f: number) => dolly([98, 96, 152], [0, 2, -28], pushK(f, L[0], 0.0016), { fov: 52 });
const S1b = (f: number) => dolly([94, 92, 146], [0, 2, -28], pushK(f, L[0] + 70, 0.0013), { fov: 50 });
// shot 2 (SAMOSIR, OBLIQUE aerial): closer on the island, village shore below
const S2a = (f: number) => dolly([64, 40, 92], [-2, 7, -26], pushK(f, L[1], 0.0015), { fov: 48 });
const S2b = (f: number) => dolly([61, 38, 88], [-2, 7, -26], pushK(f, L[1] + 60, 0.0012), { fov: 46 });
// shot 3 (ERUPTION WIDE, LOW): across the ash plain to the column
const S3a = (f: number) => dolly([88, 6, 98], [0, 30, -30], pushK(f, L[2], 0.0009), { fov: 50 });
const S3b = (f: number) => dolly([85, 6.5, 94], [0, 30, -30], pushK(f, L[2] + 60, 0.0008), { fov: 48 });
// shot 4 (VEI 8, CLOSER): the column towers, ash rains
const S4a = (f: number) => dolly([40, 9, 34], [0, 36, -30], pushK(f, L[3], 0.0011), { fov: 48 });
const S4b = (f: number) => dolly([38, 9.5, 31], [0, 36, -30], pushK(f, L[3] + 55, 0.001), { fov: 46 });
// shot 5 (ASH AFTERMATH, WIDE): grey world, the plume thins, ash like snow
const S5a = (f: number) => dolly([-74, 25, 74], [0, 16, -30], pushK(f, L[4], 0.0007), { fov: 50 });
const S5b = (f: number) => dolly([-71, 24, 71], [0, 16, -30], pushK(f, L[4] + 55, 0.0006), { fov: 48 });
// shot 6 (505 METER, BOAT medium): hero drops the plumb line. Camera rides
// HIGH so we see INTO the boat (deck + benches + hero) — a low side camera
// made the hull read as a solid barge slab (stills-val2).
const S6a = (f: number) => dolly([55.5, 5.6, 69.5], [43.6, 1.0, 55.4], pushK(f, L[5], 0.0014), { fov: 44 });
const S6b = (f: number) => dolly([54.6, 5.5, 68.5], [43.6, 1.0, 55.4], pushK(f, L[5] + 60, 0.0012), { fov: 42 });
// shot 7 (VILLAGE, shore medium): houses, dock, people — the island is lived on
const S7a = (f: number) => dolly([27, 13.4, 31], [13.4, 10.1, 8.5], pushK(f, L[6], 0.0012), { fov: 46 });
const S7b = (f: number) => dolly([26, 13.2, 29.6], [13.4, 10.1, 8.5], pushK(f, L[6] + 60, 0.0011), { fov: 44 });
// shot 8 (RUMAH BOLON, CLOSE): the great saddleback roof fills the frame
const S8a = (f: number) => dolly([21.5, 12.2, 17.5], [11.8, 11.2, 3.4], pushK(f, L[7], 0.0013), { fov: 44 });
const S8b = (f: number) => dolly([20.8, 12.1, 16.6], [11.8, 11.2, 3.4], pushK(f, L[7] + 55, 0.0011), { fov: 42 });
// shot 9 (SIDIHONI, HIGH oblique): a little lake on top of the island
const S9a = (f: number) => dolly([-2, 32, -22], [-24, 18.4, -46], pushK(f, L[8], 0.0013), { fov: 48 });
const S9b = (f: number) => dolly([-3.5, 31, -23.5], [-24, 18.4, -46], pushK(f, L[8] + 55, 0.0011), { fov: 46 });
// shot 10 (PUNCHLINE): shot 1's framing again, a touch closer (loop)
const S10a = (f: number) => dolly([88, 84, 134], [0, 2, -28], pushK(f, L[9], 0.0015), { fov: 52 });
const S10b = (f: number) => dolly([85, 81, 129], [0, 2, -28], pushK(f, L[9] + 55, 0.0012), { fov: 50 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 60, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 60, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 55, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 30, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 60, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 60, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 55, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 55, dur: 26, s: S10b }],
};

// impact kicks: the two eruption booms + the plumb splash
const KICKS: [number, number][] = [[BOOM3_T, 0.8], [BOOM4_T, 0.9], [SPLASH6_T, 0.35], [REVEAL9_T, 0.3]];
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
  { f: 0, cInf: 0.7, focus: () => [0, 6, -30] },
  { f: L[1], cInf: 0.8, focus: () => [0, 8, -30] },
  { f: L[2], cInf: 0.7, focus: () => [0, 24, -30] },
  { f: L[3], cInf: 0.9, focus: () => [0, 26, -30] },
  { f: L[4], cInf: 0.7, focus: () => [0, 14, -30] },
  { f: L[5], cInf: 3, focus: () => [44, 1.2, 56] },
  { f: L[6], cInf: 2.6, focus: () => [14, 10.4, 8] },
  { f: L[7], cInf: 3, focus: () => [11, 11, 3] },
  { f: L[8], cInf: 1.1, focus: () => [-24, 18.6, -46] },
  { f: L[9], cInf: 0.7, focus: () => [0, 6, -30] },
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
