import { RenderContext } from '@/types';
import { processDocument } from '@/utils/process-document';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import * as ClientBoundary from '@/ui/client/boundary.lazy';

export async function renderContextFrom(input: string): Promise<RenderContext> {
  const schema = await processDocument(input);

  return {
    mediaAdapters: {},
    generateTypeScriptDefinitions() {
      return '';
    },
    shiki: defaultShikiFactory,
    shikiOptions: { theme: 'github-light' },
    renderCodeBlock(_lang, code) {
      return code;
    },
    renderHeading(_depth, text) {
      return text;
    },
    clientBoundary: ClientBoundary,
    renderMarkdown(text) {
      return text;
    },
    schema,
  };
}
