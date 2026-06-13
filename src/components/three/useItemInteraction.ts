"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { createClient } from "@/lib/supabase/client";
import { updateItem } from "@/lib/api";
import {
  BOARD_SURFACE_Z,
  normToWorld,
  round3,
  scaleFromHandleDrag,
  worldToNorm,
} from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";

const DRAG_THRESHOLD = 0.035; // normalized units before a tap becomes a drag

/** Shared board plane (z = cork surface) for projecting pointer rays. */
function useBoardPlane() {
  return useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -BOARD_SURFACE_Z),
    []
  );
}

/**
 * Pointer behaviour for a pinned item, split cleanly by mode so zoom
 * and pan never "grab" a note by accident:
 *  - room view        → tap walks you up to the item
 *  - board + view     → tap opens the reader/editor; drags do nothing
 *                       here (the board itself handles panning)
 *  - board + edit     → tap selects; drag moves and auto-saves
 */
export function useItemDrag(item: BoardItem) {
  const supabase = useMemo(() => createClient(), []);
  const plane = useBoardPlane();
  const hit = useRef(new THREE.Vector3());
  const drag = useRef<{ moved: boolean } | null>(null);

  const isActive = useBoardStore(
    (s) => s.draggingId === item.id || s.resizingId === item.id
  );
  const isSelected = useBoardStore(
    (s) => s.selectedId === item.id && s.mode === "edit"
  );

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    const { view, readOnly, mode } = useBoardStore.getState();
    if (view === "room") {
      e.stopPropagation();
      useBoardStore.getState().walkUp({ x: item.x, y: item.y });
      return;
    }
    if (mode !== "edit" || readOnly) {
      // View mode: let the press fall through to a tap that opens the
      // editor; never start a move.
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { moved: false };
    useBoardStore.getState().setSelected(item.id);
    useBoardStore.getState().setDragging(item.id);
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!drag.current) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(plane, hit.current)) return;
    const { nx, ny } = worldToNorm(hit.current.x, hit.current.y);
    const state = useBoardStore.getState();
    const current = state.items.find((i) => i.id === item.id);
    if (
      current &&
      Math.hypot(nx - current.x, ny - current.y) > DRAG_THRESHOLD
    ) {
      drag.current.moved = true;
    }
    if (drag.current.moved) state.moveItemLocal(item.id, nx, ny);
  }

  function onPointerUp(e: ThreeEvent<PointerEvent>) {
    const { view, readOnly, mode } = useBoardStore.getState();
    if (view !== "room" && (mode !== "edit" || readOnly) && !drag.current) {
      // Clean tap in view mode → open the reader/editor.
      e.stopPropagation();
      useBoardStore.getState().setEditing(item.id);
      return;
    }
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    const wasMoved = drag.current.moved;
    drag.current = null;
    const state = useBoardStore.getState();
    state.setDragging(null);
    if (wasMoved) {
      const moved = state.items.find((i) => i.id === item.id);
      if (moved) {
        updateItem(supabase, item.id, {
          x: round3(moved.x),
          y: round3(moved.y),
        }).catch(() => {
          /* offline: local position stays, next move persists it */
        });
      }
    }
  }

  return { isActive, isSelected, onPointerDown, onPointerMove, onPointerUp };
}

/**
 * Corner resize handle behaviour. Tracks the pointer's distance from
 * the item centre and scales so the grabbed corner follows the finger.
 */
export function useResizeHandle(item: BoardItem) {
  const supabase = useMemo(() => createClient(), []);
  const plane = useBoardPlane();
  const hit = useRef(new THREE.Vector3());
  const grab = useRef<{ grabDist: number; scaleAtGrab: number } | null>(null);

  function centerDist(point: THREE.Vector3): number {
    const { x, y } = normToWorld(item.x, item.y);
    return Math.hypot(point.x - x, point.y - y);
  }

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (!e.ray.intersectPlane(plane, hit.current)) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    grab.current = {
      grabDist: centerDist(hit.current),
      scaleAtGrab: item.scale,
    };
    useBoardStore.getState().setResizing(item.id);
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (!grab.current) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(plane, hit.current)) return;
    const next = scaleFromHandleDrag(
      grab.current.grabDist,
      centerDist(hit.current),
      grab.current.scaleAtGrab
    );
    useBoardStore.getState().scaleItemLocal(item.id, next);
  }

  function onPointerUp(e: ThreeEvent<PointerEvent>) {
    if (!grab.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    grab.current = null;
    const state = useBoardStore.getState();
    state.setResizing(null);
    const current = state.items.find((i) => i.id === item.id);
    if (current) {
      updateItem(supabase, item.id, { scale: current.scale }).catch(() => {
        /* offline: local scale stays, next resize persists it */
      });
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
