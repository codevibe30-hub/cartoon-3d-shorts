import React from "react";
import { Composition } from "remotion";
import { DiengShort, DIENG_FRAMES } from "./videos/dieng/Dieng";

export const Root: React.FC = () => (
  <>
    <Composition id="DiengFrame" component={DiengShort} durationInFrames={DIENG_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
