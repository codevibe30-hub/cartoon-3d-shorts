// Timeline of "Pria Ini Diterkam Beruang, Ditinggal Mati, Lalu
// Merangkak Pulang🤫" — the Hugh Glass story, DASIMAN-STYLE story
// lane episode 8: paradox hook (mauled by a grizzly, left for dead
// by his own friends) -> the attack -> the wounds -> the two men
// who waited, then ran -> the lie -> alone -> he sets his own leg
// -> the crawl -> the raft -> forgiveness -> the moral. Round
// WHITE-head stickmen in bright simple 3D sets; frame 0 is a
// dramatic SCENE still, NO claim card; the paradox lives in the
// title. Violence is stylised, NO gore: a rearing bear, a fallen
// man, bandages, a long crawl. Line boundaries live in the L array
// (start frame of each script line + total), derived from
// voice/line_starts.json; every shot, camera key, DOF key and
// story event is expressed relative to L so one patch retimes
// the film.
import type { LightName } from "./lights";

export const FPS = 30;
// Timing derived from voice/line_starts.json (patched after voice assembly).
export const L: number[] = [2, 127, 292, 394, 595, 730, 862, 1029, 1157, 1349, 1524, 1700, 1910, 2089, 2266];
export const TOTAL = L[14];
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
export const RIVER: V3 = [0, 0, -80];          // the Grand River bank: clearing + water (shots 1-5)
export const RIVER_Z = -93;                    // the water band centre
export const CLEARING: V3 = [0, 0, -80];       // the attack clearing
export const BEAR_BUSH: V3 = [-7, 0, -87];     // the thicket the grizzly charges from
export const GLASS_FALL: V3 = [-1.2, 0, -80.5];// where Glass lies after the mauling
export const CAMP: V3 = [80, 0, 10];           // the brigade camp (shots 6-8)
export const GRAVE: V3 = [79, 0, 5];           // the shallow grave under the bear skin
export const FIRE: V3 = [84, 0, 13];           // the campfire
export const PRAIRIE: V3 = [-20, 0, 70];       // the empty plains (shots 9-11)
export const SIGNPOST: V3 = [-6, 0, 63];       // "FORT KIOWA 200 MIL ->"
export const CRAWL_Z = 70;                     // the crawl line
export const crawlX = (u: number) => 4 - u * 38; // Glass drags himself west, frame by frame
export const FORT: V3 = [-120, 0, -20];        // Fort Kiowa (shots 12-14)
export const FORT_WALL_Z = -31;                // the palisade front wall
export const GATE_X = -120;                    // the gate, centre of the wall
export const RAFT_Z = -45;                     // the river in front of the fort
export const raftX = (u: number) => -82 - smooth(u) * 28; // the raft drifts to the landing
export const LANDING: V3 = [-112, 0, -41];     // where the raft beaches

// ---------------- shots ----------------
export type Light = LightName;
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: L[0], b: L[1], light: "day", tau: (t) => t },    // HOOK: the grizzly rears over fallen Glass, NO card
  { id: 2, a: L[1], b: L[2], light: "day", tau: (t) => t },    // 1823: Glass scouts the Grand River, rifle in hand
  { id: 3, a: L[2], b: L[3], light: "day", tau: (t) => t },    // THE CHARGE: mother grizzly out of the thicket, two cubs behind
  { id: 4, a: L[3], b: L[4], light: "storm", tau: (t) => t },  // THE WOUNDS: Glass on the ground, the list of what is broken
  { id: 5, a: L[4], b: L[5], light: "storm", tau: (t) => t },  // THE BEAR IS DEAD: and every man there shakes his head over Glass
  { id: 6, a: L[5], b: L[6], light: "day", tau: (t) => t },    // THE VIGIL: Ashley leaves Fitzgerald + young Bridger to wait
  { id: 7, a: L[6], b: L[7], light: "day", tau: (t) => t },    // FIVE DAYS: they take his rifle and knife, and go
  { id: 8, a: L[7], b: L[8], light: "storm", tau: (t) => t },  // THE LIE: reported dead — but under the skin, his eyes open
  { id: 9, a: L[8], b: L[9], light: "day", tau: (t) => t },    // ALONE: an empty horizon and 320 kilometres of it
  { id: 10, a: L[9], b: L[10], light: "day", tau: (t) => t },  // HE SETS HIS OWN LEG: and wraps himself in the bear's skin
  { id: 11, a: L[10], b: L[11], light: "day", tau: (t) => t }, // THE CRAWL: a man dragging himself across the whole world
  { id: 12, a: L[11], b: L[12], light: "golden", tau: (t) => t },// THE RAFT: six weeks later, the river carries him home
  { id: 13, a: L[12], b: L[13], light: "golden", tau: (t) => t },// FORGIVENESS: Bridger kneels; the hand comes up — and pardons
  { id: 14, a: L[13], b: L[14], light: "golden", tau: (t) => t },// CLOSE: not strength — refusing to die
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 8, 8: 8, 10: 10, 12: 10, 14: 10 };

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

// shot 1 (HOOK, DRAMATIC COVER): low on the grass — the grizzly
// towers centre-frame over Glass sprawled in front of it, his red
// tie showing, rifle flung away, the cubs small behind her
const S1a = (f: number) => dolly([2.6, 2.8, -73.5], [-1.8, 0.9, -80.8], pushK(f, L[0], 0.0006), { fov: 48 });
const S1b = (f: number) => dolly([2.2, 2.6, -74.3], [-1.8, 0.9, -80.8], pushK(f, L[0] + 60, 0.0005), { fov: 46 });
// shot 2 (THE SCOUT): Glass walks the riverbank toward camera-
// left, the Grand sliding bright behind him
const S2a = (f: number) => dolly([-13.5, 2.0, -72.5], [-4, 1.5, -84], pushK(f, L[1], 0.0006), { fov: 46 });
const S2b = (f: number) => dolly([-12.8, 1.9, -73.4], [-3.4, 1.5, -84], pushK(f, L[1] + 50, 0.0006), { fov: 44 });
// shot 3 (THE CHARGE): the thicket bursts — she comes straight
// at him, and at us
const S3a = (f: number) => dolly([2.8, 1.7, -71.8], [-5.5, 1.6, -85], pushK(f, L[2], 0.0006), { fov: 47 });
const S3b = (f: number) => dolly([2.2, 1.6, -72.8], [-5.0, 1.6, -84.5], pushK(f, L[2] + 50, 0.0006), { fov: 45 });
// shot 4 (THE WOUNDS): close and grey over the fallen man; the
// trappers' boots at the frame edge, nobody knowing what to do
const S4a = (f: number) => dolly([3.8, 1.5, -75.2], [-1.2, 0.7, -80.5], pushK(f, L[3], 0.0007), { fov: 46 });
const S4b = (f: number) => dolly([3.3, 1.4, -76.0], [-1.2, 0.75, -80.5], pushK(f, L[3] + 50, 0.0007), { fov: 44 });
// shot 5 (DEAD BEAR): the great body on its side in the fore-
// ground grass; beyond it the men stand over Glass, heads shaking
const S5a = (f: number) => dolly([7.5, 1.9, -73.8], [-1.5, 1.0, -81.5], pushK(f, L[4], 0.0006), { fov: 47 });
const S5b = (f: number) => dolly([7.0, 1.8, -74.7], [-1.5, 1.05, -81.5], pushK(f, L[4] + 50, 0.0006), { fov: 45 });
// shot 6 (THE VIGIL): the camp — Glass laid out by the fire under
// the bear skin, Ashley pointing two men into their duty
const S6a = (f: number) => dolly([71.5, 2.2, 16.5], [80.5, 1.0, 7.5], pushK(f, L[5], 0.0006), { fov: 47 });
const S6b = (f: number) => dolly([72.2, 2.1, 15.6], [80.5, 1.0, 7.5], pushK(f, L[5] + 50, 0.0006), { fov: 45 });
// shot 7 (THE LEAVING): from the grave's own level — two figures
// walking away into the bright, one with a rifle that isn't his
const S7a = (f: number) => dolly([74.2, 3.0, 10.8], [80, 0.9, 3.5], pushK(f, L[6], 0.0005), { fov: 47 });
const S7b = (f: number) => dolly([74.8, 2.9, 10.0], [80.5, 0.9, 3.0], pushK(f, L[6] + 50, 0.0005), { fov: 45 });
// shot 8 (THE LIE): closer still on the grave — the skin, the
// stillness, and then the eyes
const S8a = (f: number) => dolly([75.8, 4.2, 2.6], [79.3, 0.3, 5.4], pushK(f, L[7], 0.0007), { fov: 46 });
const S8b = (f: number) => dolly([76.4, 4.0, 3.3], [79.3, 0.35, 5.4], pushK(f, L[7] + 50, 0.0007), { fov: 44 });
// shot 9 (ALONE): the widest frame of the film — one seated man,
// one signpost, and nothing else in the world
const S9a = (f: number) => dolly([-16, 2.4, 80], [-7, 1.2, 64.5], pushK(f, L[8], 0.0004), { fov: 50 });
const S9b = (f: number) => dolly([-15.2, 2.3, 79.0], [-7, 1.2, 64.5], pushK(f, L[8] + 55, 0.0004), { fov: 48 });
// shot 10 (THE LEG): tight on the seated man and his hands at the
// splint — pain, done by himself, to himself
const S10a = (f: number) => dolly([-1.5, 1.6, 74.5], [-5.8, 0.8, 66.5], pushK(f, L[9], 0.0007), { fov: 46 });
const S10b = (f: number) => dolly([-2.0, 1.5, 73.6], [-5.8, 0.85, 66.5], pushK(f, L[9] + 50, 0.0007), { fov: 44 });
// shot 11 (THE CRAWL): low tracking beside him, the drag trail
// unspooling behind, the plains going on forever
const S11a = (f: number) => dolly([crawlX(clamp01((f - L[10]) / Math.max(1, L[11] - L[10]))) + 13, 1.5, 77], [crawlX(clamp01((f - L[10]) / Math.max(1, L[11] - L[10]))), 0.55, 70], pushK(f, L[10], 0.0003), { fov: 48 });
const S11b = (f: number) => dolly([crawlX(clamp01((f - L[10]) / Math.max(1, L[11] - L[10]))) + 11, 1.4, 76], [crawlX(clamp01((f - L[10]) / Math.max(1, L[11] - L[10]))), 0.55, 70], pushK(f, L[10] + 55, 0.0003), { fov: 48 });
// shot 12 (THE RAFT): the river at gold hour — a raft, a shape on
// it that is still a man, and the fort's gate ahead
const S12a = (f: number) => { const rx = raftX(clamp01((f - L[11]) / Math.max(1, L[12] - L[11]))); return { pos: [rx - 8.5, 4.4, RAFT_Z + 7.5] as [number, number, number], look: [rx + 0.2, 0.4, RAFT_Z] as [number, number, number], fov: 47, roll: 0 }; };
const S12b = (f: number) => { const rx = raftX(clamp01((f - L[11]) / Math.max(1, L[12] - L[11]))); return { pos: [rx - 6.5, 3.6, RAFT_Z + 6.5] as [number, number, number], look: [rx + 0.2, 0.4, RAFT_Z] as [number, number, number], fov: 46, roll: 0 }; };
// shot 13 (FORGIVENESS): inside the palisade — the young man on
// his knee, the scarred man standing over him, hand rising
const S13a = (f: number) => dolly([-113.5, 2.0, -16.5], [-119.5, 1.2, -24.5], pushK(f, L[12], 0.0006), { fov: 46 });
const S13b = (f: number) => dolly([-114.2, 1.9, -17.4], [-119.5, 1.25, -24.5], pushK(f, L[12] + 50, 0.0006), { fov: 44 });
// shot 14 (CLOSE): the gate at gold hour — Glass on his feet in
// the middle of it, the storyteller beside him, both looking out
const S14a = (f: number) => dolly([-120, 2.6, -12], [-120, 1.7, -27], pushK(f, L[13], 0.0004), { fov: 50 });
const S14b = (f: number) => dolly([-120, 2.4, -13.4], [-120, 1.75, -27], pushK(f, L[13] + 60, 0.0004), { fov: 48 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: L[0], s: S1a }, { f: L[0] + 60, dur: 26, s: S1b }],
  2: [{ f: L[1], s: S2a }, { f: L[1] + 50, dur: 26, s: S2b }],
  3: [{ f: L[2], s: S3a }, { f: L[2] + 50, dur: 26, s: S3b }],
  4: [{ f: L[3], s: S4a }, { f: L[3] + 50, dur: 26, s: S4b }],
  5: [{ f: L[4], s: S5a }, { f: L[4] + 50, dur: 26, s: S5b }],
  6: [{ f: L[5], s: S6a }, { f: L[5] + 50, dur: 26, s: S6b }],
  7: [{ f: L[6], s: S7a }, { f: L[6] + 50, dur: 26, s: S7b }],
  8: [{ f: L[7], s: S8a }, { f: L[7] + 50, dur: 26, s: S8b }],
  9: [{ f: L[8], s: S9a }, { f: L[8] + 55, dur: 26, s: S9b }],
  10: [{ f: L[9], s: S10a }, { f: L[9] + 50, dur: 26, s: S10b }],
  11: [{ f: L[10], s: S11a }, { f: L[10] + 55, dur: 26, s: S11b }],
  12: [{ f: L[11], s: S12a }, { f: L[11] + 55, dur: 26, s: S12b }],
  13: [{ f: L[12], s: S13a }, { f: L[12] + 50, dur: 26, s: S13b }],
  14: [{ f: L[13], s: S14a }, { f: L[13] + 60, dur: 26, s: S14b }],
};

// the charge (shot 3) lands a single camera kick as she hits him
export const kickAt = (t: number) => {
  const hit = L[3] / FPS - 0.28; // just before line 4 begins: the mauling lands
  const d = Math.abs(t - hit);
  return d < 0.09 ? (1 - d / 0.09) * 0.012 : 0;
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0.9, focus: () => [-2.4, 1.6, -81] },
  { f: L[1], cInf: 0.8, focus: () => [-4, 1.6, -84] },
  { f: L[2], cInf: 0.9, focus: () => [-5.5, 1.7, -85] },
  { f: L[3], cInf: 1.1, focus: () => [-1.2, 0.8, -80.5] },
  { f: L[4], cInf: 1.0, focus: () => [-1.5, 1.1, -81.5] },
  { f: L[5], cInf: 0.9, focus: () => [80, 1.1, 7] },
  { f: L[6], cInf: 0.9, focus: () => [79.5, 1.0, 5.5] },
  { f: L[7], cInf: 1.1, focus: () => [79, 0.7, 5.2] },
  { f: L[8], cInf: 0.7, focus: () => [-6.5, 1.2, 64] },
  { f: L[9], cInf: 1.1, focus: () => [-5.8, 0.9, 66.5] },
  { f: L[10], cInf: 0.8, focus: () => [-14, 0.7, 70] },
  { f: L[11], cInf: 0.9, focus: () => [-95, 1.1, -44] },
  { f: L[12], cInf: 1.0, focus: () => [-119.5, 1.3, -24.5] },
  { f: L[13], cInf: 0.7, focus: () => [-120, 1.8, -26] },
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
