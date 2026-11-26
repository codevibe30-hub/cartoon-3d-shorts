// Timeline of the Dubai Gold ATM short (±56 s, Fafnir-ID
// format, bottom two-word subtitles). Dubai, UAE: the GOLD
// TO GO machine — a vending machine that dispenses REAL
// 24-carat gold bars (1 g, 5 g, 10 g) and gold coins instead
// of cash; its own body is finished in gold leaf; prices
// update every 10 minutes off the live world gold market;
// the first machine's stock sold out in a day; the body is
// armoured like a vehicle at ±500 kg; anti-money-laundering
// rules cap one person at three buys a day; and the TWIST —
// the world's first gold ATM was not in Dubai at all, but at
// the Emirates Palace hotel in Abu Dhabi, in 2010.
// Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json;
// every shot, camera key, DOF key and story event is
// expressed relative to L.
// VISUAL CORE: a palatial hotel lobby in warm daylight —
// polished marble, gold columns, a GIANT gold ATM at centre
// with a gold bar ALREADY sliding out of its slot from
// frame 0 — the hero shocked beside it, the claim GIANT;
// through the glass wall behind: the bay, the Dubai skyline
// and the Burj Khalifa.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 145, 304, 506, 653, 779, 967, 1114, 1266, 1471, 1584];
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
// A palatial lobby. The GIANT gold ATM stands at ATM_C on the
// marble floor, front (screen + slot + tray) facing south
// (+z) toward the cover camera. Behind it (z << 0) a glass
// wall opens onto the bay: water, the palm island at right,
// the Dubai skyline + Burj Khalifa across the water, and —
// far left across the bay — the golden-domed Emirates Palace
// (PALACE_C) for the twist shot. The hero stands at
// HERO_POS, at the machine's right side.
export const ATM_C: V3 = [0, 0, -6];
export const HERO_POS: V3 = [1.5, 0, 4.3];
export const SCREEN_POS: V3 = [0, 3.05, -5.32];
export const SLOT_POS: V3 = [0, 1.92, -5.32];
export const TRAY_POS: V3 = [0, 1.18, -5.15];
export const PALACE_C: V3 = [-58, 0, -118];
export const BURJ_POS: V3 = [26, 0, -150];

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

// The cover camera: low in the lobby, looking north at the
// giant gold machine — the ATM towering centre, the hero
// reacting at the right, the bay + skyline stacked behind
// the glass. Subjects stay near the view axis (portrait
// half-FOV is only ±13-15° — the Sedlec lesson).
const CAM_COVER: { pos: V3; look: V3 } = { pos: [1.25, 2.5, 8.6], look: [-0.2, 2.3, -6] };

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const lf = Math.max(0, f - s.a); // shot-local frame
  switch (id) {
    case 1:
    case 10:
      // gentle push-in only: the frame-0 composition stays intact
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, Math.exp(-0.00025 * lf), { fov: 46 }));
    case 2: // HIGH WIDE: the whole lobby — machine centre, glass wall, bay + skyline beyond
      return full(dolly([6.5, 6.0, 16], [0, 2.6, -8], Math.exp(-0.00035 * lf), { fov: 50 }));
    case 3: // CLOSE on the machine's face: screen lit, the bar sliding out of the slot
      return full(dolly([1.7, 2.3, -0.4], [-0.1, 2.1, -6], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 4: // THE COINS: three giant gold coins turning before the machine
      return full(dolly([0.7, 2.2, 4.2], [-0.1, 1.9, -6], Math.exp(-0.00035 * lf), { fov: 42 }));
    case 5: // THE PRICE SCREEN: tight on the machine's live price display
      return full(dolly([0, 3.05, -0.9], [0, 3.05, -5.32], Math.exp(-0.0004 * lf), { fov: 40 }));
    case 6: // SOLD OUT: the queue at the machine, the hero pointing at the empty display
      return full(dolly([3.4, 2.6, 7.2], [-0.4, 1.8, -6], Math.exp(-0.0003 * lf), { fov: 48 }));
    case 7: // THE KNOCK: hero at the machine's flank, rapping the armoured body
      return full(dolly([3.1, 2.1, 0.6], [0.2, 2.0, -6], Math.exp(-0.00035 * lf), { fov: 44 }));
    case 8: // REJECTED: cover framing — the screen flashes its red X, the hero recoils
      return full(dolly([1.4, 2.5, 8.2], [-0.2, 2.4, -6], Math.exp(-0.00025 * lf), { fov: 46 }));
    case 9: // THE TWIST: across the bay — the golden domes of the Emirates Palace, Abu Dhabi
      return full(dolly([-6, 5, -30], [PALACE_C[0] + 2, 8, PALACE_C[2]], Math.exp(-0.0003 * lf), { fov: 30 }));
    default:
      return full(dolly(CAM_COVER.pos, CAM_COVER.look, 1, { fov: 46 }));
  }
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const dofAt = (f: number): Dof => {
  const id = shotAt(f).id;
  switch (id) {
    case 2: return { f: 0, cInf: 0.4, focus: () => [0, 3, -40] };
    case 3: return { f: 0, cInf: 1.0, focus: () => [SLOT_POS[0], SLOT_POS[1], SLOT_POS[2]] };
    case 4: return { f: 0, cInf: 0.9, focus: () => [0, 1.8, -3.4] };
    case 5: return { f: 0, cInf: 1.0, focus: () => [SCREEN_POS[0], SCREEN_POS[1], SCREEN_POS[2]] };
    case 7: return { f: 0, cInf: 0.9, focus: () => [ATM_C[0], 2.0, ATM_C[2]] };
    case 9: return { f: 0, cInf: 0.5, focus: () => [PALACE_C[0], 8, PALACE_C[2]] };
    default: return { f: 0, cInf: 0.9, focus: () => [ATM_C[0], 2.2, ATM_C[2]] };
  }
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
