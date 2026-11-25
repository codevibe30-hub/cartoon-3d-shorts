// Timeline of the Sedlec short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). The Sedlec Ossuary (Kostnice),
// Kutná Hora, Czechia: a small chapel beneath the Cemetery
// Church of All Saints, decorated with the bones of tens of
// thousands — a giant bone chandelier holding at least one
// of every bone in the human body, four bell-shaped bone
// pyramids, the Schwarzenberg coat of arms in bone, and the
// bone signature of František Rint, the woodcarver hired in
// 1870 to arrange the heaps. Line boundaries live in the L
// array (start frame of each script line + total), derived
// from voice/line_starts.json. VISUAL CORE: the bone
// chandelier itself, ALREADY SWAYING at frame 0, in a stone
// chapel full of bones; shots 3–5 step outside to the church
// and its graveyard for the 1278 origin story. Shot 10
// returns to the cover angle.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 147, 347, 537, 687, 820, 1048, 1252, 1421, 1607, 1740];
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
// THE CHAPEL (interior): a stone nave along z, floor y = 0,
// altar wall at z = -52, entrance wall at z = +6, side walls
// at x = ±13, columns at x = ±11. The bone chandelier hangs
// at CHANDELIER (pivot on the vault), its body centred near
// y ≈ 7. Four bell-shaped bone pyramids stand in the corners.
// THE CHURCHYARD (exterior): far +z — the church facade at
// z ≈ +150 facing the graveyard (z +95..+138).
export const FLOOR_Y = 0;
export const CHANDELIER: V3 = [0, 7.0, -22];          // the bone chandelier's heart
export const CHANDELIER_PIVOT_Y = 11.6;               // where its chain meets the vault
export const PYRAMIDS: V3[] = [
  [-9.5, 0, -44], [9.5, 0, -44], [-9.5, 0, -2], [9.5, 0, -2],
];
export const COA_POS: V3 = [0, 4.3, -51.3];           // the Schwarzenberg coat of arms (altar wall)
export const HERO_HOOK: V3 = [3.4, 0, -13.5];         // beside the chandelier, never covering it
export const HERO_WIDE: V3 = [-3.2, 0, -14];
export const GRAVE_SPOT: V3 = [-3, 0, 129];           // the abbot's sprinkling spot (shot 3)
export const HERO_SOIL: V3 = [2.5, 0, 126];
export const HERO_QUEUE: V3 = [-4, 0, 124];
export const HERO_FULL: V3 = [-5.5, 0, 120];
export const MONK_SPOT: V3 = [-7.4, 0, -41.2];        // stacking bones at the SW pyramid
export const HERO_MONK: V3 = [-4.0, 0, -38.2];
export const RINT_SPOT: V3 = [0.6, 0, -47.8];         // arranging the coat of arms
export const HERO_RINT: V3 = [-3.4, 0, -44];
export const HERO_UNDER: V3 = [1.6, 0, -19.2];        // under the chandelier (shot 8)
export const HERO_COA: V3 = [3.8, 0, -42];
export const CHURCH_Z = 150;                          // the church facade plane

// The chandelier's sway angle (radians) at global time t —
// it is ALREADY swinging when frame 0 opens, and it never
// stops in any interior shot.
export const swayAt = (t: number) => Math.sin(t * 0.9) * 0.045;
export const swayXAt = (t: number) => Math.cos(t * 0.63) * 0.028;

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const SHOT_LIGHT: Light[] = ["day", "day", "day", "day", "day", "day", "day", "day", "day", "day"];
export const SHOTS: ShotDef[] = L.slice(0, 10).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: SHOT_LIGHT[i], tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10, 8: 8, 9: 8, 10: 8 };
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

// The cover camera: low in the nave looking up at the bone
// chandelier — the anomaly fills the upper frame, ALREADY
// swaying; the hero stands below-right, never covering it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [5.5, 1.6, -8], look: [0, 6.4, -23] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // the dolly-in runs from frame 0 (the chandelier is
      // already swaying): a slow push up toward the bones
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // THE CHAPEL WIDE: down the nave — pyramids in the corners, garlands overhead
      return full(dolly([0, 4.6, 4], [0, 3.4, -40], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 3: // THE SOIL (1278): across the graveyard toward the church, the abbot sprinkling
      return full(dolly([8.5, 2.4, 117], [-1.5, 1.2, 128], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 4: // THE QUEUE: along the graveyard path — everyone wants in
      return full(dolly([-13, 3.0, 116], [4, 1.2, 134], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 5: // THE OVERFLOW: low over the crowded, tilting graves
      return full(dolly([3.5, 2.3, 104], [-4.5, 0.9, 122], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 6: // THE MONK: close on the SW bone pyramid, the half-blind monk stacking
      return full(dolly([6.5, 2.0, -33], [-8.5, 1.8, -43], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 7: // THE ARTIST (re-hook): Rint at the altar wall, fitting bone to the coat of arms
      return full(dolly([-7.5, 2.6, -37], [0.5, 4.0, -51], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 8: // THE CHANDELIER CLOSE: right under it — bones fill the frame, still swaying
      return full(dolly([4.2, 1.7, -10.5], [0, 6.0, -22.5], Math.exp(-0.0005 * lf), { fov: 46 }));
    case 9: // THE COAT OF ARMS: across the altar end — the bone shield and the pyramids
      return full(dolly([9.5, 3.2, -29], [-1, 3.4, -50], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 10: // THE COVER AGAIN (punchline): the chandelier swaying once more
      return full(dolly([5.5, 1.4, -8], [0, 6.2, -23], Math.exp(-0.0004 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 3, -30] };
    case 3: return { f: 0, cInf: 0.7, focus: () => [GRAVE_SPOT[0], 1, GRAVE_SPOT[2]] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [2, 1, 130] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [-4, 1, 128] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [MONK_SPOT[0], 1.2, MONK_SPOT[2]] };
    case 7: return { f: 0, cInf: 0.85, focus: () => [COA_POS[0], COA_POS[1], COA_POS[2]] };
    case 8: return { f: 0, cInf: 0.9, focus: () => [CHANDELIER[0], CHANDELIER[1], CHANDELIER[2]] };
    case 9: return { f: 0, cInf: 0.8, focus: () => [COA_POS[0], COA_POS[1], COA_POS[2]] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [CHANDELIER[0], CHANDELIER[1], CHANDELIER[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [CHANDELIER[0], CHANDELIER[1], CHANDELIER[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
