"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ITEM_Z, normToWorld, photoPlaneSize } from "@/lib/board-geometry";
import { pinColorFor, type BoardTheme } from "@/lib/themes";
import type { BoardItem } from "@/lib/types";
import { drawNoteTexture } from "./textures";
import { Pin } from "./Pin";
import { SelectionFrame } from "./SelectionFrame";
import { useFontsReady } from "./NoteMesh";
import { usePhotoTexture } from "./photo-texture";
import { useItemDrag } from "./useItemInteraction";

const FRAME_PAD = 0.045;
const CAPTION_HEIGHT = 0.13;

/** A photo pinned up like a polaroid, with a handwritten caption. */
export function PhotoMesh({
  item,
  theme,
}: {
  item: BoardItem;
  theme: BoardTheme;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fontsReady = useFontsReady();
  const { isActive, isSelected, onPointerDown, onPointerMove, onPointerUp } =
    useItemDrag(item);
  const [hovered, setHovered] = useState(false);
  const texture = usePhotoTexture(supabase, item.photo_path);

  const image = texture?.image as
    | { width?: number; height?: number }
    | undefined;
  const { width, height } = photoPlaneSize(
    image?.width ?? 4,
    image?.height ?? 3
  );

  const caption = item.content.trim();
  const captionTexture = useMemo(() => {
    if (!caption) return null;
    return drawNoteTexture({
      text: caption,
      bg: "#ffffff",
      ink: "#55504a",
      transparent: true,
      width: 512,
      height: 96,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, fontsReady]);
  useEffect(() => () => captionTexture?.dispose(), [captionTexture]);

  const frameW = width + FRAME_PAD * 2;
  const frameH = height + FRAME_PAD * 2 + CAPTION_HEIGHT;

  const { x, y } = normToWorld(item.x, item.y);
  const lift = isActive ? 0.07 : 0;
  const pop = isActive ? 1.05 : hovered ? 1.02 : 1;

  return (
    <group position={[x, y, ITEM_Z + lift]} rotation={[0, 0, item.rotation]}>
      <group scale={pop * item.scale}>
        {/* soft fake shadow */}
        <mesh position={[0.022, -0.028, -0.012]}>
          <planeGeometry args={[frameW, frameH]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} />
        </mesh>
        {/* polaroid frame */}
        <mesh
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry args={[frameW, frameH]} />
          <meshStandardMaterial color="#fffdf8" roughness={0.85} />
        </mesh>
        {/* the photo itself */}
        <mesh position={[0, CAPTION_HEIGHT / 2, 0.004]}>
          <planeGeometry args={[width, height]} />
          {texture ? (
            <meshBasicMaterial map={texture} />
          ) : (
            <meshStandardMaterial color="#d8d2c8" roughness={1} />
          )}
        </mesh>
        {/* handwritten caption strip */}
        {captionTexture && (
          <mesh position={[0, -frameH / 2 + CAPTION_HEIGHT / 2 + 0.02, 0.004]}>
            <planeGeometry args={[frameW - 0.08, CAPTION_HEIGHT * 0.75]} />
            <meshBasicMaterial map={captionTexture} transparent />
          </mesh>
        )}
        <Pin
          color={pinColorFor(theme, item.id)}
          position={[0, frameH / 2 - 0.045, 0.012]}
        />
        {isSelected && (
          <SelectionFrame
            item={item}
            halfW={frameW / 2}
            halfH={frameH / 2}
            color={theme.ui.accent}
          />
        )}
      </group>
    </group>
  );
}
