"use client";

import { IRON } from "./colours";
import { CornStalks } from "./FallDecor";
import { DoorWreath } from "./StreetParts";
import { useLook } from "./phase";

/**
 * A black cast-iron street lamp: a fluted base, a slim post, and either
 * one white globe (Main Street) or three on a crossbar (round the
 * square). Dressed for autumn with a leaf wreath on the post and corn
 * stalks tied round its foot, as the lamps on the square are.
 *
 * Origin at the foot of the post.
 */
export function StreetLamp({ globes = 1, dressed = true }: { globes?: 1 | 3; dressed?: boolean }) {
  const H = 3.4;
  // lit brighter as the day goes (BB-21)
  const { lampGlow, lampColour } = useLook();
  const iron = <meshStandardMaterial color={IRON} roughness={0.5} metalness={0.3} />;
  const globe = (
    <meshStandardMaterial
      color="#fbf8f0"
      emissive={lampColour}
      emissiveIntensity={lampGlow}
      roughness={0.4}
    />
  );
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 0.6, 10]} />
        {iron}
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <torusGeometry args={[0.1, 0.035, 6, 12]} />
        {iron}
      </mesh>
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, H, 8]} />
        {iron}
      </mesh>
      {globes === 1 ? (
        <group position={[0, H, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.1, 0.07, 0.12, 8]} />
            {iron}
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.2, 16, 12]} />
            {globe}
          </mesh>
        </group>
      ) : (
        <group position={[0, H, 0]}>
          <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
            {iron}
          </mesh>
          {[-0.4, 0, 0.4].map((x) => (
            <group key={x} position={[x, x === 0 ? 0.28 : 0.08, 0]}>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.07, 0.05, 0.08, 8]} />
                {iron}
              </mesh>
              <mesh position={[0, 0.2, 0]} castShadow>
                <sphereGeometry args={[0.16, 16, 12]} />
                {globe}
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.3, 6]} />
            {iron}
          </mesh>
        </group>
      )}
      {dressed && (
        <>
          {/* a big leaf wreath round the post, as on the square */}
          <DoorWreath y={2.35} z={0.1} r={0.3} />
          <CornStalks height={1.7} seed={3} />
        </>
      )}
    </group>
  );
}
