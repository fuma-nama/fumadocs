import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'graphql',
  dir,
  components: {
    page: {
      title: 'GraphQL Page',
      description: 'The full UI of GraphQL pages',
      entry: 'registry/page.tsx',
    },
    operation: {
      title: 'Operation UI',
      description: 'The UI of operations in GraphQL pages',
      entry: 'ui/operation/index.tsx',
    },
    'schema-ui': {
      title: 'GraphQL Schema UI',
      description: 'The UI of types, arguments and fields in GraphQL pages',
      entry: 'ui/schema-ui.tsx',
    },
    'type-docs': {
      title: 'Type UI',
      description: 'The UI of named types in GraphQL pages',
      entry: 'ui/type-docs/index.tsx',
    },
    playground: {
      title: 'GraphQL Playground',
      description: 'The interactive playground of GraphQL pages',
      entry: 'ui/playground/index.tsx',
    },
  },
  files: {
    'registry/page.tsx': { type: 'components', target: '<dir>/graphql/page.tsx' },
    'ui/{schema-ui.tsx,{components,operation,type-docs,playground}/**}': {
      type: 'components',
      target: '<dir>/graphql/*',
    },
    'utils/cn.ts': { alias: '../../radix-ui/src/utils/cn' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/graphql': null,
    '@fumadocs/json-schema': null,
    '@fumari/stf': null,
    react: null,
  },
};
