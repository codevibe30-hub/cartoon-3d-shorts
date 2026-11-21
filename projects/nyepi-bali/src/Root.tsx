import React from "react";
import { Composition } from "remotion";
import { NyepiShort, NYEPI_FRAMES } from "./videos/nyepi/Nyepi";

export const Root: React.FC = () => (
  <>
    <Composition id="NyepiBali" component={NyepiShort} durationInFrames={NYEPI_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
