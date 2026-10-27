import { bayer8 } from '../../lib/dither';

/**
 * World units are a 1000px page's: the stack stands on the floor, y = 0, with the page on its top
 * (+y), the reader's side is +z. Every part is a box: the four layers top down (ui, core, content,
 * framework), then a post at each corner of the gap under each layer, standing on the layer under
 * it or, for the feet, on the floor.
 */
export const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec3 uEye;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uFwd;
uniform float uFocal;
uniform vec2 uCentre;
uniform vec3 uLight;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uPaper;
uniform float uNight;
uniform vec3 uMin[4];
uniform vec3 uMax[4];
// how far each layer has dithered in, 0 to 1
uniform float uShow[4];
// the posts' x and z off the centre, their half width and their height
uniform vec4 uPost;
// every box together, for rays that miss them all
uniform vec3 uBoundMin;
uniform vec3 uBoundMax;
// the floor's shadow density, and its grid's step, alpha and radius
uniform float uShadow;
uniform vec3 uGrid;
out vec4 color;
${bayer8}
// this pixel's dither threshold, in cells of 2 CSS px
float threshold;

vec3 invert(vec3 d) {
  return 1.0 / mix(d, vec3(1e-9), lessThan(abs(d), vec3(1e-9)));
}

// where the ray enters and leaves, and the axis it enters through
vec3 slab(vec3 ro, vec3 inv, vec3 lo, vec3 hi) {
  vec3 t0 = (lo - ro) * inv;
  vec3 t1 = (hi - ro) * inv;
  vec3 a = min(t0, t1);
  vec3 b = max(t0, t1);
  float tn = max(max(a.x, a.y), a.z);
  float tf = min(min(b.x, b.y), b.z);
  return vec3(tn, tf, tn == a.x ? 0.0 : (tn == a.y ? 1.0 : 2.0));
}

void part(int i, out vec3 lo, out vec3 hi) {
  if (i < 4) {
    lo = uMin[i];
    hi = uMax[i];
    return;
  }
  int gap = (i - 4) / 4;
  int corner = i - 4 - gap * 4;
  float y = gap < 3 ? uMax[gap + 1].y : 0.0;
  vec2 at = vec2(corner == 1 || corner == 3 ? uPost.x : -uPost.x, corner >= 2 ? -uPost.y : uPost.y);
  lo = vec3(at.x - uPost.z, y, at.y - uPost.z);
  hi = vec3(at.x + uPost.z, y + uPost.w, at.y + uPost.z);
}

// the part has dithered in at this pixel; a post with the layer it stands on, the feet with the
// layer on them
bool shows(int i) {
  return uShow[i < 4 ? i : min((i - 4) / 4 + 1, 3)] > threshold;
}

float lit(vec3 p, int self) {
  vec3 inv = invert(uLight);
  vec3 s = slab(p, inv, uBoundMin, uBoundMax);
  if (s.x >= s.y || s.y <= 0.0) return 1.0;
  vec3 lo;
  vec3 hi;
  for (int i = 0; i < 20; i++) {
    if (i == self || !shows(i)) continue;
    part(i, lo, hi);
    s = slab(p, inv, lo, hi);
    if (s.x < s.y && s.y > 0.0) return 0.0;
  }
  return 1.0;
}

void main() {
  vec2 size = uResolution / uDpr;
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  // one CSS px across the screen moves the ray by t world units at t
  vec3 D = uFwd * uFocal + uRight * (px.x - uCentre.x) + uUp * (uCentre.y - px.y);
  vec3 inv = invert(D);
  threshold = bayer8(floor(px / 2.0));
  // a line on each face (a crease gets two), and one outside a silhouette
  float inner = max(0.75, 1.0 / uDpr);
  float outer = max(1.0, 1.0 / uDpr);
  vec3 pen = uNight > 0.5 ? uLit : uShade;
  float ground = D.y < 0.0 ? -uEye.y / D.y : 1e20;

  float best = 1e20;
  int hit = -1;
  int axis = 0;
  bool rim = false;
  vec3 lo;
  vec3 hi;
  vec3 c = 0.5 * (uBoundMin + uBoundMax);
  float far = outer * max(dot(c - uEye, uFwd) / uFocal, 1e-3) * 2.0;
  vec3 s = slab(uEye, inv, uBoundMin - far, uBoundMax + far);
  if (s.x < s.y && s.y > 0.0) {
    for (int i = 0; i < 20; i++) {
      part(i, lo, hi);
      s = slab(uEye, inv, lo, hi);
      if (s.x < s.y && s.x > 0.0 && s.x < best) {
        best = s.x;
        hit = i;
        axis = int(s.z);
      }
    }
    // silhouettes: a near miss of a part in front of whatever the ray reaches
    float depth = min(best, ground);
    for (int i = 0; i < 20; i++) {
      if (i == hit || !shows(i)) continue;
      part(i, lo, hi);
      float guess = max(dot(0.5 * (lo + hi) - uEye, uFwd) / uFocal, 1e-3);
      s = slab(uEye, inv, lo - outer * guess, hi + outer * guess);
      if (s.x < s.y && s.x > 0.0 && s.x < depth) {
        float r = outer * s.x;
        s = slab(uEye, inv, lo - r, hi + r);
        if (s.x < s.y && s.x > 0.0 && s.x < depth) rim = true;
      }
    }
  }
  if (rim) {
    color = vec4(pen, 1.0);
    return;
  }

  if (hit >= 0 && best < ground) {
    // a part still dithering in covers its share of the faces under the canvas with paper
    if (!shows(hit)) {
      color = vec4(uPaper, 1.0);
      return;
    }
    part(hit, lo, hi);
    vec3 p = uEye + best * D;
    vec3 n = vec3(0.0);
    n[axis] = -sign(D[axis]);
    int a1 = axis == 0 ? 1 : 0;
    int a2 = axis == 2 ? 1 : 2;
    // the hit point's screen derivatives on its plane: lines keep their width at any angle
    float nd = dot(n, D);
    vec3 gx = best * (uRight - D * dot(n, uRight) / nd);
    vec3 gy = best * (-uUp + D * dot(n, uUp) / nd);
    float e1 = min(p[a1] - lo[a1], hi[a1] - p[a1]) / length(vec2(gx[a1], gy[a1]));
    float e2 = min(p[a2] - lo[a2], hi[a2] - p[a2]) / length(vec2(gx[a2], gy[a2]));
    bool line = min(e1, e2) < inner;
    // the real page on the ui layer's top, and every layer's front, show through
    bool page = hit == 0 && axis == 1 && n.y > 0.0;
    bool front = hit < 4 && axis == 2 && n.z > 0.0;
    if (page || front) {
      color = line ? vec4(page ? pen : uShade, 1.0) : vec4(0.0);
      return;
    }
    float lambert = dot(n, uLight);
    float tone = clamp((lambert - 0.12) / 0.3, 0.0, 1.0);
    // a face turned away is shade, a cast shadow on a lit face a screen
    if (lambert > 0.0 && lit(p + n * best * 0.5, hit) < 0.5) tone = min(tone, 0.55);
    vec3 col = tone > threshold ? uLit : uShade;
    if (line) col = tone > 0.5 ? uShade : uLit;
    color = vec4(col, 1.0);
    return;
  }

  if (ground < 1e19) {
    vec3 p = uEye + ground * D;
    // the floor dissolves before the canvas' edges, never cut by them
    float edge = smoothstep(0.0, 24.0, min(min(px.x, size.x - px.x), min(px.y, size.y - px.y)));
    if (threshold < uShadow * edge && lit(p + vec3(0.0, 0.01, 0.0), -1) < 0.5) {
      color = vec4(pen, 1.0);
      return;
    }
    // the sheet's grid on the floor, faded round the stack and where its lines crowd
    vec3 gx = ground * (uRight - D * uRight.y / D.y);
    vec3 gy = ground * (-uUp + D * uUp.y / D.y);
    float sx = length(vec2(gx.x, gy.x));
    float sz = length(vec2(gx.z, gy.z));
    float step = uGrid.x;
    float dx = abs(fract(p.x / step + 0.5) - 0.5) * step / sx;
    float dz = abs(fract(p.z / step + 0.5) - 0.5) * step / sz;
    float fade = 1.0 - smoothstep(0.5, 1.0, length(p.xz) / uGrid.z);
    float a = min(dx, dz) < 0.5 ? uGrid.y * fade * edge * smoothstep(5.0, 10.0, step / max(sx, sz)) : 0.0;
    color = vec4(pen * a, a);
    return;
  }
  color = vec4(0.0);
}
`;

export type Vec3 = [number, number, number];

/** the page on the stack's top, a 16:10 screen, a layer's thickness and the gap its posts keep */
export const W = 1000;
export const D = 625;
export const T = 140;
export const GAP = 60;
/** the stack's height at rest, on its feet, and the height a layer settles in from */
export const HEIGHT = 4 * (T + GAP);
export const DROP = GAP;

const DEG = Math.PI / 180;
/** the camera above the floor and round the stack, left of its front */
const ELEV = 32 * DEG;
const YAW = -26 * DEG;
/** its distance in page widths: a long lens, so the stack keeps its shape */
const LENS = 3;
/** the cell's least margin round the stack, a part of the stack's width on screen */
const MARGIN = 0.06;

/** a camera's basis and its principal point, CSS px */
export interface Camera {
  eye: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
  focal: number;
  centre: [number, number];
}

/** a world point in canvas CSS px into `out` */
export function project(cam: Camera, x: number, y: number, z: number, out: number[]) {
  const vx = x - cam.eye[0];
  const vy = y - cam.eye[1];
  const vz = z - cam.eye[2];
  const rx = vx * cam.right[0] + vz * cam.right[2];
  const uy = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
  const d = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
  out[0] = cam.centre[0] + (cam.focal * rx) / d;
  out[1] = cam.centre[1] - (cam.focal * uy) / d;
}

function num(v: number): string {
  return Math.abs(v) < 1e-12 ? '0' : String(+v.toPrecision(9));
}

/**
 * The `matrix3d` that lays a `w` x `h` px element (origin at its top left, placed at the canvas'
 * top left) on the quad `q`: its top left, top right, bottom right and bottom left corners in
 * canvas px, as x, y pairs. A plane seen through a pinhole is a homography, so the element sits on
 * its face exactly (Heckbert's square to quad).
 */
export function quadMatrix(q: readonly number[], w: number, h: number): string {
  const dx1 = q[2] - q[4];
  const dx2 = q[6] - q[4];
  const dx3 = q[0] - q[2] + q[4] - q[6];
  const dy1 = q[3] - q[5];
  const dy2 = q[7] - q[5];
  const dy3 = q[1] - q[3] + q[5] - q[7];
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = q[2] - q[0] + g * q[2];
  const b = q[6] - q[0] + k * q[6];
  const d = q[3] - q[1] + g * q[3];
  const e = q[7] - q[1] + k * q[7];
  return `matrix3d(${num(a / w)},${num(d / w)},0,${num(g / w)},${num(b / h)},${num(e / h)},0,${num(k / h)},0,0,1,0,${num(q[0])},${num(q[1])},0,1)`;
}

/** the box across the stack from the floor to `top` on `cam`'s canvas */
function bounds(cam: Camera, top: number) {
  const point = [0, 0];
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let i = 0; i < 8; i++) {
    project(cam, i & 1 ? W / 2 : -W / 2, i & 2 ? top : 0, i & 4 ? D / 2 : -D / 2, point);
    box.x0 = Math.min(box.x0, point[0]);
    box.x1 = Math.max(box.x1, point[0]);
    box.y0 = Math.min(box.y0, point[1]);
    box.y1 = Math.max(box.y1, point[1]);
  }
  return box;
}

/**
 * The stack's one pose, framed for a cell 1 CSS px wide: the focal length and the principal point
 * scale with the cell's width. The cell takes the aspect ratio of the stack's box on screen with an
 * even margin round it, wide enough for the top layer settling in from above; `face` is a layer's
 * width on screen, a part of the cell's.
 */
function pose() {
  const ce = Math.cos(ELEV);
  const out: Vec3 = [Math.sin(YAW) * ce, Math.sin(ELEV), Math.cos(YAW) * ce];
  const right: Vec3 = [Math.cos(YAW), 0, -Math.sin(YAW)];
  const fwd: Vec3 = [-out[0], -out[1], -out[2]];
  const cam: Camera = {
    eye: [LENS * W * out[0], HEIGHT / 2 + LENS * W * out[1], LENS * W * out[2]],
    fwd,
    right,
    // right x fwd
    up: [-right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1]],
    focal: 1,
    centre: [0, 0],
  };
  const rest = bounds(cam, HEIGHT);
  const reach = bounds(cam, HEIGHT + DROP);
  const margin = Math.max(
    MARGIN * (rest.x1 - rest.x0),
    rest.x0 - reach.x0,
    rest.y0 - reach.y0,
    reach.x1 - rest.x1,
    reach.y1 - rest.y1,
  );
  const span = rest.x1 - rest.x0 + 2 * margin;
  const point = [0, 0];
  project(cam, -W / 2, HEIGHT / 2, D / 2, point);
  const [ax, ay] = point;
  project(cam, W / 2, HEIGHT / 2, D / 2, point);
  return {
    eye: cam.eye,
    fwd,
    right,
    up: cam.up,
    focal: 1 / span,
    centre: [(margin - rest.x0) / span, (margin - rest.y0) / span] as const,
    aspect: span / (rest.y1 - rest.y0 + 2 * margin),
    face: Math.hypot(point[0] - ax, point[1] - ay) / span,
  };
}

export const POSE = pose();
