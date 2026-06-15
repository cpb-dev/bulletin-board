"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getPaper, pinColorFor, type BoardTheme } from "@/lib/themes";
import { ITEM_Z, NOTE_BASE, normToWorld } from "@/lib/board-geometry";
import type { BoardItem } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { noteStamp } from "@/lib/format";
import { fixtureNoteText } from "@/lib/worldcup";
import { drawNoteTexture } from "./textures";
import { Pin } from "./Pin";
import { SelectionFrame } from "./SelectionFrame";
import { useItemDrag } from "./useItemInteraction";

export const NOTE_SIZE = NOTE_BASE;

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
  const { isActive, isSelected, onPointerDown, onPointerMove, onPointerUp } =
    useItemDrag(item);
  const [hovered, setHovered] = useState(false);

  const authorName = useBoardStore((s) =>
    item.created_by ? s.profiles[item.created_by]?.display_name : undefined
  );
  const footer = noteStamp(authorName, item.created_at);

  // Fixture-linked notes show the live scoreline, updated as games play.
  const liveFixture = useBoardStore((s) =>
    item.fixture_id ? s.worldCupFixtures[item.fixture_id] : undefined
  );
  const content = liveFixture ? fixtureNoteText(liveFixture) : item.content;

  const texture = useMemo(
    () =>
      drawNoteTexture({
        text: content,
        bg: paper.bg,
        ink: paper.ink,
        footer,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, paper.bg, paper.ink, footer, fontsReady]
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const { x, y } = normToWorld(item.x, item.y);
  const size = NOTE_BASE * item.scale;
  const lift = isActive ? 0.07 : 0;
  const pop = isActive ? 1.05 : hovered ? 1.02 : 1;

  return (
    <group position={[x, y, ITEM_Z + lift]} rotation={[0, 0, item.rotation]}>
      <group scale={pop}>
        {/* soft fake shadow */}
        <mesh position={[0.02, -0.025, -0.012]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} />
        </mesh>
        <mesh
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial
            map={texture}
            transparent
            roughness={0.9}
            side={THREE.FrontSide}
          />
        </mesh>
        <Pin
          color={pinColorFor(theme, item.id)}
          position={[0, size / 2 - 0.05, 0.012]}
        />
        {isSelected && (
          <SelectionFrame
            item={item}
            halfW={size / 2}
            halfH={size / 2}
            color={theme.ui.accent}
          />
        )}
      </group>
    </group>
  );
}
