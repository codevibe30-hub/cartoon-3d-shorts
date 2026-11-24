// Timeline of the Vinicunca / Rainbow Mountain short (±47 s, Fafnir-ID format,
// bottom two-word subtitles). Vinicunca, Peru: a mountain striped like a
// rainbow — mineral bands from 65-million-year-old sediment layers, hidden
// under snow for centuries until the ice melted around 2013. Viewpoint
// 5,036 m (MINCETUR). Trailhead above 4,500 m, ±3 km each way.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Andean daylight, golden puna grass, the striped
// ridge (red / pink / mustard / green / white bands) with snow-capped
// Ausangate behind. Frame 0 is the clickbait cover: the hero's SHOCK
// face big in the near foreground, the rainbow ridge behind him, the
// claim text GIANT. The approved cover design is shot 1 and
// returns as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// Timing derived from voice/line_starts.json (assembled 47.227 s @ 30 fps → TOTAL 1417).
export const L: number[] = [2, 107, 263, 442, 605, 753, 889, 1021, 1155, 1304, 1417];
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
// The striped ridge runs along X at z -16 (base) .. -30 (crest, y ~13),
// -48 (back base). The puna grassland foreground runs z +30 .. -10.
// The trail climbs from the foreground (4, 0, 14) up the ridge face to
// the viewpoint (0, 6, -22). Ausangate's snow cone stands far behind
// at (-58, 0, -115). The hero stands at HERO_SPOT.
export const HERO_SPOT: V3 = [0, 0, 10];
export const RIDGE_Z_FRONT = -16;
export const RIDGE_Z_CREST = -30;
export const RIDGE_CREST_Y = 13;
export const VIEWPOINT: V3 = [0, 6, -22];
export const AUSANGATE: V3 = [-58, 0, -115];

// The ridge crest profile — world.ts builds the same curve.
export const crestAt = (x: number) => 13 + 2.5 * Math.sin(x * 0.11) + 1.5 * Math.sin(x * 0.23 + 1.7);

// Terrain height: flat puna (y=0) in front of the ridge, then the
// front slope rising toward the crest (z -16 → -30).
export const terrainY = (x: number, z: number): number => {
  if (z >= RIDGE_Z_FRONT) return 0;
  if (z <= RIDGE_Z_CREST) return 0;
  const v = (z - RIDGE_Z_FRONT) / (RIDGE_Z_CREST - RIDGE_Z_FRONT); // 0..1 down the slope
  return v * crestAt(x);
};

// The trail: parametric line from the foreground up the ridge face,
// glued to the terrain so hikers never float.
export const trailAt = (u: number): V3 => {
  const x = 4 - 5 * u;
  const z = 14 - 36 * u;
  return [x, terrainY(x, z), z];
};

// The tourist queue (shot 8): five hikers climb slowly along the
// trail while the hero walks with them — the crowd is the joke.
export const hikerAt = (i: number, tSec: number): { x: number; y: number; z: number } => {
  const a = L[7] / FPS, b = L[8] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  const u0 = 0.30 + i * 0.13;
  const [x, y, z] = trailAt(Math.min(0.92, u0 + 0.05 * u));
  return { x, y, z };
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

// The cover camera: low over the puna, hero BIG in the near
// foreground, the striped ridge behind him, Ausangate stacked
// behind, claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.2, 18], look: [0, 2.5, -30] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole striped ridge in one sweep, trail + viewpoint, Ausangate behind
      // camera pulled back + up (was [8,12,26]): hero at the trail was 17° off-axis, culled
      return full(dolly([0, 15, 34], [0, 5, -28], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: { // MEDIUM on the hero + the bands: he points at the stripes, camera near his shoulder
      // camera pulled back (was [-5,2.5,4]): hero was ~43° off-axis, culled; 9 units back = feet in frame
      return full(dolly([-2, 2.8, 11], [0, 3, -28], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 4: // MEDIUM on the layer-cake slice: the giant cake + rock strata, hero beside it
      // camera moved back (was [0,3,-2]): hero stood BESIDE the camera plane, culled
      return full(dolly([0, 3, 4], [0.5, 2.5, -12], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 5: // MEDIUM on the hero + the mineral bands: red/green/yellow behind him, cake in hand
      // camera re-centred (was [-3,2.2,10]): hero was ~16° off-axis, cake ~20° — both culled
      return full(dolly([-1, 2.2, 12], [0.5, 2, -8], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 6: // WIDE on the snow past: the ridge buried WHITE under snow, hero small in the cold
      // camera lowered (was y=6): hero's feet were at the bottom edge, only his head showed
      return full(dolly([0, 4, 22], [0, 4, -30], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 7: // MEDIUM on the melt: half snow, half stripes — the reveal
      // camera re-centred (was [4,4,12]): hero was ~30° off-axis, culled entirely
      return full(dolly([0, 4, 18], [0, 4.5, -30], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 8: // MEDIUM on the trail queue: hikers climbing in a line, alpacas beside the path
      // camera now looks ALONG the trail (was across it): queue was spread 38° wide, hiker C cut off
      return full(dolly([4, 3, 16], [1, 2, -10], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 9: // CLOSE on the panting hero: bent over, out of breath at 5,000 m
      return full(dolly([0, 1.8, 14.5], [0, 1.3, 10], Math.exp(-0.0006 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 4, -25] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [1, 3, -28] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [0.5, 2.5, -12] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [0.5, 2, -8] };
    case 6: return { f: 0, cInf: 0.5, focus: () => [0, 6, -30] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [0, 4.5, -28] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [1, 2, -8] };
    case 9: return { f: 0, cInf: 1.0, focus: () => [0, 1.3, 10] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
