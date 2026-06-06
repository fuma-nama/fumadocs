import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import { appendInternalRefPath } from './ref';
import { resolveRefSync } from './resolve-ref';
import type { NoReferenceSwallow as NoReferenceShallow } from '.';
import { isPlainObject } from '../is-plain-object';

export interface DereferenceOptions {
  /**
   * Return `true` to keep the Reference Object at `pointer` without inlining.
   */
  preserveRef?: (pointer: string) => boolean;
  setOriginalRef?: (schema: JSONSchema, ref: string) => void;
}

/**
 * Resolves all $ref pointers in a schema and returns a new schema without any $ref pointers,
 * except at locations where `preserveRef` returns `true`.
 */
export function dereferenceSync(schema: JSONSchema, options: DereferenceOptions = {}): JSONSchema {
  const { preserveRef, setOriginalRef = () => {} } = options;
  if (typeof schema === 'boolean') return schema;
  const visitedNodes = new Set<unknown>();
  const cloned = structuredClone(schema);

  function resolve(current: unknown, pointer: string): JSONSchema {
    // make sure we don't visit the same node twice
    if (visitedNodes.has(current)) {
      return current as never;
    }
    visitedNodes.add(current);

    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index++) {
        current[index] = resolve(current[index], appendInternalRefPath(pointer, index));
      }
    } else if (isPlainObject(current)) {
      if (typeof current.$ref === 'string') {
        if (preserveRef?.(pointer)) {
          return current as JSONSchema;
        }

        const ref = current['$ref'];
        delete current['$ref'];
        const resolved = resolve(resolveRefSync(ref, cloned) as JSONSchema, pointer);
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
        current[key] = resolve(current[key], appendInternalRefPath(pointer, key));
      }
    }

    return current as JSONSchema;
  }

  return resolve(cloned, '#');
}

export function dereferenceShallow<T>(schema: T, full: unknown): NoReferenceShallow<T> {
  if (isPlainObject(schema)) {
    if (typeof schema.$ref !== 'string') return schema as never;

    const { $ref, ...rest } = schema;
    const resolved = dereferenceShallow(resolveRefSync($ref, full), full);

    if (typeof resolved !== 'object') throw new Error(`invalid schema referenced via "${$ref}"`);
    return { ...resolved, ...rest } as never;
  }

  return schema as never;
}
