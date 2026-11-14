"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ROOM, SNOW_WINDOW } from "../lib/layout";
import { GLASS_Z, WALL_OUT_Z } from "../lib/outdoor";
import { OUTSIDE_SILL } from "../lib/events";

const FRAME = "#5e3b24";
const REVEAL = "#b98450";

/**
 * The window in the back wall (BB-35): a real opening onto the world
 * outside. Its frame and glazing bars, the thickness of the wall round
 * the opening, frosted glass, a sill inside and a snowy one outside.
 */
export function SnowWindow({ gradient }: { gradient: THREE.Texture }) {
  const { x, y, width, height } = SNOW_WINDOW;
  const frost = useMemo(makeFrostTexture, []);
  useEffect(() => () => frost.dispose(), [frost]);
  const bar = 0.07;
  const wallDepth = ROOM.backZ - WALL_OUT_Z;
  const revealZ = (ROOM.backZ + WALL_OUT_Z) / 2;

  return (
    <group>
      <group position={[x, y, ROOM.backZ + 0.01]}>
        {/* frame */}
        {[-1, 1].map((s) => (
          <mesh key={`v${s}`} position={[s * (width / 2), 0, 0.04]}>
            <boxGeometry args={[0.12, height + 0.12, 0.08]} />
            <meshToonMaterial color={FRAME} gradientMap={gradient} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`h${s}`} position={[0, s * (height / 2), 0.04]}>
            <boxGeometry args={[width + 0.12, 0.12, 0.08]} />
            <meshToonMaterial color={FRAME} gradientMap={gradient} />
          </mesh>
        ))}
        {/* glazing bars, set at the glass: three lights across, one rail */}
        {[-width / 6, width / 6].map((bx) => (
          <mesh key={bx} position={[bx, 0, GLASS_Z - ROOM.backZ + 0.01]}>
            <boxGeometry args={[bar, height, 0.05]} />
            <meshToonMaterial color={FRAME} gradientMap={gradient} />
          </mesh>
        ))}
        <mesh position={[0, 0, GLASS_Z - ROOM.backZ + 0.01]}>
          <boxGeometry args={[width, bar, 0.05]} />
          <meshToonMaterial color={FRAME} gradientMap={gradient} />
        </mesh>
        {/* the sill inside */}
        <mesh position={[0, -height / 2 - 0.08, 0.1]}>
          <boxGeometry args={[width + 0.3, 0.06, 0.22]} />
          <meshToonMaterial color={FRAME} gradientMap={gradient} />
        </mesh>
      </group>

      {/* the wall's thickness round the opening */}
      {[-1, 1].map((s) => (
        <mesh key={`j${s}`} position={[x + s * (width / 2 + 0.02), y, revealZ]}>
          <boxGeometry args={[0.04, height + 0.08, wallDepth]} />
          <meshStandardMaterial color={REVEAL} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[x, y + height / 2 + 0.02, revealZ]}>
        <boxGeometry args={[width + 0.08, 0.04, wallDepth]} />
        <meshStandardMaterial color={REVEAL} roughness={0.8} />
      </mesh>
      {/* the outside sill: a ledge through the wall, with snow piled on it */}
      <mesh position={[x, OUTSIDE_SILL.y - 0.03, (GLASS_Z + WALL_OUT_Z - 0.18) / 2]}>
        <boxGeometry args={[width + 0.08, 0.06, GLASS_Z - WALL_OUT_Z + 0.18]} />
        <meshStandardMaterial color="#8a6a50" roughness={0.9} />
      </mesh>
      <mesh position={[x, OUTSIDE_SILL.y, (GLASS_Z + WALL_OUT_Z - 0.18) / 2]} scale={[1, 0.22, 1]}>
        <boxGeometry args={[width + 0.02, 0.14, GLASS_Z - WALL_OUT_Z + 0.14]} />
        <meshBasicMaterial color="#e8eef8" fog={false} />
      </mesh>

      {/* the glass: barely there, frosted at the corners */}
      <mesh position={[x, y, GLASS_Z]} renderOrder={1}>
        <planeGeometry args={[width, height]} />
        {/* Lit by the room, so the frost catches the firelight. */}
        <meshStandardMaterial map={frost} transparent depthWrite={false} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Frost creeping in from the corners of each pane, clear in the middle. */
function makeFrostTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = Math.round((w * SNOW_WINDOW.height) / SNOW_WINDOW.width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(220,232,255,0.06)";
  ctx.fillRect(0, 0, w, h);
  // Each of the six panes gets frost in its corners.
  const panesX = 3;
  const panesY = 2;
  for (let px = 0; px < panesX; px++)
    for (let py = 0; py < panesY; py++) {
      const x0 = (px * w) / panesX;
      const y0 = (py * h) / panesY;
      const pw = w / panesX;
      const ph = h / panesY;
      for (const [cx, cy] of [
        [x0, y0],
        [x0 + pw, y0],
        [x0, y0 + ph],
        [x0 + pw, y0 + ph],
      ]) {
        const rad = Math.min(pw, ph) * 0.42;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(240,246,255,0.5)");
        g.addColorStop(0.5, "rgba(230,240,255,0.25)");
        g.addColorStop(1, "rgba(230,240,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
