"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { FIREPLACE } from "../../lib/layout";
import { FACE_Z, MANTEL, OPENING, stockingOutline } from "../../lib/fireplace";
import { makeGrainStrip } from "../room/textures";
import { makeCuffTexture, makeStockingKnit } from "./textures";

/** The two stockings: one each, over the stone either side of the fire. */
const STOCKINGS = [
  { initial: "K", body: "#b3333a", stripe: "#f2e6cf", thread: "#2f5a3a", x: -(OPENING.width / 2 + 0.24), toeLeft: true },
  { initial: "C", body: "#3a66b8", stripe: "#f2e6cf", thread: "#3a66b8", x: OPENING.width / 2 + 0.24, toeLeft: false },
];

/** The mantel's front edge, which everything hangs from. */
const FRONT_Z = FACE_Z - MANTEL.depth / 2 + MANTEL.overhang + MANTEL.depth / 2;

/**
 * The mantel (BB-35): a chunky reclaimed-timber beam, a garland of
 * greenery and berries along it, and two knitted stockings, one each,
 * hung from brass hooks with their initials stitched on the fur cuffs.
 * The stockings sway a touch in the fire's warm draught.
 */
export function Mantel() {
  const grain = useMemo(() => makeGrainStrip("#5a3a26", 87, 0.16), []);
  useEffect(() => () => grain.dispose(), [grain]);
  const length = FIREPLACE.width + 0.36;
  const beamZ = FACE_Z - MANTEL.depth / 2 + MANTEL.overhang;

  return (
    <group>
      <mesh position={[0, MANTEL.y, beamZ]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <boxGeometry args={[MANTEL.thickness, length, MANTEL.depth]} />
        <meshStandardMaterial map={grain} roughness={0.6} />
      </mesh>
      <Garland length={length - 0.1} y={MANTEL.y + MANTEL.thickness / 2 + 0.03} z={beamZ + 0.05} />
      {STOCKINGS.map((s, i) => (
        <Stocking key={s.initial} {...s} index={i} />
      ))}
    </group>
  );
}

/** Greenery along the mantel: clusters of needles with red berries. */
function Garland({ length, y, z }: { length: number; y: number; z: number }) {
  const sprigs = 70;
  const berries = 22;
  const green = useRef<THREE.InstancedMesh>(null);
  const red = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const r = mulberry32(61);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    if (green.current) {
      for (let i = 0; i < sprigs; i++) {
        o.position.set((i / (sprigs - 1) - 0.5) * length + (r() - 0.5) * 0.03, y + (r() - 0.5) * 0.04, z + (r() - 0.5) * 0.1);
        o.rotation.set(r() * 3, r() * 3, r() * 3);
        o.scale.set(0.05 + r() * 0.03, 0.02, 0.09 + r() * 0.05);
        o.updateMatrix();
        green.current.setMatrixAt(i, o.matrix);
        green.current.setColorAt(i, c.setHSL(0.36 + r() * 0.05, 0.45, 0.16 + r() * 0.1));
      }
      green.current.instanceMatrix.needsUpdate = true;
      if (green.current.instanceColor) green.current.instanceColor.needsUpdate = true;
    }
    if (red.current) {
      for (let i = 0; i < berries; i++) {
        o.position.set((r() - 0.5) * length, y + 0.02 + r() * 0.03, z + 0.03 + r() * 0.06);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(0.014 + r() * 0.008);
        o.updateMatrix();
        red.current.setMatrixAt(i, o.matrix);
      }
      red.current.instanceMatrix.needsUpdate = true;
    }
  }, [length, y, z]);
  return (
    <group>
      <instancedMesh ref={green} args={[undefined, undefined, sprigs]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={red} args={[undefined, undefined, berries]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#b8141c" roughness={0.35} />
      </instancedMesh>
    </group>
  );
}

function Stocking({
  initial,
  body,
  stripe,
  thread,
  x,
  toeLeft,
  index,
}: {
  initial: string;
  body: string;
  stripe: string;
  thread: string;
  x: number;
  toeLeft: boolean;
  index: number;
}) {
  const knit = useMemo(() => {
    const t = makeStockingKnit(body, stripe);
    // The extruded shape's UVs are its outline in metres.
    t.repeat.set(1 / 0.16, 1 / 0.24);
    return t;
  }, [body, stripe]);
  const cuffTex = useMemo(() => makeCuffTexture(initial, thread), [initial, thread]);
  const geometry = useMemo(() => {
    const pts = stockingOutline();
    const shape = new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(px, py)));
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.02,
      bevelSegments: 4,
      curveSegments: 8,
    });
    g.translate(-0.085, 0, -0.015);
    return g;
  }, []);
  useEffect(
    () => () => {
      knit.dispose();
      cuffTex.dispose();
      geometry.dispose();
    },
    [knit, cuffTex, geometry]
  );

  const sway = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (sway.current) sway.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + index * 2) * 0.025;
  });

  const top = MANTEL.y - MANTEL.thickness / 2 - 0.02;
  return (
    <group position={[x, top, FRONT_Z + 0.06]}>
      {/* brass hook into the mantel's front */}
      <mesh position={[0, 0.02, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 6, 12, Math.PI * 1.3]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.3} />
      </mesh>
      <group ref={sway}>
        {/* the hanging loop */}
        <mesh position={[0, -0.02, 0]}>
          <torusGeometry args={[0.025, 0.005, 6, 12]} />
          <meshStandardMaterial color="#e9dcc4" roughness={1} />
        </mesh>
        {/* the knitted body, toe out to the side */}
        <mesh geometry={geometry} position={[0, -0.12, 0]} scale={[toeLeft ? -1 : 1, 1, 1]} castShadow>
          <meshStandardMaterial map={knit} roughness={1} side={toeLeft ? THREE.BackSide : THREE.FrontSide} />
        </mesh>
        {/* the fur cuff with its initial */}
        <mesh position={[0, -0.075, 0]} castShadow>
          <boxGeometry args={[0.24, 0.1, 0.1]} />
          <meshStandardMaterial color="#efe9df" roughness={1} />
        </mesh>
        <mesh position={[0, -0.075, 0.051]}>
          <planeGeometry args={[0.24, 0.1]} />
          <meshStandardMaterial map={cuffTex} roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
