import React from "react";
import { Composition } from "remotion";
import { AkarShort, AKAR_FRAMES } from "./videos/akar/Akar";

export const Root: React.FC = () => (
  <>
    <Composition id="AkarFrame" component={AkarShort} durationInFrames={AKAR_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
