// Timeline of the Trunyan short (±58 s, Fafnir-ID format,
// bottom two-word subtitles). Trunyan, Bali: a Bali Aga village
// on the eastern shore of Lake Batur whose dead are NOT buried
// and NOT cremated — in the Mepasah tradition the body, wrapped
// in white cloth, is laid on the open ground inside a triangular
// bamboo cage (ancak saji) beneath the giant taru menyan tree.
// The tree's fragrance neutralises the smell of decay entirely.
// Only 11 cages fit under the tree; Sema Wayah is reserved for
// married villagers who died naturally; when a new body arrives
// the oldest bones move to a stone altar. The cemetery is
// reachable only by boat across the lake. TONE: respectful awe
// at a sacred Bali Aga tradition — the joke is the tree working
// as a natural air freshener for a whole village, never the dead.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: the shore of Lake Batur at bright daylight — the
// lake rippling in the foreground, a wooden boat bobbing at the
// shore, and the cemetery clearing: the GIANT taru menyan tree
// with a vast layered canopy, 11 bamboo cages in an arc beneath
// it, a mossy stone altar with skulls, Mount Batur behind.
// Frame 0 is the clickbait cover: THE TREE + CAGES THEMSELVES,
// huge, leaves already swaying, lake already rippling, the hero
// BIG beside them, shocked, never covering the cages. The cover
// returns as shot 10 for the punchline loop (the hero laughing).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json.
// VO total 50.943 s = 1528 frames. Starts (s): 0.06, 5.19, 10.24, 15.24, 19.34, 27.20, 33.10, 36.61, 40.96, 45.08.
export const L: number[] = [2, 156, 307, 457, 580, 816, 993, 1098, 1229, 1352, 1528];
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
// The shore runs along z = 8: LAND for z < 8 (the cemetery
// clearing, the village), LAKE for z > 8 (rippling water out to
// the horizon +z). THE GIANT TARU MENYAN TREE stands at
// (0, 0, -20): a massive trunk, a canopy ~22 m wide centred
// ~13 m up. ELEVEN ancak saji bamboo cages arc beneath it at
// radius ~6.5 (angles spread across the lake-facing side). The
// FEATURED cage (shot 3's close-up) is CAGE_CLOSE. The mossy
// STONE ALTAR with its row of skulls stands at ALTAR. A stone
// path runs from the shore jetty (0, 0, 7) to the clearing.
// The wooden BOAT bobs on the water at BOAT, bow toward the
// shore. Balinese houses + a split candi bentar gate sit on the
// right at x ~16-30; Mount Batur looms far behind at (-70,-190),
// Mount Abang at (95,-210).
export const TREE: V3 = [0, 0, -20];
export const CAGE_CLOSE: V3 = [1.8, 0, -13.2];
export const ALTAR: V3 = [-8.5, 0, -15];
export const BOAT: V3 = [4.2, 0, 17];
export const SHORE_Z = 8;
// The boat's bob, shared by world.ts (the hull) and cast.ts
// (the hero standing in it): same formula, same phase.
export const boatBobAt = (tSec: number) => Math.sin(tSec * 1.25) * 0.055 + Math.sin(tSec * 2.3) * 0.02;
export const boatAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void id; void tSec;
  return { x: BOAT[0], z: BOAT[2], yaw: 0.22 };
};
// The hero stands on the ground in every shot except shot 2
// (in the boat): per-shot spot + facing look. world.ts and
// cast.ts both read this. Spots sit ON the shot camera's view
// axis (the 9:16 frame is narrow — ~13° half-width — so
// off-axis heroes leave the frame).
export const heroSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 1:
    case 10: return { x: -0.6, z: -4.5, yaw: 0.3 }; // on the cover axis, beside the cages, never covering them
    case 3: return { x: 3.1, z: -11.9, yaw: -0.35 }; // beside the featured cage at cage depth, right of the axis
    case 4: return { x: -1.7, z: -10.2, yaw: 0.25 }; // among the cages, sniffing the air
    case 5: return { x: 1.8, z: -7.6, yaw: -0.25 }; // under the canopy edge, looking up
    case 6: return { x: 5.2, z: -5.5, yaw: -0.3 }; // wide shot: at the clearing's edge
    case 7: return { x: -3.1, z: -8.8, yaw: 0.3 }; // nervous, beside the elder at the gate of the clearing
    case 8: return { x: -4.2, z: -10.8, yaw: 0.3 }; // by the stone altar
    case 9: return { x: 3.4, z: 4.6, yaw: -0.1 }; // at the shore, watching the fragrance drift out over the lake
    default: return { x: -2.7, z: -6.5, yaw: 0.3 };
  }
};
// The elder (pemangku / adat guardian): per-shot spot.
export const elderSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 7: return { x: -6.4, z: -12.2, yaw: 0.35 }; // stern at the clearing's edge, guarding the rule
    case 8: return { x: -7.4, z: -13.9, yaw: 0.3 }; // at the altar, moving the oldest skull with care
    default: return { x: -6.4, z: -12.2, yaw: 0.35 };
  }
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

// The cover camera: low on the path from the shore, looking into
// the clearing — the giant tree + its arc of bamboo cages fill
// the frame's heart, the hero big in the near foreground on the
// camera axis to the LEFT of the cages, the claim card glued to
// the view axis up-frame. NOTE (close-up lesson): no close-up
// may put the claim card over the hero's eyes — every camera
// here keeps the hero's head fully in frame with the card
// clear above it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.8, 2.6, 6.5], look: [-0.4, 4.0, -19] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // ON THE LAKE: the boat mid-frame, hero standing in it,
      // the shore + giant tree + Mount Batur behind him.
      return full(dolly([9.5, 2.9, 31], [2.8, 1.9, 10], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // CLOSE on the featured cage — bamboo lattice, the white
      // cloth bundle inside, the hero pointing beside it.
      return full(dolly([6.0, 2.2, -3.6], [1.2, 0.9, -13.2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: // MEDIUM among the cages — the hero sniffs the air,
      // puzzled, then relieved: no smell at all.
      return full(dolly([-4.6, 2.0, -6.2], [-0.4, 1.3, -14], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // LOW ANGLE up the giant trunk — the canopy fills the
      // top of the frame, fragrant motes drifting down.
      return full(dolly([3.0, 1.5, -3.4], [0, 5.6, -20], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 6: // HIGH WIDE over the whole clearing — all 11 cages
      // countable in their arc under the tree.
      return full(dolly([11.5, 8.5, 6.5], [-1, 1.0, -19], Math.exp(-0.0004 * lf), { fov: 50 }));
    case 7: // MEDIUM on the elder — stern guardian of the rule,
      // the hero nervous at his side.
      return full(dolly([-1.0, 2.1, -5.2], [-5.6, 1.5, -12.2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 8: // MEDIUM on the stone altar — the row of skulls, the
      // elder laying the oldest one down with care.
      return full(dolly([-2.4, 1.9, -8.2], [-8.2, 1.1, -15], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 9: // THE LEGEND (golden): from the shore, fragrance wisps
      // drift from the tree out across the lake toward the far
      // island silhouette — the scent that once reached Java.
      return full(dolly([6.0, 2.7, 12.5], [-1.5, 4.2, -24], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [0, 3.0, -17] };
    case 2: return { f: 0, cInf: 0.9, focus: () => [BOAT[0], 1.6, BOAT[2]] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [CAGE_CLOSE[0], 0.9, CAGE_CLOSE[2]] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-0.6, 1.3, -12] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 6.0, -20] };
    case 6: return { f: 0, cInf: 0.45, focus: () => [-1, 1.0, -19] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [-5.2, 1.5, -11.8] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [-8.0, 1.1, -14.8] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [-1, 3.5, -22] };
    default: return { f: 0, cInf: 0.9, focus: () => [-2.7, 1.3, -6.5] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
