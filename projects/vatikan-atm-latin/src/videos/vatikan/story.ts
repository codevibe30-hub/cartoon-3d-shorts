// Timeline of the Vatikan ATM Latin short (MAKS 35 s, Fafnir-ID
// format, bottom two-word subtitles). Vatikan: the Vatican Bank's
// ATM is the ONLY one in the world that speaks Latin — "Inserito
// scidulam quaeso" (insert your card), "deductio ex pecunia"
// (cash withdrawal). Latin is called a dead language, yet here
// it still hands out cash. The country is 0.49 km2 with ~882
// people; the bank dates to 1942.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: St. Peter's Square — cobblestone piazza, Bernini
// colonnade, the basilica dome behind, one freestanding ATM
// kiosk glowing Latin. Frame 0 is the clickbait cover: the ATM
// itself, already big and lit, its screen cycling Latin, the hero
// shocked BESIDE it, a cardinal on the other side, the claim
// card giant. Shot 6 returns to the cover (golden hour) for the
// punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 34.187 s = 1026 frames; line starts [0.06, 4.97, 8.73, 13.79, 19.79, 23.5].
export const L: number[] = [2, 149, 262, 414, 594, 705, 1026];
export const TOTAL = L[6];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => { const u2 = clamp01(u); return u2 * u2 * u2; };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x1 - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- shared geography (world.ts + cast.ts MUST match) ----------------
// The piazza runs along Z: cobblestone foreground (z +28 to -8),
// the ATM kiosk at the centre (z -2), the obelisk behind it
// (z -30), Bernini's colonnade curving both sides (x +/-14..30,
// z -15..-45), St. Peter's facade + dome closing the horizon
// (z -55..-70).
export const PIAZZA_Z = -30;
export const ATM_C: V3 = [0, 0, -2]; // the ATM kiosk, cover
export const OBELISK_C: V3 = [0, 0, -30]; // the square's obelisk
export const HERO_SPOT: V3 = [2.2, 0, 3.5]; // inside cover-cam portrait FOV
export const CARDINAL_SPOT: V3 = [-2.0, 0, 3.0]; // inside cover-cam portrait FOV
// The ATM never moves; the hero + cardinal spots per shot.
export const HERO_AT: Record<number, V3> = {
  1: [2.2, 0, 3.5], 2: [2.6, 0, -0.5], 3: [1.5, 0, 0.5], 4: [1.9, 0, -1.2],
  5: [-2.3, 0, -1.7], 6: [2.2, 0, 3.5],
};
export const CARDINAL_AT: Record<number, V3> = {
  1: [-2.0, 0, 3.0], 2: [-2.4, 0, -0.5], 3: [-2.0, 0, 0.5], 4: [-1.7, 0, -1.2],
  5: [-1.8, 0, 2.5], 6: [-2.0, 0, 3.0],
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHTS: Light[] = ["day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 6).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHTS[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8 };
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

// The cover camera: low on the piazza, looking at the ATM kiosk
// with the obelisk + dome behind it — the ATM big in the
// mid-ground, the claim card centred up-frame, hero + cardinal
// in the foreground.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.3, 14], look: [0, 3.0, -10] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 6:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // THE ONLY ONE: three-quarter from the left — ATM side-on, hero pointing at the screen, cardinal nodding
      return full(dolly([-7, 2.4, 6], [2, 1.8, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // THE SCREEN: close on the ATM face — the Latin screen fills the frame, hero reading at the right edge
      return full(dolly([1.8, 2.1, 5.0], [0, 2.0, -2.2], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 4: // THE CASH: low front angle — euro notes sliding out of the dispenser, hero holding cash
      return full(dolly([3.0, 3.0, 7.0], [0, 1.6, -2], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 5: // THE TWIST: medium from the right — hero + cardinal in front of the ATM, both shrugging
      return full(dolly([-5, 2.6, 8], [0.5, 1.8, -4], Math.exp(-0.0005 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [ATM_C[0], 1.8, ATM_C[2]] };
    case 3: return { f: 0, cInf: 0.9, focus: () => [ATM_C[0], 2.1, ATM_C[2]] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [ATM_C[0], 1.5, ATM_C[2]] };
    case 5: return { f: 0, cInf: 0.6, focus: () => [ATM_C[0], 1.8, ATM_C[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
