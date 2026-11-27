// Timeline of the China Gaokao short (MAKS 35 s, Fafnir-ID
// format, bottom two-word subtitles). China: the Gaokao — the
// national university entrance exam — draws 12.9 MILLION students
// in 2026, all sitting the same exam on the same days (7-10 June,
// four days). The papers are STATE SECRETS: printed in a prison,
// guarded by CCTV, hauled under armed police escort. On exam days
// the whole country stops: signal jammers, drones, closed roads,
// halted construction, parents praying outside the school gates.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is relative to L.
// VISUAL CORE: a bright Chinese school campus in June — a wide
// paved plaza, a red-banded school building, a big gate, a sea of
// students in white shirts streaming through it. Frame 0 is the
// clickbait cover: the crowd itself, already moving through the
// gate, the hero shocked BESIDE it, the claim text GIANT. Shot 1
// returns as shot 7 (golden hour, students pouring OUT) for the loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 33.105 s; line starts (s): 0.06, 5.17, 9.92, 15.48, 20.90, 24.32, 27.83.
export const L: number[] = [2, 155, 298, 464, 627, 730, 835, 993];
export const TOTAL = L[7];
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
// The school plaza runs along Z: paved plaza x -16..16, from z +28
// (foreground) to the GATE at z = -16, then the school BUILDING
// front at z = -36 (3 floors, red banner). The convoy lane runs
// along x 8..12. Parents wait on the WEST side (x -13..-8) behind
// a police cordon. The construction site (silent crane) sits EAST
// at x ~18. The EXAM HALL interior is a separate stage set WEST
// at x -50..-34, z -22..-36 (blackboard on the far wall z = -36).
export const GATE_Z = -16;
export const SCHOOL_Z = -36;
export const HERO_SPOT: V3 = [4.9, 0, -2];
export const HALL_C: V3 = [-42, 0, -29];
export const PARENTS_C: V3 = [-10.5, 0, -1];

/** The student crowd streaming through the gate. dir = -1 walks
 *  INTO the school (shot 1, toward -Z), dir = +1 walks OUT
 *  (shot 7, toward +Z). Each student has a fixed lane x and a
 *  phase offset so the crowd never marches in lockstep. */
export type CrowdDir = -1 | 1;
export const crowdAt = (id: number, tSec: number, i: number, dir: CrowdDir): { x: number; z: number; phase: number } => {
  const s = SHOTS[id - 1];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  const lanes = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, -3.0, -1.8, -0.6, 0.6, 1.8, 3.0, -4.2, 4.2];
  const x = lanes[i % lanes.length];
  const z0 = dir < 0 ? 14 - (i % 5) * 4.5 : -14 + (i % 5) * 4.5;
  const z = z0 + dir * u * 22;
  return { x, z, phase: (tSec * 1.5 + i * 0.37) % 1 };
};

/** The police convoy (shot 3): two vans + escort, crawling down
 *  the convoy lane toward the gate. */
export const convoyAt = (tSec: number, k: number): { x: number; z: number } => {
  const s = SHOTS[2];
  const a = s.a / FPS, b = s.b / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return { x: 10, z: 12 - u * 20 - k * 6.5 };
};

/** The sealed exam box on the gate table (shot 6): lid lifts with U. */
export const boxLidAt = (tSec: number): number => {
  const s = SHOTS[5];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return smooth((u - 0.25) / 0.6);
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHTS: Light[] = ["day", "day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 7).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHTS[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8 };
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

// The cover camera: low over the plaza, looking at the gate — the
// student crowd big in the mid-ground, the school building + red
// banner stacked behind, the claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.4, 22], look: [0, 3.2, -18] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // EXAM HALL: low inside the room, rows of desks running away to the blackboard
      return full(dolly([-36.5, 2.1, -23.5], [-44, 1.1, -34], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: { // TRACKING the convoy down the lane toward the gate —
      // pulled back + higher so the vans read as a convoy (not a
      // blue wall) and the near-side escort police stay in frame
      const cv = convoyAt(f / FPS, 0);
      return full({ pos: [cv.x + 7, 4.2, cv.z + 13], look: [cv.x - 2, 1.3, cv.z - 7], fov: 46 });
    }
    case 4: // HIGH WIDE: the whole lockdown — plaza, barriers, crane, drone, plane
      return full(dolly([-9, 8.5, 16], [5, 2.2, -28], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 5: // MEDIUM on the waiting parents behind the cordon —
      // shifted right so the west tree canopy leaves the frame
      return full(dolly([-2.0, 2.0, 7], [-10.5, 1.5, -1], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 6: // CLOSE on the gate table: the sealed box opens
      return full(dolly([1.5, 2.2, -4], [3.5, 1.7, -15], Math.exp(-0.0006 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [-42, 1.2, -30] };
    case 3: return { f: 0, cInf: 0.8, focus: (ff) => { const cv = convoyAt(ff / FPS, 0); return [cv.x, 1.4, cv.z]; } };
    case 4: return { f: 0, cInf: 0.4, focus: () => [4, 2, -20] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [-10.5, 1.5, -1] };
    case 6: return { f: 0, cInf: 1.0, focus: () => [3.5, 1.7, -15] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
