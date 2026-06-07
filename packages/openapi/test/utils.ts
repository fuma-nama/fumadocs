import { RenderContext } from '@/types';
import { processDocument } from '@/utils/document/process';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';

export async function renderContextFrom(input: string): Promise<RenderContext> {
  const schema = await processDocument(input);

  return {
    mediaAdapters: {},
    codeUsages: registerDefault(createCodeUsageGeneratorRegistry()),
    generateTypeScriptDefinitions() {
      return '';
    },
    SchemaUI() {
      return null;
    },
    shiki: defaultShikiFactory,
    shikiOptions: { theme: 'github-light' },
    _default_processMarkdown(md) {
      return md;
    },
    schema,
  };
}
