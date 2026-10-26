import { bayer8 } from '../../lib/glsl';
import { mix, type Rect } from '../../lib/math';

/**
 * World units are the page's CSS px: the stack stands on y = 0 with the page on its top (+y), the
 * reader's side is +z. Every part is a box: the four layers top down (ui, core, content,
 * framework), then a guide post at each corner of each gap between them.
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
uniform float uNight;
uniform float uCell;
uniform vec3 uMin[4];
uniform vec3 uMax[4];
// the posts' x and z off the centre, and their half width
uniform vec3 uPost;
// every box together, for rays that miss them all
uniform vec3 uBoundMin;
uniform vec3 uBoundMax;
// the floor: its shadow's density, the grid's step, alpha and radius, and its bounds on the canvas
uniform float uShadow;
uniform vec3 uGrid;
uniform vec4 uFloor;
out vec4 color;
${bayer8}
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

bool part(int i, out vec3 lo, out vec3 hi) {
  if (i < 4) {
    lo = uMin[i];
    hi = uMax[i];
    return true;
  }
  int gap = (i - 4) / 4;
  int corner = i - 4 - gap * 4;
  float y0 = uMax[gap + 1].y;
  float y1 = uMin[gap].y;
  if (y1 - y0 < 0.5) return false;
  vec2 at = vec2(corner == 1 || corner == 3 ? uPost.x : -uPost.x, corner >= 2 ? -uPost.y : uPost.y);
  lo = vec3(at.x - uPost.z, y0, at.y - uPost.z);
  hi = vec3(at.x + uPost.z, y1, at.y + uPost.z);
  return true;
}

float lit(vec3 p, int self) {
  vec3 inv = invert(uLight);
  vec3 s = slab(p, inv, uBoundMin, uBoundMax);
  if (s.x >= s.y || s.y <= 0.0) return 1.0;
  vec3 lo;
  vec3 hi;
  for (int i = 0; i < 16; i++) {
    if (i == self || !part(i, lo, hi)) continue;
    s = slab(p, inv, lo, hi);
    if (s.x < s.y && s.y > 0.0) return 0.0;
  }
  return 1.0;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  // one CSS px across the screen moves the ray by t world units at t
  vec3 D = uFwd * uFocal + uRight * (px.x - uCentre.x) + uUp * (uCentre.y - px.y);
  vec3 inv = invert(D);
  float threshold = bayer8(floor(px / uCell));
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
    for (int i = 0; i < 16; i++) {
      if (!part(i, lo, hi)) continue;
      s = slab(uEye, inv, lo, hi);
      if (s.x < s.y && s.x > 0.0 && s.x < best) {
        best = s.x;
        hit = i;
        axis = int(s.z);
      }
    }
    // silhouettes: a near miss of a part in front of whatever the ray reaches
    float depth = min(best, ground);
    for (int i = 0; i < 16; i++) {
      if (i == hit || !part(i, lo, hi)) continue;
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
    // the floor dissolves before its bounds, never cut by them
    float edge = smoothstep(
      0.0,
      24.0,
      min(min(px.x - uFloor.x, uFloor.z - px.x), min(px.y - uFloor.y, uFloor.w - px.y))
    );
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

export interface View {
  target: Vec3;
  dist: number;
  /** above the ground, radians */
  elev: number;
  /** round y, radians; negative swings to the left */
  yaw: number;
  /** CSS px */
  focal: number;
  /** the principal point off the canvas centre, CSS px */
  shift: [number, number];
}

/** a view's basis and principal point, written in place by `aim` */
export interface Camera {
  eye: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
  focal: number;
  cx: number;
  cy: number;
}

const FOV = (30 * Math.PI) / 180;

export function focalOf(height: number): number {
  return height / 2 / Math.tan(FOV / 2);
}

export function createCamera(): Camera {
  return {
    eye: [0, 0, 0],
    fwd: [0, 0, 0],
    right: [0, 0, 0],
    up: [0, 0, 0],
    focal: 1,
    cx: 0,
    cy: 0,
  };
}

/** `cam` looking from `view` on a canvas of `width` x `height`; `right` stays level, so straight down has no pole */
export function aim(cam: Camera, view: View, width: number, height: number): Camera {
  const ce = Math.cos(view.elev);
  const sy = Math.sin(view.yaw);
  const cy = Math.cos(view.yaw);
  const ox = sy * ce;
  const oy = Math.sin(view.elev);
  const oz = cy * ce;
  cam.eye[0] = view.target[0] + view.dist * ox;
  cam.eye[1] = view.target[1] + view.dist * oy;
  cam.eye[2] = view.target[2] + view.dist * oz;
  cam.fwd[0] = -ox;
  cam.fwd[1] = -oy;
  cam.fwd[2] = -oz;
  cam.right[0] = cy;
  cam.right[1] = 0;
  cam.right[2] = -sy;
  // right x fwd
  cam.up[0] = -cam.right[2] * cam.fwd[1];
  cam.up[1] = cam.right[2] * cam.fwd[0] - cam.right[0] * cam.fwd[2];
  cam.up[2] = cam.right[0] * cam.fwd[1];
  cam.focal = view.focal;
  cam.cx = width / 2 + view.shift[0];
  cam.cy = height / 2 + view.shift[1];
  return cam;
}

/** a world point in canvas CSS px into `out` (x, y, depth along the view) */
export function project(cam: Camera, x: number, y: number, z: number, out: number[]): number[] {
  const vx = x - cam.eye[0];
  const vy = y - cam.eye[1];
  const vz = z - cam.eye[2];
  const rx = vx * cam.right[0] + vz * cam.right[2];
  const uy = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
  const d = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
  out[0] = cam.cx + (cam.focal * rx) / d;
  out[1] = cam.cy - (cam.focal * uy) / d;
  out[2] = d;
  return out;
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

const corner = [0, 0, 0];

/** the box `lo`..`hi` on the canvas */
export function boundsOf(cam: Camera, lo: Vec3, hi: Vec3): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    project(cam, i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2], corner);
    x0 = Math.min(x0, corner[0]);
    x1 = Math.max(x1, corner[0]);
    y0 = Math.min(y0, corner[1]);
    y1 = Math.max(y1, corner[1]);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** the view at `base`'s angles whose projection of `lo`..`hi` fits `slot`, centred in it */
export function fitView(
  base: Omit<View, 'dist' | 'shift'>,
  lo: Vec3,
  hi: Vec3,
  width: number,
  height: number,
  slot: Rect,
): View {
  const cam = createCamera();
  const view: View = { ...base, dist: 1, shift: [0, 0] };
  let near = 1;
  let far = 1e6;
  for (let i = 0; i < 50; i++) {
    view.dist = Math.sqrt(near * far);
    const box = boundsOf(aim(cam, view, width, height), lo, hi);
    if (box.w > slot.w || box.h > slot.h) near = view.dist;
    else far = view.dist;
  }
  view.dist = far;
  const box = boundsOf(aim(cam, view, width, height), lo, hi);
  view.shift = [
    slot.x + slot.w / 2 - (box.x + box.w / 2),
    slot.y + slot.h / 2 - (box.y + box.h / 2),
  ];
  return view;
}

/**
 * The camera between the page straight on and the rest view, into `out`: `dolly` pulls back (log
 * distance), `tilt` orbits down from overhead, `swing` turns round and moves the framing
 */
export function viewAt(
  out: View,
  from: View,
  to: View,
  dolly: number,
  tilt: number,
  swing: number,
): View {
  for (let i = 0; i < 3; i++) out.target[i] = mix(from.target[i], to.target[i], swing);
  out.dist = Math.exp(mix(Math.log(from.dist), Math.log(to.dist), dolly));
  out.elev = mix(from.elev, to.elev, tilt);
  out.yaw = mix(from.yaw, to.yaw, swing);
  out.focal = to.focal;
  out.shift[0] = mix(from.shift[0], to.shift[0], swing);
  out.shift[1] = mix(from.shift[1], to.shift[1], swing);
  return out;
}
