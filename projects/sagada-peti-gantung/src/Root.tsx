import React from "react";
import { Composition } from "remotion";
import { SagadaShort, SAGADA_FRAMES } from "./videos/sagada-peti-gantung/Sagada";

export const Root: React.FC = () => (
  <>
    <Composition id="SagadaFrame" component={SagadaShort} durationInFrames={SAGADA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
