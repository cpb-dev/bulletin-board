"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Pumpkin } from "@/components/three/props/Pumpkin";
import { HauntedHouse } from "@/components/three/props/HauntedHouse";
import { AutumnGrove } from "@/components/three/props/AutumnTree";
import {
  Headstone,
  type HeadstoneKind,
} from "@/components/three/props/Headstone";
import { Ground } from "@/components/three/props/Ground";
import { Sky } from "@/components/three/props/Sky";
import { Spider } from "@/components/three/props/Spider";
import { GraveMound } from "@/components/three/props/GraveMound";
import {
  ARM_KINDS,
  ZombieArm,
} from "@/components/three/props/ZombieArm";
import { armPose, RISE_KINDS } from "@/lib/zombie";
import type { ArmPose } from "@/lib/zombie";

const HEADSTONE_KINDS: HeadstoneKind[] = ["round", "gabled", "cross"];

/** The arm reads its pose from a ref; the harness holds it still. */
const frozen = (pose: ArmPose): React.RefObject<ArmPose> => ({ current: pose });

/** Props the harness can stage, by `?m=` name. */
const MODELS: Record<string, (variant: number, age: number) => React.ReactNode> = {
  pumpkin: (v) => <Pumpkin size={0.9} face={v} />,
  house: () => <HauntedHouse />,
  // `v` picks the seed, so the harness can compare one tree against the
  // next rather than judging a single tree in isolation.
  tree: (v) => (
    <AutumnGrove
      trees={[{ x: 0, z: 0, scale: 1, seed: [1182, 1049, 1084, 1063, 1210, 1238, 1056][v % 7] }]}
      leaves={false}
    />
  ),
  grove: () => <AutumnGrove trees={[
    { x: -3.4, z: 0, scale: 1.2, seed: 1182 },
    { x: 0, z: -1.2, scale: 1.05, seed: 1049 },
    { x: 3.6, z: 0.3, scale: 1.15, seed: 1084 },
  ]} />,
  /**
   * The ground and sky can only be judged against the scenery they
   * have to sit under, so this one stages a corner of the scene rather
   * than a prop on a turntable. It brings its own world — see
   * BRINGS_OWN_WORLD.
   */
  hollow: () => (
    <>
      <Sky />
      <Ground color="#6b5a3c" />
      <AutumnGrove
        trees={[
          { x: -7.5, z: -9, scale: 1.25, seed: 1182 },
          { x: 2, z: -11, scale: 1.1, seed: 1049 },
          { x: 7.5, z: -7.5, scale: 1.2, seed: 1084 },
          { x: 11, z: -12, scale: 1.05, seed: 1210 },
        ]}
      />
      <group position={[3.2, 0, -2.2]} rotation={[0, -0.3, 0]}>
        <Headstone kind="gabled" seed={2} size={0.95} lean={0.05} age={0.7} />
      </group>
      <group position={[5.4, 0, -3.6]} rotation={[0, 0.25, 0]}>
        <Headstone kind="cross" seed={5} size={1} lean={0.03} age={1} />
      </group>
      <group position={[1.4, 0, 0.4]}>
        <Pumpkin size={0.42} face={1} />
      </group>
    </>
  ),
  /**
   * `v` picks the arm, `g` is how far through a rise to freeze it —
   * so a still can be taken at any point of the animation.
   */
  arm: (v, g) => (
    <group position={[0, 0.45, 0]}>
      <ZombieArm
        kind={ARM_KINDS[v % ARM_KINDS.length]}
        pose={frozen(armPose(RISE_KINDS[0], g))}
        seed={v + 1}
      />
    </group>
  ),
  /** `v` picks the rise, `g` freezes it part-way through. */
  rise: (v, g) => (
    <>
      <GraveMound seed={2} age={0.4} />
      <ZombieArm
        kind="gaunt"
        pose={frozen(armPose(RISE_KINDS[v % RISE_KINDS.length], g))}
        seed={3}
      />
    </>
  ),
  mound: (v, age) => <GraveMound seed={v + 1} age={age} />,
  /** Spiders crawling on a flat panel, as they do on the board. */
  spider: (v) => (
    <group position={[0, 0.5, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.2, 0.9]} />
        <meshBasicMaterial color="#7a6a4e" />
      </mesh>
      {Array.from({ length: Math.max(1, v) }, (_, i) => (
        <Spider key={i} seed={i + 1} bounds={{ x: 0.55, y: 0.4 }} z={0.01} />
      ))}
    </group>
  ),
  headstone: (v, age) => (
    <Headstone
      kind={HEADSTONE_KINDS[v % HEADSTONE_KINDS.length]}
      seed={v + 1}
      size={1.5}
      lean={0.04}
      age={age}
      epitaph={v === 0 ? "SPOOKY\nSEASON" : undefined}
    />
  ),
};

/** Models that render their own ground and sky, so the stage hides its own. */
const BRINGS_OWN_WORLD = new Set(["hollow"]);

function Stage() {
  const params = useSearchParams();
  const name = params.get("m") ?? "pumpkin";
  const angle = Number(params.get("a") ?? 0) * (Math.PI / 180);
  const variant = Number(params.get("v") ?? 0);
  const age = Number(params.get("g") ?? 0.5);
  const dist = Number(params.get("d") ?? 6.2);
  const eye = Number(params.get("y") ?? 1.15);
  // Slide the prop under the camera, so a detail on a big model can be
  // framed without a second camera control. `oy` moves the prop but not
  // the ground plane, so for anything standing on the floor aim with
  // `ty` instead.
  const ox = Number(params.get("ox") ?? 0);
  const oy = Number(params.get("oy") ?? 0);
  /** Height the camera looks at. */
  const ty = Number(params.get("ty") ?? 0);
  const render = MODELS[name];

  return (
    <div className="fixed inset-0" style={{ background: "#8d8377" }}>
      <Canvas
        shadows
        camera={{
          fov: 32,
          position: [0, eye, dist],
          near: 0.1,
          // The app uses 120. At 50 the sky dome (radius 60) is entirely
          // behind the far plane and never draws, so the harness showed
          // the clear colour and nothing else.
          far: 200,
        }}
        dpr={[1, 2]}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, ty, 0);
          // let the screenshot script know the first frame is up
          gl.domElement.dataset.ready = "1";
        }}
      >
        {/* Matches the Haunted Hollow key/fill so what we judge here is
            what the scene will show — including its dreary overcast,
            which is flat and cool rather than dark. */}
        <ambientLight intensity={1.0} color="#d9d6d1" />
        <directionalLight
          position={[-4, 7, 4]}
          intensity={0.72}
          color="#e7e3d8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0012}
          shadow-normalBias={0.06}
          // Wide enough for the house. The default +/-5 frustum clips a
          // big prop and paints stripes of garbage shadow across it.
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={16}
          shadow-camera-bottom={-6}
          shadow-camera-far={40}
          // R3F sets the shadow camera's properties but never refreshes
          // its projection matrix, so without this the frustum above is
          // ignored and a big prop gets striped with shadow acne.
          onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
        />
        <hemisphereLight args={["#a6a6ac", "#4c4232", 0.62]} />

        <group position={[ox, oy, 0]}>
          <group rotation={[0, angle, 0]}>
            {render ? render(variant, age) : null}
          </group>
        </group>

        {/* Ground, so contact and shadow shape are visible. Skipped for
            models that bring their own. */}
        {!BRINGS_OWN_WORLD.has(name) && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#6b5a3c" />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}

export function ModelStage() {
  return (
    <Suspense fallback={null}>
      <Stage />
    </Suspense>
  );
}
