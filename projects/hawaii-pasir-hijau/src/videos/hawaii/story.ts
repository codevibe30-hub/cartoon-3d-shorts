// Timeline of the Hawaii Green Sand short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Papakolea Beach, Big
// Island, Hawaii: one of the world's handful of green sand
// beaches — the sand is ~90% olivine crystals weathered out of
// the 49,000-year-old Pu'u Mahana tuff ring, and the surf sorts
// it: light black grains wash out to sea, heavy green olivine
// stays behind. Olivine of gem quality is peridot — August's
// birthstone, the "Hawaiian Diamond". The beach is reached only
// on foot (2.7 miles each way, vehicles banned) and taking sand
// is illegal — the supply is finite, so one day the green may
// fade away. Line boundaries live in the L array (start frame
// of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L.
// VISUAL CORE: bright tropical daylight, turquoise ocean,
// GREEN sand that must read unmistakably green, the dark
// ash cone of Pu'u Mahana wrapping the bay, palms at the
// beach edge. Frame 0 is the clickbait cover: a GIANT mound
// of sparkling green sand with waves washing its base —
// already moving from frame 0 — the hero shocked beside it,
// the claim GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 168, 342, 510, 696, 891, 1036, 1204, 1369, 1524, 1638];
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
// One cove on the south coast of the Big Island. The GREEN SAND
// beach is an ellipse centred BEACH_C (x -13..13, z -13..5).
// The ocean lies north of the beach (z < -13), a big turquoise
// disc. Pu'u Mahana — the old tuff ring — stands behind the bay
// at CONE (base radius ~26, height ~15), its ash strata visible.
// The hero stands on the south sand at HERO_POS. The giant
// sparkling green sand mound — frame 0's anomaly — sits at
// SAND_POS. The giant peridot of shot 4 rests at GEM_POS. The
// no-taking sign is planted at SIGN_POS. Palms edge the beach.
export const BEACH_C: V3 = [0, 0, -4];
export const CONE: V3 = [0, 0, -34];
export const HERO_POS: V3 = [2.4, 0, 4.2];
export const SAND_POS: V3 = [-1.0, 0, -2.0];
export const GEM_POS: V3 = [0, 0, -5.5];
export const SIGN_POS: V3 = [-1.8, 0, 4.6];
export const CRYSTAL_POS: V3 = [-1.2, 1.15, 5.0];

// The hike (shot 7): the hero walks the dirt trail from the
// lava field down to the beach. world.ts (the trail mesh) and
// cast.ts (the hero sprite) both read this, so feet and path
// never part company.
export const heroTrailAt = (id: number, tSec: number): { x: number; z: number } => {
  if (id !== 7) return { x: HERO_POS[0], z: HERO_POS[2] };
  const a = L[6] / FPS, b = L[7] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return { x: 7.5 - 6.0 * u, z: 13.5 - 6.5 * u };
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

// The cover camera: low over the south sand, looking north
// across the beach — the giant green sand mound big centre,
// the hero reacting at the right shore, the cone + turquoise
// ocean stacked behind. Subjects stay near the view axis
// (portrait half-FOV is only ±13-15° — the Sedlec lesson).
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.6, 2.4, 15.8], look: [-0.4, 2.0, -10] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole bay — cone wrapping the green beach, turquoise sea
      return full(dolly([13, 12.5, 27], [-1, 1.5, -32], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // CLOSE on the hero's cupped hands: a pile of green crystals
      return full(dolly([0.4, 1.7, 10.5], [-1.0, 1.05, 4.4], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: // LOW on the giant peridot resting on the green sand
      return full(dolly([1.8, 2.2, 3.5], [0, 1.4, -5.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // THE CONE: low angle up at Pu'u Mahana's ash strata
      return full(dolly([7, 4, 6], [-0.5, 6.5, -32], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 6: // LOW at the waterline: waves sorting the grains
      return full(dolly([2.6, 1.15, 6.8], [-0.6, 0.25, -9], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 7: { // TRACKING: alongside the hero hiking the dirt trail
      const hp = heroTrailAt(7, f / FPS);
      return full({ pos: [hp.x + 3.4, 1.9, hp.z + 6.8], look: [hp.x, 1.15, hp.z], fov: 42 });
    }
    case 8: // CLOSE on the no-taking sign + the reaching hand
      return full(dolly([0.6, 1.9, 10.2], [-1.4, 1.1, 4.6], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 9: // THE TWIST: wide on the cone + the beach as the green drains away
      return full(dolly([6, 4.5, 9], [0, 3.5, -30], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 2, -32] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [CRYSTAL_POS[0], 1.15, CRYSTAL_POS[2]] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [GEM_POS[0], 1.6, GEM_POS[2]] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [-0.5, 6, -32] };
    case 6: return { f: 0, cInf: 0.85, focus: () => [-0.6, 0.3, -8] };
    case 7: return { f: 0, cInf: 0.8, focus: (ff) => { const hp = heroTrailAt(7, ff / FPS); return [hp.x, 1.1, hp.z]; } };
    case 8: return { f: 0, cInf: 0.95, focus: () => [SIGN_POS[0], 1.2, SIGN_POS[2]] };
    case 9: return { f: 0, cInf: 0.5, focus: () => [0, 3, -28] };
    default: return { f: 0, cInf: 0.9, focus: () => [SAND_POS[0], 1.2, SAND_POS[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
