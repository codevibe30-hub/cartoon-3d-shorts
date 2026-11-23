// Timeline of the Tambora short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Gunung Tambora, Sumbawa: the
// largest eruption in recorded history (10 April 1815, VEI 7) —
// ±150 km³ of ash, a blast heard 2,600 km away, ±71,000 dead,
// and a stratospheric ash veil that deleted the world's summer
// in 1816: snow in July, failed harvests, Karl Drais' first
// bicycle, and Mary Shelley's Frankenstein. Line boundaries live
// in the L array (start frame of each script line + total),
// derived from voice/line_starts.json; every shot, camera key,
// DOF key and story event is expressed relative to L.
// VISUAL CORE: a giant erupting stratovolcano over a dry
// savanna village, then the ash-dark world of 1816 — snow in
// summer, a dead wheat field, a storm-lashed villa. Frame 0 is
// the clickbait cover: the hero's SHOCK face big on a rocky
// ridge, the erupting mountain filling the sky behind him, the
// claim text GIANT. Shot 10 returns to the cover for the loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 157, 364, 525, 686, 864, 1055, 1254, 1408, 1609, 1770];
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
// Four sets in one world, far apart, toggled visible per shot:
// (A) VOLCANO set around the origin: the cone stands at
// VOLCANO_POS with its crater at y ≈ 46; a dry savanna plain
// with a village at its foot (z −38..−66, x ±14..34); the bay
// lies to the east (x > 46). The hero's ridge is in the near
// foreground at HERO_SPOT. (B) SNOW set centred x = +320: a
// northern village buried in July snow. (C) FIELD set centred
// x = −320: a dead wheat field + market stall. (D) VILLA set
// centred z = +380: a gothic villa on a hill in a night storm.
export const VOLCANO_POS: V3 = [0, 0, -95];
export const CRATER_Y = 46;
export const HERO_SPOT: V3 = [1.25, 0.35, 9.8];
export const SNOW_X = 320;
export const SNOW_HERO: V3 = [321.2, 0, -26];
export const FIELD_X = -320;
export const FIELD_HERO: V3 = [-317.5, 0, -28];
export const VILLA_Z = 380;
export const VILLA_HERO: V3 = [-1.8, 0, 344];

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const LIGHTS_BY_SHOT: Light[] = ["day", "day", "day", "storm", "storm", "day", "golden", "day", "night", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: LIGHTS_BY_SHOT[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash (lightning is in-world)

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

// The cover camera: low on the hero's ridge, the hero big in the
// near foreground right, the erupting cone filling the sky.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 3.1, 21.5], look: [0.2, 5.8, -45] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: volcano + village + bay in one sweep
      return full(dolly([17, 15, 10], [0, 5, -72], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // ERUPTION CLOSE: pulled back off the cone's skirt, looking up its face
      return full(dolly([16, 5, 18], [0, 15, -95], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 4: // ASH DARK: across the bay toward the blackened mountain
      return full(dolly([-7, 3.4, 8], [2, 6, -62], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 5: // DIM SUN: the pale sun behind the ash veil, hero pointing up
      return full(dolly([0, 2.8, 15], [0, 10, -70], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 6: // SNOW IN JULY: into the buried northern village
      return full(dolly([SNOW_X, 2.9, -13], [SNOW_X, 2.6, -50], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // DEAD FIELD: low over the grey wheat toward the empty stall
      return full(dolly([FIELD_X, 2.6, -11], [FIELD_X, 2.2, -52], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 8: { // THE DRAISINE: track alongside the hero pushing his wooden bike
      const u = clamp01(lf / Math.max(1, s.b - s.a));
      const hz = -16 - u * 16;
      return full({ pos: [FIELD_X + 6.8, 2.2, hz + 7.5], look: [FIELD_X, 1.3, hz - 1], fov: 42 });
    }
    case 9: // THE VILLA: up the hill path in the night storm
      return full(dolly([0, 3.2, 328], [0, 8, VILLA_Z + 6], Math.exp(-0.0003 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 6, -80] };
    case 3: return { f: 0, cInf: 0.7, focus: () => [0, 20, -95] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [0, 8, -70] };
    case 5: return { f: 0, cInf: 0.55, focus: () => [-18, 34, -200] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [SNOW_HERO[0], 1.2, SNOW_HERO[2]] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [FIELD_HERO[0], 1.2, FIELD_HERO[2]] };
    case 8: return { f: 0, cInf: 0.85, focus: (ff) => { const s = SHOTS[7]; const u = clamp01((ff - s.a) / Math.max(1, s.b - s.a)); return [FIELD_X, 1.2, -16 - u * 16]; } };
    case 9: return { f: 0, cInf: 0.7, focus: () => [0, 8, VILLA_Z] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
