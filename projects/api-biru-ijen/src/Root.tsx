import React from "react";
import { Composition } from "remotion";
import { IjenShort, IJEN_FRAMES } from "./videos/ijen/Ijen";

export const Root: React.FC = () => (
  <>
    <Composition id="IjenBlueFire" component={IjenShort} durationInFrames={IJEN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
