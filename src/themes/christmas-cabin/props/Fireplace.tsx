"use client";

import type * as THREE from "three";
import { FIREPLACE, ROOM } from "../lib/layout";

const STONE = "#9a9088";
const STONE_DARK = "#7f766e";

/**
 * The fireplace on the back wall, left of the board, with a garland on
 * the mantel and two stockings — one each (BB-35).
 *
 * BLOCK-OUT: boxes, a static fire and its light. Stone, an animated fire
 * and proper stockings come in "Christmas Cabin: fireplace and stockings".
 * Built fresh here: the shared indoor room's fireplace is not reused.
 */
export function Fireplace({ gradient }: { gradient: THREE.Texture }) {
  const { x, width, depth } = FIREPLACE;
  return (
    <group position={[x, 0, ROOM.backZ + depth / 2]}>
      {/* hearth */}
      <mesh position={[0, 0.08, 0.1]} receiveShadow>
        <boxGeometry args={[width, 0.16, depth + 0.2]} />
        <meshToonMaterial color={STONE_DARK} gradientMap={gradient} />
      </mesh>
      {/* surround: legs + lintel */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.25), 1.0, 0]} castShadow>
          <boxGeometry args={[0.5, 1.9, depth]} />
          <meshToonMaterial color={STONE} gradientMap={gradient} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[width, 0.4, depth]} />
        <meshToonMaterial color={STONE} gradientMap={gradient} />
      </mesh>
      {/* chimney breast */}
      <mesh position={[0, 3.25, -0.1]}>
        <boxGeometry args={[1.4, 2.3, depth - 0.2]} />
        <meshToonMaterial color={STONE_DARK} gradientMap={gradient} />
      </mesh>
      {/* mantel beam + garland */}
      <mesh position={[0, 1.82, 0.12]} castShadow>
        <boxGeometry args={[width + 0.3, 0.16, depth - 0.2]} />
        <meshToonMaterial color="#6a4426" gradientMap={gradient} />
      </mesh>
      {/* garland along the front edge of the mantel */}
      <mesh position={[0, 1.92, depth / 2 + 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, width + 0.1, 10]} />
        <meshToonMaterial color="#2f6b3f" gradientMap={gradient} />
      </mesh>
      {/* firebox + fire */}
      {/* In front of the wall's slat panelling, so none shows through. */}
      <mesh position={[0, 0.95, -depth / 2 + 0.07]}>
        <planeGeometry args={[width - 1, 1.6]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      {[-0.18, 0.05, 0.2].map((fx, i) => (
        <mesh key={fx} position={[fx, 0.4 + (i % 2) * 0.05, 0]}>
          <coneGeometry args={[0.13, 0.5 - i * 0.08, 8]} />
          <meshBasicMaterial color={i === 1 ? "#ffd23f" : "#ff7a1a"} />
        </mesh>
      ))}
      <pointLight position={[0, 0.7, 0.5]} intensity={2.2} distance={5} color="#ff8a3a" />
      {/* stockings, one each */}
      {[
        { sx: -0.45, color: "#c22f2f" },
        { sx: 0.45, color: "#2f6b3f" },
      ].map(({ sx, color }) => (
        // Hung off the front of the mantel, clear of the surround.
        <group key={sx} position={[sx, 1.45, depth / 2 + 0.12]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.42, 0.08]} />
            <meshToonMaterial color={color} gradientMap={gradient} />
          </mesh>
          <mesh position={[0.08, -0.22, 0]}>
            <boxGeometry args={[0.3, 0.14, 0.08]} />
            <meshToonMaterial color={color} gradientMap={gradient} />
          </mesh>
          <mesh position={[0, 0.2, 0.005]}>
            <boxGeometry args={[0.26, 0.1, 0.1]} />
            <meshToonMaterial color="#f4f1e8" gradientMap={gradient} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
