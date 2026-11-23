import React from "react";
import { Composition } from "remotion";
import { KelimutuShort, KELIMUTU_FRAMES } from "./videos/kelimutu/Kelimutu";

export const Root: React.FC = () => (
  <>
    <Composition id="KelimutuFrame" component={KelimutuShort} durationInFrames={KELIMUTU_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
