// Timeline of the Derinkuyu short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Derinkuyu, Kapadokya, Turki: an
// ancient city carved DOWNWARD — 18 levels, ±85 m deep, room
// for 20,000 people with their livestock and food stores —
// forgotten for centuries and rediscovered in 1963 when a
// resident knocked through his own basement wall into a hidden
// room. Inside: stables, kitchens, storage, a winery, a
// barrel-vaulted school, a cruciform church, a 55 m ventilation
// shaft, a constant 13 °C, and rolling stone doors Ø 1.5 m,
// half a tonne, that only move from the inside.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: bright Anatolian morning on the surface (graded
// sky, layered clouds, fairy chimneys, stone cave houses) over
// a dollhouse CUTAWAY of the underground city — six lit gallery
// bands standing in for the 18 levels — then warm torch-lit
// interiors below. Frame 0 is the clickbait cover: the hero's
// SHOCK face big on the terrace, the glowing levels dropping
// away beneath his feet, the claim text GIANT. Shot 1 returns
// as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 166, 356, 538, 705, 870, 1033, 1205, 1405, 1547, 1751];
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
// SET A — surface + cutaway, near the origin. The plateau lies
// at y = 0; the hero stands on a stone TERRACE at HERO_SPOT on
// the plateau edge. The CUTAWAY is a dollhouse rock face whose
// open front sits at z = FACE_Z, running x -17..17 and dropping
// to y = CUT_BOTTOM: six gallery bands (BAND_Y, floor heights)
// stand in for the 18 levels, three levels per band. The main
// ventilation SHAFT pierces the block at (SHAFT_X, SHAFT_Z).
// SET B — the 1963 basement interior, far east at x = 220.
// SET C — the school + church hall, far east at x = 320.
// SET D — the rolling-door tunnel, far east at x = 420.
export const HERO_SPOT: V3 = [1.2, 0, 9.5];
export const FACE_Z = -2;
export const CUT_BOTTOM = -27;
export const BAND_Y: number[] = [-3.4, -7.6, -11.8, -16.0, -20.2, -24.4];
export const SHAFT_X = 7;
export const SHAFT_Z = -7;
export const BASE_X = 220;
export const SCHOOL_X = 320;
export const DOOR_X = 420;

/** Shot-local progress 0..1 for shot id at absolute time tSec. */
export const shotU = (id: number, tSec: number): number => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  return clamp01((tSec - a) / Math.max(0.01, b - a));
};

/** The 1963 wall break (shot 3): 0 = wall whole, 1 = wall down.
 *  Holds until the hammer has swung a while, then goes fast. */
export const wallBreakAt = (id: number, tSec: number): number => {
  if (id < 3) return 0;
  if (id > 3) return 1;
  const u = shotU(3, tSec);
  return smooth((u - 0.42) / 0.18);
};

/** The rolling stone door (shot 9): 0 = door parked in its
 *  groove beside the passage, 1 = passage sealed. */
export const doorRollAt = (id: number, tSec: number): number => {
  if (id < 9) return 0;
  if (id > 9) return 1;
  const u = shotU(9, tSec);
  return smooth((u - 0.22) / 0.5);
};

/** Where the hero stands in each shot (cast.ts places the
 *  sprite, world.ts never moves him). Default: the terrace. */
export const heroSpotAt = (id: number): V3 => {
  switch (id) {
    case 3: return [BASE_X - 2.6, 0, 3.4];       // behind the villager, watching the wall
    case 5: return [SCHOOL_X - 6.5, 0, 2.6];     // at the school hall entrance
    case 7: return [-3.5, BAND_Y[3], -6.0];       // lounging in a cool lower band
    case 9: return [DOOR_X - 0.9, 0, 2.9];       // pushing the great door shut
    default: return HERO_SPOT;
  }
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "golden", "golden", "golden", "golden", "day", "golden", "golden", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
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

// The cover camera: FAR EAST and level with the terrace rim —
// from 50+ units out, the terrace top (hero), the town, and all
// six glowing galleries fit inside one 46° frame, and every
// sight line to the face passes east of or below the terrace
// box. Closer frontal cameras are always blocked by the box;
// closer high ones see only slab tops.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [38, -2, 34], look: [0, -9, -5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const U = clamp01(lf / Math.max(1, s.b - s.a)); // shot-local progress
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition (k = 1 at the
      // shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the town + chimneys, crane settling down
      // toward the one house whose basement hides everything
      return full(dolly([17, 15, 32], [0, -3, -14], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // BASEMENT 1963: slow tracking push toward the wall
      // that is about to come down (set B at x = 220)
      return full(dolly([BASE_X + 3.6, 1.9, 8.5], [BASE_X - 0.5, 1.2, -3.2], Math.exp(-0.0006 * lf), { fov: 42 }));
    case 4: { // THE DESCENT: a frontal ant-farm descent — the
      // camera sinks in front of the open face past band after
      // lit band, drifting sideways for parallax (a camera inside
      // the bands sees only empty floor slabs)
      const y = 0.5 + (-18.5 - 0.5) * smooth(U);
      const x = -2.5 + 5.0 * U;
      return full({ pos: [x, y + 3.2, 17.5], look: [x * 0.35, y - 1.5, -6], fov: 46 });
    }
    case 5: { // SCHOOL HALL: a slow tracking shot down the hall,
      // benches and students sliding past on both sides
      const x = (SCHOOL_X - 8.5) + 15.0 * U;
      return full({ pos: [x, 2.3, 0.6], look: [x + 7, 1.7, -0.6], fov: 42 });
    }
    case 6: // THE SHAFT: from its floor, straight up 55 m of
      // carved tube to the disc of daylight; a slow rise
      return full({ pos: [SHAFT_X, -23.5 + U * 2.5, SHAFT_Z + 0.4], look: [SHAFT_X, 6, SHAFT_Z], fov: 50 });
    case 7: // TWO WEATHERS: a side elevation of the whole block —
      // blazing surface above, cool blue depths below
      return full(dolly([27, -6, 17], [0, -10, -6], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 8: // THE DOOR: low angle, the great stone disc looming
      // in its groove beside the tunnel mouth
      return full(dolly([DOOR_X - 2.2, 0.55, 8.2], [DOOR_X + 0.7, 1.35, 0], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 9: // SEALED: inside the tunnel as the door rolls across
      // and the light dies to a slit
      return full(dolly([DOOR_X + 0.3, 1.6, 7.6], [DOOR_X, 1.25, -2], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, -2, -18] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [BASE_X - 0.5, 1.3, -3.2] };
    case 4: return { f: 0, cInf: 0.6, focus: (ff) => { const c = camAt(4, ff); return [c.look[0], c.look[1], FACE_Z - 2]; } };
    case 5: return { f: 0, cInf: 0.7, focus: (ff) => { const c = camAt(5, ff); return [c.pos[0] + 6, 1.6, -0.5]; } };
    case 6: return { f: 0, cInf: 0.5, focus: () => [SHAFT_X, 0.5, SHAFT_Z] };
    case 7: return { f: 0, cInf: 0.4, focus: () => [0, -11, -6] };
    case 8: return { f: 0, cInf: 0.95, focus: () => [DOOR_X + 0.9, 1.2, 0.6] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [DOOR_X, 1.25, 0.5] };
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.6, HERO_SPOT[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
