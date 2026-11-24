// Ba Na Hills + the Golden Bridge (Cầu Vàng) as one three.js scene
// for the Fafnir-ID short: a 150 m golden pedestrian bridge curving
// over a sea of clouds at ~1,400 m, held by two giant hands that
// look like ancient weathered stone (they are steel + wire mesh +
// fibreglass, built 2018), flower beds along the gold rail, the
// cable-car station at the near end, terraced gardens at the far
// end. VISUAL CORE: bright mountain morning, gold ribbon over
// white cloud sea, green mountain slope behind, the stone hands
// cupping the deck. Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style. STANDAR GERAK: clouds
// drift, the cloud sea scrolls, trees sway, birds cross, the cable
// car glides, flowers tremble — nothing is a poster. NOTE: every
// surface is fully OPAQUE — no semi-transparent surface anywhere
// near text; the fact cards float in the air above the deck, never
// over the cloud sea.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, deckX, deckY, deckSlope, HAND_A_Z, HAND_B_Z, STATION, GARDEN } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
/** One painted cumulus cluster on the sky canvas: lavender-grey
 *  shaded belly first, mid tone above it, sunlit white crown
 *  offset up-left — never a flat white blob. */
const paintPuff = (g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, s: number) => {
  const lobes: [number, number, number][] = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    lobes.push([cx + (t - 0.5) * s * 1.7, cy + Math.sin(t * Math.PI) * -s * 0.22, s * (0.3 + r() * 0.22)]);
  }
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aab8d4"); // shaded belly
  layer(0, 0, "#d7e2f2");        // mid tone
  layer(-s * 0.14, -s * 0.08, "#ffffff"); // sunlit crown
};
const skyTexMountain = () => ctex("tgnSkyMountain", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#3f83d8"); grad.addColorStop(0.45, "#7ab5e8"); grad.addColorStop(0.75, "#c4e2f6"); grad.addColorStop(1, "#f6f8ec");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // fine speckle so the gradient never bands
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`;
    g.fillRect(r() * 2048, r() * 1024, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.5)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w);
  }
  const clusters: [number, number, number][] = [
    [300, 300, 260], [760, 220, 320], [1240, 330, 280], [1680, 240, 340], [1980, 360, 240],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,220,0.95)"); sn.addColorStop(1, "rgba(255,250,220,0)");
  g.fillStyle = sn; g.fillRect(160, -60, 520, 520);
});
const glowTex = () => ctex("tgnGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,214,0.9)"); gr.addColorStop(0.5, "rgba(255,240,200,0.28)"); gr.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** Sea of clouds: soft white billows on pale blue — tiled and
 *  scrolled in update() so the cloud sea is ALIVE. Opaque. */
const cloudSeaTex = () => ctex("tgnCloudSea", 512, 512, (g, r) => {
  g.fillStyle = "#eef4fb"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) {
    const cx = r() * 512, cy = r() * 512, rad = 26 + r() * 80;
    const gr = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    const c = r() < 0.5 ? "255,255,255" : "205,225,245";
    gr.addColorStop(0, `rgba(${c},0.85)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 5, 0, 7); g.fill();
  }
});
/** Mountain forest slope: layered greens, never a flat plane. */
const forestTex = () => ctex("tgnForest", 1024, 1024, (g, r) => {
  g.fillStyle = "#356b32"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) {
    const cx = r() * 1024, cy = r() * 1024, rad = 40 + r() * 150;
    const gr = g.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
    const c = r() < 0.5 ? "34,90,42" : "84,128,60";
    gr.addColorStop(0, `rgba(${c},0.25)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  const cols = ["#2a5a2e", "#467a3c", "#5a8a48", "#2e5a28"];
  for (let i = 0; i < 4200; i++) {
    const x = r() * 1024, y = r() * 1024;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.globalAlpha = 0.12 + r() * 0.22;
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI);
    g.fillRect(-2 - r() * 3, -1.5, 4 + r() * 5, 2 + r() * 2);
    g.restore();
  }
  g.globalAlpha = 1;
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#1e4a26"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() < 0.5 ? `rgba(12,44,20,${0.2 + r() * 0.3})` : `rgba(60,110,55,${0.15 + r() * 0.3})`;
    g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
  }
});
const barkTex = () => ctex("tgnBark", 256, 256, (g, r) => {
  g.fillStyle = "#4a3528"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = `rgba(16,10,6,${0.25 + r() * 0.35})`;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
});
/** Timber deck planks: warm brown boards with seams + grain. */
const timberTex = () => ctex("tgnTimber", 512, 512, (g, r) => {
  g.fillStyle = "#8a6a42"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#7d5f3a" : "#96744a";
    g.fillRect(0, i * 64, 512, 64);
    g.strokeStyle = "rgba(40,26,10,0.5)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke();
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(60,40,16,${0.06 + r() * 0.12})`;
    g.fillRect(r() * 512, r() * 512, 8 + r() * 30, 2);
  }
});
/** THE STONE HANDS: weathered grey stone with dark cracks and
 *  green moss — the "ancient" look that is actually 2018 paint
 *  over fibreglass. Cracks are drawn as branching dark polylines;
 *  moss as soft green radial blobs. */
const stoneTex = (key: string, seed = 1) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#8a8578"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(90,85,70,${0.05 + r() * 0.12})` : `rgba(200,195,180,${0.05 + r() * 0.12})`;
    g.fillRect(r() * 512, r() * 512, 2 + r() * 4, 2 + r() * 4);
  }
  // cracks: branching dark strokes
  for (let i = 0; i < 14; i++) {
    let x = r() * 512, y = r() * 512, a = r() * Math.PI * 2;
    g.strokeStyle = `rgba(52,48,40,${0.4 + r() * 0.3})`;
    g.lineWidth = 1.5 + r() * 2.5;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      a += (r() - 0.5) * 1.4;
      x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // moss: soft green blobs clustering in the cracks' shade
  for (let i = 0; i < 26; i++) {
    const cx = r() * 512, cy = r() * 512, rad = 12 + r() * 42;
    const gr = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    const c = r() < 0.5 ? "74,106,42" : "90,122,53";
    gr.addColorStop(0, `rgba(${c},0.55)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // pale lichen flecks
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(210,205,170,${0.1 + r() * 0.25})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 3, 0, 7); g.fill();
  }
});
const blobTex = () => ctex("tgnBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(28,40,20,0.4)"); gr.addColorStop(1, "rgba(28,40,20,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
  m.layers.set(NOINK); parent.add(m);
  return m;
};

// ---------------- builders ----------------
/** A broadleaf mountain tree: trunk + 3 layered rounded canopies
 *  in different greens — the layered, textured look the 23 Nov
 *  standard demands. */
const makeTree = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 29);
  const trunkM = twoTone(new THREE.MeshLambertMaterial({ map: rep(barkTex(), 1, 2), color: "#7a5a40" }), 0.2);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, h * 0.55, 8), trunkM);
  trunk.position.y = h * 0.27; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => twoTone(new THREE.MeshLambertMaterial({ color: col, map: rep(foliageTex(key), 1, 1) }), 0.3);
  const mats = [folM("#2e6b34", "tgnTreeDeep"), folM("#3d7a40", "tgnTreeMid"), folM("#5a9a4e", "tgnTreeLite")];
  for (let li = 0; li < 3; li++) {
    const y = h * (0.5 + li * 0.16), rad = h * (0.24 - li * 0.04);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + tr() * 0.8;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad * (0.5 + tr() * 0.25), 10, 8), mats[(li + i) % 3]);
      b.position.set(Math.cos(a) * rad * 0.45, y + (tr() - 0.5) * 0.5, Math.sin(a) * rad * 0.45);
      b.scale.y = 0.6; b.castShadow = true; g.add(b);
    }
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.55, 10, 8), mats[li % 3]);
    crown.position.y = y + rad * 0.3; crown.scale.y = 0.6; crown.castShadow = true; g.add(crown);
  }
  return g;
};
/** A distant mountain peak: layered cone, green lower slopes,
 *  misty blue upper rock, pale cap. */
const makeMountain = (seed = 1, tint = "#5a6a72") => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.ConeGeometry(34, 34, 24),
    twoTone(new THREE.MeshLambertMaterial({ color: tint }), 0.2));
  base.position.y = 17; g.add(base);
  const green = new THREE.Mesh(new THREE.ConeGeometry(34.5, 18, 24),
    twoTone(new THREE.MeshLambertMaterial({ color: "#3a5a3a" }), 0.25));
  green.position.y = 9; g.add(green);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(12, 10, 24), lam2({ color: "#e8eef7" }));
  cap.position.y = 29; g.add(cap);
  void seed;
  return g;
};
/** A giant stone hand cupping the deck: cupped palm + wrist sinking
 *  into the clouds + 4 fingers curling up around the deck edge +
 *  a thumb. The fingers lean toward the deck (-x local) and their
 *  tips end just above deck level. Stone texture with cracks+moss;
 *  nails are pale flattened caps. */
const makeHand = (seed = 1) => {
  const g = new THREE.Group();
  const stoneM = twoTone(new THREE.MeshLambertMaterial({ map: rep(stoneTex(`tgnStone${seed}`, seed), 1, 1), color: "#b0aa9c" }), 0.25);
  const mossM = twoTone(new THREE.MeshLambertMaterial({ color: "#5a7030" }), 0.3);
  const nailM = lam2({ color: "#e8dcc8" });
  // wrist: tapered column sinking into the cloud sea (wide enough
  // to read as a massive stone column, not a table leg)
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 5.5, 12), stoneM);
  wrist.position.y = -2.6; wrist.castShadow = true; g.add(wrist);
  // palm: a cupped sphere (less flat than before — the 0.55 squash
  // read as a mushroom cap / tabletop from most angles)
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 10), stoneM);
  palm.scale.set(1.0, 0.75, 1.5); palm.position.y = 0.35; palm.castShadow = true; palm.receiveShadow = true; g.add(palm);
  // moss patches on the palm (olive, small — the old neon blobs read as paint)
  const tr = rng(seed * 733 + 11);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.24 + tr() * 0.18, 8, 6), mossM);
    m.position.set((tr() - 0.5) * 2.6, 0.85 + tr() * 0.15, (tr() - 0.5) * 4.4);
    m.scale.y = 0.35; g.add(m);
  }
  // fingers: 4 along the palm's deck-side edge, curling toward -x
  const finger = (zOff: number, len: number, rad: number, curl: number) => {
    const fg = new THREE.Group();
    fg.position.set(-1.55, 0.55, zOff);
    const segLens = [len * 0.42, len * 0.34, len * 0.24];
    const segRads = [rad, rad * 0.82, rad * 0.62];
    let parent: THREE.Object3D = fg;
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const sg = new THREE.Group();
      sg.position.y = y; sg.rotation.z = curl * (0.45 + i * 0.55);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(segRads[i] * 0.88, segRads[i], segLens[i], 10), stoneM);
      seg.position.y = segLens[i] / 2; seg.castShadow = true; sg.add(seg);
      // a moss fleck on the middle segment
      if (i === 1) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mossM);
        m.position.set(0.1, segLens[i] * 0.6, 0.12); m.scale.y = 0.5; sg.add(m);
      }
      // fingernail on the fingertip
      if (i === 2) {
        const nail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.42), nailM);
        nail.position.set(-0.12, segLens[i] * 0.92, 0); nail.rotation.z = 0.3; sg.add(nail);
      }
      parent.add(sg);
      parent = sg; y = segLens[i];
    }
    return fg;
  };
  const fingerZ = [-1.35, -0.45, 0.45, 1.35];
  const fingerLen = [2.9, 3.3, 3.3, 2.8];
  for (let i = 0; i < 4; i++) g.add(finger(fingerZ[i], fingerLen[i], 0.46, 0.55));
  // thumb: thicker, shorter, on the near-z side, angled out
  const thumb = new THREE.Group();
  thumb.position.set(-0.9, 0.5, 2.0); thumb.rotation.y = -0.5; thumb.rotation.z = 0.5;
  const th1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 1.2, 10), stoneM);
  th1.position.y = 0.6; th1.castShadow = true; thumb.add(th1);
  const th2 = new THREE.Group(); th2.position.y = 1.2; th2.rotation.z = 0.7;
  const thSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 10), stoneM);
  thSeg.position.y = 0.5; thSeg.castShadow = true; th2.add(thSeg);
  const thNail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.38), nailM);
  thNail.position.set(-0.1, 0.95, 0); thNail.rotation.z = 0.3; th2.add(thNail);
  thumb.add(th2); g.add(thumb);
  return g;
};
/** THE GOLDEN BRIDGE: 28 segments following deckX()/deckY(), each
 *  a timber deck slab with golden railings and flower beds. Steel
 *  pillars drop from the deck into the cloud sea. */
const makeBridge = (parent: THREE.Object3D) => {
  const deckM = twoTone(new THREE.MeshLambertMaterial({ map: rep(timberTex(), 2, 1), color: "#b08a5a" }), 0.25);
  const goldM = twoTone(new THREE.MeshLambertMaterial({ color: "#e8b820" }), 0.4);
  const goldDarkM = twoTone(new THREE.MeshLambertMaterial({ color: "#a87808" }), 0.35);
  const bedM = lam2({ color: "#3a2e22" });
  const flowerCols = ["#7b5ac9", "#e8c832", "#d96a8a", "#f2f0e8", "#8a5ac9"];
  const N = 28, z0 = 42, z1 = -42, len = (z0 - z1) / N;
  for (let i = 0; i < N; i++) {
    const zc = z0 - (i + 0.5) * len;
    const y = deckY(zc);
    const dX = (deckX(zc + 0.5) - deckX(zc - 0.5)) / 1.0;
    const dY = (deckY(zc + 0.5) - deckY(zc - 0.5)) / 1.0;
    const seg = new THREE.Group();
    seg.position.set(deckX(zc), y - 0.2, zc);
    seg.rotation.order = "YXZ";
    seg.rotation.y = Math.atan(dX);
    seg.rotation.x = -Math.atan(dY);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, len + 0.12), deckM);
    slab.castShadow = true; slab.receiveShadow = true; seg.add(slab);
    // golden railings: posts + top rail on both sides
    for (const sx of [-1.18, 1.18]) {
      for (let k = 0; k < 4; k++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), goldDarkM);
        post.position.set(sx, 0.55, -len / 2 + 0.2 + k * (len - 0.4) / 3);
        post.castShadow = true; seg.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, len + 0.12), goldM);
      rail.position.set(sx, 1.0, 0); rail.castShadow = true; seg.add(rail);
      const railLow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, len + 0.12), goldM);
      railLow.position.set(sx, 0.55, 0); seg.add(railLow);
      // flower bed strip inside the rail
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, len + 0.1), bedM);
      bed.position.set(sx * 0.82, 0.24, 0); seg.add(bed);
      for (let k = 0; k < 6; k++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5),
          lam2({ color: flowerCols[(i * 6 + k) % flowerCols.length] }));
        fl.position.set(sx * 0.82, 0.34, -len / 2 + 0.3 + k * (len - 0.6) / 5);
        fl.scale.y = 0.6;
        seg.add(fl);
      }
    }
    parent.add(seg);
  }
  // steel pillars: the REAL support — dark I-beams from the deck
  // down into the cloud sea, at both hands and mid-spans
  const pierM = twoTone(new THREE.MeshLambertMaterial({ color: "#6a7076" }), 0.15);
  for (const pz of [30, 14, 0, -14, -26]) {
    const top = deckY(pz) - 0.4;
    const h = top - 2.5; // disappears into the cloud sea
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 1.1), pierM);
    pier.position.set(deckX(pz), h / 2 + 2.5, pz);
    pier.castShadow = true; pier.receiveShadow = true;
    parent.add(pier);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.5), pierM);
    cross.position.set(deckX(pz), top - 0.4, pz);
    parent.add(cross);
  }
};
/** The cable-car station at the near end: small building with a
 *  sloped roof + two cables rising into the sky + a cabin. */
const makeStation = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 3.8), lam2({ color: "#f2efe8" }));
  body.position.y = 1.3; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.4, 4), lam2({ color: "#8a3a2a" }));
  roof.position.y = 3.3; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85); roof.castShadow = true; g.add(roof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1),
    new THREE.MeshLambertMaterial({ color: "#2a4a5a" }));
  win.position.set(0, 1.4, 1.92); g.add(win);
  // cable mast + two cables climbing into the sky
  const mastM = lam2({ color: "#3a3f46" });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.5, 8), mastM);
  mast.position.set(-1.2, 4.6, -0.5); g.add(mast);
  return g;
};
/** A cable-car cabin: yellow box with dark windows, hanging from
 *  its cable. Moves along the cable in update(). */
const makeCabin = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3),
    twoTone(new THREE.MeshLambertMaterial({ color: "#e8c832" }), 0.3));
  body.castShadow = true; g.add(body);
  const winM = new THREE.MeshLambertMaterial({ color: "#22303a" });
  for (const [wx, wz, ry] of [[0, -0.66, 0], [0, 0.66, Math.PI], [-0.66, 0, -Math.PI / 2], [0.66, 0, Math.PI / 2]] as const) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), winM);
    w.position.set(wx, 0.1, wz); w.rotation.y = ry; g.add(w);
  }
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), lam2({ color: "#3a3f46" }));
  arm.position.y = 0.9; g.add(arm);
  return g;
};
/** Terraced flower gardens at the far end: stepped green terraces
 *  with flower patches + a small pavilion. */
const makeGardens = (parent: THREE.Object3D) => {
  const terraceM = lam2({ map: rep(forestTex(), 2, 1) });
  const flowerCols = ["#d96a8a", "#e8c832", "#7b5ac9", "#e86a2c", "#f2f0e8"];
  for (let i = 0; i < 3; i++) {
    const tz = -48 - i * 6, ty = 9.5 + i * 0.5;
    const t = new THREE.Mesh(new THREE.BoxGeometry(26 - i * 3, 1.0, 5.5), terraceM);
    t.position.set(-2, ty, tz); t.castShadow = true; t.receiveShadow = true; parent.add(t);
    for (let k = 0; k < 26; k++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5),
        lam2({ color: flowerCols[(i * 26 + k) % flowerCols.length] }));
      fl.position.set(-2 + (k % 13 - 6) * 1.7, ty + 0.6, tz + (Math.floor(k / 13) - 0.5) * 3.2);
      parent.add(fl);
    }
  }
  // pavilion: 4 posts + pyramid roof
  const pav = new THREE.Group();
  const postM = lam2({ color: "#6a4a2a" });
  for (const [px, pz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]] as const) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), postM);
    p.position.set(px, 1.1, pz); pav.add(p);
  }
  const proof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 4), lam2({ color: "#8a3a2a" }));
  proof.position.y = 2.85; proof.rotation.y = Math.PI / 4; proof.castShadow = true; pav.add(proof);
  pav.position.set(-8, 9.45, -64); parent.add(pav);
};
/** Scaffolding around a hand (shot 6): pole frame + planks +
 *  a fibreglass panel leaning on it + a paint bucket. */
const makeScaffold = () => {
  const g = new THREE.Group();
  const poleM = lam2({ color: "#8a7a3a" });
  const plankM = lam2({ color: "#a8875a" });
  // 4 corner poles, 3 levels
  for (const [px, pz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]] as const) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.2, 6), poleM);
    p.position.set(px, 2.6, pz); g.add(p);
  }
  for (const ly of [1.2, 2.8, 4.4]) {
    for (const [w, d, x, z] of [[4.4, 0.08, 0, -2.2], [4.4, 0.08, 0, 2.2], [0.08, 4.4, -2.2, 0], [0.08, 4.4, 2.2, 0]] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), poleM);
      bar.position.set(x, ly, z); g.add(bar);
    }
  }
  for (const ly of [1.2, 2.8]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.1), plankM);
    plank.position.set(0, ly, 0); plank.castShadow = true; g.add(plank);
  }
  // a fibreglass panel (golden, unpainted) leaning on the frame
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.08),
    twoTone(new THREE.MeshLambertMaterial({ color: "#e8d48a" }), 0.35));
  panel.position.set(1.6, 1.4, -1.4); panel.rotation.z = -0.18; panel.rotation.y = 0.3; panel.castShadow = true; g.add(panel);
  // paint bucket
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 10), lam2({ color: "#f2f0e8" }));
  bucket.position.set(-1.4, 1.4, 0.4); g.add(bucket);
  const paint = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 10), lam2({ color: "#8a8578" }));
  paint.position.set(-1.4, 1.53, 0.4); g.add(paint);
  return g;
};
/** Construction crane (shot 8): mast + jib + hanging cable +
 *  a golden deck segment on the hook. */
const makeCrane = () => {
  const g = new THREE.Group();
  const steelM = lam2({ color: "#c8a018" });
  const darkM = lam2({ color: "#3a3f46" });
  // temporary work platform jutting from the deck edge, on legs
  // that disappear into the cloud sea — the crane stands on it
  const platform = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 6), lam2({ color: "#8a8d90" }));
  platform.position.set(0, -0.25, 0); platform.castShadow = true; platform.receiveShadow = true; g.add(platform);
  for (const [lx, lz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.5, 0.45), darkM);
    leg.position.set(lx, -3.0, lz); g.add(leg);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.2), darkM);
  base.position.y = 0.4; base.castShadow = true; g.add(base);
  // lattice mast
  for (const [mx, mz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] as const) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 11, 0.14), steelM);
    p.position.set(mx, 6.3, mz); p.castShadow = true; g.add(p);
  }
  for (let ly = 1.6; ly < 11; ly += 1.6) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 0.09), steelM);
    bar.position.set(0, ly, -0.4); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.95), steelM);
    bar2.position.set(-0.4, ly, 0); g.add(bar2);
  }
  // jib reaching over the deck
  const jib = new THREE.Mesh(new THREE.BoxGeometry(9, 0.35, 0.35), steelM);
  jib.position.set(-3.2, 11.4, 0); jib.castShadow = true; g.add(jib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.2), darkM);
  counter.position.set(2.2, 11.2, 0); g.add(counter);
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c4d8ec", 25, 190);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK: what should move, moves) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private cloudSeaTexInst: THREE.Texture;
  private lowClouds: THREE.Sprite[] = [];
  private lowCloudBase: { x: number; sp: number }[] = [];
  private birds: { g: THREE.Group; x0: number; sp: number; y: number; z: number; ph: number }[] = [];
  private cabin: THREE.Group;
  private craneHook: THREE.Group;
  private craneCable: THREE.Mesh;
  private scaffold: THREE.Group;
  private crane: THREE.Group;
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(3107);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + sun glow + high clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexMountain(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false }));
    glow.position.set(-160, 140, -330); glow.scale.set(140, 140, 1); glow.layers.set(NOINK); R.add(glow);
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(11 + i * 7), transparent: true, depthWrite: false, fog: false }));
      const x = -220 + i * 72 + r() * 30, y = 75 + r() * 45, z = -320 + r() * 70;
      c.position.set(x, y, z);
      const sc = 60 + r() * 55; c.scale.set(sc, sc * 0.42, 1);
      c.layers.set(NOINK);
      this.clouds.push(c); this.cloudBase.push({ x, sp: 0.5 + r() * 0.9 });
      R.add(c);
    }
    // ---- SEA OF CLOUDS: opaque, scrolling (texture scrolls in update) ----
    this.cloudSeaTexInst = rep(cloudSeaTex(), 14, 14);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
      lam2({ map: this.cloudSeaTexInst }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(10, 4.5, -30);
    sea.receiveShadow = true; R.add(sea);
    // low drifting cloud puffs just under the deck
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(31 + i * 5), transparent: true, depthWrite: false, fog: false }));
      const x = -30 + i * 14 + r() * 10, y = 5.5 + r() * 2.5, z = -40 + r() * 70;
      c.position.set(x, y, z);
      const sc = 26 + r() * 22; c.scale.set(sc, sc * 0.4, 1);
      c.layers.set(NOINK);
      this.lowClouds.push(c); this.lowCloudBase.push({ x, sp: 0.4 + r() * 0.7 });
      R.add(c);
    }
    // ---- HILLSIDE TERRACE: a forested mountainside floor behind
    //  the bridge (the old sloped "wall" plane was mis-oriented —
    //  a vertical sheet at x=-52 that read as a flat green
    //  triangle, with the trees floating in front of it). The
    //  terrace sits just below deck level so the deck reads as a
    //  ledge on a real hillside; trees plant ON it.
    const terrace = new THREE.Mesh(new THREE.PlaneGeometry(72, 160), lam2({ map: rep(forestTex(), 6, 12) }));
    terrace.rotation.x = -Math.PI / 2;
    terrace.position.set(-34, 9.4, 0);
    terrace.receiveShadow = true; R.add(terrace);
    // ---- distant peaks through the haze ----
    const peak1 = makeMountain(1, "#6a7a82"); peak1.position.set(-100, 0, -220); R.add(peak1);
    const peak2 = makeMountain(2, "#7a8a92"); peak2.scale.setScalar(0.7); peak2.position.set(60, 0, -230); R.add(peak2);
    const peak3 = makeMountain(3, "#5a6a72"); peak3.scale.setScalar(0.4); peak3.position.set(130, 0, -190); R.add(peak3);
    // ---- THE GOLDEN BRIDGE ----
    makeBridge(R);
    // ---- THE TWO GIANT HANDS ----
    const handA = makeHand(1);
    handA.position.set(deckX(HAND_A_Z) + 3.1, deckY(HAND_A_Z) - 1.2, HAND_A_Z);
    handA.rotation.y = Math.atan((deckX(HAND_A_Z + 0.5) - deckX(HAND_A_Z - 0.5)) / 1.0);
    R.add(handA);
    const handB = makeHand(2);
    handB.position.set(deckX(HAND_B_Z) + 3.1, deckY(HAND_B_Z) - 1.2, HAND_B_Z);
    handB.rotation.y = Math.atan((deckX(HAND_B_Z + 0.5) - deckX(HAND_B_Z - 0.5)) / 1.0);
    R.add(handB);
    // ---- trees ON the terrace (kept clear of the deck axis and
    //  the hands so nothing reads as a second subject) ----
    const treeSpots: [number, number, number, number][] = [
      [-16, 30, 7, 3], [-20, 10, 8, 5], [-24, -10, 9, 7], [-18, -30, 8, 9],
      [-28, -45, 10, 11], [-14, -55, 7.5, 13], [-34, 20, 9, 15], [-26, 55, 8, 17],
      [-40, -20, 10, 19], [-12, 62, 7, 21], [-44, 45, 9.5, 23], [-30, -62, 8.5, 25],
    ];
    for (const [mx, mz, mh, ms] of treeSpots) {
      const t = makeTree(mh * 1.3, ms);
      t.position.set(mx, 9.4, mz);
      t.rotation.y = r() * Math.PI * 2;
      this.trees.push({ g: t, ph: r() * 6 });
      R.add(t);
    }
    // ---- the cable-car station at the near end ----
    const station = makeStation();
    station.position.set(STATION[0], deckY(42), STATION[2]);
    station.rotation.y = -0.2;
    R.add(station);
    // stone platform under the station so it sits on a mountaintop,
    // not floating over the clouds
    const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 8), lam2({ color: "#8a8578" }));
    platform.position.set(STATION[0], deckY(42) - 0.5, STATION[2]);
    platform.castShadow = true; platform.receiveShadow = true; R.add(platform);
    blob(R, STATION[0], deckY(42) + 0.02, STATION[2], 7, 7, 0.35);
    // cables rising from the station mast into the sky: from the
    // mast top (4.8, 17.35) up-left to (-13, 43) — length 31.2,
    // tilted 0.607 rad from vertical
    const cableM = lam2({ color: "#2a2f36" });
    for (const dz of [-0.3, 0.3]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 31.2, 6), cableM);
      cable.position.set(-4.1, 30.2, STATION[2] - 0.5 + dz);
      cable.rotation.z = 0.607;
      R.add(cable);
    }
    // ---- the cable car (glides along its cable in update) ----
    this.cabin = makeCabin();
    R.add(this.cabin);
    // ---- terraced gardens at the far end ----
    makeGardens(R);
    // ---- scaffolding around Hand B (shot 6 only) ----
    this.scaffold = makeScaffold();
    this.scaffold.position.set(deckX(HAND_B_Z) + 3.1, deckY(HAND_B_Z) - 0.2, HAND_B_Z);
    R.add(this.scaffold);
    // ---- crane (shot 8 only) + its hanging deck segment ----
    this.crane = makeCrane();
    this.crane.position.set(deckX(2) + 3, 9.6, -2);
    R.add(this.crane);
    this.craneCable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7, 6), lam2({ color: "#2a2f36" }));
    R.add(this.craneCable);
    this.craneHook = new THREE.Group();
    const segM = twoTone(new THREE.MeshLambertMaterial({ map: rep(timberTex(), 1, 1), color: "#b08a5a" }), 0.25);
    const segSlab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 3), segM);
    segSlab.castShadow = true; this.craneHook.add(segSlab);
    const segRailM = twoTone(new THREE.MeshLambertMaterial({ color: "#e8b820" }), 0.4);
    for (const sx of [-1.18, 1.18]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 3), segRailM);
      rail.position.set(sx, 0.5, 0); this.craneHook.add(rail);
    }
    R.add(this.craneHook);
    // ---- birds crossing the sky ----
    const birdM = new THREE.MeshBasicMaterial({ color: "#2a2a2a", side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), birdM);
        wing.position.x = s * 0.24; wing.rotation.z = s * 0.5;
        b.add(wing);
      }
      const y = 24 + i * 4, z = -60 - i * 18;
      b.position.set(-60 + i * 30, y, z);
      this.birds.push({ g: b, x0: -60 + i * 30, sp: 1.5 + i * 0.4, y, z, ph: i * 2.1 });
      R.add(b);
    }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private shotSun(id: number, s: ShotDef, Lp: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(Lp.az), el = THREE.MathUtils.degToRad(Lp.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    v.y = Math.max(v.y, 0.34);
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tt = s.tau(t), Lp = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = new THREE.Vector3(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, Lp);
    this.hemi.color.set(Lp.sky); this.hemi.groundColor.set(Lp.ground); this.hemi.intensity = Lp.hemiI;
    this.sun.color.set(Lp.sunCol); this.sun.intensity = Lp.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = Lp.bias; this.sun.shadow.normalBias = Lp.normalBias * (Rr / 12);
    this.rim.position.set(focus.x - 55, focus.y + 34, focus.z - 75);
    this.rim.target.position.copy(focus);
    this.rim.intensity = 0.35;
    TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
    TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
    CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    untone(Lp.fog, this.fog.color);
    this.fog.near = Lp.fogNear * 1.6; this.fog.far = Lp.fogFar * 1.6;
    scene.fog = this.fog; scene.background = null;
    this.skyDay.visible = true;
    for (const c2 of this.clouds) c2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // high clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // low cloud puffs drift under the deck
    this.lowClouds.forEach((c2, i) => { const b = this.lowCloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // trees sway in the mountain breeze, pivoting at the trunk base
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    // the cloud sea ripples: scroll the tiled texture
    this.cloudSeaTexInst.offset.set(tt * 0.006, tt * 0.011);
    // birds cross the sky, wings bobbing
    for (const b of this.birds) {
      const x = b.x0 + tt * b.sp * 6;
      b.g.position.set(((x + 90) % 180) - 90, b.y + Math.sin(tt * 1.4 + b.ph) * 0.8, b.z);
      b.g.rotation.z = Math.sin(tt * 3 + b.ph) * 0.25;
    }
    // ---- the cable car: glides along its cable (mast top (4.8,
    // 17.35) -> sky (-13, 43)) in the wide + viral shots ----
    const U = (f - s.a) / Math.max(1, s.b - s.a);
    if (id === 2 || id === 9) {
      this.cabin.visible = true;
      const u = id === 2 ? 0.1 + U * 0.5 : 0.35 + U * 0.3;
      this.cabin.position.set(4.8 - u * 17.8, 17.35 + u * 25.65 - 0.9, STATION[2] - 0.2);
      this.cabin.rotation.z = Math.sin(tt * 1.1) * 0.015;
    } else {
      this.cabin.visible = false;
    }
    // ---- scaffolding around Hand B: shot 6 (the twist) only ----
    this.scaffold.visible = id === 6;
    // ---- crane + hanging deck segment: shot 8 (the build) only ----
    const craneOn = id === 8;
    this.crane.visible = craneOn;
    this.craneCable.visible = craneOn;
    this.craneHook.visible = craneOn;
    if (craneOn) {
      // the cable hangs from the jib at the deck centre (x = deckX(-2)),
      // 7 m long from the jib (y 21) — the segment dangles ~3 m above
      // the deck so it clears the gold rail and reads as a lifted piece
      const hx = deckX(-2) + Math.sin(tt * 0.8) * 0.25;
      this.craneHook.position.set(hx, 21 - 7 - 0.35 + Math.sin(tt * 0.6) * 0.12, -2);
      this.craneHook.rotation.z = Math.sin(tt * 0.8) * 0.03;
      this.craneHook.rotation.y = Math.sin(tt * 0.5) * 0.05;
      this.craneCable.position.set(hx, 21 - 3.5, -2);
    }
    // ---------------- cast + effects ----------------
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const dir = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(-1);
    const st2 = stage(id, t, { pos: cam.position, right, dir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st2.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st2.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
