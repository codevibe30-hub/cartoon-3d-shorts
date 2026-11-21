// The Toyosu tuna-auction film as one three.js scene, ONE zone: the auction hall
// — a long hall along z (floor y 0, x -11..11, z -34..16), the hero bluefin on
// its ice pallet at z ~2, rows of frozen tuna on pallets along both walls, the
// auction platform + glowing price board at the far end (z ~-30), dawn windows
// on the wall behind the camera end (+z).
// VISUAL UPGRADE (21 Nov 2026): layered light — key light with soft shadows +
// hemisphere fill + a cool rim; every large surface carries painted texture
// (wet concrete with puddle glints, crushed ice, styrofoam crates, panel walls);
// cold mist drifts over the floor. ANTI-BANDING: no big flat gradients —
// speckled/textured surfaces everywhere.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, rep, rng, stone, planks, beam } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const floorTex = () => ctex("tunaFloor", 1024, 1024, (g, r) => {
  g.fillStyle = "#8d99a4"; g.fillRect(0, 0, 1024, 1024);
  // concrete mottling
  const cols = ["#85919c", "#95a1ab", "#7e8a94", "#9aa5ae", "#87939e"];
  for (let i = 0; i < 2600; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.globalAlpha = 0.16 + r() * 0.2; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 8 + r() * 46, 5 + r() * 26, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // expansion-joint seams (tile = 5 m)
  g.strokeStyle = "rgba(38,46,54,0.55)"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, 2); g.lineTo(1024, 2); g.moveTo(2, 0); g.lineTo(2, 1024); g.stroke();
  g.strokeStyle = "rgba(230,238,244,0.20)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 8); g.lineTo(1024, 8); g.moveTo(8, 0); g.lineTo(8, 1024); g.stroke();
  // wet streaks + puddle sheens
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = r() * 1024, w = 60 + r() * 190, h = w * (0.16 + r() * 0.2);
    const cg = g.createRadialGradient(x, y, 2, x, y, w);
    cg.addColorStop(0, "rgba(196,220,240,0.30)"); cg.addColorStop(0.7, "rgba(170,200,228,0.13)"); cg.addColorStop(1, "rgba(170,200,228,0)");
    g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, w, h, r() * 0.6 - 0.3, 0, 7); g.fill();
  }
  // dark damp patches + scuffs
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(40,50,60,${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 3 + r() * 22, 2 + r() * 9, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "235,242,248" : "30,38,46"},${0.05 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});
const iceTex = () => ctex("tunaIce", 512, 512, (g, r) => {
  g.fillStyle = "#dfeaf2"; g.fillRect(0, 0, 512, 512);
  const cols = ["#ffffff", "#cfe0ee", "#eef6fb", "#bdd2e4", "#f7fbfe"];
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    const x = r() * 512, y = r() * 512, s = 3 + r() * 11;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.4); g.lineTo(x + s * 0.4, y + s); g.closePath(); g.fill();
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(140,175,205,${0.12 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
});
const tunaTex = (key: string, seed: number) => ctex("tunaSkin" + key, 512, 256, (g, r) => {
  // u (x axis) wraps the body: x ~256 = the back (dark steel blue), edges = belly (silver)
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, "#ccd6de"); grad.addColorStop(0.30, "#5d7d94");
  grad.addColorStop(0.42, "#24425e"); grad.addColorStop(0.5, "#1f3a54");
  grad.addColorStop(0.58, "#24425e"); grad.addColorStop(0.70, "#5d7d94"); grad.addColorStop(1, "#ccd6de");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  // pinkish lateral blush
  const pg = g.createLinearGradient(0, 0, 512, 0);
  pg.addColorStop(0, "rgba(216,150,140,0)"); pg.addColorStop(0.3, "rgba(216,150,140,0.20)");
  pg.addColorStop(0.7, "rgba(216,150,140,0.20)"); pg.addColorStop(1, "rgba(216,150,140,0)");
  g.fillStyle = pg; g.fillRect(0, 0, 512, 256);
  // scale speckle
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.45 ? "225,238,248" : "16,30,44"},${0.05 + r() * 0.09})`; g.fillRect(r() * 512, r() * 256, 2, 2); }
  // frost dusting (frozen fish)
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(240,248,255,${0.10 + r() * 0.22})`; g.fillRect(r() * 512, r() * 256, 1.8, 1.8); }
});
const wallTex = () => ctex("tunaWall", 1024, 512, (g, r) => {
  g.fillStyle = "#aeb9c2"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "225,232,238" : "90,104,116"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 512, 3, 3); }
  // panel seams every 128 px + a horizontal rail
  g.strokeStyle = "rgba(52,62,72,0.6)"; g.lineWidth = 4;
  for (let x = 0; x <= 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  g.beginPath(); g.moveTo(0, 340); g.lineTo(1024, 340); g.stroke();
  g.fillStyle = "rgba(70,84,96,0.5)"; g.fillRect(0, 470, 1024, 42); // scuffed base band
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(40,50,58,${0.08 + r() * 0.12})`; g.fillRect(r() * 1024, 462 + r() * 50, 4 + r() * 20, 2.4); }
  // vent grilles
  for (const vx of [180, 700]) {
    g.fillStyle = "#8b98a2"; g.fillRect(vx, 90, 150, 96);
    g.strokeStyle = "rgba(40,50,60,0.7)"; g.lineWidth = 3;
    for (let y = 102; y < 180; y += 13) { g.beginPath(); g.moveTo(vx + 8, y); g.lineTo(vx + 142, y); g.stroke(); }
  }
});
const windowTex = () => ctex("tunaWindows", 2048, 1024, (g, r) => {
  // the +z end wall: floor-to-near-ceiling windows onto dawn Tokyo
  const sky = g.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, "#7fa8d8"); sky.addColorStop(0.45, "#a9c6e8"); sky.addColorStop(0.75, "#d9e6f2"); sky.addColorStop(1, "#e8eef2");
  g.fillStyle = sky; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * 2048, r() * 1024, 2.4, 2.4); }
  // dawn glow low on the horizon
  const dg = g.createRadialGradient(1500, 900, 40, 1500, 900, 700);
  dg.addColorStop(0, "rgba(255,214,150,0.55)"); dg.addColorStop(1, "rgba(255,214,150,0)");
  g.fillStyle = dg; g.fillRect(0, 0, 2048, 1024);
  // distant skyline + port cranes silhouettes
  g.fillStyle = "#5d748e";
  let x = 0; while (x < 2048) { const w = 60 + r() * 150, h = 130 + r() * 240; g.fillRect(x, 1024 - h - 120, w, h + 120); x += w + 14 + r() * 50; }
  g.strokeStyle = "#54687f"; g.lineWidth = 10;
  for (const cx of [240, 1180, 1780]) {
    g.beginPath(); g.moveTo(cx, 880); g.lineTo(cx, 480); g.lineTo(cx + 190, 480); g.stroke();
    g.beginPath(); g.moveTo(cx + 190, 480); g.lineTo(cx + 150, 560); g.stroke();
  }
  g.fillStyle = "rgba(70,90,112,0.85)"; g.fillRect(0, 1004, 2048, 20);
  // window mullions
  g.fillStyle = "#3c4854";
  for (let mx = 0; mx <= 2048; mx += 256) g.fillRect(mx - 9, 0, 18, 1024);
  g.fillRect(0, 0, 2048, 26); g.fillRect(0, 500, 2048, 16); g.fillRect(0, 998, 2048, 26);
});
const boardTex = () => ctex("tunaBoard", 2048, 512, (g, r) => {
  g.fillStyle = "#101c2c"; g.fillRect(0, 0, 2048, 512);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,180,230,${0.03 + r() * 0.05})`; g.fillRect(r() * 2048, r() * 512, 3, 3); }
  g.strokeStyle = "#3d5a78"; g.lineWidth = 10; g.strokeRect(14, 14, 2020, 484);
  g.fillStyle = "#9fc2e2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "700 64px Arial, sans-serif";
  g.fillText("TOYOSU MARKET — FIRST AUCTION OF THE YEAR", 1024, 74);
  g.fillStyle = "#ffd94d";
  g.font = "900 218px 'Arial Black', Arial, sans-serif";
  g.fillText("¥333,600,000", 1024, 268);
  g.fillStyle = "#cfe2f2"; g.font = "700 58px Arial, sans-serif";
  g.fillText("2019.01.05 · BLUEFIN TUNA · 278 kg · OMA, AOMORI", 1024, 442);
});
const bannerTex = (word: string, bg: string) => ctex("tunaBanner" + word, 256, 1024, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`; g.fillRect(r() * 256, r() * 1024, 2.4, 2.4); }
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  const step = Math.min(150, 880 / word.length);
  word.split("").forEach((ch, i) => g.fillText(ch, 128, 110 + i * step));
  g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(0, 0, 256, 26); g.fillRect(0, 998, 256, 26);
});
const crateTex = () => ctex("tunaCrate", 512, 256, (g, r) => {
  g.fillStyle = "#e8edf0"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "170,185,198"},${0.10 + r() * 0.16})`; g.fillRect(r() * 512, r() * 256, 2.2, 2.2); }
  g.fillStyle = "#2e6da8"; g.fillRect(0, 96, 512, 42);
  g.fillStyle = "#ffffff"; g.font = "900 30px Arial, sans-serif"; g.textAlign = "center";
  g.fillText("TOYOSU", 256, 128);
  g.strokeStyle = "rgba(90,105,118,0.6)"; g.lineWidth = 6; g.strokeRect(6, 6, 500, 244);
});
const dialTex = () => ctex("tunaDial", 256, 256, (g) => {
  g.fillStyle = "#f2f0e6"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = "#2c343c"; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
  g.fillStyle = "#2c343c"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const x = 128 + Math.cos(a) * 92, y = 128 + Math.sin(a) * 92;
    g.font = "900 30px Arial, sans-serif"; g.fillText(String(i * 50), x, y);
    g.save(); g.translate(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); g.rotate(a + Math.PI / 2); g.fillRect(-2, -8, 4, 16); g.restore();
  }
  g.strokeStyle = "#c0353a"; g.lineWidth = 8; g.beginPath();
  const na = Math.PI * 0.75 + 0.86 * Math.PI * 1.5;
  g.moveTo(128, 128); g.lineTo(128 + Math.cos(na) * 96, 128 + Math.sin(na) * 96); g.stroke();
  g.fillStyle = "#2c343c"; g.beginPath(); g.arc(128, 128, 13, 0, 7); g.fill();
  g.font = "700 26px Arial, sans-serif"; g.fillText("kg", 128, 178);
});
const meatTex = () => ctex("tunaMeat", 256, 256, (g, r) => {
  g.fillStyle = "#b03040"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "216,90,100" : "140,26,40"},${0.14 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(245,230,220,0.75)"; g.lineWidth = 5;
  g.beginPath(); g.arc(128, 128, 84, 0.4, 2.2); g.stroke();
  g.beginPath(); g.arc(128, 128, 52, 2.8, 4.6); g.stroke();
  g.strokeStyle = "#7e2432"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.stroke();
});
const blobTex = () => ctex("tunaBlob", 256, 256, (g) => {
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
/** A frozen bluefin: lathe torpedo body (head +z), forked tail, dorsal + pectoral
 *  fins, frost-dusted skin. Unit length 1 along z; scale = metres. */
const makeTuna = (tex: THREE.Texture, s: number) => {
  const grp = new THREE.Group();
  const prof: [number, number][] = [[0.004, -0.50], [0.030, -0.44], [0.055, -0.36], [0.100, -0.22], [0.145, -0.05], [0.165, 0.10], [0.160, 0.22], [0.125, 0.34], [0.075, 0.43], [0.020, 0.49], [0.004, 0.50]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  bodyGeo.rotateX(Math.PI / 2); // head -> +Z
  const mat = new THREE.MeshPhongMaterial({ map: tex, shininess: 42, specular: new THREE.Color("#8aa4b8") });
  twoTone(mat as unknown as THREE.MeshLambertMaterial);
  const body = new THREE.Mesh(bodyGeo, mat); body.castShadow = true; body.receiveShadow = true; grp.add(body);
  // forked (crescent) tail fin, vertical
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0); tailShape.quadraticCurveTo(-0.08, 0.04, -0.24, 0.155);
  tailShape.quadraticCurveTo(-0.175, 0.025, -0.185, 0.0); tailShape.quadraticCurveTo(-0.175, -0.025, -0.24, -0.155);
  tailShape.quadraticCurveTo(-0.08, -0.04, 0, 0);
  const tail = new THREE.Mesh(new THREE.ShapeGeometry(tailShape), new THREE.MeshPhongMaterial({ map: tex, side: THREE.DoubleSide, shininess: 24 }));
  tail.geometry.rotateY(Math.PI / 2); tail.position.z = -0.47; tail.castShadow = true; grp.add(tail);
  // dorsal fin
  const dShape = new THREE.Shape();
  dShape.moveTo(0, 0); dShape.quadraticCurveTo(0.04, 0.095, 0.13, 0.105); dShape.quadraticCurveTo(0.08, 0.02, 0.12, 0); dShape.closePath();
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(dShape), tail.material);
  dorsal.geometry.rotateY(Math.PI / 2); dorsal.position.set(0, 0.145, 0.02); grp.add(dorsal);
  // pectoral fins + eyes
  for (const sd of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.07), new THREE.MeshPhongMaterial({ color: "#22384e", side: THREE.DoubleSide, shininess: 24 }));
    fin.position.set(sd * 0.145, -0.055, 0.30); fin.rotation.set(0.5, sd * 0.8, sd * 0.6); grp.add(fin);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 8), new THREE.MeshBasicMaterial({ color: "#14100c" }));
    eye.position.set(sd * 0.082, 0.045, 0.415); grp.add(eye);
  }
  grp.scale.setScalar(s);
  return grp;
};
/** pallet + crushed-ice bed + one tuna resting on it (slight resting roll). */
const tunaStand = (tex: THREE.Texture, len: number, roll: number, yaw: number) => {
  const grp = new THREE.Group();
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.13, len + 0.7), lam2({ map: rep(planks(), 1, 3), color: "#c8a878" }));
  pallet.position.y = 0.065; pallet.castShadow = true; pallet.receiveShadow = true; grp.add(pallet);
  const ice = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.17, len + 0.45), lam2({ map: rep(iceTex(), 2, 4) }));
  ice.position.y = 0.215; ice.castShadow = true; ice.receiveShadow = true; grp.add(ice);
  const tuna = makeTuna(tex, len);
  const bodyR = 0.165 * len;
  tuna.position.y = 0.30 + bodyR * 0.88;
  tuna.rotation.z = roll; tuna.rotation.y = yaw;
  grp.add(tuna);
  return grp;
};

type Mist = { sp: THREE.Sprite; ph: number; x0: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c3d3e2", 26, 170);
  private glints: { mat: THREE.MeshBasicMaterial; ph: number }[] = [];
  private mists: Mist[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(4321);
    // ---- light rig: key (shadow caster) + hemisphere fill + cool rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8d99a4", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#bcd7ff", 0.55);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- floor: wet concrete, panel-tiled ----
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 58), lam2({ map: rep(floorTex(), 6, 12) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -9); floor.receiveShadow = true; R.add(floor);
    // centre aisle: a slightly darker worn strip under the tuna rows' walkway
    const aisle = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 58), lam2({ map: rep(floorTex(), 2, 12), color: "#aebac4" }));
    aisle.rotation.x = -Math.PI / 2; aisle.position.set(0, 0.006, -9); aisle.receiveShadow = true; R.add(aisle);
    // puddle glints dancing on the wet floor
    for (let i = 0; i < 18; i++) {
      const gm = new THREE.MeshBasicMaterial({ color: "#dfeeff", transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + r() * 1.6, 0.10 + r() * 0.16), gm);
      glint.rotation.x = -Math.PI / 2; glint.rotation.z = r() * 0.8 - 0.4;
      glint.position.set(-9 + r() * 18, 0.014, 13 - r() * 44); glint.renderOrder = 3; R.add(glint);
      this.glints.push({ mat: gm, ph: r() });
    }
    // ---- walls + columns ----
    const wallMat = lam2({ map: rep(wallTex(), 10, 2) });
    for (const sd of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(58, 11), wallMat);
      wall.position.set(sd * 11, 5.5, -9); wall.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2;
      wall.receiveShadow = true; R.add(wall);
      for (let cz = -30; cz <= 12; cz += 8.4) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 11, 0.65), lam2({ map: rep(stone("tunaCol", ["#9aa6b0", "#8d99a4", "#a7b2bc"]), 1, 3), color: "#c3ccd4" }));
        col.position.set(sd * 10.6, 5.5, cz); col.castShadow = true; col.receiveShadow = true; R.add(col);
      }
    }
    // far end wall (behind the platform) + the glowing price board
    const endWall = new THREE.Mesh(new THREE.PlaneGeometry(22.6, 11), lam2({ map: rep(wallTex(), 4, 2), color: "#bfc9d2" }));
    endWall.position.set(0, 5.5, -34.5); endWall.receiveShadow = true; R.add(endWall);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 2.65),
      new THREE.MeshBasicMaterial({ map: boardTex(), fog: false }));
    board.position.set(-0.5, 6.6, -34.3); board.layers.set(NOINK); R.add(board);
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(11.1, 3.1, 0.18), lam2({ color: "#2c3844" }));
    boardFrame.position.set(-0.5, 6.6, -34.44); R.add(boardFrame);
    // near end wall: dawn windows
    const winWall = new THREE.Mesh(new THREE.PlaneGeometry(22.6, 11),
      new THREE.MeshBasicMaterial({ map: windowTex(), fog: false }));
    winWall.position.set(0, 5.5, 16.2); winWall.rotation.y = Math.PI; winWall.layers.set(NOINK); R.add(winWall);
    // ---- ceiling: beams, lamp rows, skylight strips ----
    const beamMat = lam2({ map: beam(), color: "#7e8a94" });
    for (let cz = -32; cz <= 14; cz += 5.8) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.5, 0.35), beamMat);
      bm.position.set(0, 10.6, cz); R.add(bm);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(22.6, 52), lam2({ color: "#6e7a84", map: rep(stone("tunaCeil", ["#77828c", "#6e7a84", "#838f99"]), 8, 16) }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 11, -9); R.add(ceil);
    for (const lx of [-4.6, 4.6]) for (let lz = -29; lz <= 12; lz += 5.9) {
      const lampBox = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.55), lam2({ color: "#4a545e" }));
      lampBox.position.set(lx, 10.32, lz); R.add(lampBox);
      const lampFace = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.42),
        new THREE.MeshBasicMaterial({ color: "#eef6ff", fog: false }));
      lampFace.rotation.x = Math.PI / 2; lampFace.position.set(lx, 10.23, lz); lampFace.layers.set(NOINK); R.add(lampFace);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#cfe4ff", transparent: true, opacity: 0.16, depthWrite: false }));
      glow.position.set(lx, 9.7, lz); glow.scale.set(4.6, 2.0, 1); glow.layers.set(NOINK); R.add(glow);
    }
    // ---- nobori banners along the walls ----
    const banners: [string, string, number, number][] = [
      ["TOYOSU", "#2e6da8", -10.4, -18], ["2019", "#c0353a", 10.4, -18],
      ["TUNA", "#2e8b6e", -10.4, -2], ["ICHIBAN", "#bf8a12", 10.4, -2],
    ];
    for (const [word, bg, bx, bz] of banners) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 4.4), lam2({ map: bannerTex(word, bg), side: THREE.DoubleSide }));
      b.position.set(bx, 6.4, bz); b.rotation.y = bx < 0 ? 0.35 : -0.35; b.castShadow = true; R.add(b);
    }
    // ---- auction platform + podium + bell ----
    const plat = new THREE.Mesh(new THREE.BoxGeometry(11, 0.9, 4.6), lam2({ map: rep(planks(), 4, 2), color: "#cbb493" }));
    plat.position.set(0, 0.45, -29.4); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    const platSide = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.92, 0.3), lam2({ color: "#8a6d4a" }));
    platSide.position.set(0, 0.45, -27.05); R.add(platSide);
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.62), lam2({ map: beam(), color: "#a87f52" }));
    podium.position.set(0, 1.42, -30.2); podium.castShadow = true; R.add(podium);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.12, 12),
      twoTone(new THREE.MeshPhongMaterial({ color: "#d9a91f", specular: "#fff2c8", shininess: 70 })));
    bell.position.set(0.22, 2.02, -30.2); R.add(bell);
    // ---- THE HERO TUNA: centre stage on its ice pallet ----
    const heroTex = tunaTex("hero", 7);
    const hero = tunaStand(heroTex, 3.1, 0.30, 0.03);
    hero.position.set(0, 0, 2.0); R.add(hero); blob(R, 0, 0.012, 2.0, 4.6, 2.6, 0.5);
    // ---- the 2013 tuna: smaller, on its own pallet left of the aisle ----
    const old = tunaStand(tunaTex("old", 21), 2.35, -0.24, -0.05);
    old.position.set(-3.6, 0, -6); old.rotation.y = 0.95; R.add(old); blob(R, -3.6, 0.012, -6, 3.6, 2.2, 0.45);
    // ---- an ordinary-day tuna (shot 9's quiet lot) ----
    const plain = tunaStand(tunaTex("plain", 33), 1.8, 0.2, 0);
    plain.position.set(1.6, 0, -14); plain.rotation.y = -0.35; R.add(plain); blob(R, 1.6, 0.012, -14, 3.0, 1.9, 0.4);
    // ---- rows of frozen tuna along both walls ----
    const rowTexA = tunaTex("rowA", 11), rowTexB = tunaTex("rowB", 17);
    let ri = 0;
    for (const sd of [-1, 1]) for (let rz = -24; rz <= 9; rz += 5.4, ri++) {
      if (sd > 0 && rz > -8 && rz < -2) continue; // keep the scale corner clear
      const st = tunaStand(ri % 2 ? rowTexA : rowTexB, 2.0 + (ri % 3) * 0.22, (r() - 0.5) * 0.5, (r() - 0.5) * 0.14);
      st.position.set(sd * 6.6, 0, rz); st.rotation.y = sd > 0 ? Math.PI / 2 + (r() - 0.5) * 0.2 : -Math.PI / 2 + (r() - 0.5) * 0.2;
      // rows lie across the hall axis: rotate the stand so fish line the walls
      R.add(st); blob(R, sd * 6.6, 0.012, rz, 3.4, 2.4, 0.4);
    }
    // ---- the platform scale + gold bars (shot 7) ----
    {
      const sc = new THREE.Group();
      const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#9fb2c0", specular: "#dfeaf2", shininess: 55 }));
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.15), steel);
      base.position.y = 0.08; base.castShadow = true; base.receiveShadow = true; sc.add(base);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 10), steel);
      post.position.set(0, 0.72, -0.48); post.castShadow = true; sc.add(post);
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), lam2({ map: dialTex() }));
      dial.position.set(0, 1.42, -0.385); dial.rotation.x = -0.22; sc.add(dial);
      const dialBack = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 24), steel);
      dialBack.rotation.x = Math.PI / 2 - 0.22; dialBack.position.set(0, 1.42, -0.475); sc.add(dialBack);
      // a cut tuna steak on the platform
      const steak = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.15, 20),
        [lam2({ color: "#8e2a38" }), lam2({ map: meatTex() }), lam2({ color: "#8e2a38" })] as unknown as THREE.Material);
      steak.position.set(-0.18, 0.24, 0.12); steak.castShadow = true; sc.add(steak);
      // gold bars beside the steak
      const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#d9a91f", specular: "#fff2c8", shininess: 80 }));
      const barGeo = new THREE.BoxGeometry(0.36, 0.085, 0.17);
      const b1 = new THREE.Mesh(barGeo, gold); b1.position.set(0.28, 0.20, 0.18); b1.rotation.y = 0.4; b1.castShadow = true; sc.add(b1);
      const b2 = new THREE.Mesh(barGeo, gold); b2.position.set(0.30, 0.20, -0.05); b2.rotation.y = -0.25; b2.castShadow = true; sc.add(b2);
      const b3 = new THREE.Mesh(barGeo, gold); b3.position.set(0.29, 0.29, 0.06); b3.rotation.y = 0.1; b3.castShadow = true; sc.add(b3);
      sc.position.set(2.9, 0, -0.6); sc.rotation.y = -0.35;
      R.add(sc); blob(R, 2.9, 0.012, -0.6, 1.7, 1.5, 0.5);
    }
    // ---- styrofoam crate stacks along the walls ----
    const crateMat = lam2({ map: crateTex() });
    const crateGeo = new THREE.BoxGeometry(1.25, 0.34, 0.72);
    const stacks: [number, number, number][] = [[-9.9, -26, 3], [9.9, -24, 2], [-9.9, -12, 2], [9.9, -13, 3], [-9.9, 4, 2], [9.9, 6, 2], [-9.9, -32, 2], [9.9, -31, 3], [-9.9, 11, 3]];
    for (const [cx, cz, n] of stacks) {
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(crateGeo, crateMat);
        c.position.set(cx + (r() - 0.5) * 0.14, 0.17 + i * 0.35, cz + (r() - 0.5) * 0.14);
        c.rotation.y = (r() - 0.5) * 0.24; c.castShadow = true; c.receiveShadow = true; R.add(c);
      }
    }
    // ---- cold mist drifting low over the floor ----
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#dcebf8", transparent: true, opacity: 0.07, depthWrite: false }));
      const x0 = -7 + r() * 14;
      sp.position.set(x0, 0.55 + r() * 0.8, 10 - r() * 36);
      sp.scale.set(7 + r() * 5, 2.2 + r() * 1.2, 1); sp.layers.set(NOINK);
      this.mists.push({ sp, ph: r(), x0 }); R.add(sp);
    }
    // batched floor clutter: painted lane lines are in the floor texture; add
    // a few loose ice chunks near the hero pallet
    const b = new Batch();
    const iceMat = lam("tunaIceChunk", () => ({ map: rep(iceTex(), 1, 1) }));
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, d = 1.6 + r() * 1.3;
      b.add(new THREE.DodecahedronGeometry(0.04 + r() * 0.05, 0), iceMat,
        new THREE.Matrix4().makeTranslation(Math.cos(a) * d, 0.03, 2.0 + Math.sin(a) * d * 0.7));
    }
    b.build(R);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    // THIS FILM: bright cool hall light, key kept on the camera side so faces,
    // fish and facades stay lit and shadows fall away from the lens.
    v.z = Math.abs(v.z) * 0.9 + 0.3;
    v.y = Math.max(v.y, 0.55);
    v.normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tt = s.tau(t), L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.rim.position.set(focus.x - 55, focus.y + 34, focus.z - 75);
    this.rim.target.position.copy(focus);
    this.rim.intensity = 0.55;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- hall life: puddle glints breathing, cold mist drifting ----
    for (const g of this.glints) g.mat.opacity = 0.10 + 0.22 * (0.5 + 0.5 * Math.sin(tt * 2.1 + g.ph * 19));
    for (const m of this.mists) {
      m.sp.position.x = m.x0 + Math.sin(tt * 0.11 + m.ph * 23) * 2.2;
      (m.sp.material as THREE.SpriteMaterial).opacity = 0.05 + 0.03 * (0.5 + 0.5 * Math.sin(tt * 0.3 + m.ph * 31));
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true; // this film: cards cast real soft shadows too
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
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
