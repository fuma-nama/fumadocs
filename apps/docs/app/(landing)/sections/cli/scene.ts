import { bayer8 } from '../../lib/dither';

/**
 * The machine, raymarched in stage px with z toward the viewer. The camera looks straight at the
 * wall, so flat things stay frontal. Each group draws only inside its screen box: 0 the crate,
 * 1 the riser, 2 the hopper, 3 the reels and sockets.
 */
const GROUPS = 4;
export const ROPE_POINTS = 32;
export const CARDS = 24;

export const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution, uFloor, uFrame;
uniform float uDpr, uCell;
uniform vec3 uEye, uLight, uLit, uShade, uPen, uLine, uAccent;
uniform vec4 uBox[${GROUPS}], uWindow[2];

uniform vec3 uCrate, uCrateSize, uLabelC, uLabelB, uSocket[2];
uniform float uLidT, uLid;
uniform vec2 uLatch;
uniform vec4 uLabel;

uniform vec4 uChain, uDrive;
uniform vec2 uChainLength, uChainSide, uJawBox;
uniform vec3 uDriveGear, uDriveC, uDriveB;
uniform float uPitch, uJaw, uPhase, uSpin;

uniform vec3 uHopper, uCounterC, uCounterB;
uniform vec4 uHopperSize, uCounter;

uniform vec3 uReel[2], uJack[2];
uniform vec2 uReelSpin, uJackOn;

uniform vec4 uRope[${ROPE_POINTS * 2}];
uniform vec2 uRopeBox[4];
uniform float uRopeCount[2], uCables;

uniform vec4 uCard[${CARDS}], uCardZ[${CARDS / 4}];
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

float extrude(float d, float axis, float h) {
  vec2 w = vec2(d, abs(axis) - h);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

float sdDisc(vec3 p, float r, float h) {
  return extrude(length(p.xy) - r, p.z, h);
}

float sdGear(vec3 p, float r, float teeth, float a, float h) {
  float angle = atan(p.y, p.x) + a;
  float tooth = clamp(cos(angle * teeth) * 2.2, -1.0, 1.0) * 0.5 + 0.5;
  float d2 = (length(p.xy) - r - tooth * 3.5) * 0.75;
  return extrude(max(d2, 4.0 - length(p.xy)), p.z, h);
}

vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }

const float BODY = 0.0, ACCENT = 2.0, DARK = 3.0;

vec2 crate(vec3 p) {
  vec3 b = uCrateSize;
  vec3 q = p - uCrate;
  float cavity = sdBox(q - vec3(0.0, -10.0, 0.0), vec3(b.x - 9.0, b.y, b.z - 9.0));
  vec2 r = vec2(max(sdRoundBox(q, b, 1.5), -cavity), BODY);
  r = opU(r, vec2(max(sdRoundBox(q - vec3(0.0, 9.0 - b.y, 0.0), vec3(b.x + 2.0, 9.0, b.z + 2.0), 1.0), -cavity), BODY));
  vec3 cq = vec3(abs(q.x) - b.x + 11.0, q.y - b.y + 11.0, abs(q.z) - b.z + 11.0);
  r = opU(r, vec2(sdRoundBox(cq, vec3(13.0), 1.5), DARK));
  r = opU(r, vec2(sdRoundBox(p - uLabelC, uLabelB, 1.0), BODY));
  for (int i = 0; i < 2; i++) {
    if (float(i) >= uCables) break;
    vec3 s = p - uSocket[i];
    float ring = sdDisc(s - vec3(0.0, 0.0, 3.0), 9.0, 3.0);
    ring = max(ring, -sdDisc(s - vec3(0.0, 0.0, 4.0), 4.5, 4.0));
    r = opU(r, vec2(ring, DARK));
  }

  // the lid, a tray upside down on its hinge; in its frame y runs along its depth, z up through it
  float T = uLidT;
  float s = sin(uLid);
  float c = cos(uLid);
  vec3 d = p - vec3(uCrate.x, uCrate.y - b.y, uCrate.z - b.z);
  vec3 l = vec3(d.x, -d.y * s + d.z * c, -d.y * c - d.z * s);
  float recess = sdBox(l - vec3(0.0, b.z, (T - 8.0) * 0.5 - 6.0), vec3(b.x - 9.0, b.z - 9.0, (T - 8.0) * 0.5 + 6.0));
  float lid = max(sdRoundBox(l - vec3(0.0, b.z, T * 0.5), vec3(b.x + 2.0, b.z + 2.0, T * 0.5), 1.5), -recess);
  r = opU(r, vec2(lid, BODY));
  vec3 lc = vec3(abs(l.x) - b.x + 11.0, abs(l.y - b.z) - b.z + 11.0, l.z - T + 11.0);
  r = opU(r, vec2(sdRoundBox(lc, vec3(13.0), 1.5), DARK));

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

  float side = uCrate.x + b.x + 8.0;
  vec3 p1 = vec3(side, uCrate.y + b.y - 30.0, uCrate.z + b.z - 30.0);
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

float segment(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

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
  vec2 x = vec2(mod(s, 24.0), u);
  float h;
  float zz = segment(x, vec2(0.0, -11.0), vec2(12.0, 11.0), h);
  zz = min(zz, segment(x, vec2(12.0, 11.0), vec2(24.0, -11.0), h));
  r = opU(r, vec2(max(length(vec2(zz, abs(v) - 8.0)) - 1.8, max(-s, s - len)), DARK));
  return r;
}

/** the chain from uChain.xy along uChain.zw, uChainLength.x long, uChainLength.y deep */
vec2 riser(vec3 p) {
  vec2 tail = uChain.xy;
  vec2 dir = uChain.zw;
  vec2 side = uChainSide;
  float len = uChainLength.x;
  float z = uChainLength.y;
  vec2 head = tail + dir * len;
  vec2 r = boom(p, tail + side * 15.0 - dir * 6.0, head + side * 15.0 + dir * 6.0, z);
  float s = dot(p.xy - tail, dir);
  float k = floor((s - uPhase) / uPitch);
  for (int j = 0; j < 2; j++) {
    float at = uPhase + (k + float(j)) * uPitch;
    if (at < 6.0 || at > len - 6.0) continue;
    vec3 g = p - vec3(tail + dir * at, z);
    vec2 across = vec2(dot(g.xy, -side), dot(g.xy, dir));
    r = opU(r, vec2(sdCapsule(vec3(across, g.z), vec3(0.0), vec3(uJaw - 2.0, 0.0, 0.0), 2.2), DARK));
    r = opU(r, vec2(sdBox(g - vec3(-side * uJaw, 0.0), vec3(uJawBox, 3.5)), ACCENT));
  }
  for (int i = 0; i < 2; i++) {
    vec3 w = p - vec3(i == 0 ? tail : head, z);
    r = opU(r, vec2(sdGear(w - vec3(0.0, 0.0, 12.0), 12.0, 10.0, uSpin, 3.0), BODY));
    r = opU(r, vec2(sdDisc(w - vec3(0.0, 0.0, 16.0), 3.8, 2.5), ACCENT));
    r = opU(r, vec2(sdBox(vec3(w.xy - side * 15.0, p.z - z * 0.5 + 4.0), vec3(8.0, 8.0, z * 0.5 - 4.0)), DARK));
  }
  r = opU(r, vec2(sdRoundBox(p - uDriveC, uDriveB, 2.0), BODY));
  vec3 g = p - uDriveGear;
  r = opU(r, vec2(sdGear(g - vec3(0.0, 0.0, 3.0), 8.0, 8.0, -uSpin * 1.5, 3.0), DARK));
  r = opU(r, vec2(sdDisc(g - vec3(0.0, 0.0, 6.5), 2.6, 1.0), ACCENT));
  return r;
}

/** a funnel: half widths at the top and bottom, height, half depth */
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
  r = opU(r, vec2(max(sdBox(q + vec3(0.0, H.z * 0.5 - 3.0, 0.0), vec3(H.x + 3.0, 3.0, H.w + 3.0)), -inner), DARK));
  r = opU(r, vec2(sdRoundBox(p - uCounterC, uCounterB, 1.0), BODY));
  return r;
}

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
      float body = extrude(length(s.yz) - 6.5, s.x, 6.0);
      body = max(body, -extrude(length(s.yz) - 3.2, s.x - 4.0, 4.0));
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
  if ((gMask & 8) != 0) r = opU(r, jacks(p));
  return r;
}

vec3 normalAt(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
    k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x
  );
}

/** how sharply the surface bends within w of p */
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

bool inside(vec2 px, vec4 b) {
  return px.x >= b.x && px.y >= b.y && px.x <= b.z && px.y <= b.w;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
  // nothing is drawn past the sheet's gutters
  if (px.x < uFrame.x || px.x > uFrame.y) {
    color = vec4(0.0);
    return;
  }
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
  float tWall = uEye.z / -rd.z;
  float tFloor = rd.y > 0.0 ? (uFloor.x - ro.y) / rd.y : 1e9;
  // the floor ends just past the crate: a phone's hopper hangs below its level beside it
  vec3 f = ro + rd * tFloor;
  bool onFloor = tFloor < tWall && f.z <= uFloor.y && f.z >= uCrate.z - uCrateSize.z - 10.0 && abs(f.x - uCrate.x) < uCrateSize.x + 24.0;
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
      // a ray grazing a silhouette: an outline at its nearest approach
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
    if (front && (inside(px, uLabel) || inside(px, uCounter) || inside(px, uDrive))) col = vec4(0.0);
  } else if (gMask != 0) {
    bool clean = false;
    for (int i = 0; i < 2; i++) {
      if (inside(px, uWindow[i])) clean = true;
    }
    vec3 p = ro + rd * tBack;
    if (!clean && threshold < 0.16 && lit(p + vec3(0.0, onFloor ? -0.5 : 0.0, onFloor ? 0.0 : 0.5), 64.0) < 0.5) col = vec4(uLine, 1.0);
  }

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
      bool plug = at >= count - 2;
      vec3 c = tone * (plug ? 1.0 : 0.16) > threshold ? (plug ? uAccent : uLit) : uShade;
      if (abs(across) > 0.78) c = uPen;
      col = vec4(c, 1.0);
      depth = t;
    }
  }

  // the outlines of what is behind a carried file stay behind it
  for (int i = 0; i < ${CARDS}; i++) {
    if (float(i) >= uCards) break;
    if (!inside(px, uCard[i])) continue;
    float t = (uEye.z - uCardZ[i / 4][i % 4]) / -rd.z;
    if (t < depth) {
      col = vec4(0.0);
      depth = t;
    }
  }

  if (edge < 1.25 && edgeT < depth + 1.0 && col.a == 0.0) col = vec4(uPen, 1.0);
  else if (edge < 1.25 && edgeT < depth - 2.0) col = vec4(uPen, 1.0);
  color = vec4(col.rgb * col.a, col.a);
}
`;

export type Vec3 = [number, number, number];

/** a cable's path, sampled: points and the arc length at each */
export interface Route {
  points: Vec3[];
  at: number[];
  length: number;
}

/** a cable's radius, and its plug's length */
export const RADIUS = 3.5;
export const PLUG = 18;
const BEND = 12;
const SAMPLES = 4;

function bezier(a: number, b: number, c: number, t: number) {
  const s = 1 - t;
  return s * s * a + 2 * s * t * b + t * t * c;
}

function route(corners: Vec3[]): Route {
  const points: Vec3[] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const p = corners[i];
    const a = direction(corners[i - 1], p);
    const b = direction(p, corners[i + 1]);
    const r = Math.min(BEND, distance(corners[i - 1], p) / 2, distance(p, corners[i + 1]) / 2);
    const from: Vec3 = [p[0] - a[0] * r, p[1] - a[1] * r, p[2] - a[2] * r];
    const to: Vec3 = [p[0] + b[0] * r, p[1] + b[1] * r, p[2] + b[2] * r];
    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      points.push([
        bezier(from[0], p[0], to[0], t),
        bezier(from[1], p[1], to[1], t),
        bezier(from[2], p[2], to[2], t),
      ]);
    }
  }
  points.push(corners[corners.length - 1]);
  const at = [0];
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + distance(points[i - 1], points[i]));
  return { points, at, length: at[at.length - 1] };
}

export function pointAt(r: Route, s: number, out: Vec3): Vec3 {
  if (s <= 0) return Object.assign(out, r.points[0]);
  if (s >= r.length) return Object.assign(out, r.points[r.points.length - 1]);
  let i = 1;
  while (r.at[i] < s) i++;
  const a = r.points[i - 1];
  const b = r.points[i];
  const t = (s - r.at[i - 1]) / (r.at[i] - r.at[i - 1] || 1);
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

function locate(r: Route, p: Vec3): number {
  let best = Infinity;
  let at = 0;
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1];
    const b = r.points[i];
    const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1;
    const t = Math.min(
      1,
      Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l),
    );
    const d = distance([a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t], p);
    if (d < best) {
      best = d;
      at = r.at[i - 1] + t * (r.at[i] - r.at[i - 1]);
    }
  }
  return at;
}

export type Cable = ReturnType<typeof routes>;

/**
 * A cable plugged into the crate, and plugged into your folder; both share their start up to where
 * the gutter reaches your folder's row, `branch` along the first, `turn` along the second. Its run
 * toward the viewer meets the front at `forward`, so the perspective can't swing it onto a window.
 */
export function routes(c: {
  reel: Vec3;
  lane: number;
  wall: number;
  floor: number;
  front: number;
  forward: number;
  socket: Vec3;
  target: Vec3;
}) {
  const y = c.floor - RADIUS;
  const sealed = route([
    c.reel,
    [c.lane, c.reel[1], c.wall],
    [c.lane, y, c.wall],
    [c.forward, y, c.front],
    [c.socket[0], y, c.front],
    [c.socket[0], c.socket[1], c.front],
    c.socket,
  ]);
  const corner: Vec3 = [c.lane, c.target[1], c.wall];
  const plug: Vec3 = [c.target[0] + PLUG, c.target[1], c.target[2]];
  const done = route([c.reel, [c.lane, c.reel[1], c.wall], corner, plug, c.target]);
  return { sealed, done, branch: locate(sealed, corner), turn: locate(done, corner) };
}

function direction(a: Vec3, b: Vec3): Vec3 {
  const d = distance(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
