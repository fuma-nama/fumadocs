import { isPlainObject } from '../is-plain-object';
import { decodeInternalRef } from './ref';
import { resolveRefSync } from './resolve-ref';

/**
 * return a filtered object that only contains the given `$ref` & its referenced fields.
 */
export function pickSchema(root: object, $ref: string): object {
  const out: object = {};
  const scanned = new Set<string>();
  const queue: unknown[] = [{ $ref }];

  for (const next of queue) {
    if (isPlainObject(next)) {
      if (typeof next.$ref === 'string') {
        if (scanned.has(next.$ref)) continue;

        const resolved = resolveRefSync(next.$ref, root);
        scanned.add(next.$ref);
        queue.push(resolved);
        setField(out, decodeInternalRef(next.$ref), resolved);
      }

      for (const k in next) queue.push(next[k]);
      continue;
    }

    if (Array.isArray(next)) {
      queue.push(...next);
    }
  }

  return out;
}

function setField(obj: unknown, field: string[], value: unknown, i = 0): unknown {
  if (i >= field.length) return value;

  const k = field[i];
  if (k.length === 0) return setField(obj, field, value, i + 1);

  if (isPlainObject(obj)) {
    obj[k] = setField(obj[k], field, value, i + 1);
    return obj;
  } else {
    return {
      [k]: setField(null, field, value, i + 1),
    };
  }
}
