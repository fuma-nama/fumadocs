import { bayer8 } from '../../lib/dither';
import { mix, type Rect } from '../../lib/motion';
import { COLS, type Frame, ROWS } from './data';

/** clack's symbols, drawn by hand: the Google Fonts build of JetBrains Mono has no box drawing or geometric shapes */
const SYMBOLS = '│└┌◆◇●○◒◐◓◑█↑↓•';
const ASCII = 95;
const GLYPHS = ASCII + SYMBOLS.length;
const ATLAS_COLUMNS = 16;

/** world units, the terminal stands on y = 0 and faces +z */
const SCREEN = { c: [0, 2.2, 1.3], b: [1.89, 1.08] } as const;
/** half size of the 80x24 cell grid on the glass */
const GRID = [1.38, 0.8625] as const;
/** the glass bulges out to this z at its centre */
const GLASS_Z = 1.22;
/** visible extent, for framing */
const BOUNDS = { min: [-2.3, 0, -2.35], max: [2.3, 3.6, 1.3] } as const;

export const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution, uShift, uHorizon;
uniform float uDpr, uYaw, uFocal, uNight, uOpen;
uniform vec3 uEye, uLit, uShade, uAccent;
// uClear: the call to action's edges and foot (stage px), and how far the valley under it is open
uniform vec4 uMoon, uClear, uGlyph;
uniform sampler2D uAtlas, uChars;
out vec4 color;
${bayer8}
// from the front right and above
const vec3 LIGHT = vec3(sin(0.85) * cos(0.62), sin(0.62), cos(0.85) * cos(0.62));
const vec3 BODY_C = vec3(0.0, 2.05, 0.0);
const vec3 BODY_B = vec3(2.3, 1.55, 1.3);
const float BODY_R = 0.2;
const vec3 REAR_C = vec3(0.0, 2.0, -1.65);
const vec3 REAR_B = vec3(1.6, 1.15, 0.7);
const float REAR_R = 0.4;
const vec3 NECK_C = vec3(0.0, 0.32, -0.2);
const vec3 NECK_B = vec3(0.6, 0.22, 0.5);
const vec3 FOOT_C = vec3(0.0, 0.06, -0.1);
const vec3 FOOT_B = vec3(1.35, 0.06, 1.05);
const vec3 SCREEN_C = vec3(${SCREEN.c.join(', ')});
const vec2 SCREEN_B = vec2(${SCREEN.b.join(', ')});
const vec2 GRID_B = vec2(${GRID.join(', ')});
const float GLASS_Z = ${GLASS_Z};
const float GLASS_R = 20.0;
const vec3 SLOT_C = vec3(1.0, 0.82, 1.3);
const vec3 SLOT_B = vec3(0.6, 0.05, 0.1);
const vec3 BOX_MIN = vec3(-2.4, -0.05, -2.45);
const vec3 BOX_MAX = vec3(2.4, 3.7, 1.4);
// three ridges around the terminal, near to far: radius, height, features per radian, ink density
const float RIDGE_R[3] = float[3](70.0, 130.0, 240.0);
const float RIDGE_H[3] = float[3](2.4, 9.0, 30.0);
const float RIDGE_F[3] = float[3](12.0, 7.0, 4.5);
const float RIDGE_D[3] = float[3](0.2, 0.1, 0.04);

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdRecess(vec3 p) { return sdRoundBox(p - SCREEN_C, vec3(SCREEN_B, 0.3), 0.12); }
float sdBulge(vec3 p) { return length(p - vec3(SCREEN_C.xy, GLASS_Z - GLASS_R)) - GLASS_R; }

float sdf(vec3 p) {
  float recess = sdRecess(p);
  float shell = min(sdRoundBox(p - BODY_C, BODY_B, BODY_R), sdRoundBox(p - REAR_C, REAR_B, REAR_R));
  shell = max(max(shell, -recess), -sdRoundBox(p - SLOT_C, SLOT_B, 0.04));
  float stand = min(sdRoundBox(p - NECK_C, NECK_B, 0.06), sdRoundBox(p - FOOT_C, FOOT_B, 0.05));
  return min(min(shell, stand), max(sdBulge(p), recess));
}

vec3 normalAt(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sdf(p + k.xyy * e) + k.yyx * sdf(p + k.yyx * e) +
    k.yxy * sdf(p + k.yxy * e) + k.xxx * sdf(p + k.xxx * e)
  );
}

vec2 boxSpan(vec3 ro, vec3 rd) {
  vec3 r = mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  vec3 t0 = (BOX_MIN - ro) / r;
  vec3 t1 = (BOX_MAX - ro) / r;
  vec3 a = min(t0, t1);
  vec3 b = max(t0, t1);
  return vec2(max(max(a.x, a.y), a.z), min(min(b.x, b.y), b.z));
}

float lit(vec3 ro, vec3 rd) {
  vec2 span = boxSpan(ro, rd);
  if (span.y <= 0.0 || span.x > span.y) return 1.0;
  float t = max(span.x, 0.0);
  for (int i = 0; i < 40; i++) {
    float d = sdf(ro + rd * t);
    if (d < 0.002) return 0.0;
    t += d;
    if (t > span.y) break;
  }
  return 1.0;
}

/** the middle line of a rounded box edge, q = abs(p - c) - (b - r); each edge stops where it meets the others */
bool crease(vec3 q, float lw) {
  return (q.x > 0.0 && q.y > 0.0 && q.z < min(q.x, q.y) && abs(q.x - q.y) < lw) ||
    (q.x > 0.0 && q.z > 0.0 && q.y < min(q.x, q.z) && abs(q.x - q.z) < lw) ||
    (q.y > 0.0 && q.z > 0.0 && q.x < min(q.y, q.z) && abs(q.y - q.z) < lw);
}

float coverage(int glyph, vec2 f) {
  vec2 size = vec2(textureSize(uAtlas, 0));
  vec2 origin = vec2(float(glyph % ${ATLAS_COLUMNS}), float(glyph / ${ATLAS_COLUMNS})) * uGlyph.xy + 1.0;
  vec2 q = origin + clamp(f * uGlyph.zw, vec2(0.5), uGlyph.zw - 0.5);
  return textureLod(uAtlas, vec2(q.x, size.y - q.y) / size, 0.0).r;
}

/** the CRT: phosphor text from the cell buffer; w = world size of a CSS px, facing = |cos| of the view angle */
vec3 screen(vec3 p, float w, float facing) {
  vec2 s = (p.xy - SCREEN_C.xy) / SCREEN_B;
  s *= 1.0 + 0.012 * dot(s, s);
  if (abs(s.y) > uOpen) return uShade;
  if (uOpen < 1.0 && abs(s.y) > uOpen - 1.5 * w / SCREEN_B.y) return uAccent;
  float fp = w / (2.0 * GRID_B.x / ${COLS}.0) / max(facing, 0.25);
  vec2 g = s * SCREEN_B / GRID_B * 0.5 + 0.5;
  vec2 c = vec2(g.x * ${COLS}.0, (1.0 - g.y) * ${ROWS}.0);
  if (c.x < 0.0 || c.y < 0.0 || c.x >= ${COLS}.0 || c.y >= ${ROWS}.0) return uShade;
  ivec2 cell = ivec2(c);
  vec4 data = texelFetch(uChars, ivec2(cell.x, ${ROWS - 1} - cell.y), 0);
  int glyph = int(data.r * 255.0 + 0.5);
  int style = int(data.g * 255.0 + 0.5);
  vec2 f = fract(c);
  float cov;
  if (fp < 0.05) cov = coverage(glyph, f);
  else {
    vec2 o = vec2(fp * 0.3);
    cov = 0.25 * (coverage(glyph, f + vec2(-o.x, -o.y * 0.4)) + coverage(glyph, f + vec2(o.x, o.y * 0.4)) +
      coverage(glyph, f + vec2(o.x * 0.4, -o.y)) + coverage(glyph, f + vec2(-o.x * 0.4, o.y)));
  }
  // text is never dithered: cells too small to resolve fade to their ink density
  cov = mix(cov, data.b, smoothstep(0.45, 0.7, fp));

  vec3 fg = style == 1 ? mix(uShade, uLit, 0.5) : style == 2 ? uAccent : uLit;
  vec3 bg = uShade;
  if (style == 3) { bg = uAccent; fg = uShade; }
  if (style == 4) { bg = uLit; fg = uShade; }
  return mix(bg, fg, cov);
}

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

float ridge(int k, float theta) {
  float x = theta * RIDGE_F[k] + float(k) * 19.7;
  float n = 0.6 * noise(x) + 0.28 * noise(x * 2.3 + 4.1) + 0.12 * noise(x * 5.9 + 9.3);
  return RIDGE_H[k] * (0.08 + 0.92 * n * n * (1.6 - 0.6 * n));
}

// ridge k's height h at this depth under stage column x, lowered into a valley a little wider
// than the call to action, whose hills stay 16px under its foot
float valley(int k, float h, float depth, float x, float cy) {
  float side = smoothstep(uClear.x - 160.0, uClear.x, x) * (1.0 - smoothstep(uClear.y, uClear.y + 160.0, x));
  // the height whose top meets the foot on screen at this depth
  float cap = max(uEye.y + (cy - uClear.z) * depth / uFocal, 1e-3);
  // the hills shrink in shape until a usual peak (0.6 of the ridge) fits, a rarer one eases in
  float low = h * min(1.0, cap / (0.6 * RIDGE_H[k]));
  float knee = 0.8 * cap;
  if (low > knee) low = knee + (cap - knee) * tanh((low - knee) / (cap - knee));
  return mix(h, low, side * uClear.w);
}

/** where a ray from inside leaves the vertical cylinder of radius r around the terminal */
float cylinder(vec3 ro, vec3 rd, float r) {
  float a = dot(rd.xz, rd.xz);
  float b = dot(ro.xz, rd.xz);
  float c = dot(ro.xz, ro.xz) - r * r;
  return (-b + sqrt(max(b * b - a * c, 0.0))) / max(a, 1e-8);
}

void main() {
  vec2 stage = uResolution / uDpr;
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  vec2 centre = stage * 0.5 + uShift;
  vec3 fwd = vec3(-sin(uYaw), 0.0, -cos(uYaw));
  vec3 right = vec3(cos(uYaw), 0.0, -sin(uYaw));
  vec3 ro = uEye;
  vec3 rd = normalize(fwd * uFocal + right * (px.x - centre.x) + vec3(0.0, centre.y - px.y, 0.0));
  float pixel = 1.0 / uFocal;
  float threshold = bayer8(floor(px / 2.0));
  vec3 paper = uNight > 0.5 ? uShade : uLit;
  vec3 pen = uNight > 0.5 ? uLit : uShade;

  // the terminal, sphere traced inside its box; local minima of the distance are its silhouettes
  float hit = -1.0;
  float edge = 1e9;
  float edgeT = 1e9;
  vec2 span = boxSpan(ro, rd);
  if (span.x < span.y && span.y > 0.0) {
    float t = max(span.x, 0.0);
    float d0 = 1e9;
    float t0 = t;
    float d1 = 1e9;
    float t1 = t;
    bool inside = true;
    for (int i = 0; i < 64; i++) {
      float d = sdf(ro + rd * t);
      if (d < 0.2 * t * pixel) { hit = t; break; }
      if (d > d1 && d1 < d0 && d1 < 3.0 * t1 * pixel) {
        // passed close to a surface: find the true closest approach between t0 and t
        float a = t0;
        float b = t;
        for (int j = 0; j < 6; j++) {
          float m1 = mix(a, b, 0.382);
          float m2 = mix(a, b, 0.618);
          if (sdf(ro + rd * m1) < sdf(ro + rd * m2)) b = m2;
          else a = m1;
        }
        float m = 0.5 * (a + b);
        float e = sdf(ro + rd * m) / (m * pixel);
        if (e < edge) { edge = e; edgeT = m; }
      }
      d0 = d1;
      t0 = t1;
      d1 = d;
      t1 = t;
      t += d;
      if (t > span.y) { inside = false; break; }
    }
    // out of steps while skimming a face: that is a silhouette too
    if (hit < 0.0 && inside && d1 / (t1 * pixel) < 3.0) { edge = 0.0; edgeT = t1; }
  }

  float ground = rd.y < -1e-6 ? -ro.y / rd.y : 1e9;
  bool terminal = hit > 0.0 && hit < ground;
  vec3 col = paper;
  float depth = 1e9;

  if (terminal) {
    depth = hit;
    vec3 p = ro + rd * hit;
    float w = hit * pixel;
    vec3 n = normalAt(p, 0.5 * w);
    float recess = sdRecess(p);
    float bulge = sdBulge(p);
    float body = sdRoundBox(p - BODY_C, BODY_B, BODY_R);
    float rear = sdRoundBox(p - REAR_C, REAR_B, REAR_R);
    float neck = sdRoundBox(p - NECK_C, NECK_B, 0.06);
    float foot = sdRoundBox(p - FOOT_C, FOOT_B, 0.05);
    float slot = sdRoundBox(p - SLOT_C, SLOT_B, 0.04);
    // lines keep their screen width on faces seen at a grazing angle
    float lw = 0.75 * w / max(abs(dot(rd, n)), 0.2);
    bool glass = max(bulge, recess) < 0.5 * w;
    float tone;
    if (glass) {
      col = screen(p, w, abs(dot(rd, n)));
      tone = 0.0;
    } else {
      float lambert = dot(n, LIGHT);
      float v = lambert > 0.0 ? lambert * lit(p + n * 2.0 * w, LIGHT) : lambert;
      tone = clamp((v - 0.12) / 0.3, 0.0, 1.0);
      col = tone > threshold ? uLit : uShade;
    }
    // creases: where two parts meet, and the middle of each rounded edge
    bool line = max(abs(body), abs(recess)) < lw || max(abs(bulge), abs(recess)) < lw ||
      max(abs(body), abs(rear)) < lw || max(abs(body), abs(slot)) < lw ||
      max(abs(neck), abs(foot)) < lw || max(abs(neck), abs(body)) < lw;
    if (abs(body) < lw) line = line || crease(abs(p - BODY_C) - (BODY_B - BODY_R), lw);
    if (abs(rear) < lw) line = line || crease(abs(p - REAR_C) - (REAR_B - REAR_R), lw);
    if (abs(foot) < lw) line = line || crease(abs(p - FOOT_C) - (FOOT_B - 0.05), lw);
    if (line) col = glass ? uLit : (tone > 0.5 ? uShade : uLit);
  } else {
    bool sky = true;
    for (int k = 0; k < 3; k++) {
      float t = cylinder(ro, rd, RIDGE_R[k]);
      if (t > ground) {
        // the ground in front: paper, with the terminal's cast shadow as a 50% screen
        depth = ground;
        sky = false;
        vec3 p = ro + rd * ground;
        if (k == 0 && threshold < 0.22 && lit(p + vec3(0.0, 0.002, 0.0), LIGHT) < 0.5) col = pen;
        break;
      }
      vec3 p = ro + rd * t;
      float theta = atan(p.z, p.x);
      float h = ridge(k, theta);
      float along = t * dot(rd, fwd);
      if (uClear.w > 0.0) h = valley(k, h, along, px.x, centre.y);
      if (p.y > h) continue;
      depth = t;
      sky = false;
      float w = t * pixel;
      float next = ridge(k, theta + 0.002);
      if (uClear.w > 0.0) next = valley(k, next, along, px.x, centre.y);
      float slope = (next - h) / (0.002 * RIDGE_R[k]);
      float stipple = bayer8(floor(px / 3.0) + float(k) * 3.0);
      if ((h - p.y) / sqrt(1.0 + slope * slope) < 0.9 * w) col = pen;
      else {
        // slopes facing the light are lighter near the crest, the mass below is one flat screen
        vec3 normal = normalize(vec3(-cos(theta), 1.0, -sin(theta)) * 0.7 + vec3(sin(theta), 0.0, -cos(theta)) * slope * 2.5);
        float crest = 1.0 - step(RIDGE_H[k] * 0.22, h - p.y);
        float density = RIDGE_D[k] + (dot(normal, LIGHT) > 0.3 ? 0.0 : crest * 0.08);
        if (density > stipple) col = pen;
      }
      break;
    }
    if (sky) {
      // the moon, behind the far ridge, shaded on 3px cells like the hero's
      vec3 oc = ro - uMoon.xyz;
      float b = dot(oc, rd);
      float closest = sqrt(max(dot(oc, oc) - b * b, 0.0));
      if (abs(closest - uMoon.w) < 0.5 * -b * pixel) col = uAccent;
      else if (closest < uMoon.w) {
        vec2 cell = floor(px / 3.0);
        vec2 q = (cell + 0.5) * 3.0;
        vec3 rc = normalize(fwd * uFocal + right * (q.x - centre.x) + vec3(0.0, centre.y - q.y, 0.0));
        float bc = dot(oc, rc);
        float hc = uMoon.w * uMoon.w - (dot(oc, oc) - bc * bc);
        vec3 n = hc > 0.0 ? normalize(oc + rc * (-bc - sqrt(hc))) : normalize(oc + rd * (-b - sqrt(uMoon.w * uMoon.w - closest * closest)));
        float maria = smoothstep(0.52, 0.64, noise3(n * 2.3) * 0.65 + noise3(n * 5.3 + 3.1) * 0.35);
        float v = dot(n, LIGHT) * (1.0 - 0.45 * maria);
        float t3 = bayer8(cell);
        if (clamp((v - 0.04) / 0.32, 0.0, 1.0) > t3) col = uAccent;
        else if (t3 < 0.07) col = pen;
      }
    }
  }

  if (edge < 1.25 && edgeT < depth) col = pen;

  // the ground line at the foot of the near ridge, with ticks, drawn out from under the terminal
  if (!terminal && abs(px.x - uHorizon.x) < uHorizon.y) {
    vec2 d = normalize(rd.xz);
    float b = dot(ro.xz, d);
    float base = -b + sqrt(max(b * b - dot(ro.xz, ro.xz) + RIDGE_R[0] * RIDGE_R[0], 0.0));
    vec3 v = vec3(d.x * base, -ro.y, d.y * base);
    float y = px.y - (centre.y - v.y / dot(v, fwd) * uFocal);
    if (abs(y) < 0.5 || (y > 0.0 && y < 6.0 && mod(px.x, 24.0) < 1.0)) col = pen;
  }
  color = vec4(col, 1.0);
}
`;

export type Vec3 = [number, number, number];

export interface View {
  eye: Vec3;
  yaw: number;
  /** CSS px */
  focal: number;
  /** principal point offset from the stage centre, CSS px */
  shift: [number, number];
}

const FOV = (30 * Math.PI) / 180;
/** where the camera ends up, to the left of the terminal */
const YAW = -0.5;

function focalOf(height: number): number {
  return height / 2 / Math.tan(FOV / 2);
}

/** in front of the glass: it covers the stage and the whole cell grid fits */
export function insideView(width: number, height: number): View {
  const focal = focalOf(height);
  const cover = Math.min((SCREEN.b[0] * focal) / (width / 2), (SCREEN.b[1] * focal) / (height / 2));
  const pad = 20;
  const fit = Math.max(
    (GRID[0] * focal) / (width / 2 - pad),
    (GRID[1] * focal) / (height / 2 - pad),
  );
  const z = cover * 0.94 >= fit ? SCREEN.c[2] + cover * 0.94 : GLASS_Z + fit;
  return { eye: [0, SCREEN.c[1], z], yaw: 0, focal, shift: [0, 0] };
}

/** where a world point shows from `view`, CSS px from the stage centre before the view's shift */
function project(view: View, x: number, y: number, z: number): [x: number, y: number] {
  const s = Math.sin(view.yaw);
  const c = Math.cos(view.yaw);
  const vx = x - view.eye[0];
  const vz = z - view.eye[2];
  const depth = -vx * s - vz * c;
  return [((vx * c - vz * s) / depth) * view.focal, ((view.eye[1] - y) / depth) * view.focal];
}

/** projected bounds of the terminal in stage CSS px */
export function terminalRect(view: View, width: number, height: number): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const [x, y] = project(
      view,
      i & 1 ? BOUNDS.max[0] : BOUNDS.min[0],
      i & 2 ? BOUNDS.max[1] : BOUNDS.min[1],
      i & 4 ? BOUNDS.max[2] : BOUNDS.min[2],
    );
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const x = width / 2 + view.shift[0];
  const y = height / 2 + view.shift[1];
  return { x: x + minX, y: y + minY, w: maxX - minX, h: maxY - minY };
}

/** CSS px a column of the session spans at the middle of the glass, seen from `view` */
export function columnWidth(view: View): number {
  const half = GRID[0] / COLS;
  const [right] = project(view, half, SCREEN.c[1], GLASS_Z);
  const [left] = project(view, -half, SCREEN.c[1], GLASS_Z);
  return right - left;
}

/** orbiting the terminal at ground level, fitted into `slot` (stage CSS px) */
export function framedView(width: number, height: number, slot: Rect): View {
  const focal = focalOf(height);
  const orbit = (d: number): View => ({
    // eye height: the foot sits a few px under the horizon
    eye: [Math.sin(YAW) * d, (4 * d) / focal, Math.cos(YAW) * d],
    yaw: YAW,
    focal,
    shift: [0, 0],
  });
  let lo = 4;
  let hi = 200;
  for (let i = 0; i < 30; i++) {
    const d = (lo + hi) / 2;
    const box = terminalRect(orbit(d), width, height);
    if (box.w > slot.w || box.h > slot.h) lo = d;
    else hi = d;
  }
  const view = orbit(hi);
  const box = terminalRect(view, width, height);
  view.shift = [slot.x + slot.w / 2 - (box.x + box.w / 2), slot.y + slot.h - (box.y + box.h)];
  return view;
}

/** the world point seen at stage point (x, y), `distance` away along the view ray */
export function unproject(
  view: View,
  width: number,
  height: number,
  x: number,
  y: number,
  distance: number,
): Vec3 {
  const s = Math.sin(view.yaw);
  const c = Math.cos(view.yaw);
  const dx = x - (width / 2 + view.shift[0]);
  const dy = height / 2 + view.shift[1] - y;
  const f = view.focal;
  // fwd = (-s, 0, -c), right = (c, 0, -s)
  const dir: Vec3 = [-s * f + c * dx, dy, -c * f - s * dx];
  const k = distance / Math.hypot(dir[0], dir[1], dir[2]);
  return [view.eye[0] + dir[0] * k, view.eye[1] + dir[1] * k, view.eye[2] + dir[2] * k];
}

/**
 * The camera between the two views: `dolly` pulls straight out of the glass (log distance),
 * `swing` orbits it down to the ground and moves the framing into the slot.
 */
export function viewAt(from: View, to: View, dolly: number, swing: number): View {
  const target: Vec3 = [0, mix(from.eye[1], to.eye[1], swing), mix(GLASS_Z, 0, swing)];
  const fromD = from.eye[2] - GLASS_Z;
  const toD = Math.hypot(to.eye[0], to.eye[2]);
  const d = Math.exp(mix(Math.log(fromD), Math.log(toD), dolly));
  const yaw = mix(0, to.yaw, swing);
  return {
    eye: [target[0] + Math.sin(yaw) * d, target[1], target[2] + Math.cos(yaw) * d],
    yaw,
    focal: to.focal,
    shift: [mix(0, to.shift[0], swing), mix(0, to.shift[1], swing)],
  };
}

function glyphOf(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 32 && code < 127) return code - 32;
  const i = SYMBOLS.indexOf(char);
  return i === -1 ? 0 : ASCII + i;
}

/**
 * Terminal cells of `family` (a monospaced font with a 0.6em advance) at 1.25 line height for
 * `uAtlas`: white glyphs on black, one cell per glyph; with each glyph's ink coverage (0 to 255),
 * and the cell pitch and glyph box in texels for `uGlyph`.
 */
export function createAtlas(family: string) {
  const size = 56;
  const w = size * 0.6;
  const h = Math.round(size * 1.25);
  const pitchW = Math.ceil(w) + 2;
  const pitchH = h + 2;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS * pitchW;
  canvas.height = Math.ceil(GLYPHS / ATLAS_COLUMNS) * pitchH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.font = `${size}px ${family}`;
  const metrics = ctx.measureText('M');
  const ascent = metrics.fontBoundingBoxAscent;
  const baseline = (h - ascent - metrics.fontBoundingBoxDescent) / 2 + ascent;
  const stroke = size * 0.085;
  const half = stroke / 2;
  ctx.lineWidth = stroke;

  /** `axis`: the vertical centre of symbols, on the math axis */
  function symbol(char: string, x: number, y: number, axis: number) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    switch (char) {
      case '│':
        ctx.fillRect(cx - half, y, stroke, h);
        return;
      case '└':
      case '┌':
        ctx.fillRect(cx - half, char === '└' ? y : cy - half, stroke, h / 2 + half);
        ctx.fillRect(cx - half, cy - half, x + w - cx + half, stroke);
        return;
      case '◆':
      case '◇': {
        const r = size * 0.32;
        ctx.beginPath();
        ctx.moveTo(cx, axis - r);
        ctx.lineTo(cx + r, axis);
        ctx.lineTo(cx, axis + r);
        ctx.lineTo(cx - r, axis);
        ctx.closePath();
        if (char === '◆') ctx.fill();
        else {
          ctx.lineJoin = 'miter';
          ctx.stroke();
        }
        return;
      }
      case '█':
        ctx.fillRect(x, y, w, h);
        return;
      case '•':
        ctx.beginPath();
        ctx.arc(cx, axis, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        return;
      case '↑':
      case '↓': {
        const dir = char === '↑' ? -1 : 1;
        const r = size * 0.3;
        ctx.fillRect(cx - half, axis - r, stroke, r * 2);
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.75, axis + dir * (r - r * 0.75));
        ctx.lineTo(cx, axis + dir * r);
        ctx.lineTo(cx + r * 0.75, axis + dir * (r - r * 0.75));
        ctx.stroke();
        return;
      }
    }

    // circles: ● ○ and the spinner's half-filled ◒ ◐ ◓ ◑
    const r = size * 0.27;
    ctx.beginPath();
    ctx.arc(cx, axis, r - (char === '●' ? 0 : half), 0, Math.PI * 2);
    if (char === '●') {
      ctx.fill();
      return;
    }
    ctx.stroke();
    if (char === '○') return;
    const start = { '◒': 0, '◐': Math.PI / 2, '◓': Math.PI, '◑': -Math.PI / 2 }[char] ?? 0;
    ctx.beginPath();
    ctx.arc(cx, axis, r, start, start + Math.PI);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < GLYPHS; i++) {
    const x = (i % ATLAS_COLUMNS) * pitchW + 1;
    const y = Math.floor(i / ATLAS_COLUMNS) * pitchH + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (i < ASCII) ctx.fillText(String.fromCharCode(32 + i), x, y + baseline);
    else symbol(SYMBOLS[i - ASCII], x, y, y + baseline - size * 0.34);
    ctx.restore();
  }

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const density = new Uint8Array(GLYPHS);
  for (let i = 0; i < GLYPHS; i++) {
    const x0 = (i % ATLAS_COLUMNS) * pitchW + 1;
    const y0 = Math.floor(i / ATLAS_COLUMNS) * pitchH + 1;
    let sum = 0;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + Math.floor(w); x++) sum += pixels[(y * canvas.width + x) * 4];
    }
    density[i] = Math.round(sum / (h * Math.floor(w)));
  }
  return { canvas, density, metrics: [pitchW, pitchH, w, h] as const };
}

/** writes the rows `frame` shows into the cell buffer of `uChars`: glyph, style, glyph ink */
export function paint(frame: Frame, data: Uint8ClampedArray, density: Uint8Array) {
  for (let r = 0; r < ROWS; r++) {
    let o = r * COLS * 4;
    const end = o + COLS * 4;
    for (const [text, style] of frame.lines[frame.top + r] ?? []) {
      for (let i = 0; i < text.length && o < end; i++, o += 4) write(o, glyphOf(text[i]), style);
    }
    // glyph 0 is the space
    for (; o < end; o += 4) write(o, 0, 0);
  }

  function write(o: number, glyph: number, style: number) {
    data[o] = glyph;
    data[o + 1] = style;
    data[o + 2] = density[glyph];
    data[o + 3] = 255;
  }
}
