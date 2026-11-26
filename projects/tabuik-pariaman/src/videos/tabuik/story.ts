// Timeline of the Tabuik Pariaman short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Pariaman, West Sumatra:
// every year for Ashura (10 Muharram) two neighbourhoods build a
// TABUIK — a 12-metre ornamental tower (a winged Buraq body under
// a tiered, umbrella-crowned pangkek) — parade it through town
// all day while rocking it (hoyak), and at sunset THROW it into
// the sea at Gandoriah Beach. The throwing-away IS the climax.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is relative to L.
// VISUAL CORE: a bright Sumatran coastal town — sandy street,
// palm trees, a river crossing, then open beach and sea. Frame 0
// is the clickbait cover: the giant tabuik itself, already being
// rocked by its carriers, the hero shocked BESIDE it, the claim
// text GIANT. Shot 1 returns as shot 10 (at sea) for the loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 150, 333, 530, 702, 848, 1009, 1219, 1368, 1581, 1779];
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
// The procession street runs along Z: packed-sand street x -5..5
// from z +30 down to the beach. A river crosses the street at
// z -30..-35 (a low bridge carries the street over it). Beach
// sand z -56..-72, then the SEA from z -72 to the horizon.
// The rumah tabuik (workshop yard) sits on the west side at
// WORKSHOP. Houses + palms line both sides of the street.
export const WORKSHOP: V3 = [-11.5, 0, -6];
export const RIVER_Z = -32.5;
export const BEACH_Z = -64;
export const SEA_Z = -80;

/** Where the MAIN tabuik is, and what it is doing, per shot.
 *  sway = hoyak rocking amplitude (0 still, 1 full parade rock);
 *  lift = pangkek height above its seat (shot 5 assembly);
 *  tilt/sink drive the sea-throwing in shot 9 and the floating
 *  wreck in shot 10. world.ts and cast.ts both read this. */
export type TabuikPose = { x: number; y: number; z: number; yaw: number; sway: number; lift: number; tilt: number; sink: number };
export const tabuikAt = (id: number, tSec: number): TabuikPose => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  const base: TabuikPose = { x: 0, y: 0, z: 3.4, yaw: 0.1, sway: 0.4, lift: 0, tilt: 0, sink: 0 };
  switch (id) {
    case 1: return { ...base, z: 4.2 - u * 1.6, sway: 1.0, yaw: Math.PI - 0.12 };
    case 2: return { ...base, z: 3.2, sway: 0.45, yaw: Math.PI - 0.08 };
    case 3: return { ...base, x: -2.4, z: -25.5, yaw: 0.05, sway: 0.55 };
    case 4: return { ...base, z: 4.2, sway: 0.12 };
    case 5: return { ...base, z: -2, sway: 0.1, yaw: Math.PI + 0.06, lift: 2.6 * (1 - smooth((u - 0.12) / 0.62)) };
    case 6: return { ...base, z: 0 - u * 21, sway: 1.25, yaw: 0.04 };
    case 7: return { ...base, z: -15, sway: 0.5, yaw: Math.PI - 0.1 };
    case 8: return { ...base, z: -50 - u * 13, sway: 0.7, yaw: 0.06 };
    case 9: {
      const k = smooth((u - 0.22) / 0.55);
      return { ...base, z: SEA_Z, sway: 0.3 * (1 - k), tilt: 0.9 * k, sink: 3.4 * k };
    }
    case 10: return { ...base, z: SEA_Z - 4, sway: 0.15, tilt: 0.55, sink: 1.5 };
    default: return base;
  }
};
/** the second tabuik (Subarang) waiting across the river */
export const TABUIK_B: V3 = [2.8, 0, -40.5];
/** hero standing spot on the beach for shots 8-10 */
export const HERO_BEACH: V3 = [3.1, 0, -68];

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHTS: Light[] = ["day", "day", "day", "day", "golden", "day", "day", "golden", "golden", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHTS[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
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

// The cover camera: street level, the tabuik towering centre-
// frame and ALREADY rocking, the hero big at the right edge.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [6.4, 2.6, 21.5], look: [-0.4, 4.8, 1.0] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const tp = tabuikAt(id, f / FPS);
  switch (id) {
    case 1:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // LOW ANGLE: the whole 12 m tower against the sky
      return full(dolly([4.6, 1.2, 19.5], [0, 4.6, 3.0], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // HIGH WIDE: two tabuik, one river between them
      return full(dolly([10.5, 10.5, 2], [-1.2, 2.8, -36], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 4: // THE WORKSHOP: across the street into the rumah tabuik yard
      return full(dolly([-2.2, 2.8, 6.5], [WORKSHOP[0], 2.6, WORKSHOP[2]], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // DAWN ASSEMBLY: the pangkek comes down onto the Buraq
      return full(dolly([5.6, 2.2, 12.5], [0, 5.0, -2], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 6: { // TRACKING: ride alongside the hoyak parade
      return full({ pos: [6.2, 3.2, tp.z + 13.5], look: [0, 4.6, tp.z], fov: 42 });
    }
    case 7: // THE DATE: medium-wide on the tabuik, card carries 1831
      return full(dolly([7.6, 3.4, -1.5], [0, 3.2, -15], Math.exp(-0.0003 * lf), { fov: 42 }));
    case 8: // GOLDEN HOUR: carried down the beach toward the water
      return full({ pos: [7.0, 2.8, tp.z + 13.0], look: [0, 3.4, tp.z - 1], fov: 43 });
    case 9: // THE THROW: wide on the sea, the tower goes over
      return full(dolly([7.5, 3.2, -58], [0, 3.4, SEA_Z], Math.exp(-0.00025 * lf), { fov: 44 }));
    case 10: // THE LOOP: the wreck floats at sunset, hero laughing on the sand
      return full(dolly([4.2, 2.2, -58], [-0.3, 3.4, SEA_Z - 4], Math.exp(-0.00025 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  const tp = tabuikAt(id, f / FPS);
  switch (id) {
    case 2: return { f: 0, cInf: 0.5, focus: () => [0, 5, 3.2] };
    case 3: return { f: 0, cInf: 0.4, focus: () => [0, 3, -33] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [WORKSHOP[0], 3, WORKSHOP[2]] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 5.4, -2] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [tp.x, 4.6, tp.z] };
    case 7: return { f: 0, cInf: 0.6, focus: () => [0, 4.2, -15] };
    case 8: return { f: 0, cInf: 0.7, focus: () => [tp.x, 4, tp.z] };
    case 9: return { f: 0, cInf: 0.55, focus: () => [0, 3, SEA_Z] };
    case 10: return { f: 0, cInf: 0.6, focus: () => [0, 3, SEA_Z - 4] };
    default: return { f: 0, cInf: 0.9, focus: () => [2.9, 1.6, 10.8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
