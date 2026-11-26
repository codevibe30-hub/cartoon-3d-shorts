// Timeline of the Taumata short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). A modest 305 m hill near
// Porangahau, Hawke's Bay, New Zealand, carrying the
// longest place name on Earth: the 85-letter Maori word
// Taumatawhakatangihangakoauauotamateaturipukakapikimaunga-
// horonukupokaiwhenuakitanatahu — one word that retells the
// legend of the explorer Tamatea, who mourned his fallen
// brother on this summit, playing his koauau (nose flute)
// every morning. The locals just call it "Taumata".
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is relative
// to L. VISUAL CORE: rolling green NZ pasture, one smooth
// grassy hill, and a roadside sign SO long it overflows the
// frame — the anomaly itself, swaying from frame 0.
// Frame 0 is the clickbait cover; shot 1 returns as shot 10
// (punchline loop).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 117, 370, 536, 741, 909, 1080, 1294, 1450, 1610, 1768];
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
// Flat green pasture at y=0. THE HILL rises at centre-back:
// centre (0, -40), base radius 27, summit height 14.5 (the
// 305 m hill, scaled). A country ROAD runs along X in the
// foreground (z 6.5..12.5). THE GIANT SIGN stands between the
// pasture and the road at z=3, board centre y=2.35, spanning
// x -10.5..10.5 — far wider than any portrait frame, on
// purpose. The SMALL "TAUMATA" sign stands at (11.8, 3.4).
export const HILL_C: V3 = [0, 0, -40];
export const HILL_R = 27;
export const HILL_H = 14.5;
export const SIGN_C: V3 = [0, 2.35, 3];
export const SIGN_W = 21;
export const SMALL_SIGN: V3 = [11.8, 0, 3.4];
export const SUMMIT_FRONT: V3 = [0.8, 14.3, -37.2];

/** hill surface height at (x, z) — smooth pasture dome */
export const hillYAt = (x: number, z: number) => {
  const d = Math.hypot(x - HILL_C[0], z - HILL_C[2]);
  if (d >= HILL_R) return 0;
  const u = 1 - (d / HILL_R) ** 2;
  return HILL_H * u ** 1.2;
};

/** shot 2: the hero strolls the whole length of the sign,
 *  reading it; shot 8: two tourists back away from the sign
 *  toward the camera, trying to fit it in one photo. */
export const heroSignWalkAt = (tSec: number): { x: number; y: number; z: number } => {
  const a = L[1] / FPS, b = L[2] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return { x: -8.5 + u * 17, y: 0, z: 5.4 };
};
export const touristBackAt = (which: number, tSec: number): { x: number; y: number; z: number } => {
  const a = L[7] / FPS, b = L[8] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  // they CONVERGE as they back up (squeezing together to fit
  // the giant sign in one photo) — and stay inside the cone
  const x0 = which === 0 ? -1.5 : 1.45;
  return { x: x0 + (which === 0 ? 0.55 : -0.65) * u, y: 0, z: 8.2 + u * 4.2 };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: (i + 1 === 7 || i + 1 === 10 ? "golden" : "day") as Light, tau: (t: number) => t,
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

// The cover camera: on the road, the giant sign filling the
// width and spilling out of BOTH frame edges, the green hill
// rising behind it, the hero big at the sign's right post.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.5, 3.4, 21.5], look: [0, 2.6, 0] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const U = clamp01(lf / Math.max(1, s.b - s.a));
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 cover composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: { // TRACKING along the endless sign: the board scrolls past, the hero strolling with it
      const x = -9 + U * 18;
      return full({ pos: [x, 2.7, 13.8], look: [x * 0.94, 2.2, 3], fov: 46 });
    }
    case 3: // THE SMALL HILL: a wide from across the road — the whole modest dome, sheep grazing
      return full(dolly([6, 5, 27], [0, 6, -32], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 4: // TAMATEA ON THE SUMMIT: low on the front slope, the explorer silhouetted above
      return full(dolly([4, 11, -22], [0.4, 13.6, -38], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 5: // THE MEANING: the summit from further back — the seated chief AND the translation scroll both fit
      return full(dolly([2.6, 17.5, -24.5], [0.2, 13.8, -37.2], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 6: // THE BATTLE MEADOW: the flat east pasture — two war parties face off, no sign in the way
      return full(dolly([30.5, 4.2, 17.5], [20.9, 1.0, -0.7], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 7: // THE LAMENT (golden dawn): the summit from the west shoulder, notes drifting
      return full(dolly([-4.6, 15.6, -28.5], [0.8, 14.1, -37.3], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 8: // THE PHOTO STRUGGLE: the tourists back toward camera, the sign looming behind them
      return full(dolly([0, 2.3, 19.5], [0, 2.1, 3], Math.exp(-0.0002 * lf), { fov: 46 }));
    case 9: // THE SHORTCUT: the tiny TAUMATA sign at the giant's end, the farmer's pick
      return full(dolly([11.6, 2.5, 14.5], [11.4, 1.7, 3.2], Math.exp(-0.00035 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: (ff) => { const w = heroSignWalkAt(ff / FPS); return [w.x, 1.4, w.z]; } };
    case 3: return { f: 0, cInf: 0.45, focus: () => [0, 5, -20] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [...SUMMIT_FRONT] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [...SUMMIT_FRONT] };
    case 6: return { f: 0, cInf: 0.55, focus: () => [21, 1.2, -0.5] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [...SUMMIT_FRONT] };
    case 8: return { f: 0, cInf: 0.65, focus: () => [0, 1.4, 10] };
    case 9: return { f: 0, cInf: 0.8, focus: () => [SMALL_SIGN[0], 1.2, SMALL_SIGN[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [0, 2.4, 3] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
