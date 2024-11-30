import type { DereferenceMap, Document } from '@/types';
import Parser from '@apidevtools/json-schema-ref-parser';
import type { NoReference } from '@/utils/schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { upgrade } from '@scalar/openapi-parser';

export type DocumentInput = string | OpenAPIV3_1.Document | OpenAPIV3.Document;

export type ProcessedDocument = {
  document: NoReference<Document>;
  dereferenceMap: DereferenceMap;
};

const cache = new Map<string, ProcessedDocument>();

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(
  document: DocumentInput,
  disableCache = false,
): Promise<ProcessedDocument> {
  const cached =
    !disableCache && typeof document === 'string' ? cache.get(document) : null;

  if (cached) return cached;

  let bundled = await Parser.bundle<OpenAPIV3_1.Document | OpenAPIV3.Document>(
    document,
    { mutateInputSchema: false },
  );
  bundled = upgrade(bundled).specification;

  const dereferenceMap: DereferenceMap = new Map();
  const dereferenced = await Parser.dereference<NoReference<Document>>(
    bundled,
    {
      mutateInputSchema: true,
      dereference: {
        onDereference($ref: string, schema: unknown) {
          dereferenceMap.set(schema, $ref);
        },
      },
    },
  );

  const processed: ProcessedDocument = {
    document: dereferenced,
    dereferenceMap,
  };

  if (!disableCache && typeof document === 'string') {
    cache.set(document, processed);
  }

  return processed;
}
