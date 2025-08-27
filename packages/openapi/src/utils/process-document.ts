import type { DereferenceMap, Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { bundle, dereference, upgrade } from '@scalar/openapi-parser';
import { fetchUrls, readFiles } from '@scalar/openapi-parser/plugins';

export type ProcessedDocument = {
  document: NoReference<Document>;
  dereferenceMap: DereferenceMap;
  downloaded: Document;
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
  const dereferenceMap: DereferenceMap = new Map();
  let document = await bundle(input as string, {
    plugins: [fetchUrls(), readFiles()],
    treeShake: false,
  });

  // upgrade
  document = upgrade(document).specification;
  const { schema: dereferenced } = await dereference(document, {
    onDereference({ ref, schema }) {
      dereferenceMap.set(schema, ref);
    },
  });

  return {
    document: dereferenced as NoReference<Document>,
    dereferenceMap,
    downloaded: document as Document,
  };
}
