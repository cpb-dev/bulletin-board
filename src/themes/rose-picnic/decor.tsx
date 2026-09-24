"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import { mulberry32 } from "@/components/three/textures";

/** A garland of plump pink hearts along the top of the board. */
export function Hearts() {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    // unit heart, later scaled down
    s.moveTo(0, -0.42);
    s.bezierCurveTo(-0.46, -0.1, -0.48, 0.24, -0.22, 0.38);
    s.bezierCurveTo(-0.08, 0.46, 0, 0.36, 0, 0.26);
    s.bezierCurveTo(0, 0.36, 0.08, 0.46, 0.22, 0.38);
    s.bezierCurveTo(0.48, 0.24, 0.46, -0.1, 0, -0.42);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const hearts = useMemo(() => {
    const rand = mulberry32(14);
    const count = 8;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      return {
        x: -BOARD.width / 2 + 0.35 + t * (BOARD.width - 0.7),
        y:
          BOARD.centerY + BOARD.height / 2 + 0.14 - Math.sin(t * Math.PI) * 0.06,
        tilt: (rand() - 0.5) * 0.5,
        tint: i % 2 === 0 ? "#ff8fb4" : "#ffc2d6",
      };
    });
  }, []);

  return (
    <group>
      {hearts.map((hh, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[hh.x, hh.y, BOARD_SURFACE_Z + 0.05]}
          rotation={[0, 0, hh.tilt]}
          scale={0.16}
        >
          <meshStandardMaterial color={hh.tint} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}
