import type { Layer } from '../../ui/chip';

/** the layers top down: the order of the stack and of its labels */
export const LAYERS: Layer[] = ['ui', 'core', 'content', 'framework'];

/** each layer's name in a sentence */
export const NAMES: Record<Layer, string> = {
  ui: 'UI',
  core: 'Core',
  content: 'Content',
  framework: 'Framework',
};

/** what each layer does, beside its name in the panel */
export const ROLES: Record<Layer, string> = {
  ui: 'Layouts and components',
  core: 'Search, page tree, TOC and i18n',
  content: 'Where your pages come from',
  framework: 'What your docs run on',
};

export type SwapLayer = Exclude<Layer, 'core'>;

/** how a module looks on the stack: the UI's screen, the content's bay, the framework's case */
export type Look = 'styled' | 'plain' | 'edited' | 'files' | 'blocks' | 'ink' | 'paper' | 'grey';

export interface Option {
  /** its name in prose, as the docs spell it */
  title: string;
  /** its name on a plate too narrow for the title */
  short: string;
  /** the package */
  name: string;
  /** what it does, told as the arm sets it */
  line: string;
  /** what a caption calls it, where not its title */
  caption?: string;
  look: Look;
  /** a content source's three pages, and what Core's search types to find the second */
  pages?: Page[];
  query?: string;
}

/** a page a content source brings: its title, and its file for one read from files */
export interface Page {
  title: string;
  file?: string;
}

/** the core never swaps: every other layer plugs into it */
export const CORE: Omit<Option, 'look'> = {
  title: 'Fumadocs Core',
  short: 'Core',
  name: 'fumadocs-core',
  line: 'The logic every page needs: search, page tree, TOC and i18n.',
};

export const OPTIONS: Record<SwapLayer, Option[]> = {
  ui: [
    {
      title: 'Fumadocs UI',
      short: 'UI',
      name: 'fumadocs-ui',
      line: 'The default theme: beautiful layouts and interactive components.',
      look: 'styled',
    },
    {
      title: 'Headless',
      caption: 'custom UI',
      short: 'Headless',
      name: 'fumadocs-core',
      line: 'Keep the logic, bring your own design.',
      look: 'plain',
    },
    {
      title: 'Your copy',
      caption: 'your copy of Fumadocs UI',
      short: 'Your copy',
      name: '@/layouts/docs',
      line: 'The UI installed into your codebase, yours to edit.',
      look: 'edited',
    },
  ],
  content: [
    {
      title: 'Fumadocs MDX',
      short: 'MDX',
      name: 'fumadocs-mdx',
      line: 'Turns your Markdown and MDX files into pages.',
      look: 'files',
      pages: [
        { title: 'Introduction', file: 'index.mdx' },
        { title: 'Install', file: 'install.mdx' },
        { title: 'API', file: 'api.mdx' },
      ],
      query: 'ins',
    },
    {
      title: 'Notion',
      short: 'Notion',
      name: '@fumadocs/notion',
      line: 'Write your pages in Notion instead.',
      look: 'blocks',
      pages: [{ title: 'Welcome' }, { title: 'Setup' }, { title: 'Reference' }],
      query: 'set',
    },
    {
      title: 'Content Collections',
      short: 'Collections',
      name: '@fumadocs/content-collections',
      line: 'Load your Markdown through Content Collections.',
      look: 'files',
      pages: [
        { title: 'Introduction', file: 'index.md' },
        { title: 'Install', file: 'install.md' },
        { title: 'API', file: 'api.md' },
      ],
      query: 'ins',
    },
    {
      title: 'Sanity',
      short: 'Sanity',
      name: '@fumadocs/sanity',
      line: 'Pull your pages from Sanity, a headless CMS.',
      look: 'blocks',
      pages: [{ title: 'Home' }, { title: 'Setup' }, { title: 'Reference' }],
      query: 'set',
    },
    {
      title: 'Obsidian',
      short: 'Obsidian',
      name: 'fumadocs-obsidian',
      line: 'Publish your Obsidian vault as docs.',
      look: 'files',
      pages: [
        { title: 'Introduction', file: 'Index.md' },
        { title: 'Install', file: 'Install.md' },
        { title: 'API', file: 'API.md' },
      ],
      query: 'ins',
    },
  ],
  framework: [
    {
      title: 'Next.js',
      short: 'Next.js',
      name: 'next',
      line: 'Runs your docs as a Next.js app.',
      look: 'ink',
    },
    {
      title: 'React Router',
      short: 'Router',
      name: 'react-router',
      line: 'Same docs, on React Router.',
      look: 'paper',
    },
    {
      title: 'TanStack Start',
      short: 'TanStack',
      name: '@tanstack/react-start',
      line: 'Same docs, on TanStack Start.',
      look: 'grey',
    },
    { title: 'Waku', short: 'Waku', name: 'waku', line: 'Same docs, on Waku.', look: 'paper' },
    { title: 'Astro', short: 'Astro', name: 'astro', line: 'Same docs, on Astro.', look: 'ink' },
  ],
};
