import { LoadingManager, Mesh, Material, Texture, SkinnedMesh } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ResourcePool } from '../../core/assets/resource-pool';

function disposeModel(gltf: GLTF): void {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  gltf.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
    }
    if (object instanceof SkinnedMesh) object.skeleton.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close();
    texture.dispose();
  }
}

async function loadModel(url: string, signal: AbortSignal): Promise<GLTF> {
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetch(url, { signal: AbortSignal.any([signal, timeout]) });
  if (!response.ok) throw new Error(`The model could not be loaded (${response.status}).`);
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const manager = new LoadingManager();
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const model = await loader.parseAsync(bytes, new URL('.', new URL(url, location.href)).href);
  // Independent materials allow highlighting one visual group without affecting the rest.
  const originalMaterials = new Set<Material>();
  model.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const clone = (material: Material) => {
      originalMaterials.add(material);
      return material.clone();
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(clone)
      : clone(object.material);
  });
  for (const material of originalMaterials) material.dispose();
  return model;
}

export const modelAssets = new ResourcePool(loadModel, disposeModel);
