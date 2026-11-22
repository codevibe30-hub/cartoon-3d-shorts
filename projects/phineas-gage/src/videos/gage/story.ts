// Timeline of "Pria Ini Kepalanya Ditembus Besi 1 Meter Dan
// Tetap Hidup🤫" — the Phineas Gage story, DASIMAN-STYLE story
// lane episode 7: paradox hook (an iron rod through the head —
// and he lived) -> the Vermont railroad works -> the tamping ->
// the explosion -> the impossible survival -> Dr Harlow -> the
// recovery -> the man who changed ("no longer Gage") -> the rod
// he carried everywhere -> the Chile stagecoach years -> the
// skull and iron in a museum -> the moral. First-person VO:
// Gage tells his own story. TONE: respectful throughout, NO
// comedy, NO gore — the accident is dust, light and a falling
// man, never blood. Round WHITE-head stickmen in bright simple
// 3D sets; frame 0 is the blast tableau, NO claim card; the
// paradox lives in the title. Line boundaries live in the L
// array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L so one patch retimes
// the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 132, 332, 465, 596, 770, 972, 1131, 1277, 1537, 1701, 1899, 2096, 2244];
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
export const SITE: V3 = [0, 0, -60];          // the railroad cut: rock face + track end (shots 1, 2, 3, 4, 5, 9)
export const ROCK_Z = -71;                    // the rock face plane
export const DRILL: V3 = [1.6, 0, -66.5];     // the drill hole in the rock bench
export const BENCH_Y = 0.9;                   // the rock bench top the crew stands on
export const TRACK_Z = -58;                   // the finished track line running east-west
export const INN: V3 = [80, 0, -30];          // the inn yard + the ox cart (shot 6)
export const ROOM: V3 = [-80, 0, 30];         // the sickroom interior (shot 7)
export const HOME: V3 = [80, 0, 45];          // a Vermont house yard (shot 8)
export const ROAD: V3 = [-80, 0, -45];        // a village dirt road (shot 10)
export const CHILE: V3 = [0, 0, 75];          // dry hills + the stagecoach road (shot 11)
export const MUSEUM: V3 = [85, 0, 115];       // the museum hall interior (shot 12)
export const KNOLL: V3 = [32, 0, -38];        // a grassy knoll above the cut (shot 13)

// the tamping iron in flight (shots 1 + 4): launched from the
// drill hole, it arcs up and falls far behind the crew; world.ts
// flies the rod mesh with this same function (u = shot-local 0..1)
export const rodFlight = (u: number): V3 => {
  const x = DRILL[0] + u * 7.5;                       // drifts east as it falls
  const y = BENCH_Y + Math.sin(Math.min(1, u * 1.15) * Math.PI) * 7.2 * (1 - u * 0.25) + u * u * -0.9;
  const z = DRILL[2] + u * 9.0;                       // lands toward the camera side
  return [x, Math.max(0.12, y), z];
};
export const ROD_LAND: V3 = [9.1, 0.1, -57.5];        // where the iron ends up stuck in the dirt (shot 5)

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the blast tableau — iron in the air, dust, the crew frozen
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // VERMONT 1848: the works, the half-built line, Gage walks it
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // THE TAMPING: Gage packs powder with the long iron
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // THE EXPLOSION: close on the hole — spark, dust, the iron launches
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // THE PATH: the iron lands far away; Gage sits up, alive
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // THE OX CART: Gage sits upright, the doctor runs in
  { id: 7, a: L[6], b: L[7], light: "golden", tau: (t) => t }, // THE SICKROOM: Harlow at the bedside, a plain coffin in the corner
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },    // THE RECOVERY: Gage walks again, one eye bandaged
  { id: 9, a: L[8], b: L[9], light: "storm", tau: (t) => t },  // NO LONGER GAGE: the argument at the works, he walks away
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },  // THE COMPANION: Gage walks the village road, iron on his shoulder
  { id: 11, a: L[10], b: L[11], light: "day", tau: (t) => t }, // CHILE: the stagecoach, dry hills, a calmer man
  { id: 12, a: L[11], b: L[12], light: "golden", tau: (t) => t },// THE MUSEUM: skull + iron in a glass case, plaque 1848
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// CLOSE: the knoll at golden hour — the moral
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

// shot 1 (HOOK, DRAMATIC COVER): the blast instant — Gage thrown
// back at the rock bench, the iron vertical in the air above him,
// dust bursting, the crew frozen mid-flinch
const S1a = (f: number) => dolly([10.5, 3.8, -49.0], [0.6, 2.6, -65.5], pushK(f, L[0], 0.0006), { fov: 50 });
const S1b = (f: number) => dolly([9.8, 3.6, -50.2], [0.8, 2.6, -65.5], pushK(f, L[0] + 60, 0.0005), { fov: 48 });
// shot 2 (THE WORKS): wide down the half-built line — rails and
// sleepers running to the rock face, Gage walking the line
const S2a = (f: number) => dolly([-14, 3.2, -44], [0, 1.6, -64], pushK(f, L[1], 0.0006), { fov: 46 });
const S2b = (f: number) => dolly([-13, 3.0, -45.2], [0.5, 1.6, -64], pushK(f, L[1] + 50, 0.0006), { fov: 44 });
// shot 3 (THE TAMPING): closer — Gage works the long iron up and
// down in the drill hole, two crew watching with powder keg
const S3a = (f: number) => dolly([5.6, 2.4, -59.5], [1.6, 1.5, -66.5], pushK(f, L[2], 0.0007), { fov: 45 });
const S3b = (f: number) => dolly([5.1, 2.3, -60.4], [1.6, 1.5, -66.5], pushK(f, L[2] + 50, 0.0007), { fov: 43 });
// shot 4 (THE EXPLOSION): tight on the hole — the spark, then
// the launch past camera; Gage falls out of frame bottom
const S4a = (f: number) => dolly([4.4, 2.0, -61.5], [1.6, 1.3, -66.5], pushK(f, L[3], 0.0005), { fov: 46 });
const S4b = (f: number) => dolly([4.0, 1.95, -62.3], [1.8, 1.6, -66.5], pushK(f, L[3] + 50, 0.0005), { fov: 44 });
// shot 5 (THE PATH): the iron stuck in the dirt in the foreground,
// Gage sitting up by the bench behind it, crew running in
const S5a = (f: number) => dolly([11.8, 1.7, -51.5], [4.5, 1.2, -62], pushK(f, L[4], 0.0006), { fov: 46 });
const S5b = (f: number) => dolly([11.2, 1.65, -52.4], [4.2, 1.25, -62], pushK(f, L[4] + 50, 0.0006), { fov: 44 });
// shot 6 (THE OX CART): the inn yard — Gage upright on the cart,
// bandaged head, talking; the young doctor hurries in with his bag
const S6a = (f: number) => dolly([73.5, 2.3, -21.5], [80, 1.7, -30.5], pushK(f, L[5], 0.0006), { fov: 46 });
const S6b = (f: number) => dolly([74.2, 2.2, -22.4], [80.2, 1.7, -30.5], pushK(f, L[5] + 50, 0.0006), { fov: 44 });
// shot 7 (THE SICKROOM): warm dim interior — the bed, Harlow
// seated at its side, the plain coffin waiting in the corner
const S7a = (f: number) => dolly([-73.8, 2.4, 37.2], [-80.2, 1.2, 28.0], pushK(f, L[6], 0.0006), { fov: 47 });
const S7b = (f: number) => dolly([-74.4, 2.3, 36.3], [-80.2, 1.2, 28.0], pushK(f, L[6] + 50, 0.0006), { fov: 45 });
// shot 8 (THE RECOVERY): the house yard in clean morning light —
// Gage walks slowly across it, one eye bandaged, and smiles
const S8a = (f: number) => dolly([73, 2.2, 52], [80, 1.5, 43], pushK(f, L[7], 0.0006), { fov: 46 });
const S8b = (f: number) => dolly([73.8, 2.1, 51], [80.2, 1.5, 43], pushK(f, L[7] + 50, 0.0006), { fov: 44 });
// shot 9 (NO LONGER GAGE): back at the works under a grey sky —
// Gage argues with the owner, turns his back, walks off the bench
const S9a = (f: number) => dolly([-6.5, 2.5, -55], [-0.5, 1.8, -64], pushK(f, L[8], 0.0006), { fov: 46 });
const S9b = (f: number) => dolly([-5.9, 2.4, -56], [0, 1.8, -64], pushK(f, L[8] + 50, 0.0006), { fov: 44 });
// shot 10 (THE COMPANION): the village road — Gage walks toward
// camera with the iron on his shoulder; a neighbour turns to look
const S10a = (f: number) => dolly([-86, 2.2, -36], [-79, 1.6, -45.5], pushK(f, L[9], 0.0006), { fov: 46 });
const S10b = (f: number) => dolly([-85.2, 2.1, -37], [-79.2, 1.6, -45.5], pushK(f, L[9] + 50, 0.0006), { fov: 44 });
// shot 11 (CHILE): the stagecoach on a dry road — Gage up on the
// driver's bench, reins in hand, brown hills behind
const S11a = (f: number) => dolly([-9, 2.8, 84], [0.5, 2.0, 74], pushK(f, L[10], 0.0005), { fov: 47 });
const S11b = (f: number) => dolly([-8.2, 2.7, 83], [0.7, 2.0, 74], pushK(f, L[10] + 55, 0.0005), { fov: 45 });
// shot 12 (THE MUSEUM): the quiet hall — a glass case with a white
// skull and the long iron standing beside it, plaque below
const S12a = (f: number) => dolly([79.5, 2.2, 121], [85, 1.5, 113], pushK(f, L[11], 0.0006), { fov: 45 });
const S12b = (f: number) => dolly([80.2, 2.1, 120.1], [85, 1.5, 113], pushK(f, L[11] + 50, 0.0006), { fov: 43 });
// shot 13 (CLOSE): the knoll at golden hour — Gage stands with
// the iron planted beside him, looking out over the valley
const S13a = (f: number) => dolly([25.5, 2.6, -29], [32, 1.8, -38.5], pushK(f, L[12], 0.0004), { fov: 48 });
const S13b = (f: number) => dolly([26.3, 2.5, -30.2], [32, 1.8, -38.5], pushK(f, L[12] + 60, 0.0004), { fov: 46 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 60, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 50, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 50, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 55, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 50, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 60, dur: 26, s: S13b }],
};

// no impact kicks — even the explosion keeps a steady camera;
// the dust and the falling man carry it
export const kickAt = (_t: number) => 0;
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0.9, focus: () => [1.6, 2.2, -66] },
  { f: L[1], cInf: 0.8, focus: () => [0, 1.8, -62] },
  { f: L[2], cInf: 1.0, focus: () => [1.6, 1.6, -66.5] },
  { f: L[3], cInf: 1.0, focus: () => [1.6, 1.5, -66.5] },
  { f: L[4], cInf: 0.9, focus: () => [9.1, 0.8, -57.5] },
  { f: L[5], cInf: 0.9, focus: () => [80, 1.9, -30.5] },
  { f: L[6], cInf: 1.0, focus: () => [-80.5, 1.4, 28.5] },
  { f: L[7], cInf: 0.9, focus: () => [80, 1.7, 43.5] },
  { f: L[8], cInf: 0.9, focus: () => [0, 2.0, -63] },
  { f: L[9], cInf: 0.9, focus: () => [-79.5, 1.8, -45] },
  { f: L[10], cInf: 0.8, focus: () => [0.5, 2.4, 74] },
  { f: L[11], cInf: 1.0, focus: () => [85, 1.6, 113.5] },
  { f: L[12], cInf: 0.8, focus: () => [32, 1.9, -38] },
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
