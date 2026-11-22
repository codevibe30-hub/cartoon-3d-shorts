// Timeline of "Wanita Ini Selamat Dari Titanic, Lalu Selamat
// Lagi Dari Kapal Tenggelam Lain🤫" — the Violet Jessop story,
// DASIMAN-STYLE story lane episode 5: paradox hook (survived the
// Titanic AND the Britannic) -> Olympic collision -> Titanic ->
// lifeboat 16 and the baby -> nurse in WWI -> Britannic, the mine
// and the propellers -> back to sea until 61 -> the midnight
// phone call -> the moral. Round WHITE-head stickmen in bright
// simple 3D sets; frame 0 is a dramatic SCENE still, NO claim
// card; the paradox lives in the title. Line boundaries live in
// the L array (start frame of each script line + total), derived
// from voice/line_starts.json; every shot, camera key, DOF key
// and story event is expressed relative to L so one patch
// retimes the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 167, 288, 474, 660, 846, 1019, 1174, 1382, 1521, 1650, 1794, 2007, 2185];
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
export const BOATSEA: V3 = [0, 0, -70];       // the lifeboat, night of 14-15 Apr 1912 (shots 1, 6)
export const TITANIC_POS: V3 = [-16, 0, -98];  // the great ship behind the boat, sinking
export const BOAT_POS: V3 = [2, 0.1, -70];     // lifeboat 16
export const DOCK: V3 = [70, 0, -30];          // Southampton dock (shots 2, 4)
export const DOCK_Y = 0.55;                    // dock platform top
export const COLLIDE: V3 = [-70, 0, 30];       // the Solent, 20 Sep 1911 (shot 3)
export const DECK: V3 = [70, 0, 30];           // Titanic's boat deck, that night (shot 5)
export const DECK_Y = 2.2;                     // deck platform top
export const HOSP: V3 = [-70, 0, -35];         // the hospital-ship anchorage, 1916 (shot 7)
export const BRITSEA: V3 = [0, 0, 45];         // the Aegean, 21 Nov 1916 (shots 8, 9, 10)
export const BRIT_POS: V3 = [-14, 0, 62];      // Britannic, sinking by the bow
export const DECKGOLD: V3 = [75, 0, 75];       // a liner's deck, golden years (shots 11, 13)
export const PHONE: V3 = [-75, 0, 75];         // a quiet room, decades later (shot 12)

// the Titanic's sinking, shared by world.ts (ship group) —
// shot 1 she is wounded but upright; shot 6 she goes down.
export const titanicSink = (id: number, u: number): { dy: number; roll: number; pitch: number } => {
  if (id === 1) return { dy: -0.7, roll: 0.05, pitch: -0.035 };
  if (id === 6) { const s = smooth(u); return { dy: -0.7 - s * 3.4, roll: 0.05 + s * 0.10, pitch: -0.035 - s * 0.16 }; }
  return { dy: -30, roll: 0, pitch: 0 }; // hidden below the sea elsewhere
};
// Britannic: struck at shot 8, listing; by shots 9-10 the stern
// is high and the propellers are out of the water.
export const britSink = (id: number, u: number): { dy: number; roll: number; pitch: number } => {
  if (id === 8) { const s = smooth(u); return { dy: -s * 1.1, roll: s * 0.07, pitch: -s * 0.05 }; }
  if (id === 9 || id === 10) return { dy: -1.6, roll: 0.10, pitch: -0.13 };
  return { dy: 0, roll: 0, pitch: 0 };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "night", tau: (t) => t },  // HOOK: lifeboat 16, the baby, the sinking Titanic — NO card
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // MISS UNSINKABLE: Violet at the dock, the great liner behind her
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // 1911: Olympic meets HMS Hawke
  { id: 4, a: L[3], b: L[4], light: "golden", tau: (t) => t }, // 1912: she boards the Titanic
  { id: 5, a: L[4], b: L[5], light: "night", tau: (t) => t },  // THE ICEBERG: the boat deck, calm faces, the berg alongside
  { id: 6, a: L[5], b: L[6], light: "night", tau: (t) => t },  // LIFEBOAT 16: "look after this baby"
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // NO KAPOK: the nurse walks to the hospital ship
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },    // 1916: Britannic strikes the mine
  { id: 9, a: L[8], b: L[9], light: "storm", tau: (t) => t },  // THE PROPELLERS: lifeboats drawn under the stern
  { id: 10, a: L[9], b: L[10], light: "storm", tau: (t) => t },// THE JUMP: the keel, the fractured skull — she lives
  { id: 11, a: L[10], b: L[11], light: "golden", tau: (t) => t },// BACK TO SEA: she sails on to 61
  { id: 12, a: L[11], b: L[12], light: "night", tau: (t) => t },// THE PHONE CALL: midnight, decades later
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// CLOSE: luck is getting back up
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

// shot 1 (HOOK, DRAMATIC COVER): the lifeboat in the foreground —
// Violet holding the baby, the hero beside her — and behind
// them the great ship, lit and listing, going down in the night
const S1a = (f: number) => dolly([7.8, 2.2, -60.5], [0.5, 1.6, -73], pushK(f, L[0], 0.0006), { fov: 47 });
const S1b = (f: number) => dolly([7.3, 2.1, -61.4], [0.5, 1.65, -73], pushK(f, L[0] + 60, 0.0005), { fov: 45 });
// shot 2 (MISS UNSINKABLE): the dock — Violet with her suitcase
// before the towering hull, the hero presenting her to us
const S2a = (f: number) => dolly([62.5, 2.2, -19.0], [70.5, 1.8, -30.5], pushK(f, L[1], 0.0006), { fov: 46 });
const S2b = (f: number) => dolly([63.2, 2.1, -19.9], [70.5, 1.8, -30.5], pushK(f, L[1] + 50, 0.0006), { fov: 44 });
// shot 3 (THE COLLISION): two ships locked together on a bright
// sea — the liner's torn side, the warship's ram bow in her
const S3a = (f: number) => dolly([-58.5, 3.2, 16.5], [-71, 2.2, 31], pushK(f, L[2], 0.0005), { fov: 47 });
const S3b = (f: number) => dolly([-59.4, 3.0, 17.6], [-71, 2.2, 31], pushK(f, L[2] + 50, 0.0005), { fov: 45 });
// shot 4 (BOARDING): golden hour — she walks the gangplank up
// to the ship that cannot sink
const S4a = (f: number) => dolly([61.5, 2.0, -20.5], [71, 2.2, -31], pushK(f, L[3], 0.0006), { fov: 46 });
const S4b = (f: number) => dolly([62.2, 1.95, -21.4], [71, 2.2, -31], pushK(f, L[3] + 50, 0.0006), { fov: 44 });
// shot 5 (THE ICEBERG): along the boat deck — Violet and the
// stewardesses in a calm line, passengers strolling, and past
// the rail the white mountain sliding by in the dark
const S5a = (f: number) => dolly([62.0, 3.6, 19.5], [71.5, 3.0, 28], pushK(f, L[4], 0.0006), { fov: 47 });
const S5b = (f: number) => dolly([62.8, 3.5, 20.3], [71.5, 3.0, 28], pushK(f, L[4] + 50, 0.0006), { fov: 45 });
// shot 6 (THE BABY): closer on the boat — the officer's gift in
// her arms, the ship behind them lower now, her lights dying
const S6a = (f: number) => dolly([6.6, 2.0, -62.6], [1.2, 1.5, -71.5], pushK(f, L[5], 0.0006), { fov: 46 });
const S6b = (f: number) => dolly([6.1, 1.9, -63.4], [1.2, 1.55, -71.5], pushK(f, L[5] + 55, 0.0006), { fov: 44 });
// shot 7 (THE NURSE): a bright anchorage — the white hospital
// ship waiting, and Violet in nurse's white walking the quay
const S7a = (f: number) => dolly([-61.5, 2.2, -24.5], [-70.5, 1.8, -35.5], pushK(f, L[6], 0.0006), { fov: 46 });
const S7b = (f: number) => dolly([-62.2, 2.1, -25.4], [-70.5, 1.8, -35.5], pushK(f, L[6] + 50, 0.0006), { fov: 44 });
// shot 8 (THE MINE): the white ship on a kind morning sea —
// then the sea itself erupts at her bow
const S8a = (f: number) => dolly([10.5, 3.0, 30.5], [-8, 2.6, 55], pushK(f, L[7], 0.0005), { fov: 47 });
const S8b = (f: number) => dolly([9.7, 2.9, 31.6], [-8, 2.6, 55], pushK(f, L[7] + 50, 0.0005), { fov: 45 });
// shot 9 (THE PROPELLERS): low by the stern — the great screws
// turning above the water, a lifeboat drawn in, Violet in it
const S9a = (f: number) => dolly([13.5, 2.2, 40.5], [3.5, 2.4, 56], pushK(f, L[8], 0.0005), { fov: 47 });
const S9b = (f: number) => dolly([12.8, 2.1, 41.5], [3.5, 2.4, 56], pushK(f, L[8] + 50, 0.0005), { fov: 45 });
// shot 10 (THE JUMP): the boat, the leap, the dark water — and
// a small figure surfacing, holding on
const S10a = (f: number) => dolly([11.8, 2.0, 42.5], [4.2, 1.2, 54], pushK(f, L[9], 0.0006), { fov: 46 });
const S10b = (f: number) => dolly([11.1, 1.9, 43.4], [4.2, 1.2, 54], pushK(f, L[9] + 50, 0.0006), { fov: 44 });
// shot 11 (BACK TO SEA): golden deck — Violet, grey at the
// temples now, waving from the rail of yet another liner
const S11a = (f: number) => dolly([67.5, 3.8, 83.5], [76, 3.2, 73.5], pushK(f, L[10], 0.0006), { fov: 46 });
const S11b = (f: number) => dolly([68.2, 3.7, 82.7], [76, 3.2, 73.5], pushK(f, L[10] + 50, 0.0006), { fov: 44 });
// shot 12 (THE PHONE CALL): a lamplit room at midnight — the
// old lady, the telephone, a laugh that explains nothing
const S12a = (f: number) => dolly([-68.2, 2.4, 83.0], [-75.2, 1.5, 73.2], pushK(f, L[11], 0.0007), { fov: 45 });
const S12b = (f: number) => dolly([-68.8, 2.3, 82.2], [-75.2, 1.5, 73.2], pushK(f, L[11] + 50, 0.0007), { fov: 43 });
// shot 13 (CLOSE): the golden deck again — Violet and the
// storyteller side by side, the calm sea, the moral
const S13a = (f: number) => dolly([66.8, 4.0, 84.5], [75.5, 3.1, 73.8], pushK(f, L[12], 0.0004), { fov: 50 });
const S13b = (f: number) => dolly([67.6, 3.9, 83.7], [75.5, 3.1, 73.8], pushK(f, L[12] + 60, 0.0004), { fov: 48 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 60, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 50, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 50, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 50, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 50, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 50, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 60, dur: 26, s: S13b }],
};

// no impact kicks — the camera stays a witness
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
  { f: 0, cInf: 0.9, focus: () => [1.5, 1.8, -70] },
  { f: L[1], cInf: 0.8, focus: () => [70, 1.8, -30] },
  { f: L[2], cInf: 0.7, focus: () => [-72, 2.4, 33] },
  { f: L[3], cInf: 0.8, focus: () => [70.5, 2.0, -30] },
  { f: L[4], cInf: 0.9, focus: () => [71, 3.2, 27] },
  { f: L[5], cInf: 1.0, focus: () => [1.6, 1.6, -70.5] },
  { f: L[6], cInf: 0.8, focus: () => [-70, 1.8, -35] },
  { f: L[7], cInf: 0.7, focus: () => [-14, 3, 60] },
  { f: L[8], cInf: 0.9, focus: () => [4, 2.2, 55] },
  { f: L[9], cInf: 1.0, focus: () => [4.4, 1.0, 53] },
  { f: L[10], cInf: 0.8, focus: () => [75.5, 3.4, 74] },
  { f: L[11], cInf: 1.0, focus: () => [-75, 1.6, 73.5] },
  { f: L[12], cInf: 0.7, focus: () => [75.2, 3.3, 74] },
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
