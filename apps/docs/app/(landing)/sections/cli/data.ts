/**
 * What `npx @fumadocs/cli` writes into a project made by `pnpm create fumadocs-app` (the Next.js
 * template, `examples/next`), as the installer of `@fumadocs/cli` plans it against the registry
 * built from this repo: `customize` picking Docs Layout > All, and `add banner files`. Both skip
 * `lib/cn.ts`, the template has the same file.
 */

export interface Entry {
  name: string;
  /** the path from the project root */
  path: string;
  /** a folder's entries, a file has none */
  children?: Entry[];
  /** a folder shown open */
  open?: boolean;
  /** written by the command */
  added?: boolean;
}

/** an import the command points at your copy */
export interface Rewire {
  file: string;
  line: number;
  code: string;
  from: string;
  to: string;
  /** the row of your project it resolves to once rewired */
  target: string;
}

/** a line you change in your copy */
export interface Edit {
  /** what it changes */
  name: string;
  file: string;
  /** the number of the first line */
  line: number;
  lines: string[];
  /** the index of the changed line */
  at: number;
  from: string;
  to: string;
}

export interface Plan {
  id: 'customize' | 'add';
  /** after `npx @fumadocs/cli ` */
  args: string;
  /** what the registry hands over, for the status line */
  fetch: string;
  /** the CLI's line once it is done */
  done: string;
  /** the folder it installs into, its files land first */
  target: string;
  /** the files it writes, in its order */
  files: string[];
  /** your project once it ran */
  tree: Entry[];
  rewires: Rewire[];
  edit: Edit;
}

/** the project's files, the root ones left out */
const project = [
  'app/(home)/layout.tsx',
  'app/(home)/page.tsx',
  'app/api/search/route.ts',
  'app/docs/[[...slug]]/page.tsx',
  'app/docs/layout.tsx',
  'app/global.css',
  'app/layout.tsx',
  'app/llms-full.txt/route.ts',
  'app/llms.mdx/docs/[[...slug]]/route.ts',
  'app/llms.txt/route.ts',
  'app/og/docs/[...slug]/route.tsx',
  'components/mdx.tsx',
  'content/docs/index.mdx',
  'content/docs/test.mdx',
  'lib/cn.ts',
  'lib/layout.shared.tsx',
  'lib/shared.ts',
  'lib/source.ts',
];

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
  entry.children.sort((a, b) =>
    Boolean(a.children) === Boolean(b.children)
      ? a.name.localeCompare(b.name)
      : a.children
        ? -1
        : 1,
  );
  for (const child of entry.children) sort(child);
}

const customizeFiles = [
  'layouts/docs/page/index.tsx',
  'components/ai/page-actions.tsx',
  'components/ui/button.tsx',
  'components/ui/popover.tsx',
  'layouts/docs/page/slots/footer.tsx',
  'lib/urls.ts',
  'layouts/docs/page/slots/breadcrumb.tsx',
  'layouts/docs/page/slots/container.tsx',
  'layouts/docs/page/slots/toc.tsx',
  'components/ui/collapsible.tsx',
  'components/toc/index.tsx',
  'lib/merge-refs.ts',
  'components/toc/block.tsx',
  'components/toc/default.tsx',
  'components/toc/clerk.tsx',
  'layouts/docs/index.tsx',
  'layouts/docs/client.tsx',
  'layouts/docs/slots/container.tsx',
  'layouts/docs/slots/header.tsx',
  'layouts/shared/client.tsx',
  'layouts/shared/slots/theme-switch.tsx',
  'layouts/shared/slots/search-trigger.tsx',
  'layouts/shared/slots/language-select.tsx',
  'layouts/docs/slots/sidebar.tsx',
  'components/docs-sidebar/tabs/dropdown.tsx',
  'components/docs-sidebar/base.tsx',
  'lib/hotkey.ts',
  'components/docs-sidebar/link-item.tsx',
  'components/docs-sidebar/page-tree.tsx',
];

// `add` installs one target after the other
const addFiles = [
  'components/banner.tsx',
  'components/ui/button.tsx',
  'components/files.tsx',
  'components/ui/collapsible.tsx',
];

export const plans: Plan[] = [
  {
    id: 'customize',
    args: 'customize',
    fetch: 'layouts/docs',
    done: 'layouts/docs installed',
    target: 'layouts',
    files: customizeFiles,
    tree: tree(customizeFiles, [
      'layouts',
      'layouts/docs',
      'layouts/docs/page',
      'layouts/docs/page/slots',
      'layouts/docs/slots',
    ]),
    rewires: [
      {
        file: 'app/docs/layout.tsx',
        line: 2,
        code: "import { DocsLayout } from 'fumadocs-ui/layouts/docs';",
        from: 'fumadocs-ui/layouts/docs',
        to: '@/layouts/docs',
        target: 'layouts/docs',
      },
      {
        file: 'app/docs/[[...slug]]/page.tsx',
        line: 9,
        code: "} from 'fumadocs-ui/layouts/docs/page';",
        from: 'fumadocs-ui/layouts/docs/page',
        to: '@/layouts/docs/page',
        target: 'layouts/docs/page',
      },
    ],
    edit: {
      name: 'DocsTitle',
      file: 'layouts/docs/page/index.tsx',
      line: 197,
      lines: [
        "export function DocsTitle({ children, className, ...props }: ComponentProps<'h1'>) {",
        '  return (',
        "    <h1 {...props} className={cn('text-[1.75em] font-semibold', className)}>",
      ],
      at: 2,
      from: '1.75',
      to: '2.5',
    },
  },
  {
    id: 'add',
    args: 'add banner files',
    fetch: 'banner, files',
    done: 'banner, files installed',
    target: 'components',
    files: addFiles,
    tree: tree(addFiles, ['components', 'components/ui', 'lib']),
    rewires: [
      {
        file: 'components/banner.tsx',
        line: 6,
        code: "import { buttonVariants } from '@/components/ui/button';",
        from: '@/components/ui/button',
        to: './ui/button',
        target: 'components/ui/button.tsx',
      },
      {
        file: 'components/files.tsx',
        line: 6,
        code: "import { cn } from '@/utils/cn';",
        from: '@/utils/cn',
        to: '../lib/cn',
        target: 'lib/cn.ts',
      },
    ],
    edit: {
      name: 'Banner',
      file: 'components/banner.tsx',
      line: 67,
      lines: [
        "        variant === 'normal' && 'bg-fd-secondary',",
        "        variant === 'rainbow' && 'bg-fd-background',",
      ],
      at: 0,
      from: 'bg-fd-secondary',
      to: 'bg-fd-primary text-fd-primary-foreground',
    },
  },
];

/** a written file on its way into the tree */
interface Delivery {
  path: string;
  name: string;
  /** the row it lands in: its own, or the closed folder that takes it */
  inlet: string;
  /** rows that show once it landed */
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
