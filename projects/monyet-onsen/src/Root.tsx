import React from "react";
import { Composition } from "remotion";
import { MonyetOnsenShort, MONYET_ONSEN_FRAMES } from "./videos/monyet-onsen/MonyetOnsen";

export const Root: React.FC = () => (
  <>
    <Composition id="MonyetOnsenFrame" component={MonyetOnsenShort} durationInFrames={MONYET_ONSEN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
