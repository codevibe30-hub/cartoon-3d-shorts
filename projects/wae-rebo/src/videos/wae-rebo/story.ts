// Timeline of the Wae Rebo short (±52 s, Fafnir-ID format,
// bottom two-word subtitles). Wae Rebo, Flores: a Manggarai
// village at 1,200 m where SEVEN giant cone houses (Mbaru Niang)
// stand in a ring around the compang stone altar — five storeys
// each, no nails, no road in, no phone signal. Seven houses for
// seven guardian peaks; only four houses survived to 2008, the
// community rebuilt three and won UNESCO's 2012 Award of
// Excellence (NOT a World Heritage Site — never say that).
// Visitors ask the ancestors' permission first (Waelu'u).
// TONE: a living, honoured adat village — respect it. The humour
// is only in how remote it is (signal gives up, hours of walking),
// never at the adat, the ancestors, or the ceremony.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright mountain morning, green saddle plateau,
// seven thatch cones in a ring, cloud sea drifting below the rim,
// forested ridges all around. Frame 0 is the clickbait cover: THE
// VILLAGE ITSELF big in the frame, mist + clouds already moving
// from the first frame, the hero BIG beside it, shocked, never
// covering the houses. The approved cover design is shot 1 and
// returns as shot 10 for the punchline loop (the hero laughing,
// village behind in the clouds).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json.
// VO total 52.159 s = 1565 frames. Starts (s): 0.06, 7.02, 11.74, 17.01, 21.64, 26.80, 31.00, 36.12, 40.15, 45.54.
export const L: number[] = [2, 211, 352, 510, 649, 804, 930, 1084, 1204, 1366, 1565];
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
// The village sits on a grassy mountain saddle around z = -10:
// seven Mbaru Niang cone houses in a ring (radius 18 m) around the
// compang, a round stone altar at the village heart. Niang Gendang,
// the main house, stands at the back of the ring (z = -28). The
// saddle is ringed by forested ridges; a cloud sea drifts below
// the rim. A dirt trek path climbs in from the foreground (+Z) to
// the village. Coffee gardens grow along the trail. The build site
// (a house being re-thatched) is open ground east of the ring.
// NOTE (stills-check 2026-11-25, round 2): the first ring was
// radius 13 m — arc spacing 11.7 m against 11 m-wide houses, so
// the houses nearly touched and EVERY camera inside 30 m saw a
// wall of cones. Radius 18 m gives 16.2 m spacing and ~5 m gaps.
export const COMPANG: V3 = [0, 0, -10];
export const HOUSES: { pos: V3; main?: boolean }[] = [
  { pos: [0, 0, -28], main: true },      // Niang Gendang (main house, back)
  { pos: [-14.1, 0, -21.2] },
  { pos: [-17.6, 0, -6.0] },
  { pos: [-7.9, 0, 6.2] },
  { pos: [7.9, 0, 6.2] },
  { pos: [17.6, 0, -6.0] },
  { pos: [14.1, 0, -21.2] },
];
export const BUILD_SITE: V3 = [24, 0, -10];
export const TRAIL_SPOT: V3 = [0, 0, 18];
// Seven guardian peaks on the far ridge (shot 6): x, z, height.
export const PEAKS: [number, number, number][] = [
  [-45, -62, 24], [-30, -66, 27], [-15, -60, 21], [0, -68, 29],
  [15, -61, 22], [30, -66, 26], [45, -62, 23],
];
// The hero stands on the ground in every shot (no boat here):
// per-shot spot + facing yaw. world.ts and cast.ts both read this.
export const heroSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 1:
    case 10: return { x: 1, z: 5, yaw: 0.35 }; // on the axis, clear of the house edge at x=2.4 (round 5)
    case 2: return { x: 0, z: 10, yaw: -0.2 }; // open path south of the ring (visible from high wide)
    case 3: return { x: 0, z: 18, yaw: -0.1 }; // hiking up the trail
    case 4: return { x: 1, z: -14, yaw: -0.5 }; // inside the ring, on the camera axis (round 4)
    case 5: return { x: -6, z: -13, yaw: -0.6 }; // before the cutaway house
    case 6: return { x: 0, z: -2, yaw: 0 }; // on the ground below the peaks' axis (round 6)
    case 7: return { x: 22, z: -2, yaw: -0.4 }; // in front of the build frame (round 5: at (21,-8) he hid behind it)
    case 8: return { x: 0, z: 4, yaw: 0.15 }; // the south village green (open ground, clear of the ring)
    case 9: return { x: 1.5, z: -8, yaw: 0.3 }; // kneeling by the compang
    default: return { x: 5.5, z: 6, yaw: 0.35 };
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

// The cover camera: OUTSIDE the ring, across the saddle, looking
// at the ring of cone houses — the houses BIG in the frame's
// heart, mist drifting through, the hero big in the near
// foreground right, the claim card glued to the view axis
// up-frame. NOTE (stills-check 2026-11-25): the first cover
// camera sat at [7, 3.2, 14] — INSIDE the ring's reach, one
// 12 m cone filled the whole frame, the card was cut off and the
// hero invisible. The village ring is compact (radius 13 m) and
// the houses are tall — NO camera may sit inside the ring.
// NOTE (Okinoshima lesson): no close-up may put the claim card
// over the hero's eyes — every camera here keeps the hero's head
// fully in frame with the card clear above it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [4, 6, 34], look: [-2, 4, -14] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 44 }));
    case 2: // HIGH WIDE: the whole saddle — village ring, ridges, cloud sea below.
      // Round 7 (midpoint check caught it): the old camera at
      // (20, 18, 28) sat 30 m from the south-east house, which
      // filled the frame's bottom 2/3 and hid the hero. Centred
      // on the south axis now — hero + compang + main house read
      // down the middle, the south houses flank the edges.
      return full(dolly([0, 20, 36], [0, 2, -12], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // MEDIUM on the trail — hero hiking up through forest + coffee
      return full(dolly([4.5, 2.2, 26], [0, 1.5, 16], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: { // INSIDE the ring, looking north across the compang —
      // the main house walls the frame, the hero + villagers stand
      // by the altar on the camera axis. (Round-3 camera at
      // (0, 2.5, -6) put the hero 25° off-axis — out of frame;
      // pulled back to z = -2 so the cone fits with sky above.)
      return full(dolly([0, 3, -2], [0, 4, -24], Math.exp(-0.0003 * lf), { fov: 46 }));
    }
    case 5: { // MEDIUM on one cone house + the 5-level diagram — hero points up (camera outside the ring)
      return full(dolly([2, 4, 2], [-10, 5, -18], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 6: { // WIDE on the guardian peaks — hero small, seven peaks on the ridge.
      // Round 6: the old look (0, 10, -48) pointed so steeply up
      // that the hero on the ground sat 25° below the axis — out
      // of frame. Look lowered to (0, 2, -48) so the hero at (0,-2)
      // lands at the bottom edge, peaks still in frame.
      return full(dolly([-2, 5, 12], [0, 2, -48], Math.exp(-0.0003 * lf), { fov: 46 }));
    }
    case 7: { // MEDIUM at the build site — villagers re-thatching a cone frame.
      // Camera from the south, 26 m back: round 3's (32, 5, 4) put
      // the tree at (30,-4) dead on the axis, 14 m out — it ate the
      // frame. From (24, 6, 16) the near trees fall off-axis.
      return full(dolly([24, 6, 16], [24, 3, -10], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 8: { // MEDIUM on the south village green — hero holds the gold UNESCO plaque
      // pulled back like Okinoshima shot 8 (fixed 2026-11-25): the
      // card must stay clear above the hero's head for the whole shot;
      // the staging moved out of the ring centre to open ground so
      // no house sits between camera and card. Camera centred on the
      // axis (round 4): the old (6, 3, 16) put the villagers 22°
      // off-axis — out of the portrait frame.
      return full(dolly([0, 3, 17], [0, 2, 3], Math.exp(-0.0003 * lf), { fov: 42 }));
    }
    case 9: { // GROUND LEVEL down the village's south-north axis —
      // the compang centred, the elder behind it, the hero
      // kneeling in front. (Round-2 high camera sat INSIDE the
      // house at (5.6, 1.7) — the whole frame was thatch.)
      return full(dolly([0, 2.5, 6], [0, 1.5, -10], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
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
    case 10: return { f: 0, cInf: 0.9, focus: () => [0, 5, -12] };
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 2, -12] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [0, 1.5, 16] };
    case 4: return { f: 0, cInf: 0.4, focus: () => [0, 4, -24] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [-9, 6, -18] };
    case 6: return { f: 0, cInf: 0.5, focus: () => [0, 2, -48] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [24, 3, -10] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [0, 2, 3] };
    case 9: return { f: 0, cInf: 0.8, focus: () => [0, 1.5, -10] };
    default: return { f: 0, cInf: 0.9, focus: () => [5.5, 1.3, 6] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
