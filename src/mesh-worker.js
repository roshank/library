// Web Worker: fuses a creature recipe into one smooth mesh off the main thread.
import { Field, meshField } from './sdf.js';

self.onmessage = (e) => {
  const { id, parts, bones, defaults, resolution, cutters = [] } = e.data;
  const t0 = performance.now();
  const field = new Field(parts, defaults, cutters);
  const mesh = meshField(field, { resolution, bones });
  const buffers = [mesh.positions, mesh.normals, mesh.colors, mesh.colors2, mesh.params, mesh.extra, mesh.boneIdx, mesh.boneWt, mesh.indices];
  self.postMessage({ id, mesh, ms: Math.round(performance.now() - t0) }, buffers.map((b) => b.buffer));
};
