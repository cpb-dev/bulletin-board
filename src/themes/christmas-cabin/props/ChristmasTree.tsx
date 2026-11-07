"use client";

import type * as THREE from "three";
import { ROOM_CAMERA, TREE, treeTiers } from "../lib/layout";

const BAUBLES = ["#e0443a", "#e8b63a", "#3f8cff", "#f4f1e8", "#e0443a", "#e8b63a"];

/**
 * The Christmas tree in the back-left corner, just left of the window
 * (BB-35). Its cones come from `treeTiers`, the same numbers the layout
 * tests use to check it doesn't hide the window.
 *
 * BLOCK-OUT: stacked cones, a star and baubles. A layered fir and
 * twinkling lights come in "Christmas Cabin: tree and presents".
 */
export function ChristmasTree({ gradient }: { gradient: THREE.Texture }) {
  const { x, z, height } = TREE;
  const tiers = treeTiers();
  // Baubles hang on the side that faces the room camera.
  const toCamera = Math.atan2(ROOM_CAMERA.z - z, ROOM_CAMERA.x - x);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, tiers[0].y / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, tiers[0].y + 0.05, 10]} />
        <meshToonMaterial color="#5a3a22" gradientMap={gradient} />
      </mesh>
      {tiers.map((t) => (
        <mesh key={t.y} position={[0, t.y + t.h / 2, 0]} castShadow>
          <coneGeometry args={[t.r, t.h, 14]} />
          <meshToonMaterial color="#2c6b3c" gradientMap={gradient} />
        </mesh>
      ))}
      {/* star */}
      <mesh position={[0, height + 0.08, 0]}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </mesh>
      {/* baubles: two per tier, on the lower rim, towards the room */}
      {tiers.flatMap((t, ti) =>
        [-0.5, 0.45].map((da, k) => {
          const a = toCamera + da + ti * 0.25;
          const lift = 0.12;
          const r = t.r * (1 - lift / t.h) + 0.04;
          return (
            <mesh key={`${ti}-${k}`} position={[Math.cos(a) * r, t.y + lift, Math.sin(a) * r]}>
              <sphereGeometry args={[0.065, 10, 8]} />
              <meshToonMaterial
                color={BAUBLES[(ti * 2 + k) % BAUBLES.length]}
                gradientMap={gradient}
              />
            </mesh>
          );
        })
      )}
    </group>
  );
}
