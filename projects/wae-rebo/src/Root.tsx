import React from "react";
import { Composition } from "remotion";
import { WaeReboShort, WAE_REBO_FRAMES } from "./videos/wae-rebo/WaeRebo";

export const Root: React.FC = () => (
  <>
    <Composition id="WaeReboFrame" component={WaeReboShort} durationInFrames={WAE_REBO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
