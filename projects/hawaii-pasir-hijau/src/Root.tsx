import React from "react";
import { Composition } from "remotion";
import { HawaiiShort, HAWAII_FRAMES } from "./videos/hawaii/Hawaii";

export const Root: React.FC = () => (
  <>
    <Composition id="HawaiiFrame" component={HawaiiShort} durationInFrames={HAWAII_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
