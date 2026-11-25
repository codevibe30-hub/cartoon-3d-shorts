// Timeline of the Iceland No-Mosquitoes short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Iceland: the only COUNTRY
// on Earth with no established mosquito population (Antarctica
// aside). Breeding habitat is plentiful — the entomologists'
// leading explanation is the island's violent freeze-thaw
// climate: ponds freeze, thaw mid-winter, then freeze again,
// over and over, so larvae and pupae are woken too early and
// killed before they can mature — unlike stable Scandinavia,
// where one long freeze lets them sleep under the ice until
// spring. A mosquito did hitchhike in on a 1986 flight from
// Greenland and ended up preserved in a jar — for years the
// only mosquito in Iceland. TWIST (Oct 2025): three real
// Culiseta annulata were found near Reykjavík; scientists link
// it to a warming climate, an established population is NOT
// confirmed. Line boundaries live in the L array (start frame
// of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L.
// VISUAL CORE: cold bright Nordic daylight, a still lake on a
// moss-and-basalt lava field, colourful Reykjavík houses, a
// snow-capped volcano smoking behind. Frame 0 is the clickbait
// cover: a GIANT mosquito over the lake, wings already beating
// — then the freeze creeps over it mid-shot — the hero shocked
// beside it, the claim GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 184, 369, 536, 744, 930, 1107, 1268, 1460, 1631, 1784];
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
// One lakeshore on a mossy lava field. The lake is an ellipse
// centred LAKE_C, roughly x -10..10, z -17..5, water at y 0.02.
// The hero stands on the south shore at HERO_POS. The giant
// mosquito hovers over the water at MOZZIE_POS. The no-mosquito
// sign is planted on the shore at SIGN_POS. Colourful houses
// line the far shore (z ≈ -26), the church west at (-14, -30),
// the institute building east at (10, -25) with the specimen
// jar in front of it at JAR_POS. The volcano smokes far
// north-east at VOLCANO (38, -85); three low neighbour islets
// sit far north across the water for shot 2.
export const LAKE_C: V3 = [0, 0, -6];
export const HERO_POS: V3 = [1.6, 0, 5.6];
export const MOZZIE_POS: V3 = [-1.4, 3.3, -0.5];
export const SIGN_POS: V3 = [-1.15, 0, 5.6];
export const JAR_POS: V3 = [7.0, 0, -16.0];
export const VOLCANO: V3 = [26, 0, -88];
export const ISLETS: V3[] = [[-22, 0, -56], [1, 0, -64], [24, 0, -56]];

// The 1986 flight (shot 7): a plane crosses the sky west→east
// high over the lake while one mosquito trails behind it.
// world.ts flies the mesh, cast.ts trails the sprite — both
// read this, so they never part company. null outside shot 7.
export const planeAt = (tSec: number): { x: number; y: number; z: number } | null => {
  const a = L[6] / FPS, b = L[7] / FPS;
  if (tSec < a || tSec >= b) return null;
  const u = (tSec - a) / Math.max(0.01, b - a);
  // Lower + closer than the first pass (y 15.5/z -38): up there the
  // plane crossed BEHIND the 1986 card, tiny and fog-faded — the
  // beat's key visual was unreadable. At y ~10/z -34 it crosses
  // below the card, above the rooftops, ~30% of frame width.
  return { x: -42 + u * 84, y: 10.5 - u * 1.0, z: -34 };
};

// The lake's ice sheet, shared by world.ts (the mesh) and
// cast.ts (the larvae freezing): coverage 0..1 + opacity.
// Shot 4 is the freeze-thaw-freeze roller coaster; shot 5
// freezes over for good; shot 6 is one thick stable sheet.
export const iceAt = (id: number, u: number): { cov: number; op: number } => {
  if (id === 4) {
    const cov = u < 0.34 ? smooth(u / 0.34) : u < 0.62 ? 1 - 0.88 * smooth((u - 0.34) / 0.28) : 0.12 + 0.88 * smooth((u - 0.62) / 0.38);
    return { cov, op: 0.35 + 0.6 * cov };
  }
  if (id === 5) { const cov = smooth(u / 0.8); return { cov, op: 0.35 + 0.6 * cov }; }
  if (id === 6) return { cov: 1, op: 0.97 };
  return { cov: 0, op: 0 };
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

// The cover camera: low over the south shore, looking north
// across the lake — the giant mosquito big over the water
// centre-left, the hero reacting at the right shore, houses +
// volcano stacked behind. Subjects stay near the view axis
// (portrait half-FOV is only ±13-15° — the Sedlec lesson).
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.5, 2.3, 14.8], look: [0.0, 2.1, -16] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the bay, three neighbour islets swarming, Iceland clean in front
      return full(dolly([11, 11.5, 24], [-1, 0.5, -42], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // MEDIUM on the pond shore: reeds, dragonflies, zero mosquitoes
      return full(dolly([-5.4, 1.9, 12.8], [0.6, 0.8, -6], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: // LOW at water level: the surface freezes, thaws, freezes again
      return full(dolly([2.9, 1.2, 7.2], [-0.6, 0.35, -8], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 5: // CLOSE on the water surface where the larvae swim
      return full(dolly([0.9, 0.62, 0.9], [-0.8, 0.12, -3.2], Math.exp(-0.0005 * lf), { fov: 40 }));
    case 6: // THE STABLE FREEZE: wide calm over the thick ice sheet
      return full(dolly([-3.6, 1.9, 11.0], [0.4, 0.8, -7], Math.exp(-0.00035 * lf), { fov: 42 }));
    case 7: // SKY: tilted up as the 1986 flight crosses with its stowaway
      return full(dolly([0, 2.6, 13.5], [0, 7.0, -30], Math.exp(-0.0002 * lf), { fov: 46 }));
    case 8: // THE JAR: medium-close on the institute steps, hero peering in
      return full(dolly([3.2, 1.9, -9.0], [JAR_POS[0], 1.5, JAR_POS[2]], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 9: // REYKJAVIK STREET: three real mosquitoes over the colourful houses
      return full(dolly([1.9, 2.3, -5.5], [-0.8, 1.9, -26], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 1, -50] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [0.4, 0.5, -5] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-0.4, 0.2, -6] };
    case 5: return { f: 0, cInf: 1.0, focus: () => [-0.8, 0.15, -3.4] };
    case 6: return { f: 0, cInf: 0.7, focus: () => [0.2, 0.4, -6] };
    case 7: return { f: 0, cInf: 0.5, focus: () => [0, 8, -32] };
    case 8: return { f: 0, cInf: 0.95, focus: () => [JAR_POS[0], 1.3, JAR_POS[2]] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [0, 2.2, -24] };
    default: return { f: 0, cInf: 0.9, focus: () => [MOZZIE_POS[0], 2.2, MOZZIE_POS[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
