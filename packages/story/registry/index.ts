import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'story',
  dir,
  components: [
    {
      name: 'controls',
      title: 'Story Controls',
      description: 'The UI of stories: the preview, variant select and argument controls',
      files: [
        {
          type: 'components',
          path: 'client/with-control.tsx',
          target: '<dir>/story/index.tsx',
        },
        {
          type: 'components',
          path: 'client/arg-form.tsx',
          target: '<dir>/story/arg-form.tsx',
        },
        {
          type: 'components',
          path: 'utils/date.ts',
          target: '<dir>/story/date.ts',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/story': null,
    '@fumari/stf': null,
    react: null,
    // dev dependency of `@fumadocs/story` (inlined on build), but needed by vendored files
    'react-error-boundary': '^6.1.5',
  },
};
