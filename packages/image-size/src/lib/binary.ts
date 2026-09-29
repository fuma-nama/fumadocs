/**
 * Reads past the end of `data` yield `undefined`, which the bitwise operators below
 * coerce to `0`. Parsers rely on that: they length-check before trusting a value, and
 * a short buffer simply fails to match instead of throwing.
 */

/** Byte values of a latin1 signature, for use with {@link sliceEq}. */
export function signature(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 0xff);
  return out;
}

/** Whether `data` contains `expected` at `start`. */
export function sliceEq(data: Uint8Array, start: number, expected: readonly number[]): boolean {
  for (let i = start, j = 0; j < expected.length;) {
    if (data[i++] !== expected[j++]) return false;
  }

  return true;
}

/** Read `[start, end)` as latin1 — the encoding every container uses for its tags. */
export function ascii(data: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end && i < data.length; i++) out += String.fromCharCode(data[i]);

  return out;
}

export function readUInt16LE(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

export function readUInt16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

export function readInt16LE(data: Uint8Array, offset: number): number {
  return (readUInt16LE(data, offset) << 16) >> 16;
}

export function readUInt32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16)) +
    data[offset + 3] * 0x1000000
  );
}

export function readUInt32BE(data: Uint8Array, offset: number): number {
  return (
    data[offset] * 0x1000000 +
    ((data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3])
  );
}

export function readInt32LE(data: Uint8Array, offset: number): number {
  return readUInt32LE(data, offset) | 0;
}

/** Big-endian integer of an arbitrary byte width, used by ISO base media boxes. */
export function readUIntBE(data: Uint8Array, offset: number, size: number): number {
  let result = 0;
  for (let i = 0; i < size; i++) result = result * 256 + (data[offset + i] || 0);

  return result;
}
