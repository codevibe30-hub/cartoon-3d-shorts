import React from "react";
import { Composition } from "remotion";
import { GaokaoShort, GAOKAO_FRAMES } from "./videos/gaokao/Gaokao";

export const Root: React.FC = () => (
  <>
    <Composition id="GaokaoFrame" component={GaokaoShort} durationInFrames={GAOKAO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
