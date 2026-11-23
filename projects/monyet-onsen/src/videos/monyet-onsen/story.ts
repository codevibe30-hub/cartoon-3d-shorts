// Timeline of the Monyet Onsen short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Jigokudani, Nagano: Japanese
// macaques bathing in a 42°C onsen while snow falls at −10°C —
// a habit learned in 1963 when one young monkey climbed into
// the Korakukan inn's bath. Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L. VISUAL CORE: bright
// winter daylight, white snow + blue shadows, dark pines with
// snow caps, turquoise steaming pool, red monkey faces. Frame 0
// is the clickbait cover: the hero's SHOCK face BIG and WHOLE in
// the near foreground, monkeys soaking in the steaming pool
// behind, the claim text GIANT. Shot 1 returns as shot 10 for
// the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// Patched from voice/line_starts.json: total 55.179s -> TOTAL 1655.
export const L: number[] = [2, 176, 336, 493, 691, 833, 1030, 1170, 1341, 1506, 1655];
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
// The onsen pool sits at the centre (z −10): a stone-rimmed oval
// basin, water surface at y 0.45, rim top y 0.6. Monkeys soak in
// it chest-deep (feet on the basin floor y 0.05). A snowy valley
// floor runs z +25..−30; snow pines ring the pool; rocky cliffs
// rise at the back (z −35..−60). The Korakukan inn stands far
// back-left (x −13, z −20) with its own wooden bath in front.
// The hero stands on the snow at the pool's near edge for the cover.
export const POOL_C: V3 = [0, 0, -10];
export const POOL_WATER_Y = 0.45;
export const INN_C: V3 = [-13, 0, -20];
export const SIGN_SPOT: V3 = [-3.6, 0, -6.5];
export const HERO_SPOT: V3 = [1.3, 0, 2.0]; // ~7° off the cover-camera axis at scale 1.6 (9:16 half-FOV is only ~13°) — BIG and WHOLE, not cut at the edge

// The hero's cover position (shot 1/10): big in the near
// foreground right, whole in frame, shock/laugh face to camera.
// Shot 2 (wide): he stands on the snow mid-valley, on the axis.
export const heroAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void tSec;
  if (id === 2) return { x: 3, z: -5, yaw: -0.18 };
  return { x: HERO_SPOT[0], z: HERO_SPOT[2], yaw: -0.18 };
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

// The cover camera: low at the pool's near edge, looking down the
// pool to the cliffs — the hero BIG in the near foreground right,
// monkeys soaking in the steaming pool mid-frame, the claim card
// centred up-frame, snow pines stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-0.6, 2.0, 13.5], look: [0.4, 1.8, -10] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole snowy valley in one sweep
      // (camera lower than v1: less empty snow foreground)
      return full(dolly([12, 8, 16], [0, 2, -16], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // CLOSE-UP: one soaking monkey fills the frame — red
      // face, snow on its head, steam curling past (camera CLOSE:
      // 1.5 m — at 6 m the 0.56 m monkey would be 14% of frame)
      return full(dolly([0.4, 1.25, -8.6], [0, 0.8, -10], Math.exp(-0.0006 * lf), { fov: 38 }));
    case 4: // 1963 FLASHBACK: the Korakukan inn's wooden bath —
      // one young monkey on the rim, guests watching from the veranda
      return full(dolly([-7.5, 2.0, -10.5], [-11.2, 1.0, -16.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // RE-HOOK: monkeys hopping into the pool one by one
      // (camera higher than v1: the near rim stones stop dominating)
      return full(dolly([3.0, 2.8, 2.0], [0, 0.9, -10], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 6: // THE SIGN: wooden JIGOKUDANI 1964 signpost by the
      // pool, the monkeys' own bath behind it
      return full(dolly([3.8, 2.0, 0.5], [-3.0, 1.4, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // GROOMING CLOSE: two monkeys picking each other's
      // fur in the warm water, spa chatter — monkeys TOGETHER on
      // the axis (v1: 1.4 m apart at 2.6 m = 30° span, both fell
      // off-frame); camera centred on the pair
      return full(dolly([0, 1.5, -7.8], [0, 0.8, -10.1], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 8: // MOTHER + BABY: the baby clings to her chest in
      // the water, both faces red in the steam (camera close: 2.7 m)
      return full(dolly([-0.6, 1.4, -8.2], [0.6, 0.85, -10.5], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 9: // LIFE 1970: the giant magazine cover + camera
      // flashes, the monkey posing like a celebrity
      return full(dolly([0, 2.2, -1.5], [0, 1.9, -10], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 2, -16] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [0, 1.0, -10] };
    case 4: return { f: 0, cInf: 0.85, focus: () => [-11, 1.1, -16] };
    case 5: return { f: 0, cInf: 0.85, focus: () => [0, 0.9, -10] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [-3.0, 1.4, -8] };
    case 7: return { f: 0, cInf: 1.0, focus: () => [0, 0.8, -10.1] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [0.6, 0.9, -10.5] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [0, 1.9, -10] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
