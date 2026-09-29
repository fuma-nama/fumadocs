import { readUInt16BE } from '../lib/binary';
import type { Parser } from '../types';

export const jpeg: Parser = (data) => {
  if (data.length < 2) return;

  // the file must open with 0xFFD8, followed by another marker
  if (data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) return;

  let offset = 2;

  while (offset < data.length) {
    // markers are byte-aligned to 0xFF, skip anything before the next one
    while (offset < data.length && data[offset] !== 0xff) offset++;
    // the marker byte must be followed by its code
    if (data.length - offset < 2) return;
    offset++;

    let code = data[offset++];
    let length: number;

    // skip padding bytes
    while (code === 0xff) code = data[offset++];

    if ((code >= 0xd0 && code <= 0xd9) || code === 0x01) {
      // standalone markers, JPEG 1992 table B.1
      length = 0;
    } else if (code >= 0xc0 && code <= 0xfe) {
      // the rest of the unreserved markers
      if (data.length - offset < 2) return;

      length = readUInt16BE(data, offset) - 2;
      offset += 2;
    } else {
      // unknown marker
      return;
    }

    // end of the datastream, no frame header found
    if (code === 0xd9 /* EOI */ || code === 0xda /* SOS */) return;

    // a start-of-frame marker, excluding the huffman/arithmetic table markers
    if (
      length >= 5 &&
      code >= 0xc0 &&
      code <= 0xcf &&
      code !== 0xc4 &&
      code !== 0xc8 &&
      code !== 0xcc
    ) {
      if (data.length - offset < length) return;

      return {
        width: readUInt16BE(data, offset + 3),
        height: readUInt16BE(data, offset + 1),
        type: 'jpg',
        mime: 'image/jpeg',
      };
    }

    offset += length;
  }
};
