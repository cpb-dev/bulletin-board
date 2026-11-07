"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fringe, RUG } from "../../lib/rug";
import { makePileTexture, makeRugTexture } from "./textures";

/** Pile: how deep it is and how many shells build it up. */
const PILE = { depth: 0.022, shells: 8, base: 0.012 } as const;
/** Pile tufts per metre, so the wool's scale doesn't depend on the rug's. */
const TUFTS_PER_METRE = 1.4;

/**
 * The rug (BB-35): a big Beni Ourain-style Berber wool shag, cream with
 * a hand-knotted charcoal lattice, a few rust and green flecks, and
 * fringe at both short ends.
 *
 * The pile is built from shells: the rug's face drawn several times,
 * each a few millimetres higher and keeping only the taller tufts, so it
 * reads as deep, soft wool rather than a printed mat. Lower shells are
 * darker — the shade down between the fibres.
 */
export function Rug() {
  const face = useMemo(makeRugTexture, []);
  const pile = useMemo(() => {
    const t = makePileTexture();
    t.repeat.set(RUG.width * TUFTS_PER_METRE, RUG.depth * TUFTS_PER_METRE);
    return t;
  }, []);
  useEffect(
    () => () => {
      face.dispose();
      pile.dispose();
    },
    [face, pile]
  );

  const shells = useMemo(
    () =>
      Array.from({ length: PILE.shells }, (_, i) => {
        const t = (i + 1) / PILE.shells;
        return {
          y: PILE.base + t * PILE.depth,
          // Keep fewer, taller tufts the higher the shell.
          alphaTest: 0.15 + t * 0.5,
          // Deeper in the pile is in its own shade, but only just: wool
          // tips are the same colour as the rest of the fibre.
          shade: 0.9 + t * 0.08,
        };
      }),
    []
  );

  return (
    <group position={[RUG.x, 0, RUG.z]}>
      {/* the backing: the densest, darkest layer of wool */}
      <mesh position={[0, PILE.base / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[RUG.width, PILE.base, RUG.depth]} />
        <meshStandardMaterial map={face} color="#e6e0d6" roughness={1} />
      </mesh>
      {shells.map((s) => (
        <mesh key={s.y} position={[0, s.y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[RUG.width, RUG.depth]} />
          <meshStandardMaterial
            map={face}
            alphaMap={pile}
            alphaTest={s.alphaTest}
            color={new THREE.Color(s.shade, s.shade, s.shade)}
            roughness={1}
          />
        </mesh>
      ))}
      <Fringe />
    </group>
  );
}

/** Knotted tassels along both short ends. One instanced mesh. */
function Fringe() {
  const ends = useMemo(() => [-1, 1].flatMap((side) => fringe(side > 0 ? 2 : 3).map((t) => ({ ...t, side }))), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    ends.forEach((t, i) => {
      // Lie flat on the floor, pointing out from the rug's end.
      const x = t.side * (RUG.width / 2 + t.length / 2 - 0.01);
      const z = t.along * RUG.depth;
      o.position.set(x, 0.006, z);
      o.rotation.set(0, t.lean * 0.6, 0);
      o.scale.set(t.length, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [ends]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, ends.length]} receiveShadow>
      <boxGeometry args={[1, 0.008, 0.016]} />
      <meshStandardMaterial color="#e3d8c4" roughness={1} />
    </instancedMesh>
  );
}
