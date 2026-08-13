import * as path from 'node:path';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ImageSizeError, imageSize, probe } from '@/index';

const fixtures = path.join(import.meta.dirname, 'fixtures');

function bytes(...values: (number | string)[]): Uint8Array {
  const out: number[] = [];

  for (const value of values) {
    if (typeof value === 'number') out.push(value);
    else for (let i = 0; i < value.length; i++) out.push(value.charCodeAt(i) & 0xff);
  }

  return new Uint8Array(out);
}

function uint16BE(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint16LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff];
}

function utf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** a big-endian 640x480 tiff whose IFD sits at `ifdOffset`, after the pixel data */
function trailingIfdTiff(ifdOffset: number): Uint8Array {
  const tiff = new Uint8Array(ifdOffset + 2 + 24);
  const view = new DataView(tiff.buffer);

  tiff.set(bytes('MM', 0, 0x2a)); // big-endian signature
  view.setUint32(4, ifdOffset);
  view.setUint16(ifdOffset, 2); // entry count

  // tag, type SHORT, one value, then the value left-justified in 4 bytes
  for (const [index, [tag, value]] of [
    [256, 640],
    [257, 480],
  ].entries()) {
    const at = ifdOffset + 2 + index * 12;
    view.setUint16(at, tag);
    view.setUint16(at + 2, 3);
    view.setUint32(at + 4, 1);
    view.setUint16(at + 8, value);
  }

  return tiff;
}

describe('imageSize', () => {
  test('png', () => {
    const png = bytes(
      0x89,
      'PNG\r\n',
      0x1a,
      0x0a,
      0,
      0,
      0,
      0x0d,
      'IHDR',
      0,
      0,
      0x04,
      0xd2, // 1234
      0,
      0,
      0x02,
      0x2b, // 555
    );

    expect(imageSize(png)).toMatchObject({
      width: 1234,
      height: 555,
      type: 'png',
      mime: 'image/png',
    });
  });

  test('gif', () => {
    const gif = bytes('GIF89a', ...uint16LE(300), ...uint16LE(200));

    expect(imageSize(gif)).toMatchObject({ width: 300, height: 200, type: 'gif' });
  });

  test('bmp', () => {
    const bmp = bytes(
      'BM',
      ...Array.from({ length: 12 }, () => 0),
      ...uint32LE(40), // v3 header
      ...uint32LE(64),
      ...uint32LE(0xffffffe0), // -32, a top-down bitmap
      0,
      0,
    );

    expect(imageSize(bmp)).toMatchObject({ width: 64, height: 32, type: 'bmp' });
  });

  test('jpeg', () => {
    const jpeg = bytes(
      0xff,
      0xd8, // SOI
      0xff,
      0xc0, // SOF0
      ...uint16BE(17),
      8, // precision
      ...uint16BE(768), // height
      ...uint16BE(1024), // width
      ...Array.from({ length: 10 }, () => 0),
    );

    expect(imageSize(jpeg)).toMatchObject({
      width: 1024,
      height: 768,
      type: 'jpg',
      mime: 'image/jpeg',
    });
  });

  test('webp (lossless)', () => {
    const chunk = bytes('VP8L', ...uint32LE(5), 0x2f, ...uint32LE((5 - 1) | ((9 - 1) << 14)));
    const webp = bytes('RIFF', ...uint32LE(4 + chunk.length), 'WEBP', ...chunk);

    expect(imageSize(webp)).toMatchObject({ width: 5, height: 9, type: 'webp' });
  });

  test('ico reports the largest variant', () => {
    const ico = bytes(
      ...uint16LE(0),
      ...uint16LE(1),
      ...uint16LE(2),
      16,
      16,
      ...Array.from({ length: 14 }, () => 0),
      0,
      0, // 0 means 256
      ...Array.from({ length: 14 }, () => 0),
    );

    expect(imageSize(ico)).toMatchObject({
      width: 256,
      height: 256,
      type: 'ico',
      variants: [
        { width: 16, height: 16 },
        { width: 256, height: 256 },
      ],
    });
  });

  test('rejects data that is not an image', () => {
    expect(imageSize(utf8('this is plain text, long enough to be a header'))).toBeNull();
  });

  test('rejects a truncated header, so it can be retried', () => {
    const partial = bytes(0x89, 'PNG\r\n', 0x1a, 0x0a);

    expect(imageSize(partial)).toBeNull();
  });
});

describe('imageSize: svg', () => {
  test('explicit dimensions', () => {
    expect(imageSize(utf8('<svg width="100" height="50"></svg>'))).toMatchObject({
      width: 100,
      height: 50,
      type: 'svg',
      mime: 'image/svg+xml',
    });
  });

  test('converts other css units to pixels', () => {
    expect(imageSize(utf8('<svg width="10em" height="2em"/>'))).toMatchObject({
      width: 160,
      height: 32,
    });
    expect(imageSize(utf8('<svg width="1in" height="72pt"/>'))).toMatchObject({
      width: 96,
      height: 96,
    });
  });

  test('falls back to the viewBox', () => {
    expect(imageSize(utf8('<svg viewBox="0 0 100 50"/>'))).toMatchObject({
      width: 100,
      height: 50,
    });
  });

  test('derives the missing dimension from the viewBox ratio', () => {
    expect(imageSize(utf8('<svg width="200" viewBox="0 0 100 50"/>'))).toMatchObject({
      width: 200,
      height: 100,
    });
  });

  test('ignores percentages and stroke-width', () => {
    expect(imageSize(utf8('<svg width="100%" height="100%" stroke-width="2"/>'))).toBeNull();
  });

  test('rejects an svg with no usable size', () => {
    expect(imageSize(utf8('<svg fill="none" stroke-width="2"><circle r="1"/></svg>'))).toBeNull();
  });

  test('skips svg embedded in html', () => {
    expect(imageSize(utf8('<html><svg width="10" height="10"/></html>'))).toBeNull();
  });

  test('skips the xml declaration and doctype before the root element', () => {
    expect(
      imageSize(utf8('<?xml version="1.0"?>\n<!DOCTYPE svg><svg width="7" height="8"/>')),
    ).toMatchObject({ width: 7, height: 8, type: 'svg' });
  });

  test('handles pathological `<` input in linear time', () => {
    // every other position opens a tag candidate and no `>` ever closes one —
    // scanning this with a `/<[name][^>]*>/` regex backtracks quadratically
    // (about a minute at this size); the manual scan is a few milliseconds
    const hostile = utf8(`>${'<a'.repeat(256 * 1024)}`);

    const start = performance.now();
    expect(imageSize(hostile)).toBeNull();
    expect(performance.now() - start).toBeLessThan(250);
  });
});

describe('probe', () => {
  test('reads a file', async () => {
    await expect(probe(path.join(fixtures, 'test.png'))).resolves.toMatchObject({
      width: 1299,
      height: 731,
      type: 'png',
    });
  });

  test('accepts a file url', async () => {
    const url = new URL('file://');
    url.pathname = path.join(fixtures, 'test.png');

    await expect(probe(url)).resolves.toMatchObject({ width: 1299, height: 731 });
  });

  test('grows past the first chunk when the header is late', async () => {
    // the comment pushes the `<svg>` tag well beyond a single read
    const padded = `<!--${'.'.repeat(200 * 1024)}--><svg width="12" height="34"/>`;
    const file = path.join(fixtures, 'padded.svg');
    const { writeFile, rm } = await import('node:fs/promises');
    await writeFile(file, padded);

    try {
      await expect(probe(file)).resolves.toMatchObject({ width: 12, height: 34 });
    } finally {
      await rm(file, { force: true });
    }
  });

  test('rejects a missing file', async () => {
    await expect(probe(path.join(fixtures, 'nope.png'))).rejects.toThrow();
  });

  test('rejects an unsupported format', async () => {
    const file = path.join(fixtures, 'not-an-image.txt');
    const { writeFile, rm } = await import('node:fs/promises');
    await writeFile(file, 'just some text');

    try {
      await expect(probe(file)).rejects.toThrow(ImageSizeError);
    } finally {
      await rm(file, { force: true });
    }
  });

  test('gives up once `limit` bytes have been read', async () => {
    await expect(probe(path.join(fixtures, 'test.png'), { limit: 8 })).rejects.toThrow(
      'unrecognized file format',
    );
  });

  // TIFF is the one supported format that can put its metadata after the
  // image data — the header points at it, and probe follows the pointer with
  // a targeted read instead of scanning the file front to back
  test('follows a tiff IFD stored past the scan limit', async () => {
    const file = path.join(fixtures, 'trailing-ifd.tiff');
    const { writeFile, rm } = await import('node:fs/promises');
    await writeFile(file, trailingIfdTiff(700 * 1024));

    try {
      await expect(probe(file)).resolves.toMatchObject({
        width: 640,
        height: 480,
        type: 'tiff',
      });
    } finally {
      await rm(file, { force: true });
    }
  });
});

describe('probe: http', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    // a 24-byte png header reporting 800x600
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
    png.set(bytes('IHDR'), 12);
    const view = new DataView(png.buffer);
    view.setUint32(16, 800);
    view.setUint32(20, 600);

    // bigger than the 512KB scan limit, so only a targeted read can find the IFD
    const tiff = trailingIfdTiff(700 * 1024);

    server = createServer((req, res) => {
      if (req.url === '/image.png') {
        res.end(Buffer.from(png));
      } else if (req.url === '/redirect') {
        res.writeHead(302, { location: '/image.png' });
        res.end();
      } else if (req.url === '/stall') {
        // headers arrive, the body never does
        res.writeHead(200);
        res.flushHeaders();
      } else if (req.url === '/tiff' || req.url === '/tiff-no-ranges') {
        const range =
          req.url === '/tiff' ? /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '') : null;

        if (!range) {
          res.end(Buffer.from(tiff));
          return;
        }

        const from = Number(range[1]);
        const to = Math.min(Number(range[2]), tiff.length - 1);

        if (from >= tiff.length) {
          res.writeHead(416);
          res.end();
          return;
        }

        res.writeHead(206, { 'content-range': `bytes ${from}-${to}/${tiff.length}` });
        res.end(Buffer.from(tiff.subarray(from, to + 1)));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address !== 'object') throw new Error('no address');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  test('reads a remote image, following redirects', async () => {
    await expect(probe(`${base}/redirect`)).resolves.toMatchObject({
      width: 800,
      height: 600,
      type: 'png',
    });
  });

  test('times out on a stalled response', async () => {
    const error = await probe(`${base}/stall`, { timeout: 200 }).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ImageSizeError);
    expect((error as ImageSizeError).code).toBe('ETIMEDOUT');
  });

  test('rejects a bad status code', async () => {
    const error = await probe(`${base}/missing.png`).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ImageSizeError);
    expect((error as ImageSizeError).code).toBe('EHTTP');
    expect((error as ImageSizeError).statusCode).toBe(404);
  });

  test('resolves a trailing tiff IFD with a range request', async () => {
    await expect(probe(`${base}/tiff`)).resolves.toMatchObject({
      width: 640,
      height: 480,
      type: 'tiff',
    });
  });

  test('resolves a trailing tiff IFD when the server ignores ranges', async () => {
    await expect(probe(`${base}/tiff-no-ranges`)).resolves.toMatchObject({
      width: 640,
      height: 480,
      type: 'tiff',
    });
  });
});
