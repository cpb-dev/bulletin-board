"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";

/**
 * The sky over Haunted Hollow: a low, heavy overcast that never quite
 * breaks.
 *
 * It used to be a warm amber haze, which read as a nice autumn
 * afternoon rather than a dreary one. The gradient is now leaden
 * overhead and only turns wan and ochre right at the horizon, so the
 * warmth that is left is the last of the light rather than sunshine —
 * and the pumpkins and the lit windows have something cold to glow
 * against.
 *
 * The cloud banks are drawn into the same texture and drift by
 * scrolling its offset, so the whole sky costs one mesh and one
 * uniform update a frame.
 */

const DOME_RADIUS = 60;
/** Wraps of the cloud band around the dome per minute. */
const DRIFT = 0.0042;

export const SKY_HORIZON = "#c3b7a4";
export const SKY_OVERHEAD = "#6b6b74";
/** What the fog fades distant things into — matches the low sky. */
/**
 * What the fog fades distant things into.
 *
 * Matched to the sky at the skyline rather than to the sky overhead:
 * fog darker than the horizon leaves a dark band where the ground
 * should be dissolving into it.
 */
export const FOG_COLOUR = "#bcb19f";

/**
 * Sets the scene's clear colour and fog directly — a nested
 * `<color attach="background">` would attach to the group, not the
 * scene. Restores both on unmount so switching themes stays clean.
 */
export function Sky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#9d9992");
    // Close and thick. The far trees should be losing their colour,
    // and the ground has to be fully fogged out before it reaches its
    // own edge or you see the edge instead of a horizon.
    scene.fog = new THREE.Fog(FOG_COLOUR, 16, 44);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return <SkyDome />;
}

/**
 * Overcast, in layers: a vertical gradient, then torn cloud banks over
 * it, heaviest overhead and thinning towards the horizon where the
 * light gets under them.
 *
 * Only the horizontal axis wraps, so everything is drawn twice near
 * the seam. A cloud cut in half at the join is the one thing that
 * would give the trick away.
 */
export function makeSkyTexture(seed = 31): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  /**
   * Half a sphere is below the horizon, so the sky only gets the top
   * half of the canvas — y 0 is the zenith and y = HORIZON is the
   * skyline. Spreading the gradient over the whole height puts the
   * entire sky above the part you can actually see from eye level.
   */
  const HORIZON = H / 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, SKY_OVERHEAD);
  g.addColorStop(0.35, "#7e7d7e");
  g.addColorStop(0.68, "#9b948b");
  g.addColorStop(0.89, SKY_HORIZON);
  g.addColorStop(1, "#d2c7b4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  // Below the skyline the ground covers everything, but the band right
  // at it must not be a different colour or the join shows.
  ctx.fillStyle = "#d2c7b4";
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  const wrapped = (x: number, draw: (x: number) => void) => {
    draw(x);
    if (x < 260) draw(x + W);
    if (x > W - 260) draw(x - W);
  };

  /**
   * One soft lobe. The falloff is the whole trick: a flat-filled
   * ellipse reads as a disc however many you overlap, and a sky full
   * of discs is worse than no cloud at all.
   */
  const lobe = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    rgb: string,
    alpha: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.6})`);
    g.addColorStop(0.75, `rgba(${rgb}, ${alpha * 0.22})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /** A bank of stratus: long, flat, and torn along its length. */
  const bank = (
    cx: number,
    cy: number,
    w: number,
    h: number,
    rgb: string,
    alpha: number,
    lobes: number
  ) => {
    wrapped(cx, (x) => {
      for (let i = 0; i < lobes; i++) {
        const t = i / (lobes - 1) - 0.5;
        const lx = x + t * w + (rand() - 0.5) * w * 0.1;
        // fattest in the middle, tailing off at both ends
        const taper = Math.max(0, 1 - Math.abs(t) * 1.9);
        const ly = cy + (rand() - 0.5) * h * 0.8;
        const ry = h * (0.3 + taper * 0.8) * (0.7 + rand() * 0.6);
        lobe(lx, ly, ry * (3.2 + rand() * 2.4), ry, rgb, alpha * (0.5 + taper * 0.7));
      }
    });
  };

  // Heavy dark cloud overhead, where an overcast sky is thickest.
  for (let i = 0; i < 9; i++) {
    bank(
      rand() * W,
      rand() * HORIZON * 0.42,
      260 + rand() * 460,
      9 + rand() * 14,
      "64, 64, 74",
      0.16 + rand() * 0.16,
      8 + Math.floor(rand() * 5)
    );
  }
  // Mid-sky, lighter — the underside catching what light there is.
  for (let i = 0; i < 11; i++) {
    bank(
      rand() * W,
      HORIZON * (0.34 + rand() * 0.34),
      300 + rand() * 500,
      6 + rand() * 10,
      "204, 198, 192",
      0.1 + rand() * 0.14,
      9 + Math.floor(rand() * 5)
    );
  }
  // Long thin streaks low down. These are the ones you actually see
  // from eye level, so there are more of them and they are flatter.
  for (let i = 0; i < 22; i++) {
    bank(
      rand() * W,
      HORIZON * (0.68 + rand() * 0.27),
      420 + rand() * 520,
      2 + rand() * 4.5,
      rand() < 0.5 ? "86, 83, 88" : "230, 221, 206",
      0.08 + rand() * 0.12,
      10 + Math.floor(rand() * 4)
    );
  }

  // Soften the last of the streaks into the skyline. Narrow and weak
  // on purpose: from eye level you only see the band just above the
  // horizon, so a wide wash here scrubs out the entire visible sky.
  const haze = ctx.createLinearGradient(0, HORIZON, 0, HORIZON * 0.94);
  haze.addColorStop(0, "rgba(210, 199, 180, 0.8)");
  haze.addColorStop(1, "rgba(210, 199, 180, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, HORIZON);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function SkyDome() {
  const texture = useMemo(() => makeSkyTexture(31), []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    // Slow enough that you only notice it if you stand and watch, which
    // is exactly how a real overcast moves.
    texture.offset.x = (texture.offset.x + delta * DRIFT) % 1;
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[DOME_RADIUS, 32, 20]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
