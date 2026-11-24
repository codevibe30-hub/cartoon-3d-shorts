// Timeline of the Maeklong short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Maeklong, Thailand: a working wet
// market whose stalls stand ON the active railway — Talat Rom Hup,
// the "umbrella pulldown market". Eight trains a day roll through
// at walking pace; vendors fold their striped awnings and slide
// their baskets 40-70 cm back from the rails, then unfold everything
// again within minutes. The market was there first; the railway
// came in 1905, and neither would move.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Thai morning light, striped awnings in
// saturated reds/greens/blues, produce in every colour, the red
// diesel railcar. Frame 0 is the clickbait cover: the TRAIN
// itself rolling past the stalls at arm's length (three-quarter
// from the track side), awnings folding as it comes, baskets at
// the rail's edge — the anomaly sells the frame, not just the
// hero's face. The hero stands BESIDE the rail, BIG + whole,
// reacting to the train — never covering it or the stalls.
// Motion runs from frame 0: the train moves and the awnings fold
// from the very first frame (linear, no ease-in). The approved
// cover design is shot 1 and returns as shot 10 for the
// punchline loop (the train passes AGAIN behind the laughing hero).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 51.826 s = 1555 frames (hook line 1 re-recorded 24 Nov:
// 6.27 s — the extreme fact up front). Starts (s): 0.06, 6.40,
// 11.30, 16.25, 21.65, 26.58, 32.43, 38.33, 43.43, 47.20.
export const L: number[] = [2, 192, 339, 487, 650, 798, 973, 1150, 1303, 1416, 1555];
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
// The railway runs along Z: two steel rails at x = ±0.75 on a
// ballast strip x -1.6..1.6, from z +30 down to z -120. Stalls
// line BOTH sides: tables at |x| ~3.0-4.6, striped awnings hinged
// at the shopfronts (|x| ~5.4) reaching over the tables toward the
// track (tips at |x| ~2.4 when open). Shophouses stand behind at
// |x| ~8-11, fronts to the track. Maeklong station platform closes
// the far end at z = -100. The hero stands on the track at
// HERO_SPOT; the train rolls down the corridor toward +Z.
export const HERO_SPOT: V3 = [2.6, 0, 9];
export const STATION_Z = -100;
export const TRACK_C: V3 = [0, 0, -30];

// The train's centre-z per shot (a cut between shots, so the
// train may jump — each shot is its own camera setup). Motion is
// LINEAR: the train must already be moving at frame 0 (hook rule
// — no ease-in, no static cover). The pass itself is shot 6: the
// railcar rolls from z -40 to z +8 while the camera tracks its
// nose. Shot 1 is the hook pass (the train rolls past the stalls
// at arm's length, nose -7.5 -> +8.5) and shot 10 loops it. In
// shots 2-3 and 8-9 the train waits at the station (z -118),
// out of the frame's heart.
export const trainAt = (id: number, tSec: number): { z: number } => {
  const s = SHOTS[id - 1];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  switch (id) {
    case 1: return { z: -8 + 14 * u }; // THE HOOK: train passes close, growing big (nose -1.5 -> +12.5)
    case 3: return { z: -55 }; // the 1905 train, mid-distance behind the plaque
    case 4: return { z: -100 + 15 * u }; // approaching, distant, horn sounding
    case 5: return { z: -85 + 15 * u }; // nearer — baskets slide back now
    case 6: return { z: -40 + 48 * u }; // THE PASS: rolls past the camera
    case 7: return { z: 30 }; // gone past the camera, out of frame
    case 10: return { z: -8 + 14 * u }; // the loop: another train rolls through
    default: return { z: -118 }; // parked at the station
  }
};

// Awning fold factor per shot (0 = open, 1 = folded back). LINEAR
// too: the fold must already be moving at frame 0 of shot 1.
// The fold runs as a wave ahead of the train: world.ts adds a
// small per-stall gradient on top of this base value.
export const awningFold = (id: number, tSec: number): number => {
  const s = SHOTS[id - 1];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  switch (id) {
    case 1: return u; // folding as the train bears down — the hook in motion
    case 4: return u; // folding, stall by stall, as the train nears
    case 5: return 1; // folded — the corridor is clear
    case 6: return 1; // folded while the train rolls through
    case 7: return 1 - u; // flipping back out
    case 10: return u; // the loop folds again
    default: return 0; // market open as usual
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

// The cover camera: on the track's shoulder, looking down the
// corridor — the train's nose fills the frame's heart as it rolls
// past at arm's length, the stalls and their folding awnings run
// down the right side, the hero big in the near foreground beside
// the rail. The claim card is glued to the view axis up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [2.0, 2.2, 16], look: [0, 1.8, -10] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 42 }));
    case 2: // HIGH WIDE: the whole market corridor in one sweep
      return full(dolly([10, 10.5, 21], [0, 1, -38], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // MEDIUM on the 1905 plaque — hero + sign + old train behind
      // (camera on the track centre: the old spot sat under the left
      // stalls' awnings, which filled the top third and hid the card)
      return full(dolly([0, 2.2, 2], [4.2, 1.8, -7], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 4: { // SIDE VIEW of the fold: vendors on both sides, awnings coming down
      // (camera on the track centre: the old spot sat next to the left
      // stalls, whose folded awnings crossed and covered the card)
      return full(dolly([0, 2.6, 10], [0, 2, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 5: { // LOW CLOSE on the baskets sliding back from the rail
      return full(dolly([3.5, 1.2, 6], [-0.5, 0.6, -2], Math.exp(-0.0006 * lf), { fov: 40 }));
    }
    case 6: { // THE PASS: FIXED look down the corridor — the
      // railcar rolls in small from the far end, grows, and its
      // red side fills the frame as it passes (a tracking look
      // would swing the axis 90° and throw the hero out of frame)
      return full(dolly([5.8, 2.0, 8], [0.4, 1.7, -6], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 7: // WIDE on the reopening — awnings flipping back out
      return full(dolly([8, 6, 16], [0, 1.5, -25], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 8: { // MEDIUM at a fruit stall — hero holds a mango, vendor behind
      // (camera pulled back so hero + vendor both fit the 9:16 frame)
      return full(dolly([10, 4, 12], [1, 1.3, -4], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 9: { // CLOSE on the mango choice — the train's horn behind him
      // (camera on the track centre: the old spot sat under the right
      // stalls' awnings, which crossed and covered the card)
      return full(dolly([0.5, 1.9, 3], [2.2, 1.4, -3.5], Math.exp(-0.0008 * lf), { fov: 38 }));
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
    case 10: return { f: 0, cInf: 0.9, focus: (ff) => { const tz = trainAt(id, ff / FPS).z; return [0, 1.8, Math.min(tz + 6.5, 12)]; } };
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1, -45] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [4.2, 1.8, -7] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [0, 2, -6] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [-0.5, 0.6, -2] };
    case 6: return { f: 0, cInf: 0.95, focus: (ff) => { const tz = trainAt(6, ff / FPS).z; return [0, 1.7, Math.max(-30, Math.min(tz, 0))]; } };
    case 7: return { f: 0, cInf: 0.4, focus: () => [0, 1, -25] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [2.2, 1.4, -3.5] };
    case 9: return { f: 0, cInf: 0.6, focus: () => [2.2, 1.4, -3.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
