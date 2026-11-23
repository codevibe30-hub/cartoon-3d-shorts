import React from "react";
import { Composition } from "remotion";
import { DerinkuyuShort, DERINKUYU_FRAMES } from "./videos/derinkuyu/Derinkuyu";

export const Root: React.FC = () => (
  <>
    <Composition id="DerinkuyuFrame" component={DerinkuyuShort} durationInFrames={DERINKUYU_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
