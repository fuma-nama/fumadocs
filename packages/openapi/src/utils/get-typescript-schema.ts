import type { ProcessedDocument } from '@/utils/process-document';

export async function getTypescriptSchema(
  processed: ProcessedDocument,
): Promise<string | undefined> {
  try {
    const { compile } = await import('@fumari/json-schema-to-typescript');

    const cloned = structuredClone(processed.bundled);
    return await compile(cloned, 'Response', {
      $refOptions: false,
      bannerComment: '',
      additionalProperties: false,
      enableConstEnums: false,
    });
  } catch (e) {
    console.warn('Failed to generate typescript schema:', e);
  }
}
