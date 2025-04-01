import { fileURLToPath } from 'node:url';
import { type Registry } from '../../src/build';
import * as path from 'node:path';

export const registry: Registry = {
  dir: path.dirname(fileURLToPath(import.meta.url)),
  rootDir: '.',
  namespaces: {
    './components': 'components',
    './utils': 'lib',
    './hooks': 'hooks',
  },
  components: [
    {
      name: 'button',
      unlisted: true,
      files: ['components/button.tsx'],
    },
    {
      name: 'popover',
      description: 'Popover component',
      files: ['components/popover.tsx'],
    },
  ],
};
