/**
 * Inspired by https://github.com/jonschlinkert/gray-matter
 */
import { load } from 'js-yaml';

interface Output {
  /**
   * The matter section, including the delimiter.
   */
  matter: string;
  content: string;
  data: unknown;
}

const regex = /^---\r?\n(.+?)\r?\n---\r?\n/s;

/**
 * parse frontmatter, it supports only yaml format
 */
export function fumaMatter(input: string): Output {
  const output: Output = { matter: '', data: {}, content: input };
  const match = regex.exec(input);
  if (!match) {
    return output;
  }

  // get the raw front-matter block
  output.matter = match[0];
  output.content = input.slice(match[0].length);

  const loaded = load(match[1]);
  output.data = loaded ?? {};

  return output;
}
