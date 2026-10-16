import type { AsyncAPIObject } from '@/types';
import { bundle } from '@fumadocs/json-schema/bundle';

/**
 * Process input document to a Fumadocs AsyncAPI compatible format.
 */
export async function loadDocument(input: string | AsyncAPIObject): Promise<{
  bundled: AsyncAPIObject;
}> {
  const bundled = await bundle<AsyncAPIObject>(input).catch((e: unknown) => {
    throw new Error(`[AsyncAPI] Failed to resolve input: ${input}`, { cause: e });
  });

  const source = typeof input === 'string' ? ` (${input})` : '';
  if (!bundled.asyncapi) {
    throw new Error(`[AsyncAPI] Missing required \`asyncapi\` field${source}.`);
  }
  if (!String(bundled.asyncapi).startsWith('3.')) {
    throw new Error(
      `[AsyncAPI] AsyncAPI ${bundled.asyncapi} is not supported${source}, convert it to AsyncAPI 3 with \`npx @asyncapi/cli convert\`.`,
    );
  }

  return { bundled };
}
