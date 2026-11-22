import React from "react";
import { Composition } from "remotion";
import { JessopShort, JESSOP_FRAMES } from "./videos/jessop/Jessop";

export const Root: React.FC = () => (
  <>
    <Composition id="Jessop" component={JessopShort} durationInFrames={JESSOP_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
