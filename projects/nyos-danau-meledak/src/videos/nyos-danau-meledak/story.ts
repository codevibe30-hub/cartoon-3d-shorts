// Timeline of the Lake Nyos short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Lake Nyos, Cameroon: a crater
// lake whose deep water silently loaded with magmatic CO2 for
// years until, on the night of 21 August 1986, it erupted
// without a sound — a limnic eruption whose invisible gas
// cloud rolled down the valleys and suffocated 1,746 people
// and 3,500 livestock within 25 km. Line boundaries live in
// the L array (start frame of each script line + total),
// derived from voice/line_starts.json; every shot, camera key,
// DOF key and story event is expressed relative to L. VISUAL
// CORE: a lush green crater lake in the Cameroon highlands —
// blue water, grass-green rim hills, a valley village below;
// the eruption shots play at readable moonlit night, the
// aftermath at dawn. Frame 0 is the clickbait cover: the lake
// ALREADY erupting — a giant gas-and-water fountain bursting
// from the surface, the white cloud billowing out — the
// hero's SHOCK face big beside it, the claim text GIANT.
// Shot 1's lake returns calmer in shot 10 for the punchline.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 179, 328, 471, 637, 826, 1026, 1256, 1434, 1610, 1791];
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
// The crater lake sits north: centre LAKE_C, surface LAKE_Y,
// an ellipse LAKE_RX × LAKE_RZ. Green rim hills ring it except
// the southern valley outlet, where the land falls away to the
// village plain (z +14..+46). The near shore (south shore)
// runs about z -28. The hero's cover spot is on the south-west
// shore, in the camera's left third.
export const LAKE_C: [number, number] = [0, -52];
export const LAKE_Y = 0.32;
export const LAKE_RX = 36;
export const LAKE_RZ = 24;
export const GROUND_Y = 0.1;
export const HERO_SPOT: V3 = [-12.5, GROUND_Y, -11.0]; // the cover spot: south-west shore
export const FOUNTAIN: V3 = [5, LAKE_Y, -57];          // where the lake bursts (shots 1, 5, 6 distant)
export const CRACK: V3 = [13.5, -0.5, -31.5];          // the magma crack in the shallows (shot 3)
export const ELDER_SPOT: V3 = [14.2, GROUND_Y, -23.2]; // the lakeside elder (shot 3)
export const BOTTLE: V3 = [16, GROUND_Y, -15];         // the giant soda bottle (shot 4)
export const SLIDE_TOP: V3 = [31, 7.5, -47];           // the landslide start, NE rim (shot 5)
export const SLIDE_END: V3 = [17, LAKE_Y, -41];        // where the rocks hit the water
export const VILLAGE: V3 = [16, GROUND_Y, 28];         // the valley village centre
export const PASTURE: V3 = [11, GROUND_Y, 21];         // the cattle pasture above the village (shot 7)
export const RAFT_A: V3 = [8, LAKE_Y, -58];            // degassing raft + pipe A (shot 10)
export const RAFT_B: V3 = [-11, LAKE_Y, -43];          // degassing raft + pipe B (shot 10)

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["night", "day", "day", "day", "night", "night", "golden", "golden", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
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

// The cover camera: low on the south valley slope looking
// north across the lake — the eruption fountain already
// bursting mid-lake, the hero big in the left third on the
// near shore, the claim card centred up-frame against the sky.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-15.5, 3.4, 6], look: [2, 3.4, -54] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the anomaly is already
      // moving): a slow push toward the bursting lake
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole crater — calm blue lake, green rim, the village in its valley
      return full(dolly([40, 34, 30], [0, 0, -38], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 3: // THE SHORE: across the hero + elder at the water's edge, the bubble crack beyond
      return full(dolly([1.0, 2.0, -9.0], [13.0, 0.2, -28.0], Math.exp(-0.0004 * lf), { fov: 50 }));
    case 4: // THE BOTTLE: the giant soda bottle fizzing on the shore, the lake behind
      return full(dolly([7.5, 2.1, -3], [BOTTLE[0] + 0.4, 1.5, BOTTLE[2]], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 5: // THE SLIDE (re-hook): from the south shore toward the NE rim — rocks
      // already tumbling when the shot opens, the hero small-nervous at frame left
      return full(dolly([4, 2.8, -14], [23, 2.2, -43], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 6: // THE CLOUD: high over the valley mouth looking south — the white
      // gas bank rolls down between camera and the lamplit village
      return full(dolly([-2, 4.6, -10], [10, 0.8, 26], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 7: // THE MORNING AFTER: low across the pasture to the silent village
      return full(dolly([2.5, 1.8, 10], [15, 0.7, 29], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 8: // THE RUSTED LAKE: across the shore to the red-brown water
      return full(dolly([-15, 2.3, -14], [2, 0.5, -50], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 9: // THREE LAKES: a high diorama wide — Nyos centre, Monoun and Kivu far off
      return full(dolly([0, 85, 46], [0, 0, -110], Math.exp(-0.00025 * lf), { fov: 52 }));
    case 10: // THE PIPES: the rafts mid-lake spraying their self-powered fountains
      return full(dolly([-16, 3.0, -12], [4, 1.2, -52], Math.exp(-0.0004 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 0.5, -44] };
    case 3: return { f: 0, cInf: 0.9, focus: () => [CRACK[0], 0.2, CRACK[2]] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [BOTTLE[0], 1.5, BOTTLE[2]] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [22, 1.5, -42] };
    case 6: return { f: 0, cInf: 0.55, focus: () => [12, 0.8, 24] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [PASTURE[0] + 2, 0.7, PASTURE[2] + 2] };
    case 8: return { f: 0, cInf: 0.75, focus: () => [0, 0.4, -48] };
    case 9: return { f: 0, cInf: 0.35, focus: () => [0, 0, -56] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [RAFT_A[0], 1.2, RAFT_A[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [FOUNTAIN[0], 2.2, FOUNTAIN[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
