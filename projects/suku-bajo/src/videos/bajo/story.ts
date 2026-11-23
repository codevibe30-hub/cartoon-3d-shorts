// Timeline of the Suku Bajo short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Suku Bajo, Sulawesi: the sea
// nomads of Indonesia who hold their breath for 13 minutes,
// dive to 70 m on wooden goggles and a stone weight alone, and
// carry spleens 50% larger than land people (Ilardo et al.,
// Cell 2018) — a built-in oxygen tank, evolved over a thousand
// years of living on the water. Line boundaries live in the L
// array (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L. VISUAL CORE: bright
// tropical daylight, turquoise sea, stilt houses over the water,
// a lepa boat with a lateen sail. Frame 0 is the clickbait
// cover: the hero's SHOCK face big in his boat, the sea village
// behind him, the claim text GIANT. The cover returns as shot
// 10 for the punchline loop. Shots 4 and 6 go UNDERWATER.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 211, 336, 485, 651, 803, 944, 1094, 1254, 1386, 1600];
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
// Open sea everywhere. The village channel runs along Z: stilt
// houses on both sides at |x| ~10.5, floors at y = 1.0 over the
// water, plank walkways linking them. A sand island with palms
// closes the horizon at z ~ -125. The hero's lepa floats in the
// near foreground at HERO_BOAT. The UNDERWATER world sits below
// the channel: sand floor at UW_FLOOR, lit blue volume between
// y -5.5 (the surface seen from below) and the floor.
export const HERO_BOAT: V3 = [1.2, 0, 9.5];
export const UW_FLOOR = -23;
export const UW_C: V3 = [0, -15, -28];

// The hero's boat ride (shot 3): he sails down-channel between
// the stilt houses — in a Bajo village even visiting a neighbour
// is a boat trip. world.ts (the mesh) and cast.ts (the hero
// sprite) both read this, so feet and hull never part company.
export const heroBoatAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  if (id !== 3) return { x: HERO_BOAT[0], z: HERO_BOAT[2], yaw: -0.28 };
  const a = L[2] / FPS, b = L[3] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return {
    x: HERO_BOAT[0] + (0.1 - HERO_BOAT[0]) * u,
    z: HERO_BOAT[2] + (-13 - HERO_BOAT[2]) * u,
    yaw: -0.28 + (Math.PI - 0.12 + 0.28) * u,
  };
};

// The dive (shot 4): the hero slips off the boat's side and
// sinks head-first toward the reef, weighted stone in hand —
// one breath, no tank. Ends hovering over the coral at y ~ -16.
export const diveAt = (tSec: number): { x: number; y: number; z: number; pitch: number; roll: number } => {
  const a = L[3] / FPS, b = L[4] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return {
    x: 0.4 - u * 0.9,
    y: -1.2 - u * 14.6,
    z: -20 - u * 5,
    pitch: -0.55 - Math.sin(u * Math.PI) * 0.35,
    roll: 0.30 + Math.sin(u * Math.PI) * 0.45,
  };
};

// The bottom walk (shot 6): down on the sand the hero WALKS the
// reef like the Bajau hunters do — slow strides, spear in hand,
// the spleen doing its quiet work. Feet stay on UW_FLOOR.
export const walkAt = (tSec: number): { x: number; y: number; z: number } => {
  const a = L[5] / FPS, b = L[6] / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return { x: -3.6 + u * 6.4, y: UW_FLOOR, z: -24.5 };
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

// The cover camera: low over the water, looking down the
// channel — the hero's boat big in the near foreground right,
// the claim card centred up-frame, stilt houses stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 2.5, 17], look: [0, 2.0, -18] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole sea village in one sweep, island at the end
      return full(dolly([10, 10.5, 21], [0, 1, -38], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // TRACKING: ride alongside the hero's boat from the water
      const bp = heroBoatAt(3, f / FPS);
      return full({ pos: [bp.x + 6.8, 2.3, bp.z + 8.5], look: [bp.x, 1.1, bp.z - 1], fov: 42 });
    }
    case 4: { // UNDERWATER: sink alongside the diver, reef opening below
      const d = diveAt(f / FPS);
      return full(dolly([5.4, -6.5, -12.5], [d.x, d.y - 1, d.z], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 5: // CLOSE-UP: the re-hook lands on the hero's face at the surface
      return full(dolly([5.2, 2.6, 19.5], [HERO_BOAT[0], 1.8, HERO_BOAT[2]], Math.exp(-0.0008 * lf), { fov: 40 }));
    case 6: { // UNDERWATER: track the bottom walk across the sand
      const w = walkAt(f / FPS);
      return full({ pos: [w.x + 4.6, -17.6, -13.5], look: [w.x, -20.6, -25], fov: 44 });
    }
    case 7: // MEDIUM across the channel at the walkway village life
      return full(dolly([6.4, 2.4, 21], [0.2, 1.3, 0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 8: // THE KIDS: low over the water toward the swimming children
      return full(dolly([2.6, 2.0, 4.5], [-2.2, 0.1, -12], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 9: // REVERSE WIDE from the island end, looking back at the village
      return full(dolly([-6, 9, -92], [1.5, 1, -30], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1, -45] };
    case 3: return { f: 0, cInf: 0.8, focus: (ff) => { const bp = heroBoatAt(3, ff / FPS); return [bp.x, 1.1, bp.z]; } };
    case 4: return { f: 0, cInf: 0.85, focus: (ff) => { const d = diveAt(ff / FPS); return [d.x, d.y, d.z]; } };
    case 5: return { f: 0, cInf: 1.0, focus: () => [HERO_BOAT[0], 2.2, HERO_BOAT[2]] };
    case 6: return { f: 0, cInf: 0.85, focus: (ff) => { const w = walkAt(ff / FPS); return [w.x, w.y + 1.2, w.z]; } };
    case 7: return { f: 0, cInf: 0.8, focus: () => [HERO_BOAT[0], 1.6, HERO_BOAT[2]] };
    case 8: return { f: 0, cInf: 0.85, focus: () => [-2.2, 0.1, -12] };
    case 9: return { f: 0, cInf: 0.4, focus: () => [0, 1, -55] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_BOAT[0], 1.3, HERO_BOAT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
