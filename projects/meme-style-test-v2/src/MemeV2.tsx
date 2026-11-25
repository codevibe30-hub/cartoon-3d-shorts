import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/fonts";

// B6 public caption profile (eiffel-v44-portrait-archivo-black-v1), scaled
// uniformly from the 720x1280 reference to 1080x1920 (factor 1.5):
// Archivo Black 47px -> 70px, stroke 4 -> ~6px visual (SVG stroke 11 centered),
// baseline 914 -> 1371, band 864..951, side 44 -> 66, fill #fff, ink #171319.
const fontReady = loadFont({
  family: "Archivo Black",
  url: staticFile("fonts/ArchivoBlack.ttf"),
  format: "truetype",
});

export const BEAT_FRAMES = 75;
export const MEME_V2_FRAMES = BEAT_FRAMES * 10;

type Beat = {
  img: string;
  caption: string;
  overlay?: "gajian" | "tagihan" | "board";
};

const BEATS: Beat[] = [
  { img: "assets/beat01.png", caption: "GAJIAN TURUN!", overlay: "gajian" },
  { img: "assets/beat02.png", caption: "KAYA! (SEBENTAR)" },
  { img: "assets/beat03.png", caption: "FOYA DULU LAH" },
  { img: "assets/beat04.png", caption: "SEKALI-KALI…" },
  { img: "assets/beat05.png", caption: "LAH?", overlay: "tagihan" },
  { img: "assets/beat06.png", caption: "TAGIHAN: GASKEUN" },
  { img: "assets/beat07.png", caption: "MENYUSUT BESTIE", overlay: "board" },
  { img: "assets/beat08.png", caption: "TINGGAL RECEH" },
  { img: "assets/beat09.png", caption: "Rp0." },
  { img: "assets/beat10.png", caption: "BESOK MAKAN APA?" },
];

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <svg
    width={1080}
    height={1920}
    viewBox="0 0 1080 1920"
    style={{ position: "absolute", inset: 0 }}
  >
    <text
      x={540}
      y={1371}
      textAnchor="middle"
      fontFamily="'Archivo Black', sans-serif"
      fontSize={70}
      fill="#ffffff"
      stroke="#171319"
      strokeWidth={11}
      strokeLinejoin="round"
      style={{ paintOrder: "stroke" }}
    >
      {text}
    </text>
  </svg>
);

const NotifCard: React.FC<{
  title: string;
  amount: string;
  accent: string;
  badge: string;
}> = ({ title, amount, accent, badge }) => (
  <div
    style={{
      position: "absolute",
      top: 168,
      right: 54,
      transform: "rotate(-2deg)",
      background: "#ffffff",
      border: "5px solid #171319",
      borderRadius: 30,
      padding: "24px 34px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      boxShadow: "0 18px 44px rgba(23,19,25,0.35)",
      fontFamily: "'Archivo Black', sans-serif",
    }}
  >
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: "50%",
        background: accent,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 40,
        flexShrink: 0,
      }}
    >
      {badge}
    </div>
    <div>
      <div style={{ fontSize: 39, color: "#171319", letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ fontSize: 47, color: accent, marginTop: 6 }}>{amount}</div>
    </div>
  </div>
);

// Beat 7: the painted scene already contains a big blank whiteboard on an
// easel at frame-left (x ~0..335, y ~518..1304 in comp coords). The balance
// numbers are written onto that board, marker-style.
const BoardWriting: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 22,
      top: 600,
      width: 292,
      transform: "rotate(-1.5deg)",
      textAlign: "center",
      fontFamily: "'Archivo Black', sans-serif",
      color: "#263238",
    }}
  >
    <div
      style={{
        fontSize: 35,
        opacity: 0.72,
        textDecoration: "line-through",
        textDecorationThickness: 5,
      }}
    >
      Rp3.000.000
    </div>
    <div style={{ fontSize: 30, margin: "10px 0 2px" }}>▼</div>
    <div style={{ fontSize: 43, color: "#c62828" }}>Rp214.000</div>
    <div style={{ fontSize: 23, color: "#c62828", marginTop: 10 }}>
      −93% DALAM SEHARI
    </div>
  </div>
);

const BeatScene: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, BEAT_FRAMES - 1], [1.0, 1.05]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#171319", overflow: "hidden" }}>
      <Img
        src={staticFile(beat.img)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      {beat.overlay === "gajian" && (
        <NotifCard
          title="GAJIAN MASUK"
          amount="+Rp3.000.000"
          accent="#1d9e4b"
          badge="Rp"
        />
      )}
      {beat.overlay === "tagihan" && (
        <NotifCard
          title="TAGIHAN LISTRIK"
          amount="−Rp412.000"
          accent="#d32f2f"
          badge="!"
        />
      )}
      {beat.overlay === "board" && <BoardWriting />}
      <Caption text={beat.caption} />
    </AbsoluteFill>
  );
};

export const MemeV2Short: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Archivo Black"));
  useEffect(() => {
    fontReady
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill>
      {BEATS.map((beat, i) => (
        <Sequence
          key={beat.img}
          from={i * BEAT_FRAMES}
          durationInFrames={BEAT_FRAMES}
        >
          <BeatScene beat={beat} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
