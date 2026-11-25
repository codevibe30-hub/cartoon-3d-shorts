// Timeline of the Salar short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Salar de Uyuni, Bolivia: the
// world's largest salt flat — a prehistoric lake bed so flat
// that a thin film of rainwater turns it into the world's
// largest mirror, flat enough to calibrate satellites. In
// the dry season the crust cracks into giant hexagons; in
// the middle rises Incahuasi island with its giant cacti;
// beneath the crust lies a giant lithium reserve. Line
// boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json.
// VISUAL CORE: the giant mirror itself at frame 0 — sky,
// clouds and hero reflected in the water film while the
// camera dollies forward, ALREADY moving. Shot 6 steps to
// the dry hexagon field (+z), shot 7 to Incahuasi island
// (far -x/-z), shot 9 back to the ancient Lake Minchin
// (far +z). Shot 10 returns to the cover angle.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 245, 427, 600, 782, 943, 1111, 1302, 1475, 1641, 1777];
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
// THE MIRROR (present day, wet season): the flooded flat
// around the origin, water film at y = 0. The mirror sheet
// spans x -70..70, z -46..26. The white dry salt rings it.
// THE DRY FIELD: far +z — the hexagon crust field centred
// z ≈ +125 (its own ground plane at y = 0).
// INCAHUASI ISLAND: far -x/-z — the rocky cactus island
// centred (-50, -66), rising out of the white flat.
// THE ANCIENT LAKE (flashback): far +z beyond the dry field
// — open water centred z ≈ +232, volcanoes on its shore.
export const FLOOR_Y = 0;
export const HERO_HOOK: V3 = [2.3, 0, -3.5];           // beside the dolly path, never covering the mirror
export const JEEP: V3 = [-9.0, 0, -20];               // the tour jeep (shot 2)
export const GUIDE: V3 = [-6.2, 0, -18.2];             // the local guide beside the jeep
export const HERO_NAME: V3 = [4.6, 0, -8.5];
export const HERO_FLAT: V3 = [-3.4, 0, -17.2];          // with the long spirit level (shot 3)
export const LEVEL: V3 = [-2.0, 0, -19.5];              // the spirit level lying on the crust
export const HERO_WALK: V3 = [-2.7, 0, -5.5];          // strolling on the mirror (shot 4)
export const FLAM1: V3 = [3.4, 0, -11.5];              // flamingos in the shallows
export const FLAM2: V3 = [5.8, 0, -8.6];
export const FLAM3: V3 = [7.6, 0, -13.5];
export const HERO_SAT: V3 = [1.9, 0, -4.6];            // pointing at the satellite (shot 5)
export const HEX_SPOT: V3 = [0, 0, 125];               // the dry hexagon field's heart (shot 6)
export const HERO_HEX: V3 = [1.9, 0, 123.6];
export const ISLAND: V3 = [-50, 0, -66];               // Incahuasi island centre (shot 7)
export const HERO_ISLAND: V3 = [-38.5, 0, -50.5];
export const LITH: V3 = [-16, 0, -34];                 // the lifted salt slab + brine pool (shot 8)
export const HERO_LITH: V3 = [-13.2, 0, -31.8];
export const LAKE_SPOT: V3 = [0, 0, 232];              // the ancient lake's heart (shot 9)
export const HERO_LAKE: V3 = [0, 0.62, 226];           // the hero in the reed boat

// The mirror's breathing: a slow ripple shimmer phase used
// by the world (water glints) and the cast (reflection
// wobble), one shared clock so picture and reflections agree.
export const rippleAt = (t: number) => Math.sin(t * 1.7) * 0.5 + Math.sin(t * 2.9 + 1.2) * 0.5;

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "day", "day", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10, 8: 8, 9: 8, 10: 8 };
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

// The cover camera: low over the water film, pushing forward
// from frame 0 — the mirror fills the frame, the hero stands
// front-right on the sheet, reflected, never covering it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.9, 2.4, 6.8], look: [1.15, 0.8, -13] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the mirror is already
      // shimmering): a slow push over the water film
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0011 * lf), { fov: 54 }));
    case 2: // THE NAME WIDE: high over the flat — jeep, guide, white to the horizon
      return full(dolly([0, 7.5, 17], [-1, 0.7, -24], Math.exp(-0.0003 * lf), { fov: 54 }));
    case 3: // THE FLAT: a low sweep across the crust, the level lying ahead
      return full(dolly([1.6, 0.95, -6.0], [-2.8, 0.35, -18.8], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 4: // THE MIRROR WALK: tracking beside the strolling hero, flamingos ahead
      return full(dolly([-6.4, 2.2, 2.8], [1.6, 0.9, -10], Math.exp(-0.00035 * lf), { fov: 50 }));
    case 5: // THE SATELLITE: low angle tilted up — hero pointing, sky huge above
      return full(dolly([0.6, 1.15, 3.4], [1.2, 3.1, -12], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 6: // THE HEXAGONS: low across the dry field, polygons sweeping past
      return full(dolly([4.6, 1.05, 134.5], [-0.6, 0.35, 121.5], Math.exp(-0.00045 * lf), { fov: 50 }));
    case 7: // THE ISLAND: Incahuasi across the white sea — the hero
      // stands on the flat in front of it, cactus giants on top
      return full(dolly([-24, 4.5, -30], [-47, 2.6, -63], Math.exp(-0.0004 * lf), { fov: 50 }));
    case 8: // THE LITHIUM: in close on the lifted slab and the glowing pool
      return full(dolly([-10.6, 1.9, -24.6], [-14.6, 0.5, -32.8], Math.exp(-0.0005 * lf), { fov: 46 }));
    case 9: // THE ANCIENT LAKE: across the water toward the reed boat
      return full(dolly([6.2, 2.1, 240], [-0.6, 1.1, 227.5], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 10: // THE COVER AGAIN (punchline): the mirror dolly once more
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0005 * lf), { fov: 54 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 0.8, -18] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [LEVEL[0], 0.3, LEVEL[2]] };
    case 4: return { f: 0, cInf: 0.7, focus: () => [HERO_WALK[0], 1.1, HERO_WALK[2]] };
    case 5: return { f: 0, cInf: 0.6, focus: () => [HERO_SAT[0], 1.6, HERO_SAT[2]] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [HERO_HEX[0], 0.9, HERO_HEX[2]] };
    case 7: return { f: 0, cInf: 0.7, focus: () => [HERO_ISLAND[0], 1.2, HERO_ISLAND[2]] };
    case 8: return { f: 0, cInf: 0.95, focus: () => [LITH[0], 0.5, LITH[2]] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [HERO_LAKE[0], 1.4, HERO_LAKE[2]] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [HERO_HOOK[0], 1.3, HERO_HOOK[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_HOOK[0], 1.3, HERO_HOOK[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
