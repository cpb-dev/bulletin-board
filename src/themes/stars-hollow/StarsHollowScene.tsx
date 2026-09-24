"use client";

import type { BoardTheme } from "@/themes/types";
import { backdrop, faceCamera, GAZEBO, GAZEBO_YAW, SIGN, trees } from "./lib/layout";
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

/**
 * Stars Hollow: the board stands on the town green in October. The
 * town sign is just off its left edge with the gazebo behind it; Main
 * Street runs away on the right with Luke's on the corner; and across
 * the square the rest of the town shows over the top of the board.
 *
 * Where everything stands is decided in `lib/layout.ts`.
 */
export function StarsHollowScene({ theme }: { theme: BoardTheme }) {
  return (
    <KitProvider>
      <Sky />
      <Lights />
      <Ground color={theme.room.floor} />
      {/* Everything that never moves is welded by material into a few
          draw calls per region — see lib/batch.ts. */}
      <StaticBatch>
        <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, faceCamera(SIGN.x, SIGN.z), 0]}>
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
          <group key={i} position={[t.x, 0, t.z]} scale={t.scale} rotation={[0, t.seed, 0]}>
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
  );
}

/**
 * A clear autumn afternoon: a low, warm sun from the front left, which
 * lights the sign's face and the shopfronts across the street, and a
 * blue sky fill so the shadows stay cool rather than black.
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#fff3e0" />
      <hemisphereLight args={["#bcd6ee", "#6f6a45", 0.75]} />
      <directionalLight
        position={[-9, 12, 8]}
        intensity={1.55}
        color="#ffe3b8"
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
    </>
  );
}
