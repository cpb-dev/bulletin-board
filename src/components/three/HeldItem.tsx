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
import { drawNoteTexture } from "./textures";
import { useFontsReady } from "./NoteMesh";

const HELD_DISTANCE = 0.62; // metres in front of the camera

/**
 * When a note/photo is tapped in view mode it floats up to the camera
 * for a close-up "held in your hand" look. Follows the camera, reacts to
 * the pointer like you're tilting it to read, and a tap puts it back.
 */
export function HeldItem({ theme }: { theme: BoardTheme }) {
  const heldId = useBoardStore((s) => s.heldId);
  const item = useBoardStore((s) => s.items.find((i) => i.id === s.heldId));
  if (!heldId || !item) return null;
  // key remounts the inner view (and its entrance animation) per item
  return <HeldView key={item.id} item={item} theme={theme} />;
}

function HeldView({
  item,
  theme,
}: {
  item: NonNullable<ReturnType<typeof useBoardStore.getState>["items"][number]>;
  theme: BoardTheme;
}) {
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const group = useRef<THREE.Group>(null);
  const appear = useRef(0);

  const isPhoto = item.kind === "photo";

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    appear.current = THREE.MathUtils.damp(appear.current, 1, 8, delta);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );
    const dist = HELD_DISTANCE + (1 - appear.current) * 0.35;
    g.position
      .copy(camera.position)
      .addScaledVector(forward, dist);
    g.quaternion.copy(camera.quaternion);
    // tilt to "inspect", plus a gentle idle sway
    const t = state.clock.elapsedTime;
    g.rotateY(pointer.x * 0.4 + Math.sin(t * 0.8) * 0.04);
    g.rotateX(-pointer.y * 0.3 + Math.sin(t * 1.1) * 0.03);
    const s = appear.current;
    g.scale.setScalar(s);
  });

  function dismiss(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    useBoardStore.getState().setHeld(null);
  }

  return (
    <group ref={group} scale={0}>
      {isPhoto ? (
        <HeldPhoto item={item} onDismiss={dismiss} />
      ) : (
        <HeldNote item={item} theme={theme} onDismiss={dismiss} />
      )}
    </group>
  );
}

function HeldNote({
  item,
  theme,
  onDismiss,
}: {
  item: { content: string; paper: string; created_by: string | null; created_at: string };
  theme: BoardTheme;
  onDismiss: (e: ThreeEvent<PointerEvent>) => void;
}) {
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

  const size = 0.46;
  return (
    <group onPointerDown={onDismiss}>
      <mesh position={[0.015, -0.02, -0.012]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} />
      </mesh>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function HeldPhoto({
  item,
  onDismiss,
}: {
  item: { photo_path: string | null; content: string };
  onDismiss: (e: ThreeEvent<PointerEvent>) => void;
}) {
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
  const base = photoPlaneSize(image?.width ?? 4, image?.height ?? 3);
  const w = base.width * 0.85;
  const h = base.height * 0.85;
  const pad = 0.05;
  const capH = 0.14;
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
    <group onPointerDown={onDismiss}>
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
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#d8d2c8" />
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
