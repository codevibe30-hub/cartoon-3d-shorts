// Timeline of the Lampu Hijau short (±51 s, Fafnir-ID format,
// bottom two-word subtitles). Tokyo, Jepang: the green traffic
// light is called BLUE — "ao shingō" (青信号). Old Japanese had
// only FOUR colour words (red, black, white, ao); "midori"
// (green) only showed up in the Heian period (794–1185). The
// first signals arrived in the 1930s; after WWII the Road Traffic
// Act called the light 'ao'. The UN Convention on Road Signs and
// Signals (1968, Art. 23) says green = go — Japan NEVER signed
// it. In the early 1970s Japan compromised: the "go" lamp is made
// as blue as the rules allow — a blue-green "grue". Green apples
// are "aoringo" (blue apples), green leaves "aoba" (blue leaves).
// TONE: gentle fun at the LANGUAGE, never at Japanese people —
// the joke is that the language is older than the traffic light.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: a bright Tokyo intersection in daylight — the
// traffic light pole BIG and glowing blue-green, zebra crossing,
// cars waiting, pedestrians, buildings with signs receding down
// the street. Frame 0 is the clickbait cover: THE LIGHT ITSELF
// big in the frame, its blue-green lamp already pulsing from the
// first frame, the hero BIG beside it, pointing up, shocked,
// never covering the lamp. The approved cover design is shot 1
// and returns as shot 10 for the punchline loop (the hero
// laughing, the light behind him).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json.
// VO total 50.699 s = 1521 frames. Starts (s): 0.06, 3.67, 9.06, 15.80, 19.52, 24.22, 28.71, 34.29, 40.45, 46.62.
export const L: number[] = [2, 110, 272, 474, 586, 727, 861, 1029, 1213, 1398, 1521];
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
// at |x| ~11.5..20. THE LIGHT: the main traffic-light pole stands
// at the near-right sidewalk corner (5.6, 0, 3.5), head at y ~4.3,
// facing the camera (+Z). A second light faces the far traffic at
// (-5.6, 0, -8). A vintage 1930s light (short pole, round head)
// stands on the left sidewalk at (-5.6, 0, 10). A small shrine
// corner (torii + stone lanterns + pines) closes the far-left
// street at (-10, 0, -34). The colour board prop (four colour
// squares) stands at (-4.6, 0, 10.8) — clear of the shot-9 camera
// axis, so the apple prop is no longer hidden behind it. The globe
// stand at (6.0, 0, 5.5). Cars drive the road in lanes x = ±2.2, looping
// z +35 -> -70. Vending machine at (6.4, 0, 12).
export const LIGHT_POLE: V3 = [5.6, 0, 3.5];
export const LIGHT_HEAD_Y = 4.3;
export const LIGHT2: V3 = [-5.6, 0, -8];
export const VINTAGE_LIGHT: V3 = [-5.6, 0, 10];
export const SHRINE: V3 = [-10, 0, -34];
export const COLOR_BOARD: V3 = [-4.6, 0, 10.8];
export const GLOBE_STAND: V3 = [6.0, 0, 5.5];
export const CROSS_Z = 0;
// The hero stands on the ground in every shot (no boat here):
// per-shot spot + facing look. world.ts and cast.ts both read this.
// Spots sit ON the shot camera's view axis (the 9:16 frame is
// narrow — ~13° half-width — so off-axis heroes leave the frame).
export const heroSpotAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 1:
    case 10: return { x: 2.7, z: 7.8, yaw: -0.3 }; // on the camera axis, beside the light pole
    case 2: return { x: -3.3, z: 2, yaw: -0.2 }; // at the crossing, on the wide camera's axis
    case 3: return { x: -5.8, z: 11.5, yaw: 0.3 }; // beside the four-colour board, at the curb — left of it so the squares stay visible
    case 4: return { x: -7.1, z: -30, yaw: 0.2 }; // at the shrine corner, on the axis
    case 5: return { x: -7.8, z: 12.0, yaw: -0.3 }; // by the vintage 1930s light — offset off the camera-to-light ray
    case 6: return { x: 4.1, z: 8, yaw: -0.2 }; // by the globe stand
    case 7: return { x: 3.4, z: 5.5, yaw: -0.4 }; // close to the main light, pointing up (left edge) — head inside the frame, not below it
    case 8: return { x: 0.6, z: -1.5, yaw: 0 }; // mid-crossing on the zebra
    case 9: return { x: -6.3, z: 9.5, yaw: 0.3 }; // on the sidewalk with apple + leaf
    default: return { x: 2.7, z: 7.8, yaw: -0.3 };
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

// The cover camera: low on the sidewalk, looking up at the light
// pole — the blue-green lamp BIG in the frame's heart, the hero
// big in the near foreground on the camera axis, the claim card
// glued to the view axis up-frame. NOTE (Okinoshima lesson): no
// close-up may put the claim card over the hero's eyes — every
// camera here keeps the hero's head fully in frame with the card
// clear above it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.6, 13], look: [4.6, 3.8, 3.5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole intersection — zebra, waiting cars, both lights, buildings receding.
      return full(dolly([-8, 9, 22], [0, 1.5, -12], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // MEDIUM on the four-colour board — hero beside it, pointing at the four squares.
      // camera from the ROAD side (2.0, 19): the old sidewalk camera
      // put the board across the whole frame and the hero half out of
      // it; from here the board is ~60% wide and the hero stands whole
      // at its left edge. The vintage car was blocking the bottom of
      // this shot from the old camera — it now parks down the street.
      return full(dolly([2.0, 2.8, 19], [-4.8, 1.8, 10.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: { // MEDIUM at the shrine corner — torii + lanterns + pines, Heian mood in the same street.
      return full(dolly([-3.5, 2.6, -24], [-9.5, 2.5, -34], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 5: { // MEDIUM on the vintage 1930s light + old car — hero points at the round lamp.
      // look AT THE HERO (-7.8, 12.0), not at the light: the hero
      // used to stand exactly on the camera-to-light ray, so the
      // 4.8 m light filled the frame dead-centre behind him.
      return full(dolly([-9.5, 2.4, 17.5], [-7.8, 2.4, 12.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 6: { // MEDIUM on the globe stand — hero beside the globe, document board floating as a prop card.
      return full(dolly([1.5, 2.4, 13], [4.8, 2.0, 6.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 7: { // CLOSE-UP on the main light head — the blue-green lamp fills the frame, hero at the left edge pointing up.
      // Pulled back like Okinoshima shot 8 (fixed 2026-11-25): the
      // card must stay clear above the hero's head for the whole shot.
      // Camera LOW (y 2.6) and pulled back to (0.5, 12.0) with a
      // near-LEVEL look (y 3.2): the first version looked UP at the
      // lamp (look y 4.3) and the hero's head fell below the frame;
      // the second version still had him peeking only at the bottom
      // edge. Level look + distance puts his face in the lower-left.
      return full(dolly([0.5, 2.6, 12.0], [5.6, 3.2, 3.5], Math.exp(-0.0003 * lf), { fov: 38 }));
    }
    case 8: { // WIDE on the zebra — hero mid-crossing, cars stopped, the grue lamp glowing behind.
      return full(dolly([-6, 3.2, 10], [2, 2.5, -4], Math.exp(-0.0004 * lf), { fov: 46 }));
    }
    case 9: { // MEDIUM on the sidewalk — hero holds the green apple + leaf, cars passing behind.
      return full(dolly([-8.5, 2.4, 14], [-4.8, 1.8, 6.5], Math.exp(-0.0004 * lf), { fov: 40 }));
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
    case 10: return { f: 0, cInf: 0.9, focus: () => [4.6, 3.8, 3.5] };
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1.5, -12] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [-4.8, 1.8, 10.5] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-9.5, 2.5, -34] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [-7.8, 2.4, 12.0] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [4.8, 2.0, 6.5] };
    case 7: return { f: 0, cInf: 1.0, focus: () => [5.6, 3.2, 3.5] };
    case 8: return { f: 0, cInf: 0.5, focus: () => [0, 1.5, -1.5] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [-4.8, 1.8, 6.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [2.7, 1.3, 7.8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
