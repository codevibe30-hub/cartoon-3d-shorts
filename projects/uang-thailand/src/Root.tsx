import React from "react";
import { Composition } from "remotion";
import { UangShort, UANG_FRAMES } from "./videos/uang/Uang";

export const Root: React.FC = () => (
  <Composition
    id="UangFrame"
    component={UangShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={UANG_FRAMES}
    defaultProps={{}}
  />
);
