"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useKit, useRepeated, WHITE_PAINT } from "./kit";
import { makeSignFaceTexture } from "./textures";

/**
 * The Stars Hollow town sign, as it stands on the square.
 *
 * Two square white posts with ball finials; a scrolled pediment over a
 * crown moulding; a band of lattice; the blue sign in its moulded frame
 * — STARS HOLLOW between two stars, FOUNDED · 1779 · beneath — and a
 * taller lattice panel below it, down to a bottom rail just clear of
 * the grass.
 *
 * Origin at the foot of the sign, centred; the lettered face is +z.
 * It's lettered on both sides, as the real one is.
 */

/** Centre-to-centre of the posts. */
const SPAN = 2.0;
const POST = 0.14;
const POST_H = 2.56;
/** Clear width between the posts. */
const INNER = SPAN - POST;

const SIGN_BOTTOM = 1.13;
const SIGN_TOP = 2.02;
const DEPTH = 0.1;

export function TownSign() {
  const kit = useKit();
  const face = useMemo(makeSignFaceTexture, []);
  useEffect(() => () => face.dispose(), [face]);

  const lowerLattice = useRepeated((k) => k.lattice, 2.4, 0.9);
  const upperLattice = useRepeated((k) => k.lattice, 2.4, 0.3);
  const pediment = useMemo(makePedimentGeometry, []);
  useEffect(() => () => pediment.dispose(), [pediment]);

  const paint = (
    <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />
  );

  return (
    <group>
      {/* posts, caps and ball finials */}
      {[-SPAN / 2, SPAN / 2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, POST_H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[POST, POST_H, POST]} />
            {paint}
          </mesh>
          {/* a moulded cap, a neck, and the ball */}
          <mesh position={[0, POST_H + 0.025, 0]} castShadow>
            <boxGeometry args={[POST + 0.06, 0.05, POST + 0.06]} />
            {paint}
          </mesh>
          <mesh position={[0, POST_H + 0.075, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, 0.05, 12]} />
            {paint}
          </mesh>
          <mesh position={[0, POST_H + 0.17, 0]} castShadow>
            <sphereGeometry args={[0.095, 18, 14]} />
            {paint}
          </mesh>
          {/* a plinth where it meets the ground */}
          <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
            <boxGeometry args={[POST + 0.04, 0.18, POST + 0.04]} />
            {paint}
          </mesh>
        </group>
      ))}

      {/* rails: bottom, under the sign, over the sign, and the top */}
      {[
        { y: 0.32, h: 0.07 },
        { y: 1.07, h: 0.09 },
        { y: SIGN_TOP + 0.045, h: 0.07 },
        { y: 2.36, h: 0.08 },
      ].map((r) => (
        <mesh key={r.y} position={[0, r.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[INNER, r.h, DEPTH * 0.7]} />
          {paint}
        </mesh>
      ))}
      {/* crown moulding over the top rail, stepping out past the posts */}
      <mesh position={[0, 2.425, 0]} castShadow>
        <boxGeometry args={[SPAN + 0.16, 0.05, DEPTH + 0.1]} />
        {paint}
      </mesh>
      <mesh position={[0, 2.465, 0]} castShadow>
        <boxGeometry args={[SPAN + 0.1, 0.03, DEPTH + 0.06]} />
        {paint}
      </mesh>

      {/* the scrolled pediment */}
      <mesh
        geometry={pediment}
        position={[0, 2.48, -0.03]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />
      </mesh>

      {/* lattice: a low band above the sign, a tall panel below */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[INNER, 0.24]} />
        <meshToonMaterial
          color={WHITE_PAINT}
          gradientMap={kit.ramp}
          map={upperLattice}
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.69, 0]}>
        <planeGeometry args={[INNER, 0.68]} />
        <meshToonMaterial
          color={WHITE_PAINT}
          gradientMap={kit.ramp}
          map={lowerLattice}
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* a thin frame around each lattice panel */}
      <LatticeFrame y={2.2} h={0.24} />
      <LatticeFrame y={0.69} h={0.68} />

      {/* the sign board, its moulded frame, and the painted faces */}
      <mesh position={[0, (SIGN_BOTTOM + SIGN_TOP) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[INNER, SIGN_TOP - SIGN_BOTTOM, DEPTH]} />
        {paint}
      </mesh>
      {[1, -1].map((side) => (
        <group
          key={side}
          position={[0, (SIGN_BOTTOM + SIGN_TOP) / 2, (side * DEPTH) / 2]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[INNER - 0.18, SIGN_TOP - SIGN_BOTTOM - 0.16]} />
            {/* Lit a touch from within: painted sign blue goes muddy under
                the toon ramp, and the real one is bright in any light. */}
            <meshLambertMaterial map={face} emissive="#ffffff" emissiveMap={face} emissiveIntensity={0.28} />
          </mesh>
          <Moulding w={INNER - 0.14} h={SIGN_TOP - SIGN_BOTTOM - 0.12} />
        </group>
      ))}
    </group>
  );
}

/** The raised frame around the painted face. */
function Moulding({ w, h }: { w: number; h: number }) {
  const kit = useKit();
  const t = 0.035;
  const d = 0.03;
  return (
    <group>
      {[
        [0, h / 2 - t / 2, w, t],
        [0, -h / 2 + t / 2, w, t],
        [-w / 2 + t / 2, 0, t, h],
        [w / 2 - t / 2, 0, t, h],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, d / 2]} castShadow>
          <boxGeometry args={[bw, bh, d]} />
          <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />
        </mesh>
      ))}
    </group>
  );
}

/** Stiles either side of a lattice panel, inside the posts. */
function LatticeFrame({ y, h }: { y: number; h: number }) {
  const kit = useKit();
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (INNER / 2 - 0.02), y, 0]}>
          <boxGeometry args={[0.04, h, 0.05]} />
          <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The pediment: low at the ends, sweeping up in an ogee to a raised
 * centre, with a scroll cut in on either side of the crest — as on the
 * real sign, which rises in two S-curves to a flat-topped middle.
 */
function makePedimentGeometry(): THREE.ExtrudeGeometry {
  const half = SPAN / 2 + 0.02;
  const s = new THREE.Shape();
  s.moveTo(-half, 0);
  s.lineTo(half, 0);
  // right half, from the end inwards
  s.lineTo(half, 0.05);
  s.bezierCurveTo(half - 0.25, 0.06, half - 0.4, 0.1, half - 0.5, 0.17);
  s.bezierCurveTo(half - 0.58, 0.23, half - 0.6, 0.29, half - 0.7, 0.3);
  // the scroll: a small curl before the crest
  s.bezierCurveTo(half - 0.78, 0.31, half - 0.8, 0.24, half - 0.74, 0.22);
  s.bezierCurveTo(half - 0.8, 0.2, half - 0.86, 0.26, half - 0.84, 0.33);
  s.bezierCurveTo(half - 0.83, 0.37, half - 0.86, 0.39, half - 0.9, 0.39);
  s.lineTo(-(half - 0.9), 0.39);
  // left half, mirrored
  s.bezierCurveTo(-(half - 0.86), 0.39, -(half - 0.83), 0.37, -(half - 0.84), 0.33);
  s.bezierCurveTo(-(half - 0.86), 0.26, -(half - 0.8), 0.2, -(half - 0.74), 0.22);
  s.bezierCurveTo(-(half - 0.8), 0.24, -(half - 0.78), 0.31, -(half - 0.7), 0.3);
  s.bezierCurveTo(-(half - 0.6), 0.29, -(half - 0.58), 0.23, -(half - 0.5), 0.17);
  s.bezierCurveTo(-(half - 0.4), 0.1, -(half - 0.25), 0.06, -half, 0.05);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 14,
  });
  return g;
}
