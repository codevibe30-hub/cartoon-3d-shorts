// Timeline of the Lempar HP short (±32.6 s, Fafnir-ID format,
// bottom two-word subtitles). Mobile Phone Throwing World
// Championship, Savonlinna, Finland, since 2000: distance,
// freestyle and junior categories, organiser-supplied phones
// recycled after the event. World record 101.46 m (Ere
// Karjalainen, 18, Nokia, 2012). Organiser Fennolingua.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json (assembled VO
// 37.51 s, atempo 1.15 -> 32.60 s to hit the 30-35 s target);
// every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: a Savonlinna throwing field in bright Nordic
// daylight — green field, white throwing line, distance boards,
// pine trees lining the sides, a blue lake behind, wooden cabins.
// Frame 0 is the clickbait cover: a GIANT PHONE flying through
// the sky big and ALREADY MOVING (spinning, motion lines), the
// thrower mid-throw, the hero shocked BESIDE it, the claim text
// GIANT. The approved cover design is shot 1 and returns as
// shot 7 for the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing from voice/line_starts.json (assembled VO 37.51 s,
// atempo 1.15 -> 32.60 s). Line starts (frames):
// 2, 153, 266, 395, 542, 728, 857; TOTAL 978 = 32.60 s
export const L: number[] = [2, 153, 266, 395, 542, 728, 857, 978];
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
// A grass throwing field runs along Z, camera side is +Z.
// The white throwing line crosses the field at z ~ -6; distance
// grows as z decreases (50 m board at z ~ -14, 100 m at z ~ -24).
// Pine trees line both sides from |x| = 6; a blue lake lies far
// behind (-z); wooden cabins stand on the RIGHT (x ~ +8).
// The GIANT FLYING PHONE is the hook prop (a billboard in
// cast.ts), high in the sky over the field.
// The hero + thrower + judge stand NEAR THE CAMERA AXIS —
// portrait half-FOV is only ~13.4 deg, so anyone at |x| > 3,
// z < -3 is off-frame (Santa v1 lesson: spots at x 3.6/5.6
// never appeared in any shot). Every spot below was checked
// against its shot camera axis (hero ~4 deg, thrower ~9 deg
// from the cover camera); shots 3-6 use per-shot positions
// computed against their own camera axis, never one shared spot.
export const PATH_HALF = 2.5;
export const ROAD_HALF = 2.5;
export const WALK_R = 4.3; // right field edge centre
export const WALK_L = -4.3; // left field edge centre
export const HERO_SPOT: V3 = [1.2, 0, -2.0];
export const THROWER_SPOT: V3 = [-0.8, 0, -2.6];
export const JUDGE_SPOT: V3 = [0.4, 0, -3.4];
export const BIN_SPOT: V3 = [0.2, 0, -4.2];
export const SIGN_POS: V3 = [7.5, 0, -10];
export const BOARD50_POS: V3 = [-3.4, 0, -14];
export const BOARD100_POS: V3 = [3.4, 0, -24];
// Phones drift across the sky while the field is on screen.
export const leavesAt = (tSec: number): number => (tSec * 0.7) % 1;
// The flying phone's spin phase, driven by shot time.
export const tailAt = (tSec: number): number => Math.sin(tSec * 1.6) * 0.35;

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

// The cover camera: low on the field, looking down the throwing
// lane — the GIANT PHONE big across the sky, the thrower
// mid-throw, the hero at the right edge, the claim card centred
// up-frame. Portrait half-FOV is only ~13-15 deg, so the phone
// stays within ~10 deg of the axis.
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
    case 2: // HIGH WIDE: over the field centre so no near pine can
      // cross the frame (house lesson: a near facade hid the
      // truck + card) — the whole field + lake + cabins + boards
      return full(dolly([0.5, 6.0, 13], [-0.5, 1.2, -12], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the thrower winding up with the phone
      return full(dolly([2.6, 2.0, 1.5], [-0.8, 1.3, -3.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // FREESTYLE: the thrower mid-trick, judge scoring
      return full(dolly([4.2, 2.2, 3.0], [0.2, 1.2, -4.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // THE RECORD: the 101.46 m throw, crowd cheering
      return full(dolly([5.0, 2.6, 4.0], [0.5, 1.2, -5.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 6: // THE RECYCLE: the green bin full of old phones
      return full(dolly([4.6, 2.0, 2.5], [0.8, 1.2, -4.5], Math.exp(-0.0004 * lf), { fov: 42 }));
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
    case 3: return { f: 0, cInf: 0.95, focus: () => [-0.8, 1.3, -3.5] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [0.2, 1.3, -4] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0.5, 1.3, -5] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [0.8, 1.0, -4.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [-0.5, 1.6, -8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
