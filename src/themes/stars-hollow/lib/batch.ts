/**
 * Static batching for Stars Hollow's buildings.
 *
 * A shopfront is modelled as dozens of small painted pieces — pilasters,
 * sills, frames, rails — because that is what makes it read as joinery.
 * Drawn one by one, the town cost over a thousand draw calls a frame,
 * three times the Haunted Hollow's. But almost none of those pieces
 * ever move, and most share a paint colour with their neighbours.
 *
 * So once a building has mounted, `batchStatic` welds every mesh under
 * it that shares a material into one geometry, adds that in its place,
 * and hides the originals. React still owns the originals — they stay
 * mounted and are disposed as usual — so this is purely a drawing
 * optimisation and is undone by calling the returned `dispose`.
 *
 * Needs no renderer, so it is tested directly.
 */

import * as THREE from "three";

/** Set on an object's userData to keep it (and its children) out of a batch. */
export const NO_BATCH = "noBatch";

/**
 * Meshes can share one draw only if everything about how they are drawn
 * matches: the material's type and every setting that changes its
 * look, the texture and how it repeats, and how the mesh takes part in
 * shadows.
 */
export function batchKey(mesh: THREE.Mesh): string | null {
  const m = mesh.material;
  if (Array.isArray(m)) return null;
  const mat = m as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    map?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
    gradientMap?: THREE.Texture | null;
    roughness?: number;
    metalness?: number;
  };
  const tex = (t?: THREE.Texture | null) =>
    t ? `${t.source.uuid}:${t.repeat.x},${t.repeat.y}:${t.offset.x},${t.offset.y}` : "-";
  return [
    mat.type,
    mat.color?.getHexString() ?? "-",
    mat.emissive?.getHexString() ?? "-",
    mat.emissiveIntensity ?? "-",
    tex(mat.map),
    tex(mat.emissiveMap),
    mat.gradientMap?.uuid ?? "-",
    mat.roughness ?? "-",
    mat.metalness ?? "-",
    mat.side,
    mat.transparent,
    mat.alphaTest,
    mat.toneMapped,
    mesh.castShadow,
    mesh.receiveShadow,
  ].join("|");
}

/** Append one geometry, transformed, to the running arrays. */
function append(
  g: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  out: { position: number[]; normal: number[]; uv: number[]; index: number[] }
) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  const offset = out.position.length / 3;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    out.position.push(v.x, v.y, v.z);
    if (nor) {
      v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      out.normal.push(v.x, v.y, v.z);
    } else {
      out.normal.push(0, 1, 0);
    }
    if (uv) out.uv.push(uv.getX(i), uv.getY(i));
    else out.uv.push(0, 0);
  }
  const index = g.getIndex();
  // A transform that mirrors turns every triangle inside out; swap the
  // winding back so it still faces the way it did.
  const flip = matrix.determinant() < 0;
  const tri = (a: number, b: number, c: number) =>
    flip ? out.index.push(a + offset, c + offset, b + offset) : out.index.push(a + offset, b + offset, c + offset);
  if (index) {
    for (let i = 0; i < index.count; i += 3) tri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  } else {
    for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  }
}

function visibleUnder(o: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) {
    if (!p.visible || p.userData[NO_BATCH]) return false;
  }
  return true;
}

export interface Batch {
  /** The welded meshes, one per material. */
  meshes: THREE.Mesh[];
  /** How many original meshes were hidden in favour of them. */
  hidden: number;
  /** Remove the welded meshes, free them, and show the originals again. */
  dispose(): void;
}

/**
 * Weld every static mesh under `root` that shares a material with
 * another into one mesh per material. Instanced meshes, multi-material
 * meshes and anything marked `NO_BATCH` are left alone, as are
 * materials only one mesh uses — there is nothing to save there.
 */
export function batchStatic(root: THREE.Object3D): Batch {
  root.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    if (!visibleUnder(mesh, root)) return;
    const key = batchKey(mesh);
    if (!key) return;
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  });

  const meshes: THREE.Mesh[] = [];
  const hiddenMeshes: THREE.Mesh[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const out = { position: [] as number[], normal: [] as number[], uv: [] as number[], index: [] as number[] };
    const m = new THREE.Matrix4();
    for (const mesh of list) {
      m.multiplyMatrices(toRoot, mesh.matrixWorld);
      append(mesh.geometry, m, out);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(out.position, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(out.normal, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(out.uv, 2));
    geo.setIndex(out.index);
    geo.computeBoundingSphere();
    const first = list[0];
    const merged = new THREE.Mesh(geo, first.material);
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.name = "batch";
    root.add(merged);
    meshes.push(merged);
    for (const mesh of list) {
      mesh.visible = false;
      hiddenMeshes.push(mesh);
    }
  }

  return {
    meshes,
    hidden: hiddenMeshes.length,
    dispose() {
      for (const mesh of meshes) {
        root.remove(mesh);
        mesh.geometry.dispose();
      }
      for (const mesh of hiddenMeshes) mesh.visible = true;
    },
  };
}
