"use client";

import type { DayPhase } from "@/lib/day-cycle";
import type { ThemeScene } from "@/themes/types";
import { HallShell } from "./props/HallShell";
import { EnchantedCeiling } from "./props/EnchantedCeiling";
import { FloatingCandles } from "./props/FloatingCandles";
import { Tables } from "./props/Tables";
import { HallTrees } from "./props/HallTrees";
import { Banners } from "./props/Banners";

/** Daylight through the windows and the enchanted ceiling, per phase. */
const SKYLIGHT: Record<DayPhase, { color: string; intensity: number }> = {
  day: { color: "#cfdcf0", intensity: 0.55 },
  evening: { color: "#f0a07a", intensity: 0.35 },
  night: { color: "#6f82c4", intensity: 0.18 },
};

/**
 * Great Hall (BB-38): a great stone hall at Christmas.
 *
 * From the room camera you stand in the aisle between the long tables,
 * looking down the hall at the board on the far wall. It hangs on the
 * dais, under a tall arched window, between the two halves of the top
 * table, with banners either side. Christmas trees stand in the corners
 * and down the walls, candles float overhead, and the enchanted ceiling
 * shows the sky outside, snowing. Where everything stands lives in
 * `lib/layout.ts`, with tests.
 *
 * This is the base: every prop is a block-out, and each one is detailed
 * in its own PR (see the Great Hall sub-tickets).
 */
export const GreatHallScene: ThemeScene = ({ theme, phase = "day" }) => {
  const sky = SKYLIGHT[phase];
  return (
    <group>
      <color attach="background" args={[theme.light.sky]} />
      {/* Far off down the hall, behind you, fades into warm shadow. */}
      <fog attach="fog" args={["#1c140e", 14, 30]} />

      {/* Candlelight: a warm, low wash, plus the sky through the glass. */}
      <ambientLight intensity={0.22} color="#ffc488" />
      <hemisphereLight args={[sky.color, "#6a4a30", sky.intensity]} />
      <directionalLight
        position={[3, 8, 6]}
        intensity={theme.light.keyIntensity * 0.6}
        color="#ffcf9a"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0012}
        shadow-normalBias={0.05}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-4}
        shadow-camera-far={30}
        onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
      />
      {/* The candles' warmth, pooled over the tables and the dais. */}
      {[
        [0, 4.8, 0.5],
        [-4, 4.8, 3],
        [4, 4.8, 3],
        [0, 4.8, 7],
      ].map(([x, y, z]) => (
        <pointLight key={`${x},${z}`} position={[x, y, z]} intensity={6} distance={10} decay={1.6} color="#ffb366" />
      ))}

      <HallShell phase={phase} />
      <Banners />
      <Tables />
      <HallTrees />
      <FloatingCandles />
      <EnchantedCeiling phase={phase} />
    </group>
  );
};
