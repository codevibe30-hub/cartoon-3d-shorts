// The Pulau Ular film as one three.js scene: a lush rocky island rising
// from a bright sea — Ilha da Queimada Grande. A white-and-red lighthouse
// crowns the peak beside the old keeper's house; forest blankets the
// slopes; golden lanceheads (3D tube snakes, never flat sprites) coil on
// branches and rocks; the hero's boat floats offshore and a navy patrol
// boat guards the shore. Nobody lands.
// VISUAL CORE: beautiful SUNNY island, textured everywhere (anti-banding):
// speckled sky + clouds, rippled glinting sea, foam at the shoreline,
// mottled rock-and-leaf-litter terrain, deep-green canopy. Layered light
// rig: warm sun key w/ soft shadows + sky hemi fill + cool rim.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, planks, beam, cloudHD, CLOUD_DAY } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, TERRAIN_PROFILE, terrainY, BRANCH_PT, BIRD_PT, ROCK_PT, TREE_POS, BOAT_POS, SIGN_POS, STRIKE_T, TURN_T, L } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const skyTexDay = () => ctex("ularSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9be4"); grad.addColorStop(0.78, "#a8cdf2"); grad.addColorStop(1, "#cfe4f8");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "20,60,120"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  // soft painted cloud wisps
  for (let i = 0; i < 46; i++) {
    const x = r() * 2048, y = 60 + r() * 420, w = 90 + r() * 260;
    const cg = g.createRadialGradient(x, y, 4, x, y, w);
    cg.addColorStop(0, `rgba(255,255,255,${0.10 + r() * 0.13})`); cg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, w, w * 0.32, 0, 0, 7); g.fill();
  }
  // sun glow (upper right)
  const sg = g.createRadialGradient(1560, 150, 10, 1560, 150, 300);
  sg.addColorStop(0, "rgba(255,246,214,0.85)"); sg.addColorStop(0.25, "rgba(255,240,200,0.35)"); sg.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = sg; g.fillRect(1160, 0, 800, 560);
  g.fillStyle = "#fff7dc"; g.beginPath(); g.arc(1560, 150, 34, 0, 7); g.fill();
});
const islandTex = () => ctex("ularIsland", 1024, 1024, (g, r) => {
  // v bands along the lathe profile: 0 = peak rock, mid = leaf litter +
  // undergrowth, lower = cliff rock, bottom = shore stone/sand
  const bands: [number, string][] = [[0, "#8d8578"], [0.16, "#6f7a52"], [0.3, "#5c6b3c"], [0.55, "#66713f"], [0.74, "#7a7263"], [0.88, "#8a7d68"], [1, "#9a8a70"]];
  for (let i = 0; i < bands.length - 1; i++) {
    const y0 = bands[i][0] * 1024, y1 = bands[i + 1][0] * 1024;
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, bands[i][1]); gr.addColorStop(1, bands[i + 1][1]);
    g.fillStyle = gr; g.fillRect(0, y0, 1024, y1 - y0 + 2);
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "235,230,205" : "16,20,10"},${0.04 + r() * 0.07})`; g.fillRect(r() * 1024, r() * 1024, 2.6, 2.6); }
  for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(${r() > 0.45 ? "52,84,32" : "110,96,64"},${0.06 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * 1024, 200 + r() * 560, 5 + r() * 26, 3 + r() * 12, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(30,28,24,${0.07 + r() * 0.09})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 18, 3 + r() * 9, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(20,18,14,0.35)"; g.lineWidth = 2.2;
  for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
});
const seaTex = () => ctex("ularSea", 1024, 1024, (g, r) => {
  const grad = g.createRadialGradient(512, 512, 60, 512, 512, 540);
  grad.addColorStop(0, "#1d8fa8"); grad.addColorStop(0.6, "#14719b"); grad.addColorStop(1, "#0f5b8c");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
  // wave strokes: short bright crests + dark troughs, two scales
  for (let i = 0; i < 700; i++) {
    const x = r() * 1024, y = r() * 1024, w = 8 + r() * 26;
    g.strokeStyle = `rgba(190,240,250,${0.10 + r() * 0.2})`; g.lineWidth = 1.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.5, y - 2.5 - r() * 3, x + w, y); g.stroke();
  }
  for (let i = 0; i < 500; i++) {
    const x = r() * 1024, y = r() * 1024, w = 10 + r() * 30;
    g.strokeStyle = `rgba(6,50,84,${0.10 + r() * 0.16})`; g.lineWidth = 2 + r() * 2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.5, y + 3 + r() * 3, x + w, y); g.stroke();
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.14 + r() * 0.3})`; g.fillRect(r() * 1024, r() * 1024, 3 + r() * 7, 1.6); }
});
const foamTex = () => ctex("ularFoam", 1024, 128, (g, r) => {
  g.clearRect(0, 0, 1024, 128);
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(r(), 1.6) * 128;
    g.fillStyle = `rgba(255,255,255,${(0.16 + r() * 0.4) * (1 - y / 150)})`;
    g.beginPath(); g.arc(r() * 1024, y, 1 + r() * 3.4, 0, 7); g.fill();
  }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 1024, r() * 26, 6 + r() * 20, 2 + r() * 3.4, 0, 0, 7); g.fill(); }
});
const foliageTex = (key: string, base: string, fleck: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = `rgba(${fleck},${0.10 + r() * 0.22})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 13, 2.5 + r() * 7, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(10,26,8,${0.12 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
});
const snakeTex = () => ctex("ularSnake", 512, 128, (g, r) => {
  g.fillStyle = "#d9a83a"; g.fillRect(0, 0, 512, 128);
  // dorsal blotches (the lancehead's broken diamond pattern)
  for (let x = 8; x < 512; x += 42) {
    g.fillStyle = "rgba(122,84,20,0.75)";
    g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 17, 44); g.lineTo(x, 70); g.lineTo(x - 17, 44); g.closePath(); g.fill();
    g.fillStyle = "rgba(146,102,26,0.5)";
    g.beginPath(); g.moveTo(x + 21, 26); g.lineTo(x + 31, 44); g.lineTo(x + 21, 62); g.lineTo(x + 11, 44); g.closePath(); g.fill();
  }
  // scale speckle + pale belly band (v near 1 = underside of the tube)
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,226,130" : "120,82,18"},${0.08 + r() * 0.14})`; g.fillRect(r() * 512, r() * 96, 2.4, 2.4); }
  const bg = g.createLinearGradient(0, 92, 0, 128);
  bg.addColorStop(0, "rgba(240,214,150,0)"); bg.addColorStop(1, "rgba(240,214,150,0.9)");
  g.fillStyle = bg; g.fillRect(0, 92, 512, 36);
});
const towerTex = () => ctex("ularTower", 256, 512, (g, r) => {
  g.fillStyle = "#f2ede2"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#c8352c"; g.fillRect(0, 120, 256, 84); g.fillRect(0, 330, 256, 84);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,110,95" : "60,55,48"},${0.04 + r() * 0.06})`; g.fillRect(r() * 256, r() * 512, 2.2, 2.2); }
});
const signTex = () => ctex("ularSign", 1024, 512, (g, r) => {
  g.fillStyle = "#e8b13c"; g.fillRect(0, 0, 1024, 512);
  g.lineWidth = 26; g.strokeStyle = "#1c1c1c"; g.strokeRect(13, 13, 998, 486);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,70,20,${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 512, 3, 3); }
  g.fillStyle = "#1c1c1c"; g.textAlign = "center";
  g.font = "900 118px 'Arial Black', Arial, sans-serif";
  g.fillText("DILARANG", 512, 168);
  g.fillText("MENDARAT", 512, 296);
  g.font = "700 54px Arial, sans-serif";
  g.fillText("ÁREA RESTRITA — MARINHA DO BRASIL", 512, 396);
  // a simple snake pictogram under the text
  g.strokeStyle = "#1c1c1c"; g.lineWidth = 17; g.lineCap = "round";
  g.beginPath(); g.moveTo(330, 452);
  g.bezierCurveTo(430, 420, 480, 478, 580, 448); g.bezierCurveTo(640, 430, 660, 452, 700, 440); g.stroke();
  g.fillStyle = "#1c1c1c"; g.beginPath(); g.arc(706, 439, 15, 0, 7); g.fill();
});
const glowTex = () => ctex("ularGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.4, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("ularBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(10,30,44,0.55)"); gr.addColorStop(0.6, "rgba(10,30,44,0.3)"); gr.addColorStop(1, "rgba(10,30,44,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
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

// ---------------- the golden lancehead (3D tube snake) ----------------
type Snake = { neck: THREE.Group; tongue: THREE.Mesh; phase: number; hero: boolean };
const snakeMat = () => lam2({ map: rep(snakeTex(), 5, 1) });
const makeHead = (sc: number) => {
  const grp = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16 * sc, 10, 8), snakeMat());
  head.scale.set(1.0, 0.78, 1.45); head.castShadow = true; grp.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: "#1a1206" });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034 * sc, 6, 6), eyeMat);
    eye.position.set(sx * 0.095 * sc, 0.055 * sc, 0.1 * sc); grp.add(eye);
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.016 * sc, 0.008 * sc, 0.17 * sc),
    new THREE.MeshBasicMaterial({ color: "#d8342c" }));
  tongue.position.set(0, -0.01 * sc, 0.3 * sc); grp.add(tongue);
  return { grp, tongue };
};
/** a snake draped over a horizontal branch: tail wraps the branch, the body
 *  sags in a loop below it, the neck rises at the far end. */
const makeBranchSnake = (parent: THREE.Object3D, at: V3, yaw: number, sc: number, phase: number, hero = false): Snake => {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.y = yaw; parent.add(g);
  const pts: THREE.Vector3[] = [];
  // tail coil around the branch (local x axis = branch direction)
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 3.4;
    pts.push(new THREE.Vector3(-0.85 + i * 0.045, Math.sin(a) * 0.13, Math.cos(a) * 0.13));
  }
  // drape: down, sag, back up to the neck base
  pts.push(new THREE.Vector3(-0.3, -0.34, 0.05), new THREE.Vector3(0.05, -0.52, 0.02),
    new THREE.Vector3(0.42, -0.3, 0), new THREE.Vector3(0.62, -0.05, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.085 * sc, 7), snakeMat());
  tube.castShadow = true; g.add(tube);
  // neck + head (animated): an S rising from the drape's end
  const neck = new THREE.Group(); neck.position.set(0.62, -0.05, 0); g.add(neck);
  const npts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.22, 0.02),
    new THREE.Vector3(0.05, 0.42, 0.05), new THREE.Vector3(0.16, 0.58, 0.08)];
  const ntube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(npts), 24, 0.078 * sc, 7), snakeMat());
  ntube.castShadow = true; neck.add(ntube);
  const { grp: head, tongue } = makeHead(sc);
  head.position.set(0.16, 0.58, 0.08); head.rotation.y = 0.95; neck.add(head);
  g.scale.setScalar(sc);
  return { neck, tongue, phase, hero };
};
/** a snake coiled flat on a rock/ground: spiral body + raised neck. */
const makeCoilSnake = (parent: THREE.Object3D, at: V3, yaw: number, sc: number, phase: number): Snake => {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.y = yaw; parent.add(g);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, a = u * Math.PI * 4.4, rad = 0.52 * (1 - u * 0.72);
    pts.push(new THREE.Vector3(Math.cos(a) * rad, 0.07 + u * 0.05, Math.sin(a) * rad));
  }
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.088 * sc, 7), snakeMat());
  tube.castShadow = true; g.add(tube);
  const neck = new THREE.Group(); neck.position.set(0.1, 0.1, 0.05); g.add(neck);
  const npts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 0.2, 0.03),
    new THREE.Vector3(0.02, 0.38, 0.06), new THREE.Vector3(0.13, 0.52, 0.09)];
  const ntube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(npts), 24, 0.075 * sc, 7), snakeMat());
  ntube.castShadow = true; neck.add(ntube);
  const { grp: head, tongue } = makeHead(sc);
  head.position.set(0.13, 0.52, 0.09); head.rotation.y = 0.4; neck.add(head);
  g.scale.setScalar(sc);
  return { neck, tongue, phase, hero: false };
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 25, 300);
  private snakes: Snake[] = [];
  private heroBoat = new THREE.Group();
  private patrolBoat = new THREE.Group();
  private seaMat: THREE.MeshLambertMaterial;
  private foamMat: THREE.MeshBasicMaterial;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(717);
    // ---- light rig: sun key (shadow caster) + sky hemi fill + cool rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome + sun glow sprite + drifting clouds ----
    const sky = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    sky.layers.set(NOINK); R.add(sky);
    const sunSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#ffedb8", transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    sunSp.position.set(330, 290, -430); sunSp.scale.set(190, 190, 1); sunSp.layers.set(NOINK); R.add(sunSp);
    for (let i = 0; i < 7; i++) {
      const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(100 + i * 7, CLOUD_DAY), transparent: true, opacity: 0.92, depthWrite: false, fog: false }));
      const a = r() * Math.PI * 2, d = 380 + r() * 180;
      cl.position.set(Math.cos(a) * d, 120 + r() * 130, Math.sin(a) * d);
      const w = 150 + r() * 170; cl.scale.set(w, w * 0.42, 1); cl.layers.set(NOINK); R.add(cl);
    }
    // ---- THE SEA: rippled, glinting, foam at the shore ----
    this.seaMat = lam2({ map: rep(seaTex(), 26, 26), color: "#cfe8ef" });
    const sea = new THREE.Mesh(new THREE.CircleGeometry(430, 48), this.seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.y = 0; sea.receiveShadow = true; R.add(sea);
    this.foamMat = new THREE.MeshBasicMaterial({ map: rep(foamTex(), 10, 1), transparent: true, depthWrite: false, opacity: 0.85 });
    const foam = new THREE.Mesh(new THREE.RingGeometry(45.5, 53.5, 56), this.foamMat);
    foam.rotation.x = -Math.PI / 2; foam.position.y = 0.14; foam.renderOrder = 1; R.add(foam);
    // ---- THE ISLAND: lathe-turned terrain from the shared profile ----
    {
      const pts = TERRAIN_PROFILE.map(([rr, yy]) => new THREE.Vector2(rr, yy));
      const geo = new THREE.LatheGeometry(pts, 96);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      // position-hash jitter: identical (angle, height) => identical offset,
      // so the lathe seam can never tear into a fin/spike
      const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const rad = Math.hypot(x, z);
        if (rad < 0.5) continue;
        const plateau = rad <= 7.5, shore = rad >= 47;
        const ra = plateau ? 0.12 : shore ? 0.5 : 1.5;
        const ya = plateau ? 0.04 : shore ? 0.2 : 0.55;
        const ang = Math.atan2(z, x);
        const d = (hash(ang * 57.3, y * 3.1) - 0.5) * ra, dy = (hash(y * 5.7, ang * 57.3) - 0.5) * ya;
        const s = (rad + d) / rad;
        pos.setXYZ(i, x * s, y + dy, z * s);
      }
      geo.computeVertexNormals();
      const island = new THREE.Mesh(geo, lam2({ map: rep(islandTex(), 10, 2), flatShading: true, side: THREE.DoubleSide }));
      island.receiveShadow = true; island.castShadow = false;
      R.add(island);
    }
    // ---- forest canopy: mottled green blobs over the slopes ----
    const canopyMats = [
      lam2({ map: foliageTex("ularFolA", "#3d6027", "140,190,90"), flatShading: true }),
      lam2({ map: foliageTex("ularFolB", "#2f5222", "120,175,80"), flatShading: true }),
      lam2({ map: foliageTex("ularFolC", "#4a6d2e", "165,205,105"), flatShading: true }),
    ];
    for (let i = 0; i < 150; i++) {
      const a = r() * Math.PI * 2, d = 9 + r() * 37;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      // keep the clearing + the peak plateau readable
      const segD = (() => { const ax = 10.5, az = 35.5, bx = 20.5, bz = 22.5;
        const vx = bx - ax, vz = bz - az, wx = x - ax, wz = z - az;
        const u = Math.max(0, Math.min(1, (wx * vx + wz * vz) / (vx * vx + vz * vz)));
        return Math.hypot(wx - u * vx, wz - u * vz); })();
      if (Math.hypot(x - 21, z - 21) < 5.5 || Math.hypot(x - 13, z - 44.5) < 5 || segD < 4.2 || d < 10) continue;
      const rad = 1.7 + r() * 2.1;
      const blobM = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), canopyMats[i % 3]);
      blobM.position.set(x, terrainY(d) + rad * 0.55, z);
      blobM.scale.y = 0.72;
      blobM.rotation.set(r() * 3, r() * 3, r() * 3);
      blobM.castShadow = true; blobM.receiveShadow = true; R.add(blobM);
    }
    // ---- scattered trees (trunks + branches under the canopy) ----
    const trunkMat = lam2({ color: "#6e5136", map: rep(beam(), 1, 2) });
    const treeAt = (x: number, z: number, s: number, withSnake: boolean, phase: number) => {
      const y = terrainY(Math.hypot(x, z));
      const g = new THREE.Group(); g.position.set(x, y - 0.15, z); g.rotation.y = r() * 3; R.add(g);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.24 * s, 3.4 * s, 7), trunkMat);
      trunk.position.y = 1.7 * s; trunk.castShadow = true; g.add(trunk);
      for (let i = 0; i < 3; i++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 1.9 * s, 6), trunkMat);
        const a = (i / 3) * Math.PI * 2 + r();
        br.position.set(Math.cos(a) * 0.6 * s, (3.1 + r() * 0.5) * s, Math.sin(a) * 0.6 * s);
        br.rotation.set(Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85);
        br.castShadow = true; g.add(br);
      }
      const can = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9 * s, 1), canopyMats[Math.floor(r() * 3)]);
      can.position.y = 4.3 * s; can.scale.y = 0.75; can.castShadow = true; g.add(can);
      if (withSnake) {
        const sn = makeBranchSnake(R, [x + 0.4 * s, y + 3.15 * s, z + 0.2 * s], r() * 3, 0.95, phase);
        this.snakes.push(sn);
      }
      return g;
    };
    treeAt(-16, 26, 1.1, true, 1.3); treeAt(-30, 8, 1.25, false, 0); treeAt(-8, -30, 1.15, true, 2.6);
    treeAt(14, -28, 1.05, false, 0); treeAt(30, -12, 1.2, true, 4.1); treeAt(-26, -18, 1.0, false, 0);
    treeAt(34, 14, 1.1, false, 0); treeAt(-36, 20, 1.15, false, 0); treeAt(6, 34, 1.0, true, 5.2);
    // ---- THE HERO TREE (clearing set): a clean horizontal branch ----
    {
      const [tx, ty, tz] = TREE_POS;
      const g = new THREE.Group(); g.position.set(tx, ty - 0.15, tz); R.add(g);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 4.6, 8), trunkMat);
      trunk.position.y = 2.3; trunk.rotation.z = 0.06; trunk.castShadow = true; g.add(trunk);
      // the branch runs along world X at local y 2.3, z +0.3 (matches
      // BRANCH_PT in story.ts: world (23.8, ty+2.3, 19.8))
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.8, 7), trunkMat);
      branch.rotation.z = Math.PI / 2;
      branch.position.set(0.2, 2.3, 0.3); branch.castShadow = true; g.add(branch);
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.6, 6), trunkMat);
      twig.rotation.z = Math.PI / 2 - 0.5; twig.rotation.y = 0.4;
      twig.position.set(2.2, 2.75, 0.3); twig.castShadow = true; g.add(twig);
      const can = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), canopyMats[0]);
      can.position.set(-0.5, 5.9, 0.2); can.scale.y = 0.72; can.castShadow = true; g.add(can);
      const can2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), canopyMats[2]);
      can2.position.set(-2.2, 5.2, -1.4); can2.scale.y = 0.75; can2.castShadow = true; g.add(can2);
      // SNAKE A — the star: draped on the hero branch (local X = branch axis)
      this.snakes.push(makeBranchSnake(R, BRANCH_PT, 0, 1.5, 0, true));
      // a second, smaller snake on the clearing's edge rock
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0),
        lam2({ map: rep(stone("ularRock", ["#8a8172", "#7a7263", "#968b78"]), 1, 1), flatShading: true }));
      rock.position.set(ROCK_PT[0], ROCK_PT[1] - 0.35, ROCK_PT[2]); rock.scale.y = 0.65;
      rock.rotation.set(0.4, 1.2, 0.2); rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
      this.snakes.push(makeCoilSnake(R, [ROCK_PT[0], ROCK_PT[1] + 0.3, ROCK_PT[2]], 2.4, 1.15, 2.2));
      // a third snake coiled on a fallen log in the clearing
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.2, 8), trunkMat);
      log.rotation.z = Math.PI / 2; log.rotation.y = -0.4;
      log.position.set(26.5, terrainY(Math.hypot(26.5, 24.5)) + 0.2, 24.5); log.castShadow = true; R.add(log);
      this.snakes.push(makeCoilSnake(R, [26.5, terrainY(Math.hypot(26.5, 24.5)) + 0.48, 24.5], 0.7, 0.95, 3.9));
    }
    // ---- THE LIGHTHOUSE + keeper's house (the peak) ----
    {
      const lh = new THREE.Group(); lh.position.set(0, 24.55, 0); R.add(lh);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 1.1, 14),
        lam2({ map: rep(stone("ularLhBase", ["#9a917e", "#8a8172", "#a89e8a"]), 2, 1) }));
      base.position.y = 0.55; base.castShadow = true; base.receiveShadow = true; lh.add(base);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.6, 10, 14), lam2({ map: towerTex() }));
      tower.position.y = 6.1; tower.castShadow = true; lh.add(tower);
      const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.35, 14), lam2({ color: "#33383e" }));
      gallery.position.y = 11.3; gallery.castShadow = true; lh.add(gallery);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.5, 10),
        lam2({ color: "#ffe9a8", emissive: "#8a6a1c", emissiveIntensity: 0.35 }));
      lamp.position.y = 12.2; lh.add(lamp);
      const roofC = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.3, 12), lam2({ color: "#8c2f28" }));
      roofC.position.y = 13.6; roofC.castShadow = true; lh.add(roofC);
      // the keeper's house: stone walls, red roof, one snake at the window
      const hy = terrainY(Math.hypot(9, 5));
      const house = new THREE.Group(); house.position.set(9, hy - 0.1, 5); house.rotation.y = -0.7; R.add(house);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.7, 3.6),
        lam2({ map: rep(stone("ularHouse", ["#b3a88f", "#a2967d", "#bfb198"]), 2, 1) }));
      walls.position.y = 1.35; walls.castShadow = true; walls.receiveShadow = true; house.add(walls);
      const hroof = prism(5.3, 1.5, 4.3, lam2({ color: "#9c4034", map: rep(planks(), 2, 1) }));
      hroof.position.y = 2.7; house.add(hroof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.08), lam2({ color: "#4a3826" }));
      door.position.set(-1.1, 0.95, 1.83); house.add(door);
      const winMat = lam2({ color: "#2c3844", emissive: "#10161c", emissiveIntensity: 0.4 });
      for (const wx of [0.9]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.08), winMat);
        win.position.set(wx, 1.6, 1.83); house.add(win);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.22), lam2({ color: "#8a8172" }));
        sill.position.set(wx, 1.05, 1.9); house.add(sill);
      }
      this.snakes.push(makeCoilSnake(R, [10.6, hy + 1.0, 6.9], 2.9, 0.8, 5.6));
    }
    // ---- THE WARNING SIGN on the shore ----
    {
      const sy = terrainY(Math.hypot(SIGN_POS[0], SIGN_POS[2]));
      const g = new THREE.Group(); g.position.set(SIGN_POS[0], sy - 0.1, SIGN_POS[2]); g.rotation.y = 0.28; R.add(g);
      const postMat = lam2({ color: "#5d4a30", map: beam() });
      for (const px of [-1.4, 1.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 7), postMat);
        post.position.set(px, 1.3, 0); post.castShadow = true; g.add(post);
      }
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.75, 0.09),
        lam2({ map: signTex() }));
      board.position.y = 2.15; board.castShadow = true; g.add(board);
      blob(g, 0, 0.06, 0.3, 4.6, 2.2, 0.5);
    }
    // ---- shore rocks ----
    const rockMat = lam2({ map: rep(stone("ularRockS", ["#847a6a", "#766c5c", "#93876f"]), 1, 1), flatShading: true });
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, d = 45 + r() * 8;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const rad = 0.5 + r() * 1.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), rockMat);
      rock.position.set(x, Math.max(terrainY(d), -0.4) + rad * 0.3, z);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true; rock.receiveShadow = true; R.add(rock);
    }
    // ---- THE HERO'S BOAT (offshore, he never lands) ----
    {
      const b = this.heroBoat;
      const hullMat = lam2({ color: "#e8e2d2", map: rep(planks(), 2, 1) });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 6.4), hullMat);
      hull.position.y = 0.45; hull.castShadow = true; b.add(hull);
      const bow = prism(2.2, 0.9, 1.6, lam2({ color: "#2e7f86", map: rep(planks(), 1, 1) }));
      bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 2;
      bow.position.set(0, 0.45, -3.95); b.add(bow);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.22, 6.46), lam2({ color: "#2e7f86" }));
      stripe.position.y = 0.78; b.add(stripe);
      for (const bz of [-1.6, 0.4, 2.2]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.5), lam2({ color: "#8a6a42", map: beam() }));
        bench.position.set(0, 0.82, bz); b.add(bench);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.1, 7), lam2({ color: "#6e5136", map: beam() }));
      mast.position.set(0, 2.2, -1.2); mast.castShadow = true; b.add(mast);
      blob(b, 0, 0.04, 0, 4.4, 8.6, 0.65);
      b.position.set(BOAT_POS[0], 0, BOAT_POS[2]);
      R.add(b);
    }
    // ---- THE NAVY PATROL BOAT (shot 2 crossing) ----
    {
      const p = this.patrolBoat;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 10.5), lam2({ color: "#5d6a75", map: rep(planks(), 2, 1) }));
      hull.position.y = 0.6; hull.castShadow = true; p.add(hull);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 3.2), lam2({ color: "#e8e6df", map: rep(planks(), 1, 1) }));
      cab.position.set(0, 1.9, -0.6); cab.castShadow = true; p.add(cab);
      const winB = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.55, 2.6), lam2({ color: "#22303c" }));
      winB.position.set(0, 2.15, -0.6); p.add(winB);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.3, 10.56), lam2({ color: "#1d4ed8" }));
      stripe.position.y = 1.05; p.add(stripe);
      blob(p, 0, 0.05, 0, 5.6, 12.6, 0.6);
      p.position.set(-170, 0, 70);
      R.add(p);
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
    const az = THREE.MathUtils.degToRad(Lp.az), el = THREE.MathUtils.degToRad(Lp.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    v.y = Math.max(v.y, 0.3);
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
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 110);
    this.sun.position.copy(focus).addScaledVector(sunDir, 240); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 520; sc.updateProjectionMatrix();
    this.sun.shadow.bias = Lp.bias; this.sun.shadow.normalBias = Lp.normalBias * (Rr / 12);
    this.rim.position.set(focus.x - 55, focus.y + 34, focus.z - 75);
    this.rim.target.position.copy(focus);
    this.rim.intensity = 0.35;
    TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
    TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
    CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    untone(Lp.fog, this.fog.color); this.fog.near = Lp.fogNear; this.fog.far = Lp.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- the sea breathes: slow texture drift + foam shimmer ----
    const sm = this.seaMat.map;
    if (sm) { sm.offset.x = (tt * 0.0035) % 1; sm.offset.y = Math.sin(tt * 0.11) * 0.006; }
    this.foamMat.opacity = 0.72 + 0.18 * Math.sin(tt * 0.9);
    // ---- the boats: bobbing, the patrol crossing, the punchline turn ----
    const bobY = Math.sin(tt * 1.1) * 0.09, bobR = Math.sin(tt * 0.9 + 1) * 0.016;
    this.heroBoat.position.y = bobY; this.heroBoat.rotation.z = bobR; this.heroBoat.rotation.x = Math.sin(tt * 0.7) * 0.01;
    if (id === 10) {
      const u = Math.max(0, Math.min(1, (tt - TURN_T) / 2.4));
      const e = u * u * (3 - 2 * u);
      this.heroBoat.rotation.y = -0.55 * e;
      this.heroBoat.position.x = BOAT_POS[0] + 0.9 * e;
      this.heroBoat.position.z = BOAT_POS[2] + 0.7 * e;
    } else {
      this.heroBoat.rotation.y = 0;
      this.heroBoat.position.x = BOAT_POS[0]; this.heroBoat.position.z = BOAT_POS[2];
    }
    if (id === 2) {
      const dur = (L[2] - L[1]) / FPS;
      const u = Math.max(0, Math.min(1, (tt - L[1] / FPS) / dur));
      this.patrolBoat.position.set(-58 + u * 116, Math.sin(tt * 1.4) * 0.07, 58);
      this.patrolBoat.rotation.y = Math.PI / 2;
      this.patrolBoat.rotation.z = Math.sin(tt * 1.2) * 0.012;
    } else {
      this.patrolBoat.position.set(-170, 0, 58);
    }
    // ---- the snakes: sway, tongue flicks, and SNAKE A's strike ----
    for (const sn of this.snakes) {
      sn.neck.rotation.z = Math.sin(tt * 0.85 + sn.phase) * 0.055;
      sn.neck.rotation.x = Math.sin(tt * 0.62 + sn.phase * 1.7) * 0.04;
      const cyc = (tt * 0.55 + sn.phase * 0.37) % 1;
      const flick = cyc < 0.16 ? (0.5 + 0.5 * Math.sin(cyc / 0.16 * Math.PI * 3)) : 0.001;
      sn.tongue.scale.set(1, 1, Math.max(0.001, flick));
      if (sn.hero && id === 4) {
        // rear up, lunge at the bird, recoil
        const rear = Math.max(0, Math.min(1, (tt - (STRIKE_T - 0.4)) / 0.4));
        const lungeU = (tt - STRIKE_T) / 0.13;
        const recU = (tt - STRIKE_T - 0.13) / 0.9;
        let lunge = 0;
        if (lungeU >= 0 && lungeU < 1) lunge = Math.sin(lungeU * Math.PI * 0.5);
        else if (recU >= 0 && recU < 1) lunge = 1 - recU * recU;
        else if (recU >= 1) lunge = 0;
        sn.neck.position.y = -0.05 + rear * 0.16 - lunge * 0.1;
        sn.neck.position.x = 0.62 + lunge * 0.5;
        sn.neck.position.z = 0;
        sn.neck.rotation.z = Math.sin(tt * 0.85) * 0.03 - rear * 0.18 + lunge * 0.12;
      } else if (sn.hero) {
        sn.neck.position.set(0.62, -0.05 + Math.sin(tt * 0.8) * 0.012, 0);
      }
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
