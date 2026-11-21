// Timeline of the Kuil Tikus short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE place: the Karni Mata temple at Deshnoke,
// Rajasthan — a white-marble courtyard temple with silver doors,
// colonnades and a protective net canopy, standing in bright desert
// light; a stepped sacred pond (kund) sits west of the courtyard for
// the legend shots. Line boundaries live in the L array (start frame
// of each script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L so one patch retimes the film.
// VISUAL CORE: bright warm daylight, white marble + silver + red
// sandstone, and a CARPET of cute stylised rats — the shock is the
// NUMBER, never horror. Frame 0 is the clickbait cover: the rat
// carpet swirling around the hero's bare feet, his SHOCK face big in
// frame, claim text GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 186, 323, 448, 580, 743, 882, 1095, 1278, 1511, 1735];
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
// The courtyard runs along Z: the temple facade fronts z=-14 with
// its silver doors at DOOR, raised on a platform (top y=0.9) reached
// by steps at z=-11. The marble courtyard floor spans x -13..13,
// z -11..+15. Colonnades line x=+-11.5; the net canopy floats at
// y=8.6. The sacred pond (kund) centres POND_C west of the court.
// Great steel milk bowls sit at BOWL_A / BOWL_B / BOWL_C.
export const DOOR: V3 = [0, 0.9, -12.6];
export const POND_C: V3 = [-19, 0, 2];
export const BOWL_A: V3 = [4.5, 0, -6];
export const BOWL_B: V3 = [-5.5, 0, -2];
export const BOWL_C: V3 = [6.8, 0, 1.5];
export const HERO_SPOT: V3 = [1.4, 0, 4.6]; // hook: mid-courtyard, in the rat carpet
export const LEDGE: V3 = [-2.6, 1.05, -6.2]; // the white rat's marble ledge (shot 9)

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number) => L[i] / FPS;
export const CROSS_T = S(6) + 1.1;  // shot 7: a rat runs over the hero's foot
export const WHITE_T = S(8) + 1.7;  // shot 9: the white rat steps onto the ledge
export const GLINT_T = S(9) + 0.5;  // shot 10: the silver doors flash in the sun

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },     // HOOK: the rat carpet + shock, claim card giant
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },     // THE TEMPLE: marble facade, silver doors, net canopy
  { id: 3, a: L[2], b: L[3], light: "golden", tau: (t) => t },  // THE LEGEND: Karni Mata at the pond, golden hour
  { id: 4, a: L[3], b: L[4], light: "golden", tau: (t) => t },  // THE PLEA: giant Yama rises over the pond
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },     // REBORN: the first rats gather at the sanctum steps
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },     // RE-HOOK: family — priest + hero feed the swarm at the great bowl
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },     // BAREFOOT: a rat runs over the hero's foot = blessing
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },     // PRASAD: milk bowls, sweets, nibbled food eaten gladly
  { id: 9, a: L[8], b: L[9], light: "golden", tau: (t) => t },  // THE WHITE RAT: the rarest sight in the temple
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },   // PUNCHLINE: silver doors + carpet — 25,000 rats, zero plague
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

// shot 1 (HOOK, CLICKBAIT COVER): knee height in the courtyard —
// the rat carpet fills the floor around the hero's bare feet, the
// hero big in frame with the SHOCK face, the marble facade behind
const S1a = (f: number) => dolly([3.0, 1.2, 9.4], [0.2, 1.95, -4], pushK(f, L[0], 0.0007), { fov: 48 });
const S1b = (f: number) => dolly([3.2, 1.3, 8.7], [0.2, 1.9, -4], pushK(f, L[0] + 70, 0.0006), { fov: 46 });
// shot 2 (THE TEMPLE, WIDE): the whole facade — marble, silver
// doors, domes, the net canopy overhead; hero small, waving
const S2a = (f: number) => dolly([10.5, 5.5, 25], [0, 4.6, -13], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([10.0, 5.3, 23.8], [0, 4.6, -13], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (THE LEGEND, GOLDEN): the pond at golden hour — Karni
// Mata stands at the water's edge with the boy, gazing down
const S3a = (f: number) => dolly([-11.2, 1.9, 9.0], [-18.6, 1.1, 2], pushK(f, L[2], 0.001), { fov: 44 });
const S3b = (f: number) => dolly([-11.6, 1.8, 8.2], [-18.6, 1.1, 2], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (THE PLEA, GOLDEN): a touch wider + lower — Yama's great
// glowing bust rises behind the pond; Karni kneels at the edge
const S4a = (f: number) => dolly([-10.2, 1.5, 10.6], [-18.8, 2.4, 0], pushK(f, L[3], 0.0008), { fov: 46 });
const S4b = (f: number) => dolly([-10.6, 1.45, 9.8], [-18.8, 2.4, 0], pushK(f, L[3] + 50, 0.0008), { fov: 44 });
// shot 5 (REBORN): at the sanctum steps — Karni smiles as the
// first rats gather around her feet; devotees beam beside her
const S5a = (f: number) => dolly([4.8, 2.1, -4.2], [0, 1.9, -12.2], pushK(f, L[4], 0.001), { fov: 44 });
const S5b = (f: number) => dolly([4.5, 2.0, -5.0], [0, 1.9, -12.2], pushK(f, L[4] + 55, 0.0009), { fov: 42 });
// shot 6 (RE-HOOK, FAMILY): the great milk bowl — the priest pours,
// the hero watches grinning, the swarm presses in around them
const S6a = (f: number) => dolly([7.6, 1.8, -0.5], [4.2, 0.8, -6], pushK(f, L[5], 0.0011), { fov: 44 });
const S6b = (f: number) => dolly([7.3, 1.7, -1.3], [4.2, 0.8, -6], pushK(f, L[5] + 50, 0.001), { fov: 42 });
// shot 7 (BAREFOOT): floor level — the hero tiptoes through the
// carpet; a rat darts across his bare foot
const S7a = (f: number) => dolly([2.4, 0.6, 3.6], [0.5, 0.55, -1.6], pushK(f, L[6], 0.0007), { fov: 46 });
const S7b = (f: number) => dolly([2.6, 0.65, 3.0], [0.5, 0.55, -1.6], pushK(f, L[6] + 55, 0.0006), { fov: 44 });
// shot 8 (PRASAD): the bowls + sweets table — a devotee sits with
// her prasad plate, rats nibble politely at the great bowls
const S8a = (f: number) => dolly([6.9, 1.7, 9.2], [3.2, 0.7, -1], pushK(f, L[7], 0.0011), { fov: 44 });
const S8b = (f: number) => dolly([6.6, 1.6, 8.4], [3.2, 0.7, -1], pushK(f, L[7] + 50, 0.001), { fov: 42 });
// shot 9 (THE WHITE RAT, GOLDEN): along the colonnade — devotees
// scan the shadows; on the marble ledge, ONE white rat appears
const S9a = (f: number) => dolly([-5.6, 1.35, 6.8], [-2.4, 1.0, -6], pushK(f, L[8], 0.0009), { fov: 44 });
const S9b = (f: number) => dolly([-5.3, 1.3, 6.0], [-2.4, 1.0, -6], pushK(f, L[8] + 50, 0.0009), { fov: 42 });
// shot 10 (PUNCHLINE): the wide again, lower — silver doors, the
// carpet in the foreground, the hero laughing under the claim card
const S10a = (f: number) => dolly([8.6, 3.4, 21.5], [0, 4.2, -13], pushK(f, L[9], 0.0008), { fov: 47 });
const S10b = (f: number) => dolly([8.2, 3.3, 20.4], [0, 4.2, -13], pushK(f, L[9] + 60, 0.0007), { fov: 45 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 55, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 60, dur: 26, s: S10b }],
};

// impact kicks: the foot-crossing startle, the white-rat reveal,
// the doors' sun glint
const KICKS: [number, number][] = [
  [CROSS_T, 0.16], [WHITE_T, 0.18], [GLINT_T, 0.14],
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
  { f: 0, cInf: 0.9, focus: () => [1.4, 2.6, 4.6] },
  { f: L[1], cInf: 0.6, focus: () => [0, 4.5, -13] },
  { f: L[2], cInf: 1.2, focus: () => [-16.5, 1.2, 2] },
  { f: L[3], cInf: 1.2, focus: () => [-18.8, 2.2, 0] },
  { f: L[4], cInf: 1.6, focus: () => [0, 1.6, -12] },
  { f: L[5], cInf: 1.5, focus: () => [4.5, 0.7, -6] },
  { f: L[6], cInf: 1.8, focus: () => [0.6, 0.6, 0.6] },
  { f: L[7], cInf: 1.5, focus: () => [3.4, 0.6, 0] },
  { f: L[8], cInf: 1.8, focus: () => [-2.6, 1.05, -6.2] },
  { f: L[9], cInf: 0.7, focus: () => [0, 4.2, -13] },
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
