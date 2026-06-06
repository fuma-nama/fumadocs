import { RenderContext } from '@/types';
import { processDocument } from '@/utils/document/process';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import * as ClientBoundary from '@/ui/client/boundary';
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
    _schemaUIProps: {
      renderMarkdown(md) {
        return md;
      },
      resolver: (v) => ({ dereferenced: v }),
    },
    shiki: defaultShikiFactory,
    shikiOptions: { theme: 'github-light' },
    clientBoundary: ClientBoundary,
    _default_processMarkdown(md) {
      return md;
    },
    schema,
  };
}
