"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ROOM, SNOW_WINDOW } from "../lib/layout";

/**
 * Gold tinsel swagged under the window sill in three loops (BB-35).
 *
 * BLOCK-OUT: a shiny tube. Fluffy strands that catch the firelight come
 * in "Christmas Cabin: window and the snowy scene outside".
 */
export function Tinsel() {
  const { x, y, width, height } = SNOW_WINDOW;
  // Just under the sill, which sits below the window frame.
  const top = y - height / 2 - 0.13;
  const z = ROOM.backZ + 0.08;

  const geometry = useMemo(() => {
    const loops = 3;
    const left = x - width / 2;
    const span = width / loops;
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < loops; i++) {
      const a = new THREE.Vector3(left + i * span, top, z);
      const b = new THREE.Vector3(left + (i + 1) * span, top, z);
      const sag = new THREE.Vector3((a.x + b.x) / 2, top - 0.2, z + 0.04);
      path.add(new THREE.QuadraticBezierCurve3(a, sag, b));
    }
    return new THREE.TubeGeometry(path, 90, 0.035, 8, false);
  }, [x, width, top, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e8c050"
        metalness={0.8}
        roughness={0.3}
        emissive="#6b4a10"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}
