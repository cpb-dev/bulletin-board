"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { LOOKS, type PhaseLook } from "../lib/looks";
import { useLook } from "./phase";

/**
 * The sky over the square. By day, a clear October afternoon: deep blue
 * overhead, paling to a warm haze at the skyline, with fair-weather
 * cumulus drifting across — the sky in every photo of the town square.
 * At evening and night (BB-21) the same dome is painted from that
 * phase's look instead, with stars and a moon after dark.
 *
 * One dome, one texture; the clouds drift by scrolling its offset.
 */

const DOME_RADIUS = 60;

/** What distant things fade into by day — the haze at the skyline. */
export const FOG_COLOUR = LOOKS.day.fog.colour;

export function Sky() {
  const scene = useThree((s) => s.scene);
  const look = useLook();
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color(look.background);
    // Clear air: the far end of Main Street softens, nothing near does.
    scene.fog = new THREE.Fog(look.fog.colour, look.fog.near, look.fog.far);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene, look]);
  return (
    <>
      <SkyDome look={look} />
      {look.sky.stars > 0 && <Stars count={look.sky.stars} />}
      {look.sky.moon && <Moon />}
    </>
  );
}

export function makeSkyTexture(seed = 1779, look: PhaseLook = LOOKS.day): THREE.CanvasTexture {
  const sky = look.sky;
  const fog = look.fog.colour;
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
  for (const [at, colour] of sky.stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON);
  ctx.fillStyle = fog;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  if (sky.horizonGlow) {
    // the last of the sun, lying along the skyline
    const glow = ctx.createLinearGradient(0, HORIZON * 0.62, 0, HORIZON);
    glow.addColorStop(0, `rgba(${sky.horizonGlow}, 0)`);
    glow.addColorStop(1, `rgba(${sky.horizonGlow}, 0.55)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, HORIZON * 0.62, W, HORIZON * 0.38);
  }

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
  // the undersides thin out with the clouds
  const shade = sky.cloudAlpha / 0.8;
  const cumulus = (cx: number, base: number, w: number) => {
    const squash = 0.45 + (1 - base / HORIZON) * 0.55;
    wrapped(cx, (x) => {
      // shadowed underside
      lobe(x, base, w * 0.55, w * 0.12 * squash, sky.cloudShade, 0.55 * shade);
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
          sky.cloud,
          sky.cloudAlpha
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
    wrapped(x, (xx) => lobe(xx, y, 120 + rand() * 120, 6 + rand() * 6, sky.wisp, 0.35 * shade));
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function SkyDome({ look }: { look: PhaseLook }) {
  const texture = useMemo(() => makeSkyTexture(1779, look), [look]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    texture.offset.x = (texture.offset.x + delta * look.sky.drift) % 1;
  });
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[DOME_RADIUS, 32, 20]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

/**
 * Stars: pin-sharp points on a shell just inside the dome, denser and
 * brighter overhead and fading out towards the skyline haze. Points
 * rather than paint on the dome, whose texture is far too coarse to
 * hold a point of light. They stay put while the clouds drift.
 */
function Stars({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(1779 + 7);
    const pos: number[] = [];
    const col: number[] = [];
    const r = DOME_RADIUS - 2;
    for (let i = 0; i < count; i++) {
      // sin(elevation) uniform in [0.08, 1] — even over the sky, none
      // down in the haze
      const up = 0.08 + rand() * 0.92;
      const around = rand() * Math.PI * 2;
      const flat = Math.sqrt(1 - up * up);
      pos.push(Math.cos(around) * flat * r, up * r, Math.sin(around) * flat * r);
      const b = (0.3 + rand() * 0.7) * (0.45 + up * 0.55);
      // a few warm, a few blue, most white
      const tint = rand();
      col.push(b * (tint > 0.85 ? 1 : 0.92), b * 0.95, b * (tint < 0.15 ? 1 : 0.85));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial size={1.8} sizeAttenuation={false} vertexColors fog={false} />
    </points>
  );
}

/**
 * A near-full October moon, just to the left of the church spire, so it
 * shows above the board from the room view on a phone as well as a
 * laptop: a pale, faintly marked disc in a soft halo. A sprite fixed in
 * the sky rather than painted on the dome, so it doesn't drift with
 * the clouds and always faces the camera.
 */
/**
 * Where the moon hangs: on the room camera's line of sight to a point
 * just left of the spire and above the board, 50 m out (inside the dome,
 * well behind the church so the spire would cover it, never the reverse).
 */
const MOON: [number, number, number] = [-6, 19, -42];

function Moon() {
  const texture = useMemo(() => {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d")!;
    const mid = S / 2;
    const halo = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    halo.addColorStop(0, "rgba(220, 230, 255, 0.5)");
    halo.addColorStop(0.3, "rgba(190, 205, 255, 0.16)");
    halo.addColorStop(1, "rgba(190, 205, 255, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);
    const r = S * 0.1;
    ctx.fillStyle = "#f4f1e4";
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.fill();
    // the maria: a few soft grey patches
    const rand = mulberry32(41);
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * r * 0.55;
      ctx.fillStyle = `rgba(170, 170, 160, ${0.18 + rand() * 0.15})`;
      ctx.beginPath();
      ctx.arc(mid + Math.cos(a) * d, mid + Math.sin(a) * d, r * (0.15 + rand() * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={MOON} scale={[16, 16, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} fog={false} />
    </sprite>
  );
}
