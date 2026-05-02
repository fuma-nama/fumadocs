import type { Registry } from 'fuma-cli/compiler';

export const registry: Registry = {
  dir: import.meta.dirname,
  name: 'fumadocs/sanity',
  components: [
    {
      name: 'base',
      files: [
        {
          type: 'lib',
          path: 'base.ts',
          target: '<dir>/sanity/base.ts',
        },
        {
          type: 'components',
          path: 'base.component.tsx',
          target: '<dir>/sanity/base.tsx',
        },
      ],
    },
    {
      name: 'card',
      files: [
        {
          type: 'lib',
          path: 'card.ts',
          target: '<dir>/sanity/card.ts',
        },
        {
          type: 'components',
          path: 'card.component.tsx',
          target: '<dir>/sanity/card.tsx',
        },
      ],
    },
    {
      name: 'callout',
      files: [
        {
          type: 'lib',
          path: 'callout.ts',
          target: '<dir>/sanity/callout.ts',
        },
        {
          type: 'components',
          path: 'callout.component.tsx',
          target: '<dir>/sanity/callout.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
    sanity: null,
  },
};
