// Timeline of the Sewa Pacar Imlek short (MAKS 35 s, Fafnir-ID
// format, bottom two-word subtitles). China: for Lunar New Year,
// singles rent a fake boyfriend to take home — up to 10,000
// YUAN A DAY (Hire Me Plz peak, People's Daily), 300+ Taobao
// shops once sold them, a price list per act (chat 30/h, dinner
// 50/h, kiss 50 a pop), and the contract is legally VOID.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is relative to L.
// VISUAL CORE: a bright Chinese New Year street — red lanterns
// strung across a paved street, a family house front with a red
// door + spring couplets, shop stalls, and one GIANT glowing
// rental listing board. Frame 0 is the clickbait cover: the
// listing board itself, already big and swaying, the heroine
// shocked BESIDE it, the hero narrator beside her. Shot 6
// returns to the cover street (golden hour) for the loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 27.322 s; line starts (s): 0.06, 4.45, 8.58, 12.09, 18.50, 21.56.
export const L: number[] = [2, 134, 257, 363, 555, 647, 819];
export const TOTAL = L[6];
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
// The CNY street runs along Z: paved street x -16..16, from z +28
// (foreground) to the family HOUSE front at z = -36 (red door,
// couplets, lanterns). Shop stalls line the EAST side (x ~18).
// The contract TABLE stands before the house door at z = -24.
// The empty CHAIR (shot 6) sits by the door at x 2, z -28.
export const HOUSE_Z = -36;
export const DOOR_Z = -31.5;
export const TABLE_Z = -24;
export const HERO_SPOT: V3 = [4.9, 0, -2];
export const HEROIN_SPOT: V3 = [-4.6, 0, -2];
export const DOOR_C: V3 = [0, 0, -30];
export const TABLE_C: V3 = [0, 0, -24];
export const CHAIR_C: V3 = [2, 0, -28];

/** Shoppers streaming along the street. dir = -1 walks toward the
 *  house (toward -Z), dir = +1 walks toward the camera (+Z).
 *  Each shopper has a fixed lane x and a phase offset so the crowd
 *  never marches in lockstep. */
export type CrowdDir = -1 | 1;
export const crowdAt = (id: number, tSec: number, i: number, dir: CrowdDir): { x: number; z: number; phase: number } => {
  const s = SHOTS[id - 1];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  const lanes = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, -3.0, -1.8, -0.6, 0.6, 1.8, 3.0, -4.2, 4.2];
  const x = lanes[i % lanes.length];
  const z0 = dir < 0 ? 14 - (i % 5) * 4.5 : -14 + (i % 5) * 4.5;
  const z = z0 + dir * u * 22;
  return { x, z, phase: (tSec * 1.5 + i * 0.37) % 1 };
};

/** The red stamp (shot 5): slams down onto the contract. Returns
 *  0 before the slam, 1 after (with a quick bounce). */
export const stampAt = (tSec: number): number => {
  const s = SHOTS[4];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  if (u < 0.45) return 0;
  const k = clamp01((u - 0.45) / 0.12);
  return 1 - 0.25 * Math.sin(k * Math.PI); // slam + tiny bounce
};

/** The rented boyfriend's vanish (shot 6): 1 = fully present,
 *  0 = gone (only the empty chair + flying money remain). */
export const vanishAt = (tSec: number): number => {
  const s = SHOTS[5];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  return 1 - smooth((u - 0.18) / 0.22);
};

/** A flying yuan note (shot 6): drifts up and away with a spin. */
export const moneyAt = (tSec: number, i: number): { x: number; y: number; z: number; rot: number } => {
  const s = SHOTS[5];
  const a = s.a / FPS, b = s.b / FPS;
  const u = clamp01((tSec - a) / Math.max(0.01, b - a));
  const k = smooth((u - 0.15 - i * 0.05) / 0.5);
  return {
    x: CHAIR_C[0] + (i - 2) * 0.9 + k * (2.5 + i * 0.8),
    y: 1.2 + k * (2.2 + (i % 3) * 0.7),
    z: CHAIR_C[2] + k * (3 + i),
    rot: k * (2 + i * 1.3),
  };
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHTS: Light[] = ["day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 6).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHTS[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8 };
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

// The cover camera: low over the street, looking at the house —
// the giant listing board big in the mid-ground, lantern strings
// overhead, the house + red door stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.4, 22], look: [0, 3.2, -18] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 6:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // THE MONEY: medium on the heroine counting a huge stack of yuan, boyfriend posing beside her
      return full(dolly([-5.5, 2.1, 6], [2.5, 1.4, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 3: // THE SHOPS: high wide — the street of Taobao stalls, listing boards, heroine with phone
      return full(dolly([-9, 8.5, 16], [5, 2.2, -28], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 4: // THE MENU: close on the giant price board + the boyfriend chatting/eating at the table
      return full(dolly([1.5, 2.2, -4], [0, 2.0, -16], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 5: // THE CONTRACT: close on the table — the paper, the red stamp, parents + boyfriend frozen
      return full(dolly([1.5, 2.2, -14], [0, 1.2, -24], Math.exp(-0.0006 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.6, focus: () => [2.5, 1.4, -6] };
    case 3: return { f: 0, cInf: 0.4, focus: () => [4, 2, -20] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [0, 2.0, -16] };
    case 5: return { f: 0, cInf: 1.0, focus: () => [0, 1.2, -24] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
