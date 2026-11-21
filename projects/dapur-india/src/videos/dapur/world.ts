// The Dapur India film as one three.js scene: the Golden Temple
// langar complex at Amritsar. A vast open dining hall where a SEA of
// diners sits cross-legged in pangat rows on long mats; behind it a
// working kitchen hall — a mountain of flour sacks, dough tables, tawa
// griddles, roti stacks and two giant cauldrons stirred with paddles
// taller than the volunteers; then the roti machine hall and the
// dish-washing trough line; and beyond everything the holy pool
// (sarovar) with the golden temple glowing across the water.
// VISUAL CORE: bright warm daylight, marble + gold + steel, textured
// everything (anti-banding: speckled sky, flecked stone, rippled
// water). Layered light rig: sun key w/ soft shadows + hemisphere
// fill + rim — the house style.
import * as THREE from "three";
import { V, Kit } from "./build";
import { ctex, rep, rng, stone, cloudHD, CLOUD_DAY, water } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, ROW_XS, CAULDRONS, MACHINE_Z, TROUGH_Z, TEMPLE_Z,
} from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const marbleTex = () => ctex("dapurMarble", 512, 512, (g, r) => {
  g.fillStyle = "#ddd5c2"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "90,80,64"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
  g.strokeStyle = "rgba(120,108,88,0.5)"; g.lineWidth = 3;
  g.strokeRect(2, 2, 508, 508);
  for (let i = 0; i < 12; i++) { // faint veins
    g.strokeStyle = `rgba(150,138,112,${0.10 + r() * 0.10})`; g.lineWidth = 1.4;
    g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 130; y += (r() - 0.5) * 130; g.lineTo(x, y); } g.stroke();
  }
});
const matTex = (key: string, base: string, stripe: string) => ctex(key, 256, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 42) { g.fillStyle = stripe; g.fillRect(0, y, 256, 7); }
  g.fillStyle = "rgba(255,244,214,0.85)"; g.fillRect(10, 0, 5, 512); g.fillRect(241, 0, 5, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "20,14,10"},${0.04 + r() * 0.05})`; g.fillRect(r() * 256, r() * 512, 2, 2); }
});
const sackTex = () => ctex("dapurSack", 256, 256, (g, r) => {
  g.fillStyle = "#c9b18a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "240,228,200" : "80,64,40"},${0.05 + r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.fillStyle = "#8c2f26"; g.fillRect(0, 104, 256, 44);
  g.fillStyle = "#f2e8d2"; g.textAlign = "center"; g.font = "900 34px 'Arial Black', Arial, sans-serif";
  g.fillText("ATTA", 128, 138);
});
const goldFacadeTex = () => ctex("dapurGoldFacade", 1024, 512, (g, r) => {
  g.fillStyle = "#e9e2d0"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "96,86,66"},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 512, 2.4, 2.4); }
  // a row of golden arches with dark insets
  for (let i = 0; i < 5; i++) {
    const x = 62 + i * 190;
    g.fillStyle = "#c9962e"; g.beginPath();
    g.moveTo(x, 470); g.lineTo(x, 210); g.quadraticCurveTo(x + 65, 96, x + 130, 210); g.lineTo(x + 130, 470); g.closePath(); g.fill();
    g.fillStyle = "#2a2118"; g.beginPath();
    g.moveTo(x + 20, 470); g.lineTo(x + 20, 226); g.quadraticCurveTo(x + 65, 140, x + 110, 226); g.lineTo(x + 110, 470); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,196,92,0.5)"; g.fillRect(x + 34, 300, 62, 120);
  }
  g.fillStyle = "#c9962e"; g.fillRect(0, 470, 1024, 42);
});
const puffTex = () => ctex("dapurPuff", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 124);
  gr.addColorStop(0, "rgba(255,255,255,0.88)"); gr.addColorStop(0.45, "rgba(255,255,255,0.38)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blobTex = () => ctex("dapurBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const skyTexDay = () => ctex("dapurSkyDay", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#5e9ae2"); grad.addColorStop(0.78, "#9dc2ec"); grad.addColorStop(1, "#cfe0f2");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "10,40,90"},${0.02 + r() * 0.035})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(1500, 210, 8, 1500, 210, 260);
  sn.addColorStop(0, "rgba(255,250,225,0.95)"); sn.addColorStop(0.1, "rgba(255,240,190,0.55)"); sn.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = sn; g.fillRect(1180, 0, 640, 520);
  g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1500, 210, 30, 0, 7); g.fill();
});
const skyTexNight = () => ctex("dapurSkyNight", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#060f26"); grad.addColorStop(0.45, "#0d2148"); grad.addColorStop(0.78, "#1d3a68"); grad.addColorStop(1, "#2a4a74");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; const s = r() > 0.92 ? 3.2 : 1.8; g.fillRect(r() * 2048, r() * 700, s, s); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "8,20,50"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const mn = g.createRadialGradient(420, 190, 8, 420, 190, 200);
  mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(200,220,255,0.35)"); mn.addColorStop(1, "rgba(200,220,255,0)");
  g.fillStyle = mn; g.fillRect(160, 0, 520, 420);
  g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(420, 190, 24, 0, 7); g.fill();
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
  private steam: { sp: THREE.Sprite; x: number; y: number; z: number; ph: number; s: number }[] = [];
  private belt: THREE.InstancedMesh | null = null;
  private glowMats: THREE.MeshBasicMaterial[] = [];
  private waterTex: THREE.Texture | null = null;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(777);
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
    // ---- ground: one big warm stone slab under everything ----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 230), lam2({ map: rep(stone("dapurGround", ["#cbbfa6", "#bfb198", "#d4c8ae", "#b3a88f"]), 14, 34) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.03, -30); ground.receiveShadow = true; R.add(ground);

    this.buildHall(R, r);
    this.buildKitchen(R, r);
    this.buildMachineAndDishes(R, r);
    this.buildPoolAndTemple(R, r);
    // ---- distant tree line + city silhouettes ----
    {
      const leafMat = lam2({ color: "#4c9440", flatShading: true });
      const trunkMat = lam2({ color: "#6e4a2e" });
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + r() * 0.25, d = 120 + r() * 60;
        const x = Math.cos(a) * d, z = -30 + Math.sin(a) * d;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 3.4, 7), trunkMat);
        tr.position.set(x, 1.7, z); R.add(tr);
        const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 + r() * 1.6, 1), leafMat);
        lf.position.set(x, 5.2 + r(), z); lf.scale.y = 0.85; R.add(lf);
      }
    }
  }

  // ---------------- the dining hall ----------------
  private buildHall(R: THREE.Group, r: () => number) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 36), lam2({ map: rep(marbleTex(), 6, 12) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.0, 18); floor.receiveShadow = true; R.add(floor);
    // pangat mats + the SEA of seated diners (instanced)
    const matCols: [string, string][] = [["#8c2f26", "#e8c45a"], ["#274a7a", "#d9d3c0"], ["#7a4a8c", "#e8c45a"], ["#1e6e5a", "#d9d3c0"]];
    ROW_XS.forEach((mx, ri) => {
      const mat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.045, 30),
        lam2({ map: rep(matTex(`dapurMat${ri}`, matCols[ri][0], matCols[ri][1]), 1, 10) }));
      mat.position.set(mx, 0.025, 19); mat.receiveShadow = true; R.add(mat);
    });
    {
      const N = 4 * 2 * 13;
      const base = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.30, 0.38, 0.20, 9), lam2({ color: "#ffffff" }), N);
      const torso = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.155, 0.225, 0.52, 8), lam2({ color: "#ffffff" }), N);
      const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.135, 9, 7), lam2({ color: "#ffffff" }), N);
      const turb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), lam2({ color: "#ffffff" }), N);
      const plate = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.15, 0.025, 10), lam2({ color: "#c9ccd2" }), N);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
      const shirts = ["#e8e2d2", "#7ab3d9", "#e88ca0", "#f2d06b", "#8fd0a8", "#d97a4a", "#b5a6d9", "#e5e0d0", "#5a8fc2", "#c25a7a"];
      const pants = ["#3b3f52", "#5a4632", "#2e4a6e", "#4a4a42", "#6e4525"];
      const skins = ["#c98d64", "#a96f45", "#8a5632", "#e0aa7a"];
      const turbs = ["#e8862c", "#f2ede2", "#2e6fd0", "#d94a6e", "#7a1f1f", "#2e8f86"];
      let n = 0;
      for (const mx of ROW_XS) for (const side of [-1, 1]) for (let i = 0; i < 13; i++) {
        const x = mx + side * 0.44, z = 6.5 + i * 2.05 + (r() - 0.5) * 0.3, yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        e.set(0, yaw, 0); q.setFromEuler(e);
        const put = (im: THREE.InstancedMesh, y: number, cols: string[], fwd = 0) => {
          pv.set(x + side * fwd, y, z); m.compose(pv, q, sc); im.setMatrixAt(n, m);
          im.setColorAt(n, new THREE.Color(cols[Math.floor(r() * cols.length)]));
        };
        put(base, 0.10, pants); put(torso, 0.44, shirts); put(head, 0.86, skins); put(turb, 0.90, turbs); put(plate, 0.045, ["#c9ccd2"], 0.52);
        n++;
      }
      for (const im of [base, torso, head, turb, plate]) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; R.add(im); }
      blob(R, 0, 0.012, 19, 15, 30, 0.16);
    }
    // pavilion: columns + beams + roof
    {
      const colMat = lam2({ map: rep(marbleTex(), 1, 3), color: "#efe8d8" });
      const goldBand = lam2({ color: "#c9962e" });
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const z = 4 + i * 6.4;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 7.2, 10), colMat);
        col.position.set(side * 7.4, 3.6, z); col.castShadow = true; R.add(col);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.3, 10), goldBand);
        band.position.set(side * 7.4, 5.9, z); R.add(band);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.85), colMat);
        foot.position.set(side * 7.4, 0.15, z); R.add(foot);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.32, 66), lam2({ color: "#a0552f", map: rep(stone("dapurRoof", ["#b98a68", "#a87a58", "#c49a78", "#9a6c4c"]), 8, 24) }));
      roof.position.set(0, 7.35, 3); roof.castShadow = true; R.add(roof);
      const beamM = lam2({ color: "#6e4525" });
      for (let i = 0; i < 9; i++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.22, 0.3), beamM);
        beam.position.set(0, 7.05, -24 + i * 7.4); R.add(beam);
      }
      // hanging lantern strings over the hall
      const cols = ["#c8352c", "#e8c45a", "#2e8f86", "#e87a3a"];
      for (const lz of [8, 16, 24, 31]) {
        for (let i = 0; i <= 10; i++) {
          const u = i / 10, x = -6.8 + u * 13.6;
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: cols[i % 4], fog: false }));
          s.position.set(x, 6.4 - Math.sin(u * Math.PI) * 0.5, lz); s.layers.set(NOINK); R.add(s);
        }
      }
      // the entrance gateway at z=+34: two pillars + a domed lintel
      const pilM = lam2({ map: rep(marbleTex(), 1, 2), color: "#f2ecdc" });
      for (const side of [-1, 1]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.4, 1.1), pilM);
        pil.position.set(side * 3.4, 3.2, 34); pil.castShadow = true; R.add(pil);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam2({ color: "#c9962e" }));
        dome.position.set(side * 3.4, 6.4, 34); R.add(dome);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.9, 1.0, 1.2), lam2({ map: goldFacadeTex() }));
      lintel.position.set(0, 5.6, 34); R.add(lintel);
    }
  }

  // ---------------- the kitchen hall ----------------
  private buildKitchen(R: THREE.Group, r: () => number) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 30), lam2({ map: rep(stone("dapurKitchenFloor", ["#b8a88e", "#a8987c", "#c4b498", "#9c8c70"]), 6, 10) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.005, -13); floor.receiveShadow = true; R.add(floor);
    // side + back walls with high window strips
    const wallM = lam2({ color: "#e3d9c2", map: rep(stone("dapurWall", ["#e3d9c2", "#d8ccb0", "#ece2cc", "#cfc09e"]), 6, 2) });
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.6, 29), wallM);
      w.position.set(side * 7.6, 2.8, -13); w.castShadow = true; R.add(w);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(24, 1.1), new THREE.MeshBasicMaterial({ color: "#ffe9b0", fog: false }));
      win.position.set(side * 7.38, 4.4, -13); win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; win.layers.set(NOINK); R.add(win);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(15.6, 5.6, 0.4), wallM);
    back.position.set(0, 2.8, -27.2); back.castShadow = true; R.add(back);
    // ---- the giant cauldrons on brick fire bases ----
    const steel = lam2({ color: "#9aa0a8", map: rep(stone("dapurSteel", ["#9aa0a8", "#8a9098", "#aab0b8", "#7e858e"]), 2, 1) });
    const brickM = lam2({ color: "#8a4a34", map: rep(stone("dapurBrick", ["#96543c", "#7e4230", "#a35f45", "#6e3828"]), 3, 1) });
    for (const [cx, cy, cz] of CAULDRONS) {
      const baseB = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 0.55, 14), brickM);
      baseB.position.set(cx, 0.27, cz); baseB.castShadow = true; R.add(baseB);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.02, 1.15, 16), steel);
      pot.position.set(cx, 1.12, cz); pot.castShadow = true; R.add(pot);
      const rimT = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.07, 8, 20), steel);
      rimT.rotation.x = Math.PI / 2; rimT.position.set(cx, 1.7, cz); R.add(rimT);
      const dal = new THREE.Mesh(new THREE.CircleGeometry(1.12, 16), lam2({ color: "#d9822c" }));
      dal.rotation.x = -Math.PI / 2; dal.position.set(cx, 1.62, cz); R.add(dal);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 14), steel);
      lid.position.set(cx + 1.15, 1.78, cz + 0.5); lid.rotation.z = 0.5; R.add(lid);
      // fire glow under the pot
      const fire = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), new THREE.MeshBasicMaterial({ color: "#ff7a26", fog: false }));
      fire.rotation.x = -Math.PI / 2; fire.position.set(cx, 0.57, cz); fire.layers.set(NOINK); R.add(fire);
      // the great stirring paddle, leaning into the pot
      const paddle = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 8), lam2({ color: "#8a5a2c" }));
      shaft.position.y = 1.7; paddle.add(shaft);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.05), lam2({ color: "#8a5a2c" }));
      blade.position.y = 0.3; paddle.add(blade);
      paddle.position.set(cx + 0.55, 0.9, cz); paddle.rotation.z = 0.5; paddle.rotation.x = 0.15;
      R.add(paddle);
      // steam emitters
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0.4, fog: false }));
        sp.layers.set(NOINK); R.add(sp);
        this.steam.push({ sp, x: cx + (r() - 0.5) * 0.8, y: 1.9, z: cz + (r() - 0.5) * 0.8, ph: i * 0.27 + cz, s: 1.5 + r() });
      }
      blob(R, cx, 0.56, cz, 3.6, 3.6, 0.25);
    }
    // ---- tawa griddles (east) with roti discs browning ----
    const ironM = lam2({ color: "#2c2e33" });
    for (let i = 0; i < 3; i++) {
      const tz = -8 - i * 5.2;
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.75, 10), brickM);
      stand.position.set(4.4, 0.37, tz); stand.castShadow = true; R.add(stand);
      const tawa = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.09, 16), ironM);
      tawa.position.set(4.4, 0.8, tz); R.add(tawa);
      for (let j = 0; j < 4; j++) {
        const roti = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 10), lam2({ color: j % 2 ? "#e8cf9e" : "#dfc08a" }));
        roti.position.set(4.4 + (r() - 0.5) * 0.9, 0.87, tz + (r() - 0.5) * 0.9); R.add(roti);
      }
    }
    // ---- dough tables with dough balls + rolling pins ----
    const tableM = lam2({ color: "#a8724a", map: rep(stone("dapurTable", ["#a8724a", "#96683f", "#b57e54", "#8a5c38"]), 2, 1) });
    for (const tz of [-7.5, -12.5]) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.5), tableM);
      top.position.set(1.6, 0.92, tz); top.castShadow = true; R.add(top);
      for (const lx of [-1.4, 1.4]) for (const lz of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), tableM);
        leg.position.set(1.6 + lx, 0.45, tz + lz); R.add(leg);
      }
      for (let j = 0; j < 9; j++) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam2({ color: "#f0e2c4" }));
        ball.position.set(0.35 + j * 0.32, 1.03, tz + (j % 2 ? 0.3 : -0.3)); ball.scale.y = 0.75; R.add(ball);
      }
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), lam2({ color: "#8a5a2c" }));
      pin.rotation.z = Math.PI / 2; pin.rotation.y = 0.4; pin.position.set(2.2, 1.0, tz); R.add(pin);
    }
    // ---- roti stack tables (west-centre): towers of finished rotis ----
    for (const [sx, sz] of [[-1.6, -7], [-1.6, -10.5]] as const) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 1.2), tableM);
      top.position.set(sx, 0.85, sz); top.castShadow = true; R.add(top);
      for (const lx of [-0.7, 0.7]) for (const lz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), tableM);
        leg.position.set(sx + lx, 0.42, sz + lz); R.add(leg);
      }
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const stackH = 8 + Math.floor(r() * 8);
        for (let j = 0; j < stackH; j++) {
          const roti = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.022, 10), lam2({ color: j % 3 ? "#e8cf9e" : "#d9b878" }));
          roti.position.set(sx - 0.45 + sIdx * 0.45, 0.92 + j * 0.024, sz); R.add(roti);
        }
      }
      // a cloth over one stack
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.62), lam2({ color: "#e8e2d2" }));
      cloth.position.set(sx - 0.45, 0.92 + 16 * 0.024 + 0.03, sz); R.add(cloth);
    }
    // ---- THE FLOUR MOUNTAIN: sacks stacked in a pyramid + one open ----
    {
      const sackM = lam2({ map: sackTex() });
      const levels: [number, number][] = [[5, 3], [4, 2], [3, 2], [2, 1]];
      levels.forEach(([nx, nz], li) => {
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
          const sack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.62), sackM);
          sack.position.set(4.6 + (i - (nx - 1) / 2) * 1.0, 0.21 + li * 0.43, -4.6 + (j - (nz - 1) / 2) * 0.68);
          sack.rotation.y = (r() - 0.5) * 0.14; sack.castShadow = true; R.add(sack);
        }
      });
      const open = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.55, 10, 1, true), lam2({ color: "#c9b18a", side: THREE.DoubleSide }));
      open.position.set(2.9, 0.27, -2.6); R.add(open);
      const flour = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 10), lam2({ color: "#f7f1de" }));
      flour.position.set(2.9, 0.5, -2.6); R.add(flour);
      blob(R, 4.6, 0.012, -4.6, 6.4, 3.4, 0.3);
    }
    // ---- vegetable crates (west wall) ----
    const crateCols = ["#c23b2a", "#e8862c", "#5a9440", "#7a4a8c"];
    for (let i = 0; i < 4; i++) {
      const cz = -5 - i * 2.2;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), lam2({ color: "#8a6a42" }));
      crate.position.set(-6.6, 0.22, cz); crate.castShadow = true; R.add(crate);
      for (let j = 0; j < 6; j++) {
        const veg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lam2({ color: crateCols[i] }));
        veg.position.set(-6.6 + (r() - 0.5) * 0.55, 0.5, cz + (r() - 0.5) * 0.55); R.add(veg);
      }
    }
    // steel buckets row by the cauldrons
    for (let i = 0; i < 5; i++) {
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.42, 10), steel);
      bk.position.set(-2.2, 0.21, -9 - i * 2.6); bk.castShadow = true; R.add(bk);
    }
  }

  // ---------------- roti machine + dish line ----------------
  private buildMachineAndDishes(R: THREE.Group, r: () => number) {
    const steel = lam2({ color: "#9aa0a8", map: rep(stone("dapurSteel2", ["#9aa0a8", "#8a9098", "#aab0b8", "#7e858e"]), 2, 1) });
    // canopy over the work yard
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.25, 24), lam2({ color: "#7a8ba0", map: rep(stone("dapurCanopy", ["#7a8ba0", "#6c7c90", "#8898ac", "#5f7086"]), 8, 8) }));
    canopy.position.set(0, 4.6, -37); canopy.castShadow = true; R.add(canopy);
    for (const side of [-1, 1]) for (const cz of [-27.5, -46.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 8), steel);
      post.position.set(side * 7.6, 2.3, cz); R.add(post);
    }
    // ---- THE ROTI MACHINE: housing + hopper + conveyor ----
    {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.2), steel);
      housing.position.set(-4.6, 1.0, MACHINE_Z); housing.castShadow = true; R.add(housing);
      const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.4, 0.9, 10, 1, true), lam2({ color: "#8a9098", side: THREE.DoubleSide }));
      hopper.position.set(-4.6, 2.45, MACHINE_Z); R.add(hopper);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.4), lam2({ color: "#23262b" }));
      slot.position.set(-3.25, 1.05, MACHINE_Z); R.add(slot);
      const beltBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 1.1), lam2({ color: "#3c4046" }));
      beltBase.position.set(1.4, 0.72, MACHINE_Z); beltBase.castShadow = true; R.add(beltBase);
      const beltTop = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.06, 0.95), lam2({ color: "#23262b" }));
      beltTop.position.set(1.4, 1.0, MACHINE_Z); R.add(beltTop);
      for (const lx of [-2.8, 1.4, 5.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.9), steel);
        leg.position.set(lx, 0.25, MACHINE_Z); R.add(leg);
      }
      // the animated roti discs riding the belt
      this.belt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 10), lam2({ color: "#e8cf9e" }), 13);
      this.belt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      R.add(this.belt);
      // finished stack at the belt's end
      for (let j = 0; j < 14; j++) {
        const roti = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.024, 10), lam2({ color: j % 3 ? "#e8cf9e" : "#d9b878" }));
        roti.position.set(6.6, 0.35 + j * 0.026, MACHINE_Z); R.add(roti);
      }
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), steel);
      tray.position.set(6.6, 0.32, MACHINE_Z); R.add(tray);
      blob(R, 0.5, 0.012, MACHINE_Z, 13, 3, 0.22);
    }
    // ---- THE DISH LINE: trough + plate stacks + drying racks ----
    {
      const trough = new THREE.Mesh(new THREE.BoxGeometry(11, 0.75, 1.3), steel);
      trough.position.set(0, 0.42, TROUGH_Z); trough.castShadow = true; R.add(trough);
      const waterTop = new THREE.Mesh(new THREE.PlaneGeometry(10.7, 1.05), lam2({ map: rep(water(), 6, 1), color: "#7ab3c9" }));
      waterTop.rotation.x = -Math.PI / 2; waterTop.position.set(0, 0.81, TROUGH_Z); R.add(waterTop);
      // suds blobs along the trough
      for (let i = 0; i < 16; i++) {
        const sud = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.1, 7, 5), lam2({ color: "#f4f8fa" }));
        sud.position.set(-5 + i * 0.65 + (r() - 0.5) * 0.2, 0.85, TROUGH_Z + (r() - 0.5) * 0.6); sud.scale.y = 0.6; R.add(sud);
      }
      // plate stacks waiting + drying racks of clean plates
      for (const px of [-6.3, -5.5, 5.6, 6.4]) {
        const nStack = 10 + Math.floor(r() * 10);
        for (let j = 0; j < nStack; j++) {
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.03, 10), steel);
          pl.position.set(px, 0.1 + j * 0.032, TROUGH_Z + (px > 0 ? 1.3 : -1.3)); R.add(pl);
        }
      }
      const rackM = lam2({ color: "#6e7a86" });
      for (const rx of [-3.4, 3.4]) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.8), rackM);
        rack.position.set(rx, 1.05, TROUGH_Z - 1.6); R.add(rack);
        for (let j = 0; j < 7; j++) {
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), steel);
          pl.position.set(rx - 0.9 + j * 0.3, 1.22, TROUGH_Z - 1.6); pl.rotation.x = 0.5; R.add(pl);
        }
      }
      blob(R, 0, 0.012, TROUGH_Z, 13.5, 3.4, 0.2);
    }
  }

  // ---------------- the pool + the Golden Temple ----------------
  private buildPoolAndTemple(R: THREE.Group, r: () => number) {
    // marble rim + steps
    const rimM = lam2({ map: rep(marbleTex(), 8, 2), color: "#f2ecdc" });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 40), rimM);
    rim.position.set(0, 0.05, -72); rim.receiveShadow = true; R.add(rim);
    // the water
    this.waterTex = rep(water(), 10, 7);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(42, 36), lam2({ map: this.waterTex, color: "#3d8fa8" }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.18, -72); R.add(pool);
    // causeway to the temple
    const cause = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 33), rimM);
    cause.position.set(0, 0.3, -72); cause.receiveShadow = true; R.add(cause);
    for (let i = 0; i < 5; i++) {
      const z = -60 - i * 7;
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), lam2({ color: "#2c2e33" }));
        pole.position.set(side * 1.8, 1.1, z); R.add(pole);
        const lampMat = new THREE.MeshBasicMaterial({ color: "#ffd98a", fog: false });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lampMat);
        lamp.position.set(side * 1.8, 1.95, z); lamp.layers.set(NOINK); R.add(lamp);
        this.glowMats.push(lampMat);
      }
    }
    // golden glint streak on the water under the temple
    const glintMat = new THREE.MeshBasicMaterial({ map: puffTex(), color: "#e8b93a", transparent: true, opacity: 0.3, depthWrite: false, fog: false });
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(9, 30), glintMat);
    glint.rotation.x = -Math.PI / 2; glint.position.set(0, 0.21, -76); glint.layers.set(NOINK); R.add(glint);
    this.glowMats.push(glintMat);
    // ---- THE TEMPLE ----
    const T = new THREE.Group(); T.position.set(0, 0, TEMPLE_Z); R.add(T);
    const marbleM = lam2({ map: rep(marbleTex(), 3, 1), color: "#f4efe0" });
    const goldM = lam2({ color: "#d9a441", map: rep(stone("dapurGold", ["#d9a441", "#c9962e", "#e8bc58", "#bd8a26"]), 2, 1) });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(17, 1.1, 11), marbleM);
    plat.position.y = 0.55; plat.castShadow = true; T.add(plat);
    const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(11, 2.6, 7), marbleM);
    baseBlock.position.y = 2.4; baseBlock.castShadow = true; T.add(baseBlock);
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.6), lam2({ map: goldFacadeTex() }));
    facade.position.set(0, 2.4, 3.53); T.add(facade);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(8, 1.9, 5.4), goldM);
    upper.position.y = 4.65; upper.castShadow = true; T.add(upper);
    const upperFacade = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.9), lam2({ map: goldFacadeTex() }));
    upperFacade.position.set(0, 4.65, 2.73); T.add(upperFacade);
    // central dome + finial
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
    dome.position.y = 5.6; dome.castShadow = true; T.add(dome);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 8), goldM);
    finial.position.y = 8.0; T.add(finial);
    // four corner domes + kiosk turrets
    for (const sx of [-3.4, 3.4]) for (const sz of [-1.9, 1.9]) {
      const d2 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
      d2.position.set(sx, 5.6, sz); T.add(d2);
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 6), goldM);
      f2.position.set(sx, 6.85, sz); T.add(f2);
    }
    for (const sx of [-5.6, 5.6]) {
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 8), marbleM);
      tur.position.set(sx, 4.4, 2.6); T.add(tur);
      const td = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
      td.position.set(sx, 5.2, 2.6); T.add(td);
    }
    // glowing gold trims (bright in the day, blazing at night)
    const trimMat = new THREE.MeshBasicMaterial({ color: "#ffca6a", transparent: true, opacity: 0.55, fog: false });
    this.glowMats.push(trimMat);
    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.16, 5.7), trimMat);
    trim1.position.y = 5.62; trim1.layers.set(NOINK); T.add(trim1);
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.14, 7.3), trimMat);
    trim2.position.y = 3.72; trim2.layers.set(NOINK); T.add(trim2);
    // ---- the langar block on the pool's east side (steams at night) ----
    const block = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 20), lam2({ color: "#e8e0cc", map: rep(stone("dapurBlock", ["#e8e0cc", "#dcd2ba", "#f0e8d4", "#d0c4a6"]), 3, 3) }));
    block.position.set(16.5, 2.5, -70); block.castShadow = true; R.add(block);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), lam2({ color: "#9a8a70" }));
    chimney.position.set(16.5, 6.0, -76); R.add(chimney);
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0.35, fog: false }));
      sp.layers.set(NOINK); R.add(sp);
      this.steam.push({ sp, x: 16.5, y: 7.2, z: -76, ph: i * 0.36 + 2, s: 2.2 });
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
    // the pool shots must see across the water to the temple
    const fogK = id === 2 || id === 9 ? 2.6 : id === 1 || id === 10 ? 1.5 : 1;
    this.fog.near = Lp.fogNear * fogK; this.fog.far = Lp.fogFar * fogK;
    scene.fog = this.fog; scene.background = null;
    // ---- steam over the cauldrons + the langar chimney ----
    for (const st of this.steam) {
      const ph = (tt * 0.16 + st.ph) % 1;
      st.sp.position.set(st.x + Math.sin((tt + st.ph * 7) * 0.9) * 0.3 * ph, st.y + ph * 2.6, st.z);
      const sc2 = st.s * (0.7 + ph * 1.6);
      st.sp.scale.set(sc2, sc2, 1);
      (st.sp.material as THREE.SpriteMaterial).opacity = 0.42 * (1 - ph) * (ph < 0.12 ? ph / 0.12 : 1);
    }
    // ---- the roti conveyor ----
    if (this.belt) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < 13; i++) {
        const x = -3.0 + ((i * 0.92 + tt * 1.55) % 11.9);
        m.setPosition(x, 1.06, MACHINE_Z);
        this.belt.setMatrixAt(i, m);
      }
      this.belt.instanceMatrix.needsUpdate = true;
    }
    // ---- glow: gold trims + lamps blaze at night ----
    const night = s.light === "night";
    for (const gm of this.glowMats) gm.opacity = night ? 1.0 : 0.5;
    // ---- sky: the dome is unlit (MeshBasic), so swap it for the night
    // dome after dark; day clouds hide too ----
    this.skyDay.visible = !night; this.skyNight.visible = night;
    for (const c of this.clouds) c.visible = !night;
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
