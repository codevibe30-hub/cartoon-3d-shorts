// Timeline of the Gajah Lampung short (MAKS 35 s, Fafnir-ID
// format, bottom two-word subtitles). Lampung: in Way Kambas,
// tame Sumatran elephants are TRAINED as forest patrol — they
// walk the jungle with rangers, push wild herds back from the
// villagers' crops, and guard against poachers. One adult eats
// up to 300 kg a day and weighs up to 4 tons — yet it is the
// forest's guardian. Meanwhile the wild population has fallen
// 80% in 75 years and only ~200 are left in Way Kambas.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a towering green Way Kambas forest wall on a
// jungle patrol path, golden light. Frame 0 is the clickbait
// cover: the PATROL ELEPHANT itself, already big and walking,
// the hero shocked BESIDE it, the ranger on the other side, the
// claim card giant. Shot 6 returns to the cover (golden hour)
// for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 30.513 s = 915 frames; line starts [2, 110, 279, 474, 676, 813].
export const L: number[] = [2, 110, 279, 474, 676, 813, 915];
export const TOTAL = L[6];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => { const u2 = clamp01(u); return u2 * u2 * u2; };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x1 - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- shared geography (world.ts + cast.ts MUST match) ----------------
// The patrol path runs along Z: grass clearing foreground (z +28
// to -8), then the dense Way Kambas FOREST wall (z -24..-120).
// The village crop field edges the path on the right (x +10..+22,
// z -4..-18). The stump field (cleared land) edges it on the
// left in shot 4 (x -20..-6, z -10..-26).
export const FOREST_Z = -26;
export const PATH_Z = 2;
export const HERO_SPOT: V3 = [2.4, 0, 5]; // inside cover-cam portrait FOV
export const RANGER_SPOT: V3 = [-2.2, 0, 3]; // inside cover-cam portrait FOV
export const ELEPHANT_C: V3 = [0, 0, -2]; // patrol elephant, cover
export const HERD_C: V3 = [2, 0, -10]; // wild herd, shot 2
export const FOOD_PILE: V3 = [0.86, 0, -3.8]; // food mountain, shot 3 ONLY (hidden in all other shots) — in front of the elephant, on the shot-3 camera axis
export const LONE_C: V3 = [0, 0, -10]; // lone elephant, shot 5
// The patrol elephant's spot per shot (world.ts poses it here;
// cast.ts anchors cards on it). Shot 2: beside the herd at the
// crop edge. Shot 3: at the food pile. Shot 4: at the forest /
// stump-field boundary. Shot 5: alone in the mist.
export const ELEPHANT_AT: Record<number, V3> = {
  1: [0, 0, -2], 2: [0.8, 0, -8.5], 3: [0, 0, -5],
  4: [0, 0, -14], 5: [0, 0, -10], 6: [0, 0, -2],
};
// The wild herd (shot 2 only): three smaller elephants near the crops.
export const HERD_AT: V3[] = [[3.0, 0, -11], [4.5, 0, -13], [1.5, 0, -13]];

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

// The cover camera: low on the patrol path, looking into the
// forest — the giant patrol elephant big in the mid-ground, the
// claim card centred up-frame, hero + ranger in the foreground.
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
    case 2: // THE PATROL: medium across the path — patrol elephant + ranger, wild herd by the crops
      return full(dolly([-7, 2.4, 4], [4, 1.2, -12], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // THE MEAL: pulled back + raised — the whole elephant + head + trunk + pile in frame (round 1 had the camera inside the elephant's flank)
      return full(dolly([4.5, 2.6, 5], [0, 1.8, -5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // THE LOSS: high wide from the path axis — round 1's camera sat behind a side tree that filled the frame; this one looks down the stump-field axis, elephant centred
      return full(dolly([2, 11, 22], [-4, 1, -18], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 5: // THE LONE ONE: medium in the misty clearing — a single elephant, hero + ranger sombre
      return full(dolly([4, 2.4, 3], [-1, 1.6, -12], Math.exp(-0.0005 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [HERD_C[0], 1.4, HERD_C[2]] };
    case 3: return { f: 0, cInf: 0.9, focus: () => [ELEPHANT_C[0], 1.5, ELEPHANT_C[2]] };
    case 4: return { f: 0, cInf: 0.4, focus: () => [0, 2, FOREST_Z] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [LONE_C[0], 1.6, LONE_C[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
