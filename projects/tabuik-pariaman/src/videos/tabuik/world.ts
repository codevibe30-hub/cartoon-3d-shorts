// Pariaman, West Sumatra as one three.js scene for the
// Fafnir-ID Tabuik short: a sandy procession street lined with
// colourful houses and palms, a river crossing, the rumah
// tabuik workshop yard, then open beach and sea. The star is
// the TABUIK itself: a 12-metre ornamental tower — winged
// Buraq body below, tiered umbrella-crowned pangkek above —
// carried on bamboo poles, rocked (hoyak) by its bearers, and
// finally tipped into the sea. VISUAL CORE: bright tropical
// daylight, saturated festival colours, textured everything
// (anti-banding), layered light rig — the house style.
import * as THREE from "three";
import { Kit } from "./build";
import { ctex, rep, rng, cloudHD, CLOUD_DAY, water, planks } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, WORKSHOP, TABUIK_B, SEA_Z, RIVER_Z, clamp01, tabuikAt } from "./story";

export const loadKit = (): Promise<Kit> => Promise.resolve({});

const lam2 = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- painted textures ----------------
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
  layer(s * 0.16, 0, "#aebadd");
  layer(s * 0.05, -s * 0.02, "#d7e2f5");
  layer(-s * 0.10, -s * 0.05, "#ffffff");
};
const skyTexDay = () => ctex("tabuikSkyDay", 2048, 1024, (g, r) => {
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
const glowTex = () => ctex("tabuikGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, "rgba(255,244,200,0.75)");
  gr.addColorStop(0.5, "rgba(255,238,180,0.28)"); gr.addColorStop(1, "rgba(255,238,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const birdTex = () => ctex("tabuikBirds", 256, 96, (g, r) => {
  g.strokeStyle = "rgba(28,38,64,0.85)"; g.lineWidth = 3.4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x = 22 + r() * 200, y = 18 + r() * 56, w = 9 + r() * 8, d = 4 + r() * 3;
    g.beginPath();
    g.moveTo(x - w, y - d); g.quadraticCurveTo(x - w * 0.4, y + d * 0.7, x, y);
    g.quadraticCurveTo(x + w * 0.4, y + d * 0.7, x + w, y - d);
    g.stroke();
  }
});
const foliageTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#9db98d"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(38,66,30,${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = r() > 0.42 ? `rgba(240,255,214,${0.12 + r() * 0.22})` : `rgba(30,58,24,${0.10 + r() * 0.18})`;
    g.beginPath(); g.ellipse(x, y, 2.4 + r() * 3.4, 1.4 + r() * 2, r() * 3, 0, 7); g.fill();
  }
});
/** packed-sand street: warm grit, wheel ruts, scattered pebbles */
const sandStreetTex = () => ctex("tabuikStreet", 1024, 1024, (g, r) => {
  g.fillStyle = "#c2a878"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "146,120,78" : "226,206,160"},${0.10 + r() * 0.16})`;
    g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 70, 12 + r() * 40, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "110,88,52" : "240,224,180"},${0.08 + r() * 0.18})`; g.fillRect(r() * 1024, r() * 1024, 2.4, 2.4); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(96,84,66,${0.25 + r() * 0.3})`; g.beginPath(); g.arc(r() * 1024, r() * 1024, 1.5 + r() * 2.6, 0, 7); g.fill(); }
});
/** beach sand: paler, finer, with shell flecks */
const beachTex = () => ctex("tabuikBeach", 1024, 1024, (g, r) => {
  g.fillStyle = "#dec493"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "196,168,110" : "246,232,196"},${0.10 + r() * 0.14})`;
    g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 24 + r() * 80, 14 + r() * 44, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "170,142,92" : "252,240,210"},${0.08 + r() * 0.16})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(250,246,238,${0.3 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 2 + r() * 3, 1.4 + r() * 2, r() * 3, 0, 7); g.fill(); }
});
const grassRichTex = () => ctex("tabuikGrass", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#4c8433"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 130, dark = r() < 0.52;
    const gr = g.createRadialGradient(x, y, rad * 0.15, x, y, rad);
    const c = dark ? "38,84,26" : "126,186,84";
    gr.addColorStop(0, `rgba(${c},${dark ? 0.34 : 0.30})`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * (0.55 + r() * 0.4), r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = r() > 0.45 ? `rgba(196,240,150,${0.10 + r() * 0.20})` : `rgba(24,56,16,${0.10 + r() * 0.22})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 3.6, 1.2 + r() * 2.2, r() * 3, 0, 7); g.fill();
  }
  const blades = ["#2c5c1d", "#3f7d29", "#5da23e", "#8fce62", "#b9e586"];
  g.lineCap = "round";
  for (let i = 0; i < 12000; i++) {
    const x = r() * S, y = r() * S, l = 7 + r() * 13, lean = (r() - 0.5) * 6;
    g.strokeStyle = blades[Math.floor(r() * blades.length) % blades.length];
    g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1.6 + r() * 1.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + lean, y - l); g.stroke();
  }
  g.globalAlpha = 1;
});
const barkTex = () => ctex("tabuikBark", 256, 256, (g, r) => {
  g.fillStyle = "#77563a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 210; i++) {
    const x = r() * 256, y = r() * 256, l = 14 + r() * 42;
    g.strokeStyle = r() > 0.4 ? `rgba(46,30,16,${0.16 + r() * 0.22})` : `rgba(214,182,138,${0.12 + r() * 0.16})`;
    g.lineWidth = 1.6 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + l); g.stroke();
  }
});
const plasterTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,252,244" : "120,100,80"},${0.04 + r() * 0.05})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 16 + r() * 44, 10 + r() * 26, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "90,75,60"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** tabuik side panel: festival geometry — diamonds, zigzags and
 *  dots in saturated colour on a deep ground, gold pinstripes */
const panelTex = (key: string, base: string, acc: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(246,198,60,0.9)"; g.lineWidth = 5; g.strokeRect(8, 8, 240, 240);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; g.strokeRect(18, 18, 220, 220);
  const dia = (cx: number, cy: number, s: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath(); g.fill();
  };
  dia(128, 128, 74, acc); dia(128, 128, 48, "#f6ecd2"); dia(128, 128, 24, acc);
  for (const [x, y] of [[44, 44], [212, 44], [44, 212], [212, 212]] as [number, number][]) dia(x, y, 20, "#f6c63c");
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(34 + i * 27, 128, 4.5, 0, 7); g.fill(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
const blobTex = () => ctex("tabuikBlob", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(24,30,52,0.62)"); gr.addColorStop(0.6, "rgba(24,30,52,0.34)"); gr.addColorStop(1, "rgba(24,30,52,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sz: number, op = 0.9) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};

/** golden-hour sky: indigo zenith melting through violet and
 *  burnt orange to a pale gold horizon, low sun at canvas left */
const skyTexGold = () => ctex("tabuikSkyGold", 2048, 1024, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#2c3a6e"); grad.addColorStop(0.30, "#6a4a86"); grad.addColorStop(0.55, "#c65a6a");
  grad.addColorStop(0.78, "#ee8a4e"); grad.addColorStop(1, "#ffd9a0");
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
  const clusters: [number, number, number][] = [
    [140, 430, 62], [450, 390, 84], [790, 450, 56], [1100, 400, 92], [1440, 445, 60],
    [1720, 385, 84], [1980, 440, 56], [620, 330, 44], [1330, 320, 46],
  ];
  for (const [x, y, s] of clusters) paintPuff(g, r, x, y, s);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,220,180" : "40,20,60"},${0.02 + r() * 0.03})`; g.fillRect(r() * 2048, r() * 1024, 2.2, 2.2); }
  const sn = g.createRadialGradient(420, 330, 8, 420, 330, 300);
  sn.addColorStop(0, "rgba(255,236,200,0.95)"); sn.addColorStop(0.12, "rgba(255,200,130,0.55)"); sn.addColorStop(1, "rgba(255,200,130,0)");
  g.fillStyle = sn; g.fillRect(60, 60, 720, 560);
  g.fillStyle = "#fff3d0"; g.beginPath(); g.arc(420, 330, 30, 0, 7); g.fill();
});
/** soft warm light pool for sunlit ground variation */
const patchTex = () => ctex("tabuikPatch", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,246,190,0.85)"); gr.addColorStop(0.55, "rgba(255,246,190,0.38)"); gr.addColorStop(1, "rgba(255,246,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const softPatch = (parent: THREE.Object3D, tex: THREE.Texture, color: string, x: number, y: number, z: number, sx: number, sz: number, op: number, rot = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.renderOrder = 2; parent.add(m);
  return m;
};
/** bare earth for tree bases and yard wear */
const soilTex = () => ctex("tabuikSoil", 256, 256, (g, r) => {
  g.fillStyle = "#6e5133"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "46,32,16" : "146,116,74"},${0.12 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "30,20,10" : "196,164,110"},${0.10 + r() * 0.22})`; g.fillRect(r() * 256, r() * 256, 1.8, 1.8); }
});
/** woven roof tiles: rows of arcs in warm clay */
const tileTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 34) {
    for (let x = 0; x < 512; x += 30) {
      g.strokeStyle = `rgba(40,16,8,${0.20 + r() * 0.12})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x + 15, y + 30, 15, Math.PI, 0); g.stroke();
      g.strokeStyle = `rgba(255,220,180,${0.10 + r() * 0.10})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x + 15, y + 27, 15, Math.PI, 0); g.stroke();
    }
  }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,230,190" : "30,14,6"},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2.2, 2.2); }
});

// ---------------- builders ----------------
/** A colourful Pariaman house: plaster walls in festival colour,
 *  steep clay-tile gable roof, shuttered windows, a door with a
 *  stone step, flower pots. Front faces +Z; yaw toward the street. */
const makeHouse = (wallMat: THREE.MeshLambertMaterial, roofMat: THREE.MeshLambertMaterial, w: number, d: number, wallH: number, roofH: number) => {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, roofH); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.6) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = wallH - 0.05; roof.castShadow = true; g.add(roof);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(roofGeo, wallMat);
    tri.scale.set(0.999, 0.999, 0.02); tri.position.set(0, wallH - 0.05, s * (d / 2 + 0.02) - 0.01);
    g.add(tri);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, d + 0.65, 8), lam2({ color: "#5d3020" }));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, wallH + roofH - 0.02, 0); g.add(ridge);
  const frameM = lam2({ color: "#f4f1ea" });
  const glassM = lam2({ color: "#33526e" });
  const glintM = new THREE.MeshBasicMaterial({ color: "#eaf6ff", transparent: true, opacity: 0.5 });
  const shutterM = lam2({ color: "#20503c" });
  const winXs = w > 6 ? [-w / 4, w / 4] : [0];
  for (const wx of winXs) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.45, 0.1), frameM);
    fr.position.set(wx, wallH * 0.56, d / 2 + 0.03); g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.12), glassM);
    gl.position.set(wx, wallH * 0.56, d / 2 + 0.04); g.add(gl);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.8), glintM);
    glint.position.set(wx - 0.17, wallH * 0.56 + 0.05, d / 2 + 0.105); glint.rotation.z = 0.5; g.add(glint);
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.06), shutterM);
      sh.position.set(wx + s * 0.8, wallH * 0.56, d / 2 + 0.05); sh.rotation.y = s * 0.16; g.add(sh);
    }
  }
  const doorX = w > 6 ? 0 : w / 3.2;
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.05, 0.09), frameM);
  dfr.position.set(doorX, 1.0, d / 2 + 0.03); g.add(dfr);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.85, 0.1), lam2({ color: "#7a3a20" }));
  door.position.set(doorX, 0.93, d / 2 + 0.05); g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam2({ color: "#d9b04a" }));
  knob.position.set(doorX + 0.34, 0.93, d / 2 + 0.12); g.add(knob);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.55), lam2({ color: "#a39a8b" }));
  step.position.set(doorX, 0.07, d / 2 + 0.3); step.receiveShadow = true; g.add(step);
  const potM = lam2({ color: "#a8542e" });
  const flw = ["#d83a4a", "#e8c832", "#e86a9a", "#f2f0e6"];
  for (const s of [1, -1]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 8), potM);
    pot.position.set(doorX + s * 1.05, 0.15, d / 2 + 0.35); g.add(pot);
    for (let i = 0; i < 3; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), lam2({ color: flw[(i + (s > 0 ? 1 : 0)) % flw.length] }));
      fl.position.set(doorX + s * 1.05 + (i - 1) * 0.11, 0.38, d / 2 + 0.35 + (i % 2 ? 0.06 : -0.04)); g.add(fl);
    }
  }
  return g;
};

/** A coconut palm: curved segmented trunk, a crown of drooping
 *  fronds (leaf-fleck planes), coconuts under the crown. */
const makePalm = (h: number, seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 771 + 5);
  const trunkM = lam2({ map: rep(barkTex(), 1, 3), color: "#9a7a56" });
  const lean = (tr() - 0.5) * 0.55;
  let x = 0, y = 0;
  const segH = h / 4;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.11 - i * 0.012, 0.14 - i * 0.012, segH + 0.06, 7), trunkM);
    const tilt = lean * (i / 3);
    seg.position.set(x + Math.sin(tilt) * segH * 0.5, y + segH / 2, 0);
    seg.rotation.z = -tilt;
    seg.castShadow = true; g.add(seg);
    x += Math.sin(tilt) * segH; y += Math.cos(tilt) * segH;
  }
  const crown = new THREE.Group();
  crown.position.set(x, y, 0); g.add(crown);
  const frondM = lam2({ color: "#3f8a3a", map: rep(foliageTex("tabuikPalmFrond"), 2, 1), side: THREE.DoubleSide });
  const frondM2 = lam2({ color: "#57a047", map: rep(foliageTex("tabuikPalmFrond2"), 2, 1), side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + tr() * 0.5;
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(2.5 + tr() * 0.7, 0.55, 4, 1), i % 2 ? frondM : frondM2);
    // bend the frond tip down: droop via vertex offsets
    const posA = fr.geometry.attributes.position as THREE.BufferAttribute;
    for (let vi = 0; vi < posA.count; vi++) {
      const px = posA.getX(vi);
      posA.setY(vi, posA.getY(vi) - Math.max(0, px) * Math.max(0, px) * 0.16);
    }
    posA.needsUpdate = true; fr.geometry.computeVertexNormals();
    fr.position.set(Math.cos(a) * 1.15, 0.12, Math.sin(a) * 1.15);
    fr.rotation.set(0, -a + Math.PI / 2, 0.5 + tr() * 0.2, "YXZ");
    fr.rotation.x = -0.35 - tr() * 0.25;
    fr.castShadow = true; crown.add(fr);
  }
  const nutM = lam2({ color: "#6a7a2e" });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), nutM);
    nut.position.set((tr() - 0.5) * 0.4, -0.18, (tr() - 0.5) * 0.4); crown.add(nut);
  }
  g.userData.crown = crown;
  return g;
};

/** A leafy shade tree: bark trunk, branches, 9-13 foliage blobs
 *  in three depth layers carrying a leaf-fleck texture. */
const makeTree = (h: number, greens: string[], seed = 1) => {
  const g = new THREE.Group();
  const tr = rng(seed * 331 + 17);
  const trunkM = lam2({ map: rep(barkTex(), 1, 2), color: "#a8845f" });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, h * 0.5, 8), trunkM);
  trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
  const folM = (col: string, key: string) => lam2({ color: col, map: rep(foliageTex(key), 1, 1) });
  const mats = [
    folM(greens[2] ?? greens[0], "tabuikFoliageDeep"),
    folM(greens[0], "tabuikFoliageMid"),
    folM(greens[1] ?? greens[0], "tabuikFoliageLite"),
  ];
  const cy = h * 0.72, cr = h * 0.36;
  const blobAt = (x: number, y: number, z: number, rad: number, mi: number) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mats[mi]);
    b.position.set(x, y, z);
    b.scale.set(1 + (tr() - 0.5) * 0.3, 0.78 + tr() * 0.16, 1 + (tr() - 0.5) * 0.3);
    b.rotation.y = tr() * Math.PI;
    b.castShadow = true; g.add(b);
  };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + tr() * 0.8;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h * 0.3, 6), trunkM);
    br.position.set(Math.cos(a) * cr * 0.3, h * 0.52, Math.sin(a) * cr * 0.3);
    br.rotation.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    g.add(br);
  }
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.35 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy - cr * 0.34 + tr() * cr * 0.14, Math.sin(a) * d, cr * (0.42 + tr() * 0.2), 0);
  }
  blobAt(0, cy, 0, cr * 0.92, 1);
  for (let i = 0; i < 4; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.45 + tr() * 0.45);
    blobAt(Math.cos(a) * d, cy + (tr() - 0.4) * cr * 0.4, Math.sin(a) * d, cr * (0.44 + tr() * 0.22), 1);
  }
  for (let i = 0; i < 3; i++) {
    const a = tr() * Math.PI * 2, d = cr * (0.2 + tr() * 0.4);
    blobAt(Math.cos(a) * d, cy + cr * (0.36 + tr() * 0.2), Math.sin(a) * d, cr * (0.34 + tr() * 0.16), 2);
  }
  return g;
};

/** One grass tuft: seven tapered blades fanned from a dark root,
 *  vertex-coloured dark base -> sunlit tip (instanced). */
const grassTuftGeo = () => {
  const tr = rng(90210);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const root = new THREE.Color("#26511a"), tip = new THREE.Color("#93cc5e"), tmp = new THREE.Color();
  let vi = 0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + tr() * 0.9;
    const ox = Math.cos(a) * 0.045, oz = Math.sin(a) * 0.045;
    const lean = 0.09 + tr() * 0.17, h = 0.30 + tr() * 0.24, w = 0.05;
    const tx = ox + Math.cos(a) * lean, tz = oz + Math.sin(a) * lean;
    const px = -Math.sin(a), pz = Math.cos(a);
    pos.push(ox - px * w, 0, oz - pz * w, ox + px * w, 0, oz + pz * w, tx, h, tz);
    tmp.copy(tip).offsetHSL((tr() - 0.5) * 0.03, 0, (tr() - 0.5) * 0.1);
    col.push(root.r, root.g, root.b, root.r, root.g, root.b, tmp.r, tmp.g, tmp.b);
    idx.push(vi, vi + 1, vi + 2); vi += 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

/** THE TABUIK: a ±11 m ornamental tower. Bamboo carrying poles,
 *  a panelled base, the winged Buraq body, then the PANGKEK — a
 *  three-tier tower of festival panels and pyramid roofs crowned
 *  by a golden umbrella + finial, small flags at the corners.
 *  Front (Buraq head) faces -Z, the direction of the sea.
 *  Returns the group plus its pangkek subgroup so update() can
 *  run the shot-5 lift (naik pangkek). */
const makeTabuik = (variant: 0 | 1, flags: { m: THREE.Mesh; ph: number }[]) => {
  const g = new THREE.Group();
  const panels = variant === 0
    ? [panelTex("tabuikPanelA", "#7a1f2b", "#f06423"), panelTex("tabuikPanelB", "#1f3a7a", "#f6c63c"), panelTex("tabuikPanelC", "#0f6a4a", "#f06423")]
    : [panelTex("tabuikPanelD", "#1f3a7a", "#f06423"), panelTex("tabuikPanelE", "#7a1f2b", "#f6c63c"), panelTex("tabuikPanelF", "#5a2a7a", "#f6c63c")];
  const panelM = panels.map((t) => lam2({ map: rep(t, 1, 1) }));
  const goldM = lam2({ color: "#d9a83c" });
  const goldLit = new THREE.MeshLambertMaterial({ color: "#f6c63c", emissive: "#8a5c00", emissiveIntensity: 0.35 });
  const bambooM = lam2({ color: "#c9a86a", map: rep(planks(), 3, 1) });
  const creamM = lam2({ color: "#f2e3c2" });
  // carrying poles along Z + cross poles
  for (const s of [1, -1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 9.6, 8), bambooM);
    pole.rotation.x = Math.PI / 2; pole.position.set(s * 1.15, 1.02, 0); pole.castShadow = true; g.add(pole);
  }
  for (const zz of [-2.7, 2.7]) {
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), bambooM);
    cross.rotation.z = Math.PI / 2; cross.position.set(0, 1.02, zz); g.add(cross);
  }
  // panelled base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.85, 4.4), panelM[0]);
  base.position.y = 1.5; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.14, 4.6), goldM);
  baseTrim.position.y = 1.98; g.add(baseTrim);
  // ---- Buraq body: cream, winged, head toward -Z ----
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 18, 14), creamM);
  body.scale.set(1.0, 0.88, 1.6); body.position.y = 3.05; body.castShadow = true; g.add(body);
  // a panelled saddle blanket over the back + hangings on both
  // flanks + a rear panel, so the body never reads as a bare egg
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.32, 2.4), panelM[0]);
  saddle.position.y = 3.82; saddle.castShadow = true; g.add(saddle);
  for (const s of [1, -1]) {
    const hang = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 2.2), panelM[2]);
    hang.position.set(s * 1.3, 2.88, 0); g.add(hang);
  }
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.12), panelM[1]);
  rear.position.set(0, 3.0, 2.12); g.add(rear);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.5), panelM[1]);
  chest.position.set(0, 2.75, -1.95); g.add(chest);
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.15, 10), creamM);
  neck.position.set(0, 3.95, -2.35); neck.rotation.x = 0.38; neck.castShadow = true; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), creamM);
  head.scale.set(0.82, 1, 1.25); head.position.set(0, 4.5, -2.78); head.castShadow = true; g.add(head);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.74, 0.1), panelM[2]);
  face.position.set(0, 4.5, -3.42); face.rotation.x = 0.18; g.add(face);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 7), goldM);
    ear.position.set(s * 0.24, 4.95, -2.62); ear.rotation.z = -s * 0.25; g.add(ear);
  }
  const crownJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), goldLit);
  crownJewel.position.set(0, 5.06, -2.85); g.add(crownJewel);
  // wings: big panelled fans sweeping up from both flanks
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 2.6), panelM[1]);
    wing.position.set(s * 1.5, 3.95, -0.4); wing.rotation.z = s * 0.85; wing.rotation.y = -s * 0.12;
    wing.castShadow = true; g.add(wing);
    const wingTip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4), goldM);
    wingTip.position.set(s * 2.36, 4.85, -0.4); wingTip.rotation.z = s * 0.85; g.add(wingTip);
  }
  // legs + tail
  for (const [lx, lz] of [[-0.75, -1.5], [0.75, -1.5], [-0.75, 1.5], [0.75, 1.5]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.0, 7), creamM);
    leg.position.set(lx, 2.35, lz); g.add(leg);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), goldM);
    hoof.position.set(lx, 1.9, lz); g.add(hoof);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), panelM[0]);
  tail.position.set(0, 3.3, 2.45); tail.rotation.x = -0.7; g.add(tail);
  // ---- PANGKEK: three panelled tiers, pyramid roofs, umbrella crown ----
  const pangkek = new THREE.Group();
  pangkek.position.y = 3.95; g.add(pangkek);
  const tiers: [number, number][] = [[2.7, 1.75], [2.05, 1.6], [1.45, 1.45]];
  let ty = 0;
  tiers.forEach(([w, h], ti) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), panelM[ti % panelM.length]);
    box.position.y = ty + h / 2; box.castShadow = true; pangkek.add(box);
    const roofM = lam2({ color: ti % 2 ? "#20508a" : "#b8352c", map: rep(planks(), 2, 1) });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 0.85, 4), roofM);
    roof.position.y = ty + h + 0.42; roof.rotation.y = Math.PI / 4; roof.castShadow = true; pangkek.add(roof);
    // corner flags on the middle tier — they wave in update()
    if (ti === 1) for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28),
        new THREE.MeshLambertMaterial({ color: fx * fz > 0 ? "#f6c63c" : "#d8402e", side: THREE.DoubleSide }));
      fm.position.set(fx * (w / 2 + 0.22), ty + h + 0.55, fz * (w / 2 + 0.22));
      const fpole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 5), goldM);
      fpole.position.set(-0.2, -0.32, 0); fm.add(fpole);
      pangkek.add(fm);
      flags.push({ m: fm, ph: fx * 1.3 + fz * 2.1 + (variant ? 3 : 0) });
    }
    ty += h + 0.55;
  });
  // the umbrella crown (payung) + golden finial
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.95, 12), lam2({ color: "#b8352c", map: rep(planks(), 3, 1) }));
  umb.position.y = ty + 0.45; umb.castShadow = true; pangkek.add(umb);
  const umbTrim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 6, 24), goldM);
  umbTrim.rotation.x = Math.PI / 2; umbTrim.position.y = ty + 0.06; pangkek.add(umbTrim);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), goldLit);
  finial.position.y = ty + 1.25; pangkek.add(finial);
  const finialPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), goldM);
  finialPole.position.y = ty + 0.95; pangkek.add(finialPole);
  return { group: g, pangkek };
};

/** The low bridge over the river at RIVER_Z: plank deck wide as
 *  the street, post-and-rail sides, lanterns at both ends. */
const makeBridge = () => {
  const g = new THREE.Group();
  const deckM = lam2({ map: rep(planks(), 4, 2), color: "#b08a5c" });
  const postM = lam2({ color: "#7d5a36" });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.34, 7.2), deckM);
  deck.position.y = 0.17; deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  for (const s of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 7.2), postM);
    rail.position.set(s * 5.1, 1.12, 0); g.add(rail);
    for (let i = 0; i < 5; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.0, 0.11), postM);
      post.position.set(s * 5.1, 0.6, -3.2 + i * 1.6); g.add(post);
    }
    for (const e of [1, -1]) {
      const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.8, 7), postM);
      lp.position.set(s * 5.1, 0.9, e * 3.9); g.add(lp);
      const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7),
        new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ff9a3c", emissiveIntensity: 0.7 }));
      lampGlass.position.set(s * 5.1, 1.9, e * 3.9); g.add(lampGlass);
    }
  }
  return g;
};

/** A small fishing boat with a triangular sail, for the sea. */
const makeBoat = (hullCol: string) => {
  const g = new THREE.Group();
  const hullM = lam2({ color: hullCol, map: rep(planks(), 2, 1) });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 4.6), hullM);
  hull.position.y = 0.3; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 4), hullM);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 0.55, 1); bow.position.set(0, 0.32, -2.7); g.add(bow);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.4, 7), lam2({ color: "#7d5a36" }));
  mast.position.y = 2.1; g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0, 2.9); sailShape.lineTo(1.7, 0.25); sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape),
    new THREE.MeshLambertMaterial({ color: "#f2ead6", side: THREE.DoubleSide }));
  sail.position.set(0.05, 0.75, 0.2); g.add(sail);
  return g;
};

/** A small surau (prayer house): white walls, a green dome on a
 *  drum, a slim minaret — West Sumatran skyline punctuation. */
const makeSurau = () => {
  const g = new THREE.Group();
  const wallM = lam2({ map: rep(plasterTex("tabuikSurauWall", "#f0ead8"), 2, 1) });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.7, 5.4), wallM);
  hall.position.y = 1.35; hall.castShadow = true; g.add(hall);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.8, 12), wallM);
  drum.position.y = 3.1; g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam2({ color: "#1f7a5c" }));
  dome.position.y = 3.45; dome.castShadow = true; g.add(dome);
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.2),
    new THREE.MeshLambertMaterial({ color: "#f6c63c", emissive: "#8a5c00", emissiveIntensity: 0.4 }));
  tip.position.y = 5.45; g.add(tip);
  const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 6.4, 10), wallM);
  minaret.position.set(3.6, 3.2, 0); minaret.castShadow = true; g.add(minaret);
  const minTop = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 10), lam2({ color: "#1f7a5c" }));
  minTop.position.set(3.6, 6.95, 0); g.add(minTop);
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private rim: THREE.DirectionalLight;
  private fog = new THREE.Fog("#b8d0ec", 18, 170);
  private skyDay: THREE.Mesh; private skyGold: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private seaMap: THREE.Texture | null = null;
  private riverMap: THREE.Texture | null = null;
  private cloudBase: { x: number; sp: number }[] = [];
  private birds: THREE.Sprite[] = [];
  private birdBase: { x: number; y: number; sp: number }[] = [];
  private palms: { g: THREE.Group; ph: number }[] = [];
  private trees: { g: THREE.Group; ph: number }[] = [];
  private flags: { m: THREE.Mesh; ph: number }[] = [];
  private boats: { g: THREE.Group; ph: number }[] = [];
  private foamA!: THREE.Mesh; private foamB!: THREE.Mesh;
  private tabuikMain: THREE.Group; private pangkekMain: THREE.Group;
  private tabuikB: THREE.Group;
  private tuftMesh: THREE.InstancedMesh | null = null;
  private tuftData: { x: number; z: number; s: number; yaw: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(_kit: Kit) {
    const R = this.root;
    const r = rng(2468);
    // ---- light rig: sun key (shadow caster) + hemisphere fill + rim ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a9a6a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.rim = new THREE.DirectionalLight("#cfe4ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    // ---- sky domes (day + golden, toggled per shot light) ----
    this.skyDay = new THREE.Mesh(new THREE.SphereGeometry(680, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexDay(), side: THREE.BackSide, fog: false }));
    this.skyDay.layers.set(NOINK); R.add(this.skyDay);
    this.skyGold = new THREE.Mesh(new THREE.SphereGeometry(675, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTexGold(), side: THREE.BackSide, fog: false }));
    this.skyGold.layers.set(NOINK); this.skyGold.visible = false; R.add(this.skyGold);
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
      this.cloudBase.push({ x, sp: 1.1 + (i % 4) * 0.45 });
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.position.set(-52, 88, -300); glow.scale.set(120, 120, 1); glow.layers.set(NOINK); R.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    core.position.set(-52, 88, -300); core.scale.set(34, 34, 1); core.layers.set(NOINK); R.add(core);
    for (const [x, y, z, w] of [[-84, 100, -305, 30], [96, 108, -335, 24]] as [number, number, number, number][]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.65 }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.36, 1); sp.layers.set(NOINK); R.add(sp);
      this.birds.push(sp); this.birdBase.push({ x, y, sp: 4.5 + w * 0.06 });
    }
    this.buildTown(R, r);
    // ---- the two tabuik + the one under construction ----
    const mt = makeTabuik(0, this.flags);
    this.tabuikMain = mt.group; this.pangkekMain = mt.pangkek;
    R.add(this.tabuikMain);
    const bt = makeTabuik(1, this.flags);
    this.tabuikB = bt.group;
    this.tabuikB.position.set(TABUIK_B[0], 0, TABUIK_B[2]);
    this.tabuikB.rotation.y = 0.15;
    this.tabuikB.scale.setScalar(0.97);
    R.add(this.tabuikB);
    blob(R, TABUIK_B[0], 0.02, TABUIK_B[2], 6.5, 7.5, 0.3);
  }

  // ---------------- the town: street, river, beach, sea ----------------
  private buildTown(R: THREE.Group, r: () => number) {
    // base land under everything
    const land = new THREE.Mesh(new THREE.CircleGeometry(420, 36), lam2({ map: rep(grassRichTex(), 150, 150) }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.14, -40); land.receiveShadow = true; R.add(land);
    // the packed-sand procession street, in two runs (river between)
    const streetM = lam2({ map: rep(sandStreetTex(), 2, 12) });
    const streetN = new THREE.Mesh(new THREE.PlaneGeometry(10, 62), streetM);
    streetN.rotation.x = -Math.PI / 2; streetN.position.set(0, 0, 1); streetN.receiveShadow = true; R.add(streetN);
    const streetS = new THREE.Mesh(new THREE.PlaneGeometry(10, 21), lam2({ map: rep(sandStreetTex(), 2, 4) }));
    streetS.rotation.x = -Math.PI / 2; streetS.position.set(0, 0, -45.5); streetS.receiveShadow = true; R.add(streetS);
    // beach sand, wide open coast
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(170, 19), lam2({ map: rep(beachTex(), 26, 3) }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, -0.03, -64); beach.receiveShadow = true; R.add(beach);
    // the sea (map kept: update() scrolls it — the water MOVES)
    const seaMap = rep(water(), 42, 20);
    this.seaMap = seaMap;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(430, 200), lam2({ map: seaMap, color: "#6fb6d8" }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.06, -172); sea.receiveShadow = true; R.add(sea);
    // foam lines breathing on the shoreline
    const foamM = (op: number) => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: op, depthWrite: false });
    this.foamA = new THREE.Mesh(new THREE.PlaneGeometry(170, 1.5), foamM(0.5));
    this.foamA.rotation.x = -Math.PI / 2; this.foamA.position.set(0, -0.02, -72.6); this.foamA.renderOrder = 1; R.add(this.foamA);
    this.foamB = new THREE.Mesh(new THREE.PlaneGeometry(170, 1.1), foamM(0.3));
    this.foamB.rotation.x = -Math.PI / 2; this.foamB.position.set(0, -0.02, -75.6); this.foamB.renderOrder = 1; R.add(this.foamB);
    // the river crossing the street (flows along X)
    const riverMap = rep(water(), 24, 1);
    this.riverMap = riverMap;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(170, 5.6), lam2({ map: riverMap, color: "#63a8cc" }));
    river.rotation.x = -Math.PI / 2; river.position.set(0, -0.08, RIVER_Z); river.receiveShadow = true; R.add(river);
    const bankM = lam2({ color: "#9a958c", map: rep(planks(), 8, 1) });
    for (const s of [1, -1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(170, 0.6, 1.0), bankM);
      bank.position.set(0, -0.28, RIVER_Z + s * 3.25); R.add(bank);
    }
    // the low bridge carrying the street over the river
    const bridge = makeBridge();
    bridge.position.set(0, 0, RIVER_Z);
    R.add(bridge);
    // ---- colourful houses lining the street, fronts to the road ----
    const wallCols = ["#f2e3b8", "#e88a6a", "#8ec9e8", "#f2b8d0", "#a8d8a0", "#e8d06a"];
    const wallMats = wallCols.map((c, i) => lam2({ map: rep(plasterTex(`tabuikPlaster${i}`, c), 2, 1) }));
    const roofMats = [
      lam2({ map: rep(tileTex("tabuikTileA", "#a03a28"), 2, 1) }),
      lam2({ map: rep(tileTex("tabuikTileB", "#7a4a30"), 2, 1) }),
      lam2({ map: rep(tileTex("tabuikTileC", "#8a5030"), 2, 1) }),
    ];
    const greens = ["#4a8a3a", "#5da24a", "#3d7a32"];
    const houseAt = (side: number, z: number, i: number) => {
      const w = 6.2 + (i % 3) * 0.8, d = 5 + (i % 2) * 0.7, wallH = 2.8 + (i % 3) * 0.25, roofH = 2.4 + (i % 2) * 0.5;
      const h = makeHouse(wallMats[i % wallMats.length], roofMats[i % roofMats.length], w, d, wallH, roofH);
      h.position.set(side * 10.4, 0, z);
      h.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      R.add(h);
      blob(R, side * 10.4, 0.015, z, w + 2.2, d + 2.2, 0.28);
    };
    [22, 10, -3, -16, -45, -53].forEach((z, i) => houseAt(1, z, i));
    [18, -20, -52].forEach((z, i) => houseAt(-1, z, i + 2));
    // the surau on the west side, south of the river
    const surau = makeSurau();
    surau.position.set(-12.5, 0, -46); surau.rotation.y = Math.PI / 2;
    R.add(surau);
    blob(R, -12.5, 0.015, -46, 8, 8, 0.28);
    // ---- palms + shade trees ----
    const palmAt = (x: number, z: number, h: number, seed: number) => {
      const p = makePalm(h, seed);
      p.position.set(x, 0, z);
      R.add(p);
      this.palms.push({ g: p, ph: seed * 1.37 });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 10), lam2({ map: rep(soilTex(), 1, 1) }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.012, z); R.add(disc);
    };
    palmAt(6.8, 26, 5.6, 1); palmAt(-6.8, 14, 6.2, 2); palmAt(7.6, -16, 5.2, 3); palmAt(-6.8, -18, 6.4, 4);
    palmAt(6.8, -40, 5.8, 5); palmAt(-6.9, -49, 5.4, 6); palmAt(-8.5, 3, 5.0, 7);
    palmAt(-16, -59, 6.0, 8); palmAt(-9.5, -67, 5.2, 9); palmAt(12, -60, 6.3, 10); palmAt(19, -67, 5.5, 11); palmAt(27, -61, 6.1, 12);
    const treeAt = (x: number, z: number, h: number, seed: number) => {
      const t = makeTree(h, greens, seed);
      t.position.set(x, 0, z);
      R.add(t);
      this.trees.push({ g: t, ph: seed * 1.93 });
    };
    treeAt(14.5, 28, 4.6, 21); treeAt(-14.5, -26, 5.2, 22); treeAt(15, -56, 4.4, 23); treeAt(-15.5, 8, 4.8, 24);
    // distant Bukit Barisan hills closing the coast on both sides
    const hillM = lam2({ color: "#5a7a8a" });
    for (const [hx, hz, hr, hh2] of [[-125, -150, 70, 26], [135, -175, 85, 32], [-150, -60, 60, 20]] as [number, number, number, number][]) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh2, 7), hillM);
      hill.position.set(hx, hh2 / 2 - 1, hz); hill.scale.z = 0.6; R.add(hill);
    }
    // ---- the rumah tabuik workshop yard (west side) ----
    const W = WORKSHOP;
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 10.5), lam2({ map: rep(sandStreetTex(), 2, 2) }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(W[0], 0.006, W[2]); yard.receiveShadow = true; R.add(yard);
    // bamboo fence around the yard, opening toward the street
    const fenceM = lam2({ color: "#a8874f", map: rep(planks(), 2, 1) });
    const fenceRun = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.8));
      for (let i = 0; i <= n; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.15, 6), fenceM);
        post.position.set(x0 + (x1 - x0) * (i / n), 0.57, z0 + (z1 - z0) * (i / n)); R.add(post);
      }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), fenceM);
      rail.position.set((x0 + x1) / 2, 0.92, (z0 + z1) / 2);
      rail.rotation.z = Math.PI / 2; rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0); R.add(rail);
    };
    fenceRun(W[0] - 5.5, W[2] - 5, W[0] + 5.5, W[2] - 5);
    fenceRun(W[0] - 5.5, W[2] + 5, W[0] + 5.5, W[2] + 5);
    fenceRun(W[0] - 5.5, W[2] - 5, W[0] - 5.5, W[2] + 5);
    fenceRun(W[0] + 5.5, W[2] - 5, W[0] + 5.5, W[2] - 1.5);
    fenceRun(W[0] + 5.5, W[2] + 1.5, W[0] + 5.5, W[2] + 5);
    // the workshop tabuik: Buraq on its base, pangkek on the ground beside it
    const wk = makeTabuik(0, this.flags);
    wk.group.position.set(W[0], 0, W[2]);
    wk.group.rotation.y = 2.65;
    wk.pangkek.position.set(4.1, 0, 1.0);
    R.add(wk.group);
    blob(R, W[0], 0.012, W[2], 6, 7, 0.3);
    // a stack of spare bamboo poles + crates of ornaments
    const bambooM = lam2({ color: "#c9a86a", map: rep(planks(), 3, 1) });
    for (let i = 0; i < 5; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.4, 7), bambooM);
      pole.rotation.z = Math.PI / 2;
      pole.position.set(W[0] - 2.6, 0.1 + Math.floor(i / 3) * 0.13, W[2] + 4.1 + (i % 3) * 0.14);
      R.add(pole);
    }
    const crateM = lam2({ color: "#c99058", map: rep(planks(), 1, 1) });
    for (const [cx, cz] of [[W[0] + 3.4, W[2] - 3.4], [W[0] + 4.1, W[2] - 3.2]] as [number, number][]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.85), crateM);
      crate.position.set(cx, 0.3, cz); crate.rotation.y = cx; crate.castShadow = true; R.add(crate);
    }
    // ---- banner poles with waving flags: yard corners + along the street ----
    const poleAt = (x: number, z: number, col: string, ph: number) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 4.3, 7), fenceM);
      pole.position.set(x, 2.15, z); pole.castShadow = true; R.add(pole);
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62),
        new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      fm.position.set(x + 0.5, 4.0, z); R.add(fm);
      this.flags.push({ m: fm, ph });
    };
    poleAt(W[0] - 5.2, W[2] - 4.7, "#d8402e", 0.4); poleAt(W[0] + 5.2, W[2] + 4.7, "#f6c63c", 1.8);
    poleAt(5.4, 20, "#2e7ad8", 2.6); poleAt(-5.4, 6, "#3aa655", 3.4); poleAt(5.4, -12, "#f06423", 4.2);
    poleAt(-5.4, -22, "#d8402e", 5.0); poleAt(5.4, -44, "#f6c63c", 5.8);
    // ---- fishing boats out at sea ----
    const boat1 = makeBoat("#a03a30"); boat1.position.set(-24, -0.05, -105); boat1.rotation.y = 0.4; R.add(boat1);
    this.boats.push({ g: boat1, ph: 1.2 });
    const boat2 = makeBoat("#20508a"); boat2.position.set(28, -0.05, -125); boat2.rotation.y = -0.3; R.add(boat2);
    this.boats.push({ g: boat2, ph: 3.9 });
    // ---- grass tufts: ragged edges along street, yards, beach ----
    const tuftPts: { x: number; z: number; s: number }[] = [];
    for (const s of [1, -1]) for (let z = 30; z > -55; z -= 0.55 + r() * 0.6) {
      if (r() < 0.85) tuftPts.push({ x: s * (5.5 + r() * 0.6), z: z + (r() - 0.5), s: 0.85 + r() * 0.8 });
      if (r() < 0.3) tuftPts.push({ x: s * (6.6 + r() * 0.8), z: z - 0.4, s: 0.7 + r() * 0.7 });
    }
    for (let i = 0; i < 260; i++) {
      const s = r() < 0.5 ? 1 : -1;
      tuftPts.push({ x: s * (8 + r() * 22), z: -57 - r() * 13, s: 0.6 + r() * 0.7 });
    }
    const tufts = new THREE.InstancedMesh(grassTuftGeo(), lam2({ vertexColors: true, side: THREE.DoubleSide }), tuftPts.length);
    const dummy = new THREE.Object3D(); const tint = new THREE.Color();
    tuftPts.forEach((p, i) => {
      const yaw = r() * Math.PI * 2;
      dummy.position.set(p.x, 0.02, p.z); dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.s); dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.86 + (r() - 0.5) * 0.24);
      tufts.setColorAt(i, tint);
      this.tuftData.push({ x: p.x, z: p.z, s: p.s, yaw });
    });
    tufts.receiveShadow = true; tufts.frustumCulled = false; R.add(tufts);
    this.tuftMesh = tufts;
    // warm sun pools + cool shade pools layering the ground
    for (let i = 0; i < 8; i++) {
      const s = r() < 0.5 ? 1 : -1;
      softPatch(R, patchTex(), "#e8f4a4", s * (6.5 + r() * 7), 0.014, 16 - r() * 66, 4.5 + r() * 5, 6 + r() * 7, 0.15 + r() * 0.1, r() * 3);
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
    const golden = s.light === "golden";
    this.skyDay.visible = !golden;
    this.skyGold.visible = golden;
    for (const c2 of this.clouds) {
      c2.visible = true;
      (c2.material as THREE.SpriteMaterial).color.set(golden ? "#ffc9a0" : "#ffffff");
    }
    // ---------------- pose the tabuik ----------------
    const tp = tabuikAt(id, tt);
    const inSea = id >= 9;
    const rock = Math.sin(tt * 2.7) * 0.05 * tp.sway;
    const bobY = Math.abs(Math.sin(tt * 2.7)) * 0.13 * tp.sway;
    this.tabuikMain.position.set(tp.x, inSea ? -0.35 - tp.sink : tp.y + bobY, tp.z);
    this.tabuikMain.rotation.set(Math.cos(tt * 2.2) * 0.03 * tp.sway - tp.tilt * 0.95, tp.yaw, rock);
    this.pangkekMain.position.y = 3.95 + tp.lift;
    // tabuik B waits across the river, breathing gently
    this.tabuikB.rotation.z = Math.sin(tt * 1.7) * 0.014;
    this.tabuikB.rotation.x = Math.cos(tt * 1.3) * 0.01;
    // ---- STANDAR GERAK: everything that should move, moves ----
    if (this.seaMap) this.seaMap.offset.set(0, tt * 0.018);
    if (this.riverMap) this.riverMap.offset.set(tt * 0.045, 0);
    this.foamA.position.z = -72.6 + Math.sin(tt * 0.75) * 0.55;
    this.foamB.position.z = -75.6 + Math.sin(tt * 0.75 + 1.4) * 0.7;
    this.clouds.forEach((c2, i) => { const b = this.cloudBase[i]; if (b) c2.position.x = b.x + tt * b.sp; });
    this.birds.forEach((b2, i) => { const bb = this.birdBase[i]; if (bb) { b2.position.x = bb.x + tt * bb.sp; b2.position.y = bb.y + Math.sin(tt * 2.1 + i * 2.3) * 0.9; } });
    for (const pl of this.palms) {
      pl.g.rotation.z = Math.sin(tt * 1.1 + pl.ph) * 0.014;
      pl.g.rotation.x = Math.cos(tt * 0.8 + pl.ph * 1.7) * 0.01;
    }
    for (const tr2 of this.trees) {
      tr2.g.rotation.z = Math.sin(tt * 1.15 + tr2.ph) * 0.012;
      tr2.g.rotation.x = Math.cos(tt * 0.85 + tr2.ph * 1.7) * 0.009;
    }
    for (const fl of this.flags) fl.m.rotation.y = Math.sin(tt * 3.2 + fl.ph) * 0.42;
    for (const bt of this.boats) {
      bt.g.position.y = -0.05 + Math.sin(tt * 1.15 + bt.ph) * 0.06;
      bt.g.rotation.z = Math.sin(tt * 0.8 + bt.ph) * 0.03;
    }
    if (this.tuftMesh) {
      const d = this.dummy, tm = this.tuftMesh;
      this.tuftData.forEach((p, i) => {
        const ph = p.x * 0.45 + p.z * 0.3;
        d.position.set(p.x, 0.02, p.z);
        d.rotation.set(Math.sin(tt * 1.7 + ph) * 0.085, p.yaw, Math.cos(tt * 1.35 + ph) * 0.085);
        d.scale.setScalar(p.s); d.updateMatrix();
        tm.setMatrixAt(i, d.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
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
