import React from "react";
import { Composition } from "remotion";
import { SalarShort, SALAR_FRAMES } from "./videos/salar-cermin-bolivia/Salar";

export const Root: React.FC = () => (
  <>
    <Composition id="SalarFrame" component={SalarShort} durationInFrames={SALAR_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
