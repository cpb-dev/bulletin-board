"use client";

import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { ROOM, SNOW_WINDOW } from "../lib/layout";
import { makeSnowViewTexture } from "./textures";

/**
 * A wide window in the back wall, left of the board and over the sofa,
 * looking out on a snowy evening (BB-35).
 *
 * BLOCK-OUT: a frame and a painted view. Frosted panes, a snowy sill and
 * falling snow come in "Christmas Cabin: sofa, window and snow", with the
 * snowfall logic in `lib/`.
 */
export function SnowWindow({ gradient }: { gradient: THREE.Texture }) {
  const { x, y, width, height } = SNOW_WINDOW;
  const view = useMemo(makeSnowViewTexture, []);
  useEffect(() => () => view.dispose(), [view]);
  const frame = "#5e3b24";
  const bar = 0.07;

  return (
    // In the back wall, facing into the room.
    <group position={[x, y, ROOM.backZ + 0.01]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={view} toneMapped={false} />
      </mesh>
      {/* frame */}
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * (width / 2), 0, 0.04]}>
          <boxGeometry args={[0.12, height + 0.12, 0.08]} />
          <meshToonMaterial color={frame} gradientMap={gradient} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * (height / 2), 0.04]}>
          <boxGeometry args={[width + 0.12, 0.12, 0.08]} />
          <meshToonMaterial color={frame} gradientMap={gradient} />
        </mesh>
      ))}
      {/* glazing bars: three lights across, one rail */}
      {[-width / 6, width / 6].map((bx) => (
        <mesh key={bx} position={[bx, 0, 0.03]}>
          <boxGeometry args={[bar, height, 0.04]} />
          <meshToonMaterial color={frame} gradientMap={gradient} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[width, bar, 0.04]} />
        <meshToonMaterial color={frame} gradientMap={gradient} />
      </mesh>
      {/* sill with snow */}
      <mesh position={[0, -height / 2 - 0.08, 0.1]}>
        <boxGeometry args={[width + 0.3, 0.06, 0.22]} />
        <meshToonMaterial color={frame} gradientMap={gradient} />
      </mesh>
    </group>
  );
}
