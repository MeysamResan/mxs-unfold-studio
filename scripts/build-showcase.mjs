import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

// Offline visual asset adaptation. Source model and license are recorded in docs/ASSETS.md.
const source = process.argv[2] ?? '.cache/asset-sources/lightning/lightning.glb';
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await MeshoptEncoder.ready;
const document = await io.read(source);
const root = document.getRoot();
const original = root.listNodes().find((node) => node.getMesh());
if (!original) throw new Error('Source has no mesh.');
const primitive = original.getMesh().listPrimitives()[0];
const positions = primitive.getAttribute('POSITION');
const joints = primitive.getAttribute('JOINTS_0');
const weights = primitive.getAttribute('WEIGHTS_0');
const indices = primitive.getIndices().getArray();
const buckets = new Map(
  ['stock', 'body', 'barrel', 'fore-end', 'details', 'guard'].map((name) => [name, []]),
);
const vertex = [0, 0, 0];
const joint = [0, 0, 0, 0];
const weight = [0, 0, 0, 0];
for (let offset = 0; offset < indices.length; offset += 3) {
  let depth = 0;
  const votes = new Map();
  for (let corner = 0; corner < 3; corner++) {
    const index = indices[offset + corner];
    positions.getElement(index, vertex);
    joints.getElement(index, joint);
    weights.getElement(index, weight);
    depth += vertex[2] / 3;
    for (let component = 0; component < 4; component++) {
      votes.set(joint[component], (votes.get(joint[component]) ?? 0) + weight[component]);
    }
  }
  const bone = [...votes].sort((a, b) => b[1] - a[1])[0][0];
  // Broad presentation groups, not engineering components or assembly instructions.
  const group =
    bone === 1
      ? 'fore-end'
      : bone === 4
        ? 'guard'
        : bone !== 0
          ? 'details'
          : depth < -0.08
            ? 'stock'
            : depth > 0.07
              ? 'barrel'
              : 'body';
  buckets.get(group).push(indices[offset], indices[offset + 1], indices[offset + 2]);
}

original.setName('animated-model');
const parent = original.getParentNode();
for (const [name, values] of buckets) {
  if (!values.length) continue;
  const part = document.createPrimitive().setMaterial(primitive.getMaterial());
  for (const semantic of primitive.listSemantics()) {
    if (!semantic.startsWith('JOINTS_') && !semantic.startsWith('WEIGHTS_')) {
      part.setAttribute(semantic, primitive.getAttribute(semantic));
    }
  }
  part.setIndices(
    document
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint16Array(values))
      .setBuffer(root.listBuffers()[0]),
  );
  const node = document
    .createNode(`part-${name}`)
    .setMesh(document.createMesh(name).addPrimitive(part));
  if (parent) parent.addChild(node);
  else root.listScenes()[0].addChild(node);
}

// Only the source artist's motion demonstration is retained.
for (const animation of root.listAnimations()) {
  if (animation.getName() !== 'Pump') animation.dispose();
}
await document.transform(
  dedup(),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
const output = await io.writeBinary(document);
const hash = createHash('sha256').update(output).digest('hex').slice(0, 12);
const filename = `lightning-${hash}.glb`;
await mkdir('public/media/models', { recursive: true });
await mkdir('src/content', { recursive: true });
await writeFile(`public/media/models/${filename}`, output);
await writeFile(
  'src/content/asset-manifest.json',
  JSON.stringify(
    {
      lightning: {
        path: `/media/models/${filename}`,
        bytes: output.length,
        sourceBytes: (await readFile(source)).length,
        groups: [...buckets].filter(([, values]) => values.length).map(([name]) => name),
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    {
      filename,
      bytes: output.length,
      groups: [...buckets].map(([name, values]) => ({ name, triangles: values.length / 3 })),
    },
    null,
    2,
  ),
);
