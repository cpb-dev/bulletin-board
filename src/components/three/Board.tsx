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
    if (Math.hypot(dx, dy) > 0.02) pan.current.moved = true;
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

      <FairyLights color={theme.garland} />
      {children}
    </group>
  );
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
