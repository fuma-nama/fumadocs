import { RenderContext } from '@/types';
import { processDocument } from '@/utils/document/process';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import * as ClientBoundary from '@/ui/client/boundary.lazy';
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
    shiki: defaultShikiFactory,
    shikiOptions: { theme: 'github-light' },
    renderCodeBlock({ code }) {
      return code;
    },
    clientBoundary: ClientBoundary,
    renderMarkdown(text) {
      return text;
    },
    schema,
  };
}
