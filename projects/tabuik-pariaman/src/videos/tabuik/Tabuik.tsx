// "Di Pariaman, Ada Menara Raksasa yang Dibuang ke Laut Tiap
// Tahun": Tabuik Pariaman — a 12-metre ornamental tower built
// every year for Ashura, paraded all day while rocked (hoyak),
// then THROWN into the sea at Gandoriah Beach at sunset.
// Fafnir-ID format. Frame 0 is the clickbait cover: the giant
// tabuik itself, already rocking in its carriers' hands, the
// hero shocked BESIDE it, GIANT claim text. One three.js world
// (world.ts) posed from the story timeline (story.ts); post
// chain as the house style. VISUAL CORE: bright Sumatran
// coastal daylight, sandy street, palms, river, open sea.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, Effect as PPEffect, EffectComposer as PPComposer, EffectPass, Pass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
type Effect = PPEffect;
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";
import { CAPTIONS } from "./captions";

export const TABUIK_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean; msaa?: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("tabuik kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

/** Subtitle font: Nunito (variable, wght 200-1000) at weight 500, 99px, loaded before
 *  the first frame renders. */
const useSubtitleFont = () => {
  const [handle] = useState(() => delayRender("nunito font"));
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; continueRender(handle); } };
    (async () => {
      try {
        const face = new FontFace("Nunito", `url(${staticFile("fonts/Nunito.ttf")})`, { weight: "200 1000" });
        const loaded = await face.load();
        (document.fonts as FontFaceSet & { add: (f: FontFace) => void }).add(loaded);
        await document.fonts.load('500 99px "Nunito"', "Ag");
        await document.fonts.ready;
      } catch { /* fall through: overlay falls back to sans-serif rather than hanging */ }
      finish();
    })();
    const t = setTimeout(finish, 20000);
    return () => clearTimeout(t);
  }, [handle]);
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const lensWorth = useMemo(() => {
    const sh = SHOTS[id - 1];
    let m = 0;
    for (let f = sh.a; f < sh.b; f += 10) m = Math.max(m, dofAt(f).cInf);
    return m > 0.5;
  }, [id]);
  const composer = useMemo(() => {
    const c = new PPComposer(gl, { multisampling: on.msaa ?? 4 });
    c.addPass(new RenderPass(scene, camera));
    if (on.ink) c.addPass(fx.ink as unknown as Pass);
    if (on.lens && lensWorth && on.pre) c.addPass(fx.lens.pre as unknown as Pass);
    if (on.lens && lensWorth) c.addPass(fx.lens.main as unknown as Pass);
    const tail: Effect[] = [];
    if (on.bloom) tail.push(fx.bloom);
    tail.push(fx.tone);
    if (on.grade) tail.push(fx.grade);
    if (on.grain) tail.push(fx.grain);
    c.addPass(new EffectPass(camera, ...tail));
    return c;
  }, [gl, scene, camera, fx, on, lensWorth]);
  useEffect(() => {
    const v = new THREE.Vector2();
    gl.getDrawingBufferSize(v);
    composer.setSize(v.x, v.y);
  }, [composer, gl, size]);
  useFrame(() => { composer.render(); }, 1);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f;
  return <primitive object={world.root} dispose={null} />;
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** Bottom subtitles: ONE line, TWO WORDS per display, karaoke-synced. Nunito 500 99px.
 *  (Empty on this cover frame — the claim card carries the text.) */
const TextOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const cap = CAPTIONS.find((c) => f >= c.from && f < c.to);
  if (!cap) return null;
  const popIn = interpolate(f, [cap.from, cap.from + 3], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", bottom: 124, left: 0, right: 0, display: "flex", justifyContent: "center",
        transform: `scale(${popIn})`,
      }}>
        <div style={{
          maxWidth: "96%", whiteSpace: "nowrap", color: "#ffffff",
          fontFamily: "'Nunito', sans-serif", fontWeight: 500,
          fontSize: 99, lineHeight: 1.15, textAlign: "center", letterSpacing: 0.5,
          textShadow: "0 5px 0 #000, 5px 0 0 #000, -5px 0 0 #000, 0 -5px 0 #000, 3.5px 3.5px 0 #000, -3.5px 3.5px 0 #000, 3.5px -3.5px 0 #000, -3.5px -3.5px 0 #000, 0 19px 38px rgba(0,0,0,0.55)",
        }}>{cap.text}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TabuikShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  useSubtitleFont();
  if (!kit) return null;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#9dc2ec" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <TextOverlay />
    </AbsoluteFill>
  );
};
