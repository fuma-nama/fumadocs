import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

export const registry: Registry = {
  name: 'graphql',
  dir,
  components: [
    {
      name: 'ui/components',
      unlisted: true,
      files: [
        'badge',
        'codeblock',
        'heading',
        'markdown',
        'schema',
        'type-annotation',
        'enum-values',
      ].map((name) => ({
        type: 'components',
        path: `ui/components/${name}.tsx`,
        target: `<dir>/graphql/components/${name}.tsx`,
      })),
    },
    {
      name: 'schema-ui',
      title: 'GraphQL Schema UI',
      description: 'The UI of types, arguments and fields in GraphQL pages',
      files: [
        {
          type: 'components',
          path: 'ui/schema-ui.tsx',
          target: '<dir>/graphql/schema-ui.tsx',
        },
      ],
    },
    {
      name: 'page',
      title: 'GraphQL Page',
      description: 'The full UI of GraphQL pages',
      files: [
        {
          type: 'components',
          path: '../registry/page.tsx',
          target: '<dir>/graphql/page.tsx',
        },
      ],
    },
    {
      name: 'operation',
      title: 'Operation UI',
      description: 'The UI of operations in GraphQL pages',
      files: [
        {
          type: 'components',
          path: 'ui/operation/index.tsx',
          target: '<dir>/graphql/operation/index.tsx',
        },
      ],
    },
    {
      name: 'type-docs',
      title: 'Type UI',
      description: 'The UI of named types in GraphQL pages',
      files: [
        {
          type: 'components',
          path: 'ui/type-docs/index.tsx',
          target: '<dir>/graphql/type-docs/index.tsx',
        },
      ],
    },
    {
      name: 'playground',
      title: 'GraphQL Playground',
      description: 'The interactive playground of GraphQL pages',
      files: [
        {
          type: 'components',
          path: 'ui/playground/index.tsx',
          target: '<dir>/graphql/playground/index.tsx',
        },
        {
          type: 'components',
          path: 'ui/components/code-editor.tsx',
          target: '<dir>/graphql/playground/code-editor.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/graphql': null,
    '@fumadocs/json-schema': null,
    '@fumari/stf': null,
    react: null,
  },
};
