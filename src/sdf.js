// Signed-distance-field modelling. A creature recipe (list of primitive
// parts) is fused into ONE smooth organic surface with smooth-min blending,
// then meshed with naive surface nets. Normals and ambient occlusion come
// straight from the field, and every vertex gets bone weights so the walk /
// wag / flap animations deform the mesh smoothly instead of hinging rigid
// pieces. Runs inside a Web Worker (see mesh-worker.js).
import { DEG } from './mat.js';

const PATTERNS = { none: 0, blobs: 1, bands: 2, spots: 3, stripes: 4, fiery: 5, clouds: 6, mottle: 7 };
const SKINS = { smooth: 0, scales: 1, fur: 2, rough: 3 };

export function hexToLin(hex) {
  const h = (hex || '#888888').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const lin = (c) => Math.pow(c / 255, 2.2);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

function rotFromEuler([rx, ry, rz]) {
  // Z * Y * X, matching mat.js fromEulerDeg; returns row-major 3x3
  const cx = Math.cos(rx * DEG), sx = Math.sin(rx * DEG);
  const cy = Math.cos(ry * DEG), sy = Math.sin(ry * DEG);
  const cz = Math.cos(rz * DEG), sz = Math.sin(rz * DEG);
  // R = Rz * Ry * Rx
  return [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
}

/** Precompute everything the field needs for one part. */
const scaleUp = (sc, f) => (typeof sc === 'number' ? sc * f : sc.map((v) => v * f));
const darken = (hex, f = 0.55) => '#' + hexToLin(hex).map((c) => Math.round(Math.pow(c * f, 1 / 2.2) * 255).toString(16).padStart(2, '0')).join('');

export function compilePart(p, defaults = {}) {
  const s = typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale;
  const patternName = p.pattern || defaults.pattern || 'none';
  return {
    shape: p.shape,
    reach: Math.max(...s) * (p.shape === 'torus' ? 1.3 : 1) + 0.05,
    t: p.pos,
    R: rotFromEuler(p.rot || [0, 0, 0]),
    s,
    minS: Math.min(...s),
    blend: p.blend ?? defaults.blend ?? 0.16,
    color: hexToLin(p.color),
    color2: hexToLin(p.color2 || (patternName === 'mottle' ? darken(p.color) : p.color)),
    pattern: PATTERNS[patternName] ?? 0,
    patternScale: p.patternScale ?? defaults.patternScale ?? 3,
    rough: p.rough ?? defaults.rough ?? 0.6,
    skin: SKINS[p.skin || defaults.skin || 'smooth'] ?? 0,
    sss: p.sss ?? defaults.sss ?? 0.35,
    colorWeight: p.colorWeight ?? 1,
    bone: 0,
  };
}

const tmp = [0, 0, 0];

/** Distance from world point to a compiled part. */
export function partDistance(c, x, y, z) {
  const dx = x - c.t[0], dy = y - c.t[1], dz = z - c.t[2];
  const R = c.R;
  // local = R^T * d
  const lx = R[0] * dx + R[3] * dy + R[6] * dz;
  const ly = R[1] * dx + R[4] * dy + R[7] * dz;
  const lz = R[2] * dx + R[5] * dy + R[8] * dz;
  const [sx, sy, sz] = c.s;
  switch (c.shape) {
    case 'sphere': {
      // Quilez ellipsoid bound: accurate enough for blending and sign-exact.
      const px = lx / sx, py = ly / sy, pz = lz / sz;
      const k0 = Math.sqrt(px * px + py * py + pz * pz);
      const qx = px / sx, qy = py / sy, qz = pz / sz;
      const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-6;
      return (k0 * (k0 - 1)) / k1;
    }
    case 'box': {
      const r = 0.06;
      const qx = Math.abs(lx / sx) - 0.5 + r, qy = Math.abs(ly / sy) - 0.5 + r, qz = Math.abs(lz / sz) - 0.5 + r;
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
      return (Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r) * c.minS;
    }
    case 'cylinder': {
      const px = lx / sx, py = ly / sy, pz = lz / sz;
      const r = 0.08;
      const dxr = Math.sqrt(px * px + pz * pz) - 1 + r, dyr = Math.abs(py) - 0.5 + r;
      const ox = Math.max(dxr, 0), oy = Math.max(dyr, 0);
      return (Math.min(Math.max(dxr, dyr), 0) + Math.sqrt(ox * ox + oy * oy) - r) * c.minS;
    }
    case 'cone': {
      // capped cone: radius 1 at y=-0.5, radius 0.02 at y=0.5
      const px = lx / sx, py = ly / sy, pz = lz / sz;
      const h = 0.5, r1 = 1.0, r2 = 0.02;
      const qx = Math.sqrt(px * px + pz * pz), qy = py;
      const k1x = r2, k1y = h, k2x = r2 - r1, k2y = 2 * h;
      const cax = qx - Math.min(qx, qy < 0 ? r1 : r2), cay = Math.abs(qy) - h;
      const tt = Math.max(0, Math.min(1, ((k1x - qx) * k2x + (k1y - qy) * k2y) / (k2x * k2x + k2y * k2y)));
      const cbx = qx - k1x + k2x * tt, cby = qy - k1y + k2y * tt;
      const sgn = cbx < 0 && cay < 0 ? -1 : 1;
      return sgn * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby)) * c.minS;
    }
    case 'torus': {
      const px = lx / sx, py = ly / sy, pz = lz / sz;
      const q = Math.sqrt(px * px + pz * pz) - 1;
      return (Math.sqrt(q * q + py * py) - 0.25) * c.minS;
    }
    default:
      return 1e9;
  }
}

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export class Field {
  /**
   * parts:   organic primitives, smooth-unioned
   * cutters: rigid parts (eyeballs) that carve sockets out of the surface
   */
  constructor(parts, defaults = {}, cutters = []) {
    this.parts = parts.map((p) => compilePart(p, defaults));
    this.cutters = cutters.map((p) => compilePart({ ...p, scale: scaleUp(p.scale, 1.12) }, defaults));
    this.n = this.parts.length;
    this.dist = new Float32Array(this.n);
  }
  carve(d, x, y, z) {
    for (const c of this.cutters) d = Math.max(d, -partDistance(c, x, y, z));
    return d;
  }
  /** Fill this.dist with every part distance; return the blended distance. */
  evalAll(x, y, z) {
    const P = this.parts, D = this.dist;
    let d = 1e9;
    for (let i = 0; i < P.length; i++) {
      const di = partDistance(P[i], x, y, z);
      D[i] = di;
      d = smin(d, di, P[i].blend);
    }
    return this.carve(d, x, y, z);
  }
  eval(x, y, z) {
    // Same as evalAll without storing per-part distances. A part whose
    // bounding sphere is far from the point cannot influence the blend, so
    // skip the exact distance (big win: most parts are far from most samples).
    const P = this.parts;
    let d = 1e9;
    for (let i = 0; i < P.length; i++) {
      const c = P[i];
      const dx = x - c.t[0], dy = y - c.t[1], dz = z - c.t[2];
      const lower = Math.sqrt(dx * dx + dy * dy + dz * dz) - c.reach;
      if (lower > d + c.blend) continue;
      d = smin(d, partDistance(c, x, y, z), c.blend);
    }
    return this.cutters.length ? this.carve(d, x, y, z) : d;
  }
  bounds(pad) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const c of this.parts) {
      const r = Math.max(...c.s) * (c.shape === 'torus' ? 1.3 : 1) + pad;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], c.t[i] - r);
        max[i] = Math.max(max[i], c.t[i] + r);
      }
    }
    return { min, max };
  }
}

/**
 * Mesh the zero level-set with naive surface nets.
 * bones: array index per part (0 = static).
 */
export function meshField(field, { resolution = 80, maxSamples = 1_400_000, bones } = {}) {
  const { min, max } = field.bounds(0.35);
  const ext = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  let h = Math.max(...ext) / resolution;
  // keep total sample count bounded on huge models
  while (((ext[0] / h + 2) * (ext[1] / h + 2) * (ext[2] / h + 2)) > maxSamples) h *= 1.08;
  const nx = Math.ceil(ext[0] / h) + 1, ny = Math.ceil(ext[1] / h) + 1, nz = Math.ceil(ext[2] / h) + 1;
  const sx = nx + 1, sy = ny + 1, sz = nz + 1;
  const F = new Float32Array(sx * sy * sz);
  const idx = (i, j, k) => (i * sy + j) * sz + k;
  for (let i = 0; i < sx; i++) {
    const x = min[0] + i * h;
    for (let j = 0; j < sy; j++) {
      const y = min[1] + j * h;
      for (let k = 0; k < sz; k++) {
        F[idx(i, j, k)] = field.eval(x, y, min[2] + k * h);
      }
    }
  }

  // --- vertices: one per cell crossed by the surface
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const cidx = (i, j, k) => (i * ny + j) * nz + k;
  const positions = [];
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], // x edges
    [0, 2], [1, 3], [4, 6], [5, 7], // y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // z edges
  ];
  const corner = new Float32Array(8);
  const cpos = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const v = F[idx(i + cpos[c][0], j + cpos[c][1], k + cpos[c][2])];
      corner[c] = v;
      if (v < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, cnt = 0;
    for (const [a, b] of EDGES) {
      const va = corner[a], vb = corner[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      px += cpos[a][0] + (cpos[b][0] - cpos[a][0]) * t;
      py += cpos[a][1] + (cpos[b][1] - cpos[a][1]) * t;
      pz += cpos[a][2] + (cpos[b][2] - cpos[a][2]) * t;
      cnt++;
    }
    cellVert[cidx(i, j, k)] = positions.length / 3;
    positions.push(min[0] + (i + px / cnt) * h, min[1] + (j + py / cnt) * h, min[2] + (k + pz / cnt) * h);
  }

  // --- faces: one quad per sign-changing grid edge
  const indices = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, b, c, a, c, d); else indices.push(a, c, b, a, d, c);
  };
  for (let i = 0; i < sx; i++) for (let j = 0; j < sy; j++) for (let k = 0; k < sz; k++) {
    const v0 = F[idx(i, j, k)];
    // x edge
    if (i < nx && j > 0 && k > 0 && j < ny && k < nz) {
      const v1 = F[idx(i + 1, j, k)];
      if ((v0 < 0) !== (v1 < 0)) {
        quad(cellVert[cidx(i, j - 1, k - 1)], cellVert[cidx(i, j, k - 1)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j - 1, k)], v0 < 0);
      }
    }
    // y edge
    if (j < ny && i > 0 && k > 0 && i < nx && k < nz) {
      const v1 = F[idx(i, j + 1, k)];
      if ((v0 < 0) !== (v1 < 0)) {
        quad(cellVert[cidx(i - 1, j, k - 1)], cellVert[cidx(i - 1, j, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j, k - 1)], v0 < 0);
      }
    }
    // z edge
    if (k < nz && i > 0 && j > 0 && i < nx && j < ny) {
      const v1 = F[idx(i, j, k + 1)];
      if ((v0 < 0) !== (v1 < 0)) {
        quad(cellVert[cidx(i - 1, j - 1, k)], cellVert[cidx(i, j - 1, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i - 1, j, k)], v0 < 0);
      }
    }
  }

  // --- per-vertex attributes from the field
  const nv = positions.length / 3;
  const pos = new Float32Array(positions);
  const normals = new Float32Array(nv * 3);
  const colors = new Float32Array(nv * 3);
  const colors2 = new Float32Array(nv * 3);
  const params = new Float32Array(nv * 4);   // pattern, patternScale, rough, skin
  const extra = new Float32Array(nv * 4);    // ao, sss, 0, 0
  const boneIdx = new Float32Array(nv * 4);
  const boneWt = new Float32Array(nv * 4);
  const eps = h * 0.6;
  const nParts = field.n, D = field.dist, P = field.parts;
  const boneCount = bones ? Math.max(...bones) + 1 : 1;
  const bw = new Float32Array(boneCount);
  for (let v = 0; v < nv; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    // one Newton step onto the exact surface
    let d0 = field.eval(x, y, z);
    let gx = field.eval(x + eps, y, z) - field.eval(x - eps, y, z);
    let gy = field.eval(x, y + eps, z) - field.eval(x, y - eps, z);
    let gz = field.eval(x, y, z + eps) - field.eval(x, y, z - eps);
    let gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl; gy /= gl; gz /= gl;
    x -= gx * d0; y -= gy * d0; z -= gz * d0;
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    normals[v * 3] = gx; normals[v * 3 + 1] = gy; normals[v * 3 + 2] = gz;

    // ambient occlusion by probing the field along the normal
    let ao = 0;
    for (let s = 1; s <= 5; s++) {
      const t = s * h * 1.6;
      ao += (t - field.eval(x + gx * t, y + gy * t, z + gz * t)) / Math.pow(2, s - 1);
    }
    ao = Math.max(0, Math.min(1, 1 - ao * 0.9));

    // material + bones blended from the nearest parts
    field.evalAll(x, y, z);
    let wsum = 0, cr = 0, cg = 0, cb = 0, c2r = 0, c2g = 0, c2b = 0, rough = 0, sss = 0, pscale = 0;
    let bestW = -1, pattern = 0, skin = 0;
    bw.fill(0);
    for (let i = 0; i < nParts; i++) {
      const di = Math.max(D[i], 0);
      const w = Math.exp(-di / 0.09) * P[i].colorWeight;
      wsum += w;
      cr += P[i].color[0] * w; cg += P[i].color[1] * w; cb += P[i].color[2] * w;
      c2r += P[i].color2[0] * w; c2g += P[i].color2[1] * w; c2b += P[i].color2[2] * w;
      rough += P[i].rough * w; sss += P[i].sss * w; pscale += P[i].patternScale * w;
      if (w > bestW) { bestW = w; pattern = P[i].pattern; skin = P[i].skin; }
      if (bones) bw[bones[i]] += Math.exp(-di / 0.14);
    }
    wsum = wsum || 1;
    colors[v * 3] = cr / wsum; colors[v * 3 + 1] = cg / wsum; colors[v * 3 + 2] = cb / wsum;
    colors2[v * 3] = c2r / wsum; colors2[v * 3 + 1] = c2g / wsum; colors2[v * 3 + 2] = c2b / wsum;
    params[v * 4] = pattern; params[v * 4 + 1] = pscale / wsum; params[v * 4 + 2] = rough / wsum; params[v * 4 + 3] = skin;
    extra[v * 4] = ao; extra[v * 4 + 1] = sss / wsum;
    // top-4 bone weights
    const order = [];
    for (let b = 0; b < boneCount; b++) if (bw[b] > 0) order.push(b);
    order.sort((a, b) => bw[b] - bw[a]);
    let tw = 0;
    for (let q = 0; q < 4; q++) {
      const b = order[q];
      boneIdx[v * 4 + q] = b ?? 0;
      boneWt[v * 4 + q] = b === undefined ? 0 : bw[b];
      tw += boneWt[v * 4 + q];
    }
    if (tw > 0) for (let q = 0; q < 4; q++) boneWt[v * 4 + q] /= tw; else boneWt[v * 4] = 1;
  }

  const index = nv > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  return { positions: pos, normals, colors, colors2, params, extra, boneIdx, boneWt, indices: index, cell: h, bounds: { min, max } };
}
