"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import type { ThemeBoardDecor } from "@/themes/types";

/**
 * The Great Hall's board decor (BB-38): an evergreen swag across the top
 * of the board, tied up with red ribbon, hung with gold baubles.
 *
 * BLOCK-OUT: a green tube with beads and bows. Real greenery, ribbon
 * tails and a few candles come in "Great Hall: board decor".
 */
export const HallGarland: ThemeBoardDecor = () => {
  const top = BOARD.centerY + BOARD.height / 2 + 0.06;
  const z = BOARD_SURFACE_Z + 0.06;
  const half = BOARD.width / 2 + 0.05;

  const curve = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const pts = [-half, -half / 3, half / 3, half].map((x) => new THREE.Vector3(x, top, z));
    for (let i = 0; i < 3; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      path.add(new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, top - 0.32, z), b));
    }
    return path;
  }, [half, top, z]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 90, 0.07, 8, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const baubles = useMemo(() => Array.from({ length: 9 }, (_, i) => curve.getPointAt((i + 0.5) / 9)), [curve]);
  const bows = [-half, -half / 3, half / 3, half];

  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color="#1f4a2c" roughness={0.85} />
      </mesh>
      {baubles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.12, p.z + 0.04]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#c9a24a" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {bows.map((x) => (
        <mesh key={x} position={[x, top, z + 0.08]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#a8232b" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};
