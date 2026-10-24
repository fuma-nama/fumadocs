/**
 * GLSL ES 3.00 helpers shared by the landing shaders, paste with `${bayer8}`.
 *
 * `bayer8(p)`: ordered dither threshold in (0, 1) for an integer pixel coordinate `p`,
 * compare a value against it to get 1-bit output.
 */
export const bayer8 = `
const int BAYER8[64] = int[64](
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float bayer8(vec2 p) {
  ivec2 i = ivec2(mod(p, 8.0));
  return (float(BAYER8[i.y * 8 + i.x]) + 0.5) / 64.0;
}
`;
