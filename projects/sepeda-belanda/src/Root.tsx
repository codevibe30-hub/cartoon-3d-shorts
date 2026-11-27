import React from "react";
import { Composition } from "remotion";
import { BelandaShort, BELANDA_FRAMES } from "./videos/belanda/Belanda";

export const Root: React.FC = () => (
  <>
    <Composition id="BelandaFrame" component={BelandaShort} durationInFrames={BELANDA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
