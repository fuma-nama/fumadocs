import { readFile } from 'node:fs/promises';
import { THEMES, type Ink, type ThemeId } from './data';

const DIR = './node_modules/fumadocs-ui/css';

interface Parsed {
  light: Record<string, string>;
  dark: Record<string, string>;
  rules: string[];
}

/** top-level `selector { body }` blocks of a stylesheet */
function blocks(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const semi = css.indexOf(';', i);
    if (semi !== -1 && semi < open) {
      // an at-statement, e.g. `@import`
      i = semi + 1;
      continue;
    }
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    out.push({ selector: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1).trim() });
    i = j;
  }
  return out;
}

function tokens(body: string, into: Record<string, string>) {
  for (const decl of body.split(';')) {
    const colon = decl.indexOf(':');
    const name = decl.slice(0, colon).trim();
    if (colon !== -1 && name.startsWith('--color-fd-'))
      into[name.slice('--color-fd-'.length)] = decl.slice(colon + 1).trim();
  }
}

function parse(css: string): Parsed {
  const parsed: Parsed = { light: {}, dark: {}, rules: [] };
  for (const { selector, body } of blocks(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    const target = selector.replace(/\s+/g, ' ');
    if (target === '@theme') tokens(body, parsed.light);
    else if (target === '.dark') tokens(body, parsed.dark);
    else if (target === ':root, .dark') {
      tokens(body, parsed.light);
      tokens(body, parsed.dark);
    } else if (!target.startsWith('@theme') && !body.includes('@apply')) {
      // `@apply` needs Tailwind, only plain rules can be injected as they are
      parsed.rules.push(`${selector} { ${body} }`);
    }
  }
  return parsed;
}

export interface InkTable {
  /** `--color-fd-*` names without the prefix, the order of every `Ink` value list */
  tokens: string[];
  inks: Record<ThemeId, Ink>;
}

/** the real tokens of every preset, read from `fumadocs-ui/css` (traced for `/` in next.config) */
export async function loadInks(): Promise<InkTable> {
  const defaults = parse(await readFile(`${DIR}/lib/default-colors.css`, 'utf8'));
  const names = Object.keys(defaults.light);
  const inks = {} as Record<ThemeId, Ink>;

  await Promise.all(
    THEMES.map(async (theme) => {
      const preset = parse(await readFile(`${DIR}/${theme}.css`, 'utf8'));
      const light: string[] = [];
      const dark: string[] = [];
      for (const name of names) {
        light.push(preset.light[name] ?? defaults.light[name]);
        dark.push(preset.dark[name] ?? defaults.dark[name]);
      }
      inks[theme] = { light, dark, rules: preset.rules.join('\n') };
    }),
  );

  return { tokens: names, inks };
}

/** how a preset maps its variables to colours, in one mode */
export interface Wiring {
  /** the distinct values, from light to dark */
  chips: string[];
  /** the chip of each variable, in `InkTable.tokens` order */
  to: number[];
}

/**
 * Wire the variables of a preset to its distinct values, sorted by lightness. Values that can't
 * be resolved here (`var(--primary)` of the shadcn preset) keep one chip each, in order.
 */
export function wire(values: string[]): Wiring {
  const background = rgba(values[0]);
  const chips: string[] = [];
  const keys: string[] = [];
  const light: number[] = [];
  for (const value of values) {
    const key = value.replace(/\s+/g, ' ').toLowerCase();
    if (keys.includes(key)) continue;
    keys.push(key);
    chips.push(value);
    light.push(lightness(value, background));
  }
  const order: number[] = [];
  for (let i = 0; i < chips.length; i++) order.push(i);
  order.sort((a, b) =>
    Number.isNaN(light[a]) || Number.isNaN(light[b]) ? a - b : light[b] - light[a],
  );

  const sorted: string[] = [];
  const at: number[] = [];
  for (let i = 0; i < order.length; i++) {
    sorted.push(chips[order[i]]);
    at[order[i]] = i;
  }
  const to: number[] = [];
  for (const value of values) to.push(at[keys.indexOf(value.replace(/\s+/g, ' ').toLowerCase())]);
  return { chips: sorted, to };
}

type RGBA = [r: number, g: number, b: number, a: number];

/** sRGB channels (0-1) of `#hex`, `rgb()` and `hsl()` colours */
function rgba(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (v.startsWith('#')) {
    const hex = v.length === 4 ? v.slice(1).replace(/./g, '$&$&') : v.slice(1, 7);
    const n = Number.parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const match = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!match) return null;
  const args = match[2].split(/[\s,/]+/).filter(Boolean);
  const num = (s: string | undefined, scale: number) =>
    s === undefined
      ? 1
      : s.endsWith('%')
        ? Number.parseFloat(s) / 100
        : Number.parseFloat(s) / scale;
  const alpha = num(args[3], 1);
  if (match[1].startsWith('rgb'))
    return [num(args[0], 255), num(args[1], 255), num(args[2], 255), alpha];

  const h = Number.parseFloat(args[0]);
  const s = num(args[1], 100);
  const l = num(args[2], 100);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) =>
    l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4), alpha];
}

/** OKLab lightness, translucent colours over `under`; `NaN` when it can't be resolved */
function lightness(value: string, under: RGBA | null): number {
  const oklch = /^oklch\(\s*([\d.]+)(%?)/.exec(value.trim());
  if (oklch) return Number.parseFloat(oklch[1]) / (oklch[2] ? 100 : 1);
  const c = rgba(value);
  if (!c) return Number.NaN;
  const [r, g, b, a] = c;
  const mix = (i: number, x: number) => (under && a < 1 ? x * a + under[i] * (1 - a) : x);
  const lin = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const R = lin(mix(0, r));
  const G = lin(mix(1, g));
  const B = lin(mix(2, b));
  const L = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const M = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const S = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S;
}
