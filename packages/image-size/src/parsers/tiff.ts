import {
  readUInt16BE,
  readUInt16LE,
  readUInt32BE,
  readUInt32LE,
  signature,
  sliceEq,
} from '../lib/binary';
import type { ImageSizeResult, Parser } from '../types';

const SIG_LE = signature('II\x2A\0');
const SIG_BE = signature('MM\0\x2A');

const TAG_WIDTH = 256;
const TAG_HEIGHT = 257;

function readUInt16(data: Uint8Array, offset: number, isBigEndian: boolean): number {
  return isBigEndian ? readUInt16BE(data, offset) : readUInt16LE(data, offset);
}

function readUInt32(data: Uint8Array, offset: number, isBigEndian: boolean): number {
  return isBigEndian ? readUInt32BE(data, offset) : readUInt32LE(data, offset);
}

function readIFDValue(data: Uint8Array, offset: number, isBigEndian: boolean): number | undefined {
  const type = readUInt16(data, offset + 2, isBigEndian);
  const values = readUInt32(data, offset + 4, isBigEndian);

  // only a single SHORT (3) or LONG (4) fits inline, anything else needs a seek
  if (values !== 1 || (type !== 3 && type !== 4)) return;

  if (type === 3) return readUInt16(data, offset + 8, isBigEndian);
  return readUInt32(data, offset + 8, isBigEndian);
}

export const tiff: Parser = (data) => {
  if (data.length < 8) return;
  if (!sliceEq(data, 0, SIG_LE) && !sliceEq(data, 0, SIG_BE)) return;

  const isBigEndian = data[0] === 77; /* 'MM' */
  const count = readUInt32(data, 4, isBigEndian) - 8;

  if (count < 0) return;

  // skip to the first image file directory
  let offset = count + 8;

  if (data.length - offset < 2) return;

  const ifdSize = readUInt16(data, offset, isBigEndian) * 12;
  if (ifdSize <= 0) return;

  offset += 2;
  if (data.length - offset < ifdSize) return;

  let width: number | undefined;
  let height: number | undefined;

  for (let i = 0; i < ifdSize; i += 12) {
    const tag = readUInt16(data, offset + i, isBigEndian);

    if (tag === TAG_WIDTH) {
      width = readIFDValue(data, offset + i, isBigEndian);
    } else if (tag === TAG_HEIGHT) {
      height = readIFDValue(data, offset + i, isBigEndian);
    }
  }

  if (!width || !height) return;

  return {
    width,
    height,
    type: 'tiff',
    mime: 'image/tiff',
  };
};

/** covers 256 IFD entries in one read, far more than real files carry */
const IFD_WINDOW = 2 + 256 * 12;

/**
 * TIFF is the one supported format whose dimensions may sit beyond a bounded
 * head read: the header stores a pointer to the IFD, and writers often place
 * that table after the image data. Follow the pointer with targeted reads and
 * hand a synthesized, minimal TIFF to the regular parser.
 */
export async function tiffFromReader(
  head: Uint8Array,
  readAt: (position: number, length: number) => Promise<Uint8Array>,
): Promise<ImageSizeResult | undefined> {
  if (head.length < 8) return;
  if (!sliceEq(head, 0, SIG_LE) && !sliceEq(head, 0, SIG_BE)) return;

  const isBigEndian = head[0] === 77; /* 'MM' */
  const ifdOffset = readUInt32(head, 4, isBigEndian);

  let ifd = await readAt(ifdOffset, IFD_WINDOW);
  if (ifd.length < 2) return;

  // entry count + entries; read the remainder when a file outgrows the window
  const size = 2 + readUInt16(ifd, 0, isBigEndian) * 12;

  if (ifd.length < size) {
    const rest = await readAt(ifdOffset + ifd.length, size - ifd.length);
    const joined = new Uint8Array(ifd.length + rest.length);
    joined.set(ifd);
    joined.set(rest, ifd.length);
    ifd = joined;
  }

  // splice the IFD directly behind the header, so the parser sees a tiny
  // well-formed file: signature, "IFD at byte 8", entry table
  const fake = new Uint8Array(8 + ifd.length);
  fake.set(head.subarray(0, 4));
  new DataView(fake.buffer).setUint32(4, 8, !isBigEndian);
  fake.set(ifd, 8);

  return tiff(fake);
}
