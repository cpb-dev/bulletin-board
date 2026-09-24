"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";

/**
 * A clear October afternoon over the square: deep blue overhead, paling
 * to a warm haze at the skyline, with fair-weather cumulus drifting
 * across — the sky in every photo of the town square.
 *
 * One dome, one texture; the clouds drift by scrolling its offset.
 */

const DOME_RADIUS = 60;
const DRIFT = 0.003;

/** What distant things fade into — the haze at the skyline. */
export const FOG_COLOUR = "#d9e2e6";

export function Sky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#a9c8e4");
    // Clear air: the far end of Main Street softens, nothing near does.
    scene.fog = new THREE.Fog(FOG_COLOUR, 24, 58);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return <SkyDome />;
}

export function makeSkyTexture(seed = 1779): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  // The horizon is halfway down: the lower half of a sphere is below it.
  const HORIZON = H / 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, "#3f7fc8");
  g.addColorStop(0.45, "#6ea4dc");
  g.addColorStop(0.8, "#a9cbe8");
  g.addColorStop(0.95, "#d4e2ea");
  g.addColorStop(1, FOG_COLOUR);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  ctx.fillStyle = FOG_COLOUR;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  const wrapped = (x: number, draw: (x: number) => void) => {
    draw(x);
    if (x < 200) draw(x + W);
    if (x > W - 200) draw(x - W);
  };

  /** One soft lobe of cloud, falling to nothing at its edge. */
  const lobe = (x: number, y: number, rx: number, ry: number, rgb: string, a: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    rg.addColorStop(0, `rgba(${rgb}, ${a})`);
    rg.addColorStop(0.55, `rgba(${rgb}, ${a * 0.75})`);
    rg.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /**
   * A cumulus: a flat, shaded base and a heap of bright lobes piled on
   * top of it, smaller towards the crown. Perspective squashes them
   * the lower they sit.
   */
  const cumulus = (cx: number, base: number, w: number) => {
    const squash = 0.45 + (1 - base / HORIZON) * 0.55;
    wrapped(cx, (x) => {
      // shadowed underside
      lobe(x, base, w * 0.55, w * 0.12 * squash, "176, 188, 206", 0.55);
      const n = 7 + Math.floor(rand() * 5);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        const h = (1 - t * t) * w * 0.32 * squash;
        const r = w * (0.16 + rand() * 0.12) * (1 - Math.abs(t) * 0.35);
        lobe(
          x + t * w * 0.42 + (rand() - 0.5) * w * 0.08,
          base - h * (0.5 + rand() * 0.5),
          r,
          r * 0.8 * squash + 4,
          "255, 255, 255",
          0.8
        );
      }
    });
  };

  for (let i = 0; i < 14; i++) {
    const base = HORIZON * (0.35 + rand() * 0.55);
    cumulus(rand() * W, base, 40 + rand() * 90 * (base / HORIZON));
  }
  // a few thin wisps high up
  for (let i = 0; i < 6; i++) {
    const x = rand() * W;
    const y = HORIZON * (0.08 + rand() * 0.25);
    wrapped(x, (xx) => lobe(xx, y, 120 + rand() * 120, 6 + rand() * 6, "245, 250, 255", 0.35));
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function SkyDome() {
  const texture = useMemo(() => makeSkyTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    texture.offset.x = (texture.offset.x + delta * DRIFT) % 1;
  });
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[DOME_RADIUS, 32, 20]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
