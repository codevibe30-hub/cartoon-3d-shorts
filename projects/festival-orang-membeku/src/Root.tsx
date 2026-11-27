import React from "react";
import { Composition } from "remotion";
import { FrozenShort, FROZEN_FRAMES } from "./videos/frozen/Frozen";

export const Root: React.FC = () => (
  <>
    <Composition id="FrozenFrame" component={FrozenShort} durationInFrames={FROZEN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
