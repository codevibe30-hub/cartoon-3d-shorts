// Timeline of the Gimli Glider short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Air Canada Flight 143, 23 July 1983:
// a brand-new Boeing 767 loaded with 22,300 POUNDS of fuel instead
// of the 22,300 KILOGRAMS it needed (Canada was switching to
// metric) — both engines died at 12,500 m, and Captain Robert
// Pearson, a former glider pilot, glided it onto a drag strip at
// Gimli, Manitoba. All 69 people survived.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright cool daylight, a big white-and-red 767, and
// THREE places — the Montreal apron, the silent sky, and the Gimli
// runway on drag-race day. Frame 0 is the clickbait cover: the
// silent gliding giant fills the frame, the hero's SHOCK face big
// in front, claim text GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 120, 314, 426, 637, 797, 990, 1136, 1298, 1516, 1687];
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
// APRON (Montreal) around the origin: tarmac z -34..26, the terminal
// fronts z=-30, the parked 767 sits at PLANE_PARK with its nose to
// +X, fuselage axis along X at z=-6. The fuel truck parks south of
// the wing at TRUCK.
// SKY: the flying 767 holds around SKY_C, high over a prairie patch
// far below at y=0 (the same ground plane, x -260..-40).
// GIMLI at +X: the runway runs along X from 108 to 196 at z=0
// (width 15), drag strip lights + crowd rails along both edges; the
// landed 767 rests at PLANE_LAND, nose to +X, nose gear collapsed.
export const PLANE_PARK: V3 = [0, 0, -6];
export const TRUCK: V3 = [3.5, 0, 3.5];
export const SKY_C: V3 = [-150, 58, -30];
export const GIMLI_C: V3 = [152, 0, 0];
export const PLANE_LAND: V3 = [150, 0, 0];
export const GATE: V3 = [-6, 0, -24];

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number) => L[i] / FPS;
export const DIE_T = S(4) + 1.15;   // shot 5: the second engine flames out
export const TOUCH_T = S(7) + 2.0;  // shot 8: touchdown on the drag strip
export const STOP_T = S(7) + 4.4;   // shot 8: the 767 grinds to a stop, nose down

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },     // HOOK: the silent giant glides, hero shock, claim card giant
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },     // MONTREAL 1983: the brand-new 767 at the gate, crew walks out
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },     // THE MIX-UP: fuel truck, hose, the gauge — pounds for kilos
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },     // THE NUMBERS: 22,300 lb aboard — not even half
  { id: 5, a: L[4], b: L[5], light: "storm", tau: (t) => t },   // ENGINES DIE: grey sky, the jet goes silent and dark
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },     // THE GLIDER PILOT: Pearson calm, 17 minutes of glide
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },     // GIMLI: the old airbase runway from above, drag day
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },     // THE LANDING: cars scatter, touchdown, nose gear folds
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },     // 69 SAFE: slides out, cheers on the strip
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },   // PUNCHLINE: the resting giant, hero laughing, PON VS KILO
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

// shot 1 (HOOK, CLICKBAIT COVER): close off the jet's front quarter
// — the silent 767 fills the frame nose-down in its glide, hero
// shock face placed by cast in the near foreground
const S1a = (f: number) => dolly([-128, 63, -2], [-146, 57, -28], pushK(f, L[0], 0.0007), { fov: 47 });
const S1b = (f: number) => dolly([-129, 62.4, -3.5], [-146, 57, -28], pushK(f, L[0] + 70, 0.0006), { fov: 45 });
// shot 2 (MONTREAL, WIDE): the whole parked jet + terminal behind,
// the crew small at the stairs
const S2a = (f: number) => dolly([26, 7.5, 22], [-2, 3.4, -10], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([25, 7.2, 20.8], [-2, 3.4, -10], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (THE MIX-UP): at the wing — fuel truck, hose up to the
// wing tank, the fueler scratching his head at the gauge
const S3a = (f: number) => dolly([10.5, 2.2, 9.5], [2.6, 1.6, -1], pushK(f, L[2], 0.001), { fov: 44 });
const S3b = (f: number) => dolly([10.1, 2.1, 8.7], [2.6, 1.6, -1], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (THE NUMBERS): low along the fuselage — the jet looms,
// the fueler pats the tank, smug; he has NO idea
const S4a = (f: number) => dolly([-13, 1.6, 6.5], [2, 2.6, -6], pushK(f, L[3], 0.0009), { fov: 45 });
const S4b = (f: number) => dolly([-12.6, 1.55, 5.8], [2, 2.6, -6], pushK(f, L[3] + 50, 0.0008), { fov: 43 });
// shot 5 (ENGINES DIE, STORM): wider off the nose — grey cloud
// sea, the jet shudders at DIE_T and goes quiet, lights out
const S5a = (f: number) => dolly([-122, 66, 4], [-148, 58, -30], pushK(f, L[4], 0.0007), { fov: 46 });
const S5b = (f: number) => dolly([-123, 65.2, 2.5], [-148, 58, -30], pushK(f, L[4] + 55, 0.0006), { fov: 44 });
// shot 6 (THE GLIDER PILOT): the captain big in the near foreground
// (cockpit framing), the gliding jet + prairie far below behind him
const S6a = (f: number) => dolly([-131, 62, -6], [-147, 57.5, -29], pushK(f, L[5], 0.0008), { fov: 45 });
const S6b = (f: number) => dolly([-131.8, 61.5, -7.5], [-147, 57.5, -29], pushK(f, L[5] + 50, 0.0007), { fov: 43 });
// shot 7 (GIMLI FROM ABOVE): high over the strip — runway, drag
// cars at the line, crowd rails; the jet a speck descending in haze
const S7a = (f: number) => dolly([118, 26, 34], [152, 0, 0], pushK(f, L[6], 0.0009), { fov: 44 });
const S7b = (f: number) => dolly([119, 25, 32.5], [152, 0, 0], pushK(f, L[6] + 50, 0.0008), { fov: 42 });
// shot 8 (THE LANDING): strip level at the crowd rail — cars bolt
// sideways, the jet slams in over the camera and grinds past
const S8a = (f: number) => dolly([128, 2.0, 13.5], [158, 2.2, 0], pushK(f, L[7], 0.0006), { fov: 47 });
const S8b = (f: number) => dolly([128.6, 2.1, 12.8], [156, 2.0, 0], pushK(f, L[7] + 55, 0.0005), { fov: 45 });
// shot 9 (69 SAFE): along the resting jet — slides open, passengers
// spilling out cheering, the crew at the door
const S9a = (f: number) => dolly([132, 2.6, 12.5], [149, 2.2, 0], pushK(f, L[8], 0.001), { fov: 44 });
const S9b = (f: number) => dolly([132.6, 2.5, 11.7], [149, 2.2, 0], pushK(f, L[8] + 50, 0.0009), { fov: 42 });
// shot 10 (PUNCHLINE): the wide — the nose-down giant at rest on
// the strip, hero laughing in front, prairie sunset gold
const S10a = (f: number) => dolly([124, 4.6, 24], [150, 3.2, 0], pushK(f, L[9], 0.0008), { fov: 47 });
const S10b = (f: number) => dolly([124.6, 4.4, 22.8], [150, 3.2, 0], pushK(f, L[9] + 60, 0.0007), { fov: 45 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 60, dur: 26, s: S10b }],
};

// impact kicks: the flameout shudder, the touchdown slam, the
// nose-gear collapse thud
const KICKS: [number, number][] = [
  [DIE_T, 0.15], [TOUCH_T, 0.20], [STOP_T, 0.13],
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
  { f: 0, cInf: 0.9, focus: () => [-146, 57, -28] },
  { f: L[1], cInf: 0.6, focus: () => [0, 3.2, -6] },
  { f: L[2], cInf: 1.6, focus: () => [3.2, 1.2, 1.5] },
  { f: L[3], cInf: 1.2, focus: () => [0, 2.6, -6] },
  { f: L[4], cInf: 0.9, focus: () => [-148, 58, -30] },
  { f: L[5], cInf: 1.4, focus: () => [-147, 57.5, -29] },
  { f: L[6], cInf: 0.6, focus: () => [152, 0, 0] },
  { f: L[7], cInf: 1.0, focus: () => [156, 2, 0] },
  { f: L[8], cInf: 1.3, focus: () => [148, 2, 0] },
  { f: L[9], cInf: 0.7, focus: () => [150, 3.2, 0] },
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
