// Timeline of the Ayunan short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). La Casa del Árbol, Baños,
// Ecuador: a simple plank swing hung from a tree at the edge
// of a cliff, ±2,600 m up, swinging out past the edge over a green valley
// with the clouds BELOW it and the active Tungurahua volcano
// in front. The treehouse was a volcano-monitoring post built
// by the lookout Carlos Sánchez; the swing was a toy for his
// grandchildren until a 2014 National Geographic photo of a
// rider against an erupting Tungurahua went worldwide.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json.
// VISUAL CORE: the giant swing itself at frame 0 — already
// swinging out over the drop, the hero riding it, the valley
// and its cloud sea far below. All shots share ONE geography
// (the ridge, the tree, the swing, the valley, the volcano)
// seen from different cameras.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 192, 344, 517, 672, 910, 1058, 1212, 1328, 1535, 1733];
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
// THE RIDGE: grassy top at y = 0, running z +55 .. -8. THE
// EDGE at z = -8; below it a long slope falls to the VALLEY
// FLOOR at y = -58 (z -110 .. -315), patchwork fields + a river.
// THE CLOUD SEA drifts in the valley at y -12 .. -26.
// TUNGURAHUA: the great cone at (-2, -58, -262), summit ~62.
// THE TREE at TREE, its long branch reaching over the edge;
// THE SWING hangs from PIVOT, rope length SWING_L, swinging
// in the z-plane (toward the valley at theta > 0).
export const FLOOR_Y = 0;
export const TREE: V3 = [-4.4, 0, -2.6];
export const PIVOT: V3 = [-0.9, 7.3, -5.6];
export const SWING_L = 6.2;
export const HUT: V3 = [-5.8, 5.9, -2.2];              // the treehouse hut (in the crown)
export const BALCONY: V3 = [-3.9, 5.52, -0.5];          // the lookout balcony floor spot
export const SIGN: V3 = [-3.4, 0, -5.2];                // the wooden site sign (far side, near the edge)
export const HERO_NAME: V3 = [1.9, 0, -0.4];            // beside the tree (shot 2)
export const HERO_SWING: V3 = [1.9, 0, -0.6];           // watching the swing close (shot 3)
export const HERO_VOLC: V3 = [1.7, 0, -0.9];            // pointing at the volcano (shot 5)
export const HERO_HUT: V3 = [-3.9, 5.52, -0.5];         // on the balcony (shot 6)
export const CARLOS_SPOT: V3 = [-1.9, 0, -2.3];         // the lookout on the ridge (shot 7)
export const HERO_LISTEN: V3 = [0.7, 0, -0.7];          // beside Carlos (shot 7)
export const CARLOS_PUSH: V3 = [-2.3, 0, -4.4];         // pushing the grandkid (shot 8)
export const HERO_WATCH: V3 = [2.6, 0, 2.4];            // watching, laughing (shot 8)
export const PHOTOG: V3 = [4.6, 0, 2.6];                // the tourist photographer (shot 9)
export const VOLCANO: V3 = [-2, -58, -262];

// ---------------- the swing's pendulum (world + cast share this clock) ----------------
// theta > 0 = swung out toward the valley (-z). Period 3.8 s;
// at t = 0 the seat is already out over the drop and moving.
export const swingTheta = (t: number) => 0.52 * Math.cos(((t - 0.4) * Math.PI * 2) / 3.8);
export const swingSeat = (t: number) => {
  const th = swingTheta(t);
  return {
    x: PIVOT[0],
    y: PIVOT[1] - SWING_L * Math.cos(th),
    z: PIVOT[2] - SWING_L * Math.sin(th),
    theta: th,
  };
};

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

// The cover camera: on the ridge looking out over the drop —
// the swing fills the centre, already swinging; the valley,
// its cloud sea and the volcano open up behind it.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [4.6, 7.6, 14.6], look: [-0.8, 0.6, -12] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
      // THE HOOK: the dolly-in runs from frame 0 — the swing
      // is already flying out over the drop
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0011 * lf), { fov: 56 }));
    case 2: // THE NAME WIDE: the whole site — tree, hut, swing, sign
      return full(dolly([9.6, 6.2, 16.8], [-3.8, 0.4, -5.0], Math.exp(-0.0003 * lf), { fov: 54 }));
    case 3: // THE SWING ITSELF: low, close — ropes, plank, steel cable
      return full(dolly([3.1, 2.6, 5.8], [-0.9, 2.6, -4.2], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 4: // THE DROP: high behind the swing, looking down the
      // valley — clouds BELOW the flying hero
      return full(dolly([3.6, 6.8, 5.4], [-1.4, -3.0, -16], Math.exp(-0.00035 * lf), { fov: 52 }));
    case 5: // THE VOLCANO: tilted up — Tungurahua towers, the
      // swing small in front, the hero pointing
      return full(dolly([2.4, 2.3, 8.6], [0.5, 6.0, -40], Math.exp(-0.0003 * lf), { fov: 52 }));
    case 6: // THE TREEHOUSE: in close on the hut + balcony
      return full(dolly([1.9, 5.4, 5.6], [-5.0, 6.1, -2.2], Math.exp(-0.0004 * lf), { fov: 48 }));
    case 7: // THE LOOKOUT: Carlos on the ridge, volcano behind
      return full(dolly([4.8, 2.5, 6.2], [-1.8, 1.9, -3.6], Math.exp(-0.0003 * lf), { fov: 50 }));
    case 8: // THE GRANDKID: the warm beat — same family angle as
      // the cover, a touch wider and lower
      return full(dolly([5.2, 2.3, 7.0], [-2.2, 1.9, -4.2], Math.exp(-0.00035 * lf), { fov: 52 }));
    case 9: // THE VIRAL PHOTO: the rider flies, the photographer
      // shoots, the volcano puffs behind
      return full(dolly([6.4, 3.2, 9.4], [-2.2, 6.5, -30], Math.exp(-0.0004 * lf), { fov: 56 }));
    case 10: // THE COVER AGAIN (punchline): the hook dolly once more
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0005 * lf), { fov: 56 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [TREE[0], 3.4, TREE[2]] };
    case 3: return { f: 0, cInf: 0.9, focus: () => [PIVOT[0], 4.6, PIVOT[2]] };
    case 4: return { f: 0, cInf: 0.6, focus: () => [PIVOT[0], 1.8, PIVOT[2] - 2] };
    case 5: return { f: 0, cInf: 0.5, focus: () => [HERO_VOLC[0], 1.4, HERO_VOLC[2]] };
    case 6: return { f: 0, cInf: 0.85, focus: () => [HUT[0], 6.2, HUT[2]] };
    case 7: return { f: 0, cInf: 0.7, focus: () => [CARLOS_SPOT[0], 1.3, CARLOS_SPOT[2]] };
    case 8: return { f: 0, cInf: 0.8, focus: () => [PIVOT[0], 1.9, PIVOT[2]] };
    case 9: return { f: 0, cInf: 0.7, focus: () => [PIVOT[0], 2.0, PIVOT[2]] };
    case 10: return { f: 0, cInf: 0.85, focus: () => [PIVOT[0], 2.0, PIVOT[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [PIVOT[0], 2.0, PIVOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
