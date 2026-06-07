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
    let bundled = await bundle<Document>(input);
    bundled = upgrade(bundled, '3.2') as Document;
    return { bundled };
  } catch (e) {
    throw new Error(`[OpenAPI] Failed to resolve input: ${input}`, {
      cause: e,
    });
  }
}
