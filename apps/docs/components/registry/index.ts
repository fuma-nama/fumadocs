import { type Registry } from '@fumadocs/cli/build';
import * as radixUi from '../../../../packages/radix-ui/registry';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { resolveFromRemote } from '@fumadocs/cli/build';

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../');

export const registry: Registry = {
  dir: baseDir,
  name: 'fumadocs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // source object is external
    if (filePath.startsWith('lib/source/')) return false;
  },
  onResolve(ref) {
    if (ref.type === 'file') {
      const file = path.relative(baseDir, ref.file);

      if (file === 'lib/cn.ts') {
        return resolveFromRemote(radixUi.registry, 'cn', () => true)!;
      }
    }

    if (ref.type === 'dependency' && ref.dep === 'fumadocs-ui') {
      const match = /fumadocs-ui\/components\/ui\/(.*)/.exec(ref.specifier);
      if (match) {
        return resolveFromRemote(
          radixUi.registry,
          match[1],
          (file) => path.basename(file.path, path.extname(file.path)) === match[1],
        )!;
      }
    }

    return ref;
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          type: 'layout',
          path: 'components/registry/layout/docs-min.tsx',
          target: '<dir>/docs/index.tsx',
        },
        {
          type: 'layout',
          path: 'components/registry/layout/page-min.tsx',
          target: '<dir>/docs/page.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'graph-view',
      description: 'A graph to display relationships of all pages',
      files: [
        {
          type: 'components',
          path: 'components/graph-view.tsx',
        },
        {
          type: 'lib',
          path: 'components/registry/build-graph.ts',
          target: 'lib/build-graph.ts',
        },
      ],
    },
    {
      name: 'feedback',
      title: 'Feedback',
      description: 'Component to send user feedbacks about the docs',
      files: [
        {
          type: 'components',
          path: 'components/feedback/client.tsx',
          target: '<dir>/feedback/client.tsx',
        },
        {
          type: 'components',
          path: 'components/feedback/schema.ts',
          target: '<dir>/feedback/schema.ts',
        },
      ],
    },
    {
      name: 'ai/openrouter',
      title: 'AI Chat (Next.js + OpenRouter)',
      description: 'Ask AI dialog for your docs, requires OPENROUTER_API_KEY',
      files: [
        {
          type: 'components',
          path: 'components/openrouter/search.tsx',
          target: '<dir>/ai/search.tsx',
        },
        {
          type: 'route',
          path: 'lib/openrouter/server.ts',
          target: 'app/api/chat/route.ts',
        },
      ],
      dependencies: {
        flexsearch: '^0.8.212',
      },
    },
    {
      name: 'markdown',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'components/markdown.tsx',
        },
      ],
    },
    {
      name: 'ai/inkeep',
      title: 'AI Chat (Next.js + Inkeep AI)',
      description: 'Ask AI dialog for your docs, requires Inkeep AI',
      files: [
        {
          type: 'components',
          path: 'components/inkeep/search.tsx',
          target: '<dir>/ai/search.tsx',
        },
        {
          type: 'route',
          path: 'lib/inkeep/server.ts',
          target: 'app/api/chat/route.ts',
        },
        {
          type: 'lib',
          path: 'lib/inkeep/inkeep-qa-schema.ts',
          target: '<dir>/ai/inkeep-qa-schema.ts',
        },
      ],
    },
    {
      name: 'og/mono',
      description: 'Open graph image generation (mono-style)',
      files: [
        {
          type: 'lib',
          path: 'lib/og/mono.tsx',
          target: '<dir>/og/mono.tsx',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Bold.ttf',
          target: '<dir>/og/JetBrainsMono-Bold.ttf',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Regular.ttf',
          target: '<dir>/og/JetBrainsMono-Regular.ttf',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    'lucide-react': null,
    next: null,
    react: null,
  },
};
