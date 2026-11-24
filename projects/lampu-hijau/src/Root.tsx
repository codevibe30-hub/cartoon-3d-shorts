import React from "react";
import { Composition } from "remotion";
import { LampuHijauShort, LAMPU_HIJAU_FRAMES } from "./videos/lampu-hijau/LampuHijau";

export const Root: React.FC = () => (
  <>
    <Composition id="LampuHijauFrame" component={LampuHijauShort} durationInFrames={LAMPU_HIJAU_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
