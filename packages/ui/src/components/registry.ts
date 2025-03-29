import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';

const contextsMap = {
  '../contexts/sidebar.tsx': 'fumadocs-ui/contexts/sidebar',
  '../contexts/search.tsx': 'fumadocs-ui/contexts/search',
  '../contexts/tree.tsx': 'fumadocs-ui/contexts/tree',
  '../contexts/i18n.tsx': 'fumadocs-ui/contexts/i18n',
  '../contexts/layout.tsx': 'fumadocs-ui/contexts/layout',
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
      description: 'the UI of Sidebar Tabs',
      files: ['layout/root-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layout/language-toggle',
      description: 'Language Select',
      files: ['layout/language-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/docs',
      description: 'Replace Docs Layout',
      files: ['../layouts/docs.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/notebook',
      description: 'Replace Notebook Layout',
      files: ['../layouts/notebook.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/home',
      description: 'Replace Home Layout',
      files: ['../layouts/home.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/page',
      description: 'Replace Page Layout',
      files: ['components:../page.tsx'],
      mapImportPath: contextsMap,
    },
    { name: 'accordion', files: ['accordion.tsx'] },
    {
      name: 'github-info',
      files: ['github-info.tsx'],
      description: 'A card to display GitHub repo info',
    },
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
