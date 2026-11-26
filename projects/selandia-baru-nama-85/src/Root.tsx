import React from "react";
import { Composition } from "remotion";
import { TaumataShort, TAUMATA_FRAMES } from "./videos/taumata/Taumata";

export const Root: React.FC = () => (
  <>
    <Composition id="TaumataFrame" component={TaumataShort} durationInFrames={TAUMATA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
