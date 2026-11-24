import React from "react";
import { Composition } from "remotion";
import { TrunyanShort, TRUNYAN_FRAMES } from "./videos/trunyan-jenazah-pohon/Trunyan";

export const Root: React.FC = () => (
  <>
    <Composition id="TrunyanFrame" component={TrunyanShort} durationInFrames={TRUNYAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
