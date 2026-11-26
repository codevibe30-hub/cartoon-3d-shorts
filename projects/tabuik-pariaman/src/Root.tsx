import React from "react";
import { Composition } from "remotion";
import { TabuikShort, TABUIK_FRAMES } from "./videos/tabuik/Tabuik";

export const Root: React.FC = () => (
  <>
    <Composition id="TabuikFrame" component={TabuikShort} durationInFrames={TABUIK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
