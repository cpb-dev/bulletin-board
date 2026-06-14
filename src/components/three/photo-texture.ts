"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPhotoUrl } from "@/lib/api";

/**
 * Shared, cached photo textures keyed by storage path. Both the board's
 * PhotoMesh and the "held up close" view use this, so a photo that's
 * already showing on the board is reused instantly (the exact same GL
 * texture) when you pick it up — guaranteeing it renders identically.
 *
 * Textures are intentionally not disposed: they're shared and there are
 * only ever a handful, so keeping them for the session is fine.
 */
const cache = new Map<string, Promise<THREE.Texture>>();

export function loadPhotoTexture(
  supabase: SupabaseClient,
  path: string
): Promise<THREE.Texture> {
  let promise = cache.get(path);
  if (!promise) {
    promise = getPhotoUrl(supabase, path)
      .then(
        (url) =>
          new Promise<THREE.Texture>((resolve, reject) => {
            new THREE.TextureLoader().load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                resolve(tex);
              },
              undefined,
              reject
            );
          })
      )
      .catch((err) => {
        // allow a later retry
        cache.delete(path);
        throw err;
      });
    cache.set(path, promise);
  }
  return promise;
}

/** Subscribe to a cached photo texture; null until it's ready. */
export function usePhotoTexture(
  supabase: SupabaseClient,
  path: string | null
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    setTexture(null);
    if (!path) return;
    loadPhotoTexture(supabase, path)
      .then((tex) => {
        if (alive) setTexture(tex);
      })
      .catch(() => {
        /* placeholder stays */
      });
    return () => {
      alive = false;
    };
  }, [supabase, path]);
  return texture;
}
