// Timeline of the Toraja Ma'Nene short (±58 s, Fafnir-ID format,
// bottom two-word subtitles). Tana Toraja, Sulawesi Selatan:
// every three years the family opens the Patane cliff tomb,
// lifts the mummified ancestor out, brushes them clean, dries
// them in the sun and dresses them in new clothes — men in a
// full suit with tie and sunglasses, women in a wedding gown —
// before the ancestor "attends" the family gathering again.
// The cliff of Lemo holds 75 hand-carved niches from the 16th
// century, guarded by life-size wooden Tau-Tau effigies; the
// higher the tomb, the higher the status. TONE: a real funeral
// ritual — respect it. The humour is only in how
// unbelievable the tradition sounds, never at the dead.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: warm mountain light over a green valley, grey
// limestone cliff with dark niches, red-and-black woven cloth,
// the saddle roofs of the Tongkonan houses, rice terraces.
// Frame 0 is the clickbait cover: the ANCESTOR themself being
// lifted out of the open Patane coffin — BIG, already rising
// from the very first frame — family hands adjusting the suit,
// the hero BIG beside the coffin, shocked, never covering the
// ancestor. The approved cover design is shot 1 and returns as
// shot 10 for the punchline loop (the ancestor in new clothes,
// held up among the laughing family).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 57.394 s = 1722 frames. Starts (s): 0.06, 6.52, 12.57, 18.07, 23.50, 28.60, 34.07, 39.71, 45.32, 50.72.
export const L: number[] = [2, 196, 377, 542, 705, 858, 1022, 1191, 1360, 1522, 1722];
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
// The ritual clearing sits at the foot of the Lemo limestone
// cliff, which runs along X at z = -22 (north), 24 m tall, its
// face studded with dark hand-carved niches (liang) and a row of
// wooden Tau-Tau effigies on a ledge. The open Patane coffin
// stands at the clearing's heart (PATANE_SPOT); the ancestor is
// lifted there. Tongkonan houses with saddle roofs stand on both
// sides at |x| ~13, fronts to the clearing. Rice terraces step
// down the valley sides; green hills close the far east and west.
export const PATANE_SPOT: V3 = [0, 0, -4];
export const HERO_SPOT: V3 = [1.6, 0, -0.5];
export const CLIFF_Z = -22;
export const CLEARING_C: V3 = [0, 0, -6];

// The ancestor's lift per shot (a cut between shots, so the
// ancestor may jump — each shot is its own camera setup). Motion
// is LINEAR: the lift must already be moving at frame 0 (hook
// rule — no ease-in, no static cover). Shot 1 is the hook lift
// (the ancestor is ALREADY half out of the coffin at frame 0 —
// y 0.7, head + shoulders above the rim — and keeps rising to
// 0.85, pitch easing upright); shot 10 loops it. In other shots the ancestor
// rests where the beat puts them: brushed on a low bier (4),
// dressed and standing (5), held up among the family (6-7),
// resting in new clothes (8-9).
export const ancestorAt = (id: number, tSec: number): { y: number; pitch: number } => {
  const s = SHOTS[id - 1];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  switch (id) {
    case 1: return { y: 0.7 + 0.15 * u, pitch: 0.16 * (1 - u) }; // THE HOOK: ALREADY half out of the coffin at frame 0, still rising
    case 4: return { y: 0.15, pitch: 0.1 }; // on the low bier, being brushed
    case 5: return { y: 0, pitch: 0 }; // standing, dressed — suit + tie + sunglasses
    case 6: return { y: 0.35 + 0.08 * Math.sin(tSec * 1.6), pitch: 0 }; // held up among the family
    case 7: return { y: 0, pitch: 0 }; // seated among the family at the Tongkonan
    case 8: return { y: 0, pitch: 0 }; // resting, new clothes on
    case 9: return { y: 0, pitch: 0 }; // resting below the high tombs
    case 10: return { y: 0.7 + 0.15 * u, pitch: 0.16 * (1 - u) }; // the loop: lifted again, laughing family
    default: return { y: 0, pitch: 0 };
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

// The cover camera: low in the clearing, looking at the Patane —
// the ancestor BIG in the frame's heart as they rise from the
// coffin, the cliff + Tau-Tau stacked behind, the hero big in
// the near foreground beside the coffin. The claim card is glued
// to the view axis up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.6, 2.0, 6.5], look: [0, 1.6, -6] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 42 }));
    case 2: // HIGH WIDE: the whole valley in one sweep — cliff, Tongkonan, terraces
      return full(dolly([11, 11.5, 24], [0, 2, -22], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // MEDIUM on the Patane + cliff face — hero + open coffin + niches behind
      return full(dolly([0, 2.4, 4], [0, 2.2, -14], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: { // CLOSE on the brushing — the bier, NOT the coffin: camera low on the bier's side so the Patane never blocks the ancestor
      return full(dolly([0.6, 1.7, 0.8], [2.6, 1.0, -3.6], Math.exp(-0.0006 * lf), { fov: 40 }));
    }
    case 5: { // MEDIUM on the dressed ancestor — suit, tie, sunglasses; family around. Camera pulled back + centred so the family fits the narrow 9:16 frame
      return full(dolly([0.5, 2.2, 4.5], [0, 1.4, -3.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 6: { // WIDE reunion — the family across generations, ancestor held up among them
      return full(dolly([9, 5.5, 14], [0, 1.5, -8], Math.exp(-0.0003 * lf), { fov: 44 }));
    }
    case 7: // MEDIUM at the Tongkonan — pulled back so the house + the whole family fit the narrow frame
      return full(dolly([-4, 3.5, 14], [-11.5, 1.6, -2], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 8: { // WIDE on the Lemo cliff — niches + Tau-Tau rows, hero small below
      return full(dolly([0, 3.5, 10], [0, 8, -22], Math.exp(-0.0003 * lf), { fov: 44 }));
    }
    case 9: { // LOW-ANGLE up the cliff — pulled back so the family at the base AND the high tombs share the frame
      return full(dolly([0, 1.5, 12], [0, 9, -22], Math.exp(-0.0004 * lf), { fov: 44 }));
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
    case 10: return { f: 0, cInf: 0.9, focus: () => [0, 1.6, -4] };
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 2, -22] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [0, 2.2, -12] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [0, 1.1, -4] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [0, 1.5, -4.5] };
    case 6: return { f: 0, cInf: 0.4, focus: () => [0, 1.5, -8] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [-13, 1.8, -2] };
    case 8: return { f: 0, cInf: 0.4, focus: () => [0, 8, -22] };
    case 9: return { f: 0, cInf: 0.6, focus: () => [0, 9, -22] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
