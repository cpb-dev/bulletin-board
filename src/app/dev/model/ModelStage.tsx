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

const HEADSTONE_KINDS: HeadstoneKind[] = ["round", "gabled", "cross"];

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
        camera={{ fov: 32, position: [0, eye, dist], near: 0.1, far: 50 }}
        dpr={[1, 2]}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, ty, 0);
          // let the screenshot script know the first frame is up
          gl.domElement.dataset.ready = "1";
        }}
      >
        {/* Matches the Haunted Hollow key/fill so what we judge here is
            what the scene will show. */}
        <ambientLight intensity={0.95} color="#f3e2c8" />
        <directionalLight
          position={[-4, 7, 4]}
          intensity={1.35}
          color="#ffe6b8"
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
        <hemisphereLight args={["#c9b79b", "#6b5436", 0.55]} />

        <group position={[ox, oy, 0]}>
          <group rotation={[0, angle, 0]}>
            {render ? render(variant, age) : null}
          </group>
        </group>

        {/* ground, so contact and shadow shape are visible */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#6b5a3c" />
        </mesh>
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
