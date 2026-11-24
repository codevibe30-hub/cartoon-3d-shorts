import React from "react";
import { Composition } from "remotion";
import { GreenBankShort, GREENBANK_FRAMES } from "./videos/greenbank/GreenBank";

export const Root: React.FC = () => (
  <>
    <Composition id="GreenBankFrame" component={GreenBankShort} durationInFrames={GREENBANK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
