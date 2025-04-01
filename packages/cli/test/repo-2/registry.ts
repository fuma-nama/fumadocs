import { fileURLToPath } from 'node:url';
import { type Registry } from '../../src/build';
import * as ui from '../repo/registry';

export const registry: Registry = {
  path: fileURLToPath(import.meta.url),
  on: {
    ui: {
      type: 'local',
      registry: ui.registry,
    },
  },
  rootDir: '.',
  namespaces: {
    './components': 'components',
    './utils': 'lib',
    './hooks': 'hooks',
  },
  components: [
    {
      name: 'select',
      files: ['components/select.ts'],
      mapImportPath: {
        '../repo/components/button.tsx': {
          type: 'component',
          registry: 'ui',
          name: 'button',
          file: 'components/button.tsx',
        },
      },
    },
  ],
};
