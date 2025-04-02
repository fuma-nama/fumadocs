import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';
import * as path from 'node:path';

const contextsMap = {
  'contexts/sidebar.tsx': 'fumadocs-ui/contexts/sidebar',
  'contexts/search.tsx': 'fumadocs-ui/contexts/search',
  'contexts/tree.tsx': 'fumadocs-ui/contexts/tree',
  'contexts/i18n.tsx': 'fumadocs-ui/contexts/i18n',
  'contexts/layout.tsx': 'fumadocs-ui/contexts/layout',
};

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');

export const registry: Registry = {
  dir: srcDir,
  rootDir: '../',
  namespaces: {
    components: 'components',
    utils: 'lib',
    '': 'components',
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          in: '_registry/layout/docs-min.tsx',
          out: 'components:layouts/docs.tsx',
        },
        {
          in: '_registry/layout/page-min.tsx',
          out: 'components:layouts/page.tsx',
        },
      ],
      mapImportPath: contextsMap,
      unlisted: true,
    },

    {
      name: 'layout/root-toggle',
      description: 'the UI of Sidebar Tabs',
      files: ['components/layout/root-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layout/language-toggle',
      description: 'Language Select',
      files: ['components/layout/language-toggle.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/docs',
      description: 'Replace Docs Layout (Full)',
      files: ['layouts/docs.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/notebook',
      description: 'Replace Notebook Layout',
      files: ['layouts/notebook.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/home',
      description: 'Replace Home Layout',
      files: ['layouts/home.tsx'],
      mapImportPath: contextsMap,
    },
    {
      name: 'layouts/page',
      description: 'Replace Page Layout',
      files: ['components:page.tsx'],
      mapImportPath: contextsMap,
    },
    { name: 'accordion', files: ['components/accordion.tsx'] },
    {
      name: 'github-info',
      files: ['components/github-info.tsx'],
      description: 'A card to display GitHub repo info',
    },
    { name: 'banner', files: ['components/banner.tsx'] },
    { name: 'callout', files: ['components/callout.tsx'] },
    { name: 'card', files: ['components/card.tsx'] },
    { name: 'codeblock', files: ['components/codeblock.tsx'] },
    { name: 'files', files: ['components/files.tsx'] },
    { name: 'heading', files: ['components/heading.tsx'] },
    {
      name: 'image-zoom',
      description: 'Zoomable Image',
      files: ['components/image-zoom.tsx', 'components/image-zoom.css'],
    },
    { name: 'inline-toc', files: ['components/inline-toc.tsx'] },
    { name: 'steps', files: ['components/steps.tsx'] },
    { name: 'tabs', files: ['components/tabs.tsx'] },
    { name: 'type-table', files: ['components/type-table.tsx'] },
    {
      name: 'button',
      unlisted: true,
      files: ['components/ui/button.tsx'],
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
