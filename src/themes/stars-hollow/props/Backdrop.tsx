"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { BackdropBuilding } from "../lib/layout";
import { useKit, useRepeated, WHITE_PAINT } from "./kit";
import { BRICK } from "./colours";
import { Fascia, Glass, SashWindow, ShopDoor, Trim, useShopWindow } from "./StreetParts";

/**
 * The town beyond the square: the white church with its spire, the
 * brick town hall with its portico, Miss Patty's, a clapboard house
 * and a big old inn. Seen from across the green, over the top of the
 * board and between the trees, so they are simpler than the shops on
 * Main Street — gables, windows, a porch — but each is a building
 * rather than a flat.
 *
 * Origin at the middle of the front, on the ground; front is +z.
 */
export function Backdrop({ buildings }: { buildings: BackdropBuilding[] }) {
  return (
    <>
      {buildings.map((b) => (
        <group key={b.seed} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {b.kind === "church" && <Church width={b.width} seed={b.seed} />}
          {b.kind === "town-hall" && <TownHall width={b.width} seed={b.seed} />}
          {b.kind === "studio" && (
            <GableHouse width={b.width} depth={7} walls={4.4} wall="#f3efe6" trim="#5d7187" seed={b.seed} sign={b.sign} />
          )}
          {b.kind === "house" && (
            <GableHouse width={b.width} depth={6} walls={5.4} wall="#c9d3dc" trim={WHITE_PAINT} seed={b.seed} porch />
          )}
          {b.kind === "inn" && (
            <GableHouse width={b.width} depth={8} walls={6.2} wall="#efe3bf" trim={WHITE_PAINT} seed={b.seed} porch />
          )}
        </group>
      ))}
    </>
  );
}

/** A pitched roof as an extruded triangle, running front to back. */
function useGableRoof(width: number, depth: number, rise: number) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const o = 0.35; // overhang
    s.moveTo(-width / 2 - o, -0.05);
    s.lineTo(width / 2 + o, -0.05);
    s.lineTo(0, rise);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: depth + 0.6, bevelEnabled: false });
    g.translate(0, 0, -depth - 0.3);
    return g;
  }, [width, depth, rise]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/** A gable-fronted building in clapboard: windows on two floors, a door, maybe a porch. */
export function GableHouse({
  width,
  depth,
  walls,
  wall,
  trim,
  seed,
  sign,
  porch = false,
}: {
  width: number;
  depth: number;
  walls: number;
  wall: string;
  trim: string;
  seed: number;
  sign?: string;
  porch?: boolean;
}) {
  const kit = useKit();
  const siding = useRepeated((k) => k.clapboard, 1, walls / 1.2);
  const shingle = useRepeated((k) => k.shingle, width / 2, depth / 2);
  const rise = width * 0.42;
  const roof = useGableRoof(width, depth, rise);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(0, rise - 0.1);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [width, rise]);
  useEffect(() => () => gable.dispose(), [gable]);
  const glass = useShopWindow(seed, 0.3, true);
  const floors = walls > 5 ? 2 : 1;
  const cols = Math.max(2, Math.floor(width / 1.6));
  const xs = Array.from({ length: cols }, (_, i) => -width / 2 + ((i + 0.5) / cols) * width);

  return (
    <group>
      <mesh position={[0, walls / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, walls, depth]} />
        <meshToonMaterial color={wall} map={siding} gradientMap={kit.ramp} />
      </mesh>
      <mesh geometry={gable} position={[0, walls, 0.001]}>
        <meshToonMaterial color={wall} map={siding} gradientMap={kit.ramp} />
      </mesh>
      <mesh geometry={roof} position={[0, walls, 0]} castShadow receiveShadow>
        <meshToonMaterial color="#5f5b57" map={shingle} gradientMap={kit.ramp} />
      </mesh>
      {/* corner boards */}
      {[-1, 1].map((s) => (
        <Trim key={s} at={[s * (width / 2 - 0.06), walls / 2, 0.03]} size={[0.14, walls, 0.08]} color={trim} />
      ))}
      {/* a round window in the gable */}
      <mesh position={[0, walls + rise * 0.4, 0.02]}>
        <circleGeometry args={[0.32, 16]} />
        <meshStandardMaterial map={glass} roughness={0.3} />
      </mesh>
      {Array.from({ length: floors }, (_, f) =>
        xs.map((x, i) => {
          const isDoor = f === 0 && i === Math.floor(cols / 2);
          if (isDoor) return null;
          return (
            <SashWindow key={`${f}-${i}`} x={x} y={1.6 + f * 2.7} w={0.8} h={1.35} trim={trim} glass={glass} />
          );
        })
      )}
      <ShopDoor x={xs[Math.floor(cols / 2)]} color="#5b3a2a" trim={trim} glass={glass} wreath />
      {sign && (
        <Fascia text={sign} at={[0, walls - 0.55, 0.06]} w={width * 0.7} h={0.5} bg={WHITE_PAINT} ink="#7a3a55" />
      )}
      {porch && <Porch width={width} trim={trim} />}
    </group>
  );
}

/** A front porch: a floor, slim posts, a railing and a shallow roof. */
function Porch({ width, trim }: { width: number; trim: string }) {
  const d = 1.8;
  const n = Math.max(3, Math.round(width / 1.6));
  return (
    <group>
      <Trim at={[0, 0.25, d / 2]} size={[width + 0.2, 0.5, d]} color="#bdb6a8" />
      {Array.from({ length: n + 1 }, (_, i) => {
        const x = -width / 2 + (i / n) * width;
        return <Trim key={i} at={[x, 1.6, d - 0.1]} size={[0.14, 2.2, 0.14]} color={trim} />;
      })}
      <Trim at={[0, 2.75, d / 2]} size={[width + 0.5, 0.14, d + 0.3]} color={trim} />
      <Trim at={[0, 1.35, d - 0.1]} size={[width, 0.07, 0.07]} color={trim} />
    </group>
  );
}

/**
 * The white church: a clapboard nave, a square tower on its front with
 * a louvred belfry, and a tall spire — the one thing on the far side of
 * the square that stands clear over the top of the board.
 */
function Church({ width, seed }: { width: number; seed: number }) {
  const kit = useKit();
  const siding = useRepeated((k) => k.clapboard, 1, 5);
  const glass = useShopWindow(seed, 0.2, true);
  const T = 2.2; // tower width
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  return (
    <group>
      <GableHouse width={width} depth={11} walls={5.2} wall={WHITE_PAINT} trim="#e6e0d2" seed={seed} />
      {/* the tower, standing proud of the front */}
      <group position={[0, 0, 1.1]}>
        <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[T, 9, T]} />
          <meshToonMaterial color={WHITE_PAINT} map={siding} gradientMap={kit.ramp} />
        </mesh>
        {/* tall arched window */}
        <Glass at={[0, 5.2, T / 2 + 0.01]} w={0.7} h={1.6} map={glass} glow={0.15} />
        {/* belfry: an open stage with louvres, a cornice either side */}
        <mesh position={[0, 9.1, 0]} castShadow>
          <boxGeometry args={[T + 0.3, 0.2, T + 0.3]} />
          {paint}
        </mesh>
        <mesh position={[0, 9.9, 0]} castShadow>
          <boxGeometry args={[T - 0.3, 1.4, T - 0.3]} />
          {paint}
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <group key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
            <mesh position={[0, 9.9, (T - 0.3) / 2 + 0.005]}>
              <planeGeometry args={[0.8, 1.0]} />
              <meshBasicMaterial color="#3b3a3e" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 10.7, 0]} castShadow>
          <boxGeometry args={[T + 0.1, 0.2, T + 0.1]} />
          {paint}
        </mesh>
        {/* the spire */}
        <mesh position={[0, 10.8 + 2.6, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
          <coneGeometry args={[1.0, 5.2, 8]} />
          {paint}
        </mesh>
        <mesh position={[0, 16.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
          <meshStandardMaterial color="#b8973e" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The town hall: two storeys of brick with white trim, a portico of
 * four columns under a pediment, and a flagpole out front — as on the
 * left of the square in the photos.
 */
function TownHall({ width, seed }: { width: number; seed: number }) {
  const kit = useKit();
  const depth = 9;
  const H = 7.2;
  const brick = useRepeated((k) => k.brick, width / 0.9, H / 0.6);
  const glass = useShopWindow(seed, 0.2, true);
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0);
    s.lineTo(2.1, 0);
    s.lineTo(0, 1.2);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false });
    return g;
  }, []);
  useEffect(() => () => pediment.dispose(), [pediment]);
  const cols = 5;
  const xs = Array.from({ length: cols }, (_, i) => -width / 2 + ((i + 0.5) / cols) * width);
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  return (
    <group>
      <mesh position={[0, H / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, H, depth]} />
        <meshToonMaterial color={BRICK} map={brick} gradientMap={kit.ramp} />
      </mesh>
      {/* cornice and a low parapet with a gable over the middle */}
      <Trim at={[0, H + 0.1, 0.1]} size={[width + 0.4, 0.3, 0.4]} color={WHITE_PAINT} />
      <mesh position={[0, H + 0.25, -0.1]} castShadow>
        <boxGeometry args={[width, 0.5, 0.3]} />
        {paint}
      </mesh>
      {xs.map((x, i) =>
        [1.9, 4.9].map((y) =>
          i === 2 && y < 3 ? null : (
            <SashWindow key={`${i}-${y}`} x={x} y={y} w={0.9} h={1.6} trim={WHITE_PAINT} arched={y > 3} glass={glass} />
          )
        )
      )}
      {/* the portico */}
      <group position={[0, 0, 1.3]}>
        <Trim at={[0, 0.2, 0]} size={[4.6, 0.4, 2.8]} color="#d8d2c6" />
        {[-1.6, -0.55, 0.55, 1.6].map((x) => (
          <mesh key={x} position={[x, 0.4 + 1.6, 1.1]} castShadow>
            <cylinderGeometry args={[0.16, 0.19, 3.2, 12]} />
            {paint}
          </mesh>
        ))}
        <Trim at={[0, 3.75, 0]} size={[4.4, 0.5, 2.8]} color={WHITE_PAINT} />
        <mesh geometry={pediment} position={[0, 4.0, 1.0]} castShadow>
          {paint}
        </mesh>
      </group>
      <ShopDoor x={0} color="#4a3a2e" trim={WHITE_PAINT} glass={glass} h={2.6} w={1.3} wreath />
      {/* flagpole */}
      <group position={[width / 2 + 1.2, 0, 2.2]}>
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 9, 6]} />
          <meshStandardMaterial color="#e6e2da" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The woods round the edge of town: a ring of autumn crowns out in the
 * haze, so the horizon is trees rather than the edge of the world. One
 * instanced mesh of simple lumps — at that distance it's colour and
 * silhouette, nothing more.
 */
export function DistantTrees({ radius = 44, count = 240 }: { radius?: number; count?: number }) {
  const kit = useKit();
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const c = crowns.current;
    const t = trunks.current;
    if (!c || !t) return;
    const rand = mulberry32(404);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const colours = ["#d7823a", "#c85a2e", "#e0a843", "#a8452e", "#8f8a45", "#c9763a", "#b0493a"];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand() * 0.04;
      const r = radius + (rand() - 0.5) * 9;
      const s = 1.5 + rand() * 1.3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const trunk = 1.4 + rand() * 1.2;
      m.compose(
        new THREE.Vector3(x, trunk + s * 0.8, z),
        q.setFromAxisAngle(up, rand() * 6),
        new THREE.Vector3(s * (0.9 + rand() * 0.3), s * (1 + rand() * 0.35), s)
      );
      c.setMatrixAt(i, m);
      c.setColorAt(i, col.set(colours[Math.floor(rand() * colours.length)]));
      m.compose(new THREE.Vector3(x, trunk / 2 + 0.3, z), q.identity(), new THREE.Vector3(1, trunk + 0.6, 1));
      t.setMatrixAt(i, m);
    }
    for (const mesh of [c, t]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  }, [radius, count]);
  return (
    <group>
      <instancedMesh ref={crowns} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshToonMaterial map={kit.foliage} gradientMap={kit.leafRamp} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.14, 0.2, 1, 5]} />
        <meshToonMaterial color="#5a4638" gradientMap={kit.ramp} />
      </instancedMesh>
    </group>
  );
}
