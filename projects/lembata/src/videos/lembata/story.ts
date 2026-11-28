// Timeline of the Lembata short (±33 s, Fafnir-ID format,
// bottom two-word subtitles). Lembata, NTT: Desa Lamalera hunts
// sperm whales from wooden peledang sailboats with bamboo
// harpoons — the lamafa LEAPS onto the whale's back and drives
// the harpoon down with his own body weight. No engine, no sonar.
// Season May–October (lefa), tradition since the 1600s, whale
// meat shared with the whole village.
// Line boundaries live in the L array (start frame of each script
// line + total), derived from voice/line_starts.json; every shot,
// camera key, DOF key and story event is expressed relative to L.
// VISUAL CORE: bright Savu Sea daylight, deep blue rolling water,
// white spout spray, the wooden peledang under sail. Frame 0 is
// the clickbait cover: the WHALE itself big and ALREADY MOVING
// (spout spraying, waves rolling), the lamafa on the bow with his
// harpoon raised, the hero shocked BESIDE him, the claim text
// GIANT. The approved cover design is shot 1 and returns as
// shot 7 for the punchline loop (golden hour).
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
// VO total 32.665 s = 980 frames. Line starts [0.06, 3.82, 8.28, 13.66, 18.86, 22.75, 27.93] s.
export const L: number[] = [2, 115, 248, 410, 566, 683, 838, 980];
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
// Open sea: the water plane is y = 0, the camera side is +Z.
// The peledang runs along Z, bow toward -Z (toward the whale).
// The sperm whale lies diagonally across the frame, head to the
// left at WHALE_HEAD, tail to the right at WHALE_TAIL, body
// half-submerged so the back breaks the surface. The lamafa
// stands on the bow at BOW_SPOT; the crew rows mid-boat.
// The volcano cone (Ile Lewotolok silhouette) closes the horizon
// far to the left at VOLCANO_POS.
export const BOAT_POS: V3 = [2.6, 0, -5.5];
export const BOW_SPOT: V3 = [2.6, 0, -10.2];
export const CREW_SPOTS: V3[] = [[1.4, 0, -6.5], [3.8, 0, -4.2], [1.6, 0, -3.4]];
export const WHALE_HEAD: V3 = [-5.2, 0, -7.5];
export const WHALE_TAIL: V3 = [0.8, 0, -12.5];
export const WHALE_MID: V3 = [-2.2, 0, -10];
export const WHALE_TOP = 1.55;
export const VOLCANO_POS: V3 = [-38, 0, -150];
// The whale's blowhole (spout origin) sits on top of the head.
export const SPOUT_POS: V3 = [-4.6, 1.7, -7.9];
// The tow rope runs from the boat's stern to the whale.
export const STERN_SPOT: V3 = [2.6, 0, -1.2];
// The whale thrashes hardest in shot 4 (tail lift) and shot 5.
export const thrashAt = (id: number, tSec: number): number => {
  if (id === 4) return smooth((tSec - L[3] / FPS) / ((L[4] - L[3]) / FPS));
  if (id === 5) return 1 - smooth((tSec - L[4] / FPS) / ((L[5] - L[4]) / FPS)) * 0.5;
  return 0;
};
// The boat bobs on the swell; the whale bobs slower and deeper.
export const boatBob = (tSec: number): number => Math.sin(tSec * 1.9) * 0.09;
export const whaleBob = (tSec: number): number => Math.sin(tSec * 0.9 + 1.2) * 0.16;

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

// The cover camera: low over the swell, looking at the whale —
// the WHALE big across the centre, the boat + lamafa at the
// right edge, the claim card centred up-frame.
// v2: closer + shifted right so the lamafa on the bow reads big
// at the frame's right edge instead of a speck behind the sail.
const CAM_COVER: { pos: V3; look: V3 } = { pos: [3.5, 2.6, 6.5], look: [-1.5, 1.6, -9] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 7:
      // gentle push-in only (0.00025 decay): the approved frame-0
      // composition (k = 1 at the shot's first frame) stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole peledang under sail, volcano behind
      return full(dolly([9, 7.5, 13], [-1, 1.2, -8], Math.exp(-0.0003 * lf), { fov: 46 }));
    case 3: // CLOSE on the lamafa at the bow, whale back beside him
      // v2: was aimed past the hero — he cropped at the right edge
      // and the card never entered frame; re-centred on the bow
      // v3: mirrored to the -X side — from +X the boat's sail sat
      // dead on the view axis and sliced the LAMAFA card in half.
      // From here the sail is 4+ m off-axis, card + hero clear.
      return full(dolly([-4.5, 2.2, -2.0], [1.2, 1.6, -10.2], Math.exp(-0.0005 * lf), { fov: 42 }));
    case 4: // THE JUMP: lamafa on the whale's back, harpoon down
      return full(dolly([-6.5, 3.2, -2.5], [-2.2, 1.4, -10], Math.exp(-0.0004 * lf), { fov: 42 }));
    case 5: // WIDE on the thrashing tail + the towed boat
      // v3: mirrored to -X (same sail-on-axis defect as shot 3:
      // the sail plane sliced the MEI-OKTOBER card); look nudged
      // right so the bow hero stays inside the frame
      return full(dolly([-7.5, 3.4, 6], [0.5, 1.0, -9.5], Math.exp(-0.0003 * lf), { fov: 44 }));
    case 6: // MEDIUM on the crew hauling the tow rope, whale behind
      // v2: was too tight on the stern — the bow hero never entered
      // frame; pulled back and aimed further forward
      // v3: mirrored to -X — from +X the sail cut the bow hero's
      // head off at its bottom edge and walled the top-left
      return full(dolly([-5.6, 2.4, 0.5], [1.8, 1.3, -6.5], Math.exp(-0.0005 * lf), { fov: 40 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.45, focus: () => [0, 1.2, -8] };
    case 3: return { f: 0, cInf: 0.95, focus: () => [1.2, 1.6, -10] };
    case 4: return { f: 0, cInf: 0.95, focus: () => [-2.2, 1.5, -10] };
    case 5: return { f: 0, cInf: 0.7, focus: () => [-1, 1.0, -9] };
    case 6: return { f: 0, cInf: 0.9, focus: () => [1.6, 1.2, -5] };
    default: return { f: 0, cInf: 0.9, focus: () => [-2.2, 1.4, -10] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
