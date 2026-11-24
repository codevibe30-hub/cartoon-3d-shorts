import React from "react";
import { Composition } from "remotion";
import { TorajaShort, TORAJA_FRAMES } from "./videos/toraja/Toraja";

export const Root: React.FC = () => (
  <>
    <Composition id="TorajaFrame" component={TorajaShort} durationInFrames={TORAJA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
