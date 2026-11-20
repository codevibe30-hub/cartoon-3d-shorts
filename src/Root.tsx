import React from "react";
import { Composition } from "remotion";
import { EpisodeShort, EPISODE_FRAMES } from "./videos/example/Episode";

export const Root: React.FC = () => (
  <>
    <Composition id="ExampleEpisode" component={EpisodeShort} durationInFrames={EPISODE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
