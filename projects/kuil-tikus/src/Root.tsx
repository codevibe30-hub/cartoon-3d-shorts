import React from "react";
import { Composition } from "remotion";
import { TikusShort, TIKUS_FRAMES } from "./videos/tikus/Tikus";

export const Root: React.FC = () => (
  <>
    <Composition id="KuilTikus" component={TikusShort} durationInFrames={TIKUS_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
