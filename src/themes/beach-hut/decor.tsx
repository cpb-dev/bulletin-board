"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import { mulberry32 } from "@/components/three/textures";

/** A row of assorted seashells pinned along the top of the board. */
export function Shells({ gradient }: { gradient: THREE.Texture }) {
  const shells = useMemo(() => {
    const rand = mulberry32(11);
    const kinds = ["scallop", "conch", "starfish", "spiral", "clam"] as const;
    const count = 7;
    const out: {
      kind: (typeof kinds)[number];
      pos: [number, number, number];
      rot: number;
      scale: number;
      color: string;
    }[] = [];
    const palette = ["#ffd9c0", "#f7b7a3", "#ffe7b3", "#e9c6e0", "#cfe8ef"];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -BOARD.width / 2 + 0.35 + t * (BOARD.width - 0.7);
      const y = BOARD.centerY + BOARD.height / 2 + 0.12 - Math.sin(t * Math.PI) * 0.05;
      out.push({
        kind: kinds[i % kinds.length],
        pos: [x, y, BOARD_SURFACE_Z + 0.05],
        rot: (rand() - 0.5) * 0.6,
        scale: 0.85 + rand() * 0.4,
        color: palette[i % palette.length],
      });
    }
    return out;
  }, []);

  return (
    <group>
      {shells.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, 0, s.rot]} scale={s.scale}>
          <Shell kind={s.kind} color={s.color} gradient={gradient} />
        </group>
      ))}
    </group>
  );
}

function Shell({
  kind,
  color,
  gradient,
}: {
  kind: "scallop" | "conch" | "starfish" | "spiral" | "clam";
  color: string;
  gradient: THREE.Texture;
}) {
  const mat = (
    <meshToonMaterial color={color} gradientMap={gradient} side={THREE.DoubleSide} />
  );
  if (kind === "starfish") {
    return (
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <extrudeGeometry args={[starShape(), { depth: 0.03, bevelEnabled: false }]} />
        {mat}
      </mesh>
    );
  }
  if (kind === "conch" || kind === "spiral") {
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.18, 12, 1, false]} />
        {mat}
      </mesh>
    );
  }
  if (kind === "clam") {
    return (
      <mesh>
        <sphereGeometry args={[0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        {mat}
      </mesh>
    );
  }
  // scallop — a ribbed fan
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.1, 16, 6, 0, Math.PI, 0, Math.PI / 2]} />
        {mat}
      </mesh>
      {[-0.05, 0, 0.05].map((rx, i) => (
        <mesh key={i} position={[rx, 0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.1, 5]} />
          <meshToonMaterial color="#ffffff" gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** A five-point star outline for the starfish shell. */
function starShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const outer = 0.11;
  const inner = 0.05;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}
