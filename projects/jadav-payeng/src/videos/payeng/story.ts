// Timeline of the Jadav Payeng short (MAKS 35 s, Fafnir-ID
// format, bottom two-word subtitles). India: one man planted a
// 550-hectare forest ALONE on a Brahmaputra sandbar — started
// 1979 at 16 after finding dead snakes, from 20 bamboo
// seedlings, now home to elephants, rhinos and tigers; forest
// officials only found out in 2008.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a towering green forest wall on a golden sandbar
// beside the wide Brahmaputra. Frame 0 is the clickbait cover:
// the FOREST itself, already big and swaying, young Jadav planting
// a sapling in the foreground, the hero shocked BESIDE him, the
// claim card giant. Shot 6 returns to the cover (golden hour,
// old Jadav among giant trees) for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 30.208 s; line starts (s): 0.06, 3.49, 9.7, 16.24, 21.22, 26.65.
// "550" spoken at 1.90 s (<2 s ✓).
export const L: number[] = [2, 105, 291, 487, 637, 800, 906];
export const TOTAL = L[6];
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
// The sandbar runs along Z: golden sand foreground (z +28 to -8),
// the wide Brahmaputra river strip (z -10..-22), then the dense
// Molai FOREST wall (z -24..-120). Saplings Jadav plants stand
// in a row across the sand at z ~2. Animals gather in the forest
// clearing at z ~-12 (shot 5).
export const RIVER_Z = -16;
export const FOREST_Z = -26;
export const HERO_SPOT: V3 = [2.6, 0, 5]; // inside cover-cam portrait FOV (was 5.4: out of frame)
export const JADAV_SPOT: V3 = [-2.6, 0, 4]; // inside cover-cam portrait FOV (was -4.4: out of frame)
export const SAPLING_ROW_Z = 2;
export const ANIMAL_C: V3 = [0, 0, -12];
export const SNAKE_C: V3 = [1.5, 0, -4];

/** Sapling growth (shot 3): the planted saplings grow from a
 *  fresh seedling to a young tree across the shot — a time-lapse
 *  in one take. Returns the scale multiplier for shot-local time. */
export const saplingAt = (tSec: number): number => {
  const s = SHOTS[2];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return 0.3 + smooth(u) * 1.3;
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHTS: Light[] = ["day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 6).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHTS[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8 };
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

// The cover camera: low over the sandbar, looking into the forest
// — the giant forest wall big in the mid-ground, the claim card
// centred up-frame, Jadav planting in the near foreground.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.3, 21], look: [0, 3.4, -20] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 6:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // THE SANDBAR 1979: low on the bare sand — dead snakes, blazing sun, young Jadav kneeling
      return full(dolly([-6, 1.6, 12], [2, 0.6, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // THE PLANTING: medium on the sapling row — Jadav waters, saplings grow before your eyes
      return full(dolly([6.5, 2.2, 10], [-3, 1.2, -2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: // THE FOREST NOW: high wide — the grown Molai forest wall, river glinting in front
      return full(dolly([-10, 9, 18], [4, 3, -34], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 5: // THE WILDLIFE: medium on the clearing — elephants, rhino, tiger; old Jadav proud
      return full(dolly([5, 2.4, 2], [-2, 1.6, -14], Math.exp(-0.0005 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [JADAV_SPOT[0], 1.0, JADAV_SPOT[2]] };
    case 3: return { f: 0, cInf: 0.5, focus: () => [-2, 1.2, SAPLING_ROW_Z] };
    case 4: return { f: 0, cInf: 0.4, focus: () => [0, 3, FOREST_Z] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [ANIMAL_C[0], 1.6, ANIMAL_C[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
