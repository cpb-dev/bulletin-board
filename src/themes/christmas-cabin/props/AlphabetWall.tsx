"use client";

import { useEffect, useMemo } from "react";

import { ALPHABET_WALL, ROOM } from "../lib/layout";
import { letterPositions, makeAlphabetTexture } from "./textures";

/** Bulb colours, cycled along the string. */
const BULBS = ["#ff4a3a", "#3fd16a", "#3f8cff", "#ffd23f", "#ff6fcf"];

/**
 * The alphabet light wall on the right side wall, back towards the
 * corner — turn your head right to see it (BB-35):
 * painted letters A–Z with a coloured bulb over each, strung on a wire.
 *
 * BLOCK-OUT: the bulbs are lit but still. Flicker, spelling out words
 * and a sagging cable come in "Christmas Cabin: alphabet light wall",
 * with the timing in `lib/`.
 */
export function AlphabetWall() {
  const { z, y, width, height } = ALPHABET_WALL;
  const texture = useMemo(makeAlphabetTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const bulbs = useMemo(letterPositions, []);

  // One straight wire per row, through the bulb tops.
  const rows = useMemo(() => {
    const ys = [...new Set(bulbs.map((b) => b.y))];
    return ys.map((by) => by + 0.05);
  }, [bulbs]);

  return (
    // On the right wall, facing into the room (-x).
    <group position={[ROOM.halfWidth - 0.01, y, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {rows.map((wy) => (
        <mesh key={wy} position={[0, wy, 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, width - 0.1, 4]} />
          <meshBasicMaterial color="#1b1b16" />
        </mesh>
      ))}
      {bulbs.map((b, i) => (
        <mesh key={b.letter} position={[b.x, b.y, 0.05]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={BULBS[i % BULBS.length]} toneMapped={false} />
        </mesh>
      ))}
      {/* a little of their glow on the wall */}
      <pointLight position={[0, 0, 0.5]} intensity={0.6} distance={2.2} color="#ffd9b0" />
    </group>
  );
}

