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
      files: ['codeblock', 'heading', 'markdown', 'method-label', 'schema'].map((name) => ({
        type: 'components',
        path: `ui/components/${name}.tsx`,
        target: `<dir>/openapi/components/${name}.tsx`,
      })),
    },
    {
      name: 'page',
      title: 'OpenAPI Page',
      description: 'The full UI of OpenAPI pages',
      files: [
        {
          type: 'components',
          path: '../registry/page.tsx',
          target: '<dir>/openapi/page.tsx',
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
        target: `<dir>/openapi/operation/${name}.tsx`,
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
          target: '<dir>/openapi/playground/index.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/result-display.tsx',
          target: '<dir>/openapi/playground/result-display.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/server-select.tsx',
          target: '<dir>/openapi/playground/server-select.tsx',
        },
        {
          type: 'components',
          path: 'playground/components/oauth-dialog.tsx',
          target: '<dir>/openapi/playground/oauth-dialog.tsx',
        },
        {
          type: 'components',
          path: 'playground/status-info.tsx',
          target: '<dir>/openapi/playground/status-info.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    'fumadocs-openapi': null,
    '@fumadocs/json-schema': null,
    '@fumari/stf': null,
    react: null,
    // dev dependency of `fumadocs-openapi` (inlined on build), but needed by vendored files
    'fast-content-type-parse': '^3.0.0',
  },
};
