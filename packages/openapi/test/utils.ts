import type { RenderContext } from '@/types';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { loadDocument } from '@/utils/document/load';

export async function renderContextFrom(input: string): Promise<RenderContext> {
  const { bundled } = await loadDocument(input);
  const schema = dereferenceBundledDocument(bundled);

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
