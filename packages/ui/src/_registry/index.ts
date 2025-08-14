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

export const registry: Registry = {
  name: 'fumadocs',
  homepage: 'http://localhost:3000',
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

    console.warn(`you forgot to include ${file}!`);
  },
  components: [
    {
      name: 'layouts/docs-min',
      description: 'Replace Docs Layout (Minimal)',
      files: [
        {
          type: 'components',
          path: '_registry/layout/docs-min.tsx',
          target: 'layouts/docs.tsx',
        },
        {
          type: 'components',
          path: '_registry/layout/page-min.tsx',
          target: 'layouts/page.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/shared',
      unlisted: true,
      files: [
        {
          type: 'components',
          path: 'layouts/links.tsx',
        },
        {
          type: 'components',
          path: 'layouts/shared.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/shared.tsx',
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
          type: 'components',
          path: 'layouts/docs.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs-client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/notebook',
      files: [
        {
          type: 'components',
          path: 'layouts/notebook.tsx',
          target: 'layouts/docs.tsx',
        },
        {
          type: 'components',
          path: 'layouts/notebook-client.tsx',
          target: 'layouts/docs-client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/page',
      files: [
        {
          type: 'components',
          path: 'page.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/toc.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/toc-clerk.tsx',
        },
        {
          type: 'components',
          path: 'components/layout/toc-thumb.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/page.tsx',
        },
        {
          type: 'components',
          path: 'layouts/docs/page-client.tsx',
        },
      ],
      unlisted: true,
    },
    {
      name: 'layouts/home',
      files: [
        {
          type: 'components',
          path: 'layouts/home.tsx',
        },
        {
          type: 'components',
          path: 'layouts/home/navbar.tsx',
        },
        {
          type: 'components',
          path: 'layouts/home/menu.tsx',
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
          target: 'heading.tsx',
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
          type: 'components',
          path: 'components/ui/button.tsx',
        },
      ],
    },
  ],
  dependencies: {
    'fumadocs-core': null,
    'fumadocs-ui': null,
  },
};
