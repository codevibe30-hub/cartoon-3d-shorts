import React from "react";
import { Composition } from "remotion";
import { SantaShort, SANTA_FRAMES } from "./videos/santa/Santa";

export const Root: React.FC = () => (
  <Composition
    id="SantaFrame"
    component={SantaShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={SANTA_FRAMES}
    defaultProps={{}}
  />
);
