"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  BOARD,
  BOARD_SURFACE_Z,
  usableHalfExtents,
  worldToNorm,
} from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import type { BoardTheme } from "@/lib/themes";
import { makeCorkTexture, makeToonGradient, mulberry32 } from "./textures";

/**
 * The bulletin board itself: chunky frame, speckled cork, a string of
 * fairy lights, and the pan/walk-up pointer behaviour.
 *
 *  - room view: click the board to walk up to that exact spot
 *  - board view: drag empty cork to slide your view across the board
 */
export function Board({
  theme,
  children,
}: {
  theme: BoardTheme;
  children?: React.ReactNode;
}) {
  const gradient = useMemo(() => makeToonGradient(), []);
  const cork = useMemo(
    () => makeCorkTexture(theme.board.surface, theme.board.surfaceSpeckle),
    [theme.board.surface, theme.board.surfaceSpeckle]
  );
  useEffect(() => () => cork.dispose(), [cork]);

  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -BOARD_SURFACE_Z),
    []
  );
  const hit = useRef(new THREE.Vector3());
  const pan = useRef<{
    startFocus: { x: number; y: number };
    startHit: THREE.Vector3;
    moved: boolean;
  } | null>(null);

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    const state = useBoardStore.getState();
    if (state.draggingId) return;
    if (state.view === "room") return; // handled as click on pointer up
    if (!e.ray.intersectPlane(plane, hit.current)) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    state.setSuppressNextTap(false);
    pan.current = {
      startFocus: { ...state.focus },
      startHit: hit.current.clone(),
      moved: false,
    };
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!pan.current) return;
    const state = useBoardStore.getState();
    if (state.draggingId) {
      pan.current = null;
      return;
    }
    if (!e.ray.intersectPlane(plane, hit.current)) return;
    const { hx, hy } = usableHalfExtents();
    const dx = (hit.current.x - pan.current.startHit.x) / hx;
    const dy = (hit.current.y - pan.current.startHit.y) / hy;
    if (Math.hypot(dx, dy) > 0.02) {
      pan.current.moved = true;
      // a pan shouldn't be read as a tap that opens a note on release
      state.setSuppressNextTap(true);
    }
    state.setFocus({
      x: pan.current.startFocus.x - dx,
      y: pan.current.startFocus.y - dy,
    });
  }

  function onPointerUp(e: ThreeEvent<PointerEvent>) {
    if (!pan.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    pan.current = null;
  }

  function onClick(e: ThreeEvent<MouseEvent>) {
    const state = useBoardStore.getState();
    if (state.view !== "room") return;
    // A look-around drag that ended over the board shouldn't also walk
    // us up to it.
    if (state.suppressNextWalkUp) {
      state.setSuppressNextWalkUp(false);
      return;
    }
    e.stopPropagation();
    const { nx, ny } = worldToNorm(e.point.x, e.point.y);
    state.walkUp({ x: nx * 0.7, y: ny * 0.5 });
  }

  const frameW = BOARD.width + 0.24;
  const frameH = BOARD.height + 0.24;

  return (
    <group>
      {/* frame — pushed clearly behind the cork so its front face never
          z-fights with the cork plane (that was the board "flicker") */}
      <mesh position={[0, BOARD.centerY, BOARD_SURFACE_Z - 0.13]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.12]} />
        <meshToonMaterial color={theme.board.frame} gradientMap={gradient} />
      </mesh>
      {/* cork surface */}
      <mesh
        position={[0, BOARD.centerY, BOARD_SURFACE_Z]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <planeGeometry args={[BOARD.width, BOARD.height]} />
        <meshStandardMaterial
          map={cork}
          roughness={1}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {theme.boardDecor === "shells" ? (
        <Shells gradient={gradient} />
      ) : theme.boardDecor === "footballs" ? (
        <Footballs />
      ) : (
        <FairyLights color={theme.garland} />
      )}
      {children}
    </group>
  );
}

/** A row of little footballs along the top of the board. */
function Footballs() {
  const balls = useMemo(() => {
    const count = 9;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const x = -BOARD.width / 2 + 0.35 + t * (BOARD.width - 0.7);
      const y =
        BOARD.centerY + BOARD.height / 2 + 0.13 - Math.sin(t * Math.PI) * 0.05;
      return { x, y, spin: (i % 2 === 0 ? 1 : -1) * 0.4 };
    });
  }, []);
  return (
    <group>
      {balls.map((b, i) => (
        <group
          key={i}
          position={[b.x, b.y, BOARD_SURFACE_Z + 0.06]}
          rotation={[0.3, b.spin, 0]}
        >
          <Football />
        </group>
      ))}
    </group>
  );
}

/** A small stylised football — a faceted white ball with dark patches. */
export function Football({ radius = 0.07 }: { radius?: number }) {
  const patches = useMemo(() => {
    const dirs = [
      [0, 0, 1],
      [0.9, 0.35, 0.2],
      [-0.75, -0.5, 0.4],
      [0.2, -0.95, 0.1],
      [-0.3, 0.85, -0.4],
    ];
    return dirs.map((p) => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        v
      );
      return {
        pos: v.clone().multiplyScalar(radius * 0.99).toArray() as [
          number,
          number,
          number,
        ],
        quat: q,
      };
    });
  }, [radius]);

  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} flatShading />
      </mesh>
      {patches.map((p, i) => (
        <mesh key={i} position={p.pos} quaternion={p.quat}>
          <circleGeometry args={[radius * 0.4, 5]} />
          <meshStandardMaterial color="#161616" />
        </mesh>
      ))}
    </group>
  );
}

/** A row of assorted seashells pinned along the top of the board. */
function Shells({ gradient }: { gradient: THREE.Texture }) {
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

/** A sagging string of glowing fairy lights across the board's top. */
function FairyLights({ color }: { color: string }) {
  const bulbs = useMemo(() => {
    const rand = mulberry32(5);
    const count = 11;
    const out: { pos: [number, number, number]; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -BOARD.width / 2 + t * BOARD.width;
      const sag = Math.sin(t * Math.PI) * 0.16;
      out.push({
        pos: [x, BOARD.centerY + BOARD.height / 2 + 0.1 - sag, BOARD_SURFACE_Z + 0.05],
        phase: rand() * Math.PI * 2,
      });
    }
    return out;
  }, []);

  const curve = useMemo(() => {
    const points = bulbs.map((b) => new THREE.Vector3(...b.pos));
    return new THREE.CatmullRomCurve3(points);
  }, [bulbs]);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 32, 0.006, 6, false]} />
        <meshBasicMaterial color="#3d3d3d" />
      </mesh>
      {bulbs.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
