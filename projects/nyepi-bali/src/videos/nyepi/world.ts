// The Nyepi Bali film as one three.js scene: a Balinese street along z (road
// x -3.2..3.2, z -40..20; shops + houses both banks; candi bentar split gate at
// z -26 with pura meru silhouettes behind it) plus a separate airport set far
// east (x ~97) for the closed-airport shot.
// VISUAL CORE: shots 2-3 (golden) are the LOUD Pengrupukan dusk — crowds,
// torches, the ogoh-ogoh giant. Shots 1/5/6/7 (day) are the same world EMPTY.
// Shots 8/9/10 (night) are Nyepi night: deep-blue moonlight, a painted star
// dome with a Milky Way band, temple silhouettes — textured and readable,
// NEVER a flat black screen (anti-banding: speckled sky, grain, moon glow).
// Layered light rig like the house style: key sun w/ soft shadows + hemi fill
// + cool rim; every large surface carries painted texture.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, rep, rng, stone, planks, beam, grass } from "./paint";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, L, camAt, V3, ShotDef, LAMPS4_T } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
const asphaltTex = () => ctex("nyepiAsphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#565b60"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "196,202,208" : "30,33,38"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
  for (let i = 0; i < 240; i++) { g.fillStyle = `rgba(40,43,48,${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 30, 4 + r() * 14, r() * 3, 0, 7); g.fill(); }
  // patched cracks
  g.strokeStyle = "rgba(28,30,34,0.5)"; g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
});
const plasterTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,238" : "60,50,40"},${0.04 + r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2.6, 2.6); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(70,58,44,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, 7); g.fill(); }
});
const shutterTex = () => ctex("nyepiShutter", 512, 512, (g, r) => {
  g.fillStyle = "#7d8894"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 36) { g.fillStyle = "rgba(30,36,44,0.55)"; g.fillRect(0, y, 512, 5); g.fillStyle = "rgba(230,238,244,0.20)"; g.fillRect(0, y + 5, 512, 3); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "235,240,245" : "40,46,54"},${0.06 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2.4, 2.4); }
});
const signTex = (key: string, text: string, bg: string, fg: string, sub = "") => ctex(key, 1024, 256, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  let fs = 104;
  g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > 940) { fs = Math.floor(fs * (940 / tw)); g.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`; }
  g.fillText(text, 512, sub ? 104 : 130);
  if (sub) {
    let sfs = 54;
    g.font = `700 ${sfs}px Arial, sans-serif`;
    const sw = g.measureText(sub).width;
    if (sw > 940) { sfs = Math.floor(sfs * (940 / sw)); g.font = `700 ${sfs}px Arial, sans-serif`; }
    g.fillText(sub, 512, 196);
  }
});
const crossTex = () => ctex("nyepiCross", 256, 256, (g) => {
  g.fillStyle = "#f4f6f2"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#c8102e";
  g.fillRect(103, 38, 50, 180); g.fillRect(38, 103, 180, 50);
});
const demonTex = () => ctex("nyepiDemon", 512, 512, (g, r) => {
  g.fillStyle = "#9c3626"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.45 ? "226,120,80" : "70,20,14"},${0.08 + r() * 0.14})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 16, 2 + r() * 9, r() * 3, 0, 7); g.fill(); }
  // gold ornament speckle
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(240,196,80,${0.25 + r() * 0.4})`; g.fillRect(r() * 512, r() * 512, 3.4, 3.4); }
});
const leafTex = () => ctex("nyepiLeaf", 512, 512, (g, r) => {
  g.fillStyle = "#4d7d3a"; g.fillRect(0, 0, 512, 512);
  const cols = ["#5d9046", "#3f6d30", "#6fa454", "#54863f"];
  for (let i = 0; i < 2200; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.globalAlpha = 0.25 + r() * 0.4; g.beginPath(); g.ellipse(r() * 512, r() * 512, 5 + r() * 13, 3 + r() * 7, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
});
const fuselageTex = () => ctex("nyepiFuse", 1024, 256, (g, r) => {
  g.fillStyle = "#eef1f4"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#28418c"; g.fillRect(0, 150, 1024, 106); // belly band
  g.fillStyle = "#1c2733";
  for (let x = 60; x < 980; x += 44) { g.beginPath(); g.roundRect(x, 84, 24, 30, 8); g.fill(); } // windows
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(120,130,140,${0.04 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 256, 2.4, 2.4); }
});
const blobTex = () => ctex("nyepiBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const flameTex = () => ctex("nyepiFlame", 128, 256, (g) => {
  const gr = g.createRadialGradient(64, 170, 4, 64, 150, 110);
  gr.addColorStop(0, "rgba(255,240,190,0.95)"); gr.addColorStop(0.35, "rgba(255,170,60,0.75)");
  gr.addColorStop(0.7, "rgba(230,90,30,0.35)"); gr.addColorStop(1, "rgba(200,60,20,0)");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(64, 140, 52, 105, 0, 0, 7); g.fill();
});
/** the sky dome painting per light — always speckled/textured (anti-banding) */
const skyTex = (kind: LightName) => ctex("nyepiSky" + kind, 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  if (kind === "day") { grad.addColorStop(0, "#2f6fd0"); grad.addColorStop(0.45, "#6ea8e4"); grad.addColorStop(0.8, "#b9d6f2"); grad.addColorStop(1, "#dcecf8"); }
  else if (kind === "golden") { grad.addColorStop(0, "#3d3a6e"); grad.addColorStop(0.35, "#8a5a86"); grad.addColorStop(0.62, "#d3765e"); grad.addColorStop(0.85, "#f2a65e"); grad.addColorStop(1, "#ffd08a"); }
  else { grad.addColorStop(0, "#040a1c"); grad.addColorStop(0.4, "#081631"); grad.addColorStop(0.75, "#10264a"); grad.addColorStop(1, "#1d3a5f"); }
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  // grain everywhere — the anti-banding insurance
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,20"},${0.02 + r() * 0.04})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  if (kind === "day" || kind === "golden") {
    // soft cloud blobs
    const cols = kind === "day" ? ["255,255,255", "240,246,252"] : ["255,205,160", "240,150,130"];
    for (let i = 0; i < 46; i++) {
      const x = r() * 2048, y = 60 + r() * 480, w = 90 + r() * 260;
      const cg = g.createRadialGradient(x, y, 4, x, y, w);
      cg.addColorStop(0, `rgba(${cols[0]},${0.16 + r() * 0.16})`); cg.addColorStop(1, `rgba(${cols[1]},0)`);
      g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, w, w * 0.32, 0, 0, 7); g.fill();
    }
  }
  if (kind === "night" || kind === "golden") {
    // stars (dense at night, sparse early stars at dusk top)
    const n = kind === "night" ? 3400 : 260, yMax = kind === "night" ? 900 : 380;
    for (let i = 0; i < n; i++) {
      const y = Math.pow(r(), 1.4) * yMax, s = r() < 0.06 ? 3.4 : 2.2;
      g.fillStyle = `rgba(235,242,255,${0.45 + r() * 0.55})`;
      g.fillRect(r() * 2048, y, s, s);
    }
    if (kind === "night") {
      // the Milky Way: a soft diagonal band of clustered star dust
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
      // moon glow upper right
      const mn = g.createRadialGradient(1620, 190, 8, 1620, 190, 190);
      mn.addColorStop(0, "rgba(240,246,255,0.9)"); mn.addColorStop(0.12, "rgba(215,230,255,0.5)"); mn.addColorStop(1, "rgba(200,220,255,0)");
      g.fillStyle = mn; g.fillRect(1380, 0, 480, 430);
      g.fillStyle = "#eef4ff"; g.beginPath(); g.arc(1620, 190, 26, 0, 7); g.fill();
      g.fillStyle = "rgba(190,205,230,0.5)"; g.beginPath(); g.arc(1610, 182, 6, 0, 7); g.fill(); g.beginPath(); g.arc(1632, 200, 4.4, 0, 7); g.fill();
    }
  }
});

// ---------------- builders ----------------
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
const prism = (w: number, h: number, d: number, mat: THREE.Material) => {
  // a triangular-prism roof: ridge along z
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
type ShopOpts = { w: number; h: number; d: number; wall: string; roof: string; shutter?: boolean; sign?: [string, string, string]; porch?: boolean };
const shop = (o: ShopOpts) => {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d),
    lam2({ map: rep(plasterTex("nyepiPlaster" + o.wall, o.wall), 1, 1) }));
  body.position.y = o.h / 2; body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.92, o.h * 0.86),
    lam2({ map: o.shutter ? shutterTex() : rep(plasterTex("nyepiPlasterF" + o.wall, o.wall), 1, 1), color: o.shutter ? "#ffffff" : "#e8e2d4" }));
  front.position.set(0, o.h * 0.46, o.d / 2 + 0.012); grp.add(front);
  const roofM = prism(o.w + 0.7, o.h * 0.42, o.d + 0.7, lam2({ map: rep(stone("nyepiRoof" + o.roof, [o.roof, o.roof, o.roof]), 2, 2), color: "#b9a894" }));
  roofM.position.y = o.h; grp.add(roofM);
  if (o.sign) {
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.8, o.w * 0.2),
      new THREE.MeshBasicMaterial({ map: signTex("nyepiSign" + o.sign[0], o.sign[0], o.sign[1], o.sign[2]), fog: false }));
    sg.position.set(0, o.h * 0.82, o.d / 2 + 0.03); sg.layers.set(NOINK); grp.add(sg);
  }
  if (o.porch) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(o.w * 0.9, 0.35, 2.2), lam2({ map: rep(stone("nyepiPorch", ["#b7ab96", "#a99c84", "#c4b8a2"]), 2, 1) }));
    slab.position.set(0, 0.175, o.d / 2 + 1.1); slab.castShadow = true; slab.receiveShadow = true; grp.add(slab);
    for (const px of [-o.w * 0.36, o.w * 0.36]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 8), lam2({ color: "#8a6d4a", map: beam() }));
      col.position.set(px, 1.5, o.d / 2 + 1.9); col.castShadow = true; grp.add(col);
    }
    const proof = prism(o.w * 0.95, 0.8, 2.6, lam2({ map: rep(stone("nyepiRoofP" + o.roof, [o.roof, o.roof, o.roof]), 2, 1), color: "#b9a894" }));
    proof.position.set(0, 2.62, o.d / 2 + 1.1); grp.add(proof);
  }
  return grp;
};
const tree = (r: () => number) => {
  const grp = new THREE.Group();
  const trunkMat = lam2({ color: "#7a6248", map: beam() });
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 2.2, 7), trunkMat);
  t1.position.y = 1.1; t1.rotation.z = 0.14; t1.castShadow = true; grp.add(t1);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 7), trunkMat);
  t2.position.set(0.34, 2.7, 0.1); t2.rotation.z = -0.5; t2.castShadow = true; grp.add(t2);
  const leafMat = lam2({ map: rep(leafTex(), 2, 2) });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.05 + r() * 0.5, 10, 8), leafMat);
    s.position.set((r() - 0.5) * 1.7, 3.4 + r() * 0.7, (r() - 0.5) * 1.7);
    s.scale.y = 0.62; s.castShadow = true; grp.add(s);
  }
  return grp;
};
const scooter = (col: string) => {
  const grp = new THREE.Group();
  const mat = lam2({ color: col });
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 1.5), mat);
  bodyM.position.y = 0.48; bodyM.castShadow = true; grp.add(bodyM);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.8), lam2({ color: "#2c2620" }));
  seat.position.set(0, 0.78, -0.25); grp.add(seat);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.1), mat);
  shield.position.set(0, 0.85, 0.68); shield.rotation.x = -0.25; grp.add(shield);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), lam2({ color: "#3a3f45" }));
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.12, 0.66); grp.add(bar);
  const wheelM = lam2({ color: "#1e2126" });
  for (const wz of [0.68, -0.62]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(0, 0.26, wz); grp.add(w);
  }
  return grp;
};
const car = (col: string) => {
  const grp = new THREE.Group();
  const mat = lam2({ color: col });
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 4.1), mat);
  bodyM.position.y = 0.55; bodyM.castShadow = true; grp.add(bodyM);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.1), lam2({ color: "#223140", map: rep(plasterTex("nyepiGlass", "#31435a"), 1, 1) }));
  cab.position.set(0, 1.05, -0.2); cab.castShadow = true; grp.add(cab);
  const wheelM = lam2({ color: "#1e2126" });
  for (const [wx, wz] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.35], [0.8, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.32, wz); grp.add(w);
  }
  return grp;
};
/** the ogoh-ogoh: a big painted demon on a bamboo raft (platform top y ~1.0) */
const ogoh = () => {
  const grp = new THREE.Group();
  const bamboo = lam2({ color: "#c8a878", map: rep(planks(), 1, 3) });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.6, 7), bamboo);
    p.rotation.z = Math.PI / 2; p.position.set(0, 0.92 + (i % 2) * 0.02, -1.35 + i * 0.45); p.castShadow = true; grp.add(p);
  }
  for (const px of [-1.5, 1.5]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 7), bamboo);
    p.rotation.x = Math.PI / 2; p.position.set(px, 0.86, 0); grp.add(p);
  }
  const skin = lam2({ map: demonTex() });
  const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#d9a91f", specular: "#fff2c8", shininess: 70 }));
  const dark = lam2({ color: "#2c1a12" });
  const st = new THREE.Group(); // the statue itself, feet at y 1.0
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.78, 0.9, 10), lam2({ color: "#31572c", map: demonTex() }));
  skirt.position.y = 1.45; skirt.castShadow = true; st.add(skirt);
  for (const sd of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.6, 8), skin);
    leg.position.set(sd * 0.3, 0.85, sd > 0 ? 0.12 : -0.1); leg.rotation.z = sd * 0.25; st.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), skin);
  torso.position.y = 2.35; torso.scale.set(1, 1.15, 0.82); torso.castShadow = true; st.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 16), gold);
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.95; st.add(belt);
  for (const sd of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.15, 8), skin);
    arm.position.set(sd * 0.78, 2.85, 0); arm.rotation.z = sd * -0.7; arm.castShadow = true; st.add(arm);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.95, 8), skin);
    arm2.position.set(sd * 0.62, 2.3, 0.5); arm2.rotation.x = -1.1; arm2.rotation.z = sd * -0.3; st.add(arm2);
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skin);
    claw.position.set(sd * 1.18, 3.35, 0); st.add(claw);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), skin);
  head.position.y = 3.35; head.castShadow = true; st.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), skin);
  jaw.position.set(0, 3.08, 0.16); jaw.scale.set(1, 0.7, 0.9); st.add(jaw);
  for (const sd of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 8), gold);
    horn.position.set(sd * 0.34, 3.85, 0); horn.rotation.z = sd * -0.5; st.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), new THREE.MeshBasicMaterial({ color: "#fff6da" }));
    eye.position.set(sd * 0.2, 3.45, 0.44); st.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: "#160c06" }));
    pup.position.set(sd * 0.2, 3.45, 0.53); st.add(pup);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 6), new THREE.MeshBasicMaterial({ color: "#f6efdd" }));
    fang.position.set(sd * 0.16, 3.06, 0.5); fang.rotation.x = Math.PI; st.add(fang);
  }
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), gold);
  crown.position.y = 3.95; st.add(crown);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), dark);
  hair.position.set(0, 3.42, -0.18); hair.scale.set(1, 1, 0.7); st.add(hair);
  st.position.y = 0.05;
  grp.add(st);
  return grp;
};
const plane = (s: number) => {
  const grp = new THREE.Group();
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 10.5, 16), lam2({ map: fuselageTex() }));
  fuse.rotation.x = Math.PI / 2; fuse.castShadow = true; grp.add(fuse);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), lam2({ color: "#eef1f4" }));
  nose.position.z = 5.25; nose.scale.z = 1.5; grp.add(nose);
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.0, 2.6, 12), lam2({ color: "#e2e6ea" }));
  tailCone.rotation.x = Math.PI / 2; tailCone.position.z = -6.4; grp.add(tailCone);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.09, 1.5), lam2({ color: "#cfd6dc" }));
  wing.position.set(0, -0.25, 0.4); wing.castShadow = true; grp.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 1.6), lam2({ color: "#c8102e" }));
  fin.position.set(0, 1.35, -6.9); fin.rotation.x = 0.35; grp.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), lam2({ color: "#cfd6dc" }));
  stab.position.set(0, 0.75, -7.1); grp.add(stab);
  for (const sd of [-1, 1]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 10), lam2({ color: "#9aa4ae" }));
    eng.rotation.x = Math.PI / 2; eng.position.set(sd * 2.6, -0.75, 0.6); grp.add(eng);
  }
  grp.scale.setScalar(s);
  return grp;
};

type Glow = { sp: THREE.Sprite; base: number; kind: number };
type FadeMat = { m: THREE.Material & { opacity: number }; base: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#c3d3e2", 26, 170);
  private skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false });
  private skyKind: LightName | "" = "";
  private parade = new THREE.Group();
  private flames: Glow[] = [];
  private lampGlows: Glow[] = [];
  private porchFades: FadeMat[] = [];
  private hospWin: THREE.Mesh[] = [];
  private beamGrp = new THREE.Group();
  private moonSp: THREE.Sprite;
  private star: THREE.Mesh;
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(777);
    // ---- light rig: key (shadow caster) + hemisphere fill + cool rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8d99a4", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#bcd7ff", 0.55);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky dome (texture swapped per light) + moon sprite + shooting star ----
    const sky = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18), this.skyMat);
    sky.layers.set(NOINK); R.add(sky);
    this.moonSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#dfeaff", transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    this.moonSp.position.set(330, 300, -420); this.moonSp.scale.set(150, 150, 1); this.moonSp.layers.set(NOINK); R.add(this.moonSp);
    this.star = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.5),
      new THREE.MeshBasicMaterial({ color: "#eaf2ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
    this.star.position.set(-60, 120, -190); this.star.rotation.z = -0.5; this.star.layers.set(NOINK); R.add(this.star);
    // ---- base ground (grass/dirt) under everything ----
    const base = new THREE.Mesh(new THREE.PlaneGeometry(300, 190), lam2({ map: rep(grass(), 40, 26), color: "#9aa578" }));
    base.rotation.x = -Math.PI / 2; base.position.set(35, -0.03, -12); base.receiveShadow = true; R.add(base);
    // ---- the street: asphalt road + sidewalks ----
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 64), lam2({ map: rep(asphaltTex(), 1, 10) }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -10); road.receiveShadow = true; R.add(road);
    for (const sd of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 64), lam2({ map: rep(stone("nyepiWalk", ["#b7ab96", "#a99c84", "#c4b8a2"]), 1, 16) }));
      walk.rotation.x = -Math.PI / 2; walk.position.set(sd * 4.0, 0.012, -10); walk.receiveShadow = true; R.add(walk);
    }
    // centre dashes (once — NOT inside the sidewalk loop, duplicates z-fight)
    for (let dz = 18; dz > -38; dz -= 4) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.7), lam2({ color: "#e8e4da" }));
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.008, dz); R.add(dash);
    }
    // ---- buildings: shops + houses along both banks ----
    const mk = (o: ShopOpts, x: number, z: number, flip: boolean) => {
      // fronts face the STREET: west bank (flip=false) turns +90° so its local
      // +z front points +x; east bank (flip=true) turns -90° so it points -x
      const s = shop(o); s.position.set(x, 0, z); s.rotation.y = flip ? -Math.PI / 2 : Math.PI / 2; R.add(s); return s;
    };
    mk({ w: 5.4, h: 3.6, d: 4.4, wall: "#cbb493", roof: "#8a4a34", shutter: true, sign: ["WARUNG", "#2e6da8", "#ffffff"] }, -7.6, 12, false);
    mk({ w: 6.2, h: 4.4, d: 4.6, wall: "#b8c4b0", roof: "#6e4a34", sign: ["TOKO", "#c0353a", "#ffffff"] }, -7.9, 3.5, false);
    mk({ w: 5.6, h: 3.4, d: 4.2, wall: "#d8c9a8", roof: "#8a4a34", shutter: true }, -7.7, -4.5, false);
    // the hotel (left bank, street-facing door at x -5.5, z -13 — tourists peek from here at night)
    const hotel = mk({ w: 6.4, h: 8.6, d: 5.2, wall: "#cfd6cf", roof: "#5d4a3a", sign: ["HOTEL", "#2e5f8a", "#ffffff"] }, -8.1, -13, false);
    hotel.position.z = -13;
    mk({ w: 5.8, h: 3.8, d: 4.4, wall: "#c4a888", roof: "#8a4a34", shutter: true, sign: ["KOPI", "#7a4a21", "#ffe9c4"] }, -7.8, -21, false);
    mk({ w: 5.6, h: 3.6, d: 4.4, wall: "#d3bda0", roof: "#8a4a34", sign: ["SATE", "#a03a2a", "#ffffff"] }, 7.7, 13.5, true);
    // the hero house with the porch (right bank; after the -90° turn the porch
    // faces the street: floor y 0.35, x 4.2..6.4, z -1.0..4.2, centre (5.3, 1.6))
    mk({ w: 5.8, h: 3.5, d: 4.4, wall: "#e0d2ae", roof: "#7a4433", porch: true }, 8.6, 1.6, true);
    mk({ w: 5.2, h: 3.3, d: 4.0, wall: "#bfcdb4", roof: "#8a4a34", shutter: true }, 7.6, -6.5, true);
    mk({ w: 6.0, h: 4.0, d: 4.6, wall: "#d8c2a4", roof: "#6e4a34", sign: ["LAUNDRY", "#2e8b6e", "#ffffff"] }, 7.9, -11.5, true);
    // the hospital (right bank z -16): plain block + cross sign + lit windows
    {
      const hosp = new THREE.Group();
      const bodyH = new THREE.Mesh(new THREE.BoxGeometry(5.6, 7.2, 6.4), lam2({ map: rep(plasterTex("nyepiHosp", "#dde3da"), 1, 1) }));
      bodyH.position.y = 3.6; bodyH.castShadow = true; bodyH.receiveShadow = true; hosp.add(bodyH);
      const roofH = prism(6.3, 1.6, 7.1, lam2({ color: "#7a8894" }));
      roofH.position.y = 7.2; hosp.add(roofH);
      const cross = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: crossTex(), fog: false }));
      cross.position.set(-2.83, 5.6, 0); cross.rotation.y = -Math.PI / 2; cross.layers.set(NOINK); hosp.add(cross);
      // window grid on the street face (-x): dark by day, LIT at night
      for (let wy = 0; wy < 3; wy++) for (let wz = 0; wz < 3; wz++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.05),
          new THREE.MeshBasicMaterial({ color: "#ffd98a", fog: false, transparent: true, opacity: 0 }));
        win.position.set(-2.815, 1.8 + wy * 2.1, -1.9 + wz * 1.9); win.rotation.y = -Math.PI / 2;
        win.layers.set(NOINK); hosp.add(win); this.hospWin.push(win);
      }
      hosp.position.set(8.3, 0, -16); R.add(hosp);
    }
    // ---- candi bentar: the split gate at z -26 ----
    {
      const gateMat = lam2({ map: rep(stone("nyepiGate", ["#6e6258", "#5d5348", "#7d7166"]), 1, 3), color: "#cfc4b4" });
      for (const sd of [-1, 1]) {
        const half = new THREE.Group();
        let w = 1.7;
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 1.25, 1.5), gateMat);
          seg.position.set(sd * (0.28 + (1.7 - w) / 2) * 1, 0.62 + i * 1.25, 0);
          seg.position.x = sd * (0.3 + (1.7 - w) * 0.5);
          seg.castShadow = true; seg.receiveShadow = true; half.add(seg);
          w *= 0.86;
        }
        half.position.set(sd * 1.55, 0, -26); R.add(half);
      }
    }
    // ---- pura silhouette behind the gate: three meru towers ----
    {
      const wallM = lam2({ color: "#4c443c", map: rep(stone("nyepiPura", ["#5d5348", "#4c443c", "#685c50"]), 2, 2) });
      const thatch = lam2({ color: "#33302c" });
      const meru = (x: number, z: number, tiers: number, s: number) => {
        const g2 = new THREE.Group();
        const baseM = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), wallM);
        baseM.position.y = 1.1; g2.add(baseM);
        let y = 2.2, w = 2.9;
        for (let i = 0; i < tiers; i++) {
          const rf = prism(w, 0.85, w, thatch); rf.rotation.y = Math.PI / 4; rf.position.y = y; g2.add(rf);
          y += 0.78; w *= 0.8;
          const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.8, w * 0.55), wallM);
          core.position.y = y - 0.35; g2.add(core);
        }
        g2.position.set(x, 0, z); g2.scale.setScalar(s); R.add(g2);
      };
      meru(0, -36, 7, 1.25); meru(-5.5, -34.5, 5, 1.0); meru(5.5, -34.5, 4, 0.9);
      const pwall = new THREE.Mesh(new THREE.BoxGeometry(17, 2.0, 0.8), wallM);
      pwall.position.set(0, 1.0, -31.5); pwall.castShadow = true; R.add(pwall);
    }
    // ---- frangipani trees + parked vehicles + street lamps ----
    for (const [tx, tz] of [[-4.9, 15], [4.9, 16.5], [-4.9, 6], [4.9, -1], [-4.9, -9], [4.9, -19], [-4.9, -23]] as [number, number][]) {
      const tr = tree(r); tr.position.set(tx, 0, tz); tr.rotation.y = r() * 3; R.add(tr);
      blob(R, tx, 0.012, tz, 2.6, 2.2, 0.35);
    }
    const scoots: [string, number, number, number][] = [["#c0353a", 3.95, 9.5, 0.2], ["#2e5f8a", 3.95, 11.2, -0.15], ["#e8b13c", 3.95, 12.9, 0.1], ["#3f6b5a", -3.95, -2.5, 2.9]];
    for (const [c, sx, sz, ry] of scoots) { const sc2 = scooter(c); sc2.position.set(sx, 0, sz); sc2.rotation.y = ry; R.add(sc2); }
    const carA = car("#7a8894"); carA.position.set(-4.15, 0, 17.5); carA.rotation.y = 0.03; R.add(carA);
    const carB = car("#a03a2a"); carB.position.set(4.15, 0, -13.5); carB.rotation.y = Math.PI - 0.04; R.add(carB);
    // street lamps: glow sprites burn ONLY at dusk (parade) — Nyepi night: dark
    for (const sd of [-1, 1]) for (const lz of [12, 4, -4, -12, -20]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.3, 7), lam2({ color: "#3a4148" }));
      pole.position.set(sd * 3.55, 2.15, lz); pole.castShadow = true; R.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.24), lam2({ color: "#2c3138" }));
      head.position.set(sd * 3.3, 4.32, lz); R.add(head);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#ffca7a", transparent: true, opacity: 0, depthWrite: false }));
      sp.position.set(sd * 3.3, 4.2, lz); sp.scale.set(2.6, 1.6, 1); sp.layers.set(NOINK); R.add(sp);
      this.lampGlows.push({ sp, base: 0.5, kind: 1 });
    }
    // porch lamps on the hero house (fade OUT during shot 4 — amati geni);
    // they hang under the porch roof's street edge (porch x 4.2..6.4, z -1..4.2)
    for (const pz of [0.4, 2.9]) {
      const spm = new THREE.SpriteMaterial({ map: blobTex(), color: "#ffd9a0", transparent: true, opacity: 0, depthWrite: false });
      const sp = new THREE.Sprite(spm);
      sp.position.set(4.7, 2.45, pz); sp.scale.set(2.2, 1.4, 1); sp.layers.set(NOINK); R.add(sp);
      this.porchFades.push({ m: spm, base: 0.55 });
      const bm = new THREE.MeshBasicMaterial({ color: "#ffe2b0", fog: false, transparent: true, opacity: 0 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bm);
      bulb.position.set(4.7, 2.45, pz); bulb.layers.set(NOINK); R.add(bulb);
      this.porchFades.push({ m: bm, base: 1 });
    }
    // ---- gamelan row (shot 2): metallophone boxes on the west sidewalk ----
    for (const gz of [-1.0, -2.2, -3.4]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 1.05), lam2({ color: "#8e2432", map: rep(planks(), 1, 1) }));
      box.position.set(-3.8, 0.17, gz); box.castShadow = true; R.add(box);
      for (let ki = 0; ki < 5; ki++) {
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6),
          twoTone(new THREE.MeshPhongMaterial({ color: "#d9a91f", specular: "#fff2c8", shininess: 60 })));
        pot.position.set(-3.8, 0.4, gz - 0.4 + ki * 0.2); R.add(pot);
      }
    }
    // ---- THE PARADE GROUP: ogoh-ogoh + raft + torches (shots 2-3 only) ----
    {
      const og = ogoh(); og.position.set(0, 0, -4); this.parade.add(og);
      // torch poles around the route
      for (const [tx, tz] of [[-2.8, 0.5], [2.8, -0.5], [-2.8, -8], [2.8, -8.6], [-2.9, -4.2], [2.9, -4.6]] as [number, number][]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.3, 6), lam2({ color: "#6e5233", map: beam() }));
        pole.position.set(tx, 1.15, tz); this.parade.add(pole);
        const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false }));
        fl.position.set(tx, 2.6, tz); fl.scale.set(0.65, 1.15, 1); fl.layers.set(NOINK); this.parade.add(fl);
        this.flames.push({ sp: fl, base: 1, kind: 0 });
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#ff9a3c", transparent: true, opacity: 0.4, depthWrite: false }));
        gl.position.set(tx, 2.55, tz); gl.scale.set(3.4, 2.2, 1); gl.layers.set(NOINK); this.parade.add(gl);
        this.flames.push({ sp: gl, base: 0.4, kind: 1 });
      }
      R.add(this.parade);
    }
    // ---- pecalang flashlight beam (shot 8): cone + pool of light on the road ----
    {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 4.2, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: "#ffeec2", transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      cone.rotation.x = Math.PI / 2 + 0.32; cone.position.set(0, -0.35, -2.1);
      this.beamGrp.add(cone);
      const poolM = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16),
        new THREE.MeshBasicMaterial({ color: "#ffedb8", transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      poolM.rotation.x = -Math.PI / 2; poolM.position.set(0, -1.28, -5.1); this.beamGrp.add(poolM);
      const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex(), color: "#fff3cf", transparent: true, opacity: 0.75, depthWrite: false }));
      tip.scale.set(0.85, 0.85, 1); tip.layers.set(NOINK); this.beamGrp.add(tip);
      this.beamGrp.position.set(-1.4, 1.25, -3);
      this.beamGrp.visible = false;
      R.add(this.beamGrp);
    }
    // ---- AIRPORT SET (shot 6): apron, terminal, tower, parked planes ----
    {
      const A = new THREE.Group();
      const apron = new THREE.Mesh(new THREE.PlaneGeometry(72, 46), lam2({ map: rep(asphaltTex(), 8, 5), color: "#b9bec4" }));
      apron.rotation.x = -Math.PI / 2; apron.position.set(97, 0.005, -14); apron.receiveShadow = true; A.add(apron);
      const term = new THREE.Mesh(new THREE.BoxGeometry(36, 6.4, 8), lam2({ map: rep(plasterTex("nyepiTerm", "#ccd4da"), 3, 1) }));
      term.position.set(97, 3.2, -27); term.castShadow = true; term.receiveShadow = true; A.add(term);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(33, 3.6), lam2({ map: rep(plasterTex("nyepiTermGlass", "#2c4258"), 6, 1), color: "#aebfd0" }));
      glass.position.set(97, 2.6, -22.95); A.add(glass);
      const roofT = new THREE.Mesh(new THREE.BoxGeometry(38, 0.5, 10.5), lam2({ color: "#5d6a74" }));
      roofT.position.set(97, 6.65, -27); roofT.castShadow = true; A.add(roofT);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.9),
        new THREE.MeshBasicMaterial({ map: signTex("nyepiAirSign", "I GUSTI NGURAH RAI", "#1c2f47", "#ffffff", "INTERNATIONAL AIRPORT"), fog: false }));
      sign.position.set(100, 5.3, -22.9); sign.layers.set(NOINK); A.add(sign);
      const towerBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11.5, 2.4), lam2({ map: rep(plasterTex("nyepiTower", "#c3ccd2"), 1, 2) }));
      towerBase.position.set(108, 5.75, -25); towerBase.castShadow = true; A.add(towerBase);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.6, 1.9, 8), lam2({ color: "#223140", map: rep(plasterTex("nyepiCab", "#31435a"), 2, 1) }));
      cab.position.set(108, 12.4, -25); A.add(cab);
      const p1 = plane(1.0); p1.position.set(97, 1.55, -11); p1.rotation.y = 0.5; A.add(p1); blob(A, 97, 0.02, -11, 13, 6, 0.4);
      const p2 = plane(0.78); p2.position.set(84, 1.25, -19); p2.rotation.y = -0.3; A.add(p2); blob(A, 84, 0.02, -19, 10, 5, 0.35);
      // a closed sign board at the terminal doors
      const closed = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.15),
        new THREE.MeshBasicMaterial({ map: signTex("nyepiClosed", "TUTUP", "#c0353a", "#ffffff", "NYEPI — 24 JAM"), fog: false }));
      closed.position.set(93, 1.6, -22.6); closed.rotation.y = 0.25; closed.layers.set(NOINK); A.add(closed);
      R.add(A);
    }
    // loose offerings (canang) dots on the sidewalk — little life detail
    const b = new Batch();
    const offMat = lam("nyepiOffering", () => ({ color: "#7fae56" }));
    for (let i = 0; i < 14; i++) {
      const sd = i % 2 ? 1 : -1;
      b.add(new THREE.BoxGeometry(0.22, 0.03, 0.22), offMat,
        new THREE.Matrix4().makeTranslation(sd * (3.6 + r() * 0.7), 0.03, 16 - r() * 46));
    }
    b.build(R);
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
    if (s.light === "night") {
      // moonlight: keep it low-ish but never so low the street goes unreadable
      v.y = Math.max(v.y, 0.38);
    } else {
      v.z = Math.abs(v.z) * 0.9 + 0.3;
      v.y = Math.max(v.y, 0.55);
    }
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
    this.rim.intensity = s.light === "night" ? 0.3 : 0.55;
    TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
    TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
    CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    untone(Lp.fog, this.fog.color); this.fog.near = Lp.fogNear; this.fog.far = Lp.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- sky follows the shot's light ----
    if (this.skyKind !== s.light) {
      this.skyKind = s.light;
      this.skyMat.map = skyTex(s.light);
      this.skyMat.needsUpdate = true;
    }
    this.moonSp.visible = s.light === "night";
    // ---- per-shot life ----
    this.parade.visible = id === 2 || id === 3;
    if (id === 3) this.parade.position.y = 0.055 * Math.abs(Math.sin(tt * 2.3));
    else this.parade.position.y = 0;
    for (let i = 0; i < this.flames.length; i++) {
      const fl = this.flames[i];
      const fl2 = 0.85 + 0.22 * Math.sin(tt * 11 + i * 2.7) * Math.sin(tt * 5.3 + i * 1.3);
      if (fl.kind === 0) { // the flame tongue itself
        fl.sp.scale.set(0.65 * (1.6 - fl2) * 0.85, 1.15 * fl2, 1);
        (fl.sp.material as THREE.SpriteMaterial).opacity = 0.95;
      } else { // its halo
        fl.sp.scale.set(3.4 * fl2, 2.2 * fl2, 1);
        (fl.sp.material as THREE.SpriteMaterial).opacity = 0.3 + 0.14 * fl2;
      }
    }
    const dusk = s.light === "golden";
    for (const g2 of this.lampGlows) (g2.sp.material as THREE.SpriteMaterial).opacity = dusk ? g2.base : 0;
    // porch lamps: lit in shot 4 until LAMPS4_T, then OUT (amati geni) for good
    let porchK = 0;
    if (id === 4) {
      const u = (tt - (LAMPS4_T - 0.7)) / 1.1;
      porchK = u <= 0 ? 1 : u >= 1 ? 0 : 1 - u;
    }
    for (const pf of this.porchFades) pf.m.opacity = pf.base * porchK;
    const hospK = s.light === "night" ? 0.92 : 0;
    for (const w of this.hospWin) (w.material as THREE.MeshBasicMaterial).opacity = hospK;
    // flashlight: only on the patrol shot; the beam sweeps slowly
    this.beamGrp.visible = id === 8;
    if (id === 8) this.beamGrp.rotation.y = Math.sin(tt * 0.45) * 0.45;
    // shooting star on the punchline
    {
      const u = (tt - ((L[9] + 40) / FPS)) / 1.1;
      const m = this.star.material as THREE.MeshBasicMaterial;
      if (id === 10 && u >= 0 && u <= 1) {
        m.opacity = Math.sin(u * Math.PI) * 0.85;
        this.star.position.x = -60 + u * 150;
        this.star.position.y = 120 - u * 34;
      } else m.opacity = 0;
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
