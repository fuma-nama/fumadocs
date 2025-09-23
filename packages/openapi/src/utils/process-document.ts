import type { Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { dereference, upgrade } from '@scalar/openapi-parser';
import { bundle } from '@scalar/json-magic/bundle';
import { fetchUrls, readFiles } from '@scalar/json-magic/bundle/plugins/node';

export type ProcessedDocument = {
  /**
   * dereferenced document
   */
  dereferenced: NoReference<Document>;

  /**
   * Get raw object from dereference object
   */
  getRawRef: (obj: object) => string | undefined;

  bundled: Document;
};

const cache = new Map<string, ProcessedDocument>();

export async function processDocumentCached(
  input: string | OpenAPIV3_1.Document | OpenAPIV3.Document,
): Promise<ProcessedDocument> {
  if (typeof input !== 'string') return processDocument(input);

  const cached = cache.get(input);
  if (cached) return cached;
  const processed = await processDocument(input);

  cache.set(input, processed);
  return processed;
}

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(
  input: string | OpenAPIV3_1.Document | OpenAPIV3.Document,
): Promise<ProcessedDocument> {
  const document = await bundle(input as string, {
    plugins: [fetchUrls(), readFiles()],
    treeShake: true,
    urlMap: true,
    hooks: {
      onResolveError(node) {
        throw new Error(`Failed to resolve ${node.$ref}`);
      },
    },
  })
    .then((v) => upgrade(v).specification)
    .catch((e) => {
      throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
        cause: e,
      });
    });

  /**
   * Dereferenced value and its original `$ref` value
   */
  const dereferenceMap = new WeakMap<object, string>();

  return {
    dereferenced: (
      await dereference(document, {
        throwOnError: true,
        onDereference({ schema, ref }) {
          dereferenceMap.set(schema, ref);
        },
      })
    ).schema as NoReference<Document>,
    getRawRef(obj) {
      return dereferenceMap.get(obj);
    },
    bundled: document as Document,
  };
}
