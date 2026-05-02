import type { Component, Registry } from 'fuma-cli/compiler';

const components: Component[] = [
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
];

export const registry: Registry = {
  dir: import.meta.dirname,
  name: 'fumadocs/sanity',
  components: [
    ...components,
    {
      name: 'all',
      subComponents: components.map((comp) => ({
        type: 'sub-registry',
        subRegistry: 'fumadocs/sanity',
        component: comp.name,
      })),
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
    sanity: null,
  },
};
