"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { ROOM, SNOW_WINDOW } from "../lib/layout";
import { bulbTwinkle } from "../lib/garland";

const STRANDS = 3200;
const GLINTS = 40;
const LOOPS = 3;
/** How far the strands bristle out from the core. */
const FLUFF = 0.085;
const GOLDS = ["#f2cf5c", "#e0b040", "#ffe08a", "#c99a2e", "#f6d77a"];

/**
 * Gold tinsel swagged under the window sill in three loops (BB-35): a
 * fluffy rope of thin foil strands bristling out from a fine core, with
 * glints that twinkle where the strands catch the light, and a little
 * red velvet bow at each hook.
 */
export function Tinsel() {
  const { x, y, width, height } = SNOW_WINDOW;
  // Just under the sill, which sits below the window frame.
  const top = y - height / 2 - 0.13;
  const z = ROOM.backZ + 0.08;
  const left = x - width / 2;
  const span = width / LOOPS;

  const path = useMemo(() => {
    const p = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < LOOPS; i++) {
      const a = new THREE.Vector3(left + i * span, top, z);
      const b = new THREE.Vector3(left + (i + 1) * span, top, z);
      const sag = new THREE.Vector3((a.x + b.x) / 2, top - 0.2, z + 0.04);
      p.add(new THREE.QuadraticBezierCurve3(a, sag, b));
    }
    return p;
  }, [left, span, top, z]);

  const core = useMemo(() => new THREE.TubeGeometry(path, 90, 0.022, 6, false), [path]);
  const strand = useMemo(() => {
    // A thin foil strip, origin at its root so it bristles outwards.
    const g = new THREE.BoxGeometry(0.007, FLUFF, 0.0015);
    g.translate(0, FLUFF / 2, 0);
    return g;
  }, []);
  useEffect(
    () => () => {
      core.dispose();
      strand.dispose();
    },
    [core, strand]
  );

  const strands = useRef<THREE.InstancedMesh>(null);
  const glints = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const r = mulberry32(73);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();
    const place = (i: number, u: number, length: number, mesh: THREE.InstancedMesh, colour: boolean) => {
      const p = path.getPointAt(u);
      path.getTangentAt(u, tangent);
      // Two directions square to the rope; a strand points somewhere round it.
      n1.crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
      n2.crossVectors(tangent, n1).normalize();
      const a = r() * Math.PI * 2;
      dir.copy(n1).multiplyScalar(Math.cos(a)).addScaledVector(n2, Math.sin(a));
      // Tinsel hangs: a little droop, and a little along the rope.
      dir.addScaledVector(up, -0.25).addScaledVector(tangent, (r() - 0.5) * 0.6).normalize();
      o.position.copy(p);
      o.quaternion.setFromUnitVectors(up, dir);
      o.rotateY(r() * Math.PI);
      o.scale.set(1, length, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (colour) mesh.setColorAt(i, c.set(GOLDS[Math.floor(r() * GOLDS.length)]).multiplyScalar(0.8 + r() * 0.35));
      return dir;
    };
    if (strands.current) {
      for (let i = 0; i < STRANDS; i++) place(i, Math.min(1, (i + r()) / STRANDS), 0.6 + r() * 0.6, strands.current, true);
      strands.current.instanceMatrix.needsUpdate = true;
      if (strands.current.instanceColor) strands.current.instanceColor.needsUpdate = true;
    }
    if (glints.current) {
      for (let i = 0; i < GLINTS; i++) {
        const u = (i + r()) / GLINTS;
        const p = path.getPointAt(u);
        o.position.set(p.x + (r() - 0.5) * 0.03, p.y + (r() - 0.5) * 0.07, p.z + 0.03 + r() * 0.03);
        o.quaternion.identity();
        o.rotation.set(0, 0, (r() - 0.5) * 0.5);
        // A long thin diamond: a sparkle, not a speck.
        o.scale.set(0.45, 1.6, 0.3);
        o.updateMatrix();
        glints.current.setMatrixAt(i, o.matrix);
      }
      glints.current.instanceMatrix.needsUpdate = true;
    }
  }, [path]);

  // Glints catch the light and let it go again.
  const gold = useMemo(() => new THREE.Color("#fff1c0"), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    if (!glints.current) return;
    const t = clock.elapsedTime * 1.6;
    for (let i = 0; i < GLINTS; i++) {
      const v = bulbTwinkle(i + 50, t);
      // Mostly dark; only the top of the twinkle shows.
      const k = Math.max(0, (v - 0.72) / 0.28);
      glints.current.setColorAt(i, c.copy(gold).multiplyScalar(k * k * 1.6));
    }
    if (glints.current.instanceColor) glints.current.instanceColor.needsUpdate = true;
  });

  const hooks = useMemo(() => Array.from({ length: LOOPS + 1 }, (_, i) => left + i * span), [left, span]);

  return (
    <group>
      <mesh geometry={core}>
        <meshStandardMaterial color="#c99a2e" metalness={0.6} roughness={0.35} emissive="#5a3c0c" emissiveIntensity={0.5} />
      </mesh>
      <instancedMesh ref={strands} args={[strand, undefined, STRANDS]}>
        <meshStandardMaterial
          metalness={0.55}
          roughness={0.28}
          emissive="#8a6418"
          emissiveIntensity={0.6}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={glints} args={[undefined, undefined, GLINTS]}>
        {/* a four-point sparkle: two crossed thin diamonds */}
        <octahedronGeometry args={[0.009, 0]} />
        <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      {hooks.map((hx) => (
        <Bow key={hx} x={hx} y={top - 0.025} z={z + 0.045} />
      ))}
    </group>
  );
}

/** A small red velvet bow: two loops, a knot and two tails. */
function Bow({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.035, 0.008, 0]} rotation={[0, 0, s * 0.35]} scale={[1.5, 0.85, 0.5]}>
          <torusGeometry args={[0.022, 0.009, 6, 14]} />
          <meshStandardMaterial color="#a8161f" roughness={0.75} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 0.016, -0.04, 0]} rotation={[0, 0, s * 0.3]}>
          <boxGeometry args={[0.016, 0.065, 0.006]} />
          <meshStandardMaterial color="#951219" roughness={0.75} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.014, 10, 8]} />
        <meshStandardMaterial color="#b81d27" roughness={0.6} />
      </mesh>
    </group>
  );
}
