// Timeline of the Prajurit Onoda pilot (±70 s, DASIMAN-STYLE story
// lane: paradox hook -> escalation -> twist -> moral; ALL visual
// design, camera work and on-screen text follow DASIMAN — FULL gaya
// dia, per Baginda Raja 2026-11-22 ~06:50 WIB ("Gaya dia lah").
// Ceritanya orisinal; yang dipinjam cuma formula + strukturnya. ONE place: the
// jungles of Lubang Island, Philippines — a guerrilla camp clearing,
// a dirt path in from the south, two graves east of the camp, and a
// Filipino village west beyond the treeline. Line boundaries live in
// the L array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story
// event is expressed relative to L so one patch retimes the film.
// VISUAL CORE (Dasiman lane, per Baginda Raja's "gaya dia lah"):
// bright simple 3D jungle, round WHITE-head stickmen, clean story
// cameras — frame 0 is a dramatic SCENE still, NO claim card; the
// paradox lives in the title.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 178, 344, 516, 695, 840, 1039, 1225, 1378, 1549, 1690, 1860, 2047, 2264];
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
// The camp clearing centres CAMP on a grass-and-dirt floor; the dirt
// path runs south along +Z to the jungle edge. The graves sit east
// at GRAVES. The village lies west at VILLAGE, seen from the HILL
// lookout south-east. The 1974 meetings happen in the more open
// CLEARING south of the camp.
export const CAMP: V3 = [0, 0, 0];
export const GRAVES: V3 = [7.5, 0, -8];
export const VILLAGE: V3 = [-26, 0, 6];
export const HILL: V3 = [10, 0, 16];
export const CLEARING: V3 = [2, 0, 10];
export const HERO_SPOT: V3 = [2.6, 0, 6.4]; // hook: hero crouches in the foliage, frame right

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number) => L[i] / FPS;
export const LEAFLET_T = S(4) + 1.1;  // shot 5: the leaflets flutter down around Onoda
export const FOUND_T = S(8) + 0.35;   // shot 9: Suzuki steps out of the treeline
export const SALUTE_T = S(11) + 1.15; // shot 12: the order is read — Onoda stands down

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },      // HOOK 1974: Onoda still at war, dramatic cover scene, NO claim card
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },   // 1944: the patrol marches into the jungle
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },   // THE ORDER: Taniguchi binds him
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },      // 1945: the world celebrates; he stays
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },      // LEAFLETS: propaganda, he says
  { id: 6, a: L[5], b: L[6], light: "storm", tau: (t) => t },    // 1950/1954: the companions thin out
  { id: 7, a: L[6], b: L[7], light: "storm", tau: (t) => t },    // 1972: the graves — alone at last
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },      // THE COST: the village that lived the war
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },      // 1974: Suzuki finds him
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },    // THE REFUSAL: only my commander
  { id: 11, a: L[10], b: L[11], light: "day", tau: (t) => t },// THE COMMANDER ARRIVES
  { id: 12, a: L[11], b: L[12], light: "day", tau: (t) => t },// STAND DOWN: the order is revoked
  { id: 13, a: L[12], b: L[13], light: "day", tau: (t) => t },// PUNCHLINE: not crazy — never countermanded
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10, 12: 10 };
export const FLASH_AT = L[13] + 100; // no white flash in this film

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

// shot 1 (HOOK, DRAMATIC COVER): low in the clearing — Onoda stands
// alert mid-frame, rifle ready, worn 1944 uniform in 1974; the hero
// big at frame right with the SHOCK face; NO claim card — the paradox lives in the title
const S1a = (f: number) => dolly([4.6, 1.5, 11.6], [0.4, 1.8, 2.5], pushK(f, L[0], 0.0007), { fov: 48 });
const S1b = (f: number) => dolly([4.8, 1.6, 10.9], [0.4, 1.85, 2.5], pushK(f, L[0] + 70, 0.0006), { fov: 46 });
// shot 2 (1944 ARRIVAL, GOLDEN): the patrol in file on the path,
// marching into the jungle gloom, young Onoda at its head
const S2a = (f: number) => dolly([-6.8, 2.2, 25], [0.6, 1.6, 9], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([-6.4, 2.1, 24.2], [0.6, 1.6, 9], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (THE ORDER, GOLDEN): two-shot at the camp — Taniguchi
// delivers the order that will bind Onoda for 29 years
const S3a = (f: number) => dolly([3.4, 1.8, 6.2], [0, 1.7, 0], pushK(f, L[2], 0.001), { fov: 44 });
const S3b = (f: number) => dolly([3.1, 1.75, 5.5], [0, 1.7, 0], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (WAR ENDS): from the hill — the village celebrates far
// below (flags, festival), Onoda hidden in the brush, watching
const S4a = (f: number) => dolly([13.8, 2.6, 19.5], [-10, 1.0, 4], pushK(f, L[3], 0.0008), { fov: 46 });
const S4b = (f: number) => dolly([13.4, 2.5, 18.7], [-10, 1.0, 4], pushK(f, L[3] + 50, 0.0008), { fov: 44 });
// shot 5 (LEAFLETS): a clearing in the trees — white paper flutters
// down through the shafts of light; Onoda catches one, reads, drops it
const S5a = (f: number) => dolly([3.8, 1.7, 8.6], [0, 1.9, 1], pushK(f, L[4], 0.001), { fov: 44 });
const S5b = (f: number) => dolly([3.5, 1.65, 7.9], [0, 1.9, 1], pushK(f, L[4] + 55, 0.0009), { fov: 42 });
// shot 6 (COMPANIONS I, STORM): the camp under grey skies — four men
// at a small fire; one rises and walks away down the path, forever
const S6a = (f: number) => dolly([4.6, 1.9, 7.4], [0, 1.1, -0.5], pushK(f, L[5], 0.0009), { fov: 44 });
const S6b = (f: number) => dolly([4.3, 1.85, 6.7], [0, 1.1, -0.5], pushK(f, L[5] + 50, 0.0009), { fov: 42 });
// shot 7 (COMPANIONS II, STORM): the graves east of camp — two
// mounds, two crosses; Onoda kneels, then stands alone
const S7a = (f: number) => dolly([11.8, 2.1, -0.9], [7.4, 1.0, -7.4], pushK(f, L[6], 0.0009), { fov: 44 });
const S7b = (f: number) => dolly([11.5, 2.05, -1.6], [7.4, 1.0, -7.4], pushK(f, L[6] + 50, 0.0009), { fov: 42 });
// shot 8 (THE COST): inside the village — huts, wary faces, a police
// officer on watch; in the far treeline, a lone silhouette
const S8a = (f: number) => dolly([-16.5, 2.2, 16.5], [-25, 1.3, 2], pushK(f, L[7], 0.0009), { fov: 44 });
const S8b = (f: number) => dolly([-16.9, 2.1, 15.7], [-25, 1.3, 2], pushK(f, L[7] + 50, 0.0009), { fov: 42 });
// shot 9 (SUZUKI, 1974): the jungle edge south — a hiker in bright
// colours steps out of the treeline; a rifle swings toward him
const S9a = (f: number) => dolly([6.6, 1.9, 18.6], [1.7, 1.7, 9.6], pushK(f, L[8], 0.001), { fov: 44 });
const S9b = (f: number) => dolly([6.3, 1.85, 17.9], [1.7, 1.7, 9.6], pushK(f, L[8] + 50, 0.001), { fov: 42 });
// shot 10 (THE REFUSAL): closer two-shot — Suzuki pleads, Onoda
// shakes his head once, turns, and melts back into the green
const S10a = (f: number) => dolly([5.6, 1.9, 16.4], [1.2, 1.7, 8.8], pushK(f, L[9], 0.0011), { fov: 44 });
const S10b = (f: number) => dolly([5.3, 1.85, 15.7], [1.2, 1.7, 8.8], pushK(f, L[9] + 50, 0.001), { fov: 42 });
// shot 11 (THE COMMANDER, GOLDEN): the clearing — an old man in a
// dark suit steps forward with a paper in his hand; Onoda freezes
const S11a = (f: number) => dolly([6.2, 2.0, 17.4], [2.0, 1.7, 9.8], pushK(f, L[10], 0.001), { fov: 44 });
const S11b = (f: number) => dolly([5.9, 1.95, 16.7], [2.0, 1.7, 9.8], pushK(f, L[10] + 50, 0.001), { fov: 42 });
// shot 12 (STAND DOWN, GOLDEN): the order is read aloud — Onoda
// stands rigid, then the 29 years fall off his shoulders
const S12a = (f: number) => dolly([6.0, 1.9, 16.4], [2.0, 1.7, 9.8], pushK(f, L[11], 0.001), { fov: 44 });
const S12b = (f: number) => dolly([5.7, 1.85, 15.7], [2.0, 1.7, 9.8], pushK(f, L[11] + 50, 0.001), { fov: 42 });
// shot 13 (PUNCHLINE, GOLDEN): Onoda walks out of the jungle into
// the light; the hero closes the story beside him, grinning
const S13a = (f: number) => dolly([6.4, 2.2, 17.5], [0.5, 1.8, 7], pushK(f, L[12], 0.0008), { fov: 47 });
const S13b = (f: number) => dolly([6.0, 2.1, 16.6], [0.5, 1.8, 7], pushK(f, L[12] + 60, 0.0007), { fov: 45 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 50, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 50, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 60, dur: 26, s: S13b }],
};

// impact kicks: the leaflets landing, Suzuki's appearance, the
// moment the order is revoked
const KICKS: [number, number][] = [
  [LEAFLET_T, 0.13], [FOUND_T, 0.16], [SALUTE_T, 0.18],
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
  { f: 0, cInf: 0.9, focus: () => [0.2, 1.9, 3.2] },
  { f: L[1], cInf: 0.7, focus: () => [0.5, 1.6, 10] },
  { f: L[2], cInf: 1.4, focus: () => [0, 1.7, 0] },
  { f: L[3], cInf: 0.6, focus: () => [-14, 1.2, 7] },
  { f: L[4], cInf: 1.5, focus: () => [0, 1.8, 1] },
  { f: L[5], cInf: 1.2, focus: () => [0, 1.0, -0.5] },
  { f: L[6], cInf: 1.4, focus: () => [7.5, 0.8, -8] },
  { f: L[7], cInf: 0.8, focus: () => [-26, 1.4, 5] },
  { f: L[8], cInf: 1.4, focus: () => [1.2, 1.7, 9.5] },
  { f: L[9], cInf: 1.6, focus: () => [1.0, 1.7, 8.8] },
  { f: L[10], cInf: 1.4, focus: () => [1.8, 1.7, 9.8] },
  { f: L[11], cInf: 1.6, focus: () => [1.6, 1.8, 9.6] },
  { f: L[12], cInf: 0.9, focus: () => [0.5, 1.8, 8] },
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
