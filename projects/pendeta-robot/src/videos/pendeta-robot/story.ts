// Timeline of the Pendeta Robot short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Mindar, Kyoto: a 195 cm android
// Kannon preaching the Heart Sutra at the 400-year-old Kodaiji
// temple — built with Prof. Hiroshi Ishiguro (Osaka University)
// for ~100 million yen, sermons pre-programmed, 25 minutes every
// weekend. Line boundaries live in the L array (start frame of
// each script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L. VISUAL CORE: bright Kyoto daylight, dark wooden
// temple hall, raked gravel zen garden, red maple + pine, gold
// accents. Frame 0 is the clickbait cover: the hero's SHOCK face
// BIG and WHOLE in the near foreground, Mindar glowing on his
// pedestal behind, the claim text GIANT. Shot 1 returns as
// shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 155, 308, 476, 653, 797, 969, 1134, 1271, 1421, 1582];
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
// The temple hall stands at the back (z -22), its dark wooden
// front + curved tile roof facing the camera. Mindar preaches on
// a stone pedestal at MINDAR_SPOT in front of the hall. A raked
// gravel zen garden fills the foreground (z +25..-10); a stone
// path runs down the middle to the hall steps. Stone lanterns
// flank the path. The sanmon gate stands far back at GATE_Z.
// The hero stands on the gravel near the camera for the cover.
export const MINDAR_SPOT: V3 = [0, 0, -12];
export const HALL_C: V3 = [0, 0, -22];
export const GATE_Z = 24; // torii at the near garden edge (behind the cover camera, in view of shot 7)
export const HERO_SPOT: V3 = [1.2, 0, 8.5]; // ~8° off the cover-camera axis (9:16 half-FOV is only ~13°)

// The hero's cover position (shot 1/10): big in the near
// foreground right, whole in frame, shock/laugh face to camera.
export const heroAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  void id;
  return { x: HERO_SPOT[0], z: HERO_SPOT[2], yaw: -0.18 };
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

// The cover camera: low over the gravel, looking up the path to
// the hall — the hero BIG in the near foreground right, Mindar
// glowing on his pedestal mid-frame, the claim card centred
// up-frame, maple + hall stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-0.5, 2.1, 17.5], look: [0.6, 2.6, -13] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole temple complex in one sweep
      return full(dolly([13, 10.5, 22], [0, 2, -32], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // CLOSE-UP: Mindar fills the frame, halo behind him
      return full(dolly([2.6, 2.7, -4.2], [MINDAR_SPOT[0], 2.7, MINDAR_SPOT[2]], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 4: // MEDIUM on the sermon: Mindar + seated visitors
      return full(dolly([-5.2, 2.2, -2.5], [0.5, 1.9, -12], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // RE-HOOK: three-quarter on Mindar + the glowing script
      return full(dolly([4.8, 2.5, -5.5], [-0.8, 2.3, -12], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 6: // LOW ANGLE on the pedestal as gold rains down
      return full(dolly([0, 1.2, 1.5], [0, 2.8, -12], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // AT THE GATE: young visitors stream in through the
      // torii, down the stone path toward the hall; camera ON the
      // path axis so the side lanterns stay out of the sightline
      return full(dolly([0.5, 2.8, -10], [0, 1.8, 20], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 8: // TWIST CLOSE: the pedestal plaque reads KANNON
      // (camera pulled back + centred so the whole plaque fits
      // and the card clears Mindar's head)
      return full(dolly([0.5, 1.8, -6.0], [0, 1.0, -11.5], Math.exp(-0.0008 * lf), { fov: 38 }));
    case 9: // LOW ANGLE UP: the wisdom glow swells around Mindar
      return full(dolly([0, 1.4, -3.5], [0, 4.2, -12], Math.exp(-0.0003 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 2, -26] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [MINDAR_SPOT[0], 2.7, MINDAR_SPOT[2]] };
    case 4: return { f: 0, cInf: 0.85, focus: () => [0.5, 2.0, -12] };
    case 5: return { f: 0, cInf: 0.85, focus: () => [-0.8, 2.3, -12] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [0, 2.5, -12] };
    case 7: return { f: 0, cInf: 0.6, focus: () => [0, 1.8, 14] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [0, 1.3, -12] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [0, 3.5, -12] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
