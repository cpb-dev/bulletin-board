"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { TREES } from "../lib/layout";

const TIERS = 5;
const BAUBLES_PER = 26;
const BAUBLE_COLOURS = ["#c9a24a", "#a8232b", "#e8d9b0", "#c9a24a", "#2a4f8a"];

/**
 * The Great Hall's Christmas trees (BB-38): towering firs in the far
 * corners and down the side walls, hung with gold, red and ivory baubles
 * and topped with a gold star.
 *
 * BLOCK-OUT: stacked cones. Real branches, frosting and lights come in
 * "Great Hall: Christmas trees".
 */
export function HallTrees() {
  const baubles = useRef<THREE.InstancedMesh>(null);
  const total = TREES.length * BAUBLES_PER;
  const star = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.1 : 0.24;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
  }, []);

  useLayoutEffect(() => {
    const r = mulberry32(12);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    TREES.forEach((t, ti) => {
      for (let k = 0; k < BAUBLES_PER; k++) {
        const y = 0.6 + r() * (t.height - 1.2);
        const k01 = (t.height - y) / t.height;
        const rad = t.radius * k01 * 0.95;
        const a = r() * Math.PI * 2;
        o.position.set(t.x + Math.cos(a) * rad, y, t.z + Math.sin(a) * rad);
        o.scale.setScalar(0.07 + r() * 0.04);
        o.updateMatrix();
        const i = ti * BAUBLES_PER + k;
        baubles.current?.setMatrixAt(i, o.matrix);
        baubles.current?.setColorAt(i, c.set(BAUBLE_COLOURS[Math.floor(r() * BAUBLE_COLOURS.length)]));
      }
    });
    if (baubles.current) {
      baubles.current.instanceMatrix.needsUpdate = true;
      if (baubles.current.instanceColor) baubles.current.instanceColor.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      {TREES.map((t) => (
        <group key={`${t.x},${t.z}`} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.18, 0.6, 8]} />
            <meshStandardMaterial color="#4a2e1c" roughness={0.9} />
          </mesh>
          {Array.from({ length: TIERS }, (_, i) => {
            const k = i / TIERS;
            const h = (t.height - 0.5) / TIERS;
            const y = 0.5 + i * h * 0.85;
            const r = t.radius * (1 - k * 0.8);
            return (
              <mesh key={i} position={[0, y + h * 0.75, 0]} castShadow>
                <coneGeometry args={[r, h * 1.5, 14]} />
                <meshStandardMaterial color={i % 2 ? "#1f4a2c" : "#245534"} roughness={0.85} />
              </mesh>
            );
          })}
          <mesh geometry={star} position={[0, t.height + 0.05, -0.03]}>
            <meshStandardMaterial color="#e8c35a" metalness={0.6} roughness={0.3} emissive="#a07a20" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={baubles} args={[undefined, undefined, total]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial metalness={0.5} roughness={0.25} />
      </instancedMesh>
    </group>
  );
}
