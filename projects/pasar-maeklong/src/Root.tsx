import React from "react";
import { Composition } from "remotion";
import { MaeklongShort, MAEKLONG_FRAMES } from "./videos/maeklong/Maeklong";

export const Root: React.FC = () => (
  <>
    <Composition id="MaeklongFrame" component={MaeklongShort} durationInFrames={MAEKLONG_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
