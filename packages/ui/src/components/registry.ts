import type { Registry } from 'fumadocs/build';

export const registry: Registry = {
  path: __filename,
  rootDir: '../../',
  namespaces: {
    '': 'components',
    '../utils': 'lib',
  },
  components: [
    {
      name: 'layout/root-toggle',
      files: ['layout/root-toggle.tsx'],
      mapImportPath: {
        '../contexts/sidebar.tsx': 'fumadocs-ui/provider',
      },
    },
    {
      name: 'layout/language-toggle',
      files: ['layout/language-toggle.tsx'],
      mapImportPath: {
        '../contexts/i18n.tsx': 'fumadocs-ui/i18n',
      },
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
