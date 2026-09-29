import { signature, sliceEq } from '../lib/binary';
import { getMimeType, readSizeFromMeta, unbox } from '../lib/miaf';
import type { Parser } from '../types';

const SIG_FTYP = signature('ftyp');

export const avif: Parser = (data) => {
  // an ISO media file opens with a ftyp box:
  //   0000 0020 6674 7970 6176 6966
  //    (length)  f t  y p  a v  i f
  if (!sliceEq(data, 4, SIG_FTYP)) return;

  const firstBox = unbox(data, 0);
  if (!firstBox) return;

  const fileType = getMimeType(firstBox.data);
  if (!fileType) return;

  let meta: Uint8Array | undefined;

  for (let box = unbox(data, firstBox.end); box; box = unbox(data, box.end)) {
    // `mdat` should be last, so metadata after it is unlikely to exist
    if (box.boxtype === 'mdat') return;
    if (box.boxtype === 'meta') {
      meta = box.data;
      break;
    }
  }

  if (!meta) return;

  const found = readSizeFromMeta(meta);
  if (!found) return;

  return {
    width: found.size.width,
    height: found.size.height,
    type: fileType.type,
    mime: fileType.mime,
    ...(found.variants.length > 1 ? { variants: found.variants } : {}),
  };
};
