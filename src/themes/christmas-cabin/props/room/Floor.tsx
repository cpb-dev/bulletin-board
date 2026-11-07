"use client";

import { useEffect, useMemo } from "react";
import { ROOM } from "../../lib/layout";
import { makePlankTextures } from "./textures";

/** One floor tile is this many metres square. */
const TILE = 4;

/**
 * Wide-plank warm oak (BB-35): 20 cm boards running back to front, with
 * staggered joints, board-to-board tone, grain, the odd knot and a
 * satin finish. Its bump map lets the gaps catch the light.
 */
export function Floor() {
  const { map, bump } = useMemo(
    () =>
      makePlankTextures(
        1024,
        { rows: 20, minLength: 0.3, maxLength: 0.62, minStagger: 0.12, seed: 7 },
        { base: "#a98260", toneSpread: 0.9, grainStrength: 1, knots: 0.18 },
        TILE
      ),
    []
  );
  const width = ROOM.halfWidth * 2;
  const depth = ROOM.frontZ - ROOM.backZ;
  useMemo(() => {
    for (const t of [map, bump]) t.repeat.set(width / TILE, depth / TILE);
  }, [map, bump, width, depth]);
  useEffect(
    () => () => {
      map.dispose();
      bump.dispose();
    },
    [map, bump]
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, (ROOM.frontZ + ROOM.backZ) / 2]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.6} roughness={0.55} />
    </mesh>
  );
}
