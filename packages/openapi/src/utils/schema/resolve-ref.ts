import { isPlainObject } from '../is-plain-object';
import { decodeInternalRef } from './ref';

export function resolveRefSync(ref: string, schema: unknown): unknown | undefined {
  let current = schema;

  for (const seg of decodeInternalRef(ref)) {
    if (isPlainObject(current)) current = current[seg];
    else return;
  }

  return current;
}
