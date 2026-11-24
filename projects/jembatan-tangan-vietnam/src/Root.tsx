import React from "react";
import { Composition } from "remotion";
import { JembatanTanganShort, TANGAN_FRAMES } from "./videos/jembatan-tangan/JembatanTangan";

export const Root: React.FC = () => (
  <>
    <Composition id="JembatanTanganFrame" component={JembatanTanganShort} durationInFrames={TANGAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
