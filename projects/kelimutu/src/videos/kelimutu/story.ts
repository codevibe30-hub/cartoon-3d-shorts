// Timeline of the Kelimutu short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Kelimutu, Flores, NTT: a volcano
// whose summit holds THREE crater lakes side by side — deep blue
// Tiwu Ata Bupu, turquoise Tiwu Nuwa Muri Koo Fai, reddish-brown
// Tiwu Ata Polo — each a different colour, each colour forever
// changing (six changes in 2016 alone) as volcanic gas reacts
// with the lakes' iron and minerals. The twin lakes TNM + TAP
// share a crater wall only ±5 m wide, yet their colours never
// mix. For the local Lio people the lakes are the resting place
// of the dead, sorted: elders to the blue lake, the young to the
// turquoise, the wicked to the red-brown.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright equatorial morning, mineral-coloured lakes
// in grey-brown crater bowls, dry savanna slopes. Frame 0 is the
// clickbait cover: the hero's SHOCK face big on the stone
// viewpoint terrace, the twin lakes spread behind him in two
// impossible colours, the claim text GIANT. Shot 1 returns as
// shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 140, 333, 509, 644, 825, 1009, 1184, 1341, 1506, 1662];
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
// Summit diorama, lake surfaces at y = 0. The TWIN lakes sit in
// the mid-ground: Tiwu Nuwa Muri (turquoise) west at LAKE_TNM,
// Tiwu Ata Polo (reddish brown) east at LAKE_TAP, split by the
// narrow shared crater wall along x ≈ 0 (WALL_Z0..WALL_Z1, crest
// y = WALL_Y). Tiwu Ata Bupu (deep blue) stands apart, far west.
// The hero's stone VIEWPOINT TERRACE crowns a rocky knoll in the
// near foreground (top y = TERRACE_Y); the hero stands at
// HERO_SPOT on its crest.
export const HERO_SPOT: V3 = [1.2, 7.0, 9.5];
export const TERRACE_Y = 7.0;
export const LAKE_TNM: V3 = [-16, 0, -46];
export const LAKE_TAP: V3 = [15, 0, -48];
export const LAKE_TAB: V3 = [-40, 1, -88];
export const WALL_Y = 6.0;
export const WALL_Z0 = -18;
export const WALL_Z1 = -42;
// standing spots on the crater rims (cast.ts)
export const RIM_TNM: V3 = [-5.8, 9.5, -39.2]; // ON the TNM rim crest (east, facing the wall)
export const RIM_TAP: V3 = [4.5, 9.5, -41.8]; // ON the TAP rim crest (west, facing the wall)

/** The hero's walk along the shared wall (shot 3): he strolls
 *  the crest path between the two lakes — five metres of rock
 *  with a different colour of water falling away on each side.
 *  Every other shot he stands on the terrace (or a rim spot).
 *  world.ts (the path) and cast.ts (the hero sprite) both read
 *  this, so feet and path never part company. */
export const heroWalkAt = (id: number, tSec: number): { x: number; y: number; z: number } => {
  if (id !== 3) return { x: HERO_SPOT[0], y: HERO_SPOT[1], z: HERO_SPOT[2] };
  const a = L[2] / FPS, b = L[3] / FPS;
  const u = smooth((tSec - a) / Math.max(0.01, b - a));
  return {
    x: 0.7 + (-0.7 - 0.7) * u,
    y: WALL_Y,
    z: WALL_Z0 - 2 + (WALL_Z1 + 4 - (WALL_Z0 - 2)) * u,
  };
};

/** TNM's colour shift (shot 4): the turquoise lake turns green
 *  in front of the camera — 0 = turquoise, 1 = green. Before the
 *  shot it sits at 0, after it the lake keeps its new colour. */
export const tnmShiftAt = (id: number, tSec: number): number => {
  if (id < 4) return 0;
  if (id > 4) return 1;
  const a = L[3] / FPS, b = L[4] / FPS;
  return smooth((tSec - a - 0.8) / Math.max(0.01, b - a - 1.6));
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

// The cover camera: a high drone over the turquoise lake
// looking back at the hero on the rim — the first try (lens
// inside the bowl at the hero's height) looked UP past the
// water entirely, so the lake never entered the frame: hero
// and lake are 10+ m apart vertically, the lens must stand
// far back and look DOWN to hold both.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [-24, 20, -62], look: [-9, 3, -42] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the cover composition (k = 1 at the
      // shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: all three lakes in one sweep from above
      return full(dolly([10, 36, 2], [-10, 0, -55], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // WIDE along the wall: hero walks the 5 m crest,
      // TNM turquoise on his left, TAP rust on his right
      return full(dolly([7.5, 11, -6], [-1, 5.5, -32], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 4: // TOP-DOWN over TNM: the colour flips across the
      // whole surface (low lenses see only the cone's grass)
      return full(dolly([-16, 30, -30], [-16, 0, -46], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 5: // OBLIQUE over TNM from the NE rim: bubbles + steam
      return full(dolly([-6, 18, -34], [-16, 0, -46], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 6: // OBLIQUE over TNM from the W rim: dead trees + depth
      return full(dolly([-26, 22, -40], [-14, 0, -48], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 7: // OBLIQUE over TIWU ATA BUPU: the blue lake of the
      // elders' souls (the old reverse-wide saw only plateau)
      return full(dolly([-28, 20, -70], [-40, 0, -88], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 8: // CLOSE-UP: the twist lands on the hero's face
      return full(dolly([3.8, 8.8, 14.6], [HERO_SPOT[0], 8.9, HERO_SPOT[2]], Math.exp(-0.0008 * lf), { fov: 38 }));
    case 9: // HIGH over TAP's rim: hero + offering + rust lake
      // (y 15 grazed the rim and the hero fell out of frame —
      // this vantage puts both hero and lake centre on-axis)
      return full(dolly([2, 21, -28], [12, 2, -44], Math.exp(-0.0004 * lf), { fov: 44 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [-9, 0, -54] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [-1, 6, -30] };
    case 4: return { f: 0, cInf: 0.75, focus: () => [-16, 0.2, -46] };
    case 5: return { f: 0, cInf: 0.9, focus: () => [-17.5, 0.2, -43] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [-16, 0.4, -46] };
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [RIM_TNM[0], 10.5, RIM_TNM[2]] };
    case 7: return { f: 0, cInf: 0.4, focus: () => [-40, 0.5, -88] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [HERO_SPOT[0], 9.1, HERO_SPOT[2]] };
    case 9: return { f: 0, cInf: 0.8, focus: () => [14, 0.6, -46] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 7.6, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
