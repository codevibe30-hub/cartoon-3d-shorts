import React from "react";
import { Composition } from "remotion";
import { UlarShort, ULAR_FRAMES } from "./videos/ular/Ular";

export const Root: React.FC = () => (
  <>
    <Composition id="PulauUlar" component={UlarShort} durationInFrames={ULAR_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
