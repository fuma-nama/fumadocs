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
export type LayoutId = 'docs' | 'notebook' | 'flux' | 'glass' | 'spacious' | 'home';

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

export interface LayoutInfo {
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

// same arguments as `content/docs/ui/layouts/layouts.story.tsx`
const base = {
  nav: { title: 'My Docs' },
  themeSwitch: { enabled: true, mode: 'light-dark' },
  searchToggle: { enabled: true },
};

export const STORY_ARGS: Record<LayoutId, object> = {
  docs: { ...base, tabMode: 'auto', sidebar: { collapsible: true } },
  notebook: {
    ...base,
    nav: { ...base.nav, mode: 'auto' },
    tabMode: 'sidebar',
    sidebar: { collapsible: true },
  },
  flux: base,
  glass: { ...base, sidebar: { collapsible: true } },
  spacious: base,
  home: { ...base, nav: { ...base.nav, transparentMode: 'top' } },
};
