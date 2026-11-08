"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { ROOM } from "../../lib/layout";
import { makeGrainStrip, makePlankTextures } from "./textures";

/** Wall board tile size, in metres. */
const BOARD_TILE = 2.6;
/** Slat wainscot: height, slat width, depth and spacing (centre to centre). */
const SLATS = { height: 1.0, width: 0.045, depth: 0.022, pitch: 0.075 } as const;
const WALNUT = "#3d271a";

/**
 * The walls (BB-35): warm honey knotty-pine boards running floor to
 * ceiling — rich wood is what makes a cabin feel cosy — over darker
 * stained slats at wainscot height with shadow gaps and a walnut cap
 * rail. The slats are real geometry, one instanced mesh.
 */
export function Walls() {
  const { map: pine, bump: pineBump } = useMemo(
    () =>
      makePlankTextures(
        512,
        { rows: 16, minLength: 0.55, maxLength: 1, minStagger: 0.2, seed: 53 },
        { base: "#c98d55", toneSpread: 1, grainStrength: 1.2, knots: 0.55 },
        BOARD_TILE
      ),
    []
  );
  const slatGrain = useMemo(() => makeGrainStrip("#7a4a2a", 23, 0.1), []);
  useEffect(
    () => () => {
      pine.dispose();
      pineBump.dispose();
      slatGrain.dispose();
    },
    [pine, pineBump, slatGrain]
  );

  const { halfWidth, backZ, frontZ, height } = ROOM;
  const depth = frontZ - backZ;
  const midZ = (frontZ + backZ) / 2;

  // Each wall needs its own repeat, so each gets its own clones.
  const repeated = (t: THREE.Texture, w: number) => {
    const c = t.clone();
    c.repeat.set(w / BOARD_TILE, height / BOARD_TILE);
    c.needsUpdate = true;
    return c;
  };
  const backTex = useMemo(
    () => ({ map: repeated(pine, halfWidth * 2), bump: repeated(pineBump, halfWidth * 2) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pine, pineBump, halfWidth]
  );
  const sideTex = useMemo(
    () => ({ map: repeated(pine, depth), bump: repeated(pineBump, depth) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pine, pineBump, depth]
  );

  return (
    <group>
      {/* back wall */}
      <mesh position={[0, height / 2, backZ]} receiveShadow>
        <planeGeometry args={[halfWidth * 2, height]} />
        <meshStandardMaterial map={backTex.map} bumpMap={backTex.bump} bumpScale={1.2} roughness={0.7} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * halfWidth, height / 2, midZ]}
          rotation={[0, (-side * Math.PI) / 2, 0]}
          receiveShadow
        >
          <planeGeometry args={[depth, height]} />
          <meshStandardMaterial map={sideTex.map} bumpMap={sideTex.bump} bumpScale={1.2} roughness={0.7} />
        </mesh>
      ))}

      <Wainscot grain={slatGrain} />
    </group>
  );
}

/** Where every slat stands: along the back wall, then down both sides. */
function slatPlacements(): { x: number; z: number; ry: number }[] {
  const { halfWidth, backZ, frontZ } = ROOM;
  const inset = SLATS.depth / 2 + 0.012;
  const out: { x: number; z: number; ry: number }[] = [];
  for (let x = -halfWidth + SLATS.pitch / 2; x < halfWidth; x += SLATS.pitch)
    out.push({ x, z: backZ + inset, ry: 0 });
  for (const side of [-1, 1])
    for (let z = backZ + SLATS.pitch; z < frontZ; z += SLATS.pitch)
      out.push({ x: side * (halfWidth - inset), z, ry: (-side * Math.PI) / 2 });
  return out;
}

function Wainscot({ grain }: { grain: THREE.Texture }) {
  const placements = useMemo(slatPlacements, []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const rand = mulberry32(31);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    placements.forEach((p, i) => {
      o.position.set(p.x, SLATS.height / 2, p.z);
      o.rotation.set(0, p.ry, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Every slat a shade different, like real boards.
      const l = 0.9 + rand() * 0.2;
      m.setColorAt(i, c.setRGB(l, l * 0.98, l * 0.95));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [placements]);

  const { halfWidth, backZ, frontZ } = ROOM;
  const depth = frontZ - backZ;
  const midZ = (frontZ + backZ) / 2;
  const capY = SLATS.height + 0.02;

  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, placements.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[SLATS.width, SLATS.height, SLATS.depth]} />
        <meshStandardMaterial map={grain} roughness={0.6} />
      </instancedMesh>

      {/* dark backing behind the slats: the shadow gaps */}
      <mesh position={[0, SLATS.height / 2, backZ + 0.004]}>
        <planeGeometry args={[halfWidth * 2, SLATS.height]} />
        <meshStandardMaterial color="#2a1a10" roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (halfWidth - 0.004), SLATS.height / 2, midZ]}
          rotation={[0, (-side * Math.PI) / 2, 0]}
        >
          <planeGeometry args={[depth, SLATS.height]} />
          <meshStandardMaterial color="#2a1a10" roughness={1} />
        </mesh>
      ))}

      {/* walnut cap rail along the top */}
      <mesh position={[0, capY, backZ + 0.03]} castShadow>
        <boxGeometry args={[halfWidth * 2, 0.04, 0.06]} />
        <meshStandardMaterial color={WALNUT} roughness={0.45} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (halfWidth - 0.03), capY, midZ]} castShadow>
          <boxGeometry args={[0.06, 0.04, depth]} />
          <meshStandardMaterial color={WALNUT} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}
