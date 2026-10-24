import { bayer8 } from '../../lib/glsl';

/** half sizes of the satellites' prisms in moon radii: core, ui, content */
export const PRISMS = [
  [0.09, 0.09, 0.09],
  [0.14, 0.055, 0.055],
  [0.15, 0.105, 0.036],
] as const;

const vec3s = (list: readonly (readonly number[])[]) => {
  let out = '';
  for (const v of list) out += `${out ? ',' : ''}vec3(${v.join(',')})`;
  return out;
};

/**
 * The Fumadocs icon as a lit sphere with its layers in orbit, one depth-tested scene: the moon
 * (analytic sphere), the orbit rings (hairline ellipses) and three toon prisms (analytic boxes).
 * Shading is per cell (`uCell` CSS px) and 1-bit through an ordered dither; rims, edges and rings
 * are drawn at device resolution. The canvas spans 3.2 x 2.2 moon radii around the moon.
 */
export const moonFragment = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform float uCell;
uniform float uSpin;
uniform float uOutline;
uniform float uDark;
uniform vec3 uLight;
uniform vec3 uLit;
uniform vec3 uPaper;
uniform vec3 uInk;
// a, b (moon radii), in-plane tilt (radians), drawn fraction
uniform vec4 uOrbit[2];
// centre (moon radii, y up, z toward the viewer), w: 0 hidden, 1 shown, 2 inverted
uniform vec4 uPrism[3];
uniform vec4 uPrismRotation[3];

out vec4 color;

${bayer8}

const vec3 PRISM[3] = vec3[](${vec3s(PRISMS)});
const float TILT = 0.36;
const float TAU = 6.2831853;

vec3 toSphere(vec3 v) {
  float c = cos(uSpin), s = sin(uSpin);
  vec3 r = vec3(v.x, cos(TILT) * v.y - sin(TILT) * v.z, sin(TILT) * v.y + cos(TILT) * v.z);
  return vec3(c * r.x + s * r.z, r.y, -s * r.x + c * r.z);
}

vec3 rotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.103, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

void main() {
  float radius = uResolution.x / 3.2;
  float cellPx = uCell * uDpr;
  vec2 frag = gl_FragCoord.xy - uResolution * 0.5;
  vec2 cell = floor(frag / cellPx);
  // the cell's centre and the pixel itself, in moon radii
  vec2 pc = (cell + 0.5) * cellPx / radius;
  vec2 pf = frag / radius;
  float threshold = bayer8(cell);

  vec4 col = vec4(0.0);
  float depth = -1e9;

  // the moon: large cells (the mosaic) keep a blocky silhouette, small ones a true circle
  float rim = length(frag) - radius;
  if (uCell > 4.5 ? dot(pc, pc) <= 1.0 : rim <= 0.0) {
    depth = sqrt(max(0.0, 1.0 - dot(pf, pf)));
    if (uOutline > 0.5 && rim > -uDpr) {
      col = vec4(uLit, 1.0);
    } else {
      vec2 p = pc / max(1.0, length(pc));
      vec3 n = vec3(p, sqrt(max(0.0, 1.0 - dot(p, p))));
      // maria: large lowlands, a lighter halftone by day and gaps in the earthshine by night
      vec3 q = toSphere(n);
      float maria = smoothstep(0.46, 0.54, noise(q * 1.6 + 3.0) * 0.75 + noise(q * 3.8) * 0.25);
      float level = smoothstep(0.0, 0.48, dot(n, uLight)) * (1.0 - 0.3 * maria);
      // earthshine: the night side keeps the dither's sparsest level
      level = max(level, (1.0 - maria) * 0.07);
      col = vec4(level > threshold ? uLit : uPaper, 1.0);
    }
  }

  // the prisms: rays straight down the view axis, intersected with each box
  for (int i = 0; i < 3; i++) {
    vec4 at = uPrism[i];
    vec3 size = PRISM[i];
    vec2 rel = pf - at.xy;
    if (at.w < 0.5 || dot(rel, rel) > dot(size, size)) continue;
    vec4 back = vec4(-uPrismRotation[i].xyz, uPrismRotation[i].w);
    vec3 o = rotate(back, vec3(rel, 4.0 - at.z));
    vec3 d = rotate(back, vec3(0.0, 0.0, -1.0));
    vec3 t1 = (-size - o) / d;
    vec3 t2 = (size - o) / d;
    vec3 tmin = min(t1, t2);
    vec3 tmax = max(t1, t2);
    float near = max(max(tmin.x, tmin.y), tmin.z);
    float far = min(min(tmax.x, tmax.y), tmax.z);
    if (near > far || 4.0 - near <= depth) continue;
    depth = 4.0 - near;
    vec3 face = -sign(d) * step(tmin.yzx, tmin) * step(tmin.zxy, tmin);
    vec3 hit = o + d * near;
    // distance to the nearest edge of the face, in device px
    vec3 e = size - abs(hit) + abs(face);
    float edge = min(min(e.x, e.y), e.z) * radius;
    // two flat tones, lit faces on the paper's side of the ink pair, a narrow dither band between
    float lit = smoothstep(0.12, 0.32, dot(rotate(uPrismRotation[i], face), uLight));
    bool bright = (lit > threshold) != (at.w > 1.5);
    vec3 light = uDark > 0.5 ? uInk : uPaper;
    vec3 dark = uDark > 0.5 ? uPaper : uInk;
    col = vec4(edge < uDpr ? uInk : bright ? light : dark, 1.0);
  }

  // the orbit rings: hairlines with their true depth, so the moon hides the back half
  for (int k = 0; k < 2; k++) {
    vec4 o = uOrbit[k];
    float c = cos(o.z), s = sin(o.z);
    vec2 screen = vec2(pf.x, -pf.y);
    vec2 e = vec2(screen.x * c + screen.y * s, -screen.x * s + screen.y * c);
    vec2 u = e / o.xy;
    float f = dot(u, u) - 1.0;
    float gap = abs(f) / length(2.0 * e / (o.xy * o.xy)) * radius;
    if (gap > 2.5 * uDpr) continue;
    float angle = atan(u.y, u.x);
    // the pen starts at the right end and runs the way the satellites go
    if (mod(-angle, TAU) > o.w * TAU) continue;
    float z = sqrt(o.x * o.x - o.y * o.y) * u.y / length(u);
    if (z <= depth) continue;
    // a paper halo cuts the ring out of whatever it crosses
    if (col.a > 0.0) col.rgb = uPaper;
    float cover = clamp(0.5 * uDpr + 0.5 - gap, 0.0, 1.0) * 0.82;
    col = vec4(uInk * cover + col.rgb * (1.0 - cover), cover + col.a * (1.0 - cover));
  }

  color = col;
}
`;
