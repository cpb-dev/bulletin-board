"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";
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
export function SnowWindow({ gradient, phase = "day" }: { gradient: THREE.Texture; phase?: DayPhase }) {
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

      {/* The glass: clear, with frost along the bottom of each pane. The
          frost isn't lit by the room — warm firelight on it read as
          orange smudges — but takes the daylight behind it. */}
      <mesh position={[x, y, GLASS_Z]} renderOrder={1}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={frost} color={FROST_TINT[phase]} transparent depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

/** How bright the frost reads: lit by the daylight behind it, not the fire. */
const FROST_TINT: Record<DayPhase, string> = {
  day: "#f2f6ff",
  evening: "#ead9e4",
  night: "#8e9cc4",
};

/**
 * Frost on the glass: fine feathery ice crystals growing up from the
 * bottom of each pane and a little way up its sides — thickest in the
 * bottom corners, where real frost gathers — and clear glass above.
 * Drawn as branching crystals (each arm sprouting smaller arms at 60°),
 * not soft blobs, so it reads as ice rather than a smudge.
 */
function makeFrostTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = Math.round((w * SNOW_WINDOW.height) / SNOW_WINDOW.width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const rand = mulberry32(61);
  ctx.lineCap = "round";

  const crystal = (x: number, y: number, angle: number, len: number, depth: number) => {
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    ctx.strokeStyle = `rgba(255,255,255,${0.32 + depth * 0.1})`;
    ctx.lineWidth = 0.6 + depth * 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (depth <= 0 || len < 3) return;
    // Side arms at 60 degrees, all along the arm, smaller as they go.
    const arms = 3 + Math.floor(rand() * 3);
    for (let k = 1; k <= arms; k++) {
      const f = k / (arms + 1);
      const px = x + (ex - x) * f;
      const py = y + (ey - y) * f;
      const l = len * (0.45 - f * 0.25) * (0.7 + rand() * 0.5);
      crystal(px, py, angle + Math.PI / 3, l, depth - 1);
      crystal(px, py, angle - Math.PI / 3, l, depth - 1);
    }
    // Carry on growing, a little crooked.
    if (rand() < 0.6) crystal(ex, ey, angle + (rand() - 0.5) * 0.4, len * 0.7, depth - 1);
  };

  const panesX = 3;
  const panesY = 2;
  for (let px = 0; px < panesX; px++)
    for (let py = 0; py < panesY; py++) {
      const x0 = (px * w) / panesX;
      const x1 = ((px + 1) * w) / panesX;
      const bottom = ((py + 1) * h) / panesY; // canvas y grows downward
      const ph = h / panesY;
      // A soft white bloom hugging the bottom edge, under the crystals.
      const g = ctx.createLinearGradient(0, bottom, 0, bottom - ph * 0.22);
      g.addColorStop(0, "rgba(255,255,255,0.32)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, bottom - ph * 0.22, x1 - x0, ph * 0.22);
      // Crystals growing up from the bottom edge, bigger near the corners.
      for (let i = 0; i < 26; i++) {
        const u = rand();
        const toCorner = Math.min(u, 1 - u) * 2; // 0 at a corner, 1 mid-pane
        const x = x0 + u * (x1 - x0);
        const len = ph * (0.06 + (1 - toCorner) * 0.12) * (0.6 + rand() * 0.6);
        crystal(x, bottom, -Math.PI / 2 + (rand() - 0.5) * 0.9, len, 3);
      }
      // And a few creeping in from the bottom of each side.
      for (const [sx, dir] of [
        [x0, 0],
        [x1, Math.PI],
      ] as const) {
        for (let i = 0; i < 5; i++) {
          const y = bottom - rand() * ph * 0.4;
          crystal(sx, y, dir + (rand() - 0.5) * 0.8, ph * (0.05 + rand() * 0.06), 2);
        }
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
