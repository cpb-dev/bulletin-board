"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DayPhase } from "@/lib/day-cycle";
import { ROOM, SNOW_WINDOW } from "../../lib/layout";
import { LOOKS, WALL_OUT_Z } from "../../lib/outdoor";
import { applyLook, makeOutdoorUniforms } from "./material";
import { Sky } from "./Sky";
import { Landscape } from "./Landscape";
import { Snowman } from "./Snowman";
import { Snowfall } from "./Snowfall";
import { Events } from "./Events";

/**
 * Everything outside the Christmas Cabin's window (BB-35), seen through a
 * real opening in the back wall: sky, a snowy slope rising to a ridge
 * with a snowman on it, pine-covered hills, a village whose windows light
 * up as it gets dark, mountains, falling snow, and now and then something
 * happening — a snowball, a cardinal, Santa's sleigh, a shooting star.
 *
 * It follows the time of day (BB-21): day, evening or night, decided
 * when the board loads. The light from outside spills in through the
 * window onto the floor in the same colour.
 */
export function Outdoor({ phase }: { phase: DayPhase }) {
  const look = LOOKS[phase];
  const shared = useMemo(makeOutdoorUniforms, []);
  useEffect(() => applyLook(shared, look), [shared, look]);
  useFrame(({ clock }) => {
    shared.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <Sky look={look} />
      <Landscape shared={shared} villageLights={look.villageLights} />
      <Snowman shared={shared} />
      <Snowfall color={look.snow} />
      <Events phase={phase} shared={shared} />
      <WindowLight color={look.windowLight} intensity={look.windowIntensity} />
    </group>
  );
}

/**
 * Daylight (or dusk, or moonlight) falling in through the window: a soft
 * spotlight from outside, aimed down through the glass onto the floor in
 * front of it. No shadows; it's for the glow on the boards.
 */
function WindowLight({ color, intensity }: { color: string; intensity: number }) {
  const light = useMemo(() => {
    const l = new THREE.SpotLight(color, intensity, 9, 0.55, 0.9, 1.6);
    l.position.set(SNOW_WINDOW.x - 0.3, SNOW_WINDOW.y + 1.2, WALL_OUT_Z - 1.6);
    l.target.position.set(SNOW_WINDOW.x + 0.9, 0, ROOM.backZ + 2.4);
    return l;
  }, [color, intensity]);
  useEffect(() => () => light.dispose(), [light]);
  return (
    <group>
      <primitive object={light} />
      <primitive object={light.target} />
    </group>
  );
}
