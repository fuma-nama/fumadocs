import { bayer8 } from '../../lib/dither';
import { distance, MATERIAL } from '../../lib/mesh';

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

/** the named craters, larger than life: latitude, longitude and radius in degrees. Tycho,
 * Copernicus, Kepler, Aristarchus, Plato, Clavius, Langrenus, Theophilus, Grimaldi */
const CRATERS = [
  [-43, -11, 4.5],
  [10, -20, 4.5],
  [8, -38, 2.5],
  [24, -47, 2.4],
  [52, -9, 3.8],
  [-58, -14, 6],
  [-9, 61, 4],
  [-11, 26, 3.6],
  [-5, -68, 4],
] as const;
/** the rest, seeded over the near side largest first: how many, and their least and most radius in
 * degrees; the smallest still reads as a hole at `CELL` */
const FIELD = [
  [4, 5, 7],
  [20, 2.5, 4],
  [80, 1.6, 2.2],
] as const;
/** how far Tycho's rays reach, in its radii */
const RAYS = 11;
/** the relief's texels a side, over the disc, and the slope it stores at full scale: the steeper
 * slopes of foreshortened craters near the limb are clipped */
const RELIEF = 256;
const SLOPE = 2;

type Point = [x: number, y: number, z: number];

/** a point on the moon's near side: x right, y up, z toward the viewer */
function onMoon(lat: number, lon: number): Point {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

/** the chord across the sphere that `degrees` of arc spans */
function chord(degrees: number): number {
  return 2 * Math.sin((degrees * Math.PI) / 360);
}

/** the maria's blobs on the sphere, each radius as a chord */
const MARE_BLOBS: { at: Point; across: number }[] = [];
for (const [lat, lon, r] of MARIA) MARE_BLOBS.push({ at: onMoon(lat, lon), across: chord(r) });

/** how much of a mare a point is in: its blobs' fields, merged */
function mareAt(at: Point): number {
  let field = 0;
  for (const { at: centre, across } of MARE_BLOBS)
    field += Math.max(0, 1 - (distance(at, centre) / across) ** 2);
  return field;
}

/**
 * Visits each texel of the relief (over the disc, row 0 its top) within `reach` of `at` on the
 * sphere, with `u` its distance over `across` and `i` its index
 */
function stamp(at: Point, across: number, reach: number, visit: (u: number, i: number) => void) {
  const half = RELIEF / 2;
  const extent = across * reach;
  const left = Math.max(0, Math.floor((at[0] - extent + 1) * half));
  const right = Math.min(RELIEF - 1, Math.ceil((at[0] + extent + 1) * half));
  const top = Math.max(0, Math.floor((1 - at[1] - extent) * half));
  const bottom = Math.min(RELIEF - 1, Math.ceil((1 - at[1] + extent) * half));
  for (let row = top; row <= bottom; row++) {
    const y = 1 - (row + 0.5) / half;
    for (let col = left; col <= right; col++) {
      const x = (col + 0.5) / half - 1;
      const zz = 1 - x * x - y * y;
      if (zz <= 0) continue;
      const dz = Math.sqrt(zz) - at[2];
      const u = Math.sqrt((x - at[0]) ** 2 + (y - at[1]) ** 2 + dz * dz) / across;
      if (u < reach) visit(u, row * RELIEF + col);
    }
  }
}

/**
 * The moon's near side for the shader's `uRelief`, `RELIEF` texels square over the disc: RG the
 * slope of its height field across the disc (x right, y up, 0.5 flat, `SLOPE` at full scale), B
 * the surface's albedo over 1.25 (the maria darker, Tycho's rays brighter), A where a crater's
 * bowl is. Craters are only relief: bowls, flat floors on the large ones and raised rims, sized to
 * their radius so every one tilts as steeply. Baked once, in a few ms.
 */
export function bakeRelief(): ImageData {
  const size = RELIEF;
  const height = new Float32Array(size * size);
  const bowl = new Uint8Array(size * size);
  const maria = new Float32Array(size * size);
  const rays = new Float32Array(size * size);

  for (const { at, across } of MARE_BLOBS) {
    stamp(at, across, 1, (u, i) => {
      maria[i] += 1 - u * u;
    });
  }

  // the named craters where they are, the rest seeded over the near side, within 80° of its middle
  // and fewer on the maria, no centre in another's bowl
  const craters: { at: Point; r: number; across: number }[] = [];
  for (const [lat, lon, r] of CRATERS) craters.push({ at: onMoon(lat, lon), r, across: chord(r) });
  let seed = 0x2f6b9d1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const limb = Math.cos((80 * Math.PI) / 180);
  for (const [count, least, most] of FIELD) {
    for (let placed = 0, tries = 0; placed < count && tries < count * 50; tries++) {
      const z = limb + random() * (1 - limb);
      const angle = random() * Math.PI * 2;
      const at: Point = [
        Math.sqrt(1 - z * z) * Math.cos(angle),
        Math.sqrt(1 - z * z) * Math.sin(angle),
        z,
      ];
      const r = least + random() * (most - least);
      const across = chord(r);
      if (craters.some((o) => distance(o.at, at) < 1.2 * Math.max(o.across, across))) continue;
      if (mareAt(at) > 0.35 && random() >= 0.25) continue;
      craters.push({ at, r, across });
      placed++;
    }
  }
  for (const { at, r, across } of craters) {
    const floor = r > 5 ? -0.45 : -0.6;
    stamp(at, across, 1.5, (u, i) => {
      if (u < 1) {
        height[i] += across * Math.max(-0.6 * (1 - u * u), floor);
        bowl[i] = 255;
      } else height[i] += across * 0.25 * (1 - (u - 1) / 0.5) ** 2;
    });
  }

  // Tycho's rays: streaks from its centre where two waves round it crest together, brightest near
  // it, fading out by their reach; each drawn along and across in half texels
  const half = size / 2;
  const [tycho] = CRATERS;
  const [tx, ty] = onMoon(tycho[0], tycho[1]);
  const length = Math.sin((tycho[2] * RAYS * Math.PI) / 180) * half;
  const width = half / 64;
  for (let k = 0; k < 64; k++) {
    const phi = (k / 64) * Math.PI * 2;
    const streak = Math.sin(phi * 7) + 0.7 * Math.sin(phi * 12);
    if (streak < 1) continue;
    const peak = Math.min(1, streak - 0.9);
    const ux = Math.cos(phi);
    const uy = Math.sin(phi);
    for (let along = 0; along < length; along += 0.5) {
      const t = along / length;
      const ray = (t < 0.12 ? t / 0.12 : (1 - t) / 0.88) * peak;
      for (let across = -width; across <= width; across += 0.5) {
        const col = Math.floor((tx + 1) * half + ux * along - uy * across);
        const row = Math.floor((1 - ty) * half + uy * along + ux * across);
        if (col < 0 || row < 0 || col >= size || row >= size) continue;
        const i = row * size + col;
        rays[i] = Math.max(rays[i], ray);
      }
    }
  }

  // RG the slope, across two texels and over its full scale, B the albedo, A the bowls: one
  // little-endian word a texel
  const image = new ImageData(size, size);
  const texels = new Uint32Array(image.data.buffer);
  texels.fill(128 | (128 << 8) | (204 << 16));
  const per = size / 4 / SLOPE;
  for (let row = 1; row < size - 1; row++) {
    for (let col = 1; col < size - 1; col++) {
      const i = row * size + col;
      const gx = Math.max(-1, Math.min(1, (height[i + 1] - height[i - 1]) * per));
      const gy = Math.max(-1, Math.min(1, (height[i - size] - height[i + size]) * per));
      const mare = Math.max(0, Math.min(1, (maria[i] - 0.32) / 0.06));
      const albedo = 1 - 0.38 * mare * mare * (3 - 2 * mare) + 0.15 * rays[i];
      const red = (128.5 + 127 * gx) | 0;
      const green = (128.5 + 127 * gy) | 0;
      const blue = ((albedo / 1.25) * 255 + 0.5) | 0;
      texels[i] = red | (green << 8) | (blue << 16) | (bowl[i] << 24);
    }
  }
  return image;
}

/** the moon's and the ring's materials, the figure's own */
export const MOON = MATERIAL.figure;
export const RING = MATERIAL.figure + 1;

/**
 * The moon's and the ring's materials, in the scene's moon radii (x right, y up, z toward the
 * viewer, the moon's centre at the origin). The moon: a true circle with a pen a dot wide round it,
 * its day side lit by the primary yellow, its night side the sky, shaded on cells counted from its
 * middle so they rise with it: 2 dots at rest, `uCell` in the boot's mosaic. The ring: a hairline
 * round the orbit's plane, drawn on to `uOrbit.w` of a turn.
 */
export const figureShader = `
uniform sampler2D uRelief;
uniform float uRadius;
uniform float uCell;
uniform float uDark;
uniform vec4 uOrbit;
uniform vec3 uInk, uPaper;

const float SLOPE = ${SLOPE.toFixed(1)};
// how far the relief's slope tilts the sphere's normal
const float TILT = 1.2;
const float TAU = 6.2831853;

/** the moon's face at disc point at, on its dots counted from its middle, so they ride its rise */
vec3 surface(vec2 at) {
  vec2 cell = floor(at * uRadius / ((uCell < 2.5 ? 2.0 : uCell) * uDot));
  vec2 pc = uCell < 2.5 ? at : (cell + 0.5) * uCell * uDot / uRadius;
  float threshold = bayer8(cell);
  vec2 p = pc / max(1.0, length(pc));
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - dot(p, p))));
  // row 0 of the relief is its top
  vec4 near = textureLod(uRelief, vec2(p.x, -p.y) * 0.5 + 0.5, 0.0);
  // the disc's slope back on the sphere: the screen's axes on its tangent plane, unnormalised,
  // undo the limb's foreshortening
  vec2 slope = (near.rg * 2.0 - 1.0) * SLOPE;
  vec3 lean = slope.x * (vec3(1.0, 0.0, 0.0) - n * n.x) + slope.y * (vec3(0.0, 1.0, 0.0) - n * n.y);
  vec3 normal = normalize(n - TILT * lean);
  float sun = dot(n, uLight);
  // out of the bowls, the relief only catches the sun: a rim's sunlit arc, never a dark ring
  float facing = near.a > 0.5 ? dot(normal, uLight) : max(dot(normal, uLight), sun);
  // brightness: the surface's albedo, the relief's light and a crisp terminator, the only way
  // into the night side; a bowl's wall turned from the sun is in shade
  bool hollow = near.a > 0.5 && sun > 0.15 && facing < 0.05;
  float day = smoothstep(-0.04, 0.22, sun);
  float b = hollow ? 0.0 : near.b * 1.25 * clamp(facing, 0.0, 1.0) * day;
  // dark: one ramp from the night sky to the pale surface, then to the sun
  if (uDark > 0.5)
    return b < 0.6 ? (b / 0.6 > threshold ? uInk : uPaper) : ((b - 0.6) / 0.4 > threshold ? uYellow : uInk);
  // light: the day side yellow with ink dots for shade, paper only across the terminator
  if (hollow) return uInk;
  float shade = 0.5 * clamp(1.0 - b / 0.6, 0.0, 1.0) * day;
  return threshold < shade ? uInk : threshold >= 1.0 - day * (1.0 - shade) ? uYellow : uPaper;
}

vec4 moon(vec2 at) {
  // canvas px past its rim: its edge and the dot of pen inside it blended across the px
  float rim = (length(at) - 1.0) * uRadius;
  if (rim > 0.5) discard;
  float cover = clamp(0.5 - rim, 0.0, 1.0);
  vec3 pen = uDark > 0.5 ? uYellow : uInk;
  vec3 c = mix(surface(at), pen, clamp(rim + uDot + 0.5, 0.0, 1.0));
  return vec4(c * cover, cover);
}

vec4 ring(vec2 at) {
  float c = cos(uOrbit.z), s = sin(uOrbit.z);
  vec2 screen = vec2(at.x, -at.y);
  vec2 e = vec2(screen.x * c + screen.y * s, -screen.x * s + screen.y * c);
  vec2 u = e / uOrbit.xy;
  // dots off the ellipse
  vec2 g = 2.0 * e / (uOrbit.xy * uOrbit.xy);
  float gap = abs(dot(u, u) - 1.0) / length(g) * uRadius / uDot;
  // the pen a dot wide starts at the right end and runs the way the satellites go; a dot of paper
  // either side cuts the ring out of whatever it crosses
  if (gap >= 1.5 || mod(-atan(u.y, u.x), TAU) > uOrbit.w * TAU) discard;
  return vec4(mix(uPaper, uInk, clamp((0.5 - gap) * uDot + 0.5, 0.0, 1.0)), 1.0);
}

bool figure(int material, vec3 world, vec3 normal, vec2 px, inout vec4 color) {
  color = material == ${MOON} ? moon(world.xy) : ring(world.xy);
  return true;
}
`;

/**
 * The star field over the sky's `CELL` px cells, counted from its top left, where nothing else is
 * drawn: bright stars rest as lit pluses and every few seconds sparkle up to a star, some to a
 * burst, and back; faint ink dots thin out toward the horizon and glint for a tick now and then;
 * every so often a shooting star crosses the upper sky, its trail dithering away behind it.
 * Stepped on `uTwinkle`, ticks; none while the boot's mosaic is coarser than its cells.
 */
export const skyShader = `
${bayer8}
uniform float uTwinkle;
// a shooting star: its head on the sky's cells, its side (0: none) and slope
uniform vec4 uShoot;
uniform float uCell;
uniform vec3 uInk, uSun;

const uint BLOCK = 26u;
// a shooting star's trail, cells, and its solid start
const float SHOOT_TRAIL = 30.0;
const float SHOOT_SOLID = 5.0;

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

vec4 backdrop(vec2 px) {
  if (uCell > ${CELL.toFixed(1)}) return vec4(0.0);
  vec2 cell = floor(px / (${CELL.toFixed(1)} * uDot));
  vec2 grid = floor(uBuf / (${CELL.toFixed(1)} * uDot));
  // a shooting star, its head a lit plus, its trail a staircase one cell thick
  if (uShoot.z != 0.0) {
    if (sparkle(cell - uShoot.xy, 1) != 0) return vec4(uSun, 1.0);
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
  return s == 0 ? vec4(0.0) : vec4(s == 1 && bright ? uSun : uInk, 1.0);
}
`;
