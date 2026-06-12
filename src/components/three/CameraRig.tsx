"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, normToWorld } from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";

const ROOM_POS = new THREE.Vector3(0.55, 1.4, 3.3);
const ROOM_TARGET = new THREE.Vector3(0, 1.45, BOARD.wallZ);

/**
 * Cozy game-feel camera. Two stations: standing back in the room, or
 * walked up close to the board. Transitions are damped with a gentle
 * walking bob, and the camera sways slightly with the pointer so the
 * scene always feels alive.
 */
export function CameraRig() {
  const view = useBoardStore((s) => s.view);
  const focus = useBoardStore((s) => s.focus);
  const zoom = useBoardStore((s) => s.zoom);
  const pointer = useThree((s) => s.pointer);

  const goalPos = useRef(new THREE.Vector3().copy(ROOM_POS));
  const goalTarget = useRef(new THREE.Vector3().copy(ROOM_TARGET));
  const lookTarget = useRef(new THREE.Vector3().copy(ROOM_TARGET));

  useFrame((state, delta) => {
    const cam = state.camera;

    if (view === "room") {
      goalPos.current.copy(ROOM_POS);
      goalTarget.current.copy(ROOM_TARGET);
    } else {
      const { x, y } = normToWorld(focus.x, focus.y);
      const dist = 1.7 / zoom;
      goalTarget.current.set(x, y, BOARD.wallZ + 0.05);
      goalPos.current.set(x * 0.94, y * 0.97 + 0.05, BOARD.wallZ + dist);
    }

    const parallaxX = pointer.x * (view === "room" ? 0.1 : 0.05);
    const parallaxY = pointer.y * (view === "room" ? 0.06 : 0.04);

    // Little footstep bob while we're still far from where we're headed.
    const distToGoal = cam.position.distanceTo(goalPos.current);
    const bob =
      Math.min(distToGoal, 1) *
      Math.sin(state.clock.elapsedTime * 9) *
      0.03;

    const lambda = 3.4;
    cam.position.x = THREE.MathUtils.damp(
      cam.position.x,
      goalPos.current.x + parallaxX,
      lambda,
      delta
    );
    cam.position.y = THREE.MathUtils.damp(
      cam.position.y,
      goalPos.current.y + parallaxY + bob,
      lambda,
      delta
    );
    cam.position.z = THREE.MathUtils.damp(
      cam.position.z,
      goalPos.current.z,
      lambda,
      delta
    );

    const tLambda = 4.2;
    lookTarget.current.x = THREE.MathUtils.damp(
      lookTarget.current.x,
      goalTarget.current.x,
      tLambda,
      delta
    );
    lookTarget.current.y = THREE.MathUtils.damp(
      lookTarget.current.y,
      goalTarget.current.y,
      tLambda,
      delta
    );
    lookTarget.current.z = THREE.MathUtils.damp(
      lookTarget.current.z,
      goalTarget.current.z,
      tLambda,
      delta
    );
    cam.lookAt(lookTarget.current);
  });

  return null;
}
