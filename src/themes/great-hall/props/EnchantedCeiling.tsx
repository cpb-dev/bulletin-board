"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";
import { HALL } from "../lib/layout";
import { snowFlake, SNOW } from "../lib/snow";
import { makeCeilingSky } from "./textures";

/**
 * The enchanted ceiling (BB-38): the sky outside, painted across the top
 * of the hall — winter cloud by day, a sunset in the evening, stars at
 * night — with snow falling from it that melts away long before it
 * reaches anyone's head. Snow timing lives in `lib/snow.ts`.
 *
 * BLOCK-OUT: a flat painted sky. Drifting cloud, twinkling stars and
 * rafters fading into the sky come in "Great Hall: enchanted ceiling".
 */
export function EnchantedCeiling({ phase }: { phase: DayPhase }) {
  const { halfWidth, backZ, frontZ, height } = HALL;
  const sky = useMemo(() => makeCeilingSky(phase), [phase]);
  useEffect(() => () => sky.dispose(), [sky]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SNOW.count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SNOW.count * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const seeds = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: SNOW.count }, () => ({ x: r(), z: r(), phase: r() }));
  }, []);

  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < SNOW.count; i++) {
      const f = snowFlake(seeds[i], t);
      pos.setXYZ(i, f.x, f.y, f.z);
      col.setXYZ(i, f.alpha, f.alpha, f.alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[0, height, (backZ + frontZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfWidth * 2, frontZ - backZ]} />
        <meshBasicMaterial map={sky} side={THREE.DoubleSide} toneMapped={false} fog={false} />
      </mesh>
      <points ref={points} geometry={geometry}>
        {/* additive: a darker flake is a fainter one, so they fade as they fall */}
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
