// The Api Biru Ijen film as one three.js scene: a terraced volcanic crater
// bowl (lathe-turned rock, flat-shaded facets, painted texture) — the
// turquoise acid lake on the west floor, the sulfur vent + mining zone on the
// east shore (ceramic pipes, glowing cracks, blue flame sprites, a molten
// blue "river"), a stepped trail spiralling up the south-east wall to the rim
// viewpoint, and the weighing station on the rim plateau.
// VISUAL CORE: electric-blue fire in a dark but READABLE crater — star dome
// with Milky Way, moonlit terraced rock, glowing lake, yellow sulfur, drifting
// smoke. NEVER flat black (anti-banding: speckled sky + textured surfaces +
// grain). Layered light rig: moon key w/ soft shadows + hemi fill + cool rim,
// plus two blue point lights at the vent so the fire lights its surroundings.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, planks, beam } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, TRAIL, WALL_PROFILE, wallY, JET3_T, FLARE10_T } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const rockTex = (key: string, base: string, fleck: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "210,205,195" : "18,16,20"},${0.04 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2.6, 2.6); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${fleck},${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 34, 4 + r() * 16, r() * 3, 0, 7); g.fill(); }
  // strata bands — the terraced crater-wall layering
  for (let y = 40; y < 1024; y += 64 + r() * 50) {
    g.fillStyle = `rgba(12,10,14,${0.10 + r() * 0.08})`; g.fillRect(0, y, 1024, 5 + r() * 7);
    g.fillStyle = `rgba(225,220,205,${0.05 + r() * 0.05})`; g.fillRect(0, y + 9, 1024, 3);
  }
  g.strokeStyle = "rgba(15,13,17,0.4)"; g.lineWidth = 2.5;
  for (let i = 0; i < 16; i++) { g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
});
const ashTex = () => ctex("ijenAsh", 1024, 1024, (g, r) => {
  g.fillStyle = "#5b564e"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "205,198,182" : "26,24,22"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(232,188,30,${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 3 + r() * 12, 2 + r() * 7, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(30,28,26,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 20, 3 + r() * 10, r() * 3, 0, 7); g.fill(); }
});
const lakeTex = () => ctex("ijenLake", 1024, 1024, (g, r) => {
  const grad = g.createRadialGradient(512, 512, 60, 512, 512, 520);
  grad.addColorStop(0, "#3fd8c8"); grad.addColorStop(0.55, "#25b3ac"); grad.addColorStop(0.85, "#128a8f"); grad.addColorStop(1, "#0b6a78");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
  // milky swirls (dissolved sulfur clouds in the acid)
  for (let i = 0; i < 90; i++) {
    const x = r() * 1024, y = r() * 1024, w = 40 + r() * 150;
    const cg = g.createRadialGradient(x, y, 2, x, y, w);
    cg.addColorStop(0, `rgba(190,245,225,${0.05 + r() * 0.1})`); cg.addColorStop(1, "rgba(190,245,225,0)");
    g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, w, w * 0.4, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.6 ? "230,255,248" : "6,60,70"},${0.04 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 1024, 2.2, 2.2); }
  // moon glints
  for (let i = 0; i < 240; i++) { g.fillStyle = `rgba(235,248,255,${0.12 + r() * 0.25})`; g.fillRect(300 + r() * 420, r() * 1024, 5 + r() * 14, 1.8); }
});
const sulfurTex = () => ctex("ijenSulfur", 512, 512, (g, r) => {
  g.fillStyle = "#d9a914"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,226,80" : "140,100,10"},${0.08 + r() * 0.14})`; g.fillRect(r() * 512, r() * 512, 3, 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,86,8,${0.1 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 18, 3 + r() * 9, r() * 3, 0, 7); g.fill(); }
});
const blobTex = () => ctex("ijenBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blueFlameTex = () => ctex("ijenBlueFlame", 128, 256, (g) => {
  // a teardrop flame tongue: wide bright base, pointed tip (NOT an ellipse —
  // ellipses read as glowing eggs on screen)
  const tear = (w: number, h: number, fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(64, 256 - h);
    g.bezierCurveTo(64 + w, 256 - h * 0.55, 64 + w * 0.72, 256 - h * 0.18, 64, 256);
    g.bezierCurveTo(64 - w * 0.72, 256 - h * 0.18, 64 - w, 256 - h * 0.55, 64, 256 - h);
    g.fill();
  };
  // soft outer halo first (radial, faint), then layered tongues
  const gr = g.createRadialGradient(64, 200, 4, 64, 180, 110);
  gr.addColorStop(0, "rgba(90,150,255,0.5)"); gr.addColorStop(1, "rgba(40,80,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  tear(46, 235, "rgba(70,130,255,0.85)");
  tear(32, 195, "rgba(140,190,255,0.95)");
  tear(19, 140, "rgba(235,246,255,0.98)");
});
const glowTex = () => ctex("ijenGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.4, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** the night sky dome — speckled stars + Milky Way + moon glow (anti-banding) */
const skyTexNight = () => ctex("ijenSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#040a1c"); grad.addColorStop(0.4, "#081631"); grad.addColorStop(0.75, "#10264a"); grad.addColorStop(1, "#1d3a5f");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,20"},${0.02 + r() * 0.04})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  for (let i = 0; i < 3400; i++) {
    const y = Math.pow(r(), 1.4) * 900, s = r() < 0.06 ? 3.4 : 2.2;
    g.fillStyle = `rgba(235,242,255,${0.45 + r() * 0.55})`;
    g.fillRect(r() * 2048, y, s, s);
  }
  g.save(); g.translate(1024, 330); g.rotate(-0.42);
  for (let i = 0; i < 5200; i++) {
    const x = (r() - 0.5) * 1900, y = (r() - 0.5) * (90 + Math.abs(x) * 0.05) + (r() - 0.5) * 26;
    g.fillStyle = `rgba(${r() > 0.3 ? "220,232,255" : "170,195,235"},${0.08 + r() * 0.26})`;
    g.fillRect(x, y, 2.4, 2.4);
  }
  const mg = g.createLinearGradient(0, -90, 0, 90);
  mg.addColorStop(0, "rgba(190,210,245,0)"); mg.addColorStop(0.5, "rgba(190,210,245,0.2)"); mg.addColorStop(1, "rgba(190,210,245,0)");
  g.fillStyle = mg; g.fillRect(-1000, -95, 2000, 190);
  g.restore();
  const mn = g.createRadialGradient(1620, 190, 8, 1620, 190, 190);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(215,230,255,0.5)"); mn.addColorStop(1, "rgba(200,220,255,0)");
  g.fillStyle = mn; g.fillRect(1380, 0, 480, 430);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(1620, 190, 26, 0, 7); g.fill();
  g.fillStyle = "rgba(190,205,230,0.5)"; g.beginPath(); g.arc(1610, 182, 6, 0, 7); g.fill(); g.beginPath(); g.arc(1632, 200, 4.4, 0, 7); g.fill();
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
const prism = (w: number, h: number, d: number, mat: THREE.Material) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const deadTree = (r: () => number) => {
  const grp = new THREE.Group();
  const mat = lam2({ color: "#7d838c", map: beam() });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 2.6, 7), mat);
  trunk.position.y = 1.3; trunk.rotation.z = 0.1; trunk.castShadow = true; grp.add(trunk);
  for (let i = 0; i < 4; i++) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.3 + r() * 0.7, 6), mat);
    const a = (i / 4) * Math.PI * 2 + r();
    br.position.set(Math.cos(a) * 0.4, 2.6 + r() * 0.5, Math.sin(a) * 0.4);
    br.rotation.set(Math.sin(a) * 0.8, 0, Math.cos(a) * 0.8);
    grp.add(br);
  }
  return grp;
};

type Glow = { sp: THREE.Sprite; base: number; kind: number };
type Smoke = { sp: THREE.Sprite; x: number; y: number; z: number; ph: number; rise: number; sc: number; op: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#14263f", 30, 240);
  private flames: Glow[] = [];
  private fireLights: THREE.PointLight[] = [];
  private smokes: Smoke[] = [];
  private lakeMat: THREE.MeshLambertMaterial;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(4242);
    // ---- light rig: moon key (shadow caster) + hemisphere fill + cool rim ----
    this.hemi = new THREE.HemisphereLight("#33507e", "#141d29", 0.34);
    this.sun = new THREE.DirectionalLight("#a9c6ff", 1.05);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#bcd7ff", 0.3);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + moon sprite ----
    const sky = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexNight(), side: THREE.BackSide, fog: false }));
    sky.layers.set(NOINK); R.add(sky);
    const moonSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#dfeaff", transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    moonSp.position.set(330, 300, -420); moonSp.scale.set(150, 150, 1); moonSp.layers.set(NOINK); R.add(moonSp);
    // ---- THE CRATER: lathe-turned terraced bowl from the shared profile ----
    {
      const pts = WALL_PROFILE.map(([rr, yy]) => new THREE.Vector2(rr, yy));
      pts.push(new THREE.Vector2(110, -2));
      const geo = new THREE.LatheGeometry(pts, 110);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const jr = rng(99);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const rad = Math.hypot(x, z);
        if (rad < 0.5) continue;
        const rimBand = rad >= 40 && rad <= 59;
        const floorBand = rad <= 20.5;
        const ra = rimBand ? 0.25 : floorBand ? 0.1 : 1.1;
        const ya = rimBand ? 0.1 : floorBand ? 0.05 : 0.45;
        const d = (jr() - 0.5) * ra, dy = (jr() - 0.5) * ya;
        const s = (rad + d) / rad;
        pos.setXYZ(i, x * s, y + dy, z * s);
      }
      geo.computeVertexNormals();
      const crater = new THREE.Mesh(geo, lam2({ map: rep(rockTex("ijenRock", "#6b6259", "200,190,170"), 14, 3), flatShading: true, side: THREE.DoubleSide }));
      crater.receiveShadow = true; crater.castShadow = false;
      R.add(crater);
      // ash floor overlay (the flat crater bottom gets its own finer texture)
      const floor = new THREE.Mesh(new THREE.CircleGeometry(20.4, 40), lam2({ map: rep(ashTex(), 6, 6) }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0.055; floor.receiveShadow = true; R.add(floor);
    }
    // ---- flat standing platforms: viewpoint + weighing station ----
    const platMat = lam2({ map: rep(rockTex("ijenRockP", "#756a5e", "205,195,175"), 3, 3), flatShading: true });
    for (const [px, pz, pr] of [[18, 41, 6.5], [20, 34, 5.5]] as [number, number, number][]) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 1.08, 0.5, 18), platMat);
      disc.position.set(px, 14.28, pz); disc.receiveShadow = true; disc.castShadow = true; R.add(disc);
    }
    // ---- THE LAKE: turquoise acid, milky swirls, moon glints ----
    this.lakeMat = lam2({ map: lakeTex(), emissive: "#0d3f42", emissiveIntensity: 0.42 });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 44), this.lakeMat);
    lake.scale.set(13, 8, 1); lake.rotation.x = -Math.PI / 2; lake.rotation.z = 0.35;
    lake.position.set(-11, 0.12, -5); lake.receiveShadow = true; R.add(lake);
    const shore = new THREE.Mesh(new THREE.CircleGeometry(1, 44), lam2({ color: "#4a463e", map: rep(ashTex(), 4, 4) }));
    shore.scale.set(13.6, 8.6, 1); shore.rotation.x = -Math.PI / 2; shore.rotation.z = 0.35;
    shore.position.set(-11, 0.08, -5); R.add(shore);
    // sulfur-stained rocks around the shore
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + r() * 0.4;
      const rx = -11 + Math.cos(a) * (13.6 + r() * 1.6), rz = -5 + Math.sin(a) * (8.6 + r() * 1.2);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + r() * 0.7, 0),
        lam2({ map: rep(sulfurTex(), 1, 1), flatShading: true, color: "#cbb98a" }));
      rock.position.set(rx, 0.15, rz); rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; R.add(rock);
    }
    // ---- THE VENT ZONE: sulfur mound, ceramic pipes, cracks, blue fire ----
    const vent = new THREE.Group(); R.add(vent);
    const moundMat = lam2({ map: rep(sulfurTex(), 2, 2), flatShading: true, color: "#d8c690" });
    for (const [mx, mz, ms] of [[12.5, 5.5, 2.6], [14.2, 7.6, 1.7], [10.9, 3.9, 1.5], [13.8, 3.4, 1.3]] as [number, number, number][]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(ms, 12, 9), moundMat);
      m.position.set(mx, -ms * 0.45, mz); m.scale.y = 0.55; m.castShadow = true; m.receiveShadow = true; vent.add(m);
    }
    // ceramic pipes venting the gas (the miners' pawon): short vertical
    // chimneys half-buried in the mound, flames jetting from their mouths
    const pipeMat = lam2({ color: "#a0683c", map: rep(planks(), 1, 1) });
    const pipeMouths: V3[] = [[12.2, 0.95, 5.2], [13.2, 0.8, 6.7], [11.8, 0.72, 6.9]];
    for (const [px, py, pz] of pipeMouths) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 1.1, 9), pipeMat);
      pipe.position.set(px, py - 0.55, pz); pipe.castShadow = true; vent.add(pipe);
      const rim2 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), lam2({ color: "#7d4f2a" }));
      rim2.position.set(px, py, pz); rim2.rotation.x = Math.PI / 2; vent.add(rim2);
    }
    // glowing cracks (GROUND points only, flat on the floor) + flame sprites
    const FLAMES: V3[] = [...pipeMouths, [14.6, 0.3, 3.8], [10.7, 0.3, 6.3], [13.9, 0.3, 8.6], [9.8, 0.3, 4.4]];
    const crackMat = new THREE.MeshBasicMaterial({ color: "#2f7bff", fog: false });
    for (const [fx2, fy, fz] of FLAMES) {
      if (fy <= 0.35) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(1.3 + r() * 0.7, 0.04, 0.2), crackMat);
        crack.position.set(fx2, 0.075, fz); crack.rotation.y = r() * 3; crack.layers.set(NOINK); vent.add(crack);
      }
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: blueFlameTex(), transparent: true, depthWrite: false, fog: false }));
      fl.position.set(fx2, fy + 0.75, fz); fl.scale.set(0.8, 2.1, 1); fl.layers.set(NOINK); vent.add(fl);
      this.flames.push({ sp: fl, base: 1, kind: 0 });
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#2f6bff", transparent: true, opacity: 0.34, depthWrite: false, fog: false }));
      gl.position.set(fx2, fy + 0.4, fz); gl.scale.set(4.2, 2.8, 1); gl.layers.set(NOINK); vent.add(gl);
      this.flames.push({ sp: gl, base: 0.34, kind: 1 });
    }
    // the fire lights its surroundings: two blue point lights
    const pl1 = new THREE.PointLight("#3a7bff", 260, 26, 2); pl1.position.set(12.5, 1.4, 5.5); R.add(pl1);
    const pl2 = new THREE.PointLight("#2f6bff", 90, 15, 2); pl2.position.set(6, 0.8, 2); R.add(pl2);
    this.fireLights = [pl1, pl2];
    // molten sulfur "river": glowing blue discs flowing toward the lake
    const riverMat = new THREE.MeshBasicMaterial({ color: "#3d8bff", transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const riverPts: V3[] = [[11.5, 0.09, 4.6], [9.6, 0.09, 3.6], [7.6, 0.09, 2.7], [5.6, 0.09, 1.9], [3.6, 0.09, 1.1], [1.8, 0.09, 0.4], [0.2, 0.09, -0.1]];
    for (let i = 0; i < riverPts.length; i++) {
      const [rx2, ry, rz2] = riverPts[i];
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55 + (i % 3) * 0.14, 12), riverMat);
      disc.rotation.x = -Math.PI / 2; disc.position.set(rx2, ry, rz2); disc.layers.set(NOINK); disc.renderOrder = 1; vent.add(disc);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#2f6bff", transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
      gl.position.set(rx2, 0.35, rz2); gl.scale.set(2.2, 1.2, 1); gl.layers.set(NOINK); vent.add(gl);
      this.flames.push({ sp: gl, base: 0.22, kind: 1 });
    }
    // sulfur chunks + broken deposits scattered around the vent
    const chunkMat = lam2({ map: rep(sulfurTex(), 1, 1), flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 2.2 + r() * 4.5;
      const ch = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + r() * 0.3, 0), chunkMat);
      ch.position.set(12.5 + Math.cos(a) * d, 0.12, 5.5 + Math.sin(a) * d * 0.8);
      ch.rotation.set(r() * 3, r() * 3, r() * 3); ch.castShadow = true; vent.add(ch);
    }
    blob(vent, 12.5, 0.07, 5.5, 9, 7, 0.35);
    // ---- THE TRAIL: stepped slabs spiralling up the wall ----
    {
      const slabMat = lam2({ map: rep(stone("ijenSlab", ["#7a7268", "#6a6259", "#847a6e"]), 1, 1) });
      const skirtMat = lam2({ map: rep(rockTex("ijenRockS", "#5d564e", "190,180,160"), 1, 1), flatShading: true });
      const N = 84;
      for (let i = 0; i <= N; i++) {
        const u = 0.02 + (i / N) * 0.96;
        const [x, y, z] = TRAIL(u);
        const [x2, , z2] = TRAIL(Math.min(u + 0.012, 1));
        const yaw = Math.atan2(x2 - x, z2 - z);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 1.0), slabMat);
        slab.position.set(x, y - 0.06, z); slab.rotation.y = yaw;
        slab.castShadow = true; slab.receiveShadow = true; R.add(slab);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.85), skirtMat);
        skirt.position.set(x, y - 0.95, z); skirt.rotation.y = yaw; R.add(skirt);
      }
    }
    // ---- THE WEIGHING STATION (rim, shot 9) ----
    {
      const st2 = new THREE.Group();
      const postMat = lam2({ color: "#6e5233", map: beam() });
      for (const [ox, oz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]] as [number, number][]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 7), postMat);
        post.position.set(ox, 1.25, oz); post.castShadow = true; st2.add(post);
      }
      const roof = prism(4.1, 1.0, 3.3, lam2({ map: rep(stone("ijenStRoof", ["#8a7a5e", "#77694f", "#97835f"]), 2, 1), color: "#b3a582" }));
      roof.position.y = 2.5; st2.add(roof);
      // hanging scale: beam + chain + a basket of sulfur
      const beamM = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 7), postMat);
      beamM.rotation.z = Math.PI / 2; beamM.position.set(0, 2.3, 0); st2.add(beamM);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), lam2({ color: "#3a3f45" }));
      chain.position.set(-0.8, 1.9, 0); st2.add(chain);
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.5, 9, 1, true),
        lam2({ color: "#c8a878", map: rep(planks(), 2, 1), side: THREE.DoubleSide }));
      basket.position.set(-0.8, 1.25, 0); basket.castShadow = true; st2.add(basket);
      const load = new THREE.Mesh(new THREE.SphereGeometry(0.4, 9, 7), lam2({ map: rep(sulfurTex(), 1, 1), flatShading: true }));
      load.position.set(-0.8, 1.5, 0); load.scale.y = 0.6; st2.add(load);
      // sacks + crates waiting
      for (const [sx, sz] of [[1.1, 0.9], [1.5, 0.2], [0.7, 1.2]] as [number, number][]) {
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 7), lam2({ color: "#9a8a6a", map: rep(planks(), 1, 1) }));
        sack.position.set(sx, 0.3, sz); sack.scale.y = 0.75; sack.castShadow = true; st2.add(sack);
      }
      st2.position.set(20, 14.5, 34); st2.rotation.y = -0.5;
      R.add(st2);
    }
    // ---- dead trees on the rim (Ijen's stark silhouettes) ----
    for (const [tx, tz] of [[-18, 38], [-26, 29], [21, 44], [30, 33]] as [number, number][]) {
      const tr = deadTree(r);
      const rr = Math.hypot(tx, tz);
      tr.position.set(tx, wallY(rr) - 0.1, tz); tr.rotation.y = r() * 3;
      R.add(tr);
    }
    // ---- scattered rocks on floor + walls ----
    const rockMat = lam2({ map: rep(rockTex("ijenRockR", "#655c52", "195,185,168"), 1, 1), flatShading: true });
    for (let i = 0; i < 42; i++) {
      const a = r() * Math.PI * 2, d = 4 + r() * 44;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot((x + 11) / 13, (z + 5) / 8) < 1.25) continue; // keep the lake clear
      const rad = 0.3 + r() * 1.1;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), rockMat);
      rock.position.set(x, wallY(d) + 0.1 - rad * 0.45, z); // sunk into the slope, never floating
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
    }
    // ---- smoke: vent plumes + lake steam (animated in update) ----
    const mkSmoke = (x: number, y: number, z: number, sc: number, op: number, ph: number, rise: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#9fb4c8", transparent: true, opacity: op, depthWrite: false }));
      sp.position.set(x, y, z); sp.scale.set(sc, sc * 0.7, 1); sp.layers.set(NOINK); R.add(sp);
      this.smokes.push({ sp, x, y, z, ph, rise, sc, op });
    };
    for (let i = 0; i < 7; i++) mkSmoke(12.5 + (r() - 0.5) * 3, 1.2, 5.5 + (r() - 0.5) * 3, 3.5 + r() * 3, 0.13, r(), 2.6 + r() * 1.6);
    for (let i = 0; i < 6; i++) mkSmoke(-11 + (r() - 0.5) * 16, 0.7, -5 + (r() - 0.5) * 9, 4 + r() * 3.5, 0.07, r(), 1.1 + r() * 0.7);
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
    // moonlight: keep it low-ish but never so low the crater goes unreadable
    v.y = Math.max(v.y, 0.38);
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
    this.rim.intensity = 0.3;
    TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
    TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
    CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    untone(Lp.fog, this.fog.color); this.fog.near = Lp.fogNear; this.fog.far = Lp.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- the blue fire: flicker, the shot-3 jet, the punchline flare ----
    let flare = 1;
    const jetU = (tt - JET3_T) / 1.1;
    if (id === 3 && jetU >= 0 && jetU <= 1) flare = 1 + Math.sin(jetU * Math.PI) * 0.9;
    const flU = (tt - FLARE10_T) / 1.6;
    if (id === 10 && flU >= 0 && flU <= 1) flare = 1 + Math.sin(flU * Math.PI) * 0.8;
    for (let i = 0; i < this.flames.length; i++) {
      const fl = this.flames[i];
      const fl2 = 0.85 + 0.22 * Math.sin(tt * 11 + i * 2.7) * Math.sin(tt * 5.3 + i * 1.3);
      if (fl.kind === 0) { // the flame tongue itself
        fl.sp.scale.set(0.8 * (1.7 - fl2) * 0.8 * flare, 2.1 * fl2 * flare, 1);
        (fl.sp.material as THREE.SpriteMaterial).opacity = 0.96;
      } else { // its halo
        fl.sp.scale.set(4.2 * fl2 * (0.8 + 0.3 * flare), 2.8 * fl2 * (0.8 + 0.3 * flare), 1);
        (fl.sp.material as THREE.SpriteMaterial).opacity = fl.base * (0.75 + 0.35 * fl2) * flare;
      }
    }
    this.fireLights[0].intensity = 260 * (0.8 + 0.3 * Math.sin(tt * 9.7) * Math.sin(tt * 4.1)) * flare;
    this.fireLights[1].intensity = 90 * (0.8 + 0.3 * Math.sin(tt * 7.3 + 2)) * flare;
    // ---- smoke drifts up and dissolves, forever ----
    for (const sm of this.smokes) {
      const u = (tt * 0.14 * sm.rise + sm.ph) % 1;
      sm.sp.position.set(sm.x + Math.sin(u * 5 + sm.ph * 9) * 0.8 + u * 2.2, sm.y + u * 4.5, sm.z + u * 0.7);
      const sc2 = sm.sc * (0.7 + u * 0.9);
      sm.sp.scale.set(sc2, sc2 * 0.7, 1);
      (sm.sp.material as THREE.SpriteMaterial).opacity = sm.op * Math.sin(u * Math.PI);
    }
    // ---- the lake breathes: a slow texture drift ----
    const lt = this.lakeMat.map;
    if (lt) { lt.offset.x = Math.sin(tt * 0.05) * 0.01; lt.offset.y = (tt * 0.004) % 1; }
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
