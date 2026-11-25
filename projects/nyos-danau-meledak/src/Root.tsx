import React from "react";
import { Composition } from "remotion";
import { NyosShort, NYOS_FRAMES } from "./videos/nyos-danau-meledak/Nyos";

export const Root: React.FC = () => (
  <>
    <Composition id="NyosFrame" component={NyosShort} durationInFrames={NYOS_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
