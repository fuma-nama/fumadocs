import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

/** the UI of API pages, shared by the integrations */
const shared: Record<string, Registry['dependencies']> = {
  accordion: { '@fumadocs/api-docs': null },
  badge: undefined,
  collapsible: undefined,
  dialog: undefined,
  label: undefined,
  'playground/inputs': { '@fumadocs/api-docs': null, '@fumari/stf': null },
  popover: undefined,
  'select-tab': { '@fumadocs/api-docs': null },
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
      name: 'schema',
      title: 'Schema UI',
      description: 'The JSON Schema UI of API integrations',
      dependencies: {
        '@fumadocs/api-docs': null,
      },
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
    react: null,
  },
};
