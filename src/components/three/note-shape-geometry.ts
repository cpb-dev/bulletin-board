"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { noteOutline, type NoteShape } from "@/lib/note-shape";

/**
 * A flat mesh cut to a BB-24 note outline, `size` wide and centred, with
 * UVs laid out like a plane's so the note's canvas texture maps straight
 * on. Used for the paper itself (so only the paper is grabbable, not the
 * empty corners around a circle) and for its drop shadow.
 *
 * Null for square and heart, which keep their original plane geometry.
 */
export function useNoteShapeGeometry(
  shape: NoteShape,
  seed: number,
  size: number
): THREE.BufferGeometry | null {
  const geometry = useMemo(() => {
    const outline = noteOutline(shape, seed);
    if (!outline) return null;
    // Unit square, y down → centred world units, y up.
    const s = new THREE.Shape(
      outline.map(
        ([x, y]) => new THREE.Vector2((x - 0.5) * size, (0.5 - y) * size)
      )
    );
    const g = new THREE.ShapeGeometry(s);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / size + 0.5, pos.getY(i) / size + 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, [shape, seed, size]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry;
}
