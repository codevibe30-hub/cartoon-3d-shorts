// Timeline of the Etalase Jepang short (±33 s, Fafnir-ID format,
// bottom two-word subtitles). Tokyo, Jepang: restaurants display
// shokuhin sampuru — hyper-realistic PLASTIC food replicas — in
// glass cases out front, so customers see the dish before
// ordering. Gujo Hachiman makes ~90% of Japan's replicas; one
// plastic ramen bowl takes hours to craft, steam and all. Tourists
// keep trying to grab the food. The replicas never go stale —
// and never fill you up either.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: warm Japanese daylight, a restaurant street with
// paper lanterns and noren curtains, the GIANT glass display case
// full of glossy plastic food. Frame 0 is the clickbait cover:
// the case itself big and ALREADY MOVING (steam curling, sushi
// plates turning on the turntable), the hero shocked BESIDE it,
// the claim text GIANT. The approved cover design is shot 1 and
// returns as shot 7 for the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 31.186 s = 936 frames. Line starts [0.06, 3.88, 9.0, 13.6, 18.44, 23.31, 27.26] s.
export const L: number[] = [2, 116, 270, 408, 553, 699, 818, 936];
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
// The restaurant street runs along X. Facades face +Z at z = -10.
// The sidewalk is z -10..-4, the street z -4..+8 (camera side).
// The GIANT display case stands in front of the main ramen shop
// at CASE_POS. Hero stands camera-side right of the case at
// HERO_SPOT; the chef stands left of the case at CHEF_SPOT.
// The Gujo workshop corner (workbench + craftsman) sits at the
// west end of the street at WORKSHOP_POS. A small street table
// with an onigiri replica sits at TABLE_POS near the hero.
export const CASE_POS: V3 = [-1.5, 0, -5.5];
export const HERO_SPOT: V3 = [2.4, 0, -3.2];
export const CHEF_SPOT: V3 = [-4.6, 0, -4.2];
export const TOURIST_SPOT: V3 = [-0.6, 0, -3.4];
export const WORKSHOP_POS: V3 = [-14, 0, -6.5];
export const CRAFT_SPOT: V3 = [-13.2, 0, -5.2];
export const TABLE_POS: V3 = [3.4, 0, -4.6];
// The turntable inside the case (sushi plates) spins with time.
export const turntableAngle = (tSec: number): number => tSec * 0.55;

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

// The cover camera: low over the sidewalk, looking at the display
// case — the CASE big in the centre, hero shocked at the right
// edge, chef at the left, claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.0, 2.4, 8.5], look: [0.2, 2.0, -6] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // WIDE street: hero + chef before the restaurant row
      // v2: look shifted left so the chef is fully in frame (was half-cut)
      return full(dolly([6, 4.5, 10], [-2.6, 1.5, -8], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the tourist reaching for the replica sushi
      return full(dolly([2.5, 2.0, 0.5], [-1.5, 1.8, -5.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // The Gujo workshop corner: craftsman painting tempura
      return full(dolly([-10, 2.2, 0], [-14, 1.2, -6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // CLOSE on the giant ramen replica inside the case
      // v2: re-centred on the bowl itself (was aimed at the case
      // centre, leaving the bowl at the left edge and the frame empty)
      return full(dolly([-1.0, 2.0, -1.0], [-2.0, 1.7, -5.5], Math.exp(-0.0006 * lf), { fov: 38 }));
    case 6: // CLOSE on the hero poking the plastic onigiri
      // v2: pulled back so the hero's head and the claim card both fit
      return full(dolly([6.0, 2.4, 2.0], [2.8, 1.2, -4], Math.exp(-0.0005 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [-2, 1.5, -8] };
    case 3: return { f: 0, cInf: 0.95, focus: () => [-1.5, 1.8, -5.5] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-14, 1.2, -6.5] };
    case 5: return { f: 0, cInf: 1.0, focus: () => [-1.5, 2.2, -5.5] };
    case 6: return { f: 0, cInf: 0.95, focus: () => [3.0, 1.2, -4.4] };
    default: return { f: 0, cInf: 0.9, focus: () => [-1.5, 2.0, -5.5] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
