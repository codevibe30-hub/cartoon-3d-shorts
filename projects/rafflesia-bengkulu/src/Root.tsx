import React from "react";
import { Composition } from "remotion";
import { RafflesiaBengkuluShort, RAFFLESIA_FRAMES } from "./videos/rafflesia-bengkulu/RafflesiaBengkulu";

export const Root: React.FC = () => (
  <>
    <Composition id="RafflesiaBengkuluFrame" component={RafflesiaBengkuluShort} durationInFrames={RAFFLESIA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
