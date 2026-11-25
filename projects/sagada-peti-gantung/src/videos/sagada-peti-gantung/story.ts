// Timeline of the Sagada short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Sagada, Mountain Province,
// Philippines: for some two thousand years the Kankanaey
// Igorot have hung the coffins of their honoured elders on
// the limestone cliffs of Echo Valley — the higher the
// coffin, the closer the spirit to the sky — or stacked
// them at the mouth of Lumiang Cave. Line boundaries live in
// the L array (start frame of each script line + total),
// derived from voice/line_starts.json; every shot, camera
// key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a sheer limestone cliff wall across the
// north of a cool pine valley, its face studded with dozens
// of hanging coffins; a rope-hoist raising one more coffin
// at frame 0. Frame 0 is the clickbait cover: the cliff of
// coffins ALREADY there, the hoist coffin ALREADY rising
// and swaying — the hero's SHOCK face big beside it, the
// claim text GIANT. Shot 10 returns to the cover angle.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 184, 308, 422, 592, 755, 907, 1017, 1183, 1331, 1496];
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
// The limestone cliff runs east-west across the north: its
// face is the plane z = CLIFF_Z, the top edge at CLIFF_TOP.
// Coffins hang on the face in clusters (world.ts owns the
// exact cluster table). The valley floor (y = GROUND_Y)
// falls away south to the town (z +24..+44) and the cave
// outcrop stands east. The hoist lane is at HOIST_X: ropes
// run from the ledge crew at the top down the face.
export const CLIFF_Z = -34;
export const CLIFF_TOP = 27;
export const GROUND_Y = 0.1;
export const HERO_SPOT: V3 = [-9.5, GROUND_Y, -17];   // the cover spot: valley floor, SW of the hoist
export const HOIST_X = -3;                            // the hoist lane (shots 1, 5, 10)
export const HOIST_TOP: V3 = [HOIST_X, 16.5, CLIFF_Z + 0.9]; // where the rising coffin docks
export const ELDER_SPOT: V3 = [0.5, GROUND_Y, -17];    // the elder at the cliff base (shot 3)
export const CARVE_SPOT: V3 = [13, GROUND_Y, 20];      // the carving yard at the village edge (shot 4)
export const SMALL_SPOT: V3 = [-1, GROUND_Y, -13];     // the little coffin on the ground (shot 6)
export const CHAIR_SPOT: V3 = [7.5, 11.5, CLIFF_Z + 0.8]; // coffin + sangadil close-up (shot 7)
export const CAVE: V3 = [40, GROUND_Y, -12];           // the Lumiang cave mouth (shot 8)
export const VILLAGE: V3 = [20, GROUND_Y, 32];         // the town centre
export const VIEWPOINT: V3 = [-17, GROUND_Y, 13];      // the golden viewpoint (shot 9)

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

// The cover camera: low on the valley floor looking up at the
// coffin cliff — the hoist coffin already rising mid-face,
// the hero big in the left third on the grass, the claim
// card centred up-frame against the cliff and sky.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-12, 3.2, -6], look: [-1, 10.2, CLIFF_Z] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the anomaly is already
      // moving): a slow push up toward the coffin cliff
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole valley — town, church, terraces, pines, the cliff behind
      return full(dolly([42, 32, 44], [0, 2, -18], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 3: // THE BASE: across the hero + elder at the cliff foot, the coffin rows above
      return full(dolly([-3.5, 2.0, -6], [4.5, 9.5, CLIFF_Z], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 4: // THE CARVING YARD: the elder at his pine log, the village behind
      return full(dolly([7.5, 2.1, 12.5], [CARVE_SPOT[0] + 0.3, 1.1, CARVE_SPOT[2]], Math.exp(-0.0005 * lf), { fov: 44 }));
    case 5: // THE HOIST (re-hook): from the valley floor toward the lane — the
      // coffin already mid-face and rising when the shot opens
      return full(dolly([5.5, 2.8, -4], [HOIST_X, 10, CLIFF_Z], Math.exp(-0.00035 * lf), { fov: 48 }));
    case 6: // THE LITTLE COFFIN: low across the hero to the one-metre coffin at his feet
      return full(dolly([-6.5, 1.7, -6.5], [SMALL_SPOT[0], 0.5, SMALL_SPOT[2]], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // THE CHAIR: a long-lens stare at one coffin + its sangadil on the face
      return full(dolly([1.5, 10.2, -16], [CHAIR_SPOT[0], CHAIR_SPOT[1], CHAIR_SPOT[2]], Math.exp(-0.0003 * lf), { fov: 40 }));
    case 8: // THE CAVE: across the clearing to the stacked coffins in the dark mouth
      return full(dolly([24, 2.6, 2], [CAVE[0], 2.6, CAVE[2]], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 9: // THE GOLDEN WALL: the whole cliff at dusk, dozens of coffins in the light
      return full(dolly([-26, 9, 24], [2, 10, CLIFF_Z], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 10: // THE COVER AGAIN (punchline): the cliff by day, the coffins swaying
      return full(dolly([-12, 2.2, -6], [-1, 9.0, CLIFF_Z], Math.exp(-0.0004 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 1, -20] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [2, 8, CLIFF_Z] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [CARVE_SPOT[0], 1.0, CARVE_SPOT[2]] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [HOIST_X, 9, CLIFF_Z] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [SMALL_SPOT[0], 0.5, SMALL_SPOT[2]] };
    case 7: return { f: 0, cInf: 0.95, focus: () => [CHAIR_SPOT[0], CHAIR_SPOT[1], CHAIR_SPOT[2]] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [CAVE[0], 2.4, CAVE[2]] };
    case 9: return { f: 0, cInf: 0.45, focus: () => [0, 9, CLIFF_Z] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [0, 9, CLIFF_Z] };
    default: return { f: 0, cInf: 0.9, focus: () => [HOIST_X, 10, CLIFF_Z] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
