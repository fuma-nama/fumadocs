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
    name: 'accordion',
    files: [
      {
        type: 'lib',
        path: 'accordion.ts',
        target: '<dir>/sanity/accordion.ts',
      },
      {
        type: 'components',
        path: 'accordion.component.tsx',
        target: '<dir>/sanity/accordion.tsx',
      },
    ],
  },
  {
    name: 'files',
    files: [
      {
        type: 'lib',
        path: 'files.ts',
        target: '<dir>/sanity/files.ts',
      },
      {
        type: 'components',
        path: 'files.component.tsx',
        target: '<dir>/sanity/files.tsx',
      },
    ],
  },
  {
    name: 'steps',
    files: [
      {
        type: 'lib',
        path: 'steps.ts',
        target: '<dir>/sanity/steps.ts',
      },
      {
        type: 'components',
        path: 'steps.component.tsx',
        target: '<dir>/sanity/steps.tsx',
      },
    ],
  },
  {
    name: 'tabs',
    files: [
      {
        type: 'lib',
        path: 'tabs.ts',
        target: '<dir>/sanity/tabs.ts',
      },
      {
        type: 'components',
        path: 'tabs.component.tsx',
        target: '<dir>/sanity/tabs.tsx',
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
