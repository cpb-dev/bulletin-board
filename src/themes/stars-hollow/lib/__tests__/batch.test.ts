import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { batchKey, batchStatic, NO_BATCH } from "../batch";

function box(color: string, x: number, opts: { cast?: boolean } = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshToonMaterial({ color })
  );
  m.position.x = x;
  m.castShadow = opts.cast ?? false;
  return m;
}

describe("batchKey", () => {
  it("matches meshes painted the same, however their materials were made", () => {
    expect(batchKey(box("#ffffff", 0))).toBe(batchKey(box("#ffffff", 3)));
  });

  it("tells apart a different colour, texture repeat or shadow setting", () => {
    const base = batchKey(box("#ffffff", 0));
    expect(batchKey(box("#ff0000", 0))).not.toBe(base);
    expect(batchKey(box("#ffffff", 0, { cast: true }))).not.toBe(base);

    const tex = new THREE.Texture();
    const a = box("#ffffff", 0);
    (a.material as THREE.MeshToonMaterial).map = tex;
    const b = box("#ffffff", 0);
    const repeated = tex.clone();
    repeated.repeat.set(4, 1);
    (b.material as THREE.MeshToonMaterial).map = repeated;
    expect(batchKey(a)).not.toBe(batchKey(b));
  });

  it("won't batch a mesh with several materials", () => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(), [
      new THREE.MeshToonMaterial(),
      new THREE.MeshToonMaterial(),
    ]);
    expect(batchKey(m)).toBeNull();
  });
});

describe("batchStatic", () => {
  it("welds meshes that share a material into one and hides the originals", () => {
    const root = new THREE.Group();
    const a = box("#ffffff", -2);
    const b = box("#ffffff", 2);
    const c = box("#ff0000", 0);
    root.add(a, b, c);

    const batch = batchStatic(root);
    expect(batch.meshes).toHaveLength(1);
    expect(batch.hidden).toBe(2);
    expect(a.visible).toBe(false);
    expect(b.visible).toBe(false);
    // on its own in its colour: nothing to gain, so left as it was
    expect(c.visible).toBe(true);

    const merged = batch.meshes[0];
    expect(merged.parent).toBe(root);
    expect(merged.geometry.attributes.position.count).toBe(2 * 24);
    merged.geometry.computeBoundingBox();
    const bb = merged.geometry.boundingBox!;
    expect(bb.min.x).toBeCloseTo(-2.5);
    expect(bb.max.x).toBeCloseTo(2.5);
  });

  it("bakes in each mesh's place relative to the root, not the world", () => {
    const root = new THREE.Group();
    root.position.set(10, 0, 0);
    const inner = new THREE.Group();
    inner.rotation.y = Math.PI / 2;
    inner.add(box("#ffffff", 3));
    root.add(inner, box("#ffffff", 0));
    const [merged] = batchStatic(root).meshes;
    merged.geometry.computeBoundingBox();
    const bb = merged.geometry.boundingBox!;
    // the rotated box ends up 3 m along -z, still in the root's frame
    expect(bb.min.z).toBeCloseTo(-3.5);
    expect(bb.min.x).toBeCloseTo(-0.5);
    expect(bb.max.x).toBeCloseTo(0.5);
  });

  it("leaves instanced meshes, hidden meshes and marked groups alone", () => {
    const root = new THREE.Group();
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial(), 3);
    const hidden = box("#ffffff", 0);
    hidden.visible = false;
    const keep = new THREE.Group();
    keep.userData[NO_BATCH] = true;
    keep.add(box("#ffffff", 1), box("#ffffff", 2));
    root.add(inst, hidden, keep, box("#ffffff", 5));
    const batch = batchStatic(root);
    expect(batch.meshes).toHaveLength(0);
    expect(inst.visible).toBe(true);
  });

  it("undoes itself", () => {
    const root = new THREE.Group();
    const a = box("#ffffff", 0);
    const b = box("#ffffff", 1);
    root.add(a, b);
    const batch = batchStatic(root);
    batch.dispose();
    expect(root.children).toEqual([a, b]);
    expect(a.visible && b.visible).toBe(true);
  });
});
