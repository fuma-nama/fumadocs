import { type Registry } from '@fumadocs/cli/build';
import * as ui from '../../../packages/ui/src/_registry';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

export const registry: Registry = {
  dir: path.join(path.dirname(fileURLToPath(import.meta.url)), '../'),
  homepage: 'http://localhost:3000',
  name: 'fumadocs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  onResolve(ref) {
    if (
      ref.type === 'dependency' &&
      ref.specifier === 'fumadocs-ui/components/ui/button'
    ) {
      const comp = ui.registry.components.find(
        (comp) => comp.name === 'button',
      );
      if (!comp) throw new Error('no button component found');

      return {
        type: 'sub-component',
        resolved: {
          type: 'remote',
          registryName: 'fumadocs',
          component: comp,
          file: comp.files.find(
            (file) => path.basename(file.path) === 'button.tsx',
          )!,
        },
      };
    }

    return ref;
  },
  components: [
    {
      name: 'ai-search',
      title: 'AI Search (Next.js Only)',
      description:
        'Ask AI dialog for your docs, you need to configure Inkeep first',
      files: [
        {
          type: 'components',
          path: 'components/ai/index.tsx',
        },
        {
          type: 'components',
          path: 'components/ai/search.tsx',
        },
        {
          type: 'components',
          path: 'components/ai/markdown.tsx',
        },
        {
          type: 'lib',
          path: 'lib/cn.ts',
        },
        {
          type: 'route',
          path: 'app/api/chat/route.ts',
          target: 'app/api/chat/route.ts',
        },
        {
          type: 'lib',
          path: 'lib/chat/inkeep-qa-schema.ts',
        },
      ],
    },
    {
      name: 'ai-page-actions',
      description: 'Common page actions for AI',
      files: [
        {
          type: 'components',
          path: 'components/ai/page-actions.tsx',
        },
        {
          type: 'lib',
          path: 'lib/cn.ts',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    next: null,
    react: null,
  },
};
