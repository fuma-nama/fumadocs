import type { Document } from '@/types';
import { upgrade } from '@scalar/openapi-upgrader';
import { bundle } from '@apidevtools/json-schema-ref-parser';
import { dereferenceOpenApiDocument, type DereferencedDocument } from './dereference';

export type ProcessedDocument = DereferencedDocument;

/**
 * Process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(input: string | Document): Promise<ProcessedDocument> {
  try {
    let bundled = await bundle<Document>(input);
    bundled = upgrade(bundled, '3.2') as Document;
    return dereferenceOpenApiDocument(bundled);
  } catch (e) {
    throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
      cause: e,
    });
  }
}
