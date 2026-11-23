// Emu War 1932, Australia Barat as one three.js scene for the
// Fafnir-ID short: a blazing outback wheat field — golden wheat
// sea, red dirt, gum trees, a weatherboard farmhouse with a
// spinning windmill — overrun by a flood of tall brown emus.
// Three far-east sets: the gun-truck's dirt track (x=320) and
// the long Emu Fence with the tally of spent shells (x=420).
// The emus are low-poly 3D rigs (body, neck, two swinging legs)
// so they can run, zig-zag and tower over the soldiers.
// VISUAL CORE: hot bright morning above, golden wheat below;
// textured everything (anti-banding: speckled sky, red dirt,
// wheat rows). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style. STANDAR GERAK:
// clouds drift, gum trees sway, wheat shivers, emus run, the
// windmill spins, the truck bounces, dust hangs in the air.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, clamp01, smooth,
  HERO_SPOT, EMU_GIANT, FARMHOUSE, FENCE_Z, DAM_X, TRUCK_X, FENCE_X,
  floodAt, scatterAt, chaseAt,
} from "./story";

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
    lobes.push([cx + (t - 0.5) * s * 1.7, cy - Math.sin(t * Math.PI) * s * 0.34 + (r() - 0.5) * s * 0.14, s * (0.34 + 0.30 * Math.sin(t * Math.PI))]);
  }
  lobes.push([cx + (r() - 0.5) * s * 0.4, cy - s * 0.42, s * 0.30]);
  const layer = (dy: number, dx: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (const [x, y, rad] of lobes) { g.moveTo(x + dx + rad, y + dy); g.arc(x + dx, y + dy, rad, 0, 7); }
    g.fill();
  };
  layer(s * 0.16, 0, "#aebadd");            // shaded underside
  layer(s * 0.05, -s * 0.02, "#d7e2f5");    // mid tone
  layer(-s * 0.10, -s * 0.05, "#ffffff");   // sunlit crown
};
/** Outback sky: deep blue up top, pale gold at the horizon —
 *  hot, bright, never flat. */
const skyTexDay = () => ctex("emuSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1a55c0"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#7fb2ee");
  grad.addColorStop(0.85, "#d8e4f2"); grad.addColorStop(1, "#f8e6c2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.20)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(100, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(420, 200, 30, 0, 7); g.fill();
});
/** soft radial glow sprite (sun halo, dust, heat haze) */
const glowTex = () => ctex("emuGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("emuBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** shaggy emu feather texture: brown base, dark streaks */
const featherTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#7a5636"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = r() * 256, y = r() * 256, l = 8 + r() * 26;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.18 + r() * 0.25})` : `rgba(168,132,92,${0.14 + r() * 0.2})`;
    g.lineWidth = 1.4 + r() * 2.0;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "40,26,12" : "190,150,105"},${0.08 + r() * 0.14})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** red outback dirt: rust base, stones, cracked patches */
const dirtTex = () => ctex("emuDirt", 512, 512, (g, r) => {
  g.fillStyle = "#b56a42"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "122,62,34" : "216,150,100"},${0.10 + r() * 0.16})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 30, 7 + r() * 18, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "70,38,18" : "240,190,140"},${0.10 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.strokeStyle = "rgba(90,50,26,0.35)"; g.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    let x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
});
/** golden wheat stubble texture for the field floor between rows */
const stubbleTex = () => ctex("emuStubble", 512, 512, (g, r) => {
  g.fillStyle = "#c9962f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) {
    g.strokeStyle = r() > 0.4 ? `rgba(120,84,20,${0.14 + r() * 0.2})` : `rgba(240,205,110,${0.14 + r() * 0.2})`;
    g.lineWidth = 1.6 + r() * 2;
    const x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 6 + r() * 14); g.stroke();
  }
});
/** gum bark: pale, peeling, vertical fissures */
const gumBarkTex = () => ctex("emuGumBark", 256, 256, (g, r) => {
  g.fillStyle = "#cbb59a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(120,100,80,${0.16 + r() * 0.22})` : `rgba(240,228,205,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
/** gum leaf canopy: dusty grey-green flecks */
const gumLeafTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#9aaa8a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(70,80,55,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(220,228,200,${0.12 + r() * 0.22})` : `rgba(52,64,40,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
const blobTex = () => ctex("emuBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** A weatherboard farmhouse: cream boards, rust-red corrugated
 *  roof, veranda with posts, water tank, chimney. Front +Z. */
const makeFarmhouse = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(planks(), 2, 1), color: "#e8dcc4" });
  const roofM = lam2({ color: "#8f4a3a" });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.1, 5.5), wallM);
  walls.position.y = 1.55; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-4.2, 0); shape.lineTo(4.2, 0); shape.lineTo(0, 2.3); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 6.2, bevelEnabled: false });
  roofGeo.translate(0, 0, -3.1);
  const roof = new THREE.Mesh(roofGeo, roofM);
  roof.position.y = 3.05; roof.castShadow = true; g.add(roof);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.3, 8), lam2({ color: "#6e3a2c" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 5.32, 0); g.add(ridge);
  // veranda: posts + flat tin roof along the front
  const postM = lam2({ color: "#6a4a2c" });
  for (const px of [-3.4, -1.7, 0, 1.7, 3.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), postM);
    post.position.set(px, 1.15, 3.4); g.add(post);
  }
  const vRoof = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.1, 1.6), lam2({ color: "#7a5a48" }));
  vRoof.position.set(0, 2.42, 3.3); vRoof.rotation.x = 0.1; g.add(vRoof);
  // windows with glints + door
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#3d5a78" });
  for (const wx of [-2.4, 2.4]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.4, 0.1), frameM);
    fr.position.set(wx, 1.7, 2.78); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.12), glassM);
    gl.position.set(wx, 1.7, 2.79); g.add(gl);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.1), lam2({ color: "#5d3a22" }));
  door.position.set(0, 1.0, 2.78); g.add(door);
  // chimney + water tank
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 0.55), lam2({ color: "#8a4a3a" }));
  chim.position.set(2.6, 4.6, -1); chim.castShadow = true; g.add(chim);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.9, 14), lam2({ color: "#9aa4a8" }));
  tank.position.set(5.2, 0.95, 1.5); tank.castShadow = true; g.add(tank);
  const tankTop = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.5, 14), lam2({ color: "#7a8488" }));
  tankTop.position.set(5.2, 2.15, 1.5); g.add(tankTop);
  return g;
};

/** A gum tree: pale peeling trunk, sparse grey-green canopy in
 *  layered blobs — never a lollipop. */
const makeGum = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(gumBarkTex(), 1, 2), color: "#d8c8a8" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h * 0.55, 8), trunkM);
  trunk.position.y = h * 0.27; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(gumLeafTex(key), 1, 1) });
  const mats = [
    folM("#7a8a68", "emuGumDeep"),
    folM("#9aaa8a", "emuGumMid"),
    folM("#b8c8aa", "emuGumLite"),
  ];
  const cy = h * 0.75, cr = h * 0.34;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.72 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h * 0.32, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.55, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.35 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.34 + tr() * cr * 0.14, Math.sin(a) * d, cr * (0.42 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 0.9, 1);
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.45 + tr() * 0.45);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.4, Math.sin(a) * d, cr * (0.44 + tr() * 0.22), 1);
  }
  blobAt(0, cy + cr * 0.45, 0, cr * 0.36, 2);
  return g;
};

/** A windmill: four-legged tower + a fan that spins in update(). */
const makeWindmill = (h: number) => {
  const g = new THREE.Group();
  const legM = lam2({ color: "#7a7a80" });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), legM);
    leg.position.set(sx * 0.8, h / 2, sz * 0.8);
    leg.rotation.z = -sx * 0.1; leg.rotation.x = sz * 0.1;
    g.add(leg);
  }
  const fan = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8), legM);
  hub.rotation.x = Math.PI / 2; fan.add(hub);
  const bladeM = lam2({ color: "#c8c8d0", side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.5), bladeM);
    blade.position.set(Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.12);
    blade.rotation.z = a + 0.5;
    fan.add(blade);
  }
  fan.position.set(0, h + 0.4, 0.35);
  g.add(fan);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), bladeM);
  tail.position.set(0, h + 0.4, -0.9); tail.rotation.y = Math.PI / 2;
  g.add(tail);
  return { g, fan };
};

/** A low-poly EMU: shaggy brown body, long neck, small head with
 *  beak, two long legs on swing pivots, three-toed feet. Legs +
 *  neck are rigs that update() swings while the bird runs. */
export type EmuRig = {
  g: THREE.Group; legL: THREE.Group; legR: THREE.Group; neck: THREE.Group;
  base: V3; phase: number; scale: number; home: V3;
};
const makeEmu = (scale = 1, seed = 1): EmuRig => {
  const g = new THREE.Group();
  const tr = rng(seed * 911 + 13);
  const featherM = lam2({ map: rep(featherTex("emuFeather"), 1, 1), color: "#8a6a42" });
  const darkM = lam2({ color: "#4a3423" });
  // body: a plump flattened egg, tilted slightly forward
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), featherM);
  body.position.set(0, 1.15, 0); body.scale.set(0.85, 0.95, 1.35); body.rotation.x = 0.12;
  body.castShadow = true; g.add(body);
  // shaggy tail tuft at the rear
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 7), darkM);
  tail.position.set(0, 1.35, -0.75); tail.rotation.x = -0.9; g.add(tail);
  // neck rig: pivots at the body front so the head can dip to graze
  const neck = new THREE.Group();
  neck.position.set(0, 1.5, 0.62);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.85, 8), featherM);
  neckM.position.y = 0.42; neckM.castShadow = true; neck.add(neckM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 8), darkM);
  head.position.set(0, 0.88, 0.06); head.scale.set(0.9, 0.85, 1.15); neck.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), lam2({ color: "#3a2a1a" }));
  beak.position.set(0, 0.86, 0.32); beak.rotation.x = Math.PI / 2 + 0.25; neck.add(beak);
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), lam2({ color: "#1a120a" }));
    eye.position.set(s * 0.11, 0.92, 0.14); neck.add(eye);
  }
  neck.rotation.x = -0.35;
  g.add(neck);
  // legs: long, scaly, on hip pivots so update() can swing them
  const legM = lam2({ color: "#8a7a5a" });
  const mkLeg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.95, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.55, 6), legM);
    thigh.position.y = -0.27; pivot.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.5, 6), legM);
    shin.position.y = -0.75; pivot.add(shin);
    for (const tx of [-0.09, 0, 0.09]) {
      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.22), darkM);
      toe.position.set(tx, -0.98, 0.08); pivot.add(toe);
    }
    g.add(pivot);
    return pivot;
  };
  const legL = mkLeg(-0.2), legR = mkLeg(0.2);
  g.scale.setScalar(scale);
  const home: V3 = [0, 0, 0];
  return { g, legL, legR, neck, base: [0, 0, 0], phase: tr() * 6.28, scale, home };
};

/** A rabbit: small grey-brown body, long ears, mid-hop pose. */
const makeRabbit = (seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 571 + 3);
  const m = lam2({ color: "#8a7a6a" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), m);
  body.position.y = 0.22; body.scale.set(1, 0.85, 1.3); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), m);
  head.position.set(0, 0.38, 0.22); g.add(head);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 6), lam2({ color: "#7a6a58" }));
    ear.position.set(s * 0.07, 0.62, 0.2); ear.rotation.z = -s * 0.12; g.add(ear);
  }
  void tr;
  return g;
};

/** A 1930s farm truck: cab, hood, flat bed, spoked wheels, and
 *  a Lewis gun mounted on the bed for the chase. */
const makeTruck = () => {
  const g = new THREE.Group();
  const bodyM = lam2({ color: "#5d6a4a" });
  const darkM = lam2({ color: "#3a3a3e" });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 1.5), bodyM);
  cab.position.set(0, 1.15, 0.4); cab.castShadow = true; g.add(cab);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 1.1), bodyM);
  hood.position.set(0, 0.95, 1.6); hood.castShadow = true; g.add(hood);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.2), lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) }));
  bed.position.set(0, 0.95, -1.3); bed.castShadow = true; g.add(bed);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 4.4), darkM);
  chassis.position.set(0, 0.55, 0); g.add(chassis);
  const wheelG = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12);
  for (const [wx, wz] of [[-0.78, 1.35], [0.78, 1.35], [-0.78, -1.35], [0.78, -1.35]] as [number, number][]) {
    const w = new THREE.Mesh(wheelG, darkM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); w.castShadow = true; g.add(w);
  }
  const lampM = new THREE.MeshLambertMaterial({ color: "#ffe9a8", emissive: "#ff9a3c", emissiveIntensity: 0.4 });
  for (const s of [1, -1]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lampM);
    lamp.position.set(s * 0.45, 1.0, 2.18); g.add(lamp);
  }
  // the Lewis gun on its mount, pointing forward over the cab
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), darkM);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.25, 0.4); gun.add(barrel);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), lam2({ color: "#4a4a50" }));
  drum.position.set(0, 0.32, 0.1); gun.add(drum);
  const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkM);
  tripod.position.set(0, -0.1, 0); gun.add(tripod);
  gun.position.set(0, 1.55, -1.2);
  g.add(gun);
  return g;
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#e8c9a0", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // ---- ambient-life registries (STANDAR GERAK) ----
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private wheat!: THREE.InstancedMesh;
  private wheatSway: THREE.Group[] = [];
  private windmillFan: THREE.Group | null = null;
  private emus: EmuRig[] = [];
  private giantEmu: EmuRig | null = null;
  private tankEmu: EmuRig | null = null;
  private rabbits: THREE.Group[] = [];
  private rabbitBase: { x: number; z: number; ph: number }[] = [];
  private truck: THREE.Group | null = null;
  private dust: THREE.Sprite[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1932);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b0805a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    const cloudSpots: [number, number, number, number][] = [
      [-105, 88, -230, 105], [48, 104, -280, 125], [138, 76, -195, 82], [-24, 118, -350, 140],
      [-175, 108, -320, 115], [195, 116, -340, 120], [6, 70, -165, 66], [-128, 64, -155, 60],
      [102, 56, -135, 52], [248, 84, -250, 92],
    ];
    cloudSpots.forEach(([x, y, z, w], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 37, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
      sp.position.set(x, y, z);
      sp.scale.set(w, w * 0.34, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.5 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.7 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildField(R, r);
    this.buildFenceSet(R, r);
    this.buildTrackSet(R, r);
  }

  // ---------------- SET A: the wheat field ----------------
  private buildField(R: THREE.Group, r: () => number) {
    // red dirt base + golden stubble field floor
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(460, 240), lam2({ map: rep(dirtTex(), 60, 30), color: "#c07a4e" }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, -0.05, -20); dirt.receiveShadow = true; R.add(dirt);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), lam2({ map: rep(stubbleTex(), 12, 9), color: "#e2bd5e" }));
    field.rotation.x = -Math.PI / 2; field.position.set(0, 0.0, -12); field.receiveShadow = true; R.add(field);
    // distant hazy hills on the horizon
    const hillM = lam2({ color: "#9a8a7a" });
    for (const [hx, hz, hw, hh2] of [[-60, -95, 90, 7], [40, -105, 110, 9], [120, -90, 70, 6]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), hillM);
      hill.position.set(hx, -1, hz); hill.scale.set(hw, hh2, 18); R.add(hill);
    }
    // ---- wheat rows: instanced golden stalks across the field ----
    const stalkGeo = new THREE.ConeGeometry(0.055, 1.35, 5);
    const stalkM = lam2({ color: "#d9a83c" });
    const spots: [number, number][] = [];
    for (let gx = -34; gx <= 34; gx += 0.7) {
      for (let gz = -38; gz <= 14; gz += 0.9) {
        if (Math.abs(gx - 1.2) < 2.4 && gz > 6) continue; // hero's clearing
        if (Math.abs(gx + 5) < 2.2 && gz > -4 && gz < 0) continue; // giant emu's clearing
        if (gz < -6 && gz > -10 && Math.abs(gx) < 30) continue; // the fence corridor
        spots.push([gx + (r() - 0.5) * 0.5, gz + (r() - 0.5) * 0.6]);
      }
    }
    this.wheat = new THREE.InstancedMesh(stalkGeo, stalkM, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
    const col = new THREE.Color();
    spots.forEach(([x, z], i) => {
      e.set((r() - 0.5) * 0.16, r() * Math.PI, (r() - 0.5) * 0.16);
      q.setFromEuler(e);
      sc.set(0.9 + r() * 0.35, 0.85 + r() * 0.4, 0.9 + r() * 0.35);
      m4.compose(new THREE.Vector3(x, 0.55, z), q, sc);
      this.wheat.setMatrixAt(i, m4);
      col.setHSL(0.11 + r() * 0.02, 0.72, 0.55 + r() * 0.12);
      this.wheat.setColorAt(i, col);
    });
    this.wheat.castShadow = true; this.wheat.receiveShadow = true;
    R.add(this.wheat);
    // a few tall sway tufts near the hero so the wheat visibly moves
    for (let i = 0; i < 10; i++) {
      const tuft = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 1.5, 5), lam2({ color: "#e0b84a" }));
        c.position.set((r() - 0.5) * 0.3, 0.75, (r() - 0.5) * 0.3);
        c.rotation.z = (r() - 0.5) * 0.25;
        tuft.add(c);
      }
      const tx = -4 + r() * 12, tz = 4 + r() * 8;
      tuft.position.set(tx, 0, tz);
      R.add(tuft);
      this.wheatSway.push(tuft);
    }
    // ---- the farmhouse + windmill + gum trees ----
    const house = makeFarmhouse();
    house.position.set(FARMHOUSE[0], 0, FARMHOUSE[2]); house.rotation.y = 0.25;
    R.add(house);
    blob(R, FARMHOUSE[0], 0.02, FARMHOUSE[2], 12, 10, 0.3);
    const wm = makeWindmill(7.5);
    wm.g.position.set(-34, 0, -26);
    R.add(wm.g);
    this.windmillFan = wm.fan;
    const treePts: [number, number, number][] = [
      [-10, -14, 4.6], [14, -12, 4.2], [-26, -6, 5.2], [24, -4, 4.8], [-20, -26, 5.6],
      [18, -28, 5.0], [-32, -18, 4.6], [30, -22, 5.4], [-6, -34, 4.4], [8, -36, 4.8],
    ];
    treePts.forEach(([x, z, h], i) => {
      const t = makeGum(h, 21 + i * 9);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 1.71 });
    });
    // scrub bushes
    const bushM = lam2({ color: "#7a7a4a", map: rep(gumLeafTex("emuBush"), 2, 1) });
    for (let i = 0; i < 14; i++) {
      const s = r() < 0.5 ? 1 : -1;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.45, 9, 7), bushM);
      b.position.set(s * (6 + r() * 22), 0.25, 8 - r() * 34);
      b.scale.y = 0.7; b.castShadow = true; R.add(b);
    }
    // ---- the fence line across the field (z = FENCE_Z) ----
    const postM = lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) });
    const wireM = lam2({ color: "#8a8a90" });
    for (let x = -30; x <= 30; x += 3) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.16), postM);
      post.position.set(x, 0.75, FENCE_Z); post.castShadow = true; R.add(post);
    }
    for (const wy of [0.5, 0.95, 1.35]) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(60.5, 0.03, 0.03), wireM);
      wire.position.set(0, wy, FENCE_Z); R.add(wire);
    }
    // the BROKEN section: leaning posts + sagging wire + a hole
    for (const [bx, tilt] of [[-5.6, 0.5], [-4.4, -0.35]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.16), postM);
      post.position.set(bx, 0.6, FENCE_Z); post.rotation.z = tilt; R.add(post);
    }
    const sag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.03), wireM);
    sag.position.set(-5, 0.45, FENCE_Z); sag.rotation.z = 0.25; R.add(sag);
    // trampled wheat ring around the hole
    for (let i = 0; i < 12; i++) {
      const flat = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 5), lam2({ color: "#b08a2e" }));
      flat.position.set(-5 + (r() - 0.5) * 3, 0.15, FENCE_Z + 1 + r() * 2);
      flat.rotation.x = Math.PI / 2 - 0.3; flat.rotation.z = r() * 3;
      R.add(flat);
    }
    // ---- the emu flock (pool of rigs, posed per shot in update) ----
    for (let i = 0; i < 18; i++) {
      const emu = makeEmu(0.95 + (i % 4) * 0.08, 101 + i * 17);
      emu.home = [-26 + (i % 6) * 9 + (r() - 0.5) * 3, 0, -42 + Math.floor(i / 6) * 12 + (r() - 0.5) * 4];
      emu.g.position.set(...emu.home);
      emu.g.rotation.y = r() * Math.PI * 2;
      R.add(emu.g);
      this.emus.push(emu);
    }
    // the GIANT cover emu — 1.7x, towers behind the hero
    const giant = makeEmu(1.7, 777);
    giant.g.position.set(...EMU_GIANT);
    giant.g.rotation.y = 0.5;
    R.add(giant.g);
    this.giantEmu = giant;
    // the TANK emu for shot 9 — 1.6x, heroic at the fence set
    const tank = makeEmu(1.6, 888);
    tank.g.position.set(FENCE_X + 1.5, 0, -3);
    tank.g.rotation.y = -0.6;
    R.add(tank.g);
    this.tankEmu = tank;
    // ---- rabbits at the broken fence (shot 3) ----
    for (let i = 0; i < 3; i++) {
      const rb = makeRabbit(201 + i * 31);
      const bx = -6 + i * 1.6, bz = FENCE_Z + 1.5 + i * 0.8;
      rb.position.set(bx, 0, bz);
      rb.rotation.y = 0.6 + i * 0.4;
      R.add(rb);
      this.rabbits.push(rb);
      this.rabbitBase.push({ x: bx, z: bz, ph: i * 2.1 });
    }
    // ---- dust motes hanging in the hot air ----
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffe9bb", transparent: true, depthWrite: false, opacity: 0.22 }));
      sp.position.set((r() - 0.5) * 40, 0.5 + r() * 3, -10 + r() * 15);
      sp.scale.set(1.2 + r() * 1.6, 1.2 + r() * 1.6, 1); sp.layers.set(NOINK); R.add(sp);
      this.dust.push(sp);
    }
    void r;
  }

  // ---------------- SET D: the Emu Fence + tally (x = FENCE_X) ----------------
  private buildFenceSet(R: THREE.Group, r: () => number) {
    const X = FENCE_X;
    const postM = lam2({ color: "#6a4a2c", map: rep(planks(), 1, 1) });
    const wireM = lam2({ color: "#8a8a90" });
    // the fence runs across z, stretching to the horizon both ways
    for (let z = -24; z <= 24; z += 3) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), postM);
      post.position.set(X, 0.8, z); post.castShadow = true; R.add(post);
    }
    for (const wy of [0.5, 1.0, 1.45]) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 49), wireM);
      wire.position.set(X, wy, 0); R.add(wire);
    }
    // the tally: a heap of spent brass shells beside the fence
    const brassM = lam2({ color: "#c9a83a" });
    for (let i = 0; i < 26; i++) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 7), brassM);
      sh.position.set(X + 0.6 + (r() - 0.5) * 1.1, 0.06 + (i % 3) * 0.07, 0.6 + (r() - 0.5) * 1.0);
      sh.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.5, 0, r() * Math.PI);
      sh.castShadow = true; R.add(sh);
    }
    // a leaning tally board with the count chalked on it
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.08), lam2({ color: "#8a6844", map: rep(planks(), 1, 1) }));
    board.position.set(X - 1.2, 0.9, -2.5); board.rotation.y = 0.5; board.rotation.z = -0.06; board.castShadow = true; R.add(board);
    void r;
  }

  // ---------------- SET C: the truck-chase dirt track (x = TRUCK_X) ----------------
  private buildTrackSet(R: THREE.Group, r: () => number) {
    const X = TRUCK_X;
    // a pale dirt track cutting across the red field
    const track = new THREE.Mesh(new THREE.PlaneGeometry(34, 5.5), lam2({ map: rep(dirtTex(), 8, 2), color: "#d8b088" }));
    track.rotation.x = -Math.PI / 2; track.position.set(X, 0.01, 0); track.receiveShadow = true; R.add(track);
    // wheel ruts
    const rutM = lam2({ color: "#8a6242" });
    for (const rz of [-1.1, 1.1]) {
      const rut = new THREE.Mesh(new THREE.BoxGeometry(34, 0.02, 0.5), rutM);
      rut.position.set(X, 0.03, rz); R.add(rut);
    }
    // the truck itself (posed per shot in update)
    const truck = makeTruck();
    truck.position.set(X - 14, 0, 0);
    truck.rotation.y = Math.PI / 2;
    R.add(truck);
    this.truck = truck;
    // a couple of gum trees + scrub along the track
    [[X - 12, -8, 4.4], [X + 10, 9, 4.8]].forEach(([x, z, h], i) => {
      const t = makeGum(h, 301 + i * 13);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: i * 2.3 + 5 });
    });
    void r;
  }

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
    v.normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** Pose one emu rig: run cycle (legs swing + body bob) or
   *  graze (neck dips) or stand alert (neck up, head scanning). */
  private poseEmu(e: EmuRig, t: number, mode: "run" | "graze" | "stand" | "walk", speed = 1) {
    const ph = t * 9 * speed + e.phase;
    if (mode === "run" || mode === "walk") {
      const amp = mode === "run" ? 0.75 : 0.35;
      e.legL.rotation.x = Math.sin(ph) * amp;
      e.legR.rotation.x = Math.sin(ph + Math.PI) * amp;
      e.g.position.y = Math.abs(Math.sin(ph)) * (mode === "run" ? 0.09 : 0.04);
      e.neck.rotation.x = -0.35 + Math.sin(ph * 0.5) * 0.06;
    } else if (mode === "graze") {
      e.legL.rotation.x = 0; e.legR.rotation.x = 0;
      e.g.position.y = 0;
      e.neck.rotation.x = 0.55 + Math.sin(t * 0.8 + e.phase) * 0.12;
    } else {
      e.legL.rotation.x = 0; e.legR.rotation.x = 0;
      e.g.position.y = 0;
      e.neck.rotation.x = -0.4 + Math.sin(t * 0.6 + e.phase) * 0.08;
      e.g.rotation.y += Math.sin(t * 0.4 + e.phase) * 0.0004;
    }
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
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    for (const tuft of this.wheatSway) {
      tuft.rotation.z = Math.sin(tt * 1.4 + tuft.position.x) * 0.05;
      tuft.rotation.x = Math.cos(tt * 1.1 + tuft.position.z) * 0.04;
    }
    if (this.windmillFan) this.windmillFan.rotation.z = tt * 1.6;
    for (const d of this.dust) {
      d.position.x += Math.sin(tt * 0.5 + d.position.y) * 0.002;
      (d.material as THREE.SpriteMaterial).opacity = 0.18 + 0.06 * Math.sin(tt * 0.9 + d.position.z);
    }
    // ---- the emu flock, posed per shot ----
    const fl = floodAt(id, tt), scat = scatterAt(id, tt);
    const setFlock = (visible: boolean) => { for (const e of this.emus) e.g.visible = visible; };
    const runFlock = (mode: "run" | "graze" | "stand" | "walk", speed = 1) => { for (const e of this.emus) this.poseEmu(e, t, mode, speed); };
    if (this.giantEmu) this.giantEmu.g.visible = (id === 1 || id === 10);
    if (this.tankEmu) this.tankEmu.g.visible = (id === 9);
    if (id === 1 || id === 10) {
      // cover: the giant looms, the flock streams in behind
      setFlock(true);
      this.emus.forEach((e, i) => {
        const hx = e.home[0], hz = e.home[1] === 0 ? e.home[2] : e.home[2];
        e.g.position.set(hx + Math.sin(tt * 0.9 + i) * 0.4, 0, hz + tt * 2.5);
        e.g.rotation.y = 0.15 + Math.sin(i * 2.4) * 0.3;
        this.poseEmu(e, t, "walk", 0.8);
      });
      if (this.giantEmu) { this.poseEmu(this.giantEmu, t, "stand"); this.giantEmu.g.rotation.y = 0.5 + Math.sin(tt * 0.7) * 0.05; }
    } else if (id === 2) {
      // the flood pours in from the horizon
      setFlock(true);
      this.emus.forEach((e, i) => {
        const z = e.home[2] + fl * 42;
        e.g.position.set(e.home[0] + Math.sin(tt * 1.2 + i) * 0.8, 0, z);
        e.g.rotation.y = 0.1 + Math.sin(i * 1.7) * 0.25;
        this.poseEmu(e, t, "run", 1.1);
      });
      if (this.giantEmu) this.poseEmu(this.giantEmu, t, "stand");
    } else if (id === 3) {
      // grazing at the broken fence; rabbits hop through the hole
      setFlock(true);
      this.emus.forEach((e, i) => {
        if (i < 6) {
          e.g.position.set(-9 + i * 2.2, 0, FENCE_Z - 3 - (i % 3));
          e.g.rotation.y = 0.4 + i * 0.5;
          this.poseEmu(e, t, i % 2 ? "graze" : "stand");
        } else {
          e.g.position.set(-14 + i, 0, -16 - (i % 4) * 2);
          e.g.rotation.y = i;
          this.poseEmu(e, t, "graze");
        }
      });
      this.rabbits.forEach((rb, i) => {
        const b = this.rabbitBase[i];
        const hop = Math.abs(Math.sin(tt * 5 + b.ph));
        rb.position.set(b.x + tt * 1.2, hop * 0.35, b.z + tt * 0.8);
      });
    } else if (id === 4) {
      // the army arrives: emus watch from a wary distance
      setFlock(true);
      this.emus.forEach((e, i) => {
        e.g.position.set(e.home[0], 0, -18 - (i % 5) * 3);
        e.g.rotation.y = 0.2 + i * 0.4;
        this.poseEmu(e, t, "stand");
      });
    } else if (id === 5) {
      // first volley: the flock scatters in zig-zags
      setFlock(true);
      this.emus.forEach((e, i) => {
        const dir = (i % 2 ? 1 : -1);
        const zx = Math.sin(tt * 3.1 + i * 1.9) * 2.2 * scat;
        e.g.position.set(e.home[0] + dir * scat * 7 + zx, 0, e.home[2] - scat * 6 + Math.cos(tt * 2.3 + i) * 1.2 * scat);
        e.g.rotation.y = dir * 0.9 + Math.sin(tt * 2.7 + i) * 0.4;
        this.poseEmu(e, t, "run", 1.3);
      });
    } else if (id === 6) {
      // the lookout on its rise; small groups scatter below
      setFlock(true);
      this.emus.forEach((e, i) => {
        if (i === 0) {
          e.g.position.set(-4, 0.8, -8);
          e.g.rotation.y = -0.4;
          this.poseEmu(e, t, "stand");
        } else {
          const gx = -12 + (i % 4) * 5, gz = -14 - Math.floor(i / 4) * 4;
          e.g.position.set(gx + Math.sin(tt * 1.4 + i) * scat * 0 + tt * (i % 3 - 1) * 2, 0, gz);
          e.g.rotation.y = i * 0.7;
          this.poseEmu(e, t, "walk", 0.9);
        }
      });
    } else if (id === 7) {
      // the chase: emus ahead of the bouncing truck
      setFlock(true);
      const tx = (TRUCK_X - 14) + 26 * chaseAt(7, tt);
      this.emus.forEach((e, i) => {
        if (i < 6) {
          e.g.position.set(tx + 8 + i * 2.4, 0, -2 + (i % 3) * 2.2);
          e.g.rotation.y = Math.PI / 2;
          this.poseEmu(e, t, "run", 1.4);
        } else {
          e.g.position.set(tx - 20 + i, 0, -18 - (i % 3) * 3);
          this.poseEmu(e, t, "stand");
        }
      });
      if (this.truck) {
        this.truck.position.set(tx, Math.abs(Math.sin(tt * Math.PI * 9)) * 0.08, 0);
        this.truck.rotation.z = Math.sin(tt * Math.PI * 9) * 0.02;
      }
    } else if (id === 8) {
      // the tally: one calm emu beside the shell pile
      setFlock(false);
      if (this.truck) this.truck.visible = false;
      this.emus[0].g.visible = true;
      this.emus[0].g.position.set(FENCE_X + 2.5, 0, -1);
      this.emus[0].g.rotation.y = -0.7;
      this.poseEmu(this.emus[0], t, "stand");
    } else if (id === 9) {
      // the tank: the giant emu stands heroic in golden light
      setFlock(false);
      if (this.tankEmu) { this.poseEmu(this.tankEmu, t, "stand"); this.tankEmu.g.rotation.y = -0.6 + Math.sin(tt * 0.5) * 0.04; }
    }
    if (id !== 7 && this.truck) {
      // the truck parks with the soldiers in shot 4, hides elsewhere
      if (id === 4) {
        this.truck.visible = true;
        this.truck.position.set(4, 0, -6);
        this.truck.rotation.set(0, -0.4, 0);
      } else if (id !== 8) {
        this.truck.visible = false;
      }
    }
    if (id === 8 && this.truck) this.truck.visible = false;
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
