"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BANNERS, HALL } from "../lib/layout";
import { makeBannerTexture } from "./textures";

const EMBLEMS = ["holly", "star", "snowflake", "bell"] as const;

/**
 * Four long banners on the far wall, either side of the window (BB-38):
 * crimson, green, blue and gold, each with a gold border and a Christmas
 * emblem of our own (holly, star, snowflake, bell), hung from gold rods
 * with swallow-tail ends.
 *
 * BLOCK-OUT: flat cloth. Folds, a gentle sway and tassels come in "Great
 * Hall: banners".
 */
export function Banners() {
  const { width, top, bottom } = BANNERS;
  const h = top - bottom;
  const textures = useMemo(() => BANNERS.colours.map((c, i) => makeBannerTexture(c, EMBLEMS[i])), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  const geometry = useMemo(() => {
    // A swallow-tail: the bottom edge cut in a V.
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(0, 0.28);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, h);
    s.lineTo(-width / 2, h);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / h);
    uv.needsUpdate = true;
    return g;
  }, [width, h]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      {BANNERS.xs.map((x, i) => (
        <group key={x} position={[x, bottom, HALL.backZ + 0.05]}>
          <mesh geometry={geometry}>
            <meshStandardMaterial map={textures[i]} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, h + 0.04, 0.03]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, width + 0.25, 8]} />
            <meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
