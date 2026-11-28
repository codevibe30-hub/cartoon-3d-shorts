import React from "react";
import { Composition } from "remotion";
import { LembataShort, LEMBATA_FRAMES } from "./videos/lembata/Lembata";

export const Root: React.FC = () => (
  <>
    <Composition id="LembataFrame" component={LembataShort} durationInFrames={LEMBATA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
