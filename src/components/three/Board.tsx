"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type ThreeEvent } from "@react-three/fiber";
import {
  BOARD,
  BOARD_SURFACE_Z,
  EXTENDED_MAX_NX,
  MINI_BOARD,
  usableHalfExtents,
  worldToNorm,
} from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import type { BoardTheme, ThemeBoardDecor } from "@/themes/types";
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
  decor: Decor,
  children,
}: {
  theme: BoardTheme;
  /** The theme's own board decor. Without one, fairy lights. */
  decor?: ThemeBoardDecor;
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

      {Decor ? (
        <Decor theme={theme} gradient={gradient} />
      ) : (
        <FairyLights color={theme.garland} />
      )}

      {theme.miniBoard && (
        <MiniBoardMesh
          label={theme.miniBoard.label}
          theme={theme}
          gradient={gradient}
          cork={cork}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}
      {children}
    </group>
  );
}

/**
 * The smaller second board ("your day") beside the main one — pan right
 * to reach it; items drag onto it like anywhere else. Shares the main
 * board's pan handlers so the view slides naturally across both.
 */
function MiniBoardMesh({
  label,
  theme,
  gradient,
  cork,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string;
  theme: BoardTheme;
  gradient: THREE.Texture;
  cork: THREE.Texture;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
}) {
  function onClick(e: ThreeEvent<MouseEvent>) {
    const state = useBoardStore.getState();
    if (state.view !== "room") return;
    if (state.suppressNextWalkUp) {
      state.setSuppressNextWalkUp(false);
      return;
    }
    e.stopPropagation();
    const { nx, ny } = worldToNorm(e.point.x, e.point.y, EXTENDED_MAX_NX);
    state.walkUp({ x: nx, y: ny * 0.5 });
  }

  return (
    <group position={[MINI_BOARD.offsetX, MINI_BOARD.centerY, 0]}>
      <mesh position={[0, 0, BOARD_SURFACE_Z - 0.13]} castShadow>
        <boxGeometry
          args={[MINI_BOARD.width + 0.2, MINI_BOARD.height + 0.2, 0.12]}
        />
        <meshToonMaterial color={theme.board.frame} gradientMap={gradient} />
      </mesh>
      <mesh
        position={[0, 0, BOARD_SURFACE_Z]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <planeGeometry args={[MINI_BOARD.width, MINI_BOARD.height]} />
        <meshStandardMaterial
          map={cork}
          roughness={1}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {/* bunting sits ON the board, overlapping its top edge */}
      <LetterBunting
        text={label}
        width={MINI_BOARD.width + 0.3}
        y={MINI_BOARD.height / 2 - 0.04}
      />
    </group>
  );
}

/** Cute pennant bunting spelling out a word, letter by letter. */
function LetterBunting({
  text,
  width,
  y,
}: {
  text: string;
  width: number;
  y: number;
}) {
  const flags = useMemo(() => {
    const letters = text.toUpperCase().split("");
    const palette = ["#ff9ec0", "#fff0f5", "#c98ce0", "#ffd7e0"];
    return letters.map((letter, i) => {
      const t = letters.length === 1 ? 0.5 : i / (letters.length - 1);
      const texture = makePennantTexture(
        letter,
        palette[i % palette.length],
        "#8a2547"
      );
      return {
        letter,
        texture,
        x: -width / 2 + t * width,
        sag: Math.sin(t * Math.PI) * 0.12,
        tilt: (t - 0.5) * 0.4,
      };
    });
  }, [text, width]);
  useEffect(
    () => () => flags.forEach((f) => f.texture.dispose()),
    [flags]
  );

  const curve = useMemo(() => {
    const pts = flags.map(
      (f) => new THREE.Vector3(f.x, y - f.sag + 0.14, BOARD_SURFACE_Z + 0.04)
    );
    return pts.length > 1 ? new THREE.CatmullRomCurve3(pts) : null;
  }, [flags, y]);

  return (
    <group>
      {curve && (
        <mesh>
          <tubeGeometry args={[curve, 24, 0.005, 6, false]} />
          <meshBasicMaterial color="#b56a83" />
        </mesh>
      )}
      {flags.map((f, i) =>
        f.letter === " " ? null : (
          <mesh
            key={i}
            position={[f.x, y - f.sag, BOARD_SURFACE_Z + 0.045]}
            rotation={[0, 0, f.tilt * 0.3]}
          >
            <planeGeometry args={[0.26, 0.3]} />
            <meshBasicMaterial map={f.texture} transparent />
          </mesh>
        )
      )}
    </group>
  );
}

/** A triangular pennant with a single letter, drawn to a canvas. */
function makePennantTexture(
  letter: string,
  bg: string,
  ink: string
): THREE.CanvasTexture {
  const w = 96;
  const h = 112;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(w - 4, 4);
  ctx.lineTo(w / 2, h - 6);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, w / 2, h * 0.36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
