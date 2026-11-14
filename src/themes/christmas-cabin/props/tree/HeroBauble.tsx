"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ROOM_CAMERA, TREE } from "../../lib/layout";
import { HERO_BAUBLE, heroBaublePosition } from "../../lib/tree";
import { makeHeroFaceTexture } from "./textures";

/** How much of the sphere the face covers, across and up, in radians. */
const FACE = { across: 1.5, up: 1.25 } as const;

/**
 * The special bauble (BB-35): a big deep-red glass bauble hung in the
 * middle of the tree, with "C+K" in gold script inside a gold ring. It
 * turns to face the room, so the letters are always read the right way.
 *
 * The lettering is on a cap of the sphere a hair larger than the glass,
 * not a flat decal — so it sits exactly on the curve and never pokes out
 * past the bauble's edge.
 */
export function HeroBauble() {
  const at = heroBaublePosition();
  const r = HERO_BAUBLE.size;
  const face = useMemo(makeHeroFaceTexture, []);
  const cap = useMemo(
    () =>
      // A cap centred on +z: phi runs round from x towards z, theta down
      // from the top, so the front is phi = pi/2, theta = pi/2.
      new THREE.SphereGeometry(
        r * 1.004,
        48,
        32,
        Math.PI / 2 - FACE.across / 2,
        FACE.across,
        Math.PI / 2 - FACE.up / 2,
        FACE.up
      ),
    [r]
  );
  useEffect(
    () => () => {
      face.dispose();
      cap.dispose();
    },
    [face, cap]
  );

  // Turn its front (+z) to the room camera.
  const wx = TREE.x + at.x;
  const wz = TREE.z + at.z;
  const facing = Math.atan2(ROOM_CAMERA.x - wx, ROOM_CAMERA.z - wz);

  return (
    <group position={[at.x, at.y, at.z]} rotation={[0, facing, 0]}>
      {/* the glass */}
      <mesh castShadow>
        <sphereGeometry args={[r, 40, 28]} />
        <meshPhysicalMaterial
          color="#9c0f1c"
          metalness={0.35}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* the C+K face, sitting on the glass */}
      <mesh geometry={cap}>
        <meshStandardMaterial
          map={face}
          transparent
          alphaTest={0.08}
          metalness={0.8}
          roughness={0.25}
          emissive="#5a3a08"
          emissiveMap={face}
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* gold cap and hanging loop */}
      <mesh position={[0, r * 0.98, 0]}>
        <cylinderGeometry args={[r * 0.24, r * 0.28, r * 0.26, 16]} />
        <meshStandardMaterial color="#d9b04e" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, r * 1.22, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[r * 0.12, r * 0.03, 8, 16]} />
        <meshStandardMaterial color="#d9b04e" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* a little warm light of its own, so it glows among the needles */}
      <pointLight position={[0, 0, r * 2.2]} intensity={0.35} distance={0.6} decay={2} color="#ffcf8a" />
    </group>
  );
}
