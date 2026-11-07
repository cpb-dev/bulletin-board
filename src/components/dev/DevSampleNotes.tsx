"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { sampleNotes } from "@/lib/dev-preview";
import type { BoardTheme } from "@/themes";
import { NoteMesh } from "../three/NoteMesh";

/**
 * Dev mode's sample notes (BB-36): one of every shape and paper, pinned
 * on a real board for this device only. They're never in the store and
 * never saved.
 *
 * They're also unclickable. Everything under this group lives on render
 * layer 1 only: the camera is told to draw that layer, but pointer events
 * only test layer 0, so a tap goes straight through to the board and the
 * real notes. That keeps a sample note from being "held", edited or
 * dragged, which would otherwise try to save an item that doesn't exist.
 */
const DEV_LAYER = 1;

export function DevSampleNotes({ theme }: { theme: BoardTheme }) {
  const notes = useMemo(() => sampleNotes(theme), [theme]);
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    camera.layers.enable(DEV_LAYER);
    return () => camera.layers.disable(DEV_LAYER);
  }, [camera]);

  // Meshes come and go as textures and shapes load, so keep re-layering.
  // A few dozen objects on the developer's device only.
  useFrame(() => {
    group.current?.traverse((o) => o.layers.set(DEV_LAYER));
  });

  return (
    <group ref={group}>
      {notes.map((item) => (
        <NoteMesh key={item.id} item={item} theme={theme} />
      ))}
    </group>
  );
}
