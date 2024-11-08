import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';

const contextsMap = {
  '../contexts/sidebar.tsx': 'fumadocs-ui/provider',
  '../contexts/search.tsx': 'fumadocs-ui/provider',
  '../contexts/tree.tsx': 'fumadocs-ui/provider',
  '../contexts/i18n.tsx': 'fumadocs-ui/provider',
};

export const registry: Registry = {
  path: fileURLToPath(import.meta.url),
  rootDir: '../../',
  namespaces: {
    '': 'components',
    '../utils': 'lib',
    '../layouts': 'components',
  },
  components: [
    {
      name: 'layout/root-toggle',
      files: ['layout/root-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layout/language-toggle',
      files: ['layout/language-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/docs',
      files: ['../layouts/docs.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/home',
      files: ['../layouts/home.tsx'],
      mapImportPath: contextsMap,
    },
    { name: 'accordion', files: ['accordion.tsx'] },
    { name: 'banner', files: ['banner.tsx'] },
    { name: 'callout', files: ['callout.tsx'] },
    { name: 'card', files: ['card.tsx'] },
    { name: 'codeblock', files: ['codeblock.tsx'] },
    { name: 'files', files: ['files.tsx'] },
    { name: 'heading', files: ['heading.tsx'] },
    {
      name: 'image-zoom',
      description: 'Zoomable Image',
      files: ['image-zoom.tsx', 'image-zoom.css'],
    },
    { name: 'inline-toc', files: ['inline-toc.tsx'] },
    { name: 'steps', files: ['steps.tsx'] },
    { name: 'tabs', files: ['tabs.tsx'] },
    { name: 'type-table', files: ['type-table.tsx'] },
    {
      name: 'button',
      unlisted: true,
      files: ['ui/button.tsx'],
    },
  ],
  dependencies: {
    'fumadocs-core': {
      type: 'runtime',
    },
    'fumadocs-ui': {
      type: 'runtime',
    },
    next: {
      type: 'runtime',
    },
  },
};
