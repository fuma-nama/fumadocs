import { readUInt32BE, signature, sliceEq } from '../lib/binary';
import type { Parser } from '../types';

const SIG_PNG = signature('\x89PNG\r\n\x1a\n');
const SIG_IHDR = signature('IHDR');

export const png: Parser = (data) => {
  if (data.length < 24) return;
  if (!sliceEq(data, 0, SIG_PNG)) return;
  // the first chunk of a PNG is always the header
  if (!sliceEq(data, 12, SIG_IHDR)) return;

  return {
    width: readUInt32BE(data, 16),
    height: readUInt32BE(data, 20),
    type: 'png',
    mime: 'image/png',
  };
};
