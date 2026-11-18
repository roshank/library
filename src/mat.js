// Minimal column-major 4x4 / 3x3 matrix math (Float32Array), tuned for WebGL.

export const DEG = Math.PI / 180;

export function identity(out = new Float32Array(16)) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function multiply(out, a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  out.set(o);
  return out;
}

export function translation(v, out = identity()) {
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  return out;
}

export function scaling(v, out = identity()) {
  out[0] = v[0];
  out[5] = v[1];
  out[10] = v[2];
  return out;
}

/** Rotation about an arbitrary axis (radians). */
export function rotation(axis, angle, out = identity()) {
  let [x, y, z] = axis;
  const len = Math.hypot(x, y, z) || 1;
  x /= len; y /= len; z /= len;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  out[0] = t * x * x + c;     out[1] = t * x * y + s * z; out[2] = t * x * z - s * y;  out[3] = 0;
  out[4] = t * x * y - s * z; out[5] = t * y * y + c;     out[6] = t * y * z + s * x;  out[7] = 0;
  out[8] = t * x * z + s * y; out[9] = t * y * z - s * x; out[10] = t * z * z + c;     out[11] = 0;
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
  return out;
}

/** Euler rotation from degrees, applied as Z * Y * X. */
export function fromEulerDeg([rx, ry, rz]) {
  const m = identity();
  if (rz) multiply(m, m, rotation([0, 0, 1], rz * DEG));
  if (ry) multiply(m, m, rotation([0, 1, 0], ry * DEG));
  if (rx) multiply(m, m, rotation([1, 0, 0], rx * DEG));
  return m;
}

export function perspective(fovy, aspect, near, far, out = new Float32Array(16)) {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function lookAt(eye, target, up, out = new Float32Array(16)) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

/** Normal matrix = transpose(inverse(upper-left 3x3 of m)). */
export function normalMatrix(m, out = new Float32Array(9)) {
  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[4], a11 = m[5], a12 = m[6];
  const a20 = m[8], a21 = m[9], a22 = m[10];
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) return identity3(out);
  det = 1 / det;
  // inverse, then transpose (written directly)
  out[0] = b01 * det;
  out[3] = (-a22 * a01 + a02 * a21) * det;
  out[6] = (a12 * a01 - a02 * a11) * det;
  out[1] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[7] = (-a12 * a00 + a02 * a10) * det;
  out[2] = b21 * det;
  out[5] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}

function identity3(out) {
  out.fill(0);
  out[0] = out[4] = out[8] = 1;
  return out;
}

export function transformPoint(m, [x, y, z]) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}
