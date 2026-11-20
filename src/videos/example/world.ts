// The example film as one three.js scene: a lone platform on the OUTER (river) side of the
// track, exactly like the real station — platform along x at the origin, the Nishiki River in
// front (+z, where the cameras live), the track and the cliff behind it (-z), green mountains
// across the water. The passenger train and a little works train are posed per frame from
// story.ts (trainX / cargoX). update(id, f, camera) poses everything for shot id.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, grassHD, cloudHD, water, rep } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, trainX, cargoX } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const boardTex = (key: string, bg: string, fg: string, lines: string[], sizes: number[], w = 1024, h = 320) =>
  ctex(key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.lineWidth = 16; g.strokeStyle = "#241726"; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    lines.forEach((ln, i) => {
      let fs = sizes[i] ?? sizes[0];
      g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
      while (g.measureText(ln).width > w - 110 && fs > 20) { fs -= 6; g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`; }
      g.fillText(ln, w / 2, (h * (i + 1)) / (lines.length + 1) + 6);
    });
  });

type Mats = Record<string, THREE.Material>;
const tree = (b: Batch, M: Mats, x: number, y: number, z: number, s: number) => {
  b.add(new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 1.7 * s, 6), M.trunk, new THREE.Matrix4().makeTranslation(x, y + 0.85 * s, z));
  const blob = (dx: number, dy: number, dz: number, r: number) =>
    b.add(new THREE.IcosahedronGeometry(r * s, 1), M.leaf, new THREE.Matrix4().makeTranslation(x + dx * s, y + dy * s, z + dz * s));
  blob(0, 2.6, 0, 1.25); blob(0.7, 2.0, 0.3, 0.9); blob(-0.6, 2.1, -0.4, 0.85);
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#b8d0ec", 25, 300);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<LightName, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private infoMat!: THREE.MeshLambertMaterial;
  private trainGrp = new THREE.Group();
  private cargoGrp = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light (house rig) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(2.2, 1.5, 0.75), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = {
      day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)),
      golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
      storm: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.storm.cloud)),
    };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.conc = lam("concM", () => ({ color: "#b9bec2" }));
    M.concDark = lam("concDM", () => ({ color: "#8f959a" }));
    M.rock1 = lam("rock1M", () => ({ color: "#99917f" }));
    M.rock2 = lam("rock2M", () => ({ color: "#8b8474" }));
    M.rock3 = lam("rock3M", () => ({ color: "#7e7768" }));
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.water = lam("waterM", () => ({ map: rep(water(), 16, 5), color: "#8fb8dd" }));
    M.wood = lam("woodM", () => ({ color: "#8a6844" }));
    M.woodDark = lam("woodDM", () => ({ color: "#5d4a35" }));
    M.white = lam("whiteM", () => ({ color: "#f7f9fa" }));
    M.green = lam("greenM", () => ({ color: "#2e7d5b" }));
    M.cream = lam("creamM", () => ({ color: "#f3ead2" }));
    M.glass = lam("glassM", () => ({ color: "#2c3e50" }));
    M.leaf = lam("leafP", () => ({ color: "#3f7038" }));
    M.leafFar = lam("leafFarM", () => ({ color: "#5b8a52" }));
    M.trunk = lam("trunkP", () => ({ color: "#5a4632" }));
    M.rust = lam("rustM", () => ({ color: "#9a4a38" }));
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#848b94", specular: "#b8b8b8", shininess: 45 }), 0.15);
    M.dark = lam("darkM", () => ({ color: "#23272e" }));
    M.roofG = lam("roofGM", () => ({ color: "#4a5560" }));

    const b = new Batch();
    // ================= GEOGRAPHY (river at +z, cliff at -z) =================
    {
      const rv = new THREE.Mesh(new THREE.PlaneGeometry(340, 66), M.water);
      rv.rotation.x = -Math.PI / 2; rv.position.set(0, -7, 40); rv.receiveShadow = true; R.add(rv);
    }
    // slope from the platform's front edge down to the water
    b.add(boxGeo(V(-80, -7.2, 0.8), V(80, -0.9, 8.6), 0, true), M.grass);
    // far bank + mountains across the river
    b.add(boxGeo(V(-170, -7.2, 72), V(170, 4, 104), 0, true), M.grass);
    for (const [mx, mz, mr, mh] of [[-70, 128, 52, 58], [5, 142, 66, 76], [85, 122, 46, 50], [150, 138, 58, 62], [-150, 136, 60, 66]] as const) {
      b.add(new THREE.ConeGeometry(mr, mh, 7), M.leafFar, new THREE.Matrix4().makeTranslation(mx, mh / 2 - 4, mz));
      tree(b, M, mx - mr * 0.3, mh * 0.45, mz - 6, 2.2);
    }
    tree(b, M, -30, 2.5, 76, 1.6); tree(b, M, 24, 3.2, 78, 1.9); tree(b, M, 52, 2.2, 74, 1.4); tree(b, M, -58, 3.0, 79, 1.7);
    // the cliff behind the track, in three rock strata
    b.add(boxGeo(V(-46, -1, -38), V(46, 9, -8.6), 0, true), M.rock3);
    b.add(boxGeo(V(-46, 9, -38), V(46, 18, -8.6), 0, true), M.rock2);
    b.add(boxGeo(V(-46, 18, -38), V(46, 27, -8.6), 0, true), M.rock1);
    b.add(boxGeo(V(-46, -1.2, -8.6), V(46, 6, -6.9), 0, true), M.rock2); // ledge behind the track
    for (const [tx, tz, ts] of [[-20, -13, 1.8], [-6, -17, 2.2], [9, -12, 1.6], [22, -16, 2.0], [34, -13, 1.7], [-33, -16, 1.9], [16, -21, 2.3], [-13, -23, 2.1]] as const)
      tree(b, M, tx, 26.4, tz, ts);
    tree(b, M, -14, 5.6, -9.6, 1.3); tree(b, M, 18, 5.6, -9.8, 1.5); tree(b, M, 30, 5.6, -9.5, 1.2);
    // terraced ledges across the cliff face, each with its row of trees: the cliff reads green
    b.add(boxGeo(V(-46, 11.2, -10.2), V(46, 12.1, -8.4), 0, true), M.rock2);
    b.add(boxGeo(V(-46, 18.2, -10.8), V(46, 19.1, -8.4), 0, true), M.rock3);
    for (const [tx, ts] of [[-38, 1.5], [-27, 1.9], [-16, 1.4], [-5, 2.0], [6, 1.6], [17, 1.9], [28, 1.4], [39, 1.7]] as const)
      tree(b, M, tx, 11.9, -9.9, ts);
    for (const [tx, ts] of [[-33, 1.7], [-21, 1.4], [-9, 1.9], [3, 1.5], [14, 1.8], [25, 1.4], [36, 1.8]] as const)
      tree(b, M, tx, 18.9, -10.3, ts);
    for (const [tx, ts] of [[-36, 1.3], [-24, 1.5], [24, 1.3], [37, 1.5]] as const)
      tree(b, M, tx, 5.6, -9.7, ts);
    // ================= TRACK (centre z = -5.2) =================
    b.add(boxGeo(V(-85, -1.75, -6.9), V(85, -1.45, -3.5), 0, true), M.concDark);
    for (let rx = -84; rx <= 84; rx += 1.6)
      b.add(boxGeo(V(rx - 0.55, -1.45, -6.6), V(rx + 0.55, -1.34, -3.8), 0, true), M.woodDark);
    b.add(boxGeo(V(-85, -1.34, -6.08), V(85, -1.2, -5.84), 0, true), M.steel);
    b.add(boxGeo(V(-85, -1.34, -4.56), V(85, -1.2, -4.32), 0, true), M.steel);
    // ================= PLATFORM (z -3.4 .. 0.6, top y=0) =================
    b.add(boxGeo(V(-16, -1.45, -3.4), V(16, 0, 0.6), 0, true), M.conc);
    b.add(boxGeo(V(-16, -0.06, 0.42), V(16, 0.02, 0.58), 0, true), M.white); // edge line
    // railing along the river edge
    for (let px = -15.6; px <= 15.6; px += 2.4)
      b.add(boxGeo(V(px - 0.05, 0, 0.72), V(px + 0.05, 1.05, 0.84), 0, true), M.steel);
    b.add(boxGeo(V(-15.8, 0.98, 0.71), V(15.8, 1.1, 0.85), 0, true), M.steel);
    b.add(boxGeo(V(-15.8, 0.52, 0.71), V(15.8, 0.6, 0.85), 0, true), M.steel);
    // end fences (the "no way out" made visible)
    for (const ex of [-16, 16]) {
      for (let pz = -3.2; pz <= 0.4; pz += 1.2)
        b.add(boxGeo(V(ex - 0.06, 0, pz - 0.05), V(ex + 0.06, 1.5, pz + 0.05), 0, true), M.steel);
      b.add(boxGeo(V(ex - 0.06, 1.42, -3.3), V(ex + 0.06, 1.54, 0.5), 0, true), M.steel);
      b.add(boxGeo(V(ex - 0.06, 0.75, -3.3), V(ex + 0.06, 0.83, 0.5), 0, true), M.steel);
    }
    // bench (cast sits at x=-2.6, z=-2.3)
    b.add(boxGeo(V(-3.9, 0.42, -2.58), V(-1.3, 0.54, -2.02), 0, true), M.wood);
    b.add(boxGeo(V(-3.9, 0.78, -2.66), V(-1.3, 1.24, -2.54), 0, true), M.wood);
    for (const bx of [-3.7, -1.5]) {
      b.add(boxGeo(V(bx - 0.07, 0, -2.52), V(bx + 0.07, 0.44, -2.08), 0, true), M.steel);
      b.add(boxGeo(V(bx - 0.07, 0.5, -2.64), V(bx + 0.07, 1.26, -2.52), 0, true), M.steel);
    }
    // a small shelter roof at the west end
    for (const [sx2, sz2] of [[-10.6, -3.0], [-8.2, -3.0], [-10.6, -1.5], [-8.2, -1.5]] as const)
      b.add(boxGeo(V(sx2 - 0.06, 0, sz2 - 0.06), V(sx2 + 0.06, 2.7, sz2 + 0.06), 0, true), M.steel);
    b.add(boxGeo(V(-11.1, 2.66, -3.3), V(-7.7, 2.82, -1.2), 0, true), M.roofG);
    // lamp posts
    for (const lx of [-11.5, 11.5]) {
      b.add(boxGeo(V(lx - 0.07, 0, -3.07), V(lx + 0.07, 3.6, -2.93), 0, true), M.steel);
      b.add(boxGeo(V(lx - 0.55, 3.55, -3.2), V(lx + 0.55, 3.78, -2.8), 0, true), M.dark);
    }
    // station sign poles + info board poles (boards added below, facing +z)
    b.add(boxGeo(V(6.1, 0, -3.02), V(6.3, 4.3, -2.82), 0, true), M.woodDark);
    b.add(boxGeo(V(8.7, 0, -3.02), V(8.9, 4.3, -2.82), 0, true), M.woodDark);
    b.add(boxGeo(V(0.1, 0, -3.28), V(0.28, 3.1, -3.12), 0, true), M.woodDark);
    b.add(boxGeo(V(2.72, 0, -3.28), V(2.9, 3.1, -3.12), 0, true), M.woodDark);
    b.build(R);

    // ---- text boards (face +z, toward the river-side cameras) ----
    const board = (w: number, h: number, x: number, y: number, z: number, tex: THREE.Texture) => {
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.receiveShadow = true;
      R.add(m);
      return mat;
    };
    board(5.8, 1.5, 7.5, 3.55, -2.9, boardTex("signMain", "#2e5f8a", "#ffffff", ["SEIRYU MIHARASHI"], [118]));
    this.infoMat = board(4.8, 2.3, 1.5, 2.0, -3.18, boardTex("infoDef", "#fffdf4", "#241726", ["SEIRYU MIHARASHI", "PERON PANDANG SUNGAI"], [96, 84], 1024, 490));

    // ================= THE PASSENGER TRAIN (2 cars, local z centred 0) =================
    {
      const tb = new Batch();
      for (const cx of [-5.6, 5.6]) {
        tb.add(boxGeo(V(cx - 5.2, -1.5, -1.3), V(cx + 5.2, -1.02, 1.3), 0, true), M.dark);
        for (const bx of [-3.4, 3.4])
          tb.add(boxGeo(V(cx + bx - 1.1, -1.62, -0.95), V(cx + bx + 1.1, -1.28, 0.95), 0, true), M.dark);
        tb.add(boxGeo(V(cx - 5.3, -1.02, -1.45), V(cx + 5.3, 1.98, 1.45), 0, true), M.cream);
        tb.add(boxGeo(V(cx - 5.36, 0.18, -1.47), V(cx + 5.36, 0.78, 1.47), 0, true), M.green);
        tb.add(boxGeo(V(cx - 5.0, 1.98, -1.3), V(cx + 5.0, 2.24, 1.3), 0, true), M.roofG);
        for (const sgn of [-1, 1]) // windows both sides (min<max on every axis)
          for (let wi = 0; wi < 4; wi++)
            tb.add(boxGeo(V(cx - 3.9 + wi * 2.1, 1.02, sgn > 0 ? 1.44 : -1.5), V(cx - 2.5 + wi * 2.1, 1.78, sgn > 0 ? 1.5 : -1.44), 0, true), M.glass);
        for (const dx of [-4.6, 4.6]) // doors on the platform side (+z local)
          tb.add(boxGeo(V(cx + dx - 0.55, -0.9, 1.44), V(cx + dx + 0.55, 1.9, 1.5), 0, true), M.green);
      }
      for (const ex of [-11.15, 11.15]) {
        tb.add(boxGeo(V(ex - 0.06, 0.95, -0.95), V(ex + 0.06, 1.8, 0.95), 0, true), M.glass);
        tb.add(boxGeo(V(ex - 0.07, -0.5, -0.8), V(ex + 0.07, -0.1, -0.45), 0, true), M.white);
        tb.add(boxGeo(V(ex - 0.07, -0.5, 0.45), V(ex + 0.07, -0.1, 0.8), 0, true), M.white);
      }
      tb.build(this.trainGrp);
      this.trainGrp.position.set(999, 0, -5.2);
      R.add(this.trainGrp);
    }
    // ================= THE WORKS TRAIN =================
    {
      const cb = new Batch();
      cb.add(boxGeo(V(-8.6, -1.5, -1.15), V(-3.8, -1.05, 1.15), 0, true), M.dark);
      cb.add(boxGeo(V(-8.7, -1.05, -1.3), V(-3.7, 1.15, 1.3), 0, true), M.rust);
      cb.add(boxGeo(V(-4.9, 1.15, -1.1), V(-3.8, 2.0, 1.1), 0, true), M.rust);
      cb.add(boxGeo(V(-4.82, 1.35, -1.14), V(-3.86, 1.85, 1.14), 0, true), M.glass);
      cb.add(boxGeo(V(-8.5, 1.15, -0.8), V(-5.6, 1.5, 0.8), 0, true), M.dark);
      cb.add(boxGeo(V(-2.9, -1.5, -1.2), V(4.6, -1.1, 1.2), 0, true), M.dark);
      for (const wx of [-2.0, 3.6])
        cb.add(boxGeo(V(wx - 0.9, -1.62, -0.9), V(wx + 0.9, -1.3, 0.9), 0, true), M.dark);
      for (let bi = 0; bi < 3; bi++)
        cb.add(boxGeo(V(-2.6, -1.1 + bi * 0.34, -0.75 + (bi % 2) * 0.5), V(4.3, -0.78 + bi * 0.34, -0.25 + (bi % 2) * 0.5), 0, true), M.wood);
      cb.build(this.cargoGrp);
      this.cargoGrp.position.set(999, 0, -5.2);
      R.add(this.cargoGrp);
    }
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
    // THIS FILM: the sun must always hang over the river (+z). The camera-relative house rig
    // would put it behind the cliff for these river-side cameras and drown the whole scene in
    // cliff shadow — mirror it to the river hemisphere and keep it high.
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
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(15)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(0.5);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- the trains, posed ----
    const tx = trainX(id, tt);
    this.trainGrp.visible = tx < 500;
    if (this.trainGrp.visible) this.trainGrp.position.x = tx;
    const cx = cargoX(id, tt);
    this.cargoGrp.visible = cx < 500;
    if (this.cargoGrp.visible) this.cargoGrp.position.x = cx;
    // ---- the info board, per shot ----
    if (id === 3) this.setMap(this.infoMat, boardTex("infoNoExit", "#e2453c", "#ffffff", ["PINTU KELUAR:", "TIDAK ADA"], [110, 130], 1024, 490));
    else if (id === 4) this.setMap(this.infoMat, boardTex("infoFact", "#fffdf4", "#241726", ["DIBUKA 2019", "BIAYA 112 JUTA YEN"], [104, 88], 1024, 490));
    else if (id === 5) this.setMap(this.infoMat, boardTex("infoPass", "#e2453c", "#ffffff", ["KERETA BIASA:", "TIDAK BERHENTI"], [104, 104], 1024, 490));
    else if (id === 7) this.setMap(this.infoMat, boardTex("infoTwist", "#2e8b6e", "#ffffff", ["STASIUN INI SENGAJA", "TANPA PINTU KELUAR"], [92, 96], 1024, 490));
    else if (id === 8) this.setMap(this.infoMat, boardTex("infoView", "#2e5f8a", "#ffffff", ["MIHARASHI =", "TEMPAT MEMANDANG"], [100, 92], 1024, 490));
    else this.setMap(this.infoMat, boardTex("infoDef", "#fffdf4", "#241726", ["SEIRYU MIHARASHI", "PERON PANDANG SUNGAI"], [96, 84], 1024, 490));
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
      a.mesh.castShadow = L.actorShadow;
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

  private setMap(mat: THREE.MeshLambertMaterial, tex: THREE.Texture) {
    if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
  }
}
