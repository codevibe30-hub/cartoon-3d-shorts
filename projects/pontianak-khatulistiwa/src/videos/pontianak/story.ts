// Timeline of the Pontianak short (±31 s, Fafnir-ID format,
// bottom two-word subtitles). Pontianak, Kalimantan Barat: the
// city where the equator runs straight through town — the
// Tugu Khatulistiwa marks the 0° line, you can stand with one
// foot in the northern hemisphere and one in the southern, and
// twice a year, at the sun's culmination, the shadows of
// everything standing upright VANISH for a few seconds.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright tropical midday, white stone monument,
// red-white equator line glowing on the plaza floor, Kapuas river
// behind, palms. Frame 0 is the clickbait cover: the TUGU itself
// big and already moving (sun glint + drifting clouds + swaying
// palms), the hero shocked BESIDE it, the claim text GIANT.
// The approved cover design is shot 1 and returns as shot 7
// for the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 30.488 s = 915 frames.
export const L: number[] = [2, 121, 234, 398, 474, 704, 848, 915];
export const TOTAL = L[7];
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
// The plaza is a paved disc centred on the monument at MON.
// The EQUATOR LINE runs along X at z = EQUATOR_Z, painted
// red-white on the plaza floor, straight through the monument
// base. North is z < EQUATOR_Z, south is z > EQUATOR_Z.
// The Kapuas river flows along the far background (z -58..-80).
// The dome pavilion sheltering the ORIGINAL small tugu stands
// at DOME_POS. Palms + broadleaf trees ring the plaza.
export const MON: V3 = [0, 0, -12];
export const EQUATOR_Z = -12;
export const DOME_POS: V3 = [-9, 0, -20];
// Hero + guide stand beside the monument on the camera side of
// the line, clear of the card's up-frame zone.
export const HERO_SPOT: V3 = [2.3, 0, -8.2];
export const GUIDE_SPOT: V3 = [-2.5, 0, -8.2];
// The egg for shot 6 stands on the equator line EAST of the
// monument, in the open plaza — NEVER at the monument's base,
// where the pedestal would hide it from every camera.
export const EGG_POS: V3 = [8, 0, -12];

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const LIGHTS_OF_SHOT: Light[] = ["day", "day", "day", "day", "day", "day", "golden"];
export const SHOTS: ShotDef[] = L.slice(0, 7).map((a, i) => ({
  id: i + 1, a, b: L[i + 1], light: LIGHTS_OF_SHOT[i] as Light, tau: (t: number) => t,
}));
export const FLASH_AT = TOTAL + 100; // no white flash

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];

// crossfades (frames) INTO each shot — the house pattern: picture
// never hard-cuts except where a beat wants the snap
const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 10 };
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

// The cover camera: low over the plaza, looking at the monument —
// the TUGU big in the centre, the red-white equator line
// crossing the near foreground, the hero shocked at the right
// edge, the guide at the left, the claim card centred up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0.6, 2.4, 14], look: [0, 3.4, -13] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // LOW at the line: the hero's feet straddling 0 degrees —
      // the hero stands EAST of the monument, in the OPEN plaza,
      // so the pillar can never hide him from this camera
      return full(dolly([8, 1.3, -4.5], [8, 0.9, -12], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 3: // CLOSE on the monument's crown: ring, arrow, 1928 plate —
      // pulled back so the WHOLE monument (0–11 m) fits the frame
      return full(dolly([4.8, 3.6, 2.5], [0, 5.4, -12], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 4: // WIDE: the whole plaza, the river closing the horizon
      return full(dolly([-6.5, 8, 16], [0, 1, -14], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 5: // HIGH: looking down the plaza at culmination — the
      // shadows shrink to nothing under the overhead sun
      return full(dolly([0, 12.5, 5], [0, 0.3, -12], Math.exp(-0.0002 * lf), { fov: 44 }));
    case 6: // CLOSE on the egg standing on the line — the egg sits
      // EAST of the monument in the open plaza, hero + guide
      // flanking it; the monument stays visible in the background
      return full(dolly([8, 1.2, -6.5], [8, 0.5, -12], Math.exp(-0.0006 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.8, focus: () => [0.3, 0.9, -12] };
    case 3: return { f: 0, cInf: 0.7, focus: () => [0, 5.6, -12] };
    case 4: return { f: 0, cInf: 0.4, focus: () => [0, 1, -40] };
    case 5: return { f: 0, cInf: 0.5, focus: () => [0, 0.5, -12] };
    case 6: return { f: 0, cInf: 0.95, focus: () => [8, 0.55, -12] };
    default: return { f: 0, cInf: 0.9, focus: () => [0, 3.2, -12] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
