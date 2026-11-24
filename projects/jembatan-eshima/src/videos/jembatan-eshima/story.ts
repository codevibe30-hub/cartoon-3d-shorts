// Timeline of the Jembatan Eshima Ohashi short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Matsue, Jepang: the Eshima Ohashi
// bridge over Lake Nakaumi — 1.7 km long, 44.7 m tall, yet only a
// 6.1% / 5.1% gradient (~3.5 deg): the "roller coaster" look is a
// telephoto-lens illusion, made world-famous by a 2013 Daihatsu
// commercial. Line boundaries live in the L array (start frame of
// each script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L. VISUAL CORE: bright Japanese daylight, blue lake,
// the concrete deck rising like a wall in the telephoto cover.
// Frame 0 is the clickbait cover: the hero's SHOCK face big in
// the near foreground at the photo spot, the bridge looming behind
// him like a roller coaster, the claim text GIANT. Shot 1 returns
// as shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 52.075 s @ 30 fps → TOTAL 1562).
export const L: number[] = [2, 120, 313, 474, 655, 794, 951, 1114, 1285, 1438, 1562];
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
// Lake Nakaumi: water plane y=0, x -90..90, z -150..+70.
// The bridge runs along Z on the x=0 axis: near (Matsue) shore
// at z=+30 (deck y=0.6), apex y=12 at z=-30, far (Sakaiminato)
// shore at z=-90 (deck y=0.6). Deck half-width 1.6. The photo
// spot (famous telephoto viewpoint, by the minimarket) is on the
// near shore at z ~+46. Mt. Daisen rises far back at z=-135.
// The hero stands on the shore road at the photo spot.
export const APEX_Z = -30;
export const APEX_Y = 20;
export const NEAR_Z = 30;
export const FAR_Z = -90;
export const END_Y = 0.6;
export const DECK_HALF_W = 1.6;
export const PHOTO_SPOT: V3 = [1.6, 0, 46];
export const MART_SPOT: V3 = [5, 0, 40];
export const DAISEN: V3 = [-45, 0, -135];

/** Deck height at a given z (smooth profile: flat tangents at the
 *  ends and the apex, steepest mid-slope — like the real bridge). */
export const deckY = (z: number): number => {
  if (z >= APEX_Z) {
    const u = clamp01((NEAR_Z - z) / (NEAR_Z - APEX_Z));
    return END_Y + (APEX_Y - END_Y) * smooth(u);
  }
  const u = clamp01((z - FAR_Z) / (APEX_Z - FAR_Z));
  return END_Y + (APEX_Y - END_Y) * smooth(u);
};
/** Deck slope (dy/dz) at z, for pitching cars to the road. */
export const deckSlope = (z: number): number => {
  const d = 0.5;
  return (deckY(z - d) - deckY(z + d)) / (2 * d);
};

// The hero's cover position (shot 1/10): big in the near
// foreground, whole in frame, shock/laugh face to camera, the
// bridge wall rising behind him. Other shots place him at the
// viewpoint that illustrates his own VO line.
export const heroAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 2: return { x: 9.5, z: 35, yaw: -0.18 }; // wide: on the grass at the shore, small under the vista
    case 5: return { x: 8, z: 33, yaw: -0.3 }; // foot of the bridge: on the grass near the axis, gentle slope
    case 6: return { x: -1.1, z: -7, yaw: -0.2 }; // LEFT deck shoulder (car lane is x 0.55; lamp at z -2.5), waving at the passing kei car
    case 7: return { x: 2.0, z: 48, yaw: 0.15 }; // the photographer at his tripod
    case 8: return { x: 4.0, z: 36, yaw: -0.25 }; // roadside, watching the ad car climb
    case 9: return { x: 1.6, z: 45, yaw: -0.1 }; // at the photo spot with the tourists
    default: return { x: PHOTO_SPOT[0], z: PHOTO_SPOT[2], yaw: -0.18 };
  }
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

// The cover camera: ON the bridge axis, far back on the shore,
// narrow TELEPHOTO fov — the deck's 60 m of depth collapses and
// the road reads as a near-vertical wall, like the famous photo.
// The hero stands ~12 m ahead of the camera, BIG and whole.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.6, 58], look: [0, 9, -30] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 40 }));
    case 2: // HIGH WIDE: the whole lake crossing — bridge spanning
      // 1.7 km, two shores, Mt. Daisen in the distance. Camera near
      // the bridge axis so the hero on the shore stays in frame.
      return full(dolly([12, 8, 58], [0, 3, -30], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // LOW at water level: the cargo ship passing UNDER the deck
      // fov 50: the ship's hull at the frame bottom AND the deck
      // above both fit (at fov 42 the hull was cut by the edge)
      return full(dolly([10, 1.2, -8], [0, 10, -30], Math.exp(-0.0004 * lf), { fov: 50 }));
    case 4: // CLOSE on the rigid-frame structure: girders + pillars.
      // Camera pulled back to the side (was 12 m from the apex
      // pillar — it filled the frame as a flat grey wall). Now the
      // apex pillar, the far pillar and the deck underside all read.
      return full(dolly([14, 9, -6], [0, 13, -35], Math.exp(-0.0006 * lf), { fov: 38 }));
    case 5: // THE TWIST REVEAL: from the foot of the bridge, a 3/4
      // view — the slope reads gentle, a kei car climbs casually.
      // Camera well behind the hero (z 52 vs hero z 33) so he stays
      // inside the narrow 9:16 frame.
      return full(dolly([14, 4, 52], [0, 5, 0], Math.exp(-0.0002 * lf), { fov: 46 }));
    case 6: // ON THE DECK: camera on the deck centreline looking up
      // the slope — the kei car climbs away from us, the hero waves
      // from the right shoulder, both inside the frame
      return full(dolly([0, 5.4, 16], [1, 12, -2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // THE PHOTOGRAPHER: hero at his tripod with the giant
      // telephoto lens, the bridge looming steep behind him.
      // Camera on the axis behind the hero so he stays in frame.
      return full(dolly([0.5, 2.2, 57], [1.5, 2.5, 40], Math.exp(-0.0004 * lf), { fov: 34 }));
    case 8: // THE AD: a high 3/4 crane view down the slope — the
      // boxy kei car climbing toward the apex. (Was a low angle
      // from BELOW the deck: the deck itself hid the car.)
      return full(dolly([10, 20, 2], [0, 16, -20], Math.exp(-0.0002 * lf), { fov: 40 }));
    case 9: // THE PHOTO SPOT: tourists with cameras at the minimarket,
      // the bridge foot behind them — the thing they photograph.
      // (Was framed from the side: the bridge fell out of frame.
      // Camera pulled back to z 64 so the whole MART sign fits
      // without cutting a tourist at the other edge.)
      return full(dolly([4, 3, 64], [1, 3, 32], Math.exp(-0.0004 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 40 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 4, -30] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [0, 10, -30] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [0, 12, -30] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 4, -25] };
    case 6: return { f: 0, cInf: 0.85, focus: () => [0, 12, -5] };
    case 7: return { f: 0, cInf: 0.9, focus: () => [2.0, 1.6, 48] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [0, 18, -17] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [1, 2, 44] };
    default: return { f: 0, cInf: 0.9, focus: () => [PHOTO_SPOT[0], 1.3, PHOTO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
