import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { AsyncAPIObject } from '@/types';

export interface GenerateTypeScriptDefinitionsContext {
  /** the name of the root type, like `PlanetCreatedPayload` */
  name: string;
  /** include properties marked `readOnly`, readers receive them */
  readOnly: boolean;
  /** include properties marked `writeOnly`, readers send them */
  writeOnly: boolean;
  /** the bundled document */
  document: AsyncAPIObject;
}

export function generateTypeScriptDefinitions(
  schema: JsonSchema,
  { name, readOnly, writeOnly, document }: GenerateTypeScriptDefinitionsContext,
): string | undefined {
  if (typeof schema !== 'object') return;

  try {
    // `generate` resolves `$ref`s against the schema root, the document is in it for in-document refs
    return generate({ ...(document as object), ...getRaw(schema) }, { name, readOnly, writeOnly });
  } catch (e) {
    console.warn('Failed to generate TypeScript definitions:', e);
  }
}
