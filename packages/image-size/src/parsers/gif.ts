import { readUInt16LE, signature, sliceEq } from '../lib/binary';
import type { Parser } from '../types';

const SIG_GIF87a = signature('GIF87a');
const SIG_GIF89a = signature('GIF89a');

export const gif: Parser = (data) => {
  if (data.length < 10) return;
  if (!sliceEq(data, 0, SIG_GIF87a) && !sliceEq(data, 0, SIG_GIF89a)) return;

  return {
    width: readUInt16LE(data, 6),
    height: readUInt16LE(data, 8),
    type: 'gif',
    mime: 'image/gif',
  };
};
