// Timeline of the Setenil de las Bodegas short (±55 s, Fafnir-ID
// format, bottom two-word subtitles). Setenil, Spanyol: a white
// village in the gorge of the Río Trejo whose houses are built
// UNDER giant rock overhangs — the rock itself is their roof and
// back wall. Calle Cuevas del Sol basks in the sun with cafés
// under the rock; Calle Cuevas de la Sombra is roofed over by
// rock completely and never sees the sun. The name carries the
// legend of "septem nihil" — seven sieges, seven failures — and
// "de las Bodegas" remembers the wine stored in the cool caves.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Andalusian daylight, warm limestone rock
// with layered strata, whitewashed houses, terracotta and olive
// green. Frame 0 is the clickbait cover: the street canyon with
// white houses wedged under the hanging rock, the hero's SHOCK
// face big beside it, the claim text GIANT. Shot 1 returns as
// shot 10 for the punchline loop.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 150, 299, 483, 654, 839, 986, 1147, 1341, 1485, 1656];
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
// The gorge street runs along Z, from z +28 down to z -125.
// Cobbled street x -3.4..3.4 at STREET_Y. The Río Trejo runs in a
// shallow channel along the WEST edge (x -5.6..-3.8, water at
// y 0.03) for the sunny northern stretch (Cuevas del Sol).
// White houses line both sides: west row fronts at x ~-6.2
// (behind the river), east row fronts at x ~+5.4. Behind both
// rows the limestone cliffs rise to y ~30, and rock overhang
// slabs jut out over the houses toward the street, undersides at
// y ~6.2-8.6. The southern stretch (Cuevas de la Sombra,
// z -52..-85) is roofed COMPLETELY: a rock deck spans the street
// at y ~6.3. The Almohad castle crowns the bluff at the far
// south end (CASTLE). The hero's cover spot is HERO_SPOT.
export const STREET_Y = 0.12;
export const HERO_SPOT: V3 = [1.15, STREET_Y, 9.5]; // x 1.15: at 1.7 the cover camera cropped his right side
export const RIVER_X = -4.7;
export const SOMBRA_A = -52; // Sombra (full rock cover) stretch
export const SOMBRA_B = -85;
export const CASTLE: V3 = [0, 12.5, -118];
export const HOUSE_W: V3 = [-6.9, STREET_Y, -2];   // the shot-3 house (west row; z = the first house's centre — -6 was a gap)
export const CAFE: V3 = [4.6, STREET_Y, -28];      // Cuevas del Sol terraces (east)
export const BODEGA: V3 = [4.4, STREET_Y, -90];    // wine barrels under the rock (east)

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

// The cover camera: low on the street, looking down the gorge —
// white houses wedged under the hanging rock on both sides, the
// hero big in the near foreground right, the claim card centred
// up-frame against the rock.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [0, 2.4, 17.5], look: [0, 3.6, -20] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // the dolly-in runs from frame 0 (the anomaly is already
      // moving): a slow push down the street canyon, k from 1
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.0009 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: an aerial down the gorge axis (the old [16,14,27] sat inside the east cliff box — full-screen rock;
      // [6,19,26] worked but the east slab tops filled half the frame, so the axis sits nearer the street)
      return full(dolly([3.5, 21, 27], [-0.5, 0, -52], Math.exp(-0.00035 * lf), { fov: 46 }));
    case 3: // MEDIUM at one house front: white wall, rock for a roof
      return full(dolly([2.3, 1.9, 1.8], [HOUSE_W[0] + 1.2, 2.6, HOUSE_W[2]], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // CUEVAS DEL SOL: across the street at the café terraces under the sunny rock
      return full(dolly([-2.7, 2.0, -14.5], [CAFE[0], 1.7, CAFE[2]], Math.exp(-0.0004 * lf), { fov: 44 }));
    case 5: { // CUEVAS DE LA SOMBRA: inside the rock tunnel — a slow push INTO the shade
      const u = Math.min(1, lf / Math.max(1, s.b - s.a));
      return full({ pos: [0.4, 2.0, -45.5 - u * 5.5], look: [0, 1.9, -74], fov: 44 });
    }
    case 6: // MEDIUM CLOSE: the hero steps from sun into rock shade — relief
      return full(dolly([-3.3, 1.9, -12.5], [2.0, 1.75, -20.5], Math.exp(-0.0007 * lf), { fov: 40 }));
    case 7: // HIGH over the STREET AXIS at the castle, flags flying (a low angle from inside the gorge was walled off by
      // the bluff; [11,26,-76] sat inside the east cliff box — the camera must stay over the canyon, |x| < 6)
      return full(dolly([2, 30, -70], [CASTLE[0], CASTLE[1] + 3.5, CASTLE[2]], Math.exp(-0.0005 * lf), { fov: 48 }));
    case 8: // THE CASTLE FROM THE STREET'S END: south of the Sombra deck, looking up at the
      // keep + defenders over the bluff edge. From north of the Sombra (z -38) the rock deck
      // itself (y 6.45..8.75 across the whole street) hides the castle completely — the only
      // street-level sightline to the keep starts past the deck, z < -85
      return full(dolly([0.5, 2.0, -95], [CASTLE[0], CASTLE[1] + 3, CASTLE[2]], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 9: // THE BODEGA: barrels stacked under the overhang, hero beside them
      return full(dolly([-2.5, 1.8, -83.5], [BODEGA[0], 1.5, BODEGA[2]], Math.exp(-0.0005 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1, -50] };
    case 3: return { f: 0, cInf: 0.85, focus: () => [HOUSE_W[0] + 1.6, 2.2, HOUSE_W[2]] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [CAFE[0], 1.5, CAFE[2]] };
    case 5: return { f: 0, cInf: 0.75, focus: () => [0, 1.8, -64] };
    case 6: return { f: 0, cInf: 1.0, focus: () => [2.0, 1.9, -20.5] };
    case 7: return { f: 0, cInf: 0.5, focus: () => [CASTLE[0], CASTLE[1] + 3.5, CASTLE[2]] };
    case 8: return { f: 0, cInf: 0.7, focus: () => [0, CASTLE[1] + 3, CASTLE[2]] };
    case 9: return { f: 0, cInf: 0.85, focus: () => [BODEGA[0], 1.4, BODEGA[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_SPOT[0], 1.4, HERO_SPOT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
