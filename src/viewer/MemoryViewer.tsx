/**
 * The exported memory, rendered offline.
 *
 * Deliberately built from the app's own 3D components — the theme's
 * scene, `Board`, `NoteMesh`, `PhotoMesh`, `HeldItem`, `CameraRig` —
 * rather than a simplified copy, because the whole promise of a keepsake
 * is that it looks exactly like the board did. Only the 2D overlay is
 * the viewer's own: the app's HUD is Next routing, sign-out, the theme
 * picker and notifications, none of which mean anything in a folder on
 * someone's laptop.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Board } from "@/components/three/Board";
import { NoteMesh } from "@/components/three/NoteMesh";
import { PhotoMesh } from "@/components/three/PhotoMesh";
import { HeldItem } from "@/components/three/HeldItem";
import { CameraRig } from "@/components/three/CameraRig";
import { CAMERA_FOV, EXTENDED_MAX_NX } from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import { getThemeModule } from "@/themes/scenes";
import type { MemoryPayload } from "./memory";

export function MemoryViewer({ memory }: { memory: MemoryPayload }) {
  const view = useBoardStore((s) => s.view);
  const items = useBoardStore((s) => s.items);
  const heldId = useBoardStore((s) => s.heldId);
  const setHeld = useBoardStore((s) => s.setHeld);
  const [ready, setReady] = useState(false);

  // Fill the store once, read-only, and never touch it again: there is
  // no realtime, no editing and nothing to save.
  useEffect(() => {
    const store = useBoardStore.getState();
    store.setReadOnly(true);
    store.stepBack();
    store.setBoard(memory.board);
    store.setItems(memory.items);
    store.setProfiles(memory.profiles);
    setReady(true);
  }, [memory]);

  // A board with a second theme is exported as a page per theme (BB-3);
  // older exports carry no `theme` and show the board's own.
  const { palette: theme, Scene, BoardDecor } = getThemeModule(
    memory.theme ?? memory.board.theme
  );

  useEffect(() => {
    useBoardStore.getState().setFocusMaxX(theme.miniBoard ? EXTENDED_MAX_NX : 1);
  }, [theme.miniBoard]);

  const gestures = useBoardGestures();

  const uiVars = {
    "--ui-bg": theme.ui.bg,
    "--ui-panel": theme.ui.panel,
    "--ui-accent": theme.ui.accent,
    "--ui-text": theme.ui.text,
  } as React.CSSProperties;

  const saved = memory.board.archived_at ?? memory.board.created_at;

  return (
    <div style={{ position: "absolute", inset: 0, ...uiVars }} {...gestures}>
      <Canvas
        shadows
        camera={{
          fov: CAMERA_FOV,
          position: [0.55, 1.4, 3.3],
          near: 0.1,
          far: 120,
        }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
      >
        <Scene theme={theme} />
        <Board theme={theme} decor={BoardDecor}>
          {ready &&
            items.map((item) =>
              item.kind === "photo" ? (
                <PhotoMesh key={item.id} item={item} theme={theme} />
              ) : (
                <NoteMesh key={item.id} item={item} theme={theme} />
              )
            )}
        </Board>
        <HeldItem theme={theme} />
        <CameraRig />
      </Canvas>

      <div className="viewer-title">
        <span className="viewer-chip">
          {theme.emoji} {memory.board.title}
          <small>
            a memory · kept {new Date(saved).toLocaleDateString()}
          </small>
        </span>
        {memory.alternate && (
          <a
            className="viewer-button round ghost viewer-switch"
            href={encodeURIComponent(memory.alternate.file)}
            aria-label={`See it in ${memory.alternate.name}`}
            title={`See it in ${memory.alternate.name}`}
          >
            {memory.alternate.emoji}
          </a>
        )}
      </div>

      {view === "board" && <ZoomButtons />}

      {heldId && (
        <div className="viewer-held">
          <button className="viewer-button ghost" onClick={() => setHeld(null)}>
            ✕ put it back
          </button>
          <p className="viewer-hint">drag to tilt &amp; look at it ✨</p>
        </div>
      )}

      {!heldId && (
        <p className="viewer-hint">
          {view === "room"
            ? "drag to look around · tap the board to walk up ✨"
            : "drag to move across the board · tap something to read it"}
        </p>
      )}
    </div>
  );
}

function ZoomButtons() {
  const nudgeZoom = useBoardStore((s) => s.nudgeZoom);
  const setZoom = useBoardStore((s) => s.setZoom);
  return (
    <div className="viewer-zoom">
      <button
        className="viewer-button round"
        onClick={() => nudgeZoom(1.25)}
        aria-label="Zoom in"
      >
        ＋
      </button>
      <button
        className="viewer-button round"
        onClick={() => nudgeZoom(0.8)}
        aria-label="Zoom out"
      >
        －
      </button>
      <button
        className="viewer-button round small ghost"
        onClick={() => setZoom(1)}
        aria-label="Reset zoom"
      >
        ⤢
      </button>
    </div>
  );
}

/**
 * Wheel, pinch and look-around, matching the app's board.
 *
 * Kept here rather than shared with `BoardExperience`: the export is a
 * separate bundle with its own lifetime, and a change to the live board
 * should never be able to alter how an already-downloaded memory
 * behaves. If the two ever need to move together, extract them then.
 */
function useBoardGestures() {
  const pinch = useRef<number | null>(null);
  const look = useRef<{ x: number; y: number } | null>(null);

  return useMemo(
    () => ({
      onWheel(e: React.WheelEvent) {
        const s = useBoardStore.getState();
        if (s.view !== "board") return;
        s.setZoom(s.zoom * (e.deltaY > 0 ? 0.9 : 1.11));
      },
      onTouchMove(e: React.TouchEvent) {
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
      },
      onPointerDown(e: React.PointerEvent) {
        if (useBoardStore.getState().view !== "room") return;
        look.current = { x: e.clientX, y: e.clientY };
      },
      onPointerMove(e: React.PointerEvent) {
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
      },
      onPointerUp() {
        look.current = null;
        pinch.current = null;
      },
      onPointerCancel() {
        look.current = null;
        pinch.current = null;
      },
    }),
    []
  );
}
