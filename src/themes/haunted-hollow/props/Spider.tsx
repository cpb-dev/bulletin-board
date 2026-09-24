"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  crawlSpeed,
  gaitPhase,
  LEGS,
  legPose,
  reflect,
  wanderTurn,
  type StartPose,
} from "../lib/spider";

/**
 * A spider on the board.
 *
 * It was two spheres and six boxes that smoothstepped between random
 * points and froze. This one has a body in two parts, eight legs of
 * three segments each with the knee above the back the way a spider's
 * is, and it walks: the legs are driven by how far it has actually
 * travelled, so the gait belongs to the movement rather than running
 * alongside it.
 *
 * Touch it and it bolts, then settles back to an amble over a couple
 * of seconds. See `src/lib/spider.ts` for everything that decides how
 * it moves.
 *
 * Lives on the Haunted Hollow board only — it is rendered from the
 * `cobwebs` branch of the board's decor switch.
 */

/** Body length, front of the head to the back of the abdomen. */
const BODY = 0.055;

/**
 * Where each leg leaves the body and which way it points.
 *
 * The spider is flat against the board, so a leg is two segments in the
 * board's own plane: one out from the socket, one bent back at the
 * knee. `base` is measured from straight ahead and mirrored per side —
 * without the mirror every leg fans the same way and the spider comes
 * out with four legs and a limp.
 */
const SOCKETS = Array.from({ length: LEGS }, (_, i) => {
  const side = i < 4 ? 1 : -1;
  const along = i % 4; // 0 front .. 3 back
  return {
    side,
    // 32 degrees for the front pair round to 126 for the back
    base: side * (0.56 + along * 0.55),
    // knee folds towards the rear
    bend: side * (0.85 + along * 0.1),
    at: [BODY * (0.18 - along * 0.13), side * BODY * 0.17, 0] as [
      number,
      number,
      number,
    ],
    // the front and back pairs are longest, as they are on a spider
    length: 1 + (along === 0 || along === 3 ? 0.2 : 0),
  };
});

export function Spider({
  seed,
  /** Where it begins. Callers scatter these with `scatterStarts`. */
  start,
  /** Half-extents it is kept within, in board units. */
  bounds,
  z,
}: {
  seed: number;
  start: StartPose;
  bounds: { x: number; y: number };
  z: number;
}) {
  const root = useRef<THREE.Group>(null);
  const knees = useRef<(THREE.Group | null)[]>([]);
  const shins = useRef<(THREE.Group | null)[]>([]);

  /**
   * Everything that changes per frame, kept off React.
   *
   * Seeded from `start` once. Re-reading the prop each frame would
   * teleport it back the moment anything above re-renders.
   */
  const state = useRef({
    x: start.x,
    y: start.y,
    heading: start.heading,
    // so six spiders starting together are not all mid-stride in step
    travelled: seed * 0.031,
    touchedAt: -99,
    now: 0,
  });

  const geo = useMemo(() => {
    // Abdomen: an egg, fattest behind and slightly flattened.
    const abdomen = new THREE.SphereGeometry(BODY * 0.42, 12, 10);
    abdomen.scale(1.25, 1, 0.78);
    // Cephalothorax: smaller, rounder, lower.
    const head = new THREE.SphereGeometry(BODY * 0.27, 10, 8);
    head.scale(1.1, 0.95, 0.72);
    // One leg segment, drawn along +X so a joint is a rotation about Z.
    const seg = new THREE.CylinderGeometry(
      BODY * 0.035,
      BODY * 0.055,
      1,
      6
    );
    seg.rotateZ(-Math.PI / 2);
    seg.translate(0.5, 0, 0);
    const eye = new THREE.SphereGeometry(BODY * 0.05, 6, 5);
    return { abdomen, head, seg, eye };
  }, []);

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    // A tab that has been in the background hands back a huge delta;
    // without this the spider teleports across the board on return.
    const delta = Math.min(rawDelta, 1 / 20);
    const s = state.current;
    s.now += delta;

    const speed = crawlSpeed(s.now - s.touchedAt);
    // It turns harder while it is panicking, which is what makes a
    // bolt look like a bolt rather than a fast stroll.
    const panic = speed > 0.2 ? 2.6 : 1;
    s.heading += wanderTurn(s.now, seed) * delta * panic;

    const step = speed * delta;
    s.x += Math.cos(s.heading) * step;
    s.y += Math.sin(s.heading) * step;
    s.travelled += step;

    const r = reflect(s.x, s.y, s.heading, bounds);
    s.x = r.x;
    s.y = r.y;
    s.heading = r.heading;

    g.position.set(s.x, s.y, z);
    g.rotation.z = s.heading;

    for (let i = 0; i < LEGS; i++) {
      const pose = legPose(gaitPhase(i, s.travelled));
      const socket = SOCKETS[i];
      const knee = knees.current[i];
      const shin = shins.current[i];
      // The swing sweeps the whole leg fore and aft about its socket,
      // and the lift takes the foot off the board — which on a vertical
      // board means out towards the viewer.
      if (knee) {
        knee.rotation.z = socket.base + pose.swing * 0.3 * socket.side;
        knee.position.z = pose.lift * BODY * 0.22;
      }
      // the knee straightens as the leg reaches forward and folds as it
      // drags back, which is what stops it looking like a rigid spoke
      if (shin) shin.rotation.z = socket.bend * (1 - pose.swing * 0.22);
    }
  });

  function startle(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const s = state.current;
    s.touchedAt = s.now;
    // bolt away from whoever just touched it, give or take
    s.heading += Math.PI * (0.6 + Math.random() * 0.8);
  }

  const dark = <meshBasicMaterial color="#17141c" />;

  return (
    <group ref={root} position={[0, 0, z]}>
      {/* One flat target over the whole spider. Hitting eight moving
          shins with a fingertip is not a game anyone wants to play. */}
      <mesh onPointerDown={startle} onClick={(e) => e.stopPropagation()}>
        <circleGeometry args={[BODY * 1.5, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh geometry={geo.abdomen} position={[-BODY * 0.28, 0, BODY * 0.12]}>
        {dark}
      </mesh>
      <mesh geometry={geo.head} position={[BODY * 0.2, 0, BODY * 0.08]}>
        <meshBasicMaterial color="#221d28" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={geo.eye}
          position={[BODY * 0.38, side * BODY * 0.1, BODY * 0.14]}
        >
          <meshBasicMaterial color="#0a080d" />
        </mesh>
      ))}

      {SOCKETS.map((socket, i) => {
        const thigh = BODY * 0.5 * socket.length;
        const shin = BODY * 0.62 * socket.length;
        return (
          <group key={i} position={socket.at}>
            {/* out from the body to the knee */}
            <group
              ref={(n) => {
                knees.current[i] = n;
              }}
              rotation={[0, 0, socket.base]}
            >
              <mesh geometry={geo.seg} scale={[thigh, 1, 1]}>
                {dark}
              </mesh>
              {/* and back from the knee to the foot */}
              <group
                ref={(n) => {
                  shins.current[i] = n;
                }}
                position={[thigh, 0, 0]}
                rotation={[0, 0, socket.bend]}
              >
                <mesh geometry={geo.seg} scale={[shin, 0.78, 0.78]}>
                  {dark}
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}
