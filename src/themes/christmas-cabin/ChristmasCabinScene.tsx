"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeToonGradient } from "@/components/three/textures";
import type { ThemeScene } from "@/themes/types";
import { CabinRoom } from "./props/CabinRoom";
import { Fireplace } from "./props/Fireplace";
import { AlphabetWall } from "./props/AlphabetWall";
import { ChristmasTree } from "./props/ChristmasTree";
import { Presents } from "./props/Presents";
import { SnowWindow } from "./props/SnowWindow";
import { Tinsel } from "./props/Tinsel";
import { DOWNLIGHTS } from "./props/room/Ceiling";
import { ROOM } from "./lib/layout";

/**
 * Christmas Cabin (BB-35): a cosy cabin room on a snowy evening.
 *
 * From the room camera: the tree in the corner beside a wide window onto
 * the snow, tinsel under its sill and presents trailing from the tree
 * to the window, all left of the board; the fireplace on its right.
 * Turn your head right for the alphabet light wall. Where everything
 * stands lives in `lib/layout.ts`, with tests.
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

      {/*
        Layered warm light, about 2700K throughout: a low warm ambient,
        a warm bounce between ceiling and floor, a soft key for shadows,
        and the downlights washing the back wall (raking across the
        slats). The fire adds its own glow.
      */}
      <ambientLight intensity={theme.light.ambientIntensity * 0.5} color={theme.light.key} />
      {/* The "ground" colour is the warm floor's bounce: it's what lights
          the ceiling, as it would in a real room. */}
      <hemisphereLight args={["#ffe6c8", "#c08a5c", 0.8]} />
      <directionalLight
        position={[1.5, 4.0, 3.0]}
        intensity={theme.light.keyIntensity * 0.7}
        color={theme.light.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
        onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
      />

      <WallWashers />

      <CabinRoom />
      <Fireplace gradient={gradient} />
      <AlphabetWall />
      <ChristmasTree gradient={gradient} />
      <Presents gradient={gradient} />
      <SnowWindow gradient={gradient} />
      <Tinsel />
    </group>
  );
};

/**
 * Warm spotlights under the downlights near the back wall, each aimed at
 * the wall below it, so pools of light rake across the limewash and the
 * slats. No shadows — they're for glow, and shadows cost on phones.
 */
function WallWashers() {
  const lights = useMemo(
    () =>
      DOWNLIGHTS.filter(([, z]) => z < 0).map(([x, z]) => {
        const l = new THREE.SpotLight("#ffcf98", 14, 7, 0.62, 0.85, 2);
        l.position.set(x, ROOM.height - 0.05, z);
        l.target.position.set(x, 0.6, ROOM.backZ);
        return l;
      }),
    []
  );
  useEffect(() => () => lights.forEach((l) => l.dispose()), [lights]);
  return (
    <group>
      {lights.map((l, i) => (
        <group key={i}>
          <primitive object={l} />
          <primitive object={l.target} />
        </group>
      ))}
    </group>
  );
}
