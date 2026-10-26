import { bayer8 } from '../../lib/glsl';

export type Vec2 = [number, number];

/** a deck's layout, arm units round the pivot: its middle and half size; where its valve block,
 * gauge and the ring's servo stand; and where she stands, and how high */
export interface Deck {
  box: [number, number, number, number];
  valve: Vec2;
  gauge: Vec2;
  motor: Vec2;
  seat: [number, number, number];
}

/** on the bed: she stands left of the mast, over her plate's blank corner, the valve and the gauge
 * past her; the servo turns the ring from below it, so nothing reaches far right of the mast and the
 * head gets as close to the last plate's edge as to any seam */
export const BED_DECK: Deck = {
  box: [-53, 0, 97, 58],
  valve: [-122, 34],
  gauge: [-124, -34],
  motor: [0, 49],
  seat: [-44, 0, 186],
};

/** up a phone's column: all of it inside the column, she over the ring with the mast behind her */
export const COLUMN_DECK: Deck = {
  box: [0, 0, 58, 58],
  valve: [-38, 40],
  gauge: [38, 40],
  motor: [0, 49],
  seat: [3, 0, 186],
};
/** the rail band at the bed's foot, CSS px: its height and the rail's line; where the carriage
 * parks, in from the left end (its travel ends at the last plate's station); and how far from the
 * right end the drag chain is anchored */
export const BED = { height: 76, rail: 38, start: 160, anchor: 30 } as const;
/** the telescoping mast, arm units: its base stage, the 3 that slide out of it and how much each
 * overlaps the last, so it reaches from `base` (retracted) to `base + 3 * (stage - overlap)` */
export const MAST = { base: 140, stage: 146, overlap: 20 } as const;
export const MAST_MAX = MAST.base + 3 * (MAST.stage - MAST.overlap);
/** the head at the mast's tip: half its length along the mast and its width across, arm units;
 * along, it stays inside the margin round a plate's cell */
export const HEAD = { along: 13, across: 22, top: 184 } as const;
/** her pencil, on a pin under the head's middle: its body's length from the pin, its cone and its
 * radius, arm units; how high it rides, down on the plate and lifted */
export const PENCIL = { length: 130, cone: 52, radius: 11 } as const;
export const PEN = { down: 26, up: 60 } as const;

/**
 * A punk plotter on a carriage, drawn in arm units around its pivot: a bolted deck with a hazard
 * band, a valve block and a gauge; a slewing ring low on its housing, turned by a servo's pinion,
 * the rig's Y axis on it, a 4-stage hydraulic mast fed by a hose from the valve; at its tip a head,
 * and on a pin under it her pencil, which tips up out of the page to unfold across a plate and drags
 * its line down it. The stage is the page, z = 0, with z up toward the viewer; the camera's image
 * plane stays parallel to it, so the windows stay frontal and only the rig, a solid, shows its
 * sides. She stands on the deck, drawn apart; here she only casts her shadow.
 */
export const fragment = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec3 uCam;
uniform vec2 uB;
uniform float uS;
uniform float uTheta;
uniform float uM;
uniform float uPsi;
uniform float uPitch;
uniform float uPen;
uniform float uGauge;
uniform vec4 uScan;
uniform vec4 uDoc;
uniform vec4 uBay;
uniform float uCover;
uniform vec3 uL;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uAccent;
uniform vec3 uYellow;
uniform vec4 uLine;
uniform float uNight;
uniform vec4 uClip;
uniform vec3 uMate;
uniform float uMateZ;
uniform sampler2D uSprite;
uniform float uTop;
/** the deck's layout, arm units round the pivot: its middle and half size, and where its valve
 * block, gauge and servo stand */
uniform vec4 uDeck;
uniform vec2 uValve;
uniform vec2 uDial;
uniform vec2 uMotor;
out vec4 color;
${bayer8}
const float BASE = ${MAST.base}.0;
const float STAGE = ${MAST.stage}.0;
const float MAST_Z = 158.0;
const vec2 HEAD = vec2(${HEAD.along}.0, ${HEAD.across}.0);
const float PENCIL_R = ${PENCIL.radius}.0;
const float LP = ${PENCIL.length}.0;
const float CONE = ${PENCIL.cone}.0;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

/** an outline at 2D distance d standing from z0 to z1, its edges rounded by r */
float slab(float d, float z, float z0, float z1, float r) {
  vec2 q = vec2(d + r, abs(z - 0.5 * (z0 + z1)) - 0.5 * (z1 - z0) + r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float cyl(vec3 p, vec2 c, float radius, float z0, float z1, float r) {
  return slab(length(p.xy - c) - radius, p.z, z0, z1, r);
}

float bar(vec3 p, vec2 a, vec2 b, float w, float z0, float z1, float r) {
  return slab(seg(p.xy, a, b) - w, p.z, z0, z1, r);
}

float box2(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

float tube(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

/** a hexagon, flat sides at y = +-r */
float hex(vec2 p, float r) {
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  return length(p - vec2(clamp(p.x, -k.z * r, k.z * r), r)) * sign(p.y - r);
}

vec2 perp(vec2 v) { return vec2(-v.y, v.x); }

vec2 rot(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

/** p folded into the first of n sectors around the origin */
vec2 fold(vec2 p, float n) {
  float s = 6.2831853 / n;
  float a = mod(atan(p.y, p.x) + 0.5 * s, s) - 0.5 * s;
  return length(p) * vec2(cos(a), sin(a));
}

/** a spur gear's outline: root radius r, n teeth this deep, p already turned to the gear */
float gear(vec2 p, float r, float n, float depth) {
  vec2 f = fold(p, n);
  return min(length(p) - r, box2(f - vec2(r + 0.5 * depth, 0.0), vec2(0.5 * depth, 1.5707963 * r / n)));
}

/** distance to a quadratic bezier, after Inigo Quilez */
float bezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;
  float kk = 1.0 / dot(b, b);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);
  float p = ky - kx * kx;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p * p * p;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    vec2 e = d + (c + b * t) * t;
    return sqrt(dot(e, e));
  }
  float z = sqrt(-p);
  float v = acos(q / (p * z * 2.0)) / 3.0;
  float m = cos(v);
  float n = sin(v) * 1.732050808;
  vec2 t = clamp(vec2(m + m, -n - m) * z - kx, 0.0, 1.0);
  vec2 e = d + (c + b * t.x) * t.x;
  vec2 g = d + (c + b * t.y) * t.y;
  return sqrt(min(dot(e, e), dot(g, g)));
}


// the frames, set once a pixel: the mast along d, its side n, the head h; the pencil on its pin
// under the head at height uPen, turned to e and tipped up out of the page by uPitch: along a,
// across pe, and c, up from its top face; all from the pivot in arm units
vec2 d;
vec2 n;
vec2 e;
vec2 pe;
vec2 h;
vec3 a;
vec3 c;
/** the ring gear and the pinion turned with the mast: cos, sin of each */
vec4 spin;
void frames() {
  spin = vec4(cos(uTheta), -sin(uTheta), cos(uTheta * 4.4), sin(uTheta * 4.4));
  d = vec2(cos(uTheta), sin(uTheta));
  n = vec2(d.y, -d.x);
  e = vec2(cos(uPsi), sin(uPsi));
  pe = perp(e);
  h = d * uM;
  a = vec3(e * cos(uPitch), sin(uPitch));
  c = vec3(-e * sin(uPitch), cos(uPitch));
}

/** q in the pencil's frame: along it from the pin, across it, and up from its axis */
vec3 pencil(vec3 q) {
  vec3 r = q - vec3(h, uPen);
  return vec3(dot(r, a), dot(r.xy, pe), dot(r, c));
}

// ---- the deck and the pedestal, bolted to the page: the slewing ring sits low on its housing, so
// from high up nothing of it reaches much past the mast's sides
float dPlate(vec3 q) { return slab(box2(q.xy - uDeck.xy, uDeck.zw - 14.0) - 14.0, q.z, 0.0, 10.0, 2.0); }
float dBolts(vec3 q) {
  vec2 c = abs(q.xy - uDeck.xy) - uDeck.zw + 16.0;
  if (q.z > 22.0 || dot(c, c) > 100.0) return max(length(c) - 5.5, q.z - 15.0);
  return slab(hex(c, 5.0), q.z, 9.0, 15.0, 1.0);
}
float dHousing(vec3 q) { return cyl(q, vec2(0.0), 42.0, 8.0, 50.0, 3.0); }
float dRing(vec3 q) {
  float r = length(q.xy);
  if (r > 47.0 || abs(q.z - 55.0) > 11.0) return max(r - 41.0, abs(q.z - 55.0) - 5.0);
  vec2 g = vec2(spin.x * q.x - spin.y * q.y, spin.y * q.x + spin.x * q.y);
  return slab(r < 32.0 ? r - 36.0 : gear(g, 36.0, 28.0, 5.0), q.z, 50.0, 60.0, 1.0);
}
/** a circle of bolts on the ring's top face, turning with it */
float dRimBolts(vec3 q) {
  float r = length(q.xy);
  if (abs(r - 33.5) > 5.0 || abs(q.z - 61.5) > 5.0) return max(abs(r - 33.5) - 2.5, abs(q.z - 61.5) - 2.0);
  vec2 g = vec2(spin.x * q.x - spin.y * q.y, spin.y * q.x + spin.x * q.y);
  return slab(hex(fold(g, 10.0) - vec2(33.5, 0.0), 1.9), q.z, 59.0, 63.0, 0.6);
}
float dColumn(vec3 q) {
  float r = length(q.xy);
  float d = r - 27.0;
  if (r < 38.0) d = min(d, box2(fold(q.xy, 10.0) - vec2(29.0, 0.0), vec2(3.0, 2.2)));
  return slab(d, q.z, 60.0, 146.0, 1.5);
}
/** the servo under the pinion that turns the ring */
float dMotor(vec3 q) {
  float r = length(q.xy - uMotor);
  float d = slab(r - 10.0, q.z, 8.0, 50.0, 2.5);
  // cooling fins round it
  if (r < 15.0) d = min(d, max(slab(r - 12.0, q.z, 14.0, 44.0, 0.5), abs(mod(q.z, 7.0) - 3.5) - 1.2));
  return d;
}
float dPinion(vec3 q) {
  vec2 c = q.xy - uMotor;
  if (dot(c, c) > 225.0 || abs(q.z - 55.0) > 10.0) return max(length(c) - 11.0, abs(q.z - 55.0) - 5.0);
  return slab(gear(vec2(spin.z * c.x - spin.w * c.y, spin.w * c.x + spin.z * c.y), 8.0, 9.0, 3.0), q.z, 50.0, 60.0, 1.0);
}
/** the valve block, its handle toward the deck's middle */
float dValve(vec3 q) {
  float hs = uValve.x < 0.0 ? 1.0 : -1.0;
  float bound = max(box2(q.xy - uValve - vec2(6.0 * hs, 2.0), vec2(26.0, 15.0)), q.z - 34.0);
  if (bound > 4.0) return bound;
  float d = slab(box2(q.xy - uValve, vec2(17.0, 11.0)), q.z, 8.0, 28.0, 2.5);
  d = min(d, cyl(q, uValve + vec2(-10.0, 0.0), 3.4, 26.0, 33.0, 1.0));
  d = min(d, cyl(q, uValve, 3.4, 26.0, 33.0, 1.0));
  d = min(d, cyl(q, uValve + vec2(10.0, 0.0), 3.4, 26.0, 33.0, 1.0));
  d = min(d, bar(q, uValve + vec2(17.0 * hs, 3.0), uValve + vec2(29.0 * hs, 9.0), 2.2, 18.0, 23.0, 1.0));
  return d;
}
float dGauge(vec3 q) { return cyl(q, uDial, 12.0, 8.0, 30.0, 2.5); }
float dHub(vec3 q) { return cyl(q, vec2(0.0), 28.0, 146.0, 166.0, 3.0); }
/** the pivot's nut on its washer */
float dNut(vec3 q) {
  if (dot(q.xy, q.xy) > 260.0 || q.z < 166.0) return max(length(q.xy) - 14.0, 168.0 - q.z);
  return min(cyl(q, vec2(0.0), 13.0, 170.0, 175.0, 1.0), slab(hex(q.xy, 8.5), q.z, 172.0, 181.0, 1.5));
}

// ---- the mast: a base stage on the ring, 3 stages sliding out of it, a gland ring at each mouth
/** a stage's box in the mast's frame (x along it, y across): from a to b, w wide, hz high */
float stage(vec3 q, vec2 m, float a, float b, float w, float hz) {
  return slab(box2(vec2(m.x - 0.5 * (a + b), m.y), vec2(0.5 * (b - a), w)), q.z, MAST_Z - hz, MAST_Z + hz, 2.0);
}
float dBaseStage(vec3 q, vec2 m) { return stage(q, m, -18.0, BASE, 13.0, 14.0); }
float dStages(vec3 q, vec2 m) {
  float x = max(uM - BASE, 0.0) / 3.0;
  float d = stage(q, m, BASE - STAGE + x, BASE + x, 10.5, 11.5);
  d = min(d, stage(q, m, BASE - STAGE + 2.0 * x, BASE + 2.0 * x, 8.0, 9.0));
  return min(d, stage(q, m, BASE - STAGE + 3.0 * x, BASE + 3.0 * x, 5.5, 6.5));
}
float dGlands(vec3 q, vec2 m) {
  float x = max(uM - BASE, 0.0) / 3.0;
  float d = stage(q, m, BASE - 7.0, BASE, 15.5, 16.0);
  d = min(d, stage(q, m, BASE + x - 6.0, BASE + x, 13.0, 13.5));
  return min(d, stage(q, m, BASE + 2.0 * x - 5.0, BASE + 2.0 * x, 10.5, 11.0));
}
/** the hose from the valve block up to the base stage's side nearer it */
float dHose(vec3 q) {
  vec2 a = uValve + vec2(uValve.x < 0.0 ? 10.0 : -10.0, -10.0);
  float side = dot(n, uValve) < 0.0 ? -1.0 : 1.0;
  vec2 b = d * 52.0 + n * (16.0 * side);
  vec2 k = 0.5 * (a + b) + n * (26.0 * side);
  float bound = max(box2(q.xy - 0.5 * (a + b), abs(0.5 * (b - a)) + 34.0), q.z - 172.0);
  if (bound > 4.0) return bound;
  float t = clamp(dot(q.xy - a, b - a) / dot(b - a, b - a), 0.0, 1.0);
  return length(vec2(bezier(q.xy, a, k, b), q.z - mix(32.0, MAST_Z, t))) - 3.0;
}

// ---- the head at the mast's tip, the pin under it, her pencil on the pin
float dHead(vec3 q, vec2 m) {
  return slab(box2(vec2(m.x - uM, m.y), HEAD - 4.0) - 4.0, q.z, 146.0, ${HEAD.top}.0, 4.0);
}
float dPost(vec3 q) { return cyl(q, h, 6.0, uPen + 10.0, 160.0, 2.0); }
/** her pencil, f in its frame: its butt end stays under the head, folded along the mast or out
 * across a plate */
float dPencil(vec3 f) {
  vec2 yz = f.yz;
  float body = max(hex(yz, PENCIL_R), max(-12.0 - f.x, f.x - LP - 4.0));
  float u = clamp((f.x - LP - 4.0) / CONE, 0.0, 1.0);
  float cone = max(hex(yz, PENCIL_R * (1.0 - u) + 0.6), max(LP + 4.0 - f.x, f.x - LP - 4.0 - CONE));
  return min(body, cone);
}

#define N 19
float part[N];

/** every part's distance at q (arm units) */
void parts(vec3 q) {
  vec2 m = vec2(dot(q.xy, d), dot(q.xy, perp(d)));
  part[0] = dPlate(q);
  part[1] = dBolts(q);
  part[2] = dHousing(q);
  part[3] = dRimBolts(q);
  part[4] = dColumn(q);
  part[5] = dMotor(q);
  part[6] = dPinion(q);
  part[7] = dValve(q);
  part[8] = dGauge(q);
  part[9] = dRing(q);
  part[10] = dHub(q);
  part[11] = dNut(q);
  part[12] = dBaseStage(q, m);
  part[13] = dStages(q, m);
  part[14] = dGlands(q, m);
  part[15] = dHose(q);
  part[16] = dHead(q, m);
  part[17] = dPost(q);
  part[18] = dPencil(pencil(q));
}

/** the rig's distance at q (arm units), each group only near its bound */
float rig(vec3 q) {
  float d0;
  float bound = max(box2(q.xy - uDeck.xy, uDeck.zw), q.z - 156.0);
  if (bound < 6.0) {
    d0 = q.z - 70.0;
    if (q.z < 76.0) {
      d0 = min(min(dPlate(q), dBolts(q)), min(dHousing(q), dRing(q)));
      d0 = min(d0, min(min(dValve(q), dGauge(q)), min(dMotor(q), dPinion(q))));
      d0 = min(d0, dRimBolts(q));
    }
    d0 = min(d0, dColumn(q));
  } else d0 = bound;
  bound = max(length(q.xy) - 34.0, abs(q.z - 164.0) - 22.0);
  if (bound < 6.0) d0 = min(d0, min(dHub(q), dNut(q)));
  else d0 = min(d0, bound);
  vec2 m = vec2(dot(q.xy, d), dot(q.xy, perp(d)));
  bound = max(box2(vec2(m.x - 0.5 * (uM - 20.0), m.y), vec2(0.5 * (uM + 20.0), 18.0)), abs(q.z - MAST_Z) - 20.0);
  if (bound < 6.0) d0 = min(d0, min(min(dBaseStage(q, m), dStages(q, m)), dGlands(q, m)));
  else d0 = min(d0, bound);
  d0 = min(d0, dHose(q));
  vec3 pin = vec3(h, uPen);
  bound = max(box2(vec2(m.x - uM, m.y), HEAD + 6.0), q.z - 190.0);
  bound = min(bound, tube(q, pin - a * 16.0, pin + a * (LP + CONE + 6.0), 18.0));
  if (bound < 6.0) d0 = min(d0, min(min(dHead(q, m), dPost(q)), dPencil(pencil(q))));
  else d0 = min(d0, bound);
  return d0;
}

vec3 local(vec3 p) { return vec3((p.xy - uB) / uS, p.z / uS); }

float sdf(vec3 p) { return rig(local(p)) * uS; }

vec3 normalAt(vec3 p, float e0) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sdf(p + k.xyy * e0) + k.yyx * sdf(p + k.yyx * e0) +
    k.yxy * sdf(p + k.yxy * e0) + k.xxx * sdf(p + k.xxx * e0)
  );
}

/** whether her outline covers screen point px */
bool mateAt(vec2 px) {
  ivec2 size = textureSize(uSprite, 0);
  vec2 cell = floor((px - uMate.xy) / uMate.z);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= float(size.x) || cell.y >= float(size.y)) return false;
  return texelFetch(uSprite, ivec2(int(cell.x), size.y - 1 - int(cell.y)), 0).r > 0.5;
}

/** whether she sits between world point p and the light */
bool underMate(vec3 p) {
  if (p.z >= uMateZ) return false;
  vec3 s = p + uL * ((uMateZ - p.z) / uL.z);
  float k = uCam.z / (uCam.z - uMateZ);
  return mateAt(uCam.xy + (s.xy - uCam.xy) * k);
}

/** 2D distance to the rig's footprint, arm units: a bound for every part */
float skeleton(vec2 p) {
  float d0 = min(box2(p - uDeck.xy, uDeck.zw), seg(p, -d * 24.0, d * (uM + 24.0)) - 30.0);
  d0 = min(d0, seg(p, h - a.xy * 18.0, h + a.xy * (LP + CONE + 8.0)) - 20.0);
  return min(d0, box2(p - uValve, vec2(40.0)));
}

float segseg(vec2 a, vec2 b, vec2 p, vec2 q) {
  vec2 ab = b - a;
  vec2 pq = q - p;
  vec2 ap = p - a;
  float den = ab.x * pq.y - ab.y * pq.x;
  if (abs(den) > 1e-6) {
    float s = (ap.x * pq.y - ap.y * pq.x) / den;
    float t = (ap.x * ab.y - ap.y * ab.x) / den;
    if (s >= 0.0 && s <= 1.0 && t >= 0.0 && t <= 1.0) return 0.0;
  }
  return min(min(seg(a, p, q), seg(b, p, q)), min(seg(p, a, b), seg(q, a, b)));
}

/** whether page point p (arm units) is in the shadow of the carriage: the parts riding in the bay */
bool shadedCarriage(vec2 p) {
  vec2 s = uL.xy / uL.z;
  vec2 o = vec2(0.0);
  if (segseg(p + s * 8.0, p + s * 60.0, o, o) < 41.0) return true;
  if (segseg(p + s * 60.0, p + s * 146.0, o, o) < 29.0) return true;
  if (segseg(p + s * 8.0, p + s * 60.0, uMotor, uMotor) < 11.0) return true;
  return segseg(p + s * 146.0, p + s * 181.0, o, o) < 28.0;
}

/** whether page point p is in the shadow of what reaches over the plates: the mast, its head and
 * the pencil under it */
bool shadedReach(vec2 p) {
  vec2 s = uL.xy / uL.z;
  if (segseg(p + s * 144.0, p + s * 172.0, d * 30.0, h) < 13.0) return true;
  vec2 across = perp(d) * (HEAD.y - HEAD.x);
  if (segseg(p + s * 146.0, p + s * ${HEAD.top}.0, h - across, h + across) < HEAD.x) return true;
  if (segseg(p + s * (uPen + 10.0), p + s * 160.0, h, h) < 6.0) return true;
  vec3 p0 = vec3(h, uPen) - a * 12.0;
  vec3 p1 = vec3(h, uPen) + a * (LP + 4.0 + 0.6 * CONE);
  return seg(p, p0.xy - s * p0.z, p1.xy - s * p1.z) < PENCIL_R;
}

/** 1 when nothing stands between world point p and the light, 0 in the rig's own shadow */
float lit(vec3 p) {
  // her shadow is soft, so on the deck she stands on it dithers rather than blacks it out
  if (underMate(p)) return 0.25;
  float t = 0.5;
  for (int i = 0; i < 24; i++) {
    vec3 q = p + uL * t;
    if (q.z > uTop) break;
    float dd = sdf(q);
    if (dd < 0.05) return 0.0;
    t += max(dd, 0.8 * uS);
  }
  return 1.0;
}

bool inside(vec2 p, vec4 r) {
  return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.z && p.y <= r.y + r.w;
}

/** a 3x5 stencil glyph's cell, bits row by row from the top */
bool glyph(int bits, ivec2 k) {
  if (k.x < 0 || k.y < 0 || k.x > 2 || k.y > 4) return false;
  return ((bits >> ((4 - k.y) * 3 + (2 - k.x))) & 1) == 1;
}

/** "MDX", stencilled on the head's face, 2.8 arm units a cell */
bool stencil(vec2 p) {
  ivec2 i = ivec2(floor(p / 2.8 + vec2(5.5, 2.5)));
  int letter = i.x / 4;
  ivec2 k = ivec2(i.x - letter * 4, i.y);
  if (i.x < 0 || letter > 2 || k.x > 2) return false;
  int bits = letter == 0 ? 0x5FED : letter == 1 ? 0x6B6E : 0x5AAD;
  return glyph(bits, k);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  color = vec4(0.0);
  if (px.x < uClip.x || px.y < uClip.y || px.x > uClip.z || px.y > uClip.w) return;
  frames();

  vec3 ro = uCam;
  vec3 rd = normalize(vec3(px - uCam.xy, -uCam.z));
  float threshold = bayer8(floor(px / 2.0));
  vec3 pen = uNight > 0.5 ? uLit : uShade;
  vec4 line = vec4(uLine.rgb * uLine.a, uLine.a);

  float t = (uTop - ro.z) / rd.z;
  float tEnd = -ro.z / rd.z;
  float hit = -1.0;
  float edge = 1e9;
  float d0 = 1e9;
  float t0 = t;
  float d1 = 1e9;
  float t1 = t;
  vec2 top = (ro + rd * t).xy;
  vec2 mid = (0.5 * (top + px) - uB) / uS;
  bool near = skeleton(mid) * uS - 0.5 * length(top - px) < 3.0;
  int searches = 0;
  for (int i = 0; i < (near ? 64 : 0); i++) {
    vec3 p = ro + rd * t;
    float w = (ro.z - p.z) / (ro.z * uDpr);
    float dd = sdf(p);
    if (dd < 0.25 * w) { hit = t; break; }
    if (dd > d1 && d1 < d0 && d1 < 3.0 * w && searches < 2) {
      // passed close to a surface: the closest approach, from a parabola through the last 3 steps
      searches++;
      float x0 = t0 - t1;
      float x2 = t - t1;
      float den = x0 * (d1 - dd) - x2 * (d1 - d0);
      float mm = abs(den) > 1e-6 ? t1 - 0.5 * (x0 * x0 * (d1 - dd) - x2 * x2 * (d1 - d0)) / den : t1;
      mm = clamp(mm, t0, t);
      vec3 q = ro + rd * mm;
      edge = min(edge, sdf(q) / ((ro.z - q.z) / (ro.z * uDpr)));
    }
    d0 = d1;
    t0 = t1;
    d1 = dd;
    t1 = t;
    t += max(dd, 0.4 * w);
    if (t > tEnd) break;
  }

  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float w = (ro.z - p.z) / (ro.z * uDpr);
    vec3 nn = normalAt(p, 0.5 * w);
    float lambert = dot(nn, uL);
    float v = lambert > 0.0 ? lambert * lit(p + nn * 2.0 * w) : lambert;
    vec3 q = local(p);
    float lw = 0.75 * w / uS / max(abs(dot(rd, nn)), 0.2);
    vec3 col;
    parts(q);
    int id = 0;
    float best = 1e9;
    float second = 1e9;
    for (int i = 0; i < N; i++) {
      float dd = abs(part[i]);
      if (dd < best) {
        second = best;
        best = dd;
        id = i;
      } else if (dd < second) second = dd;
    }
    bool face = nn.z > 0.7;
    // painted plates, the hub, the base stage and the head; black anodised steel; chrome stages
    bool painted = id == 0 || id == 2 || id == 7 || id == 8 || id == 10 || id == 12 || id == 16;
    bool chrome = id == 13 || id == 17;
    float tone = painted ? clamp((v - 0.12) / 0.3, 0.0, 1.0) : clamp((v - 0.74) / 0.14, 0.0, 1.0);
    if (chrome) tone = v > 0.86 ? 1.0 : 0.0;
    col = tone > threshold ? uLit : uShade;
    if (id == 1 || id == 3) col = tone > 0.4 ? uYellow : uShade;
    vec2 m = vec2(dot(q.xy, d), dot(q.xy, perp(d)));
    vec2 f = pencil(q).xy;
    if (id == 0 && face) {
      // a hazard band round the deck, rivets inside it
      vec2 k = q.xy - uDeck.xy;
      float bnd = box2(k, uDeck.zw - 14.0) - 14.0;
      if (bnd > -9.0) col = mod(k.x + k.y, 12.0) < 6.0 ? uYellow : uShade;
      if (abs(bnd + 9.5) < lw) col = uShade;
      vec2 a = abs(k) - uDeck.zw + 13.0;
      bool rx = abs(a.x) < 1.6 && abs(mod(k.y + 6.0, 12.0) - 6.0) < 1.6 && a.y < -24.0;
      bool ry = abs(a.y) < 1.6 && abs(mod(k.x + 6.0, 12.0) - 6.0) < 1.6 && a.x < -24.0;
      if (rx || ry) col = uShade;
    }
    if (id == 8 && face) {
      // the gauge: a ring of ticks, its needle on the pressure, an accent tip
      vec2 g = q.xy - uDial;
      float r = length(g);
      float ang = atan(g.y, g.x);
      float needle = -2.4 + 2.2 * uGauge;
      vec2 nd = vec2(cos(needle), sin(needle));
      float along = dot(g, nd);
      bool hand = along > -1.5 && along < 8.5 && abs(dot(g, perp(nd))) < 1.3;
      bool tick = r > 7.0 && r < 9.8 && abs(mod(ang + 3.1415927, 0.7854) - 0.3927) < 0.15 && sin(ang) < 0.55;
      if (r > 10.4 || tick || r < 2.2) col = uShade;
      if (hand) col = along > 6.0 ? uAccent : uShade;
    }
    if (id == 7 && face) {
      // the valve block's seams
      vec2 v2 = q.xy - uValve;
      if (abs(abs(v2.x) - 5.0) < lw && abs(v2.y) < 8.0) col = uShade;
    }
    if (id == 12 && face) {
      // rivet rows down the base stage, and chevrons toward its mouth
      bool rivet = abs(abs(m.y) - 9.0) < 1.4 && abs(mod(m.x - 4.0, 14.0) - 7.0) < 1.4 && m.x > 8.0 && m.x < BASE - 34.0;
      float cx = m.x - (BASE - 30.0);
      bool chevron = cx > 0.0 && cx < 20.0 && abs(m.y) < 8.0 && mod(cx - abs(m.y) * 0.8, 10.0) < 3.5;
      if (rivet || chevron) col = uShade;
    }
    if (id == 16 && face) {
      // the head's corner bolts and its stencil
      vec2 k = vec2(m.x - uM, m.y);
      vec2 a = abs(k) - HEAD + 5.0;
      if (length(a) < 2.2 || stencil(vec2(k.y, -k.x))) col = uShade;
    }
    if (id == 15) {
      // cable ties round the hose
      if (abs(mod(length(q.xy - uValve), 26.0) - 13.0) < 1.4) col = tone > 0.5 ? uLit : uYellow;
    }
    if (id == 18) {
      // her pencil: black bands, the black and yellow one by the point, the facets, bare wood and
      // the lead
      bool ringBand = f.x > LP - 16.0 && f.x < LP - 13.0;
      bool black = f.x < -4.0 || (f.x > 36.0 && f.x < 44.0) || (f.x > LP - 48.0 && f.x < LP - 40.0) || (f.x > LP - 20.0 && f.x < LP - 9.0);
      if (black) col = tone > 0.92 ? uLit : uShade;
      if (ringBand) col = uYellow;
      if (f.x > LP + 4.0) {
        col = tone > 0.25 && threshold < 0.8 ? uLit : uShade;
        if (f.x > LP + 4.0 + CONE - 15.0) col = uShade;
      }
      if (!black && !ringBand && f.x > -4.0 && f.x < LP + 4.0 && abs(abs(f.y) - 0.57735 * PENCIL_R) < lw) col = uShade;
    }
    if (second < lw) col = tone > 0.5 ? uShade : uLit;
    if (edge < 1.25) col = pen;
    color = vec4(col, 1.0);
    return;
  }

  if (edge < 1.25) {
    color = vec4(pen, 1.0);
    return;
  }

  // the line the pencil drags across its plate: the output above it, the Markdown below
  if (uScan.w > 0.5 && px.x >= uScan.x && px.x < uScan.y && px.y >= uScan.z && px.y < uScan.z + 1.0) {
    color = vec4(pen, 1.0);
    return;
  }

  // the page dithers out under paper before it is written again
  if (uCover > 0.0 && inside(px, uDoc) && bayer8(floor(px / 3.0)) < uCover) {
    color = vec4(uNight > 0.5 ? uShade : uLit, 1.0);
    return;
  }

  // shadows on the page: what rides in the bay keeps its shadow there, the reach casts its own on
  // the plates
  vec3 p0 = ro + rd * tEnd;
  vec2 a0 = (p0.xy - uB) / uS;
  bool shadow = inside(px, uDoc) &&
    (shadedReach(a0) || (inside(px, uBay) && (shadedCarriage(a0) || underMate(p0))));
  if (shadow && threshold < 0.14) color = line;
}
`;
