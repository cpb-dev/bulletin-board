"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Board } from "@/components/three/Board";
import { CAMERA_FOV } from "@/lib/board-geometry";
import { getThemeModule } from "@/themes/scenes";
import { resolvePhase, type DayPhase } from "@/lib/day-cycle";
import { NoteMesh } from "@/components/three/NoteMesh";
import type { BoardTheme } from "@/themes";
import type { BoardItem } from "@/lib/types";

/**
 * `notes=1` pins one note of every shape (BB-24), in the theme's papers,
 * plus a pre-BB-24 row (no shape column) for each paper, so a render shows
 * old notes and new shapes side by side.
 */
function sampleNotes(theme: BoardTheme): BoardItem[] {
  const shapes = [null, "heart", "circle", "cloud", "star", "torn"];
  const note = (i: number, paper: string, shape: string | null, x: number, y: number): BoardItem => ({
    id: `sample-${i}`,
    board_id: "dev",
    kind: "note",
    content: shape ?? `old ${paper}`,
    photo_path: null,
    paper,
    ...(shape ? { shape } : {}),
    x,
    y,
    rotation: ((i % 3) - 1) * 0.05,
    scale: 1,
    fixture_id: null,
    created_by: null,
    created_at: "2026-09-25T12:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  });
  const papers = theme.papers.map((p) => p.id);
  return [
    ...shapes.map((shape, i) =>
      note(i, papers[(i + 1) % papers.length], shape, -0.8 + i * 0.32, 0.45)
    ),
    ...papers.map((paper, i) => note(10 + i, paper, null, -0.8 + i * 0.32, -0.4)),
  ];
}

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
        <Board theme={theme} decor={BoardDecor} phase={phase} />
        {params.get("notes") &&
          sampleNotes(theme).map((item) => (
            <NoteMesh key={item.id} item={item} theme={theme} />
          ))}
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
