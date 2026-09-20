import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'openapi',
  dir,
  components: {
    page: {
      title: 'OpenAPI Page',
      description: 'The full UI of OpenAPI pages',
      entry: 'registry/page.tsx',
    },
    operation: {
      title: 'Operation UI',
      description: 'The UI of operations and webhooks in OpenAPI pages',
      entry: 'ui/operation/index.tsx',
    },
    playground: {
      title: 'API Playground',
      description: 'The interactive playground of OpenAPI integration',
      entry: 'ui/playground/client.tsx',
    },
  },
  files: {
    'registry/page.tsx': { type: 'components', target: '<dir>/openapi/page.tsx' },
    'ui/playground/client.tsx': {
      type: 'components',
      target: '<dir>/openapi/playground/index.tsx',
    },
    'ui/{components,operation,playground}/**': { type: 'components', target: '<dir>/openapi/*' },
    'utils/cn.ts': { alias: '../../radix-ui/src/utils/cn' },
  },
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
