"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOM } from "../../lib/layout";
import { makeGrainStrip, makePlankTextures } from "./textures";

const TILE = 3;
/** Where the beams cross the room, front to back. */
export const BEAM_Z = [-1.45, 0.35, 2.15, 3.95, 5.6];
const BEAM = { width: 0.22, depth: 0.26 } as const;

/**
 * The ceiling (BB-35): light oak tongue-and-groove boards running across
 * the room, under chunky dark walnut beams — the modern take on cabin
 * beams — with small warm downlights recessed between them.
 */
export function Ceiling() {
  const { map, bump } = useMemo(
    () =>
      makePlankTextures(
        512,
        { rows: 22, minLength: 0.4, maxLength: 0.8, minStagger: 0.15, seed: 19 },
        { base: "#c48a52", toneSpread: 0.8, grainStrength: 1, knots: 0.3 },
        TILE
      ),
    []
  );
  const beamGrain = useMemo(() => makeGrainStrip("#5c3c27", 61, 0.14), []);
  const { halfWidth, backZ, frontZ, height } = ROOM;
  const width = halfWidth * 2;
  const depth = frontZ - backZ;
  useMemo(() => {
    // Boards run across the room: turn the tile a quarter.
    for (const t of [map, bump]) {
      t.rotation = Math.PI / 2;
      t.repeat.set(depth / TILE, width / TILE);
    }
  }, [map, bump, width, depth]);
  useEffect(
    () => () => {
      map.dispose();
      bump.dispose();
      beamGrain.dispose();
    },
    [map, bump, beamGrain]
  );

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, (frontZ + backZ) / 2]}>
        <planeGeometry args={[width, depth]} />
        {/* Nothing in the scene shines upward, so the boards glow faintly
            with their own colour: a stand-in for the warm light a real
            ceiling gets bounced up from the room. */}
        <meshStandardMaterial
          map={map}
          bumpMap={bump}
          bumpScale={1}
          roughness={0.7}
          emissiveMap={map}
          emissive="#ffffff"
          emissiveIntensity={0.16}
        />
      </mesh>
      <Beams grain={beamGrain} />
      <Downlights />
    </group>
  );
}

function Beams({ grain }: { grain: THREE.Texture }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    BEAM_Z.forEach((z, i) => {
      o.position.set(0, ROOM.height - BEAM.depth / 2, z);
      // The strip's grain runs down its length: lay it along the beam.
      o.rotation.set(0, 0, Math.PI / 2);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, []);
  // No castShadow: the key light comes through the ceiling, and beam
  // shadows would lie in diagonal bands down the walls.
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, BEAM_Z.length]} receiveShadow>
      <boxGeometry args={[BEAM.depth, ROOM.halfWidth * 2, BEAM.width]} />
      <meshStandardMaterial
        map={grain}
        roughness={0.55}
        emissiveMap={grain}
        emissive="#ffffff"
        emissiveIntensity={0.18}
      />
    </instancedMesh>
  );
}

/** Where the recessed downlights sit, between the beams. */
export const DOWNLIGHTS: [number, number][] = [
  [-3.6, -0.55],
  [0, -0.55],
  [3.7, -0.55],
  [-2.4, 3.05],
  [2.4, 3.05],
];

/** Small recessed cans glowing warm in the boards. */
function Downlights() {
  return (
    <group>
      {DOWNLIGHTS.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, ROOM.height - 0.005, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.06, 0.08, 24]} />
            <meshStandardMaterial color="#2b2522" roughness={0.4} metalness={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
            <circleGeometry args={[0.06, 24]} />
            <meshBasicMaterial color="#ffe2b8" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
