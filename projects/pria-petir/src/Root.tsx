import React from "react";
import { Composition } from "remotion";
import { PetirShort, PETIR_FRAMES } from "./videos/petir/Petir";

export const Root: React.FC = () => (
  <>
    <Composition id="PriaPetir" component={PetirShort} durationInFrames={PETIR_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
