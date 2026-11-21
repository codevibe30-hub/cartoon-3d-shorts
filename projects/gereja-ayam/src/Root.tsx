import React from "react";
import { Composition } from "remotion";
import { AyamShort, AYAM_FRAMES } from "./videos/ayam/Ayam";

export const Root: React.FC = () => (
  <>
    <Composition id="GerejaAyam" component={AyamShort} durationInFrames={AYAM_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
