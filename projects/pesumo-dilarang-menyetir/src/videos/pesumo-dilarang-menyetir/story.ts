// Timeline of the Pesumo short (±58 s, Fafnir-ID format,
// bottom two-word subtitles). Tokyo, Jepang: sumo wrestlers are
// BANNED from driving their own cars by the Japan Sumo
// Association — many are too big to fit behind a steering wheel,
// and in a crash it is extremely hard to get a wrestler out of
// the wreck. The ban followed Mitoizumi's 1985 car crash; in 2007
// Kyokutenho crashed and was banned from one tournament + demoted
// to juryo. Breaking the rule fines/suspends the wrestler AND his
// oyakata. Wrestlers use chauffeurs or trains; a private driver
// is a status symbol; the first thing many do after retiring is
// get a driving licence. TONE: gentle fun at the absurd RULE
// (giant body vs tiny car), never at the wrestlers.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a bright Tokyo street in daylight — the road, the
// zebra, cars rolling, buildings with signs receding, and a dohyo
// ring plaza on the far-left lawn. Frame 0 is the clickbait cover:
// THE PESUMO HIMSELF, giant, towering behind a small red car,
// already shifting/bobbing from the first frame, the hero BIG
// beside him, shocked, never covering the pesumo. The approved
// cover design is shot 1 and returns as shot 10 for the punchline
// loop (the hero laughing, the pesumo holding his new SIM).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json.
// VO total 58.198 s = 1746 frames. Starts (s): 0.06, 3.42, 10.06, 16.29, 21.86, 28.50, 36.03, 40.85, 45.73, 50.63.
export const L: number[] = [2, 103, 302, 489, 656, 855, 1081, 1225, 1372, 1519, 1746];
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
// The road runs along Z: asphalt x -4.5..4.5, from z +40 down to
// z -80. A zebra crossing stripes across the road at z = 0.
// Sidewalks at |x| 4.5..10, raised 0.15. Buildings line both sides
// at |x| ~15.5. THE SMALL RED CAR parks on the right lane at
// (2.4, 0, 7.0), nose toward the camera — the pesumo towers
// behind it in shots 1/8/10. The black LUXURY CAR parks at
// (2.2, 0, -4) for shot 9. The CRASHED CAR leans tilted against
// the right utility pole at (3.4, 0, -11.5) for shot 4. The
// VINTAGE CAR parks at (-3.2, 0, -14) for the 1985 flashback
// (shot 5). The DOHYO plaza sits on the far-left lawn at
// (-11, 0, -34): clay ring + straw bales + four pillars + roof.
// The BANZUKE board stands on the right sidewalk at (6.0, 0, 5.5)
// for shot 6. Cars drive the road in lanes x = ±2.2, looping
// z +35 -> -70. Vending machine at (6.4, 0, 12).
export const SMALL_CAR: V3 = [2.4, 0, 7.0];
export const LUX_CAR: V3 = [2.2, 0, -4];
export const CRASH_CAR: V3 = [3.4, 0, -11.5];
export const VINTAGE_CAR: V3 = [-3.2, 0, -14];
export const DOHYO: V3 = [-11, 0, -34];
export const BANZUKE: V3 = [6.0, 0, 5.5];
export const CROSS_Z = 0;
// The hero stands on the ground in every shot (no boat here):
// per-shot spot + facing look. world.ts and cast.ts both read this.
// Spots sit ON the shot camera's view axis (the 9:16 frame is
// narrow — ~13° half-width — so off-axis heroes leave the frame).
export const heroSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 1:
    case 10: return { x: -1.6, z: 8.2, yaw: -0.3 }; // on the camera axis, beside the small red car
    case 2: return { x: -8.5, z: -28, yaw: 0.2 }; // at the dohyo plaza, on the wide camera's axis
    case 3: return { x: 1.2, z: 8.0, yaw: 0.3 }; // beside the small red car, on the camera axis
    case 4: return { x: 1.0, z: -8.0, yaw: -0.2 }; // by the crashed car, on the axis
    case 5: return { x: -5.5, z: -11, yaw: 0.3 }; // by the vintage car + newspaper, on the axis
    case 6: return { x: 3.5, z: 8.0, yaw: -0.2 }; // by the banzuke board
    case 7: return { x: 3.8, z: 7.5, yaw: -0.2 }; // by the oyakata — FIX (stills-check round 2): was (2.5,8.5), too close to the camera, cropped at the left edge
    case 8: return { x: -1.2, z: 8.5, yaw: 0.3 }; // waving at the chauffeur-driven car
    case 9: return { x: 0.2, z: 0.5, yaw: 0.2 }; // by the luxury car
    default: return { x: -1.6, z: 8.2, yaw: -0.3 };
  }
};
// The pesumo (giant, stout, topknot, mawashi): per-shot spot +
// scale. He towers behind cars (the car occludes his legs, his
// torso + head rise above the roof) or stands in the dohyo.
export const pesumoSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number; scale: number } => {
  void tSec;
  switch (id) {
    case 1:
    case 10: return { x: 2.4, z: 5.0, yaw: -0.15, scale: 1.9 }; // towering behind the small red car
    case 2: return { x: -11, z: -34, yaw: 0, scale: 1.7 }; // in the dohyo ring
    case 3: return { x: 3.4, z: 6.5, yaw: -0.3, scale: 1.6 }; // stuck at the car door, sidewalk side
    case 4: return { x: 1.8, z: -10.5, yaw: 0.2, scale: 1.6 }; // dazed by the crashed car
    case 5: return { x: -5.0, z: -12.5, yaw: 0.3, scale: 1.5 }; // 1985: nervous by the vintage car
    case 6: return { x: 7.5, z: 5.5, yaw: -0.2, scale: 1.6 }; // nervous by the banzuke board
    case 7: return { x: 6.5, z: 6.5, yaw: -0.2, scale: 1.4 }; // peeking behind the oyakata, nervous
    case 8: return { x: 2.4, z: 4.8, yaw: -0.15, scale: 1.5 }; // in the back seat, head above the roof
    case 9: return { x: 2.2, z: -6.5, yaw: 0.15, scale: 1.6 }; // grinning behind the luxury car
    default: return { x: 2.4, z: 5.0, yaw: -0.15, scale: 1.9 };
  }
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: (i + 1 === 5 ? "golden" : "day") as Light, tau: (t: number) => t,
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

// The cover camera: low on the sidewalk, looking at the small red
// car + the giant pesumo towering behind it — the pesumo BIG in
// the frame's heart, the hero big in the near foreground on the
// camera axis, the claim card glued to the view axis up-frame.
// NOTE (Okinoshima lesson): no close-up may put the claim card
// over the hero's eyes — every camera here keeps the hero's head
// fully in frame with the card clear above it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.4, 14.5], look: [1.8, 2.2, 6.5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the dohyo plaza — clay ring, straw bales, roof pillars, the pesumo in the ring.
      return full(dolly([-4, 8, -14], [-11, 1.5, -34], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // MEDIUM on the car door — the pesumo stuck at the door, arms spread, the small car beside him.
      return full(dolly([7.5, 2.4, 12], [3.0, 1.6, 6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: { // MEDIUM on the crashed car — tilted against the pole, the pesumo dazed beside it.
      // FIX (stills-check round 2): the old camera at [7,2.6,-4] stared
      // straight into the street tree at (5.8,-6) — the whole shot was
      // canopy. Moved to the left sidewalk; the view axis now runs clear
      // of both tree lines.
      return full(dolly([-3.5, 2.6, -3.5], [3.0, 1.2, -11.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 5: { // MEDIUM flashback 1985 — the vintage car + newspaper, golden light.
      return full(dolly([-8, 2.6, -6], [-3.2, 1.6, -14], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 6: { // MEDIUM on the banzuke board — rank list + red down arrow, the pesumo nervous beside it.
      return full(dolly([-1, 2.4, 12], [5.5, 1.8, 5.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 7: { // MEDIUM on the oyakata — the coach with the fine ticket, the pesumo peeking behind.
      // FIX (stills-check round 2): old camera [1.5,2.4,12] cropped the
      // hero half out of the left edge; pulled back so hero + oyakata +
      // pesumo all fit the 9:16 frame.
      return full(dolly([1.5, 2.6, 14.5], [5.0, 1.8, 6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 8: { // MEDIUM on the chauffeur car — the pesumo's head above the roof, the chauffeur bowing at the door.
      return full(dolly([0.5, 2.4, 14], [2.6, 1.6, 6], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 9: { // MEDIUM on the luxury car — black car, chauffeur bowing, the pesumo grinning behind it.
      return full(dolly([0.5, 2.4, 2], [2.2, 1.4, -4], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [1.8, 2.2, 6.5] };
    case 2: return { f: 0, cInf: 0.45, focus: () => [-11, 1.5, -34] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [3.0, 1.6, 6.5] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [3.0, 1.2, -11.5] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [-3.2, 1.6, -14] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [5.5, 1.8, 5.5] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [4.5, 1.8, 6] };
    case 8: return { f: 0, cInf: 0.9, focus: () => [2.6, 1.6, 6] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [2.2, 1.4, -4] };
    default: return { f: 0, cInf: 0.9, focus: () => [-1.6, 1.3, 8.2] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
