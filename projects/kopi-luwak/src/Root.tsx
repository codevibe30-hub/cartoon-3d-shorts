import React from "react";
import { Composition } from "remotion";
import { LuwakShort, LUWAK_FRAMES } from "./videos/luwak/Luwak";

export const Root: React.FC = () => (
  <Composition
    id="LuwakFrame"
    component={LuwakShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={LUWAK_FRAMES}
    defaultProps={{}}
  />
);
