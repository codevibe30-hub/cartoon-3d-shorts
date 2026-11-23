// Timeline of the Karapan Sapi short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Karapan Sapi, Madura: pairs of
// bulls race a ±200 m mud track in ±14 seconds (±40 km/h), a
// jockey STANDING on a tiny wooden sled (kaleles) behind them —
// a sled that sometimes leaves the ground entirely. The bulls
// are pampered like athletes (massage, jamu, 80 eggs a day), a
// champion pair's price rockets into the hundreds of millions,
// the race's picture once sat on the Rp100 coin, and the final
// in Pamekasan races for the President's rotating trophy.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L. VISUAL CORE: hot dry Madura midday, a wet brown
// mud track between golden dry fields, festival flags, crowds.
// Frame 0 is the clickbait cover: the hero pair of bulls rearing
// toward camera, the hero jockey shocked on the kaleles behind
// them, the claim text GIANT. Shot 10 returns to it, laughing.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 209, 352, 477, 621, 756, 922, 1070, 1205, 1376, 1529];
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
// The mud track runs along Z: wet strip x -5.5..5.5, from the
// start gate at z +11 down to the finish arch at z -38. Dry
// fields beyond the fences at |x| ~6.2. The hero team waits at
// HERO_TEAM on the right lane; the rival pair on the left lane.
// The paddock (tents, pampering, podium) sits off-track right
// at PADDOCK. Bulls face -Z (down-track) when parked/racing.
export const HERO_TEAM: V3 = [1.9, 0, 9.5];
export const RIVAL_TEAM: V3 = [-2.6, 0, 9.5];
export const PADDOCK: V3 = [11.5, 0, 1.0];
export const FINISH_Z = -38;
export const START_Z = 13.8;

export type TeamPose = { x: number; z: number; yaw: number; mode: "park" | "race" | "walk" | "gone" };

const shotU = (id: number, tSec: number) => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  return clamp01((tSec - a) / Math.max(0.01, b - a));
};

/** The hero team's pose. world.ts (the bulls + kaleles meshes)
 *  and cast.ts (the jockey sprite) both read this, so the
 *  jockey's feet never leave the kaleles platform. */
export const heroTeamAt = (id: number, tSec: number): TeamPose => {
  if (id === 3) { // THE RACE: full gallop down-track, accelerating away
    const u = shotU(3, tSec);
    return { x: HERO_TEAM[0], z: HERO_TEAM[2] - 42 * u ** 1.3, yaw: 0, mode: "race" };
  }
  if (id === 5) { // THE FLY-PAST: one full-speed crossing of the low camera
    const u = shotU(5, tSec);
    return { x: HERO_TEAM[0], z: 7 - 30 * u ** 1.15, yaw: 0, mode: "race" };
  }
  if (id === 6 || id === 7) { // at the paddock: pampered / crowned
    return { x: PADDOCK[0], z: PADDOCK[2], yaw: -Math.PI / 2, mode: "park" };
  }
  if (id === 9) { // parked past the finish arch, winners resting
    return { x: 3.4, z: FINISH_Z - 4, yaw: 0, mode: "park" };
  }
  return { x: HERO_TEAM[0], z: HERO_TEAM[2], yaw: 0, mode: "park" };
};

/** The rival pair: races a nose ahead on shot 3, walks the
 *  parade lap on shot 9, waits at the start otherwise. */
export const rivalTeamAt = (id: number, tSec: number): TeamPose => {
  if (id === 3) {
    const u = shotU(3, tSec);
    return { x: RIVAL_TEAM[0], z: RIVAL_TEAM[2] - 3 - 44 * u ** 1.3, yaw: 0, mode: "race" };
  }
  if (id === 9) { // the parade lap (arak-arakan) through the finish arch
    const u = shotU(9, tSec);
    return { x: -1.6, z: 4 - 34 * u, yaw: 0, mode: "walk" };
  }
  if (id === 6 || id === 7) return { x: RIVAL_TEAM[0], z: RIVAL_TEAM[2], yaw: 0, mode: "gone" };
  return { x: RIVAL_TEAM[0], z: RIVAL_TEAM[2], yaw: 0, mode: "park" };
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
const XFADE: Record<number, number> = { 2: 8, 3: 6, 4: 8, 5: 6, 6: 8, 7: 8, 8: 6, 9: 8, 10: 8 };
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

// The cover camera: low, front three-quarter on the start line —
// the bulls' heads big, the jockey rising behind them, the
// claim card centred up-frame, flags + crowd stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [5.6, 2.0, 0.6], look: [1.2, 1.5, 10.8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole festival arena in one sweep
      return full(dolly([13.5, 11.5, 22], [0, 0.8, -26], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // TRACKING: ride alongside the hero team at fence height
      const tp = heroTeamAt(3, f / FPS);
      return full({ pos: [tp.x + 7.8, 2.2, tp.z - 6.5], look: [tp.x - 0.2, 1.15, tp.z + 1.2], fov: 42 });
    }
    case 4: // CLOSE on the kaleles: the jockey standing his tiny platform
      return full(dolly([5.2, 1.8, 16.2], [1.7, 1.35, 11.6], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 5: { // LOW at track level: the team flies past, sled in the air
      return full({ pos: [6.6, 1.05, -8], look: [0.4, 1.15, -6], fov: 44 });
    }
    case 6: // PADDOCK MEDIUM: the pampering tent, bulls at rest
      return full(dolly([4.8, 1.8, 3.2], [PADDOCK[0] - 0.1, 1.05, PADDOCK[2]], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // PODIUM CLOSE: garlands, trophy, the price lands
      return full(dolly([5.0, 1.8, 4.6], [PADDOCK[0] - 0.2, 1.25, PADDOCK[2]], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 8: // TWIST CLOSE-UP: back on the start line, the coin lands on the hero's face
      return full(dolly([5.2, 2.0, 4.6], [1.6, 1.8, 10.4], Math.exp(-0.0007 * lf), { fov: 38 }));
    case 9: // FINISH WIDE: through the arch, the parade coming home
      return full(dolly([6.5, 4.2, -24], [0, 1.3, -44], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1, -30] };
    case 3: return { f: 0, cInf: 0.85, focus: (ff) => { const tp = heroTeamAt(3, ff / FPS); return [tp.x, 1.2, tp.z]; } };
    case 4: return { f: 0, cInf: 0.9, focus: () => [1.8, 1.3, 11.8] };
    case 5: return { f: 0, cInf: 0.8, focus: (ff) => { const tp = heroTeamAt(5, ff / FPS); return [tp.x, 1.1, tp.z]; } };
    case 6: return { f: 0, cInf: 0.8, focus: () => [PADDOCK[0], 1.0, PADDOCK[2]] };
    case 7: return { f: 0, cInf: 0.9, focus: () => [PADDOCK[0], 1.2, PADDOCK[2]] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [1.9, 1.9, 10.6] };
    case 9: return { f: 0, cInf: 0.5, focus: () => [0, 1.2, -36] };
    default: return { f: 0, cInf: 0.9, focus: () => [1.9, 1.4, 9.5] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
