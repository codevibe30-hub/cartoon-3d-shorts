import React from "react";
import { Composition } from "remotion";
import { BaobabShort, BAOBAB_FRAMES } from "./videos/baobab/Baobab";

export const Root: React.FC = () => (
  <>
    <Composition id="BaobabFrame" component={BaobabShort} durationInFrames={BAOBAB_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
