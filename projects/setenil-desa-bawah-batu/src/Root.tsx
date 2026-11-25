import React from "react";
import { Composition } from "remotion";
import { SetenilShort, SETENIL_FRAMES } from "./videos/setenil-desa-bawah-batu/Setenil";

export const Root: React.FC = () => (
  <>
    <Composition id="SetenilFrame" component={SetenilShort} durationInFrames={SETENIL_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
