// The Gereja Ayam film as one three.js scene: Bukit Rhema,
// Magelang — a jungle hilltop clearing where a GIANT CHICKEN-shaped
// prayer house stands: warm-white plaster body, orange beak, a
// crown of gold-orange spikes on its head (a dove's crown of
// holiness that the whole world reads as a hen's comb). A dirt path
// leads in past a ticket sign; a side stair climbs the flank to the
// crown deck; a little café hut sits by the tail. Beyond the jungle
// rim, in atmospheric haze: the stepped silhouette of Borobudur and
// the volcano cones of Merapi + Merbabu. A "ruin" dressing group
// (graffiti, vines, broken fence) appears only in the storm shot.
// VISUAL CORE: bright cool daylight, lush greens, textured
// everything (anti-banding: speckled sky, flecked plaster, leaf
// canopies). Layered light rig: sun key w/ soft shadows +
// hemisphere fill + rim — the house style.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, grass } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, BODY_C, HEAD, DECK, CAFE,
} from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const plasterTex = () => ctex("ayamPlaster", 512, 512, (g, r) => {
  g.fillStyle = "#efe6d4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,104,80"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
  for (let i = 0; i < 9; i++) { // faint weather streaks running down
    g.fillStyle = `rgba(110,100,84,${0.05 + r() * 0.05})`;
    const x = r() * 512; g.fillRect(x, r() * 200, 3 + r() * 5, 120 + r() * 220);
  }
  for (let i = 0; i < 5; i++) { // hairline cracks
    g.strokeStyle = `rgba(96,86,70,${0.16 + r() * 0.1})`; g.lineWidth = 1.3;
    g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += r() * 46; g.lineTo(x, y); } g.stroke();
  }
});
const dirtTex = () => ctex("ayamDirt", 256, 512, (g, r) => {
  g.fillStyle = "#9a7c56"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "226,204,164" : "70,54,34"},${0.05 + r() * 0.07})`; g.fillRect(r() * 256, r() * 512, 2.4, 2.4); }
  for (let i = 0; i < 26; i++) { // pebbles
    g.fillStyle = `rgba(${140 + r() * 60},${128 + r() * 40},${100 + r() * 30},0.8)`;
    g.beginPath(); g.arc(r() * 256, r() * 512, 2 + r() * 4, 0, 7); g.fill();
  }
});
const graffitiTex = (key: string, base: string) => ctex(key, 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  const cols = ["#d94a6e", "#2e6fd0", "#23272f", "#e8862c", "#1e7a46"];
  for (let i = 0; i < 7; i++) { // wildstyle scribbles + tags
    g.strokeStyle = cols[i % cols.length]; g.lineWidth = 5 + r() * 7; g.lineCap = "round";
    g.beginPath(); let x = 30 + r() * 380, y = 60 + r() * 130; g.moveTo(x, y);
    for (let j = 0; j < 5; j++) { x += (r() - 0.3) * 90; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke();
  }
  g.fillStyle = "rgba(35,39,47,0.85)"; g.font = "900 44px 'Arial Black', Arial, sans-serif"; g.textAlign = "center";
  g.fillText(base, 256, 140);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(60,50,40,${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 256, 3, 3); }
});
const signTex = (key: string, text: string, bg: string, fg: string) => ctex(key, 512, 128, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "30,20,12"},${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 128, 2, 2); }
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.font = "900 52px 'Arial Black', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 68);
});
const puffTex = () => ctex("ayamPuff", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 124);
  gr.addColorStop(0, "rgba(255,255,255,0.88)"); gr.addColorStop(0.45, "rgba(255,255,255,0.38)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("ayamBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("ayamSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#9dc2ec"); grad.addColorStop(1, "#cfe0f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("ayamSkyNight", 2048, 1024, (g, r) => {
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
  private ruin = new THREE.Group();
  private glowMats: THREE.MeshBasicMaterial[] = [];
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
    this.buildHill(R, r);
    this.buildChicken(R, r);
    this.buildCafeAndSigns(R, r);
    this.buildRuin(R, r);
    R.add(this.ruin);
    this.ruin.visible = false;
  }

  // ---------------- the hill, jungle rim, distant vista ----------------
  private buildHill(R: THREE.Group, r: () => number) {
    // hilltop plateau (grass, flecked) + the jungle floor falling away
    const plat = new THREE.Mesh(new THREE.CircleGeometry(34, 36), lam2({ map: rep(grass(), 16, 16) }));
    plat.rotation.x = -Math.PI / 2; plat.position.set(0, 0, -6); plat.receiveShadow = true; R.add(plat);
    const jungleFloor = new THREE.Mesh(new THREE.CircleGeometry(300, 24), lam2({ color: "#3d7031", map: rep(grass(), 60, 60) }));
    jungleFloor.rotation.x = -Math.PI / 2; jungleFloor.position.set(0, -2.2, -6); R.add(jungleFloor);
    // the dirt path: gate (z=+26) to the chest door
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 36), lam2({ map: rep(dirtTex(), 1, 7) }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 9); path.receiveShadow = true; R.add(path);
    blob(R, 0, 0.03, -2, 12, 30, 0.14);
    // rocks + bushes on the plateau
    const rockM = lam2({ color: "#8f8a80", map: rep(stone("ayamRock", ["#8f8a80", "#7d786e", "#a09a8e", "#6e695f"]), 1, 1), flatShading: true });
    const bushM = lam2({ color: "#4c9440", flatShading: true });
    const bushM2 = lam2({ color: "#5da34e", flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 12 + r() * 18;
      const x = Math.cos(a) * d, z = -6 + Math.sin(a) * d;
      if (Math.abs(x) < 3.4 && z > -10) continue;
      if (r() > 0.45) {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.7, 0), rockM);
        rock.position.set(x, 0.2, z); rock.scale.y = 0.6; rock.rotation.y = r() * 3; rock.castShadow = true; R.add(rock);
      } else {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + r() * 0.8, 1), r() > 0.5 ? bushM : bushM2);
        bush.position.set(x, 0.55, z); bush.scale.y = 0.75; bush.castShadow = true; R.add(bush);
      }
    }
    // the hero's foreground boulder (hook + punchline): he stands
    // ON it at HERO_SPOT (2.2, ~1.0, 2.6) so his shocked face sits
    // inside the low-angle frame under the looming head
    const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), rockM);
    boulder.position.set(2.2, 0.1, 2.6); boulder.scale.set(1.15, 0.72, 1.05);
    boulder.rotation.y = 0.7; boulder.castShadow = true; boulder.receiveShadow = true; R.add(boulder);
    // ---- the jungle rim: layered trees closing the horizon ----
    const trunkM = lam2({ color: "#6e4a2e", map: rep(stone("ayamBark", ["#6e4a2e", "#5d3f27", "#7d5636", "#4f3520"]), 1, 2) });
    const leafM = lam2({ color: "#4c9440", flatShading: true });
    const leafM2 = lam2({ color: "#3e7d34", flatShading: true });
    const leafM3 = lam2({ color: "#63a84b", flatShading: true });
    const tree = (x: number, z: number, s: number) => {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 3.2 * s, 7), trunkM);
      tr.position.set(x, 1.6 * s, z); tr.castShadow = true; R.add(tr);
      const lm = [leafM, leafM2, leafM3][Math.floor(r() * 3)];
      const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1 * s, 1), lm);
      c1.position.set(x, (3.2 + 1.4) * s, z); c1.scale.y = 0.85; c1.castShadow = true; R.add(c1);
      const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * s, 1), lm);
      c2.position.set(x + 1.1 * s, (3.2 + 0.8) * s, z + 0.4 * s); c2.scale.y = 0.85; R.add(c2);
    };
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.22;
      const d = 33 + r() * 26;
      const x = Math.cos(a) * d, z = -6 + Math.sin(a) * d;
      tree(x, z, 1.1 + r() * 1.1);
    }
    for (let i = 0; i < 10; i++) { // a nearer second row, bigger
      const a = r() * Math.PI * 2, d = 27 + r() * 5;
      const x = Math.cos(a) * d, z = -6 + Math.sin(a) * d;
      if (Math.abs(x) < 5 && z > 0) continue;
      tree(x, z, 1.7 + r() * 0.7);
    }
    // ---- the vista: Menoreh ridge, Borobudur, Merapi, Merbabu ----
    const ridgeM = lam2({ color: "#5f7f6a" });
    for (let i = 0; i < 7; i++) { // low lumpy cones: hills, not a wall
      const w = 46 + r() * 44, h = 6 + r() * 8;
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(w * 0.55, h, 5), ridgeM);
      ridge.scale.z = 0.38; ridge.rotation.y = r() * 3;
      ridge.position.set(-95 + i * 34 + r() * 16, h / 2 - 2.5, -100 - r() * 24); R.add(ridge);
    }
    const silM = lam2({ color: "#71879c" });
    const silM2 = lam2({ color: "#7e93a8" });
    { // Borobudur: six shrinking square tiers + the great stupa
      const B = new THREE.Group(); B.position.set(-38, -1.5, -125); R.add(B);
      for (let i = 0; i < 6; i++) {
        const w = 34 - i * 4.6;
        const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, w), i % 2 ? silM : silM2);
        tier.position.y = 1.3 + i * 2.6; B.add(tier);
      }
      const stupa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.4, 6.5, 10), silM);
      stupa.position.y = 15.6 + 3.2; B.add(stupa);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 8), silM);
      tip.position.y = 15.6 + 6.5 + 1.2; B.add(tip);
    }
    { // Merapi: a steep, near-perfect cone; Merbabu: its broader twin
      const merapi = new THREE.Mesh(new THREE.ConeGeometry(21, 37, 18), silM2);
      merapi.position.set(16, 37 / 2 - 2, -142); R.add(merapi);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(6.5, 11, 18), lam2({ color: "#aebfce" }));
      cap.position.set(16, 37 - 2 - 5.5 + 5.5, -142); cap.position.y = 37 - 2 - 5.2; R.add(cap);
      const merbabu = new THREE.Mesh(new THREE.ConeGeometry(27, 29, 18), silM);
      merbabu.position.set(52, 29 / 2 - 2, -130); R.add(merbabu);
    }
  }

  // ---------------- THE CHICKEN ----------------
  private buildChicken(R: THREE.Group, r: () => number) {
    const plaster = lam2({ map: rep(plasterTex(), 3, 2) });
    const plasterPlain = lam2({ color: "#ece1cc", map: rep(plasterTex(), 1, 1) });
    const stoneM = lam2({ map: rep(stone("ayamBase", ["#a89a80", "#998a6e", "#b5a78c", "#8a7c62"]), 6, 3) });
    // stone base platform + front steps
    const base = new THREE.Mesh(new THREE.BoxGeometry(17, 1.1, 21), stoneM);
    base.position.set(0, 0.55, -16); base.castShadow = true; base.receiveShadow = true; R.add(base);
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.4 - i * 0.5, 0.28, 0.9), stoneM);
      step.position.set(0, 0.14 + i * 0.26, -4.6 + i * 0.75); step.receiveShadow = true; R.add(step);
    }
    blob(R, 0, 1.12, -16, 19, 23, 0.3);
    // ---- the body: a great warm-white ellipsoid ----
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), plaster);
    body.scale.set(5.2, 4.2, 7.5); body.position.set(...BODY_C); body.castShadow = true; body.receiveShadow = true; R.add(body);
    // wing hints: two flattened ellipsoids riding the flanks
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), plasterPlain);
      wing.scale.set(0.55, 2.2, 3.6); wing.position.set(side * 5.05, 5.4, -17.5);
      wing.rotation.z = side * 0.12; wing.castShadow = true; R.add(wing);
    }
    // ---- the tail: a fan of five great feathers ----
    const tailM = lam2({ color: "#e5d8c0", map: rep(plasterTex(), 1, 1) });
    for (let i = -2; i <= 2; i++) {
      const feather = new THREE.Mesh(new THREE.BoxGeometry(1.15, 4.6, 0.42), tailM);
      feather.position.set(i * 1.05, 9.3, -23.6);
      feather.rotation.x = -0.62; feather.rotation.z = i * 0.16;
      feather.castShadow = true; R.add(feather);
    }
    // ---- the neck + head ----
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.05, 5.6, 14), plaster);
    neck.position.set(0, 9.7, -8.9); neck.rotation.x = 0.30; neck.castShadow = true; R.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.15, 22, 16), plaster);
    head.position.set(...HEAD); head.castShadow = true; R.add(head);
    // the beak: upper + lower cones, warm orange
    const beakM = lam2({ color: "#e8862c" });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 12), beakM);
    beak.rotation.x = Math.PI / 2 + 0.30; beak.position.set(0, 12.0, -4.8); beak.castShadow = true; R.add(beak);
    const beakLo = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.6, 10), lam2({ color: "#d97a24" }));
    beakLo.rotation.x = Math.PI / 2 + 0.55; beakLo.position.set(0, 11.4, -5.05); R.add(beakLo);
    // a red wattle under the beak (the hen reading, free of charge)
    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), lam2({ color: "#c8352c" }));
    wattle.scale.set(0.7, 1.25, 0.7); wattle.position.set(0, 11.15, -5.6); R.add(wattle);
    // the eyes
    const eyeM = lam2({ color: "#23202a" });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), eyeM);
      eye.position.set(side * 1.52, 12.85, -5.95); R.add(eye);
    }
    // ---- THE CROWN: gold-orange spikes ringing the back of the
    // head top — holiness to its maker, a comb to everyone else ----
    const crownM = lam2({ color: "#d9a441" });
    const crownM2 = lam2({ color: "#e8862c" });
    const spikes: [number, number, number][] = [[-1.2, 14.25, -8.35], [-0.42, 14.52, -8.6], [0.42, 14.52, -8.6], [1.2, 14.25, -8.35], [0, 14.6, -8.95]];
    spikes.forEach(([x, y, z], i) => {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 8), i % 2 ? crownM2 : crownM);
      sp.position.set(x, y, z); sp.castShadow = true; R.add(sp);
    });
    // ---- the crown deck: visitors stand ON the head, front of the
    // spikes — a disc + railing ----
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.16, 18),
      lam2({ color: "#9a6a38", map: rep(stone("ayamDeck", ["#9a6a38", "#8a5a2c", "#aa7a44", "#7a4e26"]), 2, 2) }));
    deck.position.set(DECK[0], DECK[1], DECK[2] - 0.3); deck.castShadow = true; R.add(deck);
    const railM = lam2({ color: "#3c4046" });
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.045, 6, 22, Math.PI * 1.5), railM);
    rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI * 0.78;
    rail.position.set(DECK[0], DECK[1] + 0.95, DECK[2] - 0.3); R.add(rail);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.78 + (i / 6) * Math.PI * 1.5;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6), railM);
      post.position.set(DECK[0] + Math.cos(a) * 1.3, DECK[1] + 0.48, DECK[2] - 0.3 + Math.sin(a) * 1.3); R.add(post);
    }
    // ---- the entrance block in the chest + door + porch ----
    const block = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 2.4), plasterPlain);
    block.position.set(0, 3.3, -9.7); block.castShadow = true; R.add(block);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.7, 0.18), lam2({ color: "#6e4525", map: rep(stone("ayamDoor", ["#6e4525", "#5d3a1f", "#7d5636", "#4f3018"]), 1, 2) }));
    door.position.set(0, 2.4, -8.42); R.add(door);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.3), lam2({ color: "#a0552f" }));
    porch.position.set(0, 3.95, -8.15); porch.rotation.x = 0.18; porch.castShadow = true; R.add(porch);
    // a warm lamp over the door (glows at golden hour)
    const lampMat = new THREE.MeshBasicMaterial({ color: "#ffd98a", fog: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lampMat);
    lamp.position.set(0, 3.6, -8.25); lamp.layers.set(NOINK); R.add(lamp);
    this.glowMats.push(lampMat);
    // ---- window rows on the flanks: seven floors of prayer rooms --
    const winM = lam2({ color: "#2c3440" });
    const winGlow = new THREE.MeshBasicMaterial({ color: "#ffca6a", transparent: true, opacity: 0.0, fog: false });
    this.glowMats.push(winGlow);
    for (const side of [-1, 1]) for (const wy of [3.1, 5.2, 7.3]) for (const wz of [-20.6, -17.8, -13.4, -11.2]) {
      const ey = (wy - BODY_C[1]) / 4.2, ez = (wz - BODY_C[2]) / 7.5;
      const rem = 1 - ey * ey - ez * ez;
      if (rem <= 0.05) continue;
      const wx = side * 5.2 * Math.sqrt(rem);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.62), winM);
      win.position.set(wx + side * 0.03, wy, wz); R.add(win);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72), winGlow);
      gl.position.set(wx + side * 0.09, wy, wz); gl.rotation.y = side * Math.PI / 2; gl.layers.set(NOINK); R.add(gl);
    }
    // ---- the side stair: up the +X flank to a neck platform ----
    const stairM = lam2({ color: "#9a8a70", map: rep(stone("ayamStair", ["#9a8a70", "#8a7a60", "#aa9a80", "#7c6c52"]), 1, 1) });
    for (let i = 0; i < 14; i++) {
      const z = -1 - i * 0.82, y = (-1 - z) * 0.85;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.24, 0.95), stairM);
      step.position.set(6.1, y - 0.12, z); step.castShadow = true; R.add(step);
      if (i % 3 === 0) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, Math.max(0.4, y), 6), railM);
        post.position.set(6.75, y / 2, z); R.add(post);
      }
      const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), railM);
      railPost.position.set(6.8, y + 0.45, z); R.add(railPost);
    }
    const plat2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.26, 2.5), stairM);
    plat2.position.set(6.1, 9.62, -12.6); plat2.castShadow = true; R.add(plat2);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.8), lam2({ color: "#8a5a2c" }));
    plank.position.set(4.6, 9.75, -11.6); plank.rotation.z = 0.1; plank.rotation.y = 0.5; R.add(plank);
    void r;
  }

  // ---------------- café by the tail + signs ----------------
  private buildCafeAndSigns(R: THREE.Group, r: () => number) {
    const woodM = lam2({ color: "#8a5a2c", map: rep(stone("ayamWood", ["#8a5a2c", "#7a4e26", "#9a6a38", "#6a421f"]), 2, 1) });
    // the café hut at the tail: posts + pyramid roof + counter
    const hut = new THREE.Group(); hut.position.set(CAFE[0], 0, CAFE[2]); R.add(hut);
    for (const [px, pz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]] as const) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 7), woodM);
      post.position.set(px, 1.3, pz); post.castShadow = true; hut.add(post);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4), lam2({ color: "#a0552f", map: rep(stone("ayamRoof", ["#a0552f", "#8f4a28", "#b26136", "#7e3f20"]), 3, 1) }));
    roof.position.y = 3.3; roof.rotation.y = Math.PI / 4; roof.castShadow = true; hut.add(roof);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.7), woodM);
    counter.position.set(0, 0.5, 0.9); counter.castShadow = true; hut.add(counter);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55),
      lam2({ map: signTex("ayamKedai", "KEDAI", "#7a2e22", "#f2ede2") }));
    sign.position.set(0, 2.2, 1.24); hut.add(sign);
    // two café tables + an umbrella on the grass by the tail
    for (const [tx, tz] of [[4.6, -21.5], [9.8, -20.6]] as const) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), lam2({ color: "#e8e2d2" }));
      top.position.set(tx, 0.72, tz); top.castShadow = true; R.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 7), woodM);
      leg.position.set(tx, 0.36, tz); R.add(leg);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.5, 10), lam2({ color: tx > 6 ? "#c8352c" : "#2e6e5e" }));
      umb.position.set(tx, 1.95, tz); umb.castShadow = true; R.add(umb);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), woodM);
      pole.position.set(tx, 1.3, tz); R.add(pole);
    }
    // the entrance sign where the path meets the clearing
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.9, 7), woodM);
    post1.position.set(2.6, 1.45, 17); post1.castShadow = true; R.add(post1);
    const post2 = post1.clone(); post2.position.x = -2.6; R.add(post2);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35),
      lam2({ map: signTex("ayamSign", "BUKIT RHEMA", "#274a7a", "#f2ede2") }));
    board.position.set(0, 2.5, 17); R.add(board);
    void r;
  }

  // ---------------- the ruin dressing (storm shot only) ----------------
  private buildRuin(R: THREE.Group, r: () => number) {
    const G = this.ruin;
    // graffiti boards streaked across the flanks + chest
    const g1 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshLambertMaterial({ map: graffitiTex("ayamGraf1", "HANTU?"), transparent: true }));
    g1.position.set(5.28, 4.6, -16); g1.rotation.y = Math.PI / 2; G.add(g1);
    const g2 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshLambertMaterial({ map: graffitiTex("ayamGraf2", "1988"), transparent: true }));
    g2.position.set(-5.28, 4.2, -17); g2.rotation.y = -Math.PI / 2; G.add(g2);
    const g3 = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.6),
      new THREE.MeshLambertMaterial({ map: graffitiTex("ayamGraf3", "???"), transparent: true }));
    g3.position.set(0, 5.6, -8.62); G.add(g3);
    // vines: dark leafy cones crawling over the neck + tail
    const vineM = lam2({ color: "#33512c", flatShading: true });
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2, rr = 1.2 + r() * 1.4;
      const vine = new THREE.Mesh(new THREE.ConeGeometry(0.5 + r() * 0.5, 1.6 + r() * 2.2, 7), vineM);
      vine.position.set(Math.cos(a) * rr * 0.6, 8.6 + r() * 3.4, -8.9 + Math.sin(a) * rr * 0.5);
      vine.rotation.x = Math.PI + (r() - 0.5) * 0.5; G.add(vine);
    }
    for (let i = 0; i < 8; i++) {
      const vine = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + r() * 0.7, 1), vineM);
      vine.position.set((r() - 0.5) * 8, 8.2 + r() * 2.4, -22.6 - r() * 1.6);
      vine.scale.y = 0.7; G.add(vine);
    }
    // the broken fence along the path: tilted posts + a fallen rail
    const fenceM = lam2({ color: "#6a5138" });
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), fenceM);
      post.position.set(2.1, 0.5, 12 - i * 3.1);
      post.rotation.z = (r() - 0.5) * 0.55; post.rotation.x = (r() - 0.5) * 0.3; G.add(post);
    }
    const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 5.2), fenceM);
    fallen.position.set(2.3, 0.16, 5); fallen.rotation.y = 0.24; G.add(fallen);
    // weeds swallowing the base
    const weedM = lam2({ color: "#557f35", flatShading: true });
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = 8.5 + r() * 4;
      const weed = new THREE.Mesh(new THREE.ConeGeometry(0.32 + r() * 0.3, 0.9 + r() * 1.1, 6), weedM);
      weed.position.set(Math.cos(a) * d, 0.5, -14 + Math.sin(a) * d); G.add(weed);
    }
    void R;
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
    const azOff = id === 3 || id === 7 ? 58 : 0; // golden here rakes in from the side, not dead-ahead
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
    // the wide + vista shots must see across the jungle to the rim
    const fogK = id === 9 ? 3.4 : id === 2 || id === 6 ? 1.7 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    // ---- the ruin dressing exists only in the storm shot ----
    this.ruin.visible = id === 6;
    // ---- glow: door lamp + window warmth at golden hour ----
    const golden = s.light === "golden";
    for (const gm of this.glowMats) gm.opacity = golden ? 0.95 : 0.0;
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
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const dir = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(-1);
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
