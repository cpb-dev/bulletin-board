"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import {
  CRAB_REACTION_DURATION,
  pickCrabReaction,
  type CrabReaction,
} from "@/lib/crab";
import { makeToonGradient, mulberry32 } from "./textures";

const SEA_Z = BOARD.wallZ - 9; // pushed well back from the board

/**
 * The Beach Hut scene: the board stands on a wooden easel on the sand
 * under a bright daytime sky with drifting clouds, the sea rolling in
 * behind, with a sandcastle, gulls overhead and crabs you can tap to
 * provoke a random reaction.
 *
 * Rendered instead of <Room/> when theme.scene === "beach".
 */
export function BeachScene({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);

  return (
    <group>
      <SkyBackground />

      <ambientLight intensity={1.15} color="#fff6e6" />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.8}
        color="#fff4d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-2}
      />
      <hemisphereLight args={["#aee3ff", "#e8d6a8", 0.6]} />

      <Clouds />
      {/* Sun */}
      <mesh position={[3.6, 5.0, SEA_Z + 1]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color="#fff6cf" />
      </mesh>

      <Sea gradient={gradient} />
      {/* sand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} receiveShadow>
        <planeGeometry args={[30, 18]} />
        <meshToonMaterial color={theme.room.floor} gradientMap={gradient} />
      </mesh>

      <Easel gradient={gradient} />
      <Sandcastle gradient={gradient} flag={theme.room.accent} />
      <Crabs gradient={gradient} />
      <Gulls />
    </group>
  );
}

/**
 * Sets the scene's clear colour to daytime blue directly (a nested
 * `<color attach="background">` would attach to the group, not the
 * scene, leaving it black) and restores it on unmount.
 */
function SkyBackground() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#86d2f0");
    scene.fog = new THREE.Fog("#cdeeff", 30, 90);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return <SkyDome />;
}

/** A big inverted sphere with a vertical blue gradient — the daytime sky. */
function SkyDome() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#3aa0e6"); // zenith
    g.addColorStop(0.55, "#7ec8f0");
    g.addColorStop(1, "#dcf3ff"); // horizon haze
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[48, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

/** Soft white clouds drifting slowly across the sky and looping around. */
function Clouds() {
  const clouds = useMemo(() => {
    const rand = mulberry32(23);
    return Array.from({ length: 6 }, () => ({
      y: 5 + rand() * 3.5,
      z: SEA_Z + 2 + rand() * 6,
      scale: 0.8 + rand() * 0.9,
      speed: 0.15 + rand() * 0.2,
      offset: rand() * 30,
      puffs: Array.from({ length: 3 + Math.floor(rand() * 3) }, () => ({
        x: (rand() - 0.5) * 1.6,
        y: (rand() - 0.5) * 0.4,
        r: 0.5 + rand() * 0.5,
      })),
    }));
  }, []);

  return (
    <>
      {clouds.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}
    </>
  );
}

function Cloud({
  y,
  z,
  scale,
  speed,
  offset,
  puffs,
}: {
  y: number;
  z: number;
  scale: number;
  speed: number;
  offset: number;
  puffs: { x: number; y: number; r: number }[];
}) {
  const ref = useRef<THREE.Group>(null);
  const span = 34;
  useFrame((state) => {
    if (!ref.current) return;
    const x = (((offset + state.clock.elapsedTime * speed) % span) + span) % span;
    ref.current.position.x = x - span / 2;
  });
  return (
    <group ref={ref} position={[0, y, z]} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]}>
          <sphereGeometry args={[p.r, 12, 10]} />
          <meshBasicMaterial color="#ffffff" fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Rolling sea: a swell that travels toward the shore (steeper at the
 * crests), plus moving foam lines that read as waves crashing in.
 */
function Sea({ gradient }: { gradient: THREE.Texture }) {
  const geom = useMemo(() => new THREE.PlaneGeometry(34, 18, 48, 28), []);
  const base = useMemo(() => geom.attributes.position.array.slice(), [geom]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1]; // runs from far (−) to near shore (+)
      // travelling swell moving toward shore; crests sharpen near shore
      const shore = (y + 9) / 18; // 0 far → 1 near
      const swell = Math.sin(y * 0.7 + t * 2.2);
      const crest = Math.pow(Math.max(swell, 0), 1.6) - 0.25;
      const ripple = Math.sin(x * 0.5 + t * 1.6) * 0.05;
      pos.setZ(i, crest * (0.12 + shore * 0.4) + ripple);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals(); // so the toon shading catches the crests
  });

  return (
    <group position={[0, 0.05, SEA_Z]}>
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]}>
        <meshToonMaterial color="#2f9fc4" gradientMap={gradient} />
      </mesh>
      <Foam />
    </group>
  );
}

/** White foam crests that roll toward the shore and reset. */
function Foam() {
  const lines = useMemo(
    () => [
      { phase: 0, speed: 1.6 },
      { phase: 2.2, speed: 1.3 },
      { phase: 4.1, speed: 1.9 },
    ],
    []
  );
  return (
    <>
      {lines.map((l, i) => (
        <FoamLine key={i} {...l} />
      ))}
    </>
  );
}

function FoamLine({ phase, speed }: { phase: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.Material & { opacity: number }>(null);
  const travel = 16; // distance from break point to shore
  useFrame((state) => {
    const p = (((state.clock.elapsedTime * speed + phase) % 4) + 4) % 4;
    const k = p / 4; // 0..1 progress toward shore
    if (ref.current) {
      // local space: +y is toward shore after the parent's -PI/2 X rot
      ref.current.position.z = -travel / 2 + k * travel;
    }
    if (matRef.current) {
      // fade in as it forms, fade out as it washes up the sand
      matRef.current.opacity = Math.sin(k * Math.PI) * 0.7;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
      <planeGeometry args={[33, 1.1]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ffffff"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

/** A wooden strut (cylinder) oriented to run between two world points. */
function Strut({
  a,
  b,
  radius = 0.06,
  color,
  gradient,
}: {
  a: [number, number, number];
  b: [number, number, number];
  radius?: number;
  color: string;
  gradient: THREE.Texture;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { position: mid, quaternion: q, length: len };
  }, [a, b]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshToonMaterial color={color} gradientMap={gradient} />
    </mesh>
  );
}

/**
 * Wooden easel that holds the board from BEHIND, so its legs never
 * cross the board's face. Only a thin tray lip sits at the very bottom
 * edge to "hold" the board.
 */
function Easel({ gradient }: { gradient: THREE.Texture }) {
  const wood = "#b07a4a";
  const z = BOARD.wallZ; // board cork sits just in front of this
  const top = BOARD.centerY - BOARD.height / 2 + 0.15; // near board's lower edge
  return (
    <group>
      {/* two front legs, splayed down and back behind the board */}
      <Strut
        a={[-1.45, top, z - 0.1]}
        b={[-1.9, 0, z - 0.95]}
        color={wood}
        gradient={gradient}
      />
      <Strut
        a={[1.45, top, z - 0.1]}
        b={[1.9, 0, z - 0.95]}
        color={wood}
        gradient={gradient}
      />
      {/* rear prop leg */}
      <Strut
        a={[0, top + 0.5, z - 0.2]}
        b={[0, 0, z - 1.25]}
        color="#9c6a3e"
        gradient={gradient}
      />
      {/* cross brace between the front legs */}
      <Strut
        a={[-1.2, 0.6, z - 0.45]}
        b={[1.2, 0.6, z - 0.45]}
        radius={0.045}
        color="#9c6a3e"
        gradient={gradient}
      />
      {/* thin tray lip at the board's bottom edge, just proud of the cork */}
      <mesh
        position={[0, BOARD.centerY - BOARD.height / 2 - 0.02, z + 0.12]}
        castShadow
      >
        <boxGeometry args={[2.8, 0.09, 0.18]} />
        <meshToonMaterial color={wood} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

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

function Crabs({ gradient }: { gradient: THREE.Texture }) {
  const crabs = useMemo(
    () => [
      { x: -1.4, z: 1.7, phase: 0, range: 1.2, speed: 0.8, seed: 1 },
      { x: 1.2, z: 2.2, phase: 2, range: 1.6, speed: 1.1, seed: 2 },
      { x: 0.2, z: 1.3, phase: 4, range: 0.9, speed: 0.6, seed: 3 },
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
  seed,
}: {
  gradient: THREE.Texture;
  x: number;
  z: number;
  phase: number;
  range: number;
  speed: number;
  seed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const leftClaw = useRef<THREE.Mesh>(null);
  const rightClaw = useRef<THREE.Mesh>(null);
  const now = useRef(0);
  const start = useRef(-99);
  const rand = useMemo(() => mulberry32(seed * 7919), [seed]);
  const [reaction, setReaction] = useState<CrabReaction | null>(null);
  const last = useRef<CrabReaction | undefined>(undefined);

  function poke(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (reaction) return; // let the current trick finish
    const next = pickCrabReaction(rand, last.current);
    last.current = next;
    start.current = now.current;
    setReaction(next);
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    now.current = t;
    const g = group.current;
    if (!g) return;

    // baseline scuttle
    const s = t * speed + phase;
    let px = x + Math.sin(s) * range;
    let py = 0.12 + Math.abs(Math.sin(s * 6)) * 0.02;
    let ry = Math.cos(s) > 0 ? 0.3 : -0.3;
    let rz = 0;
    let clawAngle = 0;

    if (reaction) {
      const dur = CRAB_REACTION_DURATION[reaction];
      const p = (t - start.current) / dur; // 0..1
      if (p >= 1) {
        setReaction(null);
      } else {
        const e = Math.sin(p * Math.PI); // ease in-out envelope
        switch (reaction) {
          case "hop":
            py += e * 0.5;
            break;
          case "spin":
            ry = p * Math.PI * 4;
            break;
          case "scuttle":
            px += Math.sin(p * Math.PI) * 1.4;
            py += Math.abs(Math.sin(p * 30)) * 0.04;
            break;
          case "wave":
            clawAngle = Math.sin(p * Math.PI * 8) * 0.7;
            break;
          case "dig":
            py -= e * 0.14;
            break;
          case "shake":
            rz = Math.sin(p * 40) * 0.18;
            break;
          // bubble / hearts: crab gives a little bob, particles render below
          case "bubble":
          case "hearts":
            py += Math.sin(p * Math.PI * 3) * 0.03;
            break;
        }
      }
    }

    g.position.set(px, py, z);
    g.rotation.y = ry;
    g.rotation.z = rz;
    const digSquash = reaction === "dig" ? 1 - Math.sin(Math.min(1, (t - start.current) / CRAB_REACTION_DURATION.dig) * Math.PI) * 0.4 : 1;
    g.scale.set(0.6, 0.6 * digSquash, 0.6);
    if (leftClaw.current) leftClaw.current.rotation.z = clawAngle;
    if (rightClaw.current) rightClaw.current.rotation.z = -clawAngle;
  });

  const reactProgress =
    reaction && start.current >= 0
      ? Math.min(1, (now.current - start.current) / CRAB_REACTION_DURATION[reaction])
      : 0;

  return (
    <group ref={group} position={[x, 0.12, z]} scale={0.6}>
      <mesh
        castShadow
        onPointerDown={poke}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshToonMaterial color="#ef6b53" gradientMap={gradient} />
      </mesh>
      {/* eyes on little stalks */}
      {[-0.07, 0.07].map((ex, i) => (
        <group key={i} position={[ex, 0.18, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
      {/* claws */}
      <mesh ref={leftClaw} position={[-0.22, 0, 0.12]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshToonMaterial color="#d65440" gradientMap={gradient} />
      </mesh>
      <mesh ref={rightClaw} position={[0.22, 0, 0.12]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshToonMaterial color="#d65440" gradientMap={gradient} />
      </mesh>

      {reaction === "bubble" &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              (i - 1.5) * 0.06,
              0.3 + reactProgress * 0.9 + i * 0.08,
              0.16,
            ]}
          >
            <sphereGeometry args={[0.03 + i * 0.005, 8, 8]} />
            <meshBasicMaterial color="#cfeefc" transparent opacity={0.7} />
          </mesh>
        ))}
      {reaction === "hearts" &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[(i - 1) * 0.12, 0.34 + reactProgress * 1.0, 0.16]}
            rotation={[0, 0, Math.PI / 4]}
            scale={0.6}
          >
            <boxGeometry args={[0.08, 0.08, 0.02]} />
            <meshBasicMaterial
              color="#ff5b8a"
              transparent
              opacity={1 - reactProgress}
            />
          </mesh>
        ))}
    </group>
  );
}

function Gulls() {
  const gulls = useMemo(
    () => [
      { y: 5.2, z: SEA_Z + 4, phase: 0, speed: 0.5, span: 9 },
      { y: 4.6, z: SEA_Z + 6, phase: 2.5, speed: 0.7, span: 8 },
      { y: 5.8, z: SEA_Z + 2, phase: 4.2, speed: 0.45, span: 10 },
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
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (ref.current) {
      ref.current.position.x = ((((t * 1.4) % span) + span) % span) - span / 2;
      ref.current.position.y = y + Math.sin(t * 2) * 0.25;
      // gentle banking as it bobs
      ref.current.rotation.z = Math.sin(t * 2) * 0.12;
    }
    // a raised base pose + flap, so wings sweep through the gull "M" shape
    const flap = 0.25 + Math.sin(state.clock.elapsedTime * 7 + phase) * 0.6;
    if (leftWing.current) leftWing.current.rotation.x = flap;
    if (rightWing.current) rightWing.current.rotation.x = -flap;
  });

  const white = "#fbfbfb";
  const grey = "#b9c2cb";

  return (
    <group ref={ref} position={[0, y, z]} scale={0.55}>
      {/* body */}
      <mesh scale={[1.5, 0.7, 0.7]}>
        <sphereGeometry args={[0.17, 14, 12]} />
        <meshToonMaterial color={white} />
      </mesh>
      {/* tail */}
      <mesh position={[-0.27, 0.02, 0]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshToonMaterial color={grey} />
      </mesh>
      {/* head */}
      <mesh position={[0.24, 0.07, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshToonMaterial color={white} />
      </mesh>
      {/* beak */}
      <mesh position={[0.35, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.025, 0.12, 8]} />
        <meshToonMaterial color="#f5a623" />
      </mesh>
      {/* eyes */}
      {[0.05, -0.05].map((ez, i) => (
        <mesh key={i} position={[0.28, 0.1, ez]}>
          <sphereGeometry args={[0.014, 8, 8]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
      {/* wings: inner segment up-out, outer wingtip drooped (the gull M) */}
      <group ref={leftWing} position={[0, 0.04, 0.08]}>
        <mesh position={[0, 0, 0.18]} scale={[1, 1, 1]}>
          <boxGeometry args={[0.2, 0.02, 0.34]} />
          <meshToonMaterial color={white} />
        </mesh>
        <group position={[0, 0, 0.35]} rotation={[-0.6, 0, 0]}>
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.14, 0.02, 0.26]} />
            <meshToonMaterial color={grey} />
          </mesh>
        </group>
      </group>
      <group ref={rightWing} position={[0, 0.04, -0.08]}>
        <mesh position={[0, 0, -0.18]}>
          <boxGeometry args={[0.2, 0.02, 0.34]} />
          <meshToonMaterial color={white} />
        </mesh>
        <group position={[0, 0, -0.35]} rotation={[0.6, 0, 0]}>
          <mesh position={[0, 0, -0.12]}>
            <boxGeometry args={[0.14, 0.02, 0.26]} />
            <meshToonMaterial color={grey} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
