"use client";

import type * as THREE from "three";
import { PRESENTS } from "../lib/layout";

/**
 * Wrapped presents under the tree, trailing along the floor towards and
 * under the window (BB-35). Where each one sits, its size and colours
 * are in `PRESENTS` in `lib/layout.ts`, so they can be moved around
 * without touching this file.
 *
 * BLOCK-OUT: boxes with a ribbon each way. Wrapping-paper patterns, bows
 * and lids come in "Christmas Cabin: tree and presents".
 */
export function Presents({ gradient }: { gradient: THREE.Texture }) {
  return (
    <group>
      {PRESENTS.map((p, i) => (
        <group key={i} position={[p.x, p.h / 2, p.z]} rotation={[0, p.rot, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[p.w, p.h, p.d]} />
            <meshToonMaterial color={p.color} gradientMap={gradient} />
          </mesh>
          <mesh>
            <boxGeometry args={[p.w + 0.01, p.h + 0.01, 0.05]} />
            <meshToonMaterial color={p.ribbon} gradientMap={gradient} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.05, p.h + 0.01, p.d + 0.01]} />
            <meshToonMaterial color={p.ribbon} gradientMap={gradient} />
          </mesh>
          {/* bow */}
          <mesh position={[0, p.h / 2 + 0.03, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshToonMaterial color={p.ribbon} gradientMap={gradient} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
