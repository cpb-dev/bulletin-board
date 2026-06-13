"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { BoardItem } from "@/lib/types";
import { useResizeHandle } from "./useItemInteraction";

/**
 * Shown around the selected item in edit mode: an accent outline plus a
 * chunky draggable corner handle for resizing. `halfW`/`halfH` are the
 * item's already-scaled half extents in world units.
 */
export function SelectionFrame({
  item,
  halfW,
  halfH,
  color,
}: {
  item: BoardItem;
  halfW: number;
  halfH: number;
  color: string;
}) {
  const handle = useResizeHandle(item);
  const pad = 0.03;
  const w = (halfW + pad) * 2;
  const h = (halfH + pad) * 2;

  const outline = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    [w, h]
  );
  useEffect(() => () => outline.dispose(), [outline]);

  return (
    <group position={[0, 0, 0.03]}>
      <lineSegments geometry={outline}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      {/* corner resize handle (bottom-right) */}
      <mesh
        position={[halfW + pad, -(halfH + pad), 0.02]}
        onPointerDown={handle.onPointerDown}
        onPointerMove={handle.onPointerMove}
        onPointerUp={handle.onPointerUp}
      >
        <circleGeometry args={[0.06, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[halfW + pad, -(halfH + pad), 0.03]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
