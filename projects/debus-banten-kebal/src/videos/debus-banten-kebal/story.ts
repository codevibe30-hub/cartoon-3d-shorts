// Timeline of the Debus short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Debus, Banten: the traditional
// invulnerability art of the old Banten Sultanate — on an
// open village stage a performer presses a 40 cm iron spike
// against his own belly while an assistant taps its wooden
// base with a mallet, and the skin does not break. Born as
// Islamic outreach opened with dzikir, turned into real war
// training under Sultan Ageng Tirtayasa, vanished with the
// sultanate, revived in the 1960s, now an official Intangible
// Cultural Heritage. Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json. VISUAL CORE: the spike ALREADY
// pressed + being struck at frame 0 on a bright festival
// ground; shot 6 steps back to the sultanate yard (far +z)
// for the war-training flashback. Shot 10 returns to the
// cover angle.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 196, 363, 546, 700, 860, 1033, 1209, 1367, 1595, 1758];
export const TOTAL = L[10];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x1 - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- shared geography (world.ts + cast.ts MUST match) ----------------
// THE ARENA (present day): an open village performance ground
// around the origin, floor y = 0. The woven performance mat
// lies at MAT (z ≈ -20); the troupe's banner hangs between
// poles at z ≈ -27. The crowd gathers on the +z side of the
// mat (z -4..-11). Houses and trees ring the ground at
// |x| 16..30 and z -34..+14.
// THE SULTANATE YARD (flashback): far +z — the pendopo hall
// at z ≈ +150 facing a training field (z +100..+138).
export const FLOOR_Y = 0;
export const MAT: V3 = [0, 0, -20];                    // the performance mat's heart
export const PERF: V3 = [0, 0, -20];                   // the debus performer
export const ASST: V3 = [-2.6, 0, -19.0];              // the assistant with the godo mallet
export const HERO_HOOK: V3 = [3.6, 0, -14.5];          // beside the act, never covering it
export const SYEKH: V3 = [5.6, 0, -21.5];              // the troupe leader at the mat's edge
export const MUS1: V3 = [-6.8, 0, -23.5];              // gendang player (seated)
export const MUS2: V3 = [-5.2, 0, -25.2];              // rebana player (seated)
export const HERO_TORCH: V3 = [3.4, 0, -15.0];
export const HERO_CROWD: V3 = [1.6, 0, -7.6];          // the hero among the crowd (shot 4)
export const SYEKH_SIT: V3 = [0, 0, -16.6];            // leading the dzikir (shot 5)
export const HERO_DZIKIR: V3 = [5.9, 0, -16.2];
export const STAND: V3 = [1.6, 0, -21.5];              // the carved stand with the debus tool (shot 7)
export const HERO_TOOL: V3 = [3.6, 0, -18.4];
export const SYEKH8: V3 = [-3.6, 0, -21.2];            // watching the secret (shot 8)
export const HERO_FEST: V3 = [4.4, 0, -13.2];
export const FIELD_SPOT: V3 = [-2.5, 0, 125.5];           // the training field's heart (shot 6)
export const HERO_WAR: V3 = [3.2, 0, 123.5];
export const PENDOPO_Z = 150;                          // the pendopo facade plane

// The godo-strike cycle: the assistant's mallet comes DOWN
// fast and lifts slowly, 1.25 strikes per second, locked to
// the gendang beat — it is ALREADY mid-cycle at frame 0 and
// never stops in the pressing shots (1, 8, 10).
// Returns the hammer prop value: 0 = raised, 1 = struck.
export const strikeAt = (t: number) => {
  const ph = (t * 1.25) % 1;
  return ph < 0.16 ? ph / 0.16 : 1 - (ph - 0.16) / 0.84;
};
// The performer's press pulse: his body leans INTO the spike
// a touch on every strike (0..1, same beat).
export const pressAt = (t: number) => {
  const ph = (t * 1.25) % 1;
  return ph < 0.16 ? ph / 0.16 : Math.max(0, 1 - (ph - 0.16) / 0.5);
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "day", "day", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10, 8: 8, 9: 8, 10: 8 };
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
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// The cover camera: low in the crowd looking at the mat —
// the performer with the spike pressed to his belly fills
// the centre, ALREADY being struck; the hero stands front-
// right, never covering him.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 1.6, -8.6], look: [0.1, 1.25, -16.8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the pressing is
      // already mid-beat): a slow push toward the mat
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 54 }));
    case 2: // THE TROUPE WIDE: high over the ground — mat, banner, crowd ring
      return full(dolly([0, 6.2, 3], [0, 1.0, -24], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 3: // THE ATTRACTIONS: the torch performer from his left, flame high
      return full(dolly([-5.8, 1.9, -12.5], [0.2, 1.5, -20], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 4: // THE CROWD: from behind the mat toward the audience faces
      return full(dolly([3.4, 1.7, -23.5], [0.5, 1.3, -7], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 5: // THE DZIKIR: across the seated row toward the syekh
      return full(dolly([6.5, 2.1, -11.5], [-0.5, 0.8, -18.5], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 6: // THE WAR TRAINING: across the field toward the pendopo, soldiers drilling
      return full(dolly([7.8, 2.8, 112.5], [-1.2, 1.5, 131], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 7: // THE TOOL CLOSE: in close on the carved stand, the spike laid across it
      return full(dolly([3.4, 1.3, -17.8], [1.5, 0.85, -21.3], Math.exp(-0.0005 * lf), { fov: 44 }));
    case 8: // THE SECRET (re-hook): the forearm press, the syekh calm beside
      return full(dolly([5.6, 1.9, -13], [-0.4, 1.3, -20.2], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 9: // THE HERITAGE: the festival wide — pennants, cheering crowd
      return full(dolly([0, 6.2, 3], [0, 1.0, -24], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 10: // THE COVER AGAIN (punchline): the pressing once more
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0004 * lf), { fov: 54 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 1, -22] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [PERF[0], 1.4, PERF[2]] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [1, 1.2, -8] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [SYEKH_SIT[0], 0.8, SYEKH_SIT[2]] };
    case 6: return { f: 0, cInf: 0.7, focus: () => [FIELD_SPOT[0], 1, FIELD_SPOT[2]] };
    case 7: return { f: 0, cInf: 0.95, focus: () => [STAND[0], 0.9, STAND[2]] };
    case 8: return { f: 0, cInf: 0.9, focus: () => [PERF[0], 1.3, PERF[2]] };
    case 9: return { f: 0, cInf: 0.5, focus: () => [0, 1.2, -20] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [PERF[0], 1.4, PERF[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [PERF[0], 1.4, PERF[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
