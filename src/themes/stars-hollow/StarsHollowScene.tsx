"use client";

import type { BoardTheme } from "@/themes/types";
import type { DayPhase } from "@/lib/day-cycle";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import {
  backdrop,
  faceCamera,
  GAZEBO,
  GAZEBO_YAW,
  SIGN,
  squareLamps,
  streetLamps,
  trees,
} from "./lib/layout";
import { PhaseProvider, useLook } from "./props/phase";
import { KitProvider } from "./props/kit";
import { Sky } from "./props/Sky";
import { Ground } from "./props/Ground";
import { TownSign } from "./props/TownSign";
import { BoardPosts } from "./props/BoardPosts";
import { Gazebo } from "./props/Gazebo";
import { FallTree } from "./props/FallTree";
import { MainStreet } from "./props/MainStreet";
import { Backdrop, DistantTrees } from "./props/Backdrop";
import { FallingLeaves } from "./props/FallingLeaves";
import { SquareDressing } from "./props/SquareDressing";
import { StaticBatch } from "./props/StaticBatch";

// The plan of the town never changes, so it's worked out once.
const TREES = trees();
const BACKDROP = backdrop();
/** The lamps that throw real light after dark: the ones nearest the board. */
const LIT_LAMPS = [...squareLamps(), ...streetLamps()]
  .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
  .slice(0, 3);
/** Height of a lamp's globes above the ground (StreetLamp's post + globe). */
const GLOBE_Y = 3.65;

/**
 * Stars Hollow: the board stands on the town green in October. The
 * town sign is just off its left edge with the gazebo behind it; Main
 * Street runs away on the right with Luke's on the corner; and across
 * the square the rest of the town shows over the top of the board.
 *
 * Where everything stands is decided in `lib/layout.ts`. It has a day,
 * an evening and a night (BB-21); what changes between them is decided
 * in `lib/looks.ts`.
 */
export function StarsHollowScene({
  theme,
  phase = "day",
}: {
  theme: BoardTheme;
  phase?: DayPhase;
}) {
  return (
    <PhaseProvider value={phase}>
      <KitProvider>
        <Sky />
        <Lights />
        <Ground color={theme.room.floor} />
        {/* Everything that never moves is welded by material into a few
          draw calls per region — see lib/batch.ts. */}
        <StaticBatch>
          <group
            position={[SIGN.x, 0, SIGN.z]}
            rotation={[0, faceCamera(SIGN.x, SIGN.z), 0]}
          >
            <TownSign />
          </group>
          <group
            position={[GAZEBO.x, 0, GAZEBO.z]}
            rotation={[0, GAZEBO_YAW, 0]}
            scale={GAZEBO.scale}
          >
            <Gazebo />
          </group>
          <SquareDressing />
          <BoardPosts />
        </StaticBatch>
        <StaticBatch>
          {TREES.map((t, i) => (
            <group
              key={i}
              position={[t.x, 0, t.z]}
              scale={t.scale}
              rotation={[0, t.seed, 0]}
            >
              <FallTree species={t.species} seed={t.seed} />
            </group>
          ))}
        </StaticBatch>
        <StaticBatch>
          <MainStreet />
        </StaticBatch>
        <StaticBatch>
          <Backdrop buildings={BACKDROP} />
        </StaticBatch>
        <DistantTrees />
        <FallingLeaves />
      </KitProvider>
    </PhaseProvider>
  );
}

/**
 * By day, a clear autumn afternoon: a low, warm sun from the front
 * left, which lights the sign's face and the shopfronts across the
 * street, and a blue sky fill so the shadows stay cool rather than
 * black. Evening and night swap the sun for a setting one or the moon,
 * and add the lamps.
 */
function Lights() {
  const look = useLook();
  return (
    <>
      <ambientLight
        intensity={look.ambient.intensity}
        color={look.ambient.colour}
      />
      <hemisphereLight
        args={[
          look.hemisphere.sky,
          look.hemisphere.ground,
          look.hemisphere.intensity,
        ]}
      />
      <directionalLight
        position={look.key.position}
        intensity={look.key.intensity}
        color={look.key.colour}
        castShadow
        shadow-mapSize={[2048, 2048]}
        // The shadows have to cover the square and the near half of
        // Main Street; the far shops are in the haze by then.
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0008}
        shadow-normalBias={0.05}
        onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
      />
      {/* No extra lights by day: each one costs every material on the
          square, and the daytime look must not move. */}
      {look.lampLight > 0 &&
        LIT_LAMPS.map((l, i) => (
          <pointLight
            key={i}
            position={[l.x, GLOBE_Y, l.z]}
            color={look.lampColour}
            intensity={look.lampLight * 6}
            distance={11}
            decay={1.2}
          />
        ))}
      {look.boardLight > 0 && (
        // as if from a lamp just behind the camera, so the notes read
        <pointLight
          position={[0.6, BOARD.centerY + 1.4, BOARD_SURFACE_Z + 2.6]}
          color={look.lampColour}
          intensity={look.boardLight * 4}
          distance={7}
          decay={1.2}
        />
      )}
    </>
  );
}
