// Timeline of the Dapur India short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE complex: the Golden Temple langar at
// Amritsar — a vast open dining hall (pangat rows of seated diners),
// a working kitchen hall (flour mountain, tawa griddles, giant
// cauldrons), a roti machine, a dish-washing trough line, and beyond
// it the holy pool with the golden temple itself. Line boundaries live
// in the L array (start frame of each script line + total), derived
// from voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L so one patch retimes the film.
// VISUAL CORE: bright warm daylight, a SEA of people eating in rows —
// frame 0 is the clickbait cover: the endless rows + the hero in shock
// holding an empty steel tray, claim text GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 172, 307, 453, 620, 762, 903, 1077, 1231, 1440, 1597];
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
// The complex runs along Z. Dining hall: z +34..+2 (pangat rows on mats
// at ROW_XS, aisles between). Kitchen hall: z +2..-26 (cauldrons west,
// tawa + dough tables east). Roti machine at MACHINE_Z, dish trough at
// TROUGH_Z. The holy pool spans z -56..-88; the temple stands at
// TEMPLE_Z, seen from the pool's near edge.
export const ROW_XS = [-4.6, -1.6, 1.6, 4.6];
export const HERO_SEAT: V3 = [2.45, 0, 24.2];
export const CAULDRONS: V3[] = [[-4.2, 0, -13], [-4.2, 0, -18.5]];
export const MACHINE_Z = -31;
export const TROUGH_Z = -43;
export const TEMPLE_Z = -96;
export const POOL_Z: V3 = [0, 0, -72]; // centre of the sarovar

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number) => L[i] / FPS;
export const MACHINE_T = S(5) + 0.5;  // shot 6: the roti machine bursts to life
export const CLATTER_T = S(7) + 0.6;  // shot 8: a stack of plates clatters down
export const SERVE_T = S(3) + 0.4;    // shot 4: the server ladles dal

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the sea of diners + shock hero
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // GOLDEN TEMPLE over the pool
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // EVERYONE WELCOME: the hall entrance flow
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // PANGAT: rows on the floor, servers walking
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // THE KITCHEN: flour mountain + roti stacks
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // RE-HOOK: the roti machine, 25,000/hour
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // GIANT CAULDRONS stirred by volunteers
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },    // THE DISH CHAIN: 300,000 plates
  { id: 9, a: L[8], b: L[9], light: "night", tau: (t) => t },  // NEVER CLOSES: the temple glowing at night
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },  // PUNCHLINE: shot 1 again — the hero eats
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

// shot 1 (HOOK, THE SEA): high oblique down the hall — endless rows of
// seated diners compress into a sea; the hero stands big at frame right
// with his empty tray, wearing the SHOCK face.
const S1a = (f: number) => dolly([4.9, 4.4, 32.5], [0, 0.5, 2], pushK(f, L[0], 0.0011), { fov: 46 });
const S1b = (f: number) => dolly([4.7, 4.25, 31.6], [0, 0.5, 2], pushK(f, L[0] + 70, 0.0009), { fov: 44 });
// shot 2 (THE TEMPLE): from the pool's near edge, the golden temple
// across the water, pilgrims on the causeway
const S2a = (f: number) => dolly([7.6, 3.4, -47], [0, 6.0, TEMPLE_Z], pushK(f, L[1], 0.001), { fov: 44 });
const S2b = (f: number) => dolly([7.3, 3.25, -46.2], [0, 6.0, TEMPLE_Z], pushK(f, L[1] + 55, 0.0009), { fov: 42 });
// shot 3 (WELCOME): inside the hall mouth — the crowd flows in past a
// waving greeter volunteer; hero among them, grinning
const S3a = (f: number) => dolly([3.6, 2.1, 27.5], [-0.6, 1.25, 10], pushK(f, L[2], 0.0011), { fov: 44 });
const S3b = (f: number) => dolly([3.45, 2.0, 26.7], [-0.6, 1.25, 10], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (PANGAT, LOW ALONG A ROW): seated diners left, the server
// walking the centre aisle with his dal bucket
const S4a = (f: number) => dolly([2.95, 1.55, 21], [-1.6, 0.7, 2], pushK(f, L[3], 0.001), { fov: 44 });
const S4b = (f: number) => dolly([2.85, 1.5, 20.2], [-1.6, 0.7, 2], pushK(f, L[3] + 55, 0.0009), { fov: 42 });
// shot 5 (THE KITCHEN): flour-sack mountain right foreground, roti
// stack tables + rolling volunteers mid, tawa smoke behind
const S5a = (f: number) => dolly([4.6, 2.6, 1.8], [-0.8, 1.0, -13], pushK(f, L[4], 0.0011), { fov: 46 });
const S5b = (f: number) => dolly([4.4, 2.5, 1.0], [-0.8, 1.0, -13], pushK(f, L[4] + 55, 0.0009), { fov: 44 });
// shot 6 (THE MACHINE, RE-HOOK): from the belt's east end looking WEST
// along the conveyor (the machine yard sits BEHIND the kitchen's back
// wall at z=-27.2 — a camera north of that wall sees only brick)
const S6a = (f: number) => dolly([9.6, 2.6, -28.6], [-4.0, 1.1, MACHINE_Z - 0.6], pushK(f, L[5], 0.001), { fov: 44 });
const S6b = (f: number) => dolly([9.4, 2.5, -29.3], [-4.0, 1.1, MACHINE_Z - 0.6], pushK(f, L[5] + 55, 0.0009), { fov: 42 });
// shot 7 (THE CAULDRONS): two giant pots left, volunteers stirring with
// paddles taller than they are; hero right, dwarfed + nervous
const S7a = (f: number) => dolly([3.5, 2.05, -11.5], [-3.8, 1.4, -19], pushK(f, L[6], 0.001), { fov: 44 });
const S7b = (f: number) => dolly([3.35, 1.98, -12.3], [-3.8, 1.4, -19], pushK(f, L[6] + 55, 0.0009), { fov: 42 });
// shot 8 (THE DISH CHAIN): from SOUTH of the trough looking NORTH —
// the volunteer chain stands across the trough facing the lens, the
// machine yard + kitchen wall behind them (looking south = empty sky)
const S8a = (f: number) => dolly([5.2, 2.3, -48.8], [0.2, 0.9, TROUGH_Z + 0.2], pushK(f, L[7], 0.001), { fov: 46 });
const S8b = (f: number) => dolly([5.0, 2.2, -49.4], [0.2, 0.9, TROUGH_Z + 0.2], pushK(f, L[7] + 55, 0.0009), { fov: 44 });
// shot 9 (NEVER CLOSES, NIGHT): shot 2's framing after dark — the
// temple lit gold over black water, the kitchen block still steaming
const S9a = (f: number) => dolly([7.6, 3.4, -47], [0, 6.0, TEMPLE_Z], pushK(f, L[8], 0.001), { fov: 44 });
const S9b = (f: number) => dolly([7.3, 3.25, -46.2], [0, 6.0, TEMPLE_Z], pushK(f, L[8] + 55, 0.0009), { fov: 42 });
// shot 10 (PUNCHLINE): shot 1's framing again — the hero now SEATED in
// the row, plate full, laughing; the sea eats on behind him
const S10a = (f: number) => dolly([4.9, 4.4, 32.5], [0, 0.5, 2], pushK(f, L[9], 0.0011), { fov: 46 });
const S10b = (f: number) => dolly([4.7, 4.25, 31.6], [0, 0.5, 2], pushK(f, L[9] + 60, 0.0009), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 55, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 55, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 55, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 60, dur: 26, s: S10b }],
};

// impact kicks: the machine burst + the plate clatter + the punchline ladle
const KICKS: [number, number][] = [
  [MACHINE_T, 0.3], [CLATTER_T, 0.35], [SERVE_T, 0.15],
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
  { f: 0, cInf: 0.8, focus: () => [2.45, 1.4, 24.2] },
  { f: L[1], cInf: 0.7, focus: () => [0, 5, TEMPLE_Z + 4] },
  { f: L[2], cInf: 1.4, focus: () => [0, 1.3, 14] },
  { f: L[3], cInf: 2.4, focus: () => [-1.6, 0.8, 10] },
  { f: L[4], cInf: 1.8, focus: () => [0, 1.2, -10] },
  { f: L[5], cInf: 2.6, focus: () => [0, 1.1, MACHINE_Z] },
  { f: L[6], cInf: 2.4, focus: () => [-4.2, 1.5, -16] },
  { f: L[7], cInf: 1.8, focus: () => [0, 1.0, TROUGH_Z] },
  { f: L[8], cInf: 0.7, focus: () => [0, 5, TEMPLE_Z + 4] },
  { f: L[9], cInf: 0.8, focus: () => [2.45, 1.2, 24.2] },
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
