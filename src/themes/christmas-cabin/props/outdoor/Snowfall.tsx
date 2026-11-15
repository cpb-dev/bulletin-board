"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SNOWFALL, snowFlake } from "../../lib/outdoor";

/**
 * The falling snow outside (BB-35): ~700 flakes through the slice of the
 * outdoors you can see, near ones big and soft, far ones fine, all
 * drifting on the breeze. Positions come from `snowFlake` each frame.
 */
export function Snowfall({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SNOWFALL.count * 3), 3));
    const size = new Float32Array(SNOWFALL.count);
    for (let i = 0; i < SNOWFALL.count; i++) size[i] = 0.7 + ((i * 7919) % 100) / 100;
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color() }, uScale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          uniform float uScale;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Perspective size: ~4 cm flakes, a few pixels at the window.
            gl_PointSize = aSize * 0.028 * uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d);
            gl_FragColor = vec4(uColor, a * 0.9);
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  useFrame(({ clock, size, camera, gl }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < SNOWFALL.count; i++) {
      const f = snowFlake(i, t);
      pos.setXYZ(i, f.x, f.y, f.z);
    }
    pos.needsUpdate = true;
    // Pixels per world unit at distance 1, so flakes keep their size on any screen.
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 46;
    material.uniforms.uScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
