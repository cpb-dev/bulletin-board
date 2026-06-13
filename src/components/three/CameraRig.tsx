"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z, normToWorld } from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";

// Standing further back in the room now, so you can take the whole
// scene in and look around before walking up.
const ROOM_POS = new THREE.Vector3(0.4, 1.45, 4.4);
const ROOM_TARGET = new THREE.Vector3(0, 1.5, BOARD.wallZ);
/** How far the look target swings per radian of head turn. */
const LOOK_RANGE = new THREE.Vector3(5.5, 2.6, 0);

/**
 * Cozy game-feel camera. Two stations: standing back in the room (where
 * you can drag to look around), or walked up close to the board with
 * smooth zoom. Transitions are damped with a gentle walking bob.
 */
export function CameraRig() {
  const view = useBoardStore((s) => s.view);
  const focus = useBoardStore((s) => s.focus);
  const zoom = useBoardStore((s) => s.zoom);
  const roomLook = useBoardStore((s) => s.roomLook);
  const pointer = useThree((s) => s.pointer);

  const goalPos = useRef(new THREE.Vector3().copy(ROOM_POS));
  const goalTarget = useRef(new THREE.Vector3().copy(ROOM_TARGET));
  const lookTarget = useRef(new THREE.Vector3().copy(ROOM_TARGET));

  useFrame((state, delta) => {
    const cam = state.camera;

    if (view === "room") {
      goalPos.current.copy(ROOM_POS);
      // Turning your head swings where you're looking and nudges the
      // camera the opposite way a touch, for a parallax "lean".
      goalTarget.current.set(
        ROOM_TARGET.x + roomLook.yaw * LOOK_RANGE.x,
        ROOM_TARGET.y + roomLook.pitch * LOOK_RANGE.y,
        ROOM_TARGET.z
      );
      goalPos.current.x += roomLook.yaw * 0.6;
      goalPos.current.y += roomLook.pitch * 0.4;
    } else {
      const { x, y } = normToWorld(focus.x, focus.y);
      // Closer base distance + wider zoom range = a satisfying lean-in.
      const dist = 1.35 / zoom;
      goalTarget.current.set(x, y, BOARD_SURFACE_Z);
      goalPos.current.set(x * 0.96, y * 0.98 + 0.04, BOARD_SURFACE_Z + dist);
    }

    const parallaxX = pointer.x * (view === "room" ? 0.08 : 0.04);
    const parallaxY = pointer.y * (view === "room" ? 0.05 : 0.03);

    // Little footstep bob while we're still far from where we're headed.
    const distToGoal = cam.position.distanceTo(goalPos.current);
    const bob =
      Math.min(distToGoal, 1) * Math.sin(state.clock.elapsedTime * 9) * 0.03;

    const lambda = view === "board" ? 4.2 : 3.4;
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

    const tLambda = view === "board" ? 5 : 4.2;
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
