import * as radixUi from '../../../../packages/radix-ui/registry/index.ts';
import * as baseUi from '../../../../packages/base-ui/registry/index.ts';
import * as sanity from '../../../../packages/sanity/registry/index.ts';
import * as openapi from '../../../../packages/openapi/registry/index.ts';
import * as asyncapi from '../../../../packages/asyncapi/registry/index.ts';
import * as graphql from '../../../../packages/graphql/registry/index.ts';
import * as story from '../../../../packages/story/registry/index.ts';
import * as apiDocs from '../../../../packages/api-docs/registry/index.ts';
import * as path from 'node:path';
import type { CompileOptions, Registry } from 'fuma-cli/compiler';

const baseDir = path.join(import.meta.dirname, '../../');

// internal modules of `fumadocs-openapi` mapped to their public exports
const openapiExports = new Map([
  ['headless/index.tsx', 'fumadocs-openapi/headless'],
  ['playground/auth.tsx', 'fumadocs-openapi/headless'],
  ['utils/storage-key.ts', 'fumadocs-openapi/headless'],
  ['ui/index.tsx', 'fumadocs-openapi/ui'],
  ['playground/client.tsx', 'fumadocs-openapi/playground/client'],
  ['requests/generators/index.ts', 'fumadocs-openapi/requests/generators'],
  // types are re-exported from the package root
  ['requests/media/adapter.ts', 'fumadocs-openapi'],
  ['types.ts', 'fumadocs-openapi'],
]);

// internal modules of `@fumadocs/asyncapi` mapped to their public exports
const asyncapiExports = new Map([
  ['headless/index.tsx', '@fumadocs/asyncapi/headless'],
  ['ui/index.tsx', '@fumadocs/asyncapi/ui'],
  ['ui/base.tsx', '@fumadocs/asyncapi/ui/base'],
  // types are re-exported from the package root
  ['types.ts', '@fumadocs/asyncapi'],
  ['utils/schema.ts', '@fumadocs/asyncapi'],
  ['utils/pages/builder.ts', '@fumadocs/asyncapi'],
  ['types/asyncapi-3.ts', '@fumadocs/asyncapi'],
  ['utils/get-example-messages.ts', '@fumadocs/asyncapi'],
]);

// internal modules of `@fumadocs/story` mapped to their public exports
const storyExports = new Map([
  ['headless/index.tsx', '@fumadocs/story/headless'],
  // type-only, so the entry's TypeScript compiler import is erased
  ['type-tree/types.ts', '@fumadocs/story/type-tree'],
]);

// internal modules of `@fumadocs/graphql` mapped to their public exports
const graphqlExports = new Map([
  ['headless/index.tsx', '@fumadocs/graphql/headless'],
  ['ui/index.tsx', '@fumadocs/graphql/ui'],
  ['ui/base.tsx', '@fumadocs/graphql/ui/base'],
  ['types.ts', '@fumadocs/graphql'],
  ['utils/schema.ts', '@fumadocs/graphql'],
  ['utils/pages.ts', '@fumadocs/graphql'],
  ['playground/fetcher.ts', '@fumadocs/graphql'],
  ['utils/example.ts', '@fumadocs/graphql/headless'],
  ['utils/snippets.ts', '@fumadocs/graphql/headless'],
  ['utils/build-schema.ts', '@fumadocs/graphql/headless'],
]);

// the UI of `@fumadocs/api-docs`, vendored so an installed API page owns all of its markup
const apiDocsUI = new Set([
  'components/accordion.tsx',
  'components/badge.tsx',
  'components/collapsible.tsx',
  'components/dialog.tsx',
  'components/input.tsx',
  'components/label.tsx',
  'components/playground/inputs.tsx',
  'components/popover.tsx',
  'components/schema/client.tsx',
  'components/schema/index.tsx',
  'components/select-tab.tsx',
  'components/select.tsx',
  'components/spinner.tsx',
]);

export const compileOptions: Partial<CompileOptions> = {
  onUnknownFile(absolutePath) {
    const filePath = path.relative(baseDir, absolutePath);

    // source object & MDX components are external
    if (filePath.startsWith('lib/source/') || filePath === 'components/mdx.tsx') return false;
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

      file = path.relative(openapi.registry.dir, ref.file);
      const specifier = openapiExports.get(file);
      if (specifier) {
        return {
          dep: 'fumadocs-openapi',
          type: 'dependency',
          specifier,
        };
      }
      if (file === 'utils/cn.ts') {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, 'utils/cn.ts'),
        };
      }

      file = path.relative(asyncapi.registry.dir, ref.file);
      const asyncapiSpecifier = asyncapiExports.get(file);
      if (asyncapiSpecifier) {
        return {
          dep: '@fumadocs/asyncapi',
          type: 'dependency',
          specifier: asyncapiSpecifier,
        };
      }
      if (file === 'utils/cn.ts') {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, 'utils/cn.ts'),
        };
      }

      file = path.relative(graphql.registry.dir, ref.file);
      const graphqlSpecifier = graphqlExports.get(file);
      if (graphqlSpecifier) {
        return {
          dep: '@fumadocs/graphql',
          type: 'dependency',
          specifier: graphqlSpecifier,
        };
      }
      if (file === 'utils/cn.ts') {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, 'utils/cn.ts'),
        };
      }

      file = path.relative(story.registry.dir, ref.file);
      // Story has its own copy of the shared primitives, install the shared one instead
      if (file === 'client/components/select.tsx' || file === 'client/components/input.tsx') {
        return {
          type: 'file',
          file: path.join(apiDocs.registry.dir, 'components', path.basename(file)),
        };
      }
      const storySpecifier = storyExports.get(file);
      if (storySpecifier) {
        return {
          dep: '@fumadocs/story',
          type: 'dependency',
          specifier: storySpecifier,
        };
      }
      if (file === 'utils/cn.ts') {
        return {
          type: 'file',
          file: path.join(radixUi.registry.dir, 'utils/cn.ts'),
        };
      }

      file = path.relative(apiDocs.registry.dir, ref.file);
      if (file === 'components/schema/headless.tsx') {
        return {
          dep: '@fumadocs/api-docs',
          type: 'dependency',
          specifier: '@fumadocs/api-docs/components/schema/headless',
        };
      }
      if (!file.startsWith('..') && !apiDocsUI.has(file)) {
        if (file === 'utils/cn.ts' || file === 'utils/merge-refs.ts') {
          return {
            type: 'file',
            file: path.join(radixUi.registry.dir, file),
          };
        }

        // other internal modules mirror the package's subpath exports
        return {
          dep: '@fumadocs/api-docs',
          type: 'dependency',
          specifier: `@fumadocs/api-docs/${toSubpath(file)}`,
        };
      }
    }

    if (ref.type === 'dependency' && ref.dep === '@fumadocs/api-docs') {
      const subpath = ref.specifier.slice('@fumadocs/api-docs/'.length);

      for (const file of [`${subpath}.tsx`, `${subpath}/index.tsx`]) {
        if (apiDocsUI.has(file)) {
          return {
            type: 'file',
            file: path.join(apiDocs.registry.dir, file),
          };
        }
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
  subRegistries: [
    radixUi.registry,
    baseUi.registry,
    sanity.registry,
    openapi.registry,
    asyncapi.registry,
    graphql.registry,
    story.registry,
    apiDocs.registry,
  ],

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
      name: 'ai/shared',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'components/ai-sdk/search.tsx',
          target: '<dir>/ai/search.tsx',
        },
      ],
    },
    {
      name: 'ai/openrouter',
      title: 'AI Chat (AI SDK)',
      description: 'Ask AI dialog for your docs, default using OpenRouter',
      files: [
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
      name: 'ai/llmgateway',
      title: 'AI Chat (LLMGateway)',
      description: 'Ask AI dialog for your docs, using LLMGateway',
      files: [
        {
          type: 'route-handler',
          route: 'api/chat',
          path: 'lib/llmgateway/route.ts',
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
      title: 'AI Chat (Inkeep AI)',
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
      description: 'Open graph image generation - mono style',
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

function toSubpath(file: string) {
  const out = removeExtname(file);
  return out.endsWith('/index') ? out.slice(0, -'/index'.length) : out;
}
