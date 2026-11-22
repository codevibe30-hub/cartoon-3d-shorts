// Timeline of "Pria Ini Menyelamatkan 669 Anak, Lalu Diam 50
// Tahun🤫" — the Nicholas Winton story, DASIMAN-STYLE story lane
// episode 4: paradox hook (669 children saved, then 50 years of
// silence) -> the Prague rescue -> the trains -> the ninth train
// that never left -> the silence -> the scrapbook -> the studio
// where his children stood up -> the moral. TONE: respectful
// throughout, NO comedy. Round WHITE-head stickmen in bright
// simple 3D sets; frame 0 is a dramatic SCENE still, NO claim
// card; the paradox lives in the title. No violence, no Nazi
// symbols — the war is a closing gate, a darkening sky, an empty
// platform. Line boundaries live in the L array (start frame of
// each script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L so one patch retimes the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 174, 357, 527, 686, 876, 1027, 1163, 1355, 1517, 1673, 1870, 2094, 2302];
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
export const STATION: V3 = [0, 0, -70];        // Prague station, 1939 (shots 1, 6, 7, 8)
export const PLAT_Y = 0.55;                    // platform top height
export const TRACK_Z = -80.5;                  // the track line
export const WINTON_WAVE: V3 = [-2, PLAT_Y, -71]; // Winton's spot on the platform
export const HERO_SPOT: V3 = [7.2, PLAT_Y, -69.6]; // the storyteller, witnessing
export const STREET: V3 = [70, 0, -30];        // Prague street + the hotel (shot 2)
export const CORRIDOR: V3 = [70, 0, 30];       // the hotel corridor queue (shot 3)
export const OFFICE: V3 = [-70, 0, 30];        // the hotel-room office (shot 4)
export const MAPWALL: V3 = [-70, 0, -35];      // the great map of Europe (shot 5)
export const GATE: V3 = [0, 0, 45];            // the border gate (shot 9)
export const HOME: V3 = [75, 0, 75];           // an ordinary English living room (shot 10)
export const ATTIC: V3 = [-75, 0, 75];         // the attic, 1988 (shot 11)
export const STUDIO: V3 = [0, 0, 125];         // the BBC studio, 1988 (shots 12, 13)

// the train: in shot 6 it pulls away to the east (+X) and is gone;
// world.ts moves the group with this same function
export const TRAIN_BASE_X = -6;
export const trainX = (u: number) => TRAIN_BASE_X + smooth(Math.max(0, (u - 0.45) / 0.55)) * 150;
// passenger car centre offsets inside the train group + the
// window band the children press against (cast.ts must match)
export const CAR_OFF = [-2.5, 5, 12.5];
export const WIN_Y = 2.15;
export const WIN_Z = TRACK_Z + 1.34;

// the map route (shot 5): Praha -> north -> the sea -> England,
// in world coords on the map wall (z just off the wall face)
export const ROUTE: V3[] = [
  [-66.2, 3.2, -40.3], [-66.8, 4.6, -40.3], [-68.6, 5.6, -40.3],
  [-71.5, 6.1, -40.3], [-74.6, 6.3, -40.3], [-76.6, 6.9, -40.3],
];
export const routeAt = (u: number): V3 => {
  const n = ROUTE.length - 1, x = clamp01(u) * n, i = Math.min(n - 1, Math.floor(x)), k = x - i;
  const a = ROUTE[i], b = ROUTE[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2]];
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "night", tau: (t) => t },  // HOOK: Prague station at night — the wave goodbye, NO card
  { id: 2, a: L[1], b: L[2], light: "storm", tau: (t) => t },  // DEC 1938: a London stockbroker walks Prague with a suitcase
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // THE QUEUE: parents lining the hotel corridor
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },    // THE OFFICE: one desk, one child at a time
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },    // THE ROUTE: eight trains across a darkening map
  { id: 6, a: L[5], b: L[6], light: "storm", tau: (t) => t },  // FIRST TRAIN: 20 children, 14 March — it pulls away
  { id: 7, a: L[6], b: L[7], light: "storm", tau: (t) => t },  // LEFT BEHIND: two parents alone on the platform
  { id: 8, a: L[7], b: L[8], light: "night", tau: (t) => t },  // THE NINTH TRAIN: cold, dark, going nowhere
  { id: 9, a: L[8], b: L[9], light: "storm", tau: (t) => t },  // 1 SEPT 1939: the gate comes down; the war begins
  { id: 10, a: L[9], b: L[10], light: "golden", tau: (t) => t },// THE SILENCE: an ordinary life in England
  { id: 11, a: L[10], b: L[11], light: "golden", tau: (t) => t },// THE SCRAPBOOK: Grete in the attic, 1988
  { id: 12, a: L[11], b: L[12], light: "golden", tau: (t) => t },// THAT'S LIFE: the audience stands, one by one
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// CLOSE: true kindness needs no applause
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

// shot 1 (HOOK, DRAMATIC COVER): the night platform — the train's
// lit windows to the left, Winton mid-frame waving a child away,
// the parents held behind the barrier, the hero a quiet witness
const S1a = (f: number) => dolly([4.8, 2.0, -59.5], [-3.4, 1.8, -72], pushK(f, L[0], 0.0006), { fov: 47 });
const S1b = (f: number) => dolly([4.4, 1.95, -60.4], [-3.4, 1.85, -72], pushK(f, L[0] + 60, 0.0005), { fov: 45 });
// shot 2 (PRAGUE STREET): grey December — Winton crosses the
// cobbles with his suitcase, past the hotel, toward his calling
const S2a = (f: number) => dolly([61, 2.1, -19.5], [70, 1.5, -30.5], pushK(f, L[1], 0.0007), { fov: 46 });
const S2b = (f: number) => dolly([61.5, 2.0, -20.4], [70.5, 1.5, -30.5], pushK(f, L[1] + 50, 0.0007), { fov: 44 });
// shot 3 (THE QUEUE): down the corridor — a line of parents and
// children along the doors, Winton receiving them at the far end
const S3a = (f: number) => dolly([57.5, 2.0, 31.5], [74, 1.5, 26.5], pushK(f, L[2], 0.0006), { fov: 47 });
const S3b = (f: number) => dolly([58.3, 1.95, 31.0], [74.5, 1.5, 26.5], pushK(f, L[2] + 50, 0.0006), { fov: 45 });
// shot 4 (THE OFFICE): the desk, the paper stacks, the board of
// small photographs — one child at a time
const S4a = (f: number) => dolly([-64.6, 1.9, 33.8], [-70.2, 1.3, 27.5], pushK(f, L[3], 0.0008), { fov: 45 });
const S4b = (f: number) => dolly([-65.0, 1.85, 33.1], [-70.2, 1.3, 27.5], pushK(f, L[3] + 50, 0.0008), { fov: 43 });
// shot 5 (THE ROUTE): the great map fills the frame; a small
// train of light crosses Europe while Winton traces it
const S5a = (f: number) => dolly([-70, 3.4, -27.5], [-70, 3.6, -40], pushK(f, L[4], 0.0004), { fov: 44 });
const S5b = (f: number) => dolly([-70, 3.3, -28.3], [-70.4, 3.7, -40], pushK(f, L[4] + 55, 0.0004), { fov: 42 });
// shot 6 (FIRST TRAIN): the platform again, grey morning — the
// little train pulls away east with its twenty children
const S6a = (f: number) => dolly([5.2, 2.0, -60.2], [-2.5, 1.8, -72], pushK(f, L[5], 0.0006), { fov: 47 });
const S6b = (f: number) => dolly([5.8, 1.95, -61.0], [-1.5, 1.8, -72.5], pushK(f, L[5] + 55, 0.0006), { fov: 45 });
// shot 7 (LEFT BEHIND): the same platform, emptier — two small
// figures at the edge, waving at nothing now
const S7a = (f: number) => dolly([-8.6, 1.9, -61.5], [-11.5, 1.5, -71.5], pushK(f, L[6], 0.0007), { fov: 46 });
const S7b = (f: number) => dolly([-8.9, 1.85, -62.3], [-11.5, 1.5, -71.5], pushK(f, L[6] + 50, 0.0007), { fov: 44 });
// shot 8 (THE NINTH TRAIN): night again — but this train is
// cold and dark, and the barrier is down across the platform
const S8a = (f: number) => dolly([4.6, 2.0, -60.0], [-2.8, 1.7, -71.5], pushK(f, L[7], 0.0005), { fov: 47 });
const S8b = (f: number) => dolly([4.3, 1.95, -60.8], [-2.8, 1.75, -71.5], pushK(f, L[7] + 55, 0.0005), { fov: 45 });
// shot 9 (THE GATE): the border — a barrier across the tracks,
// a far dark horizon; Winton turns and walks out of frame
const S9a = (f: number) => dolly([6.4, 2.1, 33.5], [0.5, 1.6, 46], pushK(f, L[8], 0.0006), { fov: 46 });
const S9b = (f: number) => dolly([6.0, 2.0, 34.4], [0.8, 1.6, 46.5], pushK(f, L[8] + 50, 0.0006), { fov: 44 });
// shot 10 (THE SILENCE): a warm English room — he comes home
// from work, sits down, and says nothing, for fifty years
const S10a = (f: number) => dolly([70.8, 2.2, 79.8], [74.6, 1.2, 72.6], pushK(f, L[9], 0.0007), { fov: 45 });
const S10b = (f: number) => dolly([71.3, 2.1, 79.0], [74.6, 1.2, 72.6], pushK(f, L[9] + 50, 0.0007), { fov: 43 });
// shot 11 (THE SCRAPBOOK): the attic — one lamp's worth of warm
// light, boxes, and a book that waited fifty years to be opened
const S11a = (f: number) => dolly([-67.5, 2.6, 84.5], [-74.9, 1.3, 72.4], pushK(f, L[10], 0.0008), { fov: 45 });
const S11b = (f: number) => dolly([-68.0, 2.5, 83.6], [-74.9, 1.3, 72.4], pushK(f, L[10] + 50, 0.0008), { fov: 43 });
// shot 12 (THAT'S LIFE): the studio — old Winton in the guest
// chair, and all around him, his children begin to stand
const S12a = (f: number) => dolly([0, 3.4, 115.0], [0, 1.5, 128.2], pushK(f, L[11], 0.0005), { fov: 48 });
const S12b = (f: number) => dolly([0, 3.2, 116.2], [0, 1.5, 128.2], pushK(f, L[11] + 60, 0.0005), { fov: 46 });
// shot 13 (CLOSE): wider still — a room full of standing people,
// and the old man among them, smiling at last
const S13a = (f: number) => dolly([0, 4.4, 112.5], [0, 1.6, 127], pushK(f, L[12], 0.0004), { fov: 52 });
const S13b = (f: number) => dolly([0, 4.2, 113.6], [0, 1.6, 127], pushK(f, L[12] + 60, 0.0004), { fov: 50 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 60, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 50, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 50, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 60, dur: 26, s: S12b }],
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
  { f: 0, cInf: 0.9, focus: () => [-2, 1.9, -71] },
  { f: L[1], cInf: 0.8, focus: () => [70, 1.6, -30] },
  { f: L[2], cInf: 0.8, focus: () => [72, 1.6, 27] },
  { f: L[3], cInf: 1.1, focus: () => [-70, 1.5, 27] },
  { f: L[4], cInf: 0.7, focus: () => [-70, 3.8, -40] },
  { f: L[5], cInf: 0.9, focus: () => [-2, 1.9, -71] },
  { f: L[6], cInf: 1.0, focus: () => [-11.5, 1.6, -71] },
  { f: L[7], cInf: 0.9, focus: () => [-2.5, 1.8, -71] },
  { f: L[8], cInf: 0.9, focus: () => [1, 1.7, 45] },
  { f: L[9], cInf: 0.9, focus: () => [74.5, 1.4, 73] },
  { f: L[10], cInf: 1.0, focus: () => [-74.8, 1.5, 72.8] },
  { f: L[11], cInf: 0.8, focus: () => [0, 1.7, 126] },
  { f: L[12], cInf: 0.7, focus: () => [0, 1.8, 125] },
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
