import type { DereferenceMap, Document } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { dereference, load, upgrade } from '@scalar/openapi-parser';
import { fetchUrls } from '@scalar/openapi-parser/plugins/fetch-urls';
import { readFiles } from '@scalar/openapi-parser/plugins/read-files';

export type DocumentInput = string | OpenAPIV3_1.Document | OpenAPIV3.Document;

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
  input: DocumentInput,
  disableCache = false,
): Promise<ProcessedDocument> {
  const cached =
    !disableCache && typeof input === 'string' ? cache.get(input) : null;

  if (cached) return cached;

  const dereferenceMap: DereferenceMap = new Map();
  const loaded = await load(input, {
    plugins: [readFiles(), fetchUrls()],
  });

  if (loaded.errors && loaded.errors.length > 0) {
    throw new Error(
      loaded.errors.map((err) => `${err.code}: ${err.message}`).join('\n'),
    );
  }

  // upgrade
  loaded.specification = upgrade(loaded.specification).specification;
  const { schema: dereferenced } = await dereference(loaded.filesystem, {
    onDereference({ ref, schema }) {
      dereferenceMap.set(schema, ref);
    },
  });

  const processed: ProcessedDocument = {
    document: dereferenced as NoReference<Document>,
    dereferenceMap,
    downloaded: loaded.specification as Document,
  };

  if (!disableCache && typeof input === 'string') {
    cache.set(input, processed);
  }

  return processed;
}
