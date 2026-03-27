import type { Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import { bundle } from '@scalar/json-magic/bundle';
import { upgrade } from '@scalar/openapi-upgrader';
import { fetchUrls, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import { dereferenceSync } from './schema/dereference';

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
