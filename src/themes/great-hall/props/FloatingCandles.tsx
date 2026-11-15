"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bob, candles, flicker } from "../lib/candles";
import { makeGlowTexture } from "./textures";

const FLAME = new THREE.Color("#ffc46a");

/**
 * The floating candles (BB-38): ivory candles hanging in the air above
 * the tables, bobbing gently, each with a flickering flame and a soft
 * halo. Positions and timing live in `lib/candles.ts`.
 *
 * BLOCK-OUT: plain cylinders and round flames. Drips, wicks and flame
 * shapes come in "Great Hall: floating candles".
 */
export function FloatingCandles() {
  const all = useMemo(() => candles(), []);
  const glowTex = useMemo(makeGlowTexture, []);
  const body = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.03, 0.032, 1, 10);
    g.translate(0, 0.5, 0); // origin at the base; scaled by length
    return g;
  }, []);
  const flameGeom = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const glowGeom = useMemo(() => new THREE.PlaneGeometry(0.42, 0.42), []);
  useEffect(
    () => () => {
      glowTex.dispose();
      body.dispose();
      flameGeom.dispose();
      glowGeom.dispose();
    },
    [glowTex, body, flameGeom, glowGeom]
  );

  const bodies = useRef<THREE.InstancedMesh>(null);
  const flames = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    flames.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    glows.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bodies.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    all.forEach((cd, i) => {
      const y = cd.y + bob(cd, t);
      const f = flicker(cd, t);
      o.position.set(cd.x, y, cd.z);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, cd.length, 1);
      o.updateMatrix();
      bodies.current?.setMatrixAt(i, o.matrix);
      o.position.set(cd.x, y + cd.length + 0.035, cd.z);
      o.scale.set(0.014, 0.032 * f, 0.014);
      o.updateMatrix();
      flames.current?.setMatrixAt(i, o.matrix);
      o.scale.setScalar(f);
      o.updateMatrix();
      glows.current?.setMatrixAt(i, o.matrix);
      glows.current?.setColorAt(i, c.copy(FLAME).multiplyScalar(0.55 * f));
    });
    for (const m of [bodies.current, flames.current, glows.current]) if (m) m.instanceMatrix.needsUpdate = true;
    if (glows.current?.instanceColor) glows.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[body, undefined, all.length]}>
        <meshStandardMaterial color="#f3ead6" roughness={0.6} emissive="#ffcf8a" emissiveIntensity={0.18} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[flameGeom, undefined, all.length]}>
        <meshBasicMaterial color="#ffe2a0" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[glowGeom, undefined, all.length]} renderOrder={2}>
        <meshBasicMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
