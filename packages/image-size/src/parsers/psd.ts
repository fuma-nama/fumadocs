import { readUInt32BE, signature, sliceEq } from '../lib/binary';
import type { Parser } from '../types';

const SIG_8BPS = signature('8BPS\x00\x01');

export const psd: Parser = (data) => {
  if (data.length < 6 + 16) return;
  // signature + version
  if (!sliceEq(data, 0, SIG_8BPS)) return;

  return {
    width: readUInt32BE(data, 6 + 12),
    height: readUInt32BE(data, 6 + 8),
    type: 'psd',
    mime: 'image/vnd.adobe.photoshop',
  };
};
