"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PRESENTS, presentPlace, type Present, type Wrap } from "../lib/layout";
import { makePaper, type Paper } from "./tree/textures";

/** How many times a paper's pattern repeats per metre. */
const PATTERN_PER_METRE = 4.5;

/**
 * The presents (BB-35): under the tree and spilling out towards the
 * window, all different sizes and papers — plaid, gold foil, polka dots,
 * kraft with twine, snowflakes, candy stripe, stars, tartan, berry — a
 * couple stacked, each with a ribbon both ways and a looped bow. Where
 * each one sits, its size and paper are in `PRESENTS` in `lib/layout.ts`.
 */
export function Presents() {
  const papers = useMemo(() => {
    const wraps = [...new Set(PRESENTS.map((p) => p.wrap))];
    return new Map<Wrap, Paper>(wraps.map((w) => [w, makePaper(w)]));
  }, []);
  useEffect(() => () => papers.forEach((p) => p.map.dispose()), [papers]);

  return (
    <group>
      {PRESENTS.map((p, i) => (
        <Gift key={i} present={p} index={i} paper={papers.get(p.wrap)!} />
      ))}
    </group>
  );
}

function Gift({ present: p, index, paper }: { present: Present; index: number; paper: Paper }) {
  const at = presentPlace(index);
  // Each present tiles its paper at the same real-world scale.
  const map = useMemo(() => {
    const t = paper.map.clone();
    const k = ((p.w + p.d) / 2) * PATTERN_PER_METRE;
    t.repeat.set(k, k);
    t.needsUpdate = true;
    return t;
  }, [paper, p.w, p.d]);
  useEffect(() => () => map.dispose(), [map]);
  const ribbon = <meshStandardMaterial color={p.ribbon} roughness={0.45} metalness={0.15} />;
  const band = Math.min(p.w, p.d) * 0.16;

  return (
    <group position={[at.x, at.base, at.z]} rotation={[0, at.rot, 0]}>
      <mesh position={[0, p.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[p.w, p.h, p.d]} />
        <meshStandardMaterial map={map} metalness={paper.metalness} roughness={paper.roughness} />
      </mesh>
      {/* ribbon both ways round the box */}
      <mesh position={[0, p.h / 2, 0]}>
        <boxGeometry args={[p.w + 0.006, p.h + 0.006, band]} />
        {ribbon}
      </mesh>
      <mesh position={[0, p.h / 2, 0]}>
        <boxGeometry args={[band, p.h + 0.006, p.d + 0.006]} />
        {ribbon}
      </mesh>
      <Bow size={Math.min(p.w, p.d) * 0.32} y={p.h} color={p.ribbon} />
    </group>
  );
}

/** Two ribbon loops and a knot, sitting on the lid. */
function Bow({ size, y, color }: { size: number; y: number; color: string }) {
  const mat = <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} side={THREE.DoubleSide} />;
  return (
    <group position={[0, y + size * 0.32, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * size * 0.5, 0, 0]} rotation={[0, 0, s * 0.5]} scale={[1, 0.62, 1]} castShadow>
          <torusGeometry args={[size * 0.5, size * 0.14, 6, 14]} />
          {mat}
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[size * 0.22, 10, 8]} />
        {mat}
      </mesh>
    </group>
  );
}
