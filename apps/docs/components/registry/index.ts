import * as radixUi from '../../../../packages/radix-ui/registry';
import * as baseUi from '../../../../packages/base-ui/registry';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { CompileOptions, Registry } from 'fuma-cli/compiler';

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../');

export const compileOptions: Partial<CompileOptions> = {
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // source object is external
    if (filePath.startsWith('lib/source/')) return false;
  },
  onParseReference(ref) {
    if (ref.type === 'unknown' && ref.specifier === 'hast') {
      return {
        type: 'dependency',
        dep: '@types/hast',
        specifier: 'hast',
      };
    }

    if (ref.type === 'file') {
      let file = path.relative(baseDir, ref.file);

      if (file === 'lib/cn.ts') {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, 'utils/cn.ts'),
        };
      }

      file = path.relative(radixUi.registry.dir, ref.file);
      if (file.startsWith('contexts/') || file.startsWith('utils/use-')) {
        return {
          dep: 'fumadocs-ui',
          type: 'dependency',
          specifier: `fumadocs-ui/${removeExtname(file)}`,
        };
      }

      file = path.relative(baseUi.registry.dir, ref.file);
      if (file.startsWith('contexts/') || file.startsWith('utils/use-')) {
        return {
          dep: '@fumadocs/base-ui',
          type: 'dependency',
          specifier: `@fumadocs/base-ui/${removeExtname(file)}`,
        };
      }
    }

    // map dep imports to actual components
    if (ref.type === 'dependency' && ref.dep === 'fumadocs-ui') {
      const match = /fumadocs-ui\/components\/ui\/(.*)/.exec(ref.specifier);

      if (match) {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, `components/ui/${match[1]}.tsx`),
        };
      }
    }

    return ref;
  },
};

export const registry: Registry = {
  dir: baseDir,
  name: 'fumadocs',
  packageJson: './package.json',
  tsconfigPath: './tsconfig.json',
  subRegistries: [radixUi.registry, baseUi.registry],

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
          type: 'route-handler',
          route: 'api/chat',
          path: 'lib/openrouter/route.ts',
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
          type: 'route-handler',
          route: 'api/chat',
          path: 'lib/inkeep/route.ts',
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
  },
};

function removeExtname(file: string) {
  return file.slice(0, -path.extname(file).length);
}
