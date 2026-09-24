"use client";

import { GAZEBO, GAZEBO_YAW, SIGN, faceCamera } from "../lib/layout";
import { Bench, CornStalks, HayBale, Mums } from "./FallDecor";
import { StreetLamp } from "./StreetLamp";

/**
 * The square got ready for autumn: corn stalks tied to the sign's posts
 * with a hay bale and mums at its foot, bales and stalks either side of
 * the gazebo steps, benches round the gazebo path, and the three-globe
 * lamps on the green.
 */
export function SquareDressing() {
  const signYaw = faceCamera(SIGN.x, SIGN.z);
  return (
    <group>
      {/* at the sign — in its own frame, so they stay with it */}
      <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, signYaw, 0]}>
        {/* Tied to the outside of each post, clear of the lettering. */}
        <group position={[-1.32, 0, -0.02]}>
          <CornStalks height={1.8} seed={11} radius={0.13} />
        </group>
        <group position={[1.32, 0, -0.02]}>
          <CornStalks height={1.75} seed={12} radius={0.13} />
        </group>
        <group position={[-0.55, 0, 0.75]}>
          <HayBale turn={0.15} />
        </group>
        <group position={[-0.25, 0.45, 0.72]}>
          <Mums seed={0} size={0.9} />
        </group>
        <group position={[0.55, 0, 0.6]}>
          <Mums seed={2} size={1.1} />
        </group>
      </group>

      {/* at the gazebo steps — in the gazebo's frame, scaled with it */}
      <group
        position={[GAZEBO.x, 0, GAZEBO.z]}
        rotation={[0, GAZEBO_YAW, 0]}
        scale={GAZEBO.scale}
      >
        {[-1, 1].map((s) => (
          <group key={s}>
            <group position={[s * 1.6, 0, 3.4]}>
              <HayBale turn={s * 0.2} />
            </group>
            <group position={[s * 1.6, 0.45, 3.4]}>
              <Mums seed={s > 0 ? 1 : 3} size={0.9} />
            </group>
            <group position={[s * 1.2, 0, 2.45]}>
              <CornStalks height={1.5} seed={20 + s} radius={0.12} />
            </group>
          </group>
        ))}
      </group>

      {/* benches on the ring path round the gazebo, facing it */}
      {[0.9, 2.4, 4.1].map((a, i) => {
        const r = GAZEBO.radius + 1.05;
        const x = GAZEBO.x + Math.sin(GAZEBO_YAW + a) * r;
        const z = GAZEBO.z + Math.cos(GAZEBO_YAW + a) * r;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, GAZEBO_YAW + a + Math.PI, 0]}>
            <Bench />
          </group>
        );
      })}

      {/* lamps on the green */}
      {[
        [-7.3, -2.2],
        [-3.4, -10.8],
        [-13.8, -7.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, faceCamera(x, z), 0]}>
          <StreetLamp globes={3} dressed={i !== 1} />
        </group>
      ))}
    </group>
  );
}
