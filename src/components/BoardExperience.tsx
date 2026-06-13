"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createClient } from "@/lib/supabase/client";
import {
  getBoard,
  getOrCreateActiveBoard,
  getProfiles,
  listItems,
} from "@/lib/api";
import { useBoardStore } from "@/lib/store";
import { useRealtimeBoard } from "@/lib/use-realtime-board";
import { getTheme } from "@/lib/themes";
import { Room } from "./three/Room";
import { BeachScene } from "./three/BeachScene";
import { Board } from "./three/Board";
import { NoteMesh } from "./three/NoteMesh";
import { PhotoMesh } from "./three/PhotoMesh";
import { CameraRig } from "./three/CameraRig";
import { Hud } from "./ui/Hud";
import { Toolbar } from "./ui/Toolbar";
import { ZoomControls } from "./ui/ZoomControls";
import { NoteComposer } from "./ui/NoteComposer";
import { PhotoComposer } from "./ui/PhotoComposer";
import { ItemEditor } from "./ui/ItemEditor";
import { ThemePicker } from "./ui/ThemePicker";

/**
 * The whole experience for one board: 3D scene + overlay UI.
 * With no boardId it loads (or creates) the couple's active board;
 * with a boardId it shows that board read-only (a "memory").
 */
export function BoardExperience({
  boardId,
  readOnly = false,
}: {
  boardId?: string;
  readOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const board = useBoardStore((s) => s.board);
  const items = useBoardStore((s) => s.items);
  const view = useBoardStore((s) => s.view);
  const mode = useBoardStore((s) => s.mode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const store = useBoardStore.getState();
    store.setReadOnly(readOnly);
    store.stepBack();
    store.setBoard(null);
    store.setItems([]);

    (async () => {
      try {
        const loadedBoard = boardId
          ? await getBoard(supabase, boardId)
          : await getOrCreateActiveBoard(supabase);
        if (!loadedBoard) throw new Error("That board doesn't exist.");
        const [loadedItems, profiles] = await Promise.all([
          listItems(supabase, loadedBoard.id),
          getProfiles(supabase),
        ]);
        if (!alive) return;
        const s = useBoardStore.getState();
        s.setBoard(loadedBoard);
        s.setItems(loadedItems);
        s.setProfiles(profiles);
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error ? err.message : "Could not load the board."
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, boardId, readOnly]);

  useRealtimeBoard(supabase, readOnly ? undefined : board?.id);

  const theme = getTheme(board?.theme);

  // Wheel + pinch zoom for the close-up view.
  const pinch = useRef<number | null>(null);
  // Drag-to-look-around while standing back in the room.
  const look = useRef<{ x: number; y: number } | null>(null);

  function onWheel(e: React.WheelEvent) {
    const s = useBoardStore.getState();
    if (s.view !== "board") return;
    s.setZoom(s.zoom * (e.deltaY > 0 ? 0.9 : 1.11));
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const s = useBoardStore.getState();
    if (pinch.current !== null && s.view === "board") {
      s.setZoom(s.zoom * (d / pinch.current));
    }
    pinch.current = d;
  }
  function onPointerDown(e: React.PointerEvent) {
    if (useBoardStore.getState().view !== "room") return;
    look.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!look.current) return;
    const s = useBoardStore.getState();
    if (s.view !== "room") {
      look.current = null;
      return;
    }
    const dx = (e.clientX - look.current.x) / window.innerWidth;
    const dy = (e.clientY - look.current.y) / window.innerHeight;
    if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004)
      s.setSuppressNextWalkUp(true);
    s.setRoomLook({
      yaw: s.roomLook.yaw - dx * 1.4,
      pitch: s.roomLook.pitch + dy * 1.1,
    });
    look.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp() {
    look.current = null;
    pinch.current = null;
  }

  const uiVars = {
    "--ui-bg": theme.ui.bg,
    "--ui-panel": theme.ui.panel,
    "--ui-accent": theme.ui.accent,
    "--ui-text": theme.ui.text,
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={uiVars}
      onWheel={onWheel}
      onTouchMove={onTouchMove}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        shadows
        camera={{ fov: 46, position: [0.55, 1.4, 3.3], near: 0.1, far: 40 }}
        dpr={[1, 2]}
        // without this, mobile browsers steal drag gestures for scrolling
        style={{ touchAction: "none" }}
      >
        {theme.scene === "beach" ? (
          <BeachScene theme={theme} />
        ) : (
          <Room theme={theme} />
        )}
        <Board theme={theme}>
          {items.map((item) =>
            item.kind === "photo" ? (
              <PhotoMesh key={item.id} item={item} theme={theme} />
            ) : (
              <NoteMesh key={item.id} item={item} theme={theme} />
            )
          )}
        </Board>
        <CameraRig />
      </Canvas>

      {/* ---- overlay UI ---- */}
      <Hud readOnly={readOnly} />
      <Toolbar />
      <ZoomControls />

      {view === "room" && !loading && !error && (
        <p className="pointer-events-none absolute bottom-24 inset-x-0 text-center text-sm opacity-80 drop-shadow">
          drag to look around · tap the board to walk up ✨
        </p>
      )}
      {view === "board" &&
        mode === "view" &&
        !readOnly &&
        items.length === 0 &&
        !loading && (
          <p className="pointer-events-none absolute bottom-24 inset-x-0 text-center text-sm opacity-80 drop-shadow">
            the board is feeling a little empty… tap ➕ to pin the first note 💌
          </p>
        )}
      {view === "board" && mode === "edit" && (
        <div className="pointer-events-none absolute top-20 inset-x-0 flex justify-center">
          <div className="cute-panel px-4 py-2 text-sm pop-in">
            ✏️ edit mode — drag to move, pull the corner to resize
          </div>
        </div>
      )}

      <NoteComposer />
      <PhotoComposer />
      <ItemEditor />
      <ThemePicker />

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <div className="cute-panel px-8 py-6 text-center pop-in">
            <div className="float-y text-4xl" aria-hidden>
              📌
            </div>
            <p className="mt-2">setting up the room…</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/40 p-6">
          <div className="cute-panel px-8 py-6 text-center max-w-sm">
            <p className="text-3xl" aria-hidden>
              🥺
            </p>
            <p className="mt-2">{error}</p>
            <button
              className="cute-button mt-4"
              onClick={() => location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
