import { bayer8 } from '../../lib/glsl';

/** the arm's links, shoulder to elbow and elbow to wrist, arm units */
export const LINK1 = 220;
export const LINK2 = 190;
/** the pad's highest sole, arm units */
export const STROKE = 100;
/** the pad's hover over its work */
export const HOVER = 48;
/** the pad's half size, arm units */
export const PAD: Vec2 = [26, 15];
/** top of everything, arm units */
const TOP = 272;

export type Vec2 = [number, number];

/**
 * A desk robot arm (a SCARA: two links that swing flat, a quill that drops the pad), drawn in arm
 * units around its base. The stage is the page, z = 0, with z up toward the viewer; the camera's
 * image plane stays parallel to it, so the windows and anything carried flat over them stay
 * frontal and only the arm, a solid, shows its sides.
 */
export const fragment = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec3 uCam;
uniform vec2 uB;
uniform float uS;
uniform vec2 uE;
uniform vec2 uW;
uniform float uP;
uniform float uSq;
uniform vec4 uRail;
uniform vec4 uCard;
uniform float uCardZ;
uniform vec4 uHit;
uniform float uPuff;
uniform vec4 uDoc;
uniform float uCover;
uniform vec3 uL;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uAccent;
uniform vec4 uLine;
uniform float uNight;
uniform vec4 uClip;
out vec4 color;
${bayer8}
const float TOP = ${TOP}.0;
const float COL = 150.0;
const float L1_0 = 150.0;
const float L1_1 = 172.0;
const float L2_0 = 124.0;
const float L2_1 = 144.0;
const vec2 PAD = vec2(${PAD[0]}.0, ${PAD[1]}.0);
const float PAD_H = 10.0;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

/** an outline at 2D distance d (shrunk by r) standing from z0 to z1, its edges rounded by r */
float slab(float d, float z, float z0, float z1, float r) {
  vec2 q = vec2(d, abs(z - 0.5 * (z0 + z1)) - 0.5 * (z1 - z0) + r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float cyl(vec3 p, vec2 c, float radius, float z0, float z1, float r) {
  return slab(length(p.xy - c) - radius + r, p.z, z0, z1, r);
}

float bar(vec3 p, vec2 a, vec2 b, float w, float z0, float z1, float r) {
  return slab(seg(p.xy, a, b) - w + r, p.z, z0, z1, r);
}

float box2(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

vec2 pad() { return PAD * (1.0 + 0.12 * uSq); }
float padH() { return PAD_H * (1.0 - 0.45 * uSq); }

// arm units: the base at the origin
float dFlange(vec3 p) { return cyl(p, vec2(0.0), 50.0, 0.0, 8.0, 2.0); }
float dColumn(vec3 p) { return cyl(p, vec2(0.0), 33.0, 8.0, COL, 3.0); }
float dLink1(vec3 p) { return bar(p, vec2(0.0), uE, 22.0, L1_0, L1_1, 5.0); }
float dCap(vec3 p) { return min(cyl(p, vec2(0.0), 15.0, L1_1 - 2.0, L1_1 + 6.0, 2.0), cyl(p, uE, 11.0, L1_1 - 2.0, L1_1 + 5.0, 2.0)); }
float dPin(vec3 p) { return cyl(p, uE, 12.0, L2_1 - 2.0, L1_0 + 2.0, 1.0); }
float dLink2(vec3 p) { return bar(p, uE, uW, 17.0, L2_0, L2_1, 4.0); }
float dCollar(vec3 p) { return cyl(p, uW, 15.0, L2_0 - 8.0, COL, 3.0); }
float dRod(vec3 p) { return cyl(p, uW, 5.5, uP + PAD_H - 2.0, uP + 168.0, 2.0); }
float dPad(vec3 p) { return slab(box2(p.xy - uW, pad() - 3.0), p.z, uP, uP + padH(), 3.0); }

float arm(vec3 p) {
  float d = min(dFlange(p), dColumn(p));
  d = min(d, min(dLink1(p), dCap(p)));
  d = min(d, min(dPin(p), dLink2(p)));
  d = min(d, min(dCollar(p), dRod(p)));
  return min(d, dPad(p));
}

/** the rail a moving base rides on, world px */
float rail(vec3 p) {
  if (uRail.w <= 0.0) return 1e9;
  return bar(p, vec2(uRail.x, uRail.y), vec2(uRail.x, uRail.z), uRail.w, 0.0, 6.0, 2.0);
}

vec3 local(vec3 p) { return vec3((p.xy - uB) / uS, p.z / uS); }

float sdf(vec3 p) { return min(arm(local(p)) * uS, rail(p)); }

vec3 normalAt(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sdf(p + k.xyy * e) + k.yyx * sdf(p + k.yyx * e) +
    k.yxy * sdf(p + k.yxy * e) + k.xxx * sdf(p + k.xxx * e)
  );
}

/** 1 when nothing of the arm stands between p and the light */
float lit(vec3 p) {
  float t = 0.5;
  for (int i = 0; i < 40; i++) {
    vec3 q = p + uL * t;
    if (q.z > TOP * uS) break;
    float d = sdf(q);
    if (d < 0.05) return 0.0;
    t += max(d, 0.5);
  }
  return 1.0;
}

/** 2D distance to the arm's footprint, arm units: a bound for every part */
float skeleton(vec2 p) {
  float d = min(length(p) - 52.0, seg(p, vec2(0.0), uE) - 24.0);
  d = min(d, seg(p, uE, uW) - 19.0);
  return min(d, length(p - uW) - 36.0);
}

/** distance between the segments ab and cd */
float segseg(vec2 a, vec2 b, vec2 c, vec2 d) {
  vec2 ab = b - a;
  vec2 cd = d - c;
  vec2 ac = c - a;
  float den = ab.x * cd.y - ab.y * cd.x;
  if (abs(den) > 1e-6) {
    float s = (ac.x * cd.y - ac.y * cd.x) / den;
    float t = (ac.x * ab.y - ac.y * ab.x) / den;
    if (s >= 0.0 && s <= 1.0 && t >= 0.0 && t <= 1.0) return 0.0;
  }
  return min(min(seg(a, c, d), seg(b, c, d)), min(seg(c, a, b), seg(d, a, b)));
}

/** whether page point p (arm units) is in the arm's shadow: every part stands upright, so the ray
 * to the light crosses a part where its 2D path between the part's heights meets the footprint */
bool shaded(vec2 p) {
  vec2 s = uL.xy / uL.z;
  vec2 o = vec2(0.0);
  if (segseg(p, p + s * 8.0, o, o) < 50.0) return true;
  if (segseg(p + s * 8.0, p + s * COL, o, o) < 33.0) return true;
  if (segseg(p + s * L1_0, p + s * L1_1, o, uE) < 22.0) return true;
  if (segseg(p + s * L2_1, p + s * L1_0, uE, uE) < 12.0) return true;
  if (segseg(p + s * L2_0, p + s * L2_1, uE, uW) < 17.0) return true;
  if (segseg(p + s * (L2_0 - 8.0), p + s * COL, uW, uW) < 15.0) return true;
  if (segseg(p + s * (uP + PAD_H), p + s * (uP + 168.0), uW, uW) < 5.5) return true;
  return box2(p + s * (uP + 0.5 * PAD_H) - uW, pad()) < 0.0;
}

bool crease(vec2 q, float lw) {
  return q.x > 0.0 && q.y > 0.0 && abs(q.x - q.y) < lw;
}

bool inside(vec2 p, vec4 r) {
  return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.z && p.y <= r.y + r.w;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  color = vec4(0.0);
  if (px.x < uClip.x || px.y < uClip.y || px.x > uClip.z || px.y > uClip.w) return;

  vec3 ro = uCam;
  vec3 rd = normalize(vec3(px - uCam.xy, -uCam.z));
  float threshold = bayer8(floor(px / 2.0));
  vec3 pen = uNight > 0.5 ? uLit : uShade;
  vec4 line = vec4(uLine.rgb * uLine.a, uLine.a);

  float t = (TOP * uS - ro.z) / rd.z;
  float tEnd = -ro.z / rd.z;
  float hit = -1.0;
  float edge = 1e9;
  float d0 = 1e9;
  float t0 = t;
  float d1 = 1e9;
  float t1 = t;
  // the ray's 2D path over the arm's height is short: skip it when it passes clear of the arm
  vec2 top = (ro + rd * t).xy;
  vec2 mid = (0.5 * (top + px) - uB) / uS;
  bool near = skeleton(mid) * uS - 0.5 * length(top - px) < 3.0 ||
    (uRail.w > 0.0 && abs(px.x - uRail.x) < uRail.w + 8.0);
  for (int i = 0; i < (near ? 64 : 0); i++) {
    vec3 p = ro + rd * t;
    float w = (ro.z - p.z) / (ro.z * uDpr);
    float d = sdf(p);
    if (d < 0.25 * w) { hit = t; break; }
    if (d > d1 && d1 < d0 && d1 < 3.0 * w) {
      // passed close to a surface: find the true closest approach
      float a = t0;
      float b = t;
      for (int j = 0; j < 6; j++) {
        float m1 = mix(a, b, 0.382);
        float m2 = mix(a, b, 0.618);
        if (sdf(ro + rd * m1) < sdf(ro + rd * m2)) b = m2;
        else a = m1;
      }
      float m = 0.5 * (a + b);
      vec3 q = ro + rd * m;
      edge = min(edge, sdf(q) / ((ro.z - q.z) / (ro.z * uDpr)));
    }
    d0 = d1;
    t0 = t1;
    d1 = d;
    t1 = t;
    t += d;
    if (t > tEnd) break;
  }

  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float w = (ro.z - p.z) / (ro.z * uDpr);
    vec3 n = normalAt(p, 0.5 * w);
    float lambert = dot(n, uL);
    float v = lambert > 0.0 ? lambert * lit(p + n * 2.0 * w) : lambert;
    vec3 q = local(p);
    float lw = 0.75 * w / uS / max(abs(dot(rd, n)), 0.2);
    float flange = dFlange(q);
    float column = dColumn(q);
    float link1 = dLink1(q);
    float cap = dCap(q);
    float pin = dPin(q);
    float link2 = dLink2(q);
    float collar = dCollar(q);
    float rod = dRod(q);
    float pd = dPad(q);
    float rl = rail(p) / uS;
    // painted links on black anodised parts; the black only turns white where it faces the light
    float painted = min(min(link1, link2), cap);
    bool anodised = min(min(min(flange, column), min(pin, collar)), min(min(rod, pd), rl)) < painted;
    float tone = anodised ? clamp((v - 0.78) / 0.12, 0.0, 1.0) : clamp((v - 0.12) / 0.3, 0.0, 1.0);
    vec3 col = tone > threshold ? uLit : uShade;
    // where two parts meet, the middle of each rounded edge, the panels on the links
    bool ln = max(abs(flange), abs(column)) < lw || max(abs(column), abs(link1)) < lw ||
      max(abs(link1), abs(cap)) < lw || max(abs(link1), abs(pin)) < lw ||
      max(abs(pin), abs(link2)) < lw || max(abs(link2), abs(collar)) < lw ||
      max(abs(collar), abs(rod)) < lw || max(abs(rod), abs(pd)) < lw ||
      max(abs(column), abs(rl)) < lw || max(abs(flange), abs(rl)) < lw;
    if (abs(link1) < lw) {
      float s = seg(q.xy, vec2(0.0), uE);
      ln = ln || crease(vec2(s - 17.0, abs(q.z - 0.5 * (L1_0 + L1_1)) - 6.0), lw) ||
        (q.z > L1_1 - 1.0 && abs(s - 15.0) < lw);
    }
    if (abs(link2) < lw) {
      float s = seg(q.xy, uE, uW);
      ln = ln || crease(vec2(s - 13.0, abs(q.z - 0.5 * (L2_0 + L2_1)) - 6.0), lw) ||
        (q.z > L2_1 - 1.0 && abs(s - 10.5) < lw);
    }
    if (abs(column) < lw) ln = ln || crease(vec2(length(q.xy) - 30.0, abs(q.z - 0.5 * (8.0 + COL)) - 0.5 * (COL - 8.0) + 3.0), lw);
    if (abs(pd) < lw) {
      float h = 0.5 * padH();
      ln = ln || crease(vec2(box2(q.xy - uW, pad() - 3.0), abs(q.z - uP - h) - h + 3.0), lw);
    }
    if (abs(cap) < lw && length(q.xy) < 13.0 && q.z > L1_1 + 4.0) col = uAccent;
    if (ln) col = tone > 0.5 ? uShade : uLit;
    if (edge < 1.25) col = pen;
    color = vec4(col, 1.0);
    return;
  }

  if (edge < 1.25) {
    color = vec4(pen, 1.0);
    return;
  }

  // the page dithers out under paper before it is written again
  if (uCover > 0.0 && inside(px, uDoc) && bayer8(floor(px / 3.0)) < uCover) {
    color = vec4(uNight > 0.5 ? uShade : uLit, 1.0);
    return;
  }

  // the card, carried flat: the page under it is hidden, and it takes the arm's shadow
  bool shadow = false;
  bool onCard = false;
  if (uCard.z > 0.0) {
    vec3 c = ro + rd * ((uCardZ - ro.z) / rd.z);
    if (inside(c.xy, uCard)) {
      onCard = true;
      shadow = shaded((c.xy - uL.xy / uL.z * uCardZ - uB) / uS);
    }
  }
  vec3 p0 = ro + rd * tEnd;
  if (!onCard) {
    shadow = shaded((p0.xy - uB) / uS) || (uCard.z > 0.0 && inside(p0.xy + uL.xy / uL.z * uCardZ, uCard));
  }
  // a light, sparse screen in the line tone
  if (shadow && threshold < 0.14) {
    color = line;
    return;
  }

  // the blow pushes a wave of dust out from under the card, inside the window
  if (uPuff > 0.0 && uPuff < 1.0 && !onCard && inside(p0.xy, uDoc)) {
    vec2 q = abs(p0.xy - (uHit.xy + 0.5 * uHit.zw)) - 0.5 * uHit.zw;
    float out_ = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    // each speck flies its own distance, so the front breaks up as it spreads
    vec2 cell = floor(px / 2.0);
    float speck = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float reach = fract(sin(dot(cell, vec2(39.3468, 11.135))) * 24634.6345);
    float front = 1.0 + (3.0 + 11.0 * reach) * (1.0 - (1.0 - uPuff) * (1.0 - uPuff));
    float x = (out_ - front) / 2.5;
    if (out_ > 1.0 && speck < (1.0 - uPuff) * exp(-x * x) * 0.4) color = line;
  }
}
`;

/** shoulder and elbow angles that put the wrist at `target` (arm units, base at the origin), the
 * elbow on side `bend` */
export function reach(target: Vec2, bend: 1 | -1): Vec2 {
  const d = Math.min(
    LINK1 + LINK2 - 1,
    Math.max(Math.abs(LINK1 - LINK2) + 1, Math.hypot(target[0], target[1])),
  );
  const a = Math.atan2(target[1], target[0]);
  const alpha = Math.acos((LINK1 * LINK1 + d * d - LINK2 * LINK2) / (2 * LINK1 * d));
  const beta = Math.acos((LINK1 * LINK1 + LINK2 * LINK2 - d * d) / (2 * LINK1 * LINK2));
  return [a - bend * alpha, bend * (Math.PI - beta)];
}

/** elbow and wrist for the joint angles, arm units */
export function joints(shoulder: number, elbow: number): [Vec2, Vec2] {
  const e: Vec2 = [LINK1 * Math.cos(shoulder), LINK1 * Math.sin(shoulder)];
  const a = shoulder + elbow;
  return [e, [e[0] + LINK2 * Math.cos(a), e[1] + LINK2 * Math.sin(a)]];
}
