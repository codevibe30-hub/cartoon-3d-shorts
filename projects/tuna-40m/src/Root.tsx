import React from "react";
import { Composition } from "remotion";
import { TunaShort, TUNA_FRAMES } from "./videos/tuna/Tuna";

export const Root: React.FC = () => (
  <>
    <Composition id="Tuna40M" component={TunaShort} durationInFrames={TUNA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
