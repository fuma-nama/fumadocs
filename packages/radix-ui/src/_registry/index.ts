import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';
import * as path from 'node:path';
import { resolveForwardedAPIs } from '../../../ui/src/_registry';

// in shadcn cli, the order of files matters when writing import paths on consumer's codebase
export const registry: Registry = {
  name: 'fumadocs/radix-ui',
  dir: path.join(path.dirname(fileURLToPath(import.meta.url)), '../'),
  tsconfigPath: '../tsconfig.json',
  packageJson: '../package.json',
  onResolve(ref) {
    return resolveForwardedAPIs(ref, 'fumadocs-ui', registry) ?? ref;
  },
  env: {
    ui: 'fumadocs-ui',
  },
  components: [
    {
      name: 'layouts/shared',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'layouts/shared/index.tsx',
          target: '<dir>/layout/shared.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/language-toggle.tsx',
          target: '<dir>/layout/language-toggle.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/search-toggle.tsx',
          target: '<dir>/layout/search-toggle.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/theme-toggle.tsx',
          target: '<dir>/layout/theme-toggle.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/base.tsx',
          target: '<dir>/layout/sidebar/base.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/page-tree.tsx',
          target: '<dir>/layout/sidebar/page-tree.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/link-item.tsx',
          target: '<dir>/layout/sidebar/link-item.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/tabs/index.tsx',
          target: '<dir>/layout/sidebar/tabs/index.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/tabs/dropdown.tsx',
          target: '<dir>/layout/sidebar/tabs/dropdown.tsx',
        },
      ],
    },
    {
      name: 'layouts/docs',
      files: [
        {
          type: 'components',
          path: 'layouts/docs/index.tsx',
          target: '<dir>/layout/docs/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/client.tsx',
          target: '<dir>/layout/docs/client.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/sidebar.tsx',
          target: '<dir>/layout/docs/sidebar.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/page/index.tsx',
          target: '<dir>/layout/docs/page/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/page/client.tsx',
          target: '<dir>/layout/docs/page/client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/notebook',
      files: [
        {
          type: 'components',
          path: 'layouts/notebook/index.tsx',
          target: '<dir>/layout/notebook/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/notebook/client.tsx',
          target: '<dir>/layout/notebook/client.tsx',
        },
        {
          type: 'components',
          path: 'layouts/notebook/sidebar.tsx',
          target: '<dir>/layout/notebook/sidebar.tsx',
        },
        {
          type: 'components',
          path: 'layouts/notebook/page/index.tsx',
          target: '<dir>/layout/notebook/page/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/notebook/page/client.tsx',
          target: '<dir>/layout/notebook/page/client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/home',
      files: [
        {
          type: 'components',
          path: 'layouts/home/index.tsx',
          target: '<dir>/layout/home/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/home/client.tsx',
          target: '<dir>/layout/home/client.tsx',
        },
        {
          type: 'ui',
          path: 'components/ui/navigation-menu.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'accordion',
      files: [
        {
          type: 'components',
          path: 'components/accordion.tsx',
        },
        {
          type: 'ui',
          path: 'components/ui/accordion.tsx',
        },
      ],
    },
    {
      name: 'github-info',
      files: [
        {
          type: 'components',
          path: 'components/github-info.tsx',
        },
      ],
      description: 'A card to display GitHub repo info',
    },
    {
      name: 'banner',
      files: [
        {
          type: 'components',
          path: 'components/banner.tsx',
        },
      ],
    },
    {
      name: 'callout',
      files: [
        {
          type: 'components',
          path: 'components/callout.tsx',
        },
      ],
    },
    {
      name: 'card',
      files: [
        {
          type: 'components',
          path: 'components/card.tsx',
        },
      ],
    },
    {
      name: 'codeblock',
      files: [
        {
          type: 'components',
          path: 'components/codeblock.tsx',
        },
      ],
    },
    {
      name: 'files',
      files: [
        {
          type: 'components',
          path: 'components/files.tsx',
        },
      ],
    },
    {
      name: 'heading',
      files: [
        {
          type: 'components',
          path: 'components/heading.tsx',
        },
      ],
    },
    {
      name: 'image-zoom',
      description: 'Zoomable Image',
      files: [
        {
          type: 'components',
          path: 'components/image-zoom.tsx',
        },
        {
          type: 'css',
          path: 'components/image-zoom.css',
        },
      ],
    },
    {
      name: 'inline-toc',
      files: [
        {
          type: 'components',
          path: 'components/inline-toc.tsx',
        },
      ],
    },
    {
      name: 'steps',
      files: [
        {
          type: 'components',
          path: 'components/steps.tsx',
        },
      ],
    },
    {
      name: 'tabs',
      files: [
        {
          type: 'components',
          path: 'components/tabs.tsx',
        },
        {
          type: 'ui',
          path: 'components/ui/tabs.tsx',
        },
      ],
    },
    {
      name: 'type-table',
      files: [
        {
          type: 'components',
          path: 'components/type-table.tsx',
        },
      ],
    },
    {
      name: 'button',
      unlisted: true,
      files: [
        {
          type: 'ui',
          path: 'components/ui/button.tsx',
        },
      ],
    },
    {
      name: 'popover',
      unlisted: true,
      files: [
        {
          type: 'ui',
          path: 'components/ui/popover.tsx',
        },
      ],
    },
    {
      name: 'scroll-area',
      unlisted: true,
      files: [
        {
          type: 'ui',
          path: 'components/ui/scroll-area.tsx',
        },
      ],
    },
    {
      name: 'collapsible',
      unlisted: true,
      files: [
        {
          type: 'ui',
          path: 'components/ui/collapsible.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    react: null,
  },
};
