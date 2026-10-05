import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * The AI chat UI, installed along with the AI integrations instead of the package.
 */
export const registry: Registry = {
  name: 'ai-chat',
  dir,
  files: {
    'cn.ts': { alias: '../../radix-ui/src/utils/cn' },
    '**': { type: 'components', target: '<dir>/ai/chat/*' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
  },
};
