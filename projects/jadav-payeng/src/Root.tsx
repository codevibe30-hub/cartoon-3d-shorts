import React from "react";
import { Composition } from "remotion";
import { PayengShort, PAYENG_FRAMES } from "./videos/payeng/Payeng";

export const Root: React.FC = () => (
  <>
    <Composition id="PayengFrame" component={PayengShort} durationInFrames={PAYENG_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
