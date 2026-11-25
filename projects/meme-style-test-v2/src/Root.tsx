import React from "react";
import { Composition } from "remotion";
import { MemeV2Short, MEME_V2_FRAMES } from "./MemeV2";

export const Root: React.FC = () => (
  <>
    <Composition
      id="MemeV2Frame"
      component={MemeV2Short}
      durationInFrames={MEME_V2_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
