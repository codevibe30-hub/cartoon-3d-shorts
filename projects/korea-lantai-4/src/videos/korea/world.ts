// Korea's missing 4th floor as one three.js scene for the
// Fafnir-ID short: a bright modern Seoul tower LOBBY (polished
// stone floor, marble walls, a bank of three elevators), one
// GIANT freestanding button panel whose buttons run 6 5 F 3 2 1
// — no 4 — with the F ring pulsing from frame 0; the elevator
// CAR interior (zone B, x +60) whose indicator counts 1 2 3 F 5;
// and a hospital CORRIDOR (zone C, x -60) whose room doors read
// 401 402 403 405 — no 404 — with a ward elevator that jumps
// 3 straight to 5. Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, PANEL_POS, BANK_Z, CAR_C, CORR_C, clamp01, smooth } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
/** simple graded sky dome (seen only through corridor windows) */
const skyTexDay = () => ctex("koreaSky", 1024, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#2a66c8"); grad.addColorStop(0.55, "#79aeee"); grad.addColorStop(1, "#e9f2fb");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 26; i++) { // soft cloud smudges
    const x = r() * 1024, y = 60 + r() * 200, w = 60 + r() * 130;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,255,255,0.5)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.3); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.03})`; g.fillRect(r() * 1024, r() * 512, 2, 2); }
});
/** polished stone floor tiles: warm light grey, grout grid,
 *  speckle + soft sheen streaks — glossy, never flat */
const tileTex = (key: string, base: string, grout: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { // large soft value patches
    g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,86,80"},${0.03 + r() * 0.04})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 90, 20 + r() * 60, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "70,66,60"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 1.8, 1.8); }
  // diagonal sheen streaks (the gloss)
  for (let i = 0; i < 7; i++) {
    const x = r() * 512;
    const lg = g.createLinearGradient(x, 0, x + 90, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.10)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg; g.fillRect(x, 0, 90, 512);
  }
  g.strokeStyle = grout; g.lineWidth = 5;
  for (let i = 0; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * 256); g.lineTo(512, i * 256); g.stroke();
  }
});
/** marble wall panels: soft cream with wandering veins */
const marbleTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "150,138,120"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let v = 0; v < 9; v++) { // veins
    g.strokeStyle = `rgba(148,134,112,${0.07 + r() * 0.07})`; g.lineWidth = 1.0 + r() * 1.2;
    g.beginPath();
    let x = r() * 512, y = 0; g.moveTo(x, y);
    while (y < 512) { y += 30 + r() * 50; x += (r() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = "rgba(120,108,92,0.5)"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
  g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
});
/** brushed steel: dense vertical streaks, light over dark */
const steelTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,255,255" : "40,44,52"},${0.05 + r() * 0.09})`;
    g.lineWidth = 1 + r() * 1.4;
    g.beginPath(); g.moveTo(x, r() * 60); g.lineTo(x + (r() - 0.5) * 2, 200 + r() * 56); g.stroke();
  }
});
/** pale hospital plaster with a faint mint tint + speckle */
const plasterKorTex = () => ctex("koreaPlaster", 256, 256, (g, r) => {
  g.fillStyle = "#e8efe9"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 36; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "168,182,170"},${0.05 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 14 + r() * 40, 9 + r() * 24, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "140,155,142"},${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1.7, 1.7); }
});
/** one LED digit for the floor indicators: amber on near-black */
const digitTex = (ch: string) => ctex("koreaDigit" + ch, 128, 160, (g) => {
  g.fillStyle = "#14100a"; g.fillRect(0, 0, 128, 160);
  const gr = g.createRadialGradient(64, 80, 6, 64, 80, 90);
  gr.addColorStop(0, "rgba(255,176,32,0.25)"); gr.addColorStop(1, "rgba(255,176,32,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 160);
  g.fillStyle = "#ffb020"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 104px 'Arial Black', Arial, sans-serif";
  g.fillText(ch, 64, 86);
});
/** a room-number plaque: dark board, pale digits */
const doorNumTex = (num: string) => ctex("koreaDoor" + num, 160, 112, (g) => {
  g.fillStyle = "#2c3242"; g.fillRect(0, 0, 160, 112);
  g.strokeStyle = "#c8b98a"; g.lineWidth = 5; g.strokeRect(7, 7, 146, 98);
  g.fillStyle = "#f2ecd8"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 58px 'Arial Black', Arial, sans-serif";
  g.fillText(num, 80, 60);
});
/** THE GIANT PANEL face (512x1024 -> 1.3m x 2.6m): dark brushed
 *  steel, a header strip, and ONE column of big round buttons:
 *  6, 5, F, 3, 2, 1 — the F ring painted amber. Button centres
 *  (canvas y): 6:206, 5:346, F:486, 3:626, 2:766, 1:906. */
const panelTex = () => ctex("koreaPanel", 512, 1024, (g, r) => {
  g.fillStyle = "#33383f"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 2400; i++) {
    const x = r() * 512;
    g.strokeStyle = `rgba(${r() > 0.45 ? "255,255,255" : "10,12,16"},${0.04 + r() * 0.07})`;
    g.lineWidth = 1 + r() * 1.3;
    g.beginPath(); g.moveTo(x, r() * 120); g.lineTo(x, 900 + r() * 124); g.stroke();
  }
  // header strip + title bars (abstract directory lines)
  g.fillStyle = "#22262c"; g.fillRect(36, 30, 440, 96);
  g.strokeStyle = "#c8b98a"; g.lineWidth = 4; g.strokeRect(36, 30, 440, 96);
  g.fillStyle = "#e8e2d2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 52px 'Arial Black', Arial, sans-serif";
  g.fillText("ELEVATOR", 256, 80);
  const rows: [string, number][] = [["6", 206], ["5", 346], ["F", 486], ["3", 626], ["2", 766], ["1", 906]];
  for (const [ch, y] of rows) {
    const isF = ch === "F";
    // button well + ring
    g.fillStyle = "#191c20"; g.beginPath(); g.arc(256, y, 66, 0, 7); g.fill();
    g.strokeStyle = isF ? "#ffb020" : "#9aa2ac"; g.lineWidth = isF ? 10 : 6;
    g.beginPath(); g.arc(256, y, 60, 0, 7); g.stroke();
    // glossy button face
    const bg = g.createRadialGradient(238, y - 18, 6, 256, y, 58);
    bg.addColorStop(0, isF ? "#ffd97a" : "#d7dce2"); bg.addColorStop(1, isF ? "#e79a12" : "#878e98");
    g.fillStyle = bg; g.beginPath(); g.arc(256, y, 52, 0, 7); g.fill();
    g.fillStyle = isF ? "#3a2402" : "#22262c";
    g.font = "900 62px 'Arial Black', Arial, sans-serif";
    g.fillText(ch, 256, y + 3);
  }
});
/** the small car panel (256x512): two columns of buttons */
const carPanelTex = () => ctex("koreaCarPanel", 256, 512, (g, r) => {
  g.fillStyle = "#2e3238"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,12,16"},${0.04 + r() * 0.06})`; g.fillRect(r() * 256, r() * 512, 1.6, 1.6); }
  const cells: [string, number, number][] = [["5", 64, 108], ["6", 192, 108], ["3", 64, 236], ["F", 192, 236], ["1", 64, 364], ["2", 192, 364]];
  for (const [ch, x, y] of cells) {
    const isF = ch === "F";
    g.fillStyle = "#17191d"; g.beginPath(); g.arc(x, y, 42, 0, 7); g.fill();
    g.strokeStyle = isF ? "#ffb020" : "#9aa2ac"; g.lineWidth = isF ? 7 : 4;
    g.beginPath(); g.arc(x, y, 38, 0, 7); g.stroke();
    const bg = g.createRadialGradient(x - 10, y - 10, 4, x, y, 36);
    bg.addColorStop(0, isF ? "#ffd97a" : "#d7dce2"); bg.addColorStop(1, isF ? "#e79a12" : "#878e98");
    g.fillStyle = bg; g.beginPath(); g.arc(x, y, 33, 0, 7); g.fill();
    g.fillStyle = isF ? "#3a2402" : "#22262c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "900 40px 'Arial Black', Arial, sans-serif";
    g.fillText(ch, x, y + 2);
  }
  g.fillStyle = "#e8e2d2"; g.font = "900 30px 'Arial Black', Arial, sans-serif";
  g.fillText("FLOOR", 128, 34);
});
/** the wide header sign over the elevator bank */
const signTex = () => ctex("koreaSign", 1024, 128, (g) => {
  g.fillStyle = "#1d2733"; g.fillRect(0, 0, 1024, 128);
  g.strokeStyle = "#c8b98a"; g.lineWidth = 5; g.strokeRect(8, 8, 1008, 112);
  g.fillStyle = "#e8e2d2"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 62px 'Arial Black', Arial, sans-serif";
  g.fillText("E L E V A T O R", 512, 66);
});
/** lobby directory board: dark glass, pale abstract lines */
const directoryTex = () => ctex("koreaDirectory", 512, 640, (g, r) => {
  g.fillStyle = "#1d2733"; g.fillRect(0, 0, 512, 640);
  const gr = g.createLinearGradient(0, 0, 512, 640);
  gr.addColorStop(0, "rgba(255,255,255,0.13)"); gr.addColorStop(0.4, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  g.fillStyle = "#e8e2d2"; g.textAlign = "left"; g.textBaseline = "middle";
  g.font = "900 44px 'Arial Black', Arial, sans-serif";
  g.fillText("DIRECTORY", 36, 52);
  for (let row = 0; row < 9; row++) {
    const y = 118 + row * 56;
    g.fillStyle = row % 3 === 0 ? "#ffb020" : "#8fa2b5";
    g.fillRect(36, y - 11, 52, 22);
    g.fillStyle = "rgba(232,238,244,0.75)";
    g.fillRect(108, y - 8, 200 + (row % 4) * 42, 16);
  }
});
const blobTex = () => ctex("koreaBlob", 256, 256, (g) => {
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

type LiftUnit = { doorL: THREE.Mesh; doorR: THREE.Mesh; ind: THREE.Mesh };
/** One elevator door unit: marble frame, two brushed-steel
 *  leaves that slide apart, an LED indicator above the doors.
 *  Front faces +Z at local origin; width 2.2, height 3.1. */
const makeLiftUnit = (digitMats: Record<string, THREE.MeshBasicMaterial>): LiftUnit => {
  const g = new THREE.Group();
  const frameM = lam2({ map: rep(marbleTex("koreaMarbleB", "#ddd5c4"), 1, 1), color: "#cfc6b2" });
  const steelM = lam2({ map: rep(steelTex("koreaSteelA", "#b9bfc7"), 1, 2) });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.3, 0.3), frameM);
  frame.position.set(0, 1.65, -0.1); frame.receiveShadow = true; g.add(frame);
  const dark = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.75, 0.1), lam2({ color: "#14161a" }));
  dark.position.set(0, 1.38, 0.02); g.add(dark);
  const mkLeaf = (side: number) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.94, 2.72, 0.09), steelM);
    leaf.position.set(side * 0.475, 1.37, 0.09); leaf.castShadow = false; leaf.receiveShadow = true; g.add(leaf);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 0.02), lam2({ color: "#7d838d" }));
    seam.position.set(side * 0.475 - side * 0.4, 1.37, 0.145); g.add(seam);
    seam.userData.isSeam = true;
    return leaf;
  };
  const doorL = mkLeaf(-1), doorR = mkLeaf(1);
  // indicator housing + LED digit above the doors
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.44, 0.12), lam2({ color: "#22262c" }));
  housing.position.set(0, 3.02, 0.08); g.add(housing);
  const ind = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), digitMats["1"]);
  ind.position.set(-0.18, 3.02, 0.145); g.add(ind);
  // a small amber triangle lamp beside the digit
  const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 3),
    new THREE.MeshBasicMaterial({ color: "#ffb020", transparent: true, opacity: 0.9 }));
  arrow.position.set(0.28, 3.02, 0.145); g.add(arrow);
  return { doorL, doorR, ind };
};
const setDoors = (u: LiftUnit, openK: number) => {
  u.doorL.position.x = -0.475 - openK * 0.88;
  u.doorR.position.x = 0.475 + openK * 0.88;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private digitMats: Record<string, THREE.MeshBasicMaterial> = {};
  private bankUnits: LiftUnit[] = [];
  private carUnit: LiftUnit;
  private corrUnit: LiftUnit;
  private panelRing!: THREE.Mesh;
  private panelRingMat!: THREE.MeshBasicMaterial;
  private panelDisp!: THREE.Mesh;
  private carFDotMat!: THREE.MeshBasicMaterial;
  private ceilMats: THREE.MeshBasicMaterial[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(4242);
    for (const ch of ["1", "2", "3", "F", "5", "6"]) {
      this.digitMats[ch] = new THREE.MeshBasicMaterial({ map: digitTex(ch) });
    }
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#e8f0ff", "#9a8a72", 0.6);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.4);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome (windows only) ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.buildLobby(R, r);
    this.carUnit = this.buildCar(R);
    this.corrUnit = this.buildCorridor(R, r);
  }

  // ---------------- Zone A: the lobby ----------------
  private buildLobby(R: THREE.Group, r: () => number) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 36), lam2({ map: rep(tileTex("koreaTileA", "#cfc9bd", "#a39a86"), 10, 9) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -4); floor.receiveShadow = true; R.add(floor);
    const wallM = lam2({ map: rep(marbleTex("koreaMarbleA", "#e6dfd0"), 8, 2) });
    const back = new THREE.Mesh(new THREE.BoxGeometry(42, 9, 0.4), wallM);
    back.position.set(0, 4.5, BANK_Z - 0.5); back.receiveShadow = true; R.add(back);
    for (const s of [1, -1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 36), wallM);
      side.position.set(s * 18, 4.5, -4); side.receiveShadow = true; R.add(side);
      // a tall window band on each side wall: daylight gradient + mullions
      const win = new THREE.Mesh(new THREE.PlaneGeometry(20, 4.6),
        new THREE.MeshBasicMaterial({ map: skyTexDay() }));
      win.position.set(s * 17.75, 4.4, -6); win.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; R.add(win);
      for (let i = 0; i < 6; i++) {
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 0.12), lam2({ color: "#5a6068" }));
        mull.position.set(s * 17.7, 4.4, -14 + i * 3.4); R.add(mull);
      }
    }
    // ceiling + light panels (one flickers almost imperceptibly)
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(42, 0.3, 36), lam2({ color: "#dcd6c8" }));
    ceil.position.set(0, 7.6, -4); R.add(ceil);
    for (let ix = -2; ix <= 2; ix++) for (let iz = 0; iz < 4; iz++) {
      const cm = new THREE.MeshBasicMaterial({ color: "#fff6e2" });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), cm);
      panel.rotation.x = Math.PI / 2; panel.position.set(ix * 7, 7.42, 6 - iz * 7);
      R.add(panel); this.ceilMats.push(cm);
    }
    // marble columns flanking the hall
    for (const s of [1, -1]) for (const z of [-6, 2]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 7.5, 14), lam2({ map: rep(marbleTex("koreaMarbleC", "#ded4c0"), 2, 2) }));
      col.position.set(s * 9.5, 3.75, z); col.castShadow = true; col.receiveShadow = true; R.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), lam2({ color: "#c8b98a" }));
      cap.position.set(s * 9.5, 7.35, z); R.add(cap);
    }
    // the elevator bank: three units on the back wall (addBank)
    this.addBank(R);
    // header sign over the bank
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.7),
      new THREE.MeshBasicMaterial({ map: signTex() }));
    sign.position.set(0, 6.1, BANK_Z - 0.24); R.add(sign);
    // directory board on the right wall + a bench + planters
    const dir = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.1), new THREE.MeshBasicMaterial({ map: directoryTex() }));
    dir.position.set(17.7, 2.2, 2); dir.rotation.y = -Math.PI / 2; R.add(dir);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.9), lam2({ map: rep(steelTex("koreaSteelB", "#8f959e"), 2, 1) }));
    bench.position.set(-6.5, 0.35, 4.5); bench.castShadow = true; R.add(bench);
    const leafM = lam2({ color: "#3e7d31", map: rep(tileTex("koreaLeaf", "#4c8433", "#3d6b28"), 2, 2) });
    for (const [px, pz] of [[-11, -10], [11, -10], [-13, 5], [13, 5]] as [number, number][]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.8, 10), lam2({ color: "#6a4a2c" }));
      pot.position.set(px, 0.4, pz); pot.castShadow = true; R.add(pot);
      for (let i = 0; i < 3; i++) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.25, 9, 7), leafM);
        bush.position.set(px + (r() - 0.5) * 0.5, 1.1 + i * 0.28, pz + (r() - 0.5) * 0.5);
        bush.castShadow = true; R.add(bush);
      }
    }
    // ---- THE GIANT BUTTON PANEL (the cover subject) ----
    const pg = new THREE.Group();
    pg.position.set(PANEL_POS[0], 0, PANEL_POS[2]); pg.rotation.y = -0.18;
    const standB = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.9), lam2({ color: "#22262c" }));
    standB.position.y = 0.09; standB.castShadow = true; pg.add(standB);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.3), lam2({ color: "#2b2f36" }));
    post.position.set(0, 0.32, -0.28); pg.add(post);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.6, 0.16), lam2({ map: rep(steelTex("koreaSteelC", "#3a4046"), 1, 2) }));
    box.position.y = 1.7; box.castShadow = true; pg.add(box);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), new THREE.MeshBasicMaterial({ map: panelTex() }));
    face.position.set(0, 1.7, 0.085); pg.add(face);
    // the F ring: a glowing torus that PULSES from frame 0
    this.panelRingMat = new THREE.MeshBasicMaterial({ color: "#ffb020", transparent: true, opacity: 0.9 });
    this.panelRing = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.02, 10, 40), this.panelRingMat);
    // F button centre on the face: canvas y 486/1024 -> local y = 1.62 + (0.5 - 486/1024) * 2.6
    this.panelRing.position.set(0, 1.7 + (0.5 - 486 / 1024) * 2.6, 0.1);
    pg.add(this.panelRing);
    // the little floor display at the panel's top
    this.panelDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), this.digitMats["3"]);
    this.panelDisp.position.set(0, 3.2, 0.09); pg.add(this.panelDisp);
    const dispFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.06), lam2({ color: "#22262c" }));
    dispFrame.position.set(0, 3.2, 0.05); pg.add(dispFrame);
    R.add(pg);
    blob(R, PANEL_POS[0], 0.02, PANEL_POS[2] + 0.4, 2.2, 1.6, 0.4);
  }

  private addBank(R: THREE.Group) {
    // makeLiftUnit returns loose parts; wrap each unit in a group.
    this.bankUnits = [];
    for (const x of [-7, 0, 7]) {
      const u = makeLiftUnit(this.digitMats);
      const grp = new THREE.Group();
      // collect the parts makeLiftUnit added to its internal group:
      // it returns only doorL/doorR/ind, whose parent is that group.
      const inner = u.doorL.parent as THREE.Group;
      grp.add(inner);
      grp.position.set(x, 0, BANK_Z - 0.2);
      R.add(grp);
      this.bankUnits.push(u);
    }
  }

  // ---------------- Zone B: the elevator car ----------------
  private buildCar(R: THREE.Group): LiftUnit {
    const cx = CAR_C[0];
    const g = new THREE.Group(); R.add(g);
    const steelM = lam2({ map: rep(steelTex("koreaSteelD", "#aeb4bc"), 2, 2) });
    const floorC = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 3.6), lam2({ color: "#3a3f47", map: rep(tileTex("koreaTileCar", "#4a4f57", "#33373d"), 3, 3) }));
    floorC.position.set(cx, -0.05, 0); floorC.receiveShadow = true; g.add(floorC);
    for (const s of [1, -1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 3.6), steelM);
      wall.position.set(cx + s * 1.72, 1.5, 0); wall.receiveShadow = true; g.add(wall);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 8), lam2({ color: "#d8b25e" }));
      rail.rotation.x = Math.PI / 2; rail.position.set(cx + s * 1.64, 1.0, 0); g.add(rail);
    }
    const backW = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.1), steelM);
    backW.position.set(cx, 1.5, 1.82); g.add(backW);
    const ceilC = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 3.6), lam2({ color: "#e8e4da" }));
    ceilC.position.set(cx, 3.0, 0); g.add(ceilC);
    const lightC = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ color: "#fff6e2" }));
    lightC.rotation.x = Math.PI / 2; lightC.position.set(cx, 2.95, 0); g.add(lightC);
    // front wall + doors + indicator (a lift unit facing +Z)
    const frontW = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.1), steelM);
    frontW.position.set(cx, 1.5, -1.88); g.add(frontW);
    const u = makeLiftUnit(this.digitMats);
    const inner = u.doorL.parent as THREE.Group;
    inner.position.set(cx, 0.02, -1.72); inner.scale.setScalar(0.95);
    g.add(inner);
    // the in-car button panel on the +X wall
    const cp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.4), lam2({ color: "#2b2f36" }));
    cp.position.set(cx + 1.66, 1.35, -0.6); g.add(cp);
    const cpf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.15), new THREE.MeshBasicMaterial({ map: carPanelTex() }));
    cpf.rotation.y = -Math.PI / 2; cpf.position.set(cx + 1.615, 1.35, -0.6); g.add(cpf);
    // F dot on the car panel (canvas F centre: x 192/256, y 236/512 of the 0.4x1.15 face)
    this.carFDotMat = new THREE.MeshBasicMaterial({ color: "#ffb020", transparent: true, opacity: 0.85 });
    const fdot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), this.carFDotMat);
    fdot.rotation.y = -Math.PI / 2;
    fdot.position.set(cx + 1.61, 1.35 + (0.5 - 236 / 512) * 1.15, -0.6 + (192 / 256 - 0.5) * 0.4);
    g.add(fdot);
    return u;
  }

  // ---------------- Zone C: the hospital corridor ----------------
  private buildCorridor(R: THREE.Group, r: () => number): LiftUnit {
    const cx = CORR_C[0];
    const g = new THREE.Group(); R.add(g);
    const floorH = new THREE.Mesh(new THREE.PlaneGeometry(7, 32), lam2({ map: rep(tileTex("koreaTileH", "#d8dcd2", "#b2b8aa"), 3, 14) }));
    floorH.rotation.x = -Math.PI / 2; floorH.position.set(cx, 0, -2); floorH.receiveShadow = true; g.add(floorH);
    const wallH = lam2({ map: rep(plasterKorTex(), 10, 2) });
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 32), wallH);
      w.position.set(cx + s * 3.3, 2.2, -2); w.receiveShadow = true; g.add(w);
      // handrail along both walls
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 30, 8), lam2({ color: "#b08954" }));
      rail.rotation.x = Math.PI / 2; rail.position.set(cx + s * 3.1, 0.95, -2); g.add(rail);
    }
    const ceilH = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 32), lam2({ color: "#eef0ea" }));
    ceilH.position.set(cx, 4.4, -2); g.add(ceilH);
    for (let i = 0; i < 5; i++) {
      const lp2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), new THREE.MeshBasicMaterial({ color: "#fdfdf6" }));
      lp2.rotation.x = Math.PI / 2; lp2.position.set(cx, 4.26, 8 - i * 6); g.add(lp2);
    }
    // room doors on the west wall: 401, 402, 403, [gap], 405
    const doorM = lam2({ color: "#7a8a99", map: rep(steelTex("koreaSteelE", "#93a3b1"), 1, 2) });
    const doorAt = (num: string | null, z: number) => {
      if (num) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 1.25), doorM);
        door.position.set(cx - 3.12, 1.18, z); door.receiveShadow = true; g.add(door);
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), new THREE.MeshBasicMaterial({ map: doorNumTex(num) }));
        plate.rotation.y = Math.PI / 2; plate.position.set(cx - 3.04, 2.62, z); g.add(plate);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
        knob.position.set(cx - 3.02, 1.05, z + 0.45); g.add(knob);
      } else {
        // the 404 gap: a blank plate outline and nothing else
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44),
          new THREE.MeshBasicMaterial({ color: "#39404c" }));
        plate.rotation.y = Math.PI / 2; plate.position.set(cx - 3.04, 2.62, z); g.add(plate);
      }
    };
    doorAt("401", 4.5); doorAt("402", 1.5); doorAt("403", -1.5); doorAt(null, -4.5); doorAt("405", -7.5);
    // a window with daylight at the near end of the east wall
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshBasicMaterial({ map: skyTexDay() }));
    win.rotation.y = -Math.PI / 2; win.position.set(cx + 3.12, 2.4, 6); g.add(win);
    // the ward elevator at the far end + red cross sign above it
    const u = makeLiftUnit(this.digitMats);
    const inner = u.doorL.parent as THREE.Group;
    inner.position.set(cx, 0, -12.6);
    g.add(inner);
    const endW = new THREE.Mesh(new THREE.BoxGeometry(7, 4.4, 0.3), wallH);
    endW.position.set(cx, 2.2, -13.4); g.add(endW);
    const crossBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), lam2({ color: "#f4f6f4" }));
    crossBase.position.set(cx, 3.7, -12.9); g.add(crossBase);
    const cV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.05), new THREE.MeshBasicMaterial({ color: "#d42f2f" }));
    cV.position.set(cx, 3.7, -12.83); g.add(cV);
    const cH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: "#d42f2f" }));
    cH.position.set(cx, 3.7, -12.83); g.add(cH);
    void r;
    return u;
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
    // ---------------- STANDAR GERAK: the building is alive ----------------
    const U = clamp01((f - s.a) / Math.max(1, s.b - s.a)); // shot-local progress
    const pulse = 0.5 + 0.5 * Math.sin(tt * 6.5);
    // the F ring on the giant panel pulses — already moving at frame 0
    if (this.panelRing) {
      const k = 1 + 0.08 * Math.sin(tt * 6.5);
      this.panelRing.scale.set(k, k, 1);
      this.panelRingMat.opacity = 0.55 + 0.45 * pulse;
    }
    if (this.carFDotMat) this.carFDotMat.opacity = 0.55 + 0.45 * pulse;
    // one ceiling panel breathes almost imperceptibly (a lived-in building)
    if (this.ceilMats[3]) this.ceilMats[3].color.setScalar(0.97 + 0.03 * Math.sin(tt * 23)).multiply(new THREE.Color("#fff6e2"));
    const cyc = (seq: string[], per: number) => seq[Math.min(seq.length - 1, Math.floor(tt / per) % seq.length)];
    // ---- per-shot machinery ----
    const bankMid = this.bankUnits[1];
    if (id === 1 || id === 4 || id === 5 || id === 8) {
      // panel display cycles 3 -> F -> 5 the whole time
      if (this.panelDisp) this.panelDisp.material = this.digitMats[cyc(["3", "F", "5"], 0.85)];
      if (bankMid) { bankMid.ind.material = this.digitMats["3"]; setDoors(bankMid, 0); }
    } else if (id === 2) {
      // the middle lift arrives: doors open, a resident steps out (cast), doors close
      const openK = smooth(U / 0.18) * (1 - smooth((U - 0.55) / 0.2));
      if (bankMid) {
        setDoors(bankMid, openK);
        bankMid.ind.material = this.digitMats[cyc(["1", "2", "3", "5"], 1.4)];
      }
      if (this.panelDisp) this.panelDisp.material = this.digitMats[cyc(["3", "F", "5"], 0.85)];
    } else if (id === 3) {
      // riding up: doors close, then the indicator counts 1 2 3 F 5
      const openK = 1 - smooth(U / 0.14);
      setDoors(this.carUnit, openK * 0.9 + (U > 0.93 ? smooth((U - 0.93) / 0.07) * 0.5 : 0));
      const seq = ["1", "2", "3", "F", "5"];
      const idx = Math.min(4, Math.floor(clamp01((U - 0.12) / 0.8) * 5));
      this.carUnit.ind.material = this.digitMats[U < 0.12 ? "1" : seq[idx]];
    } else if (id === 10) {
      // the loop ride: 3 -> F -> 5, then the doors open on the laugh
      const seq = ["3", "F", "5"];
      const idx = Math.min(2, Math.floor(clamp01((U - 0.08) / 0.6) * 3));
      this.carUnit.ind.material = this.digitMats[seq[idx]];
      setDoors(this.carUnit, smooth((U - 0.74) / 0.2));
    } else if (id === 6) {
      // the ward elevator: 3 ... then straight to 5. It never shows F, never mind 4.
      this.corrUnit.ind.material = this.digitMats[U < 0.5 ? "3" : "5"];
      setDoors(this.corrUnit, 0);
    } else if (id === 9) {
      if (bankMid) { bankMid.ind.material = this.digitMats["5"]; setDoors(bankMid, smooth((U - 0.55) / 0.25)); }
      if (this.panelDisp) this.panelDisp.material = this.digitMats["5"];
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
