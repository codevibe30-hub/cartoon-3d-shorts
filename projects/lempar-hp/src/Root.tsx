import React from "react";
import { Composition } from "remotion";
import { LemparHpShort, LEMPARHP_FRAMES } from "./videos/lemparhp/LemparHp";

export const Root: React.FC = () => (
  <Composition
    id="LemparHpFrame"
    component={LemparHpShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={LEMPARHP_FRAMES}
    defaultProps={{}}
  />
);
