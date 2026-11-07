"use client";

import type * as THREE from "three";
import { TREE } from "../lib/layout";

const BAUBLES = ["#e0443a", "#e8b63a", "#3f8cff", "#f4f1e8", "#e0443a", "#e8b63a"];

/**
 * The Christmas tree, front-right of the room, with presents underneath
 * (BB-35).
 *
 * BLOCK-OUT: stacked cones, a star and a few baubles. A layered fir,
 * twinkling lights and wrapped presents come in "Christmas Cabin: tree
 * and presents".
 */
export function ChristmasTree({ gradient }: { gradient: THREE.Texture }) {
  const { x, z, radius, height } = TREE;
  const tiers = [
    { y: 0.55, r: radius, h: 1.1 },
    { y: 1.25, r: radius * 0.75, h: 0.95 },
    { y: 1.85, r: radius * 0.5, h: 0.8 },
  ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.4, 10]} />
        <meshToonMaterial color="#5a3a22" gradientMap={gradient} />
      </mesh>
      {tiers.map((t) => (
        <mesh key={t.y} position={[0, t.y + t.h / 2, 0]} castShadow>
          <coneGeometry args={[t.r, t.h, 14]} />
          <meshToonMaterial color="#2c6b3c" gradientMap={gradient} />
        </mesh>
      ))}
      {/* star */}
      <mesh position={[0, height + 0.05, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </mesh>
      {/* baubles: two per tier, sitting on the tier's lower rim */}
      {tiers.flatMap((t, ti) =>
        [-0.55, 0.45].map((da, k) => {
          const a = Math.PI / 2 + da + ti * 0.3;
          const lift = 0.14;
          const r = t.r * (1 - lift / t.h) + 0.04;
          return (
            <mesh
              key={`${ti}-${k}`}
              position={[Math.cos(a) * r, t.y + lift, Math.sin(a) * r]}
            >
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshToonMaterial
                color={BAUBLES[(ti * 2 + k) % BAUBLES.length]}
                gradientMap={gradient}
              />
            </mesh>
          );
        })
      )}
      <Presents gradient={gradient} />
    </group>
  );
}

/** Wrapped presents round the foot of the tree. BLOCK-OUT: boxes. */
function Presents({ gradient }: { gradient: THREE.Texture }) {
  type V3 = [number, number, number];
  const boxes: { p: V3; s: V3; c: string; rib: string }[] = [
    { p: [-0.55, 0.18, 0.55], s: [0.4, 0.36, 0.36], c: "#c22f2f", rib: "#e8b63a" },
    { p: [0.1, 0.13, 0.8], s: [0.32, 0.26, 0.3], c: "#2f6b3f", rib: "#f4f1e8" },
    { p: [0.6, 0.22, 0.45], s: [0.34, 0.44, 0.34], c: "#3f6fb0", rib: "#e0443a" },
  ];
  return (
    <group>
      {boxes.map((b) => (
        <group key={b.c} position={b.p}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={b.s} />
            <meshToonMaterial color={b.c} gradientMap={gradient} />
          </mesh>
          <mesh>
            <boxGeometry args={[b.s[0] + 0.01, b.s[1] + 0.01, 0.06]} />
            <meshToonMaterial color={b.rib} gradientMap={gradient} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.06, b.s[1] + 0.01, b.s[2] + 0.01]} />
            <meshToonMaterial color={b.rib} gradientMap={gradient} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
