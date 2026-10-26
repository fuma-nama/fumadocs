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

/** on the bed: she stands on the deck's far end, left of the pivot and clear of the boom's
 * counterweight; the valve block and the gauge stand on its front edge, where she leaves it bare */
export const BED_DECK: Deck = {
  box: [-52, 0, 110, 58],
  valve: [-72, 36],
  gauge: [40, 38],
  motor: [0, 49],
  seat: [-120, 0, 186],
};

/** up a phone's column: all of it inside the column, she over the pivot with the boom behind her,
 * the deck running on under her feet to the valve block and the gauge; the engine widens it to her */
export const COLUMN_DECK: Deck = {
  box: [0, 14, 58, 88],
  valve: [-40, 82],
  gauge: [40, 82],
  motor: [0, 49],
  seat: [0, 0, 186],
};
/** the rail band at the bed's foot, CSS px: its height and the rail's line; where the carriage
 * parks, in from the left end (its travel ends at the last plate's station); and how far from the
 * right end the drag chain is anchored */
export const BED = { height: 76, rail: 38, start: 208, anchor: 30 } as const;
/** the arm, arm units: its boom from the pivot to the elbow; her pencil, its forearm: from the
 * elbow to its point, to the trunnion it tips up on (its butt there), its radius and its cone */
export const BOOM = 340;
export const PENCIL = { reach: 290, wrist: 48, radius: 18, cone: 52 } as const;
/** how high the elbow's quill holds her pencil's axis: down, its body just off the page, and
 * lifted; the quill's yoke rides this far over it */
export const PEN = { down: 24, up: 72 } as const;
export const YOKE = 146;
/** the elbow ram: its clevis along the boom, its barrel, and the crank it pushes on the elbow */
const RAM_AT = 80;
const BARREL = 180;
const CRANK = 40;
const CRANK_ANGLE = Math.PI - 0.5;

/**
 * A punk pencil arm on a carriage, drawn in arm units around its pivot: a bolted deck with a hazard
 * band, a valve block and a gauge; a slewing ring low on its housing, turned by a servo's pinion;
 * the column and the hub, where a boom with a hazard counterweight on its tail is keyed, a hydraulic
 * ram on top working the elbow, fed by its hoses; at the elbow a quill whose wrist holds her pencil
 * as the forearm, lowering it onto a plate and lifting it off, and tipping it up out of the page on
 * its trunnion while the arm moves. The stage is the page, z = 0, with z up
 * toward the viewer; the camera's image plane stays parallel to it, so the windows stay frontal and
 * only the rig, a solid, shows its sides. She stands on the deck, drawn apart; here she only casts
 * her shadow.
 */
export const fragment = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec3 uCam;
uniform vec2 uB;
uniform float uS;
/** the elbow, arm units from the pivot; the pencil's direction on the page; its axis's height, and
 * how far it is tipped up out of the page on its trunnion */
uniform vec2 uE;
uniform vec2 uF;
uniform float uPen;
uniform float uPitch;
/** the boom's angle, which turns the ring gear and the pinion; the elbow ram's clevis, barrel end and
 * crank pin, arm units */
uniform float uTurn;
uniform vec2 uRamA;
uniform vec2 uRamB;
uniform vec2 uRamC;
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
const float BOOM = ${BOOM}.0;
const float REACH = ${PENCIL.reach}.0;
const float WRIST = ${PENCIL.wrist}.0;
const float LP = REACH - WRIST;
const float PENCIL_R = ${PENCIL.radius}.0;
const float CONE = ${PENCIL.cone}.0;
const float YOKE = ${YOKE}.0;
const float RAM_Z = 142.0;

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

// the frames, set once a pixel: the boom along u1 and across n1, the wrist along u2 and across
// n2; her pencil from its trunnion at the wrist's end, tipped up by uPitch: along a3, and c3 up
// from its top face; the ring gear and the pinion turned with the boom, cos and sin of each
vec2 u1;
vec2 n1;
vec2 u2;
vec2 n2;
vec3 a3;
vec3 c3;
vec3 trunnion;
vec4 spin;
void frames() {
  u1 = uE / BOOM;
  n1 = perp(u1);
  u2 = uF;
  n2 = perp(uF);
  a3 = vec3(u2 * cos(uPitch), sin(uPitch));
  c3 = vec3(-u2 * sin(uPitch), cos(uPitch));
  trunnion = vec3(uE + u2 * WRIST, uPen);
  spin = vec4(cos(uTurn), -sin(uTurn), cos(uTurn * 4.4), sin(uTurn * 4.4));
}

/** q in her pencil's frame: along it from its butt in the trunnion, across it, up from its axis */
vec3 pencilAt(vec3 q) {
  vec3 r = q - trunnion;
  return vec3(dot(r, a3), dot(r.xy, n2), dot(r, c3));
}

/** q turned with the boom */
vec2 turned(vec2 q) { return vec2(spin.x * q.x - spin.y * q.y, spin.y * q.x + spin.x * q.y); }

// ---- the deck and the pedestal, bolted to the page: the slewing ring low on its housing, the
// column up to the hub the boom is keyed on
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
  return slab(r < 32.0 ? r - 36.0 : gear(turned(q.xy), 36.0, 28.0, 5.0), q.z, 50.0, 60.0, 1.0);
}
/** a circle of bolts on the ring's top face, turning with it */
float dRimBolts(vec3 q) {
  float r = length(q.xy);
  if (abs(r - 33.5) > 5.0 || abs(q.z - 61.5) > 5.0) return max(abs(r - 33.5) - 2.5, abs(q.z - 61.5) - 2.0);
  return slab(hex(fold(turned(q.xy), 10.0) - vec2(33.5, 0.0), 1.9), q.z, 59.0, 63.0, 0.6);
}
float dColumn(vec3 q) {
  float r = length(q.xy);
  float d = r - 27.0;
  if (r < 38.0) d = min(d, box2(fold(q.xy, 10.0) - vec2(29.0, 0.0), vec2(3.0, 2.2)));
  return slab(d, q.z, 60.0, 100.0, 1.5);
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
/** the hub the boom is keyed on, its nut on top */
float dHub(vec3 q) {
  float d = cyl(q, vec2(0.0), 30.0, 98.0, 130.0, 3.0);
  if (dot(q.xy, q.xy) > 260.0 || q.z < 126.0) return min(d, max(length(q.xy) - 14.0, 128.0 - q.z));
  return min(d, min(cyl(q, vec2(0.0), 13.0, 128.0, 133.0, 1.0), slab(hex(turned(q.xy), 8.5), q.z, 130.0, 139.0, 1.5)));
}
/** the line from the valve block to the swivel in the housing's side */
float dPipe(vec3 q) {
  vec2 a = uValve + vec2(uValve.x < 0.0 ? 12.0 : -12.0, -9.0);
  vec2 b = normalize(a) * 43.0;
  return tube(q, vec3(a, 30.0), vec3(b, 36.0), 3.0);
}

// ---- the boom: keyed on the hub, its counterweight on its tail, rivet rows and a slot; the elbow
// ram on top fed by a hose from the hub's swivel and a line along its barrel; the quill's air line
// tied along its side
float dBoom(vec3 q, vec2 b) {
  float d = seg(b, vec2(-26.0, 0.0), vec2(BOOM, 0.0)) - 19.0;
  float slot = seg(b, vec2(BOOM - 80.0, 0.0), vec2(BOOM - 44.0, 0.0)) - 6.5;
  return slab(max(d, -slot), q.z, 106.0, 126.0, 4.0);
}
float dEye(vec3 q) { return cyl(q, uE, 26.0, 106.0, 126.0, 4.0); }
float dWeight(vec3 q, vec2 b) {
  vec2 k = b - vec2(-40.0, 0.0);
  float d = slab(box2(k, vec2(10.0, 18.0)) - 4.0, q.z, 104.0, 144.0, 4.0);
  // its lifting eye
  return min(d, slab(abs(length(k) - 5.0) - 1.6, q.z, 142.0, 150.0, 1.0));
}
float dBarrel(vec3 q) { return tube(q, vec3(uRamA, RAM_Z), vec3(uRamB, RAM_Z), 10.0); }
float dRamCaps(vec3 q) {
  vec2 u = normalize(uRamB - uRamA);
  float bound = max(seg(q.xy, uRamA, uRamB + u * 8.0) - 14.0, abs(q.z - RAM_Z - 3.0) - 15.0);
  if (bound > 4.0) return bound;
  float d = tube(q, vec3(uRamA, RAM_Z), vec3(uRamA + u * 10.0, RAM_Z), 11.5);
  d = min(d, tube(q, vec3(uRamB - u * 10.0, RAM_Z), vec3(uRamB, RAM_Z), 11.5));
  // the gland the rod slides out of, and the two port fittings on top
  d = min(d, tube(q, vec3(uRamB, RAM_Z), vec3(uRamB + u * 8.0, RAM_Z), 7.0));
  d = min(d, cyl(q, uRamA + u * 18.0, 3.4, RAM_Z + 8.0, RAM_Z + 15.0, 1.0));
  return min(d, cyl(q, uRamB - u * 18.0, 3.4, RAM_Z + 8.0, RAM_Z + 15.0, 1.0));
}
float dRod(vec3 q) { return tube(q, vec3(uRamB, RAM_Z), vec3(uRamC, RAM_Z), 4.5); }
float dClevis(vec3 q) {
  return min(cyl(q, uRamA, 8.5, 124.0, 154.0, 2.0), cyl(q, uRamC, 8.0, 132.0, 154.0, 2.0));
}
/** the hose from the hub's swivel to the ram's rear port */
float dHose(vec3 q) {
  vec2 u = normalize(uRamB - uRamA);
  vec2 a = u1 * 12.0 + n1 * 15.0;
  vec2 c = uRamA + u * 18.0;
  vec2 k = u1 * 34.0 + n1 * 40.0;
  vec2 lo = min(min(a, c), k) - 6.0;
  vec2 hi = max(max(a, c), k) + 6.0;
  float bound = max(box2(q.xy - 0.5 * (lo + hi), 0.5 * (hi - lo)), abs(q.z - RAM_Z) - 22.0);
  if (bound > 4.0) return bound;
  float t = clamp(dot(q.xy - a, c - a) / dot(c - a, c - a), 0.0, 1.0);
  return length(vec2(bezier(q.xy, a, k, c), q.z - mix(136.0, RAM_Z + 15.0, t))) - 3.4;
}
/** the steel line from the rear port along the barrel to its front port */
float dLine(vec3 q) {
  vec2 u = normalize(uRamB - uRamA);
  return tube(q, vec3(uRamA + u * 18.0, RAM_Z + 13.0), vec3(uRamB - u * 18.0, RAM_Z + 13.0), 2.2);
}
/** the quill's air line, tied along the boom's side, up to the quill */
float dAir(vec3 q) {
  vec3 a = vec3(u1 * 34.0 - n1 * 22.0, 126.0);
  vec3 b = vec3(uE - u1 * 30.0 - n1 * 22.0, 126.0);
  vec3 c = vec3(uE - u1 * 12.0 - n1 * 11.0, 150.0);
  return min(tube(q, a, b, 2.6), tube(q, b, c, 2.6));
}

// ---- the elbow: the quill standing on the eye, its rod down through it to the wrist that holds her
// pencil, its guide rods and their yoke riding with the wrist; the crank the ram pushes
float dQuill(vec3 q) {
  return min(cyl(q, uE, 15.0, 124.0, 162.0, 3.0), cyl(q, uE, 10.0, 160.0, 167.0, 2.0));
}
float dCrank(vec3 q) { return bar(q, uE, uRamC, 8.0, 134.0, 150.0, 3.0); }
float dGuides(vec3 q) {
  vec2 g = n2 * 22.0;
  float top = uPen + YOKE;
  float d = min(cyl(q, uE + g, 3.2, uPen + 10.0, top, 1.0), cyl(q, uE - g, 3.2, uPen + 10.0, top, 1.0));
  // the quill's rod, and the bar that carries the rods' feet under the wrist
  d = min(d, cyl(q, uE, 6.0, uPen + 8.0, 124.0, 1.0));
  return min(d, bar(q, uE + g, uE - g, 5.0, uPen + 6.0, uPen + 14.0, 2.0));
}
float dYoke(vec3 q) {
  vec2 g = n2 * 22.0;
  float z = uPen + YOKE;
  float d = bar(q, uE + g, uE - g, 5.5, z, z + 7.0, 2.0);
  d = min(d, slab(hex(q.xy - uE - g, 4.5), q.z, z + 6.0, z + 10.0, 1.0));
  return min(d, slab(hex(q.xy - uE + g, 4.5), q.z, z + 6.0, z + 10.0, 1.0));
}
/** the wrist, g in the frame of its turn from the elbow: its arm out from under the eye, the fork
 * either side of her pencil's butt with the trunnion's bosses, and f, the pencil's frame, for the
 * ferrule it grips */
float dWrist(vec3 q, vec2 g, vec3 f) {
  float bound = max(box2(g - vec2(0.5 * WRIST, 0.0), vec2(0.5 * WRIST + PENCIL_R + 8.0, PENCIL_R + 14.0)), abs(q.z - uPen) - PENCIL_R - 10.0);
  if (bound > 4.0) return bound;
  float d = slab(seg(g, vec2(0.0), vec2(WRIST - 16.0, 0.0)) - 8.0, q.z, uPen - 7.0, uPen + 7.0, 2.0);
  vec2 k = vec2(g.x - WRIST + 8.0, abs(g.y) - PENCIL_R - 5.0);
  d = min(d, slab(box2(k, vec2(10.0, 2.6)), q.z, uPen - 9.0, uPen + 9.0, 1.2));
  vec2 boss = vec2(length(vec2(g.x - WRIST, q.z - uPen)) - 7.0, abs(abs(g.y) - PENCIL_R - 7.5) - 2.6);
  d = min(d, min(max(boss.x, boss.y), 0.0) + length(max(boss, 0.0)));
  return min(d, max(hex(f.yz, PENCIL_R + 3.0), abs(f.x - 7.0) - 7.0));
}
/** her pencil, f in its frame: its butt in the trunnion, its point LP along */
float dPencil(vec3 f) {
  float body = max(hex(f.yz, PENCIL_R), max(-f.x, f.x - LP + CONE));
  float u = clamp((f.x - LP + CONE) / CONE, 0.0, 1.0);
  float cone = max(hex(f.yz, PENCIL_R * (1.0 - u) + 0.6), max(LP - CONE - f.x, f.x - LP));
  return min(body, cone);
}

#define N 26
float part[N];

/** every part's distance at q (arm units) */
void parts(vec3 q) {
  vec2 b = vec2(dot(q.xy, u1), dot(q.xy, n1));
  vec2 g = vec2(dot(q.xy - uE, u2), dot(q.xy - uE, n2));
  vec3 f = pencilAt(q);
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
  part[11] = dBoom(q, b);
  part[12] = dEye(q);
  part[13] = dBarrel(q);
  part[14] = dRamCaps(q);
  part[15] = dRod(q);
  part[16] = dClevis(q);
  part[17] = min(min(dHose(q), dLine(q)), dPipe(q));
  part[18] = dWeight(q, b);
  part[19] = dQuill(q);
  part[20] = dCrank(q);
  part[21] = dGuides(q);
  part[22] = dYoke(q);
  part[23] = dPencil(f);
  part[24] = dWrist(q, g, f);
  part[25] = dAir(q);
}

/** the rig's distance at q (arm units), each group only near its bound */
float rig(vec3 q) {
  float d0;
  float bound = max(box2(q.xy - uDeck.xy, uDeck.zw + 6.0), q.z - 142.0);
  if (bound < 6.0) {
    d0 = q.z - 70.0;
    if (q.z < 76.0) {
      d0 = min(min(dPlate(q), dBolts(q)), min(dHousing(q), dRing(q)));
      d0 = min(d0, min(min(dValve(q), dGauge(q)), min(dMotor(q), dPinion(q))));
      d0 = min(d0, min(dRimBolts(q), dPipe(q)));
    }
    // the column and the hub, only round the pivot
    float pole = max(length(q.xy) - 34.0, q.z - 142.0);
    d0 = min(d0, pole < 6.0 ? min(dColumn(q), dHub(q)) : pole);
  } else d0 = bound;
  vec2 b = vec2(dot(q.xy, u1), dot(q.xy, n1));
  bound = max(box2(b - vec2(0.5 * BOOM - 5.0, 0.0), vec2(0.5 * BOOM + 55.0, 50.0)), abs(q.z - 132.0) - 30.0);
  if (bound < 6.0) {
    d0 = min(d0, min(dBoom(q, b), dEye(q)));
    // the counterweight, only by the tail
    float near = max(box2(b - vec2(-40.0, 0.0), vec2(20.0, 28.0)), abs(q.z - 127.0) - 25.0);
    d0 = min(d0, near < 6.0 ? dWeight(q, b) : near);
    // the ram, its clevises and its steel line, only along it
    near = max(seg(q.xy, uRamA, uRamC) - 16.0, abs(q.z - RAM_Z) - 20.0);
    if (near < 6.0) {
      d0 = min(d0, min(dBarrel(q), dRamCaps(q)));
      d0 = min(d0, min(dRod(q), dClevis(q)));
      d0 = min(d0, dLine(q));
    } else d0 = min(d0, near);
    d0 = min(d0, dHose(q));
    // the air line, only by the boom's side
    near = max(box2(b - vec2(0.5 * BOOM + 11.0, -16.5), vec2(0.5 * BOOM - 19.0, 8.5)), abs(q.z - 138.0) - 16.0);
    d0 = min(d0, near < 6.0 ? dAir(q) : near);
  } else d0 = min(d0, bound);
  vec3 f = pencilAt(q);
  bound = max(length(q.xy - uE) - 74.0, max(uPen - PENCIL_R - 16.0 - q.z, q.z - uPen - YOKE - 14.0));
  if (bound < 6.0) {
    vec2 g = vec2(dot(q.xy - uE, u2), dot(q.xy - uE, n2));
    d0 = min(d0, min(dQuill(q), dCrank(q)));
    d0 = min(d0, min(dGuides(q), dYoke(q)));
    d0 = min(d0, dWrist(q, g, f));
  } else d0 = min(d0, bound);
  bound = tube(q, trunnion - a3 * 6.0, trunnion + a3 * (LP + 4.0), PENCIL_R + 12.0);
  if (bound < 6.0) d0 = min(d0, dPencil(f));
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
  float d0 = min(box2(p - uDeck.xy, uDeck.zw), seg(p, -u1 * 60.0, uE) - 66.0);
  return min(d0, seg(p, trunnion.xy - a3.xy * 8.0, trunnion.xy + a3.xy * (LP + 6.0)) - PENCIL_R - 16.0);
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

/** whether page point p (arm units) is in the shadow of what rides in the bay: the housing, the
 * column and the hub, and the servo */
bool shadedCarriage(vec2 p) {
  vec2 s = uL.xy / uL.z;
  vec2 o = vec2(0.0);
  if (segseg(p + s * 8.0, p + s * 60.0, o, o) < 41.0) return true;
  if (segseg(p + s * 60.0, p + s * 139.0, o, o) < 29.0) return true;
  return segseg(p + s * 8.0, p + s * 60.0, uMotor, uMotor) < 11.0;
}

/** whether page point p is in the shadow of what reaches over the plates: the boom with its ram and
 * counterweight, the elbow and its quill, the yoke, her pencil */
bool shadedReach(vec2 p) {
  vec2 s = uL.xy / uL.z;
  if (segseg(p + s * 106.0, p + s * 126.0, u1 * 28.0, uE) < 19.0) return true;
  if (segseg(p + s * 104.0, p + s * 150.0, -u1 * 54.0, -u1 * 26.0) < 22.0) return true;
  if (segseg(p + s * 131.0, p + s * 153.0, uRamA, uRamC) < 10.0) return true;
  if (segseg(p + s * 106.0, p + s * 167.0, uE, uE) < 22.0) return true;
  vec2 g = n2 * 22.0;
  if (segseg(p + s * (uPen + YOKE), p + s * (uPen + YOKE + 10.0), uE - g, uE + g) < 5.5) return true;
  if (segseg(p + s * uPen, p + s * uPen, uE, trunnion.xy) < 9.0) return true;
  vec3 p0 = trunnion - a3 * 4.0;
  vec3 p1 = trunnion + a3 * (LP - 0.4 * CONE);
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

/** "REACT", stencilled along the boom's root between the hub's cap and the ram's clevis, a cell
 * this many arm units */
bool stencil(vec2 p, float cell) {
  ivec2 i = ivec2(floor(p / cell + vec2(9.5, 2.5)));
  int letter = i.x / 4;
  ivec2 k = ivec2(i.x - letter * 4, i.y);
  if (i.x < 0 || letter >= 5 || k.x > 2) return false;
  int bits = letter == 0 ? 0x6BAD : letter == 1 ? 0x79A7 : letter == 2 ? 0x2BED : letter == 3 ? 0x3923 : 0x7492;
  return glyph(bits, k);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  color = vec4(0.0);
  if (px.x < uClip.x || px.y < uClip.y || px.x > uClip.z || px.y > uClip.w) return;
  // she stands over the rig on a canvas of her own: what lies under her never shows
  if (mateAt(px)) return;
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
    // painted: the deck, the housing, the valve block and the gauge, the hub, the boom and its eye,
    // the ram's barrel, the counterweight, the quill and the crank, and her pencil; black anodised
    // steel the rest; chrome the ram's rod and the quill's guide rods
    bool painted = id == 0 || id == 2 || id == 7 || id == 8 || id == 10 || id == 11 || id == 12 ||
      id == 13 || id == 18 || id == 19 || id == 20 || id == 23;
    bool chrome = id == 15 || id == 21;
    float tone = painted ? clamp((v - 0.12) / 0.3, 0.0, 1.0) : clamp((v - 0.74) / 0.14, 0.0, 1.0);
    if (chrome) tone = v > 0.86 ? 1.0 : 0.0;
    col = tone > threshold ? uLit : uShade;
    if (id == 1 || id == 3) col = tone > 0.4 ? uYellow : uShade;
    vec2 b = vec2(dot(q.xy, u1), dot(q.xy, n1));
    vec3 f = pencilAt(q);
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
    if (id == 10 && face) {
      // the hub's bolt circle round its nut, turning with the boom
      if (length(fold(turned(q.xy), 6.0) - vec2(22.0, 0.0)) < 2.4) col = uShade;
    }
    if (id == 11 && face) {
      // rivet rows down the boom's edges, and what it is for, stencilled by its root
      bool rivet = abs(abs(b.y) - 15.0) < 1.5 && abs(mod(b.x - 4.0, 14.0) - 7.0) < 1.5 && b.x > 34.0 && b.x < BOOM - 34.0;
      if (rivet || stencil(vec2(b.x - 50.0, b.y), 1.8)) col = uShade;
    }
    if (id == 12 && face) {
      // the eye's bolt circle round the quill
      vec2 e = vec2(dot(q.xy - uE, u1), dot(q.xy - uE, n1));
      if (length(fold(e, 6.0) - vec2(20.5, 0.0)) < 2.2) col = uShade;
    }
    if (id == 17) {
      // cable ties round the hose
      if (abs(mod(length(q.xy - u1 * 12.0), 24.0) - 12.0) < 1.4) col = tone > 0.5 ? uLit : uYellow;
    }
    if (id == 18 && face) {
      // hazard stripes across the counterweight, its lifting eye
      vec2 k = b - vec2(-40.0, 0.0);
      col = mod(k.x + k.y + 40.0, 10.0) < 5.0 ? uYellow : uShade;
      if (abs(length(k) - 5.0) < 2.6) col = tone > 0.5 ? uLit : uShade;
    }
    if (id == 19 && face) {
      // the seam round the quill's cap
      if (abs(length(q.xy - uE) - 12.5) < lw) col = uShade;
    }
    if (id == 25) {
      // ties hold the air line to the boom
      if (abs(mod(b.x, 36.0) - 18.0) < 1.6) col = uYellow;
    }
    if (id == 23) {
      // her pencil, painted white however it turns and tips: a black band by its butt with a yellow
      // ring, a black band, the black and yellow band before the cone; then bare wood, a light half
      // tone, and the lead; the edges of its top facet along it
      float end = LP - CONE;
      bool ring = (f.x > 20.0 && f.x < 24.0) || (f.x > end - 22.0 && f.x < end - 17.0);
      bool black = f.x < 28.0 || (f.x > 0.45 * end && f.x < 0.45 * end + 10.0) || (f.x > end - 30.0 && f.x < end - 9.0);
      if (black) col = uShade;
      if (ring) col = uYellow;
      if (f.x > end) {
        col = tone > 0.3 && threshold < 0.8 ? uLit : uShade;
        if (f.x > LP - 15.0) col = uShade;
      }
      if (!black && !ring && f.x < end && abs(abs(f.y) - 0.57735 * PENCIL_R) < lw) col = uShade;
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

  // the line her pencil's point drags across its plate: the output above it, the Markdown below
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

/** writes the elbow ram's clevis, barrel end and crank pin (arm units) into `out`, for the elbow at
 * (ex, ey) and the pencil pointing (fx, fy) */
export function ram(ex: number, ey: number, fx: number, fy: number, out: number[]) {
  const l1 = Math.hypot(ex, ey);
  out[0] = (ex / l1) * RAM_AT;
  out[1] = (ey / l1) * RAM_AT;
  const c = Math.cos(CRANK_ANGLE);
  const s = Math.sin(CRANK_ANGLE);
  out[4] = ex + CRANK * (c * fx - s * fy);
  out[5] = ey + CRANK * (s * fx + c * fy);
  const d = Math.hypot(out[4] - out[0], out[5] - out[1]);
  out[2] = out[0] + ((out[4] - out[0]) / d) * BARREL;
  out[3] = out[1] + ((out[5] - out[1]) / d) * BARREL;
}
