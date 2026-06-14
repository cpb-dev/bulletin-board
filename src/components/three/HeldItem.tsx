"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { createClient } from "@/lib/supabase/client";
import { getPhotoUrl } from "@/lib/api";
import { photoPlaneSize } from "@/lib/board-geometry";
import { getPaper, type BoardTheme } from "@/lib/themes";
import { noteStamp } from "@/lib/format";
import { useBoardStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";
import { drawNoteTexture } from "./textures";
import { useFontsReady } from "./NoteMesh";

// Far enough back that the whole note/photo is comfortably in frame.
const HELD_DISTANCE = 1.05;

/**
 * Tapping a note/photo in view mode lifts it up close, like holding it
 * in your hand: it floats in front of the camera, and you can drag to
 * tilt and inspect it. Dismissed only via the "put it back" button, so
 * a stray touch never closes it.
 */
export function HeldItem({ theme }: { theme: BoardTheme }) {
  const item = useBoardStore((s) => s.items.find((i) => i.id === s.heldId));
  if (!item) return null;
  return <HeldView key={item.id} item={item} theme={theme} />;
}

function HeldView({ item, theme }: { item: BoardItem; theme: BoardTheme }) {
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const group = useRef<THREE.Group>(null);
  const appear = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

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
    g.scale.setScalar(appear.current);
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
          <HeldPhoto item={item} />
        ) : (
          <HeldNote item={item} theme={theme} />
        )}
      </group>
    </group>
  );
}

function HeldNote({ item, theme }: { item: BoardItem; theme: BoardTheme }) {
  const fontsReady = useFontsReady();
  const paper = getPaper(theme, item.paper);
  const authorName = useBoardStore((s) =>
    item.created_by ? s.profiles[item.created_by]?.display_name : undefined
  );
  const footer = noteStamp(authorName, item.created_at);

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

  const size = 0.5;
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

/** Mirrors the board's polaroid rendering so a held photo looks identical. */
function HeldPhoto({ item }: { item: BoardItem }) {
  const supabase = useMemo(() => createClient(), []);
  const fontsReady = useFontsReady();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    let loaded: THREE.Texture | null = null;
    if (!item.photo_path) return;
    getPhotoUrl(supabase, item.photo_path)
      .then(
        (url) =>
          new Promise<THREE.Texture>((resolve, reject) => {
            new THREE.TextureLoader().load(url, resolve, undefined, reject);
          })
      )
      .then((tex) => {
        if (disposed) return tex.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        loaded = tex;
        setTexture(tex);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, [supabase, item.photo_path]);

  const image = texture?.image as { width?: number; height?: number } | undefined;
  // Enlarge a polaroid to a nice held size.
  const scale = 1.9;
  const base = photoPlaneSize(image?.width ?? 4, image?.height ?? 3);
  const w = base.width * scale;
  const h = base.height * scale;
  const pad = 0.05 * scale;
  const capH = 0.13 * scale;
  const frameW = w + pad * 2;
  const frameH = h + pad * 2 + capH;

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
          <meshBasicMaterial color="#d8d2c8" />
        )}
      </mesh>
      {captionTexture && (
        <mesh position={[0, -frameH / 2 + capH / 2 + 0.02 * scale, 0.004]}>
          <planeGeometry args={[frameW - 0.08, capH * 0.75]} />
          <meshBasicMaterial map={captionTexture} transparent />
        </mesh>
      )}
    </group>
  );
}
