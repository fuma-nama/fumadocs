import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * the UI of API pages, shared by the integrations.
 */
export const registry: Registry = {
  name: 'api-docs',
  dir,
  components: {
    schema: {
      title: 'Schema UI',
      description: 'The JSON Schema UI of API integrations',
      entry: 'components/schema/index.tsx',
    },
  },
  files: {
    'components/{dialog,input,label,select,spinner}.tsx': { type: 'ui' },
    'components/schema/*': { type: 'components', target: '<dir>/api/schema/*' },
    'components/**': { type: 'components', target: '<dir>/api/ui/*' },
    'auto-anchor/*': { type: 'components', target: '<dir>/api/ui/auto-anchor/*' },
    'utils/{is-plain-object,use-query}.ts': { type: 'components', target: '<dir>/api/lib/*' },
    'utils/cn.ts': { alias: '../../radix-ui/src/utils/cn' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/json-schema': null,
    '@fumari/stf': null,
    react: null,
  },
};
