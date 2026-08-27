import type { Document } from '@/types';
import { upgrade } from '@scalar/openapi-upgrader';
import { bundle } from '@fumadocs/api-docs/schema/bundle';

/**
 * Process input document to a Fumadocs OpenAPI compatible format
 */
export async function loadDocument(input: string | Document): Promise<{
  bundled: Document;
}> {
  try {
    // upgrade each document before bundling
    const bundled = await bundle<Document>(input, {
      transform: (document) =>
        typeof document === 'object' && document !== null
          ? upgrade(document as Record<string, unknown>, '3.2')
          : document,
    });
    return { bundled };
  } catch (e) {
    throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
      cause: e,
    });
  }
}
