import React from "react";
import { Composition } from "remotion";
import { KomodoShort, KOMODO_FRAMES } from "./videos/komodo/Komodo";

export const Root: React.FC = () => (
  <>
    <Composition id="KomodoFrame" component={KomodoShort} durationInFrames={KOMODO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
