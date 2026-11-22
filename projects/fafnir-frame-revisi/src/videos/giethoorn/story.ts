// Timeline for the Giethoorn frame-0 design-revision still
// (Fafnir-ID format). This project exists to render ONE frame:
// the clickbait cover of "Di Belanda, Ada Desa yang Nggak Punya
// Jalan Sama Sekali" — Giethoorn, the Dutch village where there
// are no roads and every trip is a boat ride on the canals.
// The composition is a single static shot; only frame 0 is ever
// rendered (a design-review still, not a video).
import type { LightName } from "./lights";

export const FPS = 30;
export const TOTAL = 90; // composition length; only frame 0 is rendered
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
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

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: TOTAL, light: "day", tau: (t) => t }, // COVER: hero shock in the boat, canal village behind, giant claim card
];
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];
export const layersAt = (_f: number): { id: number; alpha: number }[] => [{ id: 1, alpha: 1 }];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// The cover camera: low over the water, looking down the canal —
// the hero's boat big in the near foreground right, the claim
// card centred up-frame, bridge + thatched roofs stacked behind.
const CAM_BASE: { pos: V3; look: V3 } = { pos: [0, 2.5, 17], look: [0, 2.0, -18] };
export const camAt = (_id: number, f: number): Cam =>
  full(dolly(CAM_BASE.pos, CAM_BASE.look, Math.exp(-0.0007 * f), { fov: 46 }));

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (_f: number): Dof => ({ f: 0, cInf: 0.9, focus: () => [HERO_BOAT[0], 1.3, HERO_BOAT[2]] });
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
