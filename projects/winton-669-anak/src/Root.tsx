import React from "react";
import { Composition } from "remotion";
import { WintonShort, WINTON_FRAMES } from "./videos/winton/Winton";

export const Root: React.FC = () => (
  <>
    <Composition id="Winton" component={WintonShort} durationInFrames={WINTON_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
