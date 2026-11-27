import React from "react";
import { Composition } from "remotion";
import { GajahShort, GAJAH_FRAMES } from "./videos/gajah/Gajah";

export const Root: React.FC = () => (
  <>
    <Composition id="GajahFrame" component={GajahShort} durationInFrames={GAJAH_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
