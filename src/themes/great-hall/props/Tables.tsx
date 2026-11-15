"use client";

import { useMemo } from "react";
import { BENCH, DAIS, LONG_TABLE, TABLE_HEIGHT, TOP_TABLE } from "../lib/layout";

const OAK = "#4a3020";
const GOLD = "#c9a24a";

/**
 * The long tables down the hall, their benches, and the top table on the
 * dais in two halves either side of the board (BB-38). Gold plates and
 * goblets set along each table.
 *
 * BLOCK-OUT: boxes with simple place settings. Turned legs, cloths, the
 * Christmas feast and crackers come in "Great Hall: tables and feast".
 */
export function Tables() {
  const len = LONG_TABLE.toZ - LONG_TABLE.fromZ;
  const mid = (LONG_TABLE.fromZ + LONG_TABLE.toZ) / 2;
  const settings = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (const x of LONG_TABLE.xs) {
      for (let z = LONG_TABLE.fromZ + 0.5; z < LONG_TABLE.toZ - 0.3; z += 0.75) {
        for (const s of [-1, 1]) out.push({ x: x + s * 0.28, z });
      }
    }
    return out;
  }, []);

  return (
    <group>
      {LONG_TABLE.xs.map((x) => (
        <group key={x}>
          <mesh position={[x, TABLE_HEIGHT - 0.04, mid]} castShadow receiveShadow>
            <boxGeometry args={[LONG_TABLE.width, 0.08, len]} />
            <meshStandardMaterial color={OAK} roughness={0.7} />
          </mesh>
          {/* trestle ends */}
          {[LONG_TABLE.fromZ + 0.3, mid, LONG_TABLE.toZ - 0.3].map((z) => (
            <mesh key={z} position={[x, (TABLE_HEIGHT - 0.08) / 2, z]} castShadow>
              <boxGeometry args={[LONG_TABLE.width - 0.2, TABLE_HEIGHT - 0.08, 0.1]} />
              <meshStandardMaterial color={OAK} roughness={0.7} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[x + s * BENCH.offset, BENCH.height - 0.03, mid]} castShadow receiveShadow>
              <boxGeometry args={[BENCH.width, 0.06, len]} />
              <meshStandardMaterial color={OAK} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
      {settings.map((p, i) => (
        <group key={i} position={[p.x, TABLE_HEIGHT, p.z]}>
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.11, 0.1, 0.012, 16]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0.16 * Math.sign(-p.x + 0.0001), 0.07, -0.12]}>
            <cylinderGeometry args={[0.035, 0.02, 0.14, 10]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* the top table, in two halves on the dais */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * TOP_TABLE.x, DAIS.height, TOP_TABLE.z]}>
          <mesh position={[0, TABLE_HEIGHT - 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[TOP_TABLE.width, 0.08, TOP_TABLE.depth]} />
            <meshStandardMaterial color={OAK} roughness={0.7} />
          </mesh>
          {/* a crimson cloth hanging down the front */}
          <mesh position={[0, (TABLE_HEIGHT - 0.04) / 2, TOP_TABLE.depth / 2 + 0.01]}>
            <planeGeometry args={[TOP_TABLE.width, TABLE_HEIGHT - 0.04]} />
            <meshStandardMaterial color="#7a1a20" roughness={1} />
          </mesh>
          {/* tall-backed chairs behind it */}
          {[-0.8, 0, 0.8].map((cx) => (
            <mesh key={cx} position={[cx, 0.65, -TOP_TABLE.depth / 2 - 0.3]} castShadow>
              <boxGeometry args={[0.5, 1.3, 0.08]} />
              <meshStandardMaterial color="#3a2416" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
