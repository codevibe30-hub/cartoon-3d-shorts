// Timeline of the Madagaskar Baobab short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Madagaskar: the baobab —
// a giant whose spongy trunk stores up to 120,000 litres of
// water, 30 m tall, 11 m wide, up to 2,800 years old. Twenty-
// five Grandidier baobabs line the dirt road at the Avenue of
// the Baobabs near Morondava; 6 of the world's 9 baobab species
// grow ONLY in Madagascar; its fruit is "monkey bread"; the
// upside-down tree is the national tree — and it is endangered
// (Natural Monument since 2015).
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is relative
// to L. VISUAL CORE: hot savanna daylight, red dirt road,
// bottle-trunk giants with root-like crowns. Frame 0 is the
// clickbait cover: a SWAYING giant baobab with living water
// pulsing inside its trunk, the hero shocked beside it, the
// claim text GIANT. Shot 1 returns as shot 10 (punchline loop).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 135, 293, 485, 651, 830, 1002, 1193, 1328, 1506, 1675];
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
// The red dirt road runs along Z: surface x -3.5..3.5, from
// z +26 down to z -120. The avenue baobabs stand at |x| ~5-8.
// HERO_TREE is the cover giant; the other set pieces sit at
// fixed spots the per-shot cameras are aimed at.
export const HERO_TREE: V3 = [-3.0, 0, -5];
export const FRUIT_TREE: V3 = [-4.8, 0, -20];
export const SPONGE_TREE: V3 = [-8.6, 0, -13];
export const FENCE_TREE: V3 = [5.2, 0, -28];
export const MAP_BOARD: V3 = [3.6, 0, -2.5];
export const FLIP_TREE: V3 = [2.2, 0, -4.2];

// The hero on foot on the dirt road (he has no boat here — the
// road is the stage). On shot 3 he strolls down the avenue away
// from the dolly camera; everywhere else he stands at the fixed
// spot cast.ts gives him. world.ts animates only set pieces.
export const heroWalkAt = (id: number, tSec: number): { x: number; z: number } => {
  const a = L[2] / FPS, b = L[3] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return { x: 1.7, z: 3.0 - u * 15 };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: (i + 1 === 9 ? "golden" : "day") as Light, tau: (t: number) => t,
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

// The cover camera: low on the red road, the giant baobab
// towering left-of-centre, the hero big in the right foreground,
// the avenue running away behind them.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.4, 2.4, 15.5], look: [-0.8, 4.8, -14] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const U = clamp01(lf / Math.max(1, s.b - s.a));
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 cover composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // LOW ANGLE at the giant's base: hero tiny, trunk towering, measure line climbing
      return full(dolly([3.4, 1.6, 5.5], [-2.6, 5.4, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: { // DOLLY down the avenue: giants sliding past both sides
      const z = 13 - U * 21;
      return full({ pos: [1.1, 3.0, z], look: [0.9, 3.4, z - 20], fov: 46 });
    }
    case 4: // THE AGE: the hero tree again, Roman columns flanking the road
      return full(dolly([5.2, 2.3, 7.5], [-2.6, 5.2, -8], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 5: // THE SPONGE: the cutaway tree across the road, rain then sun
      return full(dolly([3.2, 2.3, -13.6], [-8.6, 4.4, -13.2], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 6: // THE MAP: the island board by the roadside, hero beside it
      return full(dolly([-1.2, 2.6, 10.5], [3.4, 2.7, -3.2], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // THE FRUIT: under the fruit tree, pods swaying overhead
      return full(dolly([-12.5, 2.6, -5.0], [-4.8, 4.6, -20], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 8: // UPSIDE-DOWN: the giant left, the little flipped tree right
      return full(dolly([0.2, 2.3, 9.5], [1.2, 3.6, -6.5], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 9: // GOLDEN HOUR: the fenced giant, monument board, long shadows
      return full(dolly([-0.6, 2.2, -13.5], [4.6, 4.2, -27.5], Math.exp(-0.00035 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.7, focus: () => [-2.8, 5, -5] };
    case 3: return { f: 0, cInf: 0.45, focus: (ff) => { const w = heroWalkAt(3, ff / FPS); return [w.x, 1.2, w.z]; } };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-3, 5, -5] };
    case 5: return { f: 0, cInf: 0.85, focus: () => [-8.6, 4.2, -13] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [3.6, 2.4, -2.5] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [-4.8, 4.4, -20] };
    case 8: return { f: 0, cInf: 0.7, focus: () => [0.4, 2.5, -5] };
    case 9: return { f: 0, cInf: 0.6, focus: () => [5.2, 4.5, -28] };
    default: return { f: 0, cInf: 0.9, focus: () => [-1, 3.4, -5] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
