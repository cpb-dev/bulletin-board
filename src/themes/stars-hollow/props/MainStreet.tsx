"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  FIRST_LOT_S,
  FRONT_LINE,
  STREET,
  STREET_RIGHT,
  STREET_YAW,
  shopLots,
  streetLamps,
  streetPoint,
} from "../lib/layout";
import { useKit, useRepeated } from "./kit";
import { makeAsphaltTexture } from "./textures";
import { LUKES, LukesDiner } from "./LukesDiner";
import { Storefront } from "./Storefront";
import { StreetLamp } from "./StreetLamp";
import { Bench, CornStalks, HayBale, Mums } from "./FallDecor";

/**
 * Main Street: the road running away from the square, the pavement on
 * either side, Luke's on the near corner and the row of shops beyond
 * it, lamps along both kerbs, and the shops' own autumn dressing out on
 * the pavement.
 *
 * Everything is placed from `lib/layout.ts`; this only draws it.
 */
export function MainStreet() {
  const lots = useMemo(shopLots, []);
  const lamps = useMemo(streetLamps, []);
  return (
    <group>
      <Road />
      {lots.map((lot) => (
        <group key={lot.seed} position={[lot.x, 0, lot.z]} rotation={[0, lot.rot, 0]}>
          {lot.kind === "lukes" ? (
            <LukesDiner />
          ) : (
            <Storefront
              kind={lot.kind}
              sign={lot.sign}
              width={lot.width}
              depth={lot.depth}
              floors={lot.floors}
              seed={lot.seed}
            />
          )}
          <PavementDressing seed={lot.seed} width={lot.width} lukes={lot.kind === "lukes"} />
        </group>
      ))}
      {lamps.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <StreetLamp globes={l.side < 0 ? 3 : 1} dressed={i % 2 === 0} />
        </group>
      ))}
    </group>
  );
}

/**
 * The road, its kerbs, and the pavements. Laid as long strips along the
 * street's own axis, then turned into place as one group.
 */
function Road() {
  const kit = useKit();
  const length = STREET.back + STREET.front;
  const asphaltBase = useMemo(() => makeAsphaltTexture(), []);
  useEffect(() => () => asphaltBase.dispose(), [asphaltBase]);
  const asphalt = useMemo(() => {
    const t = asphaltBase.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((STREET.halfWidth * 2) / 3, length / 3);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [asphaltBase, length]);
  useEffect(() => () => asphalt.dispose(), [asphalt]);

  // pavement widths
  const shopSide = FRONT_LINE - STREET.halfWidth;
  const squareSide = 1.1;
  const pave = useRepeated((k) => k.paving, 1, length / 1.4);
  const paveNarrow = useRepeated((k) => k.paving, 0.8, length / 1.4);

  // The strips run from s = -front to s = back; the middle of that.
  const mid = (STREET.back - STREET.front) / 2;
  const centre = streetPoint(mid);
  // Luke's corner: the shop-side pavement stops short of the corner by
  // Luke's side and turns round it, along the cross street.
  const cornerS = FIRST_LOT_S - 1.4;
  const shopRun = STREET.back - cornerS;
  const shopMid = streetPoint(cornerS + shopRun / 2, STREET.halfWidth + shopSide / 2);
  const paveShop = useRepeated((k) => k.paving, 1, shopRun / 1.4);

  return (
    <group>
      <group position={[centre.x, 0, centre.z]} rotation={[0, STREET_YAW, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[STREET.halfWidth * 2, length]} />
          <meshStandardMaterial color="#6f6d6a" map={asphalt} roughness={0.95} />
        </mesh>
        {/* the painted centre line, a faded double yellow */}
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, 0]}>
            <planeGeometry args={[0.07, length]} />
            <meshLambertMaterial color="#d9b54a" />
          </mesh>
        ))}
        {/* square-side kerb and pavement */}
        <mesh position={[-STREET.halfWidth - squareSide / 2, 0.07, 0]} receiveShadow castShadow>
          <boxGeometry args={[squareSide, 0.14, length]} />
          <meshToonMaterial color="#d6d1c6" map={paveNarrow} gradientMap={kit.ramp} />
        </mesh>
      </group>
      {/* shop-side pavement, from Luke's corner onwards */}
      <group position={[shopMid.x, 0, shopMid.z]} rotation={[0, STREET_YAW, 0]}>
        <mesh position={[0, 0.07, 0]} receiveShadow castShadow>
          <boxGeometry args={[shopSide + 0.2, 0.14, shopRun]} />
          <meshToonMaterial color="#d6d1c6" map={paveShop} gradientMap={kit.ramp} />
        </mesh>
      </group>
      {/* ...and round the corner along Luke's side, with the cross street */}
      <CrossStreet cornerS={cornerS} pave={pave} />
    </group>
  );
}

/**
 * The side street at Luke's corner, running off to the right. Only its
 * first stretch is ever seen, so it's short.
 */
function CrossStreet({ cornerS, pave }: { cornerS: number; pave: THREE.Texture }) {
  const kit = useKit();
  const across = 3.0;
  const run = 14;
  const start = streetPoint(cornerS - across / 2, STREET.halfWidth);
  // Turn local +x to point along the street's right: away from the
  // square, along the cross street. Local -z is then further along
  // Main Street, which is the side Luke's is on.
  const yaw = Math.atan2(-STREET_RIGHT.z, STREET_RIGHT.x);
  return (
    <group position={[start.x, 0, start.z]} rotation={[0, yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[run / 2, 0.021, 0]} receiveShadow>
        <planeGeometry args={[run, across]} />
        <meshStandardMaterial color="#6f6d6a" roughness={0.95} />
      </mesh>
      {/* the pavement along Luke's side */}
      <mesh position={[run / 2, 0.07, -across / 2 - 0.7]} receiveShadow castShadow>
        <boxGeometry args={[run, 0.14, 1.4]} />
        <meshToonMaterial color="#d6d1c6" map={pave} gradientMap={kit.ramp} />
      </mesh>
    </group>
  );
}

/**
 * What each shop has put out on the pavement: corn stalks either side
 * of the door, a hay bale, a pot of mums, a bench outside some.
 */
function PavementDressing({ seed, width, lukes }: { seed: number; width: number; lukes: boolean }) {
  const y = 0.14;
  if (lukes) {
    // Luke's keeps it tidy: a pot of mums at the corner and one by the door.
    return (
      <group position={[0, y, 0]}>
        <group position={[LUKES.width / 2 + 0.35, 0, 0.45]}>
          <Mums seed={1} size={1.2} />
        </group>
        <group position={[-2.05, 0, 0.45]}>
          <Mums seed={3} />
        </group>
      </group>
    );
  }
  const side = seed % 2 ? -1 : 1;
  return (
    <group position={[0, y, 0]}>
      <group position={[side * (width / 2 - 0.35), 0, 0.35]}>
        <CornStalks height={1.5} seed={seed} radius={0.12} />
      </group>
      {seed % 3 === 0 ? (
        <group position={[-side * (width / 4), 0, 0.55]}>
          <HayBale turn={0.1} />
          <group position={[0.25, 0.45, 0]}>
            <Mums seed={seed} size={0.8} />
          </group>
        </group>
      ) : (
        <group position={[-side * (width / 2 - 0.5), 0, 0.5]}>
          <Mums seed={seed} />
        </group>
      )}
      {seed % 3 === 1 && (
        <group position={[0, 0, 0.85]}>
          <Bench />
        </group>
      )}
    </group>
  );
}
