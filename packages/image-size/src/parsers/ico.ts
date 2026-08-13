import { readUInt16LE } from '../lib/binary';
import type { ImageSize, Parser } from '../types';

const HEADER = 0;
const TYPE_ICO = 1;
const INDEX_SIZE = 16;

/** https://en.wikipedia.org/wiki/ICO_(file_format)#Icon_resource_structure */
export const ico: Parser = (data) => {
  if (data.length < 6) return;

  const header = readUInt16LE(data, 0);
  const type = readUInt16LE(data, 2);
  const numImages = readUInt16LE(data, 4);

  if (header !== HEADER || type !== TYPE_ICO || !numImages) return;
  if (data.length < 6 + numImages * INDEX_SIZE) return;

  const variants: ImageSize[] = [];
  let maxSize: ImageSize = { width: 0, height: 0 };

  for (let i = 0; i < numImages; i++) {
    // a stored 0 means 256, the dimension doesn't fit in a byte
    const width = data[6 + INDEX_SIZE * i] || 256;
    const height = data[6 + INDEX_SIZE * i + 1] || 256;
    const size = { width, height };
    variants.push(size);

    if (width > maxSize.width || height > maxSize.height) {
      maxSize = size;
    }
  }

  return {
    width: maxSize.width,
    height: maxSize.height,
    variants,
    type: 'ico',
    mime: 'image/x-icon',
  };
};
