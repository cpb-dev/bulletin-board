"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import { makeToonGradient } from "./textures";

/**
 * The Beach Hut scene: the board stands on a little wooden easel on the
 * sand, a striped beach hut beside it, the sea rolling behind, with a
 * sandcastle, scuttling crabs and gulls wheeling overhead.
 *
 * Rendered instead of <Room/> when theme.scene === "beach". The <Board/>
 * itself is unchanged and sits at its usual spot; everything here is set
 * dressing around and behind it.
 */
export function BeachScene({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);

  return (
    <group>
      <color attach="background" args={[theme.light.sky]} />
      <fog attach="fog" args={[theme.light.sky, 10, 26]} />

      <ambientLight
        intensity={theme.light.ambientIntensity}
        color={theme.light.key}
      />
      <directionalLight
        position={[4, 6, 4]}
        intensity={theme.light.keyIntensity}
        color={theme.light.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-2}
      />

      {/* Sun in the sky */}
      <mesh position={[3.4, 4.4, BOARD.wallZ - 6]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color="#fff3c0" />
      </mesh>

      {/* Sea, then sand in front of it */}
      <Sea gradient={gradient} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 1.5]}
        receiveShadow
      >
        <planeGeometry args={[26, 16]} />
        <meshToonMaterial color={theme.room.floor} gradientMap={gradient} />
      </mesh>

      <BeachHut gradient={gradient} accent={theme.room.accent} />
      <Easel gradient={gradient} />
      <Sandcastle gradient={gradient} flag={theme.room.accent} />
      <Crabs gradient={gradient} />
      <Gulls />
    </group>
  );
}

/** A low-res plane with gently rolling sine waves + a bobbing sparkle. */
function Sea({ gradient }: { gradient: THREE.Texture }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => new THREE.PlaneGeometry(28, 14, 40, 20), []);
  const base = useMemo(() => geom.attributes.position.array.slice(), [geom]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.setZ(
        i,
        Math.sin(x * 0.6 + t * 1.2) * 0.12 + Math.cos(y * 0.8 + t * 0.9) * 0.1
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh
      ref={ref}
      geometry={geom}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, BOARD.wallZ - 6]}
    >
      <meshToonMaterial color="#2f9fc4" gradientMap={gradient} />
    </mesh>
  );
}

/** Striped beach hut beside the board. */
function BeachHut({
  gradient,
  accent,
}: {
  gradient: THREE.Texture;
  accent: string;
}) {
  const stripes = ["#ffffff", accent];
  return (
    <group position={[-3.1, 0, BOARD.wallZ - 1.4]} rotation={[0, 0.5, 0]}>
      {/* body */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.2, 1.8]} />
        <meshToonMaterial color="#fbf3df" gradientMap={gradient} />
      </mesh>
      {/* painted stripes on the front */}
      {[-0.8, -0.27, 0.27, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0.91]}>
          <planeGeometry args={[0.4, 2.2]} />
          <meshToonMaterial color={stripes[i % 2]} gradientMap={gradient} />
        </mesh>
      ))}
      {/* door */}
      <mesh position={[0, 0.75, 0.92]}>
        <planeGeometry args={[0.7, 1.5]} />
        <meshToonMaterial color={accent} gradientMap={gradient} />
      </mesh>
      {/* gable roof */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.7, 0.9, 4]} />
        <meshToonMaterial color={accent} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** Wooden easel the board rests on. */
function Easel({ gradient }: { gradient: THREE.Texture }) {
  const wood = "#b07a4a";
  const legGeom = (
    <cylinderGeometry args={[0.06, 0.07, 1.6, 8]} />
  );
  const bottom = BOARD.centerY - BOARD.height / 2; // board's lower edge
  return (
    <group position={[0, 0, BOARD.wallZ + 0.05]}>
      {/* two front legs splaying to the sand */}
      <mesh position={[-1.5, bottom / 2, 0.35]} rotation={[0.32, 0, 0.12]} castShadow>
        {legGeom}
        <meshToonMaterial color={wood} gradientMap={gradient} />
      </mesh>
      <mesh position={[1.5, bottom / 2, 0.35]} rotation={[0.32, 0, -0.12]} castShadow>
        {legGeom}
        <meshToonMaterial color={wood} gradientMap={gradient} />
      </mesh>
      {/* back prop leg */}
      <mesh position={[0, bottom / 2, -0.5]} rotation={[-0.4, 0, 0]} castShadow>
        {legGeom}
        <meshToonMaterial color="#9c6a3e" gradientMap={gradient} />
      </mesh>
      {/* a little ledge under the board */}
      <mesh position={[0, bottom + 0.02, 0.12]} castShadow>
        <boxGeometry args={[3.2, 0.1, 0.24]} />
        <meshToonMaterial color={wood} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** A cute stacked sandcastle with a flag. */
function Sandcastle({
  gradient,
  flag,
}: {
  gradient: THREE.Texture;
  flag: string;
}) {
  const sand = "#e3c483";
  return (
    <group position={[2.4, 0, 0.6]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshToonMaterial color={sand} gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshToonMaterial color={sand} gradientMap={gradient} />
      </mesh>
      {/* corner turrets */}
      {[
        [-0.4, -0.4],
        [0.4, -0.4],
        [-0.4, 0.4],
        [0.4, 0.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.6, 8]} />
          <meshToonMaterial color={sand} gradientMap={gradient} />
        </mesh>
      ))}
      {/* flagpole + flag */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
        <meshToonMaterial color="#7a5a36" gradientMap={gradient} />
      </mesh>
      <mesh position={[0.12, 1.12, 0]}>
        <planeGeometry args={[0.22, 0.14]} />
        <meshToonMaterial color={flag} gradientMap={gradient} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A few crabs scuttling side to side along the sand. */
function Crabs({ gradient }: { gradient: THREE.Texture }) {
  const crabs = useMemo(
    () => [
      { x: -1.4, z: 1.6, phase: 0, range: 1.2, speed: 0.8 },
      { x: 1.2, z: 2.1, phase: 2, range: 1.6, speed: 1.1 },
      { x: 0.2, z: 1.2, phase: 4, range: 0.9, speed: 0.6 },
    ],
    []
  );
  return (
    <>
      {crabs.map((c, i) => (
        <Crab key={i} gradient={gradient} {...c} />
      ))}
    </>
  );
}

function Crab({
  gradient,
  x,
  z,
  phase,
  range,
  speed,
}: {
  gradient: THREE.Texture;
  x: number;
  z: number;
  phase: number;
  range: number;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    ref.current.position.x = x + Math.sin(t) * range;
    // face the direction of travel + a little scuttle bob
    ref.current.rotation.y = Math.cos(t) > 0 ? 0.3 : -0.3;
    ref.current.position.y = 0.12 + Math.abs(Math.sin(t * 6)) * 0.02;
  });
  return (
    <group ref={ref} position={[x, 0.12, z]} scale={0.6}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshToonMaterial color="#ef6b53" gradientMap={gradient} />
      </mesh>
      {/* eyes */}
      {[-0.07, 0.07].map((ex, i) => (
        <mesh key={i} position={[ex, 0.16, 0.12]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* claws */}
      {[-0.22, 0.22].map((cx, i) => (
        <mesh key={i} position={[cx, 0, 0.12]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshToonMaterial color="#d65440" gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** Gulls wheeling across the sky with flapping wings. */
function Gulls() {
  const gulls = useMemo(
    () => [
      { y: 4.2, z: -5, phase: 0, speed: 0.5, span: 8 },
      { y: 3.6, z: -3.5, phase: 2.5, speed: 0.7, span: 7 },
      { y: 4.8, z: -6.5, phase: 4.2, speed: 0.45, span: 9 },
    ],
    []
  );
  return (
    <>
      {gulls.map((g, i) => (
        <Gull key={i} {...g} />
      ))}
    </>
  );
}

function Gull({
  y,
  z,
  phase,
  speed,
  span,
}: {
  y: number;
  z: number;
  phase: number;
  speed: number;
  span: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (ref.current) {
      // drift across and loop around
      ref.current.position.x = ((((t * 1.4) % span) + span) % span) - span / 2;
      ref.current.position.y = y + Math.sin(t * 2) * 0.25;
    }
    const flap = Math.sin(state.clock.elapsedTime * 6 + phase) * 0.5;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });

  return (
    <group ref={ref} position={[0, y, z]} scale={0.5}>
      <mesh ref={left} position={[-0.02, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={right} position={[0.02, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.16]} />
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
