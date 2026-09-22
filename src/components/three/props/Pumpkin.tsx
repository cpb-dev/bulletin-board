"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeToonRamp } from "../textures";

/**
 * A jack-o'-lantern.
 *
 * Built as one lathed profile with the lobes cut into it, rather than a
 * pile of spheres: the silhouette is a real gourd, the grooves deepen
 * towards the poles the way a pumpkin's do, and the carved face sits on
 * a curved patch so it wraps the surface instead of floating on a card.
 *
 * Used only by the Haunted Hollow scene.
 */

const RIBS = 9;
/** Half-height of the gourd, as a fraction of its radius. */
export const PUMPKIN_HEIGHT = 0.8;

/**
 * The gourd body. `ribDepth` is how far the grooves bite in, as a
 * fraction of the radius.
 */
export function makePumpkinGeometry(
  ribDepth = 0.23,
  radialSegments = 64,
  profileSteps = 28
): THREE.LatheGeometry {
  // Profile from the bottom pole to the top, as (radius, height).
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= profileSteps; i++) {
    const t = i / profileSteps;
    const a = -Math.PI / 2 + t * Math.PI;
    // pow < 1 keeps the shoulders full, so it reads squat rather than
    // spherical; the height scale flattens the poles.
    const r = Math.pow(Math.cos(a), 0.72);
    let y = Math.sin(a) * PUMPKIN_HEIGHT;
    // dimple both poles in, where the stalk and the blossom scar sit
    const polar = Math.abs(Math.sin(a));
    if (polar > 0.9) y -= Math.sign(y) * (polar - 0.9) * 0.5;
    profile.push(new THREE.Vector2(Math.max(r, 1e-4), y));
  }

  const geo = new THREE.LatheGeometry(profile, radialSegments);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius < 1e-5) continue;
    const theta = Math.atan2(z, x);

    // cos() peaks at a lobe's centre and troughs in a groove. Grooves
    // bite deeper near the poles, which is what makes the lobes read as
    // separate swells rather than fluting.
    const groove = (1 - Math.cos(RIBS * theta)) / 2;
    const depth = ribDepth * (0.5 + 0.5 * Math.min(1, Math.abs(y) / PUMPKIN_HEIGHT));
    const scaled = radius * (1 - depth * groove);

    pos.setX(i, (x / radius) * scaled);
    pos.setZ(i, (z / radius) * scaled);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** A short, bent, tapering stalk — a straight cylinder reads as plastic. */
function makeStalkGeometry(): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, 0.09, 0.015),
    new THREE.Vector3(0.06, 0.17, 0.02),
    new THREE.Vector3(0.12, 0.23, 0.01),
  ]);
  return new THREE.TubeGeometry(curve, 14, 0.055, 8, false);
}

export function Pumpkin({
  size = 0.4,
  face = 0,
  color = "#e8761f",
  /** Lit from within by a candle. Off for an uncarved gourd. */
  lit = true,
}: {
  size?: number;
  face?: number;
  color?: string;
  lit?: boolean;
}) {
  // more steps than the shared ramp, so the lobes actually read
  const gradient = useMemo(() => makeToonRamp([64, 112, 162, 208, 255]), []);
  const body = useMemo(() => makePumpkinGeometry(), []);
  const stalk = useMemo(() => makeStalkGeometry(), []);
  const carved = useMemo(() => makePumpkinFaceTexture(face), [face]);

  useEffect(
    () => () => {
      gradient.dispose();
      body.dispose();
      stalk.dispose();
      carved.dispose();
    },
    [gradient, body, stalk, carved]
  );

  return (
    // Origin at the base, so callers place it on the ground rather than
    // having to know its height.
    <group scale={size} position={[0, PUMPKIN_HEIGHT * size, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshToonMaterial color={color} gradientMap={gradient} />
      </mesh>

      <mesh geometry={stalk} position={[0, PUMPKIN_HEIGHT - 0.1, 0]} castShadow>
        <meshToonMaterial color="#6b7f3e" gradientMap={gradient} />
      </mesh>

      {/* The carved face on a patch of sphere just proud of the body, so
          it follows the curve rather than sitting on a flat card. */}
      <mesh position={[0, 0.0, 0]} scale={[1.03, PUMPKIN_HEIGHT * 1.03, 1.03]}>
        <sphereGeometry
          args={[1.0, 44, 30, Math.PI / 2 - 0.67, 1.34, 1.0, 1.15]}
        />
        <meshBasicMaterial
          map={carved}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {lit && (
        <pointLight
          position={[0, 0, 0.1]}
          color="#ffb347"
          intensity={0.9}
          distance={2.4}
          decay={2}
        />
      )}
    </group>
  );
}

/**
 * Three carved faces, drawn glowing on a transparent background. Drawn
 * rather than modelled because a real cut-through would need the body
 * to be a solid — this reads the same at the sizes we use.
 */
export function makePumpkinFaceTexture(variant: number): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);

  const glow = ctx.createRadialGradient(256, 280, 20, 256, 280, 230);
  glow.addColorStop(0, "#fff6c8");
  glow.addColorStop(0.6, "#ffc247");
  glow.addColorStop(1, "#ff8c1a");
  ctx.fillStyle = glow;
  ctx.shadowColor = "rgba(255, 176, 60, 0.95)";
  ctx.shadowBlur = 26;

  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
  };

  // eyes, angled inwards so every face reads a bit cross
  poly([
    [124, 168],
    [228, 222],
    [128, 250],
  ]);
  poly([
    [388, 168],
    [284, 222],
    [384, 250],
  ]);
  // nose
  poly([
    [256, 252],
    [292, 318],
    [220, 318],
  ]);

  if (variant === 1) {
    // wide howl with two fangs bitten out
    ctx.beginPath();
    ctx.ellipse(256, 396, 104, 66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowBlur = 0;
    poly([
      [212, 332],
      [236, 396],
      [188, 396],
    ]);
    poly([
      [300, 332],
      [324, 396],
      [276, 396],
    ]);
    ctx.globalCompositeOperation = "source-over";
  } else if (variant === 2) {
    // long crooked smirk
    ctx.beginPath();
    ctx.moveTo(116, 356);
    ctx.quadraticCurveTo(256, 472, 400, 340);
    ctx.quadraticCurveTo(256, 416, 116, 356);
    ctx.closePath();
    ctx.fill();
  } else {
    // jagged grin
    const top = [352, 372, 352, 372, 352, 372, 352];
    const step = (396 - 116) / (top.length - 1);
    ctx.beginPath();
    ctx.moveTo(116, top[0]);
    top.forEach((yy, i) => ctx.lineTo(116 + i * step, yy));
    ctx.lineTo(396, 412);
    const bottom = [444, 420, 444, 420, 444];
    const bstep = (396 - 120) / (bottom.length - 1);
    bottom.forEach((yy, i) => ctx.lineTo(396 - i * bstep, yy));
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
