import React from "react";
import { Composition } from "remotion";
import { GlassShort, GLASS_FRAMES } from "./videos/glass/Glass";

export const Root: React.FC = () => (
  <>
    <Composition id="HughGlass" component={GlassShort} durationInFrames={GLASS_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
