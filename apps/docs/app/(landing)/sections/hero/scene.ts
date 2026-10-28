import { bayer8 } from '../../lib/dither';

/**
 * The drawing's box, in moon radii: the ring and its prisms reach `REACH` either side of the moon's
 * centre, which sits `HORIZON` over the horizon, the box's bottom edge.
 */
export const REACH = 1.46;
export const HORIZON = 0.76;
/** the moon's crown over the horizon, her seat */
export const CROWN = HORIZON + 1;
/** the dither's cell at rest, CSS px: the moon's dots and the stars */
export const CELL = 3;

/**
 * The satellites in the order they pop: their layer, their prism's half sizes in moon radii, phase in
 * turns (0 the ring's right end, 0.25 its front), the unit axis they tumble round and seconds a turn
 * of it. A third of a turn or more apart, so the moon hides one at most, none at boot.
 */
export const SATELLITES = [
  { layer: 'core', size: [0.09, 0.09, 0.09], phase: 0.25, axis: [0.28, 0.94, 0.19], spin: 16 },
  { layer: 'ui', size: [0.14, 0.055, 0.055], phase: 0.95, axis: [0.89, 0.36, 0.27], spin: 20 },
  { layer: 'content', size: [0.15, 0.105, 0.036], phase: 0.55, axis: [0.17, 0.51, 0.85], spin: 24 },
] as const;

/** the near side's maria, blobs that merge: latitude, longitude and radius in degrees */
const MARIA = [
  // Oceanus Procellarum
  [40, -55, 10],
  [28, -58, 12],
  [15, -60, 12],
  [2, -56, 11],
  [-10, -48, 10],
  [20, -45, 9],
  [5, -42, 9],
  [-18, -43, 6],
  // Imbrium
  [35, -17, 14],
  [41, -8, 8],
  [27, -27, 9],
  [30, -6, 8],
  // Serenitatis, Tranquillitatis
  [28, 17, 9],
  [10, 26, 8],
  [5, 35, 8],
  [14, 32, 6],
  [-2, 39, 6],
  // Crisium, Fecunditatis, Nectaris
  [17, 59, 8],
  [-5, 50, 7],
  [-12, 52, 6],
  [2, 55, 5],
  [-15, 35, 5],
  // Nubium, Cognitum, Humorum, Insularum, Vaporum, Medii
  [-20, -15, 8],
  [-15, -22, 6],
  [-10, -26, 5],
  [-24, -39, 6],
  [8, -28, 6],
  [13, 4, 4],
  [2, 1, 3],
  // Frigoris
  [57, -30, 4],
  [56, -12, 4],
  [56, 5, 4],
  [58, 20, 4],
  [60, -45, 3.5],
];

/** craters, larger than life: latitude, longitude and radius in degrees, how far their rays reach
 * in radii (0: none). Tycho, Copernicus, Kepler, Aristarchus, Plato, Clavius, Langrenus,
 * Theophilus, Grimaldi */
const CRATERS = [
  [-43, -11, 4.5, 11],
  [10, -20, 4.5, 7],
  [8, -38, 2.5, 0],
  [24, -47, 2.4, 0],
  [52, -9, 3.8, 0],
  [-58, -14, 6, 0],
  [-9, 61, 4, 0],
  [-11, 26, 3.6, 0],
  [-5, -68, 4, 0],
];

/** a point on the moon's near side: x right, y up, z toward the viewer */
function onMoon(lat: number, lon: number): [number, number, number] {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

/** each crater for the shader's `uCrater`: its centre and the sine of its radius */
export const CRATER_UNIFORMS: [number, number, number, number][] = [];
for (const [lat, lon, r] of CRATERS) {
  CRATER_UNIFORMS.push([...onMoon(lat, lon), Math.sin((r * Math.PI) / 180)]);
}

/**
 * The moon's face over its disc, `size` px square, for the shader's `uFace`: R the maria's merging
 * field, G the rays, B the crater within 2 of its radii (16 a step, so a colour conversion can't
 * change it; 255: none). Drawn on a 2D canvas, so it costs well under a millisecond; `null` when the
 * page has no canvas memory left for it.
 */
export function drawFace(size: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const half = size / 2;
  ctx.fillStyle = 'rgb(0 0 255)';
  ctx.fillRect(0, 0, size, size);
  /** traces a cap of `r` degrees round (lat, lon), the ellipse it shows as; false past the limb */
  const cap = (lat: number, lon: number, r: number, scale = 1): boolean => {
    const [x, y, z] = onMoon(lat, lon);
    if (z <= 0.05) return false;
    const across = Math.sin((r * Math.PI) / 180) * half;
    ctx.setTransform(1, 0, 0, 1, (x + 1) * half, (1 - y) * half);
    ctx.rotate(Math.atan2(-y, x));
    ctx.scale(z, 1);
    ctx.beginPath();
    ctx.arc(0, 0, across * scale, 0, Math.PI * 2);
    return true;
  };
  for (let k = 0; k < CRATERS.length; k++) {
    const [lat, lon, r] = CRATERS[k];
    if (!cap(lat, lon, r * 2)) continue;
    ctx.fillStyle = `rgb(0 0 ${k * 16 + 8})`;
    ctx.fill();
  }
  // the channels add up from here: maria in red, rays in green
  ctx.globalCompositeOperation = 'lighter';
  for (const [lat, lon, r] of MARIA) {
    if (!cap(lat, lon, r)) continue;
    // (cos d - cos r) / (1 - cos r), nearly 1 - (d / r)^2
    const across = Math.sin((r * Math.PI) / 180) * half;
    const field = ctx.createRadialGradient(0, 0, 0, 0, 0, across);
    for (const t of [0, 0.25, 0.5, 0.7, 0.85, 1]) {
      field.addColorStop(t, `rgb(${Math.round((1 - t * t) * 255)} 0 0)`);
    }
    ctx.fillStyle = field;
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = size / 64;
  ctx.lineCap = 'round';
  for (let k = 0; k < CRATERS.length; k++) {
    const [lat, lon, r, reach] = CRATERS[k];
    if (reach === 0) continue;
    const [x, y] = onMoon(lat, lon);
    const cx = (x + 1) * half;
    const cy = (1 - y) * half;
    const length = Math.sin((r * reach * Math.PI) / 180) * half;
    for (let i = 0; i < 64; i++) {
      const phi = (i / 64) * Math.PI * 2;
      // uneven rays: where two waves round the crater crest together
      const streak = Math.sin(phi * 7 + k * 2.1) + 0.7 * Math.sin(phi * 12 + k * 4.3);
      if (streak < 1) continue;
      const ex = cx + Math.cos(phi) * length;
      const ey = cy + Math.sin(phi) * length;
      const ray = ctx.createLinearGradient(cx, cy, ex, ey);
      ray.addColorStop(0, 'rgb(0 0 0)');
      ray.addColorStop(0.12, `rgb(0 ${Math.round(Math.min(1, streak - 0.9) * 255)} 0)`);
      ray.addColorStop(1, 'rgb(0 0 0)');
      ctx.strokeStyle = ray;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }
  return canvas;
}

let prisms = '';
for (const { size } of SATELLITES) prisms += `${prisms ? ',' : ''}vec3(${size.join(',')})`;

/**
 * The Fumadocs icon as the moon with its layers in orbit, one depth-tested scene: the moon (an
 * analytic sphere with its near side's face), the ring (a hairline ellipse) and three toon prisms
 * (analytic boxes). Shading is per cell (`uCell` CSS px) and 1-bit through an ordered dither; rims,
 * edges, crater lines and the ring are drawn at device resolution. The canvas is the sky: the moon
 * sits on its bottom edge in the middle (`HORIZON`, `uRadius`), at boot rising from `uRise` radii
 * lower, and its stars twinkle on `uTwinkle`, the tick.
 */
export const moonFragment = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform float uRadius;
uniform float uCell;
uniform float uOutline;
uniform float uRise;
uniform float uTwinkle;
// a shooting star: its head on the sky's cells, its side (0: none) and slope
uniform vec4 uShoot;
uniform float uDark;
uniform vec3 uLight;
uniform vec3 uLit;
uniform vec3 uPaper;
uniform vec3 uInk;
// the face (drawFace): maria, rays, the nearest crater's index
uniform sampler2D uFace;
// centre, sine of the radius
uniform vec4 uCrater[${CRATERS.length}];
// a, b (moon radii), in-plane tilt (radians), drawn fraction
uniform vec4 uOrbit;
// centre (moon radii, y up, z toward the viewer), w: 0 hidden, 1 shown, 2 inverted
uniform vec4 uPrism[3];
uniform vec4 uPrismRotation[3];

out vec4 color;

${bayer8}

const vec3 PRISM[3] = vec3[](${prisms});
const float REACH = ${REACH.toFixed(3)};
const float HORIZON = ${HORIZON.toFixed(3)};
const float CELL = ${CELL.toFixed(1)};
// the star field's blocks, cells a side, a star at most in each, inside it
const uint BLOCK = 26u;
// a shooting star's trail, cells, and its solid start
const float SHOOT_TRAIL = 30.0;
const float SHOOT_SOLID = 5.0;
const float TAU = 6.2831853;

vec3 rotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

uint hash(uvec2 p) {
  uint h = p.x * 0x9e3779b9u ^ p.y * 0x85ebca6bu;
  h = (h ^ (h >> 16)) * 0x7feb352du;
  h = (h ^ (h >> 15)) * 0x846ca68bu;
  return h ^ (h >> 16);
}

// a sparkle's cell \`d\` from its centre at \`level\`: 0 a dot, 1 a plus, 2 a long cross, 3 a burst,
// its arms longer still with ink tips and four ink glints apart at its corners; 1 lit, 2 ink, 0 none
int sparkle(vec2 d, int level) {
  vec2 a = abs(d);
  float far = a.x + a.y;
  if (min(a.x, a.y) == 0.0 && far <= float(level)) return far < 3.0 ? 1 : 2;
  return level == 3 && a.x == 2.0 && a.y == 2.0 ? 2 : 0;
}

/**
 * The star field over the sky's cells, counted from its top left: bright stars rest as lit pluses
 * and every few seconds sparkle up to a star, some to a burst, and back; faint ink dots thin out
 * toward the horizon and glint for a tick now and then; every so often a shooting star crosses the
 * upper sky, its trail dithering away behind it. Stepped on \`uTwinkle\`, ticks.
 */
vec4 stars(vec2 cell, vec2 grid) {
  // a shooting star, its head a lit plus, its trail a staircase one cell thick
  if (uShoot.z != 0.0) {
    if (sparkle(cell - uShoot.xy, 1) != 0) return vec4(uLit, 1.0);
    float behind = (uShoot.x - cell.x) * uShoot.z;
    if (behind > 0.0 && behind < SHOOT_TRAIL && cell.y == floor(uShoot.y - behind * uShoot.w + 0.5)) {
      float fade = (behind - SHOOT_SOLID) / (SHOOT_TRAIL - SHOOT_SOLID);
      return bayer8(cell) > fade ? vec4(uInk, 1.0) : vec4(0.0);
    }
  }

  // fewer toward the horizon, one in 7 bright; a burst's reach clear of the block's edges
  uvec2 block = uvec2(cell) / BLOCK;
  uint h = hash(block);
  float row = (float(block.y) + 0.5) * float(BLOCK) / grid.y;
  if (float(h % 100u) >= mix(70.0, 15.0, row)) return vec4(0.0);
  vec2 d = cell - vec2(block * BLOCK + 4u + uvec2(h >> 8, h >> 16) % (BLOCK - 8u));
  if (max(abs(d.x), abs(d.y)) > 3.0) return vec4(0.0);
  // its twinkle: every 3 to 9 seconds, a bright star sparkles up and back, some to a burst; a
  // faint one glints a plus
  uint g = hash(uvec2(h, 7u));
  uint at = (uint(uTwinkle) + (g >> 8)) % (24u + (g >> 20) % 48u);
  bool bright = g % 7u == 0u;
  bool burst = (g & 16u) == 0u;
  int level = !bright ? (at == 0u ? 1 : 0)
    : at == 1u && burst ? 3 : at == 0u || (at == 2u && burst) ? 2 : 1;
  int s = sparkle(d, level);
  return s == 0 ? vec4(0.0) : vec4(s == 1 && bright ? uLit : uInk, 1.0);
}

/** the sky behind everything: its stars, once the boot's mosaic resolves */
vec4 sky() {
  float px = CELL * uDpr;
  if (uCell > CELL) return vec4(0.0);
  vec2 cell = floor(vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / px);
  return stars(cell, floor(uResolution / px));
}

void main() {
  float radius = uRadius;
  vec2 frag = gl_FragCoord.xy - vec2(uResolution.x * 0.5, (HORIZON - uRise) * radius);
  // over the moon's crown and past the ring's reach: only the sky
  if (frag.y > radius || abs(frag.x) > REACH * radius) {
    color = sky();
    return;
  }
  float cellPx = uCell * uDpr;
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
      // an explicit level: no derivatives in this branch
      vec4 face = textureLod(uFace, p * 0.5 + 0.5, 0.0);
      float mare = smoothstep(0.32, 0.38, face.r);
      vec3 normal = n;
      bool shade = false;
      int k = int(face.b * 255.0 / 16.0);
      if (k < ${CRATERS.length}) {
        // a crater's bowl tilts the surface toward its centre, its rim outward
        vec4 crater = uCrater[k];
        vec3 off = n - crater.xyz * dot(n, crater.xyz);
        float u = length(off) / crater.w;
        float slope = u < 1.0 ? -0.85 * u * u : max(0.0, 0.85 * (1.4 - u) / 0.4);
        normal = normalize(n + off / max(length(off), 1e-5) * slope);
        // the shaded side of its inner rim, a 1px line at the pixel
        vec3 at = vec3(pf, sqrt(max(0.0, 1.0 - dot(pf, pf))));
        vec3 edge = at - crater.xyz * dot(at, crater.xyz);
        float rimGap = abs(length(edge) - crater.w * 0.92) * radius;
        shade = rimGap < 0.5 * uDpr && dot(edge, uLight) > 0.0;
      }
      // the highlands in a halftone of the lit colour, the rays bright, the maria darker: on dark
      // paper fewer dots, on light paper ink in the highlands' paper gaps, by day
      float day = smoothstep(0.0, 0.48, dot(normal, uLight));
      bool light = uDark < 0.5;
      float level = day * (0.75 - (light ? 0.0 : 0.36 * mare) + 0.6 * face.g);
      // earthshine: the night side keeps the dither's sparsest level, the maria dark
      level = max(level, (1.0 - mare) * 0.07);
      bool sea = light && mare > 0.5 && threshold < level + 0.25 * day;
      bool ink = shade || (sea && level <= threshold);
      col = vec4(ink ? uInk : level > threshold ? uLit : uPaper, 1.0);
    }
  } else col = sky();

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

  // the ring: a hairline with its true depth, so the moon hides the back half
  float c = cos(uOrbit.z), s = sin(uOrbit.z);
  vec2 screen = vec2(pf.x, -pf.y);
  vec2 e = vec2(screen.x * c + screen.y * s, -screen.x * s + screen.y * c);
  vec2 u = e / uOrbit.xy;
  float gap = abs(dot(u, u) - 1.0) / length(2.0 * e / (uOrbit.xy * uOrbit.xy)) * radius;
  if (gap <= 2.5 * uDpr) {
    // the pen starts at the right end and runs the way the satellites go
    bool drawn = mod(-atan(u.y, u.x), TAU) <= uOrbit.w * TAU;
    float z = sqrt(uOrbit.x * uOrbit.x - uOrbit.y * uOrbit.y) * u.y / length(u);
    if (drawn && z > depth) {
      // a paper halo cuts the ring out of whatever it crosses
      if (col.a > 0.0) col.rgb = uPaper;
      float cover = clamp(0.5 * uDpr + 0.5 - gap, 0.0, 1.0) * 0.82;
      col = vec4(uInk * cover + col.rgb * (1.0 - cover), cover + col.a * (1.0 - cover));
    }
  }

  color = col;
}
`;
