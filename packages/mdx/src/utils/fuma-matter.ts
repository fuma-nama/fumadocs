/**
 * Inspired by https://github.com/jonschlinkert/gray-matter
 */
import { LRUCache } from 'lru-cache';
import { load } from 'js-yaml';

const cache = new LRUCache<string, Output>({
  max: 200,
});

interface Output {
  matter: string;
  content: string;
  data: unknown;
}

/**
 * parse frontmatter, it supports only yaml format
 */
export function fumaMatter(input: string): Output {
  if (input === '') {
    return { data: {}, content: input, matter: '' };
  }

  const cached = cache.get(input);
  if (cached) return cached;
  const result = parseMatter(input);
  cache.set(input, result);

  // avoid mutation
  return structuredClone(result);
}

const delimiter = '---';

function parseMatter(str: string): Output {
  const output: Output = { matter: '', data: {}, content: str };
  const open = delimiter + '\n';
  const close = '\n' + delimiter;

  if (!str.startsWith(open)) {
    return output;
  }

  str = str.slice(open.length);
  const len = str.length;

  let closeIdx = str.indexOf(close);
  if (closeIdx === -1) {
    closeIdx = len;
  }

  // get the raw front-matter block
  output.matter = str.slice(0, closeIdx);
  output.content = str.slice(closeIdx + close.length);

  const loaded = load(output.matter);
  output.data = loaded ?? {};

  return output;
}
