// Helpers that assemble kid-friendly 3D models out of primitives.
// Convention: models face +X, up is +Y, feet rest on y = 0.

export const part = (shape, pos, scale, color, extra = {}) => ({
  shape,
  pos,
  scale,
  color,
  rot: [0, 0, 0],
  ...extra,
});

export const sphere = (pos, scale, color, extra) => part('sphere', pos, scale, color, extra);
export const box = (pos, scale, color, extra) => part('box', pos, scale, color, extra);
export const cone = (pos, scale, color, extra) => part('cone', pos, scale, color, extra);
export const cyl = (pos, scale, color, extra) => part('cylinder', pos, scale, color, extra);
export const torus = (pos, scale, color, extra) => part('torus', pos, scale, color, extra);

export const bob = (amp = 0.04, speed = 2.4, phase = 0) => ({ type: 'bob', amp, speed, phase });
export const swing = (pivot, axis, amp, speed = 2.4, phase = 0) => ({ type: 'swing', pivot, axis, amp, speed, phase });
export const spin = (axis, speed, pivot) => ({ type: 'spin', axis, speed, pivot });

/** Two eyes looking along +X. */
export function eyes(at, spread, size = 0.14, opts = {}) {
  // Fused heads are rounder than the primitive stacks they come from, so set
  // the eyeballs a little back and down and they sit in sockets.
  const [x, y, z] = [at[0] - size * 0.2, at[1] - size * 0.1, at[2]];
  const anim = opts.anim || [];
  const white = opts.white || '#f2efe6', pupil = opts.pupil || '#141418';
  const out = [];
  for (const s of [-1, 1]) {
    out.push(sphere([x, y, z + s * spread], size, white, { anim, hard: true, socket: true, rough: 0.08, pattern: 'none' }));
    out.push(sphere([x + size * 0.55, y + size * 0.05, z + s * spread * 1.02], size * 0.55, pupil, { anim, hard: true, rough: 0.12, pattern: 'none' }));
  }
  return out;
}

/** Four walking legs under a body. */
export function legs4({ x = 0, z = 0, frontX, backX, len, frontLen, backLen, thick, color, spreadZ, foot = true, speed = 2.6, amp = 0.28, footColor }) {
  const out = [];
  const fl = frontLen ?? len, bl = backLen ?? len;
  const spots = [
    [frontX ?? x + 0.6, spreadZ, 0, fl],
    [frontX ?? x + 0.6, -spreadZ, Math.PI, fl],
    [backX ?? x - 0.6, spreadZ, Math.PI, bl],
    [backX ?? x - 0.6, -spreadZ, 0, bl],
  ];
  for (const [lx, lz, phase, len] of spots) {
    const pivot = [lx, len, z + lz];
    const anim = [swing(pivot, [0, 0, 1], amp, speed, phase)];
    out.push(sphere([lx, len, z + lz], thick * 1.15, color, { anim }));
    out.push(cyl([lx, len / 2, z + lz], [thick, len, thick], color, { anim }));
    if (foot) out.push(sphere([lx + thick * 0.35, thick * 0.55, z + lz], [thick * 1.45, thick * 0.6, thick * 1.25], footColor || color, { anim }));
  }
  return out;
}

/** Two big hind legs (for bipeds like T. rex). */
export function legs2({ x = 0, len, thick, color, spreadZ, speed = 2.4, amp = 0.3, footColor }) {
  const out = [];
  for (const [lz, phase] of [[spreadZ, 0], [-spreadZ, Math.PI]]) {
    const pivot = [x, len, lz];
    const anim = [swing(pivot, [0, 0, 1], amp, speed, phase)];
    out.push(sphere([x, len * 0.85, lz], [thick * 1.7, thick * 1.9, thick * 1.3], color, { anim }));
    out.push(cyl([x, len / 2, lz], [thick, len, thick], color, { anim }));
    out.push(sphere([x + thick * 0.6, thick * 0.5, lz], [thick * 1.9, thick * 0.6, thick * 1.3], footColor || color, { anim }));
  }
  return out;
}

/** Tapering chain of spheres trailing to -X. */
export function tail({ start, len, segs = 6, radius, angle = 10, curl = 0, color, color2, pattern, patternScale, wag = 0.35, speed = 2 }) {
  const out = [];
  const a = (angle * Math.PI) / 180;
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const r = radius * (1 - t * 0.82) + 0.02;
    const d = len * t;
    const pos = [start[0] - Math.cos(a) * d, start[1] + Math.sin(a) * d + curl * t * t, start[2]];
    out.push(sphere(pos, [r * 1.35, r, r], color, {
      color2, pattern, patternScale,
      anim: [swing(start, [0, 1, 0], wag * t, speed, -t * 1.6), bob(0.03, 2.4)],
    }));
  }
  return out;
}

/** Neck chain going forward/up to +X; returns parts and the head anchor. */
export function neck({ start, len, segs = 4, radius, angle = 45, color, color2, pattern, patternScale, taper = 0.3 }) {
  const parts = [];
  const a = (angle * Math.PI) / 180;
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const r = radius * (1 - t * taper);
    const d = len * t;
    parts.push(sphere([start[0] + Math.cos(a) * d, start[1] + Math.sin(a) * d, start[2]], [r * 1.25, r * 1.25, r], color, {
      color2, pattern, patternScale, anim: [bob(0.04, 2.4, t)],
    }));
  }
  const end = [start[0] + Math.cos(a) * len, start[1] + Math.sin(a) * len, start[2]];
  return { parts, end };
}

/** Row of plates / spikes along the spine. */
export function spine({ fromX, toX, y, count, size, color, color2, pattern, shape = 'cone', widthZ = 0.5, doubleRow = false, rotZ = 0, plate = false }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = fromX + (toX - fromX) * t;
    const s = size * (0.55 + 0.45 * Math.sin(t * Math.PI));
    const yy = typeof y === 'function' ? y(t) : y;
    const zs = doubleRow ? [-widthZ * 0.5, widthZ * 0.5] : [0];
    for (const z of zs) {
      const sc = plate ? [s * 0.5, s, s * 0.2] : [s * 0.3, s, s * 0.3];
      out.push(part(shape, [x, yy + s * 0.5, z], sc, color, { color2, pattern, rot: [0, 0, rotZ], anim: [bob(0.03, 2.4)] }));
    }
  }
  return out;
}

export function wing({ root, span, chord, color, color2, pattern, side, flap = 0.5, speed = 3, sweep = 0, up = 0.15 }) {
  const dir = side; // +1 => +Z
  const pos = [root[0] + sweep, root[1] + up * span, root[2] + (dir * span) / 2];
  return part('sphere', pos, [chord, 0.07, span / 2], color, {
    color2, pattern,
    anim: [swing(root, [1, 0, 0], flap * dir, speed)],
  });
}

/** Simple 2D-ish fin standing on edge. */
export function fin(pos, size, color, rot = [0, 0, 0], extra = {}) {
  return part('cone', pos, [size * 0.25, size, size * 0.8], color, { rot, ...extra });
}

export const lighten = (hex, amt = 0.25) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.min(255, Math.round(v + (255 - v) * amt));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

/** Lighter belly patch tucked just inside the underside of a body ellipsoid. */
export function belly(pos, bodyScale, color, extra = {}) {
  const [bx, by, bz] = bodyScale;
  // Same pattern id as the body with both pattern colours = belly colour, so the
  // markings fade out smoothly instead of stopping at a seam.
  const patterned = extra.pattern && extra.pattern !== 'mottle' ? { pattern: extra.pattern, patternScale: extra.patternScale, color2: color } : {};
  return sphere([pos[0] + bx * 0.05, pos[1] - by * 0.3, pos[2]], [bx * 0.82, by * 0.7, bz * 0.88], color, { ...extra, ...patterned });
}

/** Snap every part's lowest point so the model rests on the ground. */
export function ground(parts) {
  let minY = Infinity;
  for (const p of parts) {
    const s = typeof p.scale === 'number' ? p.scale : p.scale[1];
    minY = Math.min(minY, p.pos[1] - (p.shape === 'box' || p.shape === 'cylinder' || p.shape === 'cone' ? s / 2 : s));
  }
  if (Number.isFinite(minY) && Math.abs(minY) > 0.001) {
    const seen = new Set();
    for (const p of parts) {
      p.pos = [p.pos[0], p.pos[1] - minY, p.pos[2]];
      for (const a of p.anim || []) {
        if (seen.has(a)) continue;
        seen.add(a);
        if (a.pivot) a.pivot = [a.pivot[0], a.pivot[1] - minY, a.pivot[2]];
      }
    }
  }
  return parts;
}
