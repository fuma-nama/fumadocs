import type { Document } from '@/types';
import { upgrade } from '@scalar/openapi-upgrader';
import { dereferenceDocument, type DereferencedDocument } from './dereference';
import { bundle } from '@apidevtools/json-schema-ref-parser';

export type ProcessedDocument = DereferencedDocument;

/**
 * process & reference input document to a Fumadocs OpenAPI compatible format
 */
export async function processDocument(input: string | Document): Promise<ProcessedDocument> {
  try {
    let bundled: Document = await bundle(input);
    bundled = upgrade(bundled, '3.2') as Document;
    return dereferenceDocument(bundled);
  } catch (e) {
    throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
      cause: e,
    });
  }
}
