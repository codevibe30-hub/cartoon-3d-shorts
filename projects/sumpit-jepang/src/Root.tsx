import React from "react";
import { Composition } from "remotion";
import { SumpitShort, SUMPIT_FRAMES } from "./videos/sumpit/Sumpit";

export const Root: React.FC = () => (
  <Composition
    id="SumpitFrame"
    component={SumpitShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={SUMPIT_FRAMES}
    defaultProps={{}}
  />
);
