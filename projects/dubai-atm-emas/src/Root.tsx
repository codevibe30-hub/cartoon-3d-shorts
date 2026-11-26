import React from "react";
import { Composition } from "remotion";
import { DubaiShort, DUBAI_FRAMES } from "./videos/dubai/Dubai";

export const Root: React.FC = () => (
  <>
    <Composition id="DubaiFrame" component={DubaiShort} durationInFrames={DUBAI_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
