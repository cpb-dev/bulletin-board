"use client";

import * as THREE from "three";

/**
 * A web strung across one corner of an opening on the haunted house.
 *
 * The texture draws its hub at the canvas's top-left, so the plane is
 * spun to swing that hub round to whichever corner is asked for, then
 * offset by half its size so the hub lands exactly on the corner
 * rather than half a web away from it.
 *
 * Lives in the Haunted Hollow scene only. The board's own cobwebs are
 * a different thing and live in `Cobweb.tsx`.
 */

export type Corner = "tl" | "tr" | "bl" | "br";

/** Rotation that moves the texture's hub to the requested corner. */
const CORNER_SPIN: Record<Corner, number> = {
  tl: 0,
  tr: -Math.PI / 2,
  br: Math.PI,
  bl: Math.PI / 2,
};
/** Which way the plane's centre sits from that corner, per half-size. */
const CORNER_SHIFT: Record<Corner, [number, number]> = {
  tl: [1, -1],
  tr: [-1, -1],
  br: [-1, 1],
  bl: [1, 1],
};

export function CornerWeb({
  texture,
  x,
  y,
  z,
  size,
  corner,
  opacity = 0.85,
  color = "#ffffff",
}: {
  texture: THREE.Texture;
  x: number;
  y: number;
  z: number;
  size: number;
  corner: Corner;
  opacity?: number;
  /** Tints the strands. A web over a lit pane has to read dark. */
  color?: string;
}) {
  const [sx, sy] = CORNER_SHIFT[corner];
  return (
    <mesh
      position={[x + (sx * size) / 2, y + (sy * size) / 2, z]}
      rotation={[0, 0, CORNER_SPIN[corner]]}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
