// Timeline of the Okinoshima short (±55 s, Fafnir-ID format,
// bottom two-word subtitles). Okinoshima, Fukuoka: a sacred
// Shinto island (UNESCO World Heritage 2017) where the WHOLE
// island is a kami — women are forbidden to set foot on it
// (nyonin kinsei), men must strip naked and bathe in the sea
// (misogi) before landing, nothing — not even a leaf or a stone
// — may be taken away, and what is seen there must never be
// spoken of (oiwazu-no-shima). Until 2017 only 200 men a year
// could visit for one festival day; since then the festival is
// cancelled and only rotating priests land. Beneath the taboos:
// ±80,000 votive offerings from the 4th–9th centuries, all
// National Treasures. TONE: a real, still-worshipped sacred
// site — respect it. The humour is only in how unbelievable the
// rules sound, never at the belief, the priests, or the ban.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright sea daylight, deep blue-green Genkai Sea,
// a forested rocky island rising from the water, vermilion torii
// + shrine on the slope, three reef rocks as a natural torii.
// Frame 0 is the clickbait cover: THE ISLAND ITSELF big in the
// frame, waves + reef torii already moving from the first frame,
// a woman stopped at the shore rope barrier, the hero BIG in his
// boat beside it, shocked, never covering the island. The
// approved cover design is shot 1 and returns as shot 10 for the
// punchline loop (the hero laughing in the boat, island behind).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 58.017 s = 1741 frames. Starts (s): 0.06, 7.45, 12.69, 18.06, 23.15, 29.27, 34.14, 39.26, 44.55, 52.84.
export const L: number[] = [2, 224, 381, 542, 694, 878, 1024, 1178, 1337, 1585, 1741];
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
// The Genkai Sea covers the whole scene (water plane y = 0).
// Okinoshima rises from the sea around z = -55: a forested rocky
// island ~30 m across, ~14 m tall, its sandy beach facing +Z
// (toward camera) at z ≈ -18. Okitsu-miya shrine sits on the
// island's southwestern slope at SHRINE_SPOT, reached by stone
// steps from the beach; a vermilion torii stands at the shore.
// Three tall reef rocks (Koyajima, Mikadobashira, Tenguiwa) stand
// in the sea southeast of the island as its natural torii gate.
// A shimenawa rope barrier crosses the beach at BARRIER_Z — the
// line no woman may cross. The hero's boat floats in the near
// foreground at HERO_BOAT, hero standing in it.
export const HERO_BOAT: V3 = [2.5, 0, 6];
export const ISLAND_C: V3 = [0, 0, -55];
export const BEACH_Z = -18;
export const BARRIER_Z = -18;
export const SHRINE_SPOT: V3 = [-6, 5.5, -40];
export const TORII_SPOT: V3 = [-2, 0.25, -30];
export const REEF_ROCKS: V3[] = [[18, 0, -80], [26, 0, -84], [32, 0, -76]];
export const SACRED_ROCK: V3 = [7, 0, -30];

// The hero's boat stays moored at HERO_BOAT in every shot (he
// watches from the boat — visitors arrive by boat, and he never
// lands). world.ts (the mesh) and cast.ts (the hero sprite) both
// read this, so feet and hull never part company.
export const heroBoatAt = (id: number, tSec: number): { x: number; z: number; yaw: number } => {
  void id; void tSec;
  return { x: HERO_BOAT[0], z: HERO_BOAT[2], yaw: -0.28 };
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

// The cover camera: low over the sea, looking at the island — the
// island BIG in the frame's heart, the torii + reef rocks stacked
// behind, the hero big in his boat in the near foreground right,
// the woman small at the shore barrier. The claim card is glued
// to the view axis up-frame.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [3.5, 2.2, 14], look: [0, 4, -40] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 44 }));
    case 2: // HIGH WIDE: the whole island in one sweep — shrine, forest, reefs
      return full(dolly([14, 12, 26], [0, 4, -55], Math.exp(-0.0004 * lf), { fov: 46 }));
    case 3: // MEDIUM on the rope barrier — woman stopped, priest gesturing stop
      return full(dolly([-6, 2.2, -8], [-1, 1.5, -18], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 4: { // MEDIUM on the bathers — men waist-deep in the sea, waves moving
      return full(dolly([5, 1.8, -2], [-1, 0.8, -12], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 5: { // WIDE on the festival beach — 200 men in white, boats at the shore
      return full(dolly([9, 5, 6], [0, 1.5, -16], Math.exp(-0.0003 * lf), { fov: 44 }));
    }
    case 6: { // MEDIUM at the shrine steps — the lone priest praying, island quiet
      return full(dolly([-14, 7, -28], [-6, 5, -40], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    case 7: { // MEDIUM on the hero in his boat, holding up one green leaf
      return full(dolly([4, 2.2, 12], [2.5, 2, 6], Math.exp(-0.0006 * lf), { fov: 40 }));
    }
    case 8: { // CLOSE-UP: the silence taboo lands on the hero's face
      // (pulled back 2026-11-25: the old close camera put the
      // claim card over the hero's eyes — head now fully in frame
      // with the card clear above it; slower push-in so the head
      // never grows back into the card by the shot's end)
      return full(dolly([5.0, 2.2, -2.0], [HERO_BOAT[0], 2.0, HERO_BOAT[2]], Math.exp(-0.0003 * lf), { fov: 38 }));
    }
    case 9: { // MEDIUM on the treasure — mirror, sword and beads glinting on the sand
      return full(dolly([1.5, 2.0, -8], [0, 0.5, -14], Math.exp(-0.0004 * lf), { fov: 42 }));
    }
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 1:
    case 10: return { f: 0, cInf: 0.9, focus: () => [0, 4, -40] };
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 4, -55] };
    case 3: return { f: 0, cInf: 0.8, focus: () => [-1, 1.5, -18] };
    case 4: return { f: 0, cInf: 0.8, focus: () => [-1, 0.8, -12] };
    case 5: return { f: 0, cInf: 0.4, focus: () => [0, 1.5, -16] };
    case 6: return { f: 0, cInf: 0.8, focus: () => [-6, 5.5, -40] };
    case 7: return { f: 0, cInf: 0.95, focus: () => [2.5, 2, 6] };
    case 8: return { f: 0, cInf: 1.0, focus: () => [HERO_BOAT[0], 2.2, HERO_BOAT[2]] };
    case 9: return { f: 0, cInf: 0.6, focus: () => [0, 0.5, -14] };
    default: return { f: 0, cInf: 0.9, focus: () => [HERO_BOAT[0], 1.3, HERO_BOAT[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
