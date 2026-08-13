import { ascii, readUInt16LE, readUInt32LE, signature, sliceEq } from '../lib/binary';
import type { ImageSizeResult, Parser } from '../types';

const SIG_RIFF = signature('RIFF');
const SIG_WEBP = signature('WEBP');

function base(width: number, height: number): ImageSizeResult {
  return { width, height, type: 'webp', mime: 'image/webp' };
}

/** lossy */
function parseVP8(data: Uint8Array, offset: number): ImageSizeResult | undefined {
  if (data[offset + 3] !== 0x9d || data[offset + 4] !== 0x01 || data[offset + 5] !== 0x2a) {
    // bad code block signature
    return;
  }

  return base(readUInt16LE(data, offset + 6) & 0x3fff, readUInt16LE(data, offset + 8) & 0x3fff);
}

/** lossless */
function parseVP8L(data: Uint8Array, offset: number): ImageSizeResult | undefined {
  if (data[offset] !== 0x2f) return;

  const bits = readUInt32LE(data, offset + 1);

  return base((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
}

/** extended (alpha, animation, ...) */
function parseVP8X(data: Uint8Array, offset: number): ImageSizeResult {
  return base(
    ((data[offset + 6] << 16) | (data[offset + 5] << 8) | data[offset + 4]) + 1,
    ((data[offset + 9] << 16) | (data[offset + 8] << 8) | data[offset + 7]) + 1,
  );
}

export const webp: Parser = (data) => {
  if (data.length < 16) return;

  // /^RIFF....WEBPVP8([ LX])$/
  if (!sliceEq(data, 0, SIG_RIFF) || !sliceEq(data, 8, SIG_WEBP)) return;

  const fileLength = readUInt32LE(data, 4) + 8;
  if (fileLength > data.length) return;

  let offset = 12;
  let result: ImageSizeResult | undefined;

  while (offset + 8 < fileLength) {
    if (data[offset] === 0) {
      // chunks of odd size are followed by a padding byte
      offset++;
      continue;
    }

    const header = ascii(data, offset, offset + 4);
    const length = readUInt32LE(data, offset + 4);

    if (header === 'VP8 ' && length >= 10) {
      result ??= parseVP8(data, offset + 8);
    } else if (header === 'VP8L' && length >= 5) {
      result ??= parseVP8L(data, offset + 8);
    } else if (header === 'VP8X' && length >= 10) {
      result ??= parseVP8X(data, offset + 8);
    }

    offset += 8 + length;
  }

  return result;
};
