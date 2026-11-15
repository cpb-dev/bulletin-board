"use client";

import { useEffect, useMemo } from "react";
import { ROOM_CAMERA } from "../../lib/layout";
import { SNOWMAN } from "../../lib/outdoor";
import { makeOutdoorMaterial, type OutdoorUniforms } from "./material";

/**
 * A snowman out on the ridge (BB-35), far enough off to be small, turned
 * to look at the cabin: three snowballs, coal eyes, smile and buttons, a
 * carrot nose, stick arms, a red scarf with a trailing end, and a black
 * top hat with a red band.
 */
export function Snowman({ shared }: { shared: OutdoorUniforms }) {
  const m = useMemo(() => {
    const opts = { hazeNear: 20, hazeFar: 110 };
    return {
      snow: makeOutdoorMaterial(shared, { color: "#f7f9fc", sparkle: 0.5, ...opts }),
      coal: makeOutdoorMaterial(shared, { color: "#1b1b1d", ...opts }),
      carrot: makeOutdoorMaterial(shared, { color: "#e57a2c", ...opts }),
      scarf: makeOutdoorMaterial(shared, { color: "#b3202a", ...opts }),
      hat: makeOutdoorMaterial(shared, { color: "#1d1d22", ...opts }),
      stick: makeOutdoorMaterial(shared, { color: "#5a3e2a", snowCap: 0.6, ...opts }),
    };
  }, [shared]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);

  const { x, y, z } = SNOWMAN;
  const face = Math.atan2(ROOM_CAMERA.x - x, ROOM_CAMERA.z - z);
  // Proportions for a 2 m snowman.
  const b = { r: 0.55, y: 0.5 };
  const mid = { r: 0.41, y: 1.24 };
  const head = { r: 0.3, y: 1.8 };

  return (
    <group position={[x, y - 0.1, z]} rotation={[0, face, 0]}>
      <mesh position={[0, b.y, 0]} scale={[1, 0.92, 1]} material={m.snow}>
        <sphereGeometry args={[b.r, 24, 16]} />
      </mesh>
      <mesh position={[0, mid.y, 0]} material={m.snow}>
        <sphereGeometry args={[mid.r, 24, 16]} />
      </mesh>
      <mesh position={[0, head.y, 0]} material={m.snow}>
        <sphereGeometry args={[head.r, 20, 14]} />
      </mesh>
      {/* coal buttons down the front */}
      {[1.38, 1.22, 1.06].map((by) => (
        <mesh key={by} position={[0, by, Math.sqrt(mid.r ** 2 - (by - mid.y) ** 2) - 0.01]} material={m.coal}>
          <sphereGeometry args={[0.045, 10, 8]} />
        </mesh>
      ))}
      {/* eyes and a coal smile */}
      {[-0.1, 0.1].map((ex) => (
        <mesh key={ex} position={[ex, head.y + 0.07, head.r - 0.03]} material={m.coal}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
      ))}
      {[-2, -1, 0, 1, 2].map((k) => (
        <mesh key={k} position={[k * 0.05, head.y - 0.1 + Math.abs(k) * 0.018, head.r - 0.04]} material={m.coal}>
          <sphereGeometry args={[0.022, 8, 6]} />
        </mesh>
      ))}
      {/* carrot nose */}
      <mesh position={[0, head.y, head.r + 0.09]} rotation={[Math.PI / 2, 0, 0]} material={m.carrot}>
        <coneGeometry args={[0.045, 0.24, 10]} />
      </mesh>
      {/* stick arms, with a twig each */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * mid.r * 0.9, mid.y + 0.1, 0]} rotation={[0, 0, s * -0.95]}>
          <mesh position={[0, 0.38, 0]} material={m.stick}>
            <cylinderGeometry args={[0.018, 0.026, 0.76, 6]} />
          </mesh>
          <mesh position={[s * 0.06, 0.62, 0]} rotation={[0, 0, s * 0.7]} material={m.stick}>
            <cylinderGeometry args={[0.01, 0.014, 0.22, 5]} />
          </mesh>
        </group>
      ))}
      {/* scarf round the neck, with an end hanging down */}
      <mesh position={[0, head.y - head.r + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.scarf}>
        <torusGeometry args={[head.r * 0.92, 0.07, 10, 24]} />
      </mesh>
      <mesh position={[0.16, head.y - head.r - 0.2, head.r * 0.75]} rotation={[0.25, 0, 0.15]} material={m.scarf}>
        <boxGeometry args={[0.13, 0.42, 0.05]} />
      </mesh>
      {/* top hat with a red band */}
      <group position={[0, head.y + head.r * 0.82, 0]} rotation={[-0.05, 0, 0.12]}>
        <mesh material={m.hat}>
          <cylinderGeometry args={[0.32, 0.32, 0.035, 20]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={m.hat}>
          <cylinderGeometry args={[0.2, 0.21, 0.4, 20]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={m.scarf}>
          <cylinderGeometry args={[0.212, 0.212, 0.07, 20]} />
        </mesh>
      </group>
    </group>
  );
}
