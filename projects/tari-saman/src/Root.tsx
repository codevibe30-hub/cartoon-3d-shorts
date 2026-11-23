import React from "react";
import { Composition } from "remotion";
import { SamanShort, SAMAN_FRAMES } from "./videos/tarisaman/Saman";

export const Root: React.FC = () => (
  <>
    <Composition id="SamanFrame" component={SamanShort} durationInFrames={SAMAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
