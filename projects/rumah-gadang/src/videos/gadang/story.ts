// Timeline of the Rumah Gadang short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Rumah Gadang, Sumatera
// Barat: the Minangkabau great house whose posts are NOT
// planted in the ground — they rest on flat sandi stones, so
// the whole house rocks gently in an earthquake instead of
// breaking; every joint is a wooden peg, not one nail; the
// soaring gonjong roof peaks mimic buffalo horns, the symbol
// of the legendary buffalo duel that named the Minangkabau
// ("menang kerbau" — the buffalo won); room counts are always
// odd; and the house belongs to the women, inherited mother
// to daughter in the world's largest matrilineal society.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is
// expressed relative to L.
// VISUAL CORE: bright highland daylight, emerald sawah
// terraces, blue volcanoes behind, and the GIANT carved
// rumah gadang with its horn-peaked gonjong roof — already
// SWAYING on its stones from frame 0 — the hero shocked
// beside it, the claim GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 170, 326, 467, 639, 811, 1014, 1169, 1377, 1570, 1752];
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
// A green Minangkabau valley. The great house stands at
// HOUSE_C, long axis along X, front (stairs + porch) facing
// south (+z) toward the cover camera. Sawah terraces climb
// the east and west slopes; volcanoes close the north
// horizon (z << 0). The buffalo-duel arena is the flat dirt
// yard south of the house at ARENA_C. The hero receives
// guests at HERO_POS, at the foot of the front stairs.
export const HOUSE_C: V3 = [0, 0, -6];
export const HERO_POS: V3 = [2.4, 0, 6.2];
export const ARENA_C: V3 = [0, 0, 21];
export const BUFFALO_BIG_POS: V3 = [-2.7, 0, 21];
export const BUFFALO_BABY_POS: V3 = [2.7, 0, 21];
export const STONE_POS: V3 = [-2.4, 0.45, -2.55];
export const ROOF_POS: V3 = [0, 9.6, -6];
export const PORCH_POS: V3 = [0, 2.42, -2.4];
export const FLOOR_Y = 2.42;

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

// The cover camera: low in the front yard, looking north at
// the great house — the gonjong peaks towering centre, the
// hero reacting at the right, sawah + volcanoes stacked
// behind. Subjects stay near the view axis (portrait
// half-FOV is only ±13-15° — the Sedlec lesson).
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.2, 2.6, 16.5], look: [-0.3, 3.6, -6] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole valley — terraces, river plain, volcanoes, the great house
      return full(dolly([17, 13.5, 31], [-2, 2, -45], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // LOW ANGLE up at the gonjong roofline — the horns against the sky
      return full(dolly([2.2, 3.0, 9.0], [-0.3, 8.6, -6], Math.exp(-0.0003 * lf), { fov: 42 }));
    case 4: // THE ARENA: two buffaloes facing off across the dirt yard
      return full(dolly([0.5, 3.4, 45], [0, 2.0, 21], Math.exp(-0.0003 * lf), { fov: 54 }));
    case 5: // CLOSE on the baby buffalo and its knife-sharp little horns
      return full(dolly([5.2, 1.5, 27.5], [3.0, 1.0, 21], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 6: // THE DUEL: the charge and the fall, arena wide
      return full(dolly([0.5, 3.4, 45], [0, 2.0, 21], Math.exp(-0.0003 * lf), { fov: 54 }));
    case 7: // CLOSE under the house: posts resting on sandi stones + a peg joint
      return full(dolly([2.6, 1.5, 6.4], [-2.0, 0.7, -2.6], Math.exp(-0.0004 * lf), { fov: 50 }));
    case 8: // THE QUAKE: cover framing, the great house rocking on its stones
      return full(dolly([1.5, 2.8, 17.5], [-0.3, 3.8, -6], Math.exp(-0.00025 * lf), { fov: 46 }));
    case 9: // THE PORCH: the women of the house above, the hero a guest below the stairs
      return full(dolly([0.9, 2.1, 8.0], [0, 3.1, -3.0], Math.exp(-0.00035 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 3, -30] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [ROOF_POS[0], ROOF_POS[1], ROOF_POS[2]] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [0, 1.2, 21] };
    case 5: return { f: 0, cInf: 1.0, focus: () => [BUFFALO_BABY_POS[0], 0.9, BUFFALO_BABY_POS[2]] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [0, 1.2, 21] };
    case 7: return { f: 0, cInf: 1.0, focus: () => [STONE_POS[0], STONE_POS[1], STONE_POS[2]] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [PORCH_POS[0], PORCH_POS[1] + 1.1, PORCH_POS[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HOUSE_C[0], 3.4, HOUSE_C[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
