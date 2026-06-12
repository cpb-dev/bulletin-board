"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { createClient } from "@/lib/supabase/client";
import { updateItem } from "@/lib/api";
import {
  BOARD_SURFACE_Z,
  round3,
  worldToNorm,
} from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";

const DRAG_THRESHOLD = 0.035; // world units before a tap becomes a drag

/**
 * Shared pointer behaviour for everything pinned to the board:
 *  - in room view, tapping an item walks you up to it
 *  - up close, drag to re-pin it anywhere; a clean tap opens the editor
 *  - positions save automatically when you let go
 */
export function useItemDrag(item: BoardItem) {
  const supabase = useMemo(() => createClient(), []);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -BOARD_SURFACE_Z),
    []
  );
  const hit = useRef(new THREE.Vector3());
  const drag = useRef<{ moved: boolean } | null>(null);

  const isDragging = useBoardStore((s) => s.draggingId === item.id);

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const { view, readOnly, walkUp, setDragging } = useBoardStore.getState();
    if (view === "room") {
      walkUp({ x: item.x, y: item.y });
      return;
    }
    if (readOnly) {
      useBoardStore.getState().setEditing(item.id);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { moved: false };
    setDragging(item.id);
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
          // Position save failed (offline?) — board still shows the
          // local spot; the next successful move will persist it.
        });
      }
    } else {
      state.setEditing(item.id);
    }
  }

  return { isDragging, onPointerDown, onPointerMove, onPointerUp };
}
