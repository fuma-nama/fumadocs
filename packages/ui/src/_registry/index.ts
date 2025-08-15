import { fileURLToPath } from 'node:url';
import type { Registry } from '@fumadocs/cli/build';
import * as path from 'node:path';

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');
const mapToPackage = {
  'contexts/sidebar.tsx': 'fumadocs-ui/contexts/sidebar',
  'contexts/search.tsx': 'fumadocs-ui/contexts/search',
  'contexts/tree.tsx': 'fumadocs-ui/contexts/tree',
  'contexts/i18n.tsx': 'fumadocs-ui/contexts/i18n',
  'contexts/layout.tsx': 'fumadocs-ui/contexts/layout',
  'provider/index.tsx': 'fumadocs-ui/provider',
  'utils/get-sidebar-tabs.tsx': 'fumadocs-ui/utils/get-sidebar-tabs',
  'utils/use-copy-button.ts': 'fumadocs-ui/utils/use-copy-button',
};

// TODO: in shadcn cli, the order of files matters when writing import paths on consumer's codebase
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

    if (filePath in mapToPackage) {
      return {
        type: 'dependency',
        dep: 'fumadocs-ui',
        specifier: mapToPackage[filePath as keyof typeof mapToPackage],
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
          target: 'components/layout/docs.tsx',
        },
        {
          type: 'block',
          path: '_registry/layout/page-min.tsx',
          target: 'components/layout/page.tsx',
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
          path: 'layouts/docs/shared.tsx',
          target: 'components/layout/docs/shared.tsx',
        },
        {
          type: 'components',
          path: 'layouts/links.tsx',
          target: 'components/layout/links.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared.tsx',
          target: 'components/layout/shared.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/search-toggle.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/theme-toggle.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/sidebar.tsx',
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
      ],
      unlisted: true,
    },
    {
      name: 'layouts/notebook',
      files: [
        {
          type: 'block',
          path: 'layouts/notebook/index.tsx',
          target: 'components/layout/docs/index.tsx',
        },
        {
          type: 'block',
          path: 'layouts/notebook/client.tsx',
          target: 'components/layout/docs/client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/page',
      files: [
        {
          type: 'components',
          path: 'layouts/docs/page.tsx',
          target: 'components/layout/docs/page.tsx',
        },
        {
          type: 'block',
          path: 'layouts/docs/page-client.tsx',
          target: 'components/layout/docs/page-client.tsx',
        },
        {
          type: 'components',
          path: 'page.tsx',
          target: 'components/layout/page.tsx',
        },
        {
          type: 'ui',
          path: 'components/layout/toc.tsx',
        },
        {
          type: 'ui',
          path: 'components/layout/toc-clerk.tsx',
        },
        {
          type: 'ui',
          path: 'components/layout/toc-thumb.tsx',
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
          path: 'layouts/home/navbar.tsx',
          target: 'components/layout/home/navbar.tsx',
        },
        {
          type: 'components',
          path: 'layouts/home/menu.tsx',
          target: 'components/layout/home/menu.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'root-toggle',
      description: 'the UI of Sidebar Tabs',
      files: [
        {
          type: 'components',
          path: 'components/layout/root-toggle.tsx',
        },
      ],
    },
    {
      name: 'language-toggle',
      description: 'Language Select',
      files: [
        {
          type: 'components',
          path: 'components/layout/language-toggle.tsx',
        },
      ],
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
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
    'lucide-react': null,
    react: null,
  },
};
