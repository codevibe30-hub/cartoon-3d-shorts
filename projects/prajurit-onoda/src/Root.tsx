import React from "react";
import { Composition } from "remotion";
import { OnodaShort, ONODA_FRAMES } from "./videos/onoda/Onoda";

export const Root: React.FC = () => (
  <>
    <Composition id="PrajuritOnoda" component={OnodaShort} durationInFrames={ONODA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
