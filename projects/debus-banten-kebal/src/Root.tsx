import React from "react";
import { Composition } from "remotion";
import { DebusShort, DEBUS_FRAMES } from "./videos/debus-banten-kebal/Debus";

export const Root: React.FC = () => (
  <>
    <Composition id="DebusFrame" component={DebusShort} durationInFrames={DEBUS_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
