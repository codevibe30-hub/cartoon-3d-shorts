// Timeline of the Bono short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). The Kampar River, Pelalawan,
// Riau: the Bono tidal bore — sea tide rams into the
// narrowing estuary, collides with the river's own flow,
// and a wall of water up to six metres races 60 km upstream
// at 40 km/h, surfable for a world-record 17.2 km non-stop.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is
// expressed relative to L. VISUAL CORE: a wide muddy-green
// river between jungle banks, and THE WAVE ITSELF — a
// foam-crested wall already rolling at frame 0. Shot 10
// returns to the cover angle.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 182, 294, 441, 609, 801, 1031, 1226, 1432, 1546, 1709];
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
// The river runs along z: open water for |x| < RIVER_HALF,
// mud banks sloping up to the jungle floor (y = BANK_Y) on
// both sides. Downstream (the sea) is far -z; the bore
// travels upstream toward +z. Teluk Meranti village stands
// on the east bank (x > 0); the jetty juts out at JETTY.
export const RIVER_HALF = 17;
export const WATER_Y = 0;
export const BANK_Y = 1.3;
export const HERO_SPOT: V3 = [10, 0.6, 3];            // the cover spot: the point-bar sandbar, beside the lane
export const JETTY: V3 = [16.5, 1.05, 9];             // the wooden jetty deck (shots 2, 8)
export const VILLAGE: V3 = [29, BANK_Y, 14];          // Teluk Meranti centre (east bank)
export const NARROWS_Z = -34;                          // where the channel pinches (shot 4)
export const CROC_SPOT: V3 = [-5.5, WATER_Y, -10];     // open shallows just east of the sandbar (shot 9)
export const VIEW_SPOT: V3 = [-9.5, 0.46, 7];          // the sandbar viewpoint (shot 5)
export const BAR_SPOT: V3 = [-7, 0.46, -6];            // the mid-river sandbar the watchers stand on (shot 7)
export const ESTUARY_BAR: V3 = [8, 0.32, -40];         // the mud bar in the estuary reach (shot 3)
export const GHOST_Z = -27;                            // the seven crests' line (shot 7)

// The bore front's z for a shot at shot-local progress U —
// the wave is ALWAYS already on the move when a shot opens.
export const boreZAt = (id: number, U: number): number => {
  switch (id) {
    case 1: return -16 + 13 * U;
    case 2: return -64 + 20 * U;
    case 3: return -98 + 30 * U;
    case 4: return -31 + 9 * U;
    case 5: return -40 + 30 * U;
    case 6: return -9 + 6 * U;
    case 7: return -74 + 18 * U;
    case 8: return -58 + 16 * U;
    case 9: return -30 + 12 * U;
    case 10: return -16 + 13 * U;
    default: return -20 + 10 * U;
  }
};
// The bore's height scale per shot (the estuary front is a
// young, low bore; the cover/surf bore is the full wall).
export const boreScaleAt = (id: number): number => (id === 3 ? 0.38 : id === 2 || id === 8 ? 0.7 : 1);
// Shot 6: the surfer rides the face — his spot on the water,
// and the rescue boat running alongside him.
export const surfPosAt = (U: number): V3 => [-3, 2.15, boreZAt(6, U) + 2.3];
export const boatPosAt = (U: number): V3 => [4.5, WATER_Y, boreZAt(6, U) + 1.2];

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "golden", "day", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10, 8: 8, 9: 8, 10: 8 };
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

// The cover camera: low on the east bank looking up-river —
// the bore wall ALREADY rolling toward the viewer, the hero
// big on the bank in the right third, the claim card centred.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [12.5, 3.6, 15], look: [-3, 2.4, -26] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the anomaly is already
      // moving): a slow push toward the rolling wall
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the river bend, the village, the jungle — the bore a white line far up-river
      return full(dolly([48, 32, 48], [0, 0, -16], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 3: // THE ESTUARY: down the widening mouth toward the sea — the tide front advancing in
      return full(dolly([10, 6.5, -6], [0, 0.5, -110], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 4: // THE COLLISION: at the narrows — two currents meet and the wall stands up
      return full(dolly([-16, 3.0, -4], [2, 2.2, NARROWS_Z], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 5: // THE RACE: a tracking slide along the west bank as the wall storms past the jungle
      return full(dolly([-11, 4.4, 21], [-7, 2.0, -30], Math.exp(-0.0006 * lf), { fov: 48 }));
    case 6: // THE RIDE (re-hook): tracking level with the surfer on the face, the boat alongside
      return full(dolly([13, 3.4, 9], [-3, 2.6, -6.5], Math.exp(-0.00035 * lf), { fov: 50 }));
    case 7: // THE SEVEN GHOSTS: across the river at the row of crests, an old sampan rocking
      return full(dolly([-2, 3.4, 20], [-2, 1.8, GHOST_Z], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 8: // THE MOON: from the jetty up at the pale full moon over the river, the tide board below
      return full(dolly([20, 3.4, 22], [-6, 8, -46], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 9: // THE CROC: low and close on the west shallows — eyes and snout at the surface
      return full(dolly([-7.5, 1.7, 7], [CROC_SPOT[0], 0.2, CROC_SPOT[2]], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 10: // THE COVER AGAIN (punchline): the wall rolling in once more
      return full(dolly([12.5, 2.8, 15], [-3, 2.0, -26], Math.exp(-0.0004 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 0, -20] };
    case 3: return { f: 0, cInf: 0.5, focus: () => [0, 0, -80] };
    case 4: return { f: 0, cInf: 0.85, focus: () => [0, 2, NARROWS_Z] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [0, 2, -20] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [-3, 2.4, -10] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [0, 1.5, GHOST_Z] };
    case 8: return { f: 0, cInf: 0.7, focus: () => [JETTY[0], 1.2, JETTY[2]] };
    case 9: return { f: 0, cInf: 0.95, focus: () => [CROC_SPOT[0], 0.2, CROC_SPOT[2]] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [0, 2, -16] };
    default: return { f: 0, cInf: 0.9, focus: () => [0, 2, -16] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
