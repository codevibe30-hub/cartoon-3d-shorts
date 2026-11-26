// Timeline of the Korea missing-4th-floor short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Korea: the number 4 is read
// "sa" — the same sound as the word for death — so many buildings,
// apartments and hospitals drop the 4 button from their elevators
// and label the floor "F" instead; some hospitals skip the floor
// entirely (3 straight to 5). Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L.
// VISUAL CORE: a bright modern Seoul tower lobby in polished
// stone and brushed steel, one GIANT elevator button panel whose
// buttons run 3, F, 5 — no 4 — with the F ring already pulsing at
// frame 0. The hero reacts BESIDE the panel, never covering it.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 187, 339, 530, 708, 851, 1018, 1184, 1359, 1503, 1668];
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
// Zone A — the tower LOBBY around the origin: elevator bank on the
// back wall (z = -14) with three door units at x = -7, 0, +7; the
// giant freestanding button panel at PANEL_POS, angled to the
// cover camera; the hero's cover mark at HERO_COVER beside it.
export const PANEL_POS: V3 = [1.15, 0, -2.6];
export const HERO_COVER: V3 = [-0.78, 0, -1.05];
export const BANK_Z = -14;
// Zone B — the elevator CAR interior, centred at CAR_C: doors on
// the z = -1.15 wall, button panel on the +X wall, camera rides
// inside at z ~ +1.
export const CAR_C: V3 = [60, 0, 0];
// Zone C — the hospital CORRIDOR, centred at CORR_C: room doors
// 401, 402, 403, 405 (NO 404) on the west wall x = -61.6, ward
// elevator at the far end (z = -11) whose panel skips 4 outright.
export const CORR_C: V3 = [-60, 0, 0];

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: "day" as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
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

// The cover camera: the giant button panel big at frame right,
// the hero shocked at frame left, the elevator bank behind them.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.1, 1.8, 6.4], look: [0.35, 1.4, -2.2] };
const CAM_CAR: { pos: V3; look: V3 } = { pos: [58.9, 1.6, 1.55], look: [60.3, 1.2, -1.5] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1: // COVER: panel + hero, gentle push-in, composition intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 44 }));
    case 2: // HIGH WIDE: the whole lobby + elevator bank
      return full(dolly([0, 3.2, 10.5], [0, 1.5, -12], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // IN THE CAR: doors ahead, panel at the right wall
      return full(dolly(CAM_CAR.pos, CAM_CAR.look, Math.exp(-0.0003 * lf), { fov: 52 }));
    case 4: // MEDIUM on the panel: the hero walks us through "sa"
      return full(dolly([-1.5, 1.7, 2.6], [0.75, 1.45, -2.3], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 5: // TWO-SHOT in the lobby: hero + an office worker shrug at 13-vs-4
      return full(dolly([3.6, 1.9, 4.2], [-0.8, 1.4, -5], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 6: // HOSPITAL CORRIDOR: doors + the ward elevator at the end
      return full(dolly([-60, 1.8, 8.5], [-60.4, 1.35, -8], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // CLOSE on the room doors: 401 402 403 ... 405?!
      return full(dolly([-57.8, 1.6, 1.6], [-63.4, 1.25, -2.6], Math.exp(-0.0005 * lf), { fov: 44 }));
    case 8: // LOBBY: the navy twist — ship graphic over the bank
      return full(dolly([0, 2.1, 6.2], [0, 1.7, -6], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 9: // CALM WIDE: the building is whole, only the number is gone
      return full(dolly([-4.6, 2.5, 8.5], [0.6, 1.35, -9], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 10: // PUNCHLINE LOOP: back in the car, 3 -> F -> 5, doors open
      return full(dolly(CAM_CAR.pos, CAM_CAR.look, Math.exp(-0.0003 * lf), { fov: 52 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 44 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 1: return { f: 0, cInf: 0.85, focus: () => [PANEL_POS[0], 1.5, PANEL_POS[2]] };
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 1.5, -12] };
    case 3: case 10: return { f: 0, cInf: 0.7, focus: () => [60.3, 1.3, -1.6] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [PANEL_POS[0], 1.45, PANEL_POS[2]] };
    case 5: return { f: 0, cInf: 0.8, focus: () => [-0.6, 1.4, -3.5] };
    case 6: return { f: 0, cInf: 0.5, focus: () => [-60.4, 1.35, -8] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [-62.8, 1.3, -2.6] };
    case 8: return { f: 0, cInf: 0.7, focus: () => [0, 1.7, -6] };
    case 9: return { f: 0, cInf: 0.45, focus: () => [0.6, 1.35, -9] };
    default: return { f: 0, cInf: 0.85, focus: () => [PANEL_POS[0], 1.5, PANEL_POS[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
