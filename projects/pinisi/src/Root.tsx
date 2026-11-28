import React from "react";
import { Composition } from "remotion";
import { PinisiShort, PINISI_FRAMES } from "./videos/pinisi/Pinisi";

export const Root: React.FC = () => (
  <Composition
    id="PinisiFrame"
    component={PinisiShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={PINISI_FRAMES}
    defaultProps={{}}
  />
);
