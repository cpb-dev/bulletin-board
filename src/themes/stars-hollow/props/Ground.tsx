"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { GAZEBO, GAZEBO_YAW, leafPiles, trees } from "../lib/layout";
import { useKit, useRepeated } from "./kit";
import { makeGrassTexture } from "./textures";
import { LEAF_COLOURS } from "./colours";

/** The disc of ground, inside the sky dome so it never cuts through it. */
const RADIUS = 57;

/**
 * The town green: mown grass, a paved path round the gazebo and one
 * leading up to its steps, fallen leaves scattered thickest under the
 * trees, and a few heaps where someone has been raking.
 *
 * Main Street's road and pavements are laid over this by `MainStreet`.
 */
export function Ground({ color }: { color: string }) {
  const grassBase = useMemo(() => makeGrassTexture(), []);
  useEffect(() => () => grassBase.dispose(), [grassBase]);
  const grass = useMemo(() => {
    const t = grassBase.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(RADIUS / 2.5, RADIUS / 2.5);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [grassBase]);
  useEffect(() => () => grass.dispose(), [grass]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[RADIUS, 72]} />
        <meshStandardMaterial color={color} map={grass} roughness={1} />
      </mesh>
      <Paths />
      <LeafLitter />
      {leafPiles().map((p) => (
        <LeafPile key={p.seed} {...p} />
      ))}
    </group>
  );
}

/** A ring of paving round the gazebo and a path up to its steps. */
function Paths() {
  const ring = useRepeated((k) => k.paving, 14, 1);
  const walk = useRepeated((k) => k.paving, 1, 5);
  const inner = GAZEBO.radius + 0.35;
  return (
    <group position={[GAZEBO.x, 0, GAZEBO.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <ringGeometry args={[inner, inner + 1.4, 48]} />
        <meshStandardMaterial color="#cfcac0" map={ring} roughness={0.95} />
      </mesh>
      {/* the walk up to the steps, heading out towards the viewer */}
      <group rotation={[0, GAZEBO_YAW, 0]}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.011, inner + 5]}
          receiveShadow
        >
          <planeGeometry args={[1.6, 10]} />
          <meshStandardMaterial color="#cfcac0" map={walk} roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Fallen leaves lying on the grass: one instanced mesh, each leaf a
 * small quad with the leaf's outline in its alpha, tinted one of the
 * autumn colours. Half are scattered anywhere on the green, half
 * dropped close under a tree, which is where they really collect.
 */
function LeafLitter() {
  const kit = useKit();
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 1400;

  const spots = useMemo(() => {
    const rand = mulberry32(99);
    const crowns = trees();
    const out: { x: number; z: number; rot: number; s: number; tilt: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      let x: number;
      let z: number;
      if (i % 2 === 0) {
        const t = crowns[Math.floor(rand() * crowns.length)];
        const reach = t.species === "street" ? 1.4 : 3.8;
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * reach * t.scale;
        x = t.x + Math.cos(a) * d;
        z = t.z + Math.sin(a) * d;
      } else {
        x = -18 + rand() * 24;
        z = -24 + rand() * 27;
      }
      out.push({ x, z, rot: rand() * Math.PI * 2, s: 0.1 + rand() * 0.08, tilt: (rand() - 0.5) * 0.4 });
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const rand = mulberry32(7);
    spots.forEach((p, i) => {
      e.set(-Math.PI / 2 + p.tilt * 0.3, 0, p.rot, "XYZ");
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(p.x, 0.02 + (i % 7) * 0.0015, p.z),
        q,
        new THREE.Vector3(p.s, p.s, p.s)
      );
      mesh.setMatrixAt(i, m);
      col.set(LEAF_COLOURS[Math.floor(rand() * LEAF_COLOURS.length)]);
      // faded, some of them, lying in the sun
      col.lerp(new THREE.Color("#c9a77a"), rand() * 0.25);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [spots]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} receiveShadow>
      <planeGeometry args={[1, 1]} />
      <meshLambertMaterial map={kit.leaf} alphaTest={0.5} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/**
 * A heap of raked leaves: a low mound in leaf colour, with loose leaves
 * stuck all over its surface so the silhouette is ragged, not a dome.
 */
export function LeafPile({ x, z, r, seed }: { x: number; z: number; r: number; seed: number }) {
  const kit = useKit();
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 260;

  const mound = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const rand = mulberry32(seed);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const n = 1 + (rand() - 0.5) * 0.18;
      pos.setXYZ(i, vx * n, vy * n, vz * n);
    }
    g.computeVertexNormals();
    return g;
  }, [seed]);
  useEffect(() => () => mound.dispose(), [mound]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = mulberry32(seed * 17);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const h = r * 0.55;
    for (let i = 0; i < COUNT; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r * 1.08;
      const px = Math.cos(a) * d;
      const pz = Math.sin(a) * d;
      const k = Math.min(1, d / r);
      const py = Math.sqrt(Math.max(0, 1 - k * k)) * h + 0.03;
      e.set(-Math.PI / 2 + (rand() - 0.5) * 1.6, (rand() - 0.5) * 0.8, rand() * Math.PI * 2);
      q.setFromEuler(e);
      const s = 0.16 + rand() * 0.1;
      m.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      col.set(LEAF_COLOURS[Math.floor(rand() * LEAF_COLOURS.length)]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [r, seed]);

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={mound} scale={[r, r * 0.52, r]} castShadow receiveShadow>
        <meshToonMaterial color="#8f4a26" map={kit.foliage} gradientMap={kit.leafRamp} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} castShadow>
        <planeGeometry args={[1, 1]} />
        <meshLambertMaterial map={kit.leaf} alphaTest={0.5} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
