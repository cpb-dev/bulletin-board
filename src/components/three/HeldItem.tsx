"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { createClient } from "@/lib/supabase/client";
import { photoPlaneSize } from "@/lib/board-geometry";
import { getPaper, type BoardTheme } from "@/lib/themes";
import { noteStamp } from "@/lib/format";
import { useBoardStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";
import { drawNoteTexture } from "./textures";
import { useFontsReady } from "./NoteMesh";
import { usePhotoTexture } from "./photo-texture";

const HELD_DISTANCE = 1.05;

interface Size {
  w: number;
  h: number;
}

/**
 * Tapping a note/photo in view mode lifts it up close, like holding it
 * in your hand: it floats in front of the camera, scaled to fit the
 * screen, and you can drag to tilt and inspect it. Dismissed only via
 * the "put it back" button so a stray touch never closes it.
 */
export function HeldItem({ theme }: { theme: BoardTheme }) {
  const item = useBoardStore((s) => s.items.find((i) => i.id === s.heldId));
  if (!item) return null;
  return <HeldView key={item.id} item={item} theme={theme} />;
}

function HeldView({ item, theme }: { item: BoardItem; theme: BoardTheme }) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const pointer = useThree((s) => s.pointer);
  const group = useRef<THREE.Group>(null);
  const appear = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  // The item's natural size at scale 1 (children report it as they load).
  const [natural, setNatural] = useState<Size>({ w: 0.5, h: 0.5 });

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    appear.current = THREE.MathUtils.damp(appear.current, 1, 9, delta);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );
    const dist = HELD_DISTANCE + (1 - appear.current) * 0.4;
    g.position.copy(camera.position).addScaledVector(forward, dist);
    g.quaternion.copy(camera.quaternion);

    // drag to tilt; let go and it eases back to facing you
    const targetX = dragging.current ? pointer.y * 0.55 : 0;
    const targetY = dragging.current ? pointer.x * 0.7 : 0;
    tilt.current.x = THREE.MathUtils.damp(tilt.current.x, targetX, 6, delta);
    tilt.current.y = THREE.MathUtils.damp(tilt.current.y, targetY, 6, delta);
    const t = state.clock.elapsedTime;
    g.rotateY(tilt.current.y + Math.sin(t * 0.8) * 0.03);
    g.rotateX(-tilt.current.x + Math.sin(t * 1.1) * 0.02);

    // Scale so the whole item fits comfortably in the viewport, whatever
    // the screen aspect (so big photos aren't cropped to "blank").
    const vH = 2 * dist * Math.tan(((camera.fov ?? 46) * Math.PI) / 360);
    const vW = vH * (camera.aspect || 1);
    const fit = Math.min((vW * 0.82) / natural.w, (vH * 0.82) / natural.h);
    g.scale.setScalar(appear.current * fit);
  });

  function onDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    dragging.current = true;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  function onUp(e: ThreeEvent<PointerEvent>) {
    dragging.current = false;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <group ref={group} scale={0}>
      <group onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
        {item.kind === "photo" ? (
          <HeldPhoto item={item} onNatural={setNatural} />
        ) : (
          <HeldNote item={item} theme={theme} onNatural={setNatural} />
        )}
      </group>
    </group>
  );
}

function HeldNote({
  item,
  theme,
  onNatural,
}: {
  item: BoardItem;
  theme: BoardTheme;
  onNatural: (s: Size) => void;
}) {
  const fontsReady = useFontsReady();
  const paper = getPaper(theme, item.paper);
  const authorName = useBoardStore((s) =>
    item.created_by ? s.profiles[item.created_by]?.display_name : undefined
  );
  const footer = noteStamp(authorName, item.created_at);
  const size = 0.5;

  useEffect(() => onNatural({ w: size, h: size }), [onNatural]);

  const texture = useMemo(
    () =>
      drawNoteTexture({
        text: item.content,
        bg: paper.bg,
        ink: paper.ink,
        footer,
        width: 768,
        height: 768,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.content, paper.bg, paper.ink, footer, fontsReady]
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh position={[0.02, -0.025, -0.012]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} />
      </mesh>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

/** Mirrors the board's polaroid rendering, sized to fit by the parent. */
function HeldPhoto({
  item,
  onNatural,
}: {
  item: BoardItem;
  onNatural: (s: Size) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fontsReady = useFontsReady();
  // Same cached texture the board already shows — so a held photo can't
  // render differently to how it looks pinned up.
  const texture = usePhotoTexture(supabase, item.photo_path);

  const image = texture?.image as { width?: number; height?: number } | undefined;
  const base = photoPlaneSize(image?.width ?? 4, image?.height ?? 3);
  const w = base.width;
  const h = base.height;
  const pad = 0.05;
  const capH = 0.13;
  const frameW = w + pad * 2;
  const frameH = h + pad * 2 + capH;

  useEffect(
    () => onNatural({ w: frameW, h: frameH }),
    [frameW, frameH, onNatural]
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

  return (
    <group>
      <mesh position={[0.02, -0.025, -0.012]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshBasicMaterial color="#000" transparent opacity={0.24} />
      </mesh>
      <mesh>
        <planeGeometry args={[frameW, frameH]} />
        <meshBasicMaterial color="#fffdf8" />
      </mesh>
      <mesh position={[0, capH / 2, 0.004]}>
        <planeGeometry args={[w, h]} />
        {texture ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshStandardMaterial color="#d8d2c8" roughness={1} />
        )}
      </mesh>
      {captionTexture && (
        <mesh position={[0, -frameH / 2 + capH / 2 + 0.02, 0.004]}>
          <planeGeometry args={[frameW - 0.08, capH * 0.75]} />
          <meshBasicMaterial map={captionTexture} transparent />
        </mesh>
      )}
    </group>
  );
}
