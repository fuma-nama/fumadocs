import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'story',
  dir,
  components: {
    controls: {
      title: 'Story Controls',
      description: 'The UI of stories: the preview, variant select and argument controls',
      entry: 'client/with-control.tsx',
    },
  },
  files: {
    'client/with-control.tsx': { type: 'components', target: '<dir>/story/index.tsx' },
    // Story has its own copy of the shared primitives
    'client/components/{select,input}.tsx': { alias: '../../shared-api/src/components/*' },
    'client/arg-form.tsx': { type: 'components', target: '<dir>/story/arg-form.tsx' },
    'utils/date.ts': { type: 'components', target: '<dir>/story/date.ts' },
    'utils/cn.ts': { alias: '../../radix-ui/src/utils/cn' },
  },
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
