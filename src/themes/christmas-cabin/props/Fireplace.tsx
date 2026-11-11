"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { FIREPLACE, ROOM } from "../lib/layout";
import { NO_TAPS, registerTap, SANTA_TOTAL, santaPose, SOLE_HIDDEN, SOLE_LOWEST, THROAT, type TapState } from "../lib/fireplace";
import { Stonework } from "./fireplace/Stonework";
import { Firebox } from "./fireplace/Firebox";
import { Mantel } from "./fireplace/Mantel";
import { SantaLeg } from "./fireplace/SantaBoots";

/** Where Santa's soles wait between visits: well up the flue. */
const SOLE_PARKED = SOLE_HIDDEN + 0.3;

/** A tap that moved further than this (pixels) was a drag, not a tap. */
const TAP_SLOP = 6;

/**
 * The fireplace on the back wall, right of the board (BB-35): fieldstone
 * up to the ceiling, a timber mantel with garland and two knitted
 * stockings, and a crackling log fire with sparks and smoke drawn up the
 * chimney.
 *
 * Double-tap it and Santa's boots come down the chimney, dangle and kick
 * above the fire for a few seconds, then get yanked back up. The fire
 * dips while they're down. The timing lives in `lib/fireplace.ts`.
 */
export function Fireplace() {
  const { x, depth } = FIREPLACE;
  const taps = useRef<TapState>(NO_TAPS);
  const santaFrom = useRef<number | null>(null);
  // Set by a double tap; the next frame turns it into a start time.
  const santaPending = useRef(false);
  const santa = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const dim = useRef(0);

  useFrame(({ clock: c }) => {
    if (santaPending.current) {
      santaPending.current = false;
      santaFrom.current = c.elapsedTime;
    }
    const g = santa.current;
    if (!g) return;
    const t = santaFrom.current === null ? -1 : c.elapsedTime - santaFrom.current;
    const pose = santaPose(t);
    if (!pose.visible) {
      if (santaFrom.current !== null && t >= SANTA_TOTAL) santaFrom.current = null;
      // Parked up the flue, out of every camera's sight behind the lintel.
      // Kept drawn rather than hidden, so his shaders compile with the
      // rest of the scene at load — not with a hitch the first time he
      // drops in (or, on a slow device, not in time to be seen at all).
      g.position.y = SOLE_PARKED;
      if (left.current) left.current.rotation.x = 0;
      if (right.current) right.current.rotation.x = 0;
      dim.current = 0;
      return;
    }
    g.position.y = pose.soleY;
    if (left.current) left.current.rotation.x = pose.swing[0];
    if (right.current) right.current.rotation.x = pose.swing[1];
    // The fire ducks as the boots come down near it.
    dim.current = Math.max(0, Math.min(1, (SOLE_HIDDEN - pose.soleY) / (SOLE_HIDDEN - SOLE_LOWEST)));
  });

  function onTap(e: ThreeEvent<MouseEvent>) {
    if (e.delta > TAP_SLOP) return;
    e.stopPropagation();
    // Taps are timed by the wall clock, not the render clock: the render
    // clock only moves once a frame, so on a slow phone (or a stalled
    // frame) two quick taps can be stamped a second apart and missed.
    const now = performance.now() / 1000;
    const busy = santaFrom.current !== null || santaPending.current;
    const { state, double } = registerTap(taps.current, now, busy);
    taps.current = state;
    if (double) santaPending.current = true;
  }

  return (
    <group position={[x, 0, ROOM.backZ + depth / 2]} onClick={onTap}>
      <Stonework />
      <Firebox dim={dim} />
      <Mantel />
      {/* Santa's legs: the group sits at the soles; the hips are LEG above. */}
      <group ref={santa} position={[0, SOLE_PARKED, THROAT.z - 0.04]}>
        <SantaLeg ref={left} x={-0.085} />
        <SantaLeg ref={right} x={0.085} />
      </group>
    </group>
  );
}

