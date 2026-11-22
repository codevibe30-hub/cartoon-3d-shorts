import React from "react";
import { Composition } from "remotion";
import { GageShort, GAGE_FRAMES } from "./videos/gage/Gage";

export const Root: React.FC = () => (
  <>
    <Composition id="Gage" component={GageShort} durationInFrames={GAGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
