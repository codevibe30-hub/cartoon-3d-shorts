import React from "react";
import { Composition } from "remotion";
import { IslandiaShort, ISLANDIA_FRAMES } from "./videos/islandia/Islandia";

export const Root: React.FC = () => (
  <>
    <Composition id="IslandiaFrame" component={IslandiaShort} durationInFrames={ISLANDIA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
