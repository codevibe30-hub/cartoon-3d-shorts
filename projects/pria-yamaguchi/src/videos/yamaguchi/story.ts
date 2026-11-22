// Timeline of "Pria Ini Kena Dua Bom Atom Dan Tetap Hidup🤫" —
// the Tsutomu Yamaguchi story, DASIMAN-STYLE story lane episode 2:
// paradox hook -> escalation -> twist -> moral; ALL visual design
// follows DASIMAN in full (per Baginda Raja 2026-11-22: "Gaya dia
// lah"). Round WHITE-head stickmen in bright simple 3D sets; frame 0
// is a dramatic SCENE still, NO claim card; the paradox lives in the
// title. The two atomic flashes are stylized LIGHT only — a white
// hit, a shockwave ring, dust — never graphic, never gore.
// Geography: four zones in one world — the Hiroshima street (HSTR),
// the ruins + air-raid shelter east (RUINS), the station south
// (STATION), and Nagasaki west: the Mitsubishi office interior
// (NOFF), the rebuilt street (NSTR) and the plaza (PLAZA).
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L so
// one patch retimes the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 224, 355, 553, 711, 843, 959, 1090, 1255, 1390, 1522, 1703, 1875, 2116];
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
export const HSTR: V3 = [0, 0, 0];        // Hiroshima street, runs along Z
export const DOCK: V3 = [0, 0, 38];       // the docks, south end of the street
export const RUINS: V3 = [80, 0, -20];    // the burnt city + shelter, east
export const SHELTER: V3 = [80, 0, -21];  // the air-raid shelter mouth
export const STATION: V3 = [30, 0, 58];   // the platform
export const TRACK_Z = 63;                // the rails
export const NOFF: V3 = [-80, 0, -20];    // Nagasaki office interior
export const NSTR: V3 = [-80, 0, 25];     // Nagasaki street, rebuilt
export const PLAZA: V3 = [-80, 0, 48];    // the plaza: advocacy + recognition
export const HERO_SPOT: V3 = [-77.4, 0, -15.9]; // hook: hero big at frame right

// ---------------- story events (frames; patched to the VO word timings) ----------------
export const FLASH1_F = L[3] + 9;   // frame 562: the word "menyala" in line 4 (words.json)   // shot 4: "Langit menyala putih" — Hiroshima
export const FLASH2_F = L[8] + 82;  // frame 1337: the word "menyala" in line 9 (words.json)   // shot 9: mid-sentence — Nagasaki
export const FLASHES = [FLASH1_F, FLASH2_F];
export const FLASH1_T = FLASH1_F / FPS;
export const FLASH2_T = FLASH2_F / FPS;

// the train (shot 6): still at the platform until u=0.45 of the
// shot, then pulls away — world.ts moves the train group and
// cast.ts rides Yamaguchi at its door with the SAME function
export const trainOff = (u: number) => (u < 0.45 ? 0 : ((u - 0.45) / 0.55) * 26);

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },      // HOOK: the office, seconds before the second flash — dramatic cover, NO card
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },      // HIROSHIMA: three engineers walk to work
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },      // THE WALK: alone toward the docks, 3 km from ground zero
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },      // FLASH 1: the sky burns white; he is thrown
  { id: 5, a: L[4], b: L[5], light: "night", tau: (t) => t },    // THE NIGHT: the shelter, the burning city
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },      // THE TRAIN: bandaged, going home
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },      // BACK AT WORK: 9 August, reporting in bandages
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },      // "KAMU GILA": the supervisor laughs
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },      // FLASH 2: mid-sentence, the sky burns white again
  { id: 10, a: L[9], b: L[10], light: "storm", tau: (t) => t },  // STILL ALIVE: dust, silence, two men standing in it
  { id: 11, a: L[10], b: L[11], light: "golden", tau: (t) => t },// THE LONG LIFE: an old man walks a rebuilt street
  { id: 12, a: L[11], b: L[12], light: "day", tau: (t) => t },   // THE ADVOCATE: "hapuskan bom atom"
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// 2009: the only man recognized — the hero closes
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

// shot 1 (HOOK, DRAMATIC COVER): inside the Nagasaki office — the
// bandaged Yamaguchi mid-story, the supervisor laughing behind his
// desk, the hero huge at frame right with the SHOCK face; NO card
const S1a = (f: number) => dolly([-75.4, 1.5, -11.6], [-80.2, 1.8, -19.8], pushK(f, L[0], 0.0007), { fov: 48 });
const S1b = (f: number) => dolly([-75.6, 1.6, -12.3], [-80.2, 1.85, -19.8], pushK(f, L[0] + 70, 0.0006), { fov: 46 });
// shot 2 (HIROSHIMA MORNING): the three engineers walk the street
// toward the shipyard, the city bright and ordinary
const S2a = (f: number) => dolly([3.4, 2.1, 17.5], [-0.4, 1.5, 3], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([3.0, 2.0, 16.7], [-0.4, 1.5, 3], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (THE WALK): Yamaguchi alone now, heading for the docks;
// high behind him, tiny in the blue: a bomber, two parachutes
const S3a = (f: number) => dolly([4.4, 1.9, 24.5], [-0.5, 2.2, 8], pushK(f, L[2], 0.0008), { fov: 46 });
const S3b = (f: number) => dolly([4.1, 1.85, 23.7], [-0.5, 2.2, 8], pushK(f, L[2] + 50, 0.0008), { fov: 44 });
// shot 4 (FLASH 1): the same street — he walks, the sky ignites,
// the shockwave picks him up and puts him down in the dust
const S4a = (f: number) => dolly([4.6, 1.8, 13.5], [0, 1.5, 4], pushK(f, L[3], 0.0009), { fov: 45 });
const S4b = (f: number) => dolly([4.3, 1.7, 12.7], [0, 1.2, 4], pushK(f, L[3] + 50, 0.0008), { fov: 43 });
// shot 5 (THE NIGHT, RUINS): the shelter mouth under a burning sky —
// three bandaged silhouettes sit in its dark, fires smouldering
const S5a = (f: number) => dolly([73.8, 1.9, -10.5], [80, 1.0, -19.5], pushK(f, L[4], 0.0007), { fov: 45 });
const S5b = (f: number) => dolly([74.2, 1.85, -11.3], [80, 1.0, -19.5], pushK(f, L[4] + 50, 0.0007), { fov: 43 });
// shot 6 (THE TRAIN): the platform — he boards, the train pulls
// away, and his bandaged face rides the window out of the city
const S6a = (f: number) => dolly([27.5, 2.0, 53.5], [35.5, 1.7, 60.5], pushK(f, L[5], 0.0006), { fov: 46 });
const S6b = (f: number) => dolly([29.5, 1.95, 53.8], [37.5, 1.7, 60.5], pushK(f, L[5] + 55, 0.0006), { fov: 44 });
// shot 7 (BACK AT WORK): the office door side — bandaged, he walks
// in and reports; every head in the room turns
const S7a = (f: number) => dolly([-85.6, 1.95, -11.8], [-79.3, 1.5, -19.3], pushK(f, L[6], 0.0009), { fov: 45 });
const S7b = (f: number) => dolly([-85.2, 1.9, -12.5], [-79.3, 1.5, -19.3], pushK(f, L[6] + 50, 0.0009), { fov: 43 });
// shot 8 ("KAMU GILA"): the two-shot — earnest bandaged engineer,
// a supervisor shaking with laughter behind the big desk
const S8a = (f: number) => dolly([-76.9, 1.8, -14.9], [-80.7, 1.7, -20.6], pushK(f, L[7], 0.001), { fov: 45 });
const S8b = (f: number) => dolly([-77.2, 1.75, -15.6], [-80.7, 1.7, -20.6], pushK(f, L[7] + 50, 0.001), { fov: 43 });
// shot 9 (FLASH 2): the same two-shot, wider — mid-sentence the
// windows go white and the room is knocked sideways
const S9a = (f: number) => dolly([-75.9, 1.9, -13.6], [-80.5, 1.6, -20.4], pushK(f, L[8], 0.0008), { fov: 47 });
const S9b = (f: number) => dolly([-76.2, 1.85, -14.3], [-80.5, 1.4, -20.4], pushK(f, L[8] + 50, 0.0008), { fov: 45 });
// shot 10 (STILL ALIVE, STORM): grey dust-light — Yamaguchi on his
// feet, stunned; the supervisor sits on the floor, laughing no more
const S10a = (f: number) => dolly([-76.2, 1.9, -13.2], [-80.4, 1.4, -20.2], pushK(f, L[9], 0.0008), { fov: 46 });
const S10b = (f: number) => dolly([-76.5, 1.85, -13.9], [-80.4, 1.4, -20.2], pushK(f, L[9] + 50, 0.0008), { fov: 44 });
// shot 11 (THE LONG LIFE, GOLDEN): a rebuilt Nagasaki street — an
// old man with grey tufts walks home through the evening, at peace
const S11a = (f: number) => dolly([-83.6, 2.1, 34.5], [-79.8, 1.5, 24.5], pushK(f, L[10], 0.0009), { fov: 46 });
const S11b = (f: number) => dolly([-83.2, 2.0, 33.7], [-79.8, 1.5, 24.5], pushK(f, L[10] + 50, 0.0009), { fov: 44 });
// shot 12 (THE ADVOCATE): the plaza — the old man at a lectern,
// a small crowd, the hero listening in front
const S12a = (f: number) => dolly([-80.1, 2.2, 34.8], [-80.2, 1.6, 45.3], pushK(f, L[11], 0.0008), { fov: 46 });
const S12b = (f: number) => dolly([-79.9, 2.1, 35.6], [-80.2, 1.6, 45.3], pushK(f, L[11] + 50, 0.0008), { fov: 44 });
// shot 13 (2009, GOLDEN): the certificate in his hands at last —
// the hero closes the story beside him, grinning, then warm
const S13a = (f: number) => dolly([-76.4, 2.0, 40.6], [-79.6, 1.7, 45.2], pushK(f, L[12], 0.0008), { fov: 47 });
const S13b = (f: number) => dolly([-76.8, 1.9, 41.4], [-79.6, 1.7, 45.2], pushK(f, L[12] + 60, 0.0007), { fov: 45 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
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

// impact kicks: the two flashes (hard), the train lurching away,
// the certificate moment (soft)
const KICKS: [number, number][] = [
  [FLASH1_T, 0.34], [FLASH2_T, 0.34], [L[5] / FPS + 2.6, 0.1], [L[12] / FPS + 0.4, 0.12],
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
  { f: 0, cInf: 0.9, focus: () => [-79.5, 1.9, -19] },
  { f: L[1], cInf: 0.7, focus: () => [0, 1.6, 6] },
  { f: L[2], cInf: 0.8, focus: () => [0, 1.8, 12] },
  { f: L[3], cInf: 1.0, focus: () => [0, 1.4, 4] },
  { f: L[4], cInf: 1.2, focus: () => [80, 1.0, -18.5] },
  { f: L[5], cInf: 0.8, focus: () => [36, 1.6, 60.5] },
  { f: L[6], cInf: 1.2, focus: () => [-79.5, 1.7, -19] },
  { f: L[7], cInf: 1.5, focus: () => [-80.6, 1.7, -20.4] },
  { f: L[8], cInf: 1.3, focus: () => [-80.4, 1.6, -20.2] },
  { f: L[9], cInf: 1.4, focus: () => [-80.2, 1.5, -20] },
  { f: L[10], cInf: 0.8, focus: () => [-80, 1.6, 26] },
  { f: L[11], cInf: 1.2, focus: () => [-80, 1.8, 45.5] },
  { f: L[12], cInf: 0.9, focus: () => [-79.8, 1.8, 45] },
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
