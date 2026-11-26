import React from "react";
import { Composition } from "remotion";
import { GadangShort, GADANG_FRAMES } from "./videos/gadang/Gadang";

export const Root: React.FC = () => (
  <>
    <Composition id="GadangFrame" component={GadangShort} durationInFrames={GADANG_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
