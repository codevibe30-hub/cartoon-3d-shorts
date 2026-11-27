import React from "react";
import { Composition } from "remotion";
import { VatikanShort, VATIKAN_FRAMES } from "./videos/vatikan/Vatikan";

export const Root: React.FC = () => (
  <>
    <Composition id="VatikanFrame" component={VatikanShort} durationInFrames={VATIKAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
