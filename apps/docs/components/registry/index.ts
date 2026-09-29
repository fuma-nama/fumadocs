import * as radixUi from '../../../../packages/radix-ui/registry/index.ts';
import * as baseUi from '../../../../packages/base-ui/registry/index.ts';
import * as sanity from '../../../../packages/sanity/registry/index.ts';
import * as openapi from '../../../../packages/openapi/registry/index.ts';
import * as asyncapi from '../../../../packages/asyncapi/registry/index.ts';
import * as graphql from '../../../../packages/graphql/registry/index.ts';
import * as story from '../../../../packages/story/registry/index.ts';
import * as apiDocs from '../../../../packages/shared-api/registry/index.ts';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const baseDir = path.join(import.meta.dirname, '../../');

export const registry: Registry = {
  dir: baseDir,
  name: 'fumadocs',
  // source object & MDX components are external
  external: ['lib/source', 'components/mdx.tsx'],
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
  components: {
    'layouts/docs-min': {
      description: 'Replace Docs Layout (Minimal)',
      unlisted: true,
      entry: ['components/registry/layout/docs-min.tsx', 'components/registry/layout/page-min.tsx'],
    },
    'graph-view': {
      description: 'A graph to display relationships of all pages',
      entry: ['components/graph-view.tsx', 'components/registry/build-graph.ts'],
    },
    feedback: {
      title: 'Feedback',
      description: 'Component to send user feedbacks about the docs',
      entry: 'components/feedback/client.tsx',
    },
    'ai/openrouter': {
      title: 'AI Chat (AI SDK)',
      description: 'Ask AI dialog for your docs, default using OpenRouter',
      entry: 'lib/openrouter/route.ts',
    },
    'ai/llmgateway': {
      title: 'AI Chat (LLMGateway)',
      description: 'Ask AI dialog for your docs, using LLMGateway',
      entry: 'lib/llmgateway/route.ts',
    },
    'ai/inkeep': {
      title: 'AI Chat (Inkeep AI)',
      description: 'Ask AI dialog for your docs, requires Inkeep AI',
      entry: ['components/inkeep/search.tsx', 'lib/inkeep/route.ts'],
    },
    'og/mono': {
      description: 'Open graph image generation - mono style',
      entry: 'lib/og/*',
    },
  },
  files: {
    'components/registry/layout/docs-min.tsx': { type: 'layout', target: '<dir>/docs/index.tsx' },
    'components/registry/layout/page-min.tsx': { type: 'layout', target: '<dir>/docs/page.tsx' },
    'components/registry/build-graph.ts': { type: 'lib' },
    'components/{ai-sdk,inkeep}/search.tsx': { type: 'components', target: '<dir>/ai/search.tsx' },
    'components/feedback/*': { type: 'components', target: '<dir>/feedback/*' },
    'components/{graph-view,markdown}.tsx': { type: 'components' },
    'lib/{openrouter,llmgateway,inkeep}/route.ts': { type: 'route-handler', route: 'api/chat' },
    'lib/inkeep/*': { type: 'lib', target: '<dir>/ai/*' },
    'lib/og/*': { type: 'lib', target: '<dir>/og/*' },
    'lib/cn.ts': { alias: '../../packages/radix-ui/src/utils/cn' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
  },
};
