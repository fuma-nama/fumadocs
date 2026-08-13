import { ImageSizeError } from '../error';

const CHUNK_SIZE = 64 * 1024;

/**
 * A stalled server would otherwise hang the caller forever — reading an image
 * header is quick, so anything this slow is better reported than waited on.
 */
const DEFAULT_TIMEOUT = 30_000;

export interface RequestOptions {
  /**
   * Abort each request after this many milliseconds.
   * Pass `0` (or `Infinity`) to wait forever.
   *
   * @defaultValue 30000
   */
  timeout?: number;

  /**
   * Extra headers to send.
   */
  headers?: Record<string, string>;
}

/**
 * Sequential streaming covers every format that keeps its header up front;
 * `readAt` exists for the one that doesn't (TIFF with a trailing IFD).
 */
export interface ByteSource {
  stream(limit: number): AsyncIterable<Uint8Array>;

  /** Read `[position, position + length)`, returning fewer bytes at EOF. */
  readAt(position: number, length: number): Promise<Uint8Array>;

  close(): Promise<void>;
}

type FileHandle = import('node:fs/promises').FileHandle;

/**
 * `node:fs` is imported lazily so that importing this package stays harmless
 * outside Node — `imageSize()` is pure and works anywhere.
 */
export function fileSource(src: string | URL): ByteSource {
  let handle: Promise<FileHandle> | undefined;
  const open = () => (handle ??= import('node:fs/promises').then((fs) => fs.open(src, 'r')));

  return {
    async *stream(limit) {
      const file = await open();
      const buffer = new Uint8Array(CHUNK_SIZE);
      let position = 0;

      while (position < limit) {
        const { bytesRead } = await file.read(
          buffer,
          0,
          Math.min(buffer.length, limit - position),
          position,
        );
        if (bytesRead === 0) return;

        position += bytesRead;
        // the consumer copies each chunk out before asking for the next one
        yield buffer.subarray(0, bytesRead);
      }
    },

    async readAt(position, length) {
      const file = await open();
      const buffer = new Uint8Array(length);
      let read = 0;

      while (read < length) {
        const { bytesRead } = await file.read(buffer, read, length - read, position + read);
        if (bytesRead === 0) break;
        read += bytesRead;
      }

      return buffer.subarray(0, read);
    },

    async close() {
      // a failed open() already surfaced through the read that triggered it
      await handle?.then((file) => file.close()).catch(() => {});
    },
  };
}

export function urlSource(url: string | URL, options: RequestOptions = {}): ByteSource {
  const { timeout = DEFAULT_TIMEOUT, headers } = options;

  async function request(extra?: Record<string, string>) {
    const controller = new AbortController();
    const timer =
      Number.isFinite(timeout) && timeout > 0
        ? setTimeout(
            () => controller.abort(new ImageSizeError(`timed out after ${timeout}ms`, 'ETIMEDOUT')),
            timeout,
          )
        : undefined;

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: extra ? { ...headers, ...extra } : headers,
      });

      return { res, done: () => clearTimeout(timer) };
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  function assertBody(res: Response): ReadableStream<Uint8Array> {
    if (!res.ok && res.status !== 206) {
      throw new ImageSizeError(`bad status code: ${res.status}`, 'EHTTP', res.status);
    }
    if (!res.body) throw new ImageSizeError('response has no body', 'ECONTENT');

    return res.body;
  }

  return {
    async *stream() {
      const { res, done } = await request();

      try {
        // async iteration cancels the stream when the consumer stops early,
        // so the rest of the body is never downloaded
        yield* assertBody(res);
      } finally {
        done();
      }
    },

    async readAt(position, length) {
      const { res, done } = await request({
        range: `bytes=${position}-${position + length - 1}`,
      });

      try {
        // the range starts past the end of the resource
        if (res.status === 416) return new Uint8Array(0);

        // 206 delivers the requested window; 200 means the server ignored the
        // range header, so skip up to `position` and keep only what was asked
        let skip = res.status === 206 ? 0 : position;
        const out = new Uint8Array(length);
        let read = 0;

        for await (let chunk of assertBody(res)) {
          if (skip > 0) {
            if (chunk.length <= skip) {
              skip -= chunk.length;
              continue;
            }
            chunk = chunk.subarray(skip);
            skip = 0;
          }

          const take = Math.min(chunk.length, length - read);
          out.set(chunk.subarray(0, take), read);
          read += take;
          // leaving the loop cancels the stream
          if (read >= length) break;
        }

        return out.subarray(0, read);
      } finally {
        done();
      }
    },

    async close() {},
  };
}
