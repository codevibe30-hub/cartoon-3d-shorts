// Timeline of the Green Bank short (±50 s, Fafnir-ID format,
// bottom two-word subtitles). Green Bank, West Virginia: a town
// of ~150 people inside the National Radio Quiet Zone (1958,
// 13,000 sq miles) where Wi-Fi, cell phones and even microwaves
// are banned so the giant Green Bank Telescope can listen to
// the universe — and some people move there to escape the signal.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Appalachian daylight, green valley, white
// dish. Frame 0 is the clickbait cover: the hero's SHOCK face
// big on the valley road, the giant dish behind him, the claim
// text GIANT. The approved cover design is shot 1 and returns
// as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 119, 264, 423, 598, 741, 894, 1054, 1162, 1296, 1480];
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
// The valley road runs along Z: asphalt strip x -3..3, from
// z +30 down to z -120. Grass on both sides out to the hills.
// Town houses line the road at |x| ~10, fronts to the road.
// The giant Green Bank Telescope stands at DISH_POS, its dish
// tilted up at the sky. Two smaller dishes dot the far field.
// The hero's spot is on the roadside grass at HERO_SPOT.
export const HERO_SPOT: V3 = [1.2, 0, 9.5];
export const DISH_POS: V3 = [0, 0, -62];
export const DISH_D = 26; // stylised dish diameter (real GBT: 100 m)
export const VAN_PARK: V3 = [3.5, 0, -20];

// The patrol van (shot 8): it drives down the road from z +14
// to z -30 across the shot; every other shot it sits parked at
// VAN_PARK. world.ts (the mesh) and cast.ts share this, so the
// tracking camera never loses its subject.
export const vanAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  if (id !== 8) return { x: VAN_PARK[0], z: VAN_PARK[2], yaw: 0 };
  const a = L[7] / FPS, b = L[8] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return { x: 0.6, z: 14 + (-30 - 14) * u, yaw: Math.PI };
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

// The cover camera: low over the road, looking down the valley —
// the hero big in the near foreground right, the claim card
// centred up-frame, the giant dish + layered hills stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 2.5, 17], look: [0, 2.5, -40] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 10:
      // punchline loop: same cover framing, but a MUCH slower
      // push-in (0.0001) so the hero does not drift half out of
      // frame by the final frame
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0001 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole little town in one sweep, dish at the end
      return full(dolly([10, 10.5, 21], [0, 1, -38], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // VISTA: high over the valley — layered hills prove how vast the quiet zone is
      return full(dolly([4, 7, 24], [-2, 2.5, -60], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 4: // ELEVATED three-quarter view from the ROAD corridor
      // (|x| <= 4, y=5): the old low angle sat under the dish rim
      // and saw only its backside (f0510 v1 unreadable); the side
      // attempt at x=11 sat inside the house row + a tree (v2).
      // Houses line the road at |x|~10 and trees at |x|~8 — the
      // road centre is the only clear sightline to the dish.
      // From ~60 units out the whole 26-wide bowl + feed legs
      // read, hero a speck at its foot.
      return full(dolly([1.5, 5, -2], [0, 10, -62], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 5: // FEED ARM from the road corridor, mirror side, aiming
      // higher: whole dish + feed horn + sky-wave rings read,
      // hero listening below in the lower third (v1 had the camera
      // pressed against the bowl; v2 sat inside a tree at x=-9).
      return full(dolly([-2, 6, -4], [0, 12, -62], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 6: // MEDIUM across the road at the NO WI-FI sign
      return full(dolly([-8.6, 2.1, 3.5], [5.6, 1.5, -6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // MEDIUM on the old diesel truck at the roadside
      // (pulled back vs the first pass: the truck's nose was
      // clipped at the left edge in f0974)
      return full(dolly([7.5, 2.4, 0], [-3, 1.2, -14], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 8: { // TRACKING: ride alongside the patrol van down the road
      const vp = vanAt(8, f / FPS);
      return full({ pos: [vp.x + 6.8, 2.3, vp.z + 8.5], look: [vp.x, 1.1, vp.z - 1], fov: 42 });
    }
    case 9: // MEDIUM on the newcomers with their suitcases
      return full(dolly([4, 2.2, 2], [-4.5, 1.2, -12], Math.exp(-0.0004 * lf), { fov: 42 }));
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
    case 3: return { f: 0, cInf: 0.4, focus: () => [0, 2, -60] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [0, 12, -62] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [0, 13, -62] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [5.6, 1.4, -6] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [-3.2, 1.2, -14] };
    case 8: return { f: 0, cInf: 0.8, focus: (ff) => { const vp = vanAt(8, ff / FPS); return [vp.x, 1.1, vp.z]; } };
    case 9: return { f: 0, cInf: 0.8, focus: () => [-5.4, 1.2, -13] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
