import { bayer8 } from '../../lib/dither';
import type { Vec3 } from '../../lib/mesh';
import { mix, type Rect } from '../../lib/motion';
import { COLS, type Frame, ROWS } from './data';

/**
 * Clack's symbols in their cell, 60 by 125 units with the font's math axis at 64.5, drawn by hand:
 * the Google Fonts build of JetBrains Mono has no box drawing or geometric shapes. Box drawing runs
 * on into the atlas's padding, so it stays joined from cell to cell as the atlas minifies.
 */
const SHAPES: Record<string, string> = {
  '│': 'M25.75-100h8.5V225h-8.5z',
  '└': 'M25.75-100h8.5V58.25H160v8.5H25.75z',
  '┌': 'M25.75 58.25H160v8.5H34.25V225h-8.5z',
  '◆': 'M30 34.5 60 64.5 30 94.5 0 64.5z',
  '◇': 'M30 34.5 60 64.5 30 94.5 0 64.5zm0 12L12 64.5 30 82.5 48 64.5z',
  '●': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0z',
  '○': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0zm8.5 0a18.5 18.5 0 0 0 37 0 18.5 18.5 0 0 0-37 0z',
  '◒': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0zm8.5 0a18.5 18.5 0 0 1 37 0z',
  '◐': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0zM30 46a18.5 18.5 0 0 1 0 37z',
  '◓': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0zm8.5 0a18.5 18.5 0 0 0 37 0z',
  '◑': 'M3 64.5a27 27 0 0 0 54 0 27 27 0 0 0-54 0zM30 46a18.5 18.5 0 0 0 0 37z',
  '█': 'M-100-100h260V225H-100z',
  '↑': 'M25.75 94.5V44.75L10.5 60l-6-6L30 28.5 55.5 54l-6 6-15.25-15.25V94.5z',
  '↓': 'M25.75 34.5V84.25L10.5 69l-6 6L30 100.5 55.5 75l-6-6-15.25 15.25V34.5z',
  '•': 'M20 64.5a10 10 0 0 0 20 0 10 10 0 0 0-20 0z',
};
const SYMBOLS = Object.keys(SHAPES).join('');
const ASCII = 95;
const GLYPHS = ASCII + SYMBOLS.length;
const ATLAS_COLUMNS = 16;
/** texels of padding round each glyph's box, so its mips to level 4 stay its own */
const PAD = 16;

/** world units, the terminal stands on y = 0 and faces +z */
const SCREEN = { c: [0, 2.2, 1.3], b: [1.89, 1.08] } as const;
/** half size of the 80x24 cell grid on the glass */
const GRID = [1.38, 0.8625] as const;
/** the glass bulges out to this z at its centre */
const GLASS_Z = 1.22;
/** visible extent, for framing */
const BOUNDS = { min: [-2.3, 0, -2.35], max: [2.3, 3.6, 1.3] } as const;

/**
 * The whole figure, drawn as the mesh's backdrop: the terminal's solid traced in its box, shaded on
 * 2px dither with the creases where its parts meet and down its rounded edges and the session on its
 * glass, then the ridges, the ground and its shadow, and the moon round it. Its patterns lie as
 * they show from the composition the camera settles on, so they ride its move; the moon's on itself.
 */
export const backdrop = `
uniform vec2 uResolution, uShift, uHorizon;
uniform float uDpr, uYaw, uFocal, uNight, uOpen;
uniform vec3 uEye, uLit, uShade, uAccent;
// uClear: the call to action's edges and foot (stage px), and how far the valley under it is open
uniform vec4 uMoon, uClear, uGlyph;
uniform sampler2D uAtlas, uChars;
// the composition at rest: its eye, yaw and shift
uniform vec3 uRestEye;
uniform vec2 uRestShift;
uniform float uRestYaw;
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

float field(vec3 p) {
  float recess = sdRecess(p);
  float shell = min(sdRoundBox(p - BODY_C, BODY_B, BODY_R), sdRoundBox(p - REAR_C, REAR_B, REAR_R));
  shell = max(max(shell, -recess), -sdRoundBox(p - SLOT_C, SLOT_B, 0.04));
  float stand = min(sdRoundBox(p - NECK_C, NECK_B, 0.06), sdRoundBox(p - FOOT_C, FOOT_B, 0.05));
  return min(min(shell, stand), max(sdBulge(p), recess));
}

/** how far from the middle line of a rounded box edge, q = abs(p - c) - (b - r); each edge stops where it meets the others */
float crease(vec3 q) {
  float d = 1e9;
  if (q.x > 0.0 && q.y > 0.0 && q.z < min(q.x, q.y)) d = abs(q.x - q.y);
  if (q.x > 0.0 && q.z > 0.0 && q.y < min(q.x, q.z)) d = min(d, abs(q.x - q.z));
  if (q.y > 0.0 && q.z > 0.0 && q.x < min(q.y, q.z)) d = min(d, abs(q.y - q.z));
  return d;
}

/** where a ray enters and leaves the box from lo to hi */
vec2 boxSpan(vec3 ro, vec3 rd, vec3 lo, vec3 hi) {
  vec3 r = mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  vec3 t0 = (lo - ro) / r;
  vec3 t1 = (hi - ro) / r;
  vec3 a = min(t0, t1);
  vec3 b = max(t0, t1);
  return vec2(max(max(a.x, a.y), a.z), min(min(b.x, b.y), b.z));
}

vec3 fieldNormal(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * field(p + k.xyy * e) + k.yyx * field(p + k.yyx * e) +
    k.yxy * field(p + k.yxy * e) + k.xxx * field(p + k.xxx * e)
  );
}

/** 1 where a ray from ro toward the light leaves the solid's box without meeting it, else 0 */
float lit(vec3 ro, vec3 rd, vec3 lo, vec3 hi) {
  vec2 span = boxSpan(ro, rd, lo, hi);
  if (span.y <= 0.0 || span.x > span.y) return 1.0;
  float t = max(span.x, 0.0);
  for (int i = 0; i < 40; i++) {
    float d = field(ro + rd * t);
    if (d < 0.002) return 0.0;
    t += d;
    if (t > span.y) break;
  }
  return 1.0;
}

/**
 * The sphere trace of a ray through the solid's box from lo to hi, pixel the size of a px a unit
 * away: x where it hits or -1; y how close, in px, it passed a silhouette nearer than that, z where
 */
vec3 trace(vec3 ro, vec3 rd, vec3 lo, vec3 hi, float pixel) {
  float hit = -1.0;
  float edge = 1e9;
  float edgeT = 1e9;
  vec2 span = boxSpan(ro, rd, lo, hi);
  if (span.x < span.y && span.y > 0.0) {
    float t = max(span.x, 0.0);
    float d0 = 1e9;
    float t0 = t;
    float d1 = 1e9;
    float t1 = t;
    bool inside = true;
    for (int i = 0; i < 64; i++) {
      float d = field(ro + rd * t);
      if (d < 0.2 * t * pixel) { hit = t; break; }
      if (d > d1 && d1 < d0 && d1 < 3.0 * t1 * pixel) {
        // passed close to a surface: find the true closest approach between t0 and t
        float a = t0;
        float b = t;
        for (int j = 0; j < 6; j++) {
          float m1 = mix(a, b, 0.382);
          float m2 = mix(a, b, 0.618);
          if (field(ro + rd * m1) < field(ro + rd * m2)) b = m2;
          else a = m1;
        }
        float m = 0.5 * (a + b);
        float e = field(ro + rd * m) / (m * pixel);
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
  return vec3(hit, edge, edgeT);
}

/** glyph's ink at f, 0 to 1 across its cell, from the atlas's mip level lod, kept off its neighbours */
float coverage(int glyph, vec2 f, float lod) {
  vec2 size = vec2(textureSize(uAtlas, 0));
  vec2 origin = vec2(float(glyph % ${ATLAS_COLUMNS}), float(glyph / ${ATLAS_COLUMNS})) * uGlyph.xy + ${PAD}.0;
  float edge = exp2(lod - 1.0);
  vec2 q = origin + clamp(f * uGlyph.zw, vec2(edge), uGlyph.zw - edge);
  return textureLod(uAtlas, vec2(q.x, size.y - q.y) / size, lod).r;
}

/** the CRT: phosphor text from the cell buffer; w = world size of a CSS px, facing = |cos| of the view angle */
vec3 screen(vec3 p, float w, float facing) {
  vec2 s = (p.xy - SCREEN_C.xy) / SCREEN_B;
  s *= 1.0 + 0.012 * dot(s, s);
  if (abs(s.y) > uOpen) return uShade;
  if (uOpen < 1.0 && abs(s.y) > uOpen - 1.5 * w / SCREEN_B.y) return uAccent;
  // the cells a canvas px spans, wider on glass seen at a grazing angle
  float fp = w / uDpr / (2.0 * GRID_B.x / ${COLS}.0) / max(facing, 0.25);
  vec2 g = s * SCREEN_B / GRID_B * 0.5 + 0.5;
  vec2 c = vec2(g.x * ${COLS}.0, (1.0 - g.y) * ${ROWS}.0);
  if (c.x < 0.0 || c.y < 0.0 || c.x >= ${COLS}.0 || c.y >= ${ROWS}.0) return uShade;
  ivec2 cell = ivec2(c);
  vec4 data = texelFetch(uChars, ivec2(cell.x, ${ROWS - 1} - cell.y), 0);
  int glyph = int(data.r * 255.0 + 0.5);
  int style = int(data.g * 255.0 + 0.5);
  // the mip half a level finer than a canvas px's footprint, for crisp type
  float cov = coverage(glyph, fract(c), clamp(log2(fp * uGlyph.z) - 0.5, 0.0, 4.0));
  // text is never dithered: cells too small to resolve fade to their ink density
  cov = mix(cov, data.b, smoothstep(0.45, 0.7, fp));

  vec3 fg = style == 1 ? mix(uShade, uLit, 0.5) : style == 2 ? uAccent : uLit;
  vec3 bg = uShade;
  if (style == 3) { bg = uAccent; fg = uShade; }
  if (style == 4) { bg = uLit; fg = uShade; }
  return mix(bg, fg, cov);
}

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
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

/** stage px where world point p shows from the composition at rest */
vec2 rest(vec3 p, vec2 px) {
  vec3 v = p - uRestEye;
  float z = dot(v, vec3(-sin(uRestYaw), 0.0, -cos(uRestYaw)));
  vec2 at = vec2(dot(v, vec3(cos(uRestYaw), 0.0, -sin(uRestYaw))), -v.y) * uFocal / z;
  return z > 0.1 ? uResolution / uDpr * 0.5 + uRestShift + at : px;
}

/** how much of a canvas px a band reaching r CSS px either side of its middle covers, d px off it */
float band(float d, float r) {
  return clamp((r - abs(d)) * uDpr + 0.5, 0.0, 1.0);
}

vec4 backdrop(vec2 at) {
  vec2 stage = uResolution / uDpr;
  vec2 px = at / uDpr;
  vec2 centre = stage * 0.5 + uShift;
  vec3 fwd = vec3(-sin(uYaw), 0.0, -cos(uYaw));
  vec3 right = vec3(cos(uYaw), 0.0, -sin(uYaw));
  vec3 ro = uEye;
  vec3 rd = normalize(fwd * uFocal + right * (px.x - centre.x) + vec3(0.0, centre.y - px.y, 0.0));
  float pixel = 1.0 / uFocal;
  vec3 paper = uNight > 0.5 ? uShade : uLit;
  vec3 pen = uNight > 0.5 ? uLit : uShade;

  // the terminal, traced in its box: where it passes close, a silhouette
  vec3 traced = trace(ro, rd, BOX_MIN, BOX_MAX, pixel);
  float hit = traced.x;
  float edge = traced.y;
  float edgeT = traced.z;
  float ground = rd.y < -1e-6 ? -ro.y / rd.y : 1e9;
  bool terminal = hit > 0.0 && hit < ground;
  vec3 col = paper;
  float depth = 1e9;

  if (terminal) {
    depth = hit;
    vec3 p = ro + rd * hit;
    float w = hit * pixel;
    vec3 n = fieldNormal(p, 0.5 * w);
    float recess = sdRecess(p);
    float bulge = sdBulge(p);
    float body = sdRoundBox(p - BODY_C, BODY_B, BODY_R);
    float rear = sdRoundBox(p - REAR_C, REAR_B, REAR_R);
    float neck = sdRoundBox(p - NECK_C, NECK_B, 0.06);
    float foot = sdRoundBox(p - FOOT_C, FOOT_B, 0.05);
    float slot = sdRoundBox(p - SLOT_C, SLOT_B, 0.04);
    // world units a CSS px spans across the face here, wider on faces seen at a grazing angle
    float across = w / max(abs(dot(rd, n)), 0.2);
    bool glass = max(bulge, recess) < 0.5 * w;
    float tone = 0.0;
    if (glass) col = screen(p, w, abs(dot(rd, n)));
    else {
      float lambert = dot(n, LIGHT);
      float v = lambert > 0.0 ? lambert * lit(p + n * 2.0 * w, LIGHT, BOX_MIN, BOX_MAX) : lambert;
      // solid, quarters, solid, on 2 px cells as they lie at rest
      tone = floor(clamp((v - 0.12) / 0.3, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
      col = bayer8(floor(rest(p, px) / 2.0)) < tone ? uLit : uShade;
    }
    // creases 1.5 CSS px across: where two parts meet, and the middle of each rounded edge
    float d = min(min(max(abs(body), abs(recess)), max(abs(bulge), abs(recess))),
      min(min(max(abs(body), abs(rear)), max(abs(body), abs(slot))),
        min(max(abs(neck), abs(foot)), max(abs(neck), abs(body)))));
    if (abs(body) < across) d = min(d, crease(abs(p - BODY_C) - (BODY_B - BODY_R)));
    if (abs(rear) < across) d = min(d, crease(abs(p - REAR_C) - (REAR_B - REAR_R)));
    if (abs(foot) < across) d = min(d, crease(abs(p - FOOT_C) - (FOOT_B - 0.05)));
    col = mix(col, glass ? uLit : (tone > 0.5 ? uShade : uLit), band(d / across, 0.75));
  } else {
    // the ridges near to far, each edge blended over what lies past it, then the ground or the sky
    vec4 acc = vec4(0.0);
    for (int k = 0; k < 3 && acc.a < 1.0; k++) {
      float t = cylinder(ro, rd, RIDGE_R[k]);
      if (t > ground) {
        // the ground in front: paper, with the terminal's cast shadow as a quarter screen on 2 px
        // cells counted from under the terminal, as the ground seen this low would press any it lay on
        if (acc.a == 0.0) depth = ground;
        vec3 p = ro + rd * ground;
        vec3 v = FOOT_C - ro;
        vec2 foot = centre + vec2(dot(v, right), -v.y) * uFocal / dot(v, fwd);
        bool shade = k == 0 && bayer8(floor((px - foot) / 2.0)) < 0.25 && lit(p + vec3(0.0, 0.002, 0.0), LIGHT, BOX_MIN, BOX_MAX) < 0.5;
        acc += (1.0 - acc.a) * vec4(shade ? pen : paper, 1.0);
        break;
      }
      vec3 p = ro + rd * t;
      float w = t * pixel;
      // over the ridge's tallest peak, its noise can't reach the ray
      if (p.y > RIDGE_H[k] + w) continue;
      float theta = atan(p.z, p.x);
      float h = ridge(k, theta);
      float along = t * dot(rd, fwd);
      if (uClear.w > 0.0) h = valley(k, h, along, px.x, centre.y);
      float next = ridge(k, theta + 0.002);
      if (uClear.w > 0.0) next = valley(k, next, along, px.x, centre.y);
      float slope = (next - h) / (0.002 * RIDGE_R[k]);
      // CSS px over its crest
      float over = (p.y - h) / sqrt(1.0 + slope * slope) / w;
      float cover = clamp(0.5 - over * uDpr, 0.0, 1.0);
      if (cover <= 0.0) continue;
      if (acc.a == 0.0) depth = t;
      // slopes facing the light are lighter near the crest, the mass below one flat screen, on 3 px
      // cells as they lie at rest
      vec3 normal = normalize(vec3(-cos(theta), 1.0, -sin(theta)) * 0.7 + vec3(sin(theta), 0.0, -cos(theta)) * slope * 2.5);
      float crest = 1.0 - step(RIDGE_H[k] * 0.22, h - p.y);
      float density = RIDGE_D[k] + (dot(normal, LIGHT) > 0.3 ? 0.0 : crest * 0.08);
      vec3 rc = bayer8(floor(rest(p, px) / 3.0) + float(k) * 3.0) < density ? pen : paper;
      rc = mix(rc, pen, band(over + 0.45, 0.45));
      acc += (1.0 - acc.a) * cover * vec4(rc, 1.0);
    }
    if (acc.a < 1.0) {
      // the sky, and the moon behind the far ridge: an accent disc in a CSS px of rim, its
      // terminator three steps from solid sky to solid accent on 3 px cells counted from its middle
      vec3 sky = paper;
      vec3 oc = ro - uMoon.xyz;
      float b = dot(oc, rd);
      float rim = (sqrt(max(dot(oc, oc) - b * b, 0.0)) - uMoon.w) / (-b * pixel);
      if (rim < 1.0) {
        vec3 v = uMoon.xyz - ro;
        vec2 mid = centre + vec2(dot(v, right), -v.y) * uFocal / dot(v, fwd);
        vec2 cell = floor((px - mid) / 3.0);
        vec2 q = mid + (cell + 0.5) * 3.0;
        vec3 rq = normalize(fwd * uFocal + right * (q.x - centre.x) + vec3(0.0, centre.y - q.y, 0.0));
        float bq = dot(oc, rq);
        float hq = uMoon.w * uMoon.w - (dot(oc, oc) - bq * bq);
        vec3 n = normalize(oc + (hq > 0.0 ? rq * (-bq - sqrt(hq)) : rd * -b));
        float tone = (dot(n, LIGHT) - 0.04) / 0.32;
        float level = tone >= 1.0 ? 1.0 : tone <= 0.0 ? 0.0 : (floor(tone * 3.0) + 1.0) / 4.0;
        vec3 face = bayer8(cell) < level ? uAccent : paper;
        sky = mix(paper, mix(face, uAccent, band(rim, 0.5)), clamp((0.5 - rim) * uDpr + 0.5, 0.0, 1.0));
      }
      acc += (1.0 - acc.a) * vec4(sky, 1.0);
    }
    col = acc.rgb;
  }

  // the silhouette, a band 1.25 CSS px out
  if (edgeT < depth) col = mix(col, pen, clamp((1.25 - edge) * uDpr + 0.5, 0.0, 1.0));

  // the ground line at the foot of the near ridge, with ticks, drawn out from under the terminal
  if (!terminal && abs(px.x - uHorizon.x) < uHorizon.y) {
    vec2 d = normalize(rd.xz);
    float b = dot(ro.xz, d);
    float base = -b + sqrt(max(b * b - dot(ro.xz, ro.xz) + RIDGE_R[0] * RIDGE_R[0], 0.0));
    vec3 v = vec3(d.x * base, -ro.y, d.y * base);
    float y = px.y - (centre.y - v.y / dot(v, fwd) * uFocal);
    col = mix(col, pen, max(band(y, 0.5), y > 0.0 && y < 6.0 && mod(px.x, 24.0) < 1.0 ? 1.0 : 0.0));
  }
  return vec4(col, 1.0);
}
`;

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
 * `uAtlas`: white glyphs on black, one cell per glyph with PAD texels of its own round it, bottom row
 * first as the glass samples it; with each glyph's ink coverage (0 to 255), and the cell pitch and
 * glyph box in texels for `uGlyph`. At 48px, a close-up magnifies them only a little.
 */
export function createAtlas(family: string) {
  const size = 48;
  const w = size * 0.6;
  const h = size * 1.25;
  const pitchW = Math.ceil(w) + 2 * PAD;
  const pitchH = h + 2 * PAD;
  const width = ATLAS_COLUMNS * pitchW;
  const height = Math.ceil(GLYPHS / ATLAS_COLUMNS) * pitchH;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = `${size}px ${family}`;
  const metrics = ctx.measureText('M');
  const ascent = metrics.fontBoundingBoxAscent;
  const baseline = (h - ascent - metrics.fontBoundingBoxDescent) / 2 + ascent;

  for (let i = 0; i < GLYPHS; i++) {
    const x = (i % ATLAS_COLUMNS) * pitchW + PAD;
    const y = Math.floor(i / ATLAS_COLUMNS) * pitchH + PAD;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - PAD, y - PAD, pitchW, pitchH);
    ctx.clip();
    if (i < ASCII) ctx.fillText(String.fromCharCode(32 + i), x, y + baseline);
    else {
      ctx.translate(x, y);
      ctx.scale(w / 60, h / 125);
      ctx.fill(new Path2D(SHAPES[SYMBOLS[i - ASCII]]), 'evenodd');
    }
    ctx.restore();
  }

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const density = new Uint8Array(GLYPHS);
  for (let i = 0; i < GLYPHS; i++) {
    const x0 = (i % ATLAS_COLUMNS) * pitchW + PAD;
    const y0 = Math.floor(i / ATLAS_COLUMNS) * pitchH + PAD;
    let sum = 0;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + Math.floor(w); x++) sum += pixels[(y * width + x) * 4];
    }
    density[i] = Math.round(sum / (h * Math.floor(w)));
  }
  const image = new ImageData(width, height);
  const row = width * 4;
  for (let y = 0; y < height; y++)
    image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
  canvas.width = 0;
  return { image, density, metrics: [pitchW, pitchH, w, h] as const };
}

/** writes the rows `frame` shows into the cell buffer of `uChars`, bottom up: glyph, style, glyph ink */
export function paint(frame: Frame, data: Uint8ClampedArray, density: Uint8Array) {
  for (let r = 0; r < ROWS; r++) {
    let o = (ROWS - 1 - r) * COLS * 4;
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
