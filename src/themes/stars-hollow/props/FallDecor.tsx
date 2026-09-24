"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { useKit, useRepeated } from "./kit";
import { IRON } from "./colours";

/**
 * The town dressed for October — no pumpkins, just the rest of it:
 * bundles of dried corn stalks tied round posts, hay bales, pots of
 * mums in rust and gold, and the black iron benches round the square.
 *
 * Every prop's origin is where it meets the ground.
 */

/* ------------------------------------------------------------------ */
/*  Corn stalks                                                        */
/* ------------------------------------------------------------------ */

/**
 * A sheaf of dried corn stalks, splayed at the foot and the head and
 * tied in at the waist, with long dry leaves hanging off the tops. It
 * stands round its origin, so it can be tied round a lamp post.
 */
export function CornStalks({ height = 1.6, seed = 1, radius = 0.16 }: { height?: number; seed?: number; radius?: number }) {
  const kit = useKit();
  const stalks = useRef<THREE.InstancedMesh>(null);
  const blades = useRef<THREE.InstancedMesh>(null);
  const STALKS = 26;
  const BLADES = STALKS;
  const waist = height * 0.47;

  const plan = useMemo(() => {
    const rand = mulberry32(seed * 97);
    const stalk: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const blade: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    for (let i = 0; i < STALKS; i++) {
      const a = (i / STALKS) * Math.PI * 2 + rand() * 0.3;
      const h = height * (0.85 + rand() * 0.25);
      // Skewed rather than splayed: each stalk runs from one side of
      // the foot to a point round the other way at the head, so the
      // bundle pinches in at the waist like a tied sheaf does.
      const twist = 1.9 + rand() * 0.5;
      const R = radius * (1.25 + rand() * 0.35);
      const foot = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
      const head = new THREE.Vector3(
        Math.cos(a + twist) * R * 1.05,
        h,
        Math.sin(a + twist) * R * 1.05
      );
      const dir = head.clone().sub(foot);
      const len = dir.length();
      dir.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const tone = 0.8 + rand() * 0.25;
      stalk.push({
        m: new THREE.Matrix4().compose(
          foot.clone().add(head).multiplyScalar(0.5),
          q,
          new THREE.Vector3(1, len, 1)
        ),
        c: new THREE.Color("#d9c28a").multiplyScalar(tone),
      });
      // Long dry leaves, hanging off the upper stalk and drooping.
      for (let k = 0; k < 1; k++) {
        const t = 0.62 + rand() * 0.32;
        const p = foot.clone().lerp(head, t);
        const out = Math.atan2(p.z, p.x) + (rand() - 0.5) * 0.8;
        const len2 = 0.45 + rand() * 0.3;
        const droop = 0.5 + rand() * 0.6;
        const outward = new THREE.Vector3(Math.cos(out), -0.6 - Math.sin(droop) * 0.9, Math.sin(out)).normalize();
        const bq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), outward);
        blade.push({
          m: new THREE.Matrix4().compose(
            p.clone().addScaledVector(outward, len2 / 2),
            bq,
            new THREE.Vector3(0.035, len2, 1)
          ),
          c: new THREE.Color(rand() < 0.3 ? "#c7ad6e" : "#e0cd98").multiplyScalar(0.85 + rand() * 0.2),
        });
      }
    }
    return { stalk, blade };
  }, [height, seed, radius]);

  useLayoutEffect(() => {
    for (const [ref, list] of [
      [stalks, plan.stalk],
      [blades, plan.blade],
    ] as const) {
      const mesh = ref.current;
      if (!mesh) continue;
      list.forEach((s, i) => {
        mesh.setMatrixAt(i, s.m);
        mesh.setColorAt(i, s.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [plan]);

  return (
    <group>
      <instancedMesh ref={stalks} args={[undefined, undefined, STALKS]} castShadow>
        <cylinderGeometry args={[0.012, 0.02, 1, 5]} />
        <meshToonMaterial gradientMap={kit.ramp} />
      </instancedMesh>
      <instancedMesh ref={blades} args={[undefined, undefined, BLADES]} castShadow>
        <planeGeometry args={[1, 1]} />
        <meshToonMaterial gradientMap={kit.ramp} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* the twine tie */}
      <mesh position={[0, waist, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.62, 0.022, 5, 16]} />
        <meshToonMaterial color="#8a6a3a" gradientMap={kit.ramp} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Hay bales                                                          */
/* ------------------------------------------------------------------ */

/** A square hay bale, a little soft at the edges, with two twine bands. */
export function HayBale({ turn = 0 }: { turn?: number }) {
  const kit = useKit();
  const straw = useRepeated((k) => k.straw, 2, 1);
  const geo = useMemo(() => {
    // a box with its edges pulled in: bales are never sharp
    const g = new THREE.BoxGeometry(1.05, 0.45, 0.55, 6, 3, 3);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ex = Math.abs(v.x) / 0.525;
      const ey = Math.abs(v.y) / 0.225;
      const ez = Math.abs(v.z) / 0.275;
      const k = 1 - 0.07 * (ex * ey + ey * ez + ez * ex);
      p.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    g.translate(0, 0.225, 0);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group rotation={[0, turn, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color="#e2c77a" map={straw} gradientMap={kit.ramp} />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.225, 0]}>
          <boxGeometry args={[0.025, 0.47, 0.57]} />
          <meshToonMaterial color="#9a7a45" gradientMap={kit.ramp} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Mums                                                               */
/* ------------------------------------------------------------------ */

const MUM_COLOURS = [
  ["#c2452a", "#d86a2c"],
  ["#e1a531", "#eec150"],
  ["#8e2a3a", "#b0404a"],
  ["#d9772f", "#e89a3c"],
];

/**
 * A pot of chrysanthemums: a terracotta pot and a dome of flower heads
 * over a mound of dark leaves.
 */
export function Mums({ seed = 0, size = 1 }: { seed?: number; size?: number }) {
  const kit = useKit();
  const ref = useRef<THREE.InstancedMesh>(null);
  const [a, b] = MUM_COLOURS[seed % MUM_COLOURS.length];
  const HEADS = 46;
  const pot = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.15, 0],
          [0.2, 0.3],
          [0.23, 0.32],
          [0.23, 0.36],
          [0, 0.36],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        16
      ),
    []
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = mulberry32(seed * 7 + 3);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < HEADS; i++) {
      const u = rand();
      const phi = rand() * Math.PI * 2;
      const el = Math.acos(1 - u * 0.95);
      const r = 0.25;
      const p = new THREE.Vector3(Math.sin(el) * Math.cos(phi) * r, Math.cos(el) * r * 0.8, Math.sin(el) * Math.sin(phi) * r);
      m.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 0.7, 1).multiplyScalar(0.8 + rand() * 0.4));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(rand() < 0.5 ? a : b));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seed, a, b]);
  return (
    <group scale={size}>
      <mesh geometry={pot} castShadow receiveShadow>
        <meshToonMaterial color="#b0603e" gradientMap={kit.ramp} />
      </mesh>
      <group position={[0, 0.34, 0]}>
        <mesh scale={[1, 0.62, 1]} castShadow>
          <sphereGeometry args={[0.24, 12, 8]} />
          <meshToonMaterial color="#3e5a2e" gradientMap={kit.ramp} />
        </mesh>
        <instancedMesh ref={ref} args={[undefined, undefined, HEADS]} castShadow>
          <icosahedronGeometry args={[0.045, 0]} />
          <meshToonMaterial gradientMap={kit.ramp} />
        </instancedMesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Benches                                                            */
/* ------------------------------------------------------------------ */

/** A park bench: black iron ends and arms, green-black wooden slats. */
export function Bench() {
  const kit = useKit();
  const iron = <meshStandardMaterial color={IRON} roughness={0.5} metalness={0.3} />;
  const slat = <meshToonMaterial color="#3a3f35" gradientMap={kit.ramp} />;
  const L = 1.6;
  return (
    <group>
      {[-L / 2 + 0.08, L / 2 - 0.08].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* legs */}
          <mesh position={[0, 0.22, 0.2]} castShadow>
            <boxGeometry args={[0.05, 0.44, 0.05]} />
            {iron}
          </mesh>
          <mesh position={[0, 0.22, -0.2]} castShadow>
            <boxGeometry args={[0.05, 0.44, 0.05]} />
            {iron}
          </mesh>
          {/* back upright, raked */}
          <mesh position={[0, 0.66, -0.26]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
            {iron}
          </mesh>
          {/* arm */}
          <mesh position={[0, 0.66, 0.02]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.5]} />
            {iron}
          </mesh>
          <mesh position={[0, 0.54, 0.22]} castShadow>
            <boxGeometry args={[0.04, 0.24, 0.04]} />
            {iron}
          </mesh>
        </group>
      ))}
      {/* seat slats */}
      {[-0.15, -0.05, 0.05, 0.15].map((z) => (
        <mesh key={z} position={[0, 0.45, z]} castShadow receiveShadow>
          <boxGeometry args={[L, 0.03, 0.08]} />
          {slat}
        </mesh>
      ))}
      {/* back slats */}
      {[0.6, 0.72, 0.84].map((y) => (
        <mesh key={y} position={[0, y, -0.26 - (y - 0.6) * 0.2]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[L, 0.07, 0.03]} />
          {slat}
        </mesh>
      ))}
    </group>
  );
}
