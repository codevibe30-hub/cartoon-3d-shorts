import React from "react";
import { Composition } from "remotion";
import { ImlekShort, IMLEK_FRAMES } from "./videos/imlek/Imlek";

export const Root: React.FC = () => (
  <>
    <Composition id="ImlekFrame" component={ImlekShort} durationInFrames={IMLEK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
