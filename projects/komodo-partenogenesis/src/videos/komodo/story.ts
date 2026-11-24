// Timeline of the Komodo parthenogenesis short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Pulau Komodo, Indonesia: the female
// Komodo dragon can have babies WITHOUT a male — parthenogenesis,
// confirmed genetically in 2006 (Flora, Chester Zoo: 11 eggs, 7
// hatched, all male; Sungai, London Zoo). ZW chromosomes: ZZ
// survives as a male, WW fails — so every virgin-born baby is
// male, and one lone female could start a whole colony.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright tropical savanna daylight, dry golden grass,
// turquoise sea + green hills behind, the giant grey-brown dragon.
// Frame 0 is the clickbait cover: the hero's SHOCK face big in
// the near foreground, the giant female dragon behind him, the
// claim text GIANT. The approved cover design is shot 1 and
// returns as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// Timing derived from voice/line_starts.json (assembled 48.878 s @ 30 fps → TOTAL 1466).
export const L: number[] = [2, 142, 277, 423, 601, 732, 874, 1044, 1205, 1349, 1466];
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
// The savanna runs along Z: dry golden grass from z +30 down to
// the beach at z -34, then turquoise sea from z -58 out to the
// horizon; green hills close the far side at z -60..-90. Acacia
// trees dot the savanna at |x| 6..30. The hero stands at
// HERO_SPOT; the giant female dragon (Flora) rests at FLORA_SPOT.
// The nest mound with eggs sits at NEST; the zoo fence encloses
// the nest corner (x 4..11, z -13..-3) for shot 4 only.
export const HERO_SPOT: V3 = [0, 0, 8];
export const FLORA_SPOT: V3 = [0.3, 0, 3];
export const NEST: V3 = [8.2, 0, -9];
export const BEACH_Z = -34;
export const SEA_Z = -58;

// The giant dragon's walk (shot 2): she crosses the savanna left
// to right while the hero watches from the side — scale is the
// joke, so she walks SLOW and LOW, tail dragging behind.
export const dragonWalkAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  if (id !== 2) return { x: FLORA_SPOT[0], z: FLORA_SPOT[2], yaw: 0 };
  const a = L[1] / FPS, b = L[2] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return { x: -5 + 11 * u, z: -2, yaw: 0 };
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

// The cover camera: low over the savanna, hero BIG in the near
// foreground, the giant dragon behind him, sea + hills stacked
// behind, claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.4, 1.9, 16.5], look: [0.2, 1.7, -16] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole savanna in one sweep, dragon crossing, sea behind
      return full(dolly([7, 11, 24], [0, 1, -12], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // MEDIUM on the pair: male + female side by side, hero watching from the side
      return full(dolly([-6.5, 2.1, 8], [2.5, 0.9, -5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 4: // MEDIUM on the zoo enclosure: Flora alone, nest + eggs beside her — camera HIGH so she reads OVER the 1.5 m fence
      return full(dolly([-4.5, 4.2, 6], [6.5, 0.7, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // LOW CLOSE on the nest: seven babies among cracked eggs — camera HIGH enough to see over the mound
      return full(dolly([2.2, 3.1, 1.5], [8.2, 0.4, -9], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 6: // MEDIUM on the scientist + glowing DNA helix, hero watching
      return full(dolly([-3.5, 2.2, 8.5], [2.5, 1.9, 0], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 7: // MEDIUM on the giant Z and W letters
      return full(dolly([0, 2.4, 10], [0, 2.2, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 8: // LOW CLOSE on the two eggs: ZZ hatches, WW fails — camera pulled back so hero + both eggs fit side by side
      return full(dolly([-1, 3.0, 4], [8.2, 0.6, -9], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 9: // WIDE on the new island: beach, sea, one female + her babies
      return full(dolly([0, 3.4, -12], [0, 1.0, -42], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1, -6] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [2.5, 0.9, -5] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [6.5, 1.0, -8] };
    case 5: return { f: 0, cInf: 0.95, focus: () => [8.2, 0.6, -9] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [2.5, 1.9, 0] };
    case 7: return { f: 0, cInf: 0.9, focus: () => [0, 2.2, -8] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [8.2, 0.7, -9] };
    case 9: return { f: 0, cInf: 0.5, focus: () => [0, 1.0, -34] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
