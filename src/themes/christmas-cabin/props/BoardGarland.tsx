"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import type { ThemeBoardDecor } from "@/themes/types";

const BULBS = ["#ff4a3a", "#ffd23f", "#3fd16a", "#f4f1e8"];

/**
 * The Christmas Cabin's board decor (BB-35): a holly garland swagged
 * across the top of the board in two loops, with bulbs along it.
 *
 * BLOCK-OUT: a plain green tube and lit beads. Leaves, berries and
 * twinkling come in "Christmas Cabin: room shell and board decor".
 */
export const BoardGarland: ThemeBoardDecor = ({ gradient }) => {
  const top = BOARD.centerY + BOARD.height / 2 + 0.06;
  const z = BOARD_SURFACE_Z + 0.06;
  const half = BOARD.width / 2 + 0.05;

  const curve = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const L = new THREE.Vector3(-half, top, z);
    const M = new THREE.Vector3(0, top, z);
    const R = new THREE.Vector3(half, top, z);
    path.add(new THREE.QuadraticBezierCurve3(L, new THREE.Vector3(-half / 2, top - 0.4, z), M));
    path.add(new THREE.QuadraticBezierCurve3(M, new THREE.Vector3(half / 2, top - 0.4, z), R));
    return path;
  }, [half, top, z]);

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.06, 8, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const bulbs = useMemo(
    () => Array.from({ length: 22 }, (_, i) => curve.getPointAt((i + 0.5) / 22)),
    [curve]
  );

  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshToonMaterial color="#2c6b3c" gradientMap={gradient} />
      </mesh>
      {bulbs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.06, p.z + 0.03]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color={BULBS[i % BULBS.length]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};
