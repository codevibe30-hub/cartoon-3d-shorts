import React from "react";
import { Composition } from "remotion";
import { DapurShort, DAPUR_FRAMES } from "./videos/dapur/Dapur";

export const Root: React.FC = () => (
  <>
    <Composition id="DapurIndia" component={DapurShort} durationInFrames={DAPUR_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
