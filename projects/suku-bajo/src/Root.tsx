import React from "react";
import { Composition } from "remotion";
import { BajoShort, BAJO_FRAMES } from "./videos/bajo/Bajo";

export const Root: React.FC = () => (
  <>
    <Composition id="BajoFrame" component={BajoShort} durationInFrames={BAJO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
