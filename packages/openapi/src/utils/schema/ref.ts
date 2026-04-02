/**
 * RFC 6901 reference-token encoding for JSON Pointer fragments used in in-document `$ref` (`#/…`).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6901
 */

function encodeSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function decodeSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Build an in-document `$ref` string from logical path segments (e.g. `['components','schemas','Pet']` → `#/components/schemas/Pet`).
 */
export function encodeInternalRef(segments: readonly string[]): string {
  if (segments.length === 0) return '#/';
  return `#/${segments.map(encodeSegment).join('/')}`;
}

/**
 * Parse an in-document `$ref` (`#/…`) into decoded path segments for walking the root document.
 */
export function decodeInternalRef(ref: string): string[] {
  if (!ref.startsWith('#')) {
    throw new Error('expected in-document $ref starting with `#`');
  }

  const raw = ref.slice(1);
  const out: string[] = [];
  if (raw.length === 0) return out;

  for (const token of raw.split('/')) {
    if (token.length === 0) continue;
    out.push(decodeSegment(token));
  }

  return out;
}
