import React from "react";
import { Composition } from "remotion";
import { KakabanShort, KAKABAN_FRAMES } from "./videos/kakaban/Kakaban";

export const Root: React.FC = () => (
  <>
    <Composition id="Kakaban" component={KakabanShort} durationInFrames={KAKABAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
