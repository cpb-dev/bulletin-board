"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROOM_CAMERA, TREE, TREE_SKIRT_Y } from "../lib/layout";
import { baubles, branches, lightString, twinkle } from "../lib/tree";
import { makeSoftDotTexture } from "./fireplace/textures";
import { makeNeedleSprayTexture } from "./tree/textures";

/** The lights' warm white, and the odd amber bulb among them. */
const WARM = new THREE.Color("#ffd48a");
const AMBER = new THREE.Color("#ffab4a");

/**
 * The Christmas tree (BB-35): a tall, full fir in the front-left of the
 * room. Hundreds of needled branches in whorls round a dark inner body,
 * drooping more towards the bottom; warm lights wound round it that
 * swell and fade slowly, each on its own rhythm; glossy baubles hung
 * among the needles; and a gold star that glows on top. It stands on a
 * felt skirt with the presents round its foot.
 */
export function ChristmasTree() {
  const { x, z } = TREE;
  const needles = useMemo(makeNeedleSprayTexture, []);
  const glowDot = useMemo(makeSoftDotTexture, []);
  useEffect(
    () => () => {
      needles.dispose();
      glowDot.dispose();
    },
    [needles, glowDot]
  );

  return (
    <group position={[x, 0, z]}>
      <Trunk />
      <Skirt />
      <Body />
      <Branches map={needles} />
      <Baubles />
      <Lights glow={glowDot} />
      <Star />
    </group>
  );
}

function Trunk() {
  return (
    <mesh position={[0, (TREE_SKIRT_Y + 0.4) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.09, TREE_SKIRT_Y + 0.4, 10]} />
      <meshStandardMaterial color="#4a3324" roughness={1} />
    </mesh>
  );
}

/** A red felt tree skirt with a cream border, under the presents. */
function Skirt() {
  return (
    <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[0.82, 40]} />
        <meshStandardMaterial color="#8e1f26" roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.001]} receiveShadow>
        <ringGeometry args={[0.74, 0.82, 40]} />
        <meshStandardMaterial color="#efe6d2" roughness={1} />
      </mesh>
    </group>
  );
}

/** The dark heart of the tree, so you never see through it. */
function Body() {
  const h = TREE.height - TREE_SKIRT_Y;
  return (
    <mesh position={[0, TREE_SKIRT_Y + h / 2 - 0.05, 0]} castShadow receiveShadow>
      <coneGeometry args={[TREE.radius * 0.8, h, 20]} />
      <meshStandardMaterial color="#1b3a24" roughness={1} />
    </mesh>
  );
}

/**
 * Every branch, as one instanced mesh: two sprays of needles per branch,
 * tilted up into a shallow V along it, so each branch reads as a bushy
 * shelf of needles from any angle — not a flat frond, and not an
 * upright fin, which shows as a vertical streak.
 */
function Branches({ map }: { map: THREE.Texture }) {
  const all = useMemo(() => branches(), []);
  const geometry = useMemo(() => {
    // A spray running from its base at the origin out along +x.
    const spray = new THREE.PlaneGeometry(1, 1);
    spray.translate(0, 0.5, 0);
    spray.rotateZ(-Math.PI / 2);
    // Lay it flat, then tilt each copy up about the branch's own axis.
    spray.rotateX(Math.PI / 2);
    const a = spray.clone().rotateX(0.55);
    const b = spray.clone().rotateX(-0.55);
    spray.dispose();
    return mergeGeometries([a, b]);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const yaw = new THREE.Quaternion();
    const droop = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const mat = new THREE.Matrix4();
    const c = new THREE.Color();
    const Y = new THREE.Vector3(0, 1, 0);
    const Zax = new THREE.Vector3(0, 0, 1);
    all.forEach((b, i) => {
      yaw.setFromAxisAngle(Y, -b.yaw);
      droop.setFromAxisAngle(Zax, -b.droop);
      pos.set(0, b.y, 0);
      scale.set(b.length, b.width, b.width);
      mat.compose(pos, yaw.clone().multiply(droop), scale);
      m.setMatrixAt(i, mat);
      const l = 0.82 + b.tone * 0.14;
      m.setColorAt(i, c.setRGB(l * 0.95, l, l * 0.92));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [all]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, all.length]} receiveShadow>
      <meshStandardMaterial map={map} alphaTest={0.45} side={THREE.DoubleSide} roughness={0.9} />
    </instancedMesh>
  );
}

function Baubles() {
  const all = useMemo(() => baubles(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    all.forEach((b, i) => {
      o.position.set(b.x, b.y - b.size * 0.4, b.z);
      o.scale.setScalar(b.size);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [all]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, all.length]} castShadow>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial metalness={0.55} roughness={0.22} />
    </instancedMesh>
  );
}

/**
 * The lights: small bright bulbs, each with a soft additive halo, and a
 * warm glow cast on the presents. Every frame each bulb (and its halo)
 * takes its brightness from `twinkle` — slow, smooth and never in step.
 */
function Lights({ glow }: { glow: THREE.Texture }) {
  const lights = useMemo(lightString, []);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const tints = useMemo(() => lights.map((_, i) => (i % 5 === 2 ? AMBER : WARM)), [lights]);
  const halo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lights.flatMap((l) => [l.x, l.y, l.z])), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(lights.length * 3), 3));
    return g;
  }, [lights]);
  useEffect(() => () => halo.dispose(), [halo]);
  const light = useRef<THREE.PointLight>(null);

  useLayoutEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const o = new THREE.Object3D();
    lights.forEach((l, i) => {
      o.position.set(l.x, l.y, l.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, tints[i]);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [lights, tints]);

  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const m = bulbs.current;
    const col = halo.attributes.color as THREE.BufferAttribute;
    let sum = 0;
    for (let i = 0; i < lights.length; i++) {
      const v = twinkle(i, t);
      sum += v;
      c.copy(tints[i]).multiplyScalar(0.25 + v * 1.1);
      m?.setColorAt(i, c);
      col.setXYZ(i, tints[i].r * v * 0.7, tints[i].g * v * 0.7, tints[i].b * v * 0.7);
    }
    if (m?.instanceColor) m.instanceColor.needsUpdate = true;
    col.needsUpdate = true;
    if (light.current) light.current.intensity = 1.8 * (sum / lights.length);
  });

  return (
    <group>
      <instancedMesh ref={bulbs} args={[undefined, undefined, lights.length]}>
        <sphereGeometry args={[0.016, 8, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <points geometry={halo}>
        <pointsMaterial
          size={0.11}
          map={glow}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      {/* The lights' warm glow on the presents and the floor: out in
          front of the tree and low, so it doesn't light the branches up
          from inside. */}
      <pointLight ref={light} position={[1.3, 0.4, 0.9]} distance={2.4} decay={2} color="#ffc277" />
    </group>
  );
}

/** A gold star on top, turned to the room, glowing softly. */
function Star() {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 0.065 : 0.155;
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 });
    g.center();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.55 + 0.25 * Math.sin(clock.elapsedTime * 0.9);
  });
  const face = Math.atan2(ROOM_CAMERA.x - TREE.x, ROOM_CAMERA.z - TREE.z);
  return (
    <group position={[0, TREE.height + 0.08, 0]} rotation={[0, face, 0]}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial ref={mat} color="#e9c25a" emissive="#ffc84a" metalness={0.7} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 0, 0.2]} intensity={0.5} distance={1.2} color="#ffd27a" />
    </group>
  );
}

