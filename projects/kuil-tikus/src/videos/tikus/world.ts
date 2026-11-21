// The Kuil Tikus film as one three.js scene: the Karni Mata temple
// at Deshnoke, Rajasthan — a white-marble courtyard temple in bright
// desert light: carved facade with SOLID SILVER doors, twin domed
// towers, pillared colonnades, a fine protective net canopy over
// the court (it keeps birds of prey away from the rats), great steel
// milk bowls, and west of the court a stepped sacred pond for the
// legend. Beyond: sand, acacia trees, dunes and the town silhouette.
// VISUAL CORE: bright warm daylight, marble + silver + red
// sandstone, textured everything (anti-banding: speckled sky,
// veined marble, flecked sand). Layered light rig: sun key w/ soft
// shadows + hemisphere fill + rim — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, water } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, DOOR, POND_C, BOWL_A, BOWL_B, BOWL_C, LEDGE,
} from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const marbleTex = () => ctex("tikusMarble", 512, 512, (g, r) => {
  g.fillStyle = "#f2ede1"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,250" : "130,125,115"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 26; i++) { // grey veins wandering the slab
    g.strokeStyle = `rgba(118,124,136,${0.10 + r() * 0.12})`; g.lineWidth = 1 + r() * 2.2; g.lineCap = "round";
    g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 190; y += (r() - 0.5) * 190; g.lineTo(x, y); } g.stroke();
  }
  for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(190,160,90,${0.05 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const sandTex = () => ctex("tikusSand", 512, 512, (g, r) => {
  g.fillStyle = "#dcba7f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "245,225,175" : "150,118,70"},${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  for (let i = 0; i < 22; i++) { // pebbles
    g.fillStyle = `rgba(${140 + r() * 60},${120 + r() * 40},${90 + r() * 30},0.85)`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 3.6, 0, 7); g.fill();
  }
});
const doorTex = () => ctex("tikusSilverDoor", 512, 640, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 512, 640);
  grad.addColorStop(0, "#ccd1da"); grad.addColorStop(0.5, "#aeb4bf"); grad.addColorStop(1, "#c3c9d3");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "70,76,88"},${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 640, 2, 2); }
  g.fillStyle = "#7d838e"; g.fillRect(250, 0, 12, 640); // centre seam
  for (const px of [42, 274]) for (const py of [36, 236, 436]) { // six embossed panels
    g.strokeStyle = "#878d97"; g.lineWidth = 7; g.beginPath(); g.roundRect(px, py, 196, 168, 14); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 3; g.beginPath(); g.roundRect(px + 7, py + 7, 182, 154, 11); g.stroke();
    g.strokeStyle = "#9399a3"; g.lineWidth = 5; // embossed ring medallion
    g.beginPath(); g.arc(px + 98, py + 84, 46, 0, 7); g.stroke();
    g.beginPath(); g.arc(px + 98, py + 84, 26, 0, 7); g.stroke();
    g.fillStyle = "#9aa0a9"; g.beginPath(); g.arc(px + 98, py + 84, 9, 0, 7); g.fill();
  }
  g.fillStyle = "#8b9099"; // studs
  for (let x = 26; x < 512; x += 44) for (let y = 18; y < 640; y += 44) { g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
});
const netTex = () => ctex("tikusNet", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(58,52,46,0.9)"; g.lineWidth = 2.5;
  for (let i = 0; i <= 256; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
});
const signTex = (key: string, text: string, bg: string, fg: string) => ctex(key, 512, 128, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "30,20,12"},${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 128, 2, 2); }
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.font = "900 52px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 68);
});
const blobTex = () => ctex("tikusBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("tikusSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#a5c8ee"); grad.addColorStop(1, "#d8e6f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("tikusSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060f26"); grad.addColorStop(0.45, "#0d2148"); grad.addColorStop(0.78, "#1d3a68"); grad.addColorStop(1, "#2a4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; const s = r() > 0.92 ? 3.2 : 1.8; g.fillRect(r() * 2048, r() * 700, s, s); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "8,20,50"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private skyNight: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private glowMats: THREE.MeshBasicMaterial[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(777);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#c9a06a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + clouds ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyNight = new THREE.Mesh(new THREE.SphereGeometry(679, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexNight(), side: THREE.BackSide, fog: false }));
    this.skyNight.layers.set(NOINK); this.skyNight.visible = false; R.add(this.skyNight);
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(300 + i * 11, CLOUD_DAY), transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      const a = r() * Math.PI * 2, d = 200 + r() * 240;
      sp.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d);
      sp.scale.set(100 + r() * 70, 34 + r() * 18, 1);
      sp.layers.set(NOINK); R.add(sp); this.clouds.push(sp);
    }
    this.buildGround(R, r);
    this.buildTemple(R, r);
    this.buildPond(R, r);
    this.buildBackdrop(R, r);
  }

  // ---------------- desert + courtyard ----------------
  private buildGround(R: THREE.Group, r: () => number) {
    const sand = new THREE.Mesh(new THREE.CircleGeometry(320, 28), lam2({ map: rep(sandTex(), 90, 90) }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.07, 0); sand.receiveShadow = true; R.add(sand);
    // red-sandstone border slab under the marble court
    const border = new THREE.Mesh(new THREE.BoxGeometry(28.6, 0.14, 26.4),
      lam2({ map: rep(stone("tikusRedStone", ["#b06a48", "#a05f3e", "#bc7652", "#955636"]), 8, 8) }));
    border.position.set(0, -0.02, 3.3); border.receiveShadow = true; R.add(border);
    // the marble courtyard: x -13..13, z -8.7..15.3
    const court = new THREE.Mesh(new THREE.PlaneGeometry(26, 24), lam2({ map: rep(marbleTex(), 6, 6) }));
    court.rotation.x = -Math.PI / 2; court.position.set(0, 0.055, 3.3); court.receiveShadow = true; R.add(court);
    // a worn sand path running south from the court to frame bottom
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 30), lam2({ map: rep(sandTex(), 1, 9) }));
    path.rotation.x = -Math.PI / 2; path.position.set(0.5, -0.04, 29); path.receiveShadow = true; R.add(path);
    void r;
  }

  // ---------------- THE TEMPLE ----------------
  private buildTemple(R: THREE.Group, r: () => number) {
    const marble = lam2({ map: rep(marbleTex(), 3, 2) });
    const marblePlain = lam2({ color: "#efe9db", map: rep(marbleTex(), 1, 1) });
    const redStone = lam2({ map: rep(stone("tikusRedStone", ["#b06a48", "#a05f3e", "#bc7652", "#955636"]), 3, 2) });
    const gold = lam2({ color: "#d9a441" });
    // platform (top y=0.9) + front steps down to the court
    const plat = new THREE.Mesh(new THREE.BoxGeometry(30, 0.9, 6.4), redStone);
    plat.position.set(0, 0.45, -13.2); plat.castShadow = true; plat.receiveShadow = true; R.add(plat);
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(5.6 - i * 0.4, 0.3, 0.62), marblePlain);
      step.position.set(0, 0.75 - i * 0.3, -9.85 + i * 0.55); step.receiveShadow = true; R.add(step);
    }
    blob(R, 0, 0.92, -13.2, 31, 7.4, 0.22);
    // ---- the facade wall (front face z=-14.4) ----
    const wall = new THREE.Mesh(new THREE.BoxGeometry(27, 9.5, 1.6), marble);
    wall.position.set(0, 0.9 + 4.75, -15.2); wall.castShadow = true; wall.receiveShadow = true; R.add(wall);
    // cornice + parapet band
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(27.7, 0.55, 2.1), marblePlain);
    cornice.position.set(0, 10.65, -15.2); cornice.castShadow = true; R.add(cornice);
    const band = new THREE.Mesh(new THREE.BoxGeometry(27.2, 0.5, 0.14), redStone);
    band.position.set(0, 9.9, -14.36); R.add(band);
    // pilasters + dark arch niches along the front
    const nicheM = lam2({ color: "#3a3f4a", map: rep(marbleTex(), 1, 1) });
    for (const nx of [-10.6, -8.2, -5.8, 5.8, 8.2, 10.6]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.55, 9.5, 0.22), marblePlain);
      pil.position.set(nx + 1.2, 0.9 + 4.75, -14.32); R.add(pil);
    }
    for (const nx of [-9.4, -7.0, 7.0, 9.4]) {
      const niche = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.4, 0.12), nicheM);
      niche.position.set(nx, 0.9 + 2.6, -14.36); R.add(niche);
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 14, 1, false, 0, Math.PI), nicheM);
      arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2;
      arch.position.set(nx, 0.9 + 4.3, -14.36); R.add(arch);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.3), marblePlain);
      sill.position.set(nx, 0.9 + 0.85, -14.3); R.add(sill);
    }
    // small upper windows with warm glow potential
    const winGlow = new THREE.MeshBasicMaterial({ color: "#ffca6a", transparent: true, opacity: 0.0, fog: false });
    this.glowMats.push(winGlow);
    for (const wx of [-9.4, -7.0, -4.6, 4.6, 7.0, 9.4]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.12), nicheM);
      win.position.set(wx, 0.9 + 7.6, -14.36); R.add(win);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), winGlow);
      gl.position.set(wx, 0.9 + 7.6, -14.28); gl.layers.set(NOINK); R.add(gl);
    }
    // ---- twin towers + domes ----
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 11.6, 2.4), marble);
      tower.position.set(side * 11.6, 0.9 + 5.8, -15.2); tower.castShadow = true; R.add(tower);
      const tband = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 2.6), redStone);
      tband.position.set(side * 11.6, 0.9 + 9.6, -15.2); R.add(tband);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), marblePlain);
      dome.position.set(side * 11.6, 0.9 + 11.6, -15.2); dome.castShadow = true; R.add(dome);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 8), gold);
      fin.position.set(side * 11.6, 0.9 + 11.6 + 2.05 + 0.5, -15.2); R.add(fin);
      const finBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), gold);
      finBall.position.set(side * 11.6, 0.9 + 11.6 + 2.05 + 0.1, -15.2); R.add(finBall);
    }
    // ---- central chhatri dome over the doors ----
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.8, 14), marblePlain);
    drum.position.set(0, 10.9 + 0.4, -15.2); R.add(drum);
    const cdome = new THREE.Mesh(new THREE.SphereGeometry(1.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), marblePlain);
    cdome.position.set(0, 11.7, -15.2); cdome.castShadow = true; R.add(cdome);
    const cfin = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 8), gold);
    cfin.position.set(0, 11.7 + 1.85 + 0.55, -15.2); R.add(cfin);
    // ---- THE SILVER DOORS ----
    const doors = new THREE.Mesh(new THREE.BoxGeometry(3.7, 4.9, 0.18), lam2({ map: doorTex() }));
    doors.position.set(0, 0.9 + 2.45, -14.3); doors.castShadow = true; R.add(doors);
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.6, 0.14), redStone);
    doorFrame.position.set(0, 0.9 + 2.8, -14.38); R.add(doorFrame);
    doors.position.z = -14.28;
    // sanctum glow seam down the middle of the doors
    const seamMat = new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.35, fog: false });
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 4.7), seamMat);
    seam.position.set(0, 0.9 + 2.45, -14.17); seam.layers.set(NOINK); R.add(seam);
    this.glowMats.push(seamMat);
    // brass lamps flanking the doors (glow at golden hour)
    const lampMat = new THREE.MeshBasicMaterial({ color: "#ffd98a", fog: false });
    this.glowMats.push(lampMat);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 8), lam2({ color: "#8a6a2f" }));
      post.position.set(side * 2.9, 0.9 + 1.25, -13.4); post.castShadow = true; R.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), lampMat);
      lamp.position.set(side * 2.9, 0.9 + 2.62, -13.4); lamp.layers.set(NOINK); R.add(lamp);
    }
    // ---- colonnades along both court edges ----
    const pillarM = marblePlain, baseM = redStone;
    for (const side of [-1, 1]) {
      const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 25.5), marblePlain);
      roofSlab.position.set(side * 11.5, 5.62, 2.8); roofSlab.castShadow = true; R.add(roofSlab);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 25.5), redStone);
      beam.position.set(side * 10.7, 5.3, 2.8); R.add(beam);
      for (let i = 0; i < 7; i++) {
        const z = -9 + i * 4;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.85), baseM);
        base.position.set(side * 11.5, 0.3, z); base.castShadow = true; R.add(base);
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 4.6, 10), pillarM);
        pil.position.set(side * 11.5, 0.6 + 2.3, z); pil.castShadow = true; R.add(pil);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), baseM);
        cap.position.set(side * 11.5, 5.32, z); R.add(cap);
      }
    }
    // ---- the protective NET canopy over the court ----
    const net = new THREE.Mesh(new THREE.PlaneGeometry(24.5, 26),
      new THREE.MeshBasicMaterial({ map: rep(netTex(), 18, 19), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    net.rotation.x = -Math.PI / 2; net.position.set(0, 8.6, 2.8); net.layers.set(NOINK); net.renderOrder = 3; R.add(net);
    const poleM = lam2({ color: "#6a5138" });
    for (const [px, pz] of [[-11.9, -9.6], [11.9, -9.6], [-11.9, 15.2], [11.9, 15.2]] as const) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 8.6, 7), poleM);
      pole.position.set(px, 4.3, pz); pole.castShadow = true; R.add(pole);
    }
    // ---- the white rat's marble ledge block ----
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.05, 0.95), marble);
    ledge.position.set(LEDGE[0], LEDGE[1] / 2, LEDGE[2]); ledge.castShadow = true; ledge.receiveShadow = true; R.add(ledge);
    const ledgeTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.15), marblePlain);
    ledgeTop.position.set(LEDGE[0], LEDGE[1] + 0.02, LEDGE[2]); R.add(ledgeTop);
    // ---- the great steel milk bowls ----
    const steel = lam2({ color: "#b9bec8", map: rep(marbleTex(), 1, 1) });
    const milkM = lam2({ color: "#f7f2e4" });
    for (const B of [BOWL_A, BOWL_B, BOWL_C]) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.62, 0.46, 18, 1, true), steel);
      bowl.position.set(B[0], 0.23, B[2]); bowl.castShadow = true; R.add(bowl);
      const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.055, 8, 22), steel);
      rimT.rotation.x = Math.PI / 2; rimT.position.set(B[0], 0.46, B[2]); R.add(rimT);
      const milk = new THREE.Mesh(new THREE.CircleGeometry(0.93, 18), milkM);
      milk.rotation.x = -Math.PI / 2; milk.position.set(B[0], 0.42, B[2]); R.add(milk);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.1, 14), steel);
      foot.position.set(B[0], 0.05, B[2]); R.add(foot);
      blob(R, B[0], 0.065, B[2], 2.6, 2.6, 0.3);
    }
    // ---- the sweets table: trays of orange ladoo ----
    const tableM = lam2({ color: "#8a5a2c", map: rep(stone("tikusWood", ["#8a5a2c", "#7a4e26", "#9a6a38", "#6a421f"]), 2, 1) });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 1.1), tableM);
    table.position.set(7.5, 0.62, 4); table.castShadow = true; R.add(table);
    for (const [lx, lz] of [[6.6, 3.6], [8.4, 3.6], [6.6, 4.4], [8.4, 4.4]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 7), tableM);
      leg.position.set(lx, 0.31, lz); R.add(leg);
    }
    const ladooM = lam2({ color: "#e8862c" });
    const trayM = lam2({ color: "#c8ccd4" });
    for (const tx of [6.9, 8.1]) {
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 16), trayM);
      tray.position.set(tx, 0.72, 4); R.add(tray);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2, rr = i === 0 ? 0 : 0.26;
        const lad = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), ladooM);
        lad.position.set(tx + Math.cos(a) * rr, 0.83 + (i === 0 ? 0.1 : 0), 4 + Math.sin(a) * rr);
        lad.castShadow = true; R.add(lad);
      }
    }
    // the entrance sign at the court's south edge
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.9, 7), tableM);
    post1.position.set(2.6, 1.45, 16.5); post1.castShadow = true; R.add(post1);
    const post2 = post1.clone(); post2.position.x = -2.6; R.add(post2);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35),
      lam2({ map: signTex("tikusSign", "KARNI MATA", "#7a2e22", "#f2ede2") }));
    board.position.set(0, 2.5, 16.5); R.add(board);
    void r;
  }

  // ---------------- the sacred pond (kund) ----------------
  private buildPond(R: THREE.Group, r: () => number) {
    const redStone = lam2({ map: rep(stone("tikusRedStone", ["#b06a48", "#a05f3e", "#bc7652", "#955636"]), 3, 1) });
    const C = POND_C;
    // rim: four red-sandstone walls forming a 10x10 basin
    for (const [w, d, x, z] of [[10.6, 1.0, 0, -5.0], [10.6, 1.0, 0, 5.0], [1.0, 8.6, -5.0, 0], [1.0, 8.6, 5.0, 0]] as const) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), redStone);
      rim.position.set(C[0] + x, 0.1, C[2] + z); rim.castShadow = true; rim.receiveShadow = true; R.add(rim);
    }
    // basin floor + water
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 9.2), lam2({ color: "#7a6a52", map: rep(stone("tikusPondFloor", ["#8a7a5e", "#77684e", "#96866a", "#6a5c44"]), 4, 4) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(C[0], -0.55, C[2]); R.add(floor);
    const wat = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 9.2),
      lam2({ color: "#3f8fbf", map: rep(water(), 3, 3), transparent: true, opacity: 0.88 }));
    wat.rotation.x = -Math.PI / 2; wat.position.set(C[0], -0.16, C[2]); R.add(wat);
    // steps down into the water on the east side
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 3.4), redStone);
      step.position.set(C[0] + 4.4 - i * 0.75, -0.05 - i * 0.2, C[2]); step.receiveShadow = true; R.add(step);
    }
    // a small shrine block + lamp at the pond's west rim
    const shrine = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 1.0), redStone);
    shrine.position.set(C[0] - 6.1, 0.95, C[2]); shrine.castShadow = true; R.add(shrine);
    const sroof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.8, 4), lam2({ color: "#8f4a28" }));
    sroof.position.set(C[0] - 6.1, 2.3, C[2]); sroof.rotation.y = Math.PI / 4; R.add(sroof);
    void r;
  }

  // ---------------- desert backdrop ----------------
  private buildBackdrop(R: THREE.Group, r: () => number) {
    // dunes on the horizon
    const duneM = lam2({ color: "#d3ac72", map: rep(sandTex(), 10, 4) });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5, d = 150 + r() * 70;
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), duneM);
      dune.scale.set(60 + r() * 50, 10 + r() * 9, 26 + r() * 14);
      dune.position.set(Math.cos(a) * d, -2, Math.sin(a) * d - 20); R.add(dune);
    }
    // acacia trees: dark olive flat-top canopies on crooked trunks
    const trunkM = lam2({ color: "#6e4a2e", map: rep(stone("tikusBark", ["#6e4a2e", "#5d3f27", "#7d5636", "#4f3520"]), 1, 2) });
    const leafM = lam2({ color: "#5d7031", flatShading: true });
    const leafM2 = lam2({ color: "#6d8138", flatShading: true });
    const tree = (x: number, z: number, s: number) => {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 2.6 * s, 7), trunkM);
      tr.position.set(x, 1.3 * s, z); tr.rotation.z = (r() - 0.5) * 0.16; tr.castShadow = true; R.add(tr);
      for (let j = 0; j < 3; j++) {
        const can = new THREE.Mesh(new THREE.SphereGeometry((1.5 - j * 0.3) * s, 10, 7), j % 2 ? leafM2 : leafM);
        can.scale.y = 0.34;
        can.position.set(x + (j - 1) * 1.1 * s, (2.6 + 0.55 + j * 0.22) * s, z + (j % 2 ? 0.5 : -0.4) * s);
        can.castShadow = true; R.add(can);
      }
    };
    const spots: [number, number, number][] = [
      [-34, -18, 1.3], [30, -26, 1.5], [-40, 22, 1.1], [36, 18, 1.2], [-28, 34, 1.4],
      [44, -6, 1.0], [-52, -2, 1.6], [58, 30, 1.3], [24, 44, 1.1], [-18, -38, 1.2],
    ];
    for (const [x, z, s] of spots) tree(x, z, s);
    // the town silhouette far behind the temple
    const townM = lam2({ color: "#8d99a8" });
    const townM2 = lam2({ color: "#7e8b9c" });
    for (let i = 0; i < 9; i++) {
      const w = 8 + r() * 9, h = 5 + r() * 8;
      const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, 7), i % 2 ? townM : townM2);
      blk.position.set(-64 + i * 16 + r() * 6, h / 2 - 0.5, -98 - r() * 22); R.add(blk);
      if (r() > 0.55) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), townM2);
        dome.position.set(blk.position.x, h - 0.5, blk.position.z); R.add(dome);
      }
    }
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
    const azOff = id === 3 || id === 4 || id === 9 ? 58 : 0; // golden here rakes in from the side, not dead-ahead
    const az = THREE.MathUtils.degToRad(Lp.az + azOff), el = THREE.MathUtils.degToRad(Lp.el);
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
    // the wide shots must see across the court to the town rim
    const fogK = id === 2 || id === 10 ? 1.7 : id === 3 || id === 4 ? 1.25 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    // ---- glow: sanctum seam + lamps + windows at golden hour ----
    const golden = s.light === "golden";
    for (const gm of this.glowMats) gm.opacity = golden ? 0.95 : 0.3;
    // ---- sky swap after dark (unused here, kept for parity) ----
    const night = s.light === "night";
    this.skyDay.visible = !night; this.skyNight.visible = night;
    const stormy = s.light === "storm";
    (this.skyDay.material as THREE.MeshBasicMaterial).color.set(stormy ? "#a9b7c4" : "#ffffff");
    for (const c2 of this.clouds) {
      c2.visible = !night;
      (c2.material as THREE.SpriteMaterial).color.set(stormy ? "#b9c4cf" : "#ffffff");
    }
    // ---- cast + effects ----
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
