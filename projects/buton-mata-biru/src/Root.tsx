import React from "react";
import { Composition } from "remotion";
import { ButonShort, BUTON_FRAMES } from "./videos/buton/Buton";

export const Root: React.FC = () => (
  <>
    <Composition id="ButonFrame" component={ButonShort} durationInFrames={BUTON_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
