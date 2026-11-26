// Timeline of the Jembatan Akar short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Titian Aka, Bayang
// Utara, Pesisir Selatan: a LIVING bridge woven from the
// roots of a banyan and a kubang tree over the Batang Bayang
// river — guided by Pakiah Sokan from 1890, first crossed in
// 1916 after 26 years of weaving, and GROWING STRONGER every
// year since (the 2017 flood failed to bring it down).
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is relative
// to L. VISUAL CORE: a lush green Sumatran river gorge, the
// root bridge sagging between two giant banyans, brown-green
// water racing underneath. Frame 0 is the clickbait cover:
// the root bridge itself, roots still creeping/weaving, the
// hero shocked beside it, the claim text GIANT. Shot 1
// returns as shot 10 (punchline loop).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 156, 322, 472, 632, 824, 1005, 1166, 1331, 1503, 1679];
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
// The Batang Bayang river runs along X: water surface y=0,
// z -6.5..6.5. Raised jungle banks at y=BANK_Y beyond |z|>6.5.
// The root bridge spans z -8..8 at deck height ~6.0-6.55
// (25 m long, ~10 m over the water). Two giant banyans anchor
// it: TREE_A on the near (south, Puluik-Puluik) bank, TREE_B
// on the far (north, Lubuk Silau) bank.
export const BANK_Y = 5.6;
export const TREE_A: V3 = [-1.2, BANK_Y, -11.0];
export const TREE_B: V3 = [1.2, BANK_Y, 11.0];
export const NAME_BOARD: V3 = [-3.6, BANK_Y, -8.6];
export const SIGN_BOARD: V3 = [3.4, BANK_Y, 9.2];

/** deck height (walking surface) of the root bridge at z */
export const deckYAt = (z: number) => 6.02 + 0.55 * (1 - Math.cos((z / 8) * (Math.PI / 2)));

/** the hero crossing the bridge: shot 2 (halfway, admiring),
 *  shot 6 (the first full crossing, 1916), shot 9 (today,
 *  coming back slowly — it is slippery). */
export const heroWalkAt = (id: number, tSec: number): { x: number; y: number; z: number } => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  if (id === 2) { const z = -7 + u * 6.5; return { x: 0.25, y: deckYAt(z), z }; }
  if (id === 6) { const z = -7.6 + u * 15.2; return { x: 0.25, y: deckYAt(z), z }; }
  const z = 7.6 - u * 15.2; return { x: -0.25, y: deckYAt(z), z };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: (i + 1 === 8 ? "storm" : i + 1 === 10 ? "golden" : "day") as Light, tau: (t: number) => t,
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

// The cover camera: downstream-right of the gorge, the root
// bridge sagging diagonally across the frame between the two
// banyans, the hero big on the near bank at the bridge's foot.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [13.5, 10.8, -14.5], look: [-0.2, 5.2, -4.5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const U = clamp01(lf / Math.max(1, s.b - s.a));
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 cover composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: { // DOLLY along the bridge: the deck unrolls ahead, the look tracking the hero's crossing
      const x = -13.5 + U * 6.5;
      return full({ pos: [x, 8.2, -12.8], look: [0.2, 5.9, -2.5 + U * 3], fov: 46 });
    }
    case 3: // THE TWINS: a far wide from downstream — both banyans at the frame edges, the whole span between them
      return full(dolly([46, 14, 0], [0, 7, 0], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 4: // THE PLANTING: low on the near bank, the sapling + the bamboo guide arc
      return full(dolly([6.2, 7.2, -15.8], [-1.6, 5.9, -8.2], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 5: // THE WEAVING: close on the mid-span roots, thickening as they fuse
      return full(dolly([4.6, 7.4, -6.5], [-0.2, 6.1, 2.5], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 6: // THE FIRST CROSSING (1916): the cover framing, wider — years ring overhead
      return full(dolly([13.5, 8.6, -16.5], [-0.4, 5.6, 1], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 7: // THE TWIST: from the far bank — rusty iron + cracked concrete miniatures in front
      return full(dolly([14.5, 9.0, 19], [4.5, 5.6, 10.5], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 8: // THE FLOOD: low near the water, the river rising at the bridge
      return full(dolly([9.5, 4.6, -11.5], [-0.4, 5.6, 0.5], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 9: // TODAY: tracking the hero's careful crossing from downstream
      return full(dolly([12.5, 7.8, 13.5], [0, 5.8, -1], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [0, 6.1, -2] };
    case 3: return { f: 0, cInf: 0.45, focus: () => [0, 5.6, 0] };
    case 4: return { f: 0, cInf: 0.85, focus: () => [-1.2, 6.0, -10.5] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [0, 6.1, 0.5] };
    case 6: return { f: 0, cInf: 0.6, focus: (ff) => { const w = heroWalkAt(6, ff / FPS); return [w.x, w.y + 1.2, w.z]; } };
    case 7: return { f: 0, cInf: 0.7, focus: () => [0, 5.8, 0] };
    case 8: return { f: 0, cInf: 0.75, focus: () => [0, 6.0, 0] };
    case 9: return { f: 0, cInf: 0.7, focus: (ff) => { const w = heroWalkAt(9, ff / FPS); return [w.x, w.y + 1.2, w.z]; } };
    default: return { f: 0, cInf: 0.9, focus: () => [0, 5.8, 0] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
