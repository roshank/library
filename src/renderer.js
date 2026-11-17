// WebGL2 renderer with a small "cinematic" pipeline:
//   shadow pass → HDR multisampled scene (PBR, procedural materials, fog)
//   → resolve → bloom → tone map (ACES) + vignette to the canvas.
// Organic creatures arrive as one skinned mesh from the SDF mesher; rigid
// pieces (eyes, teeth, machines, planets) are drawn from shared primitives.
import * as M from './mat.js';
import { SHAPES, screenQuad } from './primitives.js';

const MAX_BONES = 48;

const NOISE_GLSL = `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return v;
}
// cellular noise: x = distance to nearest feature, y = cell id
vec2 voronoi(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float best = 8.0, second = 8.0, id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash3(i + g) * 0.85 + 0.075;
    float d = length(g + o - f);
    if (d < best) { second = best; best = d; id = hash(i + g); } else if (d < second) { second = d; }
  }
  return vec2(second - best, id);
}
vec3 skyColor(vec3 dir, vec3 sun, vec3 zenith, vec3 horizon, float space) {
  float t = clamp(dir.y, -0.1, 1.0);
  vec3 col = mix(horizon, zenith, pow(max(t, 0.0), 0.38));
  float sd = max(dot(dir, sun), 0.0);
  col += vec3(1.0, 0.85, 0.6) * pow(sd, 48.0) * 0.6 * (1.0 - space);
  col += vec3(1.0, 0.9, 0.7) * pow(sd, 8.0) * 0.12 * (1.0 - space);
  return col;
}`;

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec3 aColor2;
layout(location=4) in vec4 aParams;
layout(location=5) in vec4 aExtra;
layout(location=6) in vec4 aBoneIdx;
layout(location=7) in vec4 aBoneWt;
uniform mat4 uProj, uView, uModel, uBase, uLightVP;
uniform mat3 uNormalMat;
uniform mat4 uBones[${MAX_BONES}];
uniform int uRigid;
out vec3 vWorld, vNormal, vObj, vColor, vColor2;
out vec4 vParams, vExtra, vShadow;
void main() {
  vec4 wp; vec3 n;
  if (uRigid == 1) {
    wp = uModel * vec4(aPos, 1.0);
    n = uNormalMat * aNormal;
    vObj = (uBase * vec4(aPos, 1.0)).xyz;
  } else {
    mat4 skin = uBones[int(aBoneIdx.x)] * aBoneWt.x + uBones[int(aBoneIdx.y)] * aBoneWt.y
              + uBones[int(aBoneIdx.z)] * aBoneWt.z + uBones[int(aBoneIdx.w)] * aBoneWt.w;
    wp = skin * vec4(aPos, 1.0);
    n = mat3(skin) * aNormal;
    vObj = aPos;
  }
  vWorld = wp.xyz;
  vNormal = n;
  vColor = aColor; vColor2 = aColor2; vParams = aParams; vExtra = aExtra;
  vShadow = uLightVP * wp;
  gl_Position = uProj * uView * wp;
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vWorld, vNormal, vObj, vColor, vColor2;
in vec4 vParams, vExtra, vShadow;
uniform vec3 uSunDir, uSunColor, uZenith, uHorizon, uCamPos, uGroundTint;
uniform float uTime, uSpace, uEmissive, uAlpha, uMetal, uFog, uShadowOn;
uniform int uDebug;
uniform int uMode;        // 0 surface, 1 ground
uniform int uGroundType;  // 0 grass 1 sand 2 snow 3 rock 4 water 5 asphalt
uniform sampler2DShadow uShadowMap;
out vec4 fragColor;
${NOISE_GLSL}

float shadowAt(vec3 nrm) {
  if (uShadowOn < 0.5) return 1.0;
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float bias = 0.0025 + 0.004 * (1.0 - max(dot(nrm, uSunDir), 0.0));
  float s = 0.0;
  float px = 1.0 / 2048.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    s += texture(uShadowMap, vec3(p.xy + vec2(float(x), float(y)) * px * 1.2, p.z - bias));
  }
  return s / 9.0;
}

// --- procedural material ---------------------------------------------
vec3 baseColor(vec3 p, float pattern, float scale, out float roughMod) {
  roughMod = 0.0;
  vec3 c1 = vColor, c2 = vColor2;
  vec3 q = p * scale;
  if (pattern < 0.5) return c1;
  if (pattern < 1.5) {        // continents / blotches
    float n = fbm(q + 3.0);
    return mix(c1, c2, smoothstep(0.47, 0.53, n));
  } else if (pattern < 2.5) { // gas-giant bands
    float band = sin(p.y * scale * 6.0 + fbm(q * 2.0) * 2.5);
    return mix(c1, c2, smoothstep(-0.2, 0.4, band));
  } else if (pattern < 3.5) { // cellular spots (giraffe)
    vec2 v = voronoi(q);
    return mix(c2, c1, smoothstep(0.03, 0.14, v.x));
  } else if (pattern < 4.5) { // stripes
    float s = sin(p.x * scale * 5.0 + fbm(q * 1.5) * 3.0 + p.y * 1.5);
    return mix(c1, c2, smoothstep(0.15, 0.45, s));
  } else if (pattern < 5.5) { // boiling sun
    float n = fbm(q * 1.5 + vec3(uTime * 0.15));
    return mix(c1, c2, smoothstep(0.35, 0.7, n));
  } else if (pattern < 6.5) { // clouds: handled via alpha below
    return c1;
  }
  // mottle: natural skin variation + darker dorsal side
  float n = fbm(q * 0.9) * 0.6 + fbm(q * 3.5) * 0.4;
  vec3 c = mix(c1, c2, smoothstep(0.35, 0.75, n));
  c *= 0.85 + 0.3 * fbm(q * 7.0);
  return c;
}

float skinHeight(vec3 q, float skin) {
  if (skin < 0.5) return 0.0;
  if (skin < 1.5) {            // scales: cellular plates
    vec2 v = voronoi(q * 4.5);
    return smoothstep(0.0, 0.12, v.x) * 0.75 + noise(q * 18.0) * 0.25;
  } else if (skin < 2.5) {     // fur: fine stretched grain
    return fbm(q * vec3(40.0, 14.0, 40.0)) * 0.5 + noise(q * 90.0) * 0.5;
  }
  return fbm(q * 6.0);         // rough stone / metal grain
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uCamPos - vWorld);
  vec3 l = normalize(uSunDir);
  float dist = length(uCamPos - vWorld);
  if (uDebug == 1) { fragColor = vec4(n * 0.5 + 0.5, 1.0); return; }
  if (uDebug == 2) { fragColor = vec4(vec3(max(dot(n, l), 0.0)), 1.0); return; }
  if (uDebug == 3) { fragColor = vec4(l * 0.5 + 0.5, 1.0); return; }

  vec3 albedo; float rough; float metal = uMetal; float ao = 1.0; float sss = 0.0; float alpha = uAlpha;
  if (uMode == 1) {
    // ---- ground
    vec3 q = vWorld;
    float macro = fbm(q * 0.12), micro = fbm(q * 1.3), fine = noise(q * 9.0);
    vec3 tint = uGroundTint;
    // small-scale relief so sunlight rakes across the ground
    if (uGroundType != 4) {
      float e = 0.05;
      float h0 = fbm(q * 2.5);
      vec2 g = vec2(fbm(q * 2.5 + vec3(e, 0, 0)) - h0, fbm(q * 2.5 + vec3(0, 0, e)) - h0) / e;
      n = normalize(vec3(-g.x * 0.12, 1.0, -g.y * 0.12));
    }
    if (uGroundType == 0) {        // grass
      vec3 g1 = tint * 0.75, g2 = tint * 1.25, dirt = vec3(0.21, 0.15, 0.09);
      albedo = mix(g1, g2, micro);
      albedo = mix(albedo, dirt, smoothstep(0.55, 0.72, macro) * 0.8);
      albedo *= 0.85 + 0.3 * fine;
      albedo *= 0.8 + 0.4 * noise(q * 25.0);   // blades
      rough = 0.9;
    } else if (uGroundType == 1) { // sand / dry earth
      albedo = tint * (0.8 + 0.35 * micro) * (0.9 + 0.2 * fine);
      albedo = mix(albedo, albedo * 0.7, smoothstep(0.5, 0.75, macro));
      rough = 0.85;
    } else if (uGroundType == 2) { // snow
      albedo = tint * (0.92 + 0.08 * fine);
      rough = 0.55;
      n = normalize(n + vec3(fbm(q * 2.0) - 0.5, 0.0, fbm(q * 2.0 + 7.0) - 0.5) * 0.15);
    } else if (uGroundType == 4) { // water
      vec3 w = vec3(q.x * 0.6 + uTime * 0.25, 0.0, q.z * 0.6 - uTime * 0.17);
      float h1 = fbm(w), h2 = fbm(w + vec3(0.07, 0.0, 0.0)), h3 = fbm(w + vec3(0.0, 0.0, 0.07));
      n = normalize(vec3((h1 - h2) * 3.5, 1.0, (h1 - h3) * 3.5));
      albedo = tint * 0.5;
      rough = 0.08;
      metal = 0.0;
    } else {                       // rock / asphalt
      albedo = tint * (0.75 + 0.5 * micro) * (0.85 + 0.3 * fine);
      albedo = mix(albedo, albedo * 0.6, smoothstep(0.6, 0.8, macro));
      rough = 0.8;
    }
  } else {
    float roughMod;
    albedo = baseColor(vObj, vParams.x, vParams.y, roughMod);
    rough = clamp(vParams.z + roughMod, 0.05, 1.0);
    ao = vExtra.x;
    sss = vExtra.y;
    if (vParams.x > 5.5 && vParams.x < 6.5) {   // cloud layer
      float c = fbm(vObj * vParams.y + vec3(uTime * 0.02, 0.0, 0.0));
      alpha *= smoothstep(0.46, 0.62, c);
    }
    // bump from procedural skin detail
    float skin = vParams.w;
    if (skin > 0.5) {
      float e = 0.012;
      float h0 = skinHeight(vObj, skin);
      vec3 g = vec3(skinHeight(vObj + vec3(e, 0, 0), skin) - h0,
                    skinHeight(vObj + vec3(0, e, 0), skin) - h0,
                    skinHeight(vObj + vec3(0, 0, e), skin) - h0) / e;
      float strength = skin < 1.5 ? 0.02 : (skin < 2.5 ? 0.014 : 0.03);
      n = normalize(n - strength * (g - n * dot(n, g)));
      if (skin < 1.5) { rough = clamp(rough + 0.2 * (1.0 - h0), 0.1, 1.0); albedo *= 0.7 + 0.3 * h0; }
    }
  }

  if (uEmissive > 0.0) {
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    fragColor = vec4(albedo * (1.6 + 0.6 * rim) + vColor2 * 0.3 * rim, alpha);
    return;
  }

  // --- lighting: Cook-Torrance GGX + hemisphere ambient ---------------
  float NdL = max(dot(n, l), 0.0);
  vec3 h = normalize(l + v);
  float NdH = max(dot(n, h), 0.0), NdV = max(dot(n, v), 1e-3), VdH = max(dot(v, h), 0.0);
  float a = rough * rough, a2 = a * a;
  float D = a2 / (3.14159 * pow(NdH * NdH * (a2 - 1.0) + 1.0, 2.0));
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NdV / (NdV * (1.0 - k) + k)) * (NdL / (NdL * (1.0 - k) + k));
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdH, 5.0);
  vec3 spec = D * G * F / max(4.0 * NdV * NdL, 1e-3);
  vec3 kd = (1.0 - F) * (1.0 - metal);
  float shadow = shadowAt(n);
  vec3 sun = uSunColor * shadow;
  vec3 col = (kd * albedo / 3.14159 + spec) * sun * NdL;

  // soft subsurface / wrap light for skin
  if (sss > 0.0) {
    float wrap = max(dot(n, l) + 0.5, 0.0) / 1.5;
    vec3 back = albedo * vec3(1.0, 0.55, 0.4) * pow(max(dot(v, -l + n * 0.4), 0.0), 2.5);
    col += (albedo * wrap * 0.25 + back * 0.6) * sss * sun * (0.4 + 0.6 * shadow);
  }

  // ambient: hemisphere irradiance + glossy environment approximation
  vec3 skyIrr = mix(mix(uHorizon, uZenith, 0.5), vec3(0.75, 0.78, 0.85), 0.35);
  vec3 groundIrr = (uMode == 1 ? albedo : uGroundTint) * 0.35 + uHorizon * 0.1;
  vec3 amb = mix(groundIrr, skyIrr, n.y * 0.5 + 0.5) * (uSpace > 0.5 ? 0.18 : 0.75);
  col += kd * albedo * amb * ao;
  vec3 r = reflect(-v, n);
  vec3 env = skyColor(r, l, uZenith, uHorizon, uSpace);
  if (r.y < 0.0) env = mix(env, groundIrr * 1.5, clamp(-r.y * 3.0, 0.0, 1.0));
  vec3 Fr = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - NdV, 5.0);
  col += env * Fr * (1.0 - rough) * (1.0 - rough) * ao * (uSpace > 0.5 ? 0.3 : 0.9);

  // atmospheric fog toward the horizon colour
  float fog = 1.0 - exp(-dist * dist * uFog);
  col = mix(col, uHorizon * 0.9, fog);
  fragColor = vec4(col, alpha);
}`;

const SHADOW_FRAG = `#version 300 es
precision highp float;
in vec3 vWorld, vNormal, vObj, vColor, vColor2;
in vec4 vParams, vExtra, vShadow;
out vec4 fragColor;
void main() { fragColor = vec4(1.0); }`;

const SKY_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uInvVP;
out vec3 vDir;
out vec2 vUv;
void main() {
  vec4 p = uInvVP * vec4(aPos.xy, 1.0, 1.0);
  vDir = p.xyz / p.w;
  vUv = aPos.xy * 0.5 + 0.5;
  gl_Position = vec4(aPos.xy, 0.9999, 1.0);
}`;

const SKY_FRAG = `#version 300 es
precision highp float;
in vec3 vDir;
in vec2 vUv;
uniform vec3 uSunDir, uZenith, uHorizon, uCamPos;
uniform float uSpace, uTime;
out vec4 fragColor;
${NOISE_GLSL}
void main() {
  vec3 d = normalize(vDir - uCamPos);
  vec3 col = skyColor(d, normalize(uSunDir), uZenith, uHorizon, uSpace);
  if (uSpace > 0.5) {
    // star field
    vec3 g = d * 220.0;
    vec3 cell = floor(g);
    vec3 o = hash3(cell);
    float star = 1.0 - smoothstep(0.0, 0.25, length(fract(g) - o * 0.8 - 0.1));
    float bright = step(0.965, hash(cell + 3.1)) * (0.4 + 0.8 * hash(cell + 7.7));
    col += vec3(1.0, 0.95, 0.9) * star * bright * 1.5;
    col += vec3(0.25, 0.2, 0.45) * pow(fbm(d * 3.0 + 1.0), 3.0) * 0.6;   // faint nebula
  } else {
    // soft clouds near the zenith
    float c = fbm(d * 4.0 / max(d.y + 0.15, 0.05) * 0.35 + vec3(uTime * 0.01, 0.0, 0.0));
    float cl = smoothstep(0.52, 0.72, c) * smoothstep(0.02, 0.25, d.y);
    col = mix(col, vec3(1.0, 0.98, 0.95) * 1.1, cl * 0.6);
  }
  fragColor = vec4(col, 1.0);
}`;

const POST_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
out vec2 vUv;
void main() { vUv = aPos.xy * 0.5 + 0.5; gl_Position = vec4(aPos.xy, 0.0, 1.0); }`;

const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex, uBloom;
uniform vec2 uTexel;
uniform vec2 uDir;
uniform int uPass;   // 0 bright-pass, 1 blur, 2 composite
uniform float uExposure;
out vec4 fragColor;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  if (uPass == 0) {
    vec3 c = vec3(0.0);
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) c += texture(uTex, vUv + vec2(float(x), float(y)) * uTexel).rgb;
    c /= 9.0;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    fragColor = vec4(c * smoothstep(0.9, 1.6, l), 1.0);
  } else if (uPass == 1) {
    float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    vec3 c = texture(uTex, vUv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      c += texture(uTex, vUv + uDir * uTexel * float(i)).rgb * w[i];
      c += texture(uTex, vUv - uDir * uTexel * float(i)).rgb * w[i];
    }
    fragColor = vec4(c, 1.0);
  } else {
    vec3 c = texture(uTex, vUv).rgb + texture(uBloom, vUv).rgb * 0.35;
    c *= uExposure;
    c = aces(c);
    float vig = smoothstep(1.35, 0.4, length(vUv - 0.5) * 1.4);
    c *= 0.74 + 0.26 * vig;
    c = pow(c, vec3(1.0 / 2.2));
    fragColor = vec4(c, 1.0);
  }
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').slice(0, 5).join('\n'));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

function uploadPrimitive(gl, geo) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  for (const [loc, data] of [[0, geo.positions], [1, geo.normals]]) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  }
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: geo.indices.length, type: gl.UNSIGNED_SHORT };
}

export function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const lin = (c) => Math.pow(c / 255, 2.2);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

const PATTERNS = { none: 0, blobs: 1, bands: 2, spots: 3, stripes: 4, fiery: 5, clouds: 6, mottle: 7 };
const SKINS = { smooth: 0, scales: 1, fur: 2, rough: 3 };
const GROUND = { grass: 0, sand: 1, snow: 2, rock: 3, water: 4, asphalt: 5 };

function ortho(l, r, b, t, n, f, out = new Float32Array(16)) {
  out.fill(0);
  out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
  out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = -(f + n) / (f - n); out[15] = 1;
  return out;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance', desynchronized: true });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float');
    this.main = program(gl, VERT, FRAG);
    this.shadowProg = program(gl, VERT, SHADOW_FRAG);
    this.sky = program(gl, SKY_VERT, SKY_FRAG);
    this.post = program(gl, POST_VERT, POST_FRAG);
    this.prims = Object.fromEntries(Object.entries(SHAPES).map(([k, fn]) => [k, uploadPrimitive(gl, fn())]));
    this.quad = uploadPrimitive(gl, screenQuad());

    this.parts = [];
    this.mesh = null;
    this.bones = [[]];
    this.scene = this.defaultScene();
    this.camera = { yaw: 0.85, pitch: 0.27, dist: 9, fitDist: 9, target: [0, 1.2, 0] };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.autoRotate = !this.reduced;
    this.animate = !this.reduced;
    this.time = 0;
    this.lastT = performance.now();
    this.interacting = false;
    this.idleSince = 0;
    this.exposure = 1.0;
    this.shadows = true;

    this.proj = new Float32Array(16);
    this.view = new Float32Array(16);
    this.invVP = new Float32Array(16);
    this.lightVP = new Float32Array(16);
    this.model = new Float32Array(16);
    this.nmat = new Float32Array(9);
    this.tmp = new Float32Array(16);
    this.boneData = new Float32Array(16 * MAX_BONES);
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));

    this.createShadowMap();
    this.fbSize = [0, 0];
    this.observeSize();
    this.bindControls();
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  defaultScene() {
    return { sky: ['#4f8fd6', '#d9e6f2'], ground: '#5f8a3c', groundType: 'grass', space: false, sun: [0.45, 0.7, 0.55], sunColor: '#fff2dc', sunPower: 5.0, fog: 0.00012 };
  }

  // ---------------------------------------------------------------- GL setup
  createShadowMap() {
    const gl = this.gl;
    const size = 2048;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.shadow = { fb, tex, size };
  }

  createTargets(w, h) {
    const gl = this.gl;
    if (this.targets) {
      for (const t of Object.values(this.targets)) {
        if (t.fb) gl.deleteFramebuffer(t.fb);
        if (t.tex) gl.deleteTexture(t.tex);
        if (t.rb) gl.deleteRenderbuffer(t.rb);
        if (t.depth) gl.deleteRenderbuffer(t.depth);
      }
    }
    const fmt = this.hdr ? gl.RGBA16F : gl.RGBA8;
    const makeTex = (tw, th) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, tw, th);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { fb, tex, w: tw, h: th };
    };
    // multisampled HDR scene target
    const ms = {};
    ms.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, ms.fb);
    ms.rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, ms.rb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, fmt, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, ms.rb);
    ms.depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, ms.depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ms.depth);
    ms.w = w; ms.h = h;
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    this.targets = { ms, scene: makeTex(w, h), bloomA: makeTex(bw, bh), bloomB: makeTex(bw, bh) };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbSize = [w, h];
  }

  observeSize() {
    const { canvas } = this;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cssW = e.contentBoxSize?.[0]?.inlineSize ?? canvas.clientWidth;
        const cssH = e.contentBoxSize?.[0]?.blockSize ?? canvas.clientHeight;
        let w, h;
        if (e.devicePixelContentBoxSize) {
          w = e.devicePixelContentBoxSize[0].inlineSize;
          h = e.devicePixelContentBoxSize[0].blockSize;
        } else {
          const dpr = devicePixelRatio || 1;
          w = Math.round(cssW * dpr); h = Math.round(cssH * dpr);
        }
        // Post-processing makes every pixel cost more; 1.5x is plenty.
        const cap = 1.5;
        w = Math.max(1, Math.min(w, Math.round(cssW * cap)));
        h = Math.max(1, Math.min(h, Math.round(cssH * cap)));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
    });
    try { ro.observe(canvas, { box: 'device-pixel-content-box' }); } catch { ro.observe(canvas); }
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
        this.camera.pitch = Math.min(1.1, Math.max(-0.05, this.camera.pitch + (e.clientY - prev[1]) * 0.005));
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchDist) this.zoom(pinchDist / d);
        pinchDist = d;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) { this.interacting = false; this.idleSince = performance.now(); }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
  }

  zoom(f) {
    this.camera.dist = Math.min(this.camera.fitDist * 2.5, Math.max(this.camera.fitDist * 0.4, this.camera.dist * f));
  }

  // ---------------------------------------------------------------- models
  /**
   * @param {object} model
   *   mesh:  output of the SDF mesher (or null)
   *   parts: rigid parts (eyes, teeth, machines...)
   *   bones: array of anim lists; index 0 is the static bone
   *   bounds: {min,max} of the whole model for camera + shadow fitting
   */
  setModel({ mesh = null, parts = [], bones = [[]], bounds, scene = {} }) {
    const gl = this.gl;
    if (this.mesh) { gl.deleteVertexArray(this.mesh.vao); this.mesh.buffers.forEach((b) => gl.deleteBuffer(b)); }
    this.mesh = mesh ? this.uploadMesh(mesh) : null;
    this.bones = bones.length > MAX_BONES ? bones.slice(0, MAX_BONES) : bones;
    const sorted = [...parts].sort((a, b) => ((a.alpha ?? 1) < 1) - ((b.alpha ?? 1) < 1));
    this.parts = sorted.map((p) => {
      const scale = typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale;
      return {
        ...p,
        scaleV: scale,
        rgb: hexToRgb(p.color),
        rgb2: hexToRgb(p.color2 || p.color),
        pattern: PATTERNS[p.pattern || 'none'] ?? 0,
        skin: SKINS[p.skin || 'smooth'] ?? 0,
        base: M.multiply(new Float32Array(16), M.translation(p.pos), M.multiply(new Float32Array(16), M.fromEulerDeg(p.rot || [0, 0, 0]), M.scaling(scale))),
      };
    });
    this.scene = { ...this.defaultScene(), ...scene };
    this.sceneCache = {
      zenith: hexToRgb(this.scene.sky[0]),
      horizon: hexToRgb(this.scene.sky[1]),
      ground: hexToRgb(this.scene.ground),
      sunColor: hexToRgb(this.scene.sunColor).map((c) => c * this.scene.sunPower),
      sun: (() => { const s = this.scene.sun; const l = Math.hypot(...s); return s.map((c) => c / l); })(),
      groundType: GROUND[this.scene.groundType] ?? 0,
    };
    this.bounds = bounds || this.partBounds();
    this.fitCamera();
    this.time = 0;
  }

  uploadMesh(m) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffers = [];
    const attr = (loc, data, size) => {
      const b = gl.createBuffer();
      buffers.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr(0, m.positions, 3); attr(1, m.normals, 3); attr(2, m.colors, 3); attr(3, m.colors2, 3);
    attr(4, m.params, 4); attr(5, m.extra, 4); attr(6, m.boneIdx, 4); attr(7, m.boneWt, 4);
    const ib = gl.createBuffer();
    buffers.push(ib);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, buffers, count: m.indices.length, type: m.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  }

  partBounds() {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of this.parts) {
      if (p.fit === false) continue;
      const r = Math.max(...p.scaleV) * (p.shape === 'torus' ? 1.3 : 1);
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p.pos[i] - r); max[i] = Math.max(max[i], p.pos[i] + r); }
    }
    if (!Number.isFinite(min[0])) return { min: [-1, 0, -1], max: [1, 2, 1] };
    return { min, max };
  }

  fitCamera() {
    const { min, max } = this.bounds;
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    this.camera.target = [center[0], center[1] + (this.scene.space ? 0 : size * 0.02), center[2]];
    const portrait = this.canvas.clientHeight > this.canvas.clientWidth;
    this.camera.fitDist = size * (portrait ? 2.6 : 1.9) + 1.5;
    this.camera.dist = this.camera.fitDist;
    this.radius = size * 0.75;
    this.center = center;
  }

  // ---------------------------------------------------------------- animation
  animMatrix(anims, t, out) {
    M.identity(out);
    for (const a of anims) {
      const ph = a.phase || 0, sp = a.speed ?? 2;
      if (a.type === 'swing') {
        M.multiply(out, out, M.translation(a.pivot));
        M.multiply(out, out, M.rotation(a.axis, Math.sin(t * sp + ph) * a.amp));
        M.multiply(out, out, M.translation([-a.pivot[0], -a.pivot[1], -a.pivot[2]]));
      } else if (a.type === 'spin') {
        const pv = a.pivot || [0, 0, 0];
        M.multiply(out, out, M.translation(pv));
        M.multiply(out, out, M.rotation(a.axis, t * sp));
        M.multiply(out, out, M.translation([-pv[0], -pv[1], -pv[2]]));
      } else if (a.type === 'bob') {
        M.multiply(out, out, M.translation([0, Math.sin(t * sp + ph) * a.amp, 0]));
      } else if (a.type === 'orbit') {
        const c = a.center || [0, 0, 0];
        M.multiply(out, out, M.translation(c));
        M.multiply(out, out, M.rotation([0, 1, 0], t * sp + ph));
        M.multiply(out, out, M.translation([-c[0], -c[1], -c[2]]));
      }
    }
    return out;
  }

  updateBones(t) {
    for (let i = 0; i < this.bones.length; i++) {
      this.animMatrix(this.bones[i], t, this.tmp);
      this.boneData.set(this.tmp, i * 16);
    }
  }

  // ---------------------------------------------------------------- drawing
  drawGeometry(P, shadowPass) {
    const gl = this.gl;
    if (this.mesh) {
      gl.uniform1i(P.u.uRigid, 0);
      gl.uniformMatrix4fv(P.u.uBones, false, this.boneData, 0, this.bones.length * 16);
      gl.uniform1f(P.u.uEmissive, 0);
      gl.uniform1f(P.u.uAlpha, 1);
      gl.uniform1f(P.u.uMetal, 0);
      gl.bindVertexArray(this.mesh.vao);
      gl.drawElements(gl.TRIANGLES, this.mesh.count, this.mesh.type, 0);
    }
    gl.uniform1i(P.u.uRigid, 1);
    for (const p of this.parts) {
      const transparent = (p.alpha ?? 1) < 1;
      if (shadowPass && (transparent || p.emissive || p.fit === false)) continue;
      const m = this.model;
      this.animMatrix(p.anim || [], this.time, m);
      M.multiply(m, m, p.base);
      gl.uniformMatrix4fv(P.u.uModel, false, m);
      gl.uniformMatrix4fv(P.u.uBase, false, p.base);
      gl.uniformMatrix3fv(P.u.uNormalMat, false, M.normalMatrix(m, this.nmat));
      if (!shadowPass) {
        gl.vertexAttrib3fv(2, p.rgb);
        gl.vertexAttrib3fv(3, p.rgb2);
        gl.vertexAttrib4f(4, p.pattern, p.patternScale ?? 3, p.rough ?? 0.5, p.skin);
        gl.vertexAttrib4f(5, 1, p.sss ?? 0, 0, 0);
        gl.uniform1f(P.u.uEmissive, p.emissive ? 1 : 0);
        gl.uniform1f(P.u.uAlpha, p.alpha ?? 1);
        gl.uniform1f(P.u.uMetal, p.metal ?? 0);
        if (transparent) gl.depthMask(false);
      }
      const mesh = this.prims[p.shape] || this.prims.sphere;
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.type, 0);
      if (!shadowPass && transparent) gl.depthMask(true);
    }
  }

  frame(now) {
    requestAnimationFrame(this.frame);
    if (this.lost || document.hidden) return;
    const gl = this.gl;
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    if (this.animate) this.time += dt;
    const resting = !this.interacting && now - this.idleSince > 1500;
    if (this.autoRotate && resting) this.camera.yaw += dt * 0.12;

    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    if (w !== this.fbSize[0] || h !== this.fbSize[1]) this.createTargets(w, h);
    const sc = this.sceneCache || (this.sceneCache = null);
    if (!sc) { this.setModel({ scene: {} }); return; }

    // --- camera
    const cam = this.camera;
    const eye = [
      cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw),
      cam.target[1] + cam.dist * Math.sin(cam.pitch),
      cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw),
    ];
    M.perspective(0.62, w / h, 0.1, 400, this.proj);
    M.lookAt(eye, cam.target, [0, 1, 0], this.view);
    const vp = M.multiply(this.tmp, this.proj, this.view);
    invert4(vp, this.invVP);

    // --- light matrices (ortho box around the model, from the sun)
    const sun = sc.sun;
    const c = this.center || [0, 1, 0];
    const r = Math.max(this.radius || 2, 1.5) * 1.35;
    const lightEye = [c[0] + sun[0] * r * 4, c[1] + sun[1] * r * 4, c[2] + sun[2] * r * 4];
    const lv = M.lookAt(lightEye, c, Math.abs(sun[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0]);
    const lp = ortho(-r, r, -r, r, r * 1.5, r * 7);
    M.multiply(this.lightVP, lp, lv);

    this.updateBones(this.time);

    // ===== 1. shadow pass (unbind textures first: no feedback loops)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fb);
    gl.viewport(0, 0, this.shadow.size, this.shadow.size);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 4);
    let P = this.shadowProg;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uProj, false, lp);
    gl.uniformMatrix4fv(P.u.uView, false, lv);
    gl.uniformMatrix4fv(P.u.uLightVP, false, this.lightVP);
    this.drawGeometry(P, true);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.cullFace(gl.BACK);

    // ===== 2. scene pass (HDR, multisampled)
    const T = this.targets;
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.ms.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sky
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.sky.p);
    gl.uniformMatrix4fv(this.sky.u.uInvVP, false, this.invVP);
    gl.uniform3fv(this.sky.u.uSunDir, sun);
    gl.uniform3fv(this.sky.u.uZenith, sc.zenith);
    gl.uniform3fv(this.sky.u.uHorizon, sc.horizon);
    gl.uniform3fv(this.sky.u.uCamPos, eye);
    gl.uniform1f(this.sky.u.uSpace, this.scene.space ? 1 : 0);
    gl.uniform1f(this.sky.u.uTime, this.time);
    gl.bindVertexArray(this.quad.vao);
    gl.drawElements(gl.TRIANGLES, this.quad.count, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    P = this.main;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uProj, false, this.proj);
    gl.uniformMatrix4fv(P.u.uView, false, this.view);
    gl.uniformMatrix4fv(P.u.uLightVP, false, this.lightVP);
    gl.uniform3fv(P.u.uCamPos, eye);
    gl.uniform3fv(P.u.uSunDir, sun);
    gl.uniform3fv(P.u.uSunColor, sc.sunColor);
    gl.uniform3fv(P.u.uZenith, sc.zenith);
    gl.uniform3fv(P.u.uHorizon, sc.horizon);
    gl.uniform3fv(P.u.uGroundTint, sc.ground);
    gl.uniform1f(P.u.uTime, this.time);
    gl.uniform1f(P.u.uSpace, this.scene.space ? 1 : 0);
    gl.uniform1f(P.u.uFog, this.scene.fog);
    gl.uniform1i(P.u.uGroundType, sc.groundType);
    gl.uniform1f(P.u.uShadowOn, this.shadows ? 1 : 0);
    gl.uniform1i(P.u.uDebug, this.debugMode | 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadow.tex);
    gl.uniform1i(P.u.uShadowMap, 0);

    // ground
    if (!this.scene.space) {
      gl.uniform1i(P.u.uMode, 1);
      gl.uniform1i(P.u.uRigid, 1);
      gl.uniform1f(P.u.uEmissive, 0);
      gl.uniform1f(P.u.uAlpha, 1);
      gl.uniform1f(P.u.uMetal, 0);
      const gm = M.scaling([120, 1, 120]);
      gl.uniformMatrix4fv(P.u.uModel, false, gm);
      gl.uniformMatrix4fv(P.u.uBase, false, gm);
      gl.uniformMatrix3fv(P.u.uNormalMat, false, M.normalMatrix(gm, this.nmat));
      gl.bindVertexArray(this.prims.disc.vao);
      gl.drawElements(gl.TRIANGLES, this.prims.disc.count, gl.UNSIGNED_SHORT, 0);
    }
    gl.uniform1i(P.u.uMode, 0);
    this.drawGeometry(P, false);
    gl.disable(gl.BLEND);

    // ===== 3. resolve MSAA → texture
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.ms.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.scene.fb);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    // ===== 4. bloom
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    const PP = this.post;
    gl.useProgram(PP.p);
    gl.bindVertexArray(this.quad.vao);
    const blit = (src, dst, pass, dir) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
      gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(PP.u.uTex, 0);
      gl.uniform2f(PP.u.uTexel, 1 / src.w, 1 / src.h);
      gl.uniform2f(PP.u.uDir, dir[0], dir[1]);
      gl.uniform1i(PP.u.uPass, pass);
      gl.drawElements(gl.TRIANGLES, this.quad.count, gl.UNSIGNED_SHORT, 0);
    };
    blit(T.scene, T.bloomA, 0, [0, 0]);
    blit(T.bloomA, T.bloomB, 1, [1, 0]);
    blit(T.bloomB, T.bloomA, 1, [0, 1]);
    blit(T.bloomA, T.bloomB, 1, [1, 0]);
    blit(T.bloomB, T.bloomA, 1, [0, 1]);

    // ===== 5. composite to screen
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, T.bloomA.tex);
    gl.uniform1i(PP.u.uBloom, 1);
    gl.uniform1f(PP.u.uExposure, this.exposure);
    blit(T.scene, null, 2, [0, 0]);
    gl.enable(gl.DEPTH_TEST);
  }
}

function invert4(m, out) {
  const a = m;
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
  const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
  const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return M.identity(out);
  det = 1 / det;
  out[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
  out[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
  out[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
  out[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
  out[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
  out[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
  out[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
  out[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
  out[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
  out[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
  out[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
  out[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
  out[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det;
  out[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
  out[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det;
  out[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
  return out;
}
