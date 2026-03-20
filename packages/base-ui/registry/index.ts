import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';
import * as path from 'node:path';
import { commonComponents, findSlotComponents, resolveExternal } from '../../shared/registry';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

// in shadcn cli, the order of files matters when writing import paths on consumer's codebase
export const registry: Registry = {
  name: 'fumadocs/base-ui',
  dir,
  tsconfigPath: '../tsconfig.json',
  packageJson: '../package.json',
  env: {
    ui: '@fumadocs/base-ui',
  },
  onResolve(ref) {
    return resolveExternal(ref, 'fumadocs-ui', dir) ?? ref;
  },
  components: [
    ...commonComponents,
    ...(await findSlotComponents(dir)),
    {
      name: 'layouts/sidebar',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'components/sidebar/base.tsx',
          target: '<dir>/docs-sidebar/base.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/page-tree.tsx',
          target: '<dir>/docs-sidebar/page-tree.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/link-item.tsx',
          target: '<dir>/docs-sidebar/link-item.tsx',
        },
      ],
    },
    {
      name: 'layouts/shared',
      unlisted: true,
      files: [
        {
          type: 'layout',
          path: 'layouts/shared/index.tsx',
          target: '<dir>/shared/index.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/shared/client.tsx',
          target: '<dir>/shared/client.tsx',
        },
      ],
    },
    {
      name: 'layouts/docs',
      files: [
        {
          type: 'layout',
          path: 'layouts/docs/index.tsx',
          target: '<dir>/docs/index.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/docs/client.tsx',
          target: '<dir>/docs/client.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/docs/page/index.tsx',
          target: '<dir>/docs/page/index.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/flux',
      files: [
        {
          type: 'layout',
          path: 'layouts/flux/index.tsx',
          target: '<dir>/flux/index.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/flux/page/index.tsx',
          target: '<dir>/flux/page/index.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/notebook',
      files: [
        {
          type: 'layout',
          path: 'layouts/notebook/index.tsx',
          target: '<dir>/notebook/index.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/notebook/client.tsx',
          target: '<dir>/notebook/client.tsx',
        },
        {
          type: 'layout',
          path: 'layouts/notebook/page/index.tsx',
          target: '<dir>/notebook/page/index.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/home',
      files: [
        {
          type: 'layout',
          path: 'layouts/home/index.tsx',
          target: '<dir>/home/index.tsx',
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
    {
      name: 'ai/page-actions',
      title: 'Page Actions',
      description: 'Common page actions',
      files: [
        {
          type: 'components',
          path: 'layouts/shared/page-actions.tsx',
          target: '<dir>/ai/page-actions.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    '@fumadocs/base-ui': null,
    'fumadocs-ui': 'npm:@fumadocs/base-ui',
    react: null,
  },
};
