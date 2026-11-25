import React from "react";
import { Composition } from "remotion";
import { BonoShort, BONO_FRAMES } from "./videos/bono-ombak-sungai/Bono";

export const Root: React.FC = () => (
  <>
    <Composition id="BonoFrame" component={BonoShort} durationInFrames={BONO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
