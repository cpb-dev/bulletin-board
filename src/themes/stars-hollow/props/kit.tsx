"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { makeToonRamp } from "@/components/three/textures";
import {
  makeBarkTexture,
  makeBrickTexture,
  makeClapboardTexture,
  makeFoliageTexture,
  makeGinghamTexture,
  makeLatticeTexture,
  makeLeafTexture,
  makePavingTexture,
  makeShingleTexture,
  makeStrawTexture,
  makeTransomTexture,
} from "./textures";

/**
 * The textures and ramps the whole town shares.
 *
 * A dozen shops all built of brick want one brick texture, not a dozen,
 * so the scene builds the kit once, hands it down through context, and
 * disposes all of it when the theme is switched away. Props that are
 * staged on their own (the /dev model harness) wrap themselves in a
 * `<KitProvider>` too.
 */
export interface Kit {
  /** Five-step toon ramp — enough for mouldings and columns to read. */
  ramp: THREE.DataTexture;
  /** A softer ramp for foliage, so crowns aren't banded. */
  leafRamp: THREE.DataTexture;
  brick: THREE.CanvasTexture;
  clapboard: THREE.CanvasTexture;
  shingle: THREE.CanvasTexture;
  lattice: THREE.CanvasTexture;
  leaf: THREE.CanvasTexture;
  foliage: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  barkPale: THREE.CanvasTexture;
  paving: THREE.CanvasTexture;
  straw: THREE.CanvasTexture;
  gingham: THREE.CanvasTexture;
  transom: THREE.CanvasTexture;
}

const KitContext = createContext<Kit | null>(null);

function buildKit(): Kit {
  return {
    ramp: makeToonRamp([70, 118, 168, 214, 255]),
    leafRamp: makeToonRamp([110, 150, 190, 225, 255]),
    brick: makeBrickTexture(3),
    clapboard: makeClapboardTexture(8),
    shingle: makeShingleTexture(5),
    lattice: makeLatticeTexture(4),
    leaf: makeLeafTexture(),
    foliage: makeFoliageTexture(17),
    bark: makeBarkTexture(4),
    barkPale: makeBarkTexture(6, true),
    paving: makePavingTexture(9),
    straw: makeStrawTexture(33),
    gingham: makeGinghamTexture(),
    transom: makeTransomTexture(),
  };
}

export function KitProvider({ children }: { children: ReactNode }) {
  const kit = useMemo(buildKit, []);
  useEffect(
    () => () => {
      for (const t of Object.values(kit)) (t as THREE.Texture).dispose();
    },
    [kit]
  );
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>;
}

export function useKit(): Kit {
  const kit = useContext(KitContext);
  if (!kit) throw new Error("Stars Hollow props need a <KitProvider> above them");
  return kit;
}

/** The kit if there is one above, for props that can also stand alone. */
export function useOptionalKit(): Kit | null {
  return useContext(KitContext);
}

/**
 * A texture from the kit, cloned so this surface can repeat it at its
 * own scale. Clones share the image, so this costs a uniform, not a
 * canvas.
 */
export function useRepeated(
  pick: (kit: Kit) => THREE.Texture,
  rx: number,
  ry: number
): THREE.Texture {
  const kit = useKit();
  const base = pick(kit);
  const t = useMemo(() => {
    const c = base.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(rx, ry);
    c.needsUpdate = true;
    return c;
  }, [base, rx, ry]);
  useEffect(() => () => t.dispose(), [t]);
  return t;
}

/** Painted white, as the sign, the gazebo trim and the board posts are. */
export const WHITE_PAINT = "#fbf8f0";
