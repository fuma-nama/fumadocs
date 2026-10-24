/**
 * `npx @fumadocs/cli customize` picking the Docs layout, as `@clack/prompts` 1.8.1 prints the
 * prompts of `packages/cli/src/commands/customise.ts` in a project made by
 * `pnpm create fumadocs-app` (Next.js): its installer writes the files below in this order and
 * asks for the dependencies the project doesn't have yet.
 */
export const COMMAND = 'npx @fumadocs/cli customize';

/** `0` text, `1` dim, `2` the CLI's colour, `3` its inverse title */
export type Tone = 0 | 1 | 2 | 3;
export type Span = readonly [text: string, tone: Tone];

export interface Line {
  /** the guide column: `│`, `┌`, `└` or a step symbol */
  guide: Span;
  spans: readonly Span[];
  /** shown from this step; every line keeps its place before, so nothing moves */
  from: number;
  /** until this step it is a spinner saying `working` */
  done?: number;
  working?: string;
  /** the dependency box */
  box?: boolean;
  /** the prompt asked here, open on this line while it's active */
  prompt?: Prompt;
}

/** the files `customize` writes for the Docs layout, in order */
export const INSTALLED = [
  'layouts/docs/page/index.tsx',
  'components/ai/page-actions.tsx',
  'components/ui/button.tsx',
  'components/ui/popover.tsx',
  'lib/cn.ts',
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

/** what the layout imports that a new project doesn't have */
export const DEPENDENCIES = [
  '@fuma-translate/react@^1.0.2',
  '@fumadocs/base-ui',
  'class-variance-authority@^0.7.1',
  '@base-ui/react@^1.9.0',
  'next-themes@^0.4.6',
  'scroll-into-view-if-needed@^3.1.0',
];

export interface Prompt {
  /** `select` or `confirm`, the prompt of clack */
  kind: string;
  message: string;
  options: readonly (readonly [label: string, hint?: string])[];
  /** the step it is active in */
  step: number;
}

export const PROMPTS: Prompt[] = [
  {
    kind: 'select',
    message: 'What do you want to customize?',
    options: [
      ['Docs Layout', 'the default docs layout'],
      ['Notebook Layout'],
      ['Flux Layout'],
      ['Glass Layout'],
      ['Spacious Layout'],
      ['Home Layout'],
    ],
    step: 1,
  },
  {
    kind: 'select',
    message: 'Which part do you want to customize?',
    options: [
      ['All', 'install the entire layout'],
      ['Replace & rewrite from minimal styles'],
      ['Page: breadcrumb'],
      ['Page: container'],
      ['Page: footer'],
      ['Page: toc'],
      ['Layout: container'],
      ['Layout: header'],
      ['Layout: sidebar'],
    ],
    step: 2,
  },
  {
    kind: 'confirm',
    message: 'Do you want to install with pnpm?',
    options: [['Yes'], ['No']],
    step: 4,
  },
];

const BAR: Span = ['│', 1];
const SUBMIT: Span = ['◇', 2];

function submitted(prompt: Prompt, from: number): Line[] {
  return [
    { guide: SUBMIT, spans: [[prompt.message, 0]], from, prompt },
    { guide: BAR, spans: [[prompt.options[0][0], 1]], from },
  ];
}

/** the session, step by step: 1 to 6 are clack's output, 7 is your edit */
export const SESSION: Line[] = [
  { guide: ['┌', 1], spans: [['Customize Fumadocs UI', 3]], from: 1 },
  { guide: BAR, spans: [], from: 1 },
  ...submitted(PROMPTS[0], 2),
  { guide: BAR, spans: [], from: 2 },
  ...submitted(PROMPTS[1], 3),
  { guide: BAR, spans: [], from: 3 },
  {
    guide: SUBMIT,
    spans: [['layouts/docs installed', 0]],
    from: 3,
    done: 4,
    working: 'Installing layouts/docs',
  },
  { guide: BAR, spans: [], from: 4 },
  { guide: BAR, spans: [], from: 4, box: true },
  { guide: BAR, spans: [], from: 4 },
  ...submitted(PROMPTS[2], 5),
  { guide: BAR, spans: [], from: 5 },
  {
    guide: SUBMIT,
    spans: [['Dependencies installed', 0]],
    from: 5,
    done: 6,
    working: 'Installing dependencies',
  },
  { guide: ['┌', 1], spans: [['What is Next?', 0]], from: 6 },
  { guide: BAR, spans: [], from: 6 },
  {
    guide: ['●', 2],
    spans: [['You can check the installed layouts in `layouts` folder.', 0]],
    from: 6,
  },
  { guide: BAR, spans: [['---', 1]], from: 6 },
  {
    guide: BAR,
    spans: [['Updated the imports of app/docs/layout.tsx, app/docs/[[...slug]]/page.tsx.', 0]],
    from: 6,
  },
  { guide: BAR, spans: [['"fumadocs-ui/layouts/docs" -> "@/layouts/docs"', 2]], from: 6 },
  { guide: BAR, spans: [['"fumadocs-ui/layouts/docs/page" -> "@/layouts/docs/page"', 2]], from: 6 },
  { guide: BAR, spans: [], from: 6 },
  { guide: ['└', 1], spans: [['Have fun!', 0]], from: 6 },
];

/** ms from the start of the session to each step */
export const TIMELINE = [0, 400, 1600, 2800, 3800, 5000, 5600, 6800];
/** a written file per this many ms, while installing */
export const ROLL = 30;

/**
 * Your edit: `DocsTitle` in your copy, `layouts/docs/page/index.tsx` lines 197 to 203. The
 * preview's frame runs the package, it applies the class you wrote as the CSS it produces.
 */
export const EDIT = {
  file: 'layouts/docs/page/index.tsx',
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
  /** the index of the changed line */
  at: 2,
  from: 'text-[1.75em]',
  to: 'text-[2.5em]',
  css: '#nd-page h1.text-\\[1\\.75em\\]{font-size:2.5em}',
};
