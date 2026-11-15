"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { DayPhase } from "@/lib/day-cycle";
import { BACK_WINDOW, DAIS, HALL, PILLARS, SIDE_WINDOWS } from "../lib/layout";
import { makeFlagstoneTexture, makeStoneTexture } from "./textures";

/** What the glass shows: the sky outside at this part of the day. */
const GLASS: Record<DayPhase, string> = { day: "#c9dcf0", evening: "#f2a074", night: "#26355e" };

/** An arch: a rectangle with a round top, `width` wide, from 0 up to `height`. */
function archShape(width: number, height: number): THREE.Shape {
  const r = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, height - r);
  s.absarc(0, height - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

/**
 * The hall's stone shell (BB-38): sandstone walls, a flagstone floor with
 * a crimson runner down the aisle, the dais across the far end, stone
 * pillars down the side walls, and tall arched windows whose glass
 * follows the time of day.
 *
 * BLOCK-OUT: flat walls and simple arches. Tracery, mullions and stone
 * depth come in "Great Hall: hall shell and windows".
 */
export function HallShell({ phase }: { phase: DayPhase }) {
  const { halfWidth, backZ, frontZ, height } = HALL;
  const length = frontZ - backZ;
  const midZ = (frontZ + backZ) / 2;

  const stone = useMemo(() => {
    const t = makeStoneTexture();
    t.repeat.set(length / 2, height / 2);
    return t;
  }, [length, height]);
  const backStone = useMemo(() => {
    const t = makeStoneTexture();
    t.repeat.set((halfWidth * 2) / 2, height / 2);
    return t;
  }, [halfWidth, height]);
  const flags = useMemo(() => {
    const t = makeFlagstoneTexture();
    t.repeat.set((halfWidth * 2) / 3, length / 3);
    return t;
  }, [halfWidth, length]);
  useEffect(
    () => () => {
      stone.dispose();
      backStone.dispose();
      flags.dispose();
    },
    [stone, backStone, flags]
  );

  const backArch = useMemo(() => archShape(BACK_WINDOW.width, BACK_WINDOW.top - BACK_WINDOW.sill), []);
  const backSurround = useMemo(() => archShape(BACK_WINDOW.width + 0.5, BACK_WINDOW.top - BACK_WINDOW.sill + 0.3), []);
  const sideArch = useMemo(() => archShape(SIDE_WINDOWS.width, SIDE_WINDOWS.top - SIDE_WINDOWS.sill), []);
  const sideSurround = useMemo(() => archShape(SIDE_WINDOWS.width + 0.4, SIDE_WINDOWS.top - SIDE_WINDOWS.sill + 0.25), []);

  const glass = <meshBasicMaterial color={GLASS[phase]} toneMapped={false} fog={false} />;
  const surround = <meshStandardMaterial color="#4a3c2e" roughness={0.9} />;

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]} receiveShadow>
        <planeGeometry args={[halfWidth * 2, length]} />
        <meshStandardMaterial map={flags} roughness={0.95} />
      </mesh>
      {/* crimson runner down the aisle, from the dais to behind the camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, (backZ + DAIS.depth + frontZ) / 2]} receiveShadow>
        <planeGeometry args={[1.6, frontZ - backZ - DAIS.depth]} />
        <meshStandardMaterial color="#7a1a20" roughness={1} />
      </mesh>
      {/* the dais, across the far end */}
      <mesh position={[0, DAIS.height / 2, backZ + DAIS.depth / 2]} receiveShadow castShadow>
        <boxGeometry args={[halfWidth * 2, DAIS.height, DAIS.depth]} />
        <meshStandardMaterial map={flags} color="#b9ab98" roughness={0.9} />
      </mesh>

      {/* walls */}
      <mesh position={[0, height / 2, backZ]} receiveShadow>
        <planeGeometry args={[halfWidth * 2, height]} />
        <meshStandardMaterial map={backStone} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * halfWidth, height / 2, midZ]} rotation={[0, -s * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[length, height]} />
          <meshStandardMaterial map={stone} roughness={0.95} />
        </mesh>
      ))}

      {/* the tall window above the board */}
      <group position={[0, BACK_WINDOW.sill, backZ + 0.01]}>
        <mesh position={[0, -0.15, 0]}>
          <shapeGeometry args={[backSurround, 24]} />
          {surround}
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <shapeGeometry args={[backArch, 24]} />
          {glass}
        </mesh>
        <Mullions width={BACK_WINDOW.width} height={BACK_WINDOW.top - BACK_WINDOW.sill} />
      </group>

      {/* side windows and pillars */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (halfWidth - 0.01), 0, 0]} rotation={[0, -s * (Math.PI / 2), 0]}>
          {SIDE_WINDOWS.zs.map((z) => (
            // Local x runs along the wall; for the left wall it's +z.
            <group key={z} position={[s * z, SIDE_WINDOWS.sill, 0]}>
              <mesh position={[0, -0.12, 0]}>
                <shapeGeometry args={[sideSurround, 20]} />
                {surround}
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <shapeGeometry args={[sideArch, 20]} />
                {glass}
              </mesh>
              <Mullions width={SIDE_WINDOWS.width} height={SIDE_WINDOWS.top - SIDE_WINDOWS.sill} />
            </group>
          ))}
          {PILLARS.zs.map((z) => (
            <mesh key={z} position={[s * z, height / 2, PILLARS.width / 2]} castShadow receiveShadow>
              <boxGeometry args={[PILLARS.width, height, PILLARS.width]} />
              <meshStandardMaterial map={stone} color="#d8c8b0" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Stone glazing bars: one upright and a few transoms. */
function Mullions({ width, height }: { width: number; height: number }) {
  const bar = <meshStandardMaterial color="#4a3c2e" roughness={0.9} />;
  return (
    <group position={[0, 0, 0.03]}>
      <mesh position={[0, (height - width / 2) / 2, 0]}>
        <boxGeometry args={[0.07, height - width / 2, 0.05]} />
        {bar}
      </mesh>
      {[0.3, 0.6].map((k) => (
        <mesh key={k} position={[0, (height - width / 2) * k, 0]}>
          <boxGeometry args={[width, 0.06, 0.05]} />
          {bar}
        </mesh>
      ))}
    </group>
  );
}
