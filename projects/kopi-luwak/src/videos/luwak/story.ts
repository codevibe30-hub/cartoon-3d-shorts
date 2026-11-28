// Timeline of the Kopi Luwak short (±31 s, Fafnir-ID format,
// bottom two-word subtitles). Kopi luwak — the world's most
// expensive coffee, made from beans eaten and passed by the
// Asian palm civet in Sumatra: the civet picks only the ripest
// cherries, gut enzymes ferment the beans, farmers collect,
// wash, dry and roast them. Wild beans reach $1,000/kg.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a Sumatran coffee garden in bright daylight —
// terraced green hills, coffee trees heavy with RED cherries,
// a GIANT steaming coffee cup as the hook prop, the luwak on a
// branch picking cherries, the farmer with his basket. Frame 0
// is the clickbait cover: the GIANT CUP big and ALREADY ALIVE
// (steam rising, cherries swaying), the luwak on its branch, the
// hero shocked BESIDE it, the claim text GIANT. The approved
// cover design is shot 1 and returns as shot 7 for the punchline
// loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing PATCHED from voice/line_starts.json (assembled VO 28.29 s,
// atempo 0.92 -> 30.75 s to hit the 30-35 s target).
// Line starts (frames): 2, 100, 227, 350, 516, 664, 805; TOTAL 922 = 30.73 s
export const L: number[] = [2, 100, 227, 350, 516, 664, 805, 922];
export const TOTAL = L[7];
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
// A dirt path runs along Z, camera side is +Z.
// The path is x in [-2.5, 2.5]; coffee trees line both sides
// from |x| = 4, terraced up the hills behind. A wooden hut
// stands on the RIGHT (x ~ +8, z ~ -10). The GIANT coffee cup
// sits left of the path centre (x ~ -1.8, z ~ -7.5) as the hook
// prop. Drying racks stand right of the path (x ~ +3.8, z ~ -6).
// The hero + luwak + farmer stand NEAR THE CAMERA AXIS —
// portrait half-FOV is only ~13.4 deg, so anyone at |x| > 3,
// z < -3 is off-frame (Santa v1 lesson: spots at x 3.6/5.6
// never appeared in any shot). Every spot below was checked
// against the cover camera axis (hero ~4 deg, luwak ~10 deg,
// cup ~6 deg off-axis).
export const PATH_HALF = 2.5;
export const ROAD_HALF = 2.5;
export const WALK_R = 4.3; // right field edge centre
export const WALK_L = -4.3; // left field edge centre
export const HERO_SPOT: V3 = [1.2, 0, -2.0];
export const LUWAK_SPOT: V3 = [1.8, 0, -3.2];
export const FARMER_SPOT: V3 = [-1.6, 0, -3.2];
export const CUP_SPOT: V3 = [-1.8, 0, -7.5];
export const RACK_SPOT: V3 = [3.8, 0, -6.0];
export const SACK_SPOT: V3 = [0.6, 0, -4.6];
export const HUT_POS: V3 = [7.5, 0, -10];
export const CHERRY_SPOTS: V3[] = [[2.6, 0, -5.0], [3.2, 0, -5.2], [4.1, 0, -4.6]];
// Coffee leaves drift down from the trees while the garden is on screen.
export const leavesAt = (tSec: number): number => (tSec * 0.7) % 1;
// The luwak's tail sway phase, driven by shot time.
export const tailAt = (tSec: number): number => Math.sin(tSec * 1.6) * 0.35;

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const LIGHTS_OF_SHOT: Light[] = ["day", "day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 7).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: LIGHTS_OF_SHOT[i] as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10 };
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

// The cover camera: low on the path, looking down the garden —
// the GIANT CUP big across the centre, the luwak on its branch,
// the hero at the right edge, the claim card centred up-frame.
// Portrait half-FOV is only ~13-15 deg, so the cup stays within
// ~10 deg of the axis.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [2.8, 2.2, 6.5], look: [-0.6, 1.6, -8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: over the path centre so no near tree can
      // cross the frame (house lesson: a near facade hid the
      // truck + card) — the whole terraced garden + hut + cup
      return full(dolly([0.5, 6.0, 13], [-0.5, 1.2, -12], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the luwak picking the ripest cherry
      return full(dolly([4.6, 2.0, 1.2], [1.8, 1.3, -4.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // THE COLLECTION: the farmer gathers the droppings
      return full(dolly([5.6, 2.8, 3.2], [2.0, 1.0, -4.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 5: // THE TASTE: hero holds the cup, steam rising, beans drying
      return full(dolly([4.2, 2.0, 2.5], [1.6, 1.3, -5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 6: // THE PRICE: sacks of beans + the $1000/KG board
      return full(dolly([5.0, 2.6, 4.0], [1.0, 1.2, -5.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1.5, -9] };
    case 3: return { f: 0, cInf: 0.95, focus: () => [2.2, 1.3, -4.5] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [0.8, 1.3, -7] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [1.6, 1.3, -5] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [2.4, 0.9, -4.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [-0.5, 1.6, -8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
