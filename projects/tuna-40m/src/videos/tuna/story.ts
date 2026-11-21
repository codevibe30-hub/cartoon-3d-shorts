// Timeline of the Toyosu tuna-auction short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE zone: the Toyosu auction hall — a long hall along z,
// the hero bluefin on its ice pallet at z ~2, rows of frozen tuna on both sides,
// the auction platform + price board at the far end (z ~-30), dawn windows behind
// the camera end (+z). Line boundaries live in the L array (start frame of each
// script line + total), derived from voice/line_starts.json; every shot, camera
// key, DOF key and story event is expressed relative to L so one patch retimes
// the whole film.
// VISUAL UPGRADE (21 Nov 2026): every shot has its own angle family (low angle,
// high crane, close-up, medium, tracking) and an in-shot glide/push — no flat
// static cuts; shot boundaries 2, 6 and 10 crossfade.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (assembled 21 Nov 2026, total 58.90 s).
export const L: number[] = [2, 201, 337, 494, 720, 905, 1131, 1273, 1460, 1585, 1767];
export const TOTAL = L[10];
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number, off: number) => (L[i] + off) / FPS;
export const GAVEL4_T = S(3, 4);      // shot 4: the hammer falls — price reveal kick
export const BID5_T = S(4, 26);       // shot 5: Kimura's hand shoots up
export const CHEER10_T = S(9, 30);    // shot 10: punchline crowd burst

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },  // HOOK: low angle at the hero tuna, crowd staring
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },  // LOKASI: high crane wide — the whole Toyosu hall at dawn
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },  // IKAN: close along the 278 kg bluefin's body
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },  // HARGA: medium to the auction board, gavel kick
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },  // PEMBELI: medium close — Kimura bids, hand up
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t }, // REKOR 2013: flashback warmth, the smaller 2013 tuna
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },  // PER KILO: close on the platform scale + gold bars
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },  // JUJUR: medium push-in on the hero — the honest twist
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },  // HARI BIASA: calm wide — a quiet ordinary auction day
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t }, // PUNCHLINE: shot 1 again — the hook repeats (loop)
];
export const XFADE: Record<number, number> = { 2: 8, 6: 10, 10: 10 };
export const FLASH_AT = L[10] - 26;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// Legacy exports kept so shared helpers typecheck; this film has none of these.
export const trainX = (_id: number, _t: number): number => 999;
export const doorOpen = (_id: number, _t: number): number => 0;
export const cargoX = (_id: number, _t: number): number => 999;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// Zone anchors (must match world.ts): hall floor y 0, x -11..11, z -34..16;
// hero tuna centre (0, ~0.75, 2) lying along z, head +z (z ~3.6), tail z ~0.4;
// auction platform z -27..-31 (top y 0.9), price board centre (0, 6.4, -33.6);
// scale prop at (2.9, 0, -0.6); 2013 tuna pallet at (-3.6, 0, -6).

// shot 1 (HOOK, LOW angle): just off the floor by the hero tuna's head, crowd behind it
const S1a = (f: number) => dolly([4.9, 1.7, 8.8], [-0.3, 0.85, 0.9], pushK(f, L[0], 0.0022), { fov: 44 });
const S1b = (f: number) => dolly([4.4, 1.6, 7.8], [-0.3, 0.85, 0.9], pushK(f, L[0] + 90, 0.0018), { fov: 42 });
// shot 2 (LOKASI, HIGH crane wide): the hall's full length, platform far away
const S2a = (f: number) => dolly([8.8, 9.5, 16], [-0.5, 0.2, -13], pushK(f, L[1], 0.0006), { fov: 50 });
const S2b = (f: number) => dolly([7.8, 8.9, 13.5], [-0.5, 0.2, -13], pushK(f, L[1] + 60, 0.0006), { fov: 48 });
// shot 3 (IKAN, CLOSE): tracking slowly along the hero tuna's flank
const S3a = (_f: number) => ({ pos: [2.75, 1.55, 6.6] as V3, look: [-0.2, 0.75, 3.0] as V3, fov: 43 });
const S3b = (_f: number) => ({ pos: [2.55, 1.45, 3.4] as V3, look: [-0.2, 0.75, 0.1] as V3, fov: 41 });
// shot 4 (HARGA, MEDIUM to the board): auctioneer + price board, kick on the gavel
const S4a = (f: number) => dolly([3.6, 2.6, -11.0], [0, 3.4, -31], pushK(f, L[3], 0.0016), { fov: 46 });
const S4b = (f: number) => dolly([3.2, 2.45, -12.5], [0, 3.4, -31], pushK(f, L[3] + 70, 0.0014), { fov: 44 });
// shot 5 (PEMBELI, MEDIUM CLOSE): Kimura at (0.2, 0, -9.8), rivals around him
const S5a = (f: number) => dolly([2.4, 1.75, -5.6], [0.1, 1.25, -9.9], pushK(f, L[4], 0.0018), { fov: 44 });
const S5b = (f: number) => dolly([2.1, 1.65, -6.6], [0.1, 1.25, -9.9], pushK(f, L[4] + 80, 0.0016), { fov: 42 });
// shot 6 (2013, flashback): the smaller tuna at (-3.6, -6), Kimura beside it
const S6a = (f: number) => dolly([0.4, 1.9, -0.6], [-3.5, 0.85, -6.5], pushK(f, L[5], 0.0013), { fov: 44 });
const S6b = (f: number) => dolly([0.0, 1.8, -1.6], [-3.5, 0.85, -6.5], pushK(f, L[5] + 80, 0.0012), { fov: 42 });
// shot 7 (PER KILO, CLOSE): the platform scale at (2.9, 0, -0.6) + gold bars
const S7a = (f: number) => dolly([4.9, 1.6, 3.4], [2.7, 0.65, -0.7], pushK(f, L[6], 0.0018), { fov: 43 });
const S7b = (f: number) => dolly([4.5, 1.5, 2.6], [2.7, 0.65, -0.7], pushK(f, L[6] + 70, 0.0016), { fov: 41 });
// shot 8 (JUJUR, MEDIUM push-in): the hero at (1.9, 0, 3.6), straight to camera
const S8a = (f: number) => dolly([2.1, 1.65, 9.2], [1.85, 1.3, 3.5], pushK(f, L[7], 0.002), { fov: 44 });
const S8b = (f: number) => dolly([2.0, 1.58, 8.2], [1.85, 1.3, 3.5], pushK(f, L[7] + 80, 0.0018), { fov: 42 });
// shot 9 (HARI BIASA, calm WIDE): the hall nearly empty, slow drift
const S9a = (_f: number) => ({ pos: [-7.6, 3.6, 9.5] as V3, look: [0.5, 0.7, -9] as V3, fov: 46 });
const S9b = (_f: number) => ({ pos: [-6.9, 3.4, 7.6] as V3, look: [0.5, 0.7, -10.5] as V3, fov: 46 });
// shot 10 (PUNCHLINE): shot 1's framing again — the loop bookends match
const S10a = (f: number) => dolly([4.9, 1.7, 8.8], [-0.3, 0.85, 0.9], pushK(f, L[9], 0.0022), { fov: 44 });
const S10b = (f: number) => dolly([4.4, 1.6, 7.8], [-0.3, 0.85, 0.9], pushK(f, L[9] + 50, 0.0018), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 90, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 60, dur: 30, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 12, dur: 120, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 70, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 80, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 80, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 70, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 80, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 12, dur: 110, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
};

// impact kicks: the gavel strike, Kimura's bid, the punchline cheer
const KICKS: [number, number][] = [[GAVEL4_T, 1.0], [BID5_T, 0.5], [CHEER10_T, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const len = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * len * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 3, focus: () => [0, 0.8, 2] },
  { f: L[1], cInf: 0 },
  { f: L[2], cInf: 3.5, focus: () => [0, 0.75, 2] },
  { f: L[3], cInf: 1.2, focus: () => [0, 2.2, -29] },
  { f: L[4], cInf: 3, focus: () => [0.2, 1.3, -9.8] },
  { f: L[5], cInf: 2.5, focus: () => [-3.6, 0.8, -6] },
  { f: L[6], cInf: 3.5, focus: () => [2.9, 0.6, -0.6] },
  { f: L[7], cInf: 3, focus: () => [1.9, 1.3, 3.6] },
  { f: L[8], cInf: 0.8, focus: () => [0, 0.8, -6] },
  { f: L[9], cInf: 3, focus: () => [0, 0.8, 2] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
