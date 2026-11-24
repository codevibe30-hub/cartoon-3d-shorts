import React from "react";
import { Composition } from "remotion";
import { OkinoshimaShort, OKINOSHIMA_FRAMES } from "./videos/okinoshima/Okinoshima";

export const Root: React.FC = () => (
  <>
    <Composition id="OkinoshimaFrame" component={OkinoshimaShort} durationInFrames={OKINOSHIMA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
