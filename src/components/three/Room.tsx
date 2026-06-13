"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import { makeToonGradient, mulberry32 } from "./textures";

/**
 * The cozy room the board lives in: floor, walls, rug, lamp, window
 * and a sprinkle of theme-specific decorations. Everything is simple
 * toon-shaded primitives for that handmade Nintendo-ish charm.
 */
export function Room({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);
  const wallZ = BOARD.wallZ - 0.16;

  return (
    <group>
      {/* Sky / ambience */}
      <color attach="background" args={[theme.light.sky]} />
      <fog attach="fog" args={[theme.light.sky, 9, 18]} />

      <ambientLight
        intensity={theme.light.ambientIntensity}
        color={theme.light.key}
      />
      <directionalLight
        position={[2.4, 4.2, 3.2]}
        intensity={theme.light.keyIntensity}
        color={theme.light.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
      />
      {/* Warm lamp glow near the board */}
      <pointLight
        position={[2.5, 1.7, -1.2]}
        intensity={1.6}
        distance={6}
        color={theme.light.lamp}
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshToonMaterial color={theme.room.floor} gradientMap={gradient} />
      </mesh>

      {/* Rug in front of the board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.4]}>
        <circleGeometry args={[1.5, 40]} />
        <meshToonMaterial color={theme.room.rug} gradientMap={gradient} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0.4]}>
        <ringGeometry args={[1.5, 1.62, 40]} />
        <meshToonMaterial color={theme.room.accent} gradientMap={gradient} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2.2, wallZ]} receiveShadow>
        <planeGeometry args={[14, 4.4]} />
        <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
      </mesh>
      {/* Wainscot trim */}
      <mesh position={[0, 0.45, wallZ + 0.03]}>
        <planeGeometry args={[14, 0.9]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>
      {/* Side walls */}
      <mesh
        position={[-5.2, 2.2, 1]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 4.4]} />
        <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
      </mesh>
      <mesh
        position={[5.2, 2.2, 1]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 4.4]} />
        <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
      </mesh>

      {/* Window with glowing sky */}
      <group position={[-3.6, 1.9, wallZ + 0.02]}>
        <mesh>
          <planeGeometry args={[1.5, 1.7]} />
          <meshToonMaterial
            color={theme.room.wallTrim}
            gradientMap={gradient}
          />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.26, 1.46]} />
          <meshBasicMaterial color={theme.light.sky} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.06, 1.46, 0.02]} />
          <meshToonMaterial
            color={theme.room.wallTrim}
            gradientMap={gradient}
          />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.26, 0.06, 0.02]} />
          <meshToonMaterial
            color={theme.room.wallTrim}
            gradientMap={gradient}
          />
        </mesh>
      </group>

      {/* Side table + lamp, to the right of the board */}
      <group position={[2.5, 0, -1.55]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.36, 0.1, 20]} />
          <meshToonMaterial
            color={theme.room.wallTrim}
            gradientMap={gradient}
          />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.06, 0.09, 0.42, 12]} />
          <meshToonMaterial
            color={theme.room.wallTrim}
            gradientMap={gradient}
          />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
          <meshToonMaterial color={theme.room.accent} gradientMap={gradient} />
        </mesh>
        <mesh position={[0, 1.16, 0]} castShadow>
          <coneGeometry args={[0.26, 0.3, 24, 1, true]} />
          <meshToonMaterial
            color={theme.light.lamp}
            gradientMap={gradient}
            emissive={theme.light.lamp}
            emissiveIntensity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <Plant theme={theme} gradient={gradient} position={[-2.7, 0, -1.5]} />
      <Decorations theme={theme} gradient={gradient} />
    </group>
  );
}

function Plant({
  theme,
  gradient,
  position,
}: {
  theme: BoardTheme;
  gradient: THREE.Texture;
  position: [number, number, number];
}) {
  const leaves = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 5 }, (_, i) => ({
      pos: [
        (rand() - 0.5) * 0.34,
        0.62 + rand() * 0.35,
        (rand() - 0.5) * 0.34,
      ] as [number, number, number],
      scale: 0.16 + rand() * 0.14,
      key: i,
    }));
  }, []);

  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.44, 16]} />
        <meshToonMaterial color="#c96f4a" gradientMap={gradient} />
      </mesh>
      {leaves.map((leaf) => (
        <mesh key={leaf.key} position={leaf.pos} castShadow>
          <icosahedronGeometry args={[leaf.scale, 0]} />
          <meshToonMaterial color={theme.room.accent} gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** Theme-specific set dressing. */
function Decorations({
  theme,
  gradient,
}: {
  theme: BoardTheme;
  gradient: THREE.Texture;
}) {
  const wallZ = BOARD.wallZ - 0.13;

  if (theme.decorations === "night") {
    return (
      <group>
        <Twinkles />
        {/* A friendly moon above the window */}
        <mesh position={[-3.6, 3.4, wallZ]}>
          <circleGeometry args={[0.32, 32]} />
          <meshBasicMaterial color="#fff3c4" />
        </mesh>
      </group>
    );
  }

  if (theme.decorations === "cottage") {
    return <Bunting color={theme.room.accent} alt="#ffffff" />;
  }

  if (theme.decorations === "meadow") {
    return (
      <group>
        {[
          [-4.1, -1.2],
          [-3.4, 0.3],
          [3.6, -0.6],
          [4.3, 0.8],
          [3.1, 1.6],
        ].map(([x, z], i) => (
          <Flower
            key={i}
            gradient={gradient}
            accent={theme.room.accent}
            position={[x, 0, z]}
          />
        ))}
      </group>
    );
  }

  // cabin: a couple of stacked books on the side table
  return (
    <group position={[2.5, 0.52, -1.55]}>
      <mesh position={[0.12, 0.03, 0.05]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.22, 0.05, 0.16]} />
        <meshToonMaterial color="#b8553f" gradientMap={gradient} />
      </mesh>
      <mesh position={[0.12, 0.08, 0.05]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.2, 0.045, 0.15]} />
        <meshToonMaterial color="#5f8f57" gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** Soft drifting star specks for the night theme. */
function Twinkles() {
  const positions = useMemo(() => {
    const rand = mulberry32(99);
    const pts = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      pts[i * 3] = (rand() - 0.5) * 12;
      pts[i * 3 + 1] = 2.2 + rand() * 2.2;
      pts[i * 3 + 2] = BOARD.wallZ - 0.14;
    }
    return pts;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff7d6" size={0.045} sizeAttenuation />
    </points>
  );
}

/** Triangle bunting strung above the board. */
function Bunting({ color, alt }: { color: string; alt: string }) {
  const flags = useMemo(() => {
    const out: { x: number; y: number; tint: string; key: number }[] = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -2.6 + t * 5.2;
      // gentle sag
      const y = 3.45 - Math.sin(t * Math.PI) * 0.35;
      out.push({ x, y, tint: i % 2 === 0 ? color : alt, key: i });
    }
    return out;
  }, [color, alt]);

  return (
    <group position={[0, 0, BOARD.wallZ - 0.1]}>
      {flags.map((f) => (
        <mesh key={f.key} position={[f.x, f.y, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.13, 0.26, 3]} />
          <meshBasicMaterial color={f.tint} />
        </mesh>
      ))}
    </group>
  );
}

function Flower({
  gradient,
  accent,
  position,
}: {
  gradient: THREE.Texture;
  accent: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.28, 6]} />
        <meshToonMaterial color="#7da963" gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshToonMaterial color={accent} gradientMap={gradient} />
      </mesh>
    </group>
  );
}
