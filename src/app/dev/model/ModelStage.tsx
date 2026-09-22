"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Pumpkin } from "@/components/three/props/Pumpkin";
import {
  Headstone,
  type HeadstoneKind,
} from "@/components/three/props/Headstone";

const HEADSTONE_KINDS: HeadstoneKind[] = ["round", "gabled", "cross"];

/** Props the harness can stage, by `?m=` name. */
const MODELS: Record<string, (variant: number, age: number) => React.ReactNode> = {
  pumpkin: (v) => <Pumpkin size={0.9} face={v} />,
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
  const render = MODELS[name];

  return (
    <div className="fixed inset-0" style={{ background: "#8d8377" }}>
      <Canvas
        shadows
        camera={{ fov: 32, position: [0, eye, dist], near: 0.1, far: 50 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
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
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <hemisphereLight args={["#c9b79b", "#6b5436", 0.55]} />

        <group rotation={[0, angle, 0]}>{render ? render(variant, age) : null}</group>

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
