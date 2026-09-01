import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'fumadocs/api-docs',
  dir,
  components: [
    {
      name: 'schema',
      title: 'Schema UI',
      description: 'The JSON Schema UI of API integrations',
      files: [
        {
          type: 'components',
          path: 'components/schema/index.tsx',
          target: '<dir>/api/schema/index.tsx',
        },
        {
          type: 'components',
          path: 'components/schema/client.tsx',
          target: '<dir>/api/schema/client.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/api-docs': null,
    react: null,
  },
};
