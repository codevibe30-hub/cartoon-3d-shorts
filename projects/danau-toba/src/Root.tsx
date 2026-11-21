import React from "react";
import { Composition } from "remotion";
import { TobaShort, TOBA_FRAMES } from "./videos/toba/Toba";

export const Root: React.FC = () => (
  <>
    <Composition id="DanauToba" component={TobaShort} durationInFrames={TOBA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
