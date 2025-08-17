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

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(
  input: string | OpenAPIV3_1.Document | OpenAPIV3.Document,
  disableCache = false,
): Promise<ProcessedDocument> {
  const cached =
    !disableCache && typeof input === 'string' ? cache.get(input) : null;

  if (cached) return cached;

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

  const processed: ProcessedDocument = {
    document: dereferenced as NoReference<Document>,
    dereferenceMap,
    downloaded: document as Document,
  };

  if (!disableCache && typeof input === 'string') {
    cache.set(input, processed);
  }

  return processed;
}
