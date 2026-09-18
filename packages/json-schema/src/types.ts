import type { JSONSchema } from 'json-schema-typed/draft-2020-12';

type ReferenceObject = { $ref: string };

/**
 * A JSON Schema (draft 2020-12), `true`/`false` included.
 *
 * Intersect it with your own keywords when you need them, e.g.
 * `Exclude<JsonSchema, boolean> & { 'x-my-keyword'?: boolean }`.
 */
export type JsonSchema = JSONSchema;

/** Resolve away the Reference Objects of `T`, deeply. */
export type Dereferenced<T> = T extends (infer I)[]
  ? Dereferenced<I>[]
  : T extends ReferenceObject
    ? Exclude<T, ReferenceObject>
    : T extends object
      ? {
          [K in keyof T]: Dereferenced<T[K]>;
        }
      : T;

/** Resolve away the Reference Object of `T` itself. */
export type DereferencedShallow<T> = T extends ReferenceObject ? Exclude<T, ReferenceObject> : T;
