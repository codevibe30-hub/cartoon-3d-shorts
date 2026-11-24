// Timeline of the Unicorn / Scotland short (±52 s, Fafnir-ID format,
// bottom two-word subtitles). Scotland's national animal is a
// unicorn — a creature that never existed: on the royal arms since
// the 12th century (William I, ~1165), strongest of all animals in
// Celtic legend, horn that purifies poison, Robert the Bruce's
// emblem against England, always shown with a gold chain (only the
// Scottish kings could tame it), and in 1603 joined by England's
// lion on one shield. Line boundaries live in the L array (start
// frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story
// event is expressed relative to L.
// VISUAL CORE: bright Scottish highland daylight, green moor with
// purple heather, Edinburgh Castle on its rock behind, a white
// unicorn with a golden spiral horn and gold chain. Frame 0 is the
// clickbait cover: the hero's SHOCK face big in the near
// foreground, the giant white unicorn behind him, the claim text
// GIANT. The approved cover design is shot 1 and returns as shot
// 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// Timing derived from voice/line_starts.json (assembled 52.349 s @ 30 fps → TOTAL 1570).
export const L: number[] = [2, 147, 312, 451, 623, 763, 890, 1007, 1172, 1379, 1570];
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
// The green moor runs z +30 .. -12. The front hill ridge rises at
// z -18 (crest y ~7); the back ridge at z -42 (crest y ~11).
// Edinburgh Castle rock stands at (-22, 0, -36), castle on top.
// The loch pond for shot 5 sits at (6, 0, 2). The hero stands at
// HERO_SPOT. The unicorn's home spot is UNI_SPOT.
export const HERO_SPOT: V3 = [0, 0, 10];
export const UNI_SPOT: V3 = [0.5, 0, -2];
export const CASTLE_ROCK: V3 = [-22, 0, -36];
export const POND: V3 = [6, 0, 2];
export const HILL_FRONT_Z = -18;
export const HILL_BACK_Z = -42;

// The front hill crest profile — world.ts builds the same curve.
export const hillAt = (x: number) => 7 + 1.8 * Math.sin(x * 0.09) + 1.2 * Math.sin(x * 0.21 + 1.3);
export const hillBackAt = (x: number) => 11 + 2.2 * Math.sin(x * 0.06 + 0.8) + 1.5 * Math.sin(x * 0.17 + 2.1);

// Terrain height: flat moor (y=0) in front of the hills, then the
// front slope rising toward the crest (z -12 → -18).
export const terrainY = (x: number, z: number): number => {
  if (z >= -12) return 0;
  if (z <= HILL_FRONT_Z) return 0;
  const v = (z + 12) / (HILL_FRONT_Z + 12); // 0..1 down the slope
  return v * hillAt(x);
};

// The unicorn's gallop across the misty moor (shot 4): left to
// right, with a vertical bob — the wild beast that cannot be caught.
// Range kept narrow (±5 m) so the beast never leaves the frame.
export const unicornGallop = (tSec: number): { x: number; y: number; z: number } => {
  const a = L[3] / FPS, b = L[4] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  const x = -5 + 10 * u;
  const bob = Math.abs(Math.sin(u * Math.PI * 5)) * 0.35;
  return { x, y: bob, z: -2 };
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

// The cover camera: low over the moor, hero BIG in the near
// foreground, the white unicorn behind him, the castle + hills
// stacked behind, claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.2, 18], look: [0, 2.5, -8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole moor + the unicorn in one sweep, hero small beside it for scale
      return full(dolly([0, 14, 32], [0, 3, -6], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // MEDIUM on the king + the royal shield: castle rock behind, crown + shield in frame
      return full(dolly([0, 2.8, 12], [0, 2.8, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 4: { // TRACKING on the galloping unicorn: camera rides along the moor, misty hills behind
      // the camera pans WITH the gallop (look + pos follow the beast at 0.6x) so it never leaves frame
      const g = unicornGallop(f / FPS);
      return full(dolly([g.x * 0.6, 3, 14], [g.x * 0.8, 2.2, -4], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 5: // MEDIUM on the pond: the golden horn dips into the dark water, hero watching amazed
      return full(dolly([1, 2.4, 11], [3, 1.2, 0], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 6: // WIDE on the battle: the knight with the unicorn banner vs the English redcoats
      return full(dolly([-1, 3, 13], [1, 2, -2], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 7: // CLOSE on the chained unicorn: head + golden chain + coronet fill the frame
      // camera pulled back 11.5 → 14 (stills check 2026-11-24):
      // at 11.5 the horn tip was cut left and the tail right
      return full(dolly([0.5, 2.4, 14], [0, 2.1, 6], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 8: // MEDIUM on the tamed unicorn: the king holds the golden chain, the beast calm beside him
      return full(dolly([0, 2.4, 13], [0, 1.8, 4], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 9: // WIDE on the union shield: lion left, unicorn right, the great shield between them
      // camera pulled back 12 → 14 (stills check 2026-11-24):
      // at 12 the flanking lion + unicorn were half cut at the edges
      return full(dolly([0, 3, 14], [0, 2.5, -4], Math.exp(-0.0004 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 3, -6] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [0, 2.8, -8] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [0, 2.2, -2] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [3, 1.2, 0] };
    case 6: return { f: 0, cInf: 0.5, focus: () => [1, 2, -2] };
    case 7: return { f: 0, cInf: 1.0, focus: () => [0, 2.1, 6] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [0, 1.8, 4] };
    case 9: return { f: 0, cInf: 0.8, focus: () => [0, 2.5, -4] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
