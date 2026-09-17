import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'fumadocs/openapi',
  dir,
  components: [
    {
      name: 'ui/components',
      unlisted: true,
      files: ['codeblock', 'heading', 'markdown', 'method-label'].map((name) => ({
        type: 'components',
        path: `ui/components/${name}.tsx`,
        target: `<dir>/api/components/${name}.tsx`,
      })),
    },
    {
      name: 'page',
      title: 'OpenAPI Page',
      description: 'The full UI of OpenAPI pages',
      files: [
        {
          type: 'components',
          path: 'ui/base.tsx',
          target: '<dir>/api/page.tsx',
        },
      ],
    },
    {
      name: 'operation',
      title: 'Operation UI',
      description: 'The UI of operations and webhooks in OpenAPI pages',
      files: ['index', 'request-tabs', 'response-tabs', 'usage-tabs'].map((name) => ({
        type: 'components',
        path: `ui/operation/${name}.tsx`,
        target: `<dir>/api/operation/${name}.tsx`,
      })),
    },
    {
      name: 'playground',
      title: 'API Playground',
      description: 'The interactive playground of OpenAPI integration',
      files: [
        {
          type: 'components',
          path: 'playground/client.tsx',
          target: '<dir>/api/playground/index.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/result-display.tsx',
          target: '<dir>/api/playground/result-display.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/server-select.tsx',
          target: '<dir>/api/playground/server-select.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/oauth-dialog.tsx',
          target: '<dir>/api/playground/oauth-dialog.tsx',
        },
        {
          type: 'components',
          path: 'playground/status-info.tsx',
          target: '<dir>/api/playground/status-info.tsx',
        },
        {
          type: 'components',
          path: 'utils/schema.ts',
          target: '<dir>/api/playground/schema.ts',
        },
        {
          type: 'components',
          path: 'playground/fetcher.ts',
          target: '<dir>/api/playground/fetcher.ts',
        },
        {
          type: 'components',
          path: 'requests/media/encode.ts',
          target: '<dir>/api/playground/encode.ts',
        },
        {
          type: 'components',
          path: 'requests/media/resolve-adapter.ts',
          target: '<dir>/api/playground/resolve-adapter.ts',
        },
        {
          type: 'components',
          path: 'requests/types.ts',
          target: '<dir>/api/playground/types.ts',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    'fumadocs-openapi': null,
    '@fumadocs/api-docs': null,
    '@fumari/stf': null,
    react: null,
    // dev dependency of `fumadocs-openapi` (inlined on build), but needed by vendored files
    'fast-content-type-parse': '^3.0.0',
  },
};
