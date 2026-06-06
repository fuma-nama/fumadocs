import type { AsyncAPIObject } from '@/types/asyncapi-3';
import { bundle } from '@apidevtools/json-schema-ref-parser';
import { dereferenceAsyncApiDocument, type DereferencedAsyncApiDocument } from './dereference';

export type ProcessedAsyncApiDocument = DereferencedAsyncApiDocument;

function assertAsyncApiV3(document: AsyncAPIObject): void {
  if (!document.asyncapi.startsWith('3.')) {
    throw new Error(`[AsyncAPI] Expected AsyncAPI 3.x, got ${document.asyncapi}`);
  }
}

/**
 * Process & resolve an AsyncAPI 3 document to a Fumadocs-compatible format.
 */
export async function processAsyncApiDocument(
  input: string | AsyncAPIObject,
): Promise<ProcessedAsyncApiDocument> {
  let bundled: AsyncAPIObject;
  try {
    bundled = await bundle<AsyncAPIObject>(input);
  } catch (e) {
    throw new Error(`[AsyncAPI] Failed to resolve input: ${input}`, { cause: e });
  }

  assertAsyncApiV3(bundled);

  try {
    return dereferenceAsyncApiDocument(bundled);
  } catch (e) {
    throw new Error(`[AsyncAPI] Failed to resolve input: ${input}`, { cause: e });
  }
}
