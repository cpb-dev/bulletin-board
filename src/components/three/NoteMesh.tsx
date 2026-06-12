"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getPaper, pinColorFor, type BoardTheme } from "@/lib/themes";
import { ITEM_Z, normToWorld } from "@/lib/board-geometry";
import type { BoardItem } from "@/lib/types";
import { drawNoteTexture } from "./textures";
import { Pin } from "./Pin";
import { useItemDrag } from "./useItemDrag";

export const NOTE_SIZE = 0.52;

/** Redraw canvas text once the handwriting webfont arrives. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        if (alive) setReady(true);
      });
    } else {
      setReady(true);
    }
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

export function NoteMesh({
  item,
  theme,
}: {
  item: BoardItem;
  theme: BoardTheme;
}) {
  const fontsReady = useFontsReady();
  const paper = getPaper(theme, item.paper);
  const { isDragging, onPointerDown, onPointerMove, onPointerUp } =
    useItemDrag(item);
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(
    () =>
      drawNoteTexture({ text: item.content, bg: paper.bg, ink: paper.ink }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.content, paper.bg, paper.ink, fontsReady]
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const { x, y } = normToWorld(item.x, item.y);
  const lift = isDragging ? 0.07 : 0;
  const scale = isDragging ? 1.07 : hovered ? 1.03 : 1;

  return (
    <group
      position={[x, y, ITEM_Z + lift]}
      rotation={[0, 0, item.rotation]}
      scale={scale}
    >
      {/* soft fake shadow */}
      <mesh position={[0.02, -0.025, -0.012]}>
        <planeGeometry args={[NOTE_SIZE, NOTE_SIZE]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[NOTE_SIZE, NOTE_SIZE]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.9}
          side={THREE.FrontSide}
        />
      </mesh>
      <Pin
        color={pinColorFor(theme, item.id)}
        position={[0, NOTE_SIZE / 2 - 0.05, 0.012]}
      />
    </group>
  );
}
