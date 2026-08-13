/**
 * Box parsing for MIAF-based containers (AVIF / HEIC / HEIF).
 *
 * ISO media file spec:
 *   https://web.archive.org/web/20180219054429/http://l.web.umkc.edu/lizhu/teaching/2016sp.video-communication/ref/mp4.pdf
 * ISO image file format spec:
 *   https://standards.iso.org/ittf/PubliclyAvailableStandards/c066067_ISO_IEC_23008-12_2017.zip
 *
 * Images whose metadata is written after the image data are not supported, and
 * neither are images without an `ispe` box.
 */
import { ascii, readUInt32BE } from './binary';
import type { ImageSize, ImageType } from '../types';

export interface Box {
  boxtype: string;
  data: Uint8Array;
  end: number;
}

/**
 * ```
 * interface Box {
 *   size:       uint32;   // if size == 0, box lasts until EOF
 *   boxtype:    char[4];
 *   largesize?: uint64;   // only if size == 1
 *   usertype?:  char[16]; // only if boxtype == 'uuid'
 * }
 * ```
 */
export function unbox(data: Uint8Array, offset: number): Box | undefined {
  if (data.length < 4 + offset) return;

  // `size` counts the 4 length bytes; the 0 (until EOF) and 1 (64-bit length)
  // forms only occur on big boxes, which never hold what we're looking for
  const size = readUInt32BE(data, offset);
  if (data.length < size + offset || size < 8) return;

  return {
    boxtype: ascii(data, offset + 4, offset + 8),
    data: data.subarray(offset + 8, offset + size),
    end: offset + size,
  };
}

/** `meta` -> `iprp` -> `ipco`, which holds one `ispe` per stored image */
function scanIpco(data: Uint8Array, sizes: ImageSize[]): void {
  for (let box = unbox(data, 0); box; box = unbox(data, box.end)) {
    if (box.boxtype === 'ispe') {
      sizes.push({
        width: readUInt32BE(box.data, 4),
        height: readUInt32BE(box.data, 8),
      });
    }
  }
}

function scanIprp(data: Uint8Array, sizes: ImageSize[]): void {
  for (let box = unbox(data, 0); box; box = unbox(data, box.end)) {
    if (box.boxtype === 'ipco') scanIpco(box.data, sizes);
  }
}

function scanMeta(data: Uint8Array, sizes: ImageSize[]): void {
  // the first box sits behind 4 bytes of version + flags
  for (let box = unbox(data, 4); box; box = unbox(data, box.end)) {
    if (box.boxtype === 'iprp') scanIprp(box.data, sizes);
  }
}

/** The image with the largest single dimension, used as the base size. */
function getMaxSize(sizes: ImageSize[]): ImageSize {
  const maxWidthSize = sizes.reduce((a, b) =>
    a.width > b.width || (a.width === b.width && a.height > b.height) ? a : b,
  );

  const maxHeightSize = sizes.reduce((a, b) =>
    a.height > b.height || (a.height === b.height && a.width > b.width) ? a : b,
  );

  if (
    maxWidthSize.width > maxHeightSize.height ||
    (maxWidthSize.width === maxHeightSize.height && maxWidthSize.height > maxHeightSize.width)
  ) {
    return maxWidthSize;
  }

  return maxHeightSize;
}

export function readSizeFromMeta(
  data: Uint8Array,
): { size: ImageSize; variants: ImageSize[] } | undefined {
  const sizes: ImageSize[] = [];
  scanMeta(data, sizes);

  if (sizes.length === 0) return;

  return { size: getMaxSize(sizes), variants: sizes };
}

export function getMimeType(data: Uint8Array): { type: ImageType; mime: string } | undefined {
  const brand = ascii(data, 0, 4);
  const compat: Record<string, boolean> = { [brand]: true };

  for (let i = 8; i < data.length; i += 4) {
    compat[ascii(data, i, i + 4)] = true;
  }

  // heic and avif are supersets of miaf, so both list mif1 as compatible
  if (!compat.mif1 && !compat.msf1 && !compat.miaf) return;

  if (brand === 'avif' || brand === 'avis' || brand === 'avio') {
    // `.avifs` and `image/avif-sequence` were removed from the spec
    return { type: 'avif', mime: 'image/avif' };
  }

  // https://nokiatech.github.io/heif/technical.html
  if (brand === 'heic' || brand === 'heix') {
    return { type: 'heic', mime: 'image/heic' };
  }

  if (brand === 'hevc' || brand === 'hevx') {
    return { type: 'heic', mime: 'image/heic-sequence' };
  }

  if (compat.avif || compat.avis) {
    return { type: 'avif', mime: 'image/avif' };
  }

  if (compat.heic || compat.heix || compat.hevc || compat.hevx || compat.heis) {
    if (compat.msf1) return { type: 'heif', mime: 'image/heif-sequence' };
    return { type: 'heif', mime: 'image/heif' };
  }

  return { type: 'avif', mime: 'image/avif' };
}
