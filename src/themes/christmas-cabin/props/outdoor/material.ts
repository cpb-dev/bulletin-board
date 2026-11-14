import * as THREE from "three";
import type { OutdoorLook } from "../../lib/outdoor";

/**
 * The outdoors' own lighting (BB-35). Indoor lights reach everything in
 * the scene — the room's key light even shines towards the back wall —
 * so the outdoors can't use the standard materials without being warmed
 * by the fire. Instead it has one small shader, lit only by the outdoor
 * sun or moon and the sky: hemisphere ambient (sky above, snow-bounce
 * below), a single directional light, snow settling on upward faces, and
 * haze that thickens with distance. Every outdoor material shares the
 * same uniforms, so a change of look reaches them all at once.
 */

export interface OutdoorUniforms {
  [name: string]: THREE.IUniform;
  uLightDir: THREE.IUniform<THREE.Vector3>;
  uLightColor: THREE.IUniform<THREE.Color>;
  uSky: THREE.IUniform<THREE.Color>;
  uGround: THREE.IUniform<THREE.Color>;
  uHaze: THREE.IUniform<THREE.Color>;
  uSnow: THREE.IUniform<THREE.Color>;
  uTime: THREE.IUniform<number>;
}

export function makeOutdoorUniforms(): OutdoorUniforms {
  return {
    uLightDir: { value: new THREE.Vector3(0, 1, 0) },
    uLightColor: { value: new THREE.Color() },
    uSky: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uHaze: { value: new THREE.Color() },
    uSnow: { value: new THREE.Color() },
    uTime: { value: 0 },
  };
}

/** Set the shared uniforms from a phase's look. */
export function applyLook(u: OutdoorUniforms, look: OutdoorLook): void {
  u.uLightDir.value.set(...look.lightDir).normalize();
  u.uLightColor.value.set(look.lightColor).multiplyScalar(look.lightIntensity);
  u.uSky.value.set(look.ambientSky).multiplyScalar(0.62);
  u.uGround.value.set(look.ambientGround).multiplyScalar(0.36);
  u.uHaze.value.set(look.haze);
  u.uSnow.value.set(look.snow);
}

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vTint;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vTint = vec3(1.0);
    #ifdef USE_COLOR
      vTint *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vTint *= instanceColor;
    #endif
    vec4 wp = modelMatrix * p;
    vWorld = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uHaze;
  uniform vec3 uSnow;
  uniform float uSnowCap;
  uniform float uSparkle;
  uniform float uHazeNear;
  uniform float uHazeFar;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vTint;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 base = uColor * vTint;
    // Snow settles wherever a surface faces up.
    float cap = smoothstep(0.5, 0.8, n.y) * uSnowCap;
    base = mix(base, uSnow, cap);
    vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5);
    float diffuse = max(dot(n, uLightDir), 0.0);
    vec3 col = base * (ambient + uLightColor * diffuse);
    // Snow glitters: tiny facets catch the light, now and then.
    if (uSparkle > 0.0) {
      float g = hash(floor(vWorld * 22.0));
      float twinkle = step(0.985, g) * (0.5 + 0.5 * sin(uTime * 3.0 + g * 60.0));
      col += uLightColor * twinkle * uSparkle * diffuse;
    }
    float d = distance(vWorld, cameraPosition);
    col = mix(col, uHaze, smoothstep(uHazeNear, uHazeFar, d) * 0.62);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface OutdoorMaterialOptions {
  color?: string;
  /** How much snow settles on its upward faces, 0..1. */
  snowCap?: number;
  /** Glitter on the snow, 0..1. */
  sparkle?: number;
  /** Take colour from the geometry's vertex colours. */
  vertexColors?: boolean;
  /** Where haze starts and is thickest, in metres from the camera. */
  hazeNear?: number;
  hazeFar?: number;
}

export function makeOutdoorMaterial(shared: OutdoorUniforms, o: OutdoorMaterialOptions = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: new THREE.Color(o.color ?? "#ffffff") },
      uSnowCap: { value: o.snowCap ?? 0 },
      uSparkle: { value: o.sparkle ?? 0 },
      uHazeNear: { value: o.hazeNear ?? 25 },
      uHazeFar: { value: o.hazeFar ?? 120 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    vertexColors: o.vertexColors ?? false,
  });
}
