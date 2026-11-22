// DASIMAN-STYLE cast renderer: round WHITE-head stickmen with thin
// black limbs in the 3D world — the look of the Dasiman 3d story
// Shorts. Big bald white head, dot eyes, line mouth, black stick arms
// and legs, a simple coloured torso (shirt / uniform / suit) so each
// character reads instantly. The hero/storyteller wears the mascot's
// RED TIE. Design space 600x1000 (house BODY plane), sole at y=975.
import { Pen, INK } from "./toon";

export type StickExpr = "neutral" | "stern" | "grin" | "laugh" | "nervous" | "shock"
  | "relief" | "relief_open" | "smile" | "pained" | "sad";
export type StickPose = "stand" | "walk" | "sit" | "kneel";
export type StickOutfit = {
  torso: string;            // shirt / uniform / suit colour
  tie?: string | null;      // the mascot's red tie (hero)
  cap?: string | null;      // army / hiker cap colour
  hat?: string | null;      // wide-brim ranger campaign hat colour
  belt?: string | null;
  pack?: string | null;     // backpack colour (Suzuki)
  sword?: boolean;          // officer's sword at the hip
  bandage?: boolean;        // heavy wartime bandages: head wrap + torso wrap (Yamaguchi after Hiroshima)
  tufts?: string | null;    // grey side hair tufts (old men)
  bun?: string | null;      // hair colour: a neat bun + side sweeps (Grete)
  skin?: string;            // hand colour (default white)
};
export type StickOpts = {
  expr?: StickExpr;
  pose?: StickPose;
  phase?: number;                       // walk cycle 0..1
  blink?: number;                       // 0..1 eyelid
  look?: number;                        // -1..1 gaze / head sway
  armL?: [number, number];              // [shoulder deg, elbow deg] 0 = hanging down
  armR?: [number, number];
  prop?: null | "rifle" | "paper" | "rod" | "stick" | "can" | "book" | "suitcase";
  seed?: number;
};

const D2R = Math.PI / 180;
const limb = (p: Pen, x: number, y: number, aDeg: number, len: number): [number, number] => {
  const a = aDeg * D2R;
  return [x + Math.sin(a) * len, y + Math.cos(a) * len];
};

export const stick = (p: Pen, o: StickOutfit, opts: StickOpts = {}) => {
  const { expr = "neutral", pose = "stand", phase = 0, blink = 0, look = 0, prop = null } = opts;
  const hand = o.skin ?? "#ffffff";
  const hipY = pose === "sit" ? 716 : pose === "kneel" ? 668 : 560;
  const shoY = hipY - 208, headCY = shoY - 148, headR = 118;
  const cx = 300 + look * 7;
  const sway = pose === "walk" ? Math.sin(phase * Math.PI * 2) * 10 : 0;

  // ---- backpack (behind everything) ----
  if (o.pack) {
    p.poly([[196, shoY - 6], [404, shoY - 6], [416, hipY + 26], [184, hipY + 26]], o.pack, 6);
    p.poly([[196, shoY - 6], [404, shoY - 6], [408, shoY + 44], [192, shoY + 44]], "#00000022", 0);
  }
  // ---- legs ----
  const legW = 19, shoe = (x: number, y: number, flip = 1) => p.ell(x + 8 * flip, y, 30, 13, INK, 0);
  if (pose === "walk") {
    const s1 = Math.sin(phase * Math.PI * 2), s2 = Math.sin(phase * Math.PI * 2 + Math.PI);
    const k1 = limb(p, 276, hipY, s1 * 30, 178), f1 = limb(p, k1[0], k1[1], s1 * 30 - Math.max(0, -s1) * 38 - 4, 178);
    const k2 = limb(p, 324, hipY, s2 * 30, 178), f2 = limb(p, k2[0], k2[1], s2 * 30 - Math.max(0, -s2) * 38 - 4, 178);
    p.stroke([[276, hipY], k1, f1], legW, INK); shoe(f1[0], Math.min(f1[1] + 14, 968), s1 >= 0 ? 1 : -1);
    p.stroke([[324, hipY], k2, f2], legW, INK); shoe(f2[0], Math.min(f2[1] + 14, 968), s2 >= 0 ? 1 : -1);
  } else if (pose === "sit") {
    // seated on the ground: knees up, shins down, feet flat ahead
    p.stroke([[272, hipY], [196, 838], [200, 952]], legW, INK); shoe(200, 962);
    p.stroke([[328, hipY], [404, 838], [400, 952]], legW, INK); shoe(400, 962);
  } else if (pose === "kneel") {
    // one knee on the ground (the graves), the other foot planted
    p.stroke([[272, hipY], [258, 902], [206, 908]], legW, INK); shoe(196, 912, -1);
    p.stroke([[328, hipY], [392, 796], [396, 946]], legW, INK); shoe(396, 958);
  } else {
    p.stroke([[276, hipY], [272, hipY + 190], [270, 946]], legW, INK); shoe(270, 960);
    p.stroke([[324, hipY], [328, hipY + 190], [330, 946]], legW, INK); shoe(330, 960);
  }
  // ---- torso ----
  const torsoPts: [number, number][] = [[cx - 54 + sway * 0.3, shoY], [cx + 54 + sway * 0.3, shoY], [cx + 40, hipY + 8], [cx - 40, hipY + 8]];
  p.poly(torsoPts, o.torso, 6);
  if (o.belt) p.poly([[cx - 43, hipY - 22], [cx + 43, hipY - 22], [cx + 40, hipY + 8], [cx - 40, hipY + 8]], o.belt, 0);
  // shorts/pants block at the hips so the stick legs meet cloth
  p.poly([[cx - 44, hipY - 4], [cx + 44, hipY - 4], [cx + 42, hipY + 52], [cx - 42, hipY + 52]], o.torso, 5);
  // ---- bandage wrap across the torso (wounds dressed, 1945) ----
  if (o.bandage) {
    p.poly([[cx - 52, shoY + 34], [cx + 52, shoY + 6], [cx + 50, hipY - 30], [cx - 50, hipY - 2]], "#efe9db", 4);
    p.stroke([[cx - 51, shoY + 62], [cx + 51, shoY + 34]], 4, "#c9c2ae");
    p.stroke([[cx - 50, shoY + 96], [cx + 50, shoY + 68]], 4, "#c9c2ae");
  }
  // ---- arms ----
  const armW = 16;
  const drawArm = (side: -1 | 1, ang: [number, number] | undefined, swing: number): [number, number] => {
    const sh: [number, number] = [cx + side * 52 + sway * 0.3, shoY + 12];
    const a1 = (ang ? ang[0] : swing) * (side === 1 ? 1 : -1) * (ang ? 1 : 1);
    const aS = ang ? ang[0] : side * swing;
    const el = limb(p, sh[0], sh[1], aS, 118);
    const aE = aS + (ang ? ang[1] : side * swing * 0.4 - 6);
    const hd = limb(p, el[0], el[1], aE, 108);
    p.stroke([sh, el, hd], armW, INK);
    p.ell(hd[0], hd[1], 16, 16, hand, 5);
    void a1;
    return hd;
  };
  const swingL = pose === "walk" ? Math.sin(phase * Math.PI * 2) * 26 : 4;
  const swingR = pose === "walk" ? Math.sin(phase * Math.PI * 2 + Math.PI) * 26 : -4;
  const handL = drawArm(-1, opts.armL, swingL);
  const handR = drawArm(1, opts.armR, swingR);
  // ---- the red tie (hero mascot) ----
  if (o.tie) {
    p.poly([[cx - 11, shoY + 2], [cx + 11, shoY + 2], [cx + 5, shoY + 26], [cx - 5, shoY + 26]], o.tie, 3);
    p.poly([[cx - 5, shoY + 26], [cx + 5, shoY + 26], [cx + 13, shoY + 118], [cx, shoY + 138], [cx - 13, shoY + 118]], o.tie, 3);
  }
  // ---- sword at the hip ----
  if (o.sword) {
    p.stroke([[cx - 40, hipY + 2], [cx - 96, hipY + 128]], 9, "#c9ccd2");
    p.stroke([[cx - 34, hipY - 6], [cx - 52, hipY + 22]], 13, "#8a6a2f");
  }
  // ---- props in hand ----
  if (prop === "rifle") {
    // held at the ready, diagonal across the torso: dark barrel + wooden stock
    p.stroke([[cx - 88, shoY - 58], [cx + 96, hipY + 96]], 10, "#2c2c30");
    p.stroke([[cx - 30, shoY + 44], [cx - 88, shoY - 58]], 21, "#6e4a2c");
    p.stroke([[cx + 40, shoY + 118], [cx + 96, hipY + 96]], 15, "#6e4a2c");
    p.ell(handL[0], handL[1], 16, 16, hand, 5); p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "paper") {
    p.poly([[handR[0] - 8, handR[1] - 62], [handR[0] + 52, handR[1] - 50], [handR[0] + 44, handR[1] + 26], [handR[0] - 16, handR[1] + 14]], "#f7f3e6", 4);
    p.stroke([[handR[0] + 2, handR[1] - 38], [handR[0] + 40, handR[1] - 30]], 3, "#9a958c");
    p.stroke([[handR[0] + 0, handR[1] - 18], [handR[0] + 38, handR[1] - 10]], 3, "#9a958c");
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "rod") {
    // fishing rod: a long tapered pole from the right hand, angled
    // down-forward, with a thin line dropping from the tip
    p.stroke([[handR[0], handR[1]], [handR[0] + 150, handR[1] - 118]], 8, "#5d4630");
    p.stroke([[handR[0] + 150, handR[1] - 118], [handR[0] + 158, handR[1] + 30]], 2, "#3a3f45");
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "stick") {
    // a stout branch brandished in the right hand (bear defence)
    p.stroke([[handR[0] - 26, handR[1] + 34], [handR[0] + 44, handR[1] - 74]], 15, "#6e4a2c");
    p.stroke([[handR[0] + 30, handR[1] - 48], [handR[0] + 58, handR[1] - 62]], 8, "#6e4a2c");
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "book") {
    // the scrapbook: a thick album held up in the right hand,
    // cover out — fifty years of names inside
    p.poly([[handR[0] - 30, handR[1] - 74], [handR[0] + 38, handR[1] - 66], [handR[0] + 34, handR[1] + 30], [handR[0] - 34, handR[1] + 22]], "#7a3f35", 5);
    p.poly([[handR[0] - 22, handR[1] - 64], [handR[0] + 30, handR[1] - 57], [handR[0] + 27, handR[1] + 21], [handR[0] - 25, handR[1] + 14]], "#efe6cf", 3);
    p.stroke([[handR[0] - 12, handR[1] - 40], [handR[0] + 18, handR[1] - 35]], 3.5, "#9a8f76");
    p.stroke([[handR[0] - 13, handR[1] - 20], [handR[0] + 17, handR[1] - 15]], 3.5, "#9a8f76");
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "suitcase") {
    // a small brown suitcase hanging from the right hand — a
    // child refugee's whole life, or a stockbroker's day bag
    p.poly([[handR[0] - 40, handR[1] + 16], [handR[0] + 42, handR[1] + 16], [handR[0] + 42, handR[1] + 92], [handR[0] - 40, handR[1] + 92]], "#8a5f36", 5);
    p.stroke([[handR[0] - 14, handR[1] + 16], [handR[0] - 12, handR[1] - 2], [handR[0] + 14, handR[1] - 2], [handR[0] + 16, handR[1] + 16]], 6, "#5d4023");
    p.stroke([[handR[0] - 40, handR[1] + 40], [handR[0] + 42, handR[1] + 40]], 4, "#6e4a2a");
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  } else if (prop === "can") {
    // the famous can of water, carried everywhere after 1972
    p.poly([[handR[0] - 24, handR[1] - 6], [handR[0] + 26, handR[1] - 6], [handR[0] + 22, handR[1] + 52], [handR[0] - 20, handR[1] + 52]], "#7d94a6", 5);
    p.stroke([[handR[0] - 14, handR[1] - 6], [handR[0] - 8, handR[1] - 24], [handR[0] + 12, handR[1] - 24], [handR[0] + 17, handR[1] - 6]], 6, "#5d7484");
    p.poly([[handR[0] - 20, handR[1] + 8], [handR[0] + 23, handR[1] + 8], [handR[0] + 22, handR[1] + 20], [handR[0] - 19, handR[1] + 20]], "#a9c6d8", 0);
    p.ell(handR[0], handR[1], 16, 16, hand, 5);
  }
  // ---- head: the big round WHITE head ----
  const hy = headCY + (pose === "walk" ? Math.abs(Math.sin(phase * Math.PI * 2)) * -6 : 0);
  p.ell(cx, hy, headR, headR * 0.96, "#ffffff", 7);
  // a neat hair bun + side sweeps (Grete)
  if (o.bun) {
    p.ell(cx, hy - headR * 0.98, 34, 30, o.bun, 5);
    p.arc(cx, hy + 2, headR * 1.0, headR * 0.94, 185, 355, 26, o.bun);
    p.ell(cx - headR * 0.92, hy + 8, 14, 26, o.bun, 0);
    p.ell(cx + headR * 0.92, hy + 8, 14, 26, o.bun, 0);
  }
  // grey side tufts for old men
  if (o.tufts) {
    p.ell(cx - headR + 6, hy + 6, 17, 30, o.tufts, 0);
    p.ell(cx + headR - 6, hy + 6, 17, 30, o.tufts, 0);
  }
  // ---- bandaged head: two wrap bands over the crown + a cheek patch ----
  if (o.bandage) {
    p.arc(cx, hy + 4, headR * 0.99, headR * 0.93, 192, 348, 34, "#efe9db");
    p.arc(cx, hy + 4, headR * 0.99, headR * 0.93, 192, 348, 3.5, INK);
    p.arc(cx, hy - 16, headR * 0.94, headR * 0.86, 200, 340, 26, "#e7e0cd");
    p.poly([[cx - headR * 0.72, hy + headR * 0.18], [cx - headR * 0.34, hy + headR * 0.1], [cx - headR * 0.3, hy + headR * 0.52], [cx - headR * 0.68, hy + headR * 0.58]], "#efe9db", 4);
  }
  // ---- cap (army field cap with the iconic neck flap) ----
  if (o.cap) {
    p.poly([[cx - headR * 0.99, hy - headR * 0.28], [cx - headR * 0.86, hy - headR * 0.86], [cx - headR * 0.4, hy - headR * 1.08],
      [cx + headR * 0.4, hy - headR * 1.08], [cx + headR * 0.86, hy - headR * 0.86], [cx + headR * 0.99, hy - headR * 0.28],
      [cx + headR * 0.6, hy - headR * 0.42], [cx - headR * 0.6, hy - headR * 0.42]], o.cap, 6);
    p.ell(cx, hy - headR * 0.34, headR * 0.62, headR * 0.13, o.cap, 5); // brim
    p.poly([[cx - headR - 2, hy - headR * 0.2], [cx - headR + 20, hy - headR * 0.2], [cx - headR + 16, hy + headR * 0.42], [cx - headR + 2, hy + headR * 0.42]], o.cap, 4); // neck flap L
    p.poly([[cx + headR - 20, hy - headR * 0.2], [cx + headR + 2, hy - headR * 0.2], [cx + headR - 2, hy + headR * 0.42], [cx + headR - 16, hy + headR * 0.42]], o.cap, 4); // neck flap R
  }
  // ---- ranger campaign hat: flat wide brim + pinched crown ----
  if (o.hat) {
    p.poly([[cx - headR * 0.52, hy - headR * 0.98], [cx - headR * 0.34, hy - headR * 1.24], [cx + headR * 0.34, hy - headR * 1.24], [cx + headR * 0.52, hy - headR * 0.98], [cx + headR * 0.46, hy - headR * 0.82], [cx - headR * 0.46, hy - headR * 0.82]], o.hat, 6);
    p.ell(cx, hy - headR * 0.8, headR * 1.06, headR * 0.17, o.hat, 6); // the brim
    p.stroke([[cx - headR * 0.5, hy - headR * 0.94], [cx + headR * 0.5, hy - headR * 0.94]], 7, "#4a3b26"); // hat band
  }
  // ---- face ----
  const ex = cx - 42 + look * 11, ex2 = cx + 42 + look * 11, ey = hy - 8;
  const brow = (x: number, y: number, flip: number, kind: "flat" | "up" | "down") => {
    if (kind === "flat") p.stroke([[x - 17, y], [x + 17, y]], 6, INK);
    else if (kind === "up") p.arc(x, y + 8, 17, 12, 200, 340, 6);
    else p.stroke([[x - 17, y - 6 * flip], [x + 17, y + 6 * flip]], 6, INK);
  };
  const eyeDot = (x: number, r = 8.5) => { if (blink > 0.5) p.stroke([[x - 11, ey], [x + 11, ey]], 6, INK); else p.dot(x, ey, r, INK); };
  const eyeHappy = (x: number) => p.arc(x, ey + 7, 15, 12, 180, 360, 6.5);
  const mouthY = hy + 52;
  switch (expr) {
    case "shock":
      brow(ex, ey - 34, 1, "up"); brow(ex2, ey - 34, -1, "up");
      eyeDot(ex, 12); eyeDot(ex2, 12);
      p.ell(cx + look * 11, mouthY + 8, 17, 22, INK, 0); break;
    case "stern":
      brow(ex, ey - 28, 1, "down"); brow(ex2, ey - 28, -1, "down");
      eyeDot(ex); eyeDot(ex2);
      p.stroke([[cx - 18 + look * 11, mouthY], [cx + 18 + look * 11, mouthY]], 6.5, INK); break;
    case "grin":
      eyeDot(ex); eyeDot(ex2);
      p.poly([[cx - 26 + look * 11, mouthY - 6], [cx + 26 + look * 11, mouthY - 6], [cx + 16 + look * 11, mouthY + 20], [cx - 16 + look * 11, mouthY + 20]], INK, 0); break;
    case "laugh":
      eyeHappy(ex); eyeHappy(ex2);
      p.ell(cx + look * 11, mouthY + 4, 27, 24, INK, 0); break;
    case "nervous":
      brow(ex, ey - 32, 1, "up"); brow(ex2, ey - 32, -1, "up");
      eyeDot(ex); eyeDot(ex2);
      p.stroke([[cx - 20 + look * 11, mouthY], [cx - 7 + look * 11, mouthY - 7], [cx + 6 + look * 11, mouthY], [cx + 19 + look * 11, mouthY - 7]], 5.5, INK); break;
    case "relief":
      eyeHappy(ex); eyeHappy(ex2);
      p.arc(cx + look * 11, mouthY - 12, 22, 15, 15, 165, 6); break;
    case "relief_open":
      eyeHappy(ex); eyeHappy(ex2);
      p.ell(cx + look * 11, mouthY + 2, 21, 17, INK, 0); break;
    case "smile":
      eyeDot(ex); eyeDot(ex2);
      p.arc(cx + look * 11, mouthY - 12, 22, 15, 15, 165, 6); break;
    case "pained":
      p.stroke([[ex - 11, ey - 10], [ex + 11, ey + 10]], 6, INK); p.stroke([[ex - 11, ey + 10], [ex + 11, ey - 10]], 6, INK);
      p.stroke([[ex2 - 11, ey - 10], [ex2 + 11, ey + 10]], 6, INK); p.stroke([[ex2 - 11, ey + 10], [ex2 + 11, ey - 10]], 6, INK);
      p.arc(cx + look * 11, mouthY + 22, 19, 13, 195, 345, 6); break;
    case "sad":
      brow(ex, ey - 30, -1, "down"); brow(ex2, ey - 30, 1, "down");
      eyeDot(ex); eyeDot(ex2);
      p.arc(cx + look * 11, mouthY + 22, 19, 13, 195, 345, 6); break;
    default:
      eyeDot(ex); eyeDot(ex2);
      p.arc(cx + look * 11, mouthY - 10, 15, 10, 25, 155, 5.5);
  }
};
