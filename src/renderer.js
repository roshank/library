// WebGL2 renderer. GPU does the heavy lifting; the CPU only updates a handful
// of per-part matrices each frame.
import * as M from './mat.js';
import { SHAPES, screenQuad } from './primitives.js';

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
uniform mat4 uProj, uView, uModel;
uniform mat3 uNormalMat;
out vec3 vNormal;
out vec3 vWorld;
out vec3 vLocal;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vLocal = aPos;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uProj * uView * wp;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
in vec3 vLocal;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uLightDir;
uniform vec3 uCamPos;
uniform float uShiny;
uniform float uAlpha;
uniform float uEmissive;
uniform float uPatternScale;
uniform int uPattern;   // 0 none, 1 blobs, 2 bands, 3 spots, 4 stripes, 5 fiery, 6 clouds
uniform int uMode;      // 0 lit part, 1 ground, 2 blob shadow
uniform float uTime;
out vec4 fragColor;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

vec3 patternColor() {
  vec3 p = vLocal * uPatternScale;
  if (uPattern == 1) {            // continents / rusty blotches
    float n = fbm(p + 3.0);
    return mix(uColor, uColor2, smoothstep(0.47, 0.53, n));
  } else if (uPattern == 2) {     // gas-giant bands
    float band = sin(vLocal.y * uPatternScale * 6.0 + fbm(p * 2.0) * 2.5);
    return mix(uColor, uColor2, smoothstep(-0.2, 0.4, band));
  } else if (uPattern == 3) {     // spots
    float n = noise(p);
    return mix(uColor, uColor2, smoothstep(0.62, 0.7, n));
  } else if (uPattern == 4) {     // stripes
    float s = sin(vLocal.x * uPatternScale * 6.0 + noise(p) * 1.5);
    return mix(uColor, uColor2, smoothstep(0.1, 0.3, s));
  } else if (uPattern == 5) {     // boiling sun
    float n = fbm(p * 1.5 + vec3(uTime * 0.15));
    return mix(uColor, uColor2, smoothstep(0.35, 0.7, n));
  }
  return uColor;
}

void main() {
  if (uMode == 1) {               // ground: fade out towards the horizon
    float d = length(vLocal.xz);
    float a = 1.0 - smoothstep(0.35, 1.0, d);
    fragColor = vec4(uColor, a);
    return;
  }
  if (uMode == 2) {               // soft contact shadow
    float d = length(vLocal.xz);
    float a = 0.32 * (1.0 - smoothstep(0.25, 1.0, d));
    fragColor = vec4(0.1, 0.12, 0.2, a);
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 l = normalize(uLightDir);
  vec3 v = normalize(uCamPos - vWorld);
  vec3 base = patternColor();
  float alpha = uAlpha;
  if (uPattern == 6) {            // drifting cloud layer
    float c = fbm(vLocal * uPatternScale + vec3(uTime * 0.03, 0.0, 0.0));
    alpha *= smoothstep(0.48, 0.62, c);
    base = uColor;
  }
  if (uEmissive > 0.0) {
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    vec3 col = base * (1.0 + 0.35 * rim) + uColor2 * 0.25 * rim;
    fragColor = vec4(pow(col, vec3(1.0 / 2.2)), alpha);
    return;
  }
  float ndl = dot(n, l);
  vec3 sky = vec3(0.70, 0.82, 1.0), ground = vec3(0.40, 0.33, 0.28);
  vec3 amb = mix(ground, sky, n.y * 0.5 + 0.5) * 0.30;
  float diff = (smoothstep(-0.1, 0.5, ndl) * 0.6 + 0.4 * max(ndl, 0.0)) * 0.8;
  vec3 h = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), uShiny) * 0.18;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
  vec3 col = base * (amb + diff * vec3(1.0, 0.97, 0.9)) + vec3(spec) + rim * vec3(0.85, 0.92, 1.0);
  fragColor = vec4(pow(col, vec3(1.0 / 2.2)), alpha);
}`;

const SKY_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
out vec2 vUv;
void main() { vUv = aPos.xy * 0.5 + 0.5; gl_Position = vec4(aPos.xy, 0.999, 1.0); }`;

const SKY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop, uBottom;
out vec4 fragColor;
void main() {
  float t = smoothstep(0.0, 1.0, vUv.y);
  fragColor = vec4(mix(uBottom, uTop, t), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const uniforms = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u: uniforms };
}

function upload(gl, geo) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const pb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: geo.indices.length };
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  // sRGB -> linear so lighting math is physically sensible
  const lin = (c) => Math.pow(c / 255, 2.2);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

const PATTERNS = { none: 0, blobs: 1, bands: 2, spots: 3, stripes: 4, fiery: 5, clouds: 6 };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: 'high-performance',
      desynchronized: true,
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.main = program(gl, VERT, FRAG);
    this.sky = program(gl, SKY_VERT, SKY_FRAG);
    this.meshes = Object.fromEntries(Object.entries(SHAPES).map(([k, fn]) => [k, upload(gl, fn())]));
    this.quad = upload(gl, screenQuad());

    this.parts = [];
    this.scene = { sky: ['#8fd3ff', '#eaf6ff'], ground: '#9bd77a', footprint: 1.5 };
    this.camera = { yaw: 0.85, pitch: 0.3, dist: 9, target: [0, 1.2, 0] };
    this.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animate = this.autoRotate;
    this.appear = 1;      // 0..1 entrance pop
    this.time = 0;
    this.lastT = performance.now();
    this.interacting = false;
    this.idleSince = 0;

    this.proj = new Float32Array(16);
    this.view = new Float32Array(16);
    this.model = new Float32Array(16);
    this.nmat = new Float32Array(9);
    this.tmp = new Float32Array(16);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.observeSize();
    this.bindControls();
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  observeSize() {
    const { canvas } = this;
    const resize = (w, h) => {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        let w, h;
        const cssW = e.contentBoxSize?.[0]?.inlineSize ?? canvas.clientWidth;
        const cssH = e.contentBoxSize?.[0]?.blockSize ?? canvas.clientHeight;
        if (e.devicePixelContentBoxSize) {
          w = e.devicePixelContentBoxSize[0].inlineSize;
          h = e.devicePixelContentBoxSize[0].blockSize;
        } else {
          const dpr = devicePixelRatio || 1;
          w = Math.round(cssW * dpr);
          h = Math.round(cssH * dpr);
        }
        // Cap at 2x: beyond that the GPU cost is invisible on a phone screen.
        const cap = 2;
        w = Math.min(w, Math.round(cssW * cap));
        h = Math.min(h, Math.round(cssH * cap));
        resize(Math.max(1, w), Math.max(1, h));
      }
    });
    try {
      ro.observe(canvas, { box: 'device-pixel-content-box' });
    } catch {
      ro.observe(canvas);
    }
  }

  bindControls() {
    const c = this.canvas;
    const pointers = new Map();
    let pinchDist = 0;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      this.interacting = true;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        this.camera.yaw -= (e.clientX - prev[0]) * 0.006;
        this.camera.pitch = Math.min(1.2, Math.max(-0.2, this.camera.pitch + (e.clientY - prev[1]) * 0.005));
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchDist) this.zoom(pinchDist / d);
        pinchDist = d;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        this.interacting = false;
        this.idleSince = performance.now();
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.001));
    }, { passive: false });
  }

  zoom(f) {
    this.camera.dist = Math.min(this.camera.fitDist * 2.5, Math.max(this.camera.fitDist * 0.45, this.camera.dist * f));
  }

  /** Install a new model: list of parts plus scene colours. */
  setModel(parts, scene = {}) {
    const sorted = [...parts].sort((a, b) => ((a.alpha ?? 1) < 1) - ((b.alpha ?? 1) < 1));
    this.parts = sorted.map((p) => ({
      ...p,
      rgb: hexToRgb(p.color || '#ffffff'),
      rgb2: hexToRgb(p.color2 || p.color || '#ffffff'),
      pattern: PATTERNS[p.pattern || 'none'] ?? 0,
      scaleV: typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale,
      base: M.multiply(new Float32Array(16), M.translation(p.pos), M.multiply(new Float32Array(16), M.fromEulerDeg(p.rot || [0, 0, 0]), M.scaling(typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale))),
    }));
    this.scene = { sky: ['#8fd3ff', '#eaf6ff'], ground: '#9bd77a', space: false, ...scene };
    this.fitCamera();
    this.appear = 0;
    this.time = 0;
  }

  fitCamera() {
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of this.parts) {
      if (p.fit === false) continue;   // e.g. distant background stars
      const r = Math.max(...p.scaleV) * (p.shape === 'torus' ? 1.3 : 1);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p.pos[i] - r);
        max[i] = Math.max(max[i], p.pos[i] + r);
      }
    }
    if (!this.parts.length) { min = [-1, 0, -1]; max = [1, 2, 1]; }
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    this.camera.target = center;
    const portrait = this.canvas.clientHeight > this.canvas.clientWidth;
    this.camera.fitDist = size * (portrait ? 1.65 : 1.25) + 1.5;
    this.camera.dist = this.camera.fitDist;
    this.scene.footprint = Math.max(max[0] - min[0], max[2] - min[2]) * 0.55;
    this.scene.grounded = !this.scene.space;
  }

  partMatrix(p, t, pop) {
    const m = this.model;
    M.identity(m);
    for (const a of p.anim || []) {
      const ph = a.phase || 0;
      const sp = a.speed ?? 2;
      if (a.type === 'swing') {
        const ang = Math.sin(t * sp + ph) * a.amp;
        M.multiply(m, m, M.translation(a.pivot));
        M.multiply(m, m, M.rotation(a.axis, ang));
        M.multiply(m, m, M.translation([-a.pivot[0], -a.pivot[1], -a.pivot[2]]));
      } else if (a.type === 'spin') {
        M.multiply(m, m, M.translation(a.pivot || p.pos));
        M.multiply(m, m, M.rotation(a.axis, t * sp));
        const pv = a.pivot || p.pos;
        M.multiply(m, m, M.translation([-pv[0], -pv[1], -pv[2]]));
      } else if (a.type === 'bob') {
        M.multiply(m, m, M.translation([0, Math.sin(t * sp + ph) * a.amp, 0]));
      } else if (a.type === 'orbit') {
        const c = a.center || [0, 0, 0];
        M.multiply(m, m, M.translation(c));
        M.multiply(m, m, M.rotation([0, 1, 0], t * sp + ph));
        M.multiply(m, m, M.translation([-c[0], -c[1], -c[2]]));
      }
    }
    M.multiply(m, m, p.base);
    if (pop !== 1) {
      // scale the whole model about its ground contact point
      const s = M.scaling([pop, pop, pop]);
      M.multiply(m, s, m);
    }
    return m;
  }

  frame(now) {
    requestAnimationFrame(this.frame);
    if (this.lost || document.hidden) return;
    const gl = this.gl;
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    if (this.animate) this.time += dt;
    if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 1.6);
    const resting = !this.interacting && now - this.idleSince > 1500;
    if (this.autoRotate && resting) this.camera.yaw += dt * 0.25;

    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // --- sky
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.sky.p);
    gl.uniform3fv(this.sky.u.uTop, hexToRgb(this.scene.sky[0]).map((c) => Math.pow(c, 1 / 2.2)));
    gl.uniform3fv(this.sky.u.uBottom, hexToRgb(this.scene.sky[1]).map((c) => Math.pow(c, 1 / 2.2)));
    gl.bindVertexArray(this.quad.vao);
    gl.drawElements(gl.TRIANGLES, this.quad.count, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.DEPTH_TEST);

    // --- camera
    const cam = this.camera;
    const eye = [
      cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw),
      cam.target[1] + cam.dist * Math.sin(cam.pitch),
      cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw),
    ];
    M.perspective(0.75, w / h, 0.1, 200, this.proj);
    M.lookAt(eye, cam.target, [0, 1, 0], this.view);

    const P = this.main;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uProj, false, this.proj);
    gl.uniformMatrix4fv(P.u.uView, false, this.view);
    gl.uniform3fv(P.u.uCamPos, eye);
    gl.uniform3f(P.u.uLightDir, 0.5, 1.0, 0.65);
    gl.uniform1f(P.u.uTime, this.time);

    // --- ground + shadow (only for things that stand on the ground)
    if (this.scene.grounded) {
      const pop = this.appear;
      gl.uniform1i(P.u.uPattern, 0);
      gl.uniform1f(P.u.uEmissive, 0);
      gl.uniform1i(P.u.uMode, 1);
      gl.uniform3fv(P.u.uColor, hexToRgb(this.scene.ground).map((c) => Math.pow(c, 1 / 2.2)));
      this.draw('disc', M.scaling([40, 1, 40]), P);
      gl.uniform1i(P.u.uMode, 2);
      const f = this.scene.footprint * (0.6 + 0.4 * pop);
      this.draw('disc', M.multiply(this.tmp, M.translation([cam.target[0], 0.01, cam.target[2]]), M.scaling([f * 1.15, 1, f])), P);
    }

    // --- parts
    gl.uniform1i(P.u.uMode, 0);
    const pop = this.easeOutBack(this.appear);
    for (const p of this.parts) {
      const m = this.partMatrix(p, this.time, pop);
      gl.uniform3fv(P.u.uColor, p.rgb);
      gl.uniform3fv(P.u.uColor2, p.rgb2);
      gl.uniform1i(P.u.uPattern, p.pattern);
      gl.uniform1f(P.u.uPatternScale, p.patternScale ?? 3);
      gl.uniform1f(P.u.uEmissive, p.emissive ? 1 : 0);
      gl.uniform1f(P.u.uShiny, p.shiny ?? 24);
      gl.uniform1f(P.u.uAlpha, p.alpha ?? 1);
      this.draw(p.shape, m, P);
    }
  }

  easeOutBack(x) {
    const c1 = 1.4, c3 = c1 + 1;
    return x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  draw(shape, model, P) {
    const gl = this.gl;
    const mesh = this.meshes[shape] || this.meshes.sphere;
    gl.uniformMatrix4fv(P.u.uModel, false, model);
    gl.uniformMatrix3fv(P.u.uNormalMat, false, M.normalMatrix(model, this.nmat));
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }
}
