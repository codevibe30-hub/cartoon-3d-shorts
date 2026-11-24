// Timeline of the Golden Bridge (Cầu Vàng) short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Ba Na Hills, Da Nang, Vietnam: a 150 m
// golden pedestrian bridge at ~1,400 m altitude, held by two giant
// hands that LOOK like ancient weathered stone but are steel frame +
// wire mesh + fibreglass built in 2018 — pure decoration; steel
// pillars do the real holding. Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and story
// event is expressed relative to L. VISUAL CORE: bright mountain
// morning, a golden ribbon curving over a sea of clouds, the giant
// stone hands cupping the deck, flower beds along the gold rail.
// Frame 0 is the clickbait cover: the hero's SHOCK face big in the
// near foreground, a giant stone hand gripping the golden deck
// behind him, the claim text GIANT. Shot 1 returns as shot 10
// for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 53.409 s @ 30 fps → TOTAL 1602).
export const L: number[] = [2, 120, 285, 454, 615, 751, 950, 1099, 1300, 1473, 1602];
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
// The bridge deck runs along Z on a mountainside ledge at y ~10:
// near end (cable-car station) z=+42, far end (gardens) z=-42.
// It curves in an S: x = 4*sin((42-z)/84 * 2π). A forested
// hillside terrace sits just below deck level on the mountain
// side (x < 2); the valley + sea of clouds falls away in front
// (+x, +z). Two giant hands cup the deck from the valley side
// (+x): HAND_A at z=+14, HAND_B at z=-26. Deck half-width 1.25.
export const NEAR_Z = 42;
export const FAR_Z = -42;
export const DECK_HALF_W = 1.25;
export const HAND_A_Z = 14;
export const HAND_B_Z = -26;
export const STATION: V3 = [6, 0, 50];
export const GARDEN: V3 = [0, 0, -52];

/** Deck centreline x at a given z (gentle S-curve). */
export const deckX = (z: number): number => 4 * Math.sin(((NEAR_Z - z) / (NEAR_Z - FAR_Z)) * Math.PI * 2);
/** Deck height at a given z (gentle undulation, max mid-span). */
export const deckY = (z: number): number => 10 + 0.8 * Math.sin(((NEAR_Z - z) / (NEAR_Z - FAR_Z)) * Math.PI);
/** Deck slope (dy/dz) at z, for pitching props to the deck. */
export const deckSlope = (z: number): number => {
  const d = 0.5;
  return (deckY(z - d) - deckY(z + d)) / (2 * d);
};
/** Deck centreline direction (dx/dz) at z, for yawing props to the deck. */
export const deckYaw = (z: number): number => {
  const d = 0.5;
  return Math.atan2(deckX(z - d) - deckX(z + d), 2 * d);
};

// The hero's cover position (shot 1/10): big in the near
// foreground, whole in frame, shock/laugh face to camera, the
// golden deck + a giant hand behind him. Other shots place him at
// the viewpoint that illustrates his own VO line. All hero spots
// are ON the deck (y = deckY(z)) unless noted.
export const heroAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  switch (id) {
    case 2: return { x: deckX(0) - 0.4, z: 0, yaw: -0.15 }; // wide: mid-deck, small under the vista
    case 3: return { x: deckX(20) + 0.7, z: 20, yaw: 0.35 }; // at the deck edge, looking down at the clouds
    case 4: return { x: deckX(HAND_A_Z) + 0.4, z: HAND_A_Z + 3, yaw: -0.4 }; // beside Hand A's fingertips, for scale
    case 5: return { x: deckX(HAND_A_Z) + 1.6, z: HAND_A_Z - 1, yaw: -0.5 }; // touching the hand's cracked stone
    case 6: return { x: deckX(HAND_B_Z) + 0.5, z: HAND_B_Z + 1, yaw: 0.4 }; // inside the scaffold area, pointing at the painter
    case 7: return { x: deckX(-6) - 0.6, z: -6, yaw: 0.2 }; // under-deck shot: hero on the deck above, seen from below
    case 8: return { x: deckX(0) + 1.0, z: 0, yaw: -0.2 }; // valley side, beside the hanging segment
    case 9: return { x: deckX(6) + 0.0, z: 6, yaw: -0.1 }; // with the tourists, taking selfies
    default: return { x: deckX(38) - 0.5, z: 38, yaw: -0.18 };
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

// The cover camera: pulled BACK past the deck's near end and aimed
// along the curve's sweep — the deck curves right across the frame,
// Hand A reads on the right, and the hero (left deck edge, z=38)
// sits ~5° off the view axis, BIG and whole. Raised to y=15.5 so
// the hand's palm shows BELOW the deck edge (at y=12.5 the deck
// slab hid the palm entirely — only fingertips peeked over).
const CAM_COVER: { pos: V3; look: V3 } = { pos: [deckX(52) + 0.5, 15.5, 52], look: [deckX(20), 10.0, -5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 40 }));
    case 2: // HIGH WIDE: the whole 150 m golden curve, both hands,
      // the sea of clouds below, mountains behind. Camera high on
      // the valley side so the hero mid-deck stays in frame.
      return full(dolly([26, 26, 34], [deckX(-6), 10, -8], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // AT THE EDGE: hero at the gold railing looking DOWN —
      // clouds drift below his feet. Camera behind him, slightly
      // high, so the cloud sea under the deck reads. (Was: camera
      // too far right — the hero sat 13° off-axis, half cut.)
      return full(dolly([deckX(22) + 1.5, 13, 25], [deckX(12), 9.5, 6], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 4: // CLOSE ON THE HAND: Hand A's fingers curled around the
      // golden deck edge — the hero beside one fingertip for scale.
      // Camera HIGH on the mountain side, looking DOWN (was low:
      // the deck's unlit underside filled the frame as a white wall).
      return full(dolly([deckX(HAND_A_Z) - 5, 16.5, HAND_A_Z + 14], [deckX(HAND_A_Z) + 2.5, 10.5, HAND_A_Z], Math.exp(-0.0006 * lf), { fov: 38 }));
    case 5: // THE ANCIENT STONE: macro on the hand's surface —
      // cracks + green moss, the hero's hand touching the stone.
      // Camera pulled back + raised so the hero's head stays inside
      // the vertical FOV (was: head 31° above the view axis, cut).
      return full(dolly([deckX(HAND_A_Z) + 6, 13, HAND_A_Z + 7], [deckX(HAND_A_Z) + 2, 11.3, HAND_A_Z - 1], Math.exp(-0.0004 * lf), { fov: 36 }));
    case 6: // THE TWIST REVEAL: scaffolding around Hand B, a worker
      // painting the "stone" texture onto a fibreglass panel — the
      // hand is younger than the paint on it. Camera on the valley
      // side, wide enough for scaffold + hand + hero.
      return full(dolly([deckX(HAND_B_Z) + 10, 13, HAND_B_Z + 12], [deckX(HAND_B_Z) + 1, 10.5, HAND_B_Z], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // UNDER THE DECK: from below, looking up — the steel
      // pillars that REALLY hold the bridge, the hand floating
      // beside them, decorative. Camera low on the valley side.
      return full(dolly([deckX(-6) + 8, 5.5, 2], [deckX(-6), 10.5, -8], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 8: // THE BUILD: a crane lifting a golden deck segment
      // between the two hands. Camera pulled BACK + RAISED on the
      // mountain side so the whole crane (mast + jib + cable +
      // segment) fits and the hero shows whole over the rail.
      return full(dolly([deckX(2) - 10, 15, 22], [deckX(2) + 2, 12, -2], Math.exp(-0.0002 * lf), { fov: 42 }));
    case 9: // THE VIRAL SPOT: hero + tourists taking selfies on the
      // golden walkway, flower beds along the rail, clouds behind.
      // Camera on the deck axis behind them.
      return full(dolly([deckX(6) + 0.5, 12.4, 14], [deckX(2), 11, 0], Math.exp(-0.0004 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 40 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [deckX(-6), 10, -8] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [deckX(14), 9, 8] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [deckX(HAND_A_Z) + 2, 10.5, HAND_A_Z] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [deckX(HAND_A_Z) + 2.2, 10.2, HAND_A_Z - 1] };
    case 6: return { f: 0, cInf: 0.7, focus: () => [deckX(HAND_B_Z) + 1, 10.5, HAND_B_Z] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [deckX(-6), 10.5, -8] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [deckX(-2), 12, -2] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [deckX(2), 11, 0] };
    default: return { f: 0, cInf: 0.9, focus: () => [deckX(38) - 0.5, 11.2, 38] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
