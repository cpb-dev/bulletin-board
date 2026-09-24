"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { THEME_MORPH_MS } from "@/lib/theme-view";

/**
 * Frames the new theme must draw before the dissolve starts. The first
 * frame of a freshly mounted scene compiles its shaders and uploads its
 * textures, which can stall the page for a moment; waiting it out means
 * the whole dissolve is actually seen rather than lost in the stall.
 */
const SETTLE_FRAMES = 3;
/** Start the dissolve anyway if frames stop coming (e.g. tab hidden). */
const SETTLE_TIMEOUT_MS = 2500;

/** Shared between the DOM side and the `<Canvas>` side of a morph. */
interface MorphBridge {
  /** Renders the current frame and returns the WebGL canvas holding it. */
  snapshot: (() => HTMLCanvasElement | null) | null;
  /** Frames left before the dissolve may start. */
  settleFrames: number;
  /** Starts the dissolve. */
  release: (() => void) | null;
}

/**
 * Lives inside `<Canvas>` so the DOM side can grab the frame on screen,
 * and so it can tell when the new theme has settled. Rendering and
 * copying in the same task keeps the drawing buffer intact, so no
 * `preserveDrawingBuffer` (and its cost) is needed.
 */
export function SnapshotBridge({
  bridgeRef,
}: {
  bridgeRef: MutableRefObject<MorphBridge>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const bridge = bridgeRef.current;
    bridge.snapshot = () => {
      gl.render(scene, camera);
      return gl.domElement;
    };
    return () => {
      bridge.snapshot = null;
    };
  }, [gl, scene, camera, bridgeRef]);
  useFrame(() => {
    const bridge = bridgeRef.current;
    if (bridge.settleFrames > 0 && --bridge.settleFrames === 0) {
      bridge.release?.();
    }
  });
  return null;
}

/**
 * Swapping a board between its themes (BB-3) with a morph rather than a
 * cut: the old room is frozen onto a 2D canvas laid over the 3D one, the
 * new theme mounts underneath, and once it has drawn, the frozen frame
 * blurs and dissolves into it.
 *
 * Returns the theme id to actually render — it trails `themeId` by the
 * one layout pass it takes to capture the old frame. Only a change on the
 * same board morphs; loading a board (or a different one) just appears.
 */
export function useThemeMorph(
  boardId: string | undefined,
  themeId: string | undefined
) {
  const bridgeRef = useRef<MorphBridge>({
    snapshot: null,
    settleFrames: 0,
    release: null,
  });
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [renderedThemeId, setRenderedThemeId] = useState(themeId);
  const lastBoardId = useRef(boardId);

  useLayoutEffect(() => {
    if (themeId === renderedThemeId) return;
    const sameBoard =
      lastBoardId.current === boardId &&
      boardId !== undefined &&
      renderedThemeId !== undefined &&
      themeId !== undefined;
    lastBoardId.current = boardId;
    if (sameBoard) freezeFrame(bridgeRef.current, overlayRef.current);
    setRenderedThemeId(themeId);
  }, [boardId, themeId, renderedThemeId]);

  return { renderedThemeId, bridgeRef, overlayRef };
}

/** The layer the frozen frame dissolves on. Sits right after `<Canvas>`. */
export function ThemeMorphLayer({
  overlayRef,
}: {
  overlayRef: MutableRefObject<HTMLCanvasElement | null>;
}) {
  return (
    <canvas
      ref={overlayRef}
      aria-hidden
      className="theme-morph-layer"
      style={{ animationDuration: `${THEME_MORPH_MS}ms` }}
      onAnimationEnd={(e) => e.currentTarget.classList.remove("morphing")}
    />
  );
}

function freezeFrame(bridge: MorphBridge, overlay: HTMLCanvasElement | null) {
  if (!bridge.snapshot || !overlay) return;
  try {
    const frame = bridge.snapshot();
    const ctx = overlay.getContext("2d");
    if (!frame || !ctx) return;
    overlay.width = frame.width;
    overlay.height = frame.height;
    ctx.drawImage(frame, 0, 0);
  } catch {
    // No frame to freeze (context lost, etc.) — fall back to a plain cut.
    return;
  }
  // Hold the old room still until the new one has drawn, then dissolve.
  overlay.classList.remove("morphing");
  overlay.classList.add("frozen");
  const fallback = setTimeout(() => bridge.release?.(), SETTLE_TIMEOUT_MS);
  bridge.settleFrames = SETTLE_FRAMES;
  bridge.release = () => {
    clearTimeout(fallback);
    bridge.release = null;
    bridge.settleFrames = 0;
    overlay.classList.remove("frozen");
    // Restart cleanly even if a previous dissolve is still running.
    void overlay.offsetWidth;
    overlay.classList.add("morphing");
  };
}
