import React from "react";
import { Composition } from "remotion";
import { KoreaShort, KOREA_FRAMES } from "./videos/korea/Korea";

export const Root: React.FC = () => (
  <>
    <Composition id="KoreaFrame" component={KoreaShort} durationInFrames={KOREA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
