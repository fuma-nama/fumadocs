import { RenderContext } from '@/types';
import { processDocument } from '@/utils/document/process';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import * as ClientBoundary from '@/ui/client/boundary';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import { createMarkdownProcessor } from '@/ui/create-client';

export async function renderContextFrom(input: string): Promise<RenderContext> {
  const schema = await processDocument(input);
  const processor = createMarkdownProcessor();

  return {
    mediaAdapters: {},
    codeUsages: registerDefault(createCodeUsageGeneratorRegistry()),
    generateTypeScriptDefinitions() {
      return '';
    },
    shiki: defaultShikiFactory,
    shikiOptions: { theme: 'github-light' },
    clientBoundary: ClientBoundary,
    _getMarkdownProcessor() {
      return processor;
    },
    schema,
  };
}
