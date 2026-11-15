"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import type { ThemeBoardDecor } from "@/themes/types";
import { bulbTwinkle } from "../lib/garland";
import { makeBulbGlowTexture } from "./textures";

/** Warm white most of the way, with a few coloured bulbs, like the tree. */
const BULBS = ["#ffd9a0", "#ff5a46", "#ffd9a0", "#ffc94a", "#ffd9a0", "#4fd27a"];
const SPRIGS = 520;
const BERRIES = 46;
const LIGHTS = 26;
/** How far the greenery bushes out from the swag's centre line. */
const BUSH = 0.1;

/**
 * The Christmas Cabin's board decor (BB-35): a pine garland swagged
 * across the top of the board in two loops, made the same way as the one
 * on the mantel: a dense tangle of needle sprigs round a dark core, with
 * clusters of red berries, and a string of fairy lights tucked into it
 * that twinkle gently (timing in `lib/garland.ts`).
 */
export const BoardGarland: ThemeBoardDecor = () => {
  const top = BOARD.centerY + BOARD.height / 2 + 0.06;
  const z = BOARD_SURFACE_Z + 0.07;
  const half = BOARD.width / 2 + 0.05;

  const curve = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const L = new THREE.Vector3(-half, top, z);
    const M = new THREE.Vector3(0, top, z);
    const R = new THREE.Vector3(half, top, z);
    path.add(new THREE.QuadraticBezierCurve3(L, new THREE.Vector3(-half / 2, top - 0.4, z), M));
    path.add(new THREE.QuadraticBezierCurve3(M, new THREE.Vector3(half / 2, top - 0.4, z), R));
    return path;
  }, [half, top, z]);

  // A thin dark core, so gaps between the sprigs read as depth, not board.
  const core = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.05, 6, false), [curve]);
  const glowGeom = useMemo(() => new THREE.PlaneGeometry(0.34, 0.34), []);
  const glowTex = useMemo(makeBulbGlowTexture, []);
  useEffect(
    () => () => {
      core.dispose();
      glowGeom.dispose();
      glowTex.dispose();
    },
    [core, glowGeom, glowTex]
  );

  const green = useRef<THREE.InstancedMesh>(null);
  const red = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);

  // Where the lights sit: along the swag, nestled just in front of the greenery.
  const lights = useMemo(() => {
    const r = mulberry32(7);
    return Array.from({ length: LIGHTS }, (_, i) => {
      const p = curve.getPointAt((i + 0.5) / LIGHTS);
      return new THREE.Vector3(p.x, p.y + (r() - 0.5) * 0.09, p.z + 0.1);
    });
  }, [curve]);
  const colours = useMemo(() => lights.map((_, i) => new THREE.Color(BULBS[i % BULBS.length])), [lights]);

  useLayoutEffect(() => {
    const r = mulberry32(61);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    if (green.current) {
      for (let i = 0; i < SPRIGS; i++) {
        const p = curve.getPointAt(Math.min(1, (i + r()) / SPRIGS));
        // Bushed out round the line, more in front than behind.
        const a = r() * Math.PI * 2;
        const d = BUSH * Math.sqrt(r());
        o.position.set(p.x + (r() - 0.5) * 0.03, p.y + Math.cos(a) * d, p.z + Math.abs(Math.sin(a)) * d * 0.8);
        o.rotation.set(r() * 3, r() * 3, r() * 3);
        o.scale.set(0.045 + r() * 0.03, 0.016, 0.085 + r() * 0.05);
        o.updateMatrix();
        green.current.setMatrixAt(i, o.matrix);
        green.current.setColorAt(i, c.setHSL(0.36 + r() * 0.05, 0.45, 0.12 + r() * 0.1));
      }
      green.current.instanceMatrix.needsUpdate = true;
      if (green.current.instanceColor) green.current.instanceColor.needsUpdate = true;
    }
    if (red.current) {
      // Berries in little clusters of three.
      for (let i = 0; i < BERRIES; i += 3) {
        const p = curve.getPointAt(r());
        const cy = p.y + (r() - 0.5) * 0.1;
        for (let k = 0; k < 3 && i + k < BERRIES; k++) {
          o.position.set(p.x + (r() - 0.5) * 0.05, cy + (r() - 0.5) * 0.04, p.z + 0.07 + r() * 0.03);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(0.016 + r() * 0.008);
          o.updateMatrix();
          red.current.setMatrixAt(i + k, o.matrix);
        }
      }
      red.current.instanceMatrix.needsUpdate = true;
    }
    lights.forEach((p, i) => {
      o.position.copy(p);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      bulbs.current?.setMatrixAt(i, o.matrix);
      o.position.z += 0.01;
      o.updateMatrix();
      glows.current?.setMatrixAt(i, o.matrix);
    });
    if (bulbs.current) bulbs.current.instanceMatrix.needsUpdate = true;
    if (glows.current) glows.current.instanceMatrix.needsUpdate = true;
  }, [curve, lights]);

  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < LIGHTS; i++) {
      const v = bulbTwinkle(i, t);
      c.copy(colours[i]).multiplyScalar(0.35 + 0.95 * v);
      bulbs.current?.setColorAt(i, c);
      c.copy(colours[i]).multiplyScalar(v * v * 1.5);
      glows.current?.setColorAt(i, c);
    }
    if (bulbs.current?.instanceColor) bulbs.current.instanceColor.needsUpdate = true;
    if (glows.current?.instanceColor) glows.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={core}>
        <meshStandardMaterial color="#14301c" roughness={0.9} />
      </mesh>
      <instancedMesh ref={green} args={[undefined, undefined, SPRIGS]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={red} args={[undefined, undefined, BERRIES]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#b8141c" roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, LIGHTS]}>
        <sphereGeometry args={[0.027, 8, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[glowGeom, undefined, LIGHTS]} renderOrder={2}>
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
};
