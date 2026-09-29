import type { Registry } from 'fuma-cli/compiler';

const components: NonNullable<Registry['components']> = {
  all: '{base,accordion,files,steps,tabs}.{ts,component.tsx}',
};

for (const name of ['base', 'accordion', 'files', 'steps', 'tabs']) {
  components[name] = [`${name}.ts`, `${name}.component.tsx`];
}

export const registry: Registry = {
  dir: import.meta.dirname,
  name: 'sanity',
  components,
  files: {
    '*.component.tsx': { type: 'components', target: '<dir>/sanity/*' },
    '*.ts': { type: 'lib', target: '<dir>/sanity/*' },
  },
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
    sanity: null,
  },
};
