import { BEAT, TICK } from '../../lib/motion';
import { glyphOf } from './atlas';

/**
 * The `pnpm create fumadocs-app` session, as `@clack/prompts` 1.8.1 renders the prompts of
 * `packages/create-app/src/bin.ts` in an 80x24 colour terminal.
 */
export const COLS = 80;
export const ROWS = 24;

/** default foreground, dim, the CLI colours (cyan, green, magenta), inverse block on a colour, inverse block on the text */
export const TEXT = 0;
export const DIM = 1;
export const ACCENT = 2;
export const INVERSE = 3;
export const CURSOR = 4;

export type Span = readonly [text: string, style: number];
export type Line = readonly Span[];

export interface Frame {
  at: number;
  lines: readonly Line[];
  /** first transcript line on screen, a terminal never scrolls back */
  top: number;
  status?: string;
}

export interface Session {
  frames: Frame[];
  duration: number;
}

interface Option {
  label: string;
  hint?: string;
}

const templates: Option[] = [
  { label: 'Next.js: Fumadocs MDX', hint: 'recommended: powerful and mature' },
  { label: 'Waku: Fumadocs MDX', hint: 'recommended: fast and simple' },
  { label: 'Next.js Static: Fumadocs MDX' },
  { label: 'React Router: Fumadocs MDX (not RSC)' },
  {
    label: 'React Router SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
  },
  { label: 'Tanstack Start: Fumadocs MDX (not RSC)' },
  {
    label: 'Tanstack Start SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
  },
  { label: 'Astro: React Islands', hint: 'partial support only, uses Astro Content Collections.' },
];

const linters: Option[] = [
  { label: 'Disabled' },
  { label: 'ESLint' },
  { label: 'Biome' },
  { label: 'Oxlint' },
];

const searches: Option[] = [
  { label: 'Default', hint: 'local search powered by ZBSearch, recommended' },
  { label: 'Orama Cloud', hint: '3rd party search solution, signup needed' },
  { label: 'Algolia', hint: 'signup needed' },
  { label: 'Meilisearch', hint: 'self-hosted or cloud' },
  { label: 'Typesense', hint: 'self-hosted or cloud' },
  { label: 'Mixedbread', hint: 'AI search, signup needed' },
];

const ogImages: Option[] = [
  { label: 'next/og', hint: 'Next.js built-in solution' },
  { label: 'Takumi', hint: 'Output WebP format, framework-agnostic' },
];

const aiChats: Option[] = [
  { label: 'No' },
  { label: 'AI SDK', hint: 'default to OpenRouter' },
  { label: 'LLMGateway', hint: 'open-source LLM gateway, API key required' },
  { label: 'Inkeep AI', hint: 'API key required' },
];

const BAR = '│';
const NAME = 'my-docs';
const COMMAND = 'pnpm create fumadocs-app';
const SPINNER = '◒◐◓◑';

function heading(symbol: string, message: string): Line {
  return [
    [symbol, ACCENT],
    [`  ${message}`, TEXT],
  ];
}

function answer(value: string): Line[] {
  return [
    [[BAR, DIM]],
    [
      [BAR, DIM],
      ['  ', TEXT],
      [value, DIM],
    ],
  ];
}

function textPrompt(message: string, placeholder: string, input: string): Line[] {
  const value: Span[] = input
    ? [[`${input}█`, TEXT]]
    : [
        [placeholder[0], CURSOR],
        [placeholder.slice(1), DIM],
      ];
  return [
    [[BAR, DIM]],
    heading('◆', message),
    [[BAR, ACCENT], ['  ', TEXT], ...value],
    [['└', ACCENT]],
  ];
}

function selectPrompt(message: string, options: Option[], cursor: number): Line[] {
  const lines: Line[] = [[[BAR, DIM]], heading('◆', message)];
  for (let i = 0; i < options.length; i++) {
    const { label, hint } = options[i];
    const spans: Span[] =
      i === cursor
        ? [
            ['●', ACCENT],
            [` ${label} `, TEXT],
          ]
        : [
            ['○', DIM],
            [' ', TEXT],
            [label, DIM],
          ];
    if (i === cursor && hint) spans.push([`(${hint})`, DIM]);
    // clack pads the option width with the escaped `│  `, 13 characters in a colour terminal
    for (const row of wrap(spans, COLS - 13)) lines.push([[BAR, ACCENT], ['  ', TEXT], ...row]);
  }
  lines.push(
    [
      [BAR, ACCENT],
      ['  ', TEXT],
      ['↑/↓', DIM],
      [' to navigate • ', TEXT],
      ['Enter:', DIM],
      [' confirm', TEXT],
    ],
    [['└', ACCENT]],
  );
  return lines;
}

function confirmPrompt(message: string, value: boolean): Line[] {
  const radio = (label: string, active: boolean): Span[] =>
    active
      ? [
          ['●', ACCENT],
          [` ${label}`, TEXT],
        ]
      : [
          ['○', DIM],
          [' ', TEXT],
          [label, DIM],
        ];
  return [
    [[BAR, DIM]],
    heading('◆', message),
    [
      [BAR, ACCENT],
      ['  ', TEXT],
      ...radio('Yes', value),
      [' ', TEXT],
      ['/', DIM],
      [' ', TEXT],
      ...radio('No', !value),
    ],
    [['└', ACCENT]],
  ];
}

/** word wrap with `trim: false`, like `fast-wrap-ansi` does for clack */
function wrap(spans: Span[], width: number): Span[][] {
  const rows: Span[][] = [[]];
  let length = 0;
  let first = true;
  for (const [text, style] of spans) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let row = rows[rows.length - 1];
      if (i > 0 || !first) {
        if (i > 0) {
          if (length >= width) {
            row = [];
            rows.push(row);
            length = 0;
          }
          row.push([' ', style]);
          length++;
        }
        if (length + word.length > width && length > 0 && word.length > 0) {
          row = [];
          rows.push(row);
          length = 0;
        }
      }
      first = false;
      if (word.length > 0) {
        row.push([word, style]);
        length += word.length;
      }
    }
  }
  return rows;
}

export function createSession(): Session {
  const frames: Frame[] = [];
  const log: Line[] = [];
  let at = 0;
  let top = 0;

  function show(live: Line[], wait: number, status?: string) {
    const lines = log.concat(live);
    top = Math.max(top, lines.length - ROWS);
    frames.push({ at, lines, top, status });
    at += wait;
  }

  function shell(typed: string, cursor: boolean): Line[] {
    const line: Span[] = [
      ['$ ', DIM],
      [typed, TEXT],
    ];
    if (cursor) line.push(['█', TEXT]);
    return [line];
  }

  function type(text: string, speed: number, status?: string) {
    for (let i = 1; i <= text.length; i++)
      show(shell(text.slice(0, i), true), speed, i === 1 ? status : undefined);
  }

  function select(
    message: string,
    options: Option[],
    moves: number,
    hold: number,
    status?: string,
  ) {
    show(selectPrompt(message, options, 0), hold, status);
    let cursor = 0;
    for (let i = 0; i < moves; i++) {
      cursor = (cursor + 1) % options.length;
      show(selectPrompt(message, options, cursor), 2 * TICK);
    }
    if (moves > 0) at += TICK;
    log.push([[BAR, DIM]], heading('◇', message), answer(options[cursor].label)[1]);
  }

  function confirm(message: string, value: boolean) {
    show(confirmPrompt(message, value), 6 * TICK);
    log.push([[BAR, DIM]], heading('◇', message), answer(value ? 'Yes' : 'No')[1]);
  }

  show(shell('', true), BEAT);
  show(shell('', false), BEAT);
  type(COMMAND, 36, `typing ${COMMAND}`);
  show(shell(COMMAND, true), 2 * TICK);
  log.push(shell(COMMAND, false)[0]);
  show([], 3 * TICK);

  log.push([
    ['┌', DIM],
    ['  ', TEXT],
    ['Create Fumadocs App', INVERSE],
  ]);
  show(textPrompt('Project name', 'my-app', ''), 6 * TICK, 'project name');
  for (let i = 1; i <= NAME.length; i++)
    show(textPrompt('Project name', 'my-app', NAME.slice(0, i)), 40);
  at += 3 * TICK;
  log.push([[BAR, DIM]], heading('◇', 'Project name'), answer(NAME)[1]);
  show([], TICK);

  select('Choose a template', templates, templates.length, 5 * TICK, 'choosing a template');
  confirm('Use `/src` directory?', false);
  select('Configure linter?', linters, 0, 6 * TICK, 'configuring');
  select('Choose a search solution?', searches, 0, 7 * TICK);
  select('Configure Open Graph Image generation?', ogImages, 0, 6 * TICK);
  select('Configure AI Chat?', aiChats, 0, 6 * TICK);
  confirm('Do you want to install packages automatically? (detected as pnpm)', true);

  log.push([[BAR, DIM]]);
  const steps = [
    ['Generating Project', 12],
    ['Installed dependencies', 6],
    ['Initialized Git repository', 4],
  ] as const;
  let frame = 0;
  for (const [message, count] of steps) {
    for (let i = 0; i < count; i++, frame++) {
      show(
        [
          [
            [SPINNER[frame % 4], ACCENT],
            [`  ${message}${'.'.repeat(Math.floor(frame / 4) % 4)}`, TEXT],
          ],
        ],
        TICK,
        frame === 0 ? 'generating project' : undefined,
      );
    }
  }
  log.push(heading('◇', 'Project Generated'));
  show([], 2 * TICK);
  log.push(
    [[BAR, DIM]],
    [
      ['└', DIM],
      ['  ', TEXT],
      ['Done', INVERSE],
    ],
    [],
  );
  show([], 2 * TICK, 'project generated');

  const next: Line[] = [
    [],
    [['Open the project', TEXT]],
    [[`cd ${NAME}`, ACCENT]],
    [],
    [['Run Development Server', TEXT]],
    [['pnpm dev', ACCENT]],
    [],
    [['You can now open the project and start writing documents', TEXT]],
  ];
  for (const line of next) {
    log.push(line);
    show([], TICK);
  }
  for (let i = 0; i < 4; i++) {
    show(shell('', true), BEAT);
    show(shell('', false), BEAT);
  }
  type('clear', 40);
  show(shell('clear', true), 2 * TICK);
  return { frames, duration: at };
}

/** the last frame, a finished session at rest */
export function finalFrame(session: Session): Frame {
  for (let i = session.frames.length - 1; i >= 0; i--) {
    const frame = session.frames[i];
    if (frame.status === 'project generated') return session.frames[i + 8] ?? frame;
  }
  return session.frames[session.frames.length - 1];
}

/** write the visible rows of `frame` into an RGBA cell buffer: glyph, style, glyph density */
export function paint(frame: Frame, data: Uint8ClampedArray, density: Uint8Array) {
  for (let r = 0; r < ROWS; r++) {
    const line = frame.lines[frame.top + r];
    let c = 0;
    if (line) {
      for (const [text, style] of line) {
        for (let i = 0; i < text.length && c < COLS; i++, c++) {
          const glyph = glyphOf(text[i]);
          const o = (r * COLS + c) * 4;
          data[o] = glyph;
          data[o + 1] = style;
          data[o + 2] = density[glyph];
          data[o + 3] = 255;
        }
      }
    }
    for (; c < COLS; c++) {
      const o = (r * COLS + c) * 4;
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
}
