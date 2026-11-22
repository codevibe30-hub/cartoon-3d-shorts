// Timeline of the Giethoorn short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Giethoorn, Belanda: a village whose
// old centre has NO roads at all — houses stand on little islands,
// every errand runs by boat, 176 mostly-private wooden bridges
// link the footpaths, the boats are electric "whisper boats", and
// the name itself means GOAT HORN (Geytenhoren, after the horns
// found in the peat following the 1170 storm flood).
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Dutch daylight, emerald canal water,
// thatched roofs. Frame 0 is the clickbait cover: the hero's
// SHOCK face big in his boat, the canal village behind him, the
// claim text GIANT. The approved cover design (round-3 anti-flat
// pass) is shot 1 and returns as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 172, 325, 470, 645, 826, 963, 1158, 1315, 1627, 1790];
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
// The canal runs along Z: water strip x -4..4, from z +30 down to
// z -120. Grass banks from |x| 4 out to 16, towpaths hugging the
// water at |x| ~4.6. Thatched houses line both banks at |x| ~10,
// fronts to the canal. The arched wooden bridge crosses at
// z = -34. The hero's boat floats in the near foreground at
// HERO_BOAT, hero standing in it.
export const HERO_BOAT: V3 = [1.2, 0, 9.5];
export const BRIDGE_Z = -34;
export const CANAL_C: V3 = [0, 0, -30];

// The hero's boat ride (shot 3): he turns the boat around and
// sails down-canal — in Giethoorn even a snack run is a boat trip.
// Every other shot the boat sits at HERO_BOAT with its approved
// cover yaw. world.ts (the mesh) and cast.ts (the hero sprite)
// both read this, so feet and hull never part company.
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

// The cover camera: low over the water, looking down the canal —
// the hero's boat big in the near foreground right, the claim
// card centred up-frame, bridge + thatched roofs stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 2.5, 17], look: [0, 2.0, -18] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole village in one sweep, church at the end
      return full(dolly([10, 10.5, 21], [0, 1, -38], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // TRACKING: ride alongside the hero's boat from the towpath
      const bp = heroBoatAt(3, f / FPS);
      return full({ pos: [bp.x + 6.8, 2.3, bp.z + 8.5], look: [bp.x, 1.1, bp.z - 1], fov: 42 });
    }
    case 4: // MEDIUM across the canal at the no-cars sign
      return full(dolly([-8.6, 2.1, 3.5], [5.6, 1.5, -6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // LOW ANGLE at water level, looking up at the bridge
      return full({ pos: [3.2, 2.3 + lf * 0.004, -18.5], look: [-0.4, 3.1, BRIDGE_Z], fov: 44 });
    case 6: // WATER-LEVEL CLOSE on the whisper boat, slow creep in
      return full(dolly([-4.6, 1.35, 15.5], [HERO_BOAT[0], 1.15, HERO_BOAT[2]], Math.exp(-0.0006 * lf), { fov: 40 }));
    case 7: // REVERSE WIDE from the far end of the village, looking back
      return full(dolly([-6, 9, -92], [1.5, 1, -30], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 8: // CLOSE-UP: the twist lands on the hero's face
      return full(dolly([3.6, 2.0, 14.8], [HERO_BOAT[0], 1.9, HERO_BOAT[2]], Math.exp(-0.0008 * lf), { fov: 38 }));
    case 9: // WIDE on the water where the horns surfaced in 1170
      return full(dolly([6.0, 3.6, 8], [-1.5, 0.4, -22], Math.exp(-0.0003 * lf), { fov: 44 }));
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
    case 4: return { f: 0, cInf: 0.8, focus: () => [5.6, 1.4, -6] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 3, BRIDGE_Z] };
    case 6: return { f: 0, cInf: 0.95, focus: () => [HERO_BOAT[0], 1.15, HERO_BOAT[2]] };
    case 7: return { f: 0, cInf: 0.4, focus: () => [0, 1, -55] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [HERO_BOAT[0], 2.2, HERO_BOAT[2]] };
    case 9: return { f: 0, cInf: 0.6, focus: () => [0, 0.3, -16] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_BOAT[0], 1.3, HERO_BOAT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
