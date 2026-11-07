"use client";

import type * as THREE from "three";
import type { BoardTheme } from "@/themes/types";
import { ROOM } from "../lib/layout";

/**
 * The Christmas Cabin's room shell (BB-35): floor, rug, walls, ceiling
 * and beams. Its own room — it never uses the shared indoor `Room`.
 *
 * BLOCK-OUT: flat toon colours. Wood-panel walls, floorboards and a
 * proper rug come in "Christmas Cabin: room shell and board decor".
 */
export function CabinRoom({
  theme,
  gradient,
}: {
  theme: BoardTheme;
  gradient: THREE.Texture;
}) {
  const { halfWidth, backZ, frontZ, height } = ROOM;
  const depth = frontZ - backZ;
  const midZ = (frontZ + backZ) / 2;

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]} receiveShadow>
        <planeGeometry args={[halfWidth * 2, depth]} />
        <meshToonMaterial color={theme.room.floor} gradientMap={gradient} />
      </mesh>
      {/* rug in front of the board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.3]} receiveShadow>
        <planeGeometry args={[3.4, 2.2]} />
        <meshToonMaterial color={theme.room.rug} gradientMap={gradient} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0.3]}>
        <planeGeometry args={[3.6, 2.4]} />
        <meshToonMaterial color={theme.room.accent} gradientMap={gradient} />
      </mesh>

      {/* back wall + wainscot */}
      <mesh position={[0, height / 2, backZ]} receiveShadow>
        <planeGeometry args={[halfWidth * 2, height]} />
        <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0.45, backZ + 0.02]}>
        <planeGeometry args={[halfWidth * 2, 0.9]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>

      {/* side walls */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * halfWidth, height / 2, midZ]}
          rotation={[0, (-side * Math.PI) / 2, 0]}
          receiveShadow
        >
          <planeGeometry args={[depth, height]} />
          <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
        </mesh>
      ))}

      {/* ceiling + beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, midZ]}>
        <planeGeometry args={[halfWidth * 2, depth]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>
      {[-1.2, 1.4, 4].map((z) => (
        // No castShadow: the key light comes in through the ceiling, so
        // beam shadows land as diagonal bands down the walls.
        <mesh key={z} position={[0, height - 0.15, z]}>
          <boxGeometry args={[halfWidth * 2, 0.3, 0.32]} />
          <meshToonMaterial color="#4a2e1c" gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}
