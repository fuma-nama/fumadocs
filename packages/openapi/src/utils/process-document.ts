import type { Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import { bundle } from '@scalar/json-magic/bundle';
import { upgrade } from '@scalar/openapi-upgrader';
import { fetchUrls, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import dereference from 'dereference-json-schema';

export interface ProcessedDocument {
  /**
   * dereferenced document
   */
  dereferenced: NoReference<Document>;

  /**
   * Get raw $ref from dereferenced object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: Document;
}

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(input: string | Document): Promise<ProcessedDocument> {
  const bundled: Document = await bundle(input, {
    plugins: [fetchUrls(), readFiles()],
    treeShake: true,
    hooks: {
      onResolveError(node) {
        throw new Error(`Failed to resolve ${node.$ref}`);
      },
    },
  })
    .then((v) => upgrade(v as never, '3.2') as Document)
    .catch((e) => {
      throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
        cause: e,
      });
    });

  /**
   * Dereferenced value and its original `$ref` value
   */
  const dereferenceMap = new Map<object, string>();

  return {
    dereferenced: dereferenceSync(bundled as JSONSchema, (schema, ref) => {
      dereferenceMap.set(schema as object, ref);
    }) as NoReference<Document>,
    getRawRef(obj) {
      return dereferenceMap.get(obj);
    },
    bundled,
  };
}

/**
 * Resolves all $ref pointers in a schema and returns a new schema without any $ref pointers.
 */
function dereferenceSync(
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
        const resolved = resolve(dereference.resolveRefSync(cloned as never, ref) as JSONSchema);
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
