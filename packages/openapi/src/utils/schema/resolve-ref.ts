import type { JSONSchema } from 'json-schema-typed/draft-2020-12';

export function resolveRefSync(ref: string, schema: JSONSchema): unknown | undefined {
  if (!ref.startsWith('#')) return;
  const segments = ref.slice(1).split('/');
  let current: unknown = schema;

  for (const seg of segments) {
    if (seg.length === 0) continue;

    if (isPlainObject(current)) current = current[seg];
    else return;
  }

  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    prototype === null ||
    prototype === Object.prototype ||
    Object.getPrototypeOf(prototype) === null
  );
}
