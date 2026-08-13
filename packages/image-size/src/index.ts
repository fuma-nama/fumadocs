import { parsers } from './parsers';
import { tiffFromReader } from './parsers/tiff';
import { fileSource, urlSource, type RequestOptions } from './lib/source';
import { ImageSizeError } from './error';
import type { ImageSizeResult } from './types';

export { ImageSizeError, type ImageSizeErrorCode } from './error';
export type { ImageSize, ImageSizeResult, ImageType, Parser } from './types';
export type { RequestOptions } from './lib/source';

/**
 * How far into an image the sequential scan looks. Every supported format
 * keeps its header up front — the one exception, a TIFF whose IFD trails the
 * image data, is followed with a targeted read instead.
 */
const MAX_INPUT_SIZE = 512 * 1024;

const INITIAL_CAPACITY = 16 * 1024;

export interface ProbeOptions extends RequestOptions {
  /**
   * Stop the sequential scan after this many bytes. A TIFF pointing past this
   * is still resolved — its dimensions are read right where the header says.
   *
   * @defaultValue 524288
   */
  limit?: number;
}

/**
 * Read the size of a fully loaded image.
 *
 * Returns `null` when the data isn't a supported image — including when it is
 * simply too short, so a partial image can be retried with more bytes.
 */
export function imageSize(data: Uint8Array): ImageSizeResult | null {
  for (const parse of parsers) {
    const result = parse(data);

    // the first parser to claim the data decides the outcome, a second opinion
    // on bytes that already matched a signature is worthless
    if (result) {
      return result.width > 0 && result.height > 0 ? result : null;
    }
  }

  return null;
}

/**
 * Read the size of an image from a file path or an `http(s)` URL, downloading
 * (or reading) no more than the header it takes to answer.
 *
 * @param src - a path, a `file:` URL, or an `http(s)` URL
 * @throws {ImageSizeError} when the image can't be read or isn't a supported format
 */
export async function probe(
  src: string | URL,
  { limit = MAX_INPUT_SIZE, ...request }: ProbeOptions = {},
): Promise<ImageSizeResult> {
  const source = isRemote(src) ? urlSource(src, request) : fileSource(src);

  try {
    const buffer = new GrowableBuffer();

    for await (const chunk of source.stream(limit)) {
      buffer.push(chunk);

      const size = imageSize(buffer.view());
      if (size) return size;
      if (buffer.length >= limit) break;
    }

    // a TIFF may keep its dimensions past the scanned head — the header says
    // exactly where, so follow the pointer instead of reading front to back
    // (a positioned read for files, a `Range` request for URLs)
    const trailing = await tiffFromReader(buffer.view(), source.readAt);
    if (trailing) return trailing;

    throw new ImageSizeError('unrecognized file format', 'ECONTENT');
  } finally {
    await source.close();
  }
}

function isRemote(src: string | URL): boolean {
  if (typeof src !== 'string') return src.protocol === 'http:' || src.protocol === 'https:';

  // a Windows drive letter looks like a protocol, so match the full prefix
  return /^https?:\/\//i.test(src);
}

/**
 * Parsers need one contiguous buffer, and each new chunk may be the one that
 * completes the header — so the bytes are accumulated rather than streamed.
 */
class GrowableBuffer {
  #buffer = new Uint8Array(INITIAL_CAPACITY);
  length = 0;

  push(chunk: Uint8Array): void {
    const required = this.length + chunk.length;

    if (required > this.#buffer.length) {
      let capacity = this.#buffer.length;
      while (capacity < required) capacity *= 2;

      const grown = new Uint8Array(capacity);
      grown.set(this.#buffer.subarray(0, this.length));
      this.#buffer = grown;
    }

    this.#buffer.set(chunk, this.length);
    this.length = required;
  }

  view(): Uint8Array {
    return this.#buffer.subarray(0, this.length);
  }
}
