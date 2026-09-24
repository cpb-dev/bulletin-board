"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Pumpkin } from "@/themes/haunted-hollow/props/Pumpkin";
import { HauntedHouse } from "@/themes/haunted-hollow/props/HauntedHouse";
import { AutumnGrove } from "@/themes/haunted-hollow/props/AutumnTree";
import {
  Headstone,
  type HeadstoneKind,
} from "@/themes/haunted-hollow/props/Headstone";
import { Ground } from "@/themes/haunted-hollow/props/Ground";
import { Sky } from "@/themes/haunted-hollow/props/Sky";
import { Spider } from "@/themes/haunted-hollow/props/Spider";
import { Cobwebs } from "@/themes/haunted-hollow/props/Cobweb";
import { HouseWindow } from "@/themes/haunted-hollow/props/HouseWindow";
import { makeToonRamp } from "@/components/three/textures";
import { makeCobwebTexture } from "@/themes/haunted-hollow/props/HauntedHouse";
import { FORMS, PASS_KINDS } from "@/themes/haunted-hollow/lib/ghost";
import { GraveMound } from "@/themes/haunted-hollow/props/GraveMound";
import {
  ARM_KINDS,
  ZombieArm,
} from "@/themes/haunted-hollow/props/ZombieArm";
import { armPose, RISE_KINDS } from "@/themes/haunted-hollow/lib/zombie";
import { scatterStarts } from "@/themes/haunted-hollow/lib/spider";
import {
  BOARD,
  BOARD_SURFACE_Z,
  ITEM_Z,
  NOTE_BASE,
} from "@/lib/board-geometry";
import { Pin } from "@/components/three/Pin";
import type { ArmPose } from "@/themes/haunted-hollow/lib/zombie";
import { KitProvider } from "@/themes/stars-hollow/props/kit";
import { TownSign } from "@/themes/stars-hollow/props/TownSign";
import { Gazebo } from "@/themes/stars-hollow/props/Gazebo";
import { LukesDiner } from "@/themes/stars-hollow/props/LukesDiner";
import { Storefront } from "@/themes/stars-hollow/props/Storefront";
import { FallTree } from "@/themes/stars-hollow/props/FallTree";
import { StreetLamp } from "@/themes/stars-hollow/props/StreetLamp";
import { Bench, CornStalks, HayBale, Mums } from "@/themes/stars-hollow/props/FallDecor";

/** Stars Hollow's shop kinds, in `?v=` order. */
const SHOP_KINDS = ["brick-teal", "brick-arched", "victorian", "clapboard", "brick-tall"] as const;
const TREE_SPECIES = ["maple", "street", "sycamore"] as const;

const HEADSTONE_KINDS: HeadstoneKind[] = ["round", "gabled", "cross"];

/**
 * One window at its real size, with the wall it is cut into.
 *
 * A component rather than inline JSX because the house builds its own
 * ramp and web textures and the harness needs copies — and both draw
 * to a canvas, so they have to be built inside a render that only ever
 * happens in the browser. A `MODELS` entry is evaluated while the
 * element tree is built, which also happens on the server.
 */
function HarnessWindow({
  seed,
  p,
  pass,
  form,
}: {
  seed: number;
  p: number;
  pass: number;
  form: number;
}) {
  const ramp = useMemo(() => makeToonRamp([58, 100, 146, 192, 234, 255]), []);
  const web = useMemo(() => makeCobwebTexture(3), []);
  return (
    <group position={[0, 0.7, 0]}>
      {/* A patch of facade with the opening cut out of it, as four
          panels — the reveal has to have real depth or the glass ends
          up buried inside the wall, which is exactly what happened the
          first time this was staged. */}
      {(
        [
          [0, 1.15, 2.6, 1.5],
          [0, -1.15, 2.6, 1.5],
          [-1.15, 0, 1.7, 1.1],
          [1.15, 0, 1.7, 1.1],
        ] as const
      ).map(([wx, wy, ww, wh], i) => (
        <mesh key={i} position={[wx, wy, -0.11]}>
          <boxGeometry args={[ww, wh, 0.22]} />
          <meshStandardMaterial color="#413a44" roughness={0.95} />
        </mesh>
      ))}
      {/* the room behind, so the opening is not a hole onto the sky */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial color="#0a0708" />
      </mesh>
      <HouseWindow
        x={0}
        y={0}
        w={0.9}
        h={1.1}
        seed={seed}
        inner={-0.22}
        frontZ={0}
        ramp={ramp}
        web={web}
        freeze={{
          form: FORMS[form % FORMS.length],
          kind: PASS_KINDS[pass % PASS_KINDS.length],
          p,
        }}
      />
    </group>
  );
}

/** The arm reads its pose from a ref; the harness holds it still. */
const frozen = (pose: ArmPose): React.RefObject<ArmPose> => ({ current: pose });

/** Props the harness can stage, by `?m=` name. */
/** Extra dials only some models read. */
interface Dials {
  /** Which ghost pass to stage, by `?k=`. */
  pass: number;
  /** Which ghost form to stage, by `?f=`. */
  form: number;
}

const MODELS: Record<
  string,
  (variant: number, age: number, extra: Dials) => React.ReactNode
> = {
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
  /**
   * `v` picks the window's seed, so the glass, its grid of lights and
   * whether one of them is broken all change with it. `g` freezes a
   * ghost part-way through a pass — waiting 7 to 17 seconds for a
   * sighting is no way to judge one — and `k` and `f` pick which pass
   * and which form to freeze.
   */
  window: (v, g, extra) => (
    <HarnessWindow
      seed={Math.max(1, v)}
      p={g}
      pass={extra.pass}
      form={extra.form}
    />
  ),
  /** Spiders crawling on a flat panel, as they do on the board. */
  spider: (v) => {
    const bounds = { x: 0.55, y: 0.4 };
    return (
      <group position={[0, 0.5, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.2, 0.9]} />
          <meshBasicMaterial color="#7a6a4e" />
        </mesh>
        {scatterStarts(Math.max(1, v), bounds, 3).map((start, i) => (
          <Spider key={i} seed={i + 1} start={start} bounds={bounds} z={0.01} />
        ))}
      </group>
    );
  },
  /**
   * The webs can only be judged against the frame they hug and the
   * cork they hang over, so this stages the real board — frame, cork
   * and all — with the board centre brought down to the origin.
   * Brings its own world, since the board hangs on a wall.
   */
  webs: () => (
    <group position={[0, -BOARD.centerY, 0]}>
      <mesh position={[0, BOARD.centerY, BOARD_SURFACE_Z - 0.13]}>
        <boxGeometry args={[BOARD.width + 0.24, BOARD.height + 0.24, 0.12]} />
        <meshStandardMaterial color="#4a3b2f" roughness={0.9} />
      </mesh>
      <mesh position={[0, BOARD.centerY, BOARD_SURFACE_Z]}>
        <planeGeometry args={[BOARD.width, BOARD.height]} />
        <meshStandardMaterial color="#8a6f4a" roughness={1} />
      </mesh>
      {/* Stand-in notes out at the edges, where the webs are. A web
          that draws under a note is the thing to look for here. */}
      {[
        [-2.0, 1.05],
        [2.0, 1.05],
        [-2.0, -1.05],
        [0.4, 1.05],
      ].map(([nx, ny], i) => (
        <group key={i} position={[nx, BOARD.centerY + ny, ITEM_Z]}>
          <mesh>
            <planeGeometry args={[NOTE_BASE, NOTE_BASE]} />
            <meshStandardMaterial color="#f2e2a8" roughness={0.9} />
          </mesh>
          <Pin color="#c2454b" position={[0, NOTE_BASE / 2 - 0.05, 0.012]} />
        </group>
      ))}
      <Cobwebs />
    </group>
  ),
  /*
   * Stars Hollow. Its props share textures through a kit, so each is
   * staged inside its own provider. For the whole scene in its own
   * light, use /dev/scene?t=stars-hollow instead.
   */
  sign: () => (
    <KitProvider>
      <TownSign />
    </KitProvider>
  ),
  gazebo: () => (
    <KitProvider>
      <Gazebo />
    </KitProvider>
  ),
  lukes: () => (
    <KitProvider>
      <LukesDiner />
    </KitProvider>
  ),
  /** `v` picks the kind of shopfront. */
  shop: (v) => (
    <KitProvider>
      <Storefront
        kind={SHOP_KINDS[v % SHOP_KINDS.length]}
        sign="STARS HOLLOW BOOKS"
        width={4.6}
        depth={5}
        floors={1 + (v % 2)}
        seed={v + 2}
      />
    </KitProvider>
  ),
  /** `v` picks the species; the seed follows it. */
  "fall-tree": (v) => (
    <KitProvider>
      <FallTree species={TREE_SPECIES[v % TREE_SPECIES.length]} seed={v + 3} />
    </KitProvider>
  ),
  /** `v` 0 is a Main Street lamp, 1 a three-globe lamp on the square. */
  lamp: (v) => (
    <KitProvider>
      <StreetLamp globes={v % 2 ? 3 : 1} />
    </KitProvider>
  ),
  /** The October dressing: stalks, a bale with mums on it, a bench. */
  "fall-decor": (v) => (
    <KitProvider>
      <group position={[-1.2, 0, 0]}>
        <CornStalks seed={v + 1} />
      </group>
      <HayBale />
      <group position={[0.2, 0.45, 0]}>
        <Mums seed={v} />
      </group>
      <group position={[1.6, 0, 0]}>
        <Bench />
      </group>
    </KitProvider>
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
const BRINGS_OWN_WORLD = new Set(["hollow", "webs"]);

function Stage() {
  const params = useSearchParams();
  const name = params.get("m") ?? "pumpkin";
  const angle = Number(params.get("a") ?? 0) * (Math.PI / 180);
  const variant = Number(params.get("v") ?? 0);
  const age = Number(params.get("g") ?? 0.5);
  const pass = Number(params.get("k") ?? 0);
  const form = Number(params.get("f") ?? 0);
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
            {render ? render(variant, age, { pass, form }) : null}
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
