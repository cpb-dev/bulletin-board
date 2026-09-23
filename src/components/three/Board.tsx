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
import type { BoardTheme } from "@/lib/themes";
import { makeCorkTexture, makeToonGradient, mulberry32 } from "./textures";
import { Spider } from "./props/Spider";

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
      ) : theme.boardDecor === "hearts" ? (
        <Hearts />
      ) : theme.boardDecor === "cobwebs" ? (
        <Cobwebs />
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

/** A garland of plump pink hearts along the top of the board. */
function Hearts() {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    // unit heart, later scaled down
    s.moveTo(0, -0.42);
    s.bezierCurveTo(-0.46, -0.1, -0.48, 0.24, -0.22, 0.38);
    s.bezierCurveTo(-0.08, 0.46, 0, 0.36, 0, 0.26);
    s.bezierCurveTo(0, 0.36, 0.08, 0.46, 0.22, 0.38);
    s.bezierCurveTo(0.48, 0.24, 0.46, -0.1, 0, -0.42);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const hearts = useMemo(() => {
    const rand = mulberry32(14);
    const count = 8;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      return {
        x: -BOARD.width / 2 + 0.35 + t * (BOARD.width - 0.7),
        y:
          BOARD.centerY + BOARD.height / 2 + 0.14 - Math.sin(t * Math.PI) * 0.06,
        tilt: (rand() - 0.5) * 0.5,
        tint: i % 2 === 0 ? "#ff8fb4" : "#ffc2d6",
      };
    });
  }, []);

  return (
    <group>
      {hearts.map((hh, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[hh.x, hh.y, BOARD_SURFACE_Z + 0.05]}
          rotation={[0, 0, hh.tilt]}
          scale={0.16}
        >
          <meshStandardMaterial color={hh.tint} roughness={0.55} />
        </mesh>
      ))}
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

/* ------------------------------------------------------------------ */
/*  Haunted Hollow: cobwebs in the corners, spiders skittering on them */
/* ------------------------------------------------------------------ */

/**
 * Draws a corner web — spokes fanning out from the corner, joined by
 * sagging spiral threads. Transparent everywhere else, so it drapes
 * over the frame rather than sitting on a visible panel.
 */
function makeWebTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(233, 233, 240, 0.85)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";

  const SPOKES = 8;
  const RINGS = 7;
  const R = size * 0.96;
  // anchored at the top-left corner of the texture
  const angles = Array.from(
    { length: SPOKES },
    (_, i) => (i / (SPOKES - 1)) * (Math.PI / 2)
  );

  for (const a of angles) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.stroke();
  }

  for (let ring = 1; ring <= RINGS; ring++) {
    const r = (ring / RINGS) * R;
    ctx.beginPath();
    for (let i = 0; i < angles.length - 1; i++) {
      const a1 = angles[i];
      const a2 = angles[i + 1];
      const x1 = Math.cos(a1) * r;
      const y1 = Math.sin(a1) * r;
      const x2 = Math.cos(a2) * r;
      const y2 = Math.sin(a2) * r;
      // sag the thread inward between spokes
      const mid = (a1 + a2) / 2;
      const cx = Math.cos(mid) * r * 0.86;
      const cy = Math.sin(mid) * r * 0.86;
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
    }
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cobwebs tucked into each corner of the frame, with spiders on them. */
function Cobwebs() {
  const web = useMemo(() => makeWebTexture(), []);
  useEffect(() => () => web.dispose(), [web]);

  // Sized and placed off the frame's own extents so the webs sit inside
  // the board rather than hanging off its edges.
  const halfW = (BOARD.width + 0.24) / 2;
  const halfH = (BOARD.height + 0.24) / 2;
  const size = 0.8;
  const z = BOARD_SURFACE_Z + 0.04;
  const inset = size / 2;

  // The texture's web is anchored at the canvas's top-left, which maps
  // to the plane's top-left corner. Each rotation swings that anchor to
  // a different corner, so the web always fans inward from the frame:
  //   0    → anchor top-left      π/2  → anchor bottom-left
  //  -π/2  → anchor top-right     π    → anchor bottom-right
  const corners: { pos: [number, number, number]; rot: number }[] = [
    { pos: [-halfW + inset, BOARD.centerY + halfH - inset, z], rot: 0 },
    {
      pos: [halfW - inset, BOARD.centerY + halfH - inset, z],
      rot: -Math.PI / 2,
    },
    { pos: [halfW - inset, BOARD.centerY - halfH + inset, z], rot: Math.PI },
    {
      pos: [-halfW + inset, BOARD.centerY - halfH + inset, z],
      rot: Math.PI / 2,
    },
  ];

  return (
    <group>
      {corners.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[0, 0, c.rot]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            map={web}
            transparent
            opacity={0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Kept inside the frame, with a margin so no leg pokes over the
          edge. Six of them: enough that one is always moving somewhere
          in the corner of your eye. */}
      <group position={[0, BOARD.centerY, 0]}>
        {[1, 2, 3, 4, 5, 6].map((seed) => (
          <Spider
            key={seed}
            seed={seed}
            bounds={{
              x: (BOARD.width - 0.5) / 2,
              y: (BOARD.height - 0.5) / 2,
            }}
            z={BOARD_SURFACE_Z + 0.055}
          />
        ))}
      </group>
    </group>
  );
}

