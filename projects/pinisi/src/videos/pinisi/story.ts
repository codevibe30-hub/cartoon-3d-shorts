// Timeline of the Pinisi short (±32 s, Fafnir-ID format,
// bottom two-word subtitles). Tana Beru, Bulukumba: kapal
// pinisi tradisional dibangun tanpa cetak biru — sang
// punggawa menyimpan seluruh desain di kepalanya; papan
// lambung dulu sebelum rangka, pasak kayu bukan paku;
// ritual adat di tiap tahap; UNESCO 2017.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json.
// Every shot, camera key, DOF key and story event is expressed
// relative to L.
// VISUAL CORE: a golden-sand beach boatyard in bright tropical
// daylight — blue sea behind, palms lining the sides, the
// GIANT pinisi hull rising on the beach. Frame 0 is the
// clickbait cover: a GIANT WOODEN HULL big and ALREADY MOVING
// (sawdust drifting, waves rolling), the punggawa beside it,
// the hero shocked BESIDE it, the claim text GIANT. The
// approved cover design is shot 1 and returns as shot 7 for
// the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing from voice/line_starts.json (assembled VO 32.54 s,
// atempo 1.0 — hook-rule revision: line 1 now carries the
// quantified "40 meter" claim). Line starts (frames):
// 2, 134, 267, 427, 549, 677, 819; TOTAL 976 = 32.53 s
export const L: number[] = [2, 134, 267, 427, 549, 677, 819, 976];
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
// The beach runs along Z, camera side is +Z. The sand is the
// y=0 plane from x -14 to +14; the blue sea lies far behind
// (z < -30); palms line both sides; the pinisi hull under
// construction stands on the beach centre-back (z ~ -10),
// timber stacks + scaffolding poles + sawdust piles around it.
// The hero + punggawa stand ON THE SAND near the camera axis
// — portrait half-FOV is only ~13.4 deg, so anyone at |x| > 3,
// z < -3 is off-frame (Santa v1 lesson: spots at x 3.6/5.6
// never appeared in any shot). Every spot below was checked
// against its shot camera axis (hero ~2 deg, punggawa ~8 deg
// from the cover camera); shots 3-6 use per-shot positions
// computed against their own camera axis, never one shared spot.
// DEPTH RULE (Lempar HP v3 lesson): a card/prop near an actor
// must also be checked for z-order — a card 0.3 m BEHIND an
// actor gets hidden by his body even when the angle is fine.
export const SAND_HALF = 14;
export const HERO_SPOT: V3 = [1.2, 0, -2.0];
export const PUNGGAWA_SPOT: V3 = [-0.8, 0, -2.6];
export const WORKER_SPOT: V3 = [0.4, 0, -3.4];
export const HULL_POS: V3 = [0, 0, -10];
export const SEA_POS: V3 = [0, 0, -45];
// Sawdust drifting on the beach breeze while the yard is on screen.
export const leavesAt = (tSec: number): number => (tSec * 0.5) % 1;
// The hull's sway phase, driven by shot time.
export const tailAt = (tSec: number): number => Math.sin(tSec * 1.2) * 0.3;

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

// The cover camera: low on the sand, looking down the beach —
// the GIANT HULL big on the yard, the punggawa beside it, the
// hero at the right edge, the claim card centred up-frame.
// Portrait half-FOV is only ~13-15 deg, so the hull stays
// within ~10 deg of the axis.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [2.8, 2.2, 6.5], look: [-0.6, 1.6, -8] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only: the approved frame-0 composition
      // (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: over the beach centre so no near dune
      // can cross the frame — the whole boatyard + hulls in
      // stages + sea + palms
      return full(dolly([0.5, 6.0, 13], [-0.5, 1.2, -12], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the punggawa measuring the timber by eye
      return full(dolly([2.6, 2.0, 1.5], [-0.8, 1.3, -3.5], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // THE PLANKS: hull planking, pegs hammered in
      return full(dolly([4.2, 2.2, 3.0], [0.2, 1.2, -4.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // THE RITUAL: offerings at the keel, workers around
      return full(dolly([5.0, 2.6, 4.0], [0.5, 1.2, -5.0], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 6: // THE FINISHED SHIP: 40 m hull + UNESCO flag
      return full(dolly([4.6, 2.0, 2.5], [0.8, 1.2, -4.5], Math.exp(-0.0004 * lf), { fov: 42 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1.5, -9] };
    case 3: return { f: 0, cInf: 0.95, focus: () => [-0.8, 1.3, -3.5] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [0.2, 1.3, -4] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [0.5, 1.3, -5] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [0.8, 1.0, -4.5] };
    default: return { f: 0, cInf: 0.9, focus: () => [-0.5, 1.6, -8] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
