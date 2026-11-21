// Timeline of the Gereja Ayam short (±55 s, Fafnir-ID format, bottom
// two-word subtitles). ONE place: Bukit Rhema in Magelang — a jungle
// hilltop clearing where a GIANT CHICKEN-shaped prayer house stands:
// white plaster body, orange beak, a crown of gold-orange spikes on
// its head (meant to be a dove's crown of holiness — the whole world
// reads it as a hen). Beyond the jungle rim: the stepped silhouette
// of Borobudur and the cones of Merapi + Merbabu. Line boundaries
// live in the L array (start frame of each script line + total),
// derived from voice/line_starts.json; every shot, camera key, DOF
// key and story event is expressed relative to L so one patch
// retimes the film.
// VISUAL CORE: bright cool daylight, lush jungle green around a
// white-and-orange giant bird; frame 0 is the clickbait cover: the
// chicken's head + crown looming huge from a low angle, the hero in
// shock in the foreground, claim text GIANT.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 155, 332, 507, 676, 859, 1042, 1193, 1307, 1509, 1698];
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

// ---------------- shared geography (world.ts + cast.ts MUST match) ----------------
// The clearing runs along Z. The chicken stands on a stone base at
// BASE_Z; its body centre is BODY_C, its head HEAD (beak pointing
// +Z, toward the path), the crown deck on top of the head is DECK.
// The entrance door is at DOOR (the chest, ground level). The café
// hut sits by the tail at CAFE. The vista silhouettes (Borobudur,
// Merapi, Merbabu) stand far beyond the jungle rim at -Z.
export const BASE_Z = -16;
export const BODY_C: V3 = [0, 5.2, -16];
export const HEAD: V3 = [0, 12.3, -7.2];
export const DECK: V3 = [0, 14.3, -6.4];
export const DOOR: V3 = [0, 0, -8.4];
export const CAFE: V3 = [7.5, 0, -25];
export const HERO_SPOT: V3 = [2.2, 1.0, 2.6]; // on the foreground boulder (world.ts buildHill)
// the side stair climbs the +X flank: ground (6.1, 0, -1) up to the
// neck platform (6.1, 9.6, -12.3); tread height at z is stairY(z)
export const stairY = (z: number) => Math.max(0, (-1 - z) * 0.85);

// ---------------- story events (film seconds, derived from L) ----------------
const S = (i: number) => L[i] / FPS;
export const DOVE_T = S(2) + 0.4;   // shot 3: the dream dove crosses the sky
export const STORM_T = S(5) + 0.3;  // shot 6: the ruin — a gust shakes the trees
export const CHEER_T = S(6) + 0.6;  // shot 7: the crowd's cameras flash

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },     // HOOK: the giant chicken head looms, hero in shock
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },     // WIDE: the whole bird on its jungle hill
  { id: 3, a: L[2], b: L[3], light: "golden", tau: (t) => t },  // THE DREAM 1988: a white dove over the hill
  { id: 4, a: L[3], b: L[4], light: "day", tau: (t) => t },     // FOR EVERYONE: visitors stream into the chest door
  { id: 5, a: L[4], b: L[5], light: "day", tau: (t) => t },     // THE TWIST: head close-up — a DOVE, not a chicken
  { id: 6, a: L[5], b: L[6], light: "storm", tau: (t) => t },   // RE-HOOK: THE RUIN, abandoned 15 years
  { id: 7, a: L[6], b: L[7], light: "golden", tau: (t) => t },  // FAMOUS: AADC 2 made it a destination
  { id: 8, a: L[7], b: L[8], light: "day", tau: (t) => t },     // THE CLIMB: seven floors up the flank to the crown
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },     // THE CROWN VISTA: Borobudur + Merapi + Merbabu
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },   // PUNCHLINE: shot 1 again — it was a dove all along
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10 };
export const FLASH_AT = L[10] + 100; // no white flash in this film

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[0];
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

// shot 1 (HOOK, CLICKBAIT COVER): ground level, looking UP — the
// head + crown + beak fill the top of the frame, the hero stands
// big in the near foreground wearing the SHOCK face
const S1a = (f: number) => dolly([3.1, 1.5, 6.2], [0, 12.0, -6.9], pushK(f, L[0], 0.0007), { fov: 48 });
const S1b = (f: number) => dolly([3.3, 1.7, 5.6], [0, 11.8, -7.0], pushK(f, L[0] + 70, 0.0006), { fov: 46 });
// shot 2 (WIDE): the whole bird on its hill, jungle rim around,
// the path leading in; hero small on the path, waving
const S2a = (f: number) => dolly([7.5, 5.0, 27], [0, 6.2, -14], pushK(f, L[1], 0.001), { fov: 46 });
const S2b = (f: number) => dolly([7.1, 4.8, 25.8], [0, 6.2, -14], pushK(f, L[1] + 55, 0.0009), { fov: 44 });
// shot 3 (THE DREAM, GOLDEN): Daniel on the path at dawn, gazing up;
// the dove crosses the sky above the hill (the building not yet built
// in 1988 — but the hill + head silhouette carry the rhyme; the bird
// flies where the crown will be)
const S3a = (f: number) => dolly([6.4, 2.4, 8.5], [0, 6.5, -10], pushK(f, L[2], 0.001), { fov: 44 });
const S3b = (f: number) => dolly([6.1, 2.3, 7.7], [0, 6.5, -10], pushK(f, L[2] + 50, 0.001), { fov: 42 });
// shot 4 (FOR EVERYONE): at the chest door — visitors of every kind
// stream in under the great body; the hero holds the door, grinning
const S4a = (f: number) => dolly([4.4, 1.9, 2.8], [0, 2.6, -8.6], pushK(f, L[3], 0.0011), { fov: 44 });
const S4b = (f: number) => dolly([4.2, 1.85, 2.0], [0, 2.6, -8.6], pushK(f, L[3] + 50, 0.001), { fov: 42 });
// shot 5 (THE TWIST): tight on the head — crown, eye, beak; a small
// white dove sprite perches by the crown for scale of the joke
const S5a = (f: number) => dolly([5.6, 12.1, 1.2], [0, 12.4, -7.2], pushK(f, L[4], 0.001), { fov: 42 });
const S5b = (f: number) => dolly([5.3, 12.0, 0.4], [0, 12.4, -7.2], pushK(f, L[4] + 55, 0.0009), { fov: 40 });
// shot 6 (THE RUIN, STORM): the wide again under a grey sky — the
// bird streaked with graffiti, vines on its flank, fence broken;
// the hero picks through the weeds in the foreground, nervous
const S6a = (f: number) => dolly([-8.5, 5.2, 25], [0, 5.8, -14], pushK(f, L[5], 0.001), { fov: 46 });
const S6b = (f: number) => dolly([-8.1, 5.0, 23.8], [0, 5.8, -14], pushK(f, L[5] + 55, 0.0009), { fov: 44 });
// shot 7 (FAMOUS, GOLDEN): golden hour, a happy crowd with phones
// on the path; camera flashes; the hero grins at the attention
const S7a = (f: number) => dolly([-2.5, 2.2, 13.5], [0, 7.5, -11], pushK(f, L[6], 0.0011), { fov: 48 });
const S7b = (f: number) => dolly([-2.3, 2.1, 12.6], [0, 7.5, -11], pushK(f, L[6] + 50, 0.001), { fov: 46 });
// shot 8 (THE CLIMB): along the +X flank — the stair zigzags up the
// body to the neck platform; hero + kid climb, tiny against the bird
const S8a = (f: number) => dolly([17, 6, 9], [3, 7, -9.5], pushK(f, L[7], 0.001), { fov: 46 });
const S8b = (f: number) => dolly([16.4, 5.8, 8.2], [3, 7, -9.5], pushK(f, L[7] + 55, 0.0009), { fov: 44 });
// shot 9 (THE CROWN VISTA): standing ON the crown deck, the railing
// at the frame's bottom edge; a slow pan from Borobudur's stepped
// silhouette (left) across to Merapi + Merbabu (right)
const S9a = (f: number) => dolly([1.8, 15.9, -3.2], [-32, 6.5, -115], pushK(f, L[8], 0.0004), { fov: 47 });
const S9b = (f: number) => dolly([1.8, 15.9, -3.2], [14, 5.5, -118], pushK(f, L[8] + 40, 0.0004), { fov: 47 });
// shot 10 (PUNCHLINE): shot 1's framing again — the hero laughing
// under the great head; a small white dove crosses the top of frame
const S10a = (f: number) => dolly([3.1, 1.5, 6.2], [0, 12.0, -6.9], pushK(f, L[9], 0.0007), { fov: 48 });
const S10b = (f: number) => dolly([3.3, 1.7, 5.6], [0, 11.8, -7.0], pushK(f, L[9] + 60, 0.0006), { fov: 46 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 80, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 55, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 55, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 55, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 55, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 40, dur: 60, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 60, dur: 26, s: S10b }],
};

// impact kicks: the dove's flutter, the storm gust, the camera flashes
const KICKS: [number, number][] = [
  [DOVE_T, 0.18], [STORM_T, 0.3], [CHEER_T, 0.2],
];
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
  { f: 0, cInf: 0.8, focus: () => [2.2, 3.0, 2.6] },
  { f: L[1], cInf: 0.7, focus: () => [0, 6, -16] },
  { f: L[2], cInf: 1.0, focus: () => [0, 11.5, -12] },
  { f: L[3], cInf: 1.6, focus: () => [0, 2.2, -8.6] },
  { f: L[4], cInf: 2.2, focus: () => [0, 12.3, -7.2] },
  { f: L[5], cInf: 0.9, focus: () => [0, 6, -16] },
  { f: L[6], cInf: 1.4, focus: () => [0, 3, 0] },
  { f: L[7], cInf: 2.0, focus: () => [6.4, 6.5, -4] },
  { f: L[8], cInf: 0.5, focus: () => [-20, 4, -110] },
  { f: L[9], cInf: 0.8, focus: () => [2.2, 3.0, 2.6] },
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
