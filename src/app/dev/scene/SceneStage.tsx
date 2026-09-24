"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Board } from "@/components/three/Board";
import { CAMERA_FOV } from "@/lib/board-geometry";
import { getThemeModule } from "@/themes/scenes";
import { resolvePhase, type DayPhase } from "@/lib/day-cycle";

/** "x,y,z" -> a tuple, or the fallback if it doesn't parse. */
function vec(s: string | null, fallback: [number, number, number]) {
  const v = (s ?? "").split(",").map(Number);
  return v.length === 3 && v.every(Number.isFinite)
    ? (v as [number, number, number])
    : fallback;
}

/** The room-view station from CameraRig. */
const ROOM_CAMERA: [number, number, number] = [0.4, 1.45, 4.4];
const ROOM_TARGET: [number, number, number] = [0, 1.5, -2.2];

function Stage() {
  const params = useSearchParams();
  const { palette: theme, Scene, BoardDecor, dayCycle } = getThemeModule(params.get("t"));
  // `p=day|evening|night` stages a phase; otherwise it's the phase now.
  const phase = resolvePhase(
    dayCycle && { ...dayCycle, pin: (params.get("p") as DayPhase | null) ?? dayCycle.pin },
    new Date()
  );
  const cam = vec(params.get("c"), ROOM_CAMERA);
  const look = vec(params.get("l"), ROOM_TARGET);
  const fov = Number(params.get("fov") ?? CAMERA_FOV);

  return (
    <div className="fixed inset-0" style={{ background: "#000" }}>
      <Canvas
        shadows
        camera={{ fov, position: cam, near: 0.1, far: 120 }}
        dpr={[1, 2]}
        onCreated={({ gl, camera }) => {
          camera.lookAt(...look);
          gl.domElement.dataset.ready = "1";
          // for measuring draw calls from a script
          (window as unknown as { __gl?: unknown }).__gl = gl;
        }}
      >
        <Scene theme={theme} phase={phase} />
        <Board theme={theme} decor={BoardDecor} />
      </Canvas>
    </div>
  );
}

export function SceneStage() {
  return (
    <Suspense fallback={null}>
      <Stage />
    </Suspense>
  );
}
