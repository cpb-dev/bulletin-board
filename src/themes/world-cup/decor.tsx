"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";

/** A row of little footballs along the top of the board. */
export function Footballs() {
  const balls = useMemo(() => {
    const count = 9;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const x = -BOARD.width / 2 + 0.35 + t * (BOARD.width - 0.7);
      const y =
        BOARD.centerY + BOARD.height / 2 + 0.13 - Math.sin(t * Math.PI) * 0.05;
      return { x, y, spin: (i % 2 === 0 ? 1 : -1) * 0.4 };
    });
  }, []);
  return (
    <group>
      {balls.map((b, i) => (
        <group
          key={i}
          position={[b.x, b.y, BOARD_SURFACE_Z + 0.06]}
          rotation={[0.3, b.spin, 0]}
        >
          <Football />
        </group>
      ))}
    </group>
  );
}

/** A small stylised football — a faceted white ball with dark patches. */
export function Football({ radius = 0.07 }: { radius?: number }) {
  const patches = useMemo(() => {
    const dirs = [
      [0, 0, 1],
      [0.9, 0.35, 0.2],
      [-0.75, -0.5, 0.4],
      [0.2, -0.95, 0.1],
      [-0.3, 0.85, -0.4],
    ];
    return dirs.map((p) => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        v
      );
      return {
        pos: v.clone().multiplyScalar(radius * 0.99).toArray() as [
          number,
          number,
          number,
        ],
        quat: q,
      };
    });
  }, [radius]);

  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} flatShading />
      </mesh>
      {patches.map((p, i) => (
        <mesh key={i} position={p.pos} quaternion={p.quat}>
          <circleGeometry args={[radius * 0.4, 5]} />
          <meshStandardMaterial color="#161616" />
        </mesh>
      ))}
    </group>
  );
}
