import React from "react";
import { Composition } from "remotion";
import { JembatanEshimaShort, ESHIMA_FRAMES } from "./videos/jembatan-eshima/JembatanEshima";

export const Root: React.FC = () => (
  <>
    <Composition id="JembatanEshimaFrame" component={JembatanEshimaShort} durationInFrames={ESHIMA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
