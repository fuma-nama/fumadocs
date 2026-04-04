import { isPlainObject } from '../is-plain-object';
import { decodeInternalRef } from './ref';
import { resolveRefSync } from './resolve-ref';

/**
 * return a filtered object that only contains the given `$ref` & its referenced fields.
 */
export function pickSchema(root: object, $ref: string): object {
  const out: object = {};
  const scanned = new Set<string>();

  function scan(next: unknown) {
    if (isPlainObject(next)) {
      if (typeof next.$ref === 'string') {
        if (scanned.has(next.$ref)) return;

        const resolved = resolveRefSync(next.$ref, root);
        scanned.add(next.$ref);
        scan(resolved);
        setField(out, decodeInternalRef(next.$ref), resolved);
      }

      for (const k in next) scan(next[k]);
      return;
    }

    if (Array.isArray(next)) {
      for (const item of next) scan(item);
    }
  }

  scan({ $ref });
  return out;
}

function setField(obj: unknown, field: string[], value: unknown): unknown {
  if (field.length === 0) return value;

  const out: Record<string, unknown> = isPlainObject(obj) ? obj : {};
  let current = out;

  for (let i = 0; i < field.length; i++) {
    const k = field[i];

    if (i === field.length - 1) {
      current[k] = value;
    } else {
      const v = current[k];

      if (isPlainObject(v)) {
        current = v;
      } else {
        current = current[k] = {};
      }
    }
  }

  return out;
}
