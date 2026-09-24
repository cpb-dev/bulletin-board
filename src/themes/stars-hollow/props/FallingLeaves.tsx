"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { leafPose, makeLeaves } from "../lib/leaves";
import { trees } from "../lib/layout";
import { planTree } from "../lib/tree";
import { useKit } from "./kit";
import { LEAF_COLOURS } from "./colours";

/**
 * Leaves drifting down out of the trees, all the time, a few at once.
 * One instanced mesh; the motion is `lib/leaves.ts`.
 */
export function FallingLeaves({ count = 70 }: { count?: number }) {
  const kit = useKit();
  const ref = useRef<THREE.InstancedMesh>(null);

  const leaves = useMemo(() => {
    const sources = trees()
      .filter((t) => t.species !== "sycamore")
      .map((t) => {
        const plan = planTree(t.species, t.seed);
        return {
          x: t.x,
          z: t.z,
          y: plan.height * t.scale * 0.72,
          spread: t.species === "street" ? 0.9 : 2.2 * t.scale,
        };
      });
    return makeLeaves(sources, count, 17);
  }, [count]);

  const colours = useMemo(() => {
    const c = new THREE.Color();
    return leaves.map((_, i) => c.set(LEAF_COLOURS[i % LEAF_COLOURS.length]).clone());
  }, [leaves]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const painted = useRef(false);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    leaves.forEach((leaf, i) => {
      const pose = leafPose(leaf, t);
      e.set(pose.rx, pose.ry, pose.rz);
      q.setFromEuler(e);
      p.set(pose.x, pose.y, pose.z);
      s.setScalar(0.17 * pose.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (!painted.current) {
      colours.forEach((c, i) => mesh.setColorAt(i, c));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      painted.current = true;
    }
  });

  return (
    // The leaves move every frame and range over the whole square, so
    // the bounding sphere is never worth computing: never cull.
    <instancedMesh ref={ref} args={[undefined, undefined, leaves.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshLambertMaterial map={kit.leaf} alphaTest={0.5} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
