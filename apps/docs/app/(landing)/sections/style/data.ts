export const THEMES = [
  'neutral',
  'black',
  'vitepress',
  'dusk',
  'catppuccin',
  'ocean',
  'purple',
  'solar',
  'emerald',
  'ruby',
  'aspen',
  'shadcn',
] as const;

export type ThemeId = (typeof THEMES)[number];

/** what a reader calls a preset; the id is its file, `fumadocs-ui/css/<id>.css` */
export const THEME_NAMES: Record<ThemeId, string> = {
  neutral: 'Neutral',
  black: 'Black',
  vitepress: 'VitePress',
  dusk: 'Dusk',
  catppuccin: 'Catppuccin',
  ocean: 'Ocean',
  purple: 'Purple',
  solar: 'Solar',
  emerald: 'Emerald',
  ruby: 'Ruby',
  aspen: 'Aspen',
  shadcn: 'shadcn/ui',
};

export type LayoutId = 'docs' | 'notebook' | 'flux' | 'glass' | 'spacious' | 'home';

/** the layout the desk starts on, its cables settled on the server */
export const FIRST: LayoutId = 'docs';

export const TABS = ['layouts', 'story', 'openapi', 'graphql', 'asyncapi'] as const;

export type TabId = (typeof TABS)[number];

/** the tabs that frame a demo page */
export type DemoId = Exclude<TabId, 'layouts'>;

/**
 * Each demo's `source`, where its UI comes from, which the monitor's bar names (the layouts name
 * theirs), and the `title` of its frame, the accessible name.
 */
export const DEMOS: Record<DemoId, { source: string; title: string }> = {
  story: { source: '@fumadocs/story', title: 'Story of a Callout, with its controls' },
  openapi: {
    source: 'fumadocs-openapi/ui',
    title: 'OpenAPI page of an operation, with its playground',
  },
  graphql: {
    source: '@fumadocs/graphql/ui',
    title: 'GraphQL page of a query, with its playground',
  },
  asyncapi: {
    source: '@fumadocs/asyncapi/ui',
    title: 'AsyncAPI page of a channel, with its playground',
  },
};

/** values of a preset, in the order of `InkTable.tokens` */
export interface Ink {
  light: string[];
  dark: string[];
  /** other plain rules of the preset file */
  rules: string;
}

/** a preset's colour on this page; `var(--x)` of the shadcn preset reads this page's `--color-fd-x` */
export function paint(value: string): string {
  return value.startsWith('var(--') ? `var(--color-fd-${value.slice(6)}` : value;
}

interface LayoutInfo {
  id: LayoutId;
  name: string;
  /** the element a story renders once its lazy layout loaded */
  root: string;
}

export const LAYOUTS: LayoutInfo[] = [
  { id: 'docs', name: 'Docs', root: '#nd-docs-layout' },
  { id: 'notebook', name: 'Notebook', root: '#nd-notebook-layout' },
  { id: 'flux', name: 'Flux', root: '#nd-flux-layout' },
  { id: 'glass', name: 'Glass', root: '#fd-glass-layout' },
  { id: 'spacious', name: 'Spacious', root: '#fd-spacious-layout' },
  { id: 'home', name: 'Home', root: '#nd-home-layout' },
];

/** the viewport of a story frame, like `<story.WithControl />` */
export const FRAME_W = 1280;
export const FRAME_H = 800;

// same arguments as `content/docs/ui/layouts/layouts.story.tsx`; the shared ones fit every layout
export const SHARED_ARGS = {
  nav: { title: 'My Docs' },
  themeSwitch: { enabled: true, mode: 'light-dark' },
  searchToggle: { enabled: true },
};

export const STORY_ARGS: Record<LayoutId, object> = {
  docs: { ...SHARED_ARGS, tabMode: 'auto', sidebar: { collapsible: true } },
  notebook: {
    ...SHARED_ARGS,
    nav: { ...SHARED_ARGS.nav, mode: 'auto' },
    tabMode: 'sidebar',
    sidebar: { collapsible: true },
  },
  flux: SHARED_ARGS,
  glass: { ...SHARED_ARGS, sidebar: { collapsible: true } },
  spacious: SHARED_ARGS,
  home: { ...SHARED_ARGS, nav: { ...SHARED_ARGS.nav, transparentMode: 'top' } },
};
