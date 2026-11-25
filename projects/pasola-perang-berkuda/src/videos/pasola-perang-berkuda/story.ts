// Timeline of the Pasola short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). Pasola, Sumba Barat, NTT: the Marapu
// ritual war-game in which two groups of 100+ horsemen charge
// each other across an open field hurling blunt wooden spears —
// held once a year (Feb–Mar) at the start of planting season,
// only after the nyale sea worms appear, its spilled blood
// believed to fertilise the land. Line boundaries live in the
// L array (start frame of each script line + total), derived
// from voice/line_starts.json; every shot, camera key, DOF key
// and story event is expressed relative to L. VISUAL CORE: hot
// savanna daylight — golden grass, red dust, ikat-bright riders,
// the sea glinting beyond the beach shots. Frame 0 is the
// clickbait cover: two riders already at full gallop head-on,
// spears in the air, dust flying, the hero's SHOCK face big
// beside them, the claim text GIANT. Shot 1 returns as shot 10
// for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 153, 302, 520, 705, 846, 1036, 1244, 1414, 1617, 1789];
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
// The pasola field is an open savanna arena: a worn dirt strip
// x -11..+11 running along Z, z -62..+62, on golden grassland
// (FIELD_Y). Two groups charge along Z: side A (crimson ikat)
// starts at z -52 riding toward +Z; side B (indigo ikat) starts
// at z +52 riding toward -Z. Crowd fences line x ±12.5.
// Megalithic stone tombs + tall-roofed uma houses ring the
// field. The beach lies south: sand from z -92, the shoreline
// at z -112, the sea beyond (shots 5-6, the nyale dawn).
export const FIELD_Y = 0.1;
export const HERO_SPOT: V3 = [-7.0, FIELD_Y, -6.0]; // the cover spot: west of the lanes, in the camera's left third
export const TOMB: V3 = [-10.5, FIELD_Y, 15.0];    // the great megalithic tomb (shot 4)
export const RACK: V3 = [7.6, FIELD_Y, 16.5];      // the spear rack (shot 7)
export const SHORE_Z = -112;                       // the nyale shoreline
export const RATO_SPOT: V3 = [-1.8, 0.02, -107.5]; // the Rato at the shoreline (shots 5-6)
export const SPROUT: V3 = [0.5, FIELD_Y, 2.0];     // where the rice sprouts answer the blood (shot 8)

// charge lanes: side A rides +Z on these x, side B rides -Z
export const LANE_A = [-6.8, -2.4, 2.0, 6.4];
export const LANE_B = [-5.6, -1.2, 3.2, 7.6];
export const RIDER_N = 4; // rigs per side (the "100+" is sold by the wide shot's sprite ranks)

// ---------------- riders ----------------
export type RiderMode = "charge" | "wait" | "gone";
export type RiderPose = { x: number; z: number; yaw: number; mode: RiderMode };
const WAIT_LINE_A: [number, number][] = [[-7.5, -46], [-2.5, -47.5], [2.5, -46], [7.5, -47.5]];
const WAIT_LINE_B: [number, number][] = [[-7.5, 46], [-2.5, 47.5], [2.5, 46], [7.5, 47.5]];

/** One rider's pose. side 0 = A (crimson, rides toward +Z, yaw π
 *  because the horse model faces -Z), side 1 = B (indigo,
 *  rides toward -Z, yaw 0). Charge profiles are shot-local:
 *  riders are ALREADY at full gallop when a charge shot opens. */
export const riderAt = (id: number, side: 0 | 1, idx: number, tSec: number): RiderPose => {
  const s = SHOTS[id - 1];
  const S0 = s.a / FPS, SLEN = (s.b - s.a) / FPS;
  const u = clamp01((tSec - S0) / Math.max(0.01, SLEN)); // shot-local progress
  const dirA = side === 0;
  const yaw = dirA ? Math.PI : 0;
  const lane = (dirA ? LANE_A : LANE_B)[idx];
  const charge = (from: number, to: number, delay = 0): RiderPose => {
    const uu = clamp01((u * SLEN - delay) / Math.max(0.01, SLEN - delay));
    if (uu <= 0) return { x: lane, z: from, yaw, mode: "wait" };
    if (uu >= 1) return { x: lane, z: to, yaw, mode: "gone" };
    return { x: lane, z: from + (to - from) * uu, yaw, mode: "charge" };
  };
  const waitAt = (line: [number, number][]) => ({ x: line[idx][0], z: line[idx][1], yaw, mode: "wait" as RiderMode });
  const GONE: RiderPose = { x: lane, z: dirA ? -70 : 70, yaw, mode: "gone" };
  switch (id) {
    case 1:
    case 10: {
      // THE CHARGE, head-on through the middle: the lead pair is
      // already galloping at frame 0, the second pair 0.85 s
      // behind them; the rest wait small at the far ends
      if (idx === 0) return charge(dirA ? -11 : 14, dirA ? 40 : -40);
      if (idx === 1) return charge(dirA ? -17 : 21, dirA ? 38 : -38, 0.85);
      return waitAt(dirA ? WAIT_LINE_A : WAIT_LINE_B);
    }
    case 2:
      // THE STANDOFF: both ranks drawn up facing each other
      return waitAt(dirA ? WAIT_LINE_A : WAIT_LINE_B);
    case 3: {
      // THE FULL CHARGE: the whole field thunders, staggered
      return charge(dirA ? -54 : 54, dirA ? 56 : -56, idx * 0.15);
    }
    case 4:
      // THE RITUAL: the ranks wait in one hushed line north of
      // the tomb while the Rato prays
      return { x: -13 + idx * 7.5, z: 4 - (idx % 2) * 2.5, yaw: Math.PI, mode: "wait" };
    case 7:
      // one rider of each side waits behind the spear rack, horses held
      if (idx === 0) return dirA
        ? { x: 3.4, z: 23.5, yaw: Math.PI * 0.92, mode: "wait" }
        : { x: 5.6, z: 27.5, yaw: Math.PI * 1.05, mode: "wait" };
      return GONE;
    case 8: {
      // THE TWIST CHARGE: three pairs thunder again
      if (idx === 3) return GONE;
      return charge(dirA ? -50 : 50, dirA ? 52 : -52, idx * 0.12);
    }
    case 9: {
      // past the crowd: the two near lanes charge, the rest
      // wait small on the far side
      if (idx <= 1) return charge(dirA ? -46 : 46, dirA ? 48 : -48, idx * 0.2);
      return { x: (dirA ? LANE_A : LANE_B)[idx] + 6, z: dirA ? -48 : 48, yaw, mode: "wait" };
    }
    default:
      return GONE; // shots 5-6 are on the beach: no horses
  }
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "golden", "golden", "day", "day", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
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

// The cover camera: low at the field's south-west, looking
// north across the crossing point — the crimson lead already
// galloping head-on toward the lens, the indigo lead blasting
// past in the first second, the hero big in the left third,
// the claim card centred up-frame against the sky.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-13.5, 1.8, 6], look: [-2.5, 1.5, -16] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const t = f / FPS;
  switch (id) {
    case 1:
    case 10:
      // the dolly-in runs from frame 0 (the anomaly is already
      // moving): a slow push toward the clash point
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole arena — two ranks facing off, crowd ring, tombs + uma roofs
      return full(dolly([27, 30, 54], [0, 0, -8], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 3: { // TRACKING: riding alongside the crimson lead, the field streaming past
      const lead = riderAt(3, 0, 0, t);
      const z = Math.max(-44, Math.min(44, lead.z));
      return full({ pos: [LANE_A[0] - 8.6, 2.1, z - 5.5], look: [LANE_A[0] + 1.5, 1.5, z + 3], fov: 44 });
    }
    case 4: // THE RITUAL: across the hero + Rato at the great tomb, the ranks hushed behind
      return full(dolly([-3.0, 2.0, 28.5], [TOMB[0] + 1.6, 1.4, TOMB[2] + 2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // THE NYALE DAWN: down the grass slope to the shoreline, the sea beyond
      return full(dolly([-5.2, 1.8, -95], [1.8, 0.7, SHORE_Z - 4], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 6: // CLOSE on the Rato at the shoreline: the camera aims
      // LOW and WEST of him, so he rides the upper-right frame —
      // his face and the nyale in his hands stay clear of the
      // axis-centred card (close-up rule)
      return full(dolly([3.0, 1.9, -100.6], [-3.4, 0.15, RATO_SPOT[2]], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 7: // THE SPEAR RACK: the hero shows the blunt tip, riders waiting behind
      return full(dolly([3.2, 1.85, 25], [RACK[0], 1.25, RACK[2]], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 8: // THE TWIST: elevated off the east fence — the charge crosses below
      return full(dolly([13.5, 2.6, -20], [-2.5, 1.1, 7], Math.exp(-0.00035 * lf), { fov: 48 }));
    case 9: // THE CROWD: from the west fence across the arena —
      // the riders blast past in the mid-ground, the cheering
      // crowd lines the far fence with the hero among them
      return full(dolly([-15.5, 2.2, -6], [16, 1.3, 2], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  const t = f / FPS;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 1, -6] };
    case 3: { const lead = riderAt(3, 0, 0, t); return { f: 0, cInf: 0.85, focus: () => [lead.x, 1.5, lead.z] }; }
    case 4: return { f: 0, cInf: 0.85, focus: () => [TOMB[0] + 1.8, 1.3, TOMB[2] + 2.5] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [RATO_SPOT[0], 0.8, RATO_SPOT[2]] };
    case 6: return { f: 0, cInf: 1.0, focus: () => [RATO_SPOT[0] + 0.35, 1.0, RATO_SPOT[2] - 0.3] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [RACK[0], 1.2, RACK[2]] };
    case 8: return { f: 0, cInf: 0.6, focus: () => [0, 1.2, 2] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [-4, 1.3, -2] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
