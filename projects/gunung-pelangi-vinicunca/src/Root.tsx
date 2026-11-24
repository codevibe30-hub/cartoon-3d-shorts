import React from "react";
import { Composition } from "remotion";
import { VinicuncaShort, VINICUNCA_FRAMES } from "./videos/vinicunca/Vinicunca";

export const Root: React.FC = () => (
  <>
    <Composition id="VinicuncaFrame" component={VinicuncaShort} durationInFrames={VINICUNCA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
