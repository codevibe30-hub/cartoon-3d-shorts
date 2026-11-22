import React from "react";
import { Composition } from "remotion";
import { YamaguchiShort, YAMAGUCHI_FRAMES } from "./videos/yamaguchi/Yamaguchi";

export const Root: React.FC = () => (
  <>
    <Composition id="PriaYamaguchi" component={YamaguchiShort} durationInFrames={YAMAGUCHI_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
