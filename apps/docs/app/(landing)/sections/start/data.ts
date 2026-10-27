import { BEAT, TICK } from '../../lib/motion';

/**
 * The `pnpm create fumadocs-app` session, as `@clack/prompts` 1.8.1 renders the prompts of
 * `packages/create-app/src/bin.ts` in an 80x24 colour terminal.
 */
export const COLS = 80;
export const ROWS = 24;

type Span = readonly [text: string, style: number];
type Line = readonly Span[];

// the shader's styles: default, dim, the CLI's colours, inverse on a colour, inverse on the text;
// a space has no ink, so it may take any of the first three
const plain = (text: string): Span => [text, 0];
const dim = (text: string): Span => [text, 1];
const accent = (text: string): Span => [text, 2];
const inverse = (text: string): Span => [text, 3];
const caret = (text: string): Span => [text, 4];

export interface Frame {
  at: number;
  lines: readonly Line[];
  /** first transcript line on screen, a terminal never scrolls back */
  top: number;
  status?: string;
}

interface Option {
  label: string;
  hint?: string;
}

const SPA_HINT = 'SPA mode allows you to host the site statically, compatible with a CDN.';
const templates: Option[] = [
  { label: 'Next.js: Fumadocs MDX', hint: 'recommended: powerful and mature' },
  { label: 'Waku: Fumadocs MDX', hint: 'recommended: fast and simple' },
  { label: 'Next.js Static: Fumadocs MDX' },
  { label: 'React Router: Fumadocs MDX (not RSC)' },
  { label: 'React Router SPA: Fumadocs MDX (not RSC)', hint: SPA_HINT },
  { label: 'Tanstack Start: Fumadocs MDX (not RSC)' },
  { label: 'Tanstack Start SPA: Fumadocs MDX (not RSC)', hint: SPA_HINT },
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

const NAME = 'my-docs';
const COMMAND = 'pnpm create fumadocs-app';
const SPINNER = '◒◐◓◑';

function heading(symbol: string, message: string): Line {
  return [accent(symbol), plain(`  ${message}`)];
}

function radio(label: string, active: boolean): Span[] {
  return active ? [accent('●'), plain(` ${label}`)] : [dim(`○ ${label}`)];
}

function textPrompt(message: string, placeholder: string, input: string): Line[] {
  const value = input ? [plain(`${input}█`)] : [caret(placeholder[0]), dim(placeholder.slice(1))];
  return [[dim('│')], heading('◆', message), [accent('│  '), ...value], [accent('└')]];
}

function selectPrompt(message: string, options: Option[], cursor: number): Line[] {
  const lines: Line[] = [[dim('│')], heading('◆', message)];
  for (let i = 0; i < options.length; i++) {
    const { label, hint } = options[i];
    const spans = radio(label, i === cursor);
    if (i === cursor && hint) spans.push(plain(' '), dim(`(${hint})`));
    // clack pads the option width with the escaped `│  `, 13 characters in a colour terminal
    for (const row of wrap(spans, COLS - 13)) lines.push([accent('│  '), ...row]);
  }
  lines.push(
    [accent('│  '), dim('↑/↓'), plain(' to navigate • '), dim('Enter:'), plain(' confirm')],
    [accent('└')],
  );
  return lines;
}

function confirmPrompt(message: string, value: boolean): Line[] {
  const answer = [...radio('Yes', value), dim(' / '), ...radio('No', !value)];
  return [[dim('│')], heading('◆', message), [accent('│  '), ...answer], [accent('└')]];
}

/** word wrap with `trim: false`, like `fast-wrap-ansi` does for clack */
function wrap(spans: Span[], width: number): Span[][] {
  const rows: Span[][] = [[]];
  let length = 0;
  function put(text: string, style: number, fits: boolean) {
    if (!fits) {
      rows.push([]);
      length = 0;
    }
    rows[rows.length - 1].push([text, style]);
    length += text.length;
  }
  for (const [text, style] of spans) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (i > 0) put(' ', style, length < width);
      if (words[i]) put(words[i], style, length === 0 || length + words[i].length <= width);
    }
  }
  return rows;
}

export function createSession() {
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

  /** a prompt once answered: its message and the answer stay in the log */
  function answered(message: string, value: string) {
    log.push([dim('│')], heading('◇', message), [dim(`│  ${value}`)]);
  }

  function shell(typed: string, cursor: boolean): Line[] {
    return [[dim('$ '), plain(cursor ? `${typed}█` : typed)]];
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
    for (let i = 1; i <= moves; i++)
      show(selectPrompt(message, options, i % options.length), 2 * TICK);
    if (moves > 0) at += TICK;
    answered(message, options[moves % options.length].label);
  }

  function confirm(message: string, value: boolean) {
    show(confirmPrompt(message, value), 6 * TICK);
    answered(message, value ? 'Yes' : 'No');
  }

  show(shell('', true), 2 * TICK);
  type(COMMAND, 28, `typing ${COMMAND}`);
  show(shell(COMMAND, true), 2 * TICK);
  log.push(shell(COMMAND, false)[0]);
  show([], 2 * TICK);

  log.push([dim('┌  '), inverse('Create Fumadocs App')]);
  show(textPrompt('Project name', 'my-app', ''), 6 * TICK, 'project name');
  for (let i = 1; i <= NAME.length; i++)
    show(textPrompt('Project name', 'my-app', NAME.slice(0, i)), 40);
  at += 3 * TICK;
  answered('Project name', NAME);
  show([], TICK);

  select('Choose a template', templates, templates.length, 5 * TICK, 'choosing a template');
  confirm('Use `/src` directory?', false);
  select('Configure linter?', linters, 0, 6 * TICK, 'configuring');
  select('Choose a search solution?', searches, 0, 7 * TICK);
  select('Configure Open Graph Image generation?', ogImages, 0, 6 * TICK);
  select('Configure AI Chat?', aiChats, 0, 6 * TICK);
  confirm('Do you want to install packages automatically? (detected as pnpm)', true);

  log.push([dim('│')]);
  const steps = [
    ['Generating Project', 12],
    ['Installed dependencies', 6],
    ['Initialized Git repository', 4],
  ] as const;
  let frame = 0;
  for (const [message, count] of steps) {
    for (let i = 0; i < count; i++, frame++) {
      const dots = '.'.repeat(Math.floor(frame / 4) % 4);
      const line = [accent(SPINNER[frame % 4]), plain(`  ${message}${dots}`)];
      show([line], TICK, frame === 0 ? 'generating project' : undefined);
    }
  }
  log.push(heading('◇', 'Project Generated'));
  show([], 2 * TICK);
  log.push([dim('│')], [dim('└  '), inverse('Done')], []);
  show([], 2 * TICK, 'project generated');

  const next: Line[] = [
    [],
    [plain('Open the project')],
    [accent(`cd ${NAME}`)],
    [],
    [plain('Run Development Server')],
    [accent('pnpm dev')],
    [],
    [plain('You can now open the project and start writing documents')],
  ];
  for (const line of next) {
    log.push(line);
    show([], TICK);
  }
  // the finished session at rest, its last output on screen: what reduced motion shows
  const rest = frames[frames.length - 1];
  for (let i = 0; i < 4; i++) {
    show(shell('', true), BEAT);
    show(shell('', false), BEAT);
  }
  type('clear', 40);
  show(shell('clear', true), 2 * TICK);
  return { frames, duration: at, rest };
}
