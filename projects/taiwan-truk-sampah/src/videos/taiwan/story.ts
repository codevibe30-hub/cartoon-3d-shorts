// Timeline of the Taiwan garbage-truck short (±34 s, Fafnir-ID format,
// bottom two-word subtitles). Taipei: yellow garbage trucks play
// Beethoven's Für Elise and residents bring their sorted trash out
// themselves — no curbside bins, "garbage doesn't touch the ground".
// Trucks run 5 nights a week; recycling rose from ~5% to >50%.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a Taipei residential street at dusk, apartment blocks
// both sides, the YELLOW garbage truck rolling down the street with
// music notes floating. Frame 0 is the clickbait cover: the TRUCK
// itself big and ALREADY MOVING (rolling toward camera, notes
// drifting), residents chasing with bags, the hero shocked BESIDE
// it, the claim text GIANT. The approved cover design is shot 1
// and returns as shot 7 for the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing PATCHED from voice/line_starts.json (assembled VO 29.355 s).
// Line starts (frames): 2, 109, 256, 375, 502, 631, 762; TOTAL 936 = 31.2 s
// (VO ends frame ~878, 1.9 s music tail for the golden loop).
export const L: number[] = [2, 109, 256, 375, 502, 631, 762, 936];
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
// A Taipei residential street runs along Z, camera side is +Z.
// The road is x in [-3.4, 3.4]; sidewalks x in [3.4, 5.2] and
// [-5.2, -3.4]; apartment blocks line both sides from |x| = 6.
// The yellow garbage truck runs along the road centre (x = 0),
// nose toward +Z (toward camera) in shots 1-3, driving away (-Z)
// in shots 4-5, stopped at the curb in shots 3 and 6.
// The hero stands on the right sidewalk near the camera.
// Music notes float above the truck whenever it plays.
export const ROAD_HALF = 3.4;
export const WALK_R = 4.3; // right sidewalk centre
export const WALK_L = -4.3; // left sidewalk centre
export const HERO_SPOT: V3 = [3.6, 0, -1.5];
export const CREW_SPOTS: V3[] = [[2.6, 0, -5.2], [4.4, 0, -3.4], [-2.8, 0, -6.0]];
export const TRUCK_HOME: V3 = [0, 0, -4];
export const BAG_SPOTS: V3[] = [[2.9, 0, -4.6], [3.5, 0, -4.0], [4.1, 0, -4.6]];
// The truck's nose position (z) per shot: it rolls toward the
// camera in shot 1, approaches in shot 2, stops in 3 and 6,
// drives away in 4 and 5, returns for the golden loop in 7.
export const truckZAt = (id: number, tSec: number): number => {
  const s = SHOTS[id - 1];
  const u = clamp01((tSec - s.a / FPS) / Math.max(0.01, (s.b - s.a) / FPS));
  switch (id) {
    case 1: return -11 + u * 5; // -11 -> -6, rolling in
    case 2: return -16 + u * 8; // -16 -> -8, approaching
    case 3: return -4.5; // stopped at the curb
    case 4: return -6 - u * 7; // -6 -> -13, driving away as hero chases
    case 5: return -9 - u * 5; // passing behind the confused newcomer
    case 6: return -4.5; // stopped again for sorting
    default: return -8 + u * 2; // golden loop: easing back in
  }
};
// Music notes drift up from the truck's speaker while it plays.
export const notesAt = (tSec: number): number => (tSec * 0.9) % 1;

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const LIGHTS_OF_SHOT: Light[] = ["day", "day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 7).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: LIGHTS_OF_SHOT[i] as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10 };
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

// The cover camera: low on the sidewalk, looking down the street —
// the TRUCK big across the centre, the hero at the right edge,
// the claim card centred up-frame. Portrait half-FOV is only
// ~13-15 deg, so the truck stays within ~10 deg of the axis.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [2.8, 2.2, 6.5], look: [-0.6, 1.6, -8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: over the road centre so no near building can
      // cross the frame (v1: camera at x=8.5 put a blurry facade over
      // 70% of the shot and hid the truck + the FÜR ELISE card)
      return full(dolly([0.5, 6.0, 13], [-0.5, 1.2, -12], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the hero + neighbour handing bags to the crew
      return full(dolly([4.6, 2.0, 1.2], [1.8, 1.3, -4.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // THE CHASE: hero running after the truck, waving
      return full(dolly([-5.2, 2.4, 3.5], [0.8, 1.3, -7], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // THE ICE-CREAM MIX-UP: hero with coins, truck passing behind
      return full(dolly([4.2, 2.0, 2.5], [1.6, 1.3, -5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 6: // SORTING: three coloured bags on the sidewalk, crew sorting
      // v1: camera 2.4 m from the hero made his head fill half the frame
      // and cut the 5% JADI 50% card — pulled back to ~5 m like shot 3
      return full(dolly([5.6, 2.8, 3.2], [2.0, 1.0, -4.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1.5, -9] };
    case 3: return { f: 0, cInf: 0.95, focus: () => [2.2, 1.3, -4.5] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [0.8, 1.3, -7] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [1.6, 1.3, -5] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [2.4, 0.9, -4.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [-0.5, 1.6, -8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
