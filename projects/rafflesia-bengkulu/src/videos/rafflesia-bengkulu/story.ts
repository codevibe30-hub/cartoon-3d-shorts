// Timeline of the Rafflesia Bengkulu short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Bengkulu, Sumatra: Rafflesia
// arnoldii — the world's largest single flower (~1 m across,
// up to 11 kg), smelling of rotting meat to summon carrion
// flies, a holoparasite on Tetrastigma vines with no stem, no
// leaves and no roots, blooming only 5–7 days after years hidden
// inside its host. Line boundaries live in the L array (start
// frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L. VISUAL CORE: bright
// tropical daylight, deep jungle green, the brick-red flower with
// white spots. Frame 0 is the clickbait cover: the hero's SHOCK
// face big in the near foreground, the giant flower behind him,
// the claim text GIANT. Shot 1 returns as shot 10 for the
// punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 55.492 s @ 30 fps → TOTAL 1665).
export const L: number[] = [2, 139, 289, 454, 637, 807, 1021, 1179, 1376, 1532, 1665];
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
// A jungle clearing in the Bengkulu rainforest. The GIANT
// Rafflesia blooms at the centre (z −10), ~1 m across, petals
// flat on the leaf litter, facing the camera. A SECOND, smaller
// flower blooms back-left (z −13) for the pollination shot.
// The Tetrastigma host vine climbs a big tree at the left-back
// (x −6, z −14); a bud grows at its base. (v2: the vine tree was
// at the right-back [3.8, −12] — its canopy shadow fell exactly
// on the flower and read as a blue pond in the cover frame.)
// the clearing; ferns and leaf litter cover the floor. The hero
// stands on the leaf litter at the clearing's near edge.
export const FLOWER_C: V3 = [0, 0, -10];
export const FLOWER2_C: V3 = [-4.5, 0, -13];
export const VINE_SPOT: V3 = [-6.0, 0, -14];
export const BUD_SPOT: V3 = [-6.6, 0, -13.2];
export const HERO_SPOT: V3 = [-0.8, 0, -7.7]; // ~10° left of the cover-camera axis at scale 1.2 (9:16 half-FOV is only ~13°) — BIG and WHOLE, head clear of the card text, beside the flower not hiding it

// The hero's cover position (shot 1/10): big in the near
// foreground right, whole in frame, shock/laugh face to camera.
// Shot 2 (wide): he stands on the leaf litter mid-clearing, on the axis.
export const heroAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  if (id === 2) return { x: 1.8, z: -8.5, yaw: -0.18 };
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

// The cover camera: CLOSE to the flower (a 1.1 m flower at
// 23 m is a speck — v1 proved it). Camera 7 m from the flower,
// the hero BIG in the near foreground left, the giant flower
// right-of-centre behind him, the claim card centred up-frame,
// jungle trees stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.0, 1.7, -3.0], look: [-0.4, 0.7, -10] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // MEDIUM (not a high wide — a 1.1 m flower is a
      // speck at 30 m): the hero stands BESIDE the flower for
      // scale — the bloom reaches his waist — jungle behind
      return full(dolly([3.5, 2.2, -1.5], [-0.5, 0.8, -10], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // CLOSE-UP: the giant flower fills the frame — thick
      // red petals, white spots, the hero's hand on a petal edge
      // (camera CLOSE: 1.9 m — at 6 m the 1 m flower would be 14% of frame)
      return full(dolly([0.4, 1.0, -8.1], [0, 0.45, -10], Math.exp(-0.0006 * lf), { fov: 38 }));
    case 4: // THE SMELL: hero pinching his nose at the flower,
      // flies orbiting, green stink waves curling up
      return full(dolly([2.6, 1.7, -6.2], [0, 0.8, -10], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // POLLINATION: BOTH flowers in one frame — a fly
      // carries pollen from flower one to flower two.
      // Camera 13 m back on the arc's mid-line: the 24° horizontal
      // FOV cannot fit both flowers (4.9 m apart) any closer —
      // v1 at 5 m put the main flower 39° off-axis and cut it.
      // Both flowers small but whole at the frame edges, the
      // pollen fly centred on its arc.
      return full(dolly([-2.25, 3.2, 3.5], [-2.25, 0.4, -11.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 6: // THE HOST VINE: Tetrastigma climbing the big tree,
      // hero pointing at the vine base where the bud emerges
      // (camera 8.3 m back: at 5.7 m the 24° horizontal FOV left
      // no room for both the hero and the bud in frame)
      return full(dolly([-2.5, 2.0, -6.5], [-6.0, 1.2, -14], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // THE BUD, TIME-LAPSE: the bud grows from a knob to
      // a cabbage-sized bloom-to-be (camera close: 2.6 m)
      return full(dolly([-6.0, 1.1, -10.8], [-6.5, 0.4, -13.4], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 8: // THE WILT: the flower droops and blackens, the hero
      // sad beside it (camera close: 3.2 m)
      return full(dolly([1.6, 1.9, -5.6], [0, 0.5, -10], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 9: // NATIONAL FLOWER: hero + flower + the red-white
      // flag + a golden ribbon, pride of Indonesia
      return full(dolly([0, 2.2, -1.5], [0, 1.4, -10], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 2, -16] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [0, 0.45, -10] };
    case 4: return { f: 0, cInf: 0.85, focus: () => [0, 0.8, -10] };
    case 5: return { f: 0, cInf: 0.85, focus: () => [-2.25, 0.6, -11.5] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [-6.0, 1.2, -14] };
    case 7: return { f: 0, cInf: 1.0, focus: () => [-6.5, 0.4, -13.4] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [0, 0.5, -10] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [0, 1.4, -10] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
