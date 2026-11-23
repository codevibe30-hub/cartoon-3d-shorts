import React from "react";
import { Composition } from "remotion";
import { TamboraShort, TAMBORA_FRAMES } from "./videos/tambora/Tambora";

export const Root: React.FC = () => (
  <>
    <Composition id="TamboraFrame" component={TamboraShort} durationInFrames={TAMBORA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
