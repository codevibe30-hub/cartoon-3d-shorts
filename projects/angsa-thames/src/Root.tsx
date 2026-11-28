import React from "react";
import { Composition } from "remotion";
import { AngsaThamesShort, ANGSATHAMES_FRAMES } from "./videos/angsa/AngsaThames";

export const Root: React.FC = () => (
  <Composition
    id="AngsaThamesFrame"
    component={AngsaThamesShort}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={ANGSATHAMES_FRAMES}
    defaultProps={{}}
  />
);
