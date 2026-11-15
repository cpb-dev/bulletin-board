"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OutdoorLook } from "../../lib/outdoor";

/** The dome's radius: inside the camera's far plane (120) from anywhere in the room. */
const RADIUS = 100;

/**
 * The sky outside the window (BB-35): a dome with its own shader. A
 * gradient from horizon to zenith; a low winter sun with a soft glow, or
 * a moon with a halo; stars that twinkle once it's dark; and soft clouds
 * drifting slowly across, lit by the sun or moon. Everything is worked
 * out from the view direction, so the horizon sits at eye level wherever
 * you look from.
 */
export function Sky({ look }: { look: OutdoorLook }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uLightDir: { value: new THREE.Vector3() },
          uLightColor: { value: new THREE.Color() },
          uSun: { value: 0 },
          uMoon: { value: 0 },
          uStars: { value: 0 },
          uClouds: { value: new THREE.Color() },
          uCover: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uLightDir;
          uniform vec3 uLightColor;
          uniform float uSun;
          uniform float uMoon;
          uniform float uStars;
          uniform vec3 uClouds;
          uniform float uCover;
          uniform float uTime;
          varying vec3 vWorld;

          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }
          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int k = 0; k < 5; k++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
            return v;
          }

          void main() {
            vec3 dir = normalize(vWorld - cameraPosition);
            float up = dir.y;
            // Gradient: horizon colour hugs the skyline, the zenith above.
            vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, up));

            // The sun (low and pale by day, big and golden at evening) or the moon.
            float c = dot(dir, normalize(uLightDir));
            col += uLightColor * uSun * (smoothstep(0.9993, 0.9997, c) * 2.5 + pow(max(c, 0.0), 60.0) * 0.6 + pow(max(c, 0.0), 6.0) * 0.18);
            float moon = smoothstep(0.99955, 0.9998, c);
            col = mix(col, vec3(0.92, 0.94, 1.0), moon * uMoon);
            col += vec3(0.55, 0.62, 0.85) * uMoon * pow(max(c, 0.0), 120.0) * 0.6;

            // Stars: a sparse field on a grid of directions, twinkling.
            if (uStars > 0.0 && up > 0.0) {
              vec2 g = vec2(atan(dir.x, dir.z) * 160.0, asin(clamp(up, -1.0, 1.0)) * 160.0);
              vec2 cell = floor(g);
              float h = hash(cell);
              if (h > 0.985) {
                vec2 off = vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5;
                float d = length(fract(g) - 0.5 - off * 0.6);
                float tw = 0.6 + 0.4 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
                col += vec3(1.0, 0.97, 0.9) * uStars * smoothstep(0.18, 0.0, d) * tw * smoothstep(0.0, 0.15, up);
              }
            }

            // Clouds, drifting: noise on a high plane above, seen in perspective.
            if (up > 0.0) {
              vec2 plane = dir.xz / (up + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
              float n = fbm(plane);
              float cloud = smoothstep(1.0 - uCover, 1.0 - uCover + 0.35, n) * smoothstep(0.0, 0.18, up);
              // Lit edge towards the sun or moon, softer underneath.
              vec3 cc = uClouds * (0.75 + 0.35 * pow(max(c, 0.0), 4.0));
              col = mix(col, cc, cloud * 0.85);
            }
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const u = material.uniforms;
    u.uTop.value.set(look.skyTop);
    u.uHorizon.value.set(look.skyHorizon);
    u.uLightDir.value.set(...look.lightDir);
    u.uLightColor.value.set(look.lightColor).multiplyScalar(look.lightIntensity);
    u.uSun.value = look.sunDisc;
    u.uMoon.value = look.moonDisc;
    u.uStars.value = look.stars;
    u.uClouds.value.set(look.clouds);
    u.uCover.value = look.cloudCover;
  }, [look, material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[RADIUS, 48, 24]} />
    </mesh>
  );
}
