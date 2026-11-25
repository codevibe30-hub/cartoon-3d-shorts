import React from "react";
import { Composition } from "remotion";
import { AyunanShort, AYUNAN_FRAMES } from "./videos/ayunan-jurang-ekuador/Ayunan";

export const Root: React.FC = () => (
  <>
    <Composition id="AyunanFrame" component={AyunanShort} durationInFrames={AYUNAN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
