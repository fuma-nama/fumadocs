import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

/** the UI of API pages, shared by the integrations */
const shared: Record<string, Registry['dependencies']> = {
  accordion: undefined,
  badge: undefined,
  collapsible: undefined,
  dialog: undefined,
  label: undefined,
  'playground/inputs': { '@fumari/stf': null },
  popover: undefined,
  'select-tab': undefined,
  spinner: undefined,
};

export const registry: Registry = {
  name: 'fumadocs/api-docs',
  dir,
  components: [
    {
      // following the Shadcn UI API, so the project's own `components/ui` files are reused
      name: 'ui/primitives',
      unlisted: true,
      files: [
        { type: 'ui', path: 'components/select.tsx' },
        { type: 'ui', path: 'components/input.tsx' },
      ],
    },
    ...Object.entries(shared).map(([name, dependencies]) => ({
      name: `ui/${name}`,
      unlisted: true,
      dependencies,
      files: [
        {
          type: 'components' as const,
          path: `components/${name}.tsx`,
          target: `<dir>/api/ui/${name}.tsx`,
        },
      ],
    })),
    {
      // the anchor IDs of deep-linkable sections, shared by every installed API component
      name: 'ui/auto-anchor',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'auto-anchor/index.ts',
          target: '<dir>/api/ui/auto-anchor/index.ts',
        },
        {
          type: 'components',
          path: 'auto-anchor/client.tsx',
          target: '<dir>/api/ui/auto-anchor/client.tsx',
        },
      ],
    },
    {
      name: 'lib',
      unlisted: true,
      files: ['id-to-title', 'is-plain-object', 'url', 'use-query'].map((name) => ({
        type: 'components' as const,
        path: `utils/${name}.ts`,
        target: `<dir>/api/lib/${name}.ts`,
      })),
    },
    {
      name: 'ui/playground/schema',
      unlisted: true,
      dependencies: { '@fumari/stf': null },
      files: [
        {
          type: 'components',
          path: 'components/playground/schema.tsx',
          target: '<dir>/api/ui/playground/schema.tsx',
        },
      ],
    },
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
    '@fumadocs/json-schema': null,
    react: null,
  },
};
