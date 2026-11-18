// Procedural unit geometry. Every shape fits in roughly a unit cube centred at
// the origin so parts can be positioned purely through scale/rotate/translate.

function build(positions, normals, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function sphere(lat = 20, lon = 28) {
  const p = [], n = [], idx = [];
  for (let i = 0; i <= lat; i++) {
    const theta = (i / lat) * Math.PI;
    const st = Math.sin(theta), ct = Math.cos(theta);
    for (let j = 0; j <= lon; j++) {
      const phi = (j / lon) * Math.PI * 2;
      const x = st * Math.cos(phi), y = ct, z = st * Math.sin(phi);
      p.push(x, y, z);
      n.push(x, y, z);
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return build(p, n, idx);
}

export function box() {
  const faces = [
    [[0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    [[0, 0, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
    [[0, 1, 0], [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
    [[0, -1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
    [[1, 0, 0], [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
    [[-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
  ];
  const p = [], n = [], idx = [];
  faces.forEach(([nm, ...verts], f) => {
    verts.forEach((v) => {
      p.push(v[0] * 0.5, v[1] * 0.5, v[2] * 0.5);
      n.push(...nm);
    });
    const o = f * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return build(p, n, idx);
}

export function cylinder(seg = 28) {
  const p = [], n = [], idx = [];
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    p.push(x, 0.5, z, x, -0.5, z);
    n.push(x, 0, z, x, 0, z);
  }
  for (let j = 0; j < seg; j++) {
    const a = j * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  for (const [y, ny] of [[0.5, 1], [-0.5, -1]]) {
    const c = p.length / 3;
    p.push(0, y, 0); n.push(0, ny, 0);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      p.push(Math.cos(a), y, Math.sin(a)); n.push(0, ny, 0);
    }
    for (let j = 0; j < seg; j++) {
      if (ny > 0) idx.push(c, c + 2 + j, c + 1 + j); else idx.push(c, c + 1 + j, c + 2 + j);
    }
  }
  return build(p, n, idx);
}

export function cone(seg = 28) {
  const p = [], n = [], idx = [];
  const k = Math.SQRT1_2;
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    p.push(0, 0.5, 0, x, -0.5, z);
    n.push(x * k, k, z * k, x * k, k, z * k);
  }
  for (let j = 0; j < seg; j++) {
    const a = j * 2;
    idx.push(a, a + 3, a + 1);
  }
  const c = p.length / 3;
  p.push(0, -0.5, 0); n.push(0, -1, 0);
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2;
    p.push(Math.cos(a), -0.5, Math.sin(a)); n.push(0, -1, 0);
  }
  for (let j = 0; j < seg; j++) idx.push(c, c + 1 + j, c + 2 + j);
  return build(p, n, idx);
}

export function torus(R = 1, r = 0.25, seg = 36, tube = 14) {
  const p = [], n = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= tube; j++) {
      const v = (j / tube) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      p.push((R + r * cv) * cu, r * sv, (R + r * cv) * su);
      n.push(cv * cu, sv, cv * su);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < tube; j++) {
      const a = i * (tube + 1) + j, b = a + tube + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return build(p, n, idx);
}

/** Flat disc in the XZ plane, radius 1, facing +Y. */
export function disc(seg = 48) {
  const p = [0, 0, 0], n = [0, 1, 0], idx = [];
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2;
    p.push(Math.cos(a), 0, Math.sin(a)); n.push(0, 1, 0);
  }
  for (let j = 0; j < seg; j++) idx.push(0, 2 + j, 1 + j);
  return build(p, n, idx);
}

/** Full-screen quad in clip space (positions only). */
export function screenQuad() {
  return build([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 1, 2, 0, 2, 3]);
}

export const SHAPES = { sphere, box, cylinder, cone, torus, disc };
