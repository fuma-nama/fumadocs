import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';
import * as path from 'node:path';

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');

// in shadcn cli, the order of files matters when writing import paths on consumer's codebase
export const registry: Registry = {
  name: 'fumadocs-ui',
  dir: srcDir,
  tsconfigPath: '../tsconfig.json',
  packageJson: '../package.json',
  onResolve(ref) {
    if (ref.type !== 'file') return ref;

    const filePath = path.relative(srcDir, ref.file);
    if (filePath === 'icons.tsx')
      return {
        type: 'dependency',
        dep: 'lucide-react',
        specifier: 'lucide-react',
      };

    if (
      (filePath.startsWith('utils/') || filePath.startsWith('contexts/')) &&
      filePath !== 'utils/cn.ts'
    ) {
      return {
        type: 'dependency',
        dep: 'fumadocs-ui',
        specifier: `fumadocs-ui/${filePath.slice(0, -path.extname(filePath).length)}`,
      };
    }

    return ref;
  },
  onUnknownFile(file) {
    const relativePath = path.relative(srcDir, file);
    if (relativePath.startsWith('utils/'))
      return {
        type: 'lib',
        path: relativePath,
      };
    if (relativePath.startsWith('components/ui/')) {
      return {
        type: 'components',
        path: relativePath,
      };
    }
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          type: 'block',
          path: '_registry/layout/docs-min.tsx',
          target: 'components/layout/docs/index.tsx',
        },
        {
          type: 'block',
          path: '_registry/layout/page-min.tsx',
          target: 'components/layout/docs/page.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'is-active',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'utils/is-active.ts',
        },
      ],
    },
    {
      name: 'cn',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'utils/cn.ts',
        },
      ],
    },
    {
      name: 'merge-refs',
      unlisted: true,
      files: [
        {
          type: 'lib',
          path: 'utils/merge-refs.ts',
        },
      ],
    },
    {
      name: 'layouts/shared',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'layouts/shared/index.tsx',
          target: 'components/layout/shared.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/language-toggle.tsx',
          target: 'components/layout/language-toggle.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/link-item.tsx',
          target: 'components/layout/link-item.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/search-toggle.tsx',
          target: 'components/layout/search-toggle.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared/theme-toggle.tsx',
          target: 'components/layout/theme-toggle.tsx',
        },
        {
          type: 'components',
          path: 'components/toc/clerk.tsx',
          target: 'components/toc/clerk.tsx',
        },
        {
          type: 'components',
          path: 'components/toc/default.tsx',
          target: 'components/toc/default.tsx',
        },
        {
          type: 'components',
          path: 'components/toc/index.tsx',
          target: 'components/toc/index.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/base.tsx',
          target: 'components/layout/sidebar/base.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/page-tree.tsx',
          target: 'components/layout/sidebar/page-tree.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/link-item.tsx',
          target: 'components/layout/sidebar/link-item.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/tabs/index.tsx',
          target: 'components/layout/sidebar/tabs/index.tsx',
        },
        {
          type: 'components',
          path: 'components/sidebar/tabs/dropdown.tsx',
          target: 'components/layout/sidebar/tabs/dropdown.tsx',
        },
      ],
    },
    {
      name: 'layouts/docs',
      files: [
        {
          type: 'block',
          path: 'layouts/docs/index.tsx',
          target: 'components/layout/docs/index.tsx',
        },
        {
          type: 'block',
          path: 'layouts/docs/client.tsx',
          target: 'components/layout/docs/client.tsx',
        },
        {
          type: 'block',
          path: 'layouts/docs/sidebar.tsx',
          target: 'components/layout/docs/sidebar.tsx',
        },
        {
          type: 'block',
          path: 'layouts/docs/page/index.tsx',
          target: 'components/layout/docs/page/index.tsx',
        },
        {
          type: 'block',
          path: 'layouts/docs/page/client.tsx',
          target: 'components/layout/docs/page/client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/notebook',
      files: [
        {
          type: 'block',
          path: 'layouts/notebook/index.tsx',
          target: 'components/layout/notebook/index.tsx',
        },
        {
          type: 'block',
          path: 'layouts/notebook/client.tsx',
          target: 'components/layout/notebook/client.tsx',
        },
        {
          type: 'block',
          path: 'layouts/notebook/sidebar.tsx',
          target: 'components/layout/notebook/sidebar.tsx',
        },
        {
          type: 'block',
          path: 'layouts/notebook/page/index.tsx',
          target: 'components/layout/notebook/page/index.tsx',
        },
        {
          type: 'block',
          path: 'layouts/notebook/page/client.tsx',
          target: 'components/layout/notebook/page/client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/home',
      files: [
        {
          type: 'block',
          path: 'layouts/home/index.tsx',
          target: 'components/layout/home/index.tsx',
        },
        {
          type: 'components',
          path: 'layouts/home/client.tsx',
          target: 'components/layout/home/client.tsx',
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
          type: 'components',
          path: 'components/tabs.unstyled.tsx',
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
    'lucide-react': null,
    react: null,
  },
};
