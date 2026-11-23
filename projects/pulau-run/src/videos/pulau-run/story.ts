// Timeline of the Pulau Run short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Pulau Run, Kepulauan Banda,
// Maluku: a 3 km × 1 km island traded for Manhattan in the
// Treaty of Breda 1667 — because in the 17th century its
// nutmeg was worth more than gold. Courthope held it 1,540
// days, fell in 1620; England seized New Amsterdam in 1664
// and kept Manhattan, the Dutch got Run — and a 7,500%
// profit per nutmeg shipment.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: blazing tropical morning — graded turquoise sea,
// white sand, green nutmeg island, 17th-century sailing ships.
// Frame 0 is the clickbait cover: the hero's SHOCK face BIG on
// the beach, the tiny island + a tall ship behind him, a GIANT
// nutmeg, the claim text GIANT. Shot 1 returns as shot 10 for
// the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// PATCHED after voice assembly: story.ts TOTAL = audio dur x 30fps.
export const L: number[] = [2, 123, 301, 450, 635, 793, 976, 1150, 1336, 1510, 1635];
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
// SET A — the cover beach, near the origin. White sand at y = 0,
// the sea from z < 2 out to the horizon (z = -120); Run island
// rises at ISLAND (a green hill 3 km long in story-scale), the
// tall ships anchor off it. The hero stands on the sand at
// HERO_SPOT, a giant nutmeg beside him.
// SET B — the nutmeg grove, far east at x = GROVE_X.
// SET C — Courthope's fort on its hill, far east at x = FORT_X.
// SET D — New Amsterdam + the treaty table + the giant balance,
// far east at x = TOWN_X.
export const HERO_SPOT: V3 = [1.2, 0, 9.5];
export const ISLAND: V3 = [0, 0, -42];
export const SHIP_EN: V3 = [-10, 0, -22];
export const SHIP_NL: V3 = [9.5, 0, -26];
export const GROVE_X = 220;
export const FORT_X = 320;
export const TOWN_X = 420;

/** Shot-local progress 0..1 for shot id at absolute time tSec. */
export const shotU = (id: number, tSec: number): number => {
  const a = L[id - 1] / FPS, b = L[id] / FPS;
  return clamp01((tSec - a) / Math.max(0.01, b - a));
};

/** The English ship sails away (shot 6): 0 = at anchor off the
 *  fort, 1 = a speck on the sunset horizon. */
export const sailAwayAt = (id: number, tSec: number): number => {
  if (id < 6) return 0;
  if (id > 6) return 1;
  return smooth(shotU(6, tSec) / 0.95);
};

/** The English fleet arrives off New Amsterdam (shot 7): 0 = on
 *  the horizon, 1 = anchored before the town. */
export const fleetAt = (id: number, tSec: number): number => {
  if (id < 7) return 0;
  if (id > 7) return 1;
  return smooth(shotU(7, tSec) / 0.9);
};

/** The giant balance tips (shot 9): 0 = level, 1 = the island
 *  side sinks — the tiny island outweighs the city. */
export const tipAt = (id: number, tSec: number): number => {
  if (id < 9) return 0;
  if (id > 9) return 1;
  return smooth((shotU(9, tSec) - 0.25) / 0.6);
};

/** Where the hero stands in each shot (cast.ts places the
 *  sprite, world.ts never moves him). Default: the cover beach. */
export const heroSpotAt = (id: number): V3 => {
  switch (id) {
    case 3: return [GROVE_X - 0.5, 0, 4.5];   // in the nutmeg grove, beside the giant nutmeg
    case 5: return [FORT_X - 3.0, 0, 4.0];    // beside Courthope at the fort
    case 7: return [TOWN_X + 6.5, 0, 6.5];    // watching the fleet arrive at New Amsterdam
    case 8: return [TOWN_X - 2.5, 0, 4.5];    // at the treaty table
    case 9: return [TOWN_X + 0.5, 0, 2.5];    // beside the giant balance, in front of the table
    default: return HERO_SPOT;
  }
};

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "golden", "day", "day", "golden", "day"];
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

// The cover camera: LOW on the beach — the hero BIG at the right
// of frame, the tiny green island + tall ship behind him, the
// turquoise sea stretching to a graded sky. Low angle makes the
// island + ship tower over the sand.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [7.5, 1.5, 20], look: [-2.5, 1.8, -14] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition (k = 1 at the
      // shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the island a speck in the turquoise sea,
      // the ship a dot of sail — crane settling as waves roll in
      return full(dolly([20, 19, 34], [0, 0, -30], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // THE GROVE: medium — nutmeg trees heavy with red
      // fruit, the hero holding one giant nutmeg, gold coins
      return full(dolly([GROVE_X - 1.5, 2.4, 10.5], [GROVE_X + 1, 1.4, -4], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: { // THE RIVALS: wide low over the water — the English
      // ship and the Dutch ship facing off, guns run out. The
      // camera is centred and pulled back so BOTH ships, the
      // hero and both officers are in frame.
      return full(dolly([0, 3.0, 24], [0, 1.5, -22], Math.exp(-0.0004 * lf), { fov: 46 }));
    }
    case 5: { // THE FORT: low heroic — Courthope in red on his
      // little stone fort, cannons pointing at the sea. Pulled
      // back so the whole fort + hill + the men on the sand fit.
      return full(dolly([FORT_X - 8, 4.0, 22], [FORT_X + 1, 2.5, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    }
    case 6: // THE DEPARTURE: golden sunset wide — the English
      // ship shrinking toward the horizon, the Dutch flag rising
      // on the fort. The camera stands LEFT of the fort (FORT_X)
      // and looks right across it: the fort + flag sit on the
      // right third, the officer + hero watch from the sand
      // below the card, the ship slips away at the left edge.
      return full(dolly([FORT_X - 14, 5.0, 30], [FORT_X + 6, 2.0, -30], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 7: { // NEW AMSTERDAM: wide — the wooden Dutch town +
      // windmill on the shore, the English fleet sailing in
      return full({ pos: [TOWN_X + 14, 3.5, 16], look: [TOWN_X - 2, 1.5, -6], fov: 44 });
    }
    case 8: // THE TREATY: close on the table — two officers
      // signing, quill + wax seal, the scale between them.
      // Pulled back: the old camera stood inside the scene and
      // cut both officers out of frame.
      return full(dolly([TOWN_X - 1, 3.0, 18], [TOWN_X + 0.5, 1.2, -1], Math.exp(-0.0005 * lf), { fov: 44 }));
    case 9: // THE SWAP: low wide — the GIANT balance, the tiny
      // island sinking its pan as the city pan rises. The beam
      // is ~12 wide, so the camera stands back (22) and looks
      // at the beam's centre — otherwise a pan is cut off.
      return full(dolly([TOWN_X, 2.5, 22], [TOWN_X + 2, 2.0, -4], Math.exp(-0.0004 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 0, -42] };
    case 3: return { f: 0, cInf: 0.5, focus: () => [GROVE_X + 1, 1.4, -4] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [0, 1.5, -22] };
    case 5: return { f: 0, cInf: 0.6, focus: () => [FORT_X + 1, 2.6, -6] };
    case 6: return { f: 0, cInf: 0.55, focus: () => [FORT_X, 2.5, -4] };
    case 7: return { f: 0, cInf: 0.6, focus: () => [TOWN_X - 2, 1.5, -6] };
    case 8: return { f: 0, cInf: 0.95, focus: () => [TOWN_X + 0.5, 1.2, -1] };
    case 9: return { f: 0, cInf: 0.9, focus: () => [TOWN_X + 2, 2.6, -4] };
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.6, HERO_SPOT[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
