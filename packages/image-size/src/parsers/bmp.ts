import { readInt16LE, readInt32LE, readUInt32LE, signature, sliceEq } from '../lib/binary';
import type { Parser } from '../types';

const SIG_BM = signature('BM');

export const bmp: Parser = (data) => {
  if (data.length < 26) return;
  if (!sliceEq(data, 0, SIG_BM)) return;

  const headerSize = readUInt32LE(data, 14);
  let width: number;
  let height: number;

  if (headerSize === 12) {
    // BMP v2 header
    width = readInt16LE(data, 18);
    height = readInt16LE(data, 20);
  } else if (headerSize > 12) {
    // BMP v3+ header
    width = readInt32LE(data, 18);
    height = readInt32LE(data, 22);
  } else {
    // BMP v1 and other garbage (10 bytes usually)
    return;
  }

  return {
    width,
    // a negative height marks a top-down bitmap
    height: Math.abs(height),
    type: 'bmp',
    mime: 'image/bmp',
  };
};
