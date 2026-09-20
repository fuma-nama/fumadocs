import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { createUIRegistry } from '../../shared/registry.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry = createUIRegistry({
  name: 'fumadocs/radix-ui',
  dir,
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
  },
});
