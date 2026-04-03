import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import { resolveRefSync } from './resolve-ref';
import type { NoReferenceSwallow } from '.';
import { isPlainObject } from '../is-plain-object';

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
    // make sure we don't visit the same node twice
    if (visitedNodes.has(current)) {
      return current as never;
    }
    visitedNodes.add(current);

    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index++) {
        current[index] = resolve(current[index]);
      }
    } else if (isPlainObject(current)) {
      if (typeof current.$ref === 'string') {
        const ref = current['$ref'];
        delete current['$ref'];
        const resolved = resolve(resolveRefSync(ref, cloned) as JSONSchema);
        setOriginalRef(resolved, ref);
        setOriginalRef(current as JSONSchema, ref);

        if (typeof resolved === 'boolean') throw new Error('invalid schema');
        for (const k in resolved) {
          if (!(k in current)) {
            current[k] = resolved[k as never];
          }
        }
      }

      for (const key in current) {
        current[key] = resolve(current[key]);
      }
    }

    return current as JSONSchema;
  }

  return resolve(cloned);
}

export function dereferenceSwallow<T>(schema: T, full: unknown): NoReferenceSwallow<T> {
  if (isPlainObject(schema)) {
    if (typeof schema.$ref !== 'string') return schema as never;

    const { $ref, ...rest } = schema;
    const resolved = dereferenceSwallow(resolveRefSync($ref, full), full);

    if (typeof resolved !== 'object') throw new Error(`invalid schema referenced via "${$ref}"`);
    return { ...resolved, ...rest } as never;
  }

  return schema as never;
}
