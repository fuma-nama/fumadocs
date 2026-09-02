import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'fumadocs/openapi',
  dir,
  components: [
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
          path: 'ui/components/method-label.tsx',
          target: '<dir>/api/playground/method-label.tsx',
        },
        {
          type: 'components',
          path: 'ui/components/codeblock.tsx',
          target: '<dir>/api/playground/codeblock.tsx',
        },
        {
          type: 'components',
          path: 'utils/use-query.ts',
          target: '<dir>/api/playground/use-query.ts',
        },
        {
          type: 'components',
          path: 'utils/storage-key.ts',
          target: '<dir>/api/playground/storage-key.ts',
        },
        {
          type: 'components',
          path: 'utils/schema.ts',
          target: '<dir>/api/playground/schema.ts',
        },
        {
          type: 'components',
          path: 'playground/auth.tsx',
          target: '<dir>/api/playground/auth.tsx',
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
