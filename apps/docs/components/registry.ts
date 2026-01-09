import { type Registry } from '@fumadocs/cli/build';
import * as ui from '../../../packages/ui/src/_registry';
import * as radixUi from '../../../packages/radix-ui/src/_registry';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { resolveFromRemote } from '@fumadocs/cli/build';

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');

export const registry: Registry = {
  dir: baseDir,
  name: 'fumadocs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // source object is external
    if (filePath.startsWith('lib/source.')) return false;
  },
  onResolve(ref) {
    if (ref.type === 'file') {
      const filePath = path.relative(baseDir, ref.file);

      if (filePath === 'lib/cn.ts') {
        return resolveFromRemote(ui.registry, 'cn', (file) => file.path === 'cn.ts')!;
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
      name: 'ai/search',
      title: 'AI Search (Next.js Only)',
      description: 'Ask AI dialog for your docs, you need to configure Inkeep first',
      files: [
        {
          type: 'components',
          path: 'components/ai/search.tsx',
        },
        {
          type: 'components',
          path: 'components/ai/markdown.tsx',
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
      name: 'ai/page-actions',
      title: 'AI Page Actions',
      description: 'Common page actions for AI',
      files: [
        {
          type: 'components',
          path: 'components/ai/page-actions.tsx',
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
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Bold.ttf',
        },
        {
          type: 'lib',
          path: 'lib/og/JetBrainsMono-Regular.ttf',
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
