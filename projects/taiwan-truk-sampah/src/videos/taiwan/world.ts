// Taipei residential street at dusk as one three.js scene for the
// Fafnir-ID cover frame: a YELLOW garbage truck rolls down the
// street playing Beethoven's Für Elise while residents chase it
// with their sorted trash bags — no curbside bins, "garbage
// doesn't touch the ground". The hero prop is the GIANT yellow
// truck itself, music notes drifting above it. Apartment blocks
// line both sidewalks, street lamps glow, scooters park at the
// curb. VISUAL CORE: warm dusk street light, yellow truck,
// floating music notes, textured everything (anti-banding:
// speckled sky, flecked asphalt). Layered light rig: sun key w/
// soft shadows + hemisphere fill + rim.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, CLOUD_GOLD, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, ROAD_HALF, WALK_R, WALK_L, HERO_SPOT, TRUCK_HOME, truckZAt } from "./story";

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
const skyTexDay = () => ctex("taiwanSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#1d5cc6"); grad.addColorStop(0.34, "#3d80dc"); grad.addColorStop(0.62, "#79aeee");
  grad.addColorStop(0.85, "#bcd9f7"); grad.addColorStop(1, "#e9f2fb");
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
/** Golden-hour sky (shot 7 only): peach at the horizon rising
 *  through rose to muted mauve at the zenith, bigger warmer sun. */
const skyTexGolden = () => ctex("taiwanSkyGolden", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#86708c"); grad.addColorStop(0.3, "#b57d88"); grad.addColorStop(0.55, "#d3866e");
  grad.addColorStop(0.8, "#e29468"); grad.addColorStop(1, "#eaa26e");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 7; i++) {
    const x = r() * 2048, y = 60 + r() * 190, w = 260 + r() * 420;
    const wg = g.createRadialGradient(x, y, 4, x, y, w / 2);
    wg.addColorStop(0, "rgba(255,220,170,0.22)"); wg.addColorStop(1, "rgba(255,220,170,0)");
    g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y);
    g.fillStyle = wg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
  const clusters: [number, number, number][] = [
    [120, 430, 62], [420, 385, 84], [760, 450, 56], [1080, 395, 96], [1420, 445, 60],
    [1700, 380, 88], [1980, 440, 58], [600, 330, 44], [1300, 320, 48], [1850, 300, 40],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,230,200" : "90,50,60"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 200, 8, 420, 200, 340);
  sn.addColorStop(0, "rgba(255,230,170,0.95)"); sn.addColorStop(0.12, "rgba(255,200,120,0.6)"); sn.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = sn; g.fillRect(60, 0, 720, 560);
  g.fillStyle = "#ffe9bb"; g.beginPath(); g.arc(420, 200, 42, 0, 7); g.fill();
});
/** soft radial glow sprite (the sun's halo in the 3D scene) */
const glowTex = () => ctex("taiwanGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** a small flock of distant birds, painted as one sprite */
const birdTex = () => ctex("taiwanBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
/** asphalt road texture: dark grey base, faded centre dashes,
 *  tyre-worn bands, speckled anti-banding grain. */
const roadTex = () => ctex("taiwanRoad", 512, 512, (g, r) => {
  g.fillStyle = "#3c4148"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 60;
    g.strokeStyle = r() > 0.5 ? "rgba(120,130,145,0.25)" : "rgba(20,24,30,0.3)";
    g.lineWidth = 2 + r() * 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 8); g.stroke();
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "200,210,225" : "10,12,16"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // centre dashes (drawn once per tile, tiled along Z)
  g.fillStyle = "rgba(240,220,120,0.85)";
  g.fillRect(250, 60, 12, 120);
  g.fillRect(250, 330, 12, 120);
});
/** apartment facade texture: warm concrete + a grid of windows,
 *  some lit gold (dusk), some dark — never a flat wall. */
const facadeTex = (seed: number) => ctex(`taiwanFacade${seed}`, 512, 512, (g, r) => {
  const base = ["#b89a7a", "#a08a72", "#9a8a80", "#b0a08e"][seed % 4];
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,210" : "40,30,20"},${0.02 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2.5, 2.5); }
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 28 + col * 120, y = 30 + row * 78, w = 72, h = 52;
      const lit = r() > 0.45;
      g.fillStyle = lit ? "#ffd98a" : "#2e3a4e";
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(20,16,10,0.55)";
      g.fillRect(x, y + h / 2 - 2, w, 4);
      g.fillRect(x + w / 2 - 2, y, 4, h);
      g.strokeStyle = "rgba(30,22,14,0.7)"; g.lineWidth = 3;
      g.strokeRect(x, y, w, h);
      if (lit) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, y, w, 10); }
    }
  }
  // ground-floor shopfront awning strip
  g.fillStyle = ["#2e7f86", "#c25a3a", "#3b5b9a"][seed % 3];
  g.fillRect(0, 448, 512, 64);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 8; i++) g.fillRect(10 + i * 64, 448, 32, 64);
});
/** soft white puff sprite: truck exhaust + dust */
const puffTex = () => ctex("taiwanPuff", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const blobTex = () => ctex("taiwanBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(10,30,60,0.55)"); gr.addColorStop(0.6, "rgba(10,30,60,0.3)"); gr.addColorStop(1, "rgba(10,30,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** The yellow garbage truck: compactor body, cab with windshield,
 *  wheels, rear compactor door, roof speaker, headlights.
 *  Nose toward +Z (toward camera). ~6.5 m long, 2.4 m wide. */
const makeTruck = () => {
  const g = new THREE.Group();
  const yellow = lam2({ color: "#f2c018" });
  const yellowDark = lam2({ color: "#d8a410" });
  // compactor body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.1, 4.4), yellow);
  body.position.set(0, 1.55, -1.0); body.castShadow = true; g.add(body);
  // body ribs
  for (const bz of [-2.6, -1.6, -0.6]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.12, 0.18), yellowDark);
    rib.position.set(0, 1.55, bz); g.add(rib);
  }
  // rear compactor door (the opening the crew feeds)
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 0.14), lam2({ color: "#b8890a" }));
  door.position.set(0, 1.45, -3.24); g.add(door);
  // cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 1.6), yellow);
  cab.position.set(0, 1.35, 2.0); cab.castShadow = true; g.add(cab);
  // windshield (dark, glossy)
  const shield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.1), lam2({ color: "#1e2a3a" }));
  shield.position.set(0, 1.7, 2.82); g.add(shield);
  // bumper + headlights
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 0.2), lam2({ color: "#3a3f4a" }));
  bumper.position.set(0, 0.45, 2.9); g.add(bumper);
  for (const s of [1, -1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.1), lam2({ color: "#fff2b0" }));
    lamp.position.set(s * 0.8, 0.75, 2.86); g.add(lamp);
  }
  // roof speaker (the music source)
  const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), lam2({ color: "#3a3f4a" }));
  speaker.position.set(0, 2.85, 1.6); g.add(speaker);
  // wheels (spin in update)
  const wheels: THREE.Group[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 14);
  const wheelM = lam2({ color: "#1a1d22" });
  for (const [wx, wz] of [[-1.05, 2.1], [1.05, 2.1], [-1.05, -1.9], [1.05, -1.9]] as [number, number][]) {
    const wg = new THREE.Group();
    const w = new THREE.Mesh(wheelGeo, wheelM);
    w.rotation.z = Math.PI / 2; w.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 10), lam2({ color: "#8a8f98" }));
    hub.rotation.z = Math.PI / 2;
    wg.add(w, hub);
    wg.position.set(wx, 0.48, wz);
    g.add(wg); wheels.push(wg);
  }
  g.userData.wheels = wheels;
  return g;
};
/** One apartment block: box + facade texture + rooftop water tank. */
const makeBuilding = (w: number, h: number, d: number, seed: number) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    lam2({ map: rep(facadeTex(seed), 1, Math.max(1, Math.round(h / 12))) }));
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // rooftop water tank (classic Taipei silhouette)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), lam2({ color: "#6a7078" }));
  tank.position.set(w * 0.22, h + 0.8, 0); g.add(tank);
  // AC boxes on the facade
  for (let i = 0; i < 3; i++) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), lam2({ color: "#c8c4bc" }));
    ac.position.set(-w / 2 - 0.1, 2 + i * 4, -d / 4 + i); g.add(ac);
  }
  return g;
};
/** A street lamp: pole + arm + glowing head. */
const makeLamp = () => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.2, 8), lam2({ color: "#3a3f4a" }));
  pole.position.y = 2.6; g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), lam2({ color: "#3a3f4a" }));
  arm.rotation.z = Math.PI / 2; arm.position.set(0.6, 5.15, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), lam2({ color: "#fff2b0" }));
  head.position.set(1.25, 5.1, 0); g.add(head);
  return g;
};
/** A parked scooter at the curb: body, seat, wheels, handlebar. */
const makeScooter = (col: string) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.7), lam2({ color: col }));
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.8), lam2({ color: "#22242a" }));
  seat.position.set(0, 0.85, -0.3); g.add(seat);
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12);
  const wheelM = lam2({ color: "#1a1d22" });
  for (const wz of [0.75, -0.75]) {
    const w = new THREE.Mesh(wheelGeo, wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(0, 0.28, wz); g.add(w);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), lam2({ color: "#3a3f4a" }));
  bar.rotation.x = Math.PI / 2; bar.position.set(0, 1.05, 0.8); g.add(bar);
  return g;
};
/** A street tree: trunk + two canopy blobs. */
const makeTree = () => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 8), lam2({ color: "#5d4028" }));
  trunk.position.y = 1.1; trunk.castShadow = true; g.add(trunk);
  const leafM = lam2({ color: "#3f7a3a" });
  for (const [x, y, z, r] of [[0, 2.9, 0, 1.1], [0.7, 2.4, 0.2, 0.8], [-0.6, 2.5, -0.2, 0.75]] as [number, number, number, number][]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), leafM);
    c.position.set(x, y, z); c.castShadow = true; g.add(c);
  }
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private cloudDay: THREE.Texture[] = [];
  private cloudGold: THREE.Texture[] = [];
  private skyGolden = false;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private truck: THREE.Group | null = null;
  private truckWheels: THREE.Group[] = [];
  private lampGlows: THREE.Sprite[] = [];
  private puffs: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(1996);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#2a4a6a", 0.55);
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
      this.cloudDay.push(sp.material.map as THREE.Texture);
      this.cloudGold.push(cloudHD(300 + i * 37, CLOUD_GOLD));
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    // the sun's halo + core, upper left over the street
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    // distant bird flocks, small + high
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildStreet(R, r);
  }

  // ---------------- the Taipei street ----------------
  private buildStreet(R: THREE.Group, r: () => number) {
    // the road itself: asphalt, scrolling dashes — the street LIVES
    const roadMap = rep(roadTex(), 1, 24);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 220),
      lam2({ map: roadMap, color: "#ffffff" }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -80); road.receiveShadow = true; R.add(road);
    // sidewalks: lighter concrete strips, slightly raised
    for (const s of [1, -1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 220), lam2({ color: "#9aa0a8" }));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(s * (ROAD_HALF + 1.1), 0.06, -80);
      walk.receiveShadow = true; R.add(walk);
      // curb edge
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 220), lam2({ color: "#7a8088" }));
      curb.position.set(s * ROAD_HALF, 0.08, -80); R.add(curb);
    }
    // apartment blocks lining both sides (varied heights/widths)
    const blocks: [number, number, number, number, number][] = [
      // x, z, w, h, d
      [9.5, -8, 7, 14, 8], [9.5, -20, 8, 20, 9], [9.5, -33, 7, 11, 8], [9.5, -46, 9, 24, 10],
      [-9.5, -12, 8, 18, 9], [-9.5, -25, 7, 12, 8], [-9.5, -38, 9, 22, 10], [-9.5, -52, 7, 15, 8],
      [10.5, 4, 8, 16, 9], [-10.5, 2, 8, 13, 9],
    ];
    blocks.forEach(([x, z, w, h, d], i) => {
      const b = makeBuilding(w, h, d, i);
      b.position.set(x, 0, z);
      R.add(b);
    });
    // ---- the YELLOW garbage truck ----
    const truck = makeTruck();
    truck.position.set(TRUCK_HOME[0], 0, TRUCK_HOME[2]);
    R.add(truck);
    this.truck = truck;
    this.truckWheels = truck.userData.wheels as THREE.Group[];
    blob(R, 0, 0.05, TRUCK_HOME[2], 3.2, 7.5, 0.3);
    // ---- street lamps down both sidewalks + glow sprites ----
    for (const [x, z] of [[5.0, -2], [-5.0, -10], [5.0, -18], [-5.0, -26], [5.0, -34], [-5.0, -42]] as [number, number][]) {
      const lamp = makeLamp();
      lamp.position.set(x, 0, z);
      // lamps on the left lean their arm over the road
      if (x < 0) lamp.rotation.y = Math.PI;
      R.add(lamp);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.55 }));
      gl.position.set(x + (x > 0 ? 1.25 : -1.25), 5.1, z);
      gl.scale.set(3.2, 3.2, 1); gl.layers.set(NOINK);
      R.add(gl); this.lampGlows.push(gl);
    }
    // ---- parked scooters + street trees ----
    for (const [x, z, col] of [[4.6, -8, "#c25a3a"], [4.6, -16, "#3b5b9a"], [-4.6, -20, "#2e7f86"]] as [number, number, string][]) {
      const sc = makeScooter(col);
      sc.position.set(x, 0, z); sc.rotation.y = (r() - 0.5) * 0.4;
      R.add(sc);
    }
    for (const [x, z] of [[4.8, -12], [-4.8, -30], [4.8, -40]] as [number, number][]) {
      const tr = makeTree();
      tr.position.set(x, 0, z);
      R.add(tr);
    }
    // ---- exhaust puffs behind the truck (animated in update) ----
    const puffM = new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(puffM.clone());
      sp.position.set(0.6, 0.6, TRUCK_HOME[2] - 3.4);
      sp.scale.set(0.8, 0.8, 1); sp.layers.set(NOINK);
      R.add(sp);
      this.puffs.push({ sp, x: 0.6, y: 0.6, z: TRUCK_HOME[2] - 3.4, ph: i * 0.33 });
    }
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
    // ---- sky dome + clouds: swap to the golden palette on golden shots ----
    this.skyDay.visible = true;
    const golden = s.light === "golden";
    if (golden !== this.skyGolden) {
      this.skyGolden = golden;
      (this.skyDay.material as THREE.MeshBasicMaterial).map = golden ? skyTexGolden() : skyTexDay();
      (this.skyDay.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.clouds.forEach((c2, i) => {
        (c2.material as THREE.SpriteMaterial).map = golden ? this.cloudGold[i] : this.cloudDay[i];
      });
    }
    for (const c2 of this.clouds) c2.visible = true;
    // ---- STANDAR GERAK: everything that should move, moves ----
    // clouds drift on the wind, each at its own pace
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    // bird flocks cross the sky with a gentle bob
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    // the truck rolls along its shot path; wheels spin with distance
    if (this.truck) {
      const tz = truckZAt(id, tt);
      this.truck.position.z = tz;
      this.truck.position.y = Math.sin(tt * 7.5) * 0.015; // engine idle tremble
      const spin = tz * 2.1;
      for (const w of this.truckWheels) w.rotation.x = spin;
    }
    // lamp glows breathe gently at dusk
    this.lampGlows.forEach((gl, i) => {
      (gl.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(tt * 1.4 + i * 1.7) * 0.12;
    });
    // exhaust puffs rise + grow + fade behind the truck, looped
    for (const pf of this.puffs) {
      const ph = (tt * 0.45 + pf.ph) % 1;
      const mat = pf.sp.material as THREE.SpriteMaterial;
      mat.opacity = 0.5 * (1 - ph);
      const sc2 = 0.5 + ph * 1.2;
      pf.sp.scale.set(sc2, sc2, 1);
      pf.sp.position.set(pf.x + Math.sin(tt * 1.3 + pf.ph * 9) * 0.1, pf.y + ph * 1.6, (this.truck ? this.truck.position.z : pf.z) - 3.4);
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
