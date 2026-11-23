// Timeline of the Emu War short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Australia Barat, 1932: 20,000 emus
// flood the wheat fields of the Campion district; three soldiers
// with two Lewis guns and 10,000 rounds are sent to stop them —
// and the birds win. The emus run 50 km/h in zig-zags, split into
// small groups with a lookout leader, outrun the gun-truck, and
// cost the army 10 bullets per bird; the farmers end up behind a
// 1,650 km fence. Meredith's own verdict: the birds "can face
// machine guns with the invulnerability of tanks."
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: blazing outback morning — graded sky, layered
// clouds, golden wheat sea, red dirt, gum trees, a weatherboard
// farmhouse — overrun by a flood of tall brown emus. Frame 0 is
// the clickbait cover: the hero's SHOCK face BIG in the wheat,
// one GIANT emu looming behind him, the flock streaming in, the
// claim text GIANT. Shot 1 returns as shot 10 for the punchline
// loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 138, 350, 526, 705, 913, 1066, 1227, 1439, 1557, 1752];
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
// SET A — the wheat field, near the origin. Red dirt at y = 0;
// the hero stands in the wheat at HERO_SPOT. The farmhouse sits
// back-left at FARMHOUSE, the fence line runs across z = -8, gum
// trees dot the field, and the emu flood pours in from the far
// horizon (z = -60). The GIANT cover emu stands at EMU_GIANT.
// SET B — the dam / waterhole ambush, far east at x = 220.
// SET C — the truck-chase dirt track, far east at x = 320.
// SET D — the Emu Fence + the tally of spent shells, far east
// at x = 420.
export const HERO_SPOT: V3 = [1.2, 0, 9.5];
export const EMU_GIANT: V3 = [-5, 0, -2];
export const FARMHOUSE: V3 = [-16, 0, -20];
export const FENCE_Z = -8;
export const DAM_X = 220;
export const TRUCK_X = 320;
export const FENCE_X = 420;

/** Shot-local progress 0..1 for shot id at absolute time tSec. */
export const shotU = (id: number, tSec: number): number => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  return clamp01((tSec - a) / Math.max(0.01, b - a));
};

/** The emu flood (shot 2): 0 = horizon empty, 1 = the flock has
 *  poured all the way into the foreground wheat. */
export const floodAt = (id: number, tSec: number): number => {
  if (id < 2) return 0;
  if (id > 2) return 1;
  return smooth((shotU(2, tSec) - 0.08) / 0.75);
};

/** The first volley (shot 5): 0 = guns quiet, 1 = the flock has
 *  scattered in zig-zags. The firing starts a beat into the shot. */
export const scatterAt = (id: number, tSec: number): number => {
  if (id < 5) return 0;
  if (id > 5) return 1;
  return smooth((shotU(5, tSec) - 0.18) / 0.3);
};

/** The truck chase (shot 7): 0 = truck at the start of the track,
 *  1 = truck at the far end, still behind the emus. */
export const chaseAt = (id: number, tSec: number): number => {
  if (id < 7) return 0;
  if (id > 7) return 1;
  return smooth(shotU(7, tSec) / 0.95);
};

/** Where the hero stands in each shot (cast.ts places the
 *  sprite, world.ts never moves him). Default: the wheat field. */
export const heroSpotAt = (id: number): V3 => {
  switch (id) {
    case 3: return [-4.0, 0, -4.0];      // at the broken fence with the farmers — clear of the fence posts, inside the frame
    case 4: return [6.5, 0, 6.5];        // watching the soldiers arrive
    case 8: return [FENCE_X - 3.5, 0, 4.5]; // at the tally, counting shells
    case 9: return [FENCE_X - 2.5, 0, 3.5]; // beside Meredith, facing the tank-emu
    default: return HERO_SPOT;
  }
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "golden", "day", "golden", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
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

// The cover camera: LOW and close in the wheat — the hero BIG at
// the right of frame, the giant emu looming behind-left, the
// flock streaming in behind them both, the farmhouse on the
// horizon. Low angle makes the emu tower over the hero.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [7.5, 1.4, 20], look: [-2.5, 1.6, -6] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  const U = clamp01(lf / Math.max(1, s.b - s.a)); // shot-local progress
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition (k = 1 at the
      // shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the wheat sea + farmhouse, crane settling
      // down as the emu flood pours in from the horizon
      return full(dolly([20, 17, 34], [0, 0, -22], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // THE BROKEN FENCE: medium shot, farmers at the hole
      // in the fence, rabbits hopping through, wheat trampled
      return full(dolly([-1.5, 2.2, 6.5], [-5.5, 1.0, -8.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: { // THE ARMY ARRIVES: wide — three soldiers, two Lewis
      // guns on tripods, the truck, the tiny hero watching
      return full(dolly([14, 3.2, 16], [-2, 1.2, -4], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 5: { // FIRST VOLLEY: low behind the gun — muzzle flashes,
      // dust, and the emus zig-zagging away into the wheat
      const shake = Math.sin(lf * 1.9) * 0.06 * (U > 0.18 && U < 0.75 ? 1 : 0);
      return full({ pos: [4.5 + shake, 1.9, 12], look: [-3, 1.4, -10], fov: 44 });
    }
    case 6: // THE LOOKOUT: medium on the leader emu on its rise,
      // its small groups scattering in every direction below
      return full(dolly([10, 3.4, 12], [-4, 1.6, -8], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: { // THE CHASE: tracking alongside the bouncing truck
      // as it lurches down the dirt track behind the emus
      const x = (TRUCK_X - 14) + 26 * U;
      const bounce = Math.abs(Math.sin(U * Math.PI * 9)) * 0.12;
      return full({ pos: [x - 3, 2.6 + bounce, 9.5], look: [x + 8, 1.5, -2], fov: 44 });
    }
    case 8: // THE TALLY: close on the shell pile — one emu stands
      // calmly beside it while Meredith counts on his fingers
      return full(dolly([FENCE_X - 1.5, 2.0, 10.5], [FENCE_X + 1, 1.2, -2], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 9: // THE TANK: low heroic angle — the emu stands like a
      // tank in the golden light, Meredith saluting its toughness
      return full(dolly([FENCE_X - 2, 1.1, 9], [FENCE_X + 1.5, 2.2, -3], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 0, -25] };
    case 3: return { f: 0, cInf: 0.45, focus: () => [-5.5, 1.0, -8.5] }; // NOTE: 0.45 not 0.85 — the full lens pass (>30 s/frame on software GL) times out on shot 3's near-field wheat; 0.45 keeps the background soft and the frame fast
    case 4: return { f: 0, cInf: 0.6, focus: () => [-2, 1.2, -4] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [-3, 1.4, -10] };
    case 6: return { f: 0, cInf: 0.5, focus: () => [-4, 1.6, -8] };
    case 7: return { f: 0, cInf: 0.6, focus: (ff) => { const c = camAt(7, ff); return [c.look[0], 1.5, -2]; } };
    case 8: return { f: 0, cInf: 0.95, focus: () => [FENCE_X + 1, 1.2, -2] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [FENCE_X + 1.5, 2.2, -3] };
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.6, HERO_SPOT[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
