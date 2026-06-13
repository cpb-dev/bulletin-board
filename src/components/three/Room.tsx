"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

      {/* Back wall — flat painted, or stacked logs for the cabin */}
      {theme.wallStyle === "logs" ? (
        <LogWall gradient={gradient} wallZ={wallZ} />
      ) : (
        <>
          <mesh position={[0, 2.2, wallZ]} receiveShadow>
            <planeGeometry args={[14, 4.4]} />
            <meshToonMaterial color={theme.room.wall} gradientMap={gradient} />
          </mesh>
          {/* Wainscot trim */}
          <mesh position={[0, 0.45, wallZ + 0.03]}>
            <planeGeometry args={[14, 0.9]} />
            <meshToonMaterial
              color={theme.room.wallTrim}
              gradientMap={gradient}
            />
          </mesh>
        </>
      )}
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

      {/* Back-wall feature: a window, or the cabin's fireplace */}
      {theme.roomFeature === "fireplace" ? (
        <Fireplace gradient={gradient} wallZ={wallZ} position={[-3.6, 0, 0]} />
      ) : (
        <Window theme={theme} gradient={gradient} wallZ={wallZ} />
      )}

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

      {theme.plantStyle === "flowerbush" ? (
        <FlowerBush gradient={gradient} position={[-3.6, 0, -1.35]} />
      ) : (
        <Plant theme={theme} gradient={gradient} position={[-2.7, 0, -1.5]} />
      )}
      <Decorations theme={theme} gradient={gradient} />
    </group>
  );
}

/** Stacked horizontal logs for the cabin's back wall. */
function LogWall({
  gradient,
  wallZ,
}: {
  gradient: THREE.Texture;
  wallZ: number;
}) {
  const tones = ["#c2a06d", "#b08b56"];
  const logs = Array.from({ length: 9 }, (_, i) => i);
  return (
    <group position={[0, 0, wallZ - 0.5]}>
      {logs.map((i) => (
        <mesh
          key={i}
          position={[0, i * 0.56, 0]}
          rotation={[0, 0, Math.PI / 2]}
          receiveShadow
          castShadow
        >
          <cylinderGeometry args={[0.33, 0.33, 14, 14]} />
          <meshToonMaterial color={tones[i % 2]} gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** A daytime garden painted onto a canvas, seen through the window. */
function makeGardenTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, s * 0.6);
  sky.addColorStop(0, "#8fd3f0");
  sky.addColorStop(1, "#d7f0fb");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, s, s * 0.62);
  // distant hills
  ctx.fillStyle = "#9fce7e";
  ctx.beginPath();
  ctx.ellipse(s * 0.3, s * 0.66, s * 0.4, s * 0.16, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#86c06a";
  ctx.beginPath();
  ctx.ellipse(s * 0.75, s * 0.68, s * 0.45, s * 0.18, 0, Math.PI, 0);
  ctx.fill();
  // lawn
  ctx.fillStyle = "#6fb352";
  ctx.fillRect(0, s * 0.6, s, s * 0.4);
  // a little tree
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(s * 0.2 - 4, s * 0.4, 8, s * 0.25);
  ctx.fillStyle = "#5ca34a";
  for (const [dx, dy, r] of [
    [0, -8, 34],
    [-22, 6, 26],
    [22, 6, 26],
    [0, 18, 28],
  ]) {
    ctx.beginPath();
    ctx.arc(s * 0.2 + dx, s * 0.4 + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // flower dots
  const rand = mulberry32(3);
  const colors = ["#ff8fb0", "#ffffff", "#ffd84a", "#c79bff"];
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(rand() * s, s * 0.66 + rand() * s * 0.32, 3 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Window on the back wall; looks onto sky, or a garden for summer. */
function Window({
  theme,
  gradient,
  wallZ,
}: {
  theme: BoardTheme;
  gradient: THREE.Texture;
  wallZ: number;
}) {
  const garden = useMemo(
    () => (theme.windowView === "garden" ? makeGardenTexture() : null),
    [theme.windowView]
  );
  useEffect(() => () => garden?.dispose(), [garden]);

  return (
    <group position={[-3.6, 1.9, wallZ + 0.02]}>
      <mesh>
        <planeGeometry args={[1.5, 1.7]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.26, 1.46]} />
        {garden ? (
          <meshBasicMaterial map={garden} />
        ) : (
          <meshBasicMaterial color={theme.light.sky} />
        )}
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 1.46, 0.02]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.26, 0.06, 0.02]} />
        <meshToonMaterial color={theme.room.wallTrim} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** A lush green bush dotted with pink and white blossoms. */
function FlowerBush({
  gradient,
  position,
}: {
  gradient: THREE.Texture;
  position: [number, number, number];
}) {
  const { foliage, blossoms } = useMemo(() => {
    const rand = mulberry32(17);
    const foliage = Array.from({ length: 11 }, () => ({
      pos: [
        (rand() - 0.5) * 1.2,
        0.25 + rand() * 0.7,
        (rand() - 0.5) * 0.7,
      ] as [number, number, number],
      r: 0.22 + rand() * 0.18,
      tint: ["#5ea84f", "#6cbb5a", "#4f9243"][Math.floor(rand() * 3)],
    }));
    const blossoms = Array.from({ length: 24 }, () => ({
      pos: [
        (rand() - 0.5) * 1.25,
        0.3 + rand() * 0.85,
        (rand() - 0.5) * 0.75,
      ] as [number, number, number],
      r: 0.06 + rand() * 0.05,
      tint: rand() > 0.5 ? "#ff9ec0" : "#fff6fb",
    }));
    return { foliage, blossoms };
  }, []);

  return (
    <group position={position}>
      {/* terracotta pot */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.32, 0.36, 18]} />
        <meshToonMaterial color="#c96f4a" gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.46, 0.42, 0.08, 18]} />
        <meshToonMaterial color="#b35f3c" gradientMap={gradient} />
      </mesh>
      {foliage.map((f, i) => (
        <mesh key={`f${i}`} position={f.pos} castShadow>
          <icosahedronGeometry args={[f.r, 0]} />
          <meshToonMaterial color={f.tint} gradientMap={gradient} />
        </mesh>
      ))}
      {blossoms.map((b, i) => (
        <mesh key={`b${i}`} position={b.pos}>
          <sphereGeometry args={[b.r, 8, 8]} />
          <meshToonMaterial color={b.tint} gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** Stone fireplace with an animated, smoking fire and a chimney. */
function Fireplace({
  gradient,
  wallZ,
  position,
}: {
  gradient: THREE.Texture;
  wallZ: number;
  position: [number, number, number];
}) {
  const stone = "#9a9088";
  const stoneDark = "#7f766e";
  return (
    <group position={[position[0], 0, wallZ + 0.25]}>
      {/* hearth slab */}
      <mesh position={[0, 0.08, 0.18]} receiveShadow>
        <boxGeometry args={[2.2, 0.16, 0.7]} />
        <meshToonMaterial color={stoneDark} gradientMap={gradient} />
      </mesh>
      {/* surround: two legs + lintel */}
      <mesh position={[-0.85, 1.0, 0]} castShadow>
        <boxGeometry args={[0.5, 1.9, 0.5]} />
        <meshToonMaterial color={stone} gradientMap={gradient} />
      </mesh>
      <mesh position={[0.85, 1.0, 0]} castShadow>
        <boxGeometry args={[0.5, 1.9, 0.5]} />
        <meshToonMaterial color={stone} gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[2.2, 0.4, 0.55]} />
        <meshToonMaterial color={stone} gradientMap={gradient} />
      </mesh>
      {/* wooden mantel beam */}
      <mesh position={[0, 1.8, 0.12]} castShadow>
        <boxGeometry args={[2.5, 0.18, 0.35]} />
        <meshToonMaterial color="#7a5230" gradientMap={gradient} />
      </mesh>
      {/* dark firebox back */}
      <mesh position={[0, 0.95, -0.18]}>
        <planeGeometry args={[1.2, 1.6]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      {/* chimney breast up to the ceiling */}
      <mesh position={[0, 3.1, -0.05]} castShadow>
        <boxGeometry args={[1.3, 2.4, 0.45]} />
        <meshToonMaterial color={stoneDark} gradientMap={gradient} />
      </mesh>
      {/* logs + fire */}
      <mesh position={[-0.15, 0.32, 0.02]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
        <meshToonMaterial color="#6b4a2a" gradientMap={gradient} />
      </mesh>
      <mesh position={[0.15, 0.32, 0.02]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
        <meshToonMaterial color="#5c3f24" gradientMap={gradient} />
      </mesh>
      <Fire />
      <Smoke />
    </group>
  );
}

/** Flickering toon flames. */
function Fire() {
  const flames = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!flames.current) return;
    const t = state.clock.elapsedTime;
    flames.current.children.forEach((m, i) => {
      const f = 0.8 + Math.sin(t * 11 + i * 2.1) * 0.22;
      m.scale.set(0.8 + Math.sin(t * 7 + i) * 0.1, f, 0.8);
      m.position.y = 0.45 + f * 0.1;
    });
  });
  return (
    <group ref={flames} position={[0, 0, 0.05]}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.22, 0.7, 12]} />
        <meshBasicMaterial color="#ff7a1a" />
      </mesh>
      <mesh position={[-0.08, 0.45, 0.04]}>
        <coneGeometry args={[0.14, 0.5, 10]} />
        <meshBasicMaterial color="#ffb02e" />
      </mesh>
      <mesh position={[0.09, 0.45, 0.04]}>
        <coneGeometry args={[0.13, 0.5, 10]} />
        <meshBasicMaterial color="#ffd24a" />
      </mesh>
      <mesh position={[0, 0.4, 0.08]}>
        <coneGeometry args={[0.08, 0.36, 10]} />
        <meshBasicMaterial color="#fff1a8" />
      </mesh>
      <pointLight position={[0, 0.6, 0.3]} color="#ff8a3a" intensity={1.4} distance={4} />
    </group>
  );
}

/** Wisps of smoke rising up the chimney and fading out. */
function Smoke() {
  const puffs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        offset: i / 5,
        x: (i % 2 === 0 ? -1 : 1) * 0.05,
      })),
    []
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    puffs.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = (t * 0.3 + p.offset) % 1; // 0..1 rising
      m.position.y = 0.9 + k * 2.4;
      m.position.x = p.x + Math.sin(t + i) * 0.08;
      const s = 0.12 + k * 0.5;
      m.scale.setScalar(s);
      const mat = m.material as THREE.Material & { opacity: number };
      mat.opacity = (1 - k) * 0.35;
    });
  });
  return (
    <group position={[0, 0, 0]}>
      {puffs.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[p.x, 1, 0]}
        >
          <sphereGeometry args={[0.5, 10, 10]} />
          <meshBasicMaterial color="#cfc7bf" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
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

  if (theme.decorations === "cottage" || theme.decorations === "summer") {
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
