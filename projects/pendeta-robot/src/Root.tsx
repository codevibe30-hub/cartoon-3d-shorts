import React from "react";
import { Composition } from "remotion";
import { PendetaRobotShort, PENDETA_ROBOT_FRAMES } from "./videos/pendeta-robot/PendetaRobot";

export const Root: React.FC = () => (
  <>
    <Composition id="PendetaRobotFrame" component={PendetaRobotShort} durationInFrames={PENDETA_ROBOT_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
