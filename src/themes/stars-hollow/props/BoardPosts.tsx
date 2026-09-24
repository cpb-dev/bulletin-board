"use client";

import { BOARD } from "@/lib/board-geometry";
import { useKit, WHITE_PAINT } from "./kit";

/**
 * The board's legs: square white posts with ball finials, the same
 * joinery as the town sign beside it, so the board looks like the
 * town put it up — the notice board on the green.
 */
export function BoardPosts() {
  const kit = useKit();
  const z = BOARD.wallZ - 0.16;
  const top = BOARD.centerY + BOARD.height / 2 + 0.12;
  const x = BOARD.width / 2 + 0.2;
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  return (
    <group>
      {[-x, x].map((px) => (
        <group key={px} position={[px, 0, z]}>
          <mesh position={[0, top / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.16, top, 0.16]} />
            {paint}
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.21, 0.2, 0.21]} />
            {paint}
          </mesh>
          <mesh position={[0, top + 0.03, 0]} castShadow>
            <boxGeometry args={[0.23, 0.06, 0.23]} />
            {paint}
          </mesh>
          <mesh position={[0, top + 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 0.06, 12]} />
            {paint}
          </mesh>
          <mesh position={[0, top + 0.2, 0]} castShadow>
            <sphereGeometry args={[0.1, 18, 14]} />
            {paint}
          </mesh>
        </group>
      ))}
      {/* a rail behind the board, low down, tying the posts together */}
      <mesh position={[0, 0.34, z - 0.02]} castShadow receiveShadow>
        <boxGeometry args={[x * 2, 0.08, 0.07]} />
        {paint}
      </mesh>
    </group>
  );
}
