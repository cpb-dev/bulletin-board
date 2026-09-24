"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { batchStatic } from "../lib/batch";

/**
 * Draws everything under it that never moves in as few draw calls as
 * its materials allow — see `lib/batch.ts`. Children render and mount
 * as normal; once they have, their meshes are welded by material and
 * the originals hidden.
 */
export function StaticBatch({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const batch = batchStatic(root);
    return () => batch.dispose();
  }, []);
  return <group ref={ref}>{children}</group>;
}
