"use client";

import { useMemo } from "react";
import { makeToonGradient } from "@/components/three/textures";
import type { ThemeScene } from "@/themes/types";
import { CabinRoom } from "./props/CabinRoom";
import { Fireplace } from "./props/Fireplace";
import { AlphabetWall } from "./props/AlphabetWall";
import { ChristmasTree } from "./props/ChristmasTree";
import { Sofa } from "./props/Sofa";
import { SnowWindow } from "./props/SnowWindow";

/**
 * Christmas Cabin (BB-35): a cosy cabin room on a snowy evening.
 *
 * From the room camera: the fireplace on the back wall to the left of
 * the board and the alphabet light wall to the right. Turn your head
 * right for the tree and presents, left for the sofa under a snowy
 * window. Where everything stands lives in `lib/layout.ts`, with tests.
 *
 * This is the base: every prop is a block-out, and each one is detailed
 * in its own PR (see the Christmas Cabin sub-tickets).
 */
export const ChristmasCabinScene: ThemeScene = ({ theme }) => {
  const gradient = useMemo(() => makeToonGradient(), []);

  return (
    <group>
      <color attach="background" args={[theme.light.sky]} />
      <fog attach="fog" args={[theme.light.sky, 10, 20]} />

      <ambientLight intensity={theme.light.ambientIntensity} color={theme.light.key} />
      {/* soft overhead light, as if from a lamp out of shot */}
      <directionalLight
        position={[1.5, 4.0, 3.0]}
        intensity={theme.light.keyIntensity}
        color={theme.light.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
        onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
      />

      <CabinRoom theme={theme} gradient={gradient} />
      <Fireplace gradient={gradient} />
      <AlphabetWall />
      <ChristmasTree gradient={gradient} />
      <Sofa gradient={gradient} />
      <SnowWindow gradient={gradient} />
    </group>
  );
};
