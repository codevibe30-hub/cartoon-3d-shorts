import React from "react";
import { Composition } from "remotion";
import { PesumoShort, PESUMO_FRAMES } from "./videos/pesumo-dilarang-menyetir/Pesumo";

export const Root: React.FC = () => (
  <>
    <Composition id="PesumoFrame" component={PesumoShort} durationInFrames={PESUMO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
