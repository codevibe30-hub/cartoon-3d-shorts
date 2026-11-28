import React from "react";
import { Composition } from "remotion";
import { TaiwanShort, TAIWAN_FRAMES } from "./videos/taiwan/Taiwan";

export const Root: React.FC = () => (
  <Composition
    id="TaiwanFrame"
    component={TaiwanShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={TAIWAN_FRAMES}
    defaultProps={{}}
  />
);
