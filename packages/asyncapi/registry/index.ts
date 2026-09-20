import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'asyncapi',
  dir,
  components: {
    page: {
      title: 'AsyncAPI Page',
      description: 'The full UI of AsyncAPI pages',
      entry: 'registry/page.tsx',
    },
    operation: {
      title: 'Operation UI',
      description: 'The UI of operations in AsyncAPI pages',
      entry: 'ui/operation/index.tsx',
    },
  },
  files: {
    'registry/page.tsx': { type: 'components', target: '<dir>/asyncapi/page.tsx' },
    'ui/{components,operation,bindings}/**': { type: 'components', target: '<dir>/asyncapi/*' },
    // only available as the `AsyncAPI` namespace of package
    '{types.ts,types/asyncapi-3.ts}': { type: 'lib', target: '<dir>/asyncapi/*' },
    'utils/cn.ts': { alias: '../../radix-ui/src/utils/cn' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/asyncapi': null,
    '@fumadocs/json-schema': null,
    '@fumari/stf': null,
    react: null,
  },
};
