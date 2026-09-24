"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import type { ThemeBoardDecor } from "@/themes/types";
import { LOOKS, type PhaseLook } from "../lib/looks";
import { twinkle } from "../lib/twinkle";
import { Garland, swag } from "./Garland";
import { makeLeafTexture } from "./textures";

/**
 * Stars Hollow's board decor: an autumn leaf garland swagged across the
 * top of the board in two loops, its ends trailing down the sides, with
 * warm fairy bulbs threaded through it — the same lights as round
 * Luke's windows.
 *
 * It hangs from the board rather than the scene, so it brings its own
 * leaf texture instead of reading the scene's kit, and is handed the
 * phase of the day directly. After dark (BB-21) the bulbs glow, twinkle
 * and throw a little warm light on the leaves and the top of the board.
 */
export const LeafGarland: ThemeBoardDecor = ({ phase = "day" }) => {
  const look = LOOKS[phase];
  const leaf = useMemo(makeLeafTexture, []);
  useEffect(() => () => leaf.dispose(), [leaf]);

  const top = BOARD.centerY + BOARD.height / 2 + 0.1;
  const z = BOARD_SURFACE_Z + 0.06;
  const half = BOARD.width / 2 + 0.08;

  const curves = useMemo(() => {
    const L = new THREE.Vector3(-half, top, z);
    const M = new THREE.Vector3(0, top + 0.02, z);
    const R = new THREE.Vector3(half, top, z);
    return [
      swag(L, M, 0.2),
      swag(M, R, 0.2),
      // tails down each side
      new THREE.QuadraticBezierCurve3(
        L.clone(),
        new THREE.Vector3(-half - 0.06, top - 0.3, z),
        new THREE.Vector3(-half - 0.02, top - 0.6, z)
      ),
      new THREE.QuadraticBezierCurve3(
        R.clone(),
        new THREE.Vector3(half + 0.06, top - 0.3, z),
        new THREE.Vector3(half + 0.02, top - 0.6, z)
      ),
    ];
  }, [half, top, z]);

  return (
    <group>
      <Garland curves={curves} perMetre={70} size={0.12} thickness={0.045} seed={22} map={leaf} />
      <Bulbs curves={curves.slice(0, 2)} look={look} />
    </group>
  );
};

const BULB_COLOUR = new THREE.Color("#ffdf9a");
const PER_SWAG = 9;

/**
 * Small warm bulbs threaded along the swags. By day they are steady and
 * nothing more; after dark each has a halo, twinkles on its own
 * (`lib/twinkle.ts`), and each swag throws a soft light that follows
 * its bulbs' twinkle.
 */
function Bulbs({ curves, look }: { curves: THREE.Curve<THREE.Vector3>[]; look: PhaseLook }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(
    () =>
      curves.flatMap((c) =>
        Array.from({ length: PER_SWAG }, (_, i) =>
          c.getPointAt((i + 0.5) / PER_SWAG).add(new THREE.Vector3(0, -0.02, 0.05))
        )
      ),
    [curves]
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);

  const { glow, light, twinkle: amount } = look.garland;
  const halos = useRef<THREE.BufferGeometry>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const colour = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    if (amount === 0) return;
    const t = clock.elapsedTime;
    const mesh = ref.current;
    const halo = halos.current?.getAttribute("color") as THREE.BufferAttribute | undefined;
    const sums = curves.map(() => 0);
    points.forEach((_, i) => {
      const b = twinkle(t, i, amount);
      sums[Math.floor(i / PER_SWAG)] += b;
      if (mesh) mesh.setColorAt(i, colour.copy(BULB_COLOUR).multiplyScalar(0.55 + 0.45 * b));
      if (halo) halo.setXYZ(i, BULB_COLOUR.r * glow * b, BULB_COLOUR.g * glow * b, BULB_COLOUR.b * glow * b);
    });
    if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (halo) halo.needsUpdate = true;
    lights.current.forEach((l, s) => {
      if (l) l.intensity = light * 0.5 * (sums[s] / PER_SWAG);
    });
  });

  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshBasicMaterial color="#ffdf9a" toneMapped={false} />
      </instancedMesh>
      {glow > 0 && <Halos points={points} geometryRef={halos} />}
      {light > 0 &&
        curves.map((c, s) => {
          // just in front of the middle of each swag, a touch below it
          const p = c.getPointAt(0.5).add(new THREE.Vector3(0, -0.05, 0.6));
          return (
            <pointLight
              key={s}
              ref={(l) => {
                lights.current[s] = l;
              }}
              position={p}
              color="#ffc978"
              intensity={light * 0.5}
              distance={2.6}
              decay={2}
            />
          );
        })}
    </>
  );
}

/** A soft glow round each bulb: one draw of points, brightness per bulb. */
function Halos({
  points,
  geometryRef,
}: {
  points: THREE.Vector3[];
  geometryRef: React.RefObject<THREE.BufferGeometry | null>;
}) {
  const texture = useMemo(() => {
    const S = 64;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.25, "rgba(255, 255, 255, 0.45)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const [positions, colours] = useMemo(
    () => [
      new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])),
      new Float32Array(points.length * 3),
    ],
    [points]
  );
  return (
    <points renderOrder={2}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colours, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.22}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
