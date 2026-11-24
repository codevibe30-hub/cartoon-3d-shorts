import React from "react";
import { Composition } from "remotion";
import { UnicornShort, UNICORN_FRAMES } from "./videos/unicorn/Unicorn";

export const Root: React.FC = () => (
  <>
    <Composition id="UnicornFrame" component={UnicornShort} durationInFrames={UNICORN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
