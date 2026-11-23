// Timeline of the Kakaban short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Danau Kakaban, Kalimantan Timur:
// a prehistoric marine lake trapped inside a coral island in the
// Derawan archipelago — home to MILLIONS of stingless jellyfish
// (four species), cut off from predators for thousands of years
// until their sting retired itself. The island's name means
// "the island that hugs" — the punchline loop.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright tropical daylight, turquoise-green lake
// water, golden jellyfish pulsing everywhere, jungle karst ridge
// (the 50 m wall) closing the far shore. Frame 0 is the clickbait
// cover: the hero's SHOCK face in a small boat, GIANT jellyfish
// looming around him, the claim text GIANT. The cover framing is
// shot 1 and returns as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [1, 199, 395, 556, 732, 904, 1073, 1257, 1416, 1571, 1767];
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
// The lake surface is y = 0, stretching x -75..75 and z +30 down
// to -150. The near shore (camera side) is z ~ +16, where a wooden
// jetty reaches into the water at JETTY_X. The jungle karst ridge
// (the 50 m wall that traps the lake) closes the far shore at
// RIDGE_Z. The hero's boat floats in the near foreground at
// HERO_BOAT, hero standing in it. A pale sand bar (the shallows
// where the upside-down Cassiopea rest) lies at SAND_BAR.
export const HERO_BOAT: V3 = [1.2, 0, 9.5];
export const JETTY_X = 7.5;
export const RIDGE_Z = -122;
export const LAKE_C: V3 = [0, 0, -45];
export const SAND_BAR: V3 = [-8.5, 0, -4];

// The hero's boat drift (shot 3): he putters slowly forward into
// the jellyfish field while the camera rides alongside — in
// Kakaban even a sightseeing lap is a swim through jellyfish.
// Every other shot the boat sits at HERO_BOAT with its cover yaw.
// world.ts (the mesh) and cast.ts (the hero sprite) both read
// this, so feet and hull never part company.
export const heroBoatAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  if (id !== 3) return { x: HERO_BOAT[0], z: HERO_BOAT[2], yaw: -0.28 };
  const a = L[2] / FPS, b = L[3] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return {
    x: HERO_BOAT[0] + (-0.6 - HERO_BOAT[0]) * u,
    z: HERO_BOAT[2] + (-5 - HERO_BOAT[2]) * u,
    yaw: -0.28 + 0.18 * u,
  };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: "day" as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10, 8: 6, 9: 8, 10: 8 };
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

// The cover camera: low over the water, looking across the lake —
// the hero's boat big in the near foreground, giant jellyfish
// looming left and right, the claim card centred up-frame, the
// green karst ridge stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 2.5, 17], look: [0, 2.0, -18] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition (k = 1 at the
      // shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole lake in one sweep, ridge at the end
      return full(dolly([14, 13, 24], [0, 0, -55], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // TRACKING: ride alongside the hero's boat into the jelly field
      const bp = heroBoatAt(3, f / FPS);
      return full({ pos: [bp.x + 6.8, 2.3, bp.z + 8.5], look: [bp.x, 1.0, bp.z - 1], fov: 42 });
    }
    case 4: // WATER-LEVEL CLOSE on the hero and the giant jelly beside him
      return full(dolly([-4.6, 1.35, 15.5], [HERO_BOAT[0], 1.15, HERO_BOAT[2]], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 5: // LOW ANGLE across the water, looking UP at the karst wall
      return full({ pos: [5.5, 2.1 + lf * 0.004, -28], look: [-6, 10, RIDGE_Z], fov: 44 });
    case 6: // SURFACE CALM: skimming the warm pool, jellies glowing below the ripples
      return full(dolly([-4.6, 1.8, 14.6], [1.2, 0.8, 9.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // THE SHALLOWS: low over the sand bar where Cassiopea lie upside-down
      return full(dolly([5.8, 2.5, 14.8], [-6.8, 0.2, -4.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 8: // MEDIUM on the jetty: the rules of the lake, enforced by the hero
      return full(dolly([4.2, 2.0, 15.5], [7.6, 1.0, 5.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 9: // REVERSE WIDE from the far shore, looking back across the whole lake
      return full(dolly([-6, 7, -68], [2, 1, -8], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 0, -55] };
    case 3: return { f: 0, cInf: 0.8, focus: (ff) => { const bp = heroBoatAt(3, ff / FPS); return [bp.x, 1.0, bp.z]; } };
    case 4: return { f: 0, cInf: 0.95, focus: () => [HERO_BOAT[0], 1.15, HERO_BOAT[2]] };
    case 5: return { f: 0, cInf: 0.5, focus: () => [-6, 9, RIDGE_Z] };
    case 6: return { f: 0, cInf: 0.85, focus: () => [-1, 0.2, -8] };
    case 7: return { f: 0, cInf: 0.9, focus: () => [SAND_BAR[0], 0.1, SAND_BAR[2]] };
    case 8: return { f: 0, cInf: 0.85, focus: () => [JETTY_X, 1.3, 7] };
    case 9: return { f: 0, cInf: 0.4, focus: () => [0, 0, -50] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_BOAT[0], 1.3, HERO_BOAT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
