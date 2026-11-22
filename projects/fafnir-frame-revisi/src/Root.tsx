import React from "react";
import { Composition } from "remotion";
import { GiethoornShort, GIETHOORN_FRAMES } from "./videos/giethoorn/Giethoorn";

export const Root: React.FC = () => (
  <>
    <Composition id="GiethoornFrame" component={GiethoornShort} durationInFrames={GIETHOORN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
