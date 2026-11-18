// Turns a concept recipe into renderer input: organic parts are fused into a
// smooth mesh by the worker, rigid parts (eyes, teeth, machinery) stay as
// primitives, and shared animation lists become bones.

const worker = new Worker(new URL('./mesh-worker.js', import.meta.url), { type: 'module' });
const pending = new Map();
let reqId = 0;
worker.onmessage = (e) => {
  const cb = pending.get(e.data.id);
  pending.delete(e.data.id);
  cb?.(e.data);
};
worker.onerror = (e) => console.error('mesh worker failed:', e.message);

const cache = new Map();
const MAX_CACHE = 10;
const cores = navigator.hardwareConcurrency || 4;
export const RESOLUTION = cores >= 8 ? 104 : cores >= 4 ? 88 : 72;

const isRigid = (p) => p.hard || (p.alpha ?? 1) < 1 || p.emissive || p.fit === false;

export function bounds(parts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    if (p.fit === false) continue;
    const s = typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale;
    const r = Math.max(...s) * (p.shape === 'torus' ? 1.3 : 1);
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p.pos[i] - r); max[i] = Math.max(max[i], p.pos[i] + r); }
  }
  if (!Number.isFinite(min[0])) return { min: [-1, 0, -1], max: [1, 2, 1] };
  return { min, max };
}

function isOrganic(concept) {
  if (concept.mesh) return concept.mesh === 'organic';
  return ['Dinosaurs', 'Animals', 'Mystery'].includes(concept.category);
}

/**
 * Resolve to { mesh, parts, bones, bounds, scene } for Renderer.setModel.
 * `onEnvironment` fires immediately with a mesh-less model so the sky and
 * ground can switch while the worker sculpts.
 */
export async function buildModel(concept, onEnvironment) {
  const parts = concept.build();
  const box = bounds(parts);
  const scene = concept.scene;
  if (!isOrganic(concept)) {
    const model = { mesh: null, parts, bones: [[]], bounds: box, scene };
    return model;
  }
  const soft = [], rigid = [];
  for (const p of parts) (isRigid(p) ? rigid : soft).push(p);
  // bones: every distinct animation list is one bone; 0 = static
  const boneOf = new Map([[null, 0]]);
  const bones = [[]];
  const boneIndex = (anim) => {
    const key = anim && anim.length ? anim : null;
    if (!boneOf.has(key)) { boneOf.set(key, bones.length); bones.push(key); }
    return boneOf.get(key);
  };
  const softBones = soft.map((p) => boneIndex(p.anim));
  onEnvironment?.({ mesh: null, parts: rigid, bones: [[]], bounds: box, scene });

  const key = `${concept.id}@${RESOLUTION}`;
  let mesh = cache.get(key);
  if (!mesh) {
    const id = ++reqId;
    const result = await new Promise((resolve) => {
      pending.set(id, resolve);
      const cutters = rigid.filter((p) => p.socket);
      worker.postMessage({ id, parts: soft, bones: softBones, defaults: concept.material || {}, resolution: RESOLUTION, cutters });
    });
    mesh = result.mesh;
    cache.set(key, mesh);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  }
  return { mesh, parts: rigid, bones, bounds: box, scene };
}
