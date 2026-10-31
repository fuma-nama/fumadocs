import { bayer8 } from './dither';
import { mix, type Rect, steer } from './motion';
import { cssRgb, isDark, onTheme } from './theme';

/** column-major, as GL takes it */
export type Mat4 = Float32Array;
export type Vec3 = [x: number, y: number, z: number];
export type Shape = 'box' | 'cylinder' | 'prism' | 'sphere';

/** `clear` isn't drawn: a hole down to the page; `figure` is the first of a figure's own materials */
export const MATERIAL = {
  paper: 0,
  grey: 1,
  ink: 2,
  accent: 3,
  yellow: 4,
  hazard: 5,
  floor: 6,
  clear: 7,
  figure: 8,
} as const;

export interface PartSpec {
  shape: Shape;
  /** parts with one id read as one solid: the outline runs round it, not between its parts */
  id: number;
  material: number;
  shadow: boolean;
  /** takes the shadows cast on it, unless false */
  receive?: boolean;
}

type Palette = Record<'lit' | 'shade' | 'pen' | 'line' | 'accent' | 'yellow', Vec3>;
/** the page's colour tokens, as 0-1 channels, and whether its theme is the dark one */
type Page = Record<'paper' | 'ink' | 'sun' | 'orange' | 'yellow', Vec3> & { night: boolean };

/** the landing's palette: ink on paper, the other way round at night, shadows in its lines' tone */
export function housePalette({ paper, ink, sun, orange, yellow, night }: Page): Palette {
  const k = night ? 0.75 : 0.82;
  const line: Vec3 = [mix(paper[0], ink[0], k), mix(paper[1], ink[1], k), mix(paper[2], ink[2], k)];
  return {
    lit: night ? ink : paper,
    shade: night ? paper : ink,
    pen: ink,
    line,
    accent: night ? orange : sun,
    yellow,
  };
}

interface MeshOptions {
  parts: readonly PartSpec[];
  /** the figure's state for the frame about to be drawn, `dt` ms after the last, at most 50; 0 after a rest */
  onFrame: (dt: number) => void;
  /** the canvas's CSS px size before the frame that shows it */
  onResize: (width: number, height: number) => void;
  /**
   * The figure's own GLSL: `scene` defines `bool figure(int material, vec3 world, vec3 normal,
   * vec2 px, inout vec4 color)` for its materials from MATERIAL.figure, true when it shaded the
   * pixel, its colour premultiplied; `backdrop` defines `vec4 backdrop(vec2 px)` for where nothing
   * drew. `px` counts canvas px from the top left, `uDot` of them a dot; `figure` may read `cell` and
   * `threshold`, the dither's cell and threshold there, laid on its part. Both may declare uniforms,
   * set with `uniform()`, and samplers named as `textures`; those `coverage` names hold coverage
   * alone, kept in one channel and mipmapped, for sampling smaller than they are.
   */
  shader?: {
    scene?: string;
    backdrop?: string;
    textures?: Record<string, TexImageSource>;
    coverage?: readonly string[];
  };
  /** how far a shadow reaches from what casts it, world units along the light */
  reach?: number;
  /** the canvas keeps the box its own CSS gives it, its pixels stretched a fraction to fit */
  stretch?: boolean;
  /** the palette from the page's tokens, on each change of theme; `housePalette` by default */
  theme?: (page: Page) => Palette | undefined;
}

/** a DOM element kept on the drawing, at `at` in its frame and `offset` of its own px after it */
export interface Anchor {
  at: Vec3;
  offset: [x: number, y: number];
  shown: boolean;
}

export type Mesh = NonNullable<ReturnType<typeof createMesh>>;

/**
 * Floats a vertex: place, normal, place on its face; a part: matrix, id, material, show, shadow,
 * taper in x and z, receive, and the matrix its patterns were laid with, zero while they lie on the
 * world
 */
const VERTEX = 8;
const INSTANCE = 40;
const MAP = 1024;
/** canvas px a dot of the drawing's patterns and lines spans at most: denser screens scale it up */
const DOT = 2;
/** the farthest edge, px, the scene pass tells the outline pass of: a byte's whole range */
const EDGE = 8;

const vertexShader = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aFace;
layout(location = 3) in mat4 aModel;
layout(location = 7) in vec4 aData;
layout(location = 8) in vec4 aShape;
layout(location = 9) in mat4 aLaid;
uniform mat4 uView;
uniform vec2 uBuf;
uniform float uDot;
out vec3 vWorld, vNormal, vLaid, vLaidNormal, vLocal, vLocalNormal;
out vec2 vFace;
out vec4 vLaidClip;
flat out mat3 vTurn;
flat out vec4 vData;
flat out float vReceive;
flat out vec2 vSize;

vec2 dots(vec3 p) {
  vec4 c = uView * vec4(p, 1.0);
  return c.xy / c.w * uBuf / (2.0 * uDot);
}

void main() {
  // tapered: aShape.xy times as wide in x and z at y = 0.5 as at y = -0.5, its sides' normals leaning
  // out as they narrow
  vec2 s = mix(vec2(1.0), aShape.xy, aPos.y + 0.5);
  vec3 normal = vec3(aNormal.x, aNormal.y - dot((aShape.xy - 1.0) * aNormal.xz, aPos.xz), aNormal.z);
  vec3 local = vec3(aPos.x * s.x, aPos.y, aPos.z * s.y);
  vec4 world = aModel * vec4(local, 1.0);
  vTurn = transpose(inverse(mat3(aModel)));
  vWorld = world.xyz;
  vNormal = vTurn * normal;
  vLocal = aPos;
  vLocalNormal = aNormal;
  // where it lay when its patterns were laid, in the world and on the canvas, and its normal then
  bool moved = aLaid[3][3] > 0.5;
  vec4 then = (moved ? aLaid : aModel) * vec4(local, 1.0);
  vLaid = then.xyz;
  vLaidClip = uView * then;
  vLaidNormal = (moved ? transpose(inverse(mat3(aLaid))) : vTurn) * normal;
  vFace = aFace;
  vData = aData;
  vReceive = aShape.z;
  // its middle and largest extents on the canvas, dots
  vec3 o = aModel[3].xyz;
  vec2 c = dots(o);
  vec3 e = vec3(length(dots(o + aModel[0].xyz) - c), length(dots(o + aModel[1].xyz) - c), length(dots(o + aModel[2].xyz) - c));
  float big = max(e.x, max(e.y, e.z));
  vSize = vec2(e.x + e.y + e.z - big - min(e.x, min(e.y, e.z)), big);
  // a hidden part lies past the far plane
  gl_Position = aData.z < 0.5 ? vec4(0.0, 0.0, 2.0, 1.0) : uView * world;
}`;

// depth alone, from what casts a shadow and shows: the rest lies past the far plane
const shadowVertex = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 3) in mat4 aModel;
layout(location = 7) in vec4 aData;
layout(location = 8) in vec4 aShape;
uniform mat4 uView;
void main() {
  bool casts = aData.z >= 0.5 && aData.w >= 0.5;
  vec2 s = mix(vec2(1.0), aShape.xy, aPos.y + 0.5);
  vec4 p = vec4(aPos.x * s.x, aPos.y, aPos.z * s.y, 1.0);
  gl_Position = casts ? uView * aModel * p : vec4(0.0, 0.0, 2.0, 1.0);
}`;

const sceneShader = (figure: string) => `#version 300 es
precision highp float;
precision highp int;
in vec3 vWorld, vNormal, vLaid, vLaidNormal, vLocal, vLocalNormal;
in vec2 vFace;
in vec4 vLaidClip;
flat in mat3 vTurn;
flat in vec4 vData;
flat in float vReceive;
flat in vec2 vSize;
// the shape drawn: box, cylinder, prism, sphere
uniform int uShape;
uniform vec3 uLight;
uniform vec3 uLit, uShade, uLine, uAccent, uYellow;
// the canvas's size, and the canvas px the targets' first px lies on, as GL counts them
uniform vec2 uBuf, uOrigin;
// the eye, or at w 0 the way toward it; dots a world unit spans at the camera's focus
uniform vec4 uEye;
uniform float uDot, uUnit, uReach;
uniform mat4 uLightView;
uniform highp sampler2D uMap;
layout(location = 0) out vec4 color;
// what the outline pass reads of each px: its depth, 24 bits; its solid; its edge's distance and way
layout(location = 1) out uvec4 data;
// a solid's silhouette here: its mips mark the blocks the outline pass looks round
layout(location = 2) out float rim;
${bayer8}

// the dither's cell under this pixel, laid on its part's surface, and its threshold
vec2 cell;
float threshold;

bool shadowed(vec3 p) {
  vec3 l = (uLightView * vec4(p, 1.0)).xyz * 0.5 + 0.5;
  if (any(lessThan(l, vec3(0.0))) || any(greaterThan(l, vec3(1.0)))) return false;
  float d = l.z - texture(uMap, l.xy).r;
  return d > 0.002 && d < uReach;
}

${figure}

void main() {
  vec2 px = vec2(gl_FragCoord.x + uOrigin.x, uBuf.y - gl_FragCoord.y - uOrigin.y);
  vec3 n = normalize(vNormal);
  // px to its face's nearer edges in u and v
  vec2 gu = vec2(dFdx(vFace.x), dFdy(vFace.x));
  vec2 gv = vec2(dFdx(vFace.y), dFdy(vFace.y));
  vec2 to = min(vFace, 1.0 - vFace) / max(vec2(length(gu), length(gv)), vec2(1e-6));
  float face = min(to.x, to.y);
  vec3 toward = normalize(uEye.xyz - vWorld * uEye.w);
  float facing = dot(n, toward);
  vec2 gf = vec2(dFdx(facing), dFdy(facing));
  // what its face meets across those edges, in its own space: a box's next faces; a facet's next
  // facets and the caps; a cap's side, at its rim
  vec3 ln = normalize(vLocalNormal);
  vec3 su = vec3(0.0);
  vec3 sv = vec3(0.0);
  if (uShape == 0) {
    vec3 a = abs(ln);
    su = (a.x > 0.5 ? vec3(0.0, 1.0, 0.0) : a.y > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * sign(vFace.x - 0.5);
    sv = (a.x > 0.5 ? vec3(0.0, 0.0, 1.0) : a.y > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)) * sign(vFace.y - 0.5);
  } else if (uShape != 3 && abs(ln.y) > 0.99) {
    float t = atan(vLocal.z, vLocal.x);
    if (uShape == 2) t = (floor(t / 1.0471976) + 0.5) * 1.0471976;
    su = vec3(cos(t), 0.0, sin(t));
  } else if (uShape != 3) {
    sv = vec3(0.0, sign(vFace.y - 0.5), 0.0);
    float t = atan(ln.z, ln.x) + 1.0471976 * sign(vFace.x - 0.5);
    if (uShape == 2) su = vec3(cos(t), 0.0, sin(t));
  }
  // px to its silhouette, where what it meets turns from the eye or so near edge on it shows a sliver
  // at most, or where a smooth part turns away; and the way there
  float edge = facing / max(length(gf), 1e-6);
  vec2 way = -gf;
  su = vTurn * su;
  sv = vTurn * sv;
  if (dot(su, toward) < 0.25 * length(su) && to.x < edge) {
    edge = to.x;
    way = gu * sign(vFace.x - 0.5);
  }
  if (dot(sv, toward) < 0.25 * length(sv) && to.y < edge) {
    edge = to.y;
    way = gv * sign(vFace.y - 0.5);
  }
  // the dither's lattice as it lay on the canvas when its pattern was laid: for a face then edge on,
  // square to that face; a lattice pressed past a dot a cell takes solid tones
  vec2 laid = (vLaidClip.xy / vLaidClip.w * vec2(0.5, -0.5) + 0.5) * uBuf / uDot;
  vec2 jx = dFdx(laid) * uDot;
  vec2 jy = dFdy(laid) * uDot;
  float a = dot(jx, jx) + dot(jy, jy);
  float det = jx.x * jy.y - jx.y * jy.x;
  float root = sqrt(max(a * a - 4.0 * det * det, 0.0));
  float pressed = sqrt((a + root) * 0.5);
  // where its cell's middle lies, so a shadow takes whole cells
  vec3 wx = dFdx(vWorld);
  vec3 wy = dFdy(vWorld);
  vec3 middle = vWorld;
  if (a - root < 0.72) {
    vec3 m = abs(vLaidNormal);
    laid = (m.x > max(m.y, m.z) ? vLaid.zy : m.y > m.z ? vLaid.xz : vLaid.xy) * uUnit;
  } else {
    vec2 off = (floor(laid / 2.0) + 0.5) * 2.0 - laid;
    middle += (wx * (jy.y * off.x - jy.x * off.y) + wy * (jx.x * off.y - jx.y * off.x)) * uDot / det;
  }
  cell = floor(laid / 2.0);
  threshold = bayer8(cell);
  rim = vData.x >= 1.0 && edge < uDot + 1.5 ? 1.0 : 0.0;
  uint z = uint(gl_FragCoord.z * 16777215.0);
  uvec2 w = uvec2(round((normalize(way + vec2(1e-9, 0.0)) * 0.5 + 0.5) * 255.0));
  data = uvec4(z >> 8u, (z & 255u) << 8u | uint(vData.x), uint(round(clamp(edge / ${EDGE.toFixed(1)}, 0.0, 1.0) * 255.0)) << 8u | w.x, w.y << 8u | 1u);
  int material = int(vData.y + 0.5);
  if (material == ${MATERIAL.clear}) {
    color = vec4(0.0);
    return;
  }
  if (material >= ${MATERIAL.figure}) {
    vec4 c = vec4(0.0);
    if (figure(material, vWorld, n, px, c)) {
      color = c;
      return;
    }
  }
  float lambert = dot(n, uLight);
  float tone = clamp((lambert - 0.12) / 0.3, 0.0, 1.0);
  bool dark = vReceive > 0.5 && lambert > 0.0 && shadowed(middle + n * 0.5);
  // the floor writes its depth, so only what stands off it is inked round
  if (material == ${MATERIAL.floor}) {
    color = dark && threshold < 0.25 ? vec4(uLine, 1.0) : vec4(0.0);
    return;
  }
  if (dark) tone = min(tone, 0.55);
  vec3 lit = uLit;
  vec3 shade = uShade;
  if (material == ${MATERIAL.ink}) lit = uShade;
  else if (material == ${MATERIAL.grey}) tone *= 0.78;
  else if (material == ${MATERIAL.accent}) lit = uAccent;
  else if (material == ${MATERIAL.yellow}) {
    lit = uYellow;
    tone = max(tone, 0.6);
  } else if (material == ${MATERIAL.hazard}) {
    lit = fract((vLaid.x + vLaid.y - vLaid.z) / 16.0) < 0.5 ? uYellow : uShade;
    tone = max(tone, 0.6);
  }
  // solid, quarters, solid: two tones on a part or a face too thin for a pattern, a cylinder in
  // bands; its lit tone on a part too small
  bool small = vSize.y < 12.0;
  float across = 1.0 / max(max(length(gu), length(gv)), 1e-6);
  bool thin = vSize.x < (uShape == 1 ? 16.0 : 8.0) || pressed > 2.5 || across < 8.0 * uDot;
  tone = small ? 1.0 : thin ? step(0.5, tone) : floor(tone * 4.0 + 0.5) / 4.0;
  vec3 c = threshold < tone ? lit : shade;
  // a dot wide line in from each edge of its faces, all line on a face under three dots across
  float line = !small && across < 3.0 * uDot ? 1.0 : clamp(uDot + 0.5 - face, 0.0, 1.0);
  color = vec4(mix(c, material == ${MATERIAL.ink} || tone <= 0.5 ? uLit : uShade, line), 1.0);
}`;

const postVertex = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// each canvas px: the parts' colour, or the backdrop where nothing drew, each edge through it
// blended by how far past the px's middle it lies; the pen a dot wide past a nearer part of another
// solid, looked for at the px round it, every other px out to the pen's reach, and along the axes to
// it. A figure without parts, its backdrop alone
const postShader = (backdrop: string, parts: readonly PartSpec[]) => {
  const drawn = `
  ivec2 c = ivec2(gl_FragCoord.xy) - ivec2(uOrigin);
  ivec2 last = textureSize(uData, 0) - 1;
  uvec4 me = texelFetch(uData, c, 0);
  // a solid's silhouette in the two 8 px blocks either way nearest, or its own edge through this px:
  // else its colour as drawn
  ivec2 block = c >> 3;
  ivec2 side = ivec2(greaterThanEqual(c & 7, ivec2(4))) * 2 - 1;
  ivec2 blocks = textureSize(uRim, 3) - 1;
  float rims = texelFetch(uRim, block, 3).r + texelFetch(uRim, clamp(block + side, ivec2(0), blocks), 3).r +
    texelFetch(uRim, clamp(block + ivec2(side.x, 0), ivec2(0), blocks), 3).r +
    texelFetch(uRim, clamp(block + ivec2(0, side.y), ivec2(0), blocks), 3).r;
  bool edged = drawn(me) && edgeOf(me) < 0.5;
  if (rims == 0.0 && !edged) {
    color = drawn(me) ? texelFetch(uColor, c, 0) : backdrop(px);
    return;
  }
  float id = idOf(me);
  float depth = depthOf(me);
  vec4 own = drawn(me) ? texelFetch(uColor, c, 0) : backdrop(px);
  // the nearer part whose edge lies least past this px's middle, px, and its colour; another solid's
  float front = 2.0;
  float pen = 1e9;
  ivec2 near = c;
  for (int k = 0; k < (rims > 0.0 ? 20 : 0); k++) {
    ivec2 at = clamp(c + AROUND[k], ivec2(0), last);
    uvec4 o = texelFetch(uData, at, 0);
    // under 0, this px lies on that part's side of its edge: on its face, or round a corner
    float past = -dot(vec2(AROUND[k]), wayOf(o)) - edgeOf(o);
    bool over = depthOf(o) < depth && past >= 0.0;
    float other = idOf(o);
    pen = over && other >= 1.0 && other != id ? min(pen, past) : pen;
    bool nearest = over && past < front;
    front = nearest ? past : front;
    near = nearest ? at : near;
  }
  // its own edge, and what lies a px past it: farther, or the pen round its solid
  if (edged) {
    ivec2 at = clamp(c + ivec2(round(wayOf(me) * 1.4)), ivec2(0), last);
    uvec4 o = texelFetch(uData, at, 0);
    vec4 back = id >= 1.0 && idOf(o) != id ? vec4(uPen, 1.0) : drawn(o) ? texelFetch(uColor, at, 0) : backdrop(px);
    if (depthOf(o) > depth) own = mix(back, own, 0.5 + edgeOf(me));
  }
  float over = clamp(0.5 - front, 0.0, 1.0);
  float ink = clamp(min(pen + 0.5, uDot) - max(pen - 0.5, 0.0), 0.0, 1.0);
  color = texelFetch(uColor, near, 0) * over + vec4(uPen, 1.0) * ink + own * max(1.0 - over - ink, 0.0);`;
  return `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uColor, uRim;
uniform highp usampler2D uData;
uniform vec3 uPen;
uniform vec2 uBuf, uOrigin;
uniform float uDot;
out vec4 color;
const ivec2 AROUND[20] = ivec2[20](ivec2(0, -3), ivec2(-2, -2), ivec2(0, -2), ivec2(2, -2), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1), ivec2(-3, 0), ivec2(-2, 0), ivec2(-1, 0), ivec2(1, 0), ivec2(2, 0), ivec2(3, 0), ivec2(-1, 1), ivec2(0, 1), ivec2(1, 1), ivec2(-2, 2), ivec2(0, 2), ivec2(2, 2), ivec2(0, 3));
bool drawn(uvec4 t) { return (t.w & 1u) != 0u; }
float depthOf(uvec4 t) { return float(t.x << 8u | t.y >> 8u) + (drawn(t) ? 0.0 : 1.0); }
float idOf(uvec4 t) { return float(t.y & 255u); }
float edgeOf(uvec4 t) { return float(t.z >> 8u) * ${(EDGE / 255).toFixed(6)}; }
vec2 wayOf(uvec4 t) { return vec2(t.z & 255u, t.w >> 8u) / 127.5 - 1.0; }
${backdrop}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y);${parts.length > 0 ? drawn : '\n  color = backdrop(px);'}
}`;
};

function cross(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** a triangle facing the way of its first normal */
function triangle(out: number[], corners: Vec3[], normals: Vec3[], faces: number[][]) {
  const [a, b, c] = corners;
  const n = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
  const facing = n[0] * normals[0][0] + n[1] * normals[0][1] + n[2] * normals[0][2] >= 0;
  for (const i of facing ? [0, 1, 2] : [0, 2, 1])
    out.push(...corners[i], ...normals[i], ...faces[i]);
}

/** corners 0 1 2 3 as two triangles, 0 1 2 and 0 2 3 */
function quad(out: number[], c: Vec3[], n: Vec3[], f: number[][]) {
  triangle(out, [c[0], c[1], c[2]], [n[0], n[1], n[2]], [f[0], f[1], f[2]]);
  triangle(out, [c[0], c[2], c[3]], [n[0], n[2], n[3]], [f[0], f[2], f[3]]);
}

const UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function box(): number[] {
  const out: number[] = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [-0.5, 0.5]) {
      const corners = UV.map(([u, v]) => {
        const p: Vec3 = [0, 0, 0];
        p[axis] = side;
        p[(axis + 1) % 3] = u - 0.5;
        p[(axis + 2) % 3] = v - 0.5;
        return p;
      });
      const normal: Vec3 = [0, 0, 0];
      normal[axis] = Math.sign(side);
      quad(out, corners, [normal, normal, normal, normal], UV);
    }
  }
  return out;
}

/** sides round a ring, smooth or faceted, and its caps */
function prism(sides: number, smooth: boolean): number[] {
  const out: number[] = [];
  const ring = (i: number): Vec3 => {
    const a = (i / sides) * Math.PI * 2;
    return [0.5 * Math.cos(a), 0, 0.5 * Math.sin(a)];
  };
  for (let i = 0; i < sides; i++) {
    const p = ring(i);
    const q = ring(i + 1);
    const mid = ((i + 0.5) / sides) * Math.PI * 2;
    const facet: Vec3 = [Math.cos(mid), 0, Math.sin(mid)];
    const np: Vec3 = smooth ? [2 * p[0], 0, 2 * p[2]] : facet;
    const nq: Vec3 = smooth ? [2 * q[0], 0, 2 * q[2]] : facet;
    const side = [p, q, q, p].map(([x, , z], k): Vec3 => [x, k < 2 ? -0.5 : 0.5, z]);
    quad(
      out,
      side,
      [np, nq, nq, np],
      UV.map(([u, v]) => [smooth ? 0.5 : u, v]),
    );
    for (const y of [-0.5, 0.5]) {
      const n: Vec3 = [0, Math.sign(y), 0];
      const cap = [[0, 0, 0], p, q].map(([x, , z]): Vec3 => [x, y, z]);
      triangle(
        out,
        cap,
        [n, n, n],
        [0.5, 1, 1].map((u) => [u, 0.5]),
      );
    }
  }
  return out;
}

/** an icosahedron split twice, its corners on the sphere */
function sphere(): number[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const coords = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t];
  coords.push(t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1);
  const points: Vec3[] = [];
  for (let i = 0; i < coords.length; i += 3) {
    points.push(normalize([coords[i], coords[i + 1], coords[i + 2]]));
  }
  let faces = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2];
  faces.push(10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5);
  faces.push(2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1);
  for (let level = 0; level < 2; level++) {
    const cache = new Map<string, number>();
    const middle = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!cache.has(key)) {
        const [p, q] = [points[a], points[b]];
        cache.set(key, points.push(normalize([p[0] + q[0], p[1] + q[1], p[2] + q[2]])) - 1);
      }
      return cache.get(key)!;
    };
    const next: number[] = [];
    for (let i = 0; i < faces.length; i += 3) {
      const [a, b, c] = faces.slice(i, i + 3);
      const [ab, bc, ca] = [middle(a, b), middle(b, c), middle(c, a)];
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    faces = next;
  }
  const out: number[] = [];
  for (let i = 0; i < faces.length; i += 3) {
    const face = faces.slice(i, i + 3);
    const corners = face.map((k): Vec3 => [points[k][0] / 2, points[k][1] / 2, points[k][2] / 2]);
    triangle(
      out,
      corners,
      face.map((k) => points[k]),
      face.map(() => [0.5, 0.5]),
    );
  }
  return out;
}

const GEOMETRY: Record<Shape, () => number[]> = {
  box,
  cylinder: () => prism(20, true),
  prism: () => prism(6, false),
  sphere,
};
const SHAPES = Object.keys(GEOMETRY) as Shape[];

export function identity(out: Mat4 = new Float32Array(16)): Mat4 {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

const scratch = new Float32Array(16);
export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  for (let c = 0; c < 16; c += 4) {
    for (let row = 0; row < 4; row++) {
      scratch[c + row] =
        a[row] * b[c] + a[4 + row] * b[c + 1] + a[8 + row] * b[c + 2] + a[12 + row] * b[c + 3];
    }
  }
  out.set(scratch);
  return out;
}
const IDENTITY = identity();

/** the turn that stands a part's y axis along z, toward the viewer: a cylinder so turned faces it */
export const FACING: Vec3 = [Math.PI / 2, 0, 0];

export function transform(
  out: Mat4,
  [x, y, z]: Readonly<Vec3>,
  [rx, ry, rz]: Readonly<Vec3> = [0, 0, 0],
  [sx, sy, sz]: Readonly<Vec3> = [1, 1, 1],
): Mat4 {
  const cx = Math.cos(rx);
  const snx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sny = Math.sin(ry);
  const cz = Math.cos(rz);
  const snz = Math.sin(rz);
  out[0] = cz * cy * sx;
  out[1] = snz * cy * sx;
  out[2] = -sny * sx;
  out[4] = (cz * sny * snx - snz * cx) * sy;
  out[5] = (snz * sny * snx + cz * cx) * sy;
  out[6] = cy * snx * sy;
  out[8] = (cz * sny * cx + snz * snx) * sz;
  out[9] = (snz * sny * cx - cz * snx) * sz;
  out[10] = cy * cx * sz;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[3] = out[7] = out[11] = 0;
  out[15] = 1;
  return out;
}

/** a part `width` across from `a` to `b`: its y axis along them, x, y and z right-handed */
export function between(out: Mat4, a: Readonly<Vec3>, b: Readonly<Vec3>, width: number): Mat4 {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...d) || 1e-3;
  const y: Vec3 = [d[0] / length, d[1] / length, d[2] / length];
  const x = normalize(cross(Math.abs(y[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], y));
  const z = cross(x, y);
  out.set([
    x[0] * width,
    x[1] * width,
    x[2] * width,
    0,
    y[0] * length,
    y[1] * length,
    y[2] * length,
  ]);
  out.set([0, z[0] * width, z[1] * width, z[2] * width, 0], 7);
  out.set([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1], 12);
  return out;
}

export function normalize(v: Readonly<Vec3>): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

export function distance(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

/** a cabinet oblique: faces square to the lens stay square, depth going `depth` CSS px a unit */
interface Oblique {
  width: number;
  height: number;
  scale: number;
  origin: [x: number, y: number];
  depth: [x: number, y: number];
  z: [near: number, far: number];
}

/**
 * A perspective onto a wall at z = 0, CSS px with y down and z toward the eye: a point shows at
 * eye + shift + (p - eye) * focal / (eye z - p z), focal the eye's z and shift none unless given
 */
interface Perspective {
  width: number;
  height: number;
  eye: Vec3;
  focal?: number;
  shift?: [x: number, y: number];
  z: [near: number, far: number];
}

function obliqueView(out: Mat4, { width: w, height: h, scale: s, origin, depth, z }: Oblique) {
  const range = z[0] - z[1];
  out.fill(0);
  out[0] = (2 * s) / w;
  out[5] = (2 * s) / h;
  out[8] = (-2 * s * depth[0]) / w;
  out[9] = (-2 * s * depth[1]) / h;
  out[10] = -2 / range;
  out[12] = (2 * origin[0]) / w - 1;
  out[13] = 1 - (2 * origin[1]) / h;
  out[14] = 1 + (2 * z[1]) / range;
  out[15] = 1;
}

function perspectiveView(
  out: Mat4,
  { width: w, height: h, eye, z, shift = [0, 0], focal }: Perspective,
) {
  const [ex, ey, ez] = eye;
  const f = focal ?? ez;
  // the shift moves the picture after the divide: w's row, scaled, onto x's and y's
  const sx = (2 * shift[0]) / w;
  const sy = (-2 * shift[1]) / h;
  // depth linear in z at the near plane, inside the clip's range at both ends
  const k = (ez - z[0]) / f / (z[0] - z[1]);
  out.fill(0);
  out[0] = 2 / w;
  out[5] = -2 / h;
  out[8] = (1 - (2 * ex) / w - sx) / f;
  out[9] = ((2 * ey) / h - 1 - sy) / f;
  out[10] = -2 * k;
  out[11] = -1 / f;
  out[12] = ((2 * ex * (ez - f)) / w - ez + sx * ez) / f;
  out[13] = (ez - (2 * ey * (ez - f)) / h + sy * ez) / f;
  out[14] = (z[0] + z[1]) * k;
  out[15] = ez / f;
}

/** the light's view of the box from `min` to `max`; returns its depth, world units */
function lightView(out: Mat4, light: Readonly<Vec3>, min: Readonly<Vec3>, max: Readonly<Vec3>) {
  const lz: Vec3 = [-light[0], -light[1], -light[2]];
  const lx = normalize(cross(lz, Math.abs(lz[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const axes = [lx, cross(lx, lz), lz];
  const c: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const ext = [0, 0, 0];
  for (let i = 0; i < 8; i++) {
    const v = [
      (i & 1 ? max : min)[0] - c[0],
      (i & 2 ? max : min)[1] - c[1],
      (i & 4 ? max : min)[2] - c[2],
    ];
    for (const [k, a] of axes.entries()) {
      ext[k] = Math.max(ext[k], Math.abs(v[0] * a[0] + v[1] * a[1] + v[2] * a[2]));
    }
  }
  out.fill(0);
  for (const [k, a] of axes.entries()) {
    const e = ext[k] + 8;
    out[k] = a[0] / e;
    out[4 + k] = a[1] / e;
    out[8 + k] = a[2] / e;
    out[12 + k] = -(c[0] * a[0] + c[1] * a[1] + c[2] * a[2]) / e;
  }
  out[15] = 1;
  return 2 * (ext[2] + 8);
}

/** the scene's clears: no colour, and nothing drawn: at the far plane, no solid and no edge near */
const NOTHING = new Float32Array(4);
const NONE = new Uint32Array([0xffff, 0xff00, 0xff80, 0x8000]);

/**
 * Draws in the frames where something changed, at the display's rate, only while on screen: the
 * canvas filling its parent at the screen's resolution, DOT canvas px a dot at most, coarser while
 * the GPU lags; its anchors laid in the same frame
 */
export function createMesh(
  canvas: HTMLCanvasElement,
  { parts, onFrame, onResize, shader = {}, reach = Infinity, stretch = false, theme }: MeshOptions,
) {
  const context = canvas.getContext('webgl2', {
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  });
  if (!context) return null;
  const gl = context;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');

  const shaders: WebGLShader[] = [];
  function program(vertex: string, fragment: string): WebGLProgram {
    const p = gl.createProgram();
    for (const [k, source] of [vertex, fragment].entries()) {
      const s = gl.createShader(k ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      gl.attachShader(p, s);
      shaders.push(s);
    }
    gl.linkProgram(p);
    return p;
  }
  const none = 'bool figure(int m, vec3 world, vec3 n, vec2 px, inout vec4 c) { return false; }';
  const scene = program(vertexShader, sceneShader(shader.scene ?? none));
  const shadow = program(shadowVertex, '#version 300 es\nvoid main() {}');
  const backdrop = shader.backdrop ?? 'vec4 backdrop(vec2 px) { return vec4(0.0); }';
  const post = program(postVertex, postShader(backdrop, parts));
  const programs = [scene, shadow, post];
  gl.flush();

  // the parts, a run of slots a shape, each drawn by one call
  const slots: number[] = [];
  const draws: { vao: WebGLVertexArrayObject; vertices: number; count: number; shape: number }[] =
    [];
  let total = 0;
  const runs = SHAPES.map((shape) => {
    const start = total;
    for (const [i, part] of parts.entries()) if (part.shape === shape) slots[i] = total++;
    return [start, total - start];
  });
  const instances = new Float32Array(total * INSTANCE);
  for (const [i, part] of parts.entries()) {
    const at = slots[i] * INSTANCE;
    identity(instances.subarray(at, at + 16));
    instances.set(
      [part.id, part.material, 1, Number(part.shadow), 1, 1, Number(part.receive ?? true)],
      at + 16,
    );
  }
  const instanceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength, gl.DYNAMIC_DRAW);
  const buffers = [instanceBuffer];
  /** a vertex array of `data`, its attributes `sizes` floats each from location 0 on */
  function vertices(data: Float32Array, sizes: number[]) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const stride = sizes.reduce((a, b) => a + b) * 4;
    let offset = 0;
    for (const [k, size] of sizes.entries()) {
      gl.enableVertexAttribArray(k);
      gl.vertexAttribPointer(k, size, gl.FLOAT, false, stride, offset);
      offset += size * 4;
    }
    return vao;
  }
  for (const [shape, [start, count]] of runs.entries()) {
    if (count === 0) continue;
    const data = new Float32Array(GEOMETRY[SHAPES[shape]]());
    const vao = vertices(data, [3, 3, 2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    for (let k = 3; k < 14; k++) {
      gl.enableVertexAttribArray(k);
      gl.vertexAttribPointer(
        k,
        4,
        gl.FLOAT,
        false,
        INSTANCE * 4,
        (start * INSTANCE + 4 * k - 12) * 4,
      );
      gl.vertexAttribDivisor(k, 1);
    }
    draws.push({ vao, vertices: data.length / VERTEX, count, shape });
  }
  const triangleVao = vertices(new Float32Array([-1, -1, 3, -1, -1, 3]), [2]);
  gl.bindVertexArray(null);

  function nearest() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  const map = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, map);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, MAP, MAP);
  nearest();
  const mapTarget = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, mapTarget);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, map, 0);

  // the figure's textures, on the units after the mesh's own four
  const textures = Object.keys(shader.textures ?? {}).map((name) => ({
    name,
    texture: gl.createTexture(),
    coverage: shader.coverage?.includes(name) ?? false,
  }));
  function upload(k: number, source: TexImageSource) {
    gl.activeTexture(gl.TEXTURE4 + k);
    gl.bindTexture(gl.TEXTURE_2D, textures[k].texture);
    const [format, layout] = textures[k].coverage ? [gl.R8, gl.RED] : [gl.RGBA8, gl.RGBA];
    gl.texImage2D(gl.TEXTURE_2D, 0, format, layout, gl.UNSIGNED_BYTE, source);
    if (textures[k].coverage) gl.generateMipmap(gl.TEXTURE_2D);
  }
  for (const [k, source] of Object.values(shader.textures ?? {}).entries()) {
    upload(k, source);
    const min = textures[k].coverage ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  /** the figure's uniforms as last set */
  const custom = new Map<string, number | readonly number[]>();

  // the scene's targets: its colour, what the outline pass reads of each px, and the rims
  const target = gl.createFramebuffer();
  const colorTexture = gl.createTexture();
  const dataTexture = gl.createTexture();
  const rimTexture = gl.createTexture();
  const depthBuffer = gl.createRenderbuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  function size(width: number, height: number) {
    for (const [unit, texture, format, layout, type] of [
      [1, colorTexture, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE],
      [2, dataTexture, gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT],
      [3, rimTexture, gl.R8, gl.RED, gl.UNSIGNED_BYTE],
    ] as const) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, layout, type, null);
      nearest();
    }
    // mips down to 8 px blocks
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 3);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    for (const [k, texture] of [colorTexture, dataTexture, rimTexture].entries()) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + k, gl.TEXTURE_2D, texture, 0);
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  let linked: boolean | null = null;
  const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  function uniform(p: WebGLProgram, name: string): WebGLUniformLocation | null {
    let names = locations.get(p);
    if (!names) locations.set(p, (names = new Map()));
    if (!names.has(name)) names.set(name, gl.getUniformLocation(p, name));
    return names.get(name)!;
  }

  const view = identity();
  const eye = new Float32Array(4);
  /** CSS px a world unit spans where the camera is focused */
  let focus = 1;
  const light = identity();
  const lightDir: Vec3 = [0, 1, 0];
  /** the shadows' reach over the light's depth */
  let reachDepth = 1e9;
  let palette: Palette | undefined;
  let wound = false;
  /** the slots changed since the parts last went to the GPU, from and to (past the last) */
  let from = 0;
  let to = total;
  /** a part that casts a shadow, or the light, moved: the shadow map draws again */
  let shadowsMoved = true;
  let changed = true;
  /** the figure's box, CSS px: nothing shows outside it */
  let box: number[] | null = null;
  /** the scene targets' size, canvas px: none till the first frame */
  const room = [0, 0];
  /** parts placed once, and those whose pattern rides them since the camera was set */
  const placed = new Uint8Array(parts.length);
  const anchored = new Uint8Array(parts.length);

  /** part i's float k set to `value`; `casts` when a shadow moves with it, `true` whatever casts it */
  function set(i: number, k: number, value: number, casts: boolean) {
    const at = slots[i] * INSTANCE;
    if (Number.isNaN(at) || instances[at + k] === value) return;
    instances[at + k] = value;
    touched(i);
    if (casts) shadowsMoved = true;
  }
  function touched(i: number) {
    from = Math.min(from, slots[i]);
    to = Math.max(to, slots[i] + 1);
    changed = true;
  }

  function link() {
    linked = programs.every((p) => gl.getProgramParameter(p, gl.LINK_STATUS));
    if (!linked) {
      for (const p of programs) console.error(gl.getProgramInfoLog(p));
      for (const s of shaders) console.error(gl.getShaderInfoLog(s));
    }
    for (const p of programs) for (const s of gl.getAttachedShaders(p) ?? []) gl.detachShader(p, s);
    for (const s of shaders.splice(0)) gl.deleteShader(s);
    if (!linked) return;
    gl.useProgram(scene);
    gl.uniform1i(uniform(scene, 'uMap'), 0);
    gl.useProgram(post);
    for (const [k, name] of ['uColor', 'uData', 'uRim'].entries())
      gl.uniform1i(uniform(post, name), 1 + k);
    for (const p of [scene, post]) {
      gl.useProgram(p);
      for (const [k, { name }] of textures.entries()) gl.uniform1i(uniform(p, name), 4 + k);
    }
  }

  function figureUniforms(p: WebGLProgram) {
    for (const [name, value] of custom) {
      const at = uniform(p, name);
      if (typeof value === 'number') gl.uniform1f(at, value);
      else if (value.length === 2) gl.uniform2fv(at, value);
      else if (value.length === 3) gl.uniform3fv(at, value);
      else gl.uniform4fv(at, value);
    }
  }

  /** the shadow map from back faces, again only when a caster or the light moved */
  function castShadows() {
    gl.useProgram(shadow);
    gl.uniformMatrix4fv(uniform(shadow, 'uView'), false, light);
    gl.bindFramebuffer(gl.FRAMEBUFFER, mapTarget);
    gl.viewport(0, 0, MAP, MAP);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.FRONT);
    for (const draw of draws) {
      gl.bindVertexArray(draw.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, draw.vertices, draw.count);
    }
  }

  /** the parts, their colour and their ids with depth, into the scene's targets, inside `region` */
  function drawParts(width: number, height: number, region: readonly number[]) {
    gl.useProgram(scene);
    figureUniforms(scene);
    gl.uniformMatrix4fv(uniform(scene, 'uView'), false, view);
    gl.uniformMatrix4fv(uniform(scene, 'uLightView'), false, light);
    gl.uniform3fv(uniform(scene, 'uLight'), lightDir);
    gl.uniform1f(uniform(scene, 'uReach'), Math.min(reachDepth, 1e9));
    gl.uniform2f(uniform(scene, 'uBuf'), width, height);
    gl.uniform2f(uniform(scene, 'uOrigin'), region[0], region[1]);
    gl.uniform1f(uniform(scene, 'uDot'), dot);
    gl.uniform4fv(uniform(scene, 'uEye'), eye);
    gl.uniform1f(uniform(scene, 'uUnit'), focus / pitch / dot);
    if (palette) {
      gl.uniform3fv(uniform(scene, 'uLit'), palette.lit);
      gl.uniform3fv(uniform(scene, 'uShade'), palette.shade);
      gl.uniform3fv(uniform(scene, 'uLine'), palette.line);
      gl.uniform3fv(uniform(scene, 'uAccent'), palette.accent);
      gl.uniform3fv(uniform(scene, 'uYellow'), palette.yellow);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, map);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(-region[0], -region[1], width, height);
    // cleared whole, so nothing is loaded, and drawn only inside the region
    gl.clearBufferfv(gl.COLOR, 0, NOTHING);
    gl.clearBufferuiv(gl.COLOR, 1, NONE);
    gl.clearBufferfv(gl.COLOR, 2, NOTHING);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, region[2], region[3]);
    gl.frontFace(wound ? gl.CW : gl.CCW);
    gl.cullFace(gl.BACK);
    for (const draw of draws) {
      gl.uniform1i(uniform(scene, 'uShape'), draw.shape);
      gl.bindVertexArray(draw.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, draw.vertices, draw.count);
    }
    // the outline pass reads the depth packed with the ids: the buffer itself isn't kept
    gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_ATTACHMENT]);
    for (const [k, texture] of [colorTexture, dataTexture, rimTexture].entries()) {
      gl.activeTexture(gl.TEXTURE1 + k);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /** the frame, and a fence after it that the GPU signals once it has drawn it */
  function render() {
    const width = canvas.width;
    const height = canvas.height;
    // the canvas px, as GL counts them, inside the figure's box and `margin` round it: all without one
    const inside = (margin: number) => {
      if (!box) return [0, 0, width, height];
      const x0 = Math.max(0, Math.floor(box[0] / pitch) - margin);
      const y0 = Math.max(0, height - Math.ceil(box[3] / pitch) - margin);
      const x1 = Math.min(width, Math.ceil(box[2] / pitch) + margin);
      const y1 = Math.min(height, height - Math.floor(box[1] / pitch) + margin);
      return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
    };
    // the canvas only inside the box and the outline's reach round it, the parts twice that so all
    // the outline reads is this frame's, into targets that hold just them; the shadow map whole
    const reach = dot + 2;
    const region = inside(2 * reach);
    if (draws.length > 0) {
      if (from < to) {
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        const n = (to - from) * INSTANCE;
        gl.bufferSubData(gl.ARRAY_BUFFER, from * INSTANCE * 4, instances, from * INSTANCE, n);
        from = total;
        to = 0;
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.CULL_FACE);
      if (shadowsMoved) castShadows();
      // whole 8 px blocks, so each of the rim's mips halves the last; grown in 64 px steps, so a
      // moving box seldom needs more
      if (room[0] === 0 || region[2] > room[0] || region[3] > room[1]) {
        const step = (n: number, all: number) =>
          Math.min(Math.ceil(all / 8) * 8, Math.ceil(n / (box ? 64 : 8)) * (box ? 64 : 8));
        room[0] = step(region[2], width);
        room[1] = step(region[3], height);
        size(room[0], room[1]);
      }
      drawParts(width, height, region);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    // what a box leaves out is cleared here, not left to the browser: a frame drawn twice before
    // the page shows it would keep the first one's parts
    if (box) {
      gl.clearBufferfv(gl.COLOR, 0, NOTHING);
      gl.enable(gl.SCISSOR_TEST);
      const [x, y, w, h] = inside(reach);
      gl.scissor(x, y, w, h);
    }
    gl.useProgram(post);
    figureUniforms(post);
    gl.uniform2f(uniform(post, 'uBuf'), width, height);
    gl.uniform2f(uniform(post, 'uOrigin'), region[0], region[1]);
    gl.uniform1f(uniform(post, 'uDot'), dot);
    if (palette) gl.uniform3fv(uniform(post, 'uPen'), palette.pen);
    gl.bindVertexArray(triangleVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    if (box) gl.disable(gl.SCISSOR_TEST);
    shadowsMoved = false;
    if (fence) gl.deleteSync(fence);
    fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  }

  let raf = 0;
  let onScreen = false;
  /** the camera's CSS px size */
  const lens = [1, 1];
  /** CSS px a canvas px spans, canvas px a dot spans, and at most: DOT, or 1 while the GPU lags */
  let pitch = 1;
  let dot = 1;
  let most = DOT;
  let fence: WebGLSync | null = null;
  /**
   * frames the GPU had not drawn by the next lately, net of those it had; ms since the dots last
   * changed, and since a frame was late, and to wait so before trying finer
   */
  let strain = 0;
  let since = Number.POSITIVE_INFINITY;
  let calm = 0;
  let wait = 8000;

  /**
   * In a frame that follows another, `dt` ms after it: the dots coarser while the GPU lags, the last
   * frame not drawn as this one starts, a window of them; finer again after a wait with none late, a
   * wait that doubles each time trying finer comes back late
   */
  function adapt(dt: number) {
    const late = fence !== null && gl.getSyncParameter(fence, gl.SYNC_STATUS) === gl.UNSIGNALED;
    strain = late ? strain + 1 : Math.max(0, strain - 1);
    calm = late ? 0 : calm + dt;
    since += dt;
    const next = most > 1 && strain > 10 ? 1 : most === 1 && calm > wait ? DOT : most;
    if (next === most) return;
    if (next === 1 && since < 3000) wait *= 2;
    most = next;
    strain = since = calm = 0;
    fit();
  }

  interface Pin extends Anchor {
    el: HTMLElement;
    frame: Readonly<Mat4>;
    /** its transform as last written: x, y and its scale, all 0 while hidden */
    drawn: number[];
    /** frames since it last moved, and its own layer while it moves */
    still: number;
    release: (() => void) | undefined;
  }
  const pins: Pin[] = [];

  /** where point `at` of `m` is drawn, CSS px, and how much a CSS px there grows */
  const point = [0, 0, 0];
  function onCanvas(at: Readonly<Vec3>, m: Readonly<Mat4>) {
    const px = m[0] * at[0] + m[4] * at[1] + m[8] * at[2] + m[12];
    const py = m[1] * at[0] + m[5] * at[1] + m[9] * at[2] + m[13];
    const pz = m[2] * at[0] + m[6] * at[1] + m[10] * at[2] + m[14];
    const v = view;
    const w = v[3] * px + v[7] * py + v[11] * pz + v[15];
    point[0] = ((v[0] * px + v[4] * py + v[8] * pz + v[12]) / w + 1) * (lens[0] / 2);
    point[1] = (1 - (v[1] * px + v[5] * py + v[9] * pz + v[13]) / w) * (lens[1] / 2);
    point[2] = 1 / w;
    return point;
  }

  /** CSS px on device px */
  function snap(v: number): number {
    return Math.round(v * devicePixelRatio) / devicePixelRatio;
  }

  /** the anchors on their points, each on a layer of its own while it moves, written when changed */
  function pin() {
    for (const p of pins) {
      let x = 0;
      let y = 0;
      let sx = 0;
      let sy = 0;
      if (p.shown) {
        const m = p.frame;
        const k = onCanvas(p.at, m)[2];
        sx = Math.hypot(m[0], m[1], m[2]) * k;
        sy = Math.hypot(m[4], m[5], m[6]) * k;
        x = snap(point[0] + p.offset[0] * sx);
        y = snap(point[1] + p.offset[1] * sy);
      }
      const d = p.drawn;
      if (d[0] === x && d[1] === y && d[2] === sx && d[3] === sy) {
        if (++p.still > 30) settle(p);
        continue;
      }
      p.drawn = [x, y, sx, sy];
      let transform = 'scale(0)';
      if (p.shown) transform = `translate(${x}px, ${y}px)`;
      if (p.shown && (sx !== 1 || sy !== 1)) transform += ` scale(${sx}, ${sy})`;
      p.el.style.transform = transform;
      p.still = 0;
      p.release ??= steer(p.el);
    }
  }

  function settle(p: Pin) {
    p.release?.();
    p.release = undefined;
  }

  /** the page's tokens, read once they're in and again on each change of theme */
  let themed = false;
  function readTheme() {
    const style = getComputedStyle(canvas);
    if (style.getPropertyValue('--lp-paper') === '') return;
    const token = (name: string) => cssRgb(style.getPropertyValue(`--lp-${name}`));
    const [paper, ink, sun, orange, yellow] = ['paper', 'ink', 'sun', 'orange', 'yellow'].map(
      token,
    );
    const page = { paper, ink, sun, orange, yellow, night: isDark() };
    palette = (theme ?? housePalette)(page) ?? palette;
    themed = changed = true;
  }
  const stopTheme = onTheme(() => (readTheme(), invalidate()));

  /** the last frame's time, NaN once the loop rests */
  let before = Number.NaN;
  function frame(now: number) {
    raf = 0;
    // still compiling: look again next frame rather than block on it
    if (linked === null) {
      const done = (p: WebGLProgram) => gl.getProgramParameter(p, parallel!.COMPLETION_STATUS_KHR);
      if (parallel && !programs.every(done)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      link();
    }
    if (!themed) readTheme();
    onFrame(Number.isNaN(before) ? 0 : Math.min(now - before, 50));
    pin();
    if (linked && changed && canvas.width > 1) {
      changed = false;
      // the first frame after a rest says nothing of the GPU's pace
      if (!Number.isNaN(before)) adapt(now - before);
      render();
    }
    before = now;
    if (raf !== 0) return;
    before = Number.NaN;
    for (const p of pins) settle(p);
  }

  function invalidate() {
    if (raf === 0 && onScreen) raf = requestAnimationFrame(frame);
  }

  function draw() {
    if (!onScreen) return;
    cancelAnimationFrame(raf);
    changed = true;
    frame(performance.now());
  }

  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // the canvas fills its parent, its patterns and lines in dots of as many device px as the ratio
  // rounds to, a CSS px at whole ratios: at most `most` canvas px a dot, finer screens scaling it up
  function fit() {
    const box = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const device = Math.max(1, Math.round(dpr));
    dot = Math.min(device, most);
    pitch = device / (dot * dpr);
    const width = Math.max(1, Math.round(box.width / pitch));
    const height = Math.max(1, Math.round(box.height / pitch));
    if (!stretch) {
      canvas.style.width = `${width * pitch}px`;
      canvas.style.height = `${height * pitch}px`;
    }
    changed = true;
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    room[0] = room[1] = 0;
    onResize(width * pitch, height * pitch);
  }

  const resize = new ResizeObserver(() => (fit(), draw()));
  const visibility = new IntersectionObserver((entries) => {
    const visible = entries[entries.length - 1].isIntersecting;
    if (visible === onScreen) return;
    onScreen = visible;
    if (!onScreen) return pause();
    fit();
    draw();
  });
  canvas.style.imageRendering = 'pixelated';
  resize.observe(canvas.parentElement!);
  visibility.observe(canvas);

  return {
    place(i: number, matrix: Readonly<Mat4>) {
      const at = slots[i] * INSTANCE;
      if (Number.isNaN(at) || matrix.every((v, k) => instances[at + k] === v)) return;
      // first moved since the camera was set: its pattern stays laid as it stood
      if (placed[i] && !anchored[i]) {
        instances.copyWithin(at + 24, at, at + 16);
        anchored[i] = 1;
      }
      placed[i] = 1;
      instances.set(matrix, at);
      touched(i);
      if (instances[at + 19] === 1) shadowsMoved = true;
    },
    show(i: number, on: boolean) {
      set(i, 18, Number(on), instances[slots[i] * INSTANCE + 19] === 1);
    },
    shadow(i: number, on: boolean) {
      set(i, 19, Number(on), true);
    },
    /** part `i` narrowed toward its +y end: `x` and `z` times as wide there as at its -y end */
    taper(i: number, x: number, z = 1) {
      const casts = instances[slots[i] * INSTANCE + 19] === 1;
      set(i, 20, x, casts);
      set(i, 21, z, casts);
    },
    material(i: number, value: number) {
      set(i, 17, value, false);
    },

    camera(camera: Oblique | Perspective) {
      lens[0] = camera.width;
      lens[1] = camera.height;
      // patterns are laid again as each part now shows, till it next moves
      for (let i = 0; i < parts.length; i++) {
        if (!anchored[i]) continue;
        instances.fill(0, slots[i] * INSTANCE + 24, slots[i] * INSTANCE + 40);
        anchored[i] = 0;
        touched(i);
      }
      if ('eye' in camera) {
        perspectiveView(view, camera);
        focus = (camera.focal ?? camera.eye[2]) / camera.eye[2];
        eye.set([...camera.eye, 1]);
      } else {
        obliqueView(view, camera);
        focus = camera.scale;
        // nothing moves on the canvas along its depth, and toward the viewer depth falls
        const way = Math.sign(camera.z[0] - camera.z[1]);
        eye.set([camera.depth[0] * way, camera.depth[1] * way, way, 0]);
      }
      // a camera that turns y over sees every face wound the other way
      wound = view[0] * view[5] - view[4] * view[1] < 0;
      changed = true;
    },
    light(direction: Readonly<Vec3>, min: Readonly<Vec3>, max: Readonly<Vec3>) {
      lightDir.splice(0, 3, ...direction);
      reachDepth = reach / lightView(light, direction, min, max);
      shadowsMoved = changed = true;
    },
    /** a uniform the figure's GLSL declares: a float, or a vec2 to vec4; a frame draws if it changed */
    uniform(name: string, value: number | readonly number[]) {
      const known = custom.get(name);
      const same =
        typeof value === 'number'
          ? known === value
          : typeof known === 'object' &&
            known.length === value.length &&
            known.every((v, k) => v === value[k]);
      if (same) return;
      custom.set(name, typeof value === 'number' ? value : [...value]);
      changed = true;
    },
    /** a new image for texture `name` of `shader.textures` */
    texture(name: string, source: TexImageSource) {
      upload(
        textures.findIndex((t) => t.name === name),
        source,
      );
      changed = true;
    },
    /**
     * Draws only inside `next`, CSS px from the canvas's parent, leaving the rest empty: all the
     * figure shows must lie in it, its backdrop too. `null` draws all of it, as by default.
     */
    clip(next: Rect | null) {
      box = next && [next.x, next.y, next.x + next.w, next.y + next.h];
      changed = true;
    },
    /** where point `at` of `frame` is drawn, CSS px from the canvas's parent's top left */
    project(at: Readonly<Vec3>, frame: Readonly<Mat4> = IDENTITY): [number, number] {
      onCanvas(at, frame);
      return [point[0], point[1]];
    },
    /** the point at z = 0 that `project` draws at `x`, `y` */
    unproject(x: number, y: number): [x: number, y: number] {
      const v = view;
      const nx = (2 * x) / lens[0] - 1;
      const ny = 1 - (2 * y) / lens[1];
      // its clip x and y are nx and ny times its w: a x + b y = e and c x + d y = f
      const [a, b, e] = [v[0] - nx * v[3], v[4] - nx * v[7], nx * v[15] - v[12]];
      const [c, d, f] = [v[1] - ny * v[3], v[5] - ny * v[7], ny * v[15] - v[13]];
      return [(e * d - b * f) / (a * d - b * c), (a * f - e * c) / (a * d - b * c)];
    },
    /** keeps `el` on the drawing, at point `at` of `frame`, a matrix the figure updates in place */
    anchor(el: HTMLElement, frame: Readonly<Mat4> = IDENTITY, at: Vec3 = [0, 0, 0]): Anchor {
      const drawn = [Number.NaN, 0, 0, 0];
      const p: Pin = {
        el,
        frame,
        at,
        offset: [0, 0],
        shown: false,
        drawn,
        still: 0,
        release: undefined,
      };
      pins.push(p);
      return p;
    },
    snap,
    /** canvas px a dot of the drawing's patterns and lines spans */
    get dot() {
      return dot;
    },
    invalidate,
    destroy() {
      pause();
      stopTheme();
      onScreen = false;
      resize.disconnect();
      visibility.disconnect();
      // programs still compiling are left to the context: deleting one mid-compile makes the
      // browser's own poll of it fail (a remount, as StrictMode does, reuses the context)
      if (linked !== null) for (const p of programs) gl.deleteProgram(p);
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      for (const vao of [triangleVao, ...draws.map((d) => d.vao)]) gl.deleteVertexArray(vao);
      for (const p of pins) settle(p);
      for (const texture of [
        map,
        colorTexture,
        dataTexture,
        rimTexture,
        ...textures.map((t) => t.texture),
      ]) {
        gl.deleteTexture(texture);
      }
      if (fence) gl.deleteSync(fence);
      gl.deleteRenderbuffer(depthBuffer);
      gl.deleteFramebuffer(target);
      gl.deleteFramebuffer(mapTarget);
      // the context stays for a remount (StrictMode, HMR) to reuse; its backing store goes now
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}
