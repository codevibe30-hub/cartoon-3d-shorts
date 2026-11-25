import React from "react";
import { Composition } from "remotion";
import { SedlecShort, SEDLEC_FRAMES } from "./videos/sedlec-gereja-tulang/Sedlec";

export const Root: React.FC = () => (
  <>
    <Composition id="SedlecFrame" component={SedlecShort} durationInFrames={SEDLEC_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
