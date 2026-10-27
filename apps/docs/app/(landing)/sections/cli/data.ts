/**
 * What `npx @fumadocs/cli` writes into a project made by `pnpm create fumadocs-app` (the Next.js
 * template, `examples/next`), as the installer plans it against the registry built from this repo:
 * `customize` picking Docs Layout > All, and `add banner files`. Both skip `lib/cn.ts`, the
 * template has the same file.
 */

export interface Entry {
  name: string;
  path: string;
  children?: Entry[];
  open?: boolean;
  /** written by the command */
  added?: boolean;
}

/** a line's change: the import's path the command points at your copy, or your edit */
export interface Change {
  line: number;
  from: string;
  to: string;
}

/** a file the editor shows: its lines around what the run changes, as written once it ran */
export interface Source {
  file: string;
  /** the row of your project its imports now resolve to: its cable plugs in there */
  target?: string;
  hunks: { line: number; lines: string[] }[];
  rewires?: Change[];
  /** the line you change in your copy */
  edit?: Change;
}

export interface Plan {
  id: 'customize' | 'add';
  /** after `npx @fumadocs/cli ` */
  args: string;
  label: string;
  /** what the registry hands over, for the status line */
  fetch: string;
  done: string;
  /** the folder it installs into: its files land first */
  target: string;
  /** the files it writes, in its order */
  files: string[];
  tree: Entry[];
  sources: Source[];
  /** what your edit changes */
  component: string;
}

function paths(block: string): string[] {
  return block.trim().split(/\s+/);
}

/** the template's files, the root ones left out */
const project = paths(`
  app/(home)/layout.tsx app/(home)/page.tsx app/api/search/route.ts app/docs/[[...slug]]/page.tsx
  app/docs/layout.tsx app/global.css app/layout.tsx app/llms-full.txt/route.ts
  app/llms.mdx/docs/[[...slug]]/route.ts app/llms.txt/route.ts app/og/docs/[...slug]/route.tsx
  components/mdx.tsx content/docs/index.mdx content/docs/test.mdx
  lib/cn.ts lib/layout.shared.tsx lib/shared.ts lib/source.ts
`);

/** the project with `files` added, folders first */
function tree(files: string[], open: string[]): Entry[] {
  const root: Entry = { name: '', path: '', children: [] };
  const added = new Set(files);
  for (const path of [...project, ...files]) {
    const parts = path.split('/');
    let entry = root;
    let at = '';
    for (let i = 0; i < parts.length; i++) {
      at = at ? `${at}/${parts[i]}` : parts[i];
      let next = entry.children!.find((child) => child.path === at);
      if (!next) {
        const folder = i < parts.length - 1;
        next = {
          name: parts[i],
          path: at,
          children: folder ? [] : undefined,
          open: folder && open.includes(at),
          added: added.has(path),
        };
        entry.children!.push(next);
      }
      entry = next;
    }
  }
  sort(root);
  return root.children!;
}

function sort(entry: Entry) {
  if (!entry.children) return;
  entry.children.sort(
    (a, b) => Number(!a.children) - Number(!b.children) || a.name.localeCompare(b.name),
  );
  for (const child of entry.children) sort(child);
}

const customizeFiles = paths(`
  layouts/docs/page/index.tsx components/ai/page-actions.tsx components/ui/button.tsx
  components/ui/popover.tsx layouts/docs/page/slots/footer.tsx lib/urls.ts
  layouts/docs/page/slots/breadcrumb.tsx layouts/docs/page/slots/container.tsx
  layouts/docs/page/slots/toc.tsx components/ui/collapsible.tsx components/toc/index.tsx
  lib/merge-refs.ts components/toc/block.tsx components/toc/default.tsx components/toc/clerk.tsx
  layouts/docs/index.tsx layouts/docs/client.tsx layouts/docs/slots/container.tsx
  layouts/docs/slots/header.tsx layouts/shared/client.tsx layouts/shared/slots/theme-switch.tsx
  layouts/shared/slots/search-trigger.tsx layouts/shared/slots/language-select.tsx
  layouts/docs/slots/sidebar.tsx components/docs-sidebar/tabs/dropdown.tsx
  components/docs-sidebar/base.tsx lib/hotkey.ts components/docs-sidebar/link-item.tsx
  components/docs-sidebar/page-tree.tsx
`);

// `add` installs one target after the other
const addFiles = paths(`
  components/banner.tsx components/ui/button.tsx components/files.tsx components/ui/collapsible.tsx
`);

export const plans: Plan[] = [
  {
    id: 'customize',
    args: 'customize',
    label: 'Customize layout',
    fetch: 'layouts/docs',
    done: 'layouts/docs installed',
    target: 'layouts',
    component: 'DocsTitle',
    files: customizeFiles,
    tree: tree(
      customizeFiles,
      paths('layouts layouts/docs layouts/docs/page layouts/docs/page/slots layouts/docs/slots'),
    ),
    sources: [
      {
        file: 'app/docs/layout.tsx',
        target: 'layouts/docs',
        rewires: [{ line: 2, from: 'fumadocs-ui/layouts/docs', to: '@/layouts/docs' }],
        hunks: [
          {
            line: 1,
            lines: [
              "import { source } from '@/lib/source';",
              "import { DocsLayout } from '@/layouts/docs';",
              "import { baseOptions } from '@/lib/layout.shared';",
              '',
              "export default function Layout({ children }: LayoutProps<'/docs'>) {",
              '  return (',
              '    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>',
              '      {children}',
              '    </DocsLayout>',
              '  );',
              '}',
            ],
          },
        ],
      },
      {
        file: 'app/docs/[[...slug]]/page.tsx',
        target: 'layouts/docs/page',
        rewires: [{ line: 9, from: 'fumadocs-ui/layouts/docs/page', to: '@/layouts/docs/page' }],
        hunks: [
          {
            line: 1,
            lines: [
              "import { source } from '@/lib/source';",
              'import {',
              '  DocsBody,',
              '  DocsDescription,',
              '  DocsPage,',
              '  DocsTitle,',
              '  MarkdownCopyButton,',
              '  ViewOptionsPopover,',
              "} from '@/layouts/docs/page';",
              "import { notFound } from 'next/navigation';",
            ],
          },
        ],
      },
      {
        file: 'layouts/docs/page/index.tsx',
        edit: { line: 199, from: '1.75', to: '2.5' },
        hunks: [
          {
            line: 197,
            lines: [
              "export function DocsTitle({ children, className, ...props }: ComponentProps<'h1'>) {",
              '  return (',
              "    <h1 {...props} className={cn('text-[1.75em] font-semibold', className)}>",
              '      {children}',
              '    </h1>',
              '  );',
              '}',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'add',
    args: 'add banner files',
    label: 'Add components',
    fetch: 'banner, files',
    done: 'banner, files installed',
    target: 'components',
    component: 'Banner',
    files: addFiles,
    tree: tree(addFiles, paths('components components/ui lib')),
    sources: [
      {
        file: 'components/banner.tsx',
        target: 'components/ui/button.tsx',
        rewires: [
          { line: 5, from: '@/utils/cn', to: '../lib/cn' },
          { line: 6, from: '@/components/ui/button', to: './ui/button' },
        ],
        edit: { line: 67, from: 'bg-fd-secondary', to: 'bg-fd-primary text-fd-primary-foreground' },
        hunks: [
          {
            line: 3,
            lines: [
              "import { type HTMLAttributes, useEffect, useState } from 'react';",
              "import { X } from 'lucide-react';",
              "import { cn } from '../lib/cn';",
              "import { buttonVariants } from './ui/button';",
              "import { useTranslations } from '@fuma-translate/react';",
            ],
          },
          {
            line: 67,
            lines: [
              "        variant === 'normal' && 'bg-fd-secondary',",
              "        variant === 'rainbow' && 'bg-fd-background',",
              "        !open && 'hidden',",
            ],
          },
        ],
      },
      {
        file: 'components/files.tsx',
        target: 'lib/cn.ts',
        rewires: [{ line: 6, from: '@/utils/cn', to: '../lib/cn' }],
        hunks: [
          {
            line: 3,
            lines: [
              "import { cva } from 'class-variance-authority';",
              "import { FileIcon, FolderIcon, FolderOpen } from 'lucide-react';",
              "import { type HTMLAttributes, type ReactNode, useState } from 'react';",
              "import { cn } from '../lib/cn';",
              "import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';",
            ],
          },
        ],
      },
    ],
  },
];

/** a written file on its way into the tree: the row it lands in, its own or the closed folder that
 * takes it, and the rows that show once it landed */
interface Delivery {
  path: string;
  name: string;
  inlet: string;
  reveals: string[];
}

/** the files row by row, the target's first; a closed folder takes its files in the CLI's order */
export function deliveries(plan: Plan): Delivery[] {
  const rows: string[] = [];
  const open = new Set<string>();
  function walk(entries: Entry[]) {
    for (const entry of entries) {
      rows.push(entry.path);
      if (entry.open) {
        open.add(entry.path);
        walk(entry.children!);
      }
    }
  }
  walk(plan.tree);

  const out: Delivery[] = [];
  for (const path of plan.files) {
    const parts = path.split('/');
    const reveals: string[] = [];
    let inlet = path;
    let at = '';
    for (let i = 0; i < parts.length; i++) {
      at = at ? `${at}/${parts[i]}` : parts[i];
      reveals.push(at);
      if (i < parts.length - 1 && !open.has(at)) {
        inlet = at;
        break;
      }
    }
    out.push({ path, name: parts[parts.length - 1], inlet, reveals });
  }

  const rank = (d: Delivery) =>
    (d.path.startsWith(`${plan.target}/`) ? 0 : rows.length) + rows.indexOf(d.inlet);
  return out.sort((a, b) => rank(a) - rank(b));
}
