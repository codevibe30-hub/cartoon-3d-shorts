import React from "react";
import { Composition } from "remotion";
import { EtalaseShort, ETALASE_FRAMES } from "./videos/etalase/Etalase";

export const Root: React.FC = () => (
  <>
    <Composition id="EtalaseFrame" component={EtalaseShort} durationInFrames={ETALASE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
