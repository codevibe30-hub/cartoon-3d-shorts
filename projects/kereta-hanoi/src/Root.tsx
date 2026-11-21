import React from "react";
import { Composition } from "remotion";
import { KeretaShort, KERETA_FRAMES } from "./videos/kereta/Kereta";

export const Root: React.FC = () => (
  <>
    <Composition id="KeretaHanoi" component={KeretaShort} durationInFrames={KERETA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
