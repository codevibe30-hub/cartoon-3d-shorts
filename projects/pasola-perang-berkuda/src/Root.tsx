import React from "react";
import { Composition } from "remotion";
import { PasolaShort, PASOLA_FRAMES } from "./videos/pasola-perang-berkuda/Pasola";

export const Root: React.FC = () => (
  <>
    <Composition id="PasolaFrame" component={PasolaShort} durationInFrames={PASOLA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
