"use client";

import { forwardRef } from "react";
import type * as THREE from "three";
import { BOOT } from "../../lib/fireplace";

/** From the sole up to the hip pivot, hidden up the flue. */
export const LEG = 0.7;

/**
 * Santa's legs (BB-35): red trousers, white fur cuffs and shiny black
 * boots. Each leg is a group pivoting at the hip, `LEG` above the sole,
 * so a swing kicks the boot forward and back. The parent places the
 * hips and sets each leg's swing every frame.
 */
export const SantaLeg = forwardRef<THREE.Group, { x: number }>(function SantaLeg({ x }, ref) {
  return (
    <group ref={ref} position={[x, LEG, 0]}>
      {/* trouser leg */}
      <mesh position={[0, -LEG / 2 + BOOT.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.052, LEG - BOOT.height, 12]} />
        <meshStandardMaterial color="#b3202a" roughness={0.85} />
      </mesh>
      {/* fur cuff where the trouser meets the boot */}
      <mesh position={[0, -LEG + BOOT.height + 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.072, 0.072, 0.06, 14]} />
        <meshStandardMaterial color="#f4efe7" roughness={1} />
      </mesh>
      {/* boot shaft */}
      <mesh position={[0, -LEG + BOOT.height / 2 + 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.058, BOOT.height - 0.04, 12]} />
        <meshStandardMaterial color="#141212" metalness={0.15} roughness={0.28} />
      </mesh>
      {/* foot, pointing out into the room */}
      <mesh position={[0, -LEG + 0.045, 0.06]} castShadow>
        <sphereGeometry args={[0.068, 14, 10]} />
        <meshStandardMaterial color="#141212" metalness={0.15} roughness={0.28} />
      </mesh>
      <mesh position={[0, -LEG + 0.045, 0.06]} scale={[1, 0.62, 1.55]} castShadow>
        <sphereGeometry args={[0.064, 14, 10]} />
        <meshStandardMaterial color="#141212" metalness={0.15} roughness={0.28} />
      </mesh>
      {/* sole */}
      <mesh position={[0, -LEG + 0.008, 0.05]}>
        <boxGeometry args={[0.12, 0.016, 0.24]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.9} />
      </mesh>
    </group>
  );
});
