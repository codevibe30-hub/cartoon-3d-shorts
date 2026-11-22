import React from "react";
import { Composition } from "remotion";
import { GimliShort, GIMLI_FRAMES } from "./videos/gimli/Gimli";

export const Root: React.FC = () => (
  <>
    <Composition id="GimliGlider" component={GimliShort} durationInFrames={GIMLI_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
