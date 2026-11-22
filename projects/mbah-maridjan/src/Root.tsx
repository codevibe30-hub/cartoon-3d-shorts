import React from "react";
import { Composition } from "remotion";
import { MaridjanShort, MARIDJAN_FRAMES } from "./videos/maridjan/Maridjan";

export const Root: React.FC = () => (
  <>
    <Composition id="Maridjan" component={MaridjanShort} durationInFrames={MARIDJAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
