"use client";

import type * as THREE from "three";
import { SOFA } from "../lib/layout";

/**
 * A sofa against the left wall, facing into the room, with a knitted
 * blanket over one arm (BB-35).
 *
 * BLOCK-OUT: boxes. Cushions, shaping and the blanket's knit come in
 * "Christmas Cabin: sofa, window and snow".
 */
export function Sofa({ gradient }: { gradient: THREE.Texture }) {
  const { x, z, length, depth } = SOFA;
  const fabric = "#7a3a3a";
  const fabricDark = "#5e2b2b";
  return (
    // Local +z faces into the room (towards +x in the world).
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.4, depth]} />
        <meshToonMaterial color={fabricDark} gradientMap={gradient} />
      </mesh>
      {/* seat cushions */}
      {[-0.48, 0.48].map((cx) => (
        <mesh key={cx} position={[cx, 0.52, 0.05]} castShadow>
          <boxGeometry args={[length / 2 - 0.12, 0.16, depth - 0.2]} />
          <meshToonMaterial color={fabric} gradientMap={gradient} />
        </mesh>
      ))}
      {/* back */}
      <mesh position={[0, 0.8, -depth / 2 + 0.12]} castShadow>
        <boxGeometry args={[length, 0.75, 0.24]} />
        <meshToonMaterial color={fabricDark} gradientMap={gradient} />
      </mesh>
      {/* arms */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (length / 2 - 0.1), 0.58, 0]} castShadow>
          <boxGeometry args={[0.2, 0.36, depth]} />
          <meshToonMaterial color={fabricDark} gradientMap={gradient} />
        </mesh>
      ))}
      {/* blanket over one end: across the seat and down the front */}
      <mesh position={[length / 2 - 0.42, 0.62, 0.02]}>
        <boxGeometry args={[0.55, 0.05, depth - 0.12]} />
        <meshToonMaterial color="#e8dcc2" gradientMap={gradient} />
      </mesh>
      <mesh position={[length / 2 - 0.42, 0.4, depth / 2 - 0.02]}>
        <boxGeometry args={[0.55, 0.45, 0.05]} />
        <meshToonMaterial color="#e8dcc2" gradientMap={gradient} />
      </mesh>
    </group>
  );
}
