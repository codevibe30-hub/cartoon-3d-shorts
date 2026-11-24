// Timeline of the Buton / blue-eyes short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). On Buton Island, Southeast
// Sulawesi, some Indonesians are born with bright blue eyes —
// sometimes one blue, one brown (heterochromia) — caused by
// Waardenburg syndrome (~1 in 40,000 people), inherited in
// families, NOT European ancestry (the Portuguese-sailor story is
// a myth). Line boundaries live in the L array (start frame of
// each script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: bright tropical Buton daylight, turquoise sea,
// white sand beach, green jungle hills, stilt houses (rumah
// panggung) and palms — and the blue eyes THEMSELVES: every
// Buton character carries bright blue irises (the heterochromia
// child: one blue, one brown). Frame 0 is the clickbait cover:
// the hero's SHOCK face big in the near foreground, the
// blue-eyed Buton man beside him, the claim text GIANT. The
// approved cover design is shot 1 and returns as shot 10 for the
// punchline loop. TONE: respectful — the Buton people are drawn
// as dignified, ordinary people, never caricatures.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 53.084 s @ 30 fps → TOTAL 1593).
export const L: number[] = [2, 151, 329, 455, 635, 796, 950, 1102, 1245, 1409, 1593];
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
// The beach runs z +30 .. +6 (white sand). The village ground
// runs z +6 .. -12 (grass). The front jungle hill rises at
// z -18 (crest y ~7); the back ridge at z -42 (crest y ~11).
// The turquoise sea sits to the RIGHT (x +14 .. +60) and as a
// far band behind the hills (z -60 .. -90). Stilt houses stand
// left-back around (-12, 0, -6). Palms scatter the village.
// The hero stands at HERO_SPOT; the Buton man at BUTON_SPOT,
// offset RIGHT so his head never hides behind the hero's.
export const HERO_SPOT: V3 = [0, 0, 10];
export const BUTON_SPOT: V3 = [2.3, 0, 4];
export const HOUSES: V3 = [-12, 0, -6];
export const SEA_X = 14;
export const HILL_FRONT_Z = -18;
export const HILL_BACK_Z = -42;

// The front hill crest profile — world.ts builds the same curve.
export const hillAt = (x: number) => 7 + 1.8 * Math.sin(x * 0.09) + 1.2 * Math.sin(x * 0.21 + 1.3);
export const hillBackAt = (x: number) => 11 + 2.2 * Math.sin(x * 0.06 + 0.8) + 1.5 * Math.sin(x * 0.17 + 2.1);

// Terrain height: flat beach/village (y=0) in front of the hills,
// then the front slope rising toward the crest (z -12 → -18).
export const terrainY = (x: number, z: number): number => {
  if (z >= -12) return 0;
  if (z <= HILL_FRONT_Z) return 0;
  const v = (z + 12) / (HILL_FRONT_Z + 12); // 0..1 down the slope
  return v * hillAt(x);
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

// The cover camera: low over the beach, hero BIG in the near
// foreground, the blue-eyed Buton man beside him, the turquoise
// sea + palms + hills stacked behind, claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.2, 18], look: [0, 2.5, -8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole coastal village + sea in one sweep, hero small beside it for scale
      return full(dolly([0, 14, 32], [0, 3, -6], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // CLOSE on the heterochromia child: face fills the frame, one blue eye + one brown eye
      return full(dolly([0, 2.0, 6.5], [0, 2.0, 0], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 4: // MEDIUM on the DNA helix: glowing double helix over the village, hero watching
      return full(dolly([0, 2.8, 12], [0, 3, -6], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // MEDIUM on the family: the Buton family together, several blue eyes
      return full(dolly([0, 2.6, 13], [0, 2, -2], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 6: // MEDIUM on the viral photo: the big framed photo + hero with camera
      return full(dolly([0, 2.6, 12], [0, 2.8, -4], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 7: // WIDE on the myth: the old Portuguese caravel with a big red X over it
      return full(dolly([0, 3, 14], [0, 2.5, -6], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 8: // MEDIUM on the mutation: the helix blazing, the ship fading behind
      return full(dolly([0, 2.8, 12], [0, 3, -6], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 9: // MEDIUM on the listener: the Buton man, sound waves drifting to his ear
      return full(dolly([0, 2.2, 11], [0, 2, 0], Math.exp(-0.0004 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 3, -6] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [0, 2.0, 0] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [0, 3, -6] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 2, -2] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [0, 2.8, -4] };
    case 7: return { f: 0, cInf: 0.6, focus: () => [0, 2.5, -6] };
    case 8: return { f: 0, cInf: 0.9, focus: () => [0, 3, -6] };
    case 9: return { f: 0, cInf: 1.0, focus: () => [0, 2, 0] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.3, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
