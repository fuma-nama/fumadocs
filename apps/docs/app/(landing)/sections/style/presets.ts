import { readFile } from 'node:fs/promises';
import { THEMES, type ThemeId } from './data';

const DIR = './node_modules/fumadocs-ui/css';
const PREFIX = '--color-fd-';

interface Tokens {
  light: Record<string, string>;
  dark: Record<string, string>;
  rules: string[];
}

function tokens(body: string, into: Record<string, string>) {
  for (const decl of body.split(';')) {
    const colon = decl.indexOf(':');
    const name = decl.slice(0, colon).trim();
    if (colon !== -1 && name.startsWith(PREFIX))
      into[name.slice(PREFIX.length)] = decl.slice(colon + 1).trim();
  }
}

/** a preset's tokens from its top-level `selector { body }` blocks */
function parse(source: string): Tokens {
  const parsed: Tokens = { light: {}, dark: {}, rules: [] };
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
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
    const selector = css.slice(i, open).trim();
    const body = css.slice(open + 1, j - 1).trim();
    i = j;
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

/** a preset's values, in the order of `InkTable.tokens` */
interface Ink {
  light: string[];
  dark: string[];
  /** other plain rules of the preset file */
  rules: string;
}

export interface InkTable {
  /** `--color-fd-*` names without the prefix */
  tokens: string[];
  inks: Record<ThemeId, Ink>;
}

/** the real tokens of every preset, read from `fumadocs-ui/css` (traced for `/` in next.config) */
export async function loadInks(): Promise<InkTable> {
  const defaults = parse(await readFile(`${DIR}/lib/default-colors.css`, 'utf8'));
  const names = Object.keys(defaults.light);
  // read together, filled in preset order: the page's payload is the same every build
  const files = await Promise.all(THEMES.map((theme) => readFile(`${DIR}/${theme}.css`, 'utf8')));
  const inks = {} as Record<ThemeId, Ink>;
  for (let i = 0; i < THEMES.length; i++) {
    const preset = parse(files[i]);
    const light: string[] = [];
    const dark: string[] = [];
    for (const name of names) {
      light.push(preset.light[name] ?? defaults.light[name]);
      dark.push(preset.dark[name] ?? defaults.dark[name]);
    }
    inks[THEMES[i]] = { light, dark, rules: preset.rules.join('\n') };
  }
  return { tokens: names, inks };
}
