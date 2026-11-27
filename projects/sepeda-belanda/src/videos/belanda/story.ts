// Timeline of the Sepeda Belanda short (±31 s, Fafnir-ID format,
// bottom two-word subtitles). Amsterdam, Belanda: the country
// with MORE BIKES THAN PEOPLE — 23 million bikes for 18 million
// inhabitants — where Waternet fishes 12,000–15,000 bikes out of
// the canals every year (a Guinness record) and the bike garage
// at Central Station is built UNDER THE WATER, 7,000 spaces.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Dutch daylight, emerald canal water, a SEA
// of parked bikes along the quay, narrow gabled houses across
// the water. Frame 0 is the clickbait cover: the BIKE SEA itself
// big and already moving (wheels turning / bikes gliding past),
// the hero shocked BESIDE it, the claim text GIANT. The approved
// cover design is shot 1 and returns as shot 7 for the punchline
// loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 32.414 s = 972 frames. Line starts [0.06, 3.81, 8.82, 14.33, 19.87, 21.5, 28.1] s.
export const L: number[] = [2, 114, 265, 430, 596, 645, 843, 972];
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
// The canal runs along X at z = CANAL_Z0..CANAL_Z1 (water strip).
// The near quay is paved (z -16..+14). Three rows of parked bikes
// stand on the quay at BIKE_ROWS, facing the canal (-Z). Narrow
// Dutch gabled houses line the far bank (z ≈ -40). A small arched
// bridge crosses the canal at BRIDGE_X. The floating crane barge
// works the canal at CRANE_POS. The underwater bike garage mouth
// sits at the canal edge at GARAGE_POS; Central Station's facade
// closes the far right. Hero + guide stand on the camera side of
// the bike rows, clear of the card's up-frame zone.
export const CANAL_Z0 = -34;
export const CANAL_Z1 = -16;
export const BIKE_ROWS: number[] = [-13, -9, -5];
export const BRIDGE_X = 12;
export const CRANE_POS: V3 = [10, 0, -25];
export const GARAGE_POS: V3 = [-14, 0, -20];
export const STATION_POS: V3 = [26, 0, -42];
// Hero + guide stand beside the bike sea on the camera side.
export const HERO_SPOT: V3 = [1.9, 0, -2.5];
export const GUIDE_SPOT: V3 = [-1.3, 0, -2.5];
// The comparison pile (shot 3): a heap of bikes EAST of the hero,
// in the open quay — NEVER behind the bike rows, where the racks
// would hide it from every camera.
export const PILE_POS: V3 = [4.5, 0, -2];
// The trophy pedestal (shot 5) stands in the open quay, west.
export const TROPHY_POS: V3 = [-8, 0, -4];
// The baby bike (shot 7): a bike with a basket + baby, centre quay.
export const BABY_BIKE_POS: V3 = [0, 0, -3];

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

// The cover camera: low over the quay, looking down the bike rows
// toward the canal — the BIKE SEA big in the centre, the canal +
// gabled houses behind, the hero shocked at the right edge, the
// guide at the left, the claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.8, 2.6, 13.5], look: [0, 2.2, -12] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // CLOSE among the bikes: hero + guide between two rows —
      // both stand in the OPEN quay gap (z -2.5), never behind a
      // rack, so no bike row can hide them from this camera
      return full(dolly([1.0, 1.6, 3.0], [1.0, 1.1, -6], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 3: // WIDE comparison: the bike pile vs the crowd of people —
      // pulled back so pile, crowd AND the canal all fit the frame
      return full(dolly([0.5, 8, 18], [0.5, 0.8, -3], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 4: // The canal + crane: the barge mid-canal, the claw
      // lifting a dripping bike out of the water
      return full(dolly([16, 3.2, -8], [10, 1.6, -25], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 5: // CLOSE on the trophy: gold cup on its pedestal, the
      // hero + guide admiring it from the quay
      return full(dolly([-8, 1.8, 3], [-8, 1.4, -4], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 6: // The underwater garage: the ramp diving below the
      // waterline at the canal edge, bikes riding down into it
      return full(dolly([-9, 2.6, -6], [-14, 0.4, -22], Math.exp(-0.0004 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.8, focus: () => [1.0, 1.2, -4] };
    case 3: return { f: 0, cInf: 0.4, focus: () => [0.5, 1, -3] };
    case 4: return { f: 0, cInf: 0.7, focus: () => [12, 1.5, -16] };
    case 5: return { f: 0, cInf: 0.95, focus: () => [-8, 1.4, -3] };
    case 6: return { f: 0, cInf: 0.7, focus: () => [-11.5, 0.8, -14] };
    default: return { f: 0, cInf: 0.9, focus: () => [0, 2.2, -12] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
