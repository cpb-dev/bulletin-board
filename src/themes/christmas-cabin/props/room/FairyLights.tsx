"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fairyLightBulbs } from "../../lib/fairylights";
import { ROOM } from "../../lib/layout";

/**
 * Warm fairy lights swagged round the top of the room (BB-35): the
 * single thing every cosy-Christmas room has. Bulbs are one instanced
 * mesh on a thin dark cable; two soft point lights carry their glow
 * onto the walls and ceiling.
 */
export function FairyLights() {
  const bulbs = useMemo(fairyLightBulbs, []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const cable = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(bulbs.map((b) => new THREE.Vector3(b.x, b.y + 0.02, b.z)));
    return new THREE.TubeGeometry(curve, bulbs.length * 3, 0.004, 4, false);
  }, [bulbs]);
  useEffect(() => () => cable.dispose(), [cable]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    bulbs.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Warm white, with every few a touch more amber.
      m.setColorAt(i, i % 4 === 0 ? c.set("#ffb45a") : c.set("#ffd99a"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [bulbs]);

  const glowY = ROOM.height - 0.45;
  return (
    <group>
      <mesh geometry={cable}>
        <meshBasicMaterial color="#2a1d14" />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight position={[-2.6, glowY, ROOM.backZ + 0.5]} intensity={1.6} distance={4.5} color="#ffb766" />
      <pointLight position={[2.6, glowY, ROOM.backZ + 0.5]} intensity={1.6} distance={4.5} color="#ffb766" />
    </group>
  );
}
