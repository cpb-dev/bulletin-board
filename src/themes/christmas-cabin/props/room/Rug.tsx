"use client";

import { useEffect, useMemo } from "react";
import { RUG } from "../../lib/rug";
import { makeKnitTextures } from "./textures";

/**
 * The rug (BB-35): a big, chunky Nordic Fair Isle knit, the
 * Christmas-jumper look. Cranberry with cream snowflakes and stars and
 * pine-green peerie bands, every stitch drawn as a knitted "V" with real
 * bump, on a slab thick enough to read as soft.
 */
export function Rug() {
  const { map, bump } = useMemo(makeKnitTextures, []);
  useEffect(
    () => () => {
      map.dispose();
      bump.dispose();
    },
    [map, bump]
  );

  return (
    <group position={[RUG.x, 0, RUG.z]}>
      {/* the body: soft sides in the knit's own red */}
      <mesh position={[0, RUG.thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[RUG.width, RUG.thickness, RUG.depth]} />
        <meshStandardMaterial color="#7a2224" roughness={1} />
      </mesh>
      {/* the knitted face */}
      <mesh position={[0, RUG.thickness + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RUG.width, RUG.depth]} />
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={3} roughness={1} />
      </mesh>
    </group>
  );
}
