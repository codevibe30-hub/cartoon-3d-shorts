// Timeline of the Tari Saman short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Tari Saman, Aceh: the Gayo people's
// seated dance of a thousand hands — NO instruments at all, the
// rhythm is the dancers' own bodies (hand claps, chest slaps,
// thigh slaps), one syekh leads thousands with sung cues, and on
// 13 Aug 2017 a targeted 10.001 dancers became 12.262 at Stadion
// Seribu Bukit, Gayo Lues — a MURI record. UNESCO listed the dance
// in 2011 (Urgent Safeguarding, ref 00509).
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright highland daylight over the Bukit Barisan,
// rows and rows of seated dancers on a giant woven mat, colourful
// kerawang costumes. Frame 0 is the clickbait cover: the hero's
// SHOCK face at the mat's edge, an ocean of dancers behind him,
// the claim text GIANT. The cover returns as shot 10 (loop).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 222, 371, 563, 730, 946, 1064, 1188, 1431, 1628, 1795];
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
// The performance mat lies on the field: dancers sit in rows
// facing +Z (the audience/camera side). Rows run along X and
// recede toward -Z. The syekh sits front-centre at SYEKH_POS
// facing the same way, leading with sung cues. The hero narrator
// stands at the mat's front-right corner. The grandstand closes
// the field at z ~ -58; the Bukit Barisan ridges rise behind it.
export const SYEKH_POS: V3 = [0, 0, 4.4];
export const HERO_POS: V3 = [1.3, 0, 9.5];
// near block: 5 rows x 10 dancers (the troupe shots 1-7, 10 see)
export const ROW_ZS = [0.5, -3.0, -6.5, -10.0, -13.5];
export const ROW_X0 = -13.95, ROW_DX = 3.1, ROW_N = 10;
// far block: 7 rows x 17 dancers (only the stadium shots 8-9 read wide enough)
export const FAR_ZS = [-18.0, -21.6, -25.2, -28.8, -32.4, -36.0, -39.6];
export const FAR_X0 = -24.8, FAR_DX = 3.1, FAR_N = 17;
// flashback circle (shot 6): a small ring of dancers around the
// old teacher, by the adat house in the side clearing
export const CIRCLE_C: V3 = [-17, 0, -20];
export const CIRCLE_R = 4.4;

// ---------------- the beat: body percussion tempo ----------------
// Clap-cycle rates (cycles per second) per shot [start, end].
// Saman starts slow and accelerates — shot 4 is the ramp the
// script talks about; the stadium shots run full speed.
const RATES: [number, number][] = [
  [1.5, 1.5], [1.5, 1.5], [1.7, 1.7], [1.7, 3.4], [2.3, 2.3],
  [1.0, 1.0], [2.6, 2.6], [3.2, 3.2], [3.2, 3.2], [3.4, 3.4],
];
/** cumulative clap-cycle phase at global time t (seconds) */
export const beatPhase = (t: number): number => {
  let ph = 0;
  for (let i = 0; i < 10; i++) {
    const a = L[i] / FPS, b = L[i + 1] / FPS;
    if (t <= a) break;
    const tt = Math.min(t, b), dur = Math.max(0.01, b - a), x = tt - a;
    const [r0, r1] = RATES[i];
    ph += x * r0 + ((r1 - r0) * x * x) / (2 * dur);
    if (t <= b) break;
  }
  return ph;
};
export const beatRateAt = (t: number): number => {
  for (let i = 0; i < 10; i++) {
    const a = L[i] / FPS, b = L[i + 1] / FPS;
    if (t >= a && t < b) {
      const [r0, r1] = RATES[i];
      return r0 + (r1 - r0) * clamp01((t - a) / Math.max(0.01, b - a));
    }
  }
  return RATES[9][1];
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: (i === 5 ? "golden" : "day") as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 10, 7: 8, 8: 6, 9: 8, 10: 8 };
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

// The cover camera: low at the mat's edge — the hero big at the
// front-right corner, rows of dancers stacked behind him to the
// grandstand, the claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.4, 17.5], look: [0, 1.7, -16] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // MEDIUM WIDE over the seated rows — everybody sits, nobody stands
      return full(dolly([7.5, 3.4, 11], [-1, 0.8, -9], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // CLOSE on the front row's hands: clap, chest, thigh
      return full(dolly([3.6, 1.5, 5.4], [2.4, 0.7, -0.6], Math.exp(-0.0005 * lf), { fov: 38 }));
    case 4: // THE TEMPO RAMP: a real push-in as the beat doubles
      return full(dolly([0, 2.8, 13.5], [0, 1.0, -6], Math.exp(-0.0028 * lf), { fov: 42 }));
    case 5: // THE SYEKH: front-centre, conducting — the rows obey behind him
      return full(dolly([2.8, 1.9, 10.8], [0, 1.1, 2.2], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 6: // FLASHBACK (golden): the teaching circle by the adat house
      return full(dolly([-10.2, 2.3, -12.2], [CIRCLE_C[0], 0.9, CIRCLE_C[2]], Math.exp(-0.0003 * lf), { fov: 42 }));
    case 7: // REVERSE ANGLE over the rows, grandstand behind the camera side
      return full(dolly([-6.5, 3.0, 12], [0, 0.9, -8], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 8: // STADIUM WIDE (the re-hook): the whole 2017 field at once
      return full(dolly([0, 13.5, 33], [0, 0.5, -22], Math.exp(-0.0002 * lf), { fov: 50 }));
    case 9: // MURI WIDE from the side: 145 villages in one frame
      return full(dolly([11, 7.5, 24], [-2, 0.5, -18], Math.exp(-0.0003 * lf), { fov: 48 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.5, focus: () => [0, 0.8, -6] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [2.6, 0.7, 0.2] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [0, 0.8, -2] };
    case 5: return { f: 0, cInf: 0.95, focus: () => [SYEKH_POS[0], 1.1, SYEKH_POS[2]] };
    case 6: return { f: 0, cInf: 0.7, focus: () => [CIRCLE_C[0], 0.9, CIRCLE_C[2]] };
    case 7: return { f: 0, cInf: 0.5, focus: () => [0, 0.8, -6] };
    case 8: return { f: 0, cInf: 0.35, focus: () => [0, 0.5, -25] };
    case 9: return { f: 0, cInf: 0.4, focus: () => [0, 0.5, -20] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_POS[0], 1.3, HERO_POS[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
