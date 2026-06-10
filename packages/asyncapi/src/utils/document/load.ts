import type { AsyncAPIObject } from '@/types';
import { bundle } from '@fumadocs/api-docs/schema/bundle';

/**
 * Process input document to a Fumadocs AsyncAPI compatible format.
 */
export async function loadDocument(input: string | AsyncAPIObject): Promise<{
  bundled: AsyncAPIObject;
}> {
  try {
    const bundled = await bundle<AsyncAPIObject>(input);
    if (!bundled.asyncapi) {
      throw new Error('Missing required `asyncapi` field.');
    }

    return { bundled };
  } catch (e) {
    throw new Error(`[AsyncAPI] Failed to resolve input: ${input}`, {
      cause: e,
    });
  }
}
