import React from "react";
import { Composition } from "remotion";
import { PulauRunShort, PULAU_RUN_FRAMES } from "./videos/pulau-run/PulauRun";

export const Root: React.FC = () => (
  <>
    <Composition id="PulauRunFrame" component={PulauRunShort} durationInFrames={PULAU_RUN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
