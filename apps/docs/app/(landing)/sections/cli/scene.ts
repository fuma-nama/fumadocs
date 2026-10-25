import { bayer8 } from '../../lib/glsl';

/**
 * The machine, raymarched in stage px: x right, y down, z out of the wall toward the viewer. The
 * camera looks straight at the wall (z = 0), where the windows hang at their own size, so flat
 * things stay frontal and only the solids show their sides. Groups, each drawn only inside its
 * screen box: 0 crate, 1 riser with its drive unit, 2 hopper and chute, 3 print head,
 * 4 reels and sockets. The cables are tubes in screen space along their routes.
 */
const GROUPS = 5;
export const ROPE_POINTS = 32;
export const CARDS = 24;

export const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uDpr;
uniform vec3 uEye;
uniform vec3 uLight;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uPen;
uniform vec3 uLine;
uniform vec3 uAccent;
uniform float uCell;
uniform vec2 uFloor;
uniform vec4 uBox[${GROUPS}];
uniform vec4 uWindow[4];

uniform vec3 uCrate;
uniform vec3 uCrateSize;
uniform float uLidT;
uniform float uLid;
uniform vec2 uLatch;
uniform vec4 uLabel;
uniform vec3 uLabelC;
uniform vec3 uLabelB;
uniform vec3 uSocket[2];

uniform vec4 uChain;
uniform vec2 uChainLength;
uniform float uPitch;
uniform float uPhase;
uniform float uSpin;
uniform vec3 uDriveC;
uniform vec3 uDriveB;
uniform vec4 uPlate;

uniform vec3 uHopper;
uniform vec4 uHopperSize;
uniform vec4 uChute;
uniform vec4 uCounter;
uniform vec3 uCounterC;
uniform vec3 uCounterB;

uniform vec4 uHead;
uniform vec4 uHeadRail;

uniform vec3 uReel[2];
uniform vec2 uReelSpin;
uniform vec3 uJack[2];
uniform vec2 uJackOn;

uniform vec4 uRope[${ROPE_POINTS * 2}];
uniform float uRopeCount[2];
uniform vec2 uRopeBox[4];
uniform float uCables;

uniform vec4 uCard[${CARDS}];
uniform vec4 uCardZ[${CARDS / 4}];
uniform float uCards;

out vec4 color;
${bayer8}

int gMask;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  return sdBox(p, b - r) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

/** a disc facing the viewer: radius r, half depth h */
float sdDisc(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.xy) - r, abs(p.z) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

/** a rod along x */
float sdRodX(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.yz) - r, abs(p.x) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

/** a gear facing the viewer, turned by a */
float sdGear(vec3 p, float r, float teeth, float a, float h) {
  float angle = atan(p.y, p.x) + a;
  float tooth = clamp(cos(angle * teeth) * 2.2, -1.0, 1.0) * 0.5 + 0.5;
  float d2 = (length(p.xy) - r - tooth * 3.5) * 0.75;
  float hole = 4.0 - length(p.xy);
  vec2 d = vec2(max(d2, hole), abs(p.z) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }

// materials
const float BODY = 0.0;
const float ACCENT = 2.0;
const float DARK = 3.0;

/** a point in the lid's frame: x, along its depth from the hinge, up through its thickness */
vec3 lidFrame(vec3 p) {
  vec3 hinge = vec3(uCrate.x, uCrate.y - uCrateSize.y, uCrate.z - uCrateSize.z);
  vec3 d = p - hinge;
  float s = sin(uLid);
  float c = cos(uLid);
  return vec3(d.x, -d.y * s + d.z * c, -d.y * c - d.z * s);
}

vec2 crate(vec3 p) {
  vec3 b = uCrateSize;
  vec3 q = p - uCrate;
  float cavity = sdBox(q - vec3(0.0, -10.0, 0.0), vec3(b.x - 9.0, b.y, b.z - 9.0));
  vec2 r = vec2(max(sdRoundBox(q, b, 1.5), -cavity), BODY);
  // the rim band and the corner caps
  r = opU(r, vec2(max(sdRoundBox(q - vec3(0.0, 9.0 - b.y, 0.0), vec3(b.x + 2.0, 9.0, b.z + 2.0), 1.0), -cavity), BODY));
  vec3 cq = vec3(abs(q.x) - b.x + 11.0, q.y - b.y + 11.0, abs(q.z) - b.z + 11.0);
  r = opU(r, vec2(sdRoundBox(cq, vec3(13.0), 1.5), DARK));
  // the label's plate, the sockets for the cables
  r = opU(r, vec2(sdRoundBox(p - uLabelC, uLabelB, 1.0), BODY));
  for (int i = 0; i < 2; i++) {
    if (float(i) >= uCables) break;
    vec3 s = p - uSocket[i];
    float ring = sdDisc(s - vec3(0.0, 0.0, 3.0), 10.0, 3.0);
    ring = max(ring, -sdDisc(s - vec3(0.0, 0.0, 4.0), 4.5, 4.0));
    r = opU(r, vec2(ring, DARK));
  }

  // the lid, a shallow tray upside down on its hinge
  float T = uLidT;
  vec3 l = lidFrame(p);
  float recess = sdBox(l - vec3(0.0, b.z, (T - 8.0) * 0.5 - 6.0), vec3(b.x - 9.0, b.z - 9.0, (T - 8.0) * 0.5 + 6.0));
  float lid = max(sdRoundBox(l - vec3(0.0, b.z, T * 0.5), vec3(b.x + 2.0, b.z + 2.0, T * 0.5), 1.5), -recess);
  r = opU(r, vec2(lid, BODY));
  vec3 lc = vec3(abs(l.x) - b.x + 11.0, abs(l.y - b.z) - b.z + 11.0, l.z - T + 11.0);
  r = opU(r, vec2(sdRoundBox(lc, vec3(13.0), 1.5), DARK));

  // butterfly latches: a lever on the body hooks a catch on the lid, shorter on a small crate
  float reach = min(17.0, b.y * 0.22);
  for (int i = 0; i < 2; i++) {
    float x = (i == 0 ? -0.55 : 0.55) * b.x;
    vec3 base = vec3(uCrate.x + x, uCrate.y - b.y + 20.0, uCrate.z + b.z + 3.0);
    r = opU(r, vec2(sdBox(p - base, vec3(14.0, 11.0, 3.0)), DARK));
    vec3 catchAt = l - vec3(x, 2.0 * b.z + 3.0, 11.0);
    r = opU(r, vec2(sdBox(catchAt, vec3(9.0, 5.0, 3.0)), DARK));
    float a = i == 0 ? uLatch.x : uLatch.y;
    vec3 h = p - (base + vec3(0.0, 4.0, 4.0));
    vec3 w = vec3(0.0, -cos(a), sin(a));
    vec3 n = vec3(0.0, sin(a), cos(a));
    vec3 lever = vec3(h.x, dot(h, w) - reach, dot(h, n));
    r = opU(r, vec2(sdBox(lever, vec3(9.0, reach, 2.5)), ACCENT));
  }

  // the gas ram on the right side, from the body to the lid
  float side = uCrate.x + b.x + 8.0;
  vec3 p1 = vec3(side, uCrate.y + b.y - 30.0, uCrate.z + b.z - 30.0);
  float s = sin(uLid);
  float c = cos(uLid);
  vec3 hinge = vec3(side, uCrate.y - b.y, uCrate.z - b.z);
  vec3 p2 = hinge + vec3(0.0, -s, c) * (2.0 * b.z - 30.0) + vec3(0.0, -c, -s) * (T * 0.5);
  vec3 dir = normalize(p2 - p1);
  float stroke = length(p2 - p1) * 0.62;
  r = opU(r, vec2(sdCapsule(p, p1, p1 + dir * stroke, 6.0), BODY));
  r = opU(r, vec2(sdCapsule(p, p1 + dir * (stroke - 6.0), p1 + dir * stroke, 7.0), ACCENT));
  r = opU(r, vec2(sdCapsule(p, p2, p2 - dir * stroke, 2.8), DARK));
  r = opU(r, vec2(sdBox(p - p1 + vec3(4.0, 0.0, 0.0), vec3(5.0, 8.0, 8.0)), DARK));
  r = opU(r, vec2(sdBox(p - p2 + vec3(4.0, 0.0, 0.0), vec3(5.0, 7.0, 7.0)), DARK));
  return r;
}

/** distance to the zigzag of a truss face in its plane: chords at u = ±h, a node every pitch */
float zigzag(vec2 q, float h, float pitch) {
  float s = mod(q.x, 2.0 * pitch);
  vec2 a = vec2(0.0, -h);
  vec2 b = vec2(pitch, h);
  vec2 c = vec2(2.0 * pitch, -h);
  vec2 x = vec2(s, q.y);
  vec2 pa = x - a;
  vec2 ba = b - a;
  float d1 = length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  vec2 pb = x - b;
  vec2 cb = c - b;
  float d2 = length(pb - cb * clamp(dot(pb, cb) / dot(cb, cb), 0.0, 1.0));
  return min(d1, d2);
}

/** a lattice boom from a to b at depth z: four chords, a zigzag on its front and back faces */
vec2 boom(vec3 p, vec2 a, vec2 b, float z) {
  vec2 ab = b - a;
  float len = length(ab);
  vec2 e1 = ab / len;
  vec2 e2 = vec2(-e1.y, e1.x);
  vec2 d = p.xy - a;
  float s = dot(d, e1);
  float u = dot(d, e2);
  float v = p.z - z;
  float sc = clamp(s, 0.0, len);
  float chords = 1e9;
  for (int i = 0; i < 4; i++) {
    vec2 at = vec2(i < 2 ? -11.0 : 11.0, (i & 1) == 0 ? -8.0 : 8.0);
    chords = min(chords, length(vec3(s - sc, u - at.x, v - at.y)) - 3.2);
  }
  vec2 r = vec2(chords, BODY);
  float outside = max(-s, s - len);
  float zz = zigzag(vec2(s, u), 11.0, 12.0);
  r = opU(r, vec2(max(length(vec2(zz, abs(v) - 8.0)) - 1.8, outside), DARK));
  return r;
}

/**
 * The riser: a chain from its tail uChain.xy straight up, uChainLength.x long at depth
 * uChainLength.y. Its grippers hold the files on its left, its boom stands on its right, the drive
 * unit with the registry's plate turns the head sprocket.
 */
vec2 riser(vec3 p) {
  vec2 tail = uChain.xy;
  float len = uChainLength.x;
  float z = uChainLength.y;
  vec2 head = tail - vec2(0.0, len);
  vec2 r = boom(p, tail + vec2(15.0, 6.0), head + vec2(15.0, -6.0), z);
  float s = tail.y - p.y;
  float k = floor((s - uPhase) / uPitch);
  for (int j = 0; j < 2; j++) {
    float at = uPhase + (k + float(j)) * uPitch;
    if (at < 6.0 || at > len - 6.0) continue;
    // an arm off the chain, its jaw clamping the file's right edge
    vec3 g = p - vec3(tail.x, tail.y - at, z);
    r = opU(r, vec2(sdCapsule(g, vec3(0.0), vec3(-8.0, 0.0, 0.0), 2.2), DARK));
    r = opU(r, vec2(sdBox(g - vec3(-10.0, 0.0, 0.0), vec3(2.5, 13.0, 3.5)), ACCENT));
  }
  // sprockets at both ends on brackets to the wall
  for (int i = 0; i < 2; i++) {
    vec3 w = p - vec3(i == 0 ? tail : head, z);
    r = opU(r, vec2(sdGear(w - vec3(0.0, 0.0, 12.0), 12.0, 10.0, uSpin, 3.0), BODY));
    r = opU(r, vec2(sdDisc(w - vec3(0.0, 0.0, 16.0), 3.8, 2.5), ACCENT));
    r = opU(r, vec2(sdBox(vec3(w.x - 15.0, w.y, p.z - z * 0.5 + 4.0), vec3(8.0, 8.0, z * 0.5 - 4.0)), DARK));
  }
  // the drive unit, its gear meshing with the head sprocket
  r = opU(r, vec2(sdRoundBox(p - uDriveC, uDriveB, 2.0), BODY));
  vec3 g = p - vec3(uDriveC.x + uDriveB.x - 12.0, head.y, uDriveC.z + uDriveB.z);
  r = opU(r, vec2(sdGear(g - vec3(0.0, 0.0, 3.0), 8.0, 8.0, -uSpin * 1.5, 3.0), DARK));
  r = opU(r, vec2(sdDisc(g - vec3(0.0, 0.0, 6.5), 2.6, 1.0), ACCENT));
  return r;
}

/** a funnel under the mouth at uHopper: half widths at the top and bottom, height, half depth */
vec2 hopper(vec3 p) {
  vec4 H = uHopperSize;
  vec3 q = p - uHopper - vec3(0.0, H.z * 0.5, 0.0);
  float t = clamp(q.y / H.z + 0.5, 0.0, 1.0);
  float slope = (H.x - H.y) / H.z;
  float k = inversesqrt(1.0 + slope * slope);
  float hw = mix(H.x, H.y, t);
  float outer = max(max((abs(q.x) - hw) * k, abs(q.y) - H.z * 0.5), abs(q.z) - H.w);
  float inner = max(max((abs(q.x) - hw + 6.0) * k, abs(q.y + 8.0) - H.z * 0.5), abs(q.z) - H.w + 6.0);
  vec2 r = vec2(max(outer, -inner), BODY);
  // a lip around the mouth, the counter's frame on its front
  r = opU(r, vec2(max(sdBox(q + vec3(0.0, H.z * 0.5 - 3.0, 0.0), vec3(H.x + 3.0, 3.0, H.w + 3.0)), -inner), DARK));
  r = opU(r, vec2(sdRoundBox(p - uCounterC, uCounterB, 1.0), BODY));
  // the chute from its neck into your project, flanged at both ends
  vec3 a = vec3(uChute.xy, uHopper.z);
  vec3 b = vec3(uChute.zw, uHopper.z);
  vec3 dir = normalize(b - a);
  r = opU(r, vec2(sdCapsule(p, a, b, 10.0), BODY));
  r = opU(r, vec2(sdCapsule(p, a + dir * 4.0, a + dir * 10.0, 13.0), DARK));
  r = opU(r, vec2(sdCapsule(p, b - dir * 10.0, b - dir * 4.0, 13.0), DARK));
  return r;
}

vec2 head(vec3 p) {
  vec3 rail = p - vec3((uHeadRail.x + uHeadRail.y) * 0.5, uHeadRail.z, uHeadRail.w);
  vec2 r = vec2(sdBox(rail, vec3(abs(uHeadRail.y - uHeadRail.x) * 0.5, 2.5, 3.0)), DARK);
  vec3 c = p - vec3(uHead.x, uHeadRail.z, uHeadRail.w + 4.0);
  r = opU(r, vec2(sdRoundBox(c, vec3(11.0, 7.0, 7.0), 1.0), BODY));
  float reach = uHead.y - uHeadRail.z;
  vec3 rod = p - vec3(uHead.x, uHeadRail.z + reach * 0.5, uHeadRail.w + 6.0);
  r = opU(r, vec2(sdBox(rod, vec3(2.0, max(reach * 0.5, 0.5), 2.0)), DARK));
  vec3 nose = p - vec3(uHead.x, uHead.y - 4.0, uHeadRail.w + 6.0);
  r = opU(r, vec2(sdBox(nose, vec3(5.0, 4.0, 5.0)), ACCENT));
  return r;
}

/** the reels on the imports' window, the sockets on your folders */
vec2 jacks(vec3 p) {
  vec2 r = vec2(1e9, BODY);
  for (int i = 0; i < 2; i++) {
    if (float(i) >= uCables) break;
    vec3 j = p - uReel[i];
    float a = (i == 0 ? uReelSpin.x : uReelSpin.y) + atan(j.y, j.x);
    float drum = sdDisc(j - vec3(0.0, 0.0, 2.0), 9.0, 4.0);
    float spokes = max(abs(sin(a * 2.0)) * length(j.xy) - 2.0, 3.0 - length(j.xy));
    drum = max(drum, -max(spokes, length(j.xy) - 6.5));
    r = opU(r, vec2(drum, BODY));
    r = opU(r, vec2(sdDisc(j - vec3(0.0, 0.0, 6.5), 2.2, 1.0), ACCENT));
    r = opU(r, vec2(sdBox(j - vec3(6.0, 0.0, -1.0), vec3(5.0, 2.5, 2.0)), DARK));
    if ((i == 0 ? uJackOn.x : uJackOn.y) > 0.5) {
      vec3 s = p - uJack[i];
      float body = sdRodX(s, 6.5, 6.0);
      body = max(body, -sdRodX(s - vec3(4.0, 0.0, 0.0), 3.2, 4.0));
      r = opU(r, vec2(body, DARK));
    }
  }
  return r;
}

vec2 map(vec3 p) {
  vec2 r = vec2(1e9, BODY);
  if ((gMask & 1) != 0) r = opU(r, crate(p));
  if ((gMask & 2) != 0) r = opU(r, riser(p));
  if ((gMask & 4) != 0) r = opU(r, hopper(p));
  if ((gMask & 8) != 0) r = opU(r, head(p));
  if ((gMask & 16) != 0) r = opU(r, jacks(p));
  return r;
}

vec3 normalAt(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
    k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x
  );
}

/** how sharply the surface bends within w of p: creases and corners */
float bend(vec3 p, vec3 n, float w) {
  vec3 t1 = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(n, t1);
  float c = 2.0 * map(p).x;
  float a = map(p + t1 * w).x + map(p - t1 * w).x - c;
  float b = map(p + t2 * w).x + map(p - t2 * w).x - c;
  return max(abs(a), abs(b)) / w;
}

/** 1 in light, 0 when something within reach stands toward the light */
float lit(vec3 p, float reach) {
  float t = 1.0;
  for (int i = 0; i < 40; i++) {
    float d = map(p + uLight * t).x;
    if (d < 0.05) return 0.0;
    t += max(d, 0.5);
    if (t > reach) break;
  }
  return 1.0;
}

float segment(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

bool inside(vec2 px, vec4 b) {
  return px.x >= b.x && px.y >= b.y && px.x <= b.z && px.y <= b.w;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  gMask = 0;
  for (int g = 0; g < ${GROUPS}; g++) {
    if (inside(px, uBox[g])) gMask |= 1 << g;
  }
  bool rope = false;
  for (int i = 0; i < 2; i++) {
    if (float(i) < uCables && inside(px, vec4(uRopeBox[i * 2], uRopeBox[i * 2 + 1]))) rope = true;
  }
  if (gMask == 0 && !rope) {
    color = vec4(0.0);
    return;
  }
  float threshold = bayer8(floor(px / uCell));

  vec3 ro = uEye;
  vec3 rd = normalize(vec3(px - uEye.xy, -uEye.z));
  float pixel = 1.0 / uEye.z;
  // the wall and the floor in front of it
  float tWall = uEye.z / -rd.z;
  float tFloor = rd.y > 0.0 ? (uFloor.x - ro.y) / rd.y : 1e9;
  bool onFloor = tFloor < tWall && (ro + rd * tFloor).z <= uFloor.y;
  float tBack = onFloor ? tFloor : tWall;

  float hit = -1.0;
  float edge = 1e9;
  float edgeT = 1e9;
  if (gMask != 0) {
    float t = (uEye.z - 320.0) / -rd.z;
    float d0 = 1e9;
    float t0 = t;
    float d1 = 1e9;
    float t1 = t;
    for (int i = 0; i < 96; i++) {
      float d = map(ro + rd * t).x;
      if (d < 0.25 * t * pixel) { hit = t; break; }
      if (d > d1 && d1 < d0 && d1 < 3.0 * t1 * pixel) {
        float a = t0;
        float b = t;
        for (int j = 0; j < 6; j++) {
          float m1 = mix(a, b, 0.382);
          float m2 = mix(a, b, 0.618);
          if (map(ro + rd * m1).x < map(ro + rd * m2).x) b = m2;
          else a = m1;
        }
        float m = 0.5 * (a + b);
        float e = map(ro + rd * m).x / (m * pixel);
        if (e < edge) { edge = e; edgeT = m; }
      }
      d0 = d1;
      t0 = t1;
      d1 = d;
      t1 = t;
      t += d;
      if (t > tBack) break;
    }
  }

  vec4 col = vec4(0.0);
  float depth = tBack;
  if (hit > 0.0 && hit < tBack) {
    depth = hit;
    vec3 p = ro + rd * hit;
    float w = hit * pixel;
    vec2 m = map(p);
    vec3 n = normalAt(p, 0.5 * w);
    vec3 q = p - uCrate;
    bool hold = (gMask & 1) != 0 && abs(q.x) < uCrateSize.x - 8.5 && abs(q.z) < uCrateSize.z - 8.5 && q.y > -uCrateSize.y - 2.0;
    float tone;
    bool shadowed = false;
    if (hold) tone = 0.08;
    else {
      float lambert = dot(n, uLight);
      tone = clamp((lambert - 0.1) / 0.35, 0.0, 1.0);
      if (m.y == DARK) tone *= 0.45;
      // a part in another's shadow keeps its tone under sparse dots, like the wall's
      shadowed = lambert > 0.1 && lit(p + n * 2.0 * w, 120.0) < 0.5;
    }
    vec3 c = tone > threshold ? uLit : uShade;
    if (shadowed && c == uLit && threshold < 0.22) c = uLine;
    if (m.y == ACCENT && tone > 0.2) c = uAccent;
    if (bend(p, n, 1.2 * w) > 0.35) c = tone > 0.55 ? uShade : uLit;
    col = vec4(c, 1.0);
    // windows cut into front faces show the page's text under them
    bool front = abs(n.z) > 0.9;
    if (front && (inside(px, uLabel) || inside(px, uCounter) || inside(px, uPlate))) col = vec4(0.0);
  } else if (gMask != 0) {
    // the wall or the floor: a light, sparse contact shadow close to the machine, windows stay clean
    bool clean = false;
    for (int i = 0; i < 4; i++) {
      if (inside(px, uWindow[i])) clean = true;
    }
    vec3 p = ro + rd * tBack;
    if (!clean && threshold < 0.16 && lit(p + vec3(0.0, onFloor ? -0.5 : 0.0, onFloor ? 0.0 : 0.5), 64.0) < 0.5) col = vec4(uLine, 1.0);
  }

  // cables, tubes in screen space along their routes
  if (rope) {
    for (int k = 0; k < 2; k++) {
      if (float(k) >= uCables || !inside(px, vec4(uRopeBox[k * 2], uRopeBox[k * 2 + 1]))) continue;
      float best = 1e9;
      float h = 0.0;
      int at = -1;
      int count = int(uRopeCount[k]);
      for (int i = 0; i < ${ROPE_POINTS - 1}; i++) {
        if (i >= count - 1) break;
        vec4 a = uRope[k * ${ROPE_POINTS} + i];
        vec4 b = uRope[k * ${ROPE_POINTS} + i + 1];
        float r = max(a.w, b.w);
        if (px.x < min(a.x, b.x) - r || px.x > max(a.x, b.x) + r || px.y < min(a.y, b.y) - r || px.y > max(a.y, b.y) + r) continue;
        float hh;
        float d = segment(px, a.xy, b.xy, hh) - mix(a.w, b.w, hh);
        if (d < best) { best = d; h = hh; at = i; }
      }
      if (at < 0 || best >= 0.0) continue;
      vec4 a = uRope[k * ${ROPE_POINTS} + at];
      vec4 b = uRope[k * ${ROPE_POINTS} + at + 1];
      float z = mix(a.z, b.z, h);
      float t = (uEye.z - z) / -rd.z;
      if (t >= depth) continue;
      float r = mix(a.w, b.w, h);
      vec2 dir = normalize(b.xy - a.xy + vec2(1e-6, 0.0));
      vec2 across2 = vec2(-dir.y, dir.x);
      float across = dot(px - mix(a.xy, b.xy, h), across2) / r;
      vec3 n = normalize(vec3(across2 * across, sqrt(max(1.0 - across * across, 0.0))));
      float tone = clamp((dot(n, uLight) - 0.1) / 0.35, 0.0, 1.0);
      // black rubber; the plug's sleeve at the end in the accent
      bool plug = at >= count - 2;
      vec3 c = tone * (plug ? 1.0 : 0.16) > threshold ? (plug ? uAccent : uLit) : uShade;
      if (abs(across) > 0.78) c = uPen;
      col = vec4(c, 1.0);
      depth = t;
    }
  }

  // files carried in front of the machine: the page shows through
  for (int i = 0; i < ${CARDS}; i++) {
    if (float(i) >= uCards) break;
    if (inside(px, uCard[i])) {
      float z = uCardZ[i / 4][i % 4];
      float t = (uEye.z - z) / -rd.z;
      if (t < depth) col = vec4(0.0);
    }
  }

  if (edge < 1.25 && edgeT < depth + 1.0 && col.a == 0.0) col = vec4(uPen, 1.0);
  else if (edge < 1.25 && edgeT < depth - 2.0) col = vec4(uPen, 1.0);
  color = vec4(col.rgb * col.a, col.a);
}
`;
