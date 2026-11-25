// Timeline of the Dieng Anak Gimbal short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Dieng, Jawa Tengah: on a
// misty highland plateau ±2.000 m up, some children suddenly grow
// natural dreadlocks (gimbal) as toddlers, usually after a high
// fever. Local belief holds them as titipan (entrusted children)
// of the Dieng ancestor Kyai Kaladete — so the hair may ONLY be
// cut in the Ruwat Rambut Gimbal rite led by an adat elder, and
// only after the child's own request (a wish: ice cream, a bike,
// even two goats) has been fulfilled. Cut it carelessly, belief
// says, and the locks grow back and the child falls ill. The mass
// rite crowns the Dieng Culture Festival at the Arjuna temple
// complex; the cut locks are floated away on a lake (larung).
// Belief is always framed AS belief ("kata warga"), respectfully.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: cool bright highland daylight, layered mist,
// emerald terraced hills, the grey stone Arjuna temples, and one
// small kid with a HUGE mane of dreadlocks blowing in the wind.
// Frame 0 is the clickbait cover: the gimbal kid BIG in front of
// the temples, the hero shocked beside him, the claim GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 180, 368, 547, 718, 904, 1054, 1247, 1425, 1577, 1790];
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
// The plateau village runs along Z: a grassy ceremonial field in
// the near ground (z +14 .. -18), the dirt path leading north to
// the Arjuna temple cluster at CANDI (z ≈ -40). Village houses
// line the west side (x ≈ -13), terraced hills rise east (x > 20)
// and the Sikidang crater steams far east (x ≈ 58, z ≈ -64). The
// lake (telaga) lies west-front (x ≈ -30, z ≈ +2) for the larung.
// The gimbal kid's home spot is KID_POS, the hero beside him.
export const KID_POS: V3 = [-0.4, 0, 7.4];
export const HERO_POS: V3 = [1.55, 0, 7.6];
export const CANDI: V3 = [0, 0, -40];
export const LAKE: V3 = [-30, 0, 2];
export const CRATER: V3 = [58, 0, -64];

// The kirab procession (shot 9): a line of villagers walks the
// path toward the temple, from z +8 down to z -26, looping.
// cast.ts places the walkers on this track; world.ts adds the
// banners and the gunungan (offering mound) on the same line.
export const kirabAt = (tSec: number, i: number): { x: number; z: number } => {
  const span = 34, speed = 1.05;
  const z = 8 - ((tSec * speed + i * 6.5) % span);
  return { x: -1.2 + Math.sin(i * 2.3) * 0.5, z };
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

// The cover camera: low over the ceremonial field, looking north
// to the temples — the gimbal kid BIG near-centre, the hero
// reacting at his side, mist and terraced hills stacked behind.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.55, 2.0, 12.6], look: [0.55, 1.7, -20] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // MEDIUM on the kid at the house yard, mum beside him
      return full(dolly([-4.4, 1.8, 13.8], [KID_POS[0], 1.15, KID_POS[2]], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 3: // HIGH WIDE: the whole plateau village + temples + crater smoke
      return full(dolly([9.5, 9.0, 20], [-1, 1, -34], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 4: // CLOSE on the kid: scissors hover, then the NOPE cross lands
      return full(dolly([1.9, 1.75, 12.6], [KID_POS[0], 1.35, KID_POS[2]], Math.exp(-0.0006 * lf), { fov: 46 }));
    case 5: // THE RITE: medium-wide on the temple field, kid seated, elder leading
      return full(dolly([3.4, 2.6, -14], [0, 1.5, CANDI[2] + 4], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 6: // RE-HOOK CLOSE-UP: the kid points — the condition is HIS
      return full(dolly([-2.6, 1.7, 12.2], [KID_POS[0], 1.3, KID_POS[2]], Math.exp(-0.0007 * lf), { fov: 38 }));
    case 7: // THE WISHES: kid centre, the wish props parading in beside him
      return full(dolly([0.6, 2.0, 14.6], [0, 1.5, KID_POS[2] - 2], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 8: // THE LAKE: low at the water's edge for the larung
      return full(dolly([1.5, 1.6, 11], [-6, 0.8, 3.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 9: // FESTIVAL WIDE: kirab crossing the field toward the temples
      return full(dolly([-8.5, 5.2, 12], [0.5, 1.2, -26], Math.exp(-0.0003 * lf), { fov: 46 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.9, focus: () => [KID_POS[0], 1.2, KID_POS[2]] };
    case 3: return { f: 0, cInf: 0.4, focus: () => [0, 1, -40] };
    case 4: return { f: 0, cInf: 1.0, focus: () => [KID_POS[0], 1.4, KID_POS[2]] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0, 1.4, CANDI[2] + 6] };
    case 6: return { f: 0, cInf: 1.0, focus: () => [KID_POS[0], 1.35, KID_POS[2]] };
    case 7: return { f: 0, cInf: 0.8, focus: () => [KID_POS[0], 1.3, KID_POS[2]] };
    case 8: return { f: 0, cInf: 0.9, focus: () => [LAKE[0] + 21.5, 0.4, LAKE[2] + 1] };
    case 9: return { f: 0, cInf: 0.45, focus: () => [0, 1.2, -18] };
    default: return { f: 0, cInf: 0.9, focus: () => [KID_POS[0], 1.3, KID_POS[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
