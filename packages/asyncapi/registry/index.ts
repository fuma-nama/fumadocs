import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Registry } from 'fuma-cli/compiler';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

const protocols = [
  'amqp',
  'amqp1',
  'anypointmq',
  'googlepubsub',
  'http',
  'ibmmq',
  'jms',
  'kafka',
  'mercure',
  'mqtt',
  'mqtt5',
  'nats',
  'pulsar',
  'redis',
  'sns',
  'solace',
  'sqs',
  'stomp',
  'unknown',
  'ws',
];

export const registry: Registry = {
  name: 'fumadocs/asyncapi',
  dir,
  components: [
    {
      name: 'ui/components',
      unlisted: true,
      files: ['badge', 'codeblock', 'heading', 'markdown'].map((name) => ({
        type: 'components',
        path: `ui/components/${name}.tsx`,
        target: `<dir>/api/asyncapi/components/${name}.tsx`,
      })),
    },
    {
      name: 'ui/server-select',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'ui/components/server-select.tsx',
          target: '<dir>/api/asyncapi/components/server-select.tsx',
        },
        {
          type: 'components',
          path: 'utils/server-url.ts',
          target: '<dir>/api/asyncapi/components/server-url.ts',
        },
      ],
    },
    {
      name: 'ui/bindings',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'ui/bindings/accordion-bindings.tsx',
          target: '<dir>/api/asyncapi/bindings/accordion-bindings.tsx',
        },
        {
          type: 'components',
          path: 'ui/bindings/shared.tsx',
          target: '<dir>/api/asyncapi/bindings/shared.tsx',
        },
        {
          type: 'components',
          path: 'ui/bindings/protocols/index.ts',
          target: '<dir>/api/asyncapi/bindings/protocols/index.ts',
        },
        ...protocols.map((name) => ({
          type: 'components' as const,
          path: `ui/bindings/protocols/${name}.tsx`,
          target: `<dir>/api/asyncapi/bindings/protocols/${name}.tsx`,
        })),
      ],
    },
    {
      name: 'page',
      title: 'AsyncAPI Page',
      description: 'The full UI of AsyncAPI pages',
      files: [
        {
          type: 'components',
          path: 'ui/base.tsx',
          target: '<dir>/api/asyncapi/page.tsx',
        },
      ],
    },
    {
      name: 'operation',
      title: 'Operation UI',
      description: 'The UI of operations in AsyncAPI pages',
      files: ['index', 'message-examples'].map((name) => ({
        type: 'components',
        path: `ui/operation/${name}.tsx`,
        target: `<dir>/api/asyncapi/operation/${name}.tsx`,
      })),
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    '@fumadocs/asyncapi': null,
    '@fumadocs/api-docs': null,
    '@fumari/stf': null,
    react: null,
  },
};
