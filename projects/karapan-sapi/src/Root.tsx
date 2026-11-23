import React from "react";
import { Composition } from "remotion";
import { KarapanShort, KARAPAN_FRAMES } from "./videos/karapan/Karapan";

export const Root: React.FC = () => (
  <>
    <Composition id="KarapanSapi" component={KarapanShort} durationInFrames={KARAPAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
