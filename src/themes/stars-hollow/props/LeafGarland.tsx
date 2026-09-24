"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import type { ThemeBoardDecor } from "@/themes/types";
import { Garland, swag } from "./Garland";
import { makeLeafTexture } from "./textures";

/**
 * Stars Hollow's board decor: an autumn leaf garland swagged across the
 * top of the board in two loops, its ends trailing down the sides, with
 * warm fairy bulbs threaded through it — the same lights as round
 * Luke's windows.
 *
 * It hangs from the board rather than the scene, so it brings its own
 * leaf texture instead of reading the scene's kit.
 */
export const LeafGarland: ThemeBoardDecor = () => {
  const leaf = useMemo(makeLeafTexture, []);
  useEffect(() => () => leaf.dispose(), [leaf]);

  const top = BOARD.centerY + BOARD.height / 2 + 0.1;
  const z = BOARD_SURFACE_Z + 0.06;
  const half = BOARD.width / 2 + 0.08;

  const curves = useMemo(() => {
    const L = new THREE.Vector3(-half, top, z);
    const M = new THREE.Vector3(0, top + 0.02, z);
    const R = new THREE.Vector3(half, top, z);
    return [
      swag(L, M, 0.2),
      swag(M, R, 0.2),
      // tails down each side
      new THREE.QuadraticBezierCurve3(
        L.clone(),
        new THREE.Vector3(-half - 0.06, top - 0.3, z),
        new THREE.Vector3(-half - 0.02, top - 0.6, z)
      ),
      new THREE.QuadraticBezierCurve3(
        R.clone(),
        new THREE.Vector3(half + 0.06, top - 0.3, z),
        new THREE.Vector3(half + 0.02, top - 0.6, z)
      ),
    ];
  }, [half, top, z]);

  return (
    <group>
      <Garland curves={curves} perMetre={70} size={0.12} thickness={0.045} seed={22} map={leaf} />
      <Bulbs curves={curves.slice(0, 2)} />
    </group>
  );
};

/** Small warm bulbs threaded along the swags. */
function Bulbs({ curves }: { curves: THREE.Curve<THREE.Vector3>[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(
    () =>
      curves.flatMap((c) =>
        Array.from({ length: 9 }, (_, i) => c.getPointAt((i + 0.5) / 9).add(new THREE.Vector3(0, -0.02, 0.05)))
      ),
    [curves]
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[0.022, 8, 6]} />
      <meshBasicMaterial color="#ffdf9a" toneMapped={false} />
    </instancedMesh>
  );
}
