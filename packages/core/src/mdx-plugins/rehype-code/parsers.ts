import type { Element, Root } from 'hast';
import { flattenNodeHast } from '../utils';

const RE_TAILING_CURLY_COLON = /(.+)\{:([\w-]+)\}$/;

export interface ShikiParsedData {
  meta?: string;
  lang?: string;
  code: string;
  structure: 'inline' | 'classic';
}

export type ShikiParser = (tree: Root, node: Element) => ShikiParsedData | undefined;

export type InlineCodeParser = 'tailing-curly-colon';

export const InlineCodeParsers: Record<InlineCodeParser, ShikiParser> = {
  'tailing-curly-colon': (_tree, node) => {
    const raw = flattenNodeHast(node);
    const match = raw.match(RE_TAILING_CURLY_COLON);
    if (!match) return;

    return {
      structure: 'inline',
      code: match[1] ?? raw,
      lang: match.at(2),
    };
  },
};

const languagePrefix = 'language-';

export const PreParser: ShikiParser = (_tree, node) => {
  const head = node.children[0];

  if (!head || head.type !== 'element' || head.tagName !== 'code' || !head.properties) {
    return;
  }

  const classes = head.properties.className;
  const languageClass = Array.isArray(classes)
    ? classes.find((d) => typeof d === 'string' && d.startsWith(languagePrefix))
    : undefined;

  return {
    structure: 'classic',
    lang:
      typeof languageClass === 'string' ? languageClass.slice(languagePrefix.length) : undefined,
    code: flattenNodeHast(head),
    meta: head.data?.meta ?? head.properties.metastring?.toString() ?? '',
  };
};
