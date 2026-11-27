import React from "react";
import { Composition } from "remotion";
import { PontianakShort, PONTIANAK_FRAMES } from "./videos/pontianak/Pontianak";

export const Root: React.FC = () => (
  <>
    <Composition id="PontianakFrame" component={PontianakShort} durationInFrames={PONTIANAK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
