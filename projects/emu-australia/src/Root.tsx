import React from "react";
import { Composition } from "remotion";
import { EmuAustraliaShort, EMU_AUSTRALIA_FRAMES } from "./videos/emu-australia/EmuAustralia";

export const Root: React.FC = () => (
  <>
    <Composition id="EmuAustraliaFrame" component={EmuAustraliaShort} durationInFrames={EMU_AUSTRALIA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
