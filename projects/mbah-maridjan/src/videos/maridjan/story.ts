// Timeline of "Pria Ini Menolak Turun Saat Gunungnya Meletus🤫" —
// the Mbah Maridjan story, DASIMAN-STYLE story lane episode 6
// (MISTIS INDO): paradox hook (he refused to leave an erupting
// volcano — twice) -> the 1982 appointment by the Sultan -> the
// Labuhan duty -> 2006: he refuses, prays, survives -> the fame
// -> October 2010: he refuses again, sends the villagers down,
// stays with his amanah -> the pyroclastic flow -> found in
// sujud -> buried at Srunen -> the moral. TONE: respectful and
// solemn throughout, NO comedy, NO gore — the eruption is a far
// grey wall of cloud; his death is told by narration over bowed
// heads at dawn. Round WHITE-head stickmen in bright simple 3D
// sets; frame 0 is a dramatic SCENE still, NO claim card; the
// paradox lives in the title. Line boundaries live in the L
// array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L so one patch retimes
// the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 132, 266, 443, 559, 671, 857, 1052, 1236, 1444, 1629, 1805, 2066, 2292];
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
export const VOLCANO: V3 = [0, 0, -120];       // Merapi: the great cone behind everything
export const VILLAGE: V3 = [0, 0, -28];        // Kinahrejo, on the southern slope
export const MHOUSE: V3 = [8, 0, -29.6];       // Maridjan's house (joglo group origin in world.ts)
export const PORCH_Y = 0.32;                   // porch floor height of his house
export const PORCH: V3 = [8, PORCH_Y, -25.6];  // where he stands on his porch, facing the village
export const BENCH: V3 = [6.6, 0.68, -26.2];   // the porch bench seat (shot 5)
export const ROAD_Z = -8;                      // the east-west road below the village
export const PATH_X = 3;                       // the village path, north-south
export const MOSQUE: V3 = [60, 0, 10];         // the little village mosque (shot 7)
export const GRAVE: V3 = [-60, 0, 22];         // Srunen burial ground (shot 13)
export const HERO_SPOT: V3 = [-4.5, 0, -5];    // the storyteller, witnessing (shot 1)

// the evacuation pickup: in shots 1 + 6 it is loaded in the
// village and drives away east (+X); in shot 9 it ARRIVES from
// the east and stops by his house. world.ts moves the group
// with these same functions; cast.ts seats the riders with them.
export const truckX = (u: number) => -8 + smooth(clamp01((u - 0.2) / 0.7)) * 110;
export const truckArriveX = (u: number) => 64 - smooth(clamp01(u / 0.28)) * 50;
export const TRUCK_BED_Y = 1.02;               // riders stand on the bed floor

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "storm", tau: (t) => t },  // HOOK: the loaded truck leaves — he does not get on
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // MBAH MARIDJAN: the gatekeeper of Merapi
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // 1982: the Sultan's envoy hands him the great key
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // LABUHAN: the offering procession climbs toward the crater
  { id: 5, a: L[4], b: L[5], light: "golden", tau: (t) => t }, // THE PORCH: one dollar a month, and a mountain to watch
  { id: 6, a: L[5], b: L[6], light: "storm", tau: (t) => t },  // 2006: the Sultan himself pleads — he walks to the mosque instead
  { id: 7, a: L[6], b: L[7], light: "storm", tau: (t) => t },  // THE PRAYER: he kneels as the cloud comes — and lives, burned
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },    // THE RETURN: Kinahrejo welcomes its gatekeeper home
  { id: 9, a: L[8], b: L[9], light: "storm", tau: (t) => t },  // 2010: the truck comes again — he refuses again
  { id: 10, a: L[9], b: L[10], light: "night", tau: (t) => t },// THE WORDS: "kalau saya pergi, siapa yang mengurus tempat ini?"
  { id: 11, a: L[10], b: L[11], light: "night", tau: (t) => t },// HE SENDS THEM DOWN: lanterns descending; he turns into his house
  { id: 12, a: L[11], b: L[12], light: "storm", tau: (t) => t },// 26 OCT 2010: the grey wall — then bowed heads at dawn
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// SRUNEN: a simple grave, and the mountain calm behind it
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

// shot 1 (HOOK, DRAMATIC COVER): dusk on the slope — the loaded
// truck on the road below, Maridjan still as stone before his
// house, the great cone smoking behind him
const S1a = (f: number) => dolly([1.5, 2.1, 3], [6.8, 2.0, -26], pushK(f, L[0], 0.0006), { fov: 47 });
const S1b = (f: number) => dolly([1.9, 2.05, 2.2], [6.8, 2.05, -26], pushK(f, L[0] + 60, 0.0005), { fov: 45 });
// shot 2 (THE GATEKEEPER): a bright morning in Kinahrejo — the
// old man among his neighbours, the mountain watching over all
const S2a = (f: number) => dolly([-13, 3.1, 6], [2, 2.3, -32], pushK(f, L[1], 0.0006), { fov: 46 });
const S2b = (f: number) => dolly([-12.4, 3.0, 5.2], [2.4, 2.3, -32], pushK(f, L[1] + 50, 0.0006), { fov: 44 });
// shot 3 (THE KEY, 1982): the envoy in keraton brown, the decree
// in his hand; the younger Maridjan receives the great key
const S3a = (f: number) => dolly([-1.5, 1.9, -13], [7.4, 1.45, -24.8], pushK(f, L[2], 0.0007), { fov: 45 });
const S3b = (f: number) => dolly([-1.1, 1.85, -13.8], [7.4, 1.45, -24.8], pushK(f, L[2] + 50, 0.0007), { fov: 43 });
// shot 4 (LABUHAN): the procession on the path — trays of
// offerings carried high, the cone looming ahead of them
const S4a = (f: number) => dolly([-9.5, 2.3, -14], [-1.5, 2.4, -52], pushK(f, L[3], 0.0005), { fov: 46 });
const S4b = (f: number) => dolly([-9.0, 2.25, -15], [-1.2, 2.4, -52], pushK(f, L[3] + 50, 0.0005), { fov: 44 });
// shot 5 (THE PORCH): golden hour — he sits with his key across
// his knees and reads the mountain like a letter
const S5a = (f: number) => dolly([3.6, 1.7, -17.2], [7.0, 1.2, -25.9], pushK(f, L[4], 0.0007), { fov: 45 });
const S5b = (f: number) => dolly([4.0, 1.65, -18.0], [7.0, 1.2, -25.9], pushK(f, L[4] + 50, 0.0007), { fov: 43 });
// shot 6 (2006): the road again, ash-grey light — an official
// pleading, the old man shaking his head, turning for the mosque
const S6a = (f: number) => dolly([-5.5, 2.0, 1], [7.6, 1.8, -15], pushK(f, L[5], 0.0006), { fov: 46 });
const S6b = (f: number) => dolly([-5.0, 1.95, 0.2], [7.9, 1.8, -15], pushK(f, L[5] + 55, 0.0006), { fov: 44 });
// shot 7 (THE MOSQUE): the prayer rows before the little mosque,
// ash drifting; then the bandaged man among his neighbours
const S7a = (f: number) => dolly([51.5, 2.2, 21.5], [60, 1.5, 9.5], pushK(f, L[6], 0.0006), { fov: 46 });
const S7b = (f: number) => dolly([52.1, 2.1, 20.7], [60, 1.5, 9.5], pushK(f, L[6] + 50, 0.0006), { fov: 44 });
// shot 8 (THE RETURN): down the village path — the whole hamlet
// lining the way, waving their gatekeeper home
const S8a = (f: number) => dolly([-7.5, 2.2, -1], [3.6, 1.8, -25], pushK(f, L[7], 0.0006), { fov: 46 });
const S8b = (f: number) => dolly([-7.0, 2.1, -1.8], [3.8, 1.8, -25], pushK(f, L[7] + 50, 0.0006), { fov: 44 });
// shot 9 (2010): the truck rolls in from the east and stops; the
// neighbours come down with their bundles — he bows, and stays
const S9a = (f: number) => dolly([-3.5, 2.0, 0.5], [8.2, 1.8, -18], pushK(f, L[8], 0.0006), { fov: 46 });
const S9b = (f: number) => dolly([-3.0, 1.95, -0.3], [8.2, 1.8, -18], pushK(f, L[8] + 55, 0.0006), { fov: 44 });
// shot 10 (THE WORDS): night, close — lamplight in his window,
// the old man's face calm as he says the famous sentence
const S10a = (f: number) => dolly([5.0, 1.7, -19.5], [8, 1.5, -25.8], pushK(f, L[9], 0.0007), { fov: 44 });
const S10b = (f: number) => dolly([5.4, 1.65, -20.3], [8, 1.5, -25.8], pushK(f, L[9] + 55, 0.0007), { fov: 42 });
// shot 11 (LANTERNS): the path at night — his people going down
// to safety with their bundles and little lights; he watches
const S11a = (f: number) => dolly([-2.5, 2.4, -4], [4.5, 1.9, -30], pushK(f, L[10], 0.0005), { fov: 47 });
const S11b = (f: number) => dolly([-2.0, 2.3, -4.8], [4.5, 1.9, -30], pushK(f, L[10] + 55, 0.0005), { fov: 45 });
// shot 12 (THE GREY WALL): the wedhus gembel rolling down over
// the village; then grey dawn — bowed heads before his house
const S12a = (f: number) => dolly([0, 2.7, 7], [2, 3.6, -48], pushK(f, L[11], 0.0004), { fov: 48 });
const S12b = (f: number) => dolly([0.4, 2.6, 6.2], [2, 3.4, -48], pushK(f, L[11] + 55, 0.0004), { fov: 46 });
// shot 13 (SRUNEN): a simple grave under the trees, flowers on
// the earth, and Merapi calm and golden behind the mourners
const S13a = (f: number) => dolly([-51.5, 2.2, 35], [-60, 1.3, 22.5], pushK(f, L[12], 0.0005), { fov: 46 });
const S13b = (f: number) => dolly([-52.1, 2.1, 34.2], [-60, 1.3, 22.5], pushK(f, L[12] + 60, 0.0005), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 60, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 50, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 50, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 55, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 55, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 55, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 55, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 60, dur: 26, s: S13b }],
};

// no impact kicks in this story — the camera stays gentle
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
  { f: 0, cInf: 0.9, focus: () => [8, 1.9, -25.6] },
  { f: L[1], cInf: 0.8, focus: () => [0, 1.6, -24] },
  { f: L[2], cInf: 1.0, focus: () => [7.5, 1.5, -24.5] },
  { f: L[3], cInf: 0.8, focus: () => [-2, 1.8, -40] },
  { f: L[4], cInf: 1.0, focus: () => [6.6, 1.2, -26.2] },
  { f: L[5], cInf: 0.9, focus: () => [7.5, 1.7, -13] },
  { f: L[6], cInf: 0.9, focus: () => [60, 1.3, 12] },
  { f: L[7], cInf: 0.8, focus: () => [3, 1.6, -16] },
  { f: L[8], cInf: 0.9, focus: () => [8, 1.7, -20] },
  { f: L[9], cInf: 1.1, focus: () => [8, 1.5, -25.8] },
  { f: L[10], cInf: 0.8, focus: () => [3.5, 1.6, -18] },
  { f: L[11], cInf: 0.7, focus: () => [2, 2.5, -35] },
  { f: L[12], cInf: 0.9, focus: () => [-60, 1.2, 22] },
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
