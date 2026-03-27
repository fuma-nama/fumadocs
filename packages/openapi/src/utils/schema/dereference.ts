import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import { resolveRefSync } from './resolve-ref';

/**
 * Resolves all $ref pointers in a schema and returns a new schema without any $ref pointers.
 */
export function dereferenceSync(
  schema: JSONSchema,
  setOriginalRef: (schema: JSONSchema, ref: string) => void,
): JSONSchema {
  if (typeof schema === 'boolean') return schema;
  const visitedNodes = new Set<unknown>();
  const cloned = structuredClone(schema);

  function resolve(current: unknown): JSONSchema {
    if (typeof current === 'object' && current !== null) {
      // make sure we don't visit the same node twice
      if (visitedNodes.has(current)) {
        return current;
      }
      visitedNodes.add(current);

      if (Array.isArray(current)) {
        // array
        for (let index = 0; index < current.length; index++) {
          current[index] = resolve(current[index]);
        }

        return current as JSONSchema;
      }

      const obj = current as Record<string, unknown>;

      // object
      if ('$ref' in current && typeof current['$ref'] === 'string') {
        const ref = current['$ref'];
        delete current['$ref'];
        const resolved = resolve(resolveRefSync(ref, cloned) as JSONSchema);
        setOriginalRef(resolved, ref);
        setOriginalRef(current as JSONSchema, ref);

        if (typeof resolved === 'boolean') throw new Error('invalid schema');
        for (const k in resolved) {
          if (!(k in current)) {
            obj[k] = resolved[k as never];
          }
        }
      }

      for (const key in current) {
        obj[key] = resolve(obj[key]);
      }
    }

    return current as JSONSchema;
  }

  return resolve(cloned);
}
