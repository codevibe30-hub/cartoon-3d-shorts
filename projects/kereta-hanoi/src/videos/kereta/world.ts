// The Kereta Hanoi film as one three.js scene: Hanoi Train Street — a
// single active railway track down the middle of a narrow residential
// alley. Colourful shophouses stand hard against the rails on both sides
// (faces at |x| = WALL_X), their ground floors spilling into cafés: tiny
// plastic stools, round tables, chalkboard timetables, hanging signs,
// laundry lines and lantern strings overhead. Between the sleeper edge
// and the walls there is less than a metre — and several times a day a
// full-size train (blue diesel loco + three green coaches) squeezes
// through it. When the horn sounds the alley clears: tables, stools, the
// motorbike and the laundry all slide to the walls (clearK), the train
// passes, and life flows back onto the rails.
// VISUAL CORE: bright cool daylight in a canyon of painted facades,
// textured everything (anti-banding: speckled sky, painted concrete,
// noise-flecked ballast). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, WALL_X, TRAIN_LEN,
  trainFront, trainInAlley, clearK, barrierK, BARRIER_Z,
} from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const concreteTex = () => ctex("keretaConcrete", 512, 512, (g, r) => {
  g.fillStyle = "#9b968c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "226,220,206" : "40,38,34"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,56,48,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 14 + r() * 60, 8 + r() * 30, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(52,50,46,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 7; i++) { g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
});
const ballastTex = () => ctex("keretaBallast", 512, 512, (g, r) => {
  g.fillStyle = "#57514a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const c = ["#6e675e", "#4a453f", "#7d766c", "#3e3a35", "#8a8378"][Math.floor(r() * 5)];
    g.fillStyle = c; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "210,204,190" : "16,14,12"},${0.05 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const plasterTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "30,26,22"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(70,60,44,${0.04 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 46, 6 + r() * 22, r() * 3, 0, 7); g.fill(); }
});
const corrugTex = (key: string, base: string, dark: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = dark; g.fillRect(x, 0, 5, 256); g.fillStyle = "rgba(255,255,255,0.20)"; g.fillRect(x + 7, 0, 3, 256); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(40,30,20,${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
/** a shophouse facade: painted wall, shuttered windows, door or shopfront */
const facadeTex = (key: string, wall: string, shutter: string, floors: number, shop: boolean, seed: number) =>
  ctex(key, 512, 1024, (g, r) => {
    g.fillStyle = wall; g.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "30,26,22"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 1024, 2.4, 2.4); }
    // grime rising from the street
    const gr = g.createLinearGradient(0, 1024, 0, 700);
    gr.addColorStop(0, "rgba(48,42,34,0.34)"); gr.addColorStop(1, "rgba(48,42,34,0)");
    g.fillStyle = gr; g.fillRect(0, 700, 512, 324);
    const win = (x: number, y: number, w: number, h: number, open: boolean) => {
      g.fillStyle = "#efe8d8"; g.fillRect(x - 7, y - 7, w + 14, h + 14);
      g.fillStyle = "#22384a"; g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(150,190,220,0.5)"; g.beginPath(); g.moveTo(x + 6, y + h - 8); g.lineTo(x + w * 0.55, y + 6); g.lineTo(x + w * 0.8, y + 6); g.lineTo(x + w * 0.3, y + h - 8); g.fill();
      g.fillStyle = "#efe8d8"; g.fillRect(x + w / 2 - 3, y, 6, h);
      if (open) { g.fillStyle = shutter; g.fillRect(x - 40, y - 4, 34, h + 8); g.fillRect(x + w + 6, y - 4, 34, h + 8); }
      else { g.fillStyle = shutter; g.fillRect(x, y, w / 2 - 2, h); g.fillRect(x + w / 2 + 2, y, w / 2 - 2, h); g.fillStyle = "rgba(0,0,0,0.25)"; for (let sx = x + 6; sx < x + w - 6; sx += 12) g.fillRect(sx, y + 6, 3, h - 12); }
      g.fillStyle = "#f4efe2"; g.fillRect(x - 10, y + h + 7, w + 20, 9);
    };
    for (let f = 0; f < floors; f++) {
      const y = 92 + f * 218;
      win(84, y, 96, 128, (f + seed) % 2 === 0);
      win(332, y, 96, 128, (f + seed) % 3 !== 0);
      if ((f + seed) % 2 === 0) { // balcony railing hint under the left window
        g.strokeStyle = "rgba(30,30,34,0.65)"; g.lineWidth = 5;
        for (let bx = 66; bx <= 200; bx += 16) { g.beginPath(); g.moveTo(bx, y + 152); g.lineTo(bx, y + 196); g.stroke(); }
        g.beginPath(); g.moveTo(62, y + 150); g.lineTo(204, y + 150); g.stroke();
      }
    }
    if (shop) {
      g.fillStyle = "#241a12"; g.fillRect(56, 756, 400, 268);
      g.fillStyle = "rgba(120,90,60,0.55)"; g.fillRect(56, 756, 400, 16);
      g.fillStyle = "#171008"; g.fillRect(76, 800, 160, 224); g.fillRect(276, 800, 160, 224);
      g.fillStyle = "rgba(255,214,140,0.20)"; g.fillRect(86, 812, 140, 90); g.fillRect(286, 812, 140, 90);
    } else {
      g.fillStyle = "#4a3220"; g.fillRect(196, 800, 120, 224);
      g.fillStyle = "#5d4028"; g.fillRect(206, 812, 100, 100); g.fillRect(206, 926, 100, 88);
      g.fillStyle = "#d8b93a"; g.beginPath(); g.arc(300, 922, 7, 0, 7); g.fill();
      win(64, 790, 76, 110, true); win(372, 790, 76, 110, false);
    }
    void seed;
  });
const signTex = (key: string, bg: string, fg: string, text: string) => ctex(key, 512, 128, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, 492, 108);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "900 62px 'Arial Black', Arial, sans-serif";
  g.fillText(text, 256, 68);
});
const boardTex = () => ctex("keretaBoard", 512, 640, (g, r) => {
  g.fillStyle = "#20291f"; g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(240,244,230,${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 640, 3, 3); }
  g.fillStyle = "#f2f0dc"; g.textAlign = "center";
  g.font = "900 74px 'Comic Sans MS', 'Segoe Print', cursive";
  g.fillText("GIỜ TÀU", 256, 96);
  g.fillRect(96, 128, 320, 6);
  g.font = "700 62px 'Comic Sans MS', 'Segoe Print', cursive";
  const rows = ["06:00   09:15", "11:20   15:20", "17:30   19:00", "22:00"];
  rows.forEach((row, i) => g.fillText(row, 256 + (r() - 0.5) * 8, 226 + i * 104));
});
const carSideTex = () => ctex("keretaCarSide", 1024, 256, (g, r) => {
  g.fillStyle = "#2e6e4e"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#e8e2cc"; g.fillRect(0, 18, 1024, 40);
  g.fillStyle = "#256040"; g.fillRect(0, 208, 1024, 48);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,246" : "8,20,12"},${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  for (let i = 0; i < 7; i++) {
    const x = 52 + i * 128;
    g.fillStyle = "#e8e2cc"; g.fillRect(x - 6, 84, 104, 92);
    g.fillStyle = "#1d2b38"; g.fillRect(x, 90, 92, 80);
    g.fillStyle = "rgba(150,190,220,0.45)"; g.beginPath(); g.moveTo(x + 6, 164); g.lineTo(x + 52, 94); g.lineTo(x + 74, 94); g.lineTo(x + 30, 164); g.fill();
  }
  g.fillStyle = "#1d2b38"; g.fillRect(958, 74, 52, 134);
  g.fillStyle = "#e8e2cc"; g.fillRect(958, 74, 52, 10);
});
const stripeTex = () => ctex("keretaStripe", 256, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#e8e4da" : "#c8352c"; g.fillRect(i * 32, 0, 32, 64); }
});
const glowTex = () => ctex("keretaGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.4, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("keretaBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("keretaSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#9dc2ec"); grad.addColorStop(1, "#c4daf2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** one shophouse: mass box + detailed facade plane + parapet + extras */
const makeHouse = (
  parent: THREE.Object3D, r: () => number, side: 1 | -1, z0: number, w: number,
  spec: { wall: string; shutter: string; h: number; floors: number; shop: boolean; seed: number },
) => {
  const grp = new THREE.Group();
  const faceX = side * WALL_X;
  const cx = side * (WALL_X + 2.1);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, spec.h, w),
    lam2({ map: rep(plasterTex(`keretaPlaster${spec.wall}`, spec.wall), 1, 1), color: "#cfc8bc" }));
  body.position.set(cx, spec.h / 2, z0 + w / 2);
  body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, spec.h),
    lam2({ map: facadeTex(`keretaFacade${spec.wall}${spec.shutter}${spec.floors}${spec.shop ? "S" : "H"}${spec.seed}`, spec.wall, spec.shutter, spec.floors, spec.shop, spec.seed) }));
  face.position.set(faceX - side * 0.02, spec.h / 2, z0 + w / 2);
  face.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  face.receiveShadow = true; grp.add(face);
  // parapet + a roof slab set back (reads from the high shot)
  const par = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, w + 0.15),
    lam2({ color: "#8a7a68", map: rep(stone(), 2, 1) }));
  par.position.set(cx, spec.h + 0.17, z0 + w / 2); par.castShadow = true; grp.add(par);
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, w - 0.5),
    lam2({ map: rep(corrugTex(`keretaRoof${spec.seed % 3}`, ["#a0552f", "#7a6a58", "#5d7a72"][spec.seed % 3], "rgba(30,20,14,0.35)"), 3, 3) }));
  roofSlab.position.set(cx, spec.h + 0.4, z0 + w / 2); grp.add(roofSlab);
  // a balcony slab on one upper floor for some houses
  if (spec.seed % 2 === 0 && spec.h > 8) {
    const bal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 2.6), lam2({ color: "#b9b0a0", map: rep(stone(), 1, 1) }));
    bal.position.set(faceX - side * 0.5, 3.3, z0 + w * 0.32); bal.castShadow = true; grp.add(bal);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 2.6), lam2({ color: "#2c2e33" }));
    rail.position.set(faceX - side * 0.98, 3.6, z0 + w * 0.32); grp.add(rail);
  }
  // AC unit on some walls
  if (spec.seed % 3 === 0) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.8), lam2({ color: "#c9cdd2", map: rep(plasterTex("keretaAC", "#c9cdd2"), 1, 1) }));
    ac.position.set(faceX - side * 0.2, 4.6 + (spec.seed % 3), z0 + w * 0.68); ac.castShadow = true; grp.add(ac);
  }
  parent.add(grp);
  return grp;
};
/** café table set: round table + 2 plastic stools + a cup */
const makeTableSet = (r: () => number, plastic: string) => {
  const grp = new THREE.Group();
  const pMat = lam2({ color: plastic });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14), pMat);
  top.position.y = 0.56; top.castShadow = true; grp.add(top);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.54, 8), lam2({ color: "#3c4046" }));
  pole.position.y = 0.28; grp.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.05, 12), lam2({ color: "#3c4046" }));
  base.position.y = 0.03; grp.add(base);
  for (const a of [0.5, 2.6]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.34, 10), pMat);
    st.position.set(Math.cos(a) * 0.62, 0.17, Math.sin(a) * 0.62); st.castShadow = true; grp.add(st);
  }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.11, 10), lam2({ color: "#f2ede2" }));
  cup.position.set(0.14, 0.64, 0.1); grp.add(cup);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 12), lam2({ color: "#e2ddd2" }));
  saucer.position.set(0.14, 0.595, 0.1); grp.add(saucer);
  grp.userData.cup = cup;
  void r;
  return grp;
};
/** a simple motorbike: body, seat, two wheels, handlebar, headlight */
const makeBike = (r: () => number) => {
  const grp = new THREE.Group();
  const bodyMat = lam2({ color: "#b8352c" });
  const dark = lam2({ color: "#23262b" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 1.5), bodyMat);
  body.position.set(0, 0.52, 0); body.castShadow = true; grp.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.34), bodyMat);
  nose.position.set(0, 0.62, 0.82); nose.rotation.x = -0.25; grp.add(nose);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.85), dark);
  seat.position.set(0, 0.78, -0.28); grp.add(seat);
  for (const wz of [0.82, -0.78]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.09, 14), dark);
    wh.rotation.z = Math.PI / 2; wh.position.set(0, 0.31, wz); grp.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 10), lam2({ color: "#9aa0a8" }));
    hub.rotation.z = Math.PI / 2; hub.position.set(0, 0.31, wz); grp.add(hub);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), dark);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.98, 0.86); grp.add(bar);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), new THREE.MeshBasicMaterial({ color: "#fff3c8", fog: false }));
  lamp.position.set(0, 0.72, 1.0); grp.add(lamp);
  void r;
  return grp;
};
/** the train: blue diesel loco + 3 green coaches. Front face at local z=0,
 *  the whole consist extends toward -z. */
const makeTrain = (r: () => number) => {
  const grp = new THREE.Group();
  const blue = lam2({ color: "#2456a0", map: rep(plasterTex("keretaLocoBlue", "#2456a0"), 2, 1) });
  const dark = lam2({ color: "#22262c" });
  const steel = lam2({ color: "#8f959e" });
  // ---- locomotive (z 0 .. -11) ----
  const loco = new THREE.Group(); grp.add(loco);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 10.6), dark);
  frame.position.set(0, 0.62, -5.5); loco.add(frame);
  for (const wz of [-2.3, -4.6, -7.4, -9.7]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.9, 14), dark);
    wh.rotation.z = Math.PI / 2; wh.position.set(0, 0.44, wz); loco.add(wh);
  }
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.05, 10.7), blue);
  lower.position.set(0, 1.4, -5.55); lower.castShadow = true; loco.add(lower);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.26, 10.7), lam2({ color: "#e8e4da" }));
  stripe.position.set(0, 1.66, -5.55); loco.add(stripe);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 5.9), blue);
  hood.position.set(0, 2.4, -3.35); hood.castShadow = true; loco.add(hood);
  const noseSlope = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.0, 0.9), blue);
  noseSlope.position.set(0, 2.1, -0.28); noseSlope.rotation.x = 0.42; loco.add(noseSlope);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.6, 3.3), blue);
  cab.position.set(0, 2.72, -9.15); cab.castShadow = true; loco.add(cab);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.14, 3.5), lam2({ color: "#d8d4c8" }));
  cabRoof.position.set(0, 3.58, -9.15); loco.add(cabRoof);
  // cab windows: front pair + sides
  const winMat = lam2({ color: "#18242f" });
  for (const wx of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.62), winMat);
    w.position.set(wx, 3.0, -7.48); loco.add(w);
  }
  for (const sx of [-1.16, 1.16]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), winMat);
    w.position.set(sx, 3.0, -9.15); w.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; loco.add(w);
  }
  // yellow warning face + headlights
  const faceP = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), lam2({ color: "#e8b93a" }));
  faceP.position.set(0, 1.45, 0.06); loco.add(faceP);
  for (const hx of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshBasicMaterial({ color: "#fff6d8", fog: false }));
    hl.position.set(hx, 2.06, 0.07); hl.layers.set(NOINK); loco.add(hl);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffedb5", transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  glow.position.set(0, 2.06, 0.55); glow.scale.set(2.6, 2.6, 1); glow.layers.set(NOINK); loco.add(glow);
  loco.userData.glow = glow;
  // exhaust + horn on the hood/cab roof
  const exh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.9), dark);
  exh.position.set(0, 2.98, -4.2); loco.add(exh);
  for (const hx of [-0.3, 0.3]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.4, 8), steel);
    horn.rotation.x = Math.PI / 2; horn.position.set(hx, 3.72, -8.2); loco.add(horn);
  }
  // ---- coaches (each 10.2 long, 0.55 gap) ----
  const sideMat = lam2({ map: carSideTex() });
  const roofMat = lam2({ color: "#b9beb9", map: rep(plasterTex("keretaCoachRoof", "#b9beb9"), 2, 1) });
  const endMat = lam2({ color: "#256040" });
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    const cz = -11.7 - i * 10.75 - 5.1;
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.5, 10.2),
      [sideMat, sideMat, roofMat, dark, endMat, endMat]);
    bodyM.position.set(0, 1.98, cz); bodyM.castShadow = true; car.add(bodyM);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.16, 10.3), roofMat);
    roof.position.set(0, 3.3, cz); car.add(roof);
    for (const bz of [cz - 3.6, cz + 3.6]) {
      const bog = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 2.2), dark);
      bog.position.set(0, 0.55, bz); car.add(bog);
    }
    grp.add(car);
  }
  void r;
  return grp;
};

type HouseSpec = { wall: string; shutter: string; h: number; floors: number; shop: boolean };
const PALETTE: HouseSpec[] = [
  { wall: "#d9a441", shutter: "#2e6e5e", h: 10.5, floors: 3, shop: true },
  { wall: "#e8dcc0", shutter: "#7a4a2a", h: 8.6, floors: 2, shop: false },
  { wall: "#3f7f7a", shutter: "#e8e2d2", h: 11.5, floors: 3, shop: true },
  { wall: "#d98c7a", shutter: "#31556e", h: 9.4, floors: 3, shop: false },
  { wall: "#9db98a", shutter: "#6e4525", h: 10.8, floors: 3, shop: true },
  { wall: "#7a8ba0", shutter: "#e8c45a", h: 8.8, floors: 2, shop: false },
  { wall: "#e5e0d0", shutter: "#b8352c", h: 11.8, floors: 4, shop: true },
  { wall: "#c96f35", shutter: "#2e4a6e", h: 9.8, floors: 3, shop: false },
];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private trainGroup = new THREE.Group();
  private setA = new THREE.Group();   // movable café set, right (z≈3.5)
  private setB = new THREE.Group();   // movable café set, left (z≈-5)
  private bikeGroup = new THREE.Group();
  private laundryMove = new THREE.Group();
  private barrierArm = new THREE.Group();
  private heroCup: THREE.Object3D | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(4242);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 11, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 200 + r() * 240;
      sp.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d);
      sp.scale.set(100 + r() * 70, 34 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    // ---- distant city silhouette (for the high shot) ----
    {
      const cityMat = lam2({ color: "#8fa8c8", map: rep(plasterTex("keretaCity", "#8fa8c8"), 2, 3) });
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + r() * 0.2;
        const d = 110 + r() * 70, h = 16 + r() * 22;
        const b = new THREE.Mesh(new THREE.BoxGeometry(14 + r() * 16, h, 14 + r() * 16), cityMat);
        b.position.set(Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d);
        R.add(b);
      }
    }
    // ---- ground: one big concrete slab, ballast strip on top ----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 190), lam2({ map: rep(concreteTex(), 8, 30) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; R.add(ground);
    const ballast = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.1, 168), lam2({ map: rep(ballastTex(), 2, 60) }));
    ballast.position.y = 0.03; ballast.receiveShadow = true; R.add(ballast);
    // sleepers (instanced) + rails
    {
      const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.07, 0.55), lam2({ color: "#4c3a28", map: rep(plasterTex("keretaSleeper", "#4c3a28"), 1, 1) }), 148);
      const m = new THREE.Matrix4();
      let n = 0;
      for (let z = -84; z <= 84 && n < 148; z += 1.15) { m.setPosition(0, 0.1, z); sl.setMatrixAt(n++, m); }
      sl.count = n; sl.receiveShadow = true; R.add(sl);
      const railMat = lam2({ color: "#a9afb8" });
      for (const rx of [-0.75, 0.75]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 168), railMat);
        rail.position.set(rx, 0.2, 0); R.add(rail);
      }
      // the worn yellow safety lines along the café stretch
      const yel = lam2({ color: "#d8b93a", map: rep(plasterTex("keretaYellow", "#d8b93a"), 1, 24) });
      for (const lx of [-1.38, 1.38]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 58), yel);
        line.position.set(lx, 0.045, 2); R.add(line);
      }
    }
    // ---- the shophouses, both sides ----
    for (const side of [1, -1] as const) {
      let z = -78, i = side > 0 ? 0 : 3;
      while (z < 74) {
        const spec = PALETTE[i % PALETTE.length];
        const w = 5.4 + r() * 1.6;
        makeHouse(R, r, side, z, w, { ...spec, seed: i * 2 + (side > 0 ? 1 : 0) });
        z += w + 0.06; i++;
      }
    }
    // end-cap building closing the vista at -z
    {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(26, 15, 5), lam2({ map: rep(plasterTex("keretaCap", "#a89880"), 3, 2) }));
      cap.position.set(0, 7.5, -88); R.add(cap);
    }
    // ---- back rows: plain rooftops behind the alley rows, so the high
    // shot (shot 2) sees a city, not a bare concrete slab ----
    {
      const backCols = ["#b09a7a", "#9aa4ae", "#a88a68", "#8e9a8a", "#b5a48c", "#97a2b5"];
      for (const side of [1, -1] as const) {
        let z = -72, bi = 0;
        while (z < 72) {
          const w = 8 + r() * 3, h = 8 + r() * 5, col = backCols[(bi + (side > 0 ? 0 : 3)) % backCols.length];
          const b = new THREE.Mesh(new THREE.BoxGeometry(7.5, h, w),
            lam2({ color: col, map: rep(plasterTex(`keretaBack${col}`, col), 2, 2) }));
          b.position.set(side * 10.8, h / 2 - 0.05, z + w / 2); R.add(b);
          const rf = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.3, w + 0.4), lam2({ color: "#6e5a48" }));
          rf.position.set(side * 10.8, h + 0.1, z + w / 2); R.add(rf);
          z += w + 0.4; bi++;
        }
      }
    }
    // ---- awnings over the café fronts ----
    {
      // NOTE: no awning may sit within ~6 units ahead of a camera — at
      // y=3.05 it balloons into a frame-filling slab and hides the fact
      // card (stills v-1/v-3). z=24 (shot 1/10 lens) and z=14 (shot 3
      // lens) were moved out of the lens cones.
      const awnSpecs: [number, number, string][] = [
        [1, -14, "#b8352c"], [1, -33, "#2e6e5e"], [-1, -38, "#d9a441"], [-1, 26, "#31556e"], [1, -24, "#7a4a8c"],
      ];
      for (const [side, z, col] of awnSpecs) {
        const awn = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 4.6),
          lam2({ map: rep(corrugTex(`keretaAwn${col}`, col, "rgba(20,14,10,0.4)"), 2, 2) }));
        awn.position.set(side * (WALL_X - 0.5), 3.05, z);
        awn.rotation.z = side * 0.38; awn.castShadow = true; R.add(awn);
      }
    }
    // ---- hanging signs (perpendicular, double-sided) ----
    {
      const signs: [number, number, string, string, string][] = [
        [1, -13.2, "#b8352c", "#f2ede2", "CÀ PHÊ"],
        [-1, -3.4, "#1e5a46", "#f2ede2", "PHỞ GÀ"],
        [1, 9.2, "#d9a441", "#2c2018", "TRÀ ĐÁ"],
        [-1, 15.4, "#31556e", "#f2ede2", "BÁNH MÌ"],
        [1, 23.2, "#23272f", "#e8c45a", "ĐƯỜNG TÀU"],
      ];
      for (const [side, z, bg, fg, text] of signs) {
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42),
          new THREE.MeshLambertMaterial({ map: signTex(`keretaSign${text}`, bg, fg, text), side: THREE.DoubleSide }));
        sg.position.set(side * (WALL_X - 0.55), 3.6, z); sg.rotation.y = Math.PI / 2;
        sg.layers.set(NOINK); R.add(sg);
        const armB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), lam2({ color: "#2c2e33" }));
        armB.position.set(side * (WALL_X - 0.28), 3.86, z); R.add(armB);
      }
    }
    // ---- lantern strings across the alley ----
    {
      const cols = ["#c8352c", "#e8c45a", "#2e8f86", "#e87a3a"];
      for (const lz of [-14, -2, 10, 22]) {
        for (let i = 0; i <= 10; i++) {
          const u = i / 10, x = -1.9 + u * 3.8;
          const y = 5.6 - Math.sin(u * Math.PI) * 0.45;
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
            new THREE.MeshBasicMaterial({ color: cols[i % 4], fog: false }));
          s.position.set(x, y, lz + Math.sin(u * 6.28) * 0.05); s.layers.set(NOINK); R.add(s);
        }
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.9, 4), lam2({ color: "#2c2e33" }));
        wire.rotation.z = Math.PI / 2; wire.position.set(0, 5.62, lz); R.add(wire);
      }
    }
    // ---- laundry: 3 static lines + 1 that gets pulled in the scramble ----
    {
      const clothCols = ["#e8e2d2", "#7ab3d9", "#e88ca0", "#f2d06b", "#8fd0a8", "#d97a4a"];
      const mkCloth = (parent: THREE.Object3D, x: number, y: number, z: number, col: string, w = 0.55, h = 0.75) => {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam2({ color: col, side: THREE.DoubleSide }));
        c.position.set(x, y - h / 2, z); c.castShadow = true; parent.add(c);
        return c;
      };
      for (const lz of [-18, 5.5, -30]) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.9, 4), lam2({ color: "#2c2e33" }));
        wire.rotation.z = Math.PI / 2; wire.position.set(0, 4.9, lz); R.add(wire);
        for (let i = 0; i < 5; i++) mkCloth(R, -1.5 + i * 0.75, 4.88, lz, clothCols[(i + Math.floor(lz)) % 6], 0.5, 0.6 + (i % 3) * 0.14);
      }
      // the animated line at z=-8: clothes bunch to the left wall on clearK
      const wire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.9, 4), lam2({ color: "#2c2e33" }));
      wire2.rotation.z = Math.PI / 2; wire2.position.set(0, 4.9, -8); R.add(wire2);
      for (let i = 0; i < 5; i++) {
        const c = mkCloth(this.laundryMove, -1.5 + i * 0.75, 4.88, -8, clothCols[(i + 2) % 6], 0.5, 0.62 + (i % 3) * 0.13);
        c.userData.spreadX = -1.5 + i * 0.75;
      }
      R.add(this.laundryMove);
    }
    // ---- potted plants along the walls ----
    {
      const potMat = lam2({ color: "#a0552f" });
      const leafMat = lam2({ color: "#4c9440", flatShading: true });
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1, z = -30 + i * 4.1 + r() * 2;
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 9), potMat);
        pot.position.set(side * (WALL_X - 0.25), 0.15, z); pot.castShadow = true; R.add(pot);
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + r() * 0.14, 1), leafMat);
        leaf.position.set(side * (WALL_X - 0.25), 0.55, z); leaf.scale.y = 0.8; leaf.castShadow = true; R.add(leaf);
      }
    }
    // ---- café furniture: fixed sets against the walls ----
    {
      const fixed: [number, number, string][] = [[1.68, -13, "#2e6fd0"], [-1.68, 9, "#c8352c"], [1.68, 16.5, "#2e8f57"]];
      for (const [x, z, col] of fixed) {
        const s = makeTableSet(r, col);
        s.position.set(x, 0, z); s.rotation.y = r() * 3; R.add(s);
      }
      // the hero's foreground table (shots 1 + 10) — its cup rattles
      const heroSet = makeTableSet(r, "#2e6fd0");
      heroSet.position.set(1.62, 0, 20.5); heroSet.rotation.y = 0.7; R.add(heroSet);
      this.heroCup = heroSet.userData.cup as THREE.Object3D;
    }
    // ---- movable sets + the motorbike (the scramble) ----
    this.setA = makeTableSet(r, "#e8c45a");
    this.setA.position.set(1.5, 0, 3.5); R.add(this.setA);
    this.setB = makeTableSet(r, "#2e8f57");
    this.setB.position.set(-1.5, 0, -5); R.add(this.setB);
    this.bikeGroup = makeBike(r);
    this.bikeGroup.position.set(1.45, 0, 13.5); this.bikeGroup.rotation.y = 0.15; R.add(this.bikeGroup);
    // ---- chalkboards with the train times ----
    {
      const mkBoard = (x: number, z: number, yaw: number, s: number) => {
        const grp = new THREE.Group();
        const bd = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.44), lam2({ map: boardTex() }));
        bd.position.y = 1.0; grp.add(bd);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.27, 1.56, 0.05), lam2({ color: "#6e4525" }));
        fr.position.set(0, 1.0, -0.035); grp.add(fr);
        for (const lx of [-0.5, 0.5]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), lam2({ color: "#6e4525" }));
          leg.position.set(lx, 0.3, -0.12); leg.rotation.x = 0.35; grp.add(leg);
        }
        grp.position.set(x, 0, z); grp.rotation.y = yaw; grp.scale.setScalar(s);
        R.add(grp);
        return grp;
      };
      mkBoard(-1.72, -3.5, 0.55, 1.0);
      mkBoard(1.74, -9.5, -0.5, 0.85);
    }
    // ---- the chess set ON the track (shot 7) ----
    {
      const grp = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.95),
        lam2({ map: ctex("keretaChess", 256, 256, (g) => {
          g.fillStyle = "#d9c9a8"; g.fillRect(0, 0, 256, 256);
          g.strokeStyle = "#7a2c22"; g.lineWidth = 4;
          for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(16 + i * 28, 16); g.lineTo(16 + i * 28, 240); g.stroke(); g.beginPath(); g.moveTo(16, 16 + i * 28); g.lineTo(240, 16 + i * 28); g.stroke(); }
          g.fillStyle = "#7a2c22";
          for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(44 + (i * 37) % 180, 44 + (i * 53) % 170, 11, 0, 7); g.fill(); }
          g.fillStyle = "#274a2e";
          for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(60 + (i * 41) % 160, 60 + (i * 47) % 150, 11, 0, 7); g.fill(); }
        }) }));
      top.position.y = 0.46; top.castShadow = true; grp.add(top);
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.44, 0.8), lam2({ color: "#6e4525" }));
      legB.position.y = 0.22; grp.add(legB);
      for (const sx of [-0.85, 0.85]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 10), lam2({ color: "#2e6fd0" }));
        st.position.set(sx, 0.17, 0); st.castShadow = true; grp.add(st);
      }
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10), lam2({ color: "#8a8f96" }));
      pot.position.set(0.3, 0.57, 0.28); grp.add(pot);
      grp.position.set(0, 0.06, -2);
      R.add(grp);
      blob(R, 0, 0.075, -2, 2.4, 2.2, 0.35);
    }
    // ---- the barrier gate (shot 8) ----
    {
      const postMat = lam2({ map: stripeTex() });
      for (const px of [-2.15, 2.15]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.2), postMat);
        post.position.set(px, 0.57, BARRIER_Z); post.castShadow = true; R.add(post);
      }
      this.barrierArm = new THREE.Group();
      this.barrierArm.position.set(-2.15, 1.08, BARRIER_Z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.17, 0.07), lam2({ map: rep(stripeTex(), 3, 1) }));
      arm.position.set(2.15, 0, 0); arm.castShadow = true; this.barrierArm.add(arm);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#c8352c", fog: false }));
      tip.position.set(4.3, 0, 0); tip.layers.set(NOINK); this.barrierArm.add(tip);
      R.add(this.barrierArm);
      // a small red warning sign on the right post
      const sgn = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
        lam2({ map: signTex("keretaSignStop", "#c8352c", "#f2ede2", "STOP") }));
      sgn.position.set(2.15, 1.55, BARRIER_Z); R.add(sgn);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), lam2({ color: "#2c2e33" }));
      pole.position.set(2.15, 1.28, BARRIER_Z); R.add(pole);
    }
    // ---- THE TRAIN ----
    this.trainGroup = makeTrain(r);
    this.trainGroup.visible = false;
    R.add(this.trainGroup);
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
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
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
    // the high shot + the approach shot need to see far down the corridor
    const fogK = id === 2 ? 2.4 : id === 5 ? 1.7 : id === 8 ? 1.35 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    // ---- the great clearing: furniture breathes to the walls and back ----
    const ck = clearK(tt);
    this.setA.position.x = 1.5 + ck * 0.92;
    this.setB.position.x = -1.5 - ck * 0.92;
    this.bikeGroup.position.x = 1.45 + ck * 1.0;
    this.bikeGroup.rotation.y = 0.15 + ck * 1.25;
    for (const ch of this.laundryMove.children) {
      const sx = (ch.userData.spreadX as number) ?? 0;
      ch.position.x = sx * (1 - ck) + (-1.55 + (sx + 1.5) * 0.14) * ck;
    }
    // ---- the 2019 barrier ----
    this.barrierArm.rotation.z = -(1 - barrierK(tt)) * 1.15;
    // ---- THE TRAIN ----
    const front = trainFront(id, tt);
    if (front !== null && trainInAlley(id, tt)) {
      this.trainGroup.visible = true;
      this.trainGroup.position.set(0, 0.14 + Math.sin(tt * 24) * 0.008, front);
      this.trainGroup.rotation.z = Math.sin(tt * 6.1) * 0.0035;
      // the hero's cup rattles as the loco sweeps past his table
      if (this.heroCup && (id === 1 || id === 10)) {
        const prox = Math.max(0, 1 - Math.abs(front - 21) / 16);
        this.heroCup.position.x = 0.14 + Math.sin(tt * 49) * 0.012 * prox;
        this.heroCup.position.z = 0.1 + Math.cos(tt * 43) * 0.01 * prox;
      }
    } else this.trainGroup.visible = false;
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
      a.mesh.castShadow = true;
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
